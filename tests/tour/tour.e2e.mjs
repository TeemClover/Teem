/**
 * 3D house tour: loads with WebGL, walks every room, the accessible clover quest works,
 * the lucky card opens after four clovers, and the page still works without WebGL.
 * Run: TOUR_PLAYWRIGHT=/path/to/playwright [TOUR_CHROME=/path/to/chrome] node tests/tour/tour.e2e.mjs
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const {chromium} = await import(process.env.TOUR_PLAYWRIGHT ? pathToFileURL(process.env.TOUR_PLAYWRIGHT + '/index.mjs').href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = process.env.TOUR_PROOF_DIR || await mkdtemp(tmpdir() + '/tour-'); await mkdir(out, {recursive: true});
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg'};
const server = http.createServer(async (q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join(root, p)); r.writeHead(200, {'content-type': types[extname(p)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.TOUR_CHROME || undefined, args: process.env.TOUR_HARDWARE ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const pass = m => console.log('PASS ' + m);

async function open(opts, init, block) {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', r => r.request().url().startsWith(base) && !(block && block.test(r.request().url())) ? r.continue() : r.abort());
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (block) { await page.goto(base + '/tour/', {waitUntil: 'domcontentloaded'}); return {ctx, page, errors}; }
  await page.goto(base + '/tour/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, {timeout: 60000});
  return {ctx, page, errors};
}

try {
  { // WebGL tour, reduced motion so camera and cards settle immediately
    const {ctx, page, errors} = await open({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), false);
    assert.deepEqual(await page.evaluate(() => window.__tour.order), ['hero', 'door', 'living', 'kitchen', 'stairs', 'classroom', 'office', 'finale']);
    // outside the house nothing inside can be picked: the walls are in the way
    const outside = await page.evaluate(() => { const got = new Set(); for (let x = 20; x < innerWidth; x += 40) for (let y = 60; y < innerHeight; y += 40) { const h = window.__tour.pickAt(x, y); if (h) got.add(h.id || h.type); } return [...got]; });
    assert.ok(outside.every(id => id === 'meet'), 'picked through the wall: ' + outside);
    pass('from the garden, clicks never reach objects inside the house');
    for (const [i, id] of ['living', 'kitchen', 'stairs', 'classroom', 'office', 'finale'].entries()) {
      await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }, id);
      await page.waitForFunction(n => { const want = document.querySelectorAll('[data-scene]')[n].dataset.scene; return Math.abs(window.__tour.progress() - n) < 0.05 && document.querySelector('.rail a.active')?.dataset.rail === (want === 'stairs' ? 'classroom' : want); }, i + 2, {timeout: 20000});
      assert.equal(await page.$eval(`#${id} .card`, c => getComputedStyle(c).opacity), '1');
      await page.screenshot({path: `${out}/desktop-${id}.png`});
    }
    pass('scroll walks every room with its rail and card');

    const domItems = await page.$$eval('[data-item]', as => as.map(a => a.dataset.item).sort());
    assert.deepEqual(await page.evaluate(() => window.__tour.items().sort()), domItems);
    pass(`all ${domItems.length} objects in the house match a link on the page`);

    // a real click on the hidden clover in the 3D office collects it
    await page.evaluate(() => { const s = document.getElementById('office'); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); });
    await page.waitForFunction(() => Math.abs(window.__tour.progress() - window.__tour.order.indexOf('office')) < 0.05);
    const settled = async id => { // wait until the camera has settled (software GL renders slowly)
      let spot = null;
      for (let i = 0; i < 40; i++) {
        const next = await page.evaluate(id => window.__tour.screenOf(id), id);
        if (spot && next && Math.hypot(next.x - spot.x, next.y - spot.y) < 0.5) return next;
        spot = next; await page.waitForTimeout(400);
      }
      return spot;
    };
    const tap = async (id, done) => { // software GL can drop a tap during a slow frame; retry a few times
      for (let i = 0; i < 3; i++) {
        const at = await settled(id);
        await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.up();
        try { await page.waitForFunction(done, null, {timeout: 5000}); return; } catch {}
      }
      throw Error('tap did not register on ' + id);
    };
    await tap('teambook', () => window.__tour.inspecting() === 'teambook');
    await page.waitForSelector('#inspect.open');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/teambook/');
    assert.match(await page.textContent('#inspect-title'), /TeamBook/);
    await page.screenshot({path: `${out}/desktop-inspect.png`});
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    pass('tapping the TeamBook notebook in the project room picks it up and offers its page');

    // the classroom computers open lessons 1, 4, 5 and the Dungeon; objects of other rooms stay out of reach
    const lessonHref = await page.$$eval('#classroom [data-item]', as => Object.fromEntries(as.map(a => [a.dataset.item, a.getAttribute('href')])));
    assert.deepEqual([lessonHref['lesson-1'], lessonHref['lesson-4'], lessonHref['lesson-5'], lessonHref.dungeon], ['/classroom/free-ai.html', '/classroom/notebooklm.html', '/classroom/prompts.html', '/classroom/dungeon/']);
    const far = await page.evaluate(() => window.__tour.screenOf('dungeon'));
    if (far) { const h = await page.evaluate(({x, y}) => window.__tour.pickAt(x, y), far); assert.notEqual(h?.id, 'dungeon'); }
    pass('lesson computers link to บท 1, บท 4, บท 5 and the Dungeon; other rooms are out of reach');

    const spot = await settled('office');
    assert.ok(spot && spot.x > 0 && spot.x < 1280 && spot.y > 0 && spot.y < 800, JSON.stringify(spot));
    await tap('office', () => document.querySelector('#clover-count .count-text').textContent === '1/4');
    assert.match(await page.textContent('[data-find="office"]'), /เก็บใบนี้แล้ว/);
    pass('clicking the hidden clover in the 3D room collects it');

    // the record player in the living room plays the house music
    await page.evaluate(() => { const s = document.getElementById('living'); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); });
    await page.waitForFunction(() => Math.abs(window.__tour.progress() - window.__tour.order.indexOf('living')) < 0.05);
    await tap('music', () => document.querySelector('#music').getAttribute('aria-pressed') === 'true');
    await page.click('#music'); await page.waitForFunction(() => document.querySelector('#music').getAttribute('aria-pressed') === 'false');
    pass('the record player (and the music button) play and stop the house music');

    await page.evaluate(() => scrollTo(0, 0));
    for (const room of ['living', 'kitchen', 'classroom']) {
      const btn = page.locator(`[data-find="${room}"]`);
      await btn.click(); assert.match(await btn.textContent(), /กดอีกครั้ง/);
      await btn.click(); assert.match(await btn.textContent(), /เก็บใบนี้แล้ว/);
    }
    assert.equal(await page.textContent('#clover-count .count-text'), '4/4');
    await page.waitForSelector('#lucky[open]');
    assert.match(await page.textContent('#lucky-title'), /คนโชคดี/);
    assert.equal(await page.getAttribute('#lucky a.btn.primary', 'href'), '/meet/');
    await page.screenshot({path: `${out}/desktop-lucky.png`});
    pass('keyboard-accessible clover quest reaches the lucky card');

    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !document.body.classList.contains('is-loading'));
    assert.equal(await page.textContent('#clover-count .count-text'), '4/4');
    pass('collected clovers persist for this viewer');

    await page.click('[data-quality="hd"]');
    await page.waitForFunction(() => window.__tour.quality() === 'hd' && !document.body.classList.contains('is-loading'), null, {timeout: 60000});
    assert.equal(await page.getAttribute('[data-quality="hd"]', 'aria-pressed'), 'true');
    assert.deepEqual(await page.evaluate(() => window.__tour.items().sort()), await page.$$eval('[data-item]', as => as.map(a => a.dataset.item).sort()));
    await page.evaluate(() => { const s = document.getElementById('kitchen'); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); });
    await page.waitForTimeout(2500); await page.screenshot({path: `${out}/desktop-hd-kitchen.png`});
    pass('SD/HD toggle rebuilds the house in HD');
    const sdMemory = [];
    for (const mode of ['sd', 'hd', 'sd', 'hd', 'sd']) {
      await page.click(`[data-quality="${mode}"]`);
      await page.waitForFunction(mode => window.__tour.quality() === mode && !document.body.classList.contains('is-loading') && !window.__tour.stats().building, mode, {timeout: 60000});
      await page.waitForTimeout(500);
      assert.equal(await page.locator('[data-quality]:disabled').count(), 0);
      if (mode === 'sd') sdMemory.push(await page.evaluate(() => window.__tour.stats()));
    }
    assert.ok(sdMemory.at(-1).textures <= sdMemory[0].textures + 2, JSON.stringify(sdMemory));
    assert.ok(sdMemory.at(-1).geometries <= sdMemory[0].geometries + 2, JSON.stringify(sdMemory));
    assert.ok(sdMemory.at(-1).programs <= sdMemory[0].programs + 1, JSON.stringify(sdMemory));
    assert.ok(sdMemory[0].batchedMeshes > 100);
    pass('repeated SD/HD rebuilds release textures and geometry; static objects are batched');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  { // Real WebGL phone framing and HD path (not just the fallback).
    const {ctx, page, errors} = await open({viewport: {width: 393, height: 852}, screen: {width: 393, height: 852}, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce'});
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), false);
    await page.click('[data-quality="hd"]');
    await page.waitForFunction(() => window.__tour.quality() === 'hd' && !document.body.classList.contains('is-loading'), null, {timeout: 60000});
    for (const id of ['living', 'classroom', 'office']) {
      await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }, id);
      await page.waitForTimeout(800);
      await page.screenshot({path: `${out}/phone-hd-${id}.png`});
    }
    const buffer = await page.$eval('#stage', c => c.width * c.height);
    assert.ok(buffer <= 1_300_000);
    assert.deepEqual(errors, []);
    pass('phone WebGL HD loads all rooms within its pixel budget');
    await ctx.close();
  }
  { // No WebGL: the story and links still work
    const {ctx, page, errors} = await open({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true},
      () => { HTMLCanvasElement.prototype.getContext = () => null; });
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), true);
    assert.equal(await page.locator('[data-primary]').count(), 5);
    const rail = await page.$$eval('.rail a', as => as.map(a => { const r = a.getBoundingClientRect(); return {name: a.getAttribute('aria-label'), w: r.width, h: r.height}; }));
    assert.ok(rail.length === 6 && rail.every(r => r.name && r.w >= 32 && r.h >= 44), JSON.stringify(rail));
    pass('room menu on a phone: every dot has a name and a finger-sized target');
    await page.locator('#kitchen').scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
    await page.screenshot({path: `${out}/phone-no-webgl.png`});
    assert.deepEqual(errors, []);
    pass('falls back to a readable page without WebGL');
    await ctx.close();
  }
  { // the house module can't load (blocked, offline): the story and every link come back on their own
    const {ctx, page} = await open({viewport: {width: 393, height: 852}}, null, /\/tour\/tour\.js/);
    await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, {timeout: 10000});
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('static')), true);
    await page.locator('#living').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    assert.equal(await page.$eval('#living .card', c => getComputedStyle(c).opacity), '1');
    await page.screenshot({path: `${out}/phone-module-blocked.png`});
    pass('if the 3D module fails to load, the loader lifts and the content is readable');
    await ctx.close();
  }
  console.log('Screenshots: ' + out);
} finally { await browser.close(); server.close(); }
