#!/usr/bin/env node
// แตกคลิป Seedance ของหน้า /welcome เป็นเฟรม webp ให้ฟิล์มเลื่อนตามนิ้ว
// ใช้: node tools/welcome-frames.mjs <scene> <clip.mp4> [fps=16]
// ได้: welcome/film/<scene>/001.webp … แล้วบอกจำนวนเฟรมให้ไปใส่ frames ของฉากนั้นใน welcome/welcome.js
// ต้องมี ffmpeg (ไม่ต้องมี libwebp: แตกเป็น png ก่อน แล้วแปลงด้วย Pillow ผ่าน uv)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SCENES = ['hook', 'tom', 'pain', 'why', 'product', 'story', 'ai', 'start'];
const [scene, clip, fpsArg] = process.argv.slice(2);
if (!SCENES.includes(scene) || !clip) {
  console.error(`ใช้: node tools/welcome-frames.mjs <${SCENES.join('|')}> <clip.mp4> [fps]`);
  process.exit(1);
}
const fps = Number(fpsArg) || 16;
const out = join('welcome', 'film', scene);
const tmp = mkdtempSync(join(tmpdir(), 'welcome-frames-'));
try {
  // 720×1080 ตรงกับแคนวาสของฟิล์ม (2:3) · ครอปกลางจากคลิป 9:16
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', clip, '-vf', `fps=${fps},scale=720:1080:force_original_aspect_ratio=increase,crop=720:1080`, join(tmp, '%03d.png')], { stdio: 'inherit' });
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const py = `import sys,os\nfrom PIL import Image\nsrc,dst=sys.argv[1],sys.argv[2]\nfor f in sorted(os.listdir(src)):\n    Image.open(os.path.join(src,f)).convert('RGB').save(os.path.join(dst,f[:-4]+'.webp'),'WEBP',quality=62,method=5)\n`;
  execFileSync('uv', ['run', '-q', '--with', 'pillow', 'python', '-I', '-c', py, tmp, out], { stdio: 'inherit' });
  const n = readdirSync(out).filter(f => f.endsWith('.webp')).length;
  console.log(`${out}: ${n} เฟรม → ตั้ง { id: '${scene}', …, frames: ${n} } ใน welcome/welcome.js`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
