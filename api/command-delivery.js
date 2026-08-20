import { database, sendJson } from './_lib/core.js';
import { currentBackofficeSession, ensureBackofficeSchema, recordBackofficeAudit } from './_lib/backoffice-auth.js';

let schemaPromise;

function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return origin === `${proto}://${host}`;
}

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function clean(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

async function ensureDeliverySchema(sql) {
  if (!schemaPromise) schemaPromise = (async () => {
    await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS delivery_summary TEXT");
    await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS delivery_location TEXT");
    await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS delivery_proof TEXT");
    await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS delivery_review TEXT");
    await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS delivery_remaining TEXT");
    await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ");
    await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_command_operations_delivered ON mc_command_operations(delivered_at DESC)');
  })().catch(error => { schemaPromise = undefined; throw error; });
  return schemaPromise;
}

function deliveryPacket(row) {
  return {
    id: row.id,
    project: row.project,
    mode: row.mode,
    owner: row.owner || '',
    status: row.status,
    chainState: row.chain_state || 'ACTION',
    expectedOutput: row.output || '',
    summary: row.delivery_summary || '',
    location: row.delivery_location || '',
    proof: row.delivery_proof || '',
    review: row.delivery_review || '',
    remaining: row.delivery_remaining || '',
    deliveredAt: row.delivered_at || null,
    updatedAt: row.updated_at,
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

  let sql;
  try {
    sql = database();
    await ensureBackofficeSchema(sql);
    await ensureDeliverySchema(sql);
    const session = await currentBackofficeSession(sql, req);
    if (!session) return sendJson(res, { ok: false, error: 'BACKOFFICE_AUTH_REQUIRED' }, 401);
  } catch (error) {
    console.error('Command delivery init failed', error);
    return sendJson(res, { ok: false, error: 'DELIVERY_STORAGE_UNAVAILABLE' }, 503);
  }

  if (req.method === 'GET') {
    const requested = clean(req.query?.op, 100);
    const rawLimit = Number(req.query?.limit || 60);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.trunc(rawLimit))) : 60;
    try {
      const select = `SELECT id,project,mode,owner,status,COALESCE(chain_state,'ACTION') AS chain_state,output,
        delivery_summary,delivery_location,delivery_proof,delivery_review,delivery_remaining,delivered_at,updated_at
        FROM mc_command_operations`;
      if (requested) {
        const rows = await sql.query(`${select} WHERE id=$1 LIMIT 1`, [requested]);
        if (!rows[0]) return sendJson(res, { ok: false, error: 'OPERATION_NOT_FOUND' }, 404);
        return sendJson(res, { ok: true, delivery: deliveryPacket(rows[0]) });
      }
      const rows = await sql.query(`${select} WHERE delivered_at IS NOT NULL ORDER BY delivered_at DESC LIMIT $1`, [limit]);
      return sendJson(res, { ok: true, deliveries: rows.map(deliveryPacket), fetchedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Command delivery read failed', error);
      return sendJson(res, { ok: false, error: 'DELIVERY_READ_FAILED' }, 500);
    }
  }

  const body = bodyOf(req);
  const id = clean(body.id, 100);
  const summary = clean(body.summary, 2400);
  const location = clean(body.location, 1200);
  const proof = clean(body.proof, 2400);
  const review = clean(body.review, 1800);
  const remaining = clean(body.remaining, 1800);
  if (!id || !summary) return sendJson(res, { ok: false, error: 'ID_AND_SUMMARY_REQUIRED' }, 400);
  if (!location && !proof) return sendJson(res, { ok: false, error: 'LOCATION_OR_PROOF_REQUIRED' }, 400);

  try {
    const now = new Date();
    const rows = await sql.query(`UPDATE mc_command_operations SET
      delivery_summary=$1,delivery_location=$2,delivery_proof=$3,delivery_review=$4,delivery_remaining=$5,delivered_at=$6,
      status='REVIEW',chain_state='PASS',chain_updated_at=$6,updated_at=$6
      WHERE id=$7
      RETURNING id,project,mode,owner,status,COALESCE(chain_state,'ACTION') AS chain_state,output,
        delivery_summary,delivery_location,delivery_proof,delivery_review,delivery_remaining,delivered_at,updated_at`,
      [summary, location, proof, review, remaining, now, id]);
    if (!rows[0]) return sendJson(res, { ok: false, error: 'OPERATION_NOT_FOUND' }, 404);
    await recordBackofficeAudit(sql, req, 'OPERATION_DELIVERED', { id, project: rows[0].project });
    return sendJson(res, { ok: true, delivery: deliveryPacket(rows[0]) });
  } catch (error) {
    console.error('Command delivery submit failed', error);
    return sendJson(res, { ok: false, error: 'DELIVERY_SUBMIT_FAILED' }, 500);
  }
}
