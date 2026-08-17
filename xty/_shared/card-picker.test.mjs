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
    querySelector() { return el('span'); },
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
    const count = /(\d+)\/(\d+)/.exec(summary.innerHTML) || [];
    const grid = shelf.children.find(c => c.className === 'xcp-grid');
    return {
      locked: shelf.classList.contains('is-locked'),
      open: shelf.open,
      owned: Number(count[1] || 0),
      total: Number(count[2] || 0),
      options: grid ? grid.children : [],
    };
  });
}

test('all five shelves are always present, empty ones locked with a count', () => {
  setProfile([]);
  const host = el(); mountCardPicker(host);
  const shelves = shelvesOf(host);
  assert.equal(shelves.length, 5, 'starter + 4 rarities');

  const [starter, common, rare, epic, legendary] = shelves;
  assert.equal(starter.locked, false, 'the free animals are always available');
  assert.equal(starter.owned, XTY_AVATARS.length);
  for (const shelf of [common, rare]) {
    assert.equal(shelf.locked, true, 'no cards yet');
    assert.equal(shelf.owned, 0);
    assert.ok(shelf.total > 0, 'a locked shelf still states how many exist');
    assert.equal(shelf.open, false, 'locked shelves stay shut');
  }
  /* Nothing has been minted at these tiers, so they announce that rather
     than showing a 0/0 the player could never move. */
  for (const shelf of [epic, legendary]) {
    assert.equal(shelf.locked, true);
    assert.equal(shelf.total, 0, 'no cards exist at this tier yet');
  }
});

test('owning one card unlocks exactly its own shelf', () => {
  const rare = XTY_CARDS.find(c => c.rarity === 'rare');
  setProfile([rare.cardId]);
  const host = el(); mountCardPicker(host);
  const [, common, rareShelf] = shelvesOf(host);
  assert.equal(rareShelf.locked, false);
  assert.equal(rareShelf.owned, 1);
  assert.equal(common.locked, true, 'a rare card does not unlock common');
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
  assert.equal(common.total, reds.length, 'total narrows to red as well');
});

test('unowned cards render but cannot be chosen', () => {
  setProfile([]);
  const host = el(); mountCardPicker(host);
  const common = shelvesOf(host)[1];
  assert.ok(common.options.length > 0, 'locked cards are still shown, to be collected toward');
  assert.ok(common.options.every(option => option.disabled), 'and none of them are selectable');
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
