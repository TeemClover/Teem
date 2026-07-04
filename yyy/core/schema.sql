-- core/schema.sql — สคีมาฐานข้อมูล YYY Studio OS (รันอัตโนมัติครั้งแรก)

CREATE TABLE IF NOT EXISTS footage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  filepath TEXT,
  characters TEXT NOT NULL CHECK(characters IN ('YY','YR','DUO','LINK','BROLL')),
  duo_in_frame INTEGER NOT NULL DEFAULT 0,
  high_value INTEGER GENERATED ALWAYS AS (CASE WHEN duo_in_frame=1 THEN 1 ELSE 0 END) STORED,
  location TEXT, outfit_ok INTEGER DEFAULT 1,
  emotion TEXT,
  shot_type TEXT,
  takes INTEGER DEFAULT 1, duration_sec REAL,
  spoken_line TEXT, sub_th TEXT, sub_zh TEXT, sub_ja TEXT,
  use_count INTEGER DEFAULT 0, last_used_at TEXT,
  notes TEXT, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  title_th TEXT, title_zh TEXT, title_ja TEXT,
  tier TEXT CHECK(tier IN ('A','B','C','D')),
  location TEXT, status TEXT DEFAULT 'draft',
  script_json TEXT, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reuse_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER REFERENCES episodes(id),
  footage_id INTEGER REFERENCES footage(id),
  suggested_at TEXT DEFAULT (datetime('now')), accepted INTEGER DEFAULT 0
);
