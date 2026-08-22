import legacyXtyHandler from '../teambook/[...path].js';
import { handleCreatePartyV3 } from './xty-create-v3.js';
import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './core.js';
import { cardById, cardDescriptorTh } from '../../_shared/cards.js';
import { TEAMBOOK_V1_PETS } from '../../_shared/pets.js';
import { partyDayNumber, TEAMBOOK_TIMEZONE } from './xty-rules.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const WHITE_CAT_GUIDE_ID = 'xvisor_white_cat_silver';

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function actionOf(req) {
  const raw = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  return String(raw || '').toLowerCase();
}
function codeOf(req) {
  const raw = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  return /^\d{5}$/.test(String(raw || '')) ? String(raw) : '';
}
function localIdentity(body) {
  const id = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(id) ? `local:${id}` : '';
}

async function identityIds(req, sql, body, primary = '') {
  const account = await currentUser(req, sql);
  return [...new Set([
    primary,
    account?.id ? `account:${account.id}` : '',
    localIdentity(body),
  ].filter(Boolean))];
}

async function ownsCard(sql, ids, cardId) {
  if (!cardId || !ids.length) return false;
  const rows = await sql.query(`SELECT 1 FROM teambook_user_cards
    WHERE user_id = ANY($1::text[]) AND card_id=$2 LIMIT 1`, [ids, cardId]);
  return !!rows[0];
}

async function partyByCode(sql, code) {
  const rows = await sql.query(`SELECT id,code,name,state,owner_id,created_at,started_at,updated_at,timezone,
    lead_card_id,npc_card_id,pet_id,cover_type,cover_value FROM teambook_books WHERE code=$1 LIMIT 1`, [code]);
  return rows[0] || null;
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,role FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL LIMIT 1`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers?.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,alias,role FROM teambook_book_members
    WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL LIMIT 1`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

function partyDay(row, at = new Date()) {
  return partyDayNumber(row.started_at || row.created_at || at, at, row.timezone || TEAMBOOK_TIMEZONE);
}

async function stateViaLegacy(req, code) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    getHeader(name) { return headers[String(name).toLowerCase()]; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'GET'; proxy.url = `/api/teambook/party/${encodeURIComponent(code)}`;
  proxy.query = { path: `party/${code}` }; proxy.body = undefined;
  proxy.headers = { ...(req.headers || {}) };
  await legacyXtyHandler(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (capture.statusCode >= 400 || data.error) {
    const error = new Error(data.error || `STATE_${capture.statusCode}`);
    error.code = data.error || 'STATE_READ_FAILED';
    throw error;
  }
  return data;
}

async function captureCreateV3(req, sanitizedBody) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    getHeader(name) { return headers[String(name).toLowerCase()]; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'POST'; proxy.body = sanitizedBody; proxy.headers = { ...(req.headers || {}) };
  await handleCreatePartyV3(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  return { status: capture.statusCode, data, headers };
}

function coverName(type, cardId) {
  if (type === 'card') return cardDescriptorTh(cardById(cardId)) || cardId;
  if (type === 'avatar') return 'การ์ดตัวละคร TeamBook';
  return 'หลังการ์ด TeamBook';
}

function companionPetId(cardId, fallbackPetId = null) {
  const card = cardId ? cardById(cardId) : null;
  if (card?.species === 'white_cat') return WHITE_CAT_GUIDE_ID;
  return cardId ? null : fallbackPetId;
}

async function handleCreate(req, res, sql) {
  const original = bodyOf(req);
  /* Let canonical V3 create membership/quota/timing, but remove card
     placement from that request. Legacy V3 still treats a card as occupied
     by another active book; V1.2 deliberately does not. */
  const sanitized = {
    ...original,
    coverType: String(original.coverType || '') === 'avatar' ? 'avatar' : 'card_back',
    leadCardId: null,
    npcCardId: null,
  };
  const created = await captureCreateV3(req, sanitized);
  if (created.status >= 400 || created.data?.error || !created.data?.party?.id) {
    return sendJson(res, created.data || { ok: false, error: 'CREATE_FAILED' }, created.status || 500);
  }

  const party = created.data.party;
  const meUserId = created.data.meUserId || party.ownerId || '';
  const ids = await identityIds(req, sql, original, meUserId);
  const level = Math.max(1, Number(created.data?.meProgression?.level || 1));
  const requestedType = String(original.coverType || 'card_back').toLowerCase();
  const requestedLead = clean(original.leadCardId, 80).toUpperCase() || null;
  const requestedNpc = clean(original.npcCardId, 80).toUpperCase() || null;
  const requestedPet = clean(original.petId, 40) || null;

  let finalType = party.coverType || 'card_back';
  let finalLead = party.leadCardId || null;
  let finalCoverValue = party.coverValue || null;
  let finalNpc = null;
  let finalPet = requestedPet;

  if (level > 1 && requestedType === 'card') {
    const leadCard = cardById(requestedLead);
    if (!leadCard?.eligibility?.partyCover || !(await ownsCard(sql, ids, requestedLead))) {
      return sendJson(res, { ok: false, error: leadCard ? 'CARD_NOT_OWNED' : 'CARD_NOT_COVER_ELIGIBLE' }, 409);
    }
    finalType = 'card'; finalLead = requestedLead; finalCoverValue = requestedLead;
  } else if (level > 1 && requestedType === 'card_back') {
    finalType = 'card_back'; finalLead = null; finalCoverValue = 'teambook-back-v1';
  }

  if (requestedNpc) {
    const npcCard = cardById(requestedNpc);
    if (!npcCard?.eligibility?.npc || !(await ownsCard(sql, ids, requestedNpc))) {
      return sendJson(res, { ok: false, error: npcCard ? 'CARD_NOT_OWNED' : 'INVALID_CARD_PLACEMENT' }, 409);
    }
    if (requestedNpc === finalLead) return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 409);
    finalNpc = requestedNpc;
    finalPet = companionPetId(requestedNpc, null);
  }

  const at = new Date();
  await sql.query(`UPDATE teambook_books SET cover_type=$1,cover_value=$2,lead_card_id=$3,
    npc_card_id=$4,pet_id=$5,updated_at=$6 WHERE id=$7`, [
    finalType, finalCoverValue, finalLead, finalNpc, finalPet, at, party.id,
  ]);
  await sql.query(`UPDATE teambook_book_events SET data_json=COALESCE(data_json,'{}'::jsonb) || $1::jsonb
    WHERE book_id=$2 AND type='PARTY_CREATED'`, [JSON.stringify({
    coverType: finalType,
    coverValue: finalCoverValue,
    leadCardId: finalLead,
    coverName: coverName(finalType, finalLead),
    npcCardId: finalNpc,
    reusableCards: true,
  }), party.id]);

  const finalState = await stateViaLegacy(req, party.code);
  return sendJson(res, {
    ...created.data,
    ...finalState,
    token: created.data.token,
    meUserId: created.data.meUserId,
    meProgression: created.data.meProgression,
    reusableCards: true,
  }, created.status || 201);
}

async function handlePlaceCover(req, res, sql, row, member) {
  if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);
  if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
  if (String(row.cover_type || '') === 'avatar') return sendJson(res, { ok: false, error: 'COVER_LOCKED' }, 409);
  const body = bodyOf(req);
  const requestedType = String(body.coverType || 'card_back').toLowerCase();
  const ids = await identityIds(req, sql, body, member.user_id);
  let nextType = 'card_back'; let nextLead = null; let nextValue = 'teambook-back-v1';
  if (requestedType === 'card') {
    const cardId = clean(body.leadCardId, 80).toUpperCase();
    const card = cardById(cardId);
    if (!card?.eligibility?.partyCover) return sendJson(res, { ok: false, error: 'CARD_NOT_COVER_ELIGIBLE' }, 400);
    if (!(await ownsCard(sql, ids, cardId))) return sendJson(res, { ok: false, error: 'CARD_NOT_OWNED' }, 403);
    if (cardId === row.npc_card_id) return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 409);
    nextType = 'card'; nextLead = cardId; nextValue = cardId;
  }
  const oldType = row.cover_type || 'card_back'; const oldLead = row.lead_card_id || null;
  const at = new Date();
  await sql.query(`WITH changed AS (
      UPDATE teambook_books SET cover_type=$1,cover_value=$2,lead_card_id=$3,updated_at=$4 WHERE id=$5 RETURNING id
    ) INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT id,'LEAD_CARD_CHANGED',$6,$7,$8::jsonb,$4 FROM changed`, [
    nextType, nextValue, nextLead, at, row.id, member.user_id, partyDay(row, at),
    JSON.stringify({
      alias: member.alias,
      from: oldLead || oldType,
      to: nextLead || nextType,
      fromName: coverName(oldType, oldLead),
      toName: coverName(nextType, nextLead),
      reusableCards: true,
    }),
  ]);
  return sendJson(res, await stateViaLegacy(req, row.code));
}

