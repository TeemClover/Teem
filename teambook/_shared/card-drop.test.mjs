/* The printed set and the odds behind a single draw. Both are product
   decisions that are easy to break silently, so they are asserted here. */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEAMBOOK_CARDS, TEAMBOOK_CARD_COLORS, TEAMBOOK_DROP_ODDS, cardById, rollRarity,
} from './cards.js';
import {
  TEAMBOOK_SPECIES, TEAMBOOK_AVATARS, AVATAR_BY_ID, AVATAR_FRAMES, SPECIES_BY_ID, speciesById,
} from './avatars.js';

test('the printed set is exactly the art that exists', () => {
  const by = {};
  for (const card of TEAMBOOK_CARDS) by[card.rarity] = (by[card.rarity] || 0) + 1;
  assert.deepEqual(by, { common: 64, rare: 13, epic: 16, legendary: 9 });
  assert.equal(TEAMBOOK_CARDS.length, 102);
});

test('no starter animal is printed as a card, and every card has a colour', () => {
  for (const card of TEAMBOOK_CARDS) {
    assert.notEqual(card.rarity, 'starter', 'starters are free identities, not commons');
    assert.ok(TEAMBOOK_CARD_COLORS.includes(card.color), `${card.cardId} must carry one of the four colours`);
  }
});

test('cow is not findable yet', () => {
  assert.equal(TEAMBOOK_CARDS.some(card => card.species === 'cow'), false);
});

test('HIA is a secret card-only animal with exactly four Epic and one Legendary', () => {
  const hia = TEAMBOOK_CARDS.filter(card => card.species === 'monitor_lizard');
  assert.deepEqual(
    hia.map(card => `${card.rarity}:${card.color}`).sort(),
    ['epic:blue', 'epic:green', 'epic:red', 'epic:silver', 'legendary:silver'],
  );
  assert.equal(hia.some(card => ['common', 'rare'].includes(card.rarity)), false);
  assert.equal(speciesById('monitor_lizard')?.starter, false);
  assert.equal(speciesById('monitor_lizard')?.nameEn, 'HIA');
});

/* Starter is a roster, not "every animal". It stays at twelve while the
   card set grows, so a new animal is met by opening a card. */
test('the Starter roster is the twelve free animals, and nothing else', () => {
  assert.equal(TEAMBOOK_AVATARS.length, 12);
  for (const animal of TEAMBOOK_AVATARS) {
    assert.equal(animal.starter, true, `${animal.id} is offered free, so it must be a starter`);
    assert.equal(SPECIES_BY_ID[animal.id], animal, 'the roster is derived from the species list');
  }
  assert.deepEqual(
    Object.keys(AVATAR_BY_ID).sort(),
    TEAMBOOK_AVATARS.map(a => a.id).sort(),
    'the free picker only ever offers starters'
  );
});

test('every printed card belongs to an animal the game can draw', () => {
  for (const card of TEAMBOOK_CARDS) {
    assert.ok(speciesById(card.species), `${card.cardId} has no species entry`);
  }
  assert.equal(speciesById('cow'), null, 'an unknown species answers null, not a cat');
  assert.equal(speciesById(''), null);
});

/* The point of splitting the roster off the species list: art alone is
   enough to print a card. Proven by demoting an animal that has real art
   out of the roster — its cards must survive, its free identity must not. */
test('a species can print cards without being on the Starter roster', async () => {
  const demoted = TEAMBOOK_SPECIES.map(item => Object.freeze({ ...item, starter: false }));
  const byId = Object.fromEntries(demoted.map(item => [item.id, item]));

  /* An empty roster with a full species list: nobody is handed anything
     free, every animal still has art. The catalog must not notice. */
  mock.module('./avatars.js', {
    namedExports: {
      AVATAR_FRAMES,
      TEAMBOOK_SPECIES: Object.freeze(demoted),
      SPECIES_BY_ID: Object.freeze(byId),
      speciesById: id => byId[String(id || '')] || null,
      TEAMBOOK_AVATARS: Object.freeze([]),
      AVATAR_BY_ID: Object.freeze({}),
      avatarById: () => null,
      avatarFallback: id => byId[id]?.fallback || '🐱',
    },
  });

  try {
    const cards = await import('./cards.js?card-only-species');
    assert.equal(cards.TEAMBOOK_CARDS.length, TEAMBOOK_CARDS.length, 'the printed set does not shrink');
    assert.equal(
      cards.TEAMBOOK_CARDS.filter(card => card.species === 'turtle').length, 8,
      'a card-only animal keeps every card its art supports'
    );
  } finally {
    mock.restoreAll();
  }
});

