/**
 * Homepage v5 "ปรุงเว็บใน 3 แตะ" acceptance checks (BLUEPRINT v3.0 §12 F3, automated part; owner briefs 2026-10-24
 * and 2026-10-25: the builder is the page; each style is its own scroll template; luxury is a film you scroll).
 *
 *   npm run test:entry:ui                                     local copy of the repo (static server)
 *   ENTRY_BASE_URL=https://<deployment> npm run test:entry:ui  a real deployment (Vercel preview/production)
 *
 * Setup from a clean checkout: `npm ci && npx playwright install chromium` (Playwright is a pinned devDependency).
 * Optional: ENTRY_CHROME=/path/to/chrome uses an existing browser build;
 *           VERCEL_AUTOMATION_BYPASS_SECRET opens a protected Vercel preview.
 *
 * Covers: all 64 ?r= demos; the film on the first screen (plays, pauses, captions, sound on request, a new combination
 * every loop); the shop-name dialog; contact chapters with Google Maps only on tap; the Thai typefaces; from the film
 * to three taps on a 375×667 phone through the pinned site to the two doors; the scroll
 * that holds each chapter; four different templates and the luxury film; one page in many looks (remix, styles
 * strip); screen-reader announcements; replay; the
 * share link; reduced motion; only the chosen media load; no 3D before "เข้าบ้าน"; initial JS budget; reading
 * without JavaScript; "เข้าบ้าน" → /tour/?from=home; the profile door to /hire/ and /walkthrough/; the
 * "ห้องเรียนของฉัน" entry for enrolled students. Human testing (BLUEPRINT §12 F3) is separate.
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
  page.pending = new Set(); page.on('request', r => page.pending.add(r));
  for (const done of ['requestfinished', 'requestfailed']) page.on(done, r => page.pending.delete(r));
  page.close = () => ctx.close();
  return page;
}
/* Open the homepage and wait until it is ready: the load event, entry.js's ready flag, and no file from this site
   still loading for 500 ms. Not 'networkidle': on production that never fired (every such check timed out after
   30 s), so a connection that stays open (an API call, another site) is listed at the end instead of hanging. */
const notes = new Set();
async function openHome(page, path = '/') {
  await page.goto(base + path, {waitUntil: 'load'});
  await page.waitForFunction(() => document.documentElement.classList.contains('entry-ready'), null, {timeout: 10000});
  const own = r => { const u = new URL(r.url()); return u.origin === origin && !u.pathname.startsWith('/api/'); };
  const until = Date.now() + 15000; let quietSince = Date.now();
  while (Date.now() < until) {
    if ([...page.pending].some(own)) quietSince = Date.now();
    else if (Date.now() - quietSince >= 500) break;
    await page.waitForTimeout(100);
  }
  const left = [...page.pending].map(r => r.url());
  if ([...page.pending].some(own)) throw new Error(`files from this site still loading after 15 s: ${left.join(', ')}`);
  if (left.length) notes.add(`still open after ${path} was ready: ${left.join(', ')}`);
}
const phone = {viewport: {width: 375, height: 667}, isMobile: true, hasTouch: true};
const inView = loc => loc.evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
console.log(`homepage checks against ${base}`);

