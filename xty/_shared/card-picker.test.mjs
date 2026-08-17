/* The picker decides what a player is allowed to become, so the shelf,
   lock and colour-filter rules are pinned here rather than eyeballed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
  getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
};

function el(tag = 'div') {
  const node = {
    tagName: tag.toUpperCase(), className: '', textContent: '',
    children: [], attrs: {}, dataset: {}, disabled: false, open: false, type: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      contains(c) { return this._s.has(c); },
      toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
    },
    append(...c) { this.children.push(...c); },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(n, f) { (this.listeners ||= {})[n] = f; },
    /* memoised so a test can read what the picker wrote into a slot it
       looked up by selector */
    querySelector(sel) { this._q ||= {}; return (this._q[sel] ||= el('span')); },
  };
  /* A real element drops its children when innerHTML is cleared; without
     this the stub kept stale shelves from the previous render. */
  let html = '';
  Object.defineProperty(node, 'innerHTML', {
    get: () => html,
    set(value) { html = String(value); if (html === '') node.children.length = 0; },
  });
  return node;
}
globalThis.document = {
  getElementById: () => null,
  createElement: el,
  head: el('head'),
};

const { mountCardPicker, avatarForChoice } = await import('/home/user/Teem/xty/_shared/card-picker.js');
const { XTY_CARDS } = await import('/home/user/Teem/xty/_shared/cards.js');
const { XTY_AVATARS } = await import('/home/user/Teem/xty/_shared/avatars.js');

function setProfile(cardIds = []) {
  store.mc_xty_profile = JSON.stringify({
    id: 'tester', alias: 'คีน', avatarId: 'orange_cat',
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
    ownedCards: cardIds.map(cardId => ({ cardId, acquiredAt: '2026-08-02T00:00:00.000Z' })),
  });
}

/* walk the rendered tree back into something assertable */
function shelvesOf(host) {
  return host.children[1].children.map(shelf => {
    const summary = shelf.children[0];
    const count = /<span class="xcp-count">(\d+)<\/span>/.exec(summary.innerHTML) || [];
    const grid = shelf.children.find(c => c.className === 'xcp-grid');
    return {
      locked: shelf.classList.contains('is-locked'),
      open: shelf.open,
      owned: Number(count[1] || 0),
      /* Deliberately no total: the summary must not carry one at all. */
      summary: summary.innerHTML,
      options: grid ? grid.children : [],
    };
  });
}

test('all five shelves are always present, empty ones locked at 0', () => {
  setProfile([]);
  const host = el(); mountCardPicker(host);
  const shelves = shelvesOf(host);
  assert.equal(shelves.length, 5, 'starter + 4 rarities');

  const [starter, ...tiers] = shelves;
  assert.equal(starter.locked, false, 'the free animals are always available');
  assert.equal(starter.owned, XTY_AVATARS.length);
  for (const shelf of tiers) {
    assert.equal(shelf.locked, true, 'no cards yet');
    assert.equal(shelf.owned, 0, 'an empty tier says 0');
    assert.equal(shelf.open, false, 'locked shelves stay shut');
    assert.equal(shelf.options.length, 0, 'and shows nothing at all');
  }
});

/* The set size is something to discover by opening cards. Nothing in the
   picker may state it — not as a total, not as a grid of silhouettes. */
test('the picker never reveals how many cards exist', () => {
  setProfile([]);
  const host = el(); mountCardPicker(host);
  for (const shelf of shelvesOf(host)) {
    assert.doesNotMatch(shelf.summary, /\d+\s*\/\s*\d+/, 'no X/Y anywhere in a shelf header');
  }

  const oneCard = XTY_CARDS.find(c => c.rarity === 'epic');
  setProfile([oneCard.cardId]);
  const host2 = el(); mountCardPicker(host2);
  const epic = shelvesOf(host2)[3];
  assert.equal(epic.owned, 1);
  assert.equal(epic.options.length, 1, 'only the card actually held is drawn');
});

