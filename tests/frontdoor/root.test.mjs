import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {renderCompassPage, renderEntryRoot, entryMedia, entryMediaFiles} from '../../tools/sync-frontdoor-root.mjs';

const read = p => readFile(new URL('../../' + p, import.meta.url), 'utf8');
const mediaFiles = () => entryMediaFiles();

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
  // the first screen is the film "ใบที่ 4": its captions are HTML (readable without the canvas), sound starts off
  assert.match(root, /<section class="film" id="film" aria-labelledby="hero-title"/);
  assert.match(root, /<h1 id="hero-title">ปรุงเว็บใน 3 แตะ<\/h1>/);
  assert.equal((root.match(/<p class="cap" data-c="\d">/g) || []).length, 6, 'six captions, as in the approved script');
  for (const line of ['ใบที่ 4 จะกลายเป็นเว็บของคุณ', 'หน้าเดียว 64 แบบ', 'แตะ 3 ครั้ง ดูเว็บของคุณประกอบตรงหน้า']) assert.ok(root.includes(line), line);
  assert.match(root, /id="film-sound" aria-pressed="false"/, 'sound is off until the visitor turns it on');
  assert.match(root, /id="film-pause"/, 'moving content can be paused');
  assert.match(root, /<p class="sr-only">วิดีโอสั้น 20 วินาที/, 'the film is described for screen readers');
  assert.match(root, /ภาพในตัวอย่างสร้างด้วย AI ธุรกิจ เมนู และราคาเป็นข้อมูลสมมติ/, 'the demo still says it is fictional');
  assert.match(root, /ในงานจริง ซอสคือข้อมูลธุรกิจของคุณที่เราใช้สร้างงาน/);
  assert.match(root, /ตัวอย่างนี้ประกอบจาก 3 ตัวเลือกของคุณ/);
  assert.doesNotMatch(root, /3 วินาที/, 'no unmeasured speed claim');
  for (const step of ['คุยโจทย์', 'จัดซอส', 'สร้างและให้ลองจริง', 'ส่งมอบ']) assert.match(root, new RegExp(step));
});

