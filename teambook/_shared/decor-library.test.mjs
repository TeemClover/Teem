import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

/* The decor library is meant to be picked from by someone who was not here
   when it was built. That only works while the README describes the files
   that exist, so these hold the two ways it goes wrong: a file nobody
   documented, and a row describing a file nobody shipped. */

const DECOR = 'assets/decor';
const GROUPS = ['brand', 'mascot', 'sticker', 'stationery', 'doodle'];
const READY = existsSync(`${DECOR}/README.md`)
  && GROUPS.every(group => existsSync(`${DECOR}/${group}`))
  && existsSync(`${DECOR}/_source`)
  && existsSync('scripts/build-decor.py');
const readme = READY ? readFileSync(`${DECOR}/README.md`, 'utf8') : '';
const manifest = readFileSync('ASSET-MANIFEST.md', 'utf8');

const onDisk = READY ? GROUPS.flatMap(group =>
  readdirSync(`${DECOR}/${group}`)
    .filter(f => f.endsWith('.webp'))
    .map(f => ({ group, file: f, path: `${DECOR}/${group}/${f}` }))) : [];

const documented = [...readme.matchAll(/^\| `([a-z0-9-]+\.webp)` \| (\d+)×(\d+) \| ([\d.]+) KB \| (.+) \|$/gm)]
  .map(m => ({ file: m[1], w: +m[2], h: +m[3], kb: +m[4], use: m[5].trim() }));

test('a deferred optional decor batch is explicit', () => {
  if (READY) return;
  assert.match(manifest, /assets\/decor\/sticker/);
  assert.match(manifest, /not referenced by the bootable app/);
});

test('every file in the library has a row describing it', { skip: !READY }, () => {
  const rows = new Set(documented.map(d => d.file));
  for (const { group, file } of onDisk) {
    assert.ok(rows.has(file), `${group}/${file} exists but nothing says what it is for`);
  }
});

test('every row in the README describes a file that exists', { skip: !READY }, () => {
  const files = new Set(onDisk.map(a => a.file));
  for (const { file } of documented) {
    assert.ok(files.has(file), `the README lists ${file}, which is not in the library`);
  }
  assert.equal(documented.length, onDisk.length, 'one row per file, no duplicates');
});

test('the sizes in the README are the sizes a page will get', { skip: !READY }, () => {
  /* A wrong number here is worse than none: it is copied into width/height,
     and the wrong ratio squashes the picture. */
  const bySize = new Map(documented.map(d => [d.file, d]));
  for (const { file, path } of onDisk) {
    const row = bySize.get(file);
    const bytes = statSync(path).size;
    assert.ok(Math.abs(row.kb - bytes / 1024) < 0.1,
      `${file} is ${(bytes / 1024).toFixed(1)} KB, the README says ${row.kb} KB`);
  }
});

test('the library stays small enough to decorate with freely', { skip: !READY }, () => {
  const total = onDisk.reduce((sum, a) => sum + statSync(a.path).size, 0);
  assert.ok(total < 1.5e6, `the whole library is ${(total / 1024).toFixed(0)} KB`);
  for (const { group, file, path } of onDisk) {
    assert.ok(statSync(path).size < 40 * 1024,
      `${group}/${file} is ${(statSync(path).size / 1024).toFixed(0)} KB — too heavy for a sticker`);
  }
});

test('the masters that make the library reproducible are still here', { skip: !READY }, () => {
  assert.ok(existsSync(`${DECOR}/_source`), 'the PNG masters must not be deleted');
  assert.ok(existsSync('scripts/build-decor.py'), 'nor the script that rebuilds from them');
  assert.match(readme, /scripts\/build-decor\.py/, 'and the README must say how');
});

test('a decorative picture is not announced as content', { skip: !READY }, () => {
  /* Read by ear: "image, sticker of a heart" in the middle of a sentence is
     noise. Anything from the library that carries no alt text must also be
     hidden from the accessibility tree. */
  const pages = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'assets') walk(full);
      else if (entry.name.endsWith('.html')) pages.push(full);
    }
  };
  walk('.');
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    for (const [tag] of html.matchAll(/<img[^>]*assets\/decor\/[^>]*>/g)) {
      const alt = tag.match(/alt="([^"]*)"/);
      assert.ok(alt, `${page}: a decor image with no alt at all`);
      if (alt[1] === '') {
        assert.match(tag, /aria-hidden="true"/,
          `${page}: an empty alt needs aria-hidden, or a screen reader still stops on it`);
      }
      assert.match(tag, /width="\d+"\s+height="\d+"/,
        `${page}: a decor image with no reserved box will jump the layout`);
    }
  }
});