// scroll the pinned site the way a visitor does (wheel / swipe distance), until it shows scene k
async function scrollToScene(page, k, step = 240) {
  for (let i = 0; i < 120; i++) {
    const at = await page.locator('#site').getAttribute('data-scene');
    const pos = Number(await page.locator('#site').getAttribute('data-pos'));
    if (Number(at) === k && Math.abs(pos - k) < .02) return;
    await page.mouse.wheel(0, pos < k ? step : -step); await page.waitForTimeout(60);
  }
  throw new Error(`scene ${k} never came up (at ${await page.locator('#site').getAttribute('data-pos')})`);
}
const active = page => page.locator('#scenes .sc:not([inert])');
// click inside the pinned site at the element's place on screen (a locator click would scroll the page first)
async function visibleTap(page, sel) { const b = await page.locator(sel).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
const chapters = page => page.locator('#scenes .sc').count();
const featureAt = page => page.locator('.sc-hero [data-goto]').getAttribute('data-goto');

await check('64 shared demos render and respond', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  let n = 0;
  for (const i of data.industries) for (const f of data.features) for (const s of data.styles) {
    const combo = `${i.key}-${f.key}-${s.key}`;
    await page.goto(`${base}/?r=${combo}`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('[data-widget-body] button', {state: 'attached', timeout: 10000});
    assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done', combo);
    assert.equal(await page.locator('.sc-hero .sc-title').textContent(), i.brand, combo);
    assert.equal(await page.locator('#site').getAttribute('data-style'), s.key, combo);
    assert.equal(await page.locator('#site').evaluate(el => el.style.getPropertyValue('--demo-accent')), s.vars['--demo-accent'], combo);
    assert.equal(await page.locator('.sc-card').count(), 3, combo + ' items');
    const k = await featureAt(page);
    assert.equal(await page.locator(`.sc[data-sc="${k}"]`).getAttribute('data-role'), 'feature', combo);
    await page.locator('.sc-hero [data-goto]').click();
    await page.waitForFunction(k => document.querySelector('#site').dataset.scene === k, k);
    await page.waitForTimeout(400);
    await page.locator('[data-widget-body] button:not([disabled])').first().click();
    n++;
  }
  assert.equal(n, 64);
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('three taps on a 375×667 phone open the site; scrolling it ends at the two doors', async () => {
  const page = await open(phone);
  await openHome(page);
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'empty');
  assert.ok(await page.locator('#site').isHidden(), 'no site before the three taps');
  // the first screen is the film; its button takes you to the three choices in one tap
  assert.ok(await inView(page.locator('#hero-title')) && await inView(page.locator('.film-go')), 'the film and its button fill the first screen');
  await page.locator('.film-go').tap();
  await page.waitForFunction(() => Math.abs(document.querySelector('#play').getBoundingClientRect().top) < 4, null, {timeout: 5000});
  const firstChoiceBottom = await page.locator('.choice').first().evaluate(e => e.getBoundingClientRect().bottom);
  assert.ok(firstChoiceBottom <= 667, `after one tap the first choice is on screen (bottom at ${Math.round(firstChoiceBottom)}px)`);
  for (const id of ['#profile', '.foot']) assert.ok(await page.locator(id).isHidden(), `${id} waits until the game is played`);
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).tap(); await page.waitForTimeout(500); }
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done');
  await page.waitForFunction(() => Math.abs(document.querySelector('#site').getBoundingClientRect().top) < 4, null, {timeout: 5000});
  assert.ok(await inView(page.locator('.sc-hero .sc-title')), 'the third tap lands on the new site');
  assert.match(await page.locator('.site-bar').textContent(), /ตัวอย่างสาธิต/);
  for (let k = 1, n = await chapters(page); k < n; k++) {
    await scrollToScene(page, k);
    assert.equal(await active(page).getAttribute('data-sc'), String(k), `chapter ${k} is the one you can use`);
  }
  await page.locator('#finale').scrollIntoViewIfNeeded();
  for (const sel of ['.door-profile', '.door-house[href="/tour/"][data-enter-house]']) assert.ok(await page.locator(sel).isVisible(), sel);
  await page.locator('.door-profile').tap();
  await page.locator('#profile-title').waitFor();
  for (const href of ['/hire/', '/work/', '/walkthrough/', 'https://fastwork.com/user/teem']) assert.ok(await page.locator(`#profile a[href="${href}"]`).count() > 0, href);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `no sideways scroll at 375px (${overflow}px)`);
  const small = await page.$$eval('.film .cap span, .film-go, .studio p, .studio button, .finale p, .finale a, .finale button, .profile p, .profile li, .profile a', els => els.filter(e => e.offsetParent && !e.closest('.studio-skip, .track, .eyebrow, .finale-k, .finale-note, .case-meta, .kicker, .foot') && parseFloat(getComputedStyle(e).fontSize) < 15).map(e => e.textContent.trim().slice(0, 30)));
  assert.deepEqual(small, [], 'reading text and controls are at least 15px: ' + JSON.stringify(small));
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('the site holds each chapter, then changes; only the chapter on screen can be used', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await openHome(page, '/?r=shop-store-luxury');
  await page.waitForFunction(() => document.querySelector('#site').dataset.scene === '0');
  await scrollToScene(page, 2);
  const v = name => page.locator('.sc[data-sc="2"]').evaluate((e, name) => Number(e.style.getPropertyValue(name)), name);
  const before = await v('--p');
  await page.mouse.wheel(0, 220); await page.waitForTimeout(150);
  assert.equal(await v('--in'), 0, 'scrolling inside a hold does not move the chapter');
  assert.equal(await v('--out'), 0);
  assert.ok(await v('--p') > before, 'the hold moves what is inside it (the words light up)');
  await scrollToScene(page, 3);
  assert.equal(await page.locator('.sc[data-sc="2"]').getAttribute('aria-hidden'), 'true', 'the chapter that left is out of the reading order');
  assert.equal(await page.locator('.sc[data-sc="0"]').evaluate(e => e.inert), true);
  assert.equal(await page.locator('.sc[data-sc="3"]').evaluate(e => e.inert), false);
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('every style is its own template; luxury is the longest, and its film plays as you scroll', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const frames = []; page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/entry/media/v5/film/')) frames.push(u.pathname); });
  const shape = {};
  const read = () => page.$$eval('#scenes .sc', els => els.map(e => e.className.split(' ').find(c => /^(lx|wm|pp|mn)-/.test(c))).join(' '));
  for (const s of data.styles.filter(s => s.key !== 'luxury')) { await openHome(page, `/?r=coach-profile-${s.key}`); shape[s.key] = await read(); }
  assert.deepEqual(frames, [], 'no film frame loads for the other styles');
  await openHome(page, '/?r=coach-profile-luxury');
  shape.luxury = await read();
  assert.ok(frames.length > 0, 'picking luxury starts loading its film');
  const prefixes = Object.values(shape).map(v => v.split(' ')[0].slice(0, 3));
  assert.equal(new Set(prefixes).size, 4, 'four different templates: ' + JSON.stringify(shape));
  const len = Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, v.split(' ').length]));
  for (const k of ['warm', 'playful', 'minimal']) assert.ok(len.luxury > len[k], `luxury (${len.luxury} chapters) is longer than ${k} (${len[k]})`);
  assert.deepEqual(frames.filter(p => !p.startsWith('/entry/media/v5/film/coach/w/')), [], 'only this business, landscape frames on a wide screen');
  await scrollToScene(page, 1);
  await page.locator('.lx-film .lx-screen.has-film canvas').waitFor({timeout: 15000});
  const frame = () => page.locator('.lx-film [data-frame]').textContent();
  const first = await frame();
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(80); }
  await page.waitForTimeout(300);
  assert.notEqual(await frame(), first, 'scrolling moves the film');
  // one scroll step plays through frames (the playhead glides) instead of jumping to the next still
  const head = () => page.locator('.lx-film canvas').evaluate(c => Number(c.dataset.head));
  await page.waitForTimeout(900);
  const h0 = await head(), path = new Set();
  await page.mouse.wheel(0, 300);
  for (let i = 0; i < 16; i++) { await page.waitForTimeout(50); path.add(await head()); }
  assert.ok(path.size >= 3, `the film glides after one scroll step: ${[h0, ...path].join(' → ')}`);
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('one page, many looks: the styles strip and the remix rows change the whole site', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await openHome(page, '/?r=cafe-booking-warm');
  const font = () => page.locator('.sc-hero .sc-title').evaluate(e => getComputedStyle(e).fontFamily);
  const warm = await font();
  await page.locator('#finale').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.look').count(), 4);
  await page.locator('.look[data-look="luxury"]').click();
  await page.waitForFunction(() => document.querySelector('#site').dataset.style === 'luxury');
  assert.notEqual(await font(), warm, 'the type changes with the style');
  assert.ok(await page.locator('#scenes img[src*="cafe-luxury"]').count() > 0, 'the photos change');
  assert.ok(await page.locator('#scenes .lx-film').count() === 1, 'and so does the whole layout: luxury has its film');
  await page.waitForFunction(() => Math.abs(document.querySelector('#site').getBoundingClientRect().top) < 4, null, {timeout: 5000});
  await page.locator('#finale').scrollIntoViewIfNeeded();
  await page.locator('.chip[data-step="0"][data-key="studio"]').click();
  await page.waitForFunction(() => document.querySelector('#site').dataset.industry === 'studio');
  assert.equal(await page.locator('.sc-hero .sc-title').textContent(), data.industries.find(i => i.key === 'studio').brand);
  assert.match(await page.locator('#combo-n').textContent(), /ชุดที่ \d+ \/ 64/);
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('the mini-game stacks the business\'s own thing, and a well-timed drop stacks a layer', async () => {
  const titles = {cafe: 'ซ้อนเค้กให้สูง', coach: 'ซ้อนบล็อกเลข', shop: 'ซ้อนไหมพรม', studio: 'ซ้อนภาพ'};
  const page = await open({viewport: {width: 1280, height: 860}});
  for (const i of data.industries) {
    await openHome(page, `/?r=${i.key}-minigame-${data.styles[(data.industries.indexOf(i)) % 4].key}`);
    const game = page.locator('[data-widget-body] .w-game');
    await game.waitFor({state: 'attached'});
    assert.equal(await game.getAttribute('data-game'), i.key);
    assert.equal(await page.locator('.w-game-cover b').textContent(), titles[i.key], `${i.key} plays its own game`);
    assert.match(await page.locator('.w-game-cover').textContent(), new RegExp(i.brand), 'the cover carries the brand');
    await page.locator('.sc-hero [data-goto]').click();
    await page.waitForFunction(() => document.querySelector('.sc[data-role="feature"]') && !document.querySelector('.sc[data-role="feature"]').inert);
    await page.waitForTimeout(500);
    await page.locator('.w-game-go').click();
    await page.waitForTimeout(600);
    assert.ok(await page.locator('.w-game-cover').isHidden(), 'the cover gives way to the game');
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('w-game-canvas')), true, 'the keyboard works right away');
    await page.waitForFunction(() => { const g = document.querySelector('.w-game').stackGame; return g?.offset != null && Math.abs(g.offset) < .04; }, null, {timeout: 8000});
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.press('Space'); await page.waitForTimeout(200);
    assert.equal(await page.locator('.w-game').getAttribute('data-layers'), '1', `${i.key}: a drop on the middle stacks a layer`);
    assert.equal(await page.evaluate(() => scrollY), y, 'Space does not scroll the page while playing');
  }
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('the film plays, pauses, keeps its captions in step, and every loop shows another combination', async () => {
  const page = await open({viewport: {width: 1280, height: 800}});
  await openHome(page);
  await page.waitForFunction(() => document.querySelector('#film').classList.contains('is-live'), null, {timeout: 10000});
  const t = () => page.locator('#film').getAttribute('data-t');
  const t0 = await t(); await page.waitForTimeout(700);
  assert.notEqual(await t(), t0, 'it plays on its own');
  await page.locator('#film-pause').click();
  assert.equal(await page.locator('#film-pause').getAttribute('aria-pressed'), 'true');
  const held = await t(); await page.waitForTimeout(600);
  assert.equal(await t(), held, 'pause holds the frame');
  for (const [at, cap] of [[1.2, '0'], [5.2, '1'], [7, '2'], [15.5, '4'], [18, '5']]) {
    await page.evaluate(at => document.querySelector('#film').film.seek(at), at);
    assert.equal(await page.locator('#film').getAttribute('data-cap'), cap, `caption at ${at}s`);
  }
  await page.evaluate(() => document.querySelector('#film').film.seek(7.2));
  assert.match(await page.locator('#film-count').textContent(), /^ชุดที่ \d+ \/ 64$/, 'the montage counts the combinations');
  const starts = await page.evaluate(() => [0, 1, 2, 3].map(L => JSON.stringify(document.querySelector('#film').film.plan(L).start)));
  assert.ok(new Set(starts).size >= 3, 'loops pick other combinations: ' + starts.join(' '));
  await page.locator('#film-sound').click();
  assert.equal(await page.locator('#film-sound').getAttribute('aria-pressed'), 'true', 'sound turns on only when asked');
  await page.waitForTimeout(500);
  await page.locator('.film-go').click();
  await page.waitForFunction(() => Math.abs(document.querySelector('#play').getBoundingClientRect().top) < 4, null, {timeout: 5000});
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('a visitor can put their own shop name on the whole site; it stays on their device', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const sent = []; page.on('request', r => { if (r.url().includes(encodeURIComponent('ร้านป้าแดง'))) sent.push(r.url()); });
  await openHome(page, '/?r=cafe-booking-warm');
  await page.locator('.site-bar [data-name-open]').click();
  await page.locator('#name-input').fill('ร้านป้าแดง');
  await page.locator('#name-dlg button[value="ok"]').click();
  await page.waitForFunction(() => document.querySelector('.sc-hero .sc-title')?.textContent === 'ร้านป้าแดง');
  assert.match(await page.locator('#site-domain').textContent(), /ร้านป้าแดง\.example/);
  assert.deepEqual(sent, [], 'the name is not sent anywhere');
  await page.locator('#finale').scrollIntoViewIfNeeded();
  assert.match(await page.locator('#want').getAttribute('href'), /^\/hire\/\?from=demo&r=cafe-booking-warm$/);
  await page.locator('.btn-name').click();
  await page.locator('#name-dlg button[value="reset"]').click();
  await page.waitForFunction(b => document.querySelector('.sc-hero .sc-title')?.textContent === b, data.industries[0].brand);
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('every template ends with contact and a real Google Map that loads only when tapped', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const google = []; page.on('request', r => { if (/google\.com|googleapis|gstatic/.test(new URL(r.url()).hostname)) google.push(r.url()); });
  await page.route(/maps\.google\.com/, r => r.fulfill({status: 200, contentType: 'text/html', body: '<title>map</title>'}));
  for (const s of data.styles) {
    await openHome(page, `/?r=coach-booking-${s.key}`);
    const k = await page.locator('.sc[data-role="visit"]').getAttribute('data-sc');
    await scrollToScene(page, Number(k));
    const visit = page.locator('.sc[data-role="visit"]');
    assert.match(await visit.textContent(), /ที่อยู่สมมติ/, `${s.key}: the address says it is a sample`);
    assert.match(await visit.locator('a', {hasText: 'นำทาง'}).getAttribute('href'), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.equal(await visit.locator('iframe').count(), 0, 'no map frame before the tap');
  }
  assert.deepEqual(google, [], 'nothing from Google before the tap (fonts are our own)');
  await page.mouse.wheel(0, 240); await page.waitForTimeout(300);
  await visibleTap(page, '.sc[data-role="visit"] [data-map-load]');
  const src = await page.locator('.sc[data-role="visit"] iframe').getAttribute('src');
  assert.match(src, /^https:\/\/maps\.google\.com\/maps\?q=Siam%20Square/);
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('each style speaks in its own Thai typeface', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const faces = {};
  for (const s of data.styles) {
    await openHome(page, `/?r=shop-profile-${s.key}`);
    await page.evaluate(() => document.fonts.ready);
    faces[s.key] = await page.locator('.sc-hero .sc-title').evaluate(e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim());
    assert.ok(await page.evaluate(f => document.fonts.check(`40px "${f}"`, 'ถักใจ'), faces[s.key]), `${s.key}: ${faces[s.key]} is loaded`);
  }
  assert.deepEqual(faces, {warm: 'Pridi', luxury: 'Chonburi', playful: 'Mitr', minimal: 'Noto Sans Thai'});
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#hero-title')).fontFamily.split(',')[0].replace(/["']/g, '').trim()), 'Taviraj');
  await page.close();
});

await check('screen readers hear the step that actually comes next, and when it is complete', async () => {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await open({viewport: {width: 1280, height: 860}, reducedMotion});
    await openHome(page);
    const say = () => page.locator('#announce').textContent();
    await page.locator('.choice').nth(0).click(); await page.waitForTimeout(300);
    assert.match(await say(), new RegExp(`เลือก ${data.industries[0].label} แล้ว · 1/3 · ต่อไป: อยากได้อะไร`), reducedMotion);
    await page.locator('.choice').nth(1).click(); await page.waitForTimeout(300);
    assert.match(await say(), /2\/3 · ต่อไป: สไตล์ไหน/, reducedMotion);
    await page.locator('.choice').nth(2).click(); await page.waitForTimeout(300);
    assert.match(await say(), /ครบ 3 อย่างแล้ว เว็บตัวอย่างประกอบเสร็จ/, reducedMotion);
    await page.close();
  }
});

await check('an answer can be changed after finishing, and "ลองชุดอื่น" starts over', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await openHome(page, '/?r=cafe-booking-warm');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  await page.locator('.track-step[data-step="0"]').click();
  await page.locator(`.choice[data-key="${data.industries[2].key}"]`).click(); await page.waitForTimeout(400);
  assert.equal(await page.locator('.sc-hero .sc-title').textContent(), data.industries[2].brand, 'the site follows the new answer');
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done', 'still finished');
  await page.locator('#replay').click(); await page.waitForTimeout(300);
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'empty');
  assert.equal(new URL(page.url()).search, '', 'replay drops the shared ?r=');
  assert.ok(await page.locator('#site').isHidden() && await page.locator('#finale').isHidden());
  assert.deepEqual(page.errors, []);
  await page.close();
});

await check('the share button copies a link that reopens the same demo', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {origin});
  await openHome(page);
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).click(); await page.waitForTimeout(300); }
  await page.locator('#finale').scrollIntoViewIfNeeded();
  await page.locator('#share').click(); await page.waitForTimeout(300);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const combo = `${data.industries[0].key}-${data.features[1].key}-${data.styles[2].key}`;
  assert.equal(link, `${origin}/?r=${combo}`);
  await page.goto(link, {waitUntil: 'domcontentloaded'}); await page.waitForSelector('[data-widget-body] button', {state: 'attached'});
  assert.equal(await page.locator('#stage').getAttribute('data-state'), 'done');
  assert.equal(await page.locator('.sc-hero .sc-title').textContent(), data.industries[0].brand);
  await page.close();
});

