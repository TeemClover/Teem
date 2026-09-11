/** Lesson 3–4: real controls, saved work, Source checks, and click-to-load video. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { chromium } = await import(process.env.FRONTDOOR_PLAYWRIGHT
  ? pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href : 'playwright');
const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png',
  '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.avif':'image/avif',
  '.mp4':'video/mp4', '.pdf':'application/pdf', '.md':'text/plain; charset=utf-8',
  '.woff2':'font/woff2', '.json':'application/json'
};
const server = createServer(async (req, res) => {
  try {
    let filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    const relative = path.relative(root, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.'))) throw new Error('Invalid path');
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    const { size } = await stat(filename);
    let start = 0, end = size - 1, status = 200;
    const headers = { 'content-type':mime[path.extname(filename)] || 'application/octet-stream', 'accept-ranges':'bytes' };
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) { res.writeHead(416, { 'content-range':`bytes */${size}` }); res.end(); return; }
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) { res.writeHead(416, { 'content-range':`bytes */${size}` }); res.end(); return; }
      headers['content-range'] = `bytes ${start}-${end}/${size}`;
      status = 206;
    }
    headers['content-length'] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = createReadStream(filename, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch { if (!res.headersSent) res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const output = process.env.CLASSROOM_PROOF_DIR || await mkdtemp(path.join(tmpdir(), 'classroom-lesson34-'));
await mkdir(output, { recursive:true });
const browser = await chromium.launch({ executablePath:process.env.FRONTDOOR_CHROME, headless:true });
const report = { base, checks:[], errors:[], media:[], screenshots:[] };
const pass = name => { report.checks.push(name); console.log('PASS ' + name); };
async function screenshot(page, target, name) {
  await page.locator(target).scrollIntoViewIfNeeded();
  await page.screenshot({ path:path.join(output, name) });
  report.screenshots.push(name);
}
async function copy(page, selector) {
  const count = await page.evaluate(() => window.__copied.length);
  await page.locator(selector).click();
  await page.waitForFunction(n => window.__copied.length === n + 1, count);
  return page.evaluate(() => window.__copied.at(-1));
}
async function idle(page, selector) {
  const count = await page.locator(selector).evaluate(element => new Promise(resolve => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    observer.observe(element, { childList:true, subtree:true, attributes:true });
    setTimeout(() => { observer.disconnect(); resolve(count); }, 400);
  }));
  assert.equal(count, 0, `${selector} must stop changing after the interaction settles`);
}

try {
  for (const [page, names] of [
    ['clip-ai', ['lesson3-video-fast-track.js', 'lesson3-video-example.js']],
    ['notebooklm', ['lesson4-learning-practice.js']]
  ]) {
    const html = await readFile(path.join(root, `classroom/${page}.html`), 'utf8');
    for (const name of names) {
      const match = html.match(new RegExp(`<script[^>]*data-self-contained="${name.replaceAll('.', '\\.')}"[^>]*>([\\s\\S]*?)<\\/script>`));
      assert.ok(match, `Missing inline ${name}`);
      assert.equal(match[1].trim(), (await readFile(path.join(root, 'assets', name), 'utf8')).trim());
    }
    if (page === 'clip-ai') {
      assert.doesNotMatch(html, /data:video\/mp4;base64,/);
      report.lesson3HTMLBytes = Buffer.byteLength(html);
    }
  }
  const range = await fetch(base + '/classroom/media/lesson3-source-example.mp4', { headers:{range:'bytes=0-63'} });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('content-type'), 'video/mp4');
  assert.match(range.headers.get('content-range'), /^bytes 0-63\/\d+$/);
  assert.equal((await range.arrayBuffer()).byteLength, 64);
  pass('Source/inline scripts match; MP4 lives outside HTML and the preview serves media ranges');

  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport:{width,height:844}, isMobile:width===390, hasTouch:width===390, reducedMotion:'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json:{ok:true,reviews:[]} });
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    await context.addInitScript(() => {
      window.__copied = [];
      Object.defineProperty(navigator, 'clipboard', { value:{writeText:async text => window.__copied.push(text)}, configurable:true });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => report.errors.push({width,message:error.message}));
    const requests = [];
    page.on('request', request => { if (/\.mp4(?:$|\?)/.test(request.url())) requests.push(request.url()); });
    await page.goto(base + '/classroom/clip-ai.html', { waitUntil:'domcontentloaded' });
    await page.locator('#lesson3VideoCheck').waitFor();
    await page.waitForTimeout(1400); // Includes the retained lesson's one-second startup reconciliation.
    assert.match(await page.locator('#lesson3Ready').innerText(), /2 ไฟล์/);
    assert.match(await page.locator('#lesson3Ready').innerText(), /โควตา/);
    assert.equal(await page.locator('#lesson3Ready a[href="lesson-0.html"]').count(), 1);
    const video = page.locator('[data-video-example]');
    assert.equal(await video.getAttribute('preload'), 'none');
    assert.match(await video.getAttribute('poster'), /header-lesson3\.webp$/);
    assert.equal(requests.length, 0, 'No MP4 request should occur before the user plays the example');
    await screenshot(page, '#lesson3VideoExample', `lesson3-example-${width}.png`);
    assert.equal(requests.length, 0, 'Scrolling to the video must not fetch it');
    pass(`${width}px: clear video readiness and zero MP4 requests on entry or scroll`);

    const checks = page.locator('.video-done input');
    await checks.nth(0).check();
    await checks.nth(3).check();
    await page.reload({ waitUntil:'domcontentloaded' });
    await page.locator('#lesson3CheckStatus').waitFor();
    assert.equal(await checks.nth(0).isChecked(), true);
    assert.equal(await checks.nth(1).isChecked(), false);
    assert.equal(await checks.nth(3).isChecked(), true);
    assert.match(await page.locator('#lesson3CheckStatus').innerText(), /2 \/ 4/);
    assert.equal(requests.length, 0, 'Reloading saved work must not fetch the video');

    for (const [choice, expected] of [['story', /เหตุการณ์/], ['visual', /วัตถุหรือช่วงเวลาที่เพี้ยน/], ['format', /ปรับเฉพาะรูปแบบ/], ['story', /เหตุการณ์/]]) {
      await page.locator(`[data-video-repair="${choice}"]`).click();
      assert.equal(await page.locator(`[data-video-repair="${choice}"]`).getAttribute('aria-pressed'), 'true');
      const text = await copy(page, '[data-video-prompt="repair"] .cpx');
      assert.match(text, expected, 'Clipboard must contain the current repair selection, including when revisiting a choice');
    }
    await page.waitForTimeout(1500);
    await idle(page, '#lesson3Repair');
    await screenshot(page, '#lesson3Repair', `lesson3-repair-${width}.png`);
    pass(`${width}px: lesson 3 checks survive reload; every repair copies its current command without an idle update loop`);

    await video.scrollIntoViewIfNeeded();
    await page.locator('[data-video-play]').click();
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-video-example]');
      return element.currentTime > 0.1 && element.videoWidth > 0 && element.videoHeight > 0;
    });
    const metadata = await video.evaluate(element => ({ duration:element.duration, width:element.videoWidth, height:element.videoHeight, currentTime:element.currentTime, error:element.error?.message || null }));
    assert.ok(requests.length > 0);
    assert.equal(metadata.error, null);
    assert.ok(Number.isFinite(metadata.duration) && metadata.duration > 0);
    report.media.push({viewport:width, requests:requests.length, ...metadata});
    await video.evaluate(element => element.pause());
    pass(`${width}px: original MP4 downloads on play and decodes with advancing playback`);

    await page.goto(base + '/classroom/notebooklm.html', { waitUntil:'domcontentloaded' });
    await page.locator('#lesson4FirstOutput').waitFor();
    assert.equal(await page.locator('.source-options > article').count(), 2);
    assert.match(await page.locator('.source-options').innerText(), /มีซอสของฉันแล้ว/);
    assert.match(await page.locator('.source-options').innerText(), /อยากลองตามตัวอย่าง/);
    assert.match(await page.locator('.source-options + .note').innerText(), /ใช้ได้ทั้งซอสของคุณและซอสตัวอย่าง/);
    const sample = await copy(page, '#copySrc');
    assert.equal(sample, await readFile(path.join(root, 'classroom/lv4/myclover_GLHF_7C_GrowthOS_Source.md'), 'utf8'));
    const audit = page.locator('details.fold').filter({hasText:'ผ่าไฟล์'});
    await audit.locator('summary').click();
    const auditPrompt = await copy(page, 'details.fold [data-prompt-guard="off"] .cpx');
    assert.match(auditPrompt, /รายงานตรวจ Source เท่านั้น/);
    assert.match(auditPrompt, /ข้อเท็จจริง 3 ข้อ/);
    assert.doesNotMatch(auditPrompt, /สร้าง Output ที่เลือกต่อทันที|ห้ามถามคำถามกลับ/);
    pass(`${width}px: own/example Source paths stay separate from import mode; sample and review-only prompt copy completely`);

    for (const [choice, expected] of [['image', /ภาพสรุป/], ['slides', /สไลด์/], ['audio', /เสียง/]]) {
      await page.locator(`[data-first-output="${choice}"]`).click();
      assert.match(await page.locator('#lesson4PlanTitle').innerText(), expected);
      assert.equal(await page.locator(`[data-first-output="${choice}"]`).getAttribute('aria-pressed'), 'true');
    }
    await page.locator('#lesson4FirstDone').check();
    await page.reload({ waitUntil:'domcontentloaded' });
    await page.locator('#lesson4Plan').waitFor();
    assert.equal(await page.locator('[data-first-output="audio"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#lesson4FirstDone').isChecked(), true);
    await page.locator('[data-first-output="image"]').click();
    assert.equal(await page.locator('#lesson4FirstDone').isChecked(), false, 'Completion belongs to the selected output');
    await page.locator('[data-first-output="audio"]').click();
    assert.equal(await page.locator('#lesson4FirstDone').isChecked(), true);
    await screenshot(page, '#lesson4FirstOutput', `lesson4-first-output-${width}.png`);
    pass(`${width}px: all first-output choices work; the selected plan and its own checked state survive reload`);

    for (const [choice, expected] of [['count', /จำนวนตรงกันแล้ว/], ['none', /ยังมี 1 จุด/], ['duration', /แก้เฉพาะเสียงเป็น/]]) {
      await page.locator(`[data-taste-answer="${choice}"]`).click();
      assert.match(await page.locator('#lesson4TasteFeedback').innerText(), expected);
    }
    await idle(page, '#lesson4Practice');
    await screenshot(page, '#lesson4Practice', `lesson4-mismatch-${width}.png`);
    pass(`${width}px: mismatch exercise explains wrong answers and identifies the one-hour repair without changing the correct Source`);
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
