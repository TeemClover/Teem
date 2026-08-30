/* Meet Teem & Ako — booking intake and control room API.
   POST  (public) create a booking, then notify. The row is committed before any
         push is attempted, so a notification outage never loses a lead.
   GET   (admin)  list the queue.
   PATCH (admin)  move a booking through contacted → scheduled → done, record the
         agreed time, and retry a notification that never landed. */

import { database, sendJson } from './_lib/core.js';
import { notifyBooking, deliveryStatus, bookingFromRow } from './_lib/meet-notify.js';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const INTENTS = new Set(['health', 'opportunity', 'curious']);
const MODES = new Set(['ออนไลน์', 'เจอกันจริง', 'เจอกัน + Body Check-in', 'Coffee / Buffet']);
const LEGACY_DAYS = new Set(['วันนี้', 'พรุ่งนี้', 'สุดสัปดาห์', 'สัปดาห์หน้า']);
const LEGACY_TIMES = new Set(['เช้า', 'บ่าย', 'เย็น', 'ค่ำ']);
const STATUSES = ['new', 'contacted', 'scheduled', 'done', 'dropped'];

function clean(value, max = 200) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
}
function requestIp(req) {
  return clean(String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0], 100);
}
function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || origin === requestOrigin(req);
}
function equal(a, b) {
  const aa = Buffer.from(String(a || '')), bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function authorized(req) {
  const wanted = process.env.MEET_ADMIN_KEY || '';
  if (!wanted) return { ok: false, unconfigured: true };
  return { ok: equal(req.headers['x-admin-key'], wanted) };
}
function reference() {
  return `MEET-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}
function validRequestedDay(value) {
  if (LEGACY_DAYS.has(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00+07:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validRequestedTime(value) {
  if (LEGACY_TIMES.has(value)) return true;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export async function ensureMeetSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_meet_bookings (
    id BIGSERIAL PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    intent TEXT NOT NULL,
    meet_mode TEXT NOT NULL,
    pref_day TEXT NOT NULL,
    pref_time TEXT NOT NULL,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    scheduled_at TIMESTAMPTZ,
    owner_note TEXT,
    notify_status TEXT NOT NULL DEFAULT 'pending',
    notify_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    notified_at TIMESTAMPTZ,
    client_user_agent TEXT,
    client_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`);
  await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_meet_bookings_status ON mc_meet_bookings(status, created_at DESC)');
}

/* Rate limit per IP so a scripted flood cannot bury the real leads or burn the
   push quota. Reuses the bookings table itself — no extra state to maintain. */
