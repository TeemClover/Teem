import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COURSE_COOKIE_NAME, COURSE_SESSION_TTL_SECONDS, issueCourseSession } from '../../api/_lib/course-access.js';

// Exercise the actual middleware without installing the Vercel runtime locally.
// Only the framework response helpers are adapted; all routing/auth code is real.
const platform = `export const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
export const rewrite = url => new Response(null, { headers: { 'x-middleware-rewrite': String(url) } });`;
const source = await readFile(new URL('../../middleware.js', import.meta.url), 'utf8');
assert.match(source, /from '@vercel\/functions'/);
assert.match(source, /from '\.\/api\/_lib\/course-access\.js'/);
const adapted = source
  .replace("'@vercel/functions'", JSON.stringify(`data:text/javascript,${encodeURIComponent(platform)}`))
  .replace("'./api/_lib/course-access.js'", JSON.stringify(new URL('../../api/_lib/course-access.js', import.meta.url).href));
const { default: middleware, config } = await import(`data:text/javascript,${encodeURIComponent(adapted)}`);

const fixture = {
  COURSE_DENT_PASSWORD: 'middleware-fixture-password-6721',
  COURSE_SESSION_SECRET: 'middleware-fixture-secret-only-849560712304857169',
  VERCEL_ENV: 'production',
};
const saved = Object.fromEntries(Object.keys(fixture).map(key => [key, process.env[key]]));
Object.assign(process.env, fixture);
test.after(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const cookie = `${COURSE_COOKIE_NAME}=${await issueCourseSession(fixture)}`;
const expired = `${COURSE_COOKIE_NAME}=${await issueCourseSession(fixture, Date.now() - (COURSE_SESSION_TTL_SECONDS + 10) * 1000)}`;
const invoke = (pathname, session, host = 'www.myclover.com') => middleware(new Request(`https://${host}${pathname}`, { headers: session ? { cookie: session } : {} }));
const assertNext = (response, label) => {
  assert.equal(response.headers.get('x-middleware-next'), '1', label);
  assert.equal(response.headers.get('location'), null, label);
  assert.equal(response.headers.get('x-middleware-rewrite'), null, label);
};
const assertPrivate = (response, label) => {
  assert.match(response.headers.get('cache-control'), /private.*no-store/, label);
  assert.equal(response.headers.get('cdn-cache-control'), 'no-store', label);
  assert.equal(response.headers.get('vercel-cdn-cache-control'), 'no-store', label);
  assert.equal(response.headers.get('vary'), 'Cookie', label);
  assert.equal(response.headers.get('x-middleware-next'), null, label);
  assert.equal(response.headers.get('x-middleware-rewrite'), null, label);
};

test('matcher intercepts every path, including encoded names and dotted assets', () => {
  assert.equal(config.matcher, '/:path*');
});

test('canonical classroom documents require login and preserve destination/query', async () => {
  for (const pathname of ['/course/thedent', '/course/thedent/', '/course/thedent/index.html', '/course/thedent/daily-brief.html?demo=1']) {
    const result = await invoke(pathname);
    assert.equal(result.status, 307, pathname);
    const destination = new URL(result.headers.get('location'));
    assert.equal(destination.origin, 'https://www.myclover.com');
    assert.equal(destination.pathname, '/course/');
    assert.equal(destination.searchParams.get('project'), 'thedent');
    assert.equal(destination.searchParams.get('next'), pathname === '/course/thedent' ? '/course/thedent/' : pathname);
    assertPrivate(result, pathname);
  }
});

test('every classroom asset type denies unsigned, forged, tampered and expired sessions', async () => {
  for (const pathname of [
    '/course/thedent/course-content.js', '/course/thedent/course.css',
    '/course/thedent/resources/instructor-guide.md', '/course/thedent/resources/demo.csv',
    '/course/thedent/downloads/the-dent-course-kit.zip', '/course/thedent/fonts/font.woff2',
  ]) {
    for (const session of [undefined, `${COURSE_COOKIE_NAME}=true`, `${cookie.slice(0, -1)}!`, expired]) {
      const result = await invoke(pathname, session);
      assert.equal(result.status, 401, pathname);
      assertPrivate(result, pathname);
    }
  }
});

test('encoded and normalized classroom aliases never reach public static serving, even when signed in', async () => {
  const aliases = [
    '/course/%74hedent/course-content.js',
    '/course/thedent%2fcourse-content.js',
    '/course/thedent%2Fcourse-content.js',
    '/%63ourse/thedent/course-content.js',
    '/course/%2574hedent/course-content.js',
    '/course/thedent%252fcourse-content.js',
    '/course/%74hedent/index.html',
    '/course/%74hedent/resources/instructor-guide.md',
    '/course/%74hedent/resources/demo.csv',
    '/course/%74hedent/downloads/the-dent-course-kit.zip',
    '/course/%74hedent/fonts/font.woff2',
    '/course/%74hedent',
    '/course//thedent/course-content.js',
    '/course%5cthedent%5ccourse-content.js',
    '/course/THEdent/course-content.js',
    '/COURSE/thedent/course-content.js',
    '/course/thedent/%63ourse-content.js',
    '/course/thedent/extra%2f..%2fcourse-content.js',
  ];
  for (const pathname of aliases) {
    for (const session of [undefined, cookie]) {
      const result = await invoke(pathname, session);
      assert.equal(result.status, 404, pathname);
      assertPrivate(result, pathname);
    }
  }
});

test('malformed, control-character and excessively encoded paths fail closed', async () => {
  for (const pathname of [
    '/course/thedent/%FF', '/course/%74hedent%00/course-content.js',
    '/course/thedent%3fcourse-content.js', '/course/thedent%23/course-content.js',
    '/course/%252525252525252574hedent/course-content.js',
  ]) {
    const result = await invoke(pathname, cookie);
    assert.equal(result.status, 400, pathname);
    assertPrivate(result, pathname);
  }
});

test('valid sessions pass canonical content; extensionless root retains slash canonicalization', async () => {
  for (const pathname of ['/course/thedent/', '/course/thedent/index.html', '/course/thedent/course-content.js', '/course/thedent/resources/instructor-guide.md']) {
    assertNext(await invoke(pathname, cookie), pathname);
  }
  const root = await invoke('/course/thedent?demo=1', cookie);
  assert.equal(root.status, 307);
  assert.equal(root.headers.get('location'), 'https://www.myclover.com/course/thedent/?demo=1');
});

test('public portal, API, platform internals and preexisting dotted paths remain untouched', async () => {
  for (const pathname of [
    '/', '/course/', '/course/index.html', '/course/another-project/',
    '/api/course-access', '/api/course-content?file=course-content.js', '/api/auth',
    '/_next/static/chunk.js', '/_vercel/insights/script.js',
    '/assets/app.js', '/robots.txt', '/folder.with.dot/page', '/ako/index.html',
  ]) assertNext(await invoke(pathname), pathname);
  const normalPage = await invoke('/xvisor?lang=th');
  assert.equal(normalPage.status, 307);
  assert.equal(normalPage.headers.get('location'), 'https://www.myclover.com/xvisor/?lang=th');
});

test('Ako root rewrite and preview-only behavior remain scoped to the original routes', async () => {
  const ako = await invoke('/', undefined, 'ako.myclover.com');
  assert.equal(ako.headers.get('x-middleware-rewrite'), 'https://ako.myclover.com/ako/index.html');
  assertNext(await invoke('/assets/app.js', undefined, 'ako.myclover.com'));
  assertNext(await invoke('/?__ako_preview=1'));
  process.env.VERCEL_ENV = 'preview';
  try {
    const preview = await invoke('/?__ako_preview=1');
    assert.equal(preview.headers.get('x-middleware-rewrite'), 'https://www.myclover.com/ako/index.html');
    assertNext(await invoke('/course/?__ako_preview=1'));
  } finally { process.env.VERCEL_ENV = fixture.VERCEL_ENV; }
});
