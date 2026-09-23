import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { house } from '../app/data/house.js';
import { sanitizeLearningHouse, polygonArea, pointInPolygon } from '../app/validate.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'downloads');
const data = sanitizeLearningHouse(house);
await mkdir(output, { recursive: true });

const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const colours = { living: '#e5eddf', dining: '#e4eacb', kitchen: '#efdec4', bath: '#dbe9ed', bedroom: '#e9dfe9',
  balcony: '#e4e9db', service: '#e8e6de', hall: '#f3eddf', stair: '#cfdad6', void: '#f7f5ef', exterior: '#e2e8d8' };

function centre(polygon) {
  const area = polygonArea(polygon);
  const sum = polygon.reduce((result, a, index) => {
    const b = polygon[(index + 1) % polygon.length], factor = a[0] * b[1] - b[0] * a[1];
    return [result[0] + (a[0] + b[0]) * factor, result[1] + (a[1] + b[1]) * factor];
  }, [0, 0]);
  const c = [sum[0] / (6 * area), sum[1] / (6 * area)];
  if (pointInPolygon(c, polygon, false)) return c;
  // Use a verified interior point for concave circulation polygons.
  const xs = polygon.map((p) => p[0]), zs = polygon.map((p) => p[1]);
  for (let y = 1; y < 20; y++) for (let x = 1; x < 20; x++) {
    const p = [Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * x / 20,
      Math.min(...zs) + (Math.max(...zs) - Math.min(...zs)) * y / 20];
    if (pointInPolygon(p, polygon, false)) return p;
  }
  return polygon[0];
}

