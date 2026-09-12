import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createCourseReviewsAdminHandler, COURSE_REVIEW_CURATION_SCHEMA } from '../../api/_lib/course-reviews-admin.js';
import { COURSE_COOKIE_NAME, issueCourseSession } from '../../api/_lib/course-access.js';
import { createReviewFixtureDatabase, SYNTHETIC_COURSE_REVIEWS } from './reviews-admin-fixture.mjs';

const key = 'only-a-test-admin-key-571802469';
const env = { COURSE_REVIEW_ADMIN_KEY: key };
const now = Date.UTC(2026, 8, 12, 12);
function setup(options = {}) {
  const sql = createReviewFixtureDatabase(options); let time = now;
  const handler = createCourseReviewsAdminHandler({ database: () => sql, env: options.env || env, now: () => time });
  return { sql, handler, setTime(value) { time = value; } };
}
function adminGet(cohort) {
  return { method: 'GET', headers: { 'x-admin-key': key }, query: { admin: '1', ...(cohort ? { cohort } : {}) } };
}
function post(body, admin = true) {
  return { method: 'POST', body, headers: { host: 'www.myclover.com', origin: 'https://www.myclover.com', 'content-type': 'application/json', ...(admin ? { 'x-admin-key': key } : {}) } };
}
async function invoke(handler, req) {
  const res = { statusCode: 0, headers: {}, raw: '', setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, end(value = '') { this.raw = value; } };
  await handler(req, res); return { ...res, data: res.raw ? JSON.parse(res.raw) : null };
}
const publicGet = () => ({ method: 'GET', headers: {}, query: { public: '1' } });
async function consentLink(handler, id = 'CR-fixture-private') {
  const response = await invoke(handler, post({ action: 'consent_link', id }));
  assert.equal(response.statusCode, 200);
  const url = new URL(response.data.url);
  assert.equal(url.origin + url.pathname, 'https://www.myclover.com/course/review-consent/');
  return url.hash.slice(1);
}

test('admin is configured-key only; an authentic classroom cookie grants no admin access', async () => {
  const { handler, sql } = setup();
  for (const supplied of ['', 'wrong-fixture-key', 'calling']) {
    const req = adminGet(); req.headers['x-admin-key'] = supplied;
    assert.equal((await invoke(handler, req)).statusCode, 401);
  }
  const courseEnv = { COURSE_DENT_PASSWORD: 'course-fixture-328', COURSE_SESSION_SECRET: 'fixture-course-secret-3827461059283746105928' };
  const req = adminGet(); delete req.headers['x-admin-key'];
  req.headers.cookie = `${COURSE_COOKIE_NAME}=${await issueCourseSession(courseEnv, now)}`;
  assert.equal((await invoke(handler, req)).statusCode, 401);
  assert.equal((await invoke(handler, post({ action: 'shortlist', id: 'CR-fixture-private', value: true }, false))).statusCode, 401);
  assert.equal(sql.queries.length, 0);
  for (const settings of [{}, courseEnv, { COURSE_REVIEW_ADMIN_KEY: '' }]) {
    const missing = setup({ env: settings });
    assert.equal((await invoke(missing.handler, adminGet())).statusCode, 401);
    assert.equal(missing.sql.queries.length, 0);
  }
});

test('configured owner/admin env fallbacks and primary-key precedence are explicit', async () => {
  for (const variable of ['COURSE_REVIEW_ADMIN_KEY', 'FIRST_CLASS_ADMIN_KEY', 'XTY_ADMIN_PASSWORD']) {
    const { handler } = setup({ env: { [variable]: key } });
    assert.equal((await invoke(handler, adminGet())).statusCode, 200);
  }
  const { handler } = setup({ env: { COURSE_REVIEW_ADMIN_KEY: 'primary-fixture', FIRST_CLASS_ADMIN_KEY: key, XTY_ADMIN_PASSWORD: key } });
  assert.equal((await invoke(handler, adminGet())).statusCode, 401);
  const req = adminGet(); req.headers['x-admin-key'] = 'primary-fixture';
  assert.equal((await invoke(handler, req)).statusCode, 200);
});