await check('reduced motion: no pinning, every scene readable in order', async () => {
  const page = await open({viewport: {width: 375, height: 740}, reducedMotion: 'reduce'});
  await openHome(page, '/?r=studio-minigame-minimal');
  await page.waitForSelector('.w-token');
  assert.equal(await page.locator('.site-stage').evaluate(e => getComputedStyle(e).position), 'relative');
  for (let k = 0, n = await chapters(page); k < n; k++) assert.ok(await page.locator(`.sc[data-sc="${k}"]`).isVisible(), `chapter ${k}`);
  assert.equal(await page.locator('#scenes .sc[inert]').count(), 0, 'every chapter can be used');
  assert.equal(await page.locator('video').count(), 0, 'no clip plays');
  await page.close();
});

await check('only the chosen combination loads its photos and clip', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const media = []; page.on('request', r => { const u = new URL(r.url()); if (/^\/entry\/media\/v[45]\//.test(u.pathname)) media.push(u.pathname); });
  await openHome(page, '/?r=coach-store-playful');
  await page.waitForTimeout(800);
  assert.ok(media.length > 0);
  const firstLook = p => p.startsWith('/entry/media/v4/hero/cafe-luxury'); // the studio's built-in backdrop, in the HTML
  assert.deepEqual(media.filter(p => !p.includes('/coach-') && !firstLook(p)), [], 'nothing from other businesses before the finale');
  assert.deepEqual(media.filter(p => /\/(hero|detail|item|loop)\/coach-(warm|luxury|minimal)/.test(p)), [], 'nothing from other styles before the finale');
  assert.deepEqual(media.filter(p => p.startsWith('/entry/media/v5/')), [], 'no luxury film or loops for another style');
  await page.close();
});

await check('/ loads no 3D code or asset before entering the house', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const paths = []; page.on('request', r => { const u = new URL(r.url()); if (u.origin === origin) paths.push(u.pathname); });
  await openHome(page);
  for (let i = 0; i < 3; i++) { await page.locator('.choice').nth(i).click(); await page.waitForTimeout(400); }
  await page.mouse.wheel(0, 4000); await page.waitForTimeout(800);
  assert.deepEqual(paths.filter(p => /^\/tour\/|three|\.glb$|\.gltf$|showcase\/house\/assets\/.*\.js/.test(p)), []);
  await page.close();
});

await check('initial JavaScript ≤ 150KB gzip', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  const scripts = [];
  page.on('response', async r => { if (r.request().resourceType() === 'script' && new URL(r.url()).origin === origin) scripts.push({url: r.url(), body: await r.body().catch(() => Buffer.alloc(0))}); });
  await openHome(page);
  // the widget modules load once the page is idle; count them too
  for (const until = Date.now() + 10000; scripts.filter(s => s.url.includes('/entry/widgets/')).length < data.features.length && Date.now() < until;) await page.waitForTimeout(100);
  const inline = await page.$$eval('script:not([src])', s => s.map(x => x.textContent).join(''));
  const total = scripts.reduce((n, s) => n + gzipSync(s.body).length, 0) + gzipSync(Buffer.from(inline)).length;
  assert.ok(total <= 150 * 1024, `${(total / 1024).toFixed(1)}KB gzip`);
  console.log(`  initial JS: ${(total / 1024).toFixed(1)}KB gzip in ${scripts.length} files + inline`);
  await page.close();
});

