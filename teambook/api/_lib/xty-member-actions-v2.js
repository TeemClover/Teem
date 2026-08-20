import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './core.js';
import { TEAMBOOK_TIMEZONE, partyDayNumber } from './xty-rules.js';
import { cardById as xtyCardById, cardDescriptorTh } from '../../_shared/cards.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const MAX_JOINED = 3;
const IDENTITY_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
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
  await sql.query(`CREATE TABLE IF NOT EXISTS teambook_book_quota_v2 (
    quota_key TEXT NOT NULL, book_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL, released_at TIMESTAMPTZ,
    PRIMARY KEY (quota_key, book_id, role))`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_teambook_book_quota_v2_active
    ON teambook_book_quota_v2(quota_key, role, released_at)`);
}
async function partyByCode(sql, code) {
  const rows = await sql.query(`SELECT id,code,name,state,owner_id,created_at,started_at,updated_at,timezone,
    lead_card_id,npc_card_id,cover_type,cover_value FROM teambook_books WHERE code=$1`, [code]);
  return rows[0] || null;
}
async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at
      FROM teambook_book_members WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return { account, member: rows[0] };
  }
  const token = bearer(req);
  if (!token) return { account, member: null };
  const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at
    FROM teambook_book_members WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return { account, member: rows[0] || null };
}
function partyDay(row, at) {
  return partyDayNumber(row.started_at || row.created_at || at, at, row.timezone || TEAMBOOK_TIMEZONE);
}
function identityLockAt(row, member) {
  const source = member?.role === 'lead'
    ? (row?.created_at || member?.joined_at)
    : (member?.joined_at || row?.created_at);
  const anchor = new Date(source || 0).getTime();
  return Number.isFinite(anchor) && anchor > 0 ? anchor + IDENTITY_EDIT_WINDOW_MS : 0;
}
function coverInfo(row) {
  const type = String(row?.cover_type || 'card_back');
  if (type === 'card' && row?.lead_card_id) {
    const card = xtyCardById(row.lead_card_id);
    return { type, value: row.lead_card_id, name: card ? cardDescriptorTh(card) : row.lead_card_id };
  }
  if (type === 'avatar') return { type, value: row?.cover_value || '', name: 'การ์ดตัวละคร TeamBook' };
  return { type: 'card_back', value: 'teambook-back-v1', name: 'หลังการ์ด TeamBook' };
}

async function stateViaLegacy(legacyXtyHandler, req, code) {
  let raw = '';
  const capture = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; }, end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); } };
  const proxy = Object.create(req);
  proxy.method = 'GET'; proxy.url = `/api/teambook/party/${encodeURIComponent(code)}`;
  proxy.query = { path: `party/${code}` }; proxy.body = undefined; proxy.headers = { ...(req.headers || {}) };
  await legacyXtyHandler(proxy, capture);
  let data = {}; try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (capture.statusCode >= 400 || data.error) { const error = new Error(data.error || `STATE_${capture.statusCode}`); error.code = data.error || 'STATE_READ_FAILED'; throw error; }
  return data;
}

export async function handleProfileV2(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'GET') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    const code = codeOf(req); const targetId = clean(Array.isArray(req.query?.member) ? req.query.member[0] : req.query?.member, 120);
    if (!code || !targetId) return sendJson(res, { ok: false, error: 'INVALID_PROFILE' }, 400);
    const sql = database(); await ensureSchema(sql);
    const row = await partyByCode(sql, code); if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    const viewer = await memberFor(req, sql, row.id); if (!viewer.member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    const targetRows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL LIMIT 1`, [row.id, targetId]);
    const target = targetRows[0]; if (!target) return sendJson(res, { ok: false, error: 'MEMBER_NOT_FOUND' }, 404);

    const [activeRows, progressionRows] = await Promise.all([
      sql.query(`SELECT p.name,p.created_at,p.cover_type,p.cover_value,p.lead_card_id,m.role
        FROM teambook_book_members m JOIN teambook_books p ON p.id=m.book_id
        WHERE m.user_id=$1 AND m.left_at IS NULL AND p.state = ANY($2::text[])
        ORDER BY p.created_at`, [targetId, ACTIVE_STATES]),
      sql.query(`SELECT level,unlocked_bonus_slots FROM teambook_progression WHERE user_id=$1 LIMIT 1`, [targetId]),
    ]);
    const ownedRows = activeRows.filter(item => item.role === 'lead');
    const joinedRows = activeRows.filter(item => item.role !== 'lead');
    const progression = progressionRows[0] || {};
    const level = Math.min(4, Math.max(1, Number(progression.level || 1)));
    const maxOwned = Math.min(7, level + Math.max(0, Number(progression.unlocked_bonus_slots || 0)));
    const ownedParties = ownedRows.map((party, index) => ({
      slot: index + 1,
      name: party.name,
      createdAt: party.created_at,
      coverType: coverInfo(party).type,
      coverValue: coverInfo(party).value,
      coverName: coverInfo(party).name,
      leadCardId: party.lead_card_id || null,
    }));
    return sendJson(res, { ok: true, profile: {
      userId: target.user_id, alias: target.alias, avatar: target.avatar || 'orange_cat', avatarColor: target.avatar_color || 'green',
      roleHere: target.role, joinedHereAt: target.joined_at, level,
      owned: ownedRows.length, joined: joinedRows.length, maxOwned, maxJoined: MAX_JOINED, ownedParties,
    } });
  } catch (error) {
    console.error('TeamBook profile v2 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}

export async function handleCoverV2(req, res, legacyXtyHandler) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = codeOf(req); if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const sql = database(); await ensureSchema(sql);
    const row = await partyByCode(sql, code); if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    const found = await memberFor(req, sql, row.id); const member = found.member;
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);

    const body = bodyOf(req); const requested = String(body.coverType || 'card_back').toLowerCase();
    let nextType = 'card_back'; let nextValue = 'teambook-back-v1'; let nextLead = null; let nextName = 'หลังการ์ด TeamBook';
    if (requested === 'card') {
      const id = clean(body.leadCardId, 80).toUpperCase(); const card = xtyCardById(id);
      if (!card?.eligibility?.partyCover) return sendJson(res, { ok: false, error: 'CARD_NOT_COVER_ELIGIBLE' }, 400);
      const owned = await sql.query(`SELECT 1 FROM teambook_user_cards WHERE user_id=$1 AND card_id=$2 LIMIT 1`, [member.user_id, id]);
      if (!owned[0]) return sendJson(res, { ok: false, error: 'CARD_NOT_OWNED' }, 403);
      const occupied = await sql.query(`SELECT 1 FROM teambook_books WHERE id<>$1 AND owner_id=$2
        AND state = ANY($3::text[]) AND (lead_card_id=$4 OR npc_card_id=$4) LIMIT 1`, [row.id, member.user_id, ACTIVE_STATES, id]);
      if (occupied[0]) return sendJson(res, { ok: false, error: 'CARD_IN_USE' }, 409);
      nextType = 'card'; nextValue = id; nextLead = id; nextName = cardDescriptorTh(card);
    }

    const before = coverInfo(row);
    if (before.type === nextType && before.value === nextValue) return sendJson(res, await stateViaLegacy(legacyXtyHandler, req, code));
    const at = new Date();
    await sql.query(`WITH changed AS (
        UPDATE teambook_books SET cover_type=$1,cover_value=$2,lead_card_id=$3,updated_at=$4 WHERE id=$5 RETURNING id
      ) INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT id,'LEAD_CARD_CHANGED',$6,$7,$8::jsonb,$4 FROM changed`, [
      nextType, nextValue, nextLead, at, row.id, member.user_id, partyDay(row, at), JSON.stringify({
        alias: member.alias, from: before.value, to: nextValue, fromType: before.type, toType: nextType,
        fromName: before.name, toName: nextName,
      }),
    ]);
    return sendJson(res, await stateViaLegacy(legacyXtyHandler, req, code));
  } catch (error) {
    console.error('TeamBook cover v2 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_API_ERROR' }, 500);
  }
}

