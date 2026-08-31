/* One card shape, enforced.

   Every vertical card in TeamBook is 63×88. The moment a slot writes its own
   ratio — 5/7 is the near-miss that was already in the tree — cards stop
   lining up, and art that does not match the box starts leaving gaps
   instead of being cropped into it. So the ratio lives in exactly one
   place and this test fails if a second one appears. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SURFACES = ['.'];
const EXTENSIONS = ['.css', '.js', '.html', '.mjs'];
const TOKEN = '--xty-card-aspect';

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'core7' || entry === 'dist' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (EXTENSIONS.some(ext => entry.endsWith(ext))) found.push(path);
  }
  return found;
}

const files = SURFACES.flatMap(surface => walk(join(root, surface)))
  /* Tests describe these rules in regex form; scanning them reads the
     description as a violation of the thing it describes. */
  .filter(path => !path.endsWith('.test.mjs'))
  .map(path => ({ path: path.slice(root.length + 1), text: readFileSync(path, 'utf8') }));

test('the card ratio is defined exactly once', () => {
  const definitions = files.filter(file => file.text.includes(`${TOKEN}:63/88`));
  assert.deepEqual(
    definitions.map(file => file.path),
    ['_shared/card-tokens.css'],
    'the 63/88 numbers belong in one declaration and nowhere else'
  );
});

test('no card slot writes its own ratio', () => {
  /* 5/7 is 0.7143 and 63/88 is 0.7159 — close enough to look fine alone
     and wrong the moment two cards sit side by side. */
  const offenders = [];
  for (const file of files) {
    const matches = file.text.match(/aspect-ratio:\s*(?!var\()[^;!}`'"\n]+/g) || [];
    for (const match of matches) {
      const value = match.split(':')[1].trim();
      const compactValue = value.replaceAll(' ', '');
      if (['1', '1/1', '4/3', '3/2', '1.15'].includes(compactValue)) continue; // square, scene and banner slots
      /* auto is a slot deliberately taking its shape from its content — the
         About hero art and a seat showing a whole card, neither of which is a
         card slot the ratio has to govern. */
      if (value === 'auto') continue;
      if (file.text.includes(`${TOKEN}:${value}`)) continue; // the one definition
      offenders.push(`${file.path}: ${match}`);
    }
  }
  assert.deepEqual(offenders, [], `card slots must use var(${TOKEN})`);
});

test('nothing placed in a card slot is allowed to letterbox', () => {
  /* object-fit:contain leaves bars, which is exactly the empty space a
     card must never have. Square avatar tiles are the deliberate
     exception: their art is 1:1 and is not a card. */
  const allowed = [
    '.mark img',            // the TeamBook wordmark in the header
    '.xty-pet',             // hero animals
    '.pet-slot img',        // party pet portrait
    '.pc .glyph img',       // starter tile inside a card-shaped slot
    '.seat .av img',        // starter animal in a seat
    '.post .av img',        // chat avatar
    '.avatar-cover img',    // handled explicitly in card-ui.js
    '.xcp-opt>.xcp-thumb img',
    '.pc.avatar-card .glyph img',
    '.party-head .pet-slot img',
    /* The picker frames a card from outside rather than cropping into it —
       a deliberate choice, so the whole printed edge stays visible in a
       selection tile. */
    '.xcp-card-thumb>.animal-card .card-art',
  ];
  for (const file of files) {
    if (!file.text.includes('object-fit:contain')) continue;
    /* Guard the card face itself rather than every avatar in the app. */
    /* The picker's thumb is the one framed-from-outside slot; everywhere else
       a card face still has to fill its box. */
    const text = file.text.replace(/\.xcp-card-thumb>\.animal-card \.card-art\{[^}]*\}/g, '');
    assert.doesNotMatch(
      text,
      /\.(animal-card|xty-card|card-art|reveal-front|xty-cover-thumb)[^{]*\{[^}]*object-fit:\s*contain/,
      `${file.path}: a card face must fill its slot (allowed exceptions: ${allowed.length} avatar tiles)`
    );
  }
});

test('card backs and legacy character tiles derive height from the 63:88 token', () => {
  const cardUi = files.find(file => file.path === '_shared/card-ui.js')?.text || '';
  const sharedCss = files.find(file => file.path === '_shared/xty.css')?.text || '';
  assert.match(cardUi, /\.animal-card\.card-back\{[^}]*height:auto!important;[^}]*min-height:0!important;[^}]*aspect-ratio:var\(--xty-card-aspect\)!important;/s);
  assert.match(sharedCss, /\.pc\.avatar-card\{aspect-ratio:var\(--xty-card-aspect\);/);
  assert.doesNotMatch(sharedCss, /\.pc\.avatar-card\{aspect-ratio:1;/);
});