await check('without JavaScript the page still informs and converts', async () => {
  const page = await open({javaScriptEnabled: false, viewport: {width: 375, height: 740}});
  await page.goto(base + '/', {waitUntil: 'load'}); // without scripts, DOMContentLoaded can come before the stylesheet
  assert.ok(await page.locator('#hero-title').isVisible());
  assert.ok(!(await page.locator('#choices').isVisible()), 'the game hides');
  assert.ok(await page.locator('.nojs-demo').isVisible());
  for (const id of ['#profile-title', '#work-title']) assert.ok(await page.locator(id).isVisible(), id);
  for (const href of ['/work/', '/hire/', '/walkthrough/', '/tour/', 'https://fastwork.com/user/teem']) assert.ok(await page.locator(`a[href="${href}"]:visible`).count() > 0, href);
  await page.close();
});

await check('เข้าบ้าน opens the house at /tour/?from=home', async () => {
  const page = await open({viewport: {width: 1280, height: 860}});
  await page.route('**/tour/**', r => r.fulfill({status: 200, contentType: 'text/html', body: '<title>tour</title>'}));
  await openHome(page, '/?r=cafe-booking-warm');
  await page.locator('#finale').scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL(/\/tour\/\?from=home$/), page.locator('#finale .door-house').click()]);
  await page.close();
});

