import { currentUser, database, ensureSchema, sendJson } from './core.js';
import { handleCreatePartyV2 } from './xty-create-v2.js';
import { scheduledEndAt } from './xty-rules.js';
import { cardById as xtyCardById, cardNameTh } from '../../_shared/cards.js';
import { AVATAR_BY_ID } from '../../_shared/avatars.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function cleanId(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function localUserId(body) {
  const id = cleanId(body.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(id) ? `local:${id}` : '';
}

function avatarCover(body) {
  const avatarId = cleanId(body.avatar, 40) || 'orange_cat';
  const avatar = AVATAR_BY_ID[avatarId] || AVATAR_BY_ID.orange_cat;
  const color = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor) ? body.avatarColor : 'green';
  return {
    type: 'avatar',
    value: JSON.stringify({ species: avatar.id, color }),
    leadCardId: null,
    name: `การ์ดตัวละคร ${avatar.nameTh}`,
    characterName: avatar.nameTh,
  };
}

async function identityIdsFor(req, sql, body) {
  const account = await currentUser(req, sql);
  return [...new Set([
    account?.id ? `account:${account.id}` : '',
    localUserId(body),
  ].filter(Boolean))];
}

async function progressionLevelFor(req, sql, body) {
  const ids = await identityIdsFor(req, sql, body);
  if (!ids.length) return 1;
  const rows = await sql.query(`SELECT level FROM teambook_progression
    WHERE user_id = ANY($1::text[]) ORDER BY level DESC LIMIT 1`, [ids]);
  return Math.min(4, Math.max(1, Math.floor(Number(rows[0]?.level || 1)) || 1));
}

async function creationCapacityFor(req, sql, body) {
  const ids = await identityIdsFor(req, sql, body);
  if (!ids.length) return { owned: 0, maxOwned: 1 };
  const progressionRows = await sql.query(`SELECT level,paid_tier,unlocked_bonus_slots FROM teambook_progression
    WHERE user_id = ANY($1::text[])
    ORDER BY level DESC,unlocked_bonus_slots DESC LIMIT 1`, [ids]);
  const progression = progressionRows[0] || {};
  const level = Math.min(4, Math.max(1, Math.floor(Number(progression.level || 1)) || 1));
  const entitlement = progression.paid_tier === 'max' ? 3 : (progression.paid_tier === 'plus' ? 2 : 0);
  const bonus = Math.min(entitlement, Math.max(0, Math.floor(Number(progression.unlocked_bonus_slots || 0)) || 0));
  const maxOwned = Math.min(7, level + bonus);
  const countRows = await sql.query(`SELECT COUNT(*)::int n FROM teambook_books
    WHERE owner_id = ANY($1::text[]) AND state = ANY($2::text[])`, [ids, ACTIVE_STATES]);
  return { owned: Number(countRows[0]?.n || 0), maxOwned };
}

function allowedDurations(level, preset) {
  if (preset === 'xircle_xvisor') return [28];
  return level >= 2 ? [3, 7, 14, 28] : [3, 7];
}

async function requestedCover(req, sql) {
  const body = bodyOf(req);
  const type = String(body.coverType || 'card_back').toLowerCase();

  if (type === 'card') {
    const id = cleanId(body.leadCardId, 80).toUpperCase();
    const card = xtyCardById(id);
    if (!card?.eligibility?.partyCover) {
      const error = new Error('CARD_NOT_COVER_ELIGIBLE');
      error.code = 'CARD_NOT_COVER_ELIGIBLE';
      throw error;
    }

    const account = await currentUser(req, sql);
    const accountId = account?.id ? `account:${account.id}` : '';
    const localId = localUserId(body);
    const ids = [...new Set([accountId, localId].filter(Boolean))];
    if (!ids.length) {
      const error = new Error('INVALID_PROFILE');
      error.code = 'INVALID_PROFILE';
      throw error;
    }
    const owned = await sql.query(`SELECT 1 FROM teambook_user_cards
      WHERE user_id = ANY($1::text[]) AND card_id=$2 LIMIT 1`, [ids, id]);
    if (!owned[0]) {
      const error = new Error('CARD_NOT_OWNED');
      error.code = 'CARD_NOT_OWNED';
      throw error;
    }
    const occupied = await sql.query(`SELECT 1 FROM teambook_books
      WHERE owner_id = ANY($1::text[]) AND state = ANY($2::text[])
        AND (lead_card_id=$3 OR npc_card_id=$3) LIMIT 1`, [ids, ACTIVE_STATES, id]);
    if (occupied[0]) {
      const error = new Error('CARD_IN_USE');
      error.code = 'CARD_IN_USE';
      throw error;
    }
    return { type: 'card', value: id, leadCardId: id, name: cardNameTh(card) };
  }

  return { type: 'card_back', value: 'teambook-back-v1', leadCardId: null, name: 'หลังการ์ด TeamBook' };
}

