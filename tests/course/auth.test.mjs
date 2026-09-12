import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import vm from 'node:vm';
import {
  COURSE_COOKIE_NAME, COURSE_SESSION_TTL_SECONDS, courseSessionCookie,
  issueCourseSession, verifyCoursePassword, verifyCourseSession,
} from '../../api/_lib/course-access.js';
import { createCourseAccessHandler } from '../../api/course-access.js';
import { createCourseContentHandler, resolveCourseContentPath } from '../../api/course-content.js';
import { createCourseRateLimiter } from '../../api/_lib/course-rate-limit.js';

const env = { COURSE_DENT_PASSWORD: 'course-test-fixture-482-access', COURSE_SESSION_SECRET: 'fixture-session-secret-only-82619357041289376052' };
const now = Date.UTC(2026, 8, 12, 7);
const request = (body, extra = {}) => ({ method: 'POST', headers: { host: 'classroom.example', origin: 'https://classroom.example', 'content-type': 'application/json' }, body, ...extra });
function response() {
  return { statusCode: 0, headers: {}, body: undefined, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, end(body) { this.body = body; } };
}
async function invoke(handler, req) { const res = response(); await handler(req, res); return res; }
async function validCookie(settings = env, time = now) { return `${COURSE_COOKIE_NAME}=${await issueCourseSession(settings, time)}`; }

test('sessions require a genuine signature, a valid clock, and unique cookie', async () => {
  const cookie = await validCookie();
  assert.equal(JSON.parse(Buffer.from(cookie.split('=')[1].split('.')[0], 'base64url')).scope, 'thedent', 'URL migration preserves the signed session scope');
  assert.equal(COURSE_SESSION_TTL_SECONDS, 400 * 24 * 60 * 60);
  assert.equal(await verifyCourseSession(cookie, env, now), true);
  assert.equal(await verifyCourseSession(cookie, env, now + 180 * 24 * 60 * 60 * 1000), true);
  assert.equal(await verifyCourseSession(cookie, env, now + COURSE_SESSION_TTL_SECONDS * 1000), false);
  assert.equal(await verifyCourseSession(await validCookie(env, now + 120000), env, now), false);
  assert.equal(await verifyCourseSession(`${cookie}; ${cookie}`, env, now), false);
  assert.equal(await verifyCourseSession(`${COURSE_COOKIE_NAME}=true`, env, now), false);
  assert.equal(await verifyCourseSession(`${cookie.slice(0, -1)}!`, env, now), false);
  const [payload, signature] = cookie.split('=')[1].split('.');
  assert.equal(await verifyCourseSession(`${COURSE_COOKIE_NAME}=${payload.slice(0, -2)}AA.${signature}`, env, now), false);
  assert.equal(await verifyCourseSession(`${COURSE_COOKIE_NAME}=${'x'.repeat(9000)}`, env, now), false);
});

test('rotating password or signing secret revokes existing sessions; missing configuration fails closed', async () => {
  const cookie = await validCookie();
  assert.equal(await verifyCourseSession(cookie, { ...env, COURSE_DENT_PASSWORD: 'a-different-test-password' }, now), false);
  assert.equal(await verifyCourseSession(cookie, { ...env, COURSE_SESSION_SECRET: 'a-different-fixture-secret-that-is-long-enough' }, now), false);
  for (const settings of [{}, { ...env, COURSE_SESSION_SECRET: 'short' }, { ...env, COURSE_DENT_PASSWORD: '' }]) {
    assert.equal(await verifyCourseSession(cookie, settings, now), false);
    assert.equal(await verifyCoursePassword(env.COURSE_DENT_PASSWORD, settings), false);
    await assert.rejects(issueCourseSession(settings, now));
  }
  assert.equal(await verifyCoursePassword(env.COURSE_DENT_PASSWORD, env), true);
  assert.equal(await verifyCoursePassword('wrong-test-password', env), false);
  assert.equal(await verifyCoursePassword('x'.repeat(1025), env), false);
  assert.equal(await verifyCoursePassword({ password: env.COURSE_DENT_PASSWORD }, env), false);
  const serialized = courseSessionCookie(cookie.slice(cookie.indexOf('=') + 1));
  for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax', `Max-Age=${COURSE_SESSION_TTL_SECONDS}`]) assert.ok(serialized.includes(attribute));
  assert.ok(!serialized.includes('Domain='));
  assert.ok(!serialized.includes(env.COURSE_DENT_PASSWORD));
});