await check('the profile door leads to hiring and the free lessons', async () => {
  for (const [href, h1] of [['/hire/', /จ้างทำเว็บ/], ['/walkthrough/', /เรียน AI ฟรี 6 ตอน/]]) {
    const page = await open(phone);
    await openHome(page, '/?r=coach-booking-minimal');
    await page.locator('#finale').scrollIntoViewIfNeeded();
    await page.locator('#finale .door-profile').tap();
    await page.locator('#profile-title').waitFor();
    await Promise.all([page.waitForURL(new RegExp(href.replace(/\//g, '\\/') + '$')), page.locator(`#profile .pro-actions a[href="${href}"]`).tap()]);
    assert.match(await page.locator('h1').first().textContent(), h1, href);
    await page.close();
  }
});

await check('an enrolled student still sees "ห้องเรียนของฉัน" on the homepage', async () => {
  const page = await open(phone);
  await page.route('**/api/learn?action=entry', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true, hasEnrollment: true})}));
  await openHome(page);
  const entry = page.locator('a.my-learning-entry');
  await entry.waitFor({timeout: 5000});
  assert.equal(await entry.getAttribute('href'), '/learn/');
  await page.close();
  const guest = await open(phone);
  await guest.route('**/api/learn?action=entry', r => r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true, hasEnrollment: false})}));
  await openHome(guest);
  assert.equal(await guest.locator('a.my-learning-entry').count(), 0, 'visitors without a course see no student link');
  await guest.close();
});

await check('the "ห้องเรียนของฉัน" check gets an answer in a real browser (timing is reported as a note)', async () => {
  const page = await open(phone);
  const isEntry = r => r.url().includes('/api/learn?action=entry');
  const t0 = Date.now(); let head = null, done = null;
  page.on('response', r => { if (isEntry(r.request()) && head === null) head = `${r.status()} after ${Date.now() - t0} ms`; });
  page.on('requestfinished', r => { if (isEntry(r) && done === null) done = Date.now() - t0; });
  page.on('requestfailed', r => { if (isEntry(r) && done === null) done = `failed (${r.failure()?.errorText}) after ${Date.now() - t0} ms`; });
  await openHome(page);
  for (const until = Date.now() + 45000; done === null && Date.now() < until;) await page.waitForTimeout(250);
  notes.add(`/api/learn?action=entry in a browser: response headers ${head ?? 'none'}; finished ${done === null ? 'not within 45 s of the page being ready' : typeof done === 'number' ? `after ${done} ms` : done}`);
  await page.close();
});

await browser.close(); local?.server.close();
for (const r of results) console.log(r.join(' · '));
for (const n of notes) console.log('note · ' + n);
process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
