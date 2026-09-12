import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const COURSE_REVIEW_SALES_COURSE = Object.freeze({
  id: 'ai-sauce-workshop-3h', title: 'AI ใส่ซอส Workshop 3 ชม.',
});
const COHORT_TITLES = { 'thedent-2026-09-12': 'TheDent · 12 กันยายน 2026' };
const CONSENTS = new Set(['private', 'anonymous', 'named']);
const TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;
const BODY_LIMIT = 8192;
const SCHEMA = `CREATE TABLE IF NOT EXISTS course_review_curation (
  review_reference TEXT PRIMARY KEY,
  shortlisted BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  consent_override TEXT CHECK (consent_override IN ('private','anonymous','named')),
  consent_updated_at TIMESTAMPTZ,
  consent_token_hash TEXT UNIQUE,
  consent_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)`;
export const COURSE_REVIEW_CURATION_SCHEMA = SCHEMA;

// Explicit columns keep receipt tokens and card/profile data outside this handler.
const REVIEW_SELECT = `SELECT r.review_reference,r.cohort_id,r.display_name,r.role,r.before_score,r.after_score,
  r.takeaways,r.first_task,r.score,r.feedback,r.testimonial,r.consent_mode,r.created_at,r.claimed_at,
  COALESCE(c.shortlisted,FALSE) AS shortlisted,COALESCE(c.published,FALSE) AS published,
  c.consent_override FROM course_reviews r
  LEFT JOIN course_review_curation c ON c.review_reference=r.review_reference`;

class HttpError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
function fail(status, code, message) { throw new HttpError(status, code, message); }
function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function authorized(req, env) {
  const configured = env.COURSE_REVIEW_ADMIN_KEY || env.FIRST_CLASS_ADMIN_KEY || env.XTY_ADMIN_PASSWORD;
  const supplied = req.headers?.['x-admin-key'];
  if (typeof configured !== 'string' || !configured || configured.length > 4096 || typeof supplied !== 'string' || !supplied || supplied.length > 4096) return false;
  return timingSafeEqual(Buffer.from(hash(configured), 'hex'), Buffer.from(hash(supplied), 'hex'));
}
function sameOrigin(req) {
  const { origin, host } = req.headers || {};
  if (typeof origin !== 'string' || typeof host !== 'string' || !host || /[\s/\\]/.test(host)) return false;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return ['http', 'https'].includes(proto) && origin === `${proto}://${host}`;
}
function queryValue(req, key) {
  if (req.query?.[key] !== undefined) return req.query[key];
  const values = new URL(req.url || '/', 'https://myclover.local').searchParams.getAll(key);
  return values.length > 1 ? values : values[0];
}
function reviewId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)) fail(400, 'INVALID_REQUEST', 'รหัสรีวิวไม่ถูกต้องครับ');
  return value;
}
function tokenHash(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) fail(400, 'INVALID_TOKEN', 'ลิงก์สิทธิ์การเผยแพร่ไม่ถูกต้องครับ');
  return hash(value);
}
function consentOf(row) {
  const consent = row.consent_override ?? row.consent_mode;
  return CONSENTS.has(consent) ? consent : 'private';
}
function eligible(row) { return ['named', 'anonymous'].includes(consentOf(row)) && typeof row.testimonial === 'string' && Boolean(row.testimonial.trim()); }
function iso(value) {
  if (value === null || value === undefined) return null;
  const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function adminReview(row) {
  return {
    id: row.review_reference, cohortId: row.cohort_id, displayName: row.display_name, role: row.role || null,
    before: Number(row.before_score), after: Number(row.after_score), takeaways: Array.isArray(row.takeaways) ? row.takeaways : [],
    firstTask: row.first_task, score: Number(row.score), feedback: row.feedback || '', testimonial: row.testimonial || '',
    consent: consentOf(row), originalConsent: CONSENTS.has(row.consent_mode) ? row.consent_mode : 'private',
    shortlisted: Boolean(row.shortlisted), published: Boolean(row.published) && eligible(row),
    createdAt: iso(row.created_at), claimedAt: iso(row.claimed_at),
  };
}
function learnerReview(row) {
  return { displayName: row.display_name, role: row.role || null, testimonial: row.testimonial || '', consent: consentOf(row) };
}
function publicReview(row) {
  const consent = consentOf(row), named = consent === 'named';
  return {
    testimonial: row.testimonial.trim(),
    displayName: named ? row.display_name : 'ผู้เรียน AI ใส่ซอส Workshop 3 ชม.',
    role: named ? row.role || null : null, consent,
  };
}
function summary(reviews) {
  const count = reviews.length;
  const mean = key => count ? Math.round(reviews.reduce((total, review) => total + review[key], 0) / count * 100) / 100 : null;
  return {
    count, scoreMean: mean('score'), beforeMean: mean('before'), afterMean: mean('after'),
    improvedCount: reviews.filter(review => review.after > review.before).length,
    shortlistedCount: reviews.filter(review => review.shortlisted).length,
    publishedCount: reviews.filter(review => review.published).length,
    shareableCount: reviews.filter(review => ['named', 'anonymous'].includes(review.consent) && review.testimonial.trim()).length,
  };
}
async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type'] || ''))) fail(415, 'JSON_REQUIRED', 'ส่งข้อมูลเป็น JSON ครับ');
  const declared = req.headers?.['content-length'];
  if (declared !== undefined && (!/^\d+$/.test(String(declared)) || Number(declared) > BODY_LIMIT)) fail(413, 'BODY_TOO_LARGE', 'ข้อมูลยาวเกินกำหนดครับ');
  let raw = req.body;
  if (raw === undefined && req[Symbol.asyncIterator]) {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += bytes.length;
      if (size > BODY_LIMIT) fail(413, 'BODY_TOO_LARGE', 'ข้อมูลยาวเกินกำหนดครับ');
      chunks.push(bytes);
    }
    raw = Buffer.concat(chunks);
  }
  try {
    const serialized = Buffer.isBuffer(raw) ? raw.toString('utf8') : typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (typeof serialized !== 'string') fail(400, 'INVALID_REQUEST', 'ข้อมูลไม่ถูกรูปแบบครับ');
    if (Buffer.byteLength(serialized) > BODY_LIMIT) fail(413, 'BODY_TOO_LARGE', 'ข้อมูลยาวเกินกำหนดครับ');
    const parsed = JSON.parse(serialized);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') fail(400, 'INVALID_REQUEST', 'ข้อมูลไม่ถูกรูปแบบครับ');
    return parsed;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    fail(400, 'INVALID_REQUEST', 'ข้อมูลไม่ถูกรูปแบบครับ');
  }
}
function send(res, status, payload) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(payload));
}
async function defaultDatabase() { return (await import('./core.js')).database(); }
export async function migrateCourseReviewCuration(sql) { await sql.query(SCHEMA); }

