import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import path from 'node:path';
import { house } from '../app/data/house.js';
import { sanitizeLearningHouse } from '../app/validate.js';

const root = path.resolve(import.meta.dirname, '..');
const files = new Map();
const safeHouse = sanitizeLearningHouse(house);
safeHouse.assumptions = Object.fromEntries(['wallHeight', 'slabThickness', 'exteriorWallThickness', 'interiorWallThickness', 'cutawayHeight']
  .map((key) => [key, house.assumptions?.[key]]).filter(([, value]) => Number.isFinite(value)));
safeHouse.roof = { height: house.roof.height, overhang: house.roof.overhang, status: 'assumed' };
safeHouse.stair = { holePolygon: house.stair.holePolygon.map((p) => [...p]), bounds: [...house.stair.bounds],
  stepCount: house.stair.stepCount, stepCountStatus: 'assumed' };
for (let index = 0; index < safeHouse.walls.length; index++) {
  const thickness = house.walls[index].thickness;
  if (Number.isFinite(thickness)) safeHouse.walls[index].thickness = thickness;
}
async function add(relative) { files.set(relative, await readFile(path.join(root, relative))); }
async function collect(relative) {
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) await collect(name);
    else if (/\.(?:js|mjs|css|html|woff2|txt|svg)$/.test(name)) await add(name);
  }
}
await collect('app');
// Include state and actual-data checks; negative fixtures with synthetic private paths remain in the development project.
await add('tests/state.test.mjs');
await add('tests/house-data.test.mjs');
await collect('assets/fonts');
await add('assets/mark.svg');
await add('package-lock.json');
await add('LEARN.md');
await add('tools/check-data.mjs');
for (const name of ['house-plan-f1.svg', 'house-plan-f2.svg', 'house-data.json', 'home-explorer-starter.zip']) await add(`downloads/${name}`);
files.set('app/data/house.js', `export const house = ${JSON.stringify(safeHouse, null, 2)};\n`);
files.set('app/data/photos.js', `// Add only photographs you have permission to use. See README.md.\nexport const photoSets = [];\n`);
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
packageJson.scripts = {
  dev: 'node tools/serve.mjs', preview: 'node tools/serve.mjs', build: 'node tools/build.mjs',
  test: 'node --test tests/*.test.mjs',
  typecheck: 'node --check app/main.js && node --check app/scene.js && node --check app/state.js',
  'validate:house': 'node tools/check-data.mjs',
};
files.set('package.json', JSON.stringify(packageJson, null, 2) + '\n');
let main = files.get('app/main.js').toString();
// The source project is already in this archive; its learning menu links to its local guide.
main = main.replace(/<a\b[^>]*href="\.\/downloads\/home-explorer-3d-source\.zip"[^>]*>[\s\S]*?<\/a>/g,
  '<a class="secondary-button" href="./README.md" target="_blank" rel="noopener">คู่มือใช้โค้ด 3D ในโฟลเดอร์นี้ ↗</a>');
