import test from 'node:test';
import assert from 'node:assert/strict';
import middleware from '../../middleware.js';
import { PUBLIC_ASSET_CACHE_HEADERS, publicAssetPath } from '../../routing/public-assets.js';
import { COURSE_COOKIE_NAME, COURSE_SESSION_TTL_SECONDS, issueCourseSession } from '../../api/_lib/course-access.js';

const fixture = {
  COURSE_DENT_PASSWORD: 'routing-only-fixture-password',
  COURSE_SESSION_SECRET: 'routing-fixture-signing-secret-12345678901234567890',
  VERCEL_ENV: 'production',
};
const previous = Object.fromEntries(Object.keys(fixture).map(key=>[key,process.env[key]]));
Object.assign(process.env,fixture);
test.after(()=>{
  for (const [key,value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key]=value;
  }
});
const sessions = [
  undefined,
  'mc_session=forged; ' + COURSE_COOKIE_NAME + '=true',
  `${COURSE_COOKIE_NAME}=${await issueCourseSession(fixture)}`,
  `${COURSE_COOKIE_NAME}=${await issueCourseSession(fixture,Date.now()-(COURSE_SESSION_TTL_SECONDS+10)*1000)}`,
];
const request = (pathname,cookie,method='GET') => middleware(new Request(`https://www.myclover.com${pathname}`,{
  method,headers:cookie?{cookie}:{},
}));
const destination = response => {
  const value = response.headers.get('x-middleware-rewrite');
  return value ? new URL(value) : null;
};
function assertPublicStatic(response,pathname) {
  const url = new URL(pathname,'https://www.myclover.com');
  const physical = publicAssetPath(url.pathname);
  assert.ok(physical,pathname);
  assert.equal(response.status,200,pathname);
  assert.equal(response.headers.get('location'),null,pathname);
  assert.equal(response.headers.get('set-cookie'),null,pathname);
  assert.equal(response.headers.get('vary'),null,pathname);
  for (const [name,value] of Object.entries(PUBLIC_ASSET_CACHE_HEADERS)) assert.equal(response.headers.get(name),value,pathname);
  if (physical === url.pathname) {
    assert.equal(response.headers.get('x-middleware-next'),'1',pathname);
    assert.equal(destination(response),null,pathname);
  } else {
    assert.equal(response.headers.get('x-middleware-next'),null,pathname);
    assert.equal(destination(response)?.pathname,physical,pathname);
    assert.equal(destination(response)?.search,url.search,pathname);
  }
  assert.ok(!destination(response)?.pathname.startsWith('/api/'),pathname);
}
function assertNoPublicCache(response,pathname) {
  for (const name of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control']) {
    assert.doesNotMatch(response.headers.get(name)||'',/\bpublic\b|immutable/,`${pathname}: ${name}`);
  }
}

test('images and public CSS/fonts/runtime stay static for missing, fake, valid and expired sessions',async()=>{
  const assets = [
    '/classroom/awaken/notebook/img/nb-01.jpg', '/classroom/awaken/notebook/img/nb-02s.webp?v=review',
    '/classroom/img/header-lesson6.webp', '/classroom/sauce-cup/header-prologue.webp',
    '/course/thedent912/opening/slide-20.jpg', '/course/thedent912/followup-qr.svg',
    '/course/thedent912/course.css', '/course/thedent912/fonts/ibm-plex-sans-thai-thai-400.woff2',
    '/course/thedent912/opening.js', '/course/thedent912/evaluation.js',
    '/assets/account.js', '/learn/assets/learn.css', '/shelf/shelf.js',
    '/course/admin/reviews/reviews.css', '/course/admin/reviews/reviews.js',
    '/course/review-consent/consent.css', '/course/review-consent/consent.js',
    '/media/home-opening-bg.mp4', '/ako/assets/ako-real-eating-onion-hero.m4v',
    '/hf/assets/example-ako.mp4',
    '/shelf/admin/admin.css', '/forge/original/01.jpeg',
    '/xircle/assets/product/astamega-320.webp', '/xvisor/quest/assets/teem-ako-guides-v2.png',
  ];
  for (const pathname of assets) for (const cookie of sessions) for (const method of ['GET','HEAD']) {
    assertPublicStatic(await request(pathname,cookie,method),pathname);
  }
});

test('legacy public asset aliases preserve URL queries and resolve directly to physical static assets',async()=>{
  for (const pathname of [
    '/learn/classroom/img/header-lesson1.webp?v=20260915',
    '/learn/classroom/awaken/notebook/img/nb-01.jpg?from=dungeon',
    '/course/thedent912/opening/slide-01.jpg?v=1&file=resources%2Fanswer-key.md',
    '/course/thedent/opening/slide-01.jpg',
    '/course/thedent912/course.css?v=2',
  ]) for (const cookie of sessions) assertPublicStatic(await request(pathname,cookie),pathname);
});

