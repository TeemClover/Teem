import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completionGate, confirmDeadlineForDayKey, normalizeVerificationMode,
  partyDateKey, partyDayNumber, scheduledEndAt, validPartyCode,
} from './xty-rules.js';

test('party codes are exactly five numeric digits', () => {
  assert.equal(validPartyCode('01234'), true);
  assert.equal(validPartyCode('1234'), false);
  assert.equal(validPartyCode('123456'), false);
  assert.equal(validPartyCode('12A34'), false);
});

test('verification mode only accepts confirm explicitly', () => {
  assert.equal(normalizeVerificationMode('confirm'), 'confirm');
  assert.equal(normalizeVerificationMode('CONFIRM'), 'confirm');
  assert.equal(normalizeVerificationMode('anything-else'), 'trust');
});

test('party day boundary is fixed to Asia/Bangkok midnight', () => {
  assert.equal(partyDateKey('2026-08-14T16:59:59.999Z'), '2026-08-14');
  assert.equal(partyDateKey('2026-08-14T17:00:00.000Z'), '2026-08-15');
  assert.equal(partyDayNumber('2026-08-14T17:00:00.000Z', '2026-08-15T16:59:59.999Z'), 1);
  assert.equal(partyDayNumber('2026-08-14T17:00:00.000Z', '2026-08-15T17:00:00.000Z'), 2);
});

test('completion opens only after all planned days have ended', () => {
  assert.equal(scheduledEndAt('2026-08-15T10:00:00.000Z', 7).toISOString(), '2026-08-21T17:00:00.000Z');
  const party = { startedAt: '2026-08-15T10:00:00.000Z', durationDays: 7 };
  assert.equal(completionGate(party, '2026-08-21T16:59:59.999Z').eligible, false);
  assert.equal(completionGate(party, '2026-08-21T17:00:00.000Z').eligible, true);
});

test('confirm deadline is midnight after the next party day', () => {
  assert.equal(confirmDeadlineForDayKey('2026-08-15').toISOString(), '2026-08-16T17:00:00.000Z');
  assert.equal(confirmDeadlineForDayKey('not-a-day'), null);
});
