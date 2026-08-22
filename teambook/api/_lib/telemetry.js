import { randomUUID } from 'node:crypto';

export const VISITOR_COOKIE = 'teambook_visitor';
export const SESSION_COOKIE = 'teambook_analytics_session';
export const SESSION_SECONDS = 30 * 60;
export const VISITOR_SECONDS = 365 * 24 * 60 * 60;

let schemaPromise;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS teambook_analytics_visitors (
    visitor_id TEXT PRIMARY KEY,
    actor_id TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    first_path TEXT NOT NULL,
    last_path TEXT NOT NULL,
    first_referrer TEXT,
    session_count INTEGER NOT NULL DEFAULT 0,
    page_view_count INTEGER NOT NULL DEFAULT 0,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    max_scroll INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_visitors_last_seen
    ON teambook_analytics_visitors(last_seen_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_visitors_actor
    ON teambook_analytics_visitors(actor_id,last_seen_at DESC)`,
  `CREATE TABLE IF NOT EXISTS teambook_analytics_sessions (
    session_id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    actor_id TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    entry_path TEXT NOT NULL,
    page_views INTEGER NOT NULL DEFAULT 0,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    max_scroll INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_sessions_started
    ON teambook_analytics_sessions(started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_sessions_visitor
    ON teambook_analytics_sessions(visitor_id,started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_sessions_actor
    ON teambook_analytics_sessions(actor_id,started_at DESC)`,
  `CREATE TABLE IF NOT EXISTS teambook_analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    actor_id TEXT,
    event_type TEXT NOT NULL,
    path TEXT NOT NULL,
    title TEXT,
    referrer TEXT,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    scroll_depth INTEGER NOT NULL DEFAULT 0,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_events_time
    ON teambook_analytics_events(occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_events_type_time
    ON teambook_analytics_events(event_type,occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_events_path_time
    ON teambook_analytics_events(path,occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_analytics_events_actor_time
    ON teambook_analytics_events(actor_id,occurred_at DESC)`,
];

export async function ensureTelemetrySchema(sql) {
  if (!schemaPromise) schemaPromise = (async () => {
    for (const statement of SCHEMA) await sql.query(statement);
  })().catch(error => { schemaPromise = undefined; throw error; });
  return schemaPromise;
}

export function cookieValue(req, name) {
  for (const part of String(req?.headers?.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0 || part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); }
    catch { return ''; }
  }
  return '';
}

function safeId(value, max = 100) {
  const text = String(value || '').trim();
  return /^[a-zA-Z0-9:_-]+$/.test(text) ? text.slice(0, max) : '';
}

export function visitorId(req) {
  return safeId(cookieValue(req, VISITOR_COOKIE), 80) || `v_${randomUUID()}`;
}

export function sessionId(req) {
  return safeId(cookieValue(req, SESSION_COOKIE), 80) || `s_${randomUUID()}`;
}

export function analyticsCookies(visitor, session) {
  return [
    `${VISITOR_COOKIE}=${encodeURIComponent(visitor)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${VISITOR_SECONDS}`,
    `${SESSION_COOKIE}=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
  ];
}

export function cleanPath(value) {
  let path = String(value || '/').trim();
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch { path = '/'; }
  path = path.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  return path.slice(0, 320) || '/';
}

export function cleanReferrer(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (/^(www\.)?teambook\.me$/i.test(url.hostname)) return cleanPath(url.pathname);
    return url.hostname.slice(0, 180);
  } catch { return ''; }
}

export function normalizeActor(account, localProfileId) {
  if (account?.id) return `account:${String(account.id).slice(0, 100)}`;
  const local = safeId(localProfileId, 80);
  return local ? `local:${local}` : null;
}

export function normalizeEvent(body = {}) {
  const allowed = new Set(['PAGE_VIEW', 'ENGAGEMENT', 'NAVIGATE']);
  const eventType = String(body.eventType || '').trim().toUpperCase();
  if (!allowed.has(eventType)) return null;
  const eventId = safeId(body.eventId, 120) || `e_${randomUUID()}`;
  const activeSeconds = Math.max(0, Math.min(300, Math.floor(Number(body.activeSeconds || 0))));
  const scrollDepth = Math.max(0, Math.min(100, Math.floor(Number(body.scrollDepth || 0))));
  const occurredRaw = Number(body.occurredAt || Date.now());
  const occurredAt = new Date(Number.isFinite(occurredRaw) ? occurredRaw : Date.now());
  const safeOccurredAt = Math.abs(Date.now() - occurredAt.getTime()) > 24 * 60 * 60 * 1000 ? new Date() : occurredAt;
  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? Object.fromEntries(Object.entries(body.metadata).slice(0, 12).map(([key, value]) => [String(key).slice(0, 60), String(value ?? '').slice(0, 180)]))
    : {};
  return {
    eventId,
    eventType,
    path: cleanPath(body.path),
    title: String(body.title || '').trim().slice(0, 180),
    referrer: cleanReferrer(body.referrer),
    localProfileId: safeId(body.localProfileId, 80),
    activeSeconds,
    scrollDepth,
    occurredAt: safeOccurredAt,
    metadata,
  };
}

export async function recordTelemetry(sql, { visitor, session, actorId, event }) {
  const now = new Date();
  const insertedSession = await sql.query(`INSERT INTO teambook_analytics_sessions
    (session_id,visitor_id,actor_id,started_at,last_seen_at,entry_path,page_views,active_seconds,max_scroll)
    VALUES ($1,$2,$3,$4,$4,$5,0,0,0)
    ON CONFLICT(session_id) DO NOTHING RETURNING session_id`,
  [session, visitor, actorId, now, event.path]);

  await sql.query(`INSERT INTO teambook_analytics_visitors
    (visitor_id,actor_id,first_seen_at,last_seen_at,first_path,last_path,first_referrer,session_count,page_view_count,active_seconds,max_scroll)
    VALUES ($1,$2,$3,$3,$4,$4,$5,$6,0,0,0)
    ON CONFLICT(visitor_id) DO UPDATE SET
      actor_id=COALESCE(EXCLUDED.actor_id,teambook_analytics_visitors.actor_id),
      last_seen_at=EXCLUDED.last_seen_at,
      last_path=EXCLUDED.last_path,
      session_count=teambook_analytics_visitors.session_count + $6`,
  [visitor, actorId, now, event.path, event.referrer || null, insertedSession.length ? 1 : 0]);

  const inserted = await sql.query(`INSERT INTO teambook_analytics_events
    (event_id,visitor_id,session_id,actor_id,event_type,path,title,referrer,active_seconds,scroll_depth,metadata_json,occurred_at,received_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
    ON CONFLICT(event_id) DO NOTHING RETURNING id`,
  [event.eventId, visitor, session, actorId, event.eventType, event.path, event.title || null,
    event.referrer || null, event.activeSeconds, event.scrollDepth, JSON.stringify(event.metadata || {}), event.occurredAt, now]);

  if (!inserted.length) return { duplicate: true };

  const pageInc = event.eventType === 'PAGE_VIEW' ? 1 : 0;
  const activeInc = event.eventType === 'ENGAGEMENT' ? event.activeSeconds : 0;
  await Promise.all([
    sql.query(`UPDATE teambook_analytics_sessions SET
      actor_id=COALESCE($1,actor_id),last_seen_at=$2,
      page_views=page_views+$3,active_seconds=active_seconds+$4,max_scroll=GREATEST(max_scroll,$5)
      WHERE session_id=$6`, [actorId, now, pageInc, activeInc, event.scrollDepth, session]),
    sql.query(`UPDATE teambook_analytics_visitors SET
      actor_id=COALESCE($1,actor_id),last_seen_at=$2,last_path=$3,
      page_view_count=page_view_count+$4,active_seconds=active_seconds+$5,max_scroll=GREATEST(max_scroll,$6)
      WHERE visitor_id=$7`, [actorId, now, event.path, pageInc, activeInc, event.scrollDepth, visitor]),
  ]);
  return { duplicate: false };
}
