/**
 * Builds entry/media/film/atlas.webp, the one picture sheet the homepage film (entry/film.js) draws from:
 *   top    4 × 4 hero photos (row = business, column = style), each 288 × 180
 *   bottom 4 × 12 product photos (row = business, column = style × 3 + piece), each 96 × 96
 * One request instead of 64 keeps the film light. The source photos are the homepage's own (entry/media/v4/).
 *   node tools/build-film-atlas.mjs        (needs ImageMagick `convert` with WebP, and ffmpeg with libwebp)
 * The layout must match ATLAS in entry/film.js.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdirSync, statSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';

const data = JSON.parse(readFileSync(new URL('../entry/data.json', import.meta.url), 'utf8'));
const media = new URL('../entry/media/', import.meta.url).pathname;
const inds = data.industries.map(i => i.key), stys = data.styles.map(s => s.key);
const HW = 288, HH = 180, IT = 96;
const W = Math.max(HW * stys.length, IT * stys.length * 3), H = HH * inds.length + IT * inds.length;
const args = ['-size', `${W}x${H}`, 'xc:#101210'];
inds.forEach((ind, r) => stys.forEach((sty, c) => {
  args.push('(', `${media}v4/hero/${ind}-${sty}-640.webp`, '-resize', `${HW}x${HH}^`, '-gravity', 'center', '-extent', `${HW}x${HH}`, ')', '-gravity', 'northwest', '-geometry', `+${c * HW}+${r * HH}`, '-composite');
  for (let n = 1; n <= 3; n++) {
    args.push('(', `${media}v4/item/${ind}-${sty}-${n}-360.webp`, '-resize', `${IT}x${IT}^`, '-gravity', 'center', '-extent', `${IT}x${IT}`, ')', '-gravity', 'northwest', '-geometry', `+${(c * 3 + n - 1) * IT}+${HH * inds.length + r * IT}`, '-composite');
  }
}));
mkdirSync(`${media}film`, {recursive: true});
const out = `${media}film/atlas.webp`;
const png = `${tmpdir()}/film-atlas-${process.pid}.png`;
execFileSync('convert', [...args, '-strip', png], {stdio: 'inherit'});
// ImageMagick ignores -quality for WebP here; ffmpeg's libwebp honours it
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '58', '-compression_level', '6', out], {stdio: 'inherit'});
rmSync(png);
console.log(`${out} · ${W}×${H} · ${Math.round(statSync(out).size / 1024)} KB`);
