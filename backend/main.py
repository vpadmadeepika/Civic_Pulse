import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from database import init_db, get_db, generate_next_complaint_id, find_duplicates
from ai_service import analyze_civic_image

load_dotenv()

app = FastAPI(title="Civic Pulse API", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()


# Pydantic models
class ImageVerificationRequest(BaseModel):
    image_base64: str
    mime_type: Optional[str] = "image/jpeg"
    selected_category: str

class DuplicateCheckRequest(BaseModel):
    category: str
    latitude: float
    longitude: float
    radius_meters: Optional[float] = 350.0

class CreateComplaintRequest(BaseModel):
    category: str
    description: str
    photo_data: Optional[str] = ""
    latitude: float
    longitude: float
    address: Optional[str] = ""
    ai_analysis: Optional[dict] = None

class StatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = ""
    updated_by: Optional[str] = "Municipal Authority"

class CommunityVerifyRequest(BaseModel):
    is_fixed: bool
    comment: Optional[str] = ""


@app.get("/")
def root():
    return {"message": "Civic Pulse Backend API is running", "tagline": "Report. Track. Resolve."}


@app.post("/api/ai/verify-image")
def verify_image(req: ImageVerificationRequest):
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="Image data is required")
    result = analyze_civic_image(
        base64_image_data=req.image_base64,
        mime_type=req.mime_type or "image/jpeg",
        selected_category=req.selected_category
    )
    return result


@app.post("/api/complaints/check-duplicate")
def check_duplicate(req: DuplicateCheckRequest):
    duplicates = find_duplicates(
        category=req.category,
        latitude=req.latitude,
        longitude=req.longitude,
        radius_meters=req.radius_meters or 350.0
    )
    return {
        "has_duplicate": len(duplicates) > 0,
        "duplicates": duplicates
    }


