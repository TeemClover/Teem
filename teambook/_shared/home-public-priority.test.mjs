import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
const lobby = readFileSync(join(ROOT, 'public/index.html'), 'utf8');

test('home prioritizes public discovery only when there is no active book', () => {
  assert.match(home, /id="publicDiscovery"/);
  assert.match(home, /async function applyHomePriority\(\)[\s\S]*const hasActiveBook = active\.length > 0;/);
  assert.match(home, /if \(hasActiveBook\) return;[\s\S]*await loadHomePublicDiscovery\(\);/);
});

test('public API is not requested before home state is resolved', () => {
  const decision = home.indexOf('async function applyHomePriority()');
  const fetcher = home.indexOf("fetch('/api/teambook/public'");
  assert.ok(decision > -1 && fetcher > -1);
  assert.match(home, /syncXtyProfile\(\)[\s\S]*if \(hasProfile\(\)\) await applyHomePriority\(\);/);
});

test('public lobby shows full books by default', () => {
  assert.match(lobby, /return saved === null \? false : saved === '1';/);
  assert.match(lobby, /เต็มแล้ว · กำลังเขียน/);
  assert.match(lobby, /loadedParties\.sort\(\(a, b\) => Number\(isFull\(a\)\) - Number\(isFull\(b\)\)\)/);
});
