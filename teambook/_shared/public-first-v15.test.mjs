import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const onboarding = readFileSync(join(ROOT, '_shared/home-onboarding-v14.js'), 'utf8');
const create = readFileSync(join(ROOT, 'new/index.html'), 'utf8');
const joinPage = readFileSync(join(ROOT, 'join/index.html'), 'utf8');
const partyPage = readFileSync(join(ROOT, 'p/index.html'), 'utf8');
const publicPanel = readFileSync(join(ROOT, '_shared/public-seen-v15.js'), 'utf8');
const partyPanel = readFileSync(join(ROOT, '_shared/party-public-seen-v15.js'), 'utf8');
const endpoint = readFileSync(join(ROOT, 'api/teambook-public-seen.js'), 'utf8');
const duration = readFileSync(join(ROOT, '_shared/duration-gate.js'), 'utf8');
const partyTimeline = readFileSync(join(ROOT, '_shared/party-enhancements.js'), 'utf8');

test('onboarding asks only for a name and assigns a safe Starter look', () => {
  assert.match(onboarding, /อยากให้เราเรียกคุณว่าอะไร\?/);
  assert.match(onboarding, /ไม่ต้องใช้ชื่อจริง/);
  assert.match(onboarding, /createProfile\(\{ alias: name, \.\.\.randomLook\(\) \}\)/);
  assert.match(onboarding, /randomLook\(\)/);
  assert.match(onboarding, /location\.href = nextHref\(\)/);
  assert.doesNotMatch(onboarding, /tb14AvatarGrid|tb14ColorGrid/);
});

test('new-book defaults are shared, public, 3-day and Seen-required without a UI patch', () => {
  assert.match(create, /let activityMode = SHARED;/);
  assert.match(create, /let verificationMode = 'confirm';/);
  assert.match(create, /let durationDays = 3;/);
  assert.match(create, /let visibility = 'public';/);
  assert.match(duration, /let selected = whiteCatRoute \? 28 : 3;/);
});

test('new-book setup reveals one question at a time and keeps the first cover automatic', () => {
  assert.match(create, /data-wizard-step="mode"/);
  assert.match(create, /data-wizard-step="companion"/);
  assert.match(create, /if \(!levelOne\) wizardSteps\.push\(\{ node: \$\('coverSection'\)/);
  assert.match(create, /threeMessageBudget/);
  assert.doesNotMatch(create, /id="prule"/);
});

test('joining shows editable default identity and keeps book management collapsed', () => {
  assert.match(joinPage, /id="joinAlias"/);
  assert.match(joinPage, /ชื่อและตัวละครในสมุดนี้/);
  assert.doesNotMatch(joinPage, /<details class="join-options">/);
  assert.match(joinPage, /id="bookPreview" hidden/);
  assert.doesNotMatch(joinPage, /id="sharedRule"|askSuccessRule:\s*true|ownActivityPick/);
  assert.match(partyPage, /id="moreTools"/);
  assert.match(partyPage, /id="myActivityPick"/);
  assert.match(partyPage, /id="mySuccessRuleInput"/);
  assert.ok(partyPage.indexOf('id="moreTools"') < partyPage.indexOf('id="myCharacterTools"'));
  assert.ok(partyPage.indexOf('id="myCharacterTools"') < partyPage.indexOf('id="partyTools"'));
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
