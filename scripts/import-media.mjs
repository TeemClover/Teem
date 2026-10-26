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
 * A clip that barely moves (a still at video prices, e.g. one generated with the same first and last frame) is
 * refused unless the entry says "allowStill": true. "loop": s makes a seamless loop in the edit: the last s seconds
 * fade into the start (give the generator a first frame and real motion, never the same first and last frame).
 * A video with "frames": n becomes a frame sequence for scroll scrubbing instead: n WebP stills spread evenly over
 * the clip, "<key>/w/001.webp"… at the first width (landscape screens) and, with "portrait": w, a centre 9:16 crop
 * "<key>/p/001.webp"… at that width (phones). quality defaults to 55 for frames.
 * Needs cwebp, ffmpeg and ffprobe on PATH.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync, statSync, rmSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';

const manifest = JSON.parse(process.env.MEDIA_MANIFEST || '{}');
const HOST = /^https:\/\/[a-z0-9]+\.cloudfront\.net\/[\w./-]+\.(png|jpe?g|webp|mp4|webm)$/i;
const KEY = /^entry\/media\/[a-z0-9][a-z0-9/_-]*$/;
const tmp = join(tmpdir(), 'import-media'); mkdirSync(tmp, {recursive: true});
const kb = p => Math.round(statSync(p).size / 1024) + ' KB';
let failed = 0;

// how much a video changes: the largest mean difference (0–255) between any two of five frames spread over it
// (pairs, not only against the first frame, so a seamless loop that returns to its start still counts its motion)
function motion(file) {
  const seconds = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString()) || 1;
  const grab = t => execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=64:36,format=gray', '-f', 'rawvideo', '-']);
  const shots = [0, .2, .4, .6, .8].map(f => grab(seconds * f));
  let most = 0;
  for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) {
    let sum = 0; for (let k = 0; k < shots[i].length; k++) sum += Math.abs(shots[i][k] - (shots[j][k] ?? shots[i][k]));
    most = Math.max(most, sum / shots[i].length);
  }
  return most;
}

function frames(key, src, spec) {
  const n = Math.max(2, Math.min(240, spec.frames | 0));
  // count the clip's frames, then pick n of them evenly from the first to the very last
  const total = parseInt(execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', src]).toString(), 10);
  if (!(total >= n)) throw new Error(`the clip has ${total} frames, fewer than ${n}`);
  const picks = [...new Set(Array.from({length: n}, (_, k) => Math.round(k * (total - 1) / (n - 1))))];
  const select = `select='${picks.map(i => `eq(n\\,${i})`).join('+')}'`;
  const sets = [['w', `scale=${spec.widths?.[0] || 1280}:-2:flags=lanczos`]];
  if (spec.portrait) sets.push(['p', `crop=trunc(ih*9/16/2)*2:ih,scale=${spec.portrait}:-2:flags=lanczos`]);
  for (const [dir, vf] of sets) {
    const work = join(tmp, key.replace(/\//g, '_') + '-' + dir);
    rmSync(work, {recursive: true, force: true}); mkdirSync(work, {recursive: true});
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `${select},${vf}`, '-fps_mode', 'vfr', join(work, '%03d.png')]);
    const out = join(key, dir);
    rmSync(out, {recursive: true, force: true}); mkdirSync(out, {recursive: true});
    let bytes = 0, count = 0, largest = 0;
    for (const f of readdirSync(work).filter(f => f.endsWith('.png')).sort()) {
      const o = join(out, f.replace('.png', '.webp'));
      execFileSync('cwebp', ['-quiet', '-q', String(spec.quality || 55), '-m', '6', '-sharp_yuv', join(work, f), '-o', o]);
      const size = statSync(o).size; bytes += size; largest = Math.max(largest, size); count++;
    }
    rmSync(work, {recursive: true, force: true});
    if (count < n) throw new Error(`${out}: only ${count} of ${n} frames`);
    console.log(`ok · ${out}/ ${count} frames · ${Math.round(bytes / 1024)} KB in all · largest ${Math.round(largest / 1024)} KB`);
  }
}

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
    if ((ext === 'mp4' || ext === 'webm') && spec.frames) frames(key, src, spec);
    else if (ext === 'mp4' || ext === 'webm') {
      const w = spec.widths?.[0] || 1280, out = key + '.mp4';
      const enc = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(spec.crf || 28), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];
      if (spec.loop) {
        // seamless loop made in the edit: the last `loop` seconds fade into the start, so the end flows into the
        // beginning while the clip keeps all its motion (never by giving the generator the same first and last frame)
        const d = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString());
        const x = Math.min(+spec.loop, d / 3);
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-filter_complex',
          `[0:v]scale=${w}:-2:flags=lanczos,fps=30,split[a][b];[a]trim=0:${(d - x).toFixed(3)},setpts=PTS-STARTPTS[main];[b]trim=${(d - x).toFixed(3)}:${d.toFixed(3)},setpts=PTS-STARTPTS[tail];[tail][main]xfade=transition=fade:duration=${x.toFixed(3)}:offset=0[v]`,
          '-map', '[v]', ...enc]);
      } else {
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, ...(spec.seconds ? ['-t', String(spec.seconds)] : []),
          '-vf', `scale=${w}:-2:flags=lanczos,fps=30`, ...enc]);
      }
      // a clip that barely moves is a still at video prices: say so loudly and do not import it
      const m = motion(out);
      if (m < 3 && !spec.allowStill) { rmSync(out); throw new Error(`the clip barely moves (motion ${m.toFixed(2)}; 0 = frozen, 6+ = visible) - not imported`); }
      console.log(`ok · ${out} ${kb(out)} · motion ${m.toFixed(1)}`);
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