async function handlePlaceNpc(req, res, sql, row, member) {
  if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);
  if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
  const body = bodyOf(req);
  const ids = await identityIds(req, sql, body, member.user_id);
  const npcCardId = clean(body.npcCardId, 80).toUpperCase() || null;
  const petId = clean(body.petId, 40) || null;
  let nextNpc = null; let nextPet = null;
  if (npcCardId) {
    const card = cardById(npcCardId);
    if (!card?.eligibility?.npc) return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 400);
    if (!(await ownsCard(sql, ids, npcCardId))) return sendJson(res, { ok: false, error: 'CARD_NOT_OWNED' }, 403);
    if (npcCardId === row.lead_card_id) return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 409);
    nextNpc = npcCardId; nextPet = companionPetId(npcCardId, null);
  } else if (petId) {
    if (!TEAMBOOK_V1_PETS.some(pet => pet.id === petId)) return sendJson(res, { ok: false, error: 'INVALID_PET' }, 400);
    nextPet = petId;
  }
  const old = row.npc_card_id || row.pet_id || null;
  const next = nextNpc || nextPet || null;
  if (old === next) return sendJson(res, await stateViaLegacy(req, row.code));
  const at = new Date();
  await sql.query(`WITH changed AS (
      UPDATE teambook_books SET npc_card_id=$1,pet_id=$2,updated_at=$3 WHERE id=$4 RETURNING id
    ) INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT id,'NPC_CHANGED',$5,$6,$7::jsonb,$3 FROM changed`, [
    nextNpc, nextPet, at, row.id, member.user_id, partyDay(row, at),
    JSON.stringify({ from: old, to: next, alias: member.alias, reusableCards: true }),
  ]);
  return sendJson(res, await stateViaLegacy(req, row.code));
}

export default async function v12GameplayHandler(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const action = actionOf(req);
    const sql = database(); await ensureSchema(sql);
    if (action === 'create') return handleCreate(req, res, sql);

    const code = codeOf(req);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const row = await partyByCode(sql, code);
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    const member = await memberFor(req, sql, row.id);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (action === 'place-cover') return handlePlaceCover(req, res, sql, row, member);
    if (action === 'place-npc') return handlePlaceNpc(req, res, sql, row, member);
    return sendJson(res, { ok: false, error: 'BAD_ACTION' }, 400);
  } catch (error) {
    console.error('TeamBook V1.2 gameplay adapter failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_V12_ERROR' }, 500);
  }
}
