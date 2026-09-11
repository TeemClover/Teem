/** Lesson 3–4: real controls, saved work, Source checks, and a lazy native video preview. */
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
async function nativePreviewSettled(video) {
  // readyState can be 4 while Chrome is still fading its native seeking spinner.
  // Compare the centre of the visible player with the video's decoded pixels;
  // do not hide native controls, replace the video, or wait a fixed screenshot delay.
  let clean = 0, sample;
  for (let attempt = 0; attempt < 20; attempt++) {
    const png = (await video.screenshot()).toString('base64');
    sample = await video.evaluate(async (element, png) => {
      const image = await createImageBitmap(await (await fetch('data:image/png;base64,' + png)).blob());
      const shown = document.createElement('canvas'); shown.width = image.width; shown.height = image.height;
      const actual = shown.getContext('2d'); actual.drawImage(image, 0, 0);
      const decoded = document.createElement('canvas'); decoded.width = shown.width; decoded.height = shown.height;
      const expected = decoded.getContext('2d'); expected.drawImage(element, 0, 0, decoded.width, decoded.height);
      const x = Math.round(shown.width * .32), y = Math.round(shown.height * .35);
      const width = Math.round(shown.width * .36), height = Math.round(shown.height * .3);
      const a = actual.getImageData(x, y, width, height).data;
      const b = expected.getImageData(x, y, width, height).data;
      let darkOverlayPixels = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i] + 25 < b[i] && a[i + 1] + 25 < b[i + 1] && a[i + 2] + 25 < b[i + 2]) darkOverlayPixels++;
      }
      return { darkOverlayRatio:darkOverlayPixels / (a.length / 4), paused:element.paused, seeking:element.seeking, readyState:element.readyState };
    }, png);
    // Allow minor video/screenshot scaling differences, but reject the central loading ring.
    clean = sample.darkOverlayRatio < .01 && sample.paused && !sample.seeking && sample.readyState >= 3 ? clean + 1 : 0;
    if (clean >= 2) return sample;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.fail('Native video preview did not settle cleanly: ' + JSON.stringify(sample));
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
      window.__lesson3MediaEvents = [];
      for (const name of ['seeked', 'canplay']) document.addEventListener(name, event => {
        if (event.target.matches?.('[data-video-example]')) window.__lesson3MediaEvents.push(name);
      }, true);
      Object.defineProperty(navigator, 'clipboard', { value:{writeText:async text => window.__copied.push(text)}, configurable:true });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => report.errors.push({width,message:error.message}));
    const requests = [];
    page.on('request', request => { if (/\.mp4(?:$|[?#])/.test(request.url())) requests.push(request.url()); });
    await page.goto(base + '/classroom/clip-ai.html', { waitUntil:'domcontentloaded' });
    await page.locator('#lesson3VideoCheck').waitFor();
    await page.waitForTimeout(1400); // Includes the retained lesson's one-second startup reconciliation.
    assert.match(await page.locator('#lesson3Ready').innerText(), /2 ไฟล์/);
    assert.match(await page.locator('#lesson3Ready').innerText(), /โควตา/);
    assert.equal(await page.locator('#lesson3Ready a[href="lesson-0.html"]').count(), 1);
    const video = page.locator('[data-video-example]');
    assert.equal(await video.getAttribute('poster'), null, 'The actual video frame is the preview, not a separate image');
    assert.equal(await video.evaluate(element => element.controls), true);
    assert.equal(await page.locator('[data-video-play]').count(), 0, 'The native controls play the example');
    const nearViewport = await video.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.bottom >= -250 && box.top <= innerHeight + 250;
    });
    if (!nearViewport) assert.equal(requests.length, 0, 'The MP4 should stay unloaded while its preview is far below the viewport');
    await video.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-video-example]');
      return element.readyState >= 3 && element.videoWidth > 0 && element.currentTime >= 0.001 && !element.seeking;
    });
    assert.equal(await video.getAttribute('preload'), 'metadata');
    assert.match(await video.getAttribute('src'), /lesson3-source-example\.mp4#t=0\.001$/);
    const settled = await nativePreviewSettled(video);
    const events = await page.evaluate(() => window.__lesson3MediaEvents);
    assert.ok(events.includes('seeked') && events.includes('canplay'));
    const firstFrame = await video.evaluate(element => {
      const canvas = document.createElement('canvas'); canvas.width = 36; canvas.height = 64;
      const drawing = canvas.getContext('2d'); drawing.drawImage(element, 0, 0, 36, 64);
      const pixels = drawing.getImageData(0, 0, 36, 64).data;
      const colors = new Set(); let brightness = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
        brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      }
      return { paused:element.paused, time:element.currentTime, readyState:element.readyState, colors:colors.size, brightness:brightness / (pixels.length / 4), width:element.videoWidth, height:element.videoHeight };
    });
    assert.equal(firstFrame.paused, true, 'Showing the first frame must not autoplay video or audio');
    assert.ok(firstFrame.time < 0.05);
    assert.ok(firstFrame.colors > 8 && firstFrame.brightness > 1, 'The video must have decoded a visible frame, not a blank player');
    report.media.push({ viewport:width, phase:'first-frame', requests:requests.length, events, settled, ...firstFrame });
    await screenshot(page, '#lesson3VideoExample', `lesson3-example-${width}.png`);
    pass(`${width}px: nearby native video shows a decoded first frame with controls, no image poster, and no autoplay`);

    const checks = page.locator('.video-done input');
    await checks.nth(0).check();
    await checks.nth(3).check();
    await page.reload({ waitUntil:'domcontentloaded' });
    await page.locator('#lesson3CheckStatus').waitFor();
    assert.equal(await checks.nth(0).isChecked(), true);
    assert.equal(await checks.nth(1).isChecked(), false);
    assert.equal(await checks.nth(3).isChecked(), true);
    assert.match(await page.locator('#lesson3CheckStatus').innerText(), /2 \/ 4/);

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
    await video.evaluate(element => element.play());
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-video-example]');
      return element.currentTime > 0.1 && element.videoWidth > 0 && element.videoHeight > 0;
    });
    const metadata = await video.evaluate(element => ({ duration:element.duration, width:element.videoWidth, height:element.videoHeight, currentTime:element.currentTime, error:element.error?.message || null }));
    assert.ok(requests.length > 0);
    assert.equal(metadata.error, null);
    assert.ok(Number.isFinite(metadata.duration) && metadata.duration > 0);
    report.media.push({viewport:width, phase:'playback', requests:requests.length, ...metadata});
    await video.evaluate(element => element.pause());
    pass(`${width}px: original MP4 plays from its native preview with advancing playback`);

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
