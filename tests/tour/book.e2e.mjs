/**
 * AI ใส่ซอส preview reader: 10 preview pages, then the lock page that sends readers to the
 * course. Uses a fake 36-page manifest so it runs without the private PDF.
 * Run: TOUR_PLAYWRIGHT=/path/to/playwright [TOUR_CHROME=/path/to/chrome] node tests/tour/book.e2e.mjs
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const {chromium} = await import(process.env.TOUR_PLAYWRIGHT ? pathToFileURL(process.env.TOUR_PLAYWRIGHT + '/index.mjs').href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = process.env.TOUR_PROOF_DIR || await mkdtemp(tmpdir() + '/book-'); await mkdir(out, {recursive: true});
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'};
const server = http.createServer(async (q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join(root, p)); r.writeHead(200, {'content-type': types[extname(p)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.TOUR_CHROME || undefined});
const pass = m => console.log('PASS ' + m);
const pageSvg = n => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1699"><rect width="100%" height="100%" fill="#fbf6ec"/><text x="100" y="260" font-size="120" fill="#1d6b3d">Page ${n}</text></svg>`;

try {
  for (const [name, viewport] of [['desktop', {width: 1280, height: 860}], ['phone', {width: 390, height: 844}]]) {
    const ctx = await browser.newContext({viewport, reducedMotion: 'reduce', hasTouch: name === 'phone'});
    await ctx.route('**/*', r => {
      const url = r.request().url();
      if (url.endsWith('/book/ai-sauce/pages/manifest.json')) {
        const pages = Array.from({length: 10}, (_, i) => ({src: `p${String(i + 1).padStart(2, '0')}.svg`, width: 1200, height: 1699}));
        return r.fulfill({contentType: 'application/json', body: JSON.stringify({totalPages: 36, pages})});
      }
      const m = url.match(/\/book\/ai-sauce\/pages\/p(\d+)\.svg$/);
      if (m) return r.fulfill({contentType: 'image/svg+xml', body: pageSvg(Number(m[1]))});
      return url.startsWith(base) ? r.continue() : r.abort();
    });
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/book/ai-sauce/');
    await page.waitForFunction(() => document.querySelectorAll('#book .page').length === 11);
    assert.match(await page.textContent('#count'), /หน้า 1 \/ 10/);
    await page.screenshot({path: `${out}/${name}-page1.png`});
    for (let i = 0; i < 10; i++) await page.click('#next');
    assert.equal(await page.getAttribute('#lock', 'aria-hidden'), 'false');
    assert.match(await page.textContent('#lock-title'), /อีก 26 หน้า/);
    assert.equal(await page.getAttribute('#lock a.btn.primary', 'href'), '/ai-source/');
    assert.equal(await page.getAttribute('#lock a.btn.ghost', 'href'), '/learn/');
    assert.ok(await page.$eval('#next', b => b.disabled));
    await page.screenshot({path: `${out}/${name}-lock.png`});
    await page.keyboard.press('ArrowLeft');
    assert.match(await page.textContent('#count'), /หน้า 10 \/ 10/);
    assert.deepEqual(errors, []);
    pass(`${name}: 10 preview pages, then the course lock page`);
    await ctx.close();
  }
  { // no preview published yet: the lock page still works
    const ctx = await browser.newContext();
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage(); await page.goto(base + '/book/ai-sauce/');
    await page.waitForSelector('#empty:not([hidden])');
    assert.equal(await page.$$eval('#book .page', p => p.length), 1);
    pass('without published pages the reader shows the course lock page');
    await ctx.close();
  }
  console.log('Screenshots: ' + out);
} finally { await browser.close(); server.close(); }
