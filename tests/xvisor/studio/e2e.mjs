// Browser acceptance run for /xvisor/studio/. Serve the repo root first, e.g.
//   python3 -m http.server 4400 --bind 127.0.0.1
//   node tests/xvisor/studio/e2e.mjs
// Writes screenshots, exported files and report.json to $STUDIO_OUT (default /tmp/xvisor-studio/e2e).
import { launch, openPage, IPHONE, DESKTOP, BASE } from './browser.mjs';
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.STUDIO_OUT || '/tmp/xvisor-studio/e2e';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
execFileSync('python3', [path.join(HERE, 'fixtures.py'), path.join(OUT, 'fixtures')]);
const report = { base: BASE, chrome: null, devices: { mobile: 'Chrome device emulation 393×852 @3x, touch, iOS 17 Safari UA (not a real iPhone)', desktop: '1366×900' }, checks: [] };
const check = (name, ok, detail = '') => { report.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const LONG_HOOK = 'เช้านี้ยืนดูเลขบนเครื่องชั่งนานมาก แล้วนึกได้ว่าเลขวันเดียวยังบอกอะไรไม่หมด';

const browser = await launch();
report.chrome = await browser.version();
await browser.defaultBrowserContext().overridePermissions(BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);

async function downloadsTo(page, dir) {
  await mkdir(dir, { recursive: true });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
}
async function editorOpen(page) { await page.waitForFunction(() => !document.getElementById('editorPanel').hidden && window.__studio.plan(), { timeout: 20000 }); }
async function playheadOf(page) { return page.evaluate(() => Number(document.getElementById('scrub').value) / 1000 * window.__studio.plan().duration); }
function probe(file) { return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,format_name:stream=codec_name,width,height', '-of', 'json', file]).toString()); }
function frameAt(file, t, png) { execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=540:960', png]); }
// PSNR (dB) between two images after scaling both to 540×960.
function psnrDb(a, b) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', a, '-i', b, '-lavfi', '[0]scale=540:960,format=rgb24[x];[1]scale=540:960,format=rgb24[y];[x][y]psnr', '-f', 'null', '-']);
  const m = r.stderr.toString().match(/average:([\d.]+|inf)/);
  return m ? (m[1] === 'inf' ? 99 : Number(m[1])) : 0;
}
async function saveDataUrl(dataUrl, file) { await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64')); }

// ---------- 1. direct open + refresh, mobile ----------
{
  const { page, errors } = await openPage(browser, IPHONE, '/xvisor/studio');
  check('1 open /xvisor/studio directly', page.url().endsWith('/xvisor/studio/') || page.url().endsWith('/xvisor/studio'), page.url());
  await page.reload({ waitUntil: 'networkidle0' });
  const title = await page.title();
  check('1 refresh keeps the page', title.includes('X‑VISOR Studio'), title);
  const heavy = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => /render\.js|export\.js|fonts\.js/.test(n)));
  check('1 renderer not loaded before the demo is seen', heavy.length === 0, heavy.join(','));
  await page.screenshot({ path: `${OUT}/m1-landing.png` });
  await page.click('#demoPlay');
  await wait(2500);
  const v = await page.evaluate(() => { const v = document.getElementById('demoVideo'); return { t: v.currentTime, d: v.duration, paused: v.paused, w: v.videoWidth, h: v.videoHeight }; });
  check('2 demo clip plays immediately', !v.paused && v.t > 1 && v.w === 1080 && v.h === 1920, JSON.stringify(v));
  await page.screenshot({ path: `${OUT}/m2-demo-playing.png` });
  await page.evaluate(() => { const v = document.getElementById('demoVideo'); v.currentTime = v.duration - 1.2; });
  await page.waitForFunction(() => document.getElementById('demoVideo').ended, { timeout: 8000 }).catch(() => {});
  check('2 demo clip plays to the end', await page.evaluate(() => document.getElementById('demoVideo').ended));
  check('1 no console errors on landing', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 2. sample flow + 4. edits + export + brief, mobile ----------
{
  const { page, errors } = await openPage(browser, IPHONE);
  const dl = path.join(OUT, 'export-mobile');
  await downloadsTo(page, dl);
  const t0 = Date.now();
  await page.click('#trySample');
  await editorOpen(page);
  const sampleReady = Date.now() - t0;
  await wait(1500);
  const ph1 = await playheadOf(page);
  const plan0 = await page.evaluate(() => window.__studio.plan());
  const demoJson = JSON.parse(await readFile(path.join(HERE, '../../../xvisor/studio/demo/demo.json'), 'utf8'));
  check('2 sample draft opens and plays', ph1 > 0.5, `ready in ${sampleReady} ms, playhead ${ph1.toFixed(2)} s`);
  check('2 sample plan in browser = pre-rendered demo plan', plan0.id === demoJson.clips.find(c => c.style === 'story').id, `${plan0.id} vs ${demoJson.clips.find(c => c.style === 'story').id}`);
  await page.evaluate(() => document.getElementById('editorPanel').scrollIntoView());
  await page.screenshot({ path: `${OUT}/m3-sample-editor.png` });
  await page.evaluate(() => { const s = document.getElementById('scrub'); s.value = '990'; s.dispatchEvent(new Event('input')); });
  await page.click('#playBtn');
  await wait(1500);
  const ended = await page.evaluate(() => document.getElementById('playBtn').textContent === '▶');
  check('2 sample preview plays to the end', ended);

  // 4. longer Thai hook
  await page.click('#hook', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#hook', LONG_HOOK, { delay: 5 });
  await wait(300);
  const plan1 = await page.evaluate(() => window.__studio.plan());
  check('4 hook edit reaches the plan', plan1.shots[0].text === LONG_HOOK && plan1.id !== plan0.id, plan1.id);
  // move focus of photo 1 by dragging on its crop thumbnail
  const crop = await page.$('.crop .crop-wrap');
  const box = await crop.boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.3).catch(() => {});
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.32, box.y + box.height * 0.3, { steps: 6 });
  await page.mouse.up();
  await wait(300);
  const plan2 = await page.evaluate(() => window.__studio.plan());
  check('4 crop focus change reaches the plan', Math.abs(plan2.photos[0].focus.x - plan1.photos[0].focus.x) > 0.05 && plan2.id !== plan1.id, JSON.stringify(plan2.photos[0].focus));
  const fit = await page.evaluate(() => ({ warn: !document.getElementById('fitWarn').hidden }));
  check('4 long hook fits without overflow', !fit.warn);
  await page.evaluate(() => { const s = document.getElementById('scrub'); s.value = '60'; s.dispatchEvent(new Event('input')); document.getElementById('guides').click(); });
  await wait(200);
  await page.evaluate(() => document.querySelector('.preview-col').scrollIntoView());
  await page.screenshot({ path: `${OUT}/m4-edited-hook-guides.png` });
  await page.evaluate(() => document.getElementById('guides').click());

  // preview frame vs renderer frame for the same plan (identity check of what is on screen)
  const tHook = Math.min(1.6, plan2.shots[0].end - 0.3);
  await page.evaluate(t => { const s = document.getElementById('scrub'); s.value = String(Math.round(t / window.__studio.plan().duration * 1000)); s.dispatchEvent(new Event('input')); }, tHook);
  await saveDataUrl(await page.evaluate(() => document.getElementById('preview').toDataURL('image/png')), `${OUT}/m5-preview-hook.png`);

  // brief + clipboard
  await page.click('#claudeBtn');
  await wait(300);
  await page.click('#copyOnly');
  await wait(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR ' + e));
  const briefShown = await page.$eval('#brief', el => el.value);
  await writeFile(`${OUT}/brief-mobile.txt`, clip);
  check('4 copied text = brief on screen', clip === briefShown, `${clip.length} chars`);
  check('4 brief has new hook, plan id and repo link', clip.includes(LONG_HOOK) && clip.includes(`ฉบับ ${plan2.id}`) && clip.startsWith('ชุดความรู้ X-VISOR อยู่ที่ https://github.com/TeemClover/xvisor'));
  check('4 brief does not keep the old hook', !clip.includes(plan0.shots[0].text));
  await page.screenshot({ path: `${OUT}/m6-claude-sheet.png` });
  const popup = new Promise(r => browser.once('targetcreated', t => r(t.url())));
  await page.click('#copyOpen');
  const opened = await Promise.race([popup, wait(4000).then(() => '')]);
  check('3c "คัดลอกแล้วเปิด Claude" opens Claude from the tap', opened.startsWith('https://claude.ai/new'), opened);
  for (const p of await browser.pages()) if (p.url().includes('claude.ai')) await p.close();
  await page.bringToFront();
  await page.evaluate(() => document.getElementById('claudeSheet').close());

  // export
  const support = await page.evaluate(async () => (await import('/xvisor/studio/engine/export.js')).exportSupport(''));
  report.exportSupport = support;
  check('5 save button says what it saves', (await page.$eval('#saveBtn', b => b.textContent)) === support.label, support.label);
  await page.click('#saveBtn');
  await page.waitForFunction(() => window.__studioLastExport, { timeout: 60000 });
  const ex = await page.evaluate(() => window.__studioLastExport);
  if (ex.error) check('5 export', false, ex.error);
  else {
    await page.waitForFunction(() => true);
    await wait(1500);
    const files = await readdir(dl);
    const file = path.join(dl, files.find(f => f === ex.name) || '');
    check('5 file name carries plan id and real type', ex.name === `xvisor-clip-${plan2.id}.${support.ext}` && files.includes(ex.name), `${ex.name} ${ex.mime}`);
    const info = probe(file);
    const v = info.streams.find(s => s.width);
    const dur = Number(info.format.duration);
    report.export = { file: ex.name, mime: ex.mime, probe: info };
    check('5 external probe: 9:16, duration matches plan', v && v.width * 16 === v.height * 9 && Math.abs(dur - plan2.duration) < 0.6, `${v?.codec_name} ${v?.width}×${v?.height} ${dur}s vs plan ${plan2.duration}s, format ${info.format.format_name}`);
    const ext = support.ext === 'mp4' ? /mp4|mov/ : /webm|matroska/;
    check('5 container matches extension', ext.test(info.format.format_name), info.format.format_name);
    // start / middle / end frames from the file vs the renderer at the same times
    const times = [tHook, plan2.duration / 2, plan2.duration - 0.25];
    const scores = [];
    for (const [i, t] of times.entries()) {
      frameAt(file, t, `${OUT}/m7-file-${i}.png`);
      await saveDataUrl(await page.evaluate(tt => window.__studio.frame(tt, 540, 'image/png'), t), `${OUT}/m7-render-${i}.png`);
      scores.push(psnrDb(`${OUT}/m7-file-${i}.png`, `${OUT}/m7-render-${i}.png`));
    }
    report.framePsnr = scores;
    check('5 file frames match renderer (start/middle/end)', scores.every(s => s > 22), scores.map(s => s.toFixed(1)).join(' / ') + ' dB');
  }
  check('2-5 no console errors in sample flow', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 3. own photo, no camera, desktop ----------
{
  const { page, errors } = await openPage(browser, DESKTOP);
  await page.click('#useOwn').catch(() => {});
  const input = await page.$('#fileInput');
  await input.uploadFile(path.join(OUT, 'fixtures/IMG_0001.HEIC'));
  await page.waitForFunction(() => !document.getElementById('photoError').hidden, { timeout: 8000 });
  const heicMsg = await page.$eval('#photoError', e => e.textContent);
  check('3 unreadable HEIC gets a Thai explanation', /HEIC/.test(heicMsg) && /เปิดรูป/.test(heicMsg), heicMsg);
  await input.uploadFile(path.join(OUT, 'fixtures/rotated-landscape.jpg'));
  await page.waitForFunction(() => window.__studio.state.photos.length === 1, { timeout: 8000 });
  const ph = await page.evaluate(() => { const p = window.__studio.state.photos[0]; return { w: p.width, h: p.height, origin: p.origin }; });
  check('3 EXIF orientation applied (landscape file shows upright portrait)', ph.h > ph.w && ph.origin === 'device', JSON.stringify(ph));
  await page.type('#story', 'มีรูปเครื่องชั่งเมื่อเช้า พี่ไม่อยากออกกล้อง อยากทำคลิปสั้นแบบคุยกับเพื่อน');
  await wait(200);
  const understood = await page.$eval('#understood', e => e.textContent);
  const questions = await page.$$eval('#questions .q-title', els => els.map(e => e.textContent));
  check('3 story understood, only open questions asked', /ไม่ออกกล้อง/.test(understood) && questions.length === 2, `${understood} | ${questions.join(' / ')}`);
  await page.screenshot({ path: `${OUT}/d1-own-tell.png`, fullPage: true });
  await page.click('#makeDraft');
  await editorOpen(page);
  await wait(800);
  const plan = await page.evaluate(() => window.__studio.plan());
  const texts = plan.shots.map(s => s.text).join(' ');
  check('3 draft uses that photo in every shot', plan.photos.length === 1 && plan.photos[0].origin === 'device' && plan.shots.every(s => s.photo === 0));
  check('3 draft never asks to film a face', !/ออกกล้อง|ถ่ายหน้า|หน้ากล้อง|เซลฟี่/.test(texts), texts);
  check('3 duration 15–30 s, has start/middle/end', plan.duration >= 15 && plan.duration <= 30 && plan.shots[0].kind === 'hook' && plan.shots.at(-1).kind === 'close', `${plan.duration}s`);
  await page.evaluate(() => document.getElementById('editorPanel').scrollIntoView());
  await page.screenshot({ path: `${OUT}/d2-own-editor.png` });
  await page.click('#claudeBtn');
  await wait(300);
  const brief = await page.$eval('#brief', e => e.value);
  const note = await page.$eval('#photoNote', e => !e.hidden);
  await writeFile(`${OUT}/brief-own-photo.txt`, brief);
  check('3 own-photo brief says to attach the original photo', note && /ไม่ได้ส่งมากับข้อความนี้/.test(brief) && !/ส่งรูปให้แล้ว|ติดตั้งสกิลให้แล้ว/.test(brief));
  await page.screenshot({ path: `${OUT}/d3-own-claude.png` });
  check('3 no console errors in own-photo flow', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 6. fallbacks: clipboard blocked, no video codec ----------
{
  const { page, errors } = await openPage(browser, IPHONE, '/xvisor/studio/?force=noclip,nocodec,noshare');
  const dl = path.join(OUT, 'export-fallback');
  await downloadsTo(page, dl);
  await page.click('#trySample');
  await editorOpen(page);
  await wait(500);
  const label = await page.$eval('#saveBtn', b => b.textContent);
  check('6 no codec: button says stills + script', label === 'บันทึกภาพรายฉาก + บท (PNG, TXT)', label);
  await page.click('#saveBtn');
  await page.waitForFunction(() => window.__studioLastExport, { timeout: 30000 });
  await wait(3500);
  const files = (await readdir(dl)).sort();
  const pngs = files.filter(f => f.endsWith('.png'));
  const txt = files.find(f => f.endsWith('.txt'));
  const plan = await page.evaluate(() => window.__studio.plan());
  check('6 no codec: one PNG per shot + script file', pngs.length === plan.shots.length && !!txt, files.join(', '));
  if (pngs[0]) { const p = probe(path.join(dl, pngs[0])).streams[0]; check('6 stills are 1080×1920', p.width === 1080 && p.height === 1920, `${p.width}×${p.height}`); }
  if (txt) check('6 script file is the brief of this version', (await readFile(path.join(dl, txt), 'utf8')).includes(`ฉบับ ${plan.id}`));
  await page.evaluate(() => { const s = document.getElementById('scrub'); s.value = '400'; s.dispatchEvent(new Event('input')); });
  await page.click('#playBtn');
  await wait(1200);
  check('6 no codec: preview still plays', (await playheadOf(page)) > 8.5);
  await page.click('#claudeBtn');
  await wait(200);
  await page.click('#copyOpen');
  await wait(400);
  const manual = await page.$eval('#copyManual', e => !e.hidden);
  const selected = await page.evaluate(() => { const t = document.getElementById('brief'); return t.selectionEnd - t.selectionStart; });
  check('6 clipboard blocked: manual copy shown and text selected', manual && selected > 200, `selected ${selected}`);
  await page.screenshot({ path: `${OUT}/m8-clipboard-fallback.png` });
  check('6 no console errors in fallback flow', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---------- 6. desktop sample + webm path ----------
{
  const { page, errors } = await openPage(browser, DESKTOP, '/xvisor/studio/?force=nomp4');
  await page.screenshot({ path: `${OUT}/d4-landing.png` });
  const dl = path.join(OUT, 'export-webm');
  await downloadsTo(page, dl);
  await page.click('#trySample');
  await editorOpen(page);
  await page.click('#styleList button:nth-child(2)');
  await wait(400);
  await page.screenshot({ path: `${OUT}/d5-editor-question.png` });
  const support = await page.evaluate(async () => (await import('/xvisor/studio/engine/export.js')).exportSupport('nomp4'));
  if (support.video) {
    await page.click('#saveBtn');
    await page.waitForFunction(() => window.__studioLastExport, { timeout: 60000 });
    await wait(1500);
    const ex = await page.evaluate(() => window.__studioLastExport);
    const info = probe(path.join(dl, ex.name));
    report.exportWebm = { file: ex.name, mime: ex.mime, probe: info };
    check('6 webm path: .webm with finite duration', ex.name.endsWith('.webm') && Number(info.format.duration) > 15, `${ex.name} ${info.format.duration}s`);
  } else check('6 webm path available', false, 'browser has no webm recorder');
  check('6 no console errors on desktop', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
report.passed = report.checks.filter(c => c.ok).length;
report.failed = report.checks.filter(c => !c.ok).length;
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`\n${report.passed} passed, ${report.failed} failed · ${report.chrome}`);
process.exit(report.failed ? 1 : 0);
