import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const pets = readFileSync(join(ROOT, '_shared/pets.js'), 'utf8');
const seen = readFileSync(join(ROOT, '_shared/first-received-seen.js'), 'utf8');
const stars = readFileSync(join(ROOT, '_shared/star-rewards.js'), 'utf8');

test('party page lazily installs first received-seen onboarding', () => {
  assert.match(pets, /\/\^\\\/p\\\/\?\$\/[\s\S]*import\('\.\/first-received-seen\.js'\)/);
  assert.match(seen, /post\.userId === myId && post\.confirmedBy/);
  assert.match(seen, /เห็นกันแล้ว · ครั้งแรกในสมุดนี้/);
  assert.match(seen, /เพิ่มไปยังหน้าจอโฮม/);
  assert.match(seen, /เพิ่มไปยังหน้าจอหลัก/);
  assert.match(seen, /Bookmark\/Favorite/);
});

test('first received-seen helper adds no polling or network request', () => {
  assert.doesNotMatch(seen, /\bfetch\s*\(/);
  assert.doesNotMatch(seen, /setInterval\s*\(/);
});

test('save-progress prompt belongs to the first three-star card', () => {
  assert.match(stars, /FIRST_STAR_SAVE_PROMPT_KEY/);
  assert.match(stars, /milestone === 1/);
  assert.match(stars, /รักษาสมุดและการ์ด · แนะนำ/);
  assert.match(stars, /ผูกอีเมล · เก็บความคืบหน้า/);
  assert.match(stars, /MutationObserver/);
  assert.match(stars, /prompt\.dataset\.milestoneSave !== '1'/);
});
