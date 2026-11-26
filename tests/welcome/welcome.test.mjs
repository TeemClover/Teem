// /welcome · หน้าต้อนรับคนที่สนใจเป็นตัวแทน: ไฟล์ที่อ้างถึงต้องมีจริง ข้อความแผนใหม่ครบ และไม่หลุดสิ่งที่ห้ามขึ้นเว็บ
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], {cwd: root, encoding: 'utf8'}).split('\n'));
const html = await read('welcome/index.html');
const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('ไฟล์ภาพ ฟอนต์ สคริปต์ ที่หน้าอ้างถึง มีอยู่จริง', async () => {
  const local = [...html.matchAll(/(?:src|href)="(\/[^"#?]+\.(?:webp|jpg|png|svg|css|js|woff2))(?:\?[^"]*)?"/g)].map(m => m[1].slice(1));
  const og = [...html.matchAll(/content="https:\/\/www\.myclover\.com\/([^"]+\.jpg)"/g)].map(m => m[1]);
  assert.ok(local.length > 8);
  for (const path of [...local, ...og]) assert.ok(tracked.has(path) || existsSync(new URL(path, root)), path);
});

test('หน้านี้ไม่ขึ้นผลค้นหา และมี redirect /welcome → /welcome/', async () => {
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  const vercel = JSON.parse(await read('vercel.json'));
  assert.ok(vercel.redirects.some(r => r.source === '/welcome' && r.destination === '/welcome/'));
  assert.match(await read('.vercelignore'), /^tests\/welcome\/$/m);
});

test('ไม่ใช้ภาพคนจริงหรือภาพป้าจากหน้า /xvisor ใช้ภาพการ์ตูนของหน้านี้เอง', () => {
  assert.ok(!html.includes('/xvisor/img/'));
  for (const name of ['hero', 'explore', 'letter', 'choice', 'ai', 'luck']) assert.ok(html.includes(`/welcome/assets/${name}.webp`), name);
});

test('แผนใหม่ครบ: X-PLORER 15% ไม่ต้องสอบ ไม่ต้องซื้อก่อน สอบผ่านก่อนสิ้นเดือนขึ้น X-VISOR ส่วนต่างไปหา X-VISOR ที่ใกล้ที่สุด', () => {
  for (const must of ['X-PLORER', '15', 'ไม่ต้องสอบก่อน', 'ไม่ต้องซื้อสินค้าก่อน', 'ก่อนสิ้นเดือน', 'X-VISOR', 'X-LEAD', 'ไปหา X-VISOR ที่ใกล้คุณที่สุด', 'ยินดีต้อนรับ', 'ผู้สำรวจ', 'สอบเป็น X-VISOR', 'ใช้สินค้าเองให้ครบ 14 วันก่อน'])
    assert.ok(text.includes(must), must);
});

test('ไม่มีข้อความเสี่ยงจากสคริปต์ขึ้นเว็บ: ตัวเลขที่ยังไม่ยืนยัน ชื่อบริษัทอื่น การันตีรายได้ หรือช่องรอเติม', () => {
  for (const banned of ['40 ล้าน', '20,000 ล้าน', 'Clover Group', 'รับประกันรายได้ทุก', 'รวยแน่', 'ลดน้ำหนัก', 'รักษา', '72', '[', 'พี่ทอมเติม'])
    assert.ok(!text.includes(banned), banned);
  assert.ok(text.includes('ไม่ใช่การรับประกันรายได้'));
});

test('ปุ่ม LINE และคลิปซ่อนไว้จนกว่าจะใส่ค่า และสคริปต์รับแค่ลิงก์ LINE กับ id YouTube ที่ถูกรูป', async () => {
  assert.match(html, /id="cta-line"[^>]*data-line=""[^>]*hidden/);
  assert.match(html, /id="film"[^>]*data-youtube=""[^>]*hidden/);
  const js = await read('welcome/welcome.js');
  assert.match(js, /\^https:\\\/\\\/\(lin\\\.ee\|line\\\.me\)\\\//);
  assert.match(js, /\^\[A-Za-z0-9_-\]\{11\}\$/);
  assert.match(js, /youtube-nocookie\.com/);
});
