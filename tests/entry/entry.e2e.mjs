/**
 * Homepage "ปรุงเว็บใน 3 แตะ" acceptance checks (BLUEPRINT v3.0 §12 F3, automated part).
 *
 *   npm run test:entry:ui                                     local copy of the repo (static server)
 *   ENTRY_BASE_URL=https://<deployment> npm run test:entry:ui  a real deployment (Vercel preview/production)
 *
 * Setup from a clean checkout: `npm ci && npx playwright install chromium` (Playwright is a pinned devDependency).
 * Optional: ENTRY_CHROME=/path/to/chrome uses an existing browser build;
 *           VERCEL_AUTOMATION_BYPASS_SECRET opens a protected Vercel preview.
 *
 * Covers: all 64 ?r= demos; three taps on a 375×667 phone with no dead end; screen-reader announcements;
 * changing an answer and replaying; the share link; reduced motion; no 3D before "เข้าบ้าน"; initial JS budget;
 * reading without JavaScript; "เข้าบ้าน" → /tour/?from=home; finale links to /hire/ and /walkthrough/;
 * the "ห้องเรียนของฉัน" entry for enrolled students. Human testing (BLUEPRINT §12 F3) is separate.
 */
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startServer} from './serve.mjs';

const data = JSON.parse(await readFile(new URL('../../entry/data.json', import.meta.url), 'utf8'));
const remote = process.env.ENTRY_BASE_URL?.replace(/\/$/, '');
const local = remote ? null : await startServer();
const base = remote || local.base;
const origin = new URL(base).origin;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const browser = await chromium.launch(process.env.ENTRY_CHROME ? {executablePath: process.env.ENTRY_CHROME} : {});
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); } };
async function open(options = {}) {
  const ctx = await browser.newContext({...options, ...(bypass ? {extraHTTPHeaders: {'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true'}} : {})});
  const page = await ctx.newPage();
  page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  page.close = () => ctx.close();
  return page;
}
const phone = {viewport: {width: 375, height: 667}, isMobile: true, hasTouch: true};
const inView = loc => loc.evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
console.log(`homepage checks against ${base}`);

await check('64 shared demos render and respond', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  let n = 0;
  for (const i of data.industries) for (const f of data.features) for (const s of data.styles) {
    const combo = `${i.key}-${f.key}-${s.key}`;
    await page.goto(`${base}/?r=${combo}`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('[data-widget-body] button', {timeout: 10000});
    assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done', combo);
    assert.equal(await page.locator('.d-brand').textContent(), i.brand, combo);
    assert.equal(await page.locator('#demo').evaluate(el => el.style.getPropertyValue('--demo-accent')), s.vars['--demo-accent'], combo);
    await page.locator('[data-widget-body] button:not([disabled])').first().click();
    assert.equal((await page.locator('#sauce-lines li').allTextContents()).filter(Boolean).length, 6, combo + ' sauce');
    n++;
  }
  assert.equal(n, 64);
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('three taps on a 375×667 phone, with no dead end', async () => {
  const page = await open(phone);
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'empty');
  const firstChoiceBottom = await page.locator('.choice').first().evaluate(e => e.getBoundingClientRect().bottom);
  assert.ok(firstChoiceBottom <= 667, `the first choice is on the first screen (bottom at ${Math.round(firstChoiceBottom)}px)`);
  await page.locator('.leaf').first().tap({force: true}); await page.waitForTimeout(600);
  assert.ok(await inView(page.locator('.choice').first()), 'tapping the glowing leaf shows its choices');
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).tap(); await page.waitForTimeout(800); }
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done');
  assert.equal(await page.locator('.leaf-4').getAttribute('data-state'), 'bloom');
  assert.ok(await page.locator('#finale').isVisible());
  await page.waitForTimeout(900);
  assert.ok(await page.locator('#dock').isVisible(), 'the next step (เข้าบ้าน / จ้างทำแบบนี้) stays on screen once the demo is built');
  assert.equal(await page.locator('#dock a[href="/tour/"][data-enter-house]').count(), 1);
  assert.ok(!(await page.locator('.sauce-lines').isVisible()), 'the sauce card starts folded on phones');
  await page.locator('#sauce-toggle').tap(); assert.ok(await page.locator('.sauce-lines').isVisible());
  for (const href of ['/tour/', '/hire/', '/work/', '/walkthrough/']) assert.equal(await page.locator(`#finale a[href="${href}"]`).count(), 1, href);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `no sideways scroll at 375px (${overflow}px)`);
  const small = await page.$$eval('main p, main li, main summary, main a, main button', els => els.filter(e => e.offsetParent && !e.closest('.demo, .hud, .sauce, .device-note, .dock, .lab-hint, .badge, .case-meta, .kicker, .step-tag, .svc-proof, .creds, .portrait, .eyebrow') && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.textContent.trim().slice(0, 30)));
  assert.deepEqual(small, [], 'reading text and controls are at least 16px: ' + JSON.stringify(small));
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('screen readers hear the step that actually comes next, and when it is complete', async () => {
  for (const reducedMotion of ['no-preference', 'reduce']) { // with and without view transitions
    const page = await open({viewport: {width: 1280, height: 860}, reducedMotion});
    await page.goto(base + '/', {waitUntil: 'networkidle'});
    const say = () => page.locator('#announce').textContent();
    await page.locator('.choice').nth(0).click(); await page.waitForTimeout(700);
    assert.match(await say(), new RegExp(`เลือก ${data.industries[0].label} แล้ว · 1/3 · ต่อไป: อยากได้อะไร`), reducedMotion);
    await page.locator('.choice').nth(1).click(); await page.waitForTimeout(700);
    assert.match(await say(), /2\/3 · ต่อไป: สไตล์ไหน/, reducedMotion);
    await page.locator('.choice').nth(2).click(); await page.waitForTimeout(700);
    assert.match(await say(), /ครบ 3 อย่างแล้ว เว็บตัวอย่างประกอบเสร็จ/, reducedMotion);
    await page.close();
  }
});

