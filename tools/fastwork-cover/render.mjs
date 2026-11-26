// Render the cover to video and stills. Deterministic: each frame is drawn by seeking the page to
// an exact time, so the same source always gives the same frames.
//
//   node tools/fastwork-cover/render.mjs              master + Fastwork upload + stills
//   node tools/fastwork-cover/render.mjs --draft      960×540, 30 fps, quick look (out/draft.mp4)
//   node tools/fastwork-cover/render.mjs --stills     only the PNG/JPG stills
//
// Needs: Node 20+, Playwright's Chromium, ffmpeg on PATH. Frames go to a temp folder and are removed.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
const args = new Set(process.argv.slice(2));
const DRAFT = args.has('--draft'), STILLS_ONLY = args.has('--stills');
const FPS = DRAFT ? 30 : 60;                 // master is 60 fps; the Fastwork file takes every second frame
const page_url = `${pathToFileURL(path.join(here, 'index.html'))}?fit=0&paused=1`;

const ff = (argv, label) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${label}`);
  console.log('  wrote', label);
};
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DRAFT ? .5 : 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

// ── stills ───────────────────────────────────────────────────────────────────────────────────
if (!DRAFT) {
  await page.goto(`${page_url}&still=1`);
  await page.evaluate(() => window.__cover.ready); await settle(page);
  const still = path.join(out, 'teem-clover-cover-static-1920x1080.png');
  await page.screenshot({ path: still });
  console.log('  wrote', path.basename(still));
  ff(['-i', still, '-q:v', '2', '-pix_fmt', 'yuvj444p', path.join(out, 'teem-clover-cover-static-1920x1080.jpg')], 'teem-clover-cover-static-1920x1080.jpg');
}
if (STILLS_ONLY) { await browser.close(); process.exit(0); }

// ── frames ───────────────────────────────────────────────────────────────────────────────────
// Frames are independent, so several browsers render slices of the loop side by side.
await browser.close();
const probe = await chromium.launch();
const pp = await probe.newPage();
await pp.goto(page_url); await pp.evaluate(() => window.__cover.ready);
const DUR = await pp.evaluate(() => window.__cover.DUR);
await probe.close();
const N = Math.round(DUR * FPS);
const WORKERS = Math.max(1, Math.min(Number(process.env.COVER_WORKERS) || 4, cpus().length));
const frames = await mkdtemp(path.join(tmpdir(), 'cover-frames-'));
console.log(`rendering ${N} frames (${DUR}s @ ${FPS}fps) with ${WORKERS} browsers …`);
const t0 = Date.now();
let done = 0;
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DRAFT ? .5 : 1 });
  const pg = await c.newPage();
  pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await pg.goto(page_url); await pg.evaluate(() => window.__cover.ready);
  for (let i = w; i < N; i += WORKERS) {
    await pg.evaluate((t) => window.__cover.seek(t), i / FPS);
    await settle(pg);
    await pg.screenshot({ path: path.join(frames, `f${String(i).padStart(5, '0')}.png`) });
    if (++done % 90 === 0) console.log(`  ${done}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await b.close();
}));

// ── encode ───────────────────────────────────────────────────────────────────────────────────
const seq = ['-framerate', String(FPS), '-i', path.join(frames, 'f%05d.png')];
const color = ['-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
// PNG frames are full-range RGB; convert to limited-range BT.709 explicitly so players do not guess.
const toTV = 'scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int';
if (DRAFT) {
  ff([...seq, '-vf', toTV, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', ...color, '-movflags', '+faststart', path.join(out, 'draft.mp4')], 'draft.mp4');
} else {
  // 1) master: every frame, near-lossless
  ff([...seq, '-vf', toTV, '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-profile:v', 'high', '-g', String(FPS), ...color, '-an', '-movflags', '+faststart',
    path.join(out, 'teem-clover-cover-master-1080p60.mp4')], 'teem-clover-cover-master-1080p60.mp4');
  // 2) Fastwork upload: 1920×1080 (the size its cover dialog asks for), 30 fps, H.264 High, 1 s keyframes, no audio track
  ff([...seq, '-vf', `${toTV},fps=30`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.1', '-g', '30', '-bf', '2', ...color, '-an', '-movflags', '+faststart',
    path.join(out, 'teem-clover-cover-fastwork-1080p30.mp4')], 'teem-clover-cover-fastwork-1080p30.mp4');
  // 3) first frame, for the "change thumbnail" option on a video cover
  ff(['-i', path.join(frames, 'f00000.png'), '-q:v', '2', '-pix_fmt', 'yuvj444p', path.join(out, 'teem-clover-cover-first-frame.jpg')], 'teem-clover-cover-first-frame.jpg');
  // 4) loop evidence: last frame → first frame should differ no more than any neighbouring pair
  const pair = (a, b) => {
    const r = spawnSync('ffmpeg', ['-v', 'info', '-i', path.join(frames, a), '-i', path.join(frames, b), '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = /All:([0-9.]+)/.exec(r.stderr || ''); return m ? Number(m[1]) : null;
  };
  const name = (i) => `f${String(((i % N) + N) % N).padStart(5, '0')}.png`;
  const report = {
    frames: N, fps: FPS, duration: DUR,
    ssim_last_to_first: pair(name(N - 1), name(0)),
    ssim_first_to_second: pair(name(0), name(1)),
    ssim_before_seam: pair(name(N - 2), name(N - 1)),
    note: 'SSIM of consecutive frames. The seam (last→first) should sit in the same range as its neighbours: 1.0 means identical, i.e. the loop point falls in a rest.',
  };
  await writeFile(path.join(out, 'loop-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('  loop', JSON.stringify(report));
}
await rm(frames, { recursive: true, force: true });
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
