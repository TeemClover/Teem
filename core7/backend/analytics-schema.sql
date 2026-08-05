-- myClover: CORE7 aggregate analytics
-- Runtime code also runs CREATE TABLE IF NOT EXISTS, so production D1 upgrades lazily.
-- No player names, player ids, hands, IP addresses, or auth tokens are stored here.

CREATE TABLE IF NOT EXISTS c7_analytics_matches (
  match_id        TEXT PRIMARY KEY,
  series_id       TEXT,
  source          TEXT NOT NULL CHECK(source IN ('BOT','ONLINE')),
  bot_level       TEXT CHECK(bot_level IS NULL OR bot_level IN ('easy','hard')),
  format          TEXT NOT NULL CHECK(format IN ('quick','bo3','bo5')),
  status          TEXT NOT NULL CHECK(status IN ('STARTED','COMPLETED','ABANDONED')),
  winner          TEXT CHECK(winner IS NULL OR winner IN ('HUMAN','BOT','A','B','DRAW')),
  result_type     TEXT,
  rounds          INTEGER NOT NULL DEFAULT 0,
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,
  duration_ms     INTEGER,
  rules_version   TEXT,
  played_red      INTEGER NOT NULL DEFAULT 0,
  played_green    INTEGER NOT NULL DEFAULT 0,
  played_blue     INTEGER NOT NULL DEFAULT 0,
  played_silver     INTEGER NOT NULL DEFAULT 0,
  discarded_red   INTEGER NOT NULL DEFAULT 0,
  discarded_green INTEGER NOT NULL DEFAULT 0,
  discarded_blue  INTEGER NOT NULL DEFAULT 0,
  discarded_silver  INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_c7_analytics_matches_started
  ON c7_analytics_matches(started_at, source, status);
CREATE INDEX IF NOT EXISTS idx_c7_analytics_matches_series
  ON c7_analytics_matches(series_id, started_at);

CREATE TABLE IF NOT EXISTS c7_analytics_series (
  series_id       TEXT PRIMARY KEY,
  format          TEXT NOT NULL CHECK(format IN ('quick','bo3','bo5')),
  status          TEXT NOT NULL CHECK(status IN ('STARTED','COMPLETED','ABANDONED')),
  target_wins     INTEGER NOT NULL,
  winner          TEXT CHECK(winner IS NULL OR winner IN ('A','B','DRAW')),
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,
  duration_ms     INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_c7_analytics_series_started
  ON c7_analytics_series(started_at, format, status);

CREATE TABLE IF NOT EXISTS c7_analytics_card_events (
  match_id        TEXT NOT NULL,
  card_id         TEXT NOT NULL,
  color           TEXT NOT NULL CHECK(color IN ('RED','GREEN','BLUE','SILVER')),
  event_type      TEXT NOT NULL CHECK(event_type IN ('PLAYED','DISCARDED')),
  n               INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(match_id, card_id, color, event_type)
);
CREATE INDEX IF NOT EXISTS idx_c7_analytics_card_events_card
  ON c7_analytics_card_events(card_id, color, event_type);
