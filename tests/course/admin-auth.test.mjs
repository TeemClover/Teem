import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { configuredAdminKeyMatches, sharedCourseAdminDecision } from '../../api/_lib/course-admin-auth.js';
import { createCourseReviewsAdminHandler } from '../../api/_lib/course-reviews-admin.js';
import { createReviewFixtureDatabase } from './reviews-admin-fixture.mjs';

const sharedKey = 'shared-review-test-key-3958237';
const ownerKey = 'owner-test-key-4938761';
const helperUrl = new URL('../../api/_lib/course-admin-auth.js', import.meta.url).href;

// Execute the real legacy handlers with only their database transport and env
// replaced. No production modules, credentials, SQL connections or network calls.
async function legacyHandler(path, env) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  source = source.replace(/^import \{ database, sendJson \} from '[^']+core\.js';\n/m, '');
  source = source.replace(/from '\.\/(?:_lib\/)?course-admin-auth\.js'/, `from '${helperUrl}'`);
  const fixture = `
    const process = { env: ${JSON.stringify(env)} };
    export const testQueries = [];
    const database = () => ({ query: async (query, params = []) => { testQueries.push({query,params}); return []; } });
    const sendJson = (res, data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  `;
  const module = await import(`data:text/javascript;base64,${Buffer.from(fixture + source).toString('base64')}`);
  module.testQueries.length = 0;
  return { handler: module.default || module.handleFirstClassReview, queries: module.testQueries };
}
async function handlers(env) {
  const registrations = await legacyHandler('../../api/first-class.js', env);
  const firstReviews = await legacyHandler('../../api/_lib/first-class-review.js', env);
  const sql = createReviewFixtureDatabase();
  return [registrations, firstReviews, { handler: createCourseReviewsAdminHandler({ database: () => sql, env }), queries: sql.queries }];
}
async function request(handler, key, { method = 'GET', query = { admin: '1' }, body } = {}) {
  const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(raw) { this.data = JSON.parse(raw); } };
  await handler({ method, query, body, headers: { host: 'www.myclover.com', origin: 'https://www.myclover.com', 'content-type': 'application/json', ...(key === undefined ? {} : { 'x-admin-key': key }) } }, res);
  return res;
}

test('shared decision has an explicit not-configured state and bounded constant-time key comparison', () => {
  assert.equal(sharedCourseAdminDecision(sharedKey, {}), null);
  assert.equal(sharedCourseAdminDecision(sharedKey, { XTY_ADMIN_PASSWORD: sharedKey }), null);
  assert.equal(sharedCourseAdminDecision(sharedKey, { FIRST_CLASS_ADMIN_KEY: sharedKey }), true);
  assert.equal(sharedCourseAdminDecision('wrong', { FIRST_CLASS_ADMIN_KEY: sharedKey }), false);
  for (const value of [undefined, null, [], {}, '', 'x'.repeat(4097)]) {
    assert.equal(configuredAdminKeyMatches(value, sharedKey), false);
    assert.equal(configuredAdminKeyMatches(sharedKey, value), false);
  }
  assert.equal(sharedCourseAdminDecision(sharedKey, { COURSE_REVIEW_ADMIN_KEY: ['invalid-config'], FIRST_CLASS_ADMIN_KEY: sharedKey }), false);
});

test('one configured First Class key opens all three real APIs and disables legacy and owner fallbacks', async () => {
  const all = await handlers({ FIRST_CLASS_ADMIN_KEY: sharedKey, XTY_ADMIN_PASSWORD: ownerKey });
  for (const { handler } of all) {
    assert.equal((await request(handler, sharedKey)).statusCode, 200);
    for (const wrong of ['calling', ownerKey, '', undefined]) assert.equal((await request(handler, wrong)).statusCode, 401);
  }
});

test('explicit course review key has the same precedence for every API', async () => {
  const all = await handlers({ COURSE_REVIEW_ADMIN_KEY: sharedKey, FIRST_CLASS_ADMIN_KEY: 'lower-priority-fixture-key', XTY_ADMIN_PASSWORD: ownerKey });
  for (const { handler } of all) {
    assert.equal((await request(handler, sharedKey)).statusCode, 200);
    for (const wrong of ['lower-priority-fixture-key', 'calling', ownerKey]) assert.equal((await request(handler, wrong)).statusCode, 401);
  }
  const courseOnly = await handlers({ COURSE_REVIEW_ADMIN_KEY: sharedKey });
  for (const { handler } of courseOnly) assert.equal((await request(handler, sharedKey)).statusCode, 200);
});

test('before shared setup legacy First Class stays available but its fallback never opens Workshop reviews', async () => {
  const [registrations, firstReviews, workshop] = await handlers({ XTY_ADMIN_PASSWORD: ownerKey });
  for (const { handler } of [registrations, firstReviews]) {
    assert.equal((await request(handler, 'calling')).statusCode, 200);
    assert.equal((await request(handler, ownerKey)).statusCode, 401);
    assert.equal((await request(handler, undefined)).statusCode, 401);
  }
  assert.equal((await request(workshop.handler, ownerKey)).statusCode, 200);
  assert.equal((await request(workshop.handler, 'calling')).statusCode, 401);
  const missing = (await handlers({}))[2];
  assert.equal((await request(missing.handler, 'calling')).statusCode, 401);
  assert.equal((await request(missing.handler, undefined)).statusCode, 401);
});

test('configured shared authorization protects both legacy mutation paths', async () => {
  const [registrations, firstReviews] = await handlers({ FIRST_CLASS_ADMIN_KEY: sharedKey });
  for (const [entry, body] of [[registrations, { id: 1, action: 'mark_attended' }], [firstReviews, { id: 1, action: 'hide' }]]) {
    for (const wrong of ['calling', undefined]) assert.equal((await request(entry.handler, wrong, { method: 'PATCH', body })).statusCode, 401);
    assert.equal(entry.queries.some(({ query }) => /^UPDATE /i.test(query)), false);
    const authorized = await request(entry.handler, sharedKey, { method: 'PATCH', body });
    assert.notEqual(authorized.statusCode, 401);
    assert.equal(entry.queries.some(({ query }) => /^UPDATE /i.test(query)), true);
  }
});

test('shared setup does not add authentication to the existing public read paths', async () => {
  const [registrations, firstReviews, workshop] = await handlers({ FIRST_CLASS_ADMIN_KEY: sharedKey });
  assert.equal((await request(registrations.handler, undefined, { query: { public: 'meta' } })).statusCode, 200);
  assert.equal((await request(firstReviews.handler, undefined, { query: { public: '1' } })).statusCode, 200);
  assert.equal((await request(workshop.handler, undefined, { query: { public: '1' } })).statusCode, 200);
});
