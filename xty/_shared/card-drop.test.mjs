/* The printed set and the odds behind a single draw. Both are product
   decisions that are easy to break silently, so they are asserted here. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  XTY_CARDS, XTY_CARD_COLORS, XTY_DROP_ODDS, cardById, rollRarity,
} from './cards.js';

test('the printed set is exactly the art that exists', () => {
  const by = {};
  for (const card of XTY_CARDS) by[card.rarity] = (by[card.rarity] || 0) + 1;
  assert.deepEqual(by, { common: 40, rare: 12, epic: 12, legendary: 8 });
  assert.equal(XTY_CARDS.length, 72);
});

test('no starter animal is printed as a card, and every card has a colour', () => {
  for (const card of XTY_CARDS) {
    assert.notEqual(card.rarity, 'starter', 'starters are free identities, not commons');
    assert.ok(XTY_CARD_COLORS.includes(card.color), `${card.cardId} must carry one of the four colours`);
  }
});

test('cow is not findable yet', () => {
  assert.equal(XTY_CARDS.some(card => card.species === 'cow'), false);
});

test('legendary is one colour per animal — there is no set to complete', () => {
  const legendary = XTY_CARDS.filter(card => card.rarity === 'legendary');
  const species = legendary.map(card => card.species);
  assert.equal(new Set(species).size, species.length, 'each animal appears once');
  assert.equal(legendary.length, 8);
});

test('card ids stay unique and stay within the member avatar column', () => {
  const ids = XTY_CARDS.map(card => card.cardId);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  for (const id of ids) assert.ok(id.length <= 40, `${id} must fit the 40-char column`);
});

test('cards already owned before the reprint still resolve', () => {
  /* These ids predate the new art and exist in live profiles. */
  for (const id of ['ORANGE_CAT_RED_RARE_001', 'WHITE_POM_SILVER_RARE_001', 'ORANGE_CAT_RED_COMMON_001']) {
    assert.ok(cardById(id), `${id} must still be a known card`);
  }
});

test('the odds are the stated ones and sum to 100', () => {
  assert.deepEqual(XTY_DROP_ODDS, { common: 70, rare: 22, epic: 7, legendary: 1 });
  assert.equal(Object.values(XTY_DROP_ODDS).reduce((a, b) => a + b, 0), 100);
});

test('rollRarity lands in each band at its stated edges', () => {
  /* Math.random is [0,1), so these probe just inside each band. */
  assert.equal(rollRarity(() => 0), 'common');
  assert.equal(rollRarity(() => 0.6999), 'common');
  assert.equal(rollRarity(() => 0.70), 'rare');
  assert.equal(rollRarity(() => 0.9199), 'rare');
  assert.equal(rollRarity(() => 0.92), 'epic');
  assert.equal(rollRarity(() => 0.9899), 'epic');
  assert.equal(rollRarity(() => 0.99), 'legendary');
  assert.equal(rollRarity(() => 0.9999), 'legendary');
});

test('every draw is independent — no pity, no memory', () => {
  /* Feeding the same value repeatedly must give the same rarity every
     time; a pity counter would eventually force something rarer. */
  const twenty = Array.from({ length: 20 }, () => rollRarity(() => 0.1));
  assert.deepEqual(new Set(twenty), new Set(['common']), 'a long common streak stays common');

  let calls = 0;
  const counting = () => { calls += 1; return 0.5; };
  for (let i = 0; i < 50; i++) rollRarity(counting);
  assert.equal(calls, 50, 'one roll per draw, no extra state consulted');
});

test('the distribution matches the stated odds over many draws', () => {
  /* Deterministic sweep rather than a random sample, so this can never
     flake: 10k evenly spaced rolls must partition by the odds exactly. */
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  const N = 10000;
  for (let i = 0; i < N; i++) counts[rollRarity(() => i / N)] += 1;
  assert.equal(counts.common, 7000);
  assert.equal(counts.rare, 2200);
  assert.equal(counts.epic, 700);
  assert.equal(counts.legendary, 100);
});

test('a real draw follows the odds and never repeats a card', async () => {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto ||= webcrypto;
  class Mem {
    #v = new Map();
    getItem(k) { return this.#v.has(k) ? this.#v.get(k) : null; }
    setItem(k, val) { this.#v.set(k, String(val)); }
    removeItem(k) { this.#v.delete(k); }
    clear() { this.#v.clear(); }
  }
  globalThis.localStorage = new Mem();
  const store = await import('./store.js');

  /* Many independent players, one draw each — the shape of that first
     draw is what the published odds actually promise. */
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < 600; i += 1) {
    localStorage.clear();
    store.createProfile({ alias: `p${i}`, avatarId: 'orange_cat', avatarFrame: 'green' });
    const reward = store.prepareCardReward({ questId: `q${i}`, partyCode: String(i % 100000).padStart(5, '0') });
    counts[cardById(reward.cardId).rarity] += 1;
  }
  assert.ok(counts.common > counts.rare, `common should dominate — got ${JSON.stringify(counts)}`);
  assert.ok(counts.rare > counts.epic, `rare should beat epic — got ${JSON.stringify(counts)}`);
  assert.ok(counts.common / 600 > 0.55, `common share too low: ${counts.common / 600}`);
  assert.ok(counts.legendary / 600 < 0.08, `legendary far too generous: ${counts.legendary / 600}`);

  /* Determinism: the same quest must not reroll into a different card. */
  localStorage.clear();
  store.createProfile({ alias: 'stable', avatarId: 'orange_cat', avatarFrame: 'green' });
  const first = store.prepareCardReward({ questId: 'same', partyCode: '00001' });
  const again = store.prepareCardReward({ questId: 'same', partyCode: '00001' });
  assert.equal(again.cardId, first.cardId, 'a prepared reward is fixed');

  /* Drawing the whole set must never hand out a duplicate. */
  localStorage.clear();
  store.createProfile({ alias: 'collector', avatarId: 'orange_cat', avatarFrame: 'green' });
  const seen = new Set();
  for (let i = 0; i < XTY_CARDS.length; i += 1) {
    const reward = store.prepareCardReward({ questId: `all-${i}`, partyCode: String(i).padStart(5, '0') });
    assert.ok(reward.cardId, `draw ${i} should still find a card`);
    assert.equal(seen.has(reward.cardId), false, 'no duplicate while the set is unfinished');
    seen.add(reward.cardId);
  }
  assert.equal(seen.size, XTY_CARDS.length, 'every printed card is reachable');
});