test('new or private image-looking paths inside protected storage never get a public static bypass',async()=>{
  for (const pathname of [
    '/classroom/private/member.jpg', '/classroom/backups/internal.png', '/classroom/img/unreviewed.jpg',
  ]) for (const cookie of sessions) {
    const response=await request(pathname,cookie);
    assert.equal(destination(response)?.pathname,'/api/learn-foundation',pathname);
    assert.equal(destination(response)?.searchParams.get('file'),pathname.slice('/classroom/'.length),pathname);
    assert.equal(response.headers.get('x-middleware-next'),null,pathname);
    assert.match(response.headers.get('cache-control'),/private.*no-store/,pathname);
    assertNoPublicCache(response,pathname);
  }
  for (const pathname of [
    '/course/thedent912/resources/private.jpg', '/course/thedent912/opening/unreviewed.png',
  ]) for (const cookie of sessions) {
    const response=await request(pathname,cookie);
    assert.equal(response.headers.get('x-middleware-next'),null,pathname);
    assertNoPublicCache(response,pathname);
    if (cookie===sessions[2]) assert.equal(destination(response)?.pathname,'/api/course-content',pathname);
    else assert.equal(response.status,401,pathname);
  }
  for (const pathname of ['/shelf/internal.png']) for (const cookie of sessions) {
    const response=await request(pathname,cookie);
    assert.equal(response.status,403,pathname);
    assert.equal(destination(response),null,pathname);
    assert.equal(response.headers.get('x-middleware-next'),null,pathname);
    assertNoPublicCache(response,pathname);
  }
});

test('legacy shelf redirects carry private cache policy for every session state',async()=>{
  for(const pathname of ['/shelf/source','/shelf/source/','/shelf/source/private.jpg',
    '/shelf/source/method/source.md?from=old-link','/shelf/catalog.json','/shelf/README.md','/shelf/CHANGELOG.md']){
    for(const cookie of sessions)for(const method of ['GET','HEAD']){
      const response=await request(pathname,cookie,method);
      assert.equal(response.status,307,pathname);
      assert.equal(destination(response),null,pathname);
      assert.equal(response.headers.get('x-middleware-next'),null,pathname);
      const target=new URL(response.headers.get('location'));
      assert.equal(target.pathname,'/shelf/',pathname);
      assert.equal(target.search,new URL(pathname,'https://www.myclover.com').search,pathname);
      assert.match(response.headers.get('cache-control'),/private.*no-store/,pathname);
      assert.equal(response.headers.get('cdn-cache-control'),'no-store',pathname);
      assert.equal(response.headers.get('vercel-cdn-cache-control'),'no-store',pathname);
      assertNoPublicCache(response,pathname);
    }
  }
});

test('private HTML and lesson payloads keep authentication routing and never receive public cache headers',async()=>{
  for (const pathname of [
    '/classroom/awaken/notebook/?from=dungeon', '/classroom/lv5/vault-data.js',
    '/classroom/lv4/myclover-growth-blueprint.pdf',
    '/course/thedent912/', '/course/thedent912/course-content.js',
    '/course/thedent912/course.js', '/course/thedent/course.js',
    '/classroom/media/lesson3-source-example.mp4',
    '/course/thedent912/opening-data.js', '/course/thedent912/tools.js',
    '/course/thedent912/resources/answer-key.md', '/course/thedent912/downloads/the-dent-course-kit.zip',
  ]) for (const cookie of sessions) {
    const response=await request(pathname,cookie);
    assert.equal(response.headers.get('x-middleware-next'),null,pathname);
    assertNoPublicCache(response,pathname);
    if (destination(response)) assert.ok(['/api/course-content','/api/learn-foundation'].includes(destination(response).pathname),pathname);
    else assert.ok([307,401].includes(response.status),pathname);
  }
});

test('API routes remain owned by their handlers and receive no public asset cache headers',async()=>{
  for (const pathname of [
    '/api/learn?action=lesson', '/api/learn-foundation?file=private%2Fphoto.jpg',
    '/api/course-content?file=resources%2Fprivate.jpg', '/api/learn-media?assetId=photo.jpg',
    '/api/teambook-media?code=12345&seq=1', '/api/learn-admin', '/api/members',
    '/api/progress', '/api/auth/me', '/api/shelf?action=source&path=private.jpg',
  ]) for (const cookie of sessions) {
    const response=await request(pathname,cookie);
    assert.equal(response.headers.get('x-middleware-next'),'1',pathname);
    assert.equal(destination(response),null,pathname);
    assertNoPublicCache(response,pathname);
  }
});

