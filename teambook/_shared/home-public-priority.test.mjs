import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
const lobby = readFileSync(join(ROOT, 'public/index.html'), 'utf8');
const v13 = readFileSync(join(ROOT, '_shared/v13-public-first.js'), 'utf8');
const runtime = readFileSync(join(ROOT, '_shared/runtime.js'), 'utf8');

test('V1.3 boots before legacy Home and makes Public visible by default', () => {
  assert.match(runtime, /import '\.\/v13-public-first\.js\?v=20260823-v13a';/);
  assert.match(home, /id="publicDiscovery"/);
  assert.match(v13, /HOME_PUBLIC_HIDDEN_KEY = 'teambook_public_home_hidden_v13'/);
  assert.match(v13, /section\.hidden = hidden/);
  assert.match(v13, /loadHomeLobby\(\)/);
});

test('hidden Home Public preference prevents the Lobby request until reopened', () => {
  assert.match(v13, /if \(homePublicHidden\(\)\) \{[\s\S]*hiddenByUser: true/);
  assert.match(v13, /storageSet\(HOME_PUBLIC_HIDDEN_KEY, '1'\)/);
  assert.match(v13, /storageRemove\(HOME_PUBLIC_HIDDEN_KEY\)/);
  assert.match(v13, /await loadHomeLobby\(true\)/);
});

test('Home order promotes opening a new solo-capable book and keeps Public before closed books', () => {
  assert.match(v13, /\+ เปิดสมุดใหม่/);
  assert.match(v13, /เริ่มคนเดียวได้/);
  assert.match(v13, /ทำเรื่องเดียวกัน/);
  assert.match(v13, /สาธารณะ/);
  assert.match(v13, /3 วัน/);
  assert.match(v13, /ต้องมีคนเห็นแล้ว/);
  assert.match(v13, /all\.insertBefore\(section, closed\)/);
});

test('home and full public lobby keep full books visible', () => {
  assert.match(v13, /sort\(\(a, b\) => Number\(publicFull\(a\)\) - Number\(publicFull\(b\)\)\)/);
  assert.match(v13, /slice\(0, 8\)/);
  assert.match(lobby, /return saved === null \? false : saved === '1';/);
  assert.match(lobby, /เต็มแล้ว · กำลังเขียน/);
});

test('legacy no-active-only policy is superseded rather than trusted as V1.3 behavior', () => {
  assert.match(home, /async function applyHomePriority\(\)/);
  assert.match(v13, /Public-first patch/);
  assert.match(v13, /Home order is Create -> Active -> Public -> Finished/);
});
