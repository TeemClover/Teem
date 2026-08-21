import { randomBytes, randomUUID } from 'node:crypto';
import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './core.js';
import { TEAMBOOK_TIMEZONE, partyDayNumber } from './xty-rules.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const PARTY_MAX = 5;
const MAX_JOINED_ACTIVE = 3;

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function memberToken() {
  return randomBytes(32).toString('base64url');
}

function localIdentity(body) {
  const value = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(value) ? `local:${value}` : '';
}

function quotaKeyFor(account, body) {
  if (account?.memberNo) return `member:${account.memberNo}`;
  if (account?.id) return `account-v2:${account.id}`;
  const profileId = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(profileId) ? `local-v2:${profileId}` : '';
}

async function ensureQuotaV2(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS teambook_book_quota_v2 (
    quota_key TEXT NOT NULL,
    book_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    PRIMARY KEY (quota_key, book_id, role)
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_teambook_book_quota_v2_active
    ON teambook_book_quota_v2(quota_key, role, released_at)`);
}

function bearerToken(req) {
  const auth = String(req.headers?.authorization || '');
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

async function findExistingMember(req, sql, partyId, identityIds) {
  const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,left_at,removal_reason
    FROM teambook_book_members WHERE book_id=$1 AND user_id IN ($2,$3)
    ORDER BY left_at NULLS FIRST LIMIT 1`, [partyId, identityIds[0], identityIds[1]]);
  if (rows[0]) return rows[0];

  const oldToken = bearerToken(req);
  if (!oldToken) return null;
  const byToken = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,left_at,removal_reason
    FROM teambook_book_members WHERE book_id=$1 AND auth_hash=$2 LIMIT 1`, [partyId, await sha256(oldToken)]);
  return byToken[0] || null;
}

async function joinedUsage(sql, quotaKey, identityIds) {
  const rows = await sql.query(`SELECT COUNT(DISTINCT q.book_id)::int n
    FROM teambook_book_quota_v2 q
    JOIN teambook_books p ON p.id=q.book_id
    JOIN teambook_book_members m ON m.book_id=q.book_id
      AND m.user_id = ANY($3::text[]) AND m.role <> 'lead' AND m.left_at IS NULL
    WHERE q.quota_key=$1 AND q.role='member' AND q.released_at IS NULL
      AND p.state = ANY($2::text[])`, [quotaKey, ACTIVE_STATES, [...new Set(identityIds.filter(Boolean))]]);
  return Number(rows[0]?.n || 0);
}

function partyDay(row, at) {
  return partyDayNumber(row.started_at || row.created_at || at, at, row.timezone || TEAMBOOK_TIMEZONE);
}

async function legacyState(legacyXtyHandler, req, code, token) {
  let raw = '';
  const capture = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'GET';
  proxy.url = `/api/teambook/party/${encodeURIComponent(code)}`;
  proxy.query = { path: `party/${code}` };
  proxy.body = undefined;
  proxy.headers = { ...(req.headers || {}), authorization: `Bearer ${token}` };
  await legacyXtyHandler(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (capture.statusCode >= 400 || data.error) {
    const error = new Error(data.error || `LEGACY_STATE_${capture.statusCode}`);
    error.code = data.error || 'STATE_READ_FAILED';
    throw error;
  }
  return data;
}

async function attachQuota(sql, quotaKey, partyId, at) {
  await sql.query(`INSERT INTO teambook_book_quota_v2 (quota_key,book_id,role,created_at,released_at)
    VALUES ($1,$2,'member',$3,NULL)
    ON CONFLICT (quota_key,book_id,role) DO UPDATE SET released_at=NULL`, [quotaKey, partyId, at]);
}

export async function handleJoinPartyV2(req, res, legacyXtyHandler) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    const fromQuery = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
    const code = /^\d{5}$/.test(String(fromQuery || '')) ? String(fromQuery) : '';
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const body = bodyOf(req);
    const alias = clean(body.alias, 24);
    if (!alias) return sendJson(res, { ok: false, error: 'INVALID_ALIAS' }, 400);

    const sql = database();
    await ensureSchema(sql);
    await ensureQuotaV2(sql);

    const partyRows = await sql.query(`SELECT id,code,state,started_at,created_at,timezone,
      activity_mode,activity_id,activity,shared_activity_description,shared_activity_color
      FROM teambook_books WHERE code=$1`, [code]);
    const row = partyRows[0];
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) {
      return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    }

    const account = await currentUser(req, sql);
    const localId = localIdentity(body);
    const accountId = account?.id ? `account:${account.id}` : '';
    const userId = accountId || localId || `u_${randomUUID()}`;
    const identityIds = [accountId || userId, localId || accountId || userId];
    const quotaKey = quotaKeyFor(account, body);
    if (!quotaKey) return sendJson(res, { ok: false, error: 'INVALID_PROFILE' }, 400);

    const avatar = clean(body.avatar, 40) || 'orange_cat';
    const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor) ? body.avatarColor : 'green';

    /* What a joiner brings depends on the book. In a shared book they
       inherit its activity and only their own rule is theirs; in an
       individual book the activity is theirs too, and without one they
       would sit in the book with nothing to sign for. */
    const mode = row.activity_mode === 'individual' ? 'individual' : 'shared';
    const memberActivityId = mode === 'individual'
      ? (clean(body.activityId, 40) || null)
      : (row.activity_id || null);
    const memberActivityLabel = mode === 'individual'
      ? clean(body.activityLabel, 60)
      : clean(row.activity, 60);
    const memberActivityDescription = mode === 'individual'
      ? clean(body.activityDescription, 120)
      : clean(row.shared_activity_description, 120);
    const memberActivityColor = ['red', 'green', 'blue', 'silver'].includes(body.activityColor)
      ? body.activityColor
      : (mode === 'individual' ? null : (row.shared_activity_color || null));
    const memberSuccessRule = clean(body.successRule, 60);
    if (mode === 'individual' && (!memberActivityId || !memberActivityLabel)) {
      return sendJson(res, { ok: false, error: 'ACTIVITY_REQUIRED' }, 400);
    }
    const existing = await findExistingMember(req, sql, row.id, identityIds);

    if (existing) {
      if (existing.left_at) return sendJson(res, { ok: false, error: 'MEMBERSHIP_CLOSED' }, 403);
      const token = memberToken();
      const at = new Date();
      await sql.query(`UPDATE teambook_book_members SET alias=$1,avatar=$2,avatar_color=$3,auth_hash=$4,
          activity_id=COALESCE($7,activity_id),
          activity_label=COALESCE(NULLIF($8,''),activity_label),
          activity_description=COALESCE(NULLIF($9,''),activity_description),
          activity_color=COALESCE($10,activity_color),
          success_rule=COALESCE(NULLIF($11,''),success_rule)
        WHERE book_id=$5 AND user_id=$6`, [
        alias, avatar, avatarColor, await sha256(token), row.id, existing.user_id,
        memberActivityId, memberActivityLabel, memberActivityDescription,
        memberActivityColor, memberSuccessRule,
      ]);
      if (existing.role !== 'lead') await attachQuota(sql, quotaKey, row.id, at);
      try {
        const state = await legacyState(legacyXtyHandler, req, code, token);
        return sendJson(res, { ...state, token, quotaSystem: 'v2-separated' });
      } catch (stateError) {
        console.error('TeamBook join v2 state refresh failed after existing membership recovery', code, stateError?.message || stateError);
        return sendJson(res, {
          ok: true, joined: true, recoveryRequired: true, code, token,
          meUserId: existing.user_id, quotaSystem: 'v2-separated',
        });
      }
    }

    const used = await joinedUsage(sql, quotaKey, identityIds);
    if (used >= MAX_JOINED_ACTIVE) {
      return sendJson(res, { ok: false, error: 'JOINED_PARTY_LIMIT', joined: used, maxJoined: MAX_JOINED_ACTIVE }, 409);
    }

    const token = memberToken();
    const authHash = await sha256(token);
    const at = new Date();
    const eventData = JSON.stringify({ alias, quotaSystem: 'v2-separated', quotaKey });
    const inserted = await sql.query(`WITH locks AS (
        SELECT pg_advisory_xact_lock(hashtext($13)), pg_advisory_xact_lock(hashtext($14))
      ), locked AS (
        SELECT p.id FROM teambook_books p,locks
        WHERE p.id=$1 AND p.state = ANY($11::text[]) FOR UPDATE
      ), capacity AS (
        SELECT id FROM locked
        WHERE (SELECT COUNT(*) FROM teambook_book_members WHERE book_id=$1 AND left_at IS NULL) < $10
          AND (SELECT COUNT(DISTINCT q.book_id) FROM teambook_book_quota_v2 q
            JOIN teambook_books p ON p.id=q.book_id
            JOIN teambook_book_members m ON m.book_id=q.book_id
              AND m.user_id IN ($4,$3) AND m.role <> 'lead' AND m.left_at IS NULL
            WHERE q.quota_key=$2 AND q.role='member' AND q.released_at IS NULL
              AND p.state = ANY($11::text[])) < $12
      ), joined AS (
        INSERT INTO teambook_book_members (
          book_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at,
          activity_id,activity_label,activity_description,activity_color,success_rule
        )
        SELECT id,$4,$5,$6,$7,'member',$8,$9,$17,$18,$19,$20,$21 FROM capacity RETURNING book_id
      ), quota AS (
        INSERT INTO teambook_book_quota_v2 (quota_key,book_id,role,created_at,released_at)
        SELECT $2,book_id,'member',$9,NULL FROM joined
        ON CONFLICT (quota_key,book_id,role) DO UPDATE SET released_at=NULL
        RETURNING book_id
      )
      INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT book_id,'MEMBER_JOINED',$4,$15,$16::jsonb,$9 FROM quota RETURNING book_id`, [
      row.id, quotaKey, identityIds[1], userId, alias, avatar, avatarColor, authHash, at,
      PARTY_MAX, ACTIVE_STATES, MAX_JOINED_ACTIVE,
      `join-user:${quotaKey}`, `join-party:${row.id}`, partyDay(row, at), eventData,
      memberActivityId, memberActivityLabel, memberActivityDescription,
      memberActivityColor, memberSuccessRule,
    ]);

    if (!inserted[0]) {
      const freshParty = await sql.query('SELECT state FROM teambook_books WHERE id=$1', [row.id]);
      if (!ACTIVE_STATES.includes(String(freshParty[0]?.state || '').toUpperCase())) {
        return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      }
      const count = await sql.query('SELECT COUNT(*)::int n FROM teambook_book_members WHERE book_id=$1 AND left_at IS NULL', [row.id]);
      if (Number(count[0]?.n || 0) >= PARTY_MAX) return sendJson(res, { ok: false, error: 'FULL' }, 409);
      const latest = await joinedUsage(sql, quotaKey, identityIds);
      if (latest >= MAX_JOINED_ACTIVE) {
        return sendJson(res, { ok: false, error: 'JOINED_PARTY_LIMIT', joined: latest, maxJoined: MAX_JOINED_ACTIVE }, 409);
      }
      return sendJson(res, { ok: false, error: 'JOIN_FAILED' }, 409);
    }

    await sql.query('UPDATE teambook_books SET updated_at=$1 WHERE id=$2', [at, row.id]);
    try {
      const state = await legacyState(legacyXtyHandler, req, code, token);
      return sendJson(res, { ...state, token, quotaSystem: 'v2-separated' }, 201);
    } catch (stateError) {
      console.error('TeamBook join v2 state refresh failed after membership commit', code, stateError?.message || stateError);
      return sendJson(res, {
        ok: true, joined: true, recoveryRequired: true, code, token,
        meUserId: userId, quotaSystem: 'v2-separated',
      }, 201);
    }
  } catch (error) {
    console.error('TeamBook join v2 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_API_ERROR' }, 500);
  }
}