test('private media validators reach only the origin request while Cookie and Range are preserved',async()=>{
  for(const method of ['GET','HEAD']) {
    const headers={cookie:'mc_session=fixture-session',range:'bytes=0-1105356',
      'If-None-Match':'W/"current", "older"','If-Match':'"current"','If-Range':'"current"',
      'x-myclover-media-if-none-match':'"forged"','x-myclover-media-if-match':'*','x-myclover-media-if-range':'"forged"'};
    const response=await middleware(new Request('https://www.myclover.com/api/learn-media?courseId=ai-sauce&lessonId=EP09&assetId=fixture',{method,headers}));
    assert.equal(response.headers.get('x-middleware-next'),'1');
    assert.equal(destination(response),null);
    assertNoPublicCache(response,'/api/learn-media');
    const overrides=new Set(response.headers.get('x-middleware-override-headers').split(','));
    for(const name of ['if-none-match','if-match','if-range']) {
      const alias=`x-myclover-media-${name}`;
      assert.ok(overrides.has(alias));
      assert.equal(response.headers.get(`x-middleware-request-${alias}`),new Headers(headers).get(name));
      assert.equal(response.headers.get(alias),null,'aliases must not be ordinary response headers');
      assert.equal(response.headers.get(name),null,'validators must not be ordinary response headers');
    }
    for(const name of ['cookie','range'])assert.equal(response.headers.get(`x-middleware-request-${name}`),headers[name]);
    assert.equal(response.headers.get('cookie'),null);
    assert.equal(response.headers.get('set-cookie'),null);
  }
});

test('media middleware drops forged aliases without real validators and bounds copied header size',async()=>{
  for(const realValue of [null,'x'.repeat(16385)]) {
    const headers={};
    for(const name of ['if-none-match','if-match','if-range']) {
      headers[`x-myclover-media-${name}`]='"forged"';
      if(realValue!==null)headers[name]=realValue;
    }
    const response=await middleware(new Request('https://www.myclover.com/api/learn-media',{headers}));
    const overrides=new Set(response.headers.get('x-middleware-override-headers').split(','));
    for(const name of ['if-none-match','if-match','if-range']) {
      const alias=`x-myclover-media-${name}`;
      assert.ok(!overrides.has(alias));
      assert.equal(response.headers.get(`x-middleware-request-${alias}`),null);
      assert.equal(response.headers.get(alias),null);
    }
    assertNoPublicCache(response,'/api/learn-media');
  }
  const value='x'.repeat(16384);
  const response=await middleware(new Request('https://www.myclover.com/api/learn-media',{headers:{'if-none-match':value}}));
  assert.equal(response.headers.get('x-middleware-request-x-myclover-media-if-none-match'),value);
});

test('validator preservation is restricted to the exact canonical media API route',async()=>{
  for(const pathname of ['/api/learn-media/','/api/learn-media-extra','/api/learn','/api/%6cearn-media','/api//learn-media',
    '/assets/account.js','/classroom/img/header-lesson1.webp','/shelf/source/private.jpg']) {
    const response=await middleware(new Request(`https://www.myclover.com${pathname}`,{headers:{
      'if-none-match':'"current"','x-myclover-media-if-none-match':'"forged"',
    }}));
    assert.equal(response.headers.get('x-middleware-override-headers'),null,pathname);
    assert.equal(response.headers.get('x-middleware-request-x-myclover-media-if-none-match'),null,pathname);
    assert.equal(response.headers.get('x-myclover-media-if-none-match'),null,pathname);
  }
});

test('encoded asset aliases cannot obtain the public policy or bypass protected route validation',async()=>{
  for (const pathname of [
    '/%63lassroom/img/header-lesson1.webp', '/classroom//img/header-lesson1.webp',
    '/classroom/img/%68eader-lesson1.webp', '/classroom%2fimg/header-lesson1.webp',
    '/course/%74hedent912/opening/slide-01.jpg', '/course/thedent912%2fopening/slide-01.jpg',
    '/course/THEdent912/opening/slide-01.jpg', '/learn/classroom/%69mg/header-lesson1.webp',
  ]) for (const cookie of sessions) {
    const response=await request(pathname,cookie);
    assert.equal(response.status,404,pathname);
    assert.equal(response.headers.get('x-middleware-next'),null,pathname);
    assert.equal(destination(response),null,pathname);
    assertNoPublicCache(response,pathname);
  }
});

test('ordinary public page routes do not acquire a new login gate',async()=>{
  for (const pathname of ['/', '/forge/', '/forge/original/', '/xircle/', '/xvisor/', '/course/', '/learn/', '/shelf/']) {
    const response=await request(pathname);
    assert.equal(response.headers.get('x-middleware-next'),'1',pathname);
    assert.equal(response.headers.get('location'),null,pathname);
    assert.equal(destination(response),null,pathname);
  }
});
