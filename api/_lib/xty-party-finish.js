import legacyXtyHandler from '../xty/[...path].js';
import { currentUser, database, ensureSchema, sameOrigin, sendJson, sha256 } from './core.js';
import { handleCreatePartyV2 } from './xty-create-v2.js';
import { handleCreatePartyV3 } from './xty-create-v3.js';
import { handleJoinPartyV2 } from './xty-join-v2.js';
import { handleIdentityV2, handleLeaveV2, handleProfileV2, handleCoverV2 } from './xty-member-actions-v2.js';
import { handleDebugLevel2 } from './xty-debug-level-v2.js';
import { handlePublicPreviewV2 } from './xty-public-preview-v2.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const DISSOLVEABLE_STATES = Object.freeze([...ACTIVE_STATES, 'DISSOLVED']);

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function inviteCodeOf(req) {
  const fromQuery = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  if (/^\d{5}$/.test(String(fromQuery || ''))) return String(fromQuery);
  const match = new URL(req.url || '/', 'https://myclover.local').pathname.match(/\/party\/(\d{5})\/finish\/?$/);
  return match ? match[1] : '';
}
async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,role FROM xty_members WHERE party_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || ''); const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,role FROM xty_members WHERE party_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}
function closedPartySnapshot(row, endedAt) {
  const startedAt = row.started_at || row.created_at || endedAt; const scheduledEndAt = row.scheduled_end_at || endedAt;
  return {
    id: row.id, code: row.code, name: row.name, activity: row.activity || '', activityId: row.activity_id || 'custom', preset: row.preset || 'casual',
    durationDays: Number(row.duration_days || 7), color: row.color || 'green', visibility: 'private', verificationMode: row.verification_mode || 'trust',
    commitRule: '', budget: row.budget || 'normal', petId: null, leadCardId: null, npcCardId: null, coverType: 'card_back', coverValue: null,
    ownerId: row.owner_id, state: 'DISSOLVED', timezone: row.timezone || 'Asia/Bangkok', startAt: new Date(startedAt).toISOString(),
    scheduledEndAt: new Date(scheduledEndAt).toISOString(), endAt: endedAt.toISOString(), createdAt: new Date(row.created_at || startedAt).toISOString(),
    updatedAt: endedAt.toISOString(), members: [], memberHistory: [], events: [], rewardClaims: [], log: [],
  };
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
    const code = inviteCodeOf(req); req.query ||= {}; req.query.path = `party/${code}/finish`; return legacyXtyHandler(req, res);
  }

  try {
    if (String(req.method || 'GET').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = inviteCodeOf(req); if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const sql = database(); await ensureSchema(sql);
    const rows = await sql.query(`SELECT id,code,name,activity,activity_id,preset,duration_days,color,visibility,
      commit_rule,budget,pet_id,owner_id,state,created_at,updated_at,head_seq,lead_card_id,npc_card_id,
      started_at,ended_at,timezone,verification_mode,scheduled_end_at,cover_type,cover_value FROM xty_parties WHERE code=$1`, [code]);
    const row = rows[0]; if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    const member = await memberFor(req, sql, row.id); if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);
    if (!DISSOLVEABLE_STATES.includes(String(row.state || '').toUpperCase())) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);

    const at = new Date(); const endedAt = row.ended_at ? new Date(row.ended_at) : at;
    const changed = await sql.query(`WITH dissolved AS (
        UPDATE xty_parties SET state='DISSOLVED',ended_at=COALESCE(ended_at,$1),updated_at=$1,visibility='private'
        WHERE id=$2 AND state = ANY($3::text[]) RETURNING id)
      UPDATE xty_members SET left_at=$1,removal_reason='DISSOLVED',auth_hash=NULL
      WHERE party_id=$2 AND left_at IS NULL AND EXISTS (SELECT 1 FROM dissolved) RETURNING user_id`, [at, row.id, DISSOLVEABLE_STATES]);
    if (!changed.length) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    try { await sql.query(`UPDATE xty_party_quota_v2 SET released_at=COALESCE(released_at,$1) WHERE party_id=$2 AND released_at IS NULL`, [at, row.id]); }
    catch (quotaError) { if (quotaError.code !== '42P01') console.warn('XTY quota v2 release failed', quotaError); }
    try {
      await sql.query(`INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
        SELECT $1,'PARTY_DISSOLVED',$2,1,'{}'::jsonb,$3 WHERE NOT EXISTS
        (SELECT 1 FROM xty_party_events WHERE party_id=$1 AND type='PARTY_DISSOLVED')`, [row.id, member.user_id, at]);
    } catch (eventError) { console.warn('XTY dissolve audit event failed', eventError); }
    return sendJson(res, { ok: true, dissolved: true, removedMembers: changed.length, meUserId: null, party: closedPartySnapshot(row, endedAt) });
  } catch (error) {
    console.error('XTY dissolve failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'XTY_API_ERROR' }, 500);
  }
}

export default handleXtyPartyFinish;
