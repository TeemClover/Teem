import { handleCreatePartyV3 } from './xty-create-v3.js';
import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson,
} from './core.js';
import { normalizeVerificationMode } from './xty-rules.js';
import { cardById, cardDescriptorTh } from '../../_shared/cards.js';

const WHITE_CAT_GUIDE_ID = 'xvisor_white_cat_silver';
const HIA_ID = 'monitor_lizard';
const DEFAULT_MEMBER_LIMIT = 5;
const MAX_MEMBER_LIMIT = 11;

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function memberLimitOf(body) {
  const wanted = Math.floor(Number(body?.memberLimit || DEFAULT_MEMBER_LIMIT));
  return Number.isFinite(wanted) ? Math.min(MAX_MEMBER_LIMIT, Math.max(1, wanted)) : DEFAULT_MEMBER_LIMIT;
}
function localIdentity(body) {
  const id = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(id) ? `local:${id}` : '';
}

async function identityIds(req, sql, body) {
  const account = await currentUser(req, sql);
  return [...new Set([
    account?.id ? `account:${account.id}` : '',
    localIdentity(body),
  ].filter(Boolean))];
}

async function levelFor(sql, ids) {
  if (!ids.length) return 1;
  const rows = await sql.query(`SELECT level FROM teambook_progression
    WHERE user_id = ANY($1::text[]) ORDER BY level DESC LIMIT 1`, [ids]);
  return Math.min(4, Math.max(1, Math.floor(Number(rows[0]?.level || 1)) || 1));
}

async function ownsCard(sql, ids, cardId) {
  if (!cardId || !ids.length) return false;
  const rows = await sql.query(`SELECT 1 FROM teambook_user_cards
    WHERE user_id = ANY($1::text[]) AND card_id=$2 LIMIT 1`, [ids, cardId]);
  return !!rows[0];
}

async function captureCreate(req, sanitizedBody) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    getHeader(name) { return headers[String(name).toLowerCase()]; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'POST';
  proxy.body = sanitizedBody;
  proxy.headers = { ...(req.headers || {}) };
  await handleCreatePartyV3(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  return { status: capture.statusCode, data };
}

function coverName(type, cardId) {
  if (type === 'card') return cardDescriptorTh(cardById(cardId)) || cardId;
  if (type === 'avatar') return 'การ์ดตัวละคร TeamBook';
  return 'หลังการ์ด TeamBook';
}

function petForNpc(cardId, fallbackPetId) {
  const card = cardId ? cardById(cardId) : null;
  if (card?.species === 'white_cat') return WHITE_CAT_GUIDE_ID;
  if (card?.species === HIA_ID) return HIA_ID;
  return cardId ? null : (fallbackPetId || null);
}

export function requestedRoomSettings(body = {}) {
  return {
    visibility: ['public', 'private'].includes(body.visibility) ? body.visibility : 'private',
    verificationMode: normalizeVerificationMode(body.verificationMode),
  };
}

export async function handleV12Create(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    const sql = database();
    await ensureSchema(sql);
    const original = bodyOf(req);
    const memberLimit = memberLimitOf(original);
    const roomSettings = requestedRoomSettings(original);
    const ids = await identityIds(req, sql, original);
    const level = await levelFor(sql, ids);
    const requestedType = String(original.coverType || 'card_back').toLowerCase();
    const requestedLead = clean(original.leadCardId, 80).toUpperCase() || null;
    const requestedNpc = clean(original.npcCardId, 80).toUpperCase() || null;

    if (requestedLead && requestedNpc && requestedLead === requestedNpc) {
      return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 409);
    }
    if (level > 1 && requestedType === 'card') {
      const card = cardById(requestedLead);
      if (!card?.eligibility?.partyCover) return sendJson(res, { ok: false, error: 'CARD_NOT_COVER_ELIGIBLE' }, 400);
      if (!(await ownsCard(sql, ids, requestedLead))) return sendJson(res, { ok: false, error: 'CARD_NOT_OWNED' }, 403);
    }
    if (requestedNpc) {
      const card = cardById(requestedNpc);
      if (!card?.eligibility?.npc) return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 400);
      if (!(await ownsCard(sql, ids, requestedNpc))) return sendJson(res, { ok: false, error: 'CARD_NOT_OWNED' }, 403);
    }

    const sanitized = {
      ...original,
      memberLimit,
      visibility: roomSettings.visibility,
      verificationMode: roomSettings.verificationMode,
      coverType: level <= 1 ? 'avatar' : 'card_back',
      leadCardId: null,
      npcCardId: null,
    };
    const created = await captureCreate(req, sanitized);
    if (created.status >= 400 || created.data?.error || !created.data?.party?.id) {
      return sendJson(res, created.data || { ok: false, error: 'CREATE_FAILED' }, created.status || 500);
    }

    const party = created.data.party;
    let finalType = party.coverType || (level <= 1 ? 'avatar' : 'card_back');
    let finalLead = party.leadCardId || null;
    let finalCoverValue = party.coverValue || null;
    if (level > 1 && requestedType === 'card') {
      finalType = 'card'; finalLead = requestedLead; finalCoverValue = requestedLead;
    } else if (level > 1) {
      finalType = 'card_back'; finalLead = null; finalCoverValue = 'teambook-back-v1';
    }

    const finalNpc = requestedNpc || null;
    const finalPet = petForNpc(finalNpc, clean(original.petId, 40) || null);
    const at = new Date();
    await sql.query(`UPDATE teambook_books SET cover_type=$1,cover_value=$2,lead_card_id=$3,
      npc_card_id=$4,pet_id=$5,visibility=$6,verification_mode=$7,updated_at=$8 WHERE id=$9`, [
      finalType, finalCoverValue, finalLead, finalNpc, finalPet,
      roomSettings.visibility, roomSettings.verificationMode, at, party.id,
    ]);
    const eventPatch = {
      coverType: finalType,
      coverValue: finalCoverValue,
      leadCardId: finalLead,
      coverName: coverName(finalType, finalLead),
      npcCardId: finalNpc,
      visibility: roomSettings.visibility,
      verificationMode: roomSettings.verificationMode,
      reusableCards: true,
      memberLimit,
    };
    await sql.query(`UPDATE teambook_book_events
      SET data_json=COALESCE(data_json,'{}'::jsonb) || $1::jsonb
      WHERE book_id=$2 AND type='PARTY_CREATED'`, [JSON.stringify(eventPatch), party.id]);

    party.coverType = finalType;
    party.coverValue = finalCoverValue;
    party.leadCardId = finalLead;
    party.npcCardId = finalNpc;
    party.petId = finalPet;
    party.visibility = roomSettings.visibility;
    party.verificationMode = roomSettings.verificationMode;
    party.memberLimit = memberLimit;
    party.updatedAt = at.toISOString();
    if (Array.isArray(party.events)) {
      party.events = party.events.map(event => event.type === 'PARTY_CREATED'
        ? { ...event, data: { ...(event.data || {}), ...eventPatch } }
        : event);
    }
    return sendJson(res, { ...created.data, party, reusableCards: true, memberLimit }, created.status || 201);
  } catch (error) {
    console.error('TeamBook V1.2 create failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_V12_CREATE_ERROR' }, 500);
  }
}