test('JSON-LD states only what the page shows (no FAQ block now that the homepage is the builder)', async () => {
  const root = await read('index.html');
  const ld = JSON.parse(root.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(ld['@graph'].map(n => n['@type']), ['Organization', 'WebSite', 'Person']);
  assert.doesNotMatch(root, /<details><summary>/, 'a FAQ on the page would need its FAQPage block back');
  assert.doesNotMatch(JSON.stringify(ld), /Review|Rating|price|offers/i);
});

test('the 64 demos come from 12 data pieces; media count only when every size exists, and the first look is in the HTML', async () => {
  const data = JSON.parse(await read('entry/data.json'));
  assert.equal(data.industries.length, 4); assert.equal(data.features.length, 4); assert.equal(data.styles.length, 4);
  for (const s of data.styles) {
    for (const k of ['--demo-bg', '--demo-surface', '--demo-text', '--demo-accent', '--demo-font', '--demo-radius']) assert.ok(s.vars[k], `${s.key} ${k}`);
    assert.ok(['journal', 'maison', 'pop', 'index'].includes(s.template), `${s.key} has its own scroll template`);
    // each style has its own Thai display face, self-hosted (no Google Fonts request from the demos)
    for (const k of ['--demo-display', '--demo-display-w', '--demo-ui', '--demo-text-w']) assert.ok(s.vars[k], `${s.key} ${k}`);
    assert.match(s.fontUrl, /^\/assets\/fonts\/site\/t-[a-z]+\.css$/, `${s.key} font file is ours`);
    const css = await read(s.fontUrl.slice(1));
    for (const [, file] of css.matchAll(/url\((\/assets\/fonts\/site\/[^)]+\.woff2)\)/g)) assert.ok((await stat(new URL('../..' + file, import.meta.url))).size > 1000, file);
  }
  assert.equal(new Set(data.styles.map(s => s.vars['--demo-display'])).size, 4, 'four different display faces');
  assert.equal(new Set(data.styles.map(s => s.template)).size, 4, 'no two styles share a template');
  for (const i of data.industries) {
    assert.equal(i.sauce.length, 3); assert.equal(i.items.length, 3);
    // what a visitor sees is written for customers; the contact chapter has an area, never a street address
    assert.equal(i.highlights.length, 3, `${i.key} highlights`);
    for (const h of i.highlights) assert.ok(h.k && h.t, `${i.key} highlight`);
    for (const k of ['title', 'area', 'map', 'hours']) assert.ok(i.contact?.[k], `${i.key}.contact.${k}`);
    assert.doesNotMatch(i.contact.area, /\d{2,}\/|เลขที่|ถนน.*\d/, 'a sample business gets an area, not a real-looking street address');
    assert.ok(/^[A-Za-zé][A-Za-zé &]+$/.test(i.genericEn), `${i.key}.genericEn (used when a visitor types a Thai shop name)`);
    assert.match(i.domain, /\.example$/, 'demo domains can never be real sites');
    for (const k of ['storyTitle', 'itemsTitle', 'closing']) assert.ok(i[k], `${i.key}.${k}`);
  }
  for (const f of data.features) assert.ok(f.headline, f.key);
  const none = entryMedia(data, new Set());
  assert.deepEqual(none.v4, {hero: [], detail: [], item: [], loop: []});
  const half = entryMedia(data, new Set(['v4/hero/cafe-warm.webp', 'v4/hero/cafe-warm-1280.webp']));
  assert.deepEqual(half.v4.hero, [], 'a hero without its 640 px size is not used');
  const empty = renderEntryRoot(await read('entry/home.html'), data, new Set());
  assert.doesNotMatch(empty, /rel="preload" as="image"|<img class="is-on"/);
  const files = await entryMediaFiles();
  const media = entryMedia(data, files);
  assert.equal(media.v4.hero.length, 16, 'all 16 industry × style heroes ship');
  assert.equal(media.v4.detail.length, 16); assert.equal(media.v4.item.length, 48);
  const root = await read('index.html');
  // the film is the first screen, so the studio's backdrop (second screen) is not preloaded and loads lazily
  assert.doesNotMatch(root, /rel="preload" as="image"/);
  assert.match(root, /<div class="studio-bg" id="studio-bg" aria-hidden="true"><img class="is-on" src="\/entry\/media\/v4\/hero\/cafe-luxury-1280\.webp"[^>]+loading="lazy"/);
  const atlas = await stat(new URL('../../entry/media/film/atlas.webp', import.meta.url));
  assert.ok(atlas.size < 130 * 1024, `the film's one picture sheet stays small (${Math.round(atlas.size / 1024)} KB)`);
  // v5: the luxury film (frames per business, landscape and phone) and the piece loops that really move
  assert.deepEqual(Object.keys(media.v5.film).sort(), data.industries.map(i => i.key).sort(), 'every business has its film');
  for (const n of Object.values(media.v5.film)) assert.ok(n >= 24, `a film needs enough frames to scrub (${n})`);
  assert.ok(media.v5.craft.every(c => /^(cafe|coach|shop|studio)-[123]$/.test(c)), 'piece loops are named <business>-<1..3>');
  assert.deepEqual(entryMedia(data, new Set(['v5/film/cafe/w/001.webp', 'v5/film/cafe/w/002.webp', 'v5/film/cafe/p/001.webp'])).v5.film, {}, 'a film without its phone frames is not used');
  for (const name of files) if (name.startsWith('v4/') || name.startsWith('v5/')) {
    const {size} = await stat(new URL(`../../entry/media/${name}`, import.meta.url));
    const cap = name.endsWith('.mp4') ? 900 : name.startsWith('v5/film/') ? 100 : /-(360|540|640)\.webp$/.test(name) ? 60 : /-1280\.webp$/.test(name) ? 110 : 200;
    assert.ok(size < cap * 1024, `${name} is ${Math.round(size / 1024)} KB (cap ${cap} KB)`);
  }
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