async function captureV2(req) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.body = { ...bodyOf(req), coverType: 'card_back', leadCardId: null };
  await handleCreatePartyV2(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  return { status: capture.statusCode, data, headers };
}

function creationLabel(alias, level, cover) {
  const who = cleanId(alias, 24) || 'เจ้าของสมุด';
  if (level <= 1) return `${who} เปิดสมุดด้วยการ์ดตัวละคร ${cover.characterName || 'ของตัวเอง'}`;
  if (cover.type === 'card_back') return `${who} เปิดสมุดด้วยหลังการ์ด TeamBook`;
  return `${who} เปิดสมุดด้วยการ์ด ${cover.name}`;
}

export async function handleCreatePartyV3(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const sql = database();
    await ensureSchema(sql);
    const body = bodyOf(req);

    /* Merge/Resync is monotonic: old over-limit books stay visible. Creation
       is not. Count the actual active books owned by this identity before any
       new insert so a 4/2 account remains 4/2 instead of becoming 5/2. */
    const capacity = await creationCapacityFor(req, sql, body);
    if (capacity.owned >= capacity.maxOwned) {
      return sendJson(res, {
        ok: false, error: 'OWNED_PARTY_LIMIT', owned: capacity.owned, maxOwned: capacity.maxOwned,
      }, 409);
    }

    const levelBeforeCreate = await progressionLevelFor(req, sql, body);
    const preset = cleanId(body.preset, 40);
    const durationDays = Number(body.durationDays || 7);
    const allowed = allowedDurations(levelBeforeCreate, preset);
    if (!allowed.includes(durationDays)) {
      return sendJson(res, {
        ok: false,
        error: 'DURATION_LOCKED',
        level: levelBeforeCreate,
        preset: preset || 'normal',
        allowedDurations: allowed,
      }, 409);
    }
    const cover = levelBeforeCreate <= 1 ? avatarCover(body) : await requestedCover(req, sql);

    const created = await captureV2(req);
    if (created.status >= 400 || created.data?.error || !created.data?.party?.id) {
      return sendJson(res, created.data || { ok: false, error: 'CREATE_FAILED' }, created.status || 500);
    }

    const party = created.data.party;
    const creatorLevel = Math.min(4, Math.max(1, Number(created.data?.meProgression?.level || levelBeforeCreate || 1)));
    const label = creationLabel(body.alias, creatorLevel, cover);
    const at = new Date();
    const startAt = new Date(party.startAt || party.createdAt || at);
    const timezone = party.timezone || 'Asia/Bangkok';
    const correctedScheduledEnd = scheduledEndAt(startAt, durationDays, timezone);
    await sql.query(`UPDATE teambook_books
      SET cover_type=$1,cover_value=$2,lead_card_id=$3,duration_days=$4,scheduled_end_at=$5,updated_at=$6
      WHERE id=$7`, [cover.type, cover.value, cover.leadCardId, durationDays, correctedScheduledEnd, at, party.id]);
    await sql.query(`UPDATE teambook_book_events
      SET data_json = COALESCE(data_json,'{}'::jsonb) || $1::jsonb
      WHERE book_id=$2 AND type='PARTY_CREATED'`, [JSON.stringify({
      coverType: cover.type,
      coverValue: cover.value,
      leadCardId: cover.leadCardId,
      coverName: cover.name,
      characterName: cover.characterName || null,
      creatorLevel,
      creationLabel: label,
      durationDays,
      durationRoute: preset === 'xircle_xvisor' ? 'white-cat' : 'level',
    }), party.id]);

    party.coverType = cover.type;
    party.coverValue = cover.value;
    party.leadCardId = cover.leadCardId;
    party.durationDays = durationDays;
    party.scheduledEndAt = new Date(correctedScheduledEnd).toISOString();
    party.updatedAt = at.toISOString();
    if (Array.isArray(party.events)) {
      party.events = party.events.map(event => event.type === 'PARTY_CREATED'
        ? { ...event, data: { ...(event.data || {}), coverType: cover.type, coverValue: cover.value, leadCardId: cover.leadCardId, coverName: cover.name, characterName: cover.characterName || null, creatorLevel, creationLabel: label, durationDays, durationRoute: preset === 'xircle_xvisor' ? 'white-cat' : 'level' } }
        : event);
    }
    return sendJson(res, { ...created.data, party, coverName: cover.name, creationLabel: label }, created.status || 201);
  } catch (error) {
    console.error('TeamBook create v3 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_API_ERROR' }, 409);
  }
}
