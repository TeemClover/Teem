import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRounds } from '../backend/analytics.js';
import { OPEN_BETA_AT, clampAnalyticsStart } from '../backend/open-beta.js';

test('Open Beta reports ignore development analytics without deleting them', () => {
  assert.equal(clampAnalyticsStart(OPEN_BETA_AT - 1), OPEN_BETA_AT);
  assert.equal(clampAnalyticsStart(OPEN_BETA_AT + 1), OPEN_BETA_AT + 1);
});

test('analytics counts played and extra-discarded cards by color and card id', () => {
  const result = summarizeRounds([
    {
      a: { cardId:'fh-red-joy', color:'RED' },
      b: { cardId:'fh-green-discipline', color:'GREEN' },
      discards: [{ cardId:'fh-blue-clarity', color:'BLUE' }],
    },
    {
      a: { cardId:'fh-silver-tool', color:'SILVER' },
      b: { cardId:'fh-red-joy', color:'RED' },
      discards: [],
    },
  ]);
  assert.equal(result.roundCount, 2);
  assert.deepEqual(result.played, { RED:2, GREEN:1, BLUE:0, SILVER:1 });
  assert.deepEqual(result.discarded, { RED:0, GREEN:0, BLUE:1, SILVER:0 });
  assert.deepEqual(
    result.cardEvents.find(item => item.cardId === 'fh-red-joy' && item.eventType === 'PLAYED'),
    { cardId:'fh-red-joy', color:'RED', eventType:'PLAYED', n:2 },
  );
});

test('analytics ignores invalid cards instead of poisoning aggregates', () => {
  const result = summarizeRounds([
    { a:{ cardId:'ok-red', color:'RED' }, b:{ cardId:'bad', color:'PURPLE' }, discards:[null] },
  ]);
  assert.equal(result.roundCount, 0);
  assert.equal(result.played.RED, 1);
  assert.equal(result.played.GREEN, 0);
  assert.equal(result.cardEvents.length, 1);
});
