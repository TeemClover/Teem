import { currentUser, database, ensureSchema, sendJson } from './core.js';
import { handleCreatePartyV3 } from './xty-create-v3.js';
import {
  identityIdsForLineage,
  prepareLineageForCreate,
  recordCreatedBookLineage,
} from './xty-lineage.js';

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

async function captureV3(req) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.body = { ...bodyOf(req) };
  await handleCreatePartyV3(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  return { status: capture.statusCode, data, headers };
}

export async function handleCreatePartyV4(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    const sql = database();
    await ensureSchema(sql);
    const identityIds = await identityIdsForLineage(req, sql, currentUser);
    const prepared = await prepareLineageForCreate(sql, bodyOf(req), identityIds);

    const created = await captureV3(req);
    if (created.status >= 400 || created.data?.error || !created.data?.party?.id) {
      return sendJson(res, created.data || { ok: false, error: 'CREATE_FAILED' }, created.status || 500);
    }

    const party = created.data.party;
    const lineage = await recordCreatedBookLineage(sql, party, prepared);
    const now = new Date();
    await sql.query(`INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
      VALUES ($1,'BOOK_LINEAGE_RECORDED',$2,1,$3::jsonb,$4)`, [
      party.id,
      identityIds[0] || party.ownerId || null,
      JSON.stringify(lineage),
      now,
    ]);

    return sendJson(res, { ...created.data, lineage }, created.status || 201);
  } catch (error) {
    console.error('TeamBook create v4 lineage failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: error.code || 'TEAMBOOK_LINEAGE_ERROR' }, 409);
  }
}

export default handleCreatePartyV4;
