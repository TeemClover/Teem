-- ═══════════════════════════════════════════════════════════════
-- myClover: CORE7 — Database Schema (Cloudflare D1 / SQLite)
--
-- รันซ้ำได้ ไม่พัง (IF NOT EXISTS ทุกตาราง)
-- ตาราง members เดิมของเว็บ (tools/schema.sql) ไม่ถูกแตะต้อง —
-- users ของเกมอ้างถึง members ผ่าน member_id เมื่อพร้อมเชื่อมบัญชี
--
-- หลัก Privacy เดียวกับทั้งเว็บ: ไม่เก็บ IP จริง ไม่เก็บวันเกิด
-- ไม่เก็บข้อมูลส่วนตัวที่ไม่จำเป็น
-- ═══════════════════════════════════════════════════════════════

-- ── ผู้เล่น ──
CREATE TABLE IF NOT EXISTS c7_users (
  id            TEXT PRIMARY KEY,          -- uuid
  handle        TEXT UNIQUE,               -- ชื่อสาธารณะใน URL /profile/:handle
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  locale        TEXT DEFAULT 'th',
  member_status TEXT NOT NULL DEFAULT 'GUEST',  -- GUEST | MEMBER | SUSPENDED
  member_id     INTEGER,                   -- → members.id (บัญชีเว็บ myClover)
  privacy       TEXT NOT NULL DEFAULT 'PUBLIC', -- PUBLIC | LINKED_ONLY | PRIVATE
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS c7_user_auth_links (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES c7_users(id),
  provider         TEXT NOT NULL,          -- 'discord' | 'email' | ...
  provider_user_id TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS c7_guest_sessions (
  id                 TEXT PRIMARY KEY,
  display_name       TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,        -- ไม่เก็บ token ดิบ
  expires_at         TEXT NOT NULL,
  created_at         TEXT NOT NULL
);

-- ── การ์ดและ Collection ──
CREATE TABLE IF NOT EXISTS c7_collections (
  id             TEXT PRIMARY KEY,          -- 'first-hand'
  slug           TEXT UNIQUE NOT NULL,
  name_en        TEXT NOT NULL,
  name_th        TEXT NOT NULL,
  description_en TEXT,
  description_th TEXT,
  cover_url      TEXT,
  release_date   TEXT,
  is_public      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS c7_cards (
  id              TEXT PRIMARY KEY,         -- 'fh-red-desire'
  slug            TEXT UNIQUE NOT NULL,
  name_en         TEXT NOT NULL,
  name_th         TEXT NOT NULL,
  color           TEXT NOT NULL CHECK (color IN ('RED','GREEN','BLUE','GRAY')),
  class_name      TEXT NOT NULL,            -- TASTER | THINKER | KEEPER | MAKER
  card_type       TEXT NOT NULL DEFAULT 'MEANING',  -- MEANING | GENERIC | PEOPLE | EVENT
  collection_id   TEXT REFERENCES c7_collections(id),
  art_url         TEXT,
  thumbnail_url   TEXT,
  print_front_url TEXT,
  print_back_id   TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS c7_user_cards (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES c7_users(id),
  card_id     TEXT NOT NULL REFERENCES c7_cards(id),
  source_type TEXT NOT NULL,               -- STARTER | EVENT | ACHIEVEMENT | FOUNDER_GIFT |
                                           -- PEOPLE | COMMUNITY | CLAIM_CODE | QR | ADMIN_GRANT
  source_id   TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,  -- หลายใบไม่เพิ่มพลัง — เพื่อ Collection เท่านั้น
  status      TEXT NOT NULL DEFAULT 'OWNED_DIGITAL',
      -- LOCKED | UNLOCKED | OWNED_DIGITAL | PRINTABLE | PHYSICAL_CLAIMED | ARCHIVED
  printable   INTEGER NOT NULL DEFAULT 1,
  unlocked_at TEXT NOT NULL,
  UNIQUE(user_id, card_id, source_type)
);
CREATE INDEX IF NOT EXISTS idx_c7_user_cards_user ON c7_user_cards(user_id);

CREATE TABLE IF NOT EXISTS c7_hand_presets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES c7_users(id),
  name        TEXT NOT NULL,
  is_showcase INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c7_hand_preset_cards (
  preset_id TEXT NOT NULL REFERENCES c7_hand_presets(id),
  card_id   TEXT NOT NULL REFERENCES c7_cards(id),
  position  INTEGER NOT NULL CHECK (position BETWEEN 1 AND 7),
  PRIMARY KEY (preset_id, position)
);

-- ── ห้องและ Match ──
CREATE TABLE IF NOT EXISTS c7_rooms (
  id           TEXT PRIMARY KEY,
  room_code    TEXT UNIQUE NOT NULL,       -- CLVR-XXXX
  room_type    TEXT NOT NULL DEFAULT 'CASUAL',   -- CASUAL | RANKED | EVENT
  visibility   TEXT NOT NULL DEFAULT 'PRIVATE',  -- PUBLIC | UNLISTED | PRIVATE
  host_user_id TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'OPEN',     -- OPEN | PLAYING | CLOSED | EXPIRED
  locale       TEXT,
  ranked       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c7_room_players (
  room_id     TEXT NOT NULL REFERENCES c7_rooms(id),
  player_id   TEXT NOT NULL,
  player_type TEXT NOT NULL,               -- MEMBER | GUEST
  seat        TEXT NOT NULL CHECK (seat IN ('a','b')),
  ready       INTEGER NOT NULL DEFAULT 0,
  connected   INTEGER NOT NULL DEFAULT 1,
  joined_at   TEXT NOT NULL,
  PRIMARY KEY (room_id, seat)
);

CREATE TABLE IF NOT EXISTS c7_matches (
  id            TEXT PRIMARY KEY,
  room_id       TEXT REFERENCES c7_rooms(id),
  mode          TEXT NOT NULL,             -- bot | casual | ranked | event
  ranked        INTEGER NOT NULL DEFAULT 0,
  season_id     TEXT,
  status        TEXT NOT NULL,             -- ACTIVE | COMPLETED | FORFEITED | ABANDONED | CANCELLED
  player_a_id   TEXT NOT NULL,
  player_b_id   TEXT NOT NULL,
  winner_id     TEXT,
  result_type   TEXT,                      -- THREE_WINS | EXHAUSTION | TIEBREAK_* | DRAW | FORFEIT | DISCONNECT_LOSS
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  rules_version TEXT NOT NULL              -- '1.0.0' — Replay เก่าต้องอ่านได้เสมอ
);
CREATE INDEX IF NOT EXISTS idx_c7_matches_player ON c7_matches(player_a_id, player_b_id);

CREATE TABLE IF NOT EXISTS c7_match_hands (
  id               TEXT PRIMARY KEY,
  match_id         TEXT NOT NULL REFERENCES c7_matches(id),
  player_id        TEXT NOT NULL,
  card_instance_id TEXT NOT NULL,          -- 'a1'..'a7' / 'b1'..'b7'
  card_id          TEXT NOT NULL,
  color            TEXT NOT NULL,
  position         INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'IN_HAND'
      CHECK (status IN ('IN_HAND','PLAYED','DISCARDED_EXTRA'))
);
CREATE INDEX IF NOT EXISTS idx_c7_match_hands ON c7_match_hands(match_id, player_id);

CREATE TABLE IF NOT EXISTS c7_rounds (
  id               TEXT PRIMARY KEY,
  match_id         TEXT NOT NULL REFERENCES c7_matches(id),
  round_number     INTEGER NOT NULL,
  player_a_card_id TEXT NOT NULL,
  player_b_card_id TEXT NOT NULL,
  player_a_color   TEXT NOT NULL,
  player_b_color   TEXT NOT NULL,
  result           TEXT NOT NULL,          -- A | B | TIE
  winner_id        TEXT,
  loser_id         TEXT,
  tiebreak_context TEXT,                   -- JSON เมื่อรอบนี้เกี่ยวข้องกับ tiebreak
  resolved_at      TEXT NOT NULL,
  UNIQUE(match_id, round_number)
);

CREATE TABLE IF NOT EXISTS c7_round_discards (
  id           TEXT PRIMARY KEY,
  round_id     TEXT NOT NULL REFERENCES c7_rounds(id),
  player_id    TEXT NOT NULL,
  card_id      TEXT NOT NULL,
  color        TEXT NOT NULL,
  discard_type TEXT NOT NULL DEFAULT 'EXTRA'   -- EXTRA (ผู้แพ้ทิ้งเพิ่ม)
);

-- ── สถิติและ Rating ──
CREATE TABLE IF NOT EXISTS c7_player_stats (
  user_id        TEXT NOT NULL,
  scope          TEXT NOT NULL,            -- ranked | casual | bot | all
  season_id      TEXT NOT NULL DEFAULT '', -- '' = all-time
  matches_played INTEGER NOT NULL DEFAULT 0,
  matches_won    INTEGER NOT NULL DEFAULT 0,
  matches_lost   INTEGER NOT NULL DEFAULT 0,
  draws          INTEGER NOT NULL DEFAULT 0,
  rounds_won     INTEGER NOT NULL DEFAULT 0,
  tiebreak_wins  INTEGER NOT NULL DEFAULT 0,
  final_gray_losses INTEGER NOT NULL DEFAULT 0,
  favorite_color TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak    INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (user_id, scope, season_id)
);

CREATE TABLE IF NOT EXISTS c7_ratings (
  user_id          TEXT NOT NULL,
  season_id        TEXT NOT NULL,
  rating           REAL NOT NULL DEFAULT 1500,
  rating_deviation REAL NOT NULL DEFAULT 350,
  volatility       REAL NOT NULL DEFAULT 0.06,
  matches_count    INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (user_id, season_id)
);

CREATE TABLE IF NOT EXISTS c7_rating_history (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  match_id      TEXT NOT NULL UNIQUE      -- บันทึกครั้งเดียวต่อ Match (กันคิดซ้ำ)
                REFERENCES c7_matches(id),
  season_id     TEXT NOT NULL,
  before_rating REAL NOT NULL,
  after_rating  REAL NOT NULL,
  before_rd     REAL NOT NULL,
  after_rd      REAL NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS c7_seasons (
  id        TEXT PRIMARY KEY,
  slug      TEXT UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at   TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'UPCOMING'   -- UPCOMING | ACTIVE | ENDED
);

-- ── Achievement / Event ──
CREATE TABLE IF NOT EXISTS c7_achievements (
  id             TEXT PRIMARY KEY,
  slug           TEXT UNIQUE NOT NULL,
  name_en        TEXT NOT NULL,
  name_th        TEXT NOT NULL,
  icon_url       TEXT,
  criteria_type  TEXT NOT NULL,
  criteria_value TEXT
);
CREATE TABLE IF NOT EXISTS c7_user_achievements (
  user_id        TEXT NOT NULL,
  achievement_id TEXT NOT NULL REFERENCES c7_achievements(id),
  unlocked_at    TEXT NOT NULL,
  source_id      TEXT,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS c7_events (
  id        TEXT PRIMARY KEY,
  slug      TEXT UNIQUE NOT NULL,
  name      TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at   TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'UPCOMING'
);
CREATE TABLE IF NOT EXISTS c7_event_rewards (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES c7_events(id),
  reward_type TEXT NOT NULL,               -- CARD | CARD_BACK | FRAME | TABLE_SKIN | BADGE |
                                           -- TITLE | EMOTE | COLLECTION_PAGE | PRINTABLE
                                           -- ห้ามเป็น Gameplay Advantage
  reward_id   TEXT NOT NULL,
  criteria    TEXT
);

-- ── Safety / Moderation / Audit ──
CREATE TABLE IF NOT EXISTS c7_reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,               -- NAME | PROFILE
  target_id   TEXT NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'OPEN',
  created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS c7_blocks (
  user_id    TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS c7_audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL,               -- ทุกการแก้ผล Match / Grant / Ban ต้องมีแถวที่นี่
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  metadata    TEXT,                        -- JSON
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_c7_audit ON c7_audit_logs(entity_type, entity_id);

-- Rate limit แบบเดียวกับ reg_hits ของเว็บ (แฮช ไม่เก็บ IP จริง)
CREATE TABLE IF NOT EXISTS c7_rate_hits (
  bucket TEXT PRIMARY KEY,                 -- <hash>:<action>:<YYYY-MM-DDTHH>
  n      INTEGER NOT NULL DEFAULT 1,
  at     TEXT NOT NULL
);

-- ═══ Seed: Collection + การ์ด 28 ใบ + Generic 4 ใบ ═══
INSERT OR IGNORE INTO c7_collections (id, slug, name_en, name_th, description_th, release_date, is_public)
VALUES ('first-hand', 'first-hand', 'FIRST HAND', 'มือแรก',
        'ชุดการ์ดเริ่มต้นของ myClover: CORE7 — ความหมาย 28 คำ สีละ 7 ใบ', '2026-08-08', 1);

INSERT OR IGNORE INTO c7_cards (id, slug, name_en, name_th, color, class_name, card_type, collection_id, is_active, created_at, updated_at) VALUES
  ('fh-red-desire','fh-red-desire','Desire','ความอยาก','RED','TASTER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-red-joy','fh-red-joy','Joy','ความสุข','RED','TASTER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-red-taste','fh-red-taste','Taste','รสชาติ','RED','TASTER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-red-passion','fh-red-passion','Passion','แรงปรารถนา','RED','TASTER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-red-courage','fh-red-courage','Courage','ความกล้า','RED','TASTER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-red-warmth','fh-red-warmth','Warmth','ความอบอุ่น','RED','TASTER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-red-celebration','fh-red-celebration','Celebration','การเฉลิมฉลอง','RED','TASTER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-blue-clarity','fh-blue-clarity','Clarity','ความชัดเจน','BLUE','THINKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-blue-perspective','fh-blue-perspective','Perspective','มุมมอง','BLUE','THINKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-blue-wisdom','fh-blue-wisdom','Wisdom','ปัญญา','BLUE','THINKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-blue-curiosity','fh-blue-curiosity','Curiosity','ความสงสัย','BLUE','THINKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-blue-strategy','fh-blue-strategy','Strategy','กลยุทธ์','BLUE','THINKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-blue-reflection','fh-blue-reflection','Reflection','การทบทวน','BLUE','THINKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-blue-choice','fh-blue-choice','Choice','การเลือก','BLUE','THINKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-green-discipline','fh-green-discipline','Discipline','วินัย','GREEN','KEEPER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-green-consistency','fh-green-consistency','Consistency','ความสม่ำเสมอ','GREEN','KEEPER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-green-balance','fh-green-balance','Balance','สมดุล','GREEN','KEEPER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-green-patience','fh-green-patience','Patience','ความอดทน','GREEN','KEEPER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-green-care','fh-green-care','Care','การดูแล','GREEN','KEEPER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-green-recovery','fh-green-recovery','Recovery','การฟื้นตัว','GREEN','KEEPER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-green-commitment','fh-green-commitment','Commitment','ความตั้งใจมั่น','GREEN','KEEPER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-gray-observe','fh-gray-observe','Observe','สังเกต','GRAY','MAKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-gray-measure','fh-gray-measure','Measure','วัดผล','GRAY','MAKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-gray-build','fh-gray-build','Build','สร้าง','GRAY','MAKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-gray-repair','fh-gray-repair','Repair','ซ่อมแซม','GRAY','MAKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-gray-connect','fh-gray-connect','Connect','เชื่อมต่อ','GRAY','MAKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-gray-adapt','fh-gray-adapt','Adapt','ปรับตัว','GRAY','MAKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('fh-gray-iterate','fh-gray-iterate','Iterate','ทำซ้ำให้ดีขึ้น','GRAY','MAKER','MEANING','first-hand',1,datetime('now'),datetime('now')),
  ('gen-red','gen-red','Red','แดง','RED','TASTER','GENERIC',NULL,1,datetime('now'),datetime('now')),
  ('gen-green','gen-green','Green','เขียว','GREEN','KEEPER','GENERIC',NULL,1,datetime('now'),datetime('now')),
  ('gen-blue','gen-blue','Blue','ฟ้า','BLUE','THINKER','GENERIC',NULL,1,datetime('now'),datetime('now')),
  ('gen-gray','gen-gray','Gray','เทา','GRAY','MAKER','GENERIC',NULL,1,datetime('now'),datetime('now'));
