import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { verifyCourseSession } from './course-access.js';

export const COURSE_REVIEW_COHORT = 'thedent-2026-09-12';
export const COURSE_REVIEW_VERSION = 1;
export const COURSE_REVIEW_QUEST = 'course:thedent-2026-09-12:feedback';
export const COURSE_REVIEW_CARD_IDS = Object.freeze([
  'ORANGE_CAT_GREEN_COMMON_001', 'ORANGE_CAT_GREEN_COMMON_002',
  'WHITE_CAT_GREEN_COMMON_001', 'WHITE_CAT_GREEN_COMMON_002', 'WHITE_POM_GREEN_COMMON_001',
]);
const TEAMBOOK_ORIGINS = new Set(['https://www.teambook.me', 'https://teambook.me']);
const TAKEAWAYS = new Set(['source', 'files', 'content', 'replies', 'excel', 'repeat', 'lead']);
const CONSENTS = new Set(['private', 'anonymous', 'named']);
const BODY_LIMIT = 24 * 1024;
const RECEIPT_LIFETIME = 30 * 24 * 60 * 60 * 1000;
const JOIN_URL = 'https://www.teambook.me/join/?c=52113';

const SCHEMA = `CREATE TABLE IF NOT EXISTS course_reviews (
  id BIGSERIAL PRIMARY KEY,
  review_reference TEXT UNIQUE NOT NULL,
  cohort_id TEXT NOT NULL,
  form_version INTEGER NOT NULL,
  participant_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT,
  before_score INTEGER NOT NULL CHECK (before_score BETWEEN 1 AND 5),
  after_score INTEGER NOT NULL CHECK (after_score BETWEEN 1 AND 5),
  takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_task TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  feedback TEXT,
  testimonial TEXT,
  consent_mode TEXT NOT NULL DEFAULT 'private' CHECK (consent_mode IN ('private','anonymous','named')),
  receipt_token TEXT UNIQUE NOT NULL,
  receipt_expires_at TIMESTAMPTZ NOT NULL,
  reward_id TEXT UNIQUE NOT NULL,
  reward_card_id TEXT NOT NULL,
  reward_quest_id TEXT NOT NULL,
  claimed_profile_id TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (cohort_id, participant_id)
)`;

class RequestError extends Error {
  constructor(status, code, message, field) {
    super(message); Object.assign(this, { status, code, field });
  }
}
function fail(status, code, message, field) { throw new RequestError(status, code, message, field); }
function textField(value, field, max, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') fail(400, 'INVALID_REQUEST', 'ตรวจข้อมูลที่กรอกอีกครั้งครับ', field);
  const clean = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (clean.length > max || (required && !clean)) fail(400, 'INVALID_REQUEST', 'ตรวจข้อมูลที่กรอกอีกครั้งครับ', field);
  return clean;
}
function integer(value, field, max) {
  if (!Number.isInteger(value) || value < 1 || value > max) fail(400, 'INVALID_REQUEST', 'ตรวจคะแนนที่เลือกอีกครั้งครับ', field);
  return value;
}
function submission(data) {
  const participantId = textField(data.participantId, 'participantId', 36, true).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(participantId)) {
    fail(400, 'INVALID_REQUEST', 'เปิดแบบประเมินใหม่แล้วลองอีกครั้งครับ', 'participantId');
  }
  const consent = data.consent === undefined ? 'private' : data.consent;
  if (!CONSENTS.has(consent)) fail(400, 'INVALID_REQUEST', 'เลือกสิทธิ์การใช้คำตอบอีกครั้งครับ', 'consent');
  if (!Array.isArray(data.takeaways) || data.takeaways.length > 7 || data.takeaways.some(item => !TAKEAWAYS.has(item))) {
    fail(400, 'INVALID_REQUEST', 'ตรวจหัวข้อที่เลือกอีกครั้งครับ', 'takeaways');
  }
  return {
    participantId, name: textField(data.name, 'name', 100, true), role: textField(data.role, 'role', 120),
    before: integer(data.before, 'before', 5), after: integer(data.after, 'after', 5),
    takeaways: [...new Set(data.takeaways)], firstTask: textField(data.firstTask, 'firstTask', 1200, true),
    score: integer(data.score, 'score', 10), feedback: textField(data.feedback, 'feedback', 2000),
    testimonial: textField(data.testimonial, 'testimonial', 1500), consent,
  };
}
function sameOrigin(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (typeof origin !== 'string' || typeof host !== 'string' || !host || /[\s/\\]/.test(host)) return false;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return (proto === 'https' || proto === 'http') && origin === `${proto}://${host}`;
}
async function readBody(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type'] || ''))) {
    fail(415, 'JSON_REQUIRED', 'ส่งข้อมูลเป็น JSON ครับ');
  }
  const length = req.headers?.['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > BODY_LIMIT)) {
    fail(413, 'BODY_TOO_LARGE', 'ข้อมูลยาวเกินกำหนดครับ');
  }
  let raw = req.body;
  if (raw === undefined && req[Symbol.asyncIterator]) {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > BODY_LIMIT) fail(413, 'BODY_TOO_LARGE', 'ข้อมูลยาวเกินกำหนดครับ');
      chunks.push(bytes);
    }
    raw = Buffer.concat(chunks);
  }
  try {
    const serialized = Buffer.isBuffer(raw) ? raw.toString('utf8') : typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (typeof serialized !== 'string') fail(400, 'INVALID_REQUEST', 'ข้อมูลไม่ถูกรูปแบบครับ');
    if (Buffer.byteLength(serialized, 'utf8') > BODY_LIMIT) fail(413, 'BODY_TOO_LARGE', 'ข้อมูลยาวเกินกำหนดครับ');
    const parsed = JSON.parse(serialized);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') fail(400, 'INVALID_REQUEST', 'ข้อมูลไม่ถูกรูปแบบครับ');
    return parsed;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    fail(400, 'INVALID_REQUEST', 'ข้อมูลไม่ถูกรูปแบบครับ');
  }
}
function send(res, status, body) {
  res.statusCode = status;
  if (status === 204) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}
