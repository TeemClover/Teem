/** Classroom scroll/idle regression against real pages. APIs and clipboard are isolated. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { chromium } = await import(process.env.FRONTDOOR_PLAYWRIGHT
  ? pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href : 'playwright');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.avif':'image/avif' };
const server = createServer(async (req, res) => {
  try {
    let filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!filename.startsWith(root) || path.relative(root, filename).split(path.sep).some(part => part.startsWith('.'))) throw new Error('Invalid path');
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    res.writeHead(200, { 'content-type': mime[path.extname(filename)] || 'application/octet-stream' });
    res.end(await readFile(filename));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.CLASSROOM_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const output = process.env.CLASSROOM_PROOF_DIR || await mkdtemp(path.join(tmpdir(), 'classroom-scroll-'));
const browser = await chromium.launch({ executablePath:process.env.FRONTDOOR_CHROME, headless:true });
const report = { base, checks:[], errors:[] };
const pass = name => { report.checks.push(name); console.log('PASS ' + name); };

async function idle(page, label) {
  await page.waitForTimeout(300);
  const changes = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    observer.observe(document.getElementById('results'), { subtree:true, childList:true, attributes:true });
    setTimeout(() => { observer.disconnect(); resolve(count); }, 500);
  }));
  assert.equal(changes, 0, `${label}: prompt cards must stop mutating while idle (got ${changes} changes in 500 ms)`);
}

try {
  // These pages embed assets to work independently; fixing only an asset leaves production broken.
  const html = await readFile(path.join(root, 'classroom/prompts.html'), 'utf8');
  for (const name of ['prompts-season.js', 'prompts-plain-language.js']) {
    const embedded = html.match(new RegExp(`<script[^>]*data-self-contained="${name.replaceAll('.', '\\.')}"[^>]*>([\\s\\S]*?)<\\/script>`));
    assert.ok(embedded, `Missing embedded ${name}`);
    assert.equal(embedded[1].trim(), (await readFile(path.join(root, 'assets', name), 'utf8')).trim());
  }
  pass('Embedded lesson scripts match their source assets');
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport:{width,height:844}, isMobile:width===390, hasTouch:width===390 });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json:{ok:true,reviews:[]} });
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await context.addInitScript(() => {
      window.__copied = [];
      Object.defineProperty(navigator, 'clipboard', { value:{writeText:async text => {
        if (window.__denyCopy) throw new Error('Clipboard unavailable');
        window.__copied.push(text);
      }}, configurable:true });
      document.execCommand = () => false;
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => report.errors.push(error.message));
    if (width === 390) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate:4});
    await page.goto(base + '/classroom/', {waitUntil:'domcontentloaded'});
    await page.locator('#pathBtn').click();
    assert.equal(await page.locator('#pathBtn').getAttribute('aria-expanded'), 'true');
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => scrollY > 0));
    await page.locator('a.lesson[data-item="prompts"]').click();
    await page.locator('#results .pc').first().waitFor();
    await page.waitForTimeout(1600);
    await idle(page, `${width}px initial cards`);
    await page.locator('#showAll').click();
    assert.equal(await page.locator('#results .pc').count(), 44);
    await idle(page, `${width}px all 44 cards`);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(100); }
    assert.ok(await page.evaluate(() => scrollY > 1000));
    const card = page.locator('#results .pc').first();
    await card.locator('[data-act="use"]').click();
    await page.waitForFunction(() => document.querySelector('#results .pc.open'));
    assert.match(await card.locator('[data-act="use"]').innerText(), /กำลังปรับแต่ง/);
    const input = card.locator('.drawer [data-k]').first();
    await input.fill('CLASSROOM_SCROLL_REGRESSION');
    await page.waitForFunction(() => document.querySelector('#results .pc.open [data-prev]')?.textContent.includes('CLASSROOM_SCROLL_REGRESSION'));
    await idle(page, `${width}px customized drawer`);
    await card.locator('[data-act="anatomy"]').click();
    await page.waitForFunction(() => document.querySelector('#results .pc.open [data-prev]')?.dataset.anat === '1');
    await card.locator('[data-act="anatomy"]').click();
    await idle(page, `${width}px after anatomy toggle`);
    assert.match(await card.locator('[data-act="anatomy"]').innerText(), /ดูส่วนผสม/);
    await card.locator('[data-act="copyFilled"]').click();
    await page.waitForFunction(() => window.__copied.length === 1);
    assert.match(await page.evaluate(() => window.__copied[0]), /CLASSROOM_SCROLL_REGRESSION/);
    assert.match(await card.locator('[data-act="copyFilled"]').innerText(), /คัดลอกแล้ว/);
    await page.waitForTimeout(1800);
    await idle(page, `${width}px after copy reset`);
    await card.locator('[data-act="raw"]').click();
    await page.waitForFunction(() => window.__copied.length === 2);
    assert.match(await card.locator('[data-act="raw"]').innerText(), /คัดลอกแล้ว/);
    await page.waitForTimeout(1800);
    await page.evaluate(() => { window.__denyCopy = true; });
    await card.locator('[data-act="raw"]').click();
    await page.waitForTimeout(100);
    assert.doesNotMatch(await card.locator('[data-act="raw"]').innerText(), /คัดลอกแล้ว/);
    assert.equal(await page.evaluate(() => window.__copied.length), 2);
    await idle(page, `${width}px denied clipboard`);
    await page.keyboard.press('Escape');
    await idle(page, `${width}px closed drawer`);
    assert.equal(await page.locator('#results .pc.open').count(), 0);
    assert.match(await card.locator('[data-act="use"]').innerText(), /ปรับแต่งก่อนใช้/);
    await page.locator('#q').fill('zzzz-no-matching-prompt-12345');
    await page.waitForFunction(() => document.querySelectorAll('#results .pc').length === 0);
    await page.locator('#showAll').click();
    await page.waitForFunction(() => document.querySelectorAll('#results .pc').length === 44);
    await idle(page, `${width}px rerendered cards`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#results').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output, `lesson5-${width}.png`)});
    pass(`${width}px: enter from classroom, scroll 44 cards, customize, copy success/failure, search, rerender, zero idle mutations`);
    await context.close();
  }
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; throw error; }
finally {
  await writeFile(path.join(output, 'proof.json'), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  console.log('Proof: ' + output);
}
