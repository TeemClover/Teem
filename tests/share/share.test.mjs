// /share · ปุ่ม 4 ใบ ลิงก์สั่งซื้อพร้อมรหัสผู้แนะนำ และหน้าสร้างลิงก์
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

async function loadRef() {
  const sandbox = {};
  vm.runInNewContext(await read('share/ref.js'), sandbox);
  return sandbox.MyCloverShare;
}

test('ลิงก์สั่งซื้อใส่รหัสก่อน openExternalBrowser=1 และไม่มีรหัสใช้ CLOVERX', async () => {
  const S = await loadRef();
  assert.equal(S.DEFAULT_REF, 'CLOVERX');
  assert.equal(S.buyUrl('O5F3LN'), 'https://buy.xircle.health/?ref=O5F3LN&openExternalBrowser=1');
  for (const empty of ['', null, undefined, '  ', '&#'])
    assert.equal(S.buyUrl(empty), 'https://buy.xircle.health/?ref=CLOVERX&openExternalBrowser=1', String(empty));
});

test('รหัสจากลิงก์ถูกกรองเหลือตัวอักษรที่ปลอดภัย และไม่ถูกแก้ตัวพิมพ์', async () => {
  const S = await loadRef();
  assert.equal(S.clean(' ab-C_12 '), 'ab-C_12');
  assert.equal(S.clean('A1&next=https://evil.example/"<x>'), 'A1nexthttpsevilexamplex');
  assert.equal(S.clean('x'.repeat(80)).length, 32);
  assert.equal(S.buyUrl('A1&x=1#h'), 'https://buy.xircle.health/?ref=A1x1h&openExternalBrowser=1');
});

test('หน้าสร้างลิงก์รับรหัสล้วนหรือลิงก์ที่มี ?ref= แล้วได้ลิงก์ /share/?ref=', async () => {
  const S = await loadRef();
  assert.equal(S.fromInput(' abc 123 '), 'ABC123');
  assert.equal(S.fromInput('https://buy.xircle.health/login?ref=o5f3ln&x=1'), 'O5F3LN');
  assert.equal(S.fromInput('myclover.com/share/?ref=Ab12'), 'AB12');
  assert.equal(S.fromInput('   '), '');
  assert.equal(S.shareUrl('https://www.myclover.com', 'ABC123'), 'https://www.myclover.com/share/?ref=ABC123');
  assert.equal(S.shareUrl('https://www.myclover.com/', ''), 'https://www.myclover.com/share/');
});

test('หน้า /share/ มีปุ่ม 4 ใบตามลำดับ รูทีน เซอเคิล รวมรีวิว สั่งซื้อ', async () => {
  const html = await read('share/index.html');
  const tiles = [...html.matchAll(/<a class="tile [^>]*href="([^"]+)"[^>]*data-go="([^"]+)"[\s\S]*?<span class="tile__name">([^<]+)<\/span>/g)]
    .map(m => [m[2], m[1], m[3]]);
  assert.deepEqual(tiles, [
    ['routinex', '/routinex/', 'รูทีน'],
    ['xircle', '/xircle/', 'เซอเคิล'],
    ['review', '/review/', 'รวมรีวิว'],
    ['buy', 'https://buy.xircle.health/?ref=CLOVERX&openExternalBrowser=1', 'สั่งซื้อ'],
  ]);
  assert.match(html, /<script defer src="\/share\/ref\.js[^"]*"><\/script>\s*<script defer src="\/share\/share\.js/);
  assert.match(html, /property="og:image" content="https:\/\/www\.myclover\.com\/share\/assets\/og-share\.jpg"/);
});

test('หน้า /share/code/ ใช้ได้แม้ไม่มี JavaScript และไม่ให้ค้นเจอ', async () => {
  const html = await read('share/code/index.html');
  assert.match(html, /<form[^>]*action="\/share\/"[^>]*method="get"/);
  assert.match(html, /<input[^>]*name="ref"/);
  assert.match(html, /<button class="cta" type="submit">สร้าง Link<\/button>/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
});

test('vercel.json พา /share /share/code /share/slide ไปที่อยู่ที่มี / ปิดท้าย', async () => {
  const config = JSON.parse(await read('vercel.json'));
  for (const [source, destination] of [['/share', '/share/'], ['/share/code', '/share/code/'], ['/share/slide', '/share/slide/']]) {
    assert.ok(config.redirects.some(rule => rule.source === source && rule.destination === destination && rule.permanent === false), source);
  }
});

test('ไฟล์ที่หน้าเรียกใช้มีอยู่จริง', async () => {
  const pages = [await read('share/index.html'), await read('share/code/index.html')].join('\n');
  const local = new Set([...pages.matchAll(/(?:src|href)="(\/share\/[^"?#]+\.[a-z0-9]+)/g)].map(m => m[1]));
  assert.ok(local.size >= 6);
  for (const path of local) await readFile(new URL('.' + path, root));
  await readFile(new URL('share/assets/og-share.jpg', root));
});

test('หน้า /share/slide/ มีสไลด์ 10 ภาพ ภาพใหญ่ ภาพย่อ และไฟล์ให้บันทึกครบ', async () => {
  const html = await read('share/slide/index.html');
  const thumbs = [...html.matchAll(/<a class="thumb" href="\/share\/slide\/img\/slide-(\d\d)\.jpg" data-i="(\d+)"><img src="\/share\/slide\/img\/thumb-(\d\d)\.webp" alt="สไลด์ (\d+): [^"]+"/g)];
  assert.equal(thumbs.length, 10);
  thumbs.forEach((m, i) => {
    const n = String(i + 1).padStart(2, '0');
    assert.deepEqual([m[1], m[2], m[3], m[4]], [n, String(i + 1), n, String(i + 1)]);
  });
  for (let i = 1; i <= 10; i++) {
    const n = String(i).padStart(2, '0');
    for (const f of [`slide-${n}.webp`, `slide-${n}.jpg`, `thumb-${n}.webp`]) await readFile(new URL(`share/slide/img/${f}`, root));
  }
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /href="\/share\/code\/"/);
});
