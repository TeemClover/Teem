import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import {
  createCourseReviewHandler, COURSE_REVIEW_COHORT, COURSE_REVIEW_QUEST, COURSE_REVIEW_CARD_IDS,
} from '../../api/_lib/course-review.js';
import { COURSE_COOKIE_NAME, issueCourseSession } from '../../api/_lib/course-access.js';

const env = {
  COURSE_DENT_PASSWORD: 'review-fixture-access-947203',
  COURSE_SESSION_SECRET: 'review-fixture-secret-only-3906751840269537804127',
};
const initialTime = Date.UTC(2026, 8, 12, 10);
const participantA = '171d0f02-bf94-4b8e-8674-22f56731d514';
const participantB = 'b386782b-04fd-4b03-9af4-e76610b8a561';
const cookie = `${COURSE_COOKIE_NAME}=${await issueCourseSession(env, initialTime)}`;
const answer = (extra = {}) => ({
  participantId: participantA, name: 'Test participant', role: 'Test team',
  before: 2, after: 4, takeaways: ['source', 'files'], firstTask: 'Use the sample workflow',
  score: 8, feedback: 'Fixture feedback', testimonial: 'Fixture testimonial', ...extra,
});
function request(body, extra = {}) {
  return { method: 'POST', body, headers: {
    host: 'www.myclover.com', origin: 'https://www.myclover.com',
    'content-type': 'application/json', cookie,
  }, ...extra };
}
function claimRequest(token, profileId = 'testprofilea', origin = 'https://www.teambook.me') {
  const req = request({ action: 'claim', token, profileId });
  req.headers.origin = origin; delete req.headers.cookie;
  return req;
}
async function invoke(handler, req) {
  const res = { statusCode: 0, headers: {}, raw: '', setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, end(value = '') { this.raw = value; } };
  await handler(req, res);
  return { ...res, data: res.raw ? JSON.parse(res.raw) : null };
}

// An injected database double only: these tests never use DATABASE_URL or a remote service.
function memoryDatabase() {
  const records = new Map(), queries = [];
  return {
    records, queries,
    async query(query, params = []) {
      queries.push({ query, params });
      if (query.startsWith('CREATE TABLE IF NOT EXISTS course_reviews')) return [];
      if (query.startsWith('INSERT INTO course_reviews')) {
        const [reference, cohort, version, participant, name, role, before, after, takeaways, firstTask, score, feedback, testimonial, consent, token, expires, rewardId, cardId, questId, created] = params;
        const key = `${cohort}:${participant}`;
        if (!records.has(key)) records.set(key, {
          review_reference: reference, cohort_id: cohort, form_version: version, participant_id: participant,
          display_name: name, role, before_score: before, after_score: after, takeaways: JSON.parse(takeaways),
          first_task: firstTask, score, feedback, testimonial, consent_mode: consent, receipt_token: token,
          receipt_expires_at: expires, reward_id: rewardId, reward_card_id: cardId, reward_quest_id: questId,
          created_at: created, updated_at: created, claimed_profile_id: null, claimed_at: null,
        });
        const row = records.get(key);
        return [{ review_reference: row.review_reference, receipt_token: row.receipt_token, receipt_expires_at: row.receipt_expires_at }];
      }
      if (query.startsWith('UPDATE course_reviews')) {
        const [token, profileId, time, cohort] = params;
        const row = [...records.values()].find(row => row.receipt_token === token && row.cohort_id === cohort);
        if (!row || !(row.claimed_profile_id === profileId || (!row.claimed_profile_id && row.receipt_expires_at > time))) return [];
        if (!row.claimed_profile_id) { row.claimed_profile_id = profileId; row.claimed_at = time; row.updated_at = time; }
        return [{ reward_id: row.reward_id, reward_card_id: row.reward_card_id, reward_quest_id: row.reward_quest_id, claimed_at: row.claimed_at }];
      }
      if (query.startsWith('SELECT claimed_profile_id,receipt_expires_at FROM course_reviews')) {
        const row = [...records.values()].find(row => row.receipt_token === params[0] && row.cohort_id === params[1]);
        return row ? [{ claimed_profile_id: row.claimed_profile_id, receipt_expires_at: row.receipt_expires_at }] : [];
      }
      assert.fail(`Unexpected query type in course review test: ${query.split('\n')[0]}`);
    },
  };
}
function setup() {
  const sql = memoryDatabase();
  let time = initialTime;
  return { sql, setTime(value) { time = value; }, handler: createCourseReviewHandler({ database: () => sql, env, now: () => time }) };
}

