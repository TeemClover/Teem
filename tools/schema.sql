-- ═══════════════════════════════════════════════════════════════
-- myclover — ตารางสมาชิกบน Cloudflare D1
--
-- วางทั้งไฟล์นี้ใน D1 Console แล้วกด Execute (รันซ้ำได้ ไม่พัง)
-- ผูกเข้ากับ Pages project ด้วยชื่อตัวแปร DB
--
-- เก็บเท่าที่หน้า /privacy/ สัญญาไว้เท่านั้น
-- ไม่เก็บ IP ไม่เก็บเบอร์โทร ไม่เก็บที่อยู่ ไม่เก็บวันเกิด
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no  TEXT UNIQUE,              -- MY-2026-0001
  created_at TEXT NOT NULL,            -- ISO 8601 UTC
  updated_at TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,     -- ลงซ้ำ = อัปเดตของเดิม ไม่เพิ่มแถว
  name       TEXT NOT NULL,
  nickname   TEXT,                     -- ชื่อบนการ์ด
  card_line  TEXT,                     -- ประโยคบนการ์ด
  class      TEXT,                     -- THINKER / TASTER / KEEPER / MAKER
  era        TEXT,                     -- 2010-2013
  era_th     TEXT,                     -- 2010–2013 · ยุคดวงดาว
  titles     TEXT,                     -- JSON: ["FORGE","SCHOLAR"]
  news       INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT NOT NULL,            -- หลักฐาน PDPA ว่ายินยอมเมื่อไหร่
  source     TEXT                      -- หน้าไหนส่งมา เช่น card
);
CREATE INDEX IF NOT EXISTS idx_members_created ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_members_news    ON members(news);

-- กันยิงรัว ๆ — เก็บแค่ค่าแฮชของ IP ต่อชั่วโมง แล้วลบทิ้งเอง
-- ไม่ได้เก็บ IP จริง และย้อนกลับไปหาคนไม่ได้
CREATE TABLE IF NOT EXISTS reg_hits (
  bucket TEXT PRIMARY KEY,             -- <ip hash>:<YYYY-MM-DDTHH>
  n      INTEGER NOT NULL DEFAULT 1,
  at     TEXT NOT NULL
);