@app.get("/api/complaints")
def list_complaints(status: Optional[str] = None, category: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = """
        SELECT c.*, a.detected_issue, a.category_match, a.confidence, a.explanation, a.is_demo
        FROM complaints c
        LEFT JOIN ai_analysis a ON c.complaint_id = a.complaint_id
        WHERE 1=1
    """
    params = []
    if status:
        query += " AND c.status = ?"
        params.append(status)
    if category:
        query += " AND c.category = ?"
        params.append(category)

    query += " ORDER BY c.id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "complaint_id": r["complaint_id"],
            "category": r["category"],
            "description": r["description"],
            "photo_data": r["photo_data"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "address": r["address"],
            "status": r["status"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "ai_analysis": {
                "detected_issue": r["detected_issue"],
                "category_match": bool(r["category_match"]) if r["category_match"] is not None else None,
                "confidence": r["confidence"],
                "explanation": r["explanation"],
                "is_demo": bool(r["is_demo"]) if r["is_demo"] is not None else True
            } if r["detected_issue"] else None
        })
    return result


@app.get("/api/complaints/{complaint_id}")
def get_complaint_detail(complaint_id: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM complaints WHERE complaint_id = ?", (complaint_id,))
    c_row = cursor.fetchone()
    if not c_row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found")

    cursor.execute("SELECT * FROM ai_analysis WHERE complaint_id = ?", (complaint_id,))
    ai_row = cursor.fetchone()

    cursor.execute("SELECT * FROM status_history WHERE complaint_id = ? ORDER BY id ASC", (complaint_id,))
    history_rows = cursor.fetchall()

    cursor.execute("SELECT * FROM community_verification WHERE complaint_id = ? ORDER BY id DESC LIMIT 1", (complaint_id,))
    comm_row = cursor.fetchone()

    conn.close()

    return {
        "complaint_id": c_row["complaint_id"],
        "category": c_row["category"],
        "description": c_row["description"],
        "photo_data": c_row["photo_data"],
        "latitude": c_row["latitude"],
        "longitude": c_row["longitude"],
        "address": c_row["address"],
        "status": c_row["status"],
        "created_at": c_row["created_at"],
        "updated_at": c_row["updated_at"],
        "ai_analysis": dict(ai_row) if ai_row else None,
        "timeline": [dict(h) for h in history_rows],
        "community_verification": dict(comm_row) if comm_row else None
    }


@app.post("/api/complaints")
def create_complaint(req: CreateComplaintRequest):
    conn = get_db()
    cursor = conn.cursor()

    complaint_id = generate_next_complaint_id(cursor)
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO complaints (complaint_id, category, description, photo_data, latitude, longitude, address, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?)
    """, (complaint_id, req.category, req.description, req.photo_data or "", req.latitude, req.longitude, req.address or "", now, now))

    # Insert status history
    cursor.execute("""
        INSERT INTO status_history (complaint_id, status, notes, updated_by, timestamp)
        VALUES (?, 'Submitted', 'Complaint submitted via Citizen Portal', 'Citizen', ?)
    """, (complaint_id, now))

    # Insert AI Analysis if present
    if req.ai_analysis:
        ai = req.ai_analysis
        cursor.execute("""
            INSERT INTO ai_analysis (complaint_id, detected_issue, category_match, confidence, explanation, is_demo, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            complaint_id,
            ai.get("detected_issue", req.category),
            1 if ai.get("category_match", True) else 0,
            ai.get("confidence", 90),
            ai.get("explanation", "Automated vision analysis completed."),
            1 if ai.get("is_demo", True) else 0,
            now
        ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "complaint_id": complaint_id,
        "status": "Submitted",
        "message": "Complaint Submitted Successfully"
    }


@app.patch("/api/complaints/{complaint_id}/status")
def update_complaint_status(complaint_id: str, req: StatusUpdateRequest):
    valid_statuses = [
        "Submitted", "Verified", "Assigned", "In Progress",
        "Resolved", "Community Verified", "Closed", "Reopened", "Rejected"
    ]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {req.status}")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM complaints WHERE complaint_id = ?", (complaint_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        UPDATE complaints
        SET status = ?, updated_at = ?
        WHERE complaint_id = ?
    """, (req.status, now, complaint_id))

    cursor.execute("""
        INSERT INTO status_history (complaint_id, status, notes, updated_by, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (complaint_id, req.status, req.notes or f"Status updated to {req.status}", req.updated_by or "Municipal Authority", now))

    conn.commit()
    conn.close()

    return {"success": True, "complaint_id": complaint_id, "status": req.status}


@app.post("/api/complaints/{complaint_id}/community-verify")
def community_verify_complaint(complaint_id: str, req: CommunityVerifyRequest):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM complaints WHERE complaint_id = ?", (complaint_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Complaint not found")

    now = datetime.now(timezone.utc).isoformat()

    # Record community verification
    cursor.execute("""
        INSERT INTO community_verification (complaint_id, is_fixed, comment, verified_at)
        VALUES (?, ?, ?, ?)
    """, (complaint_id, 1 if req.is_fixed else 0, req.comment or "", now))

    if req.is_fixed:
        # Status becomes Community Verified -> Closed
        cursor.execute("""
            INSERT INTO status_history (complaint_id, status, notes, updated_by, timestamp)
            VALUES (?, 'Community Verified', ?, 'Citizen', ?)
        """, (complaint_id, f"Citizen confirmed fix. Note: {req.comment or 'Confirmed resolved'}", now))

        cursor.execute("""
            INSERT INTO status_history (complaint_id, status, notes, updated_by, timestamp)
            VALUES (?, 'Closed', 'Ticket closed following successful community verification', 'System', ?)
        """, (complaint_id, now))

        cursor.execute("""
            UPDATE complaints
            SET status = 'Closed', updated_at = ?
            WHERE complaint_id = ?
        """, (now, complaint_id))
        final_status = "Closed"
    else:
        # Status becomes Reopened
        cursor.execute("""
            INSERT INTO status_history (complaint_id, status, notes, updated_by, timestamp)
            VALUES (?, 'Reopened', ?, 'Citizen', ?)
        """, (complaint_id, f"Citizen reported issue NOT fixed. Note: {req.comment or 'Reopened by citizen'}", now))

        cursor.execute("""
            UPDATE complaints
            SET status = 'Reopened', updated_at = ?
            WHERE complaint_id = ?
        """, (now, complaint_id))
        final_status = "Reopened"

    conn.commit()
    conn.close()

    return {"success": True, "complaint_id": complaint_id, "new_status": final_status}


@app.get("/api/kpi")
def get_kpi_metrics():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM complaints")
    total = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as cnt FROM complaints WHERE status IN ('Submitted', 'Verified')")
    pending = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM complaints WHERE status IN ('Assigned', 'In Progress')")
    in_progress = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM complaints WHERE status IN ('Resolved', 'Community Verified', 'Closed')")
    resolved = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM complaints WHERE status = 'Reopened'")
    reopened = cursor.fetchone()["cnt"]

    conn.close()

    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "resolved": resolved,
        "reopened": reopened
    }
