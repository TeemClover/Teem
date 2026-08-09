-- myClover optional account + cloud progress (Cloudflare D1)
-- Runtime Pages Functions also run CREATE TABLE IF NOT EXISTS, so this file is optional
-- for a fresh database and useful for inspecting/applying the schema manually.

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  nickname TEXT,
  card_line TEXT,
  class TEXT,
  era TEXT,
  era_th TEXT,
  titles TEXT,
  news INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT NOT NULL,
  source TEXT
);

CREATE TABLE IF NOT EXISTS mc_accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  password_iterations INTEGER,
  member_no TEXT,
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mc_auth_identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_mc_auth_user ON mc_auth_identities(user_id);

CREATE TABLE IF NOT EXISTS mc_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mc_sessions_user ON mc_sessions(user_id);

CREATE TABLE IF NOT EXISTS mc_progress (
  user_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  progress_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mc_oauth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mc_auth_hits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);