test('owning one card unlocks exactly its own shelf', () => {
  const rare = XTY_CARDS.find(c => c.rarity === 'rare');
  setProfile([rare.cardId]);
  const host = el(); mountCardPicker(host);
  const [, common, rareShelf] = shelvesOf(host);
  assert.equal(rareShelf.locked, false);
  assert.equal(rareShelf.owned, 1);
  assert.equal(rareShelf.options.length, 1);
  assert.equal(common.locked, true, 'a rare card does not unlock common');
  assert.equal(common.options.length, 0);
});

test('the colour filter never empties Starter — those animals have no colour', () => {
  setProfile([]);
  const host = el();
  mountCardPicker(host);
  const chips = host.children[0].children;
  const red = chips.find(chip => chip.dataset.color === 'red');
  assert.ok(red, 'a chip per colour');
  red.listeners.click();

  const [starter] = shelvesOf(host);
  assert.equal(starter.owned, XTY_AVATARS.length, 'starter survives a colour filter');
  assert.equal(starter.locked, false);
});

test('the colour filter narrows card shelves to that colour', () => {
  const reds = XTY_CARDS.filter(c => c.rarity === 'common' && c.color === 'red');
  const blue = XTY_CARDS.find(c => c.rarity === 'common' && c.color === 'blue');
  setProfile([reds[0].cardId, blue.cardId]);

  const host = el(); mountCardPicker(host);
  assert.equal(shelvesOf(host)[1].owned, 2, 'both cards before filtering');

  host.children[0].children.find(chip => chip.dataset.color === 'red').listeners.click();
  const common = shelvesOf(host)[1];
  assert.equal(common.owned, 1, 'only the red one counts');
  assert.equal(common.options.length, 1, 'and only the red one is drawn');
});

test('a card you have not found is not shown at all', () => {
  const mine = XTY_CARDS.find(c => c.rarity === 'common');
  setProfile([mine.cardId]);
  const host = el(); mountCardPicker(host);
  const common = shelvesOf(host)[1];
  assert.equal(common.options.length, 1, 'exactly the one card held — no silhouettes beside it');
  assert.equal(common.options[0].disabled, false, 'and everything drawn is selectable');

  /* The card label is the animal alone: colour lives on the border and
     rarity is the shelf, so spelling them out only made it too long. */
  const name = common.options[0]._q['.xcp-name'];
  assert.equal(name.textContent, mine.speciesNameTh);
  assert.doesNotMatch(name.textContent, /·/, 'no colour or rarity in the visible label');
});

test('choosing a card carries the avatar to the same animal', () => {
  const card = XTY_CARDS.find(c => c.rarity === 'rare');
  const resolved = avatarForChoice({ kind: 'card', cardId: card.cardId });
  assert.equal(resolved.avatarId, card.species, 'the card and the animal are one character');
  assert.equal(resolved.cardId, card.cardId);

  const starter = avatarForChoice({ kind: 'starter', avatarId: 'crow' });
  assert.equal(starter.avatarId, 'crow');
  assert.equal(starter.cardId, null);
});

test('selecting reports a choice the caller can act on', () => {
  const card = XTY_CARDS.find(c => c.rarity === 'common');
  setProfile([card.cardId]);
  let got = null;
  const host = el();
  mountCardPicker(host, { onSelect: choice => { got = choice; } });
  const option = shelvesOf(host)[1].options.find(o => !o.disabled);
  option.listeners.click();
  assert.equal(got.kind, 'card');
  assert.equal(got.cardId, card.cardId);
  assert.equal(got.species, card.species);
});