test('admin projection and cohort summaries omit all participant, receipt, profile and reward identifiers', async () => {
  const { handler } = setup();
  const res = await invoke(handler, adminGet());
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.data.course, { id: 'ai-sauce-workshop-3h', title: 'AI ใส่ซอส Workshop 3 ชม.' });
  assert.equal(res.data.reviews.length, 3);
  assert.equal(res.data.cohorts.length, 2);
  assert.deepEqual(res.data.summary, { count: 3, scoreMean: 5.33, beforeMean: 2.33, afterMean: 3, improvedCount: 2, shortlistedCount: 0, publishedCount: 0, shareableCount: 1 });
  const expected = ['id', 'cohortId', 'displayName', 'role', 'before', 'after', 'takeaways', 'firstTask', 'score', 'feedback', 'testimonial', 'consent', 'originalConsent', 'shortlisted', 'published', 'createdAt', 'claimedAt'].sort();
  for (const row of res.data.reviews) assert.deepEqual(Object.keys(row).sort(), expected);
  for (const field of ['receipt', 'reward', 'profile', 'participant']) assert.ok(!res.raw.includes(field));
  const filtered = await invoke(handler, adminGet('fixture-other-cohort'));
  assert.equal(filtered.data.reviews.length, 1);
  assert.equal(filtered.data.cohorts.length, 2);
  assert.equal(filtered.data.summary.count, 1);
  assert.equal(filtered.data.summary.scoreMean, 8);
  const empty = await invoke(handler, adminGet('missing-fixture-cohort'));
  assert.equal(empty.data.summary.count, 0);
  assert.equal(empty.data.summary.scoreMean, null);
});

test('private reviews may be shortlisted but cannot publish; low scores are not a publishing filter', async () => {
  const { handler } = setup();
  const shortlisted = await invoke(handler, post({ action: 'shortlist', id: 'CR-fixture-private', value: true }));
  assert.equal(shortlisted.statusCode, 200);
  assert.equal(shortlisted.data.review.shortlisted, true);
  assert.equal(shortlisted.data.review.createdAt, SYNTHETIC_COURSE_REVIEWS[0].created_at.toISOString());
  for (const id of ['CR-fixture-private', 'CR-fixture-anonymous']) {
    const denied = await invoke(handler, post({ action: 'publish', id, value: true }));
    assert.equal(denied.statusCode, 409);
    assert.equal(denied.data.code, 'NOT_SHAREABLE');
  }
  const low = await invoke(handler, post({ action: 'publish', id: 'CR-fixture-named', value: true }));
  assert.equal(low.statusCode, 200);
  assert.equal(low.data.review.score, 1);
  assert.equal(low.data.review.published, true);
  const visible = await invoke(handler, publicGet());
  assert.equal(visible.data.reviews.length, 1);
  assert.equal(visible.data.reviews[0].testimonial, SYNTHETIC_COURSE_REVIEWS[1].testimonial);
  const hidden = await invoke(handler, post({ action: 'publish', id: 'CR-fixture-named', value: false }));
  assert.equal(hidden.data.review.published, false);
  assert.deepEqual((await invoke(handler, publicGet())).data, { ok: true, reviews: [] });
});

