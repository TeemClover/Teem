import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const XTY_ADMIN_COOKIE = 'xty_admin_session';
export const XTY_ADMIN_SESSION_HOURS = 10;
export const XTY_ADMIN_LOGIN_LIMIT = 5;
export const XTY_ADMIN_LOGIN_WINDOW_MINUTES = 15;
let adminSchemaPromise;

const ADMIN_SCHEMA = Object.freeze([
  `CREATE TABLE IF NOT EXISTS xty_admin_sessions (
    token_hash TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_xty_admin_sessions_expires ON xty_admin_sessions(expires_at)',
  `CREATE TABLE IF NOT EXISTS xty_admin_login_hits (
    bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_xty_admin_login_hits_expires ON xty_admin_login_hits(expires_at)',
  `CREATE TABLE IF NOT EXISTS xty_admin_audit (
    id BIGSERIAL PRIMARY KEY, type TEXT NOT NULL, ip_hash TEXT NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_xty_admin_audit_created ON xty_admin_audit(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_xty_parties_state ON xty_parties(state)',
  'CREATE INDEX IF NOT EXISTS idx_xty_parties_visibility_state ON xty_parties(visibility,state)',
  'CREATE INDEX IF NOT EXISTS idx_xty_parties_verification_state ON xty_parties(verification_mode,state)',
  'CREATE INDEX IF NOT EXISTS idx_xty_parties_created ON xty_parties(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_xty_parties_updated ON xty_parties(updated_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_xty_members_user ON xty_members(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_xty_members_party_left ON xty_members(party_id,left_at)',
  'CREATE INDEX IF NOT EXISTS idx_xty_posts_user_sent ON xty_posts(user_id,sent_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_xty_posts_kind_sent ON xty_posts(kind,sent_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_xty_reactions_created ON xty_reactions(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_xty_confirmations_created ON xty_confirmations(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_xty_party_events_type_created ON xty_party_events(type,created_at DESC)',
]);

export async function ensureXtyAdminSchema(sql) {
  if (!adminSchemaPromise) adminSchemaPromise = (async () => {
    for (const statement of ADMIN_SCHEMA) await sql.query(statement);
  })().catch(error => { adminSchemaPromise = undefined; throw error; });
  return adminSchemaPromise;
}

function digest(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function cookieValue(req, name) {
  for (const part of String(req?.headers?.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); }
      catch { return ''; }
    }
  }
  return '';
}

function requestIp(req) {
  return String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim().slice(0, 120);
}

export function adminPasswordMatches(candidate, secret = process.env.XTY_ADMIN_PASSWORD || '') {
  if (!secret || typeof candidate !== 'string') return false;
  const actual = Buffer.from(digest(candidate), 'hex');
  const wanted = Buffer.from(digest(secret), 'hex');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export function adminSessionCookie(token, maxAge = XTY_ADMIN_SESSION_HOURS * 3600) {
  return `${XTY_ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearAdminSessionCookie() {
  return `${XTY_ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function adminLoginBucket(req) {
  return digest(`xty-admin-login|${requestIp(req)}`);
}

export async function adminLoginBlocked(sql, req, at = new Date()) {
  const rows = await sql.query('SELECT hits,expires_at FROM xty_admin_login_hits WHERE bucket=$1', [adminLoginBucket(req)]);
  const row = rows[0];
  return Boolean(row && Number(row.hits || 0) >= XTY_ADMIN_LOGIN_LIMIT
    && new Date(row.expires_at).getTime() > new Date(at).getTime());
}

export async function recordAdminAudit(sql, req, type, data = {}, at = new Date()) {
  const safeType = ['ADMIN_LOGIN_SUCCESS', 'ADMIN_LOGIN_FAILED', 'ADMIN_LOGOUT'].includes(type)
    ? type : 'ADMIN_EVENT';
  const ipHash = digest(`xty-admin-audit|${requestIp(req)}`);
  await sql.query(`INSERT INTO xty_admin_audit (type,ip_hash,data_json,created_at)
    VALUES ($1,$2,$3::jsonb,$4)`, [safeType, ipHash, JSON.stringify(data || {}), at]);
}

export async function recordAdminLoginFailure(sql, req, at = new Date()) {
  const now = new Date(at);
  const expires = new Date(now.getTime() + XTY_ADMIN_LOGIN_WINDOW_MINUTES * 60000);
  const rows = await sql.query(`INSERT INTO xty_admin_login_hits (bucket,hits,expires_at)
    VALUES ($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET
      hits=CASE WHEN xty_admin_login_hits.expires_at<=$3 THEN 1 ELSE xty_admin_login_hits.hits+1 END,
      expires_at=CASE WHEN xty_admin_login_hits.expires_at<=$3 THEN EXCLUDED.expires_at ELSE xty_admin_login_hits.expires_at END
    RETURNING hits`, [adminLoginBucket(req), expires, now]);
  await recordAdminAudit(sql, req, 'ADMIN_LOGIN_FAILED', {}, now);
  return Number(rows[0]?.hits || 1);
}

export async function createAdminSession(sql, req, at = new Date()) {
  const token = randomBytes(32).toString('base64url');
  const createdAt = new Date(at);
  const expiresAt = new Date(createdAt.getTime() + XTY_ADMIN_SESSION_HOURS * 3600000);
  await sql.query(`INSERT INTO xty_admin_sessions (token_hash,created_at,expires_at)
    VALUES ($1,$2,$3)`, [digest(token), createdAt, expiresAt]);
  await recordAdminAudit(sql, req, 'ADMIN_LOGIN_SUCCESS', {}, createdAt);
  return { token, expiresAt };
}

export async function currentAdminSession(sql, req, at = new Date()) {
  const token = cookieValue(req, XTY_ADMIN_COOKIE);
  if (!token) return null;
  const tokenHash = digest(token);
  const rows = await sql.query(`SELECT token_hash,created_at,expires_at FROM xty_admin_sessions
    WHERE token_hash=$1`, [tokenHash]);
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() <= new Date(at).getTime()) {
    if (row) await sql.query('DELETE FROM xty_admin_sessions WHERE token_hash=$1', [tokenHash]);
    return null;
  }
  return { createdAt: new Date(row.created_at), expiresAt: new Date(row.expires_at) };
}

export async function destroyAdminSession(sql, req, at = new Date()) {
  const token = cookieValue(req, XTY_ADMIN_COOKIE);
  if (!token) return false;
  const deleted = await sql.query('DELETE FROM xty_admin_sessions WHERE token_hash=$1 RETURNING token_hash', [digest(token)]);
  if (!deleted[0]) return false;
  await recordAdminAudit(sql, req, 'ADMIN_LOGOUT', {}, at);
  return true;
}

export async function pruneAdminAuth(sql, at = new Date()) {
  await Promise.all([
    sql.query('DELETE FROM xty_admin_sessions WHERE expires_at <= $1', [at]),
    sql.query('DELETE FROM xty_admin_login_hits WHERE expires_at <= $1', [at]),
  ]);
}
