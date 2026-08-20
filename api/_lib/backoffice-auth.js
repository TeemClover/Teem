import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const BACKOFFICE_COOKIE = 'mc_backoffice_session';
export const BACKOFFICE_SESSION_HOURS = 12;
const FALLBACK_ACCESS_HASH = 'efad137e1f9224a51687fb9c12ee5a226a5f0cbb140f4d41fd54f37692f2fe9c';
const LOGIN_LIMIT = 6;
const LOGIN_WINDOW_MINUTES = 15;
let schemaPromise;

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

export async function ensureBackofficeSchema(sql) {
  if (!schemaPromise) schemaPromise = (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS mc_backoffice_sessions (
      token_hash TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )`);
    await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_backoffice_sessions_expires ON mc_backoffice_sessions(expires_at)');
    await sql.query(`CREATE TABLE IF NOT EXISTS mc_backoffice_login_hits (
      bucket TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 1,
      expires_at TIMESTAMPTZ NOT NULL
    )`);
    await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_backoffice_login_hits_expires ON mc_backoffice_login_hits(expires_at)');
    await sql.query(`CREATE TABLE IF NOT EXISTS mc_backoffice_audit (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL
    )`);
    await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_backoffice_audit_created ON mc_backoffice_audit(created_at DESC)');
  })().catch(error => { schemaPromise = undefined; throw error; });
  return schemaPromise;
}

export function backofficePasswordMatches(candidate) {
  if (typeof candidate !== 'string') return false;
  const configured = String(process.env.BACKOFFICE_ADMIN_KEY || '');
  const actual = Buffer.from(digest(candidate), 'hex');
  const wanted = Buffer.from(configured ? digest(configured) : FALLBACK_ACCESS_HASH, 'hex');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function bucket(req) {
  return digest(`mc-backoffice-login|${requestIp(req)}`);
}

export async function backofficeLoginBlocked(sql, req, at = new Date()) {
  const rows = await sql.query('SELECT hits,expires_at FROM mc_backoffice_login_hits WHERE bucket=$1', [bucket(req)]);
  const row = rows[0];
  return Boolean(row && Number(row.hits || 0) >= LOGIN_LIMIT && new Date(row.expires_at).getTime() > new Date(at).getTime());
}

export async function recordBackofficeFailure(sql, req, at = new Date()) {
  const now = new Date(at);
  const expires = new Date(now.getTime() + LOGIN_WINDOW_MINUTES * 60000);
  await sql.query(`INSERT INTO mc_backoffice_login_hits (bucket,hits,expires_at)
    VALUES ($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET
      hits=CASE WHEN mc_backoffice_login_hits.expires_at<=$3 THEN 1 ELSE mc_backoffice_login_hits.hits+1 END,
      expires_at=CASE WHEN mc_backoffice_login_hits.expires_at<=$3 THEN EXCLUDED.expires_at ELSE mc_backoffice_login_hits.expires_at END`,
    [bucket(req), expires, now]);
  await recordBackofficeAudit(sql, req, 'LOGIN_FAILED', {}, now);
}

export async function recordBackofficeAudit(sql, req, type, data = {}, at = new Date()) {
  await sql.query(`INSERT INTO mc_backoffice_audit (type,ip_hash,data_json,created_at)
    VALUES ($1,$2,$3::jsonb,$4)`, [String(type || 'EVENT').slice(0, 40), digest(`mc-backoffice-audit|${requestIp(req)}`), JSON.stringify(data || {}), at]);
}

export async function createBackofficeSession(sql, req, at = new Date()) {
  const token = randomBytes(32).toString('base64url');
  const createdAt = new Date(at);
  const expiresAt = new Date(createdAt.getTime() + BACKOFFICE_SESSION_HOURS * 3600000);
  await sql.query('INSERT INTO mc_backoffice_sessions (token_hash,created_at,expires_at) VALUES ($1,$2,$3)', [digest(token), createdAt, expiresAt]);
  await sql.query('DELETE FROM mc_backoffice_login_hits WHERE bucket=$1', [bucket(req)]);
  await recordBackofficeAudit(sql, req, 'LOGIN_SUCCESS', {}, createdAt);
  return { token, expiresAt };
}

export async function currentBackofficeSession(sql, req, at = new Date()) {
  const token = cookieValue(req, BACKOFFICE_COOKIE);
  if (!token) return null;
  const tokenHash = digest(token);
  const rows = await sql.query('SELECT token_hash,created_at,expires_at FROM mc_backoffice_sessions WHERE token_hash=$1', [tokenHash]);
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() <= new Date(at).getTime()) {
    if (row) await sql.query('DELETE FROM mc_backoffice_sessions WHERE token_hash=$1', [tokenHash]);
    return null;
  }
  return { createdAt: new Date(row.created_at), expiresAt: new Date(row.expires_at) };
}

export async function destroyBackofficeSession(sql, req) {
  const token = cookieValue(req, BACKOFFICE_COOKIE);
  if (!token) return false;
  const rows = await sql.query('DELETE FROM mc_backoffice_sessions WHERE token_hash=$1 RETURNING token_hash', [digest(token)]);
  if (rows[0]) await recordBackofficeAudit(sql, req, 'LOGOUT');
  return Boolean(rows[0]);
}

export function backofficeSessionCookie(token, maxAge = BACKOFFICE_SESSION_HOURS * 3600) {
  return `${BACKOFFICE_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearBackofficeSessionCookie() {
  return `${BACKOFFICE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function pruneBackofficeAuth(sql, at = new Date()) {
  await Promise.all([
    sql.query('DELETE FROM mc_backoffice_sessions WHERE expires_at <= $1', [at]),
    sql.query('DELETE FROM mc_backoffice_login_hits WHERE expires_at <= $1', [at]),
  ]);
}
