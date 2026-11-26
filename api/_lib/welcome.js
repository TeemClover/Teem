// /api/welcome · เก็บคำตอบระหว่างทาง ฉากที่คนดูไปถึง และช่องทางติดต่อของคนที่สนใจเป็น X-PLORER
// POST {kind:'answer'|'scene'|'lead', ...} จากหน้า /welcome/ · GET สรุปผล ต้องมี header x-admin-key = MEET_ADMIN_KEY
import { createHash, randomUUID } from 'node:crypto';
import { QUESTIONS, SCENES, CONSENT_VERSION, cleanAnswer, cleanContact } from '../../welcome/questions.js';
import { adminAccess } from './ai-source-domain.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY = 6000;
const clean = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
const cleanRef = v => clean(v, 64).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
const digest = v => createHash('sha256').update(v).digest('hex');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS mc_welcome_events (
    id UUID PRIMARY KEY,
    visitor_id UUID NOT NULL,
    kind TEXT NOT NULL,
    step TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '[]'::jsonb,
    ref TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  'CREATE INDEX IF NOT EXISTS mc_welcome_events_step ON mc_welcome_events(kind, step, created_at)',
  `CREATE TABLE IF NOT EXISTS mc_welcome_leads (
    request_id UUID PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    visitor_id UUID NOT NULL,
    name TEXT NOT NULL,
    contact_kind TEXT NOT NULL,
    contact TEXT NOT NULL,
    ref TEXT NOT NULL DEFAULT '',
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    consent_version TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
];

/* ตรวจข้อมูลที่ส่งมา คืน {value} หรือ {error} */
export function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'ข้อมูลไม่ถูกต้อง' };
  if (!UUID.test(body.visitor || '')) return { error: 'กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง' };
  const base = { visitor: body.visitor, ref: cleanRef(body.ref), device: ['mobile', 'tablet', 'desktop'].includes(body.device) ? body.device : '' };
  if (body.kind === 'scene') {
    if (!SCENES.includes(body.step)) return { error: 'ฉากไม่ถูกต้อง' };
    return { value: { ...base, kind: 'scene', id: randomUUID(), step: body.step, answer: [] } };
  }
  if (body.kind === 'answer') {
    if (!UUID.test(body.id || '')) return { error: 'ข้อมูลไม่ถูกต้อง' };
    const answer = cleanAnswer(body.step, body.value);
    if (!answer) return { error: 'คำตอบไม่ตรงกับคำถาม' };
    return { value: { ...base, kind: 'answer', id: body.id, step: body.step, answer } };
  }
  if (body.kind === 'lead') {
    if (clean(body.website, 50)) return { error: 'ยังส่งไม่ได้ ลองอีกครั้งนะ' };
    if (!UUID.test(body.requestId || '')) return { error: 'กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง' };
    const name = clean(body.name, 200);
    if (!name || name.length > 60) return { error: 'กรอกชื่อที่ให้ทีมเรียกคุณ ไม่เกิน 60 ตัวอักษร' };
    const contact = cleanContact(body.contact);
    if (!contact) return { error: 'กรอกเบอร์มือถือ 10 หลัก หรือ LINE ID' };
    if (body.consent !== true) return { error: 'กรุณากดยินยอมให้ทีมติดต่อกลับก่อนส่ง' };
    const answers = {};
    for (const q of QUESTIONS) {
      const a = body.answers && cleanAnswer(q.id, body.answers[q.id]);
      if (a) answers[q.id] = a;
    }
    return { value: { ...base, kind: 'lead', requestId: body.requestId, name, contact, answers } };
  }
  return { error: 'ข้อมูลไม่ถูกต้อง' };
}

export function createSqlStore(sql) {
  let ready;
  const schema = () => (ready ||= (async () => { for (const q of SCHEMA) await sql.query(q); })().catch(e => { ready = undefined; throw e; }));
  return {
    async event(v) {
      await schema();
      // คำตอบเดิมของคนเดิม (id เดิม) ส่งซ้ำได้ ไม่นับซ้ำ · คนเดียวกันไม่เกิน 200 เหตุการณ์ต่อวัน
      const rows = await sql.query(`INSERT INTO mc_welcome_events (id,visitor_id,kind,step,value,ref,device)
        SELECT $1,$2,$3,$4,$5::jsonb,$6,$7
        WHERE (SELECT COUNT(*) FROM mc_welcome_events WHERE visitor_id=$2 AND created_at>NOW()-INTERVAL '1 day')<200
        ON CONFLICT (id) DO UPDATE SET value=EXCLUDED.value
        RETURNING id`, [v.id, v.visitor, v.kind, v.step, JSON.stringify(v.answer), v.ref, v.device]);
      return { saved: rows.length > 0 };
    },
    async lead(v) {
      await schema();
      const results = await sql.transaction(tx => [
        tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [v.ipHash]),
        tx.query(`INSERT INTO mc_welcome_leads (request_id,reference,visitor_id,name,contact_kind,contact,ref,answers,consent_version,ip_hash)
          SELECT $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10
          WHERE (SELECT COUNT(*) FROM mc_welcome_leads WHERE ip_hash=$10 AND created_at>NOW()-INTERVAL '1 hour')<20
          ON CONFLICT (request_id) DO NOTHING
          RETURNING reference`, [v.requestId, v.reference, v.visitor, v.name, v.contact.kind, v.contact.value, v.ref, JSON.stringify(v.answers), CONSENT_VERSION, v.ipHash]),
        tx.query('SELECT reference FROM mc_welcome_leads WHERE request_id=$1', [v.requestId])
      ]);
      const existing = results[2][0];
      if (!existing) return { limited: true };
      return { reference: existing.reference };
    },
    async summary() {
      await schema();
      const answers = await sql.query(`SELECT step, a.v AS option, COUNT(DISTINCT visitor_id)::int AS people
        FROM mc_welcome_events, jsonb_array_elements_text(value) AS a(v)
        WHERE kind='answer' AND created_at>NOW()-INTERVAL '90 days' GROUP BY step, a.v`);
      const scenes = await sql.query(`SELECT step, COUNT(DISTINCT visitor_id)::int AS people FROM mc_welcome_events
        WHERE kind='scene' AND created_at>NOW()-INTERVAL '90 days' GROUP BY step`);
      const leads = await sql.query(`SELECT reference,name,contact_kind,contact,ref,answers,created_at FROM mc_welcome_leads
        ORDER BY created_at DESC LIMIT 300`);
      return { answers, scenes, leads };
    }
  };
}

export function createWelcomeHandler({ getStore, salt = 'local-preview', env = process.env }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (code, body) => { res.statusCode = code; res.end(JSON.stringify(body)); };
    try {
      if (req.method === 'GET') {
        if (!adminAccess(req, env)) return send(401, { ok: false });
        const store = await getStore();
        return send(200, { ok: true, questions: QUESTIONS, scenes: SCENES, ...(await store.summary()) });
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(405, { ok: false }); }
      const host = String(req.headers.host || '');
      if (req.headers.origin) {
        try { if (new URL(req.headers.origin).host !== host) return send(403, { ok: false, message: 'กรุณาส่งจากหน้า /welcome' }); }
        catch { return send(403, { ok: false }); }
      }
      if (!/^application\/json/i.test(String(req.headers['content-type'] || ''))) return send(415, { ok: false });
      let body = req.body;
      if (body == null) {
        let size = 0; const chunks = [];
        for await (const c of req) { size += Buffer.byteLength(c); if (size > MAX_BODY) return send(413, { ok: false }); chunks.push(Buffer.from(c)); }
        body = Buffer.concat(chunks).toString();
      }
      if (Buffer.isBuffer(body)) body = body.toString();
      if (typeof body === 'string') {
        if (Buffer.byteLength(body) > MAX_BODY) return send(413, { ok: false });
        try { body = JSON.parse(body); } catch { return send(400, { ok: false, message: 'ข้อมูลไม่ถูกต้อง' }); }
      }
      if (Buffer.byteLength(JSON.stringify(body || {})) > MAX_BODY) return send(413, { ok: false });
      const checked = validate(body);
      if (checked.error) return send(400, { ok: false, message: checked.error });
      const v = checked.value;
      // ฉากที่ไปถึงเป็นแค่สถิติ เคารพคนที่ปิดการติดตาม · คำตอบและช่องทางติดต่อคือสิ่งที่เขากดส่งเอง
      if (v.kind === 'scene' && (req.headers.dnt === '1' || req.headers['sec-gpc'] === '1')) return send(200, { ok: true });
      const store = await getStore();
      if (v.kind !== 'lead') { await store.event(v); return send(200, { ok: true }); }
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const result = await store.lead({ ...v, ipHash: digest(salt + ':' + ip), reference: 'XP-' + randomUUID().slice(0, 6).toUpperCase() });
      if (result.limited) { res.setHeader('Retry-After', '3600'); return send(429, { ok: false, message: 'ส่งหลายครั้งเกินไป รอสักครู่แล้วลองใหม่' }); }
      return send(201, { ok: true, reference: result.reference });
    } catch {
      // ไม่บอกว่าบันทึกแล้ว จนกว่าจะเขียนลงฐานข้อมูลสำเร็จจริง
      return send(503, { ok: false, message: 'ระบบยังบันทึกไม่ได้ตอนนี้ ข้อมูลยังไม่ถูกส่ง ลองใหม่อีกครั้งนะ' });
    }
  };
}
