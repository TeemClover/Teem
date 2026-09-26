/** Every internal link in the 3D house tour must land on a real page in this repository. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const html = await readFile(root + 'tour/index.html', 'utf8');

async function exists(path) {
  const clean = path.split(/[?#]/)[0];
  for (const candidate of [clean, clean.endsWith('/') ? clean + 'index.html' : clean + '/index.html']) {
    try { if ((await stat(root + candidate.replace(/^\//, ''))).isFile()) return true; } catch {}
  }
  return false;
}

test('internal hrefs and assets resolve', async () => {
  const refs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map(m => m[1]);
  assert.ok(refs.length > 15);
  const missing = [];
  for (const ref of new Set(refs)) if (!(await exists(ref))) missing.push(ref);
  assert.deepEqual(missing, []);
});

test('each room has one primary destination; clover rooms have a hint', () => {
  for (const room of ['living', 'kitchen', 'classroom', 'office']) {
    const section = html.split(`data-scene="${room}"`)[1].split('</section>')[0];
    assert.equal(section.match(/data-primary/g)?.length, 1, room);
    assert.match(section, new RegExp(`data-find="${room}" data-hint="[^"]+"`), room);
  }
  assert.match(html.split('data-scene="finale"')[1], /data-primary data-item="meet" href="\/meet\/"/);
});

test('every pickable object has a unique id, a real link and a description', () => {
  const items = [...html.matchAll(/<a [^>]*data-item="([\w-]+)"[^>]*>/g)];
  assert.ok(items.length >= 20, `only ${items.length} items`);
  const ids = items.map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate data-item');
  for (const [tag, id] of items) {
    assert.match(tag, /href="\/[^"]*"/, id);
    assert.match(tag, /data-desc="[^"]{10,}"/, id);
  }
});

test('classroom computers open บท 1, บท 4, บท 5 and the Dungeon; the project room shows X-VISOR, TeamBook, Resume', () => {
  const cls = html.split('data-scene="classroom"')[1].split('</section>')[0], office = html.split('data-scene="office"')[1].split('</section>')[0];
  for (const href of ['/classroom/free-ai.html', '/classroom/notebooklm.html', '/classroom/prompts.html', '/classroom/dungeon/']) assert.ok(cls.includes(`href="${href}"`), href);
  for (const href of ['/xvisor/', '/teambook/', '/resume/', '/showcase/house/']) assert.ok(office.includes(`href="${href}"`), href);
  assert.doesNotMatch(html, /ไม่มีอะไรขาย/);
});

test('three.js is self-hosted, no third-party script origins', () => {
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
});

test('all configured house art resolves, including the instructor and current project screens', async () => {
  const {slots} = JSON.parse(await readFile(root + 'tour/art/manifest.json', 'utf8'));
  for (const name of Object.values(slots)) {
    assert.match(name, /^[\w.-]+\.webp$/);
    assert.ok(await exists('/tour/art/' + name), name);
  }
  for (const slot of ['course-poster', 'screen-resume', 'screen-xvisor']) assert.ok(slots[slot]);
});
