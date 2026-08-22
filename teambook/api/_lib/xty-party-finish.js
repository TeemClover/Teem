import legacyXtyHandler from '../teambook/[...path].js';
import { currentUser, database, ensureSchema, sameOrigin, sendJson, sha256 } from './core.js';
import { dissolveXtyParty } from './xty-dissolve.js';
import { handleCreatePartyV2 } from './xty-create-v2.js';
import { handleCreatePartyV3 } from './xty-create-v3.js';
import { handleJoinPartyV2 } from './xty-join-v2.js';
import { handleIdentityV2, handleLeaveV2, handleProfileV2, handleCoverV2 } from './xty-member-actions-v2.js';
import { handleDebugLevel2 } from './xty-debug-level-v2.js';
import { handlePublicPreviewV2 } from './xty-public-preview-v2.js';

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function inviteCodeOf(req) {
  const fromQuery = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  if (/^\d{5}$/.test(String(fromQuery || ''))) return String(fromQuery);

  const rawPath = Array.isArray(req.query?.path) ? req.query.path.join('/') : String(req.query?.path || '');
  const pathMatch = rawPath.match(/(?:^|\/)party\/(\d{5})\/finish\/?$/);
  if (pathMatch) return pathMatch[1];

  const match = new URL(req.url || '/', 'https://teambook.local').pathname.match(/\/party\/(\d{5})\/finish\/?$/);
  return match ? match[1] : '';
}
async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,role FROM teambook_book_members WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || ''); const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,role FROM teambook_book_members WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

async function stateAfterClose(req, code) {
  let raw = '';
  const headers = {};
  const capture = {
    statusCode: 200,
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    getHeader(name) { return headers[String(name).toLowerCase()]; },
    end(chunk = '') { raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''); },
  };
  const proxy = Object.create(req);
  proxy.method = 'GET';
  proxy.url = `/api/teambook/party/${encodeURIComponent(code)}`;
  proxy.query = { path: `party/${code}` };
  proxy.body = undefined;
  proxy.headers = { ...(req.headers || {}) };
  await legacyXtyHandler(proxy, capture);
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (capture.statusCode >= 400 || data.error) return null;
  return data;
}

export async function handleXtyPartyFinish(req, res) {
  const op = Array.isArray(req.query?.op) ? req.query.op[0] : req.query?.op;
  if (op === 'create-v2') return handleCreatePartyV2(req, res);
  if (op === 'create-v3') return handleCreatePartyV3(req, res);
  if (op === 'join-v2') return handleJoinPartyV2(req, res, legacyXtyHandler);
  if (op === 'identity-v2') return handleIdentityV2(req, res, legacyXtyHandler);
  if (op === 'leave-v2') return handleLeaveV2(req, res);
  if (op === 'profile-v2') return handleProfileV2(req, res);
  if (op === 'cover-v2') return handleCoverV2(req, res, legacyXtyHandler);
  if (op === 'debug-level2') return handleDebugLevel2(req, res);
  if (op === 'public-preview-v2') return handlePublicPreviewV2(req, res);

  const mode = bodyOf(req).mode === 'dissolve' ? 'dissolve' : 'complete';
  if (mode !== 'dissolve') {
    const code = inviteCodeOf(req);
    req.query ||= {};
    req.query.path = `party/${code}/finish`;
    return legacyXtyHandler(req, res);
  }

  try {
    if (String(req.method || 'GET').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = inviteCodeOf(req); if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const sql = database(); await ensureSchema(sql);
    const rows = await sql.query(`SELECT id,code,name,activity,activity_id,preset,duration_days,color,visibility,
      commit_rule,budget,pet_id,owner_id,state,created_at,updated_at,head_seq,lead_card_id,npc_card_id,
      started_at,ended_at,timezone,verification_mode,scheduled_end_at,cover_type,cover_value FROM teambook_books WHERE code=$1`, [code]);
    const row = rows[0]; if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    const member = await memberFor(req, sql, row.id); if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);

    const dissolved = await dissolveXtyParty(sql, row, member.user_id);
    if (!dissolved) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);

    /* V1.2 keeps membership readable after dissolve. Return the canonical
       closed state instead of replacing the local cache with an empty shell. */
    const state = await stateAfterClose(req, code);
    if (state?.party) {
      return sendJson(res, {
        ...state,
        dissolved: true,
        removedMembers: dissolved.removedMembers,
      });
    }
    return sendJson(res, { ok: true, dissolved: true, removedMembers: 0 });
  } catch (error) {
    console.error('TeamBook dissolve failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}

export default handleXtyPartyFinish;
