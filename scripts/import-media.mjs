/**
 * Import generated media into the repo as small web files (run by the "media" job of
 * .github/workflows/homepage-portfolio.yml; the cloud sandbox cannot reach the generators' CDN).
 *
 *   MEDIA_MANIFEST='{"entry/media/v4/cafe-warm": {"url": "https://<id>.cloudfront.net/…png", "widths": [1600, 800]}}' \
 *     node scripts/import-media.mjs
 *
 * Each key is the output path without extension, under entry/media/. Images become WebP:
 * the first width is "<key>.webp", every other width "<key>-<w>.webp". Videos (.mp4/.webm source)
 * become a muted H.264 "<key>.mp4" scaled to the first width (default 1280), faststart, no audio.
 * Options per entry: widths, quality (WebP, default 74), crf (video, default 28), seconds (trim).
 * Needs cwebp and ffmpeg on PATH.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync, statSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';

const manifest = JSON.parse(process.env.MEDIA_MANIFEST || '{}');
const HOST = /^https:\/\/[a-z0-9]+\.cloudfront\.net\/[\w./-]+\.(png|jpe?g|webp|mp4|webm)$/i;
const KEY = /^entry\/media\/[a-z0-9][a-z0-9/_-]*$/;
const tmp = join(tmpdir(), 'import-media'); mkdirSync(tmp, {recursive: true});
const kb = p => Math.round(statSync(p).size / 1024) + ' KB';
let failed = 0;

for (const [key, spec] of Object.entries(manifest)) {
  try {
    if (!KEY.test(key) || key.includes('..')) throw new Error('key must be a path under entry/media/ without extension');
    if (!HOST.test(spec.url || '')) throw new Error('url must be a generated file on cloudfront.net');
    const ext = spec.url.split('.').pop().toLowerCase();
    const src = join(tmp, key.replace(/\//g, '_') + '.' + ext);
    const res = await fetch(spec.url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    mkdirSync(dirname(key), {recursive: true});
    if (ext === 'mp4' || ext === 'webm') {
      const w = spec.widths?.[0] || 1280, out = key + '.mp4';
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, ...(spec.seconds ? ['-t', String(spec.seconds)] : []),
        '-vf', `scale=${w}:-2:flags=lanczos,fps=30`, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(spec.crf || 28),
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
      console.log(`ok · ${out} ${kb(out)}`);
    } else {
      (spec.widths || [1600]).forEach((w, i) => {
        const out = i === 0 ? key + '.webp' : `${key}-${w}.webp`;
        execFileSync('cwebp', ['-quiet', '-q', String(spec.quality || 74), '-m', '6', '-sharp_yuv', '-resize', String(w), '0', src, '-o', out]);
        console.log(`ok · ${out} ${kb(out)}`);
      });
    }
    rmSync(src);
  } catch (e) {
    failed++; console.log(`FAIL · ${key} · ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