export async function handleIdentityV2(req, res, legacyXtyHandler) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = codeOf(req); if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const sql = database(); await ensureSchema(sql); const row = await partyByCode(sql, code);
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    const { member } = await memberFor(req, sql, row.id); if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    const at = new Date();
    const lockedAt = identityLockAt(row, member);
    if (!lockedAt || at.getTime() >= lockedAt) {
      return sendJson(res, { ok: false, error: 'IDENTITY_LOCKED', lockedAt: lockedAt ? new Date(lockedAt).toISOString() : null }, 409);
    }
    const body = bodyOf(req); const alias = clean(body.alias, 24) || member.alias; const avatar = clean(body.avatar, 40) || member.avatar || 'orange_cat';
    const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor) ? body.avatarColor : (member.avatar_color || 'green');
    const aliasChanged = alias !== member.alias; const avatarChanged = avatar !== member.avatar || avatarColor !== member.avatar_color;
    if (!aliasChanged && !avatarChanged) return sendJson(res, await stateViaLegacy(legacyXtyHandler, req, code));
    const aliasType = aliasChanged ? 'MEMBER_ALIAS_CHANGED' : ''; const avatarType = avatarChanged ? 'MEMBER_AVATAR_CHANGED' : '';
    const aliasData = JSON.stringify({ from: member.alias, to: alias, alias });
    const avatarData = JSON.stringify({ alias, fromAvatar: member.avatar || 'orange_cat', toAvatar: avatar, fromColor: member.avatar_color || 'green', toColor: avatarColor });
    await sql.query(`WITH changed AS (UPDATE teambook_book_members SET alias=$1,avatar=$2,avatar_color=$3
        WHERE book_id=$4 AND user_id=$5 AND left_at IS NULL RETURNING book_id),
      touched AS (UPDATE teambook_books SET updated_at=$6 WHERE id=$4 AND EXISTS (SELECT 1 FROM changed) RETURNING id)
      INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT touched.id,v.type,$5,$7,v.data::jsonb,$6 FROM touched
      CROSS JOIN (VALUES ($8::text,$9::text),($10::text,$11::text)) AS v(type,data) WHERE v.type<>''`,
    [alias, avatar, avatarColor, row.id, member.user_id, at, partyDay(row, at), aliasType, aliasData, avatarType, avatarData]);
    return sendJson(res, await stateViaLegacy(legacyXtyHandler, req, code));
  } catch (error) {
    console.error('TeamBook identity v2 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_API_ERROR' }, 500);
  }
}

