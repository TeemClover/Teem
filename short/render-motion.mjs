// Produce local, silent animated-poster dummy clips. No external videos or APIs.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {stories} from './catalog.js';

const playwright = process.env.SHORT_PLAYWRIGHT || '/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium} = await import(pathToFileURL(playwright).href);
const base = process.env.SHORT_PREVIEW_URL || 'http://127.0.0.1:4317';

// MediaRecorder omits finite duration. Insert the EBML Duration into Segment/Info.
function readElement(buffer, offset) {
  const lengthAt = start => { let mask = 128, size = 1; while (size <= 8 && !(buffer[start] & mask)) { mask >>= 1; size++; } if (size > 8) throw new Error('Invalid EBML'); return {mask, size}; };
  const idLength = lengthAt(offset).size;
  const id = buffer.subarray(offset, offset + idLength).toString('hex');
  const sizeStart = offset + idLength;
  const {mask, size: sizeLength} = lengthAt(sizeStart);
  let value = BigInt(buffer[sizeStart] & (mask - 1));
  for (let i = 1; i < sizeLength; i++) value = (value << 8n) | BigInt(buffer[sizeStart + i]);
  const unknown = value === (1n << BigInt(sizeLength * 7)) - 1n;
  const dataStart = sizeStart + sizeLength;
  return {id, offset, sizeStart, sizeLength, dataStart, unknown, size: unknown ? buffer.length - dataStart : Number(value)};
}
function writeSize(value, length) {
  const out = Buffer.alloc(length); let n = BigInt(value);
  for (let i = length - 1; i >= 0; i--) { out[i] = Number(n & 255n); n >>= 8n; }
  out[0] |= 1 << (8 - length); return out;
}
function finiteDuration(buffer, durationMs) {
  let offset = 0, segment;
  while (offset < buffer.length) { const e = readElement(buffer, offset); if (e.id === '18538067') { segment = e; break; } offset = e.dataStart + e.size; }
  if (!segment) throw new Error('No WebM segment');
  offset = segment.dataStart;
  while (offset < buffer.length) {
    const info = readElement(buffer, offset);
    if (info.id === '1549a966') {
      let scale = 1000000;
      for (let p = info.dataStart; p < info.dataStart + info.size;) {
        const e = readElement(buffer, p);
        if (e.id === '2ad7b1') { scale = 0; for (const byte of buffer.subarray(e.dataStart, e.dataStart + e.size)) scale = scale * 256 + byte; }
        p = e.dataStart + e.size;
      }
      const duration = Buffer.alloc(11); duration.set([0x44,0x89,0x88]); duration.writeDoubleBE(durationMs * 1000000 / scale, 3);
      let newSizeLength = info.sizeLength;
      while (BigInt(info.size + duration.length) >= (1n << BigInt(newSizeLength * 7)) - 1n) newSizeLength++;
      const replacement = Buffer.concat([buffer.subarray(info.offset, info.sizeStart), writeSize(info.size + duration.length, newSizeLength), buffer.subarray(info.dataStart, info.dataStart + info.size), duration]);
      const result = Buffer.concat([buffer.subarray(0, info.offset), replacement, buffer.subarray(info.dataStart + info.size)]);
      if (!segment.unknown) writeSize(segment.size + replacement.length - (info.dataStart + info.size - info.offset), segment.sizeLength).copy(result, segment.sizeStart);
      return result;
    }
    offset = info.dataStart + info.size;
  }
  throw new Error('No WebM info');
}

const browser = await chromium.launch({executablePath: process.env.SHORT_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  await Promise.all(stories.filter(story=>story.format!=='comic'&&(!process.argv.slice(2).length||process.argv.slice(2).includes(story.id))).map(async story => {
    const page = await browser.newPage({viewport:{width:360,height:640}});
    await page.goto(base + '/short/', {waitUntil:'networkidle'});
    const encoded = await page.evaluate(async story => {
      await document.fonts.load('600 22px PlexThai', 'เรื่องตัวอย่าง');
      const img = new Image(); img.src = `./assets/${story.id}.webp`; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 640;
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(24);
      const mime = ['video/webm;codecs=vp9','video/webm;codecs=vp8'].find(t => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, {mimeType:mime,videoBitsPerSecond:650000});
      const chunks = [];
      recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
      const stopped = new Promise(resolve => recorder.onstop = resolve);
      function draw(ms) {
        const t = ms / 12000, scene = Math.min(2, Math.floor(t * 3)), phase = (t * 3) % 1;
        const zoom = 1 + phase * .1 + (scene === 1 ? .15 : 0);
        const scale = Math.max(360/img.width,640/img.height)*zoom;
        const w = img.width*scale, h = img.height*scale;
        const x = story.id === 'rain' ? (360-w)*.67 : (360-w)*(.45+phase*.1);
        const y = (640-h)*(.25+phase*.05);
        ctx.drawImage(img,x,y,w,h);
        const gradient = ctx.createLinearGradient(0,330,0,640); gradient.addColorStop(0,'#11111300'); gradient.addColorStop(1,'#111113ed'); ctx.fillStyle = gradient; ctx.fillRect(0,0,360,640);
        ctx.fillStyle='#111113a0';ctx.fillRect(16,18,108,25);ctx.fillStyle='#f3eeea';ctx.font='600 10px PlexThai';ctx.fillText('ฉากตัวอย่าง · DEMO',24,35);
        ctx.fillStyle='#ff9c88';ctx.font='600 10px PlexThai';ctx.fillText('TONTOR · THAI IMAGINATION',24,500);
        ctx.fillStyle='#fff';ctx.font='600 30px PlexThai';const lines=story.posterTitle.split('\n');lines.forEach((line,i)=>ctx.fillText(line,24,541+i*39));
        ctx.fillStyle='#c9c1c4';ctx.font='400 11px PlexThai';ctx.fillText(scene===0?'เรื่องเล่าที่เริ่มจากจินตนาการ':scene===1?'อีกมุมหนึ่งของเรื่องไทย':'ลองเลือกตอนต่อไปเพื่อดูต่อ',24,617);
      }
      draw(0);recorder.start();
      await new Promise(resolve => {
        const start=performance.now();
        const frame=now=>{const ms=now-start;draw(Math.min(ms,11999));if(ms>=12000){recorder.stop();resolve();}else requestAnimationFrame(frame);};requestAnimationFrame(frame);
      });
      await stopped;stream.getTracks().forEach(t=>t.stop());
      const bytes=new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer());
      let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
    }, story);
    const data = finiteDuration(Buffer.from(encoded,'base64'),12000);
    const path = fileURLToPath(new URL(`./assets/${story.id}.webm`,import.meta.url));
    await writeFile(path,data); console.log(`${story.id}: ${data.length} bytes, 12-second silent dummy clip`);
    await page.close();
  }));
} finally { await browser.close(); }