test('login allows only the dent project and logout clears the same secure cookie', async () => {
  const handler = createCourseAccessHandler({ env, now: () => now });
  const success = await invoke(handler, request({ project: 'thedent', password: env.COURSE_DENT_PASSWORD }));
  assert.equal(success.statusCode, 200);
  assert.deepEqual(JSON.parse(success.body), { ok: true, redirect: '/course/thedent912/' });
  assert.equal(await verifyCourseSession(success.headers['set-cookie'], env, now), true);
  assert.match(success.headers['cache-control'], /no-store/);
  for (const project of ['another-course', 'thedent912', '', null, 'THEDENT']) {
    const denied = await invoke(handler, request({ project, password: env.COURSE_DENT_PASSWORD }));
    assert.equal(denied.statusCode, 401);
    assert.equal(denied.headers['set-cookie'], undefined);
  }
  const wrong = await invoke(handler, request({ project: 'thedent', password: 'wrong-fixture' }));
  assert.equal(wrong.statusCode, 401);
  assert.equal(wrong.headers['set-cookie'], undefined);
  const logout = await invoke(handler, request({ action: 'logout' }));
  assert.equal(logout.statusCode, 200);
  assert.match(logout.headers['set-cookie'], new RegExp(`^${COURSE_COOKIE_NAME}=`));
  assert.match(logout.headers['set-cookie'], /Max-Age=0/);
  assert.match(logout.headers['set-cookie'], /Path=\//);
  const unavailable = await invoke(createCourseAccessHandler({ env: {} }), request({ project: 'thedent', password: env.COURSE_DENT_PASSWORD }));
  assert.equal(unavailable.statusCode, 503);
});

test('remembered-device status verifies and renews a session without a password or login-rate charge', async () => {
  const day = 24 * 60 * 60 * 1000;
  const returnTime = now + 399 * day;
  const handler = createCourseAccessHandler({ env, now: () => returnTime, limiter: {
    consume: async () => { assert.fail('An authenticated status check must not charge a login attempt'); },
  } });
  const cookie = await validCookie();
  const statusRequest = (project = 'thedent', session = cookie) => {
    const req = request({ action: 'status', project });
    req.headers.cookie = session;
    return req;
  };
  const remembered = await invoke(handler, statusRequest());
  assert.equal(remembered.statusCode, 200);
  assert.deepEqual(JSON.parse(remembered.body), { ok: true, redirect: '/course/thedent912/' });
  assert.match(remembered.headers['set-cookie'], /Max-Age=34560000/);
  assert.match(remembered.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax/);
  assert.equal(await verifyCourseSession(remembered.headers['set-cookie'], env, returnTime + 399 * day), true);
  assert.equal(await verifyCourseSession(cookie, env, returnTime + 2 * day), false);
  assert.ok(!remembered.headers['set-cookie'].includes(env.COURSE_DENT_PASSWORD));
  for (const project of ['cloverx', 'pir-academy', 'THEDENT', undefined]) {
    const req = statusRequest(project); req.body.project = project;
    const denied = await invoke(handler, req);
    assert.equal(denied.statusCode, 401);
    assert.equal(denied.headers['set-cookie'], undefined);
  }
  for (const session of ['', `${COURSE_COOKIE_NAME}=true`, `${cookie.slice(0, -1)}!`, await validCookie(env, now - 2 * day)]) {
    const denied = await invoke(handler, statusRequest('thedent', session));
    assert.equal(denied.statusCode, 401);
    assert.equal(denied.headers['set-cookie'], undefined);
  }
  const crossOrigin = statusRequest(); crossOrigin.headers.origin = 'https://attacker.example';
  assert.equal((await invoke(handler, crossOrigin)).statusCode, 403);
  const rotated = createCourseAccessHandler({ env: { ...env, COURSE_DENT_PASSWORD: 'different-fixture-password' }, now: () => returnTime });
  assert.equal((await invoke(rotated, statusRequest())).statusCode, 401);
  const logout = await invoke(handler, request({ action: 'logout' }));
  assert.match(logout.headers['set-cookie'], /Max-Age=0/);
  assert.equal((await invoke(handler, statusRequest('thedent', logout.headers['set-cookie']))).statusCode, 401);
});

test('previously issued 30-day signed cookies are upgraded on return without asking again', async () => {
  // Reproduce the payload issued by the previous release using test credentials.
  const original = await issueCourseSession(env, now);
  const payload = JSON.parse(Buffer.from(original.split('.')[0], 'base64url').toString());
  payload.exp = payload.iat + 30 * 24 * 60 * 60;
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const material = new TextEncoder().encode(JSON.stringify(['myclover-course-v1', env.COURSE_SESSION_SECRET, env.COURSE_DENT_PASSWORD]));
  const key = await crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded))).toString('base64url');
  const legacy = `${COURSE_COOKIE_NAME}=${encoded}.${signature}`;
  const day = 24 * 60 * 60 * 1000;
  assert.equal(await verifyCourseSession(legacy, env, now + 29 * day), true);
  assert.equal(await verifyCourseSession(legacy, env, now + 30 * day), false);
  const handler = createCourseAccessHandler({ env, now: () => now + 29 * day });
  const req = request({ action: 'status', project: 'thedent' }); req.headers.cookie = legacy;
  const upgraded = await invoke(handler, req);
  assert.equal(upgraded.statusCode, 200);
  assert.equal(await verifyCourseSession(upgraded.headers['set-cookie'], env, now + 428 * day), true);
});