test('the rarest card of an animal wins the portrait', async () => {
  const { bestCardForSpecies, petSpeciesFor } = await import('/home/user/Teem/xty/_shared/card-picker.js');
  /* Only some animals have a rare printed, so pick one that does. */
  const rare = XTY_CARDS.find(c => c.rarity === 'rare');
  const species = rare.species;
  const common = XTY_CARDS.find(c => c.rarity === 'common' && c.species === species);

  setProfile([common.cardId]);
  assert.equal(bestCardForSpecies(species).cardId, common.cardId);

  setProfile([common.cardId, rare.cardId]);
  assert.equal(bestCardForSpecies(species).cardId, rare.cardId, 'rare outranks common');

  assert.equal(bestCardForSpecies('turtle'), null, 'no card, no override');
});

test('a card adds its animal to the Pet seat without removing the free ones', async () => {
  const { petSpeciesFor } = await import('/home/user/Teem/xty/_shared/card-picker.js');
  const card = XTY_CARDS.find(c => c.species === 'pig');
  setProfile([card.cardId]);

  const granted = ['orange_cat', 'crow'];
  const species = petSpeciesFor(granted);
  assert.ok(species.has('orange_cat'), 'granted animals stay');
  assert.ok(species.has('crow'));
  assert.ok(species.has('pig'), 'the card adds its own animal');
});

test('a card resolves to the plain animal for chat and the skin for seats', async () => {
  const { resolveMemberAvatar } = await import('/home/user/Teem/xty/_shared/card-picker.js');
  const { avatarById } = await import('/home/user/Teem/xty/_shared/avatars.js');

  const rare = XTY_CARDS.find(c => c.rarity === 'rare');
  const wearing = resolveMemberAvatar(rare.cardId);
  assert.equal(wearing.species, rare.species);
  assert.equal(wearing.speciesArt, avatarById(rare.species).art, 'chat keeps the plain animal');
  assert.equal(wearing.cardArt, rare.imageFull || rare.art, 'seats get the rare drawing');
  assert.notEqual(wearing.speciesArt, wearing.cardArt, 'a rare card really does look different');

  /* A plain animal id must still work — most members have no card. */
  const plain = resolveMemberAvatar('crow');
  assert.equal(plain.species, 'crow');
  assert.equal(plain.speciesArt, plain.cardArt, 'nothing to show off, nothing changes');
  assert.equal(plain.cardId, null);

  assert.equal(resolveMemberAvatar('not_a_thing'), null, 'unknown values fall through to the caller');
});

test('every printed card has its own art, and chat still shows the animal', async () => {
  const { resolveMemberAvatar } = await import('/home/user/Teem/xty/_shared/card-picker.js');
  const { avatarById } = await import('/home/user/Teem/xty/_shared/avatars.js');
  /* Commons used to reuse the avatar drawing; they are painted now, so the
     seat differs from the log at every tier — which is the intent. */
  for (const rarity of ['common', 'rare', 'epic', 'legendary']) {
    const card = XTY_CARDS.find(c => c.rarity === rarity);
    const resolved = resolveMemberAvatar(card.cardId);
    assert.equal(resolved.speciesArt, avatarById(card.species).art, `${rarity}: chat keeps the animal`);
    assert.notEqual(resolved.cardArt, resolved.speciesArt, `${rarity}: the seat shows the card`);
    assert.equal(resolved.color, card.color, `${rarity}: the colour rides along for the seat border`);
  }
});

test('the stored avatar is the card when equipped, the animal otherwise', async () => {
  const { memberAvatarValue } = await import('/home/user/Teem/xty/_shared/card-picker.js');
  const card = XTY_CARDS.find(c => c.rarity === 'rare');

  setProfile([card.cardId]);
  const owned = JSON.parse(store.mc_xty_profile);
  owned.equippedCardId = card.cardId;
  store.mc_xty_profile = JSON.stringify(owned);
  assert.equal(memberAvatarValue(), card.cardId);

  setProfile([]);
  assert.equal(memberAvatarValue(), 'orange_cat', 'falls back to the animal');

  /* It has to fit the member column, which the create path caps at 40. */
  assert.ok(card.cardId.length <= 40, 'card id must survive storage');
});