export function createCourseReviewsAdminHandler({ database = defaultDatabase, env = process.env, now = Date.now, migrate = migrateCourseReviewCuration } = {}) {
  let schemaPromise;
  async function ready() {
    const sql = await database();
    if (!schemaPromise) schemaPromise = Promise.resolve().then(() => migrate(sql)).catch(error => { schemaPromise = undefined; throw error; });
    await schemaPromise; return sql;
  }
  async function readReview(sql, id) {
    const rows = await sql.query(`${REVIEW_SELECT} WHERE r.review_reference=$1`, [id]);
    if (!rows[0]) fail(404, 'NOT_FOUND', 'ไม่พบรีวิวครับ');
    return rows[0];
  }
  async function checkToken(sql, digest, time) {
    const rows = await sql.query(`SELECT c.review_reference,c.consent_token_expires_at FROM course_review_curation c
      JOIN course_reviews r ON r.review_reference=c.review_reference WHERE c.consent_token_hash=$1`, [digest]);
    if (!rows[0]) fail(404, 'INVALID_TOKEN', 'ลิงก์นี้ไม่ถูกต้องหรือถูกแทนด้วยลิงก์ใหม่แล้วครับ');
    const expiresAt = new Date(rows[0].consent_token_expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= time.getTime()) fail(410, 'TOKEN_EXPIRED', 'ลิงก์หมดอายุแล้ว ขอให้ผู้สอนสร้างลิงก์ใหม่ครับ');
    return rows[0].review_reference;
  }
  return async function courseReviews(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store'); res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin, X-Admin-Key'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const method = String(req.method || '').toUpperCase();
      if (method === 'GET') {
        if (queryValue(req, 'admin') === '1') {
          if (!authorized(req, env)) fail(401, 'AUTH_REQUIRED', 'ใช้รหัสผู้ดูแลเพื่อเปิดรีวิวครับ');
          const cohort = queryValue(req, 'cohort');
          if (cohort !== undefined && (typeof cohort !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(cohort))) fail(400, 'INVALID_REQUEST', 'รุ่นเรียนไม่ถูกต้องครับ');
          const sql = await ready();
          const allCohorts = await sql.query('SELECT DISTINCT cohort_id FROM course_reviews ORDER BY cohort_id DESC');
          const rows = await sql.query(`${REVIEW_SELECT}${cohort ? ' WHERE r.cohort_id=$1' : ''} ORDER BY r.created_at DESC`, cohort ? [cohort] : []);
          const reviews = rows.map(adminReview);
          return send(res, 200, { ok: true, course: COURSE_REVIEW_SALES_COURSE,
            cohorts: allCohorts.map(row => ({ id: row.cohort_id, title: COHORT_TITLES[row.cohort_id] || row.cohort_id })),
            reviews, summary: summary(reviews),
          });
        }
        if (queryValue(req, 'public') === '1') {
          const sql = await ready();
          const rows = await sql.query(`SELECT r.testimonial,r.display_name,r.role,r.consent_mode,c.consent_override,c.published
            FROM course_reviews r JOIN course_review_curation c ON c.review_reference=r.review_reference
            WHERE c.published=TRUE AND COALESCE(c.consent_override,r.consent_mode) IN ('named','anonymous')
              AND COALESCE(r.testimonial,'') ~ '[^[:space:]]' ORDER BY r.created_at DESC`);
          return send(res, 200, { ok: true, reviews: rows.filter(row => row.published && eligible(row)).map(publicReview) });
        }
        fail(400, 'INVALID_REQUEST', 'เลือกประเภทการอ่านรีวิวครับ');
      }
      if (method !== 'POST') { res.setHeader('Allow', 'GET, POST'); fail(405, 'METHOD_NOT_ALLOWED', 'วิธีเรียกไม่ถูกต้องครับ'); }
      if (!sameOrigin(req)) fail(403, 'ORIGIN_DENIED', 'เปิดจากเว็บไซต์ myClover ครับ');
      const data = await body(req);
      const time = new Date(now());
      if (!Number.isFinite(time.getTime())) throw new Error('Invalid clock');
      if (data.action === 'consent_read' || data.action === 'consent_set') {
        const digest = tokenHash(data.token);
        if (data.action === 'consent_set' && !CONSENTS.has(data.consent)) fail(400, 'INVALID_REQUEST', 'เลือกสิทธิ์การเผยแพร่ครับ');
        const sql = await ready();
        const id = await checkToken(sql, digest, time);
        if (data.action === 'consent_set') {
          // Rotation and expiry are checked again inside the update, after acquiring its row lock.
          const updated = await sql.query(`UPDATE course_review_curation SET consent_override=$2,consent_updated_at=$3,
            published=FALSE,updated_at=$3 WHERE consent_token_hash=$1 AND consent_token_expires_at>$3
            RETURNING review_reference`, [digest, data.consent, time]);
          if (!updated[0]) { await checkToken(sql, digest, time); fail(404, 'INVALID_TOKEN', 'ขอเปิดลิงก์ล่าสุดอีกครั้งครับ'); }
        }
        return send(res, 200, { ok: true, review: learnerReview(await readReview(sql, id)) });
      }
      if (!authorized(req, env)) fail(401, 'AUTH_REQUIRED', 'ใช้รหัสผู้ดูแลเพื่อจัดการรีวิวครับ');
      if (!['shortlist', 'publish', 'consent_link'].includes(data.action)) fail(400, 'INVALID_REQUEST', 'คำสั่งไม่ถูกต้องครับ');
      const id = reviewId(data.id);
      if (data.action !== 'consent_link' && typeof data.value !== 'boolean') fail(400, 'INVALID_REQUEST', 'ค่าที่เลือกต้องเป็น true หรือ false ครับ');
      const sql = await ready();
      if (data.action === 'consent_link') {
        const token = randomBytes(32).toString('base64url');
        const rows = await sql.query(`INSERT INTO course_review_curation
          (review_reference,consent_token_hash,consent_token_expires_at,created_at,updated_at)
          SELECT r.review_reference,$2,$3,$4,$4 FROM course_reviews r WHERE r.review_reference=$1
          ON CONFLICT (review_reference) DO UPDATE SET consent_token_hash=EXCLUDED.consent_token_hash,
            consent_token_expires_at=EXCLUDED.consent_token_expires_at,updated_at=EXCLUDED.updated_at
          RETURNING review_reference`, [id, hash(token), new Date(time.getTime() + TOKEN_TTL), time]);
        if (!rows[0]) fail(404, 'NOT_FOUND', 'ไม่พบรีวิวครับ');
        return send(res, 200, { ok: true, url: `https://www.myclover.com/course/review-consent/#${token}` });
      }
      const inserted = await sql.query(`INSERT INTO course_review_curation (review_reference,created_at,updated_at)
        SELECT r.review_reference,$2,$2 FROM course_reviews r WHERE r.review_reference=$1
        ON CONFLICT (review_reference) DO NOTHING RETURNING review_reference`, [id, time]);
      if (!inserted[0]) await readReview(sql, id);
      if (data.action === 'shortlist') {
        await sql.query('UPDATE course_review_curation SET shortlisted=$2,updated_at=$3 WHERE review_reference=$1', [id, data.value, time]);
      } else {
        const updated = await sql.query(`UPDATE course_review_curation c SET published=$2,updated_at=$3 FROM course_reviews r
          WHERE c.review_reference=$1 AND r.review_reference=c.review_reference AND
            ($2=FALSE OR (COALESCE(c.consent_override,r.consent_mode) IN ('named','anonymous')
              AND COALESCE(r.testimonial,'') ~ '[^[:space:]]')) RETURNING c.review_reference`, [id, data.value, time]);
        if (!updated[0]) fail(409, 'NOT_SHAREABLE', 'เผยแพร่ได้เมื่อมีคำรีวิวและผู้เรียนอนุญาตครับ');
      }
      return send(res, 200, { ok: true, review: adminReview(await readReview(sql, id)) });
    } catch (error) {
      if (error instanceof HttpError) return send(res, error.status, { ok: false, code: error.code, message: error.message });
      // Database exceptions can contain private fields. Never log or forward them.
      return send(res, 503, { ok: false, code: 'UNAVAILABLE', message: 'ระบบรีวิวยังไม่พร้อม ลองอีกครั้งครับ' });
    }
  };
}

export const handleCourseReviews = createCourseReviewsAdminHandler();