test('login enforces method, same-origin, JSON and body limits including unparsed streams', async () => {
  const handler = createCourseAccessHandler({ env, now: () => now });
  for (const method of ['GET', 'PUT']) assert.equal((await invoke(handler, request({}, { method }))).statusCode, 405);
  const body = { project: 'thedent', password: env.COURSE_DENT_PASSWORD };
  for (const origin of [undefined, 'null', 'https://attacker.example', 'https://classroom.example.attacker.example', 'http://classroom.example']) {
    const req = request(body); req.headers.origin = origin;
    assert.equal((await invoke(handler, req)).statusCode, 403);
  }
  const wrongType = request(body); wrongType.headers['content-type'] = 'text/plain';
  assert.equal((await invoke(handler, wrongType)).statusCode, 415);
  assert.equal((await invoke(handler, request('{bad JSON'))).statusCode, 400);
  assert.equal((await invoke(handler, request([]))).statusCode, 400);
  assert.equal((await invoke(handler, request({ padding: 'x'.repeat(5000) }))).statusCode, 413);
  const declaredLarge = request(body); declaredLarge.headers['content-length'] = '5000';
  assert.equal((await invoke(handler, declaredLarge)).statusCode, 413);
  const streamed = Readable.from([JSON.stringify(body)]);
  Object.assign(streamed, request(undefined));
  assert.equal((await invoke(handler, streamed)).statusCode, 200);
  const streamedLarge = Readable.from(['x'.repeat(5000)]);
  Object.assign(streamedLarge, request(undefined));
  assert.equal((await invoke(handler, streamedLarge)).statusCode, 413);
});

test('login obeys shared throttling and fails closed on rate-store errors', async () => {
  const body = { project: 'thedent', password: env.COURSE_DENT_PASSWORD };
  const blocked = createCourseAccessHandler({ env, limiter: { consume: async () => ({ allowed: false, retryAfter: 91 }) } });
  const limited = await invoke(blocked, request(body));
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers['retry-after'], '91');
  assert.equal(limited.headers['set-cookie'], undefined);
  const failed = createCourseAccessHandler({ env, limiter: { consume: async () => { throw new Error('fixture database failure'); } } });
  assert.equal((await invoke(failed, request(body))).statusCode, 503);
  const noDatabase = createCourseAccessHandler({ env: { ...env, VERCEL: '1' } });
  assert.equal((await invoke(noDatabase, request(body))).statusCode, 503);
  let clears = 0;
  const allowed = createCourseAccessHandler({ env, now: () => now, limiter: { consume: async () => ({ allowed: true, key: 'fixture-key' }), clear: async (key) => { assert.equal(key, 'fixture-key'); clears += 1; } } });
  assert.equal((await invoke(allowed, request(body))).statusCode, 200);
  assert.equal(clears, 1);
  assert.equal((await invoke(allowed, request({ ...body, password: 'incorrect-test' }))).statusCode, 401);
  assert.equal(clears, 1);
});