files.set('app/main.js', main);
files.set('app/styles.css', files.get('app/styles.css').toString() + '\n/* No photography is distributed in the source kit. */\n.overview-photo:not(:has(img)){display:none}\n');
files.set('tools/build.mjs', `import {build} from 'esbuild';
import {copyFile,mkdir,writeFile,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
process.chdir(path.resolve(import.meta.dirname,'..'));
await mkdir('assets',{recursive:true});await mkdir('reports',{recursive:true});
const result=await build({entryPoints:['app/main.js'],bundle:true,format:'esm',splitting:true,outdir:'assets',entryNames:'home',chunkNames:'[name]-[hash]',minify:true,sourcemap:false,target:['es2022'],metafile:true,legalComments:'eof'});
await writeFile('reports/build.json',JSON.stringify(result.metafile,null,2));
for(const name of await readdir('assets'))if(/^(scene|chunk)-[\\w-]+\\.js$/.test(name)&&!result.metafile.outputs['assets/'+name])await unlink('assets/'+name);
await copyFile('app/index.html','index.html');await copyFile('app/styles.css','assets/home.css');
console.log('Built /showcase/house/ — run npm run dev');\n`);
files.set('tools/serve.mjs', `import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.zip':'application/zip','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT)||4317;
http.createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url==='/'||url==='/showcase/house'){res.writeHead(302,{Location:'/showcase/house/'}).end();return;}if(!url.startsWith('/showcase/house/')){res.writeHead(404).end();return;}url=url.slice('/showcase/house/'.length)||'index.html';const file=path.resolve(root,url);if(!file.startsWith(root+path.sep)||/(?:^|\\/)(?:node_modules|reports|\\.git)(?:\\/|$)/.test(url)){res.writeHead(404).end();return;}if(!(await stat(file)).isFile())throw Error('not file');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(await readFile(file));}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('Home Explorer: http://127.0.0.1:'+port+'/showcase/house/'));\n`);
files.set('reports/.gitkeep', '');
files.set('media/photos/.gitkeep', '');
files.set('.gitignore', 'node_modules/\nreports/*.json\n.DS_Store\n');
files.set('README.md', `# Home Explorer — โค้ดเว็บ 3D สำหรับเรียนและดัดแปลง

ชุดนี้มีโค้ดเว็บสำรวจบ้าน 3D แบบเต็ม: geometry จากแปลน, กล้องหมุน/ซูม, แยกชั้น, ผนังเปิดมุมมอง, ห้องและแปลนที่เชื่อมกัน, เฟอร์นิเจอร์, แกลเลอรีที่พร้อมรับข้อมูลลูกค้า และชุดทดสอบ ไม่ต้องใช้ไฟล์จาก repository อื่น

## เปิดในเครื่อง

ใช้ Node.js 22 ขึ้นไป (รุ่นที่ตรวจจริง: 26.8.2) แล้วเปิด Terminal ในโฟลเดอร์ที่แตก ZIP:

\`\`\`sh
npm ci
npm run build
npm run dev
\`\`\`

เปิด http://127.0.0.1:4317/showcase/house/ ถ้าพอร์ตถูกใช้งานให้ใช้ PORT=4318 npm run dev และเปลี่ยนพอร์ตใน URL การติดตั้งครั้งแรกต้องเชื่อมต่อ npm registry จากนั้น build และ preview ใช้ไฟล์ในเครื่องได้

ตรวจข้อมูลและโค้ดด้วย npm test, npm run typecheck และ npm run validate:house เมื่อแก้ app/ ให้รัน npm run build อีกครั้งแล้วรีเฟรชเว็บ ตัว preview ไม่ได้ build อัตโนมัติ

## เริ่มแก้ตรงไหน

- app/data/house.js: ข้อมูลชั้น ห้อง ผนัง และช่องเปิดที่ผ่านการเลือกเฉพาะข้อมูลสำหรับตัวอย่าง
- app/data/photos.js: ชุดภาพ เริ่มต้นเป็น [] โดยตั้งใจ ไม่ได้แจกสิทธิ์ภาพถ่ายบ้านจริง
- app/main.js และ app/styles.css: ข้อความ ปุ่ม การเลือกห้อง แกลเลอรี และหน้าจอ
- app/scene.js: ฉาก กล้อง การซ่อนผนังและชั้น
- app/scene/furniture.js และ materials.js: เฟอร์นิเจอร์และวัสดุประมาณเพื่อจำลอง
- app/state.js และ app/validate.js: สถานะหน้าจอ ตัวตรวจ geometry และสถานะหลักฐาน
- tests/: ตรวจ polygon, ระดับชั้น, ช่องเปิด, state, การจับคู่ภาพ และตัวกรองข้อมูล

แปลน SVG และ starter 2D อยู่ใน downloads/ คู่มือกระบวนการทำงานกับลูกค้าอยู่ใน LEARN.md ความต่างระดับพื้นหลัก 3.29 m ใช้เฉพาะบ้านตัวอย่าง; แบบบ้านใหม่ต้องเปลี่ยนข้อมูลและเกณฑ์ตรวจให้ตรงกับแหล่งอ้างอิงใหม่

## เพิ่มภาพที่ลูกค้าอนุญาต

ใส่ภาพ WebP ที่ปรับขนาดแล้วใน media/photos/ โดยใช้ชื่อทั่วไป เช่น living-01.webp และ living-01-thumb.webp จากนั้นเพิ่มข้อมูลใน app/data/photos.js:

\`\`\`js
export const photoSets = [{
  id: 'photos-living', name: 'พื้นที่นั่งเล่น',
  description: 'ภาพอ้างอิงที่ลูกค้าอนุญาตให้ใช้',
  binding: { status: 'candidate', candidates: ['f1-g01-living'] },
  photos: [{
    id: 'CLIENT-01', src: 'media/photos/living-01.webp',
    thumb: 'media/photos/living-01-thumb.webp',
    alt: 'มุมห้องนั่งเล่นจากประตูทางเข้า', caption: 'ภาพอ้างอิงจากลูกค้า',
    width: 1600, height: 1067
  }]
}];
\`\`\`

ใส่ขนาดภาพจริง เปลี่ยนรหัสห้องให้ตรงบ้านลูกค้า ก่อนทราบตำแหน่งห้องแน่ชัด ให้คงสถานะ candidate ไว้ หรือใช้ status: 'context', candidates: [] สำหรับภาพบริบท ห้ามเปลี่ยนเป็น confirmed เพื่อให้ปุ่มดูน่าเชื่อถือ ต้องมี spaceId, reviewedBy, reviewedAt, method และ evidence จากการตรวจจริง

เมื่อยังไม่เพิ่มภาพ แท็บรูปจริงจะแสดงข้อความว่าไม่มีภาพ และตัวอย่างภาพหน้าบ้านจะไม่ปรากฏ ส่วนโมเดล 3D และแปลนยังสำรวจได้

## สิทธิ์และที่มา

โค้ดต้นแบบและโครงสร้างข้อมูลให้คัดลอกและดัดแปลงทำผลงานนักเรียนหรือโครงการลูกค้าได้ตามเจตนาของเจ้าของโครงการ ดูขอบเขตใน LEARN.md แปลนวาดใหม่ใช้ศึกษาเว็บไซต์ ไม่ใช่แบบก่อสร้างหรือใบอนุญาตจากผู้ออกแบบต้นฉบับ รายละเอียดบางส่วนเป็นค่าประมาณ ข้อมูลตัวอย่างไม่ใช่ขนาดสำรวจหน้างาน

ไม่มีภาพถ่าย สแกนต้นฉบับ ที่อยู่ หรือชื่อไฟล์ต้นทางในชุดนี้ ต้องจัดหาสิทธิ์ภาพและแบบของลูกค้าเอง

IBM Plex ใช้ SIL Open Font License 1.1 ตาม assets/fonts/OFL.txt จาก https://github.com/IBM/plex/blob/master/LICENSE.txt โดยเก็บชื่อและไฟล์ฟอนต์เดิมไว้ Three.js และ esbuild เป็น dependencies ของโครงการ; npm ci ติดตั้งประกาศสิทธิ์พร้อมแพ็กเกจ
`);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const chunks = [], directory = []; let offset = 0;
  const date = ((2026 - 1980) << 9) | (9 << 5) | 24;
  for (const [name, content] of entries) {
    const file = Buffer.isBuffer(content) ? content : Buffer.from(content), compressed = deflateRawSync(file), filename = Buffer.from(name), crc = crc32(file);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(file.length, 22); local.writeUInt16LE(filename.length, 26);
    chunks.push(local, filename, compressed);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10); central.writeUInt16LE(date, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(file.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, filename); offset += local.length + filename.length + compressed.length;
  }
  const size = directory.reduce((sum, chunk) => sum + chunk.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.size, 8); end.writeUInt16LE(entries.size, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...directory, end]);
}
await mkdir(path.join(root, 'downloads'), { recursive: true });
const archive = zip(files);
await writeFile(path.join(root, 'downloads/home-explorer-3d-source.zip'), archive);
console.log(`Full 3D source kit: ${files.size} files, ${archive.length} bytes; photographs and source scans excluded.`);
