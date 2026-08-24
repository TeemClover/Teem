import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const trustSeen = readFileSync(join(ROOT, '_shared/trust-seen.js'), 'utf8');
const firstReceived = readFileSync(join(ROOT, '_shared/first-received-seen.js'), 'utf8');
const publicSeen = readFileSync(join(ROOT, 'api/teambook-public-seen.js'), 'utf8');
const trustConfirm = readFileSync(join(ROOT, 'api/teambook/party/[code]/confirm.js'), 'utf8');
const publicList = readFileSync(join(ROOT, 'api/teambook-public-list-v13.js'), 'utf8');
const runtime = readFileSync(join(ROOT, '_shared/language.js'), 'utf8');

test('Trust passes immediately but still exposes Seen inside the book', () => {
  assert.match(trustSeen, /✓ ผ่านทันที · เชื่อใจกัน/);
  assert.match(trustSeen, /◎ เห็นแล้ว/);
  assert.match(trustSeen, /trustSeenCommit\(code, post\.seq\)/);
  assert.match(trustConfirm, /trustPassUnaffected: true/);
});

test('member Seen in Trust retains the normal first-seen reward path', () => {
  assert.match(trustConfirm, /firstSeenRewardFor\(sql, row, member, at\)/);
  assert.match(trustConfirm, /first_seen_pending/);
  assert.match(trustConfirm, /FIRST_SEEN_REWARD_EARNED/);
});

test('Confirm books stay on the canonical confirm handler', () => {
  assert.match(trustConfirm, /if \(verificationMode === 'confirm'\) return xtyHandler\(req, res\);/);
});

test('Public Seen remains available without a verification-mode gate', () => {
  assert.doesNotMatch(publicSeen, /CONFIRM_NOT_REQUIRED/);
  assert.match(publicSeen, /INSERT INTO teambook_confirmations/);
});

test('Trust public status is green after a commit and never yellow merely for being unseen', () => {
  assert.match(publicList, /if \(verificationMode !== 'confirm'\) return 'green';/);
  assert.match(publicList, /verificationMode === 'confirm' \? Number\(row\.yesterday_pending_count/);
});

test('first received Seen onboarding works for Trust and anonymous Public Seen', () => {
  assert.doesNotMatch(firstReceived, /verificationMode !== 'confirm'/);
  assert.match(firstReceived, /ใครบางคนนอกสมุด มองเห็นสิ่งที่คุณทำแล้ว/);
});

test('trust Seen layer is wired into runtime', () => {
  assert.match(runtime, /trust-seen\.js/);
});
