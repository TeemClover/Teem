import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './core.js';
import { XTY_TIMEZONE, partyDayNumber } from './xty-rules.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function codeOf(req) {
  const value = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  return /^\d{5}$/.test(String(value || '')) ? String(value) : '';
}

function bearer(req) {
  const auth = String(req.headers?.authorization || '');
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function localIdentity(body) {
  const value = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(value) ? `local:${value}` : '';
}

function quotaKeyFor(account, body, member) {
  if (account?.memberNo) return `member:${account.memberNo}`;
  if (account?.id) return `account-v2:${account.id}`;
  const local = localIdentity(body);
  if (local) return `local-v2:${local.slice('local:'.length)}`;
  const userId = String(member?.user_id || '');
  return userId.startsWith('local:') ? `local-v2:${userId.slice('local:'.length)}` : '';
}

async function ensureQuotaV2(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS xty_party_quota_v2 (
    quota_key TEXT NOT NULL,
    party_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    PRIMARY KEY (quota_key, party_id, role)
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_xty_party_quota_v2_active
    ON xty_party_quota_v2(quota_key, role, released_at)`);
}

async function partyByCode(sql, code) {
  const rows = await sql.query(`SELECT id,code,state,owner_id,created_at,started_at,timezone
    FROM xty_parties WHERE code=$1`, [code]);
  return rows[0] || null;
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at
      FROM xty_members WHERE party_id=$1 AND user_id=$2 AND left_at IS NULL`,
    [partyId, `account:${account.id}`]);
    if (rows[0]) return { account, member: rows[0] };
  }
  const token = bearer(req);
  if (!token) return { account, member: null };
  const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at
    FROM xty_members WHERE party_id=$1 AND auth_hash=$2 AND left_at IS NULL`,
  [partyId, await sha256(token)]);
  return { account, member: rows[0] || null };
}

function partyDay(row, at) {
  return partyDayNumber(row.started_at || row.created_at || at, at, row.timezone || XTY_TIMEZONE);
}

async function stateViaLegacy(legacyXtyHandler, req, code) {
  let raw = '';
  const capture = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'GET';
  proxy.url = `/api/xty/party/${encodeURIComponent(code)}`;
  proxy.query = { path: `party/${code}` };
  proxy.body = undefined;
  proxy.headers = { ...(req.headers || {}) };
  await legacyXtyHandler(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (capture.statusCode >= 400 || data.error) {
    const error = new Error(data.error || `STATE_${capture.statusCode}`);
    error.code = data.error || 'STATE_READ_FAILED';
    throw error;
  }
  return data;
}

export async function handleIdentityV2(req, res, legacyXtyHandler) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = codeOf(req);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const sql = database(); await ensureSchema(sql);
    const row = await partyByCode(sql, code);
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);

    const { member } = await memberFor(req, sql, row.id);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const body = bodyOf(req);
    const alias = clean(body.alias, 24) || member.alias;
    const avatar = clean(body.avatar, 40) || member.avatar || 'orange_cat';
    const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor)
      ? body.avatarColor : (member.avatar_color || 'green');
    const aliasChanged = alias !== member.alias;
    const avatarChanged = avatar !== member.avatar || avatarColor !== member.avatar_color;
    if (!aliasChanged && !avatarChanged) return sendJson(res, await stateViaLegacy(legacyXtyHandler, req, code));

    const at = new Date();
    const aliasType = aliasChanged ? 'MEMBER_ALIAS_CHANGED' : '';
    const avatarType = avatarChanged ? 'MEMBER_AVATAR_CHANGED' : '';
    const aliasData = JSON.stringify({ from: member.alias, to: alias, alias });
    const avatarData = JSON.stringify({
      alias,
      fromAvatar: member.avatar || 'orange_cat', toAvatar: avatar,
      fromColor: member.avatar_color || 'green', toColor: avatarColor,
    });

    await sql.query(`WITH changed AS (
        UPDATE xty_members SET alias=$1,avatar=$2,avatar_color=$3
        WHERE party_id=$4 AND user_id=$5 AND left_at IS NULL RETURNING party_id
      ), touched AS (
        UPDATE xty_parties SET updated_at=$6 WHERE id=$4 AND EXISTS (SELECT 1 FROM changed) RETURNING id
      )
      INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
      SELECT touched.id,v.type,$5,$7,v.data::jsonb,$6
      FROM touched CROSS JOIN (VALUES ($8::text,$9::text),($10::text,$11::text)) AS v(type,data)
      WHERE v.type <> ''`, [
      alias, avatar, avatarColor, row.id, member.user_id, at, partyDay(row, at),
      aliasType, aliasData, avatarType, avatarData,
    ]);

    return sendJson(res, await stateViaLegacy(legacyXtyHandler, req, code));
  } catch (error) {
    console.error('XTY identity v2 failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'XTY_API_ERROR' }, 500);
  }
}

export async function handleLeaveV2(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = codeOf(req);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const sql = database(); await ensureSchema(sql); await ensureQuotaV2(sql);
    const row = await partyByCode(sql, code);
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);

    const found = await memberFor(req, sql, row.id);
    const member = found.member;
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    const at = new Date();
    const day = partyDay(row, at);
    const quotaKey = quotaKeyFor(found.account, bodyOf(req), member);
    const leftData = JSON.stringify({ alias: member.alias, avatar: member.avatar, role: member.role });

    if (member.role !== 'lead') {
      const changed = await sql.query(`WITH left_member AS (
          UPDATE xty_members SET left_at=$1,removal_reason='LEFT',auth_hash=NULL
          WHERE party_id=$2 AND user_id=$3 AND left_at IS NULL RETURNING party_id
        ), touched AS (
          UPDATE xty_parties SET updated_at=$1 WHERE id=$2 AND EXISTS (SELECT 1 FROM left_member) RETURNING id
        ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
          SELECT id,'MEMBER_LEFT',$3,$4,$5::jsonb,$1 FROM touched RETURNING party_id`,
      [at, row.id, member.user_id, day, leftData]);
      if (!changed[0]) return sendJson(res, { ok: false, error: 'MEMBERSHIP_CLOSED' }, 409);
      if (quotaKey) await sql.query(`UPDATE xty_party_quota_v2 SET released_at=COALESCE(released_at,$1)
        WHERE quota_key=$2 AND party_id=$3 AND role='member' AND released_at IS NULL`, [at, quotaKey, row.id]);
      return sendJson(res, { ok: true, left: true, dissolved: false, transferredTo: null });
    }

    const nextRows = await sql.query(`SELECT user_id,alias FROM xty_members
      WHERE party_id=$1 AND user_id<>$2 AND left_at IS NULL
      ORDER BY joined_at LIMIT 1`, [row.id, member.user_id]);
    const next = nextRows[0] || null;

    if (next) {
      const transferData = JSON.stringify({ from: member.alias, to: next.alias, toUserId: next.user_id });
      const changed = await sql.query(`WITH left_member AS (
          UPDATE xty_members SET left_at=$1,removal_reason='LEFT',auth_hash=NULL
          WHERE party_id=$2 AND user_id=$3 AND left_at IS NULL RETURNING party_id
        ), promoted AS (
          UPDATE xty_members SET role='lead' WHERE party_id=$2 AND user_id=$4 AND left_at IS NULL
            AND EXISTS (SELECT 1 FROM left_member) RETURNING party_id
        ), touched AS (
          UPDATE xty_parties SET owner_id=$4,updated_at=$1 WHERE id=$2 AND EXISTS (SELECT 1 FROM promoted) RETURNING id
        ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
          SELECT touched.id,v.type,$3,$5,v.data::jsonb,$1
          FROM touched CROSS JOIN (VALUES ('MEMBER_LEFT'::text,$6::text),('LEAD_TRANSFERRED'::text,$7::text)) AS v(type,data)
          RETURNING party_id`, [at, row.id, member.user_id, next.user_id, day, leftData, transferData]);
      if (!changed.length) return sendJson(res, { ok: false, error: 'LEAVE_FAILED' }, 409);
      if (quotaKey) await sql.query(`UPDATE xty_party_quota_v2 SET released_at=COALESCE(released_at,$1)
        WHERE quota_key=$2 AND party_id=$3 AND role='owner' AND released_at IS NULL`, [at, quotaKey, row.id]);
      return sendJson(res, { ok: true, left: true, dissolved: false, transferredTo: next.alias });
    }

    const changed = await sql.query(`WITH left_member AS (
        UPDATE xty_members SET left_at=$1,removal_reason='LEFT',auth_hash=NULL
        WHERE party_id=$2 AND user_id=$3 AND left_at IS NULL RETURNING party_id
      ), closed AS (
        UPDATE xty_parties SET state='DISSOLVED',ended_at=$1,updated_at=$1,visibility='private'
        WHERE id=$2 AND EXISTS (SELECT 1 FROM left_member) RETURNING id
      ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
        SELECT closed.id,v.type,$3,$4,v.data::jsonb,$1
        FROM closed CROSS JOIN (VALUES ('MEMBER_LEFT'::text,$5::text),('PARTY_DISSOLVED'::text,'{}'::text)) AS v(type,data)
        RETURNING party_id`, [at, row.id, member.user_id, day, leftData]);
    if (!changed.length) return sendJson(res, { ok: false, error: 'LEAVE_FAILED' }, 409);
    await sql.query(`UPDATE xty_party_quota_v2 SET released_at=COALESCE(released_at,$1)
      WHERE party_id=$2 AND released_at IS NULL`, [at, row.id]);
    return sendJson(res, { ok: true, left: true, dissolved: true, transferredTo: null });
  } catch (error) {
    console.error('XTY leave v2 failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'XTY_API_ERROR' }, 500);
  }
}
