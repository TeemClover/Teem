import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const v13 = readFileSync(join(ROOT, '_shared/v13-public-first.js'), 'utf8');
const endpoint = readFileSync(join(ROOT, 'api/teambook-public-seen.js'), 'utf8');
const duration = readFileSync(join(ROOT, '_shared/duration-gate.js'), 'utf8');

test('onboarding stores alias first and gives safe random look fallbacks', () => {
  assert.match(v13, /อยากให้เราเรียกคุณว่าอะไร\?/);
  assert.match(v13, /ไม่จำเป็นต้องเป็นชื่อจริง/);
  assert.match(v13, /createProfile\(\{ alias: name, \.\.\.look \}\)/);
  assert.match(v13, /randomProfileLook\(\)/);
  assert.match(v13, /เลือกตัวแทนของคุณ/);
  assert.match(v13, /เลือกสีที่ชอบ/);
  assert.match(v13, /อ่านเรื่องของ TeamBook/);
});

test('new-book defaults are shared public 3-day Seen-required', () => {
  assert.match(v13, /clickChoice\('modePick',[\s\S]*ทำเรื่องเดียวกัน/);
  assert.match(v13, /clickChoice\('verificationPick',[\s\S]*เห็นแล้ว/);
  assert.match(v13, /clickChoice\('visibilityPick',[\s\S]*สาธารณะ/);
  assert.match(v13, /clickChoice\('durationPick'/);
  assert.match(duration, /let selected = whiteCatRoute \? 28 : 3;/);
});

test('Public Seen settles the author anonymously and writes the canonical event copy', () => {
  assert.match(endpoint, /INSERT INTO teambook_confirmations/);
  assert.match(endpoint, /`public:\$\{hash\.slice\(0, 32\)\}`/);
  assert.match(endpoint, /'PUBLIC_SEEN'/);
  assert.match(endpoint, /👀 มีใครบางคนนอกสมุดเห็นสิ่งที่ \$\{commit\.alias\} ทำแล้ว/);
  assert.match(endpoint, /confirmDeadlineForDayKey/);
});

test('Public Seen cannot grant or consume witness card rewards', () => {
  assert.doesNotMatch(endpoint, /await\s+firstSeenRewardFor\(/);
  assert.doesNotMatch(endpoint, /import[\s\S]{0,120}firstSeenRewardFor/);
  assert.doesNotMatch(endpoint, /INSERT INTO teambook_card_unlock_events/);
  assert.doesNotMatch(endpoint, /INSERT INTO teambook_user_cards/);
  assert.match(endpoint, /no firstSeenRewardFor\(\), no teambook_card_unlock_events/);
});

test('Public witness UI exposes no witness identity or popularity count', () => {
  assert.match(v13, /ใครบางคนนอกสมุด มองเห็นสิ่งที่คุณทำแล้ว/);
  assert.match(v13, /รอยนี้ถูกส่งกลับเข้าไปในสมุดแล้ว/);
  assert.doesNotMatch(v13, /Seen by/);
  assert.doesNotMatch(v13, /follower/i);
});

test('solo book is framed as complete and user-facing 2–5 becomes 1–5', () => {
  assert.match(v13, /สมุดเล่มนี้สมบูรณ์แล้วด้วยคนเดียว/);
  assert.match(v13, /replaceAll\('2–5', '1–5'\)/);
});
