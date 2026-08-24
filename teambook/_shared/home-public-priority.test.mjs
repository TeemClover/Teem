import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
const lobby = readFileSync(join(ROOT, 'public/index.html'), 'utf8');
const publicHome = readFileSync(join(ROOT, '_shared/home-public-v15.js'), 'utf8');
const bootstrap = readFileSync(join(ROOT, '_shared/language.js'), 'utf8');

test('V1.5 boots one canonical Home Public owner', () => {
  assert.match(bootstrap, /home-public-v15\.js/);
  assert.doesNotMatch(home, /id="publicDiscovery"|id="homePublicList"/);
  assert.match(publicHome, /HIDDEN_KEY = 'teambook_public_home_hidden_v13'/);
  assert.match(publicHome, /const LIST_API = '\/api\/teambook-public-list-v13'/);
});

test('hidden Home Public preference prevents the Lobby request until reopened', () => {
  assert.match(publicHome, /if \(isHidden\(\)\) return \[\];/);
  assert.match(publicHome, /setHidden\(true\)/);
  assert.match(publicHome, /setHidden\(false\)/);
  assert.match(publicHome, /render\(await load\(\)\)/);
});

test('Home order promotes opening a new solo-capable book and keeps Public before closed books', () => {
  assert.match(publicHome, /\+ เปิดสมุดเล่มใหม่/);
  assert.match(publicHome, /ทำเรื่องเดียวกัน/);
  assert.match(publicHome, /สาธารณะ/);
  assert.match(publicHome, /3 วัน/);
  assert.match(publicHome, /ต้องมีคนเห็น/);
  assert.match(publicHome, /parent\.insertBefore\(node, before\)/);
});

test('home and full public lobby keep full books visible', () => {
  assert.match(publicHome, /sort\(\(a, b\) => Number\(a\.__capacity\.full\) - Number\(b\.__capacity\.full\)\)/);
  assert.match(publicHome, /slice\(0, 8\)/);
  assert.match(lobby, /return saved === null \? false : saved === '1';/);
  assert.match(lobby, /เต็มแล้ว · กำลังเขียน/);
});

test('legacy Home public renderer is deleted instead of intercepted', () => {
  assert.match(home, /function applyHomePriority\(\)/);
  assert.doesNotMatch(home, /fetch\('\/api\/teambook\/public'/);
  assert.doesNotMatch(bootstrap, /legacyHomePublicSuppressed|url\.pathname === '\/api\/teambook\/public'/);
});
