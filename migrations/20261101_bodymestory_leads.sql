-- Body Me Story: additive schema. Test on an isolated Neon branch before production.
-- No personal data belongs in this migration or the public Git repository.
BEGIN;
CREATE TABLE IF NOT EXISTS body_leads (
  id UUID PRIMARY KEY,
  campaign TEXT NOT NULL,
  email TEXT NOT NULL CHECK (email=lower(btrim(email))),
  name TEXT NOT NULL DEFAULT '',
  privacy_acknowledged_at TIMESTAMPTZ NOT NULL,
  privacy_version TEXT NOT NULL,
  marketing_consent_at TIMESTAMPTZ,
  marketing_consent_version TEXT,
  ads_consent_at TIMESTAMPTZ,
  ads_consent_version TEXT,
  first_source TEXT NOT NULL,
  last_source TEXT NOT NULL,
  first_episode TEXT,
  last_episode TEXT,
  first_utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(campaign,email),
  CHECK ((marketing_consent_at IS NULL)=(marketing_consent_version IS NULL)),
  CHECK ((ads_consent_at IS NULL)=(ads_consent_version IS NULL))
);
CREATE TABLE IF NOT EXISTS body_lead_events (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES body_leads(id) ON DELETE CASCADE,
  campaign TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type='workbook_requested'),
  payload_hash TEXT NOT NULL,
  source TEXT NOT NULL,
  episode TEXT,
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  privacy_version TEXT NOT NULL,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ads_consent BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS body_leads_campaign_created ON body_leads(campaign,created_at DESC);
CREATE INDEX IF NOT EXISTS body_lead_events_lead_time ON body_lead_events(lead_id,occurred_at DESC);
CREATE TABLE IF NOT EXISTS body_lead_rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
COMMIT;
