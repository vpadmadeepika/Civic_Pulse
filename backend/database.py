import sqlite3
import math
from datetime import datetime, timezone

DB_PATH = "civicpulse.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. complaints table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        photo_data TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        address TEXT,
        status TEXT NOT NULL DEFAULT 'Submitted',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 2. ai_analysis table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        detected_issue TEXT NOT NULL,
        category_match INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        explanation TEXT,
        is_demo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (complaint_id) REFERENCES complaints (complaint_id)
    )
    """)

    # 3. status_history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        updated_by TEXT DEFAULT 'System',
        timestamp TEXT NOT NULL,
        FOREIGN KEY (complaint_id) REFERENCES complaints (complaint_id)
    )
    """)

    # 4. community_verification table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS community_verification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        is_fixed INTEGER NOT NULL,
        comment TEXT,
        verified_at TEXT NOT NULL,
        FOREIGN KEY (complaint_id) REFERENCES complaints (complaint_id)
    )
    """)

    conn.commit()
    seed_demo_data(conn)
    conn.close()


def generate_next_complaint_id(cursor) -> str:
    cursor.execute("SELECT complaint_id FROM complaints ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    if not row:
        return "CP-001"
    last_id_str = row["complaint_id"]
    try:
        num = int(last_id_str.replace("CP-", ""))
        return f"CP-{num + 1:03d}"
    except Exception:
        cursor.execute("SELECT COUNT(*) as cnt FROM complaints")
        cnt = cursor.fetchone()["cnt"]
        return f"CP-{cnt + 1:03d}"


def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Haversine distance in meters
    R = 6371000  # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def find_duplicates(category: str, latitude: float, longitude: float, radius_meters: float = 350.0):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT complaint_id, category, description, latitude, longitude, status, created_at
        FROM complaints
        WHERE category = ? AND status NOT IN ('Closed')
    """, (category,))
    rows = cursor.fetchall()
    conn.close()

    duplicates = []
    for r in rows:
        dist = calculate_distance_meters(latitude, longitude, r["latitude"], r["longitude"])
        if dist <= radius_meters:
            duplicates.append({
                "complaint_id": r["complaint_id"],
                "category": r["category"],
                "description": r["description"],
                "status": r["status"],
                "distance_meters": round(dist, 1),
                "created_at": r["created_at"]
            })
    return duplicates


def seed_demo_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM complaints")
    count = cursor.fetchone()["count"]
    if count > 0:
        return

    # Seed 12 sample complaints
    now = datetime.now(timezone.utc).isoformat()
    base_lat = 12.9716  # Center coords (e.g. Bangalore / Tech Hub)
    base_lon = 77.5946

    sample_complaints = [
        ("CP-001", "Potholes / Road Damage", "Deep pothole near 4th cross intersection causing two-wheeler skids.", base_lat + 0.0012, base_lon + 0.0010, "4th Cross, MG Road", "Submitted", "Potholes / Road Damage", 1, 95, "Visible asphalt cavity and road crater."),
        ("CP-002", "Potholes / Road Damage", "Secondary road surface crack near the same corner.", base_lat + 0.0014, base_lon + 0.0011, "4th Cross, MG Road Corner", "Verified", "Potholes / Road Damage", 1, 91, "Road crater and loose gravel."),
        ("CP-003", "Garbage Overflow", "Municipal dump bin overflowing onto the pedestrian pathway for 3 days.", base_lat - 0.0025, base_lon + 0.0030, "Indiranagar 100ft Road", "Assigned", "Garbage Overflow", 1, 93, "Overflowing trash and solid waste heaps."),
        ("CP-004", "Broken Streetlights", "3 consecutive streetlights dark, making street dangerous at night.", base_lat + 0.0035, base_lon - 0.0020, "Brigade Link Road", "In Progress", "Broken Streetlights", 1, 89, "Extinguished street luminaire with unseated bulb cover."),
        ("CP-005", "Water Leakage", "Clean water pipeline rupture spewing water onto sidewalk.", base_lat - 0.0010, base_lon - 0.0035, "Richmond Circle", "Resolved", "Water Leakage", 1, 94, "Pressurized freshwater leak creating street flow."),
        ("CP-006", "Sewage Problems", "Manhole overflowing with foul odor near market entrance.", base_lat + 0.0040, base_lon + 0.0025, "Commercial Street Market", "Community Verified", "Sewage Problems", 1, 92, "Blocked sewage line overflow."),
        ("CP-007", "Fallen Trees", "Heavy tree branch snapped during morning rain, blocking half lane.", base_lat - 0.0030, base_lon - 0.0015, "Cubbon Park Gate 2", "Closed", "Fallen Trees", 1, 97, "Large broken tree branch obstructing transit lane."),
        ("CP-008", "Damaged Footpaths", "Broken pavers and exposed steel reinforcement on walkway.", base_lat + 0.0022, base_lon + 0.0045, "Residency Road", "Reopened", "Damaged Footpaths", 1, 88, "Cracked concrete tiles and unsafe pedestrian surface."),
        ("CP-009", "Drainage Problems", "Stormwater storm drain clogged with plastic debris.", base_lat - 0.0042, base_lon + 0.0018, "Victoria Layout", "Verified", "Drainage Problems", 1, 90, "Plastic silt clogging stormwater inlet."),
        ("CP-010", "Illegal Waste Dumping", "Construction debris dumped along vacant roadside lot.", base_lat + 0.0051, base_lon - 0.0040, "Koramangala 1st Block", "Assigned", "Illegal Waste Dumping", 1, 91, "Concrete rubble and construction debris pile."),
        ("CP-011", "Damaged Traffic Signals", "Blinking red signal malfunctioning causing gridlock.", base_lat - 0.0018, base_lon + 0.0055, "Trinity Junction", "In Progress", "Damaged Traffic Signals", 1, 87, "Faulty electronic signal board."),
        ("CP-012", "Water Leakage", "Secondary minor leak near Richmond Circle curb.", base_lat - 0.0011, base_lon - 0.0036, "Richmond Circle East", "Submitted", "Water Leakage", 1, 93, "Water pooling around meter valve.")
    ]

    for cid, cat, desc, lat, lon, addr, status, ai_issue, match, conf, expl in sample_complaints:
        cursor.execute("""
            INSERT INTO complaints (complaint_id, category, description, photo_data, latitude, longitude, address, status, created_at, updated_at)
            VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?)
        """, (cid, cat, desc, lat, lon, addr, status, now, now))

        cursor.execute("""
            INSERT INTO ai_analysis (complaint_id, detected_issue, category_match, confidence, explanation, is_demo, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        """, (cid, ai_issue, match, conf, expl, now))

        cursor.execute("""
            INSERT INTO status_history (complaint_id, status, notes, updated_by, timestamp)
            VALUES (?, 'Submitted', 'Initial complaint logged by citizen', 'Citizen', ?)
        """, (cid, now))

        if status in ['Verified', 'Assigned', 'In Progress', 'Resolved', 'Community Verified', 'Closed', 'Reopened']:
            cursor.execute("""
                INSERT INTO status_history (complaint_id, status, notes, updated_by, timestamp)
                VALUES (?, ?, 'Updated during standard civic workflow', 'Municipal Officer', ?)
            """, (cid, status, now))

    conn.commit()
