# -*- coding: utf-8 -*-
"""
core/db.py — ชั้นเชื่อมต่อฐานข้อมูล SQLite ของ YYY Studio OS
ฐานข้อมูลเป็นไฟล์เดียว (yyy_studio.db) แบ็กอัพตามระบบ 3-2-1 ได้ทันที
"""
import json
import sqlite3
from pathlib import Path

# โฟลเดอร์รากของโปรเจกต์ (โฟลเดอร์ที่มี app.py)
ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "yyy_studio.db"
SCHEMA_PATH = ROOT / "core" / "schema.sql"
DATA_DIR = ROOT / "data"
PROJECTS_DIR = ROOT / "projects"


def get_conn() -> sqlite3.Connection:
    """เปิดการเชื่อมต่อ SQLite (row_factory = dict-like)"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """สร้างตารางตาม core/schema.sql (idempotent — รันซ้ำได้)"""
    conn = get_conn()
    try:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()


def query(sql: str, params: tuple = ()) -> list:
    """SELECT แล้วคืน list ของ dict"""
    conn = get_conn()
    try:
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def execute(sql: str, params: tuple = ()) -> int:
    """INSERT/UPDATE/DELETE แล้วคืน lastrowid"""
    conn = get_conn()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def load_json(name: str):
    """อ่านไฟล์ seed JSON จากโฟลเดอร์ data/"""
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


# ---------- คลังฟุต (footage) ----------

FOOTAGE_FIELDS = [
    "filename", "filepath", "characters", "duo_in_frame", "location",
    "outfit_ok", "emotion", "shot_type", "takes", "duration_sec",
    "spoken_line", "sub_th", "sub_zh", "sub_ja", "notes",
]


def insert_footage(item: dict) -> int:
    """เพิ่มฟุต 1 รายการ (high_value คำนวณอัตโนมัติจาก duo_in_frame)"""
    cols = ", ".join(FOOTAGE_FIELDS)
    marks = ", ".join(["?"] * len(FOOTAGE_FIELDS))
    vals = tuple(item.get(f) for f in FOOTAGE_FIELDS)
    return execute(f"INSERT INTO footage ({cols}) VALUES ({marks})", vals)


def seed_footage_if_empty() -> int:
    """โหลดฟุตตัวอย่างจาก data/seed_footage_demo.json ถ้าคลังยังว่าง คืนจำนวนที่เพิ่ม"""
    n = query("SELECT COUNT(*) AS c FROM footage")[0]["c"]
    if n > 0:
        return 0
    items = load_json("seed_footage_demo.json")
    for it in items:
        insert_footage(it)
    return len(items)


def mark_footage_used(footage_id: int) -> None:
    """อัปเดตสถิติการใช้ซ้ำเมื่อกด accept ใน Matcher"""
    execute(
        "UPDATE footage SET use_count = use_count + 1, last_used_at = datetime('now') WHERE id = ?",
        (footage_id,),
    )


# ---------- ตอน (episodes) ----------

def next_episode_code() -> str:
    """สร้างรหัสตอนถัดไปรูปแบบ EP001, EP002, ..."""
    rows = query("SELECT code FROM episodes WHERE code LIKE 'EP%' ORDER BY id DESC LIMIT 1")
    if not rows:
        return "EP001"
    try:
        last = int(rows[0]["code"][2:5])
    except ValueError:
        last = 0
    return f"EP{last + 1:03d}"


def insert_episode(code, title_th, title_zh, title_ja, tier, location, script: dict) -> int:
    return execute(
        """INSERT INTO episodes (code, title_th, title_zh, title_ja, tier, location, status, script_json)
           VALUES (?,?,?,?,?,?, 'planned', ?)""",
        (code, title_th, title_zh, title_ja, tier, location,
         json.dumps(script, ensure_ascii=False)),
    )


# ---------- แดชบอร์ด ----------

def dashboard_stats() -> dict:
    """ตัวเลขสรุปหน้าแรก: ตอนทั้งหมด, ฟุตในคลัง, HIGH VALUE, ใช้ซ้ำสะสม"""
    return {
        "episodes": query("SELECT COUNT(*) AS c FROM episodes")[0]["c"],
        "footage": query("SELECT COUNT(*) AS c FROM footage")[0]["c"],
        "high_value": query("SELECT COUNT(*) AS c FROM footage WHERE high_value=1")[0]["c"],
        "reuse_total": query("SELECT COALESCE(SUM(use_count),0) AS c FROM footage")[0]["c"],
    }
