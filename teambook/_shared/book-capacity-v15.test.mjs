import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { bookCapacity } from './book-capacity-v15.js';

const here = dirname(fileURLToPath(import.meta.url));

test('client capacity uses the exact server-resolved per-book limit', () => {
  assert.deepEqual(bookCapacity({ memberCount: 3, maxMembers: 11 }), {
    memberCount: 3,
    memberLimit: 11,
    remaining: 8,
    full: false,
  });
  assert.deepEqual(bookCapacity({ memberCount: 5, maxMembers: 5 }), {
    memberCount: 5,
    memberLimit: 5,
    remaining: 0,
    full: true,
  });
});

test('owner is part of the people count and full means count reaches this book limit', () => {
  assert.equal(bookCapacity({ memberCount: 1, memberLimit: 1 }).full, true);
  assert.equal(bookCapacity({ memberCount: 1, memberLimit: 5 }).remaining, 4);
  assert.equal(bookCapacity({ memberCount: 10, memberLimit: 11 }).full, false);
  assert.equal(bookCapacity({ memberCount: 11, memberLimit: 11 }).full, true);
});

test('client never invents the historical five-person fallback', () => {
  assert.equal(bookCapacity({ memberCount: 3 }), null);
  assert.equal(bookCapacity({ memberCount: 3, maxMembers: 0 }), null);
  assert.equal(bookCapacity({ memberCount: 3, maxMembers: 12 }), null);
});

test('active Public surfaces contain no fixed-five capacity renderer', async () => {
  const [previewApi, detailPage, homePublic] = await Promise.all([
    readFile(resolve(here, '../api/_lib/xty-public-preview-v2.js'), 'utf8'),
    readFile(resolve(here, '../public/p/index.html'), 'utf8'),
    readFile(resolve(here, './home-public-v15.js'), 'utf8'),
  ]);

  assert.doesNotMatch(previewApi, /activeMembers\.length\s*<\s*5/);
  assert.doesNotMatch(detailPage, /members\.length\s*\/\s*5/);
  assert.doesNotMatch(detailPage, /members\.length\s*>=\s*5/);
  assert.doesNotMatch(homePublic, /maxMembers\s*\|\|\s*5/);
});