test('public projection contains exactly four fields and redacts an anonymous name and role', async () => {
  const rows = SYNTHETIC_COURSE_REVIEWS.map(row => ({ ...row, testimonial: row.testimonial || 'คำรีวิวสมมติ C เพื่อทดสอบการไม่ระบุชื่อ' }));
  const { handler } = setup({ reviews: rows });
  await invoke(handler, post({ action: 'publish', id: 'CR-fixture-anonymous', value: true }));
  const res = await invoke(handler, publicGet());
  assert.deepEqual(Object.keys(res.data).sort(), ['ok', 'reviews']);
  assert.deepEqual(Object.keys(res.data.reviews[0]).sort(), ['testimonial', 'displayName', 'role', 'consent'].sort());
  assert.equal(res.data.reviews[0].displayName, 'ผู้เรียน AI ใส่ซอส Workshop 3 ชม.');
  assert.equal(res.data.reviews[0].role, null);
  assert.equal(res.data.reviews[0].consent, 'anonymous');
  for (const privateText of [rows[2].display_name, rows[2].role, rows[2].first_task, rows[2].feedback, rows[2].review_reference]) assert.ok(!res.raw.includes(privateText));
  assert.match(res.headers['cache-control'], /no-store/);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('consent links store only SHA256, expire at 30 days and rotate previous links', async () => {
  const { handler, sql, setTime } = setup();
  const first = await consentLink(handler);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  const stored = sql.curation.get('CR-fixture-private');
  assert.equal(stored.consent_token_hash, createHash('sha256').update(first).digest('hex'));
  assert.equal(stored.consent_token_expires_at.getTime(), now + 30 * 86400000);
  assert.ok(!JSON.stringify([...sql.curation.values()]).includes(first));
  assert.ok(!JSON.stringify(sql.queries).includes(first));
  const read = await invoke(handler, post({ action: 'consent_read', token: first }, false));
  assert.equal(read.statusCode, 200);
  assert.deepEqual(Object.keys(read.data.review).sort(), ['displayName', 'role', 'testimonial', 'consent'].sort());
  const second = await consentLink(handler);
  assert.notEqual(first, second);
  const rotated = await invoke(handler, post({ action: 'consent_read', token: first }, false));
  assert.equal(rotated.statusCode, 404);
  assert.equal(rotated.data.code, 'INVALID_TOKEN');
  setTime(now + 30 * 86400000);
  for (const action of ['consent_read', 'consent_set']) {
    const expired = await invoke(handler, post({ action, token: second, consent: 'named' }, false));
    assert.equal(expired.statusCode, 410);
    assert.equal(expired.data.code, 'TOKEN_EXPIRED');
  }
});

test('learner consent changes preserve the original answers, unpublish immediately and require a new admin choice', async () => {
  const { handler, sql } = setup();
  const original = structuredClone([...sql.records.values()]);
  const token = await consentLink(handler, 'CR-fixture-named');
  await invoke(handler, post({ action: 'publish', id: 'CR-fixture-named', value: true }));
  const revoke = await invoke(handler, post({ action: 'consent_set', token, consent: 'private', testimonial: 'Should never replace original', feedback: 'Should never replace original', rewardId: 'must-not-grant' }, false));
  assert.equal(revoke.statusCode, 200);
  assert.equal(revoke.data.review.consent, 'private');
  assert.equal(revoke.data.review.testimonial, SYNTHETIC_COURSE_REVIEWS[1].testimonial);
  assert.deepEqual((await invoke(handler, publicGet())).data.reviews, []);
  let admin = await invoke(handler, adminGet());
  let review = admin.data.reviews.find(row => row.id === 'CR-fixture-named');
  assert.equal(review.originalConsent, 'named');
  assert.equal(review.consent, 'private');
  assert.equal(review.published, false);
  await invoke(handler, post({ action: 'consent_set', token, consent: 'anonymous' }, false));
  assert.deepEqual((await invoke(handler, publicGet())).data.reviews, []);
  await invoke(handler, post({ action: 'publish', id: 'CR-fixture-named', value: true }));
  assert.equal((await invoke(handler, publicGet())).data.reviews[0].consent, 'anonymous');
  await invoke(handler, post({ action: 'consent_set', token, consent: 'named' }, false));
  assert.deepEqual((await invoke(handler, publicGet())).data.reviews, []);
  assert.deepEqual([...sql.records.values()], original);
});

test('missing or non-finite token expiry fails closed for both reading and changing consent', async () => {
  const { handler, sql } = setup();
  const token = await consentLink(handler);
  for (const expires of [null, undefined, 'infinity', 'not-a-date', new Date(NaN)]) {
    sql.curation.get('CR-fixture-private').consent_token_expires_at = expires;
    for (const action of ['consent_read', 'consent_set']) {
      const response = await invoke(handler, post({ action, token, consent: 'named' }, false));
      assert.equal(response.statusCode, 410);
      assert.equal(response.data.code, 'TOKEN_EXPIRED');
      assert.equal(response.data.review, undefined);
    }
    assert.equal(sql.curation.get('CR-fixture-private').consent_override, null);
  }
});

test('blank or whitespace testimonials cannot expose firstTask or feedback even after consent is granted', async () => {
  const reviews = SYNTHETIC_COURSE_REVIEWS.map(row => ({ ...row, testimonial: row.review_reference === 'CR-fixture-anonymous' ? ' \n\t ' : row.testimonial }));
  const { handler } = setup({ reviews });
  const token = await consentLink(handler, 'CR-fixture-anonymous');
  assert.equal((await invoke(handler, post({ action: 'consent_set', token, consent: 'named' }, false))).statusCode, 200);
  assert.equal((await invoke(handler, post({ action: 'publish', id: 'CR-fixture-anonymous', value: true }))).statusCode, 409);
  assert.deepEqual((await invoke(handler, publicGet())).data.reviews, []);
});

test('ten existing synthetic review rows and all their original consent/receipt/card fields remain unchanged', async () => {
  const reviews = Array.from({ length: 10 }, (_, index) => ({ ...SYNTHETIC_COURSE_REVIEWS[index % 3], id: index + 1, review_reference: `CR-existing-fixture-${index}` }));
  const { handler, sql } = setup({ reviews });
  const original = structuredClone([...sql.records.values()]);
  assert.equal((await invoke(handler, adminGet())).data.summary.count, 10);
  await invoke(handler, post({ action: 'shortlist', id: reviews[0].review_reference, value: true }));
  const token = await consentLink(handler, reviews[0].review_reference);
  await invoke(handler, post({ action: 'consent_set', token, consent: 'named' }, false));
  await invoke(handler, post({ action: 'publish', id: reviews[0].review_reference, value: true }));
  assert.deepEqual([...sql.records.values()], original);
  assert.ok(sql.queries.every(({ query }) => !/\b(?:INSERT INTO|UPDATE|DELETE FROM|ALTER TABLE|DROP TABLE)\s+course_reviews\b/i.test(query)));
  assert.match(COURSE_REVIEW_CURATION_SCHEMA, /^CREATE TABLE IF NOT EXISTS course_review_curation/);
  assert.equal(sql.queries.filter(({ query }) => query.startsWith('CREATE TABLE')).length, 1);
});

test('same-origin JSON requests are required and admin CORS is never enabled', async () => {
  const { handler, sql } = setup();
  for (const origin of [undefined, 'null', 'https://www.teambook.me', 'https://evil.example', 'http://www.myclover.com']) {
    const req = post({ action: 'shortlist', id: 'CR-fixture-private', value: true }); req.headers.origin = origin;
    const res = await invoke(handler, req); assert.equal(res.statusCode, 403); assert.equal(res.headers['access-control-allow-origin'], undefined);
  }
  assert.equal((await invoke(handler, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } })).statusCode, 405);
  assert.equal(sql.queries.length, 0);
  const wrongType = post({}); wrongType.headers['content-type'] = 'text/plain';
  assert.equal((await invoke(handler, wrongType)).statusCode, 415);
  for (const value of [true, [], null, '{invalid']) assert.equal((await invoke(handler, post(value))).statusCode, 400);
  assert.equal((await invoke(handler, post({ padding: 'x'.repeat(9000) }))).statusCode, 413);
  const stream = Readable.from([JSON.stringify({ action: 'shortlist', id: 'CR-fixture-private', value: true })]); Object.assign(stream, post(undefined));
  assert.equal((await invoke(handler, stream)).statusCode, 200);
});