test('rate-store operations use one isolated table, atomic parameterized increment and hashed addresses', async () => {
  const calls = [];
  const query = async (text, values) => {
    calls.push({ text, values });
    if (text.startsWith('INSERT')) return [{ attempts: 31, retry_after: 123 }];
    return [];
  };
  const limiter = createCourseRateLimiter({ env: { ...env, VERCEL: '1' }, query });
  const rawIP = '192.0.2.51';
  const result = await limiter.consume({ headers: { 'x-forwarded-for': rawIP } }, 'thedent');
  assert.equal(result.allowed, false);
  assert.equal(result.retryAfter, 123);
  assert.match(result.key, /^[a-f0-9]{64}$/);
  const insert = calls.find((call) => call.text.startsWith('INSERT'));
  assert.match(insert.text, /ON CONFLICT \(bucket_key\) DO UPDATE/);
  assert.deepEqual(insert.values, [result.key, 30]);
  assert.ok(calls.every((call) => call.text.includes('public.course_dent_login_rate_limit')));
  assert.ok(!JSON.stringify(calls).includes(rawIP));
  assert.ok(calls.some((call) => /LIMIT 100/.test(call.text)));
  await limiter.clear(result.key);
  assert.match(calls.at(-1).text, /WHERE bucket_key = \$1/);
  assert.deepEqual(calls.at(-1).values, [result.key]);
  await assert.rejects(limiter.consume({ headers: {} }, 'other-project'));
});

test('development fallback is bounded, resets successful clients and advances windows', async () => {
  let clock = now;
  const limiter = createCourseRateLimiter({ env, now: () => clock });
  const req = { headers: { 'x-forwarded-for': '192.0.2.99' } };
  let result;
  for (let attempt = 0; attempt < 30; attempt += 1) assert.equal((await limiter.consume(req)).allowed, true);
  result = await limiter.consume(req);
  assert.equal(result.allowed, false);
  await limiter.clear(result.key);
  assert.equal((await limiter.consume(req)).allowed, true);
  for (let attempt = 0; attempt < 30; attempt += 1) await limiter.consume(req);
  clock += 300000;
  assert.equal((await limiter.consume(req)).allowed, true);
});

