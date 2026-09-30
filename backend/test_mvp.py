import sys
import os

# Add backend to path
sys.path.append(os.path.abspath("backend"))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_all():
    print("1. Testing Root...")
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    print("   -> Root OK:", r.json())

    print("\n2. Testing KPI...")
    r = client.get("/api/kpi")
    assert r.status_code == 200, f"KPI failed: {r.text}"
    print("   -> KPI OK:", r.json())

    print("\n3. Testing Image Verification (Demo Mode)...")
    r = client.post("/api/ai/verify-image", json={
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
        "mime_type": "image/jpeg",
        "selected_category": "Potholes / Road Damage"
    })
    assert r.status_code == 200, f"AI verify failed: {r.text}"
    ai_data = r.json()
    print("   -> AI Result:", ai_data)
    assert ai_data["detected_issue"] == "Potholes / Road Damage"
    assert ai_data["category_match"] is True

    print("\n4. Testing Duplicate Check...")
    r = client.post("/api/complaints/check-duplicate", json={
        "category": "Potholes / Road Damage",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "radius_meters": 500.0
    })
    assert r.status_code == 200
    print("   -> Duplicate Check OK:", r.json())

    print("\n5. Testing Complaint Submission...")
    r = client.post("/api/complaints", json={
        "category": "Potholes / Road Damage",
        "description": "Hazardous road crater near signal",
        "latitude": 12.9720,
        "longitude": 77.5950,
        "address": "Signal Crossing",
        "ai_analysis": ai_data
    })
    assert r.status_code == 200
    created = r.json()
    cid = created["complaint_id"]
    print(f"   -> Complaint Created: {cid}")

    print(f"\n6. Testing Detail Fetch for {cid}...")
    r = client.get(f"/api/complaints/{cid}")
    assert r.status_code == 200
    detail = r.json()
    print("   -> Fetched Detail:", detail["complaint_id"], detail["status"], "Timeline steps:", len(detail["timeline"]))

    print(f"\n7. Testing Authority Status Updates on {cid}...")
    r = client.patch(f"/api/complaints/{cid}/status", json={"status": "Verified"})
    assert r.status_code == 200
    r = client.patch(f"/api/complaints/{cid}/status", json={"status": "Assigned"})
    assert r.status_code == 200
    r = client.patch(f"/api/complaints/{cid}/status", json={"status": "In Progress"})
    assert r.status_code == 200
    r = client.patch(f"/api/complaints/{cid}/status", json={"status": "Resolved"})
    assert r.status_code == 200
    print("   -> Status moved to Resolved successfully!")

    print(f"\n8. Testing Citizen Community Re-Verification on {cid}...")
    r = client.post(f"/api/complaints/{cid}/community-verify", json={
        "is_fixed": True,
        "comment": "Confirmed fixed by citizen inspection"
    })
    assert r.status_code == 200
    print("   -> Community Verified Result:", r.json())

    # Check updated detail
    r = client.get(f"/api/complaints/{cid}")
    detail = r.json()
    assert detail["status"] == "Closed"
    print(f"   -> Final status for {cid}: {detail['status']}")

    print("\nALL BACKEND & LIFECYCLE TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_all()
