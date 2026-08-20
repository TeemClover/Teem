/* TeamBook ต้องยืนได้บนโดเมนไหนก็ได้

   teambook.me จะเสิร์ฟ TeamBook โดยที่ myclover.com ยังเสิร์ฟส่วนอื่นอยู่ แปลว่า
   หน้า TeamBook ทุกหน้าต้องไม่มีลิงก์ที่ลากผู้เล่นข้ามโดเมนกลับบ้านเดิมกลางเกม

   ตอนเขียนเทสต์นี้ TeamBook สะอาดอยู่แล้ว — ไม่มีลิงก์คลิกได้ที่ชี้ออกนอกโดเมนเลย
   สักอัน เทสต์นี้จึงไม่ได้แก้อะไร มันมีไว้ไม่ให้สภาพนี้หลุดมือ เพราะเผลอ
   วางลิงก์เต็ม URL ลงไปหน้าเดียวก็พอ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TeamBook = join(dirname(fileURLToPath(import.meta.url)), '..');

function pages(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) pages(path, found);
    else if (entry.endsWith('.html')) found.push(path);
  }
  return found;
}

/* canonical / og:url / JSON-LD ต้องเป็น absolute ตามสเปกของมันเอง จึงไม่นับ
   ส่วนรูปแชร์ก็เสิร์ฟจากโฮสต์เดียวได้ ไม่พังข้ามโดเมน */
function clickableLinks(html) {
  const withoutMeta = html
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, '');
  return [...withoutMeta.matchAll(/href\s*=\s*"(https?:\/\/[^"]+)"/gi)].map(m => m[1]);
}

test('no TeamBook page links a player back off the domain they are playing on', () => {
  const offenders = [];
  for (const path of pages(TeamBook)) {
    for (const url of clickableLinks(readFileSync(path, 'utf8'))) {
      if (/myclover\.com|teambook\.me/i.test(url)) {
        offenders.push(`${path.slice(TeamBook.length + 1)} → ${url}`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    'ใช้ path แบบ /... แทน URL เต็ม ไม่งั้นผู้เล่นบน teambook.me จะถูกเด้งกลับ myclover.com');
});

test('no TeamBook canonical points at a host that only redirects', () => {
  const offenders = [];
  for (const path of pages(TeamBook)) {
    const html = readFileSync(path, 'utf8');
    const canonical = /<link\s+rel="canonical"\s+href="([^"]+)"/i.exec(html);
    /* xty.myclover.com ถูกเปลี่ยนให้ redirect เข้า myclover.com/xty แล้ว
       canonical ที่ชี้ไปโฮสต์ที่ redirect คือการยิงเท้าตัวเองทาง SEO */
    if (canonical && /xty\.myclover\.com/i.test(canonical[1])) {
      offenders.push(`${path.slice(TeamBook.length + 1)} → ${canonical[1]}`);
    }
  }
  assert.deepEqual(offenders, []);
});