test('invalid ids, actions, tokens and consent fail without changing curation', async () => {
  const { handler, sql } = setup();
  for (const payload of [
    { action: 'edit', id: 'CR-fixture-private' }, { action: 'publish', id: "CR-fixture' OR 1=1", value: true },
    { action: 'shortlist', id: 'CR-fixture-private', value: 'true' }, { action: 'consent_read', token: 'bad' },
    { action: 'consent_set', token: 'a'.repeat(43), consent: 'everyone' },
  ]) assert.equal((await invoke(handler, post(payload))).statusCode, 400);
  assert.equal((await invoke(handler, post({ action: 'consent_read', token: 'a'.repeat(43) }, false))).statusCode, 404);
  assert.equal((await invoke(handler, post({ action: 'publish', id: 'CR-missing', value: true }))).statusCode, 404);
  const duplicateQuery = adminGet(); duplicateQuery.query.cohort = ['one', 'two'];
  assert.equal((await invoke(handler, duplicateQuery)).statusCode, 400);
  assert.equal(sql.curation.size, 0);
});

test('database/migration failures return a generic no-store error and retry safely', async () => {
  let attempts = 0;
  const sql = createReviewFixtureDatabase();
  const handler = createCourseReviewsAdminHandler({ database: () => sql, env, now: () => now, migrate: async db => {
    if (++attempts === 1) throw new Error('Do not leak a fixture private answer');
    await db.query(COURSE_REVIEW_CURATION_SCHEMA);
  } });
  const failed = await invoke(handler, adminGet());
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.data.code, 'UNAVAILABLE');
  assert.ok(!failed.raw.includes('private answer'));
  assert.match(failed.headers['cache-control'], /no-store/);
  assert.equal((await invoke(handler, adminGet())).statusCode, 200);
});