test('legendary is one colour per animal — there is no set to complete', () => {
  const legendary = TEAMBOOK_CARDS.filter(card => card.rarity === 'legendary');
  const species = legendary.map(card => card.species);
  assert.equal(new Set(species).size, species.length, 'each animal appears once');
  assert.equal(legendary.length, 9);
});

test('card ids stay unique and stay within the member avatar column', () => {
  const ids = TEAMBOOK_CARDS.map(card => card.cardId);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  for (const id of ids) assert.ok(id.length <= 40, `${id} must fit the 40-char column`);
});

test('cards already owned before the reprint still resolve', () => {
  /* These ids predate the new art and exist in live profiles. */
  for (const id of ['ORANGE_CAT_RED_RARE_001', 'WHITE_POM_SILVER_RARE_001', 'ORANGE_CAT_RED_COMMON_001']) {
    assert.ok(cardById(id), `${id} must still be a known card`);
  }
});

test('the first chicken Rare is the reviewed red morning-bell card', () => {
  const card = cardById('CHICKEN_RED_RARE_001');
  assert.ok(card);
  assert.equal(card.species, 'chicken');
  assert.equal(card.color, 'red');
  assert.equal(card.rarity, 'rare');
  assert.equal(card.artVariant, 'morning-bell');
  assert.equal(card.accessoryType, 'morning-bell');
  assert.equal(card.accessoryColor, 'red');
  assert.equal(card.imageFull, '/assets/cards/rare/chicken-red-rare-001.webp');
});

test('the odds are the stated ones and sum to 100', () => {
  assert.deepEqual(TEAMBOOK_DROP_ODDS, { common: 70, rare: 22, epic: 7, legendary: 1 });
  assert.equal(Object.values(TEAMBOOK_DROP_ODDS).reduce((a, b) => a + b, 0), 100);
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
  for (let i = 0; i < TEAMBOOK_CARDS.length; i += 1) {
    const reward = store.prepareCardReward({ questId: `all-${i}`, partyCode: String(i).padStart(5, '0') });
    assert.ok(reward.cardId, `draw ${i} should still find a card`);
    assert.equal(seen.has(reward.cardId), false, 'no duplicate while the set is unfinished');
    seen.add(reward.cardId);
  }
  assert.equal(seen.size, TEAMBOOK_CARDS.length, 'every printed card is reachable');
});

/* The `brandnewcard` code hands out a real draw, not a special case, and
   can be typed more than once without replaying the same card. */
test('brandnewcard draws again every time, and never a duplicate', async () => {
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

  localStorage.clear();
  assert.equal(store.drawBrandNewCard(), null, 'no profile, no card');

  store.createProfile({ alias: 'coder', avatarId: 'orange_cat', avatarFrame: 'green' });
  const seen = new Set();
  for (let i = 0; i < TEAMBOOK_CARDS.length; i += 1) {
    const reward = store.drawBrandNewCard();
    assert.ok(reward?.cardId, `draw ${i} should hand out a card`);
    assert.equal(seen.has(reward.cardId), false, 'the same card must not come back');
    assert.equal(reward.partyCode, '', 'a code draw belongs to no party, so it opens offline');
    assert.ok(store.ownedCardIds().includes(reward.cardId), 'the card is owned before it is opened');
    seen.add(reward.cardId);
  }
  assert.equal(seen.size, TEAMBOOK_CARDS.length, 'the whole set is reachable by code');

  /* Nothing left to give: the reveal page shows COLLECTION COMPLETE
     rather than the code silently doing nothing. */
  const empty = store.drawBrandNewCard();
  assert.equal(empty.cardId, null);
  assert.equal(empty.complete, true);
});
