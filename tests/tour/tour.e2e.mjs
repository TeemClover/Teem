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
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/json'};
const server = http.createServer(async (q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join(root, p)); r.writeHead(200, {'content-type': types[extname(p)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.TOUR_CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const pass = m => console.log('PASS ' + m);

async function open(opts, init) {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/tour/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, {timeout: 60000});
  return {ctx, page, errors};
}

try {
  { // WebGL tour, reduced motion so camera and cards settle immediately
    const {ctx, page, errors} = await open({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), false);
    assert.deepEqual(await page.evaluate(() => window.__tour.order), ['hero', 'door', 'living', 'kitchen', 'classroom', 'office', 'finale']);
    for (const [i, id] of ['living', 'kitchen', 'classroom', 'office', 'finale'].entries()) {
      await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }, id);
      await page.waitForFunction(n => Math.abs(window.__tour.progress() - n) < 0.05 && document.querySelector('.rail a.active')?.dataset.rail === document.querySelectorAll('[data-scene]')[n].dataset.scene, i + 2, {timeout: 20000});
      assert.equal(await page.$eval(`#${id} .card`, c => getComputedStyle(c).opacity), '1');
      await page.screenshot({path: `${out}/desktop-${id}.png`});
    }
    pass('scroll walks every room with its rail and card');

    // a real click on the hidden clover in the 3D office collects it
    await page.evaluate(() => { const s = document.getElementById('office'); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); });
    await page.waitForFunction(() => Math.abs(window.__tour.progress() - 5) < 0.05);
    let spot = null; // wait until the camera has settled (software GL renders slowly)
    for (let i = 0; i < 40; i++) {
      const next = await page.evaluate(() => window.__tour.screenOf('office'));
      if (spot && next && Math.hypot(next.x - spot.x, next.y - spot.y) < 0.5) break;
      spot = next; await page.waitForTimeout(400);
    }
    assert.ok(spot && spot.x > 0 && spot.x < 1280 && spot.y > 0 && spot.y < 800, JSON.stringify(spot));
    await page.mouse.move(spot.x, spot.y); await page.mouse.down(); await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('#clover-count .count-text').textContent === '1/4', null, {timeout: 10000});
    assert.match(await page.textContent('[data-find="office"]'), /เก็บใบนี้แล้ว/);
    pass('clicking the hidden clover in the 3D room collects it');

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
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  { // No WebGL: the story and links still work
    const {ctx, page, errors} = await open({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true},
      () => { HTMLCanvasElement.prototype.getContext = () => null; });
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), true);
    assert.equal(await page.locator('[data-primary]').count(), 5);
    await page.locator('#kitchen').scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
    await page.screenshot({path: `${out}/phone-no-webgl.png`});
    assert.deepEqual(errors, []);
    pass('falls back to a readable page without WebGL');
    await ctx.close();
  }
  console.log('Screenshots: ' + out);
} finally { await browser.close(); server.close(); }
