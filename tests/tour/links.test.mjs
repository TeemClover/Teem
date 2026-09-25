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

test('each room has one primary destination and a clover hint', () => {
  for (const room of ['living', 'kitchen', 'classroom', 'office']) {
    const section = html.split(`data-scene="${room}"`)[1].split('</section>')[0];
    assert.equal(section.match(/data-primary/g)?.length, 1, room);
    assert.match(section, new RegExp(`data-find="${room}" data-hint="[^"]+"`), room);
  }
  assert.match(html.split('data-scene="finale"')[1], /data-primary href="\/meet\/"/);
});

test('three.js is self-hosted, no third-party script origins', () => {
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
});
