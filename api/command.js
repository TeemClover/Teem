import { randomUUID } from 'node:crypto';
import { clean, currentUser, database, ensureSchema, sendJson } from './_lib/core.js';

const MODES = new Set(['CREATE', 'EXPAND', 'CONQUER']);
const STATUSES = new Set(['QUEUED', 'IN_PROGRESS', 'REVIEW', 'LIVE', 'BLOCKED', 'ARCHIVED']);

async function ensureCommandSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_command_operations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    project TEXT NOT NULL,
    goal TEXT NOT NULL,
    next_action TEXT,
    owner TEXT,
    source TEXT,
    output TEXT,
    success_check TEXT,
    guardrails TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_mc_command_operations_user_updated
    ON mc_command_operations(user_id, updated_at DESC)`);
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    return url.host === host;
  } catch {
    return false;
  }
}

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function operationPacket(row) {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getBrief(sql, user) {
  const [accounts, activeBooks, activeHumans, posts24h, confirmations24h, openOps, latestOps] = await Promise.all([
    sql.query('SELECT COUNT(*)::int AS n FROM mc_accounts'),
    sql.query("SELECT COUNT(*)::int AS n FROM xty_parties WHERE state='ACTIVE'"),
    sql.query("SELECT COUNT(DISTINCT user_id)::int AS n FROM xty_posts WHERE sent_at >= NOW() - INTERVAL '7 days' AND retracted=FALSE"),
    sql.query("SELECT COUNT(*)::int AS n FROM xty_posts WHERE sent_at >= NOW() - INTERVAL '24 hours' AND retracted=FALSE"),
    sql.query("SELECT COUNT(*)::int AS n FROM xty_confirmations WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    sql.query("SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE user_id=$1 AND status NOT IN ('LIVE','ARCHIVED')", [user.id]),
    sql.query(`SELECT id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,created_at,updated_at
      FROM mc_command_operations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20`, [user.id]),
  ]);

  return {
    user: { id: user.id, displayName: user.display_name, memberNo: user.member_no || '' },
    population: {
      accounts: Number(accounts[0]?.n || 0),
      teamBookActiveBooks: Number(activeBooks[0]?.n || 0),
      teamBookActiveHumans7d: Number(activeHumans[0]?.n || 0),
      teamBookPosts24h: Number(posts24h[0]?.n || 0),
      teamBookConfirmations24h: Number(confirmations24h[0]?.n || 0),
    },
    operations: {
      open: Number(openOps[0]?.n || 0),
      recent: latestOps.map(operationPacket),
    },
  };
}

export default async function handler(req, res) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  if (!['GET', 'POST'].includes(req.method)) return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  let sql;
  try {
    sql = database();
    await ensureSchema(sql);
    await ensureCommandSchema(sql);
  } catch (error) {
    console.error('Command database init failed', error);
    return sendJson(res, { ok: false, error: error?.code || 'COMMAND_STORAGE_UNAVAILABLE' }, 503);
  }

  const user = await currentUser(req, sql);
  if (!user) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

  if (req.method === 'GET') {
    try {
      const brief = await getBrief(sql, user);
      return sendJson(res, { ok: true, ...brief });
    } catch (error) {
      console.error('Command brief failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_BRIEF_FAILED' }, 500);
    }
  }

  const body = bodyOf(req);
  const action = clean(body.action, 24) || 'create';

  if (action === 'create') {
    const mode = clean(body.mode, 16).toUpperCase();
    const project = clean(body.project, 120);
    const goal = clean(body.goal, 1200);
    const nextAction = clean(body.nextAction, 600);
    const owner = clean(body.owner, 120);
    const source = clean(body.source, 500);
    const output = clean(body.output, 600);
    const successCheck = clean(body.successCheck, 600);
    const guardrails = clean(body.guardrails, 1200);

    if (!MODES.has(mode)) return sendJson(res, { ok: false, error: 'BAD_MODE' }, 400);
    if (!project || !goal) return sendJson(res, { ok: false, error: 'PROJECT_AND_GOAL_REQUIRED' }, 400);

    const now = new Date();
    const id = `OP-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      const rows = await sql.query(`INSERT INTO mc_command_operations
        (id,user_id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'QUEUED',$12,$12)
        RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,created_at,updated_at`,
        [id, user.id, mode, project, goal, nextAction, owner, source, output, successCheck, guardrails, now]);
      return sendJson(res, { ok: true, operation: operationPacket(rows[0]) }, 201);
    } catch (error) {
      console.error('Command operation create failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_CREATE_FAILED' }, 500);
    }
  }

  if (action === 'status') {
    const id = clean(body.id, 80);
    const status = clean(body.status, 24).toUpperCase();
    if (!id || !STATUSES.has(status)) return sendJson(res, { ok: false, error: 'BAD_STATUS_UPDATE' }, 400);
    try {
      const rows = await sql.query(`UPDATE mc_command_operations SET status=$1,updated_at=$2
        WHERE id=$3 AND user_id=$4
        RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,created_at,updated_at`,
        [status, new Date(), id, user.id]);
      if (!rows[0]) return sendJson(res, { ok: false, error: 'OPERATION_NOT_FOUND' }, 404);
      return sendJson(res, { ok: true, operation: operationPacket(rows[0]) });
    } catch (error) {
      console.error('Command operation status failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_STATUS_FAILED' }, 500);
    }
  }

  return sendJson(res, { ok: false, error: 'UNKNOWN_ACTION' }, 400);
}
