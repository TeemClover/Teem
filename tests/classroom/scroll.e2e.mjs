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
    for (const id of ['deckCards', 'wokItems', 'forgeOut']) observer.observe(document.getElementById(id), { subtree:true, childList:true, attributes:true, characterData:true });
    setTimeout(() => { observer.disconnect(); resolve(count); }, 500);
  }));
  assert.equal(changes, 0, `${label}: command deck must stop mutating while idle (got ${changes} changes in 500 ms)`);
}

try {
  // These pages embed assets to work independently; fixing only an asset leaves production broken.
  for (const [file, name] of [['season-commands.html', 'command-deck.js'], ['prompts.html', 'course-learning-journey.js']]) {
    const html = await readFile(path.join(root, 'classroom', file), 'utf8');
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
      localStorage.setItem('mc_classroom_trailer_v1', JSON.stringify({ played: true }));
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
    // Lesson 5 opens on its hub; the command deck is part 5.1.
    await page.locator('#route1').waitFor();
    await page.goto(new URL('season-commands.html', page.url()).href);
    await page.locator('#deckCards .dc').first().waitFor();
    await page.waitForTimeout(1600);
    assert.equal(await page.locator('#deckCards .dc').count(), 29);
    await idle(page, `${width}px initial deck`);
    // Category filter, then back to everything.
    await page.locator('#deckCats [data-cat="video"]').click();
    assert.equal(await page.locator('#deckCards .dc').count(), 6);
    assert.equal(await page.locator('#deckCards .dc[data-id="brushstory"]').count(), 1);
    await page.locator('#deckCats [data-cat="all"]').click();
    assert.equal(await page.locator('#deckCards .dc').count(), 29);
    // Drag a card with the pointer and drop it on the floating wok dock.
    const card = page.locator('#deckCards .dc[data-id="foodangle"]');
    await card.scrollIntoViewIfNeeded();
    const box = await card.locator('.dc-name').boundingBox();
    await page.mouse.move(box.x + 10, box.y + 5);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 10 + i * 3, box.y + 5 + i * ((800 - box.y) / 10));
    await page.locator('#dock[data-show="true"]').waitFor();
    const dock = await page.locator('#dock').boundingBox();
    await page.mouse.move(dock.x + dock.width / 2, dock.y + dock.height / 2);
    await page.mouse.up();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('mc_command_deck_v1')).wok.includes('foodangle'));
    assert.equal(await card.getAttribute('data-in'), 'true');
    // Tap to add a second command (combo), then style it with one tap.
    await page.locator('#deckCards .dc[data-id="caption"] .dc-add').click();
    await page.waitForFunction(() => document.querySelectorAll('#wokItems .wi').length === 2);
    await page.locator('[data-opt="foodangle|angle|top"]').click();
    assert.equal(await page.locator('[data-opt="foodangle|angle|top"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-field="foodangle"]').fill('CLASSROOM_SCROLL_REGRESSION');
    await page.waitForFunction(() => document.getElementById('forgeOut').textContent.includes('CLASSROOM_SCROLL_REGRESSION'));
    assert.match(await page.locator('#forgeOut').innerText(), /top-down flat lay/);
    assert.match(await page.locator('#forgeOut').innerText(), /Do these in order/);
    assert.match(await page.locator('#shortCmd').innerText(), /\/foodangle ท็อปวิว — CLASSROOM_SCROLL_REGRESSION/);
    await idle(page, `${width}px styled combo`);
    // A fourth command is refused once the wok holds three.
    await page.locator('#deckCards .dc[data-id="reel"] .dc-add').click();
    await page.locator('#deckCards .dc[data-id="hook"] .dc-add').click();
    assert.equal(await page.locator('#wokItems .wi').count(), 3);
    await page.locator('[data-remove="reel"]').click();
    assert.equal(await page.locator('#wokItems .wi').count(), 2);
    // Copy success and failure.
    await page.locator('[data-ship="copy"]').click();
    await page.waitForFunction(() => window.__copied.length === 1);
    const copied = await page.evaluate(() => window.__copied[0]);
    assert.match(copied, /CLASSROOM_SCROLL_REGRESSION/);
    assert.doesNotMatch(copied, /[⟦⟧⟪⟫]/, 'highlight markers never reach the clipboard');
    await page.waitForTimeout(1800);
    await page.evaluate(() => { window.__denyCopy = true; });
    await page.locator('[data-ship="copy"]').click();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__copied.length), 1);
    assert.match(await page.locator('#toast').innerText(), /คัดลอกไม่สำเร็จ/);
    await page.evaluate(() => { window.__denyCopy = false; });
    await page.waitForTimeout(1800);
    await idle(page, `${width}px after copy`);
    // Smart search suggests and adds on Enter; remix chips copy follow-up commands.
    await page.locator('#deckQ').fill('อยากลองชุดใหม่ไปงานแต่ง');
    await page.waitForFunction(() => document.querySelector('#deckSuggest .sg[data-add="outfit"]'));
    await page.locator('#deckQ').press('Enter');
    await page.waitForFunction(() => document.querySelector('#wokItems .wi[data-id="outfit"]'));
    await page.locator('[data-remix="fix"]').click();
    await page.waitForFunction(() => window.__copied.length === 2);
    assert.match(await page.evaluate(() => window.__copied[1]), /Change only this/);
    // The draft survives a reload.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#wokItems .wi').first().waitFor();
    assert.equal(await page.locator('[data-field="foodangle"]').inputValue(), 'CLASSROOM_SCROLL_REGRESSION');
    assert.equal(await page.locator('#wokItems .wi').count(), 3);
    await idle(page, `${width}px restored wok`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#forge').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output, `lesson5-${width}.png`)});
    pass(`${width}px: enter from classroom, filter 29 commands, drag-drop + tap combo, styles, copy success/failure, smart search, remix, reload, zero idle mutations`);
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