function plan(floor) {
  const rooms = data.rooms.filter((room) => room.floor === floor);
  const points = rooms.flatMap((room) => room.polygon);
  const minX = Math.min(...points.map((p) => p[0])), maxX = Math.max(...points.map((p) => p[0]));
  const minZ = Math.min(...points.map((p) => p[1])), maxZ = Math.max(...points.map((p) => p[1]));
  const scale = Math.min(1040 / (maxX - minX), 720 / (maxZ - minZ));
  const left = (1200 - (maxX - minX) * scale) / 2;
  const xy = (p) => [left + (p[0] - minX) * scale, 150 + (p[1] - minZ) * scale];
  const bottom = 150 + (maxZ - minZ) * scale;
  const legendTop = bottom + 135;
  const height = legendTop + Math.ceil(rooms.length / 3) * 38 + 120;
  const labels = [];
  const shapes = rooms.map((room, index) => {
    const [x, y] = xy(centre(room.polygon));
    labels.push(`<g><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="15" fill="#fffdf7" stroke="#758478"/><text x="${x.toFixed(2)}" y="${(y + 5).toFixed(2)}" text-anchor="middle" font-size="15" font-weight="700">${index + 1}</text></g>`);
    return `<polygon points="${room.polygon.map((p) => xy(p).map((n) => n.toFixed(2)).join(',')).join(' ')}" fill="${colours[room.kind] || '#eee8db'}" stroke="#a8b0a4" stroke-width="1"><title>${escape(room.name)}</title></polygon>`;
  });
  const wallLines = data.walls.filter((wall) => wall.floor === floor).map((wall) => {
    const [ax, ay] = xy(wall.a), [bx, by] = xy(wall.b), length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
    const at = (offset) => xy([wall.a[0] + (wall.b[0] - wall.a[0]) * offset / length, wall.a[1] + (wall.b[1] - wall.a[1]) * offset / length]);
    const openings = wall.openings.map((opening) => {
      const [x1, y1] = at(opening.offset), [x2, y2] = at(opening.offset + opening.width);
      return `<path d="M${x1},${y1} L${x2},${y2}" stroke="#fffdf7" stroke-width="9"/><path d="M${x1},${y1} L${x2},${y2}" stroke="${opening.kind === 'window' ? '#5695a9' : '#b58b47'}" stroke-width="2" ${opening.kind === 'window' ? '' : 'stroke-dasharray="5 4"'}/>`;
    }).join('');
    return `<path d="M${ax},${ay} L${bx},${by}" stroke="#35463e" stroke-width="${wall.exterior ? 6 : 4}"/>${openings}`;
  });
  const legend = rooms.map((room, index) => {
    const x = 65 + (index % 3) * 365, y = legendTop + Math.floor(index / 3) * 38;
    return `<text x="${x}" y="${y}" font-size="18"><tspan font-weight="700">${index + 1}.</tspan> ${escape(room.name)}${room.planLabel ? ` · ${escape(room.planLabel)}` : ''}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${Math.ceil(height)}" viewBox="0 0 1200 ${Math.ceil(height)}" role="img" aria-labelledby="title description">
<title id="title">Home Explorer — แปลนอ้างอิงชั้น ${floor === 'f1' ? 1 : 2}</title><desc id="description">วาดใหม่เพื่อการศึกษา ไม่ใช่แบบก่อสร้าง ใช้ polygon ชุดเดียวกับเว็บไซต์</desc>
<rect width="1200" height="100%" fill="#fffdf7"/><g font-family="Tahoma,Arial,sans-serif" fill="#263c31">
<text x="65" y="54" font-size="15" letter-spacing="3">HOME EXPLORER / LEARNING KIT</text>
<text x="65" y="101" font-size="34" font-weight="700">แปลนอ้างอิง · ชั้น ${floor === 'f1' ? 1 : 2}</text>
<text x="1135" y="94" text-anchor="end" font-size="16">วาดใหม่จากข้อมูลชุดเดียวกับโมเดล</text>
${shapes.join('\n')}${wallLines.join('\n')}${labels.join('\n')}
<text x="600" y="${bottom + 44}" font-size="20" text-anchor="middle">ด้านหน้าบ้าน ↓</text>
<path d="M65,${bottom + 78} h${scale * 2} m0,-6 v12 M65,${bottom + 72} v12" fill="none" stroke="#263c31" stroke-width="2"/><text x="${65 + scale}" y="${bottom + 103}" font-size="14" text-anchor="middle">2 m · สเกลอ้างอิง</text>
<text x="1135" y="${bottom + 95}" text-anchor="end" font-size="14">เส้นฟ้า: หน้าต่าง · เส้นประ: ช่องเปิด/ประตู</text>
${legend}
<line x1="65" y1="${height - 80}" x2="1135" y2="${height - 80}" stroke="#c8cfc4"/>
<text x="65" y="${height - 48}" font-size="16">เพื่อการศึกษาและทำต้นแบบเว็บไซต์ · ไม่ใช่แบบก่อสร้าง · แนวและรายละเอียดบางส่วนยังรอตรวจยืนยัน</text>
<text x="65" y="${height - 23}" font-size="14" fill="#617165">ไม่รวมสแกนหรือภาพต้นฉบับ · ข้อมูลเครดิตผู้ออกแบบและผู้ถ่ายภาพยังไม่ยืนยัน</text></g></svg>`;
}

const starterHtml = `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>บ้านตัวอย่าง — Home Explorer Starter</title><link rel="stylesheet" href="style.css"><body><header><p>HOME EXPLORER / STARTER</p><h1>รู้จักบ้านผ่านแปลน</h1><p>ตัวอย่างสำหรับฝึกทำเว็บไซต์ · แปลนเพื่อการศึกษา</p></header><main><nav aria-label="เลือกชั้น"><button data-floor="f1" aria-pressed="true">ชั้น 1</button><button data-floor="f2" aria-pressed="false">ชั้น 2</button></nav><div class="layout"><section aria-label="แปลน"><svg id="plan" viewBox="0 0 1000 820" role="group" aria-label="แปลนห้องที่เลือกได้"></svg></section><aside><h2 id="selection" aria-live="polite">เลือกห้องเพื่อดูข้อมูล</h2><p id="detail"></p><div id="rooms" aria-label="รายการห้อง"></div></aside></div><p>รหัสห้องและแนวแปลนใช้ข้อมูล JSON ชุดเดียวกัน · ไม่ใช่แบบก่อสร้าง</p></main><script type="module" src="app.js"></script></body></html>`;
const starterCss = `:root{font-family:Tahoma,Arial,sans-serif;color:#263c31;background:#f5f3ec}*{box-sizing:border-box}body{margin:0}header,main{max-width:1250px;margin:auto;padding:24px}header>p:first-child{letter-spacing:.2em;font-size:12px}h1{font-size:clamp(28px,5vw,48px);margin:12px 0}nav{display:flex;gap:8px;margin-bottom:20px}button{font:inherit;min-height:44px;padding:9px 15px;border:1px solid #bec9bd;border-radius:10px;background:#fffdf7;color:inherit;cursor:pointer}button[aria-pressed=true]{background:#315c46;color:white}button:focus-visible,polygon:focus-visible{outline:3px solid #b37334;outline-offset:3px}.layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(240px,1fr);gap:24px}svg{width:100%;background:#fffdf7;border-radius:18px;touch-action:manipulation}polygon{fill:#e2e8d8;stroke:#6a7a6b;stroke-width:1.5;cursor:pointer}polygon:hover,polygon[aria-pressed=true]{fill:#b7cea8}svg text{font:15px Tahoma,Arial,sans-serif;pointer-events:none;text-anchor:middle;fill:#263c31}#rooms{display:grid;gap:8px;max-height:600px;overflow:auto}#rooms button{text-align:left}#detail{line-height:1.7}@media(max-width:700px){header,main{padding:16px}.layout{grid-template-columns:1fr}#rooms{max-height:none}h2{font-size:22px}}`;
const starterJs = `import { validateHouse } from './validate.js';
const plan = document.querySelector('#plan'), list = document.querySelector('#rooms');
let house, floor = 'f1', selected = null;
const ns = 'http://www.w3.org/2000/svg';
function select(id){selected=id;const room=house.rooms.find(r=>r.id===id);document.querySelector('#selection').textContent=room.name;document.querySelector('#detail').textContent='รหัส '+room.id+' · ระดับย่อย '+room.levelOffset+' m · สถานะข้อมูล '+room.evidenceStatus;document.querySelectorAll('[data-room]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.room===id)));}
function render(){plan.replaceChildren();list.replaceChildren();const rooms=house.rooms.filter(r=>r.floor===floor);const pts=rooms.flatMap(r=>r.polygon);const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0])),minZ=Math.min(...pts.map(p=>p[1])),maxZ=Math.max(...pts.map(p=>p[1]));const scale=Math.min(900/(maxX-minX),700/(maxZ-minZ));for(const room of rooms){const poly=document.createElementNS(ns,'polygon');poly.setAttribute('points',room.polygon.map(([x,z])=>[50+(x-minX)*scale,40+(z-minZ)*scale].join(',')).join(' '));poly.setAttribute('tabindex','0');poly.setAttribute('role','button');poly.setAttribute('aria-label',room.name);poly.setAttribute('aria-pressed','false');poly.dataset.room=room.id;poly.addEventListener('click',()=>select(room.id));poly.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(room.id);}});const title=document.createElementNS(ns,'title');title.textContent=room.name;poly.append(title);plan.append(poly);const btn=document.createElement('button');btn.textContent=room.name+(room.planLabel?' · '+room.planLabel:'');btn.dataset.room=room.id;btn.setAttribute('aria-pressed','false');btn.onclick=()=>select(room.id);list.append(btn);}const arrow=document.createElementNS(ns,'text');arrow.setAttribute('x',500);arrow.setAttribute('y',790);arrow.textContent='ด้านหน้าบ้าน ↓';plan.append(arrow);document.querySelectorAll('[data-floor]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.floor===floor)));if(selected&&rooms.some(r=>r.id===selected))select(selected);else{selected=null;document.querySelector('#selection').textContent='เลือกห้องเพื่อดูข้อมูล';document.querySelector('#detail').textContent='ชื่อและรหัสห้องใช้ข้อมูลเดียวกับรูปแปลน';}}
try{const response=await fetch('house-data.json');if(!response.ok)throw new Error('โหลดข้อมูลไม่สำเร็จ');house=await response.json();const validation=validateHouse(house);if(!validation.valid)throw new Error(validation.errors.join('; '));render();document.querySelectorAll('[data-floor]').forEach(button=>button.onclick=()=>{floor=button.dataset.floor;render();});}catch(error){document.querySelector('#selection').textContent='เปิดข้อมูลบ้านไม่ได้';document.querySelector('#detail').textContent=error.message+' — เปิดตัวอย่างผ่าน npm start และตรวจ house-data.json';}
`;
const server = `import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const port=Number(process.env.PORT)||4173;
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!target.startsWith(root))throw new Error('Invalid path');const content=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('Home Explorer: http://127.0.0.1:'+port));
`;

const files = new Map([
  ['README.md', await readFile(path.join(root, 'LEARN.md'), 'utf8')],
  ['house-data.json', JSON.stringify(data, null, 2) + '\n'],
  ['house-plan-f1.svg', plan('f1')], ['house-plan-f2.svg', plan('f2')],
  ['index.html', starterHtml], ['style.css', starterCss], ['app.js', starterJs],
  ['state.js', await readFile(path.join(root, 'app/state.js'), 'utf8')],
  ['validate.js', await readFile(path.join(root, 'app/validate.js'), 'utf8')],
  ['serve.mjs', server],
  ['package.json', JSON.stringify({ name: 'home-explorer-learning-kit', version: '1.0.0', private: true, type: 'module', scripts: { start: 'node serve.mjs' } }, null, 2) + '\n'],
]);

// Deterministic ZIP using only Node built-ins, so the kit builder has no tooling dependencies.
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const chunks = [], directory = [];
  let offset = 0;
  const date = ((2026 - 1980) << 9) | (9 << 5) | 24;
  for (const [name, content] of entries) {
    const file = Buffer.from(content), compressed = deflateRawSync(file), filename = Buffer.from(name), crc = crc32(file);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(file.length, 22); local.writeUInt16LE(filename.length, 26);
    chunks.push(local, filename, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10); central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(file.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, filename); offset += local.length + filename.length + compressed.length;
  }
  const size = directory.reduce((sum, chunk) => sum + chunk.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.size, 8); end.writeUInt16LE(entries.size, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...directory, end]);
}

for (const name of ['house-plan-f1.svg', 'house-plan-f2.svg', 'house-data.json']) await writeFile(path.join(output, name), files.get(name));
await writeFile(path.join(output, 'README.txt'), files.get('README.md'));
const archive = zip(files);
await writeFile(path.join(output, 'home-explorer-starter.zip'), archive);
console.log(`Learning kit: ${files.size} files, ${archive.length} bytes. Plans: f1/f2; photos and originals excluded.`);
