import { currentUser, database, ensureSchema, sendJson } from './core.js';
import { handleCreatePartyV2 } from './xty-create-v2.js';
import { cardById as xtyCardById, cardDescriptorTh } from '../../xty/_shared/cards.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';

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

function core7Name(card) {
  return card ? `${card.en} · ${card.th}` : '';
}

async function requestedCover(req, sql) {
  const body = bodyOf(req);
  const type = String(body.coverType || 'card_back').toLowerCase();

  if (type === 'core7_card') {
    const id = cleanId(body.core7CardId || body.coverValue, 80).toLowerCase();
    const card = core7CardById(id);
    if (!card || card.generic || !String(card.id || '').startsWith('fh-')) {
      const error = new Error('CARD_NOT_COVER_ELIGIBLE');
      error.code = 'CARD_NOT_COVER_ELIGIBLE';
      throw error;
    }
    return { type: 'core7_card', value: card.id, leadCardId: null, name: core7Name(card) };
  }

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
    const owned = await sql.query(`SELECT 1 FROM xty_card_ownership
      WHERE user_id = ANY($1::text[]) AND card_id=$2 LIMIT 1`, [ids, id]);
    if (!owned[0]) {
      const error = new Error('CARD_NOT_OWNED');
      error.code = 'CARD_NOT_OWNED';
      throw error;
    }
    const occupied = await sql.query(`SELECT 1 FROM xty_parties
      WHERE owner_id = ANY($1::text[]) AND state = ANY($2::text[])
        AND (lead_card_id=$3 OR npc_card_id=$3) LIMIT 1`, [ids, ACTIVE_STATES, id]);
    if (occupied[0]) {
      const error = new Error('CARD_IN_USE');
      error.code = 'CARD_IN_USE';
      throw error;
    }
    return { type: 'card', value: id, leadCardId: id, name: cardDescriptorTh(card) };
  }

  return { type: 'card_back', value: 'myclover-back-v1', leadCardId: null, name: 'หลังการ์ด myClover' };
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

export async function handleCreatePartyV3(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const sql = database();
    await ensureSchema(sql);
    const cover = await requestedCover(req, sql);

    const created = await captureV2(req);
    if (created.status >= 400 || created.data?.error || !created.data?.party?.id) {
      return sendJson(res, created.data || { ok: false, error: 'CREATE_FAILED' }, created.status || 500);
    }

    const party = created.data.party;
    const at = new Date();
    await sql.query(`UPDATE xty_parties
      SET cover_type=$1,cover_value=$2,lead_card_id=$3,updated_at=$4
      WHERE id=$5`, [cover.type, cover.value, cover.leadCardId, at, party.id]);
    await sql.query(`UPDATE xty_party_events
      SET data_json = COALESCE(data_json,'{}'::jsonb) || $1::jsonb
      WHERE party_id=$2 AND type='PARTY_CREATED'`, [JSON.stringify({
      coverType: cover.type,
      coverValue: cover.value,
      leadCardId: cover.leadCardId,
      coverName: cover.name,
    }), party.id]);

    party.coverType = cover.type;
    party.coverValue = cover.value;
    party.leadCardId = cover.leadCardId;
    party.updatedAt = at.toISOString();
    return sendJson(res, { ...created.data, party, coverName: cover.name }, created.status || 201);
  } catch (error) {
    console.error('XTY create v3 failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: error.code || 'XTY_API_ERROR' }, 409);
  }
}