export async function handleLeaveV2(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = codeOf(req); if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const sql = database(); await ensureSchema(sql); await ensureQuotaV2(sql); const row = await partyByCode(sql, code);
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    const found = await memberFor(req, sql, row.id); const member = found.member;
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (member.role === 'lead') return sendJson(res, { ok: false, error: 'LEAD_CANNOT_LEAVE' }, 409);
    const at = new Date(); const day = partyDay(row, at); const quotaKey = quotaKeyFor(found.account, bodyOf(req), member);
    const leftData = JSON.stringify({ alias: member.alias, avatar: member.avatar, role: member.role });

    const changed = await sql.query(`WITH left_member AS (UPDATE teambook_book_members SET left_at=$1,removal_reason='LEFT',auth_hash=NULL
        WHERE book_id=$2 AND user_id=$3 AND left_at IS NULL RETURNING book_id),
      touched AS (UPDATE teambook_books SET updated_at=$1 WHERE id=$2 AND EXISTS (SELECT 1 FROM left_member) RETURNING id)
      INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT id,'MEMBER_LEFT',$3,$4,$5::jsonb,$1 FROM touched RETURNING book_id`, [at, row.id, member.user_id, day, leftData]);
    if (!changed[0]) return sendJson(res, { ok: false, error: 'MEMBERSHIP_CLOSED' }, 409);
    if (quotaKey) await sql.query(`UPDATE teambook_book_quota_v2 SET released_at=COALESCE(released_at,$1)
      WHERE quota_key=$2 AND book_id=$3 AND role='member' AND released_at IS NULL`, [at, quotaKey, row.id]);
    return sendJson(res, { ok: true, left: true, dissolved: false, transferredTo: null });
  } catch (error) {
    console.error('TeamBook leave v2 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_API_ERROR' }, 500);
  }
}
