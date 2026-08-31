import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMBOOK_CARDS } from './cards.js';
import { cardCanBePartyCover } from './cover-eligibility.js';

test('every collectible reward card can be a book cover regardless of rarity', () => {
  const common = TEAMBOOK_CARDS.find(card => card.rarity === 'common' && card.eligibility?.reward);
  assert.ok(common, 'catalog should contain a Common collectible');
  assert.equal(cardCanBePartyCover(common), true, 'Common cards must be valid covers');

  const rewardCards = TEAMBOOK_CARDS.filter(card => card.eligibility?.reward);
  assert.ok(rewardCards.length > 0);
  assert.equal(rewardCards.every(cardCanBePartyCover), true);
});

test('internal non-reward cards are not book covers', () => {
  assert.equal(cardCanBePartyCover({ eligibility: { reward: false } }), false);
  assert.equal(cardCanBePartyCover(null), false);
});
