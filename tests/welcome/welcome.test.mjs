// /welcome · หน้า scroll film: ไฟล์ที่อ้างถึงต้องมีจริง เรื่องครบตามสคริปต์ แผนใหม่ครบ และไม่หลุดสิ่งที่ห้ามขึ้นเว็บ
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {QUESTIONS, SCENES} from '../../welcome/questions.js';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], {cwd: root, encoding: 'utf8'}).split('\n'));
const html = await read('welcome/index.html');
const js = await read('welcome/welcome.js');
const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('ไฟล์ภาพ ฟอนต์ สคริปต์ ที่หน้าอ้างถึง มีอยู่จริง รวมภาพหลักของฟิล์มทุกภาพ', () => {
  const local = [...html.matchAll(/(?:src|href)="(\/[^"#?]+\.(?:webp|jpg|png|svg|css|js|woff2))(?:\?[^"]*)?"/g)].map(m => m[1].slice(1));
  const og = [...html.matchAll(/content="https:\/\/www\.myclover\.com\/([^"]+\.jpg)"/g)].map(m => m[1]);
  const keys = [...js.matchAll(/'(k\d)'/g)].map(m => `welcome/film/${m[1]}.webp`);
  assert.equal(keys.length, 9);
  for (const path of [...local, ...og, ...keys]) assert.ok(tracked.has(path) || existsSync(new URL(path, root)), path);
});

test('ฉากในหน้า ฉากในฟิล์ม และฉากที่ API รับ ตรงกันทุกตัว และมีการ์ดคำถามครบทุกข้อ', () => {
  const inPage = [...html.matchAll(/data-scene="([a-z]+)"/g)].map(m => m[1]);
  const inFilm = [...js.matchAll(/\{ id: '([a-z]+)', a: \d/g)].map(m => m[1]);
  assert.deepEqual(inPage, [...SCENES]);
  assert.deepEqual(inFilm, [...SCENES]);
  for (const q of QUESTIONS) assert.match(html, new RegExp(`data-q="${q.id}"`), q.id);
});

test('หน้านี้ไม่ขึ้นผลค้นหา มี redirect /welcome → /welcome/ และไฟล์ทำงานไม่ถูกเสิร์ฟ', async () => {
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(await read('welcome/admin/index.html'), /noindex,nofollow/);
  const vercel = JSON.parse(await read('vercel.json'));
  assert.ok(vercel.redirects.some(r => r.source === '/welcome' && r.destination === '/welcome/'));
  const ignore = await read('.vercelignore');
  for (const p of ['tests/welcome/', 'welcome/film/CLIPS.md', 'tools/welcome-frames.mjs']) assert.ok(ignore.split('\n').includes(p), p);
});

test('เล่าครบตามสคริปต์ และแผนใหม่ครบ', () => {
  for (const must of ['ธุรกิจสุขภาพ', 'ลูกค้าคนนั้น', 'ผมทอม ธเนศ', 'บนที่ดินของคนอื่น', 'Health Tech', 'วัดได้ด้วยตัวเลข', 'Reach', 'Read', 'Result', 'RoutineX', 'ป้ายโฆษณา', 'Attraction Marketing', 'กลายเป็นคนดูแล', 'แก้ให้หมดแล้ว', 'ระบบดูแลงานที่เหลือ', 'คนนั้นโชคดี',
    'X-PLORER', 'ใช้สินค้าเองครบ 14 วันก่อน', 'ซื้อสินค้าก่อน', 'ก่อนสิ้นเดือน', 'X-VISOR', 'X-LEAD', 'ไปหา X-VISOR ที่ใกล้คุณที่สุด'])
    assert.ok(text.includes(must), must);
  assert.match(html, /data-count="15"/);
});

test('ไม่มีข้อความเสี่ยงจากสคริปต์ขึ้นเว็บ และมีข้อความกำกับรายได้กับผลลัพธ์', () => {
  for (const banned of ['40 ล้าน', '20,000 ล้าน', 'Clover Group', 'Impact', 'รวยแน่', 'ลดน้ำหนัก', 'รักษา', 'ป้องกันโรค', '72', 'พี่ทอมเติม', 'อย.'])
    assert.ok(!text.includes(banned), banned);
  assert.ok(text.includes('ไม่ใช่การรับประกันรายได้'));
  assert.ok(text.includes('ผลลัพธ์ของแต่ละบุคคลไม่เหมือนกัน'));
});

test('ท้ายเรื่องไม่มีฟอร์มให้ทีมทักกลับ ไม่มีปุ่มโทร แต่มีคำแนะนำและข้อความส่งหาคนที่ส่งลิงก์', () => {
  assert.ok(!/<form|tel:|ทีมจะทักกลับ|ส่งให้ทีมทักกลับ/.test(html));
  assert.match(html, /id="advice-list"/);
  assert.match(html, /href="https:\/\/line\.me\/R\/share\?text="/);
  assert.match(js, /encodeURIComponent\(m\)/);
  assert.match(js, /message_line/);
});

test('ฉากที่ตั้ง frames ไว้ ต้องมีเฟรม webp ครบทุกเฟรม', () => {
  for (const [, id, n] of js.matchAll(/\{ id: '([a-z]+)', a: \d, b: \d, frames: (\d+) \}/g)) {
    for (let i = 1; i <= Number(n); i++) {
      const path = `welcome/film/${id}/${String(i).padStart(3, '0')}.webp`;
      assert.ok(existsSync(new URL(path, root)), path);
    }
  }
});