async function defaultDatabase() { return (await import('./core.js')).database(); }

export function createCourseReviewHandler({ database = defaultDatabase, env = process.env, now = Date.now } = {}) {
  let schemaPromise;
  async function readyDatabase() {
    const sql = await database();
    if (!schemaPromise) schemaPromise = sql.query(SCHEMA).catch(error => { schemaPromise = undefined; throw error; });
    await schemaPromise;
    return sql;
  }
  return async function courseReview(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin, Cookie');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const origin = req.headers?.origin;
    const teambook = TEAMBOOK_ORIGINS.has(origin);
    if (teambook) res.setHeader('Access-Control-Allow-Origin', origin);
    try {
      const method = String(req.method || '').toUpperCase();
      if (method === 'OPTIONS') {
        if (!teambook || String(req.headers['access-control-request-method'] || '').toUpperCase() !== 'POST') {
          fail(403, 'ORIGIN_DENIED', 'คำขอไม่ถูกต้องครับ');
        }
        const requestedHeaders = String(req.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
        if (requestedHeaders.some(value => value !== 'content-type')) fail(403, 'ORIGIN_DENIED', 'คำขอไม่ถูกต้องครับ');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '600');
        return send(res, 204);
      }
      if (method === 'GET') {
        await readyDatabase();
        return send(res, 200, { ok: true, service: 'course-review', cohortId: COURSE_REVIEW_COHORT, formVersion: COURSE_REVIEW_VERSION });
      }
      if (method !== 'POST') {
        res.setHeader('Allow', 'GET, POST, OPTIONS');
        fail(405, 'METHOD_NOT_ALLOWED', 'วิธีเรียกไม่ถูกต้องครับ');
      }
      if (!teambook && !sameOrigin(req)) fail(403, 'ORIGIN_DENIED', 'คำขอไม่ถูกต้องครับ');
      const data = await readBody(req);
      const time = new Date(now());
      if (!Number.isFinite(time.getTime())) throw new Error('Clock unavailable');
      if (data.action === 'claim') {
        if (!teambook) fail(403, 'ORIGIN_DENIED', 'เปิดรับการ์ดจาก TeamBook ครับ');
        if (typeof data.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.token)) fail(400, 'INVALID_RECEIPT', 'ลิงก์รับการ์ดไม่ถูกต้องครับ');
        if (typeof data.profileId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(data.profileId)) fail(400, 'INVALID_REQUEST', 'เปิดโปรไฟล์ TeamBook ก่อนรับการ์ดครับ', 'profileId');
        const sql = await readyDatabase();
        // A row lock and conditional update bind the bearer receipt to one profile.
        // The same profile may recover an already-claimed card after receipt expiry.
        const rows = await sql.query(`UPDATE course_reviews
          SET claimed_profile_id=COALESCE(claimed_profile_id,$2),
              claimed_at=COALESCE(claimed_at,$3),
              updated_at=CASE WHEN claimed_profile_id IS NULL THEN $3 ELSE updated_at END
          WHERE receipt_token=$1 AND cohort_id=$4 AND
            ((claimed_profile_id IS NULL AND receipt_expires_at>$3) OR claimed_profile_id=$2)
          RETURNING reward_id,reward_card_id,reward_quest_id,claimed_at`,
        [data.token, data.profileId, time, COURSE_REVIEW_COHORT]);
        if (!rows[0]) {
          const existing = await sql.query('SELECT claimed_profile_id,receipt_expires_at FROM course_reviews WHERE receipt_token=$1 AND cohort_id=$2 LIMIT 1', [data.token, COURSE_REVIEW_COHORT]);
          if (!existing[0]) fail(404, 'INVALID_RECEIPT', 'ลิงก์รับการ์ดไม่ถูกต้องครับ');
          if (existing[0].claimed_profile_id) fail(409, 'CLAIMED_BY_ANOTHER_PROFILE', 'การ์ดนี้ผูกกับโปรไฟล์อื่นแล้ว ใช้โปรไฟล์เดิมเพื่อเปิดการ์ดครับ');
          fail(410, 'RECEIPT_EXPIRED', 'ลิงก์รับการ์ดหมดอายุแล้ว ติดต่อผู้สอนครับ');
        }
        const row = rows[0];
        return send(res, 200, { ok: true, cohortId: COURSE_REVIEW_COHORT, reward: {
          rewardId: row.reward_id, cardId: row.reward_card_id, questId: row.reward_quest_id,
          earnedAt: new Date(row.claimed_at).toISOString(),
        }, joinUrl: JOIN_URL });
      }
      if (teambook || !sameOrigin(req)) fail(403, 'ORIGIN_DENIED', 'ส่งแบบประเมินจากห้องเรียนครับ');
      if (data.action !== undefined && data.action !== 'submit') fail(400, 'INVALID_REQUEST', 'คำขอไม่ถูกต้องครับ');
      if (!await verifyCourseSession(req.headers?.cookie, env, time.getTime())) fail(401, 'COURSE_ACCESS_REQUIRED', 'เข้าสู่ห้องเรียนก่อนส่งแบบประเมินครับ');
      const answer = submission(data);
      const sql = await readyDatabase();
      const receipt = randomBytes(32).toString('base64url');
      // Keep the first submitted answers and receipt on retries, including concurrent retries.
      const rows = await sql.query(`INSERT INTO course_reviews
        (review_reference,cohort_id,form_version,participant_id,display_name,role,before_score,after_score,
         takeaways,first_task,score,feedback,testimonial,consent_mode,receipt_token,receipt_expires_at,
         reward_id,reward_card_id,reward_quest_id,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20)
        ON CONFLICT (cohort_id,participant_id) DO UPDATE SET participant_id=course_reviews.participant_id
        RETURNING review_reference,receipt_token,receipt_expires_at`, [
        `CR-${randomUUID()}`, COURSE_REVIEW_COHORT, COURSE_REVIEW_VERSION, answer.participantId,
        answer.name, answer.role || null, answer.before, answer.after, JSON.stringify(answer.takeaways),
        answer.firstTask, answer.score, answer.feedback || null, answer.testimonial || null, answer.consent,
        receipt, new Date(time.getTime() + RECEIPT_LIFETIME), `course_${randomUUID()}`,
        COURSE_REVIEW_CARD_IDS[randomInt(COURSE_REVIEW_CARD_IDS.length)], COURSE_REVIEW_QUEST, time,
      ]);
      if (!rows[0]) throw new Error('Receipt unavailable');
      return send(res, 200, { ok: true, cohortId: COURSE_REVIEW_COHORT, formVersion: COURSE_REVIEW_VERSION,
        reviewReference: rows[0].review_reference, receiptToken: rows[0].receipt_token,
        claimUrl: `https://www.teambook.me/course-card/#${rows[0].receipt_token}`, joinUrl: JOIN_URL,
      });
    } catch (error) {
      if (error instanceof RequestError) return send(res, error.status, { ok: false, code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) });
      // Never log database exceptions or submitted content: SQL errors may contain answers.
      return send(res, 503, { ok: false, code: 'UNAVAILABLE', message: 'ระบบยังไม่พร้อม คำตอบยังอยู่ ลองอีกครั้งได้ครับ' });
    }
  };
}

export const handleCourseReview = createCourseReviewHandler();
