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
  assert.equal([...html.matchAll(/<a class="tile [^>]*target="_blank" rel="noopener"/g)].length, 4, 'ปุ่มทั้ง 4 เปิดแท็บใหม่');
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
  for (const [source, destination] of [['/share', '/share/'], ['/share/code', '/share/code/'], ['/share/slide', '/share/slide/'], ['/share/stat', '/share/stat/']]) {
    assert.ok(config.redirects.some(rule => rule.source === source && rule.destination === destination && rule.permanent === false), source);
  }
});

test('ไฟล์ที่หน้าเรียกใช้มีอยู่จริง', async () => {
  const pages = [await read('share/index.html'), await read('share/code/index.html'), await read('share/stat/index.html'), await read('xircle/index.html'), await read('routinex/index.html')].join('\n');
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

test('ปุ่ม รูทีน เซอเคิล รีวิว พกรหัสไปด้วย ไม่มีรหัสก็บอกว่ามาจากหน้าแชร์', async () => {
  const S = await loadRef();
  assert.equal(S.withRef('/xircle/', 'ABC123'), '/xircle/?ref=ABC123');
  assert.equal(S.withRef('/review/', ''), '/review/?from=share');
  assert.equal(S.withRef('/routinex/?a=1#top', 'x&y'), '/routinex/?a=1&ref=xy#top');
  assert.equal(typeof S.track, 'function');
});

test('หน้า รูทีน และ เซอเคิล มีปุ่มสั่งซื้อเล็กที่ใช้รหัสผู้แนะนำ', async () => {
  for (const page of ['xircle', 'routinex']) {
    const html = await read(`${page}/index.html`);
    assert.match(html, new RegExp(`<script defer src="/share/ref\\.js[^"]*"></script>\\s*<script defer src="/share/carry\\.js[^"]*" data-page="${page}"></script>\\s*</body>`), page);
  }
  const carry = await read('share/carry.js');
  assert.match(carry, /S\.buyUrl\(/);
  assert.match(carry, /target="_blank"/);
});

test('หน้า /share/stat/ ไม่ให้ค้นเจอ และอ่านข้อมูลผ่านล็อกอินหลังบ้าน', async () => {
  const html = await read('share/stat/index.html');
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  const js = await read('share/stat/stat.js');
  assert.match(js, /\/api\/share-stat\?days=/);
  assert.match(js, /\/api\/backoffice-auth/);
});

test('API เก็บสถิติรับเฉพาะเหตุการณ์ที่รู้จัก และไม่เก็บรหัสเครื่องตรง ๆ', async () => {
  const { validateEvent, cleanRef, deviceOf, sameOrigin } = await import(new URL('api/_lib/share-stat.js', root));
  assert.deepEqual(Object.keys(validateEvent({ kind: 'view', page: 'share', ref: 'ab-1', vid: 'abcdef12-3456' })), ['kind', 'page', 'target', 'ref', 'visitor']);
  const event = validateEvent({ kind: 'click', page: 'share', target: 'buy', ref: 'x"<y>', vid: 'abcdef12-3456' });
  assert.equal(event.ref, 'XY');
  assert.notEqual(event.visitor, 'abcdef12-3456');
  assert.equal(event.visitor.length, 32);
  for (const bad of [null, [], { kind: 'drop', page: 'share' }, { kind: 'view', page: 'evil' }, { kind: 'click', page: 'share' },
    { kind: 'click', page: 'share', target: 'hack' }, { kind: 'gen', page: 'code' }, { kind: 'view', page: 'share', target: 'buy' }])
    assert.equal(validateEvent(bad), null, JSON.stringify(bad));
  assert.equal(cleanRef(' o5f3ln '), 'O5F3LN');
  assert.equal(deviceOf('Mozilla/5.0 (iPhone) Line/14.1.0'), 'line');
  assert.equal(deviceOf('Mozilla/5.0 (Linux; Android 14) [FBAN/FB4A]'), 'facebook');
  assert.equal(deviceOf('Mozilla/5.0 (Macintosh)'), 'desktop');
  const req = (headers, method = 'POST') => ({ method, headers: { host: 'www.myclover.com', 'x-forwarded-proto': 'https', ...headers } });
  assert.equal(sameOrigin(req({ origin: 'https://www.myclover.com', 'sec-fetch-site': 'same-origin' })), true);
  assert.equal(sameOrigin(req({ origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' })), false);
  assert.equal(sameOrigin(req({})), false);
});

test('ถามชื่อเจ้าของรหัสจาก buy.xircle.health: มีชื่อ · รหัสผิด · ถามไม่สำเร็จ', async () => {
  const { lookupReferral, REFERRAL_URL } = await import(new URL('api/_lib/xircle-referral.js', root));
  const reply = (body, ok = true) => async (url, init) => {
    assert.equal(url, REFERRAL_URL);
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { code: 'O5F3LN' });
    return { ok, json: async () => body };
  };
  assert.deepEqual(await lookupReferral('O5F3LN', { fetchImpl: reply({ valid: true, status: 'VALID', referralOwner: { firstName: 'นรินทร์', lastName: 'ลีลาภรณ์', role: 'X_LEAD' } }) }),
    { status: 'valid', first_name: 'นรินทร์', last_name: 'ลีลาภรณ์', role: 'X_LEAD' });
  assert.deepEqual(await lookupReferral('O5F3LN', { fetchImpl: reply({ valid: false, status: 'NOT_FOUND', error: 'referralCodeNotFound', referralOwner: null }) }), { status: 'not_found' });
  assert.deepEqual(await lookupReferral('O5F3LN', { fetchImpl: reply({}, false) }), { status: 'error' });
  assert.deepEqual(await lookupReferral('O5F3LN', { fetchImpl: async () => { throw new Error('down'); } }), { status: 'error' });
  const slow = (_url, init) => new Promise((_ok, fail) => init.signal.addEventListener('abort', () => fail(new Error('abort'))));
  assert.deepEqual(await lookupReferral('O5F3LN', { fetchImpl: slow, timeoutMs: 20 }), { status: 'error' });
});

test('หน้าสถิติจำชื่อรหัสไว้ ถามเฉพาะรหัสใหม่ และรหัสผิดขึ้นว่า รหัสผิด', async () => {
  const { createShareStatStore } = await import(new URL('api/_lib/share-stat.js', root));
  const saved = new Map([['OLD1', { ref: 'OLD1', status: 'valid', first_name: 'เก่า', last_name: 'ชื่อ', role: 'X_VISOR', age: 60 }],
    ['OLDBAD', { ref: 'OLDBAD', status: 'not_found', first_name: '', last_name: '', role: '', age: 400 * 86400 }]]);
  const sql = { query: async (q, p) => {
    if (/^SELECT ref,status/.test(q)) return p[0].map(code => saved.get(code)).filter(Boolean);
    if (/^INSERT INTO mc_share_ref_names/.test(q)) { saved.set(p[0], { ref: p[0], status: p[1], first_name: p[2], last_name: p[3], role: p[4], age: 0 }); return []; }
    throw new Error('unexpected ' + q);
  } };
  const asked = [];
  const lookup = async code => { asked.push(code); return code === 'BAD9' ? { status: 'not_found' } : { status: 'valid', first_name: 'ใหม่', last_name: '', role: 'X_LEAD' }; };
  const names = await createShareStatStore(sql, { lookup }).names(['old1', 'NEW1', 'BAD9', 'NEW1', '', 'OLDBAD']);
  assert.deepEqual(asked.sort(), ['BAD9', 'NEW1']);
  assert.deepEqual(names.OLD1, { status: 'valid', name: 'เก่า ชื่อ', role: 'X_VISOR' });
  assert.deepEqual(names.NEW1, { status: 'valid', name: 'ใหม่', role: 'X_LEAD' });
  assert.equal(names.BAD9.status, 'not_found');
  assert.equal(names.OLDBAD.status, 'not_found'); // รหัสผิดไม่ถามซ้ำ
  const js = await read('share/stat/stat.js');
  assert.match(js, /รหัสผิด/);
});

test('หน้าสถิติ: ตารางรหัสแสดงทีละ 10 25 50 100 มีปุ่มซ่อนรหัสผิด และกราฟรายวัน/ช่วงเวลา', async () => {
  const html = await read('share/stat/index.html');
  for (const id of ['refs', 'gens']) {
    assert.match(html, new RegExp(`class="tools" data-for="${id}"`));
    assert.match(html, new RegExp(`data-pager="${id}"`));
  }
  assert.deepEqual([...html.matchAll(/data-size="(\d+)"/g)].map(m => m[1]).slice(0, 4), ['10', '25', '50', '100']);
  assert.match(html, /data-hide-bad/);
  assert.match(html, /data-view="day"/);
  assert.match(html, /data-view="hour"/);
  const js = await read('share/stat/stat.js');
  assert.match(js, /size: 10/);
  assert.match(js, /d\.hourly/);
  const api = await read('api/_lib/share-stat.js');
  assert.match(api, /hourly:/);
  assert.match(api, /extract\(hour FROM at AT TIME ZONE 'Asia\/Bangkok'\)/);
});
