import { database, sendJson } from './_lib/core.js';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const AI_OPTIONS = new Set(['ChatGPT', 'Claude', 'Gemini', 'NotebookLM', 'อื่น ๆ', 'ยังไม่ค่อยได้ใช้ AI']);

function clean(value, max = 120) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
}
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 120; }
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return origin === `${proto}://${host}`;
}
function equal(a, b) {
  const aa = Buffer.from(String(a || '')), bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function authorized(req) {
  const wanted = process.env.FIRST_CLASS_ADMIN_KEY;
  return Boolean(wanted && equal(req.headers['x-admin-key'], wanted));
}
async function ensureFirstClassSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS first_class_registrations (
    id BIGSERIAL PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    course_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    ai_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    transfer_time TIME NOT NULL,
    line_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'submitted',
    first_class_status TEXT NOT NULL DEFAULT 'pending',
    attended BOOLEAN NOT NULL DEFAULT FALSE,
    payment_note TEXT,
    paid_at TIMESTAMPTZ,
    first_class_granted_at TIMESTAMPTZ,
    confirmation_email_status TEXT NOT NULL DEFAULT 'pending',
    discord_role_status TEXT NOT NULL DEFAULT 'pending',
    consent_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`);
  await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_first_class_course_email ON first_class_registrations(course_id, email)');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_first_class_status_created ON first_class_registrations(payment_status, created_at DESC)');
}
function reference() { return `FC-${randomUUID().slice(0, 8).toUpperCase()}`; }
function emailDraft(row) {
  const subject = '🏅 First Class Unlocked — AI ใส่ซอส';
  const body = `สวัสดีครับ ${row.display_name}\n\nยืนยันยอด 98 บาทเรียบร้อยแล้ว — คุณได้รับ TITLE “🏅 First Class” สำหรับคอร์ส AI ใส่ซอส 🍀\n\nDiscord: https://discord.gg/A5nmMqvTm\nคอร์สฟรีสำหรับเตรียมตัว: https://www.myclover.com/classroom/\n\nวันอังคารที่ 18 สิงหาคม 2026\n19:00 น. ห้องเปิด เข้ามาทักทาย ทดลองเสียง และเตรียมตัว\n19:30 น. เริ่มเรียนตรงเวลา\n\nคอร์สนี้สอนสดและไม่มีวิดีโอย้อนหลัง แนะนำให้เข้า Server รอไว้ก่อนวันเรียนครับ\n\nแล้วเจอกัน\nTeem`;
  return { subject, body, mailto: `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

async function grantDiscordRole(row) {
  const { DISCORD_BOT_TOKEN: token, DISCORD_GUILD_ID: guildId, DISCORD_FIRST_CLASS_ROLE_ID: roleId } = process.env;
  if (!token || !guildId || !roleId) return { status: 'ready', detail: 'manual' };
  const headers = { authorization: `Bot ${token}`, 'content-type': 'application/json' };
  const search = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(row.discord_username)}&limit=20`, { headers });
  if (!search.ok) return { status: 'failed', detail: `search_${search.status}` };
  const members = await search.json();
  const wanted = row.discord_username.toLowerCase().replace(/^@/, '');
  const member = members.find(item => [item.user?.username, item.user?.global_name].filter(Boolean).some(value => value.toLowerCase() === wanted));
  if (!member?.user?.id) return { status: 'needs_match', detail: 'username_not_found' };
  const grant = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${member.user.id}/roles/${roleId}`, { method: 'PUT', headers });
  return grant.ok ? { status: 'granted', detail: member.user.id } : { status: 'failed', detail: `grant_${grant.status}` };
}

async function sendConfirmationEmail(row) {
  const { RESEND_API_KEY: key, FIRST_CLASS_FROM_EMAIL: from } = process.env;
  if (!key || !from) return 'ready';
  const draft = emailDraft(row);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [row.email], subject: draft.subject, text: draft.body }),
  });
  return response.ok ? 'sent' : 'failed';
}

async function unlockFirstClass(sql, id) {
  const now = new Date();
  const rows = await sql.query("SELECT * FROM first_class_registrations WHERE id=$1", [id]);
  const row = rows[0];
  if (!row) return null;
  const [discord, emailStatus] = await Promise.all([grantDiscordRole(row), sendConfirmationEmail(row)]);
  await sql.query(`UPDATE first_class_registrations SET payment_status='paid',first_class_status='granted',paid_at=COALESCE(paid_at,$1),
    first_class_granted_at=COALESCE(first_class_granted_at,$1),confirmation_email_status=$2,discord_role_status=$3,updated_at=$1 WHERE id=$4`,
    [now, emailStatus, discord.status, id]);
  return { discord, emailStatus };
}

export default async function handler(req, res) {
  try {
    const sql = database();
    await ensureFirstClassSchema(sql);

    if (req.method === 'POST') {
      const data = req.body || {};
      if (data.action === 'verify_payment') {
        if (!process.env.FIRST_CLASS_VERIFIER_KEY || !equal(req.headers['x-verifier-key'], process.env.FIRST_CLASS_VERIFIER_KEY)) return sendJson(res, { ok: false, message: 'ไม่มีสิทธิ์ตรวจยอด' }, 401);
        const ref = clean(data.reference, 20);
        if (Number(data.amount) !== 98 || Number(data.confidence) < 0.9 || !ref) return sendJson(res, { ok: false, message: 'ยอดหรือความมั่นใจไม่ผ่านเกณฑ์' }, 422);
        const rows = await sql.query('SELECT id FROM first_class_registrations WHERE reference=$1', [ref]);
        if (!rows[0]) return sendJson(res, { ok: false, message: 'ไม่พบเลขอ้างอิง' }, 404);
        const automation = await unlockFirstClass(sql, Number(rows[0].id));
        return sendJson(res, { ok: true, automation });
      }
      if (!sameOrigin(req)) return sendJson(res, { ok: false, message: 'คำขอไม่ถูกต้อง' }, 403);
      if (clean(data.website, 200)) return sendJson(res, { ok: true, reference: null });
      const name = clean(data.name, 80);
      const email = clean(data.email, 120).toLowerCase();
      const discord = clean(data.discordUsername, 80);
      const transferTime = clean(data.transferTime, 5);
      const lineId = clean(data.lineId, 50);
      const aiTools = Array.isArray(data.aiTools) ? [...new Set(data.aiTools.map(value => clean(value, 40)).filter(value => AI_OPTIONS.has(value)))].slice(0, 6) : [];
      if (!name) return sendJson(res, { ok: false, field: 'name', message: 'ยังไม่ได้ใส่ชื่อที่อยากให้เรียก' }, 400);
      if (!validEmail(email)) return sendJson(res, { ok: false, field: 'email', message: 'อีเมลไม่ถูกรูปแบบ' }, 400);
      if (!discord) return sendJson(res, { ok: false, field: 'discordUsername', message: 'ยังไม่ได้ใส่ Discord Username' }, 400);
      if (!aiTools.length) return sendJson(res, { ok: false, field: 'aiTools', message: 'เลือก AI ที่ใช้อยู่ อย่างน้อย 1 ข้อ' }, 400);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(transferTime)) return sendJson(res, { ok: false, field: 'transferTime', message: 'เวลาโอนไม่ถูกรูปแบบ' }, 400);
      if (data.consent !== true) return sendJson(res, { ok: false, field: 'consent', message: 'ต้องยอมรับเงื่อนไขก่อนลงทะเบียน' }, 400);
      const now = new Date();
      const ref = reference();
      const rows = await sql.query(`INSERT INTO first_class_registrations
        (reference,course_id,display_name,email,discord_username,ai_tools,transfer_time,line_id,consent_version,created_at,updated_at)
        VALUES ($1,'ai-sauce-pilot-2026-08-18',$2,$3,$4,$5::jsonb,$6,$7,'2026-08-first-class-v2',$8,$8)
        ON CONFLICT(course_id,email) DO UPDATE SET display_name=EXCLUDED.display_name,
          discord_username=EXCLUDED.discord_username,ai_tools=EXCLUDED.ai_tools,transfer_time=EXCLUDED.transfer_time,
          line_id=EXCLUDED.line_id,updated_at=EXCLUDED.updated_at
        RETURNING reference`, [ref, name, email, discord, JSON.stringify(aiTools), transferTime, lineId || null, now]);
      return sendJson(res, { ok: true, reference: rows[0].reference }, 201);
    }

    if (!authorized(req)) return sendJson(res, { ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, 401);
    if (req.method === 'GET') {
      const rows = await sql.query('SELECT * FROM first_class_registrations ORDER BY created_at DESC LIMIT 500');
      return sendJson(res, { ok: true, registrations: rows.map(row => ({ ...row, emailDraft: emailDraft(row) })) });
    }
    if (req.method === 'PATCH') {
      const id = Number(req.body?.id);
      const action = clean(req.body?.action, 30);
      const note = clean(req.body?.note, 500);
      if (!Number.isInteger(id) || !['confirm_payment', 'request_proof', 'grant_role', 'mark_attended', 'email_sent'].includes(action)) return sendJson(res, { ok: false, message: 'คำสั่งไม่ถูกต้อง' }, 400);
      const now = new Date();
      let automation;
      if (action === 'confirm_payment') automation = await unlockFirstClass(sql, id);
      if (action === 'request_proof') await sql.query(`UPDATE first_class_registrations SET payment_status='proof_requested',payment_note=$1,updated_at=$2 WHERE id=$3`, [note || 'ขอหลักฐานการโอน', now, id]);
      if (action === 'grant_role') await sql.query(`UPDATE first_class_registrations SET first_class_status='granted',discord_role_status='granted',first_class_granted_at=COALESCE(first_class_granted_at,$1),updated_at=$1 WHERE id=$2`, [now, id]);
      if (action === 'mark_attended') await sql.query(`UPDATE first_class_registrations SET attended=TRUE,updated_at=$1 WHERE id=$2`, [now, id]);
      if (action === 'email_sent') await sql.query(`UPDATE first_class_registrations SET confirmation_email_status='sent',updated_at=$1 WHERE id=$2`, [now, id]);
      return sendJson(res, { ok: true, automation });
    }
    return sendJson(res, { ok: false, message: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('First Class API failed', error);
    const duplicateDiscord = String(error).toLowerCase().includes('discord_username');
    return sendJson(res, { ok: false, field: duplicateDiscord ? 'discordUsername' : undefined, message: duplicateDiscord ? 'Discord Username นี้มีผู้ลงทะเบียนแล้ว' : 'ระบบบันทึกข้อมูลสะดุด ลองใหม่อีกครั้งครับ' }, 500);
  }
}
