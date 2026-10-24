/**
 * Homepage "ปรุงเว็บใน 3 แตะ" acceptance checks (BLUEPRINT v3.0 §12 F3, automated part):
 *   1. all 64 ?r= demos render without a JS error and their widget responds
 *   2. three taps at 375px reach the end; the finale offers the house, hire, work and lessons
 *   3. reduced motion shows the finished state at once
 *   4. "/" requests no 3D code or asset before "เข้าบ้าน"
 *   5. initial JavaScript ≤ 150KB gzip
 *   6. without JavaScript: identity, services, work, FAQ and CTAs are readable
 *   7. "เข้าบ้าน" opens /tour/?from=home
 * Run: node tests/entry/entry.e2e.mjs   (ENTRY_PLAYWRIGHT=/path/to/playwright/index.mjs if not resolvable)
 * Human testing (3 strangers, BLUEPRINT §12 F3) is separate and is not covered here.
 */
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {startServer} from './serve.mjs';

const {chromium} = await import(process.env.ENTRY_PLAYWRIGHT || 'playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const data = JSON.parse(await readFile(new URL('../../entry/data.json', import.meta.url), 'utf8'));
const {base, server, requests} = await startServer();
const browser = await chromium.launch();
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); } };

await check('64 shared demos render and respond', async () => {
  const page = await browser.newPage({viewport: {width: 1280, height: 860}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let n = 0;
  for (const i of data.industries) for (const f of data.features) for (const s of data.styles) {
    const combo = `${i.key}-${f.key}-${s.key}`;
    await page.goto(`${base}/?r=${combo}`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('[data-widget-body] button', {timeout: 5000});
    assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done', combo);
    assert.equal(await page.locator('.d-brand').textContent(), i.brand, combo);
    assert.equal(await page.locator('#demo').evaluate(el => el.style.getPropertyValue('--demo-accent')), s.vars['--demo-accent'], combo);
    await page.locator('[data-widget-body] button:not([disabled])').first().click();
    assert.equal((await page.locator('#sauce-lines li').allTextContents()).filter(Boolean).length, 6, combo + ' sauce');
    n++;
  }
  assert.equal(n, 64);
  assert.deepEqual(errors, []);
  await page.close();
});

await check('three taps at 375px finish the demo', async () => {
  const page = await browser.newPage({viewport: {width: 375, height: 740}, isMobile: true, hasTouch: true});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'empty');
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).tap(); await page.waitForTimeout(700); }
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done');
  assert.equal(await page.locator('.leaf-4').getAttribute('data-state'), 'bloom');
  assert.ok(await page.locator('#finale').isVisible());
  for (const href of ['/tour/', '/hire/', '/work/', '/walkthrough/']) assert.equal(await page.locator(`#finale a[href="${href}"]`).count(), 1, href);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `no sideways scroll at 375px (${overflow}px)`);
  const small = await page.$$eval('main p, main li, main summary, main a, main button', els => els.filter(e => e.offsetParent && !e.closest('.demo, .hud, .sauce, .demo-label, .lab-hint, .badge, .case-meta, .kicker, .step-tag, .svc-proof, .creds, .portrait, .eyebrow') && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.textContent.trim().slice(0, 30)));
  assert.deepEqual(small, [], 'reading text and controls are at least 16px: ' + JSON.stringify(small));
  assert.deepEqual(errors, []);
  await page.close();
});

await check('reduced motion shows the finished state at once', async () => {
  const page = await browser.newPage({viewport: {width: 375, height: 740}, reducedMotion: 'reduce'});
  await page.goto(base + '/?r=studio-minigame-minimal', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.w-token');
  assert.ok(await page.locator('#finale').isVisible());
  assert.equal(await page.locator('.blk').count(), 0, 'no build-in animation classes');
  await page.close();
});

await check('/ loads no 3D code or asset before entering the house', async () => {
  requests.length = 0;
  const page = await browser.newPage({viewport: {width: 1280, height: 860}});
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).click(); await page.waitForTimeout(500); }
  await page.mouse.wheel(0, 4000); await page.waitForTimeout(800);
  const threeD = requests.filter(p => /^\/tour\/|three|\.glb$|\.gltf$|showcase\/house\/assets\/.*\.js/.test(p));
  assert.deepEqual(threeD, []);
  await page.close();
});

await check('initial JavaScript ≤ 150KB gzip', async () => {
  const page = await browser.newPage({viewport: {width: 1280, height: 860}});
  const scripts = [];
  page.on('response', async r => { if (r.request().resourceType() === 'script' && r.url().startsWith(base)) scripts.push(await r.body()); });
  await page.goto(base + '/', {waitUntil: 'networkidle'});
  const inline = await page.$$eval('script:not([src])', s => s.map(x => x.textContent).join(''));
  const total = scripts.reduce((n, b) => n + gzipSync(b).length, 0) + gzipSync(Buffer.from(inline)).length;
  assert.ok(total <= 150 * 1024, `${(total / 1024).toFixed(1)}KB gzip`);
  console.log(`  initial JS: ${(total / 1024).toFixed(1)}KB gzip in ${scripts.length} files + inline`);
  await page.close();
});

await check('without JavaScript the page still informs and converts', async () => {
  const ctx = await browser.newContext({javaScriptEnabled: false, viewport: {width: 375, height: 740}});
  const page = await ctx.newPage();
  await page.goto(base + '/', {waitUntil: 'domcontentloaded'});
  assert.ok(!(await page.locator('#clover').isVisible()), 'the game hides');
  assert.ok(await page.locator('.nojs-demo').isVisible());
  for (const id of ['#hero-title', '#about-title', '#services-title', '#work-title', '#faq-title']) assert.ok(await page.locator(id).isVisible(), id);
  for (const href of ['/work/', '/hire/', '/walkthrough/', 'https://fastwork.com/user/teem']) assert.ok(await page.locator(`main a[href="${href}"]:visible`).count() > 0, href);
  await ctx.close();
});

await check('เข้าบ้าน opens the house at /tour/?from=home', async () => {
  const page = await browser.newPage({viewport: {width: 1280, height: 860}});
  await page.route('**/tour/**', r => r.fulfill({status: 200, contentType: 'text/html', body: '<title>tour</title>'}));
  await page.goto(base + '/?r=cafe-booking-warm', {waitUntil: 'domcontentloaded'});
  await Promise.all([page.waitForURL(/\/tour\/\?from=home$/), page.locator('#finale .btn-door').click()]);
  await page.close();
});

await browser.close(); server.close();
for (const r of results) console.log(r.join(' · '));
process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
