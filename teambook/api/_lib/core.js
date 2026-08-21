import { neon } from '@neondatabase/serverless';
import { randomUUID, webcrypto } from 'node:crypto';

const SESSION_COOKIE = 'teambook_session';
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 210000;
const encoder = new TextEncoder();
const crypto = webcrypto;
let schemaPromise;

export function database() {
  const url = process.env.TEAMBOOK_DATABASE_URL || process.env.STORAGE_DATABASE_URL || process.env.STORAGE_URL || process.env.DATABASE_URL;
  if (!url) {
    const error = new Error('TEAMBOOK_DATABASE_URL_NOT_CONFIGURED');
    error.code = 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED';
    throw error;
  }
  return neon(url);
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS teambook_member_numbers (
    id BIGSERIAL PRIMARY KEY, member_no TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    nickname TEXT, card_line TEXT, class TEXT, era TEXT, era_th TEXT, titles TEXT,
    news BOOLEAN NOT NULL DEFAULT FALSE, consent_at TIMESTAMPTZ NOT NULL, source TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, display_name TEXT NOT NULL, password_hash TEXT,
    password_salt TEXT, password_iterations INTEGER, member_no TEXT, consent_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_auth_identities (
    provider TEXT NOT NULL, provider_user_id TEXT NOT NULL, user_id TEXT NOT NULL,
    email TEXT, created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (provider, provider_user_id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_teambook_users_member_no ON teambook_users(member_no) WHERE member_no IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_auth_user ON teambook_auth_identities(user_id)`,
  `CREATE TABLE IF NOT EXISTS teambook_sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_sessions_user ON teambook_sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS teambook_profile_state (
    user_id TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 1,
    profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_oauth_states (
    state_hash TEXT PRIMARY KEY, provider TEXT NOT NULL, verifier TEXT NOT NULL,
    return_to TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_auth_hits (
    bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_email_otps (
    id TEXT PRIMARY KEY, normalized_email TEXT NOT NULL, otp_hash TEXT NOT NULL,
    otp_salt TEXT NOT NULL, attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_email_otps_email ON teambook_email_otps(normalized_email, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS teambook_counters (
    key TEXT PRIMARY KEY, value BIGINT NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_books (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    activity TEXT, commit_rule TEXT, budget TEXT NOT NULL DEFAULT 'normal',
    pet_id TEXT, owner_id TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL, head_seq INTEGER NOT NULL DEFAULT 0,
    pet_last_wake TIMESTAMPTZ
  )`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'ACTIVE'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS activity_id TEXT`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS preset TEXT NOT NULL DEFAULT 'casual'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 7`,
  `ALTER TABLE teambook_books ALTER COLUMN duration_days SET DEFAULT 7`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'green'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS lead_card_id TEXT`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS npc_card_id TEXT`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS verification_mode TEXT NOT NULL DEFAULT 'trust'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS cover_type TEXT NOT NULL DEFAULT 'card_back'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS cover_value TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_books_owner_state ON teambook_books(owner_id, state)`,
  // A book's activity may belong to everyone (shared) or to each person
  // (individual). Older books predate the question and are shared.
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS activity_mode TEXT NOT NULL DEFAULT 'shared'`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS shared_activity_description TEXT`,
  `ALTER TABLE teambook_books ADD COLUMN IF NOT EXISTS shared_activity_color TEXT`,
  `CREATE TABLE IF NOT EXISTS teambook_book_members (
    book_id TEXT NOT NULL, user_id TEXT NOT NULL, alias TEXT NOT NULL,
    avatar TEXT, role TEXT NOT NULL, auth_hash TEXT, joined_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (book_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_book_members_auth ON teambook_book_members(book_id, auth_hash)`,
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ`,
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS removal_reason TEXT`,
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT 'green'`,
  // In individual mode this is where the activity actually lives; in shared
  // mode only the rule is the member's own.
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS activity_id TEXT`,
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS activity_label TEXT`,
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS activity_description TEXT`,
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS activity_color TEXT`,
  `ALTER TABLE teambook_book_members ADD COLUMN IF NOT EXISTS success_rule TEXT`,
  `CREATE TABLE IF NOT EXISTS teambook_book_entries (
    book_id TEXT NOT NULL, seq INTEGER NOT NULL, user_id TEXT NOT NULL,
    kind TEXT NOT NULL, body TEXT NOT NULL, sent_at TIMESTAMPTZ NOT NULL,
    day_key DATE NOT NULL, retracted BOOLEAN NOT NULL DEFAULT FALSE,
    pet_id TEXT, wake_hour INTEGER, PRIMARY KEY (book_id, seq)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_book_entries_day ON teambook_book_entries(book_id, day_key, kind)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_teambook_one_commit_per_day
     ON teambook_book_entries(book_id, user_id, day_key) WHERE kind = 'commit'`,
  // Chat images. The bytes live in blob storage; only the URL and the
  // intrinsic size ride along so the log can reserve space before load.
  // A signed day carries its own copy of what it was signed under. Without
  // this, changing an activity today would rewrite every past day's meaning.
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS activity_id TEXT`,
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS activity_label TEXT`,
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS activity_color TEXT`,
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS success_rule_snapshot TEXT`,
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS reward_source TEXT`,
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS image_url TEXT`,
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS image_w INTEGER`,
  `ALTER TABLE teambook_book_entries ADD COLUMN IF NOT EXISTS image_h INTEGER`,
  `CREATE TABLE IF NOT EXISTS teambook_reactions (
    book_id TEXT NOT NULL, seq INTEGER NOT NULL, user_id TEXT NOT NULL,
    emoji TEXT NOT NULL, PRIMARY KEY (book_id, seq, user_id, emoji)
  )`,
  `ALTER TABLE teambook_reactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS teambook_confirmations (
    book_id TEXT NOT NULL, commit_seq INTEGER NOT NULL, confirmer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (book_id, commit_seq)
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_book_events (
    id BIGSERIAL PRIMARY KEY, book_id TEXT NOT NULL, type TEXT NOT NULL,
    actor_id TEXT, party_day INTEGER NOT NULL DEFAULT 1,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_book_events_party ON teambook_book_events(book_id, id)`,
  `CREATE TABLE IF NOT EXISTS teambook_progression (
    user_id TEXT PRIMARY KEY, level INTEGER NOT NULL DEFAULT 1,
    paid_tier TEXT NOT NULL DEFAULT 'free', unlocked_bonus_slots INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_level_events (
    user_id TEXT NOT NULL, book_id TEXT NOT NULL, from_level INTEGER NOT NULL,
    to_level INTEGER NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, book_id)
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_user_cards (
    user_id TEXT NOT NULL, card_id TEXT NOT NULL, acquired_from TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (user_id, card_id)
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_cards (
    card_id TEXT PRIMARY KEY, series TEXT NOT NULL DEFAULT 'TeamBook',
    color TEXT NOT NULL, rarity TEXT NOT NULL, name_th TEXT NOT NULL,
    name_en TEXT, art_asset TEXT, metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS teambook_card_unlock_events (
    id TEXT PRIMARY KEY, unlock_event_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL, book_id TEXT, card_id TEXT,
    unlock_source TEXT NOT NULL, series TEXT NOT NULL DEFAULT 'TeamBook',
    created_at TIMESTAMPTZ NOT NULL, revealed_at TIMESTAMPTZ,
    UNIQUE (user_id, book_id, unlock_source)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_card_unlock_events_book ON teambook_card_unlock_events(book_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_teambook_first_seen_reward_once
    ON teambook_card_unlock_events(user_id) WHERE unlock_source = 'first_seen'`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_user_cards_user ON teambook_user_cards(user_id, acquired_at)`,
  `CREATE TABLE IF NOT EXISTS teambook_system_errors (
    id BIGSERIAL PRIMARY KEY, error_code TEXT NOT NULL, endpoint TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_system_errors_created ON teambook_system_errors(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS teambook_devices (
    device_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, platform TEXT NOT NULL,
    push_token TEXT, permission_status TEXT NOT NULL DEFAULT 'unknown',
    last_seen_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teambook_devices_user ON teambook_devices(user_id,last_seen_at DESC)`,
  `CREATE TABLE IF NOT EXISTS teambook_uploads (
    id TEXT PRIMARY KEY, user_id TEXT, book_id TEXT, storage_url TEXT NOT NULL,
    mime_type TEXT NOT NULL, width INTEGER, height INTEGER,
    status TEXT NOT NULL DEFAULT 'ready', created_at TIMESTAMPTZ NOT NULL
  )`,
];

export async function ensureSchema(sql) {
  if (!schemaPromise) schemaPromise = (async () => {
    for (const statement of SCHEMA) await sql.query(statement);
  })().catch(error => { schemaPromise = undefined; throw error; });
  return schemaPromise;
}

export function sendJson(res, body, status = 200, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

export function clean(value, max = 200) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '';
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 120;
}

function bytesToHex(bytes) { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function base64url(bytes) { return Buffer.from(bytes).toString('base64url'); }
function randomToken(size = 32) { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return base64url(bytes); }

export async function sha256(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

async function derivePassword(password, saltHex, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

export async function newPasswordRecord(password) {
  const saltBytes = new Uint8Array(16); crypto.getRandomValues(saltBytes);
  const salt = bytesToHex(saltBytes);
  return { salt, hash: await derivePassword(password, salt), iterations: PASSWORD_ITERATIONS };
}

export async function passwordMatches(password, row) {
  if (!row?.password_hash || !row.password_salt) return false;
  const wanted = await derivePassword(password, row.password_salt, row.password_iterations || PASSWORD_ITERATIONS);
  if (wanted.length !== row.password_hash.length) return false;
  let diff = 0;
  for (let i = 0; i < wanted.length; i += 1) diff |= wanted.charCodeAt(i) ^ row.password_hash.charCodeAt(i);
  return diff === 0;
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}

function bearerValue(req) {
  const authorization = String(req.headers?.authorization || '');
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

function sessionToken(req) {
  return cookieValue(req, SESSION_COOKIE) || bearerValue(req);
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
export function clearSessionCookie() { return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }

export async function createSession(sql, userId) {
  const token = randomToken();
  const now = new Date(); const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  await sql.query('INSERT INTO teambook_sessions (token_hash,user_id,created_at,expires_at) VALUES ($1,$2,$3,$4)', [await sha256(token), userId, now, expires]);
  return token;
}

export async function authRateLimited(sql, req, action, identifier, limit, windowMinutes) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = new Date(); const window = Math.floor(now.getTime() / (windowMinutes * 60000));
  const bucket = await sha256(`${action}|${ip}|${identifier}|${window}|teambook`);
  const expires = new Date((window + 1) * windowMinutes * 60000);
  const rows = await sql.query(`INSERT INTO teambook_auth_hits (bucket,hits,expires_at) VALUES ($1,1,$2)
    ON CONFLICT(bucket) DO UPDATE SET hits=teambook_auth_hits.hits+1 RETURNING hits`, [bucket, expires]);
  await sql.query('DELETE FROM teambook_auth_hits WHERE expires_at <= $1', [now]);
  return Number(rows[0]?.hits || 0) > limit;
}

async function nextAccountMemberNo(sql, now = new Date()) {
  const year = now.getUTCFullYear(); const key = `member-${year}`;
  const counters = await sql.query(`INSERT INTO teambook_counters (key,value) VALUES ($1,1)
    ON CONFLICT(key) DO UPDATE SET value=teambook_counters.value+1 RETURNING value`, [key]);
  return `TB-${year}-${String(Number(counters[0].value)).padStart(4, "0")}`;
}

export async function ensureMemberNo(sql, email, name, now = new Date()) {
  if (!email) return '';
  const normalized = email.toLowerCase();
  await sql.query(`INSERT INTO teambook_member_numbers (created_at,updated_at,email,name,news,consent_at,source)
    VALUES ($1,$1,$2,$3,FALSE,$1,'account') ON CONFLICT(email) DO UPDATE SET
    updated_at=EXCLUDED.updated_at, name=CASE WHEN teambook_member_numbers.name='' THEN EXCLUDED.name ELSE teambook_member_numbers.name END`,
    [now, normalized, clean(name, 80) || 'สมาชิก']);
  let rows = await sql.query('SELECT id,member_no,created_at FROM teambook_member_numbers WHERE email=$1', [normalized]);
  const member = rows[0]; if (!member) return ''; if (member.member_no) return member.member_no;
  const year = new Date(member.created_at || now).getUTCFullYear(); const key = `member-${year}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const counters = await sql.query(`INSERT INTO teambook_counters (key,value) VALUES ($1,1)
      ON CONFLICT(key) DO UPDATE SET value=teambook_counters.value+1 RETURNING value`, [key]);
    const wanted = `TB-${year}-${String(Number(counters[0].value)).padStart(4, '0')}`;
    try {
      rows = await sql.query('UPDATE teambook_member_numbers SET member_no=$1 WHERE id=$2 AND member_no IS NULL RETURNING member_no', [wanted, member.id]);
      if (rows[0]?.member_no) return rows[0].member_no;
      rows = await sql.query('SELECT member_no FROM teambook_member_numbers WHERE id=$1', [member.id]);
      if (rows[0]?.member_no) return rows[0].member_no;
    } catch { /* retry with the next sequence value */ }
  }
  return '';
}

export async function currentUser(req, sql) {
  const token = sessionToken(req); if (!token) return null;
  const rows = await sql.query(`SELECT a.id,a.email,a.display_name,a.member_no,s.expires_at
    FROM teambook_sessions s JOIN teambook_users a ON a.id=s.user_id WHERE s.token_hash=$1`, [await sha256(token)]);
  const row = rows[0]; if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await sql.query('DELETE FROM teambook_sessions WHERE token_hash=$1', [await sha256(token)]); return null;
  }
  return publicUser(row);
}

export async function destroySession(req, sql) {
  const token = sessionToken(req);
  if (token) await sql.query('DELETE FROM teambook_sessions WHERE token_hash=$1', [await sha256(token)]);
}

export function sameOrigin(req) {
  const origin = req.headers.origin; if (!origin) return true;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return origin === `${proto}://${host}`;
}
export function safeReturn(value) { const path = clean(value, 300); return path.startsWith('/') && !path.startsWith('//') ? path : '/profile/'; }
export function providerConfig(provider) {
  if (provider === 'google' && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) return { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
  if (provider === 'line' && process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) return { id: process.env.LINE_CHANNEL_ID, secret: process.env.LINE_CHANNEL_SECRET };
  return null;
}

export async function createOAuthState(sql, provider, returnTo) {
  const state = randomToken(24); const verifier = randomToken(48); const now = new Date();
  await sql.query(`INSERT INTO teambook_oauth_states (state_hash,provider,verifier,return_to,created_at,expires_at)
    VALUES ($1,$2,$3,$4,$5,$6)`, [await sha256(state), provider, verifier, safeReturn(returnTo), now, new Date(now.getTime() + 600000)]);
  return { state, verifier };
}
export async function consumeOAuthState(sql, provider, state) {
  const hash = await sha256(state || ''); const rows = await sql.query('DELETE FROM teambook_oauth_states WHERE state_hash=$1 RETURNING provider,verifier,return_to,expires_at', [hash]);
  const row = rows[0]; if (!row || row.provider !== provider || new Date(row.expires_at).getTime() <= Date.now()) return null; return row;
}
export async function pkceChallenge(verifier) { return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)))); }

export async function accountForIdentity(sql, identity) {
  let rows = await sql.query(`SELECT a.id,a.email,a.display_name,a.member_no FROM teambook_auth_identities i
    JOIN teambook_users a ON a.id=i.user_id WHERE i.provider=$1 AND i.provider_user_id=$2`, [identity.provider, identity.id]);
  let account = rows[0];
  if (account) {
    if (!account.member_no) {
      const memberNo = identity.email
        ? await ensureMemberNo(sql, identity.email, identity.name)
        : await nextAccountMemberNo(sql);
      if (memberNo) { await sql.query('UPDATE teambook_users SET member_no=$1,updated_at=$2 WHERE id=$3', [memberNo, new Date(), account.id]); account.member_no = memberNo; }
    }
    return account;
  }
  if (identity.email) {
    rows = await sql.query('SELECT id,email,display_name,member_no FROM teambook_users WHERE email=$1', [identity.email.toLowerCase()]); account = rows[0];
  }
  const now = new Date(); const memberNo = identity.email
    ? await ensureMemberNo(sql, identity.email, identity.name, now)
    : await nextAccountMemberNo(sql, now);
  if (!account) {
    const id = randomUUID();
    rows = await sql.query(`INSERT INTO teambook_users (id,email,display_name,member_no,consent_at,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$5,$5) RETURNING id,email,display_name,member_no`,
      [id, identity.email ? identity.email.toLowerCase() : null, clean(identity.name, 80) || 'สมาชิก', memberNo || null, now]);
    account = rows[0];
  } else if (memberNo && !account.member_no) {
    await sql.query('UPDATE teambook_users SET member_no=$1,updated_at=$2 WHERE id=$3', [memberNo, now, account.id]); account.member_no = memberNo;
  }
  await sql.query(`INSERT INTO teambook_auth_identities (provider,provider_user_id,user_id,email,created_at)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT(provider,provider_user_id) DO NOTHING`,
    [identity.provider, identity.id, account.id, identity.email || null, now]);
  return account;
}

export function publicUser(row) {
  return row ? { id: row.id, email: row.email || '', displayName: row.display_name || row.displayName || 'สมาชิก', memberNo: row.member_no || row.memberNo || '' } : null;
}
export async function prune(sql) {
  const now = new Date();
  await Promise.all([sql.query('DELETE FROM teambook_sessions WHERE expires_at <= $1', [now]), sql.query('DELETE FROM teambook_oauth_states WHERE expires_at <= $1', [now])]);
}
