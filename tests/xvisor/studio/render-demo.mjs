// Render the Studio demo clips offline with the same engine the page uses (story.js → buildPlan → render.js drawFrame).
// Canvas: @napi-rs/canvas (Skia). Encoder: ffmpeg H.264 + silent AAC, faststart, 1080×1920 @ 30 fps.
// Usage: node tests/xvisor/studio/render-demo.mjs [story|question|steps ...]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { understand, draftCopy, buildPlan, STYLE_ORDER } from '../../../xvisor/studio/engine/story.js';
import { drawFrame } from '../../../xvisor/studio/engine/render.js';
import { OFFICIAL_IMAGES, SAMPLE_SET, SAMPLE_STORY, sourceRect } from '../../../xvisor/studio/engine/official-assets.js';

const require = createRequire(import.meta.url);
const CANVAS = process.env.STUDIO_CANVAS || `${process.env.HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas`;
const { createCanvas, loadImage, GlobalFonts } = require(CANVAS);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, 'xvisor/studio/demo');
const CHECK = process.env.STUDIO_OUT || '/tmp/xvisor-studio';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

for (const [family, file] of [
  ['XS Kanit', 'reel/kanit-800-thai.woff2'], ['XS Kanit', 'reel/kanit-800-latin.woff2'],
  ['XS Mitr', 'reel/mitr-600-thai.woff2'], ['XS Mitr', 'reel/mitr-600-latin.woff2'],
  ['XS Anuphan', 'site/anuphan-thai-600.woff2'], ['XS Anuphan', 'site/anuphan-latin-600.woff2']
]) GlobalFonts.registerFromPath(path.join(ROOT, 'assets/fonts', file), family);

// Same inputs as "ลองด้วยภาพตัวอย่าง" with no edits: sample photos, sample story, recommended answers.
export async function samplePlan(style) {
  const photos = [], images = [];
  for (const key of SAMPLE_SET) {
    const meta = OFFICIAL_IMAGES[key];
    const img = await loadImage(path.join(ROOT, meta.src));
    const r = sourceRect(key, img.width, img.height);
    const c = createCanvas(r.sw, r.sh);
    c.getContext('2d').drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, r.sw, r.sh);
    images.push(c);
    photos.push({ id: key, origin: 'sample', label: meta.label, width: r.sw, height: r.sh, focus: { ...meta.focus } });
  }
  const info = understand(SAMPLE_STORY);
  const plan = buildPlan({ style, photos, copy: draftCopy(info, {}, style), textPos: 'auto', shotPhotos: {} });
  return { plan, images };
}

async function render(style) {
  const { plan, images } = await samplePlan(style);
  const fps = plan.fps;
  const frames = Math.round(plan.duration * fps);
  const canvas = createCanvas(1080, 1920);
  const ctx = canvas.getContext('2d');
  const file = path.join(OUT, `xvisor-studio-${style}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest',
    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-crf', '22', '-preset', 'slow', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', '-metadata', `comment=X-VISOR Studio plan ${plan.id}`, file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('close', code => (code ? reject(new Error(`ffmpeg ${code}`)) : resolve())));
  for (let f = 0; f < frames; f++) {
    drawFrame(ctx, plan, images, f / fps);
    const jpg = canvas.toBuffer('image/jpeg', 95);
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  // Poster for <video poster> (the hook, fully on screen) and check frames at start / middle / end.
  const posterAt = Math.min(plan.shots[0].end - 0.3, 1.6);
  drawFrame(ctx, plan, images, posterAt);
  const small = createCanvas(720, 1280);
  small.getContext('2d').drawImage(canvas, 0, 0, 720, 1280);
  await writeFile(path.join(OUT, `xvisor-studio-${style}.jpg`), small.toBuffer('image/jpeg', 84));
  await mkdir(CHECK, { recursive: true });
  for (const [name, t] of [['start', posterAt], ['middle', plan.duration / 2], ['end', plan.duration - 0.05]]) {
    drawFrame(ctx, plan, images, t);
    await writeFile(path.join(CHECK, `node-${style}-${name}.jpg`), canvas.toBuffer('image/jpeg', 90));
  }
  return { style, id: plan.id, duration: plan.duration, frames, file: path.relative(ROOT, file) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(OUT, { recursive: true });
  const styles = process.argv.slice(2).length ? process.argv.slice(2) : STYLE_ORDER;
  const results = [];
  for (const style of styles) results.push(await render(style));
  await writeFile(path.join(OUT, 'demo.json'), JSON.stringify({ renderedWith: 'tests/xvisor/studio/render-demo.mjs', story: SAMPLE_STORY, photos: SAMPLE_SET.map(k => OFFICIAL_IMAGES[k].src), clips: results }, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 1));
}
