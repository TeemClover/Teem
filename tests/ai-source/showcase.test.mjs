/** AI ใส่ซอส sales page · "เว็บทั้งหลังนี้ ปรุงจากซอส": the story, the real work and the honest bridge. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const html = await readFile(root + 'ai-source/index.html', 'utf8');
const section = html.split('<section class="built" id="built-with-sauce"')[1]?.split('<section class="section" id="approach">')[0] || '';
const exists = async path => { try { return (await stat(root + path)).isFile(); } catch { return false; } };

test('the showcase sits between the hero and the method, and the page loads its parts once', () => {
  assert.ok(section, 'section present');
  assert.ok(html.indexOf('id="top"') < html.indexOf('id="built-with-sauce"'));
  assert.ok(html.indexOf('id="built-with-sauce"') < html.indexOf('id="approach"'));
  assert.equal(html.match(/\/assets\/depth\/clover-depth\.js/g)?.length, 1);
  assert.equal(html.match(/\/ai-source\/showcase\.css/g)?.length, 1);
});

test('the depth story has one caption per scene and every shape is drawable', () => {
  const cfg = JSON.parse(section.match(/<script type="application\/json" data-depth-scenes>([\s\S]*?)<\/script>/)[1]);
  assert.ok(cfg.scenes.length >= 2 && cfg.scenes.length <= 5);
  const caps = [...section.matchAll(/data-depth-caption="(\d)"/g)].map(m => +m[1]);
  assert.deepEqual(caps, cfg.scenes.map((_, i) => i));
  for (const [i, s] of cfg.scenes.entries()) {
    assert.equal(s.tint?.length, 3, `scene ${i} tint`);
    const parts = s.parts || [s];
    assert.ok(s.shape === 'cloud' || parts.every(p => p.fill || p.stroke), `scene ${i} shape`);
    for (const p of parts) for (const d of [p.fill, p.stroke].filter(Boolean)) assert.match(d, /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/, `scene ${i} path`);
  }
  assert.match(section, /data-depth[^>]*data-cm="off"/, 'the sticky stage stays out of the reveal layer');
});

test('every showcase card opens a real page and carries a light, described screenshot', async () => {
  const cards = [...section.matchAll(/<a class="built-card" href="([^"]+)"[^>]*><img src="([^"]+)" width="(\d+)" height="(\d+)" loading="lazy" decoding="async" alt="([^"]{12,})"/g)];
  assert.ok(cards.length >= 6, `${cards.length} cards`);
  for (const [, href, src] of cards) {
    const page = href === '/' ? 'tour/index.html' : href.replace(/^\//, '') + 'index.html';
    assert.ok(await exists(page), href);
    assert.ok(await exists(src.replace(/^\//, '')), src);
    assert.ok((await stat(root + src.replace(/^\//, ''))).size < 80 * 1024, `${src} stays under 80KB`);
  }
  assert.equal([...section.matchAll(/class="built-card"/g)].length, cards.length, 'no card without a checked image');
});

test('the promise stays honest: the work is the team’s, the student starts from a first piece', () => {
  assert.match(section, /ผลงานข้างบนคือเว็บจริงของทีม myClover/);
  assert.match(section, /ผลลัพธ์ของแต่ละคนขึ้นกับเวลาที่ฝึก/);
  assert.doesNotMatch(section, /รับประกัน|การันตี|ทุกคนทำได้/);
  for (const step of ['Source', 'Taste', 'Cook', 'Split', 'Season', 'Serve']) assert.match(section, new RegExp(`<b>0\\d ${step}</b>`));
  assert.match(section, /href="#offer"/);
});

test('the engine is self-contained and degrades gracefully', async () => {
  const js = await readFile(root + 'assets/depth/clover-depth.js', 'utf8');
  assert.doesNotMatch(js, /https?:\/\//);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /depth-still/, 'no WebGL keeps the captions walking');
  assert.match(js, /webglcontextlost/);
  assert.match(js, /IntersectionObserver/, 'draws only while visible');
});
