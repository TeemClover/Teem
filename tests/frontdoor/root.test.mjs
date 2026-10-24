import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {renderCompassPage, renderEntryRoot, entryMedia} from '../../tools/sync-frontdoor-root.mjs';

const read = p => readFile(new URL('../../' + p, import.meta.url), 'utf8');
const mediaFiles = async () => new Set(await readdir(new URL('../../entry/media/', import.meta.url)));

test('public root is the homepage "ปรุงเว็บใน 3 แตะ", rendered from entry/home.html', async () => {
  const [root, source, data] = await Promise.all(['index.html', 'entry/home.html', 'entry/data.json'].map(read));
  assert.equal(root, renderEntryRoot(source, JSON.parse(data), await mediaFiles()), 'run npm run sync:frontdoor-root');
  assert.match(root, /<link rel="canonical" href="https:\/\/www\.myclover\.com\/">/);
  assert.match(root, /<meta name="robots" content="index,follow">/);
  assert.match(root, /<meta property="og:url" content="https:\/\/www\.myclover\.com\/">/);
  assert.match(root, /<title>Teem Clover — สร้างเว็บ แอป เกม ด้วย AI \| myClover<\/title>/);
  for (const href of ['/work/', '/hire/', '/walkthrough/', '/tour/', 'https://fastwork.com/user/teem', '/meet/', '/privacy/']) assert.ok(root.includes(`href="${href}"`), href);
  assert.equal((root.match(/src="\/assets\/my-learning-entry.js"/g) || []).length, 1, 'students still see ห้องเรียนของฉัน');
  assert.match(root, /data-my-learning-mount/);
  assert.doesNotMatch(root, /\/tour\/(tour|house|intro|textures|vendor)|three\.(core|module)/, 'no 3D code before the visitor enters the house');
  assert.doesNotMatch(root, /\b(OPEN|TODO|TBD)\b|<!--(slot|entry):/, 'no unfinished markers on the published page');
  assert.doesNotMatch(root, /฿\s?\d|\d+\s?บาท/, 'no service prices on the homepage (prices live on Fastwork)');
});

test('the visible promises match the blueprint (§4.2–4.5): labels, simulation notes and the honest ending', async () => {
  const root = await read('index.html');
  assert.match(root, /เลือก 3 อย่าง แล้วดูเว็บของคุณประกอบขึ้นตรงหน้า/);
  assert.match(root, /ตัวอย่างจำลองจากเทมเพลตและข้อมูลตัวอย่าง ไม่ใช่งานลูกค้า และไม่ได้สร้างด้วย AI สด ๆ ตอนนี้/);
  assert.match(root, /ในงานจริง ซอสคือข้อมูลธุรกิจของคุณที่เราใช้สร้างงาน/);
  assert.match(root, /ตัวอย่างนี้ประกอบจาก 3 ตัวเลือกของคุณ/);
  assert.doesNotMatch(root, /3 วินาที/, 'no unmeasured speed claim');
  for (const step of ['คุยโจทย์', 'จัดซอส', 'สร้างและให้ลองจริง', 'ส่งมอบ']) assert.match(root, new RegExp(step));
});

test('JSON-LD states only what the page shows; the FAQ comes from the visible questions', async () => {
  const root = await read('index.html');
  const ld = JSON.parse(root.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const types = ld['@graph'].map(n => n['@type']);
  assert.deepEqual(types, ['Organization', 'WebSite', 'Person', 'FAQPage']);
  const visible = [...root.matchAll(/<details><summary>([^<]+)<\/summary>/g)].map(m => m[1]);
  assert.deepEqual(ld['@graph'][3].mainEntity.map(q => q.name), visible);
  assert.doesNotMatch(JSON.stringify(ld), /Review|Rating|price|offers/i);
});

test('the 64 demos come from 12 data pieces, and media slots fall back to CSS until a file exists', async () => {
  const data = JSON.parse(await read('entry/data.json'));
  assert.equal(data.industries.length, 4); assert.equal(data.features.length, 4); assert.equal(data.styles.length, 4);
  for (const s of data.styles) for (const k of ['--demo-bg', '--demo-surface', '--demo-text', '--demo-accent', '--demo-font', '--demo-radius']) assert.ok(s.vars[k], `${s.key} ${k}`);
  for (const i of data.industries) { assert.equal(i.sauce.length, 3); assert.match(i.domain, /\.example$/, 'demo domains can never be real sites'); }
  const none = entryMedia(data, new Set());
  assert.deepEqual(none.demo, {}); assert.equal(none.heroLoop, null);
  const some = entryMedia(data, new Set(['demo-cafe.webp', 'hero-loop.mp4', 'service-web.webp']));
  assert.equal(some.demo.cafe, '/entry/media/demo-cafe.webp');
  const html = renderEntryRoot(await read('entry/home.html'), data, new Set(['hero-loop.mp4', 'service-web.webp']));
  assert.match(html, /<video class="hero-video"[^>]+data-src="\/entry\/media\/hero-loop\.mp4"/);
  assert.match(html, /<img src="\/entry\/media\/service-web\.webp"/);
});

test('the house moved to /tour/ with its own canonical', async () => {
  const tour = await read('tour/index.html');
  assert.match(tour, /<link rel="canonical" href="https:\/\/www\.myclover\.com\/tour\/">/);
  assert.match(tour, /<meta name="robots" content="index,follow">/);
});

test('the Compass moved to /compass/ with the exact same body and runtime as /frontdoor/', async () => {
  const [compass, source, home] = await Promise.all(['compass/index.html', 'frontdoor/index.html', 'home/index.html'].map(read));
  assert.equal(compass, renderCompassPage(source));
  assert.equal(compass.slice(compass.indexOf('<body')), source.slice(source.indexOf('<body')));
  assert.match(compass, /<link rel="canonical" href="https:\/\/www\.myclover\.com\/compass\/">/);
  assert.match(compass, /<meta name="robots" content="index,follow">/);
  assert.match(home, /content="home-open"/); assert.match(home, /home-opening-full\.mp4/);
  assert.match(home, /href="\/hall\.html"/); assert.match(home, /href="\/frontdoor\/"/);
});
