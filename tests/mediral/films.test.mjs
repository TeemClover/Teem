import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SHOTS, FILMS, score} from '../../mediral/js/score.js';
import {resolveTrack, sample} from '../../mediral/js/cinema.js';

const data = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url), 'utf8'));
const step = id => data.steps.find(s => s.id === id);
const markup = id => SHOTS[id](step(id), path => path);

test('AC, BR and SU render independent deferred films with a shared silent-media contract', () => {
  const ids = [];
  for (const [id, film] of Object.entries(FILMS)) {
    const html = markup(id);
    const video = html.match(/<video\b[^>]*>/g);
    assert.equal(video.length, 1, `${id} has one film`);
    assert.ok(html.includes(`id="${film.id}"`)); ids.push(film.id);
    assert.ok(html.includes(`data-film-step="${id}"`));
    for (const flag of ['muted', 'playsinline', 'hidden']) assert.match(video[0], new RegExp(`\\s${flag}(?:\\s|>)`));
    assert.match(video[0], /preload="none"/);
    assert.doesNotMatch(video[0], /\s(?:src|controls|autoplay|loop)(?:=|\s|>)/);
    assert.ok(video[0].includes(`data-src="${film.src}"`));
    assert.ok(video[0].includes(`data-src-small="${film.small}"`));
    assert.ok(video[0].includes(`poster="${film.poster}"`));
    assert.ok(html.includes(`data-src="${film.poster}"`), 'A separate still survives blocked or failed playback');
    assert.ok(film.away[0] < film.window[0] && film.away[1] > film.window[1]);
  }
  assert.equal(new Set(ids).size, 3);
  assert.doesNotMatch(markup('CL') + markup('PO'), /<video/);
  const windows = Object.values(FILMS).map(f => f.window).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < windows.length; i++) assert.ok(windows[i][0] > windows[i - 1][1], 'No two video playback windows overlap');
});

test('the UV concept is visibly attributed without inventing test results or hiding its note with the video', () => {
  const html = markup('SU');
  assert.match(html, /<p class="mr-chapter-film__caption">ภาพจำลองกล้อง UV · ไม่ใช่ผลทดสอบสินค้า<\/p>/);
  assert.match(html, /mr-chapter-film__comparison"><span>ยังไม่ทา<\/span><span>ทาแล้ว<\/span>/, 'The reviewed left/right orientation stays explicit');
  assert.ok(html.indexOf('mr-chapter-film__caption') > html.indexOf('</video>'));
  assert.doesNotMatch(html.match(/<div class="mr-art mr-chapter-film[^>]*>/)[0], /aria-hidden/);
  const film = html.match(/<div class="mr-art mr-chapter-film[\s\S]*?<p class="mr-chapter-film__caption">[\s\S]*?<\/p>\s*<\/div>/)[0];
  assert.doesNotMatch(film, /(?:100%|SPF\s*\d|PA\+|ผลทดสอบยืนยัน)/, 'The concept film never supplies a product protection rating');
  assert.match(FILMS.SU.src, /su-uv-patch-v2-1080\.mp4$/, 'The corrected sunscreen-patch film replaces the whole-frame colour split');
});

test('the main sunscreen rating comes from attributed product data, distinct from the UV film', () => {
  const sun = step('SU');
  assert.deepEqual(sun.protection, {spf: '50', pa: '+++', spf_meaning: 'การปกป้อง UVB', pa_meaning: 'การปกป้อง UVA ระดับสูง', attribution: 'ค่าที่ Mediral ระบุ'});
  const block = markup('SU').match(/<div class="mr-protection mr-su__protection"[\s\S]*?<\/dl>[\s\S]*?<\/div>/)[0];
  assert.match(block, /<dt><span>SPF <\/span>50<\/dt>/);
  assert.match(block, /<dt>PA\+\+\+<\/dt>/);
  for (const text of [sun.protection.spf_meaning, sun.protection.pa_meaning, sun.protection.attribution]) assert.ok(block.includes(text));
  for (const id of ['CL', 'AC', 'BR', 'PO']) assert.doesNotMatch(markup(id), /mr-protection/);
  const missing = structuredClone(sun);
  delete missing.protection.attribution;
  assert.doesNotMatch(SHOTS.SU(missing, path => path), /mr-protection/, 'An unattributed rating is not rendered');
});

test('new film assets are real compact faststart MP4s in both sizes, with WebP fallback posters', () => {
  for (const id of ['BR', 'SU']) {
    const film = FILMS[id];
    for (const path of [film.src, film.small]) {
      const bytes = readFileSync(new URL(`../../mediral/${path}`, import.meta.url));
      assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', `${path}: MP4 signature`);
      const atoms = [];
      for (let offset = 0; offset + 8 <= bytes.length;) {
        const length = bytes.readUInt32BE(offset);
        assert.ok(length >= 8 && offset + length <= bytes.length, `${path}: valid top-level atom`);
        atoms.push(bytes.toString('ascii', offset + 4, offset + 8));
        offset += length;
      }
      assert.ok(atoms.includes('moov') && atoms.includes('mdat'));
      assert.ok(atoms.indexOf('moov') < atoms.indexOf('mdat'), `${path}: metadata precedes media`);
      assert.ok(bytes.length < (path === film.small ? 1_300_000 : 2_500_000), `${path}: practical mobile/desktop transfer budget`);
    }
    const poster = readFileSync(new URL(`../../mediral/${film.poster}`, import.meta.url));
    assert.equal(poster.toString('ascii', 0, 4), 'RIFF');
    assert.equal(poster.toString('ascii', 8, 12), 'WEBP');
    assert.ok(poster.length < 100_000);
  }
});

test('film holds leave their subject clear; the native products return for their final reading holds', () => {
  for (const tall of [true, false]) {
    const layout = {tall, W: tall ? 390 : 1280, H: tall ? 844 : 800};
    const plan = score(layout);
    const pose = (name, T) => sample(resolveTrack(plan.tracks[name], {cx: 0, cy: 0, w: 200, h: 300}, layout), T);
    assert.ok(pose('br.film', 7.05).o > .5);
    assert.equal(pose('br.pack', 7.05).o, 0, 'The BR bottle does not cover the extraction film');
    assert.equal(pose('su.film', 9.8).o, 1);
    assert.equal(pose('su.protection', 9.8).o, 1);
    for (const name of ['su.pack', 'su.ribbon', 'su.ribbonBack']) assert.equal(pose(name, 9.8).o, 0, `${name} does not cover the UV comparison`);
    assert.equal(pose('br.film', 8.5).o, 0);
    assert.equal(pose('br.pack', 8.5).o, 1);
    assert.equal(pose('su.film', 10.7).o, 0);
    assert.equal(pose('su.protection', 10.7).o, 0, 'The rating makes room for hydration and the pack');
    assert.equal(pose('su.pack', 10.7).o, 1);
  }
});

test('the CL tableau uses its named source beat, not the first three featured records', () => {
  const html = markup('CL');
  for (const name of ['hibiscus-flower.webp', 'lily-flower.webp', 'green-tea-shoot.webp']) assert.ok(html.includes(name));
  assert.ok(!html.includes('rice-grain-panicle.webp'));
  assert.match(html, /ชบา · ลิลลี่ · ชาเขียว/);
  assert.ok(html.includes('cl.word1') && html.includes('cl.word2'), 'The original foam-led word handoff remains');
});
