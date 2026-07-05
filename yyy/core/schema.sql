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

-- ========== Script Factory + AI Judge ==========

CREATE TABLE IF NOT EXISTS script_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_code TEXT UNIQUE NOT NULL,
    total_scripts INTEGER NOT NULL DEFAULT 100,
    generation_model TEXT,
    judge_model TEXT,
    status TEXT DEFAULT 'generating'
        CHECK(status IN ('generating','judging','complete','failed')),
    config_json TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS generated_scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER REFERENCES script_batches(id),
    script_index INTEGER NOT NULL,
    title_th TEXT NOT NULL,
    title_zh TEXT NOT NULL,
    title_en TEXT NOT NULL,
    logline_th TEXT,
    logline_zh TEXT,
    logline_en TEXT,
    full_script_json TEXT NOT NULL,
    location_id TEXT,
    theme_id TEXT,
    comedy_beat TEXT,
    emotional_arc TEXT,
    estimated_duration_sec INTEGER,
    score_viral REAL,
    score_comedy REAL,
    score_visual REAL,
    score_chemistry REAL,
    score_cultural_th REAL,
    score_cultural_zh REAL,
    score_cultural_intl REAL,
    score_hook REAL,
    score_rewatch REAL,
    score_brand REAL,
    score_location REAL,
    score_language REAL,
    total_score REAL,
    weighted_score REAL,
    rank INTEGER,
    judge_analysis TEXT,
    judge_json TEXT,
    is_top10 INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pattern_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER REFERENCES script_batches(id),
    analysis_json TEXT NOT NULL,
    summary_th TEXT,
    summary_en TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scripts_batch ON generated_scripts(batch_id);
CREATE INDEX IF NOT EXISTS idx_scripts_rank ON generated_scripts(batch_id, rank);
CREATE INDEX IF NOT EXISTS idx_scripts_top10 ON generated_scripts(batch_id, is_top10);