test('authenticated submission stores private feedback in its own cohort and returns only an opaque receipt', async () => {
  const { handler, sql } = setup();
  const response = await invoke(handler, request(answer({ cohortId: 'first-class-old', formVersion: 99 })));
  assert.equal(response.statusCode, 200);
  assert.equal(response.data.cohortId, COURSE_REVIEW_COHORT);
  assert.equal(response.data.formVersion, 1);
  assert.match(response.data.receiptToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(response.data.claimUrl, `https://www.teambook.me/course-card/#${response.data.receiptToken}`);
  assert.equal(response.data.joinUrl, 'https://www.teambook.me/join/?c=52113');
  for (const privateValue of ['Test participant', 'Test team', 'Fixture testimonial', 'Fixture feedback']) assert.ok(!response.raw.includes(privateValue));
  assert.deepEqual(Object.keys(response.data).sort(), ['claimUrl', 'cohortId', 'formVersion', 'joinUrl', 'ok', 'receiptToken', 'reviewReference'].sort());
  const row = [...sql.records.values()][0];
  assert.equal(row.consent_mode, 'private');
  assert.equal(row.cohort_id, COURSE_REVIEW_COHORT);
  assert.equal(row.form_version, 1);
  assert.equal(row.receipt_expires_at.getTime() - row.created_at.getTime(), 30 * 86400000);
  assert.ok(COURSE_REVIEW_CARD_IDS.includes(row.reward_card_id));
  assert.equal(row.reward_quest_id, COURSE_REVIEW_QUEST);
  assert.match(response.headers['cache-control'], /no-store/);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.ok(sql.queries.every(item => !item.query.includes('first_class')));
  assert.ok(!sql.queries.find(item => item.query.startsWith('INSERT')).query.includes(row.display_name));
});

test('same participant retries keep the first answers and receipt, while a shared-device second participant stays separate', async () => {
  const { handler, sql } = setup();
  const responses = await Promise.all(Array.from({ length: 4 }, () => invoke(handler, request(answer()))));
  assert.equal(new Set(responses.map(response => response.data.receiptToken)).size, 1);
  assert.equal(sql.records.size, 1);
  const retry = await invoke(handler, request(answer({ name: 'Changed retry', consent: 'named' })));
  assert.deepEqual(retry.data, responses[0].data);
  assert.equal([...sql.records.values()][0].display_name, 'Test participant');
  assert.equal([...sql.records.values()][0].consent_mode, 'private');
  const other = await invoke(handler, request(answer({ participantId: participantB, name: 'Second participant' })));
  assert.equal(other.statusCode, 200);
  assert.notEqual(other.data.receiptToken, retry.data.receiptToken);
  assert.equal(sql.records.size, 2);
  assert.match(sql.queries.find(item => item.query.startsWith('INSERT')).query, /ON CONFLICT \(cohort_id,participant_id\)/);
});

test('every consent mode and low scores remain eligible for the same card reward flow', async () => {
  for (const consent of ['private', 'anonymous', 'named']) {
    const { handler, sql } = setup();
    const response = await invoke(handler, request(answer({ consent, score: 1, after: 1, before: 5, takeaways: [], testimonial: '' })));
    assert.equal(response.statusCode, 200);
    assert.equal([...sql.records.values()][0].consent_mode, consent);
    assert.match(response.data.receiptToken, /^[A-Za-z0-9_-]{43}$/);
  }
});

test('invalid identity, scores, takeaways, lengths and consent do not write to the database', async () => {
  const changes = [
    { participantId: 'not-a-uuid' }, { name: '' }, { name: 'x'.repeat(101) }, { role: 'x'.repeat(121) },
    { before: 0 }, { before: '3' }, { after: 6 }, { after: 2.5 }, { score: 0 }, { score: 11 },
    { takeaways: ['unknown'] }, { takeaways: 'source' }, { firstTask: '' }, { firstTask: 'x'.repeat(1201) },
    { feedback: 'x'.repeat(2001) }, { testimonial: 'x'.repeat(1501) }, { consent: 'public' },
  ];
  for (const change of changes) {
    const { handler, sql } = setup();
    assert.equal((await invoke(handler, request(answer(change)))).statusCode, 400, JSON.stringify(change).slice(0, 90));
    assert.equal(sql.queries.length, 0);
  }
});

test('submit requires a valid course cookie and same origin before database access', async () => {
  const { handler, sql } = setup();
  for (const badCookie of ['', `${COURSE_COOKIE_NAME}=true`, `${cookie}!`]) {
    const req = request(answer()); req.headers.cookie = badCookie;
    assert.equal((await invoke(handler, req)).statusCode, 401);
  }
  for (const origin of [undefined, 'null', 'https://evil.example', 'https://www.myclover.com.evil.example', 'https://www.teambook.me']) {
    const req = request(answer()); req.headers.origin = origin;
    assert.equal((await invoke(handler, req)).statusCode, 403);
  }
  const rotated = createCourseReviewHandler({ database: () => sql, env: { ...env, COURSE_DENT_PASSWORD: 'different-fixture' }, now: () => initialTime });
  assert.equal((await invoke(rotated, request(answer()))).statusCode, 401);
  assert.equal(sql.queries.length, 0);
});

test('cross-domain claim atomically binds a receipt and preserves the exact card and earned time on retries', async () => {
  const { handler, sql, setTime } = setup();
  const submitted = await invoke(handler, request(answer()));
  const token = submitted.data.receiptToken;
  const first = await invoke(handler, claimRequest(token));
  assert.equal(first.statusCode, 200);
  assert.equal(first.headers['access-control-allow-origin'], 'https://www.teambook.me');
  assert.equal(first.headers['access-control-allow-credentials'], undefined);
  assert.match(first.data.reward.rewardId, /^course_/);
  assert.ok(COURSE_REVIEW_CARD_IDS.includes(first.data.reward.cardId));
  assert.equal(first.data.reward.questId, COURSE_REVIEW_QUEST);
  assert.equal(first.data.reward.earnedAt, new Date(initialTime).toISOString());
  assert.ok(!first.raw.includes(token));
  assert.ok(!first.raw.includes('Test participant'));
  setTime(initialTime + 40 * 86400000);
  const again = await invoke(handler, claimRequest(token, 'testprofilea', 'https://teambook.me'));
  assert.equal(again.statusCode, 200);
  assert.deepEqual(again.data, first.data);
  const other = await invoke(handler, claimRequest(token, 'testprofileb'));
  assert.equal(other.statusCode, 409);
  assert.equal(other.data.code, 'CLAIMED_BY_ANOTHER_PROFILE');
  const claimSql = sql.queries.find(item => item.query.startsWith('UPDATE')).query;
  assert.match(claimSql, /claimed_profile_id IS NULL AND receipt_expires_at>\$3/);
  assert.match(claimSql, /OR claimed_profile_id=\$2/);
});

test('two simultaneous profiles cannot both bind one receipt', async () => {
  const { handler, sql } = setup();
  const { data } = await invoke(handler, request(answer()));
  const responses = await Promise.all(['profilefirst', 'profilesecond'].map(profile => invoke(handler, claimRequest(data.receiptToken, profile))));
  assert.deepEqual(responses.map(response => response.statusCode).sort(), [200, 409]);
  assert.equal([...sql.records.values()].filter(row => row.claimed_profile_id).length, 1);
});

test('unclaimed receipts expire and invalid claims never return answers', async () => {
  const { handler, setTime } = setup();
  const { data } = await invoke(handler, request(answer()));
  setTime(initialTime + 30 * 86400000);
  const expired = await invoke(handler, claimRequest(data.receiptToken));
  assert.equal(expired.statusCode, 410);
  assert.equal(expired.data.code, 'RECEIPT_EXPIRED');
  assert.equal((await invoke(handler, claimRequest('a'.repeat(43)))).statusCode, 404);
  assert.equal((await invoke(handler, claimRequest('invalid'))).statusCode, 400);
  assert.equal((await invoke(handler, claimRequest(data.receiptToken, 'bad id'))).statusCode, 400);
  assert.equal((await invoke(handler, claimRequest(data.receiptToken, 'testprofilea', 'https://evil.example'))).statusCode, 403);
  assert.equal((await invoke(handler, claimRequest(data.receiptToken, 'testprofilea', 'https://www.myclover.com'))).statusCode, 403);
});

test('CORS preflight allows only the two TeamBook origins, POST and JSON, without credentials', async () => {
  const { handler, sql } = setup();
  for (const origin of ['https://www.teambook.me', 'https://teambook.me']) {
    const res = await invoke(handler, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } });
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers['access-control-allow-origin'], origin);
    assert.equal(res.headers['access-control-allow-methods'], 'POST');
  }
  for (const headers of [
    { origin: 'https://teambook.me.evil.example', 'access-control-request-method': 'POST' },
    { origin: 'https://www.teambook.me', 'access-control-request-method': 'PATCH' },
    { origin: 'https://www.teambook.me', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization' },
  ]) assert.equal((await invoke(handler, { method: 'OPTIONS', headers })).statusCode, 403);
  assert.equal(sql.queries.length, 0);
});