async function tooManyRecent(sql, ip) {
  if (!ip) return false;
  const rows = await sql.query(
    `SELECT COUNT(*)::int AS hits FROM mc_meet_bookings
     WHERE client_ip = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [ip],
  );
  return Number(rows[0]?.hits || 0) >= 5;
}

async function deliver(sql, booking, adminUrl) {
  const result = await notifyBooking(booking, adminUrl);
  const status = deliveryStatus(result);
  await sql.query(
    `UPDATE mc_meet_bookings SET notify_status=$1, notify_detail=$2::jsonb,
     notified_at=CASE WHEN $1='delivered' THEN $3 ELSE notified_at END, updated_at=$3
     WHERE reference=$4`,
    [status, JSON.stringify(result), new Date(), booking.reference],
  );
  return { status, channels: result };
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  try {
    const sql = database();
    await ensureMeetSchema(sql);

    if (req.method === 'POST') {
      const data = req.body && typeof req.body === 'object' ? req.body : {};
      if (!sameOrigin(req)) return sendJson(res, { ok: false, message: 'คำขอไม่ถูกต้อง' }, 403);
      if (clean(data.website, 200)) return sendJson(res, { ok: true, reference: null }); // honeypot

      const intent = clean(data.intent, 20);
      const mode = clean(data.mode, 40);
      const day = clean(data.day, 20);
      const time = clean(data.time, 20);
      const name = clean(data.name, 80);
      const contact = clean(data.contact, 120);
      const note = clean(data.note, 1000);

      if (!INTENTS.has(intent)) return sendJson(res, { ok: false, field: 'intent', message: 'ยังไม่ได้เลือกเรื่องที่อยากคุย' }, 400);
      if (!MODES.has(mode)) return sendJson(res, { ok: false, field: 'mode', message: 'ยังไม่ได้เลือกรูปแบบการเจอ' }, 400);
      if (!validRequestedDay(day) || !validRequestedTime(time)) return sendJson(res, { ok: false, field: 'day', message: 'วันหรือเวลาที่ขอไม่ถูกต้อง' }, 400);
      if (!name) return sendJson(res, { ok: false, field: 'name', message: 'ยังไม่ได้ใส่ชื่อที่อยากให้เรียก' }, 400);
      if (!contact) return sendJson(res, { ok: false, field: 'contact', message: 'ยังไม่ได้ใส่ LINE หรือเบอร์ที่ติดต่อได้' }, 400);

      const ip = requestIp(req);
      if (await tooManyRecent(sql, ip)) return sendJson(res, { ok: false, message: 'ลงนัดถี่เกินไป ลองใหม่อีกครั้งในภายหลัง' }, 429);

      const now = new Date();
      const rows = await sql.query(
        `INSERT INTO mc_meet_bookings
         (reference,intent,meet_mode,pref_day,pref_time,name,contact,note,client_user_agent,client_ip,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING reference`,
        [reference(), intent, mode, day, time, name, contact, note || null,
          clean(req.headers['user-agent'], 500) || null, ip || null, now],
      );
      const booking = { reference: rows[0].reference, intent, mode, day, time, name, contact, note };
      const origin = requestOrigin(req);
      // Booking is safe in the DB now; a failed push only downgrades notify_status.
      const notify = await deliver(sql, booking, origin ? `${origin}/meet/admin/` : '');
      return sendJson(res, { ok: true, reference: booking.reference, notified: notify.status === 'delivered' }, 201);
    }

    const access = authorized(req);
    if (!access.ok) {
      if (access.unconfigured) return sendJson(res, { ok: false, message: 'ยังไม่ได้ตั้ง MEET_ADMIN_KEY' }, 503);
      return sendJson(res, { ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, 401);
    }

    if (req.method === 'GET') {
      const rows = await sql.query('SELECT * FROM mc_meet_bookings ORDER BY created_at DESC LIMIT 500');
      return sendJson(res, {
        ok: true,
        channels: {
          line: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_NOTIFY_USER_ID),
          telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
        },
        bookings: rows,
      });
    }

    if (req.method === 'PATCH') {
      const id = Number(req.body?.id);
      const action = clean(req.body?.action, 30);
      if (!Number.isInteger(id) || id <= 0) return sendJson(res, { ok: false, message: 'ไม่พบรายการ' }, 400);
      const now = new Date();

      if (action === 'set_status') {
        const status = clean(req.body?.status, 20);
        if (!STATUSES.includes(status)) return sendJson(res, { ok: false, message: 'สถานะไม่ถูกต้อง' }, 400);
        await sql.query('UPDATE mc_meet_bookings SET status=$1, updated_at=$2 WHERE id=$3', [status, now, id]);
        return sendJson(res, { ok: true });
      }
      if (action === 'set_schedule') {
        const raw = clean(req.body?.scheduledAt, 40);
        const when = raw ? new Date(raw) : null;
        if (raw && Number.isNaN(when.getTime())) return sendJson(res, { ok: false, message: 'เวลานัดไม่ถูกรูปแบบ' }, 400);
        await sql.query(
          `UPDATE mc_meet_bookings SET scheduled_at=$1,
           status=CASE WHEN $1 IS NULL THEN status ELSE 'scheduled' END, updated_at=$2 WHERE id=$3`,
          [when, now, id],
        );
        return sendJson(res, { ok: true });
      }
      if (action === 'set_note') {
        await sql.query('UPDATE mc_meet_bookings SET owner_note=$1, updated_at=$2 WHERE id=$3',
          [clean(req.body?.note, 1000) || null, now, id]);
        return sendJson(res, { ok: true });
      }
      if (action === 'retry_notify') {
        const row = (await sql.query('SELECT * FROM mc_meet_bookings WHERE id=$1', [id]))[0];
        if (!row) return sendJson(res, { ok: false, message: 'ไม่พบรายการ' }, 404);
        const origin = requestOrigin(req);
        const notify = await deliver(sql, bookingFromRow(row), origin ? `${origin}/meet/admin/` : '');
        return sendJson(res, { ok: true, notify });
      }
      return sendJson(res, { ok: false, message: 'คำสั่งไม่ถูกต้อง' }, 400);
    }

    return sendJson(res, { ok: false, message: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('Meet booking API failed', error);
    const code = error.code === 'DATABASE_URL_NOT_CONFIGURED' ? 503 : 500;
    return sendJson(res, { ok: false, message: 'ระบบบันทึกข้อมูลสะดุด ลองใหม่อีกครั้งครับ' }, code);
  }
}
