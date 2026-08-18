import { database, sendJson } from './core.js';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const COURSE_ID = 'ai-sauce-pilot-2026-08-18';
const TAKEAWAYS = new Set([
  'ซอสแม่ .md',
  'วิธีสกัดซอสลูก',
  'New Session Test',
  'Output คือช้อนชิม',
  'Prompt คือเครื่องปรุง',
  'ส่งต่อ AI และทีม',
]);
const CONSENT = new Set(['named', 'anonymous', 'private']);
const AI_BEFORE = new Set(['เพิ่งเริ่ม', 'ใช้บ้าง', 'ใช้ประจำ', 'ใช้จริงจัง']);

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
  const wanted = process.env.FIRST_CLASS_ADMIN_KEY || 'calling';
  return Boolean(wanted && equal(req.headers['x-admin-key'], wanted));
}
function ref() { return `AT-${randomUUID().slice(0, 8).toUpperCase()}`; }

async function ensureSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS first_class_reviews (
    id BIGSERIAL PRIMARY KEY,
    review_reference TEXT UNIQUE NOT NULL,
    course_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role_company TEXT,
    ai_before TEXT NOT NULL,
    understanding INTEGER NOT NULL,
    takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
    aha TEXT NOT NULL,
    first_use TEXT NOT NULL,
    recommend_text TEXT NOT NULL,
    score INTEGER NOT NULL,
    improve TEXT,
    extra TEXT,
    consent_mode TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`);
  await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_first_class_reviews_course_email ON first_class_reviews(course_id,email)');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_first_class_reviews_consent_created ON first_class_reviews(consent_mode,created_at DESC)');
}

function publicCard(row) {
  const named = row.consent_mode === 'named';
  return {
    reviewReference: row.review_reference,
    displayName: named ? row.display_name : 'ผู้เรียน AI ใส่ซอส · First Class รุ่นแรก',
    roleCompany: named ? row.role_company : null,
    recommend: row.recommend_text,
    score: row.score,
    consentMode: row.consent_mode,
  };
}

export async function handleFirstClassReview(req, res) {
  try {
    const sql = database();
    await ensureSchema(sql);

    if (req.method === 'POST') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, message: 'คำขอไม่ถูกต้อง' }, 403);
      const data = req.body || {};
      if (clean(data.website, 200)) return sendJson(res, { ok: true, reviewReference: null }, 201);

      const displayName = clean(data.displayName, 80);
      const email = clean(data.email, 120).toLowerCase();
      const roleCompany = clean(data.roleCompany, 120);
      const aiBefore = clean(data.aiBefore, 30);
      const understanding = Number(data.understanding);
      const aha = clean(data.aha, 500);
      const firstUse = clean(data.firstUse, 400);
      const recommend = clean(data.recommend, 600);
      const score = Number(data.score);
      const improve = clean(data.improve, 400);
      const extra = clean(data.extra, 600);
      const consentMode = clean(data.consentMode, 20);
      const takeaways = Array.isArray(data.takeaways)
        ? [...new Set(data.takeaways.map(value => clean(value, 60)).filter(value => TAKEAWAYS.has(value)))].slice(0, 6)
        : [];

      if (!displayName) return sendJson(res, { ok: false, field: 'displayName', message: 'ใส่ชื่อที่อยากให้เรียกก่อนครับ' }, 400);
      if (!validEmail(email)) return sendJson(res, { ok: false, field: 'email', message: 'Email ไม่ถูกรูปแบบ' }, 400);
      if (!AI_BEFORE.has(aiBefore)) return sendJson(res, { ok: false, field: 'aiBefore', message: 'เลือกจุดเริ่มต้นการใช้ AI ก่อนครับ' }, 400);
      if (!Number.isInteger(understanding) || understanding < 1 || understanding > 5) return sendJson(res, { ok: false, field: 'understanding', message: 'ให้คะแนนความเข้าใจ 1–5 ก่อนครับ' }, 400);
      if (!takeaways.length) return sendJson(res, { ok: false, field: 'takeaways', message: 'เลือกสิ่งที่ได้กลับบ้านอย่างน้อย 1 อย่าง' }, 400);
      if (aha.length < 8) return sendJson(res, { ok: false, field: 'aha', message: 'เล่า Aha moment เพิ่มอีกนิดครับ' }, 400);
      if (firstUse.length < 5) return sendJson(res, { ok: false, field: 'firstUse', message: 'บอกงานแรกที่จะเอาไปใช้หน่อยครับ' }, 400);
      if (recommend.length < 8) return sendJson(res, { ok: false, field: 'recommend', message: 'ช่วยเล่าคลาสด้วยคำของคุณอีกนิดครับ' }, 400);
      if (!Number.isInteger(score) || score < 1 || score > 10) return sendJson(res, { ok: false, field: 'score', message: 'ให้คะแนน 1–10 ก่อนครับ' }, 400);
      if (!CONSENT.has(consentMode)) return sendJson(res, { ok: false, field: 'consentMode', message: 'เลือกสิทธิ์การใช้คำรีวิวก่อนครับ' }, 400);

      const now = new Date();
      const rows = await sql.query(`INSERT INTO first_class_reviews
        (review_reference,course_id,display_name,email,role_company,ai_before,understanding,takeaways,aha,first_use,recommend_text,score,improve,extra,consent_mode,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$16)
        ON CONFLICT(course_id,email) DO UPDATE SET
          display_name=EXCLUDED.display_name,role_company=EXCLUDED.role_company,ai_before=EXCLUDED.ai_before,
          understanding=EXCLUDED.understanding,takeaways=EXCLUDED.takeaways,aha=EXCLUDED.aha,first_use=EXCLUDED.first_use,
          recommend_text=EXCLUDED.recommend_text,score=EXCLUDED.score,improve=EXCLUDED.improve,extra=EXCLUDED.extra,
          consent_mode=EXCLUDED.consent_mode,updated_at=EXCLUDED.updated_at
        RETURNING *`, [ref(), COURSE_ID, displayName, email, roleCompany || null, aiBefore, understanding, JSON.stringify(takeaways),
          aha, firstUse, recommend, score, improve || null, extra || null, consentMode, now]);

      return sendJson(res, { ok: true, reviewReference: rows[0].review_reference, card: publicCard(rows[0]) }, 201);
    }

    if (req.method === 'GET') {
      if (!authorized(req)) return sendJson(res, { ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, 401);
      const rows = await sql.query('SELECT * FROM first_class_reviews WHERE course_id=$1 ORDER BY created_at DESC LIMIT 500', [COURSE_ID]);
      return sendJson(res, { ok: true, reviews: rows });
    }

    return sendJson(res, { ok: false, message: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('First Class review API failed', error);
    return sendJson(res, { ok: false, message: 'ระบบบันทึกรีวิวสะดุด ลองใหม่อีกครั้งครับ' }, 500);
  }
}
