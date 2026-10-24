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

test('Fastwork is the only way to pay, every Fastwork link comes from assets/site-links.json, and no price is shown', async () => {
  const links = await json('assets/site-links.json');
  const allowed = new Set([links.fastwork.profile, ...Object.values(links.fastwork.packages)]);
  for (const file of ['index.html', 'work/index.html', 'hire/index.html', 'walkthrough/index.html', 'work/house-3d/index.html', 'work/classroom/index.html', 'work/core7/index.html', 'work/teambook/index.html']) {
    const html = await read(file);
    for (const [, url] of html.matchAll(/href="(https:\/\/fastwork\.com[^"]*)"/g)) assert.ok(allowed.has(url), `${file}: ${url}`);
    assert.doesNotMatch(visible(html), /฿\s?\d|\d[\d,]*\s?บาท|THB/, `${file}: prices live on Fastwork`);
    assert.doesNotMatch(visible(html), /\b(OPEN|TODO|TBD)\b/, file);
    assert.doesNotMatch(html, /QR|เลขบัญชี|โอนเงิน/, `${file}: no bank transfer for new buyers`);
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

test('the walkthrough sells the 6 lessons and links each one; the old story is archived, not lost', async () => {
  const [walk, data, story] = await Promise.all([read('walkthrough/index.html'), json('walkthrough/lessons.json'), read('walkthrough/story/index.html')]);
  assert.match(walk, /<h1>เรียน AI ฟรี 6 ตอน: เปลี่ยนงานที่คุณรู้ดี ให้ AI ทำต่อได้<\/h1>/);
  assert.equal(data.lessons.length, 6);
  for (const l of data.lessons) { assert.ok(walk.includes(`href="${l.href}"`), l.href); await stat(new URL(l.href.slice(1), root)); }
  assert.doesNotMatch(walk, /CORE7|X-VISOR|XTY/, 'no detours on the learning path');
  assert.doesNotMatch(visible(walk), /\d+\s?(นาที|ชั่วโมง)/, 'no study-time claims until measured');
  assert.match(story, /<meta name="robots" content="noindex,follow">/);
  assert.match(story, /<link rel="canonical" href="https:\/\/www\.myclover\.com\/walkthrough\/story\/">/);
  assert.doesNotMatch(story, /\.\.\//, 'the archived story has no relative ../ URL anywhere (attributes, inline CSS, scripts)');
});