test('content validates an explicit allowlist, authenticates direct access, and handles HEAD', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'course-auth-fixture-'));
  const base = path.join(root, 'course', 'thedent');
  await mkdir(path.join(base, 'resources'), { recursive: true });
  await writeFile(path.join(base, 'index.html'), '<h1>Fixture classroom</h1>');
  await writeFile(path.join(base, 'course.js'), 'window.fixture = true;');
  await writeFile(path.join(base, 'evaluation.html'), '<h1>Fixture evaluation</h1>');
  await writeFile(path.join(base, 'followup-qr.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await writeFile(path.join(base, 'resources', 'clinic-public-source.md'), '# Fixture source\n\nPublic reference.\n');
  const handler = createCourseContentHandler({ env, root, now: () => now });
  const cookie = await validCookie();
  const get = (file, extra = {}) => ({ method: 'GET', url: `/api/course-content?file=${encodeURIComponent(file)}`, headers: { cookie }, ...extra });
  try {
    assert.equal((await invoke(handler, get('index.html', { headers: {} }))).statusCode, 401);
    assert.equal((await invoke(handler, { method: 'GET', url: '/api/course-content', headers: {} })).statusCode, 401);
    assert.equal((await invoke(handler, get('resources/clinic-public-source.md', { headers: { cookie: `${COURSE_COOKIE_NAME}=true` } }))).statusCode, 401);
    const deployment = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
    const rootRewrite = deployment.rewrites.find((route) => route.source === '/course/thedent912');
    assert.ok(rootRewrite, 'The protected classroom root must have a configured rewrite');
    for (const room of ['thedent', 'thedent912']) {
      assert.equal(deployment.rewrites.find(route => route.source === `/course/${room}/:path*`)?.destination, '/api/course-content?file=:path*', `${room} must never fall through to static files`);
      assert.ok(deployment.headers.find(route => route.source === `/course/${room}/:path*`)?.headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-store')));
    }
    assert.equal(deployment.functions['api/course-content.js'].includeFiles, 'course/thedent/**', 'Physical course directory remains unchanged');
    const rewrittenRoot = await invoke(handler, { method: 'GET', url: rootRewrite.destination, headers: { cookie } });
    assert.equal(rewrittenRoot.statusCode, 200);
    assert.match(String(rewrittenRoot.body), /Fixture classroom/);
    assert.equal(await verifyCourseSession(rewrittenRoot.headers['set-cookie'], env, now), true);
    assert.equal((await invoke(handler, { method: 'GET', url: '/course/thedent912/', query: { file: '' }, headers: { cookie } })).statusCode, 200);
    assert.equal((await invoke(handler, { method: 'GET', url: '/api/course-content?unexpected=1', headers: { cookie } })).statusCode, 400);
    const page = await invoke(handler, get('index.html'));
    assert.equal(page.statusCode, 200);
    assert.match(String(page.body), /Fixture classroom/);
    assert.equal(page.headers.vary, 'Cookie');
    assert.match(page.headers['cache-control'], /private.*no-store/);
    assert.equal(page.headers['vercel-cdn-cache-control'], 'no-store');
    assert.equal(await verifyCourseSession(page.headers['set-cookie'], env, now), true);
    assert.match(page.headers['set-cookie'], /Max-Age=34560000/);
    for (const file of ['evaluation.html', 'followup-qr.svg']) {
      const request = { method: 'GET', url: `/course/thedent912/${file}`, headers: { cookie } };
      const allowed = await invoke(handler, request);
      assert.equal(allowed.statusCode, 200, file);
      assert.match(allowed.headers['cache-control'], /private.*no-store/);
      assert.equal((await invoke(handler, { ...request, headers: {} })).statusCode, 401, file);
      if (file.endsWith('.svg')) assert.equal(allowed.headers['content-type'], 'image/svg+xml');
    }
    const script = await invoke(handler, get('course.js'));
    assert.equal(script.statusCode, 200);
    assert.match(script.headers['content-type'], /^application\/javascript/);
    assert.equal(script.headers['set-cookie'], undefined);
    for (const method of ['GET', 'HEAD']) {
      const source = await invoke(handler, get('resources/clinic-public-source.md', { method }));
      assert.equal(source.statusCode, 200);
      assert.equal(source.headers['content-disposition'], 'attachment; filename="clinic-public-source.md"');
      assert.match(source.headers['content-type'], /^text\/markdown/);
    }
    const head = await invoke(handler, get('index.html', { method: 'HEAD' }));
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, undefined);
    assert.equal(head.headers['set-cookie'], undefined);
    assert.equal(Number(head.headers['content-length']), new TextEncoder().encode('<h1>Fixture classroom</h1>').length);
    for (const file of ['../index.html', '/index.html', '%2e%2e/index.html', 'resources/../../package.json', 'resources\\clinic-public-source.md', 'build.mjs', 'index.html?x=1']) {
      assert.equal(resolveCourseContentPath(file, root), null);
      assert.equal((await invoke(handler, get(file))).statusCode, 400);
    }
    assert.equal((await invoke(handler, { method: 'GET', url: '/api/course-content?file=index.html&file=course.js', headers: { cookie } })).statusCode, 400);
    assert.equal((await invoke(handler, { method: 'GET', url: '/api/course-content', query: { file: ['index.html', 'course.js'] }, headers: { cookie } })).statusCode, 400);
    assert.equal((await invoke(handler, { method: 'GET', url: '/course/thedent912/course.js', query: { file: 'course.js' }, headers: { cookie } })).statusCode, 200);
    assert.equal((await invoke(handler, { method: 'GET', url: '/course/thedent912/course.js?file=index.html', headers: { cookie } })).statusCode, 400);
    assert.equal((await invoke(handler, { method: 'GET', url: '/course/thedent912/course.js?lesson=files', query: { file: 'course.js' }, headers: { cookie } })).statusCode, 200);
    for (const url of ['/course/%74hedent912/course.js', '/course/thedent912/%63ourse.js', '/course/thedent/course.js', '/unrelated/course.js']) {
      assert.equal((await invoke(handler, { method: 'GET', url, query: { file: 'course.js' }, headers: { cookie } })).statusCode, 400, url);
      assert.equal((await invoke(handler, { method: 'GET', url, query: { file: 'course.js' }, headers: {} })).statusCode, 401, url);
    }
    assert.equal((await invoke(handler, get('index.html', { method: 'POST' }))).statusCode, 405);
    await writeFile(path.join(root, 'outside.csv'), 'private-fixture');
    await symlink(path.join(root, 'outside.csv'), path.join(base, 'resources', 'website-source-notes.md'));
    assert.equal((await invoke(handler, get('resources/website-source-notes.md'))).statusCode, 404);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('portal returns old and new saved links to the canonical room without losing query or slide hash', async () => {
  const portal = await readFile(new URL('../../course/portal.js', import.meta.url), 'utf8');
  const safeNext = portal.slice(portal.indexOf('  function safeNext('), portal.indexOf('  function setBusy('));
  const enterClassroom = portal.slice(portal.indexOf('  function enterClassroom('), portal.indexOf('  function openProject('));
  assert.ok(safeNext.includes('function safeNext('));
  assert.ok(enterClassroom.includes('function enterClassroom('));
  const loadPortalNavigation = (initialNext, initialHash = '', initialProject = 'thedent') => {
    let assigned;
    const field = { value: 'transient-test-input' };
    const context = vm.createContext({ URL, location: { origin: 'https://classroom.example', assign(value) { assigned = value; } }, field, initialProject, initialNext, initialHash });
    vm.runInContext(safeNext + enterClassroom, context);
    return { context, field, assigned: () => assigned };
  };
  const plain = loadPortalNavigation(null);
  for (const value of ['/course/thedent', '/course/thedent/', '/course/thedent912', '/course/thedent912/']) {
    assert.equal(plain.context.safeNext(value)?.href, 'https://classroom.example/course/thedent912/', value);
  }
  for (const room of ['thedent', 'thedent912']) {
    const input = `/course/${room}/opening.html?lesson=source%20files#7`;
    assert.equal(plain.context.safeNext(input)?.href, 'https://classroom.example/course/thedent912/opening.html?lesson=source%20files#7');
  }
  for (const unsafe of [null, '', '//outside.example/course/thedent912/', 'https://outside.example/course/thedent912/', '/course/thedent912-other/', '/course/THEdent912/', '/course/thedent912/../advance/', '/course/thedent912/%2e%2e/advance/', '/course/thedent%39%31%32/', '/course/thedent912//index.html', '/course/thedent912\\index.html', '/course/thedent912/\nindex.html']) {
    assert.equal(plain.context.safeNext(unsafe), null, String(unsafe));
  }
  const inherited = loadPortalNavigation('/course/thedent/?lesson=files', '#learn/files');
  inherited.context.enterClassroom(inherited.context.safeNext('/course/thedent912/'));
  assert.equal(inherited.assigned(), '/course/thedent912/?lesson=files#learn/files');
  assert.equal(inherited.field.value, '');
  const explicit = loadPortalNavigation('/course/thedent/opening.html?lesson=source#7', '#learn/files');
  explicit.context.enterClassroom(explicit.context.safeNext('/course/thedent912/'));
  assert.equal(explicit.assigned(), '/course/thedent912/opening.html?lesson=source#7');
  const rejected = loadPortalNavigation('//outside.example/', '#learn/files');
  rejected.context.enterClassroom(rejected.context.safeNext('/course/thedent912/'));
  assert.equal(rejected.assigned(), '/course/thedent912/#learn/files');
});
