/**
 * AI ใส่ซอส showcase in a real browser: every scene of the depth story draws and its caption
 * follows the scroll; without WebGL the captions still walk; without JavaScript they are a list;
 * reduce motion still works; a phone gets the whole shape and no sideways scroll.
 * Run: [FRONTDOOR_PLAYWRIGHT=/path/to/playwright/index.mjs] node tests/ai-source/showcase.e2e.mjs
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const {chromium} = await import(process.env.FRONTDOOR_PLAYWRIGHT ? pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml'};
const server = http.createServer(async (q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.startsWith('/api/')) { r.writeHead(404, {'content-type': 'application/json'}); return r.end('{}'); }
  try { if ((await stat(join(root, p))).isDirectory()) p = p.replace(/\/?$/, '/index.html'); } catch {}
  try { const b = await readFile(join(root, p)); r.writeHead(200, {'content-type': types[extname(p)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const pass = m => console.log('PASS ' + m);

async function open(opts = {}, init) {
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, ...opts});
  await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  // the launch-offer dialog is its own feature; keep it out of these frames
  await ctx.addInitScript(() => { HTMLDialogElement.prototype.showModal = function () {}; });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/ai-source/', {waitUntil: 'load'});
  return {ctx, page, errors};
}
const toScene = (page, f) => page.evaluate(f => {
  const box = document.querySelector('[data-depth]'), st = box.querySelector('[data-depth-stage]');
  scrollTo(0, box.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(st).top) + (box.offsetHeight - st.offsetHeight) * f);
}, f);
// how much of the stage is lit: particles are the only bright pixels on the dark stage
async function lit(page, pick = c => ({x: c.x + 40, y: c.y + 60, width: c.width - 80, height: c.height * .55})) {
  const png = await page.screenshot({clip: pick(await page.locator('[data-depth-stage]').boundingBox())});
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 200) n++;
    return n / (d.length / 16);
  }, png.toString('base64'));
}

try {
  { // desktop WebGL: each scene draws and its caption is the one showing
    const {ctx, page, errors} = await open();
    assert.equal(await page.getAttribute('[data-depth]', 'data-depth-state'), 'webgl');
    const scenes = await page.$$eval('[data-depth-caption]', c => c.length);
    for (let i = 0; i < scenes; i++) {
      await toScene(page, i / (scenes - 1) * .999 + (i ? 0 : .01));
      await page.waitForFunction(i => document.querySelector('[data-depth]').dataset.scene === String(i), i, {timeout: 15000});
      await page.waitForTimeout(1500);
      assert.equal(await page.$$eval('[data-depth-caption].on', c => c.map(e => e.dataset.depthCaption).join()), String(i));
      const share = await lit(page);
      assert.ok(share > .004, `scene ${i} draws particles (${share.toFixed(4)})`);
    }
    await page.evaluate(() => document.getElementById('built-showcase').scrollIntoView());
    assert.ok(await page.$$eval('.built-card img', imgs => imgs.every(i => i.getAttribute('width') && i.alt.length > 10)));
    assert.deepEqual(errors, []);
    await ctx.close();
    pass(`${scenes} scenes draw in WebGL and each caption follows the scroll`);
  }

  { // no WebGL: a still backdrop, the captions still walk with the scroll
    const {ctx, page, errors} = await open({}, () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
    assert.equal(await page.getAttribute('[data-depth]', 'data-depth-state'), 'still');
    await toScene(page, .5);
    await page.waitForFunction(() => document.querySelector('[data-depth]').dataset.scene === '2');
    assert.equal(await page.locator('[data-depth-canvas]').isVisible(), false);
    assert.deepEqual(errors, []);
    await ctx.close();
    pass('without WebGL the story still reads, caption by caption');
  }

  { // no JavaScript: every caption is plain text, nothing sticks
    const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, javaScriptEnabled: false});
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage();
    await page.goto(base + '/ai-source/', {waitUntil: 'load'});
    const visible = await page.$$eval('[data-depth-caption]', c => c.filter(e => getComputedStyle(e).opacity === '1' && e.offsetHeight > 0).length);
    assert.equal(visible, await page.$$eval('[data-depth-caption]', c => c.length));
    assert.ok(await page.$eval('[data-depth]', b => b.offsetHeight < innerHeight * 2), 'no tall scroll track without the engine');
    await ctx.close();
    pass('without JavaScript the captions are a readable list');
  }

  { // reduce motion: still scroll-driven, no errors
    const {ctx, page, errors} = await open({reducedMotion: 'reduce'});
    await toScene(page, .75);
    await page.waitForFunction(() => document.querySelector('[data-depth]').dataset.scene === '3');
    assert.ok(await lit(page) > .004);
    assert.deepEqual(errors, []);
    await ctx.close();
    pass('reduce motion: the scene follows the scroll only');
  }

  { // a phone: the whole shape fits and nothing scrolls sideways
    const {ctx, page, errors} = await open({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await toScene(page, .5);
    await page.waitForFunction(() => document.querySelector('[data-depth]').dataset.scene === '2');
    await page.waitForTimeout(1500);
    assert.ok(await lit(page) > .004);
    // the widest scene (image · clip · web) keeps clear of both edges of the stage
    const edge = x => lit(page, c => ({x: x(c), y: c.y + 70, width: 10, height: c.height * .5}));
    assert.ok(await edge(c => c.x + 2) < .003, 'left edge stays dark');
    assert.ok(await edge(c => c.x + c.width - 26) < .003, 'right edge stays dark (inside the progress rail)');
    assert.deepEqual(errors, []);
    await ctx.close();
    pass('phone: no sideways scroll and the scene draws inside the stage');
  }
} finally {
  await browser.close();
  server.close();
}