test('health creates only the isolated schema and never returns review data or accepts an admin key', async () => {
  const { handler, sql } = setup();
  await invoke(handler, request(answer()));
  const health = await invoke(handler, { method: 'GET', headers: { 'x-admin-key': 'anything' }, query: { public: '1' } });
  assert.deepEqual(health.data, { ok: true, service: 'course-review', cohortId: COURSE_REVIEW_COHORT, formVersion: 1 });
  assert.equal(sql.queries.filter(item => item.query.startsWith('CREATE TABLE')).length, 1);
  assert.ok(!health.raw.includes('participant'));
  assert.equal((await invoke(handler, request({}, { method: 'PATCH' }))).statusCode, 405);
});

test('JSON body limits cover parsed objects, malformed JSON and streamed requests', async () => {
  const { handler } = setup();
  const badType = request(answer()); badType.headers['content-type'] = 'text/plain';
  assert.equal((await invoke(handler, badType)).statusCode, 415);
  for (const body of ['{invalid', [], null]) assert.equal((await invoke(handler, request(body))).statusCode, 400);
  assert.equal((await invoke(handler, request({ padding: 'x'.repeat(25000) }))).statusCode, 413);
  const oversized = request(answer()); oversized.headers['content-length'] = '25000';
  assert.equal((await invoke(handler, oversized)).statusCode, 413);
  const streamed = Readable.from([JSON.stringify(answer())]); Object.assign(streamed, request(undefined));
  assert.equal((await invoke(handler, streamed)).statusCode, 200);
  const largeStream = Readable.from(['x'.repeat(25000)]); Object.assign(largeStream, request(undefined));
  assert.equal((await invoke(handler, largeStream)).statusCode, 413);
});

test('database errors fail closed without leaking answers and a failed schema attempt can be retried', async () => {
  let calls = 0;
  const sql = memoryDatabase();
  const handler = createCourseReviewHandler({ env, now: () => initialTime, database: () => ({ query: async (...args) => {
    if (++calls === 1) throw new Error('Fixture private answer in SQL exception');
    return sql.query(...args);
  } }) });
  const first = await invoke(handler, request(answer()));
  assert.equal(first.statusCode, 503);
  assert.equal(first.data.code, 'UNAVAILABLE');
  assert.ok(!first.raw.includes('Fixture private'));
  assert.equal((await invoke(handler, request(answer()))).statusCode, 200);
});

test('catch-all adds only the exact course review route while preserving the existing review handler', async () => {
  const router = await readFile(new URL('../../api/[...path].js', import.meta.url), 'utf8');
  assert.match(router, /rawRoute === 'course-review'\) return handleCourseReview\(req, res\)/);
  assert.match(router, /rawRoute === 'first-class\/review' \|\| rawRoute === 'first-class-review'\) return handleFirstClassReview/);
});
