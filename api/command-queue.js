import { database, sendJson } from './_lib/core.js';
import { currentBackofficeSession } from './_lib/backoffice-auth.js';

function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return origin === `${proto}://${host}`;
}

function packet(row) {
  return {
    id: row.id,
    mode: row.mode,
    project: row.project,
    goal: row.goal,
    nextAction: row.next_action || '',
    owner: row.owner || '',
    source: row.source || '',
    output: row.output || '',
    successCheck: row.success_check || '',
    guardrails: row.guardrails || '',
    status: row.status,
    chainState: row.chain_state || 'ACTION',
    chainUpdatedAt: row.chain_updated_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

  let sql;
  try {
    sql = database();
    const session = await currentBackofficeSession(sql, req);
    if (!session) return sendJson(res, { ok: false, error: 'BACKOFFICE_AUTH_REQUIRED' }, 401);
  } catch (error) {
    console.error('Command queue auth failed', error);
    return sendJson(res, { ok: false, error: 'QUEUE_AUTH_FAILED' }, 503);
  }

  const requested = String(req.query?.op || '').trim().slice(0, 100);
  const rawLimit = Number(req.query?.limit || 40);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(80, Math.trunc(rawLimit))) : 40;

  try {
    if (requested) {
      const rows = await sql.query(`SELECT id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,
        COALESCE(chain_state,'ACTION') AS chain_state,chain_updated_at,created_at,updated_at
        FROM mc_command_operations WHERE id=$1 LIMIT 1`, [requested]);
      if (!rows[0]) return sendJson(res, { ok: false, error: 'OPERATION_NOT_FOUND' }, 404);
      return sendJson(res, { ok: true, operation: packet(rows[0]) });
    }

    const rows = await sql.query(`SELECT id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,
      COALESCE(chain_state,'ACTION') AS chain_state,chain_updated_at,created_at,updated_at
      FROM mc_command_operations ORDER BY updated_at DESC LIMIT $1`, [limit]);
    return sendJson(res, { ok: true, operations: rows.map(packet), fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Command queue read failed', error);
    return sendJson(res, { ok: false, error: 'QUEUE_READ_FAILED' }, 500);
  }
}
