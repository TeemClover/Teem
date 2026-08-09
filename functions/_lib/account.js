const SESSION_COOKIE = 'mc_session';
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 210000;

const encoder = new TextEncoder();

export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  },
});

export function clean(value, max = 200) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max)
    : '';
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 120;
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function sha256(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function randomToken(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function derivePassword(password, saltHex, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: hexToBytes(saltHex),
    iterations,
  }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

export async function newPasswordRecord(password) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await derivePassword(password, salt), iterations: PASSWORD_ITERATIONS };
}

export async function passwordMatches(password, row) {
  if (!row.password_hash || !row.password_salt) return false;
  const wanted = await derivePassword(password, row.password_salt, row.password_iterations || PASSWORD_ITERATIONS);
  if (wanted.length !== row.password_hash.length) return false;
  let diff = 0;
  for (let i = 0; i < wanted.length; i += 1) diff |= wanted.charCodeAt(i) ^ row.password_hash.charCodeAt(i);
  return diff === 0;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS members (
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
  )`,
  `CREATE TABLE IF NOT EXISTS mc_accounts (
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
  )`,
  `CREATE TABLE IF NOT EXISTS mc_auth_identities (
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    email TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (provider, provider_user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mc_auth_user ON mc_auth_identities(user_id)`,
  `CREATE TABLE IF NOT EXISTS mc_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mc_sessions_user ON mc_sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS mc_progress (
    user_id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    progress_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mc_oauth_states (
    state_hash TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    verifier TEXT NOT NULL,
    return_to TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mc_auth_hits (
    bucket TEXT PRIMARY KEY,
    hits INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT NOT NULL
  )`,
];

export async function ensureAccountSchema(db) {
  await db.batch(SCHEMA.map(sql => db.prepare(sql)));
}

function cookieValue(request, name) {
  const source = request.headers.get('Cookie') || '';
  for (const part of source.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(db, userId) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  await db.prepare(
    'INSERT INTO mc_sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)'
  ).bind(await sha256(token), userId, now.toISOString(), expires.toISOString()).run();
  return token;
}

export async function authRateLimited(db, request, action, identifier, limit, windowMinutes) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = new Date();
  const window = Math.floor(now.getTime() / (windowMinutes * 60000));
  const bucket = await sha256(`${action}|${ip}|${identifier}|${window}|myclover`);
  const expires = new Date((window + 1) * windowMinutes * 60000).toISOString();
  await db.prepare(
    `INSERT INTO mc_auth_hits (bucket, hits, expires_at) VALUES (?1, 1, ?2)
     ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1`
  ).bind(bucket, expires).run();
  const row = await db.prepare('SELECT hits FROM mc_auth_hits WHERE bucket = ?1').bind(bucket).first();
  await db.prepare('DELETE FROM mc_auth_hits WHERE expires_at <= ?1').bind(now.toISOString()).run();
  return !!row && Number(row.hits) > limit;
}

export async function ensureMemberNo(db, email, name, now = new Date().toISOString()) {
  if (!email) return '';
  await db.prepare(
    `INSERT INTO members (created_at, updated_at, email, name, news, consent_at, source)
     VALUES (?1, ?1, ?2, ?3, 0, ?1, 'account')
     ON CONFLICT(email) DO UPDATE SET updated_at = ?1, name = CASE WHEN name = '' THEN ?3 ELSE name END`
  ).bind(now, email.toLowerCase(), clean(name, 80) || 'Clover').run();
  const row = await db.prepare('SELECT id, member_no, created_at FROM members WHERE email = ?1')
    .bind(email.toLowerCase()).first();
  if (!row) return '';
  if (row.member_no) return row.member_no;
  const year = new Date(row.created_at || now).getUTCFullYear();
  const prefix = `MY-${year}-`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const latest = await db.prepare(
      'SELECT MAX(CAST(substr(member_no, 9) AS INTEGER)) AS mx FROM members WHERE member_no LIKE ?1'
    ).bind(`${prefix}%`).first();
    const wanted = prefix + String(Number(latest && latest.mx || 0) + 1).padStart(4, '0');
    try {
      await db.prepare('UPDATE members SET member_no = ?1 WHERE id = ?2 AND member_no IS NULL').bind(wanted, row.id).run();
      const saved = await db.prepare('SELECT member_no FROM members WHERE id = ?1').bind(row.id).first();
      if (saved && saved.member_no) return saved.member_no;
    } catch { /* another signup claimed the number; retry */ }
  }
  return '';
}

export async function currentUser(request, db) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const hash = await sha256(token);
  const row = await db.prepare(
    `SELECT a.id, a.email, a.display_name, a.member_no, s.expires_at
       FROM mc_sessions s JOIN mc_accounts a ON a.id = s.user_id
      WHERE s.token_hash = ?1`
  ).bind(hash).first();
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    await db.prepare('DELETE FROM mc_sessions WHERE token_hash = ?1').bind(hash).run();
    return null;
  }
  return { id: row.id, email: row.email || '', displayName: row.display_name, memberNo: row.member_no || '' };
}

export async function destroySession(request, db) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await db.prepare('DELETE FROM mc_sessions WHERE token_hash = ?1').bind(await sha256(token)).run();
}

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return origin === new URL(request.url).origin; } catch { return false; }
}

export function safeReturn(value) {
  const path = clean(value, 300);
  return path.startsWith('/') && !path.startsWith('//') ? path : '/card/';
}

export function providerConfig(env, provider) {
  if (provider === 'google' && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    return { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET };
  }
  if (provider === 'line' && env.LINE_CHANNEL_ID && env.LINE_CHANNEL_SECRET) {
    return { id: env.LINE_CHANNEL_ID, secret: env.LINE_CHANNEL_SECRET };
  }
  return null;
}

export async function createOAuthState(db, provider, returnTo) {
  const state = randomToken(24);
  const verifier = randomToken(48);
  const now = new Date();
  await db.prepare(
    `INSERT INTO mc_oauth_states (state_hash, provider, verifier, return_to, created_at, expires_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(await sha256(state), provider, verifier, safeReturn(returnTo), now.toISOString(), new Date(now.getTime() + 10 * 60000).toISOString()).run();
  return { state, verifier };
}

export async function consumeOAuthState(db, provider, state) {
  const hash = await sha256(state || '');
  const row = await db.prepare(
    'SELECT provider, verifier, return_to, expires_at FROM mc_oauth_states WHERE state_hash = ?1'
  ).bind(hash).first();
  await db.prepare('DELETE FROM mc_oauth_states WHERE state_hash = ?1').bind(hash).run();
  if (!row || row.provider !== provider || Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

export async function pkceChallenge(verifier) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function accountForIdentity(db, identity) {
  const linked = await db.prepare(
    `SELECT a.id, a.email, a.display_name, a.member_no
       FROM mc_auth_identities i JOIN mc_accounts a ON a.id = i.user_id
      WHERE i.provider = ?1 AND i.provider_user_id = ?2`
  ).bind(identity.provider, identity.id).first();
  if (linked) {
    if (identity.email && !linked.member_no) {
      const now = new Date().toISOString();
      const memberNo = await ensureMemberNo(db, identity.email, identity.name, now);
      if (memberNo) {
        await db.prepare('UPDATE mc_accounts SET member_no = ?1, updated_at = ?2 WHERE id = ?3').bind(memberNo, now, linked.id).run();
        linked.member_no = memberNo;
      }
    }
    return linked;
  }

  let account = null;
  if (identity.email) account = await db.prepare(
    'SELECT id, email, display_name, member_no FROM mc_accounts WHERE email = ?1'
  ).bind(identity.email.toLowerCase()).first();

  const now = new Date().toISOString();
  const memberNo = identity.email ? await ensureMemberNo(db, identity.email, identity.name, now) : '';
  if (!account) {
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO mc_accounts (id, email, display_name, member_no, consent_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?5)`
    ).bind(id, identity.email ? identity.email.toLowerCase() : null, clean(identity.name, 80) || 'Clover', memberNo || null, now).run();
    account = { id, email: identity.email || '', display_name: clean(identity.name, 80) || 'Clover', member_no: memberNo };
  } else if (memberNo && !account.member_no) {
    await db.prepare('UPDATE mc_accounts SET member_no = ?1, updated_at = ?2 WHERE id = ?3').bind(memberNo, now, account.id).run();
    account.member_no = memberNo;
  }
  await db.prepare(
    `INSERT OR IGNORE INTO mc_auth_identities
       (provider, provider_user_id, user_id, email, created_at) VALUES (?1, ?2, ?3, ?4, ?5)`
  ).bind(identity.provider, identity.id, account.id, identity.email || null, now).run();
  return account;
}

export function publicUser(row) {
  return row ? {
    id: row.id,
    email: row.email || '',
    displayName: row.display_name || row.displayName || 'Clover',
    memberNo: row.member_no || row.memberNo || '',
  } : null;
}

export async function prune(db) {
  const now = new Date().toISOString();
  await db.batch([
    db.prepare('DELETE FROM mc_sessions WHERE expires_at <= ?1').bind(now),
    db.prepare('DELETE FROM mc_oauth_states WHERE expires_at <= ?1').bind(now),
  ]);
}
