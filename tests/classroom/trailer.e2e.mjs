/** /classroom course trailer: first-visit popup, play/skip memory, header replay, bundle freshness and frame rate. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat, mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const {chromium} = await import(process.env.FRONTDOOR_PLAYWRIGHT ? pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href : 'playwright');
const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const server = createServer(async (req, res) => {
  try {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root) || path.relative(root, file).split(path.sep).some(part => part.startsWith('.'))) throw Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, {'content-type': mime[path.extname(file)] || 'application/octet-stream'}); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.CLASSROOM_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const output = process.env.CLASSROOM_PROOF_DIR || await mkdtemp(path.join(tmpdir(), 'classroom-trailer-'));
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME, headless: true});
const report = {base, checks: [], errors: []};
const pass = name => { report.checks.push(name); console.log('PASS ' + name); };
async function context(width) {
  const c = await browser.newContext({viewport: {width, height: width < 700 ? 844 : 900}, isMobile: width < 700, hasTouch: width < 700});
  await c.route('**/*', route => { const u = new URL(route.request().url()); if (u.pathname.startsWith('/api/')) return route.fulfill({json: {ok: true, reviews: []}}); return u.origin === new URL(base).origin ? route.continue() : route.abort(); });
  return c;
}
try {
  execFileSync(process.execPath, [path.join(root, 'tools/build-classroom-trailer.mjs'), '--check'], {stdio: 'pipe'});
  pass('assets/classroom-trailer.js matches its sources');
  for (const width of [390, 1440]) {
    const c = await context(width);
    const page = await c.newPage(); page.setDefaultTimeout(8000);
    page.on('pageerror', e => report.errors.push(`${width}: ${e.message}`));
    await page.goto(base + '/classroom/', {waitUntil: 'domcontentloaded'});
    const pop = page.locator('#trailerPop');
    await pop.waitFor({state: 'visible'});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow');
    await page.screenshot({path: path.join(output, `popup-${width}.png`)});
    await pop.locator('.trx-big').click();
    await page.waitForFunction(() => document.querySelector('#trailerPop .trx')?.dataset.state === 'playing');
    const frames = await page.evaluate(() => new Promise(resolve => { const p = document.querySelector('#trailerPop .trx')._player; const f0 = p.frames; setTimeout(() => resolve(p.frames - f0), 1000); }));
    assert.ok(frames >= 40, `trailer renders smoothly (${frames} frames in 1 s)`);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mc_classroom_trailer_v1')).played), true);
    await page.screenshot({path: path.join(output, `playing-${width}.png`)});
    await pop.locator('.trx-skip').click();
    await pop.waitFor({state: 'hidden'});
    await page.reload({waitUntil: 'domcontentloaded'}); await page.waitForTimeout(900);
    assert.equal(await pop.isVisible(), false, 'no popup after the trailer was played');
    await page.locator('[data-trailer-play]').click();
    await page.waitForFunction(() => document.querySelector('#classroomTrailer')?.dataset.state === 'playing');
    assert.ok(await page.locator('#courseStart').isVisible());
    pass(`${width}px: first-visit popup plays, remembers, and the header player replays on demand`);
    await c.close();
  }
  // Skipping without playing: the popup returns once more, then stops asking.
  const c = await context(390); const page = await c.newPage();
  for (let visit = 1; visit <= 3; visit++) {
    await page.goto(base + '/classroom/', {waitUntil: 'domcontentloaded'}); await page.waitForTimeout(900);
    const visible = await page.locator('#trailerPop').isVisible();
    assert.equal(visible, visit <= 2, `visit ${visit} popup ${visible}`);
    if (visible) { await page.locator('#trailerPop .trx-skip').click(); await page.locator('#trailerPop').waitFor({state: 'hidden'}); }
  }
  await page.goto(base + '/classroom/?trailer=1', {waitUntil: 'domcontentloaded'});
  await page.locator('#trailerPop').waitFor({state: 'visible'});
  pass('skipping twice stops the popup; ?trailer=1 brings it back');
  await c.close();
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; throw error; }
finally { await writeFile(path.join(output, 'proof.json'), JSON.stringify(report, null, 2)); await browser.close(); await new Promise(r => server.close(r)); console.log('Proof: ' + output); }