await check('an answer can be changed after finishing, and "ลองชุดอื่น" starts over', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await page.goto(base + '/?r=cafe-booking-warm', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-widget-body] button');
  await page.locator('.leaf').first().click({force: true});
  await page.locator(`.choice[data-key="${data.industries[2].key}"]`).click(); await page.waitForTimeout(800);
  assert.equal(await page.locator('.d-brand').textContent(), data.industries[2].brand, 'the demo follows the new answer');
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done', 'still finished');
  await page.locator('#replay').click(); await page.waitForTimeout(500);
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'empty');
  assert.equal(new URL(page.url()).search, '', 'replay drops the shared ?r=');
  assert.ok(await page.locator('#finale').isHidden());
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('the share button copies a link that reopens the same demo', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {origin});
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).click(); await page.waitForTimeout(700); }
  await page.locator('#share').click(); await page.waitForTimeout(300);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const combo = `${data.industries[0].key}-${data.features[1].key}-${data.styles[2].key}`;
  assert.equal(link, `${origin}/?r=${combo}`);
  await page.goto(link, {waitUntil: 'domcontentloaded'}); await page.waitForSelector('[data-widget-body] button');
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done');
  await page.close();
});

await check('reduced motion shows the finished state at once', async () => {
  const page = await open({viewport: {width: 375, height: 740}, reducedMotion: 'reduce'});
  await page.goto(base + '/?r=studio-minigame-minimal', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.w-token');
  assert.ok(await page.locator('#finale').isVisible());
  assert.equal(await page.locator('.blk').count(), 0, 'no build-in animation classes');
  await page.close();
});

await check('/ loads no 3D code or asset before entering the house', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const paths = []; page.on('request', r => { const u = new URL(r.url()); if (u.origin === origin) paths.push(u.pathname); });
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).click(); await page.waitForTimeout(500); }
  await page.mouse.wheel(0, 4000); await page.waitForTimeout(800);
  assert.deepEqual(paths.filter(p => /^\/tour\/|three|\.glb$|\.gltf$|showcase\/house\/assets\/.*\.js/.test(p)), []);
  await page.close();
});

await check('initial JavaScript ≤ 150KB gzip', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const scripts = [];
  page.on('response', async r => { if (r.request().resourceType() === 'script' && new URL(r.url()).origin === origin) scripts.push(await r.body().catch(() => Buffer.alloc(0))); });
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  const inline = await page.$$eval('script:not([src])', s => s.map(x => x.textContent).join(''));
  const total = scripts.reduce((n, b) => n + gzipSync(b).length, 0) + gzipSync(Buffer.from(inline)).length;
  assert.ok(total <= 150 * 1024, `${(total / 1024).toFixed(1)}KB gzip`);
  console.log(`  initial JS: ${(total / 1024).toFixed(1)}KB gzip in ${scripts.length} files + inline`);
  await page.close();
});

await check('without JavaScript the page still informs and converts', async () => {
  const page = await open({javaScriptEnabled: false, viewport: {width: 375, height: 740}});
  await page.goto(base + '/', {waitUntil: 'domcontentloaded'});
  assert.ok(!(await page.locator('#clover').isVisible()), 'the game hides');
  assert.ok(await page.locator('.nojs-demo').isVisible());
  for (const id of ['#hero-title', '#about-title', '#services-title', '#work-title', '#faq-title']) assert.ok(await page.locator(id).isVisible(), id);
  for (const href of ['/work/', '/hire/', '/walkthrough/', 'https://fastwork.com/user/teem']) assert.ok(await page.locator(`main a[href="${href}"]:visible`).count() > 0, href);
  await page.close();
});

await check('เข้าบ้าน opens the house at /tour/?from=home', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await page.route('**/tour/**', r => r.fulfill({status: 200, contentType: 'text/html', body: '<title>tour</title>'}));
  await page.goto(base + '/?r=cafe-booking-warm', {waitUntil: 'domcontentloaded'});
  await Promise.all([page.waitForURL(/\/tour\/\?from=home$/), page.locator('#finale .btn-door').click()]);
  await page.close();
});

await check('the finale leads to hiring and the free lessons', async () => {
  for (const [href, h1] of [['/hire/', /จ้างทำเว็บ/], ['/walkthrough/', /เรียน AI ฟรี 6 ตอน/]]) {
    const page = await open(phone);
    await page.goto(base + '/?r=coach-booking-minimal', {waitUntil: 'domcontentloaded'});
    await Promise.all([page.waitForURL(new RegExp(href.replace(/\//g, '\\/') + '$')), page.locator(`#finale a[href="${href}"]`).click()]);
    assert.match(await page.locator('h1').first().textContent(), h1, href);
    await page.close();
  }
});

await check('an enrolled student still sees "ห้องเรียนของฉัน" on the homepage', async () => {
  const page = await open(phone);
  await page.route('**/api/learn?action=entry', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true, hasEnrollment: true})}));
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  const entry = page.locator('a.my-learning-entry');
  await entry.waitFor({timeout: 5000});
  assert.equal(await entry.getAttribute('href'), '/learn/');
  await page.close();
  const guest = await open(phone);
  await guest.route('**/api/learn?action=entry', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true, hasEnrollment: false})}));
  await guest.goto(base + '/', {waitUntil: 'networkidle'});
  assert.equal(await guest.locator('a.my-learning-entry').count(), 0, 'visitors without a course see no student link');
  await guest.close();
});

await browser.close(); local?.server.close();
for (const r of results) console.log(r.join(' · '));
process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
