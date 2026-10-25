/** /work/, /hire/, /walkthrough/ (BLUEPRINT v3.0 §6–§8): generated, honest, and linked from one config. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {build} from '../../tools/build-portfolio.mjs';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const json = async p => JSON.parse(await read(p));
const visible = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');

test('the generated pages on disk match their JSON sources', async () => {
  const pages = await build();
  for (const [file, html] of Object.entries(pages)) assert.equal(await read(file), html, `${file} is stale: run node tools/build-portfolio.mjs`);
});

test('every case role is the role the owner published on /resume/ (no invented roles)', async () => {
  const [{cases}, resume] = await Promise.all([json('work/cases.json'), read('resume/index.html')]);
  assert.ok(cases.length >= 3 && cases.length <= 6, 'open /work/ with the strongest few cases');
  for (const c of cases) {
    assert.ok(resume.includes(c.role), `${c.slug}: "${c.role}" is not on /resume/`);
    assert.ok(['โปรเจกต์ส่วนตัว', 'งานรับจ้าง', 'งานร่วมพัฒนา', 'affiliate showcase', 'ทดลอง'].includes(c.status), `${c.slug} status label`);
    for (const size of ['', '-640']) {
      const file = `work/media/${c.cover}-cover${size}.webp`;
      assert.ok((await stat(new URL(file, root))).size < 80 * 1024, `${file} under 80KB`);
    }
  }
});

test('client work leads /work/ and the homepage, with real screenshots, live pages and no invented roles', async () => {
  const [{clients, cases}, resume, work, home] = await Promise.all([json('work/cases.json'), read('resume/index.html'), read('work/index.html'), read('index.html')]);
  assert.deepEqual(clients.map(c => c.slug), ['mediral', 'hamburg', 'homechew', 'xvisor', 'airova']);
  for (const c of clients) {
    assert.ok(['งานให้แบรนด์', 'พาร์ทเนอร์ทางการ'].includes(c.status), `${c.slug} status`);
    await stat(new URL(c.live.slice(1) + 'index.html', root));
    if (c.role) assert.ok(resume.includes(c.role), `${c.slug}: "${c.role}" is not on /resume/`);
    for (const size of ['', '-640']) assert.ok((await stat(new URL(`work/media/${c.cover}-cover${size}.webp`, root))).size < 80 * 1024, `${c.cover}${size}`);
    assert.ok(work.includes(`href="${c.live}"`), `/work/ links ${c.live}`);
  }
  assert.ok(work.indexOf('href="/mediral/"') < work.indexOf(`href="/work/${cases[0].slug}/"`), 'client work comes before own projects');
  assert.ok(work.indexOf('href="/showcase/"') > work.indexOf(`href="/work/${cases.at(-1).slug}/"`), 'the demo ideas come last');
  const workSection = home.slice(home.indexOf('id="work"'), home.indexOf('</section>', home.indexOf('id="work"')));
  for (const slug of ['mediral', 'hamburg', 'xvisor', 'homechew']) assert.match(workSection, new RegExp(`href="/${slug}/"`), `homepage shows ${slug}`);
  assert.doesNotMatch(workSection, /class="demo-strip"/, 'demo ideas stay quiet on the homepage');
});

test('Fastwork is the only way to pay, every Fastwork link comes from assets/site-links.json, and no price is shown', async () => {
  const links = await json('assets/site-links.json');
  const allowed = new Set([links.fastwork.profile, ...Object.values(links.fastwork.packages)]);
  for (const file of ['index.html', 'work/index.html', 'showcase/index.html', 'hire/index.html', 'walkthrough/index.html', 'work/house-3d/index.html', 'work/classroom/index.html', 'work/core7/index.html', 'work/teambook/index.html']) {
    const html = await read(file);
    for (const [, url] of html.matchAll(/href="(https:\/\/fastwork\.com[^"]*)"/g)) assert.ok(allowed.has(url), `${file}: ${url}`);
    assert.doesNotMatch(visible(html), /฿\s?\d|\d[\d,]*\s?บาท|THB/, `${file}: prices live on Fastwork`);
    assert.doesNotMatch(visible(html), /\b(OPEN|TODO|TBD)\b/, file);
    // payment QR, account numbers or transfer instructions (a "เมนู QR" ordering demo is not a payment)
    assert.doesNotMatch(html, /KBANK_QR|QR\s*(พร้อมเพย์|PromptPay|ชำระ|จ่าย|โอน)|(พร้อมเพย์|PromptPay)\s*QR|เลขบัญชี|โอนเงิน/i, `${file}: no bank transfer for new buyers`);
  }
  const hire = await read('hire/index.html');
  assert.match(hire, /ดูแพ็กเกจและราคาปัจจุบันใน Fastwork/);
  for (const id of ['web', 'app', 'game']) assert.match(hire, new RegExp(`<article class="svc" id="${id}">`));
});

test('structured data parses and only describes what the page shows', async () => {
  for (const file of ['work/index.html', 'hire/index.html', 'walkthrough/index.html', 'work/core7/index.html']) {
    const html = await read(file);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    assert.ok(blocks.length, file);
    assert.doesNotMatch(JSON.stringify(blocks), /Review|Rating|"price"|"offers"/, file);
  }
  const course = JSON.parse((await read('walkthrough/index.html')).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(course['@type'], 'Course'); assert.equal(course.isAccessibleForFree, true); assert.equal(course.inLanguage, 'th');
});

test('the walkthrough sells the reward first and sends everyone to /classroom/; the old story is archived, not lost', async () => {
  const [walk, data, story] = await Promise.all([read('walkthrough/index.html'), json('walkthrough/lessons.json'), read('walkthrough/story/index.html')]);
  assert.match(walk, /<h1>เรียน AI ฟรี 6 ตอน<br>จบแล้วได้ของจริง 6 ชิ้น<\/h1>/);
  assert.equal(data.lessons.length, 6);
  // what you get comes first: the six rewards are listed before the first button
  const hero = walk.slice(walk.indexOf('<section class="band">'), walk.indexOf('</section>'));
  for (const l of data.lessons) assert.ok(hero.includes(l.short), `the hero names the reward "${l.short}"`);
  for (const l of data.lessons) assert.ok(walk.includes(l.loot), l.loot);
  assert.match(walk, /ได้ตรา 🌅 ผู้ตื่นรู้/, 'the reward for finishing all six is named');
  // every way forward goes to the classroom (its 60-second intro plays there); lessons stay in the JSON-LD
  const links = [...walk.matchAll(/<main[\s\S]*<\/main>/g)].join('').match(/href="\/classroom\/[^"]*"/g) || [];
  assert.ok(links.length >= 8 && links.every(h => h === 'href="/classroom/"'), `buttons and cards lead to /classroom/ (${links.length})`);
  const course = JSON.parse(walk.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  for (const l of data.lessons) { assert.ok(course.hasPart.some(p => p.url.endsWith(l.href)), l.href); await stat(new URL(l.href.slice(1), root)); }
  assert.doesNotMatch(walk, /CORE7|X-VISOR|XTY/, 'no detours on the learning path');
  assert.doesNotMatch(visible(walk), /\d+\s?(นาที|ชั่วโมง)/, 'no study-time claims until measured');
  assert.match(story, /<meta name="robots" content="noindex,follow">/);
  assert.match(story, /<link rel="canonical" href="https:\/\/www\.myclover\.com\/walkthrough\/story\/">/);
  assert.doesNotMatch(story, /\.\.\//, 'the archived story has no relative ../ URL anywhere (attributes, inline CSS, scripts)');
});
