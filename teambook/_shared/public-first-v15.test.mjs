import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const onboarding = readFileSync(join(ROOT, '_shared/home-onboarding-v14.js'), 'utf8');
const create = readFileSync(join(ROOT, 'new/index.html'), 'utf8');
const publicPanel = readFileSync(join(ROOT, '_shared/public-seen-v15.js'), 'utf8');
const partyPanel = readFileSync(join(ROOT, '_shared/party-public-seen-v15.js'), 'utf8');
const endpoint = readFileSync(join(ROOT, 'api/teambook-public-seen.js'), 'utf8');
const duration = readFileSync(join(ROOT, '_shared/duration-gate.js'), 'utf8');
const partyTimeline = readFileSync(join(ROOT, '_shared/party-enhancements.js'), 'utf8');

test('onboarding stores alias first and gives safe random look fallbacks', () => {
  assert.match(onboarding, /อยากให้เราเรียกคุณว่าอะไร\?/);
  assert.match(onboarding, /ไม่จำเป็นต้องเป็นชื่อจริง/);
  assert.match(onboarding, /createProfile\(\{ alias: name, \.\.\.look \}\)/);
  assert.match(onboarding, /randomLook\(\)/);
  assert.match(onboarding, /เลือกตัวแทนของคุณ/);
  assert.match(onboarding, /เลือกสีที่ชอบ/);
});

test('new-book defaults are shared, public, 3-day and Seen-required without a UI patch', () => {
  assert.match(create, /let activityMode = SHARED;/);
  assert.match(create, /let verificationMode = 'confirm';/);
  assert.match(create, /let durationDays = 3;/);
  assert.match(create, /let visibility = 'public';/);
  assert.match(duration, /let selected = whiteCatRoute \? 28 : 3;/);
});

test('Public Seen settles the author anonymously and writes the canonical event copy', () => {
  assert.match(endpoint, /INSERT INTO teambook_confirmations/);
  assert.match(endpoint, /`public:\$\{hash\.slice\(0, 32\)\}`/);
  assert.match(endpoint, /'PUBLIC_SEEN'/);
  assert.match(endpoint, /👀 มีใครบางคนนอกสมุดเห็นสิ่งที่ \$\{commit\.alias\} ทำแล้ว/);
  assert.match(endpoint, /confirmDeadlineForDayKey/);
  assert.match(partyTimeline, /case 'PUBLIC_SEEN'/);
});

test('Public Seen cannot grant or consume witness card rewards', () => {
  assert.doesNotMatch(endpoint, /await\s+firstSeenRewardFor\(/);
  assert.doesNotMatch(endpoint, /INSERT INTO teambook_card_unlock_events/);
  assert.doesNotMatch(endpoint, /INSERT INTO teambook_user_cards/);
});

test('Public witness UI exposes no witness identity or popularity count', () => {
  assert.match(partyPanel, /ใครบางคนนอกสมุด มองเห็นสิ่งที่คุณทำแล้ว/);
  assert.match(publicPanel, /รอยนี้ถูกส่งกลับเข้าไปในสมุดแล้ว/);
  assert.doesNotMatch(publicPanel, /Seen by|follower/i);
});

test('solo book is framed as complete', () => {
  assert.match(partyPanel, /สมุดเล่มนี้สมบูรณ์แล้วด้วยคนเดียว/);
});
