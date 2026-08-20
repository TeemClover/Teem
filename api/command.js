import { randomUUID } from 'node:crypto';
import { clean, database, ensureSchema, sendJson } from './_lib/core.js';
import { currentBackofficeSession, ensureBackofficeSchema, recordBackofficeAudit } from './_lib/backoffice-auth.js';

const MODES = new Set(['CREATE', 'EXPAND', 'CONQUER']);
const STATUSES = new Set(['QUEUED', 'IN_PROGRESS', 'REVIEW', 'LIVE', 'BLOCKED', 'ARCHIVED']);
const FLOWS = Object.freeze({
  ACTION: 'IN_PROGRESS',
  PASS: 'REVIEW',
  GO_AGAIN: 'IN_PROGRESS',
  CLOSE_CHAIN: 'LIVE',
  BLOCK: 'BLOCKED',
});

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
    chain_state TEXT NOT NULL DEFAULT 'ACTION',
    chain_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`);
  await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS chain_state TEXT NOT NULL DEFAULT 'ACTION'");
  await sql.query('ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS chain_updated_at TIMESTAMPTZ');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_command_operations_updated ON mc_command_operations(updated_at DESC)');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_command_operations_status ON mc_command_operations(status, updated_at DESC)');
}

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
    chainState: row.chain_state || 'ACTION',
    chainUpdatedAt: row.chain_updated_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function count(sql, query, params = []) {
  try {
    const rows = await sql.query(query, params);
    return Number(rows[0]?.n || 0);
  } catch {
    return 0;
  }
}

async function latest(sql, query, params = []) {
  try {
    const rows = await sql.query(query, params);
    return rows[0]?.at || null;
  } catch {
    return null;
  }
}

function dayLabel(value) {
  try { return new Date(value).toISOString().slice(0, 10); } catch { return String(value || ''); }
}

async function teamBookSeries(sql) {
  try {
    const rows = await sql.query(`WITH days AS (
      SELECT generate_series(date_trunc('day', NOW()) - interval '6 days', date_trunc('day', NOW()), interval '1 day') AS day
    )
    SELECT day,
      (SELECT COUNT(*)::int FROM xty_posts p WHERE p.sent_at >= day AND p.sent_at < day + interval '1 day' AND p.retracted=FALSE) AS posts,
      (SELECT COUNT(*)::int FROM xty_confirmations c WHERE c.created_at >= day AND c.created_at < day + interval '1 day') AS confirmations,
      (SELECT COUNT(*)::int FROM xty_system_errors e WHERE e.created_at >= day AND e.created_at < day + interval '1 day') AS errors
    FROM days ORDER BY day`);
    return {
      labels: rows.map(row => dayLabel(row.day)),
      posts: rows.map(row => Number(row.posts || 0)),
      confirmations: rows.map(row => Number(row.confirmations || 0)),
      errors: rows.map(row => Number(row.errors || 0)),
    };
  } catch {
    const labels = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - (6 - index)); return d.toISOString().slice(0, 10);
    });
    return { labels, posts: labels.map(() => 0), confirmations: labels.map(() => 0), errors: labels.map(() => 0) };
  }
}

async function learningSeries(sql, labels) {
  try {
    const rows = await sql.query(`WITH days AS (
      SELECT generate_series(date_trunc('day', NOW()) - interval '6 days', date_trunc('day', NOW()), interval '1 day') AS day
    )
    SELECT day,
      (SELECT COUNT(*)::int FROM first_class_registrations r WHERE r.created_at >= day AND r.created_at < day + interval '1 day') AS registrations,
      (SELECT COUNT(*)::int FROM first_class_reviews v WHERE v.created_at >= day AND v.created_at < day + interval '1 day') AS reviews
    FROM days ORDER BY day`);
    return {
      registrations: rows.map(row => Number(row.registrations || 0)),
      reviews: rows.map(row => Number(row.reviews || 0)),
    };
  } catch {
    return { registrations: labels.map(() => 0), reviews: labels.map(() => 0) };
  }
}

async function operationSeries(sql, labels) {
  try {
    const rows = await sql.query(`WITH days AS (
      SELECT generate_series(date_trunc('day', NOW()) - interval '6 days', date_trunc('day', NOW()), interval '1 day') AS day
    )
    SELECT day,
      (SELECT COUNT(*)::int FROM mc_command_operations o WHERE o.created_at >= day AND o.created_at < day + interval '1 day') AS created,
      (SELECT COUNT(*)::int FROM mc_command_operations o WHERE o.updated_at >= day AND o.updated_at < day + interval '1 day' AND o.status='LIVE') AS closed
    FROM days ORDER BY day`);
    return { created: rows.map(row => Number(row.created || 0)), closed: rows.map(row => Number(row.closed || 0)) };
  } catch {
    return { created: labels.map(() => 0), closed: labels.map(() => 0) };
  }
}

function attentionItems({ systemErrors24h, blockedOps, staleOps, posts24h, confirmations24h, firstClassRegistrations, firstClassGranted }) {
  const items = [];
  if (systemErrors24h > 0) items.push({
    level: 'critical', title: `${systemErrors24h} system errors ใน 24 ชั่วโมง`,
    detail: 'TeamBook มี error signal ที่ควร inspect ก่อนเพิ่ม feature ใหม่',
    advice: 'เปิด TeamBook Admin Stats แล้ว resolve ต้นเหตุ ก่อนเล่น ACTION ต่อ',
  });
  if (blockedOps > 0) items.push({
    level: 'critical', title: `${blockedOps} Operation ติด BLOCK`,
    detail: 'Chain มีงานที่หยุดเพราะ blocker ยังไม่ถูก resolve',
    advice: 'ระบุให้ชัดว่ารอ “อะไร/ใคร/เมื่อไหร่” แล้วเลือก GO AGAIN หรือ DELETE ถ้างานไม่เอาแล้ว',
  });
  if (staleOps > 0) items.push({
    level: 'attention', title: `${staleOps} Operation ค้างเกิน 48 ชั่วโมง`,
    detail: 'งานเปิดไว้นานโดยไม่มี update ทำให้ Work Queue เริ่มมี debt',
    advice: 'PASS ให้คนถัดไป, GO AGAIN พร้อม next action ใหม่ หรือ DELETE งานที่เลิกทำ',
  });
  if (posts24h >= 5 && confirmations24h / Math.max(1, posts24h) < 0.5) items.push({
    level: 'attention', title: '“เห็นแล้ว” ต่ำกว่าครึ่งของ activity',
    detail: `${posts24h} posts แต่มี ${confirmations24h} confirmations ใน 24 ชั่วโมง`,
    advice: 'ดู social loop ว่าคนเห็นสิ่งที่คนอื่นทำง่ายพอหรือยัง',
  });
  const pending = Math.max(0, firstClassRegistrations - firstClassGranted);
  if (pending > 0) items.push({
    level: 'attention', title: `${pending} First Class ยังไม่ปิดสิทธิ์`,
    detail: 'มี registration ที่ยังไม่ถึงสถานะ granted',
    advice: 'เปิด First Class Control Room เพื่อตรวจ payment / Discord / email automation',
  });
  if (!items.length) items.push({
    level: 'info', title: 'ไม่มี critical attention ตอนนี้',
    detail: 'ระบบไม่มี blocker/error signal ที่ต้องแทรก chain ในทันที',
    advice: 'เลือก Current Goal ที่มี leverage สูงสุด แล้วเล่น ACTION เพียงก้อนเดียว',
  });
  return items.slice(0, 6);
}

async function getBrief(sql) {
  const [
    accounts, activeBooks, activeHumans, posts24h, confirmations24h, systemErrors24h,
    firstClassRegistrations, firstClassPaid, firstClassGranted, firstClassReviews,
    openOps, blockedOps, staleOps, latestOps,
    liveOps7d, posts7d, confirmations7d, registrations7d, reviews7d,
    lastPostAt, lastAccountAt, lastRegistrationAt, lastReviewAt, lastOperationAt,
  ] = await Promise.all([
    count(sql, 'SELECT COUNT(*)::int AS n FROM mc_accounts'),
    count(sql, "SELECT COUNT(*)::int AS n FROM xty_parties WHERE state='ACTIVE'"),
    count(sql, "SELECT COUNT(DISTINCT user_id)::int AS n FROM xty_posts WHERE sent_at >= NOW() - INTERVAL '7 days' AND retracted=FALSE"),
    count(sql, "SELECT COUNT(*)::int AS n FROM xty_posts WHERE sent_at >= NOW() - INTERVAL '24 hours' AND retracted=FALSE"),
    count(sql, "SELECT COUNT(*)::int AS n FROM xty_confirmations WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    count(sql, "SELECT COUNT(*)::int AS n FROM xty_system_errors WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    count(sql, 'SELECT COUNT(*)::int AS n FROM first_class_registrations'),
    count(sql, "SELECT COUNT(*)::int AS n FROM first_class_registrations WHERE payment_status='paid'"),
    count(sql, "SELECT COUNT(*)::int AS n FROM first_class_registrations WHERE first_class_status='granted'"),
    count(sql, 'SELECT COUNT(*)::int AS n FROM first_class_reviews'),
    count(sql, "SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status NOT IN ('LIVE','ARCHIVED')"),
    count(sql, "SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status='BLOCKED'"),
    count(sql, "SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status NOT IN ('LIVE','ARCHIVED') AND updated_at < NOW() - INTERVAL '48 hours'"),
    sql.query(`SELECT id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at
      FROM mc_command_operations ORDER BY updated_at DESC LIMIT 40`),
    count(sql, "SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status='LIVE' AND updated_at >= NOW() - INTERVAL '7 days'"),
    count(sql, "SELECT COUNT(*)::int AS n FROM xty_posts WHERE sent_at >= NOW() - INTERVAL '7 days' AND retracted=FALSE"),
    count(sql, "SELECT COUNT(*)::int AS n FROM xty_confirmations WHERE created_at >= NOW() - INTERVAL '7 days'"),
    count(sql, "SELECT COUNT(*)::int AS n FROM first_class_registrations WHERE created_at >= NOW() - INTERVAL '7 days'"),
    count(sql, "SELECT COUNT(*)::int AS n FROM first_class_reviews WHERE created_at >= NOW() - INTERVAL '7 days'"),
    latest(sql, 'SELECT MAX(sent_at) AS at FROM xty_posts WHERE retracted=FALSE'),
    latest(sql, 'SELECT MAX(created_at) AS at FROM mc_accounts'),
    latest(sql, 'SELECT MAX(created_at) AS at FROM first_class_registrations'),
    latest(sql, 'SELECT MAX(created_at) AS at FROM first_class_reviews'),
    latest(sql, 'SELECT MAX(updated_at) AS at FROM mc_command_operations'),
  ]);

  const team = await teamBookSeries(sql);
  const learning = await learningSeries(sql, team.labels);
  const ops = await operationSeries(sql, team.labels);
  const alerts = attentionItems({ systemErrors24h, blockedOps, staleOps, posts24h, confirmations24h, firstClassRegistrations, firstClassGranted });
  const chartKey = systemErrors24h > 0 ? 'errors' : (posts24h >= 5 && confirmations24h / Math.max(1, posts24h) < 0.5 ? 'activity' : (firstClassRegistrations - firstClassGranted > 0 ? 'learning' : 'activity'));
  const now = new Date();

  const infrastructure = [
    { name: 'GitHub', state: 'connected', role: 'source code + history', url: 'https://github.com/TeemClover/Teem', lastCheckedAt: now, lastEvent: 'TeemClover/Teem is the source repository' },
    { name: 'Vercel', state: process.env.VERCEL ? 'runtime' : 'linked', role: 'production deploy + serverless functions', url: 'https://vercel.com/teemclover', lastCheckedAt: now, lastEvent: process.env.VERCEL ? 'running inside Vercel runtime' : 'dashboard link available' },
    { name: 'Neon Postgres', state: process.env.DATABASE_URL ? 'configured' : 'missing', role: 'central operational database', url: 'https://console.neon.tech/', lastCheckedAt: now, lastEvent: process.env.DATABASE_URL ? 'DATABASE_URL present' : 'DATABASE_URL missing' },
    { name: 'Groq', state: process.env.GROQ_API_KEY && process.env.XTY_PET_AI === 'on' ? 'configured' : 'missing', role: 'TeamBook PET / AI brain', url: 'https://console.groq.com/', lastCheckedAt: now, lastEvent: process.env.GROQ_API_KEY ? `PET AI ${process.env.XTY_PET_AI || 'unset'}` : 'GROQ_API_KEY missing' },
    { name: 'Vercel Blob', state: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? 'configured' : 'optional', role: 'image + capture storage', url: 'https://vercel.com/teemclover', lastCheckedAt: now, lastEvent: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? 'blob credentials present' : 'blob credentials not detected' },
    { name: 'Cloudflare', state: 'linked', role: 'DNS / Pages / edge tooling', url: 'https://dash.cloudflare.com/', lastCheckedAt: now, lastEvent: 'external console linked · health not probed from app runtime' },
    { name: 'Discord', state: process.env.DISCORD_CLIENT_ID || process.env.DISCORD_BOT_TOKEN ? 'configured' : 'partial', role: 'OAuth + community automation', url: 'https://discord.com/developers/applications', lastCheckedAt: now, lastEvent: process.env.DISCORD_BOT_TOKEN ? 'bot automation configured' : (process.env.DISCORD_CLIENT_ID ? 'OAuth configured' : 'no runtime credential detected') },
    { name: 'Resend', state: process.env.RESEND_API_KEY ? 'configured' : 'optional', role: 'transactional email', url: 'https://resend.com/emails', lastCheckedAt: now, lastEvent: process.env.RESEND_API_KEY ? 'email provider configured' : 'manual/optional mode' },
    { name: 'Meta CAPI', state: process.env.META_CAPI_ACCESS_TOKEN ? 'configured' : 'optional', role: 'conversion measurement', url: 'https://business.facebook.com/events_manager2', lastCheckedAt: now, lastEvent: process.env.META_CAPI_ACCESS_TOKEN ? 'CAPI token configured' : 'CAPI token not detected' },
  ];

  const buildings = [
    { icon: 'ID', name: 'Identity Hall', state: accounts > 0 ? 'online' : 'quiet', role: 'บัญชี สมาชิก และ identity กลาง', lastUpdatedAt: lastAccountAt, lastEvent: `${accounts} accounts`, recommendation: 'ใช้ account เดียวเป็น identity backbone ของเมืองใหม่ทั้งหมด' },
    { icon: 'TB', name: 'TeamBook District', state: systemErrors24h > 0 ? 'attention' : 'online', role: 'ประชากร สมุดกลุ่ม activity และ social loop', lastUpdatedAt: lastPostAt, lastEvent: `${activeHumans} active humans / 7d · ${posts24h} posts / 24h`, recommendation: systemErrors24h ? `มี ${systemErrors24h} errors ใน 24h · inspect ก่อนขยาย` : (posts24h >= 5 && confirmations24h / Math.max(1, posts24h) < 0.5 ? 'เพิ่มแรงจูงใจให้คนกด “เห็นแล้ว”' : 'รักษา return loop และดู population trend') },
    { icon: 'FC', name: 'First Class Academy', state: firstClassRegistrations > firstClassGranted ? 'attention' : 'online', role: 'ลงทะเบียน สิทธิ์เรียน payment และ student review', lastUpdatedAt: lastReviewAt || lastRegistrationAt, lastEvent: `${firstClassRegistrations} registered · ${firstClassGranted} granted · ${firstClassReviews} reviews`, recommendation: firstClassRegistrations > firstClassGranted ? 'เคลียร์ registration ที่ยังไม่ granted' : 'เก็บ review ให้กลายเป็น feedback loop ของหลักสูตร' },
    { icon: 'CC', name: 'Command Citadel', state: blockedOps > 0 ? 'attention' : 'online', role: 'Operation queue + TCG chain + Keen handoff', lastUpdatedAt: lastOperationAt, lastEvent: `${openOps} open · ${blockedOps} blocked`, recommendation: blockedOps ? 'resolve blocker หรือ DELETE task ที่ไม่ใช้แล้ว' : 'หนึ่ง Goal → หนึ่ง Next Action → ปิด chain ให้สั้น' },
    { icon: 'XI', name: 'Xircle Quarter', state: 'source', role: 'health / care experience + source canon', lastUpdatedAt: null, lastEvent: 'source lives in /xircle/ and /xircle/doc/source/', recommendation: 'เพิ่ม heartbeat/usage metric เมื่อ Xircle มี server signal กลาง' },
    { icon: 'ST', name: 'Stats Watchtower', state: systemErrors24h > 0 ? 'attention' : 'ready', role: 'TeamBook stats + admin observability', lastUpdatedAt: lastPostAt, lastEvent: `${systemErrors24h} system errors / 24h`, recommendation: systemErrors24h ? 'เปิด /xty/stat/admin/ เพื่อดู error และ recovery tools' : 'ใช้เป็นหอสังเกตการณ์ก่อน CONQUER ระบบใหม่' },
    { icon: 'KN', name: 'Keen Workshop', state: openOps > 0 ? 'active' : 'ready', role: 'โต๊ะผลิตที่รับ Operation packet เดียวกับ Command', lastUpdatedAt: lastOperationAt, lastEvent: openOps ? `${openOps} operations available` : 'queue ว่าง', recommendation: 'ACTION → PASS → GO AGAIN → CLOSE CHAIN; อย่าทำงานนอก packet โดยไม่มี source' },
    { icon: 'CP', name: 'Capture Vault', state: 'ready', role: 'memory ของ output ที่ผลิตจาก Operation', lastUpdatedAt: lastOperationAt, lastEvent: 'output references derive from Operation queue', recommendation: 'ทุก CLOSE CHAIN ควรมี output ที่คนถัดไปหาเจอ' },
  ];

  return {
    population: { accounts, teamBookActiveBooks: activeBooks, teamBookActiveHumans7d: activeHumans, teamBookPosts24h: posts24h, teamBookConfirmations24h: confirmations24h, teamBookSystemErrors24h: systemErrors24h },
    learning: { firstClassRegistrations, firstClassPaid, firstClassGranted, firstClassReviews },
    attention: { chartKey, items: alerts },
    charts: {
      activity: { short: 'Activity', title: 'TeamBook Activity · 7 วัน', reason: 'ดูว่าคนกำลัง “ทำ” และ “เห็นกัน” ในอัตราที่สมดุลหรือไม่', labels: team.labels, primary: team.posts, secondary: team.confirmations, primaryLabel: 'Posts', secondaryLabel: 'เห็นแล้ว' },
      errors: { short: 'Errors', title: 'System Errors · 7 วัน', reason: 'ถ้าเส้นนี้สูงขึ้น งานใหม่ควรถูก PASS เพื่อแก้ reliability ก่อน', labels: team.labels, primary: team.errors, secondary: [], primaryLabel: 'Errors', secondaryLabel: '' },
      learning: { short: 'Learning', title: 'First Class Flow · 7 วัน', reason: 'ดูการไหลจากคนเข้าเรียนไปสู่ feedback ที่ย้อนกลับมาพัฒนาคลาส', labels: team.labels, primary: learning.registrations, secondary: learning.reviews, primaryLabel: 'Registrations', secondaryLabel: 'Reviews' },
      operations: { short: 'Chains', title: 'Command Chains · 7 วัน', reason: 'วัดว่าเราออกคำสั่งเยอะแค่ไหน เทียบกับ chain ที่ปิดได้จริง', labels: team.labels, primary: ops.created, secondary: ops.closed, primaryLabel: 'Created', secondaryLabel: 'Closed' },
    },
    achievements: [
      { icon: '⚔️', title: 'Chains Closed', value: liveOps7d, detail: 'Operation ที่ปิดเป็น LIVE ใน 7 วัน' },
      { icon: '📖', title: 'Stories Written', value: posts7d, detail: 'TeamBook posts ใน 7 วัน' },
      { icon: '👁️', title: 'People Seen', value: confirmations7d, detail: 'การกด “เห็นแล้ว” ใน 7 วัน' },
      { icon: '🏅', title: 'New Learners', value: registrations7d, detail: 'First Class registrations ใน 7 วัน' },
      { icon: '💬', title: 'Feedback Loot', value: reviews7d, detail: 'student reviews ที่กลับเข้าระบบใน 7 วัน' },
    ],
    infrastructure,
    buildings,
    operations: { open: openOps, blocked: blockedOps, stale: staleOps, recent: latestOps.map(operationPacket) },
  };
}

export default async function handler(req, res) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  if (!['GET', 'POST'].includes(req.method)) return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  let sql;
  try {
    sql = database();
    await ensureSchema(sql);
    await ensureBackofficeSchema(sql);
    await ensureCommandSchema(sql);
  } catch (error) {
    console.error('Command database init failed', error);
    return sendJson(res, { ok: false, error: error?.code || 'COMMAND_STORAGE_UNAVAILABLE' }, 503);
  }

  const adminSession = await currentBackofficeSession(sql, req);
  if (!adminSession) return sendJson(res, { ok: false, error: 'BACKOFFICE_AUTH_REQUIRED' }, 401);

  if (req.method === 'GET') {
    try {
      return sendJson(res, { ok: true, ...(await getBrief(sql)) });
    } catch (error) {
      console.error('Command brief failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_BRIEF_FAILED' }, 500);
    }
  }

  const body = bodyOf(req);
  const action = clean(body.action, 24) || 'create';

  if (action === 'create') {
    const selectedMode = clean(body.mode, 16).toUpperCase();
    const project = clean(body.project, 120);
    const goal = clean(body.goal, 1200);
    const nextAction = clean(body.nextAction, 600);
    const owner = clean(body.owner, 120);
    const source = clean(body.source, 500);
    const output = clean(body.output, 600);
    const successCheck = clean(body.successCheck, 600);
    const guardrails = clean(body.guardrails, 1200);
    if (!MODES.has(selectedMode)) return sendJson(res, { ok: false, error: 'BAD_MODE' }, 400);
    if (!project || !goal) return sendJson(res, { ok: false, error: 'PROJECT_AND_GOAL_REQUIRED' }, 400);
    const now = new Date();
    const id = `OP-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      const rows = await sql.query(`INSERT INTO mc_command_operations
        (id,user_id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at)
        VALUES ($1,'BACKOFFICE',$2,$3,$4,$5,$6,$7,$8,$9,$10,'QUEUED','ACTION',$11,$11,$11)
        RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at`,
        [id, selectedMode, project, goal, nextAction, owner, source, output, successCheck, guardrails, now]);
      await recordBackofficeAudit(sql, req, 'OPERATION_CREATE', { id, mode: selectedMode, project });
      return sendJson(res, { ok: true, operation: operationPacket(rows[0]) }, 201);
    } catch (error) {
      console.error('Command operation create failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_CREATE_FAILED' }, 500);
    }
  }

  if (action === 'flow') {
    const id = clean(body.id, 80);
    const flow = clean(body.flow, 24).toUpperCase();
    const status = FLOWS[flow];
    if (!id || !status) return sendJson(res, { ok: false, error: 'BAD_FLOW_UPDATE' }, 400);
    try {
      const now = new Date();
      const rows = await sql.query(`UPDATE mc_command_operations SET status=$1,chain_state=$2,chain_updated_at=$3,updated_at=$3
        WHERE id=$4 RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at`,
        [status, flow, now, id]);
      if (!rows[0]) return sendJson(res, { ok: false, error: 'OPERATION_NOT_FOUND' }, 404);
      await recordBackofficeAudit(sql, req, 'OPERATION_FLOW', { id, flow, status });
      return sendJson(res, { ok: true, operation: operationPacket(rows[0]) });
    } catch (error) {
      console.error('Command flow update failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_FLOW_FAILED' }, 500);
    }
  }

  if (action === 'delete') {
    const id = clean(body.id, 80);
    if (!id) return sendJson(res, { ok: false, error: 'OPERATION_ID_REQUIRED' }, 400);
    try {
      const rows = await sql.query(`DELETE FROM mc_command_operations WHERE id=$1
        RETURNING id,mode,project,goal,status,chain_state,created_at,updated_at`, [id]);
      if (!rows[0]) return sendJson(res, { ok: false, error: 'OPERATION_NOT_FOUND' }, 404);
      await recordBackofficeAudit(sql, req, 'OPERATION_DELETE', rows[0]);
      return sendJson(res, { ok: true, deleted: rows[0] });
    } catch (error) {
      console.error('Command delete failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_DELETE_FAILED' }, 500);
    }
  }

  if (action === 'status') {
    const id = clean(body.id, 80);
    const status = clean(body.status, 24).toUpperCase();
    if (!id || !STATUSES.has(status)) return sendJson(res, { ok: false, error: 'BAD_STATUS_UPDATE' }, 400);
    const chainState = status === 'LIVE' ? 'CLOSE_CHAIN' : status === 'REVIEW' ? 'PASS' : status === 'BLOCKED' ? 'BLOCK' : 'ACTION';
    try {
      const now = new Date();
      const rows = await sql.query(`UPDATE mc_command_operations SET status=$1,chain_state=$2,chain_updated_at=$3,updated_at=$3
        WHERE id=$4 RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at`,
        [status, chainState, now, id]);
      if (!rows[0]) return sendJson(res, { ok: false, error: 'OPERATION_NOT_FOUND' }, 404);
      return sendJson(res, { ok: true, operation: operationPacket(rows[0]) });
    } catch (error) {
      console.error('Command status failed', error);
      return sendJson(res, { ok: false, error: 'COMMAND_STATUS_FAILED' }, 500);
    }
  }

  return sendJson(res, { ok: false, error: 'UNKNOWN_ACTION' }, 400);
}
