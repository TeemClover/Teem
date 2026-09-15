import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthFixture } from './auth-fixture.mjs';
import { createSession, currentUser, sessionCookie, sha256 } from '../../api/_lib/core.js';
import { safeRelativeReturn } from '../../assets/auth-return.js';

function request(path, body, cookie) {
  return { url: path, method: body ? 'POST' : 'GET', body,
    query: Object.fromEntries(new URL(path, 'https://fixture.test').searchParams),
    headers: { host: 'fixture.test', origin: 'https://fixture.test', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) } };
}
async function call(handler, req) {
  const reply = { headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; }, end(body) { this.body = body ? JSON.parse(body) : null; } };
  await handler(req, reply); return reply;
}
async function login(fixture, email = 'member@fixture.test') {
  const requested = await call(fixture.authHandler, request('/api/auth/otp/request', { email }));
  assert.equal(requested.statusCode, 200);
  const verified = await call(fixture.authHandler, request('/api/auth/otp/verify', { requestId: requested.body.requestId, otp: fixture.deliveries.get(email) }));
  assert.equal(verified.statusCode, 200);
  return { verified, cookie: verified.headers['set-cookie'].split(';')[0] };
}
const lessonRequest = cookie => request('/api/learn?action=lesson&courseId=ai-sauce&lessonId=FOUNDATION', undefined, cookie);

test('member cookie and server expiry retain the existing absolute 30-day lifetime', async () => {
  const fixture = createAuthFixture();
  const { verified, cookie } = await login(fixture);
  const token = cookie.slice('mc_session='.length), row = fixture.sessions.get(await sha256(token));
  assert.equal(row.expires_at.getTime() - row.created_at.getTime(), 30 * 86400000);
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000']) assert.ok(verified.headers['set-cookie'].includes(attribute));
  assert.equal(verified.headers['set-cookie'].includes('Domain='), false);
  assert.notEqual([...fixture.sessions.keys()][0], token);
  for (let navigation = 0; navigation < 3; navigation += 1) {
    const session = await call(fixture.authHandler, request('/api/auth/session', undefined, cookie));
    assert.equal(session.body.user.id, 'fixture-member');
    assert.equal(session.body.user.emailVerified, true);
    assert.equal((await call(fixture.learnHandler, lessonRequest(cookie))).statusCode, 200);
  }
  assert.equal(fixture.sessions.size, 1, 'Returning page loads neither recreate nor extend the member session');
});

test('guest, logout, expiry and server revocation cannot retrieve the protected payload', async () => {
  const fixture = createAuthFixture();
  assert.equal((await call(fixture.learnHandler, lessonRequest())).statusCode, 401);
  let { cookie } = await login(fixture);
  const content = await call(fixture.learnHandler, lessonRequest(cookie));
  assert.match(content.body.lesson.reading, /PRIVATE COURSE FIXTURE/);
  const loggedOut = await call(fixture.authHandler, request('/api/auth/logout', {}, cookie));
  assert.match(loggedOut.headers['set-cookie'], /Max-Age=0/);
  assert.equal(fixture.sessions.size, 0);
  assert.equal((await call(fixture.learnHandler, lessonRequest(cookie))).statusCode, 401, 'A copied pre-logout token is also invalid');
  ({ cookie } = await login(fixture));
  for (const row of fixture.sessions.values()) row.expires_at = new Date(Date.now() - 1);
  assert.equal((await call(fixture.learnHandler, lessonRequest(cookie))).statusCode, 401);
  assert.equal(fixture.sessions.size, 0);
  ({ cookie } = await login(fixture)); fixture.sessions.clear();
  assert.equal((await call(fixture.authHandler, request('/api/auth/session', undefined, cookie))).body.user, null);
  assert.equal((await call(fixture.learnHandler, lessonRequest(cookie))).statusCode, 401);
});

test('verified login alone never grants a paid course; revoking course grant takes effect immediately', async () => {
  const fixture = createAuthFixture();
  const { cookie } = await login(fixture, 'unentitled@fixture.test');
  assert.equal((await call(fixture.authHandler, request('/api/auth/session', undefined, cookie))).body.user.emailVerified, true);
  const denied = await call(fixture.learnHandler, lessonRequest(cookie));
  assert.equal(denied.statusCode, 403); assert.equal(denied.body.code, 'COURSE_ACCESS_REQUIRED'); assert.equal(denied.body.lesson, undefined);
  const member = await login(fixture);
  assert.equal((await call(fixture.learnHandler, lessonRequest(member.cookie))).statusCode, 200);
  fixture.grants[0].revoked_at = new Date();
  assert.equal((await call(fixture.learnHandler, lessonRequest(member.cookie))).statusCode, 403);
});

test('auth/session and course responses exclude all browser and shared cache stores', async () => {
  const fixture = createAuthFixture(), { verified, cookie } = await login(fixture);
  for (const response of [verified, await call(fixture.authHandler, request('/api/auth/session', undefined, cookie)), await call(fixture.learnHandler, lessonRequest(cookie)), await call(fixture.authHandler, request('/api/auth/logout', {}, cookie))]) {
    for (const name of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control']) assert.match(response.headers[name], /private, no-store/);
    assert.match(response.headers.vary, /Cookie/);
  }
});

test('malformed and ambiguous cookies fail closed, and invalid expiry cannot become permanent', async () => {
  const fixture = createAuthFixture(), { cookie } = await login(fixture);
  for (const invalid of ['mc_session=%', cookie + '; ' + cookie, cookie + '; mc_session=another', 'mc_session=']) {
    assert.equal(await currentUser(request('/api/auth/session', undefined, invalid), fixture.sql), null);
  }
  for (const row of fixture.sessions.values()) row.expires_at = 'invalid-date';
  assert.equal(await currentUser(request('/api/auth/session', undefined, cookie), fixture.sql), null);
  assert.equal(fixture.sessions.size, 0);
  const defaultToken = await createSession(fixture.sql, 'fixture-member');
  assert.equal((await currentUser(request('/api/auth/session', undefined, sessionCookie(defaultToken)), fixture.sql)).emailVerified, false, 'Password sessions still require the existing email step-up');
});

test('redirects preserve deep links and queries without allowing a foreign destination', () => {
  const target = '/classroom/awaken/notebook/?from=dungeon&work=craft-123&entry=compass#restore';
  assert.equal(safeRelativeReturn(target), target);
  const long = '/learn/?course=ai-sauce&lesson=ADV01&return=' + encodeURIComponent(target) + '&campaign=' + 'a'.repeat(350);
  assert.equal(safeRelativeReturn(long), long, 'Existing query values are not truncated at 300 bytes');
  assert.equal(safeRelativeReturn('/learn/?return=' + encodeURIComponent('https://example.test/a')), '/learn/?return=' + encodeURIComponent('https://example.test/a'));
  for (const invalid of [undefined, 'https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2f%2fevil.test', '/%0d%0aLocation:evil', '/bad%xx', '/\n/evil.test', '/x?' + 'a'.repeat(4096)]) {
    assert.equal(safeRelativeReturn(invalid, null), null, String(invalid));
  }
});
