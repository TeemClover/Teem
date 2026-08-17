/* ═══════════════════════════════════════════════════════════════
   XTY — one card picker, used wherever a card becomes something

   Avatar and Pet both answer the same question: which of my cards do I
   want to be right now. A dropdown answered it badly — it hides how much
   you own and gives a legendary the same single line as a starter.

   So: shelves by rarity, always all five, the empty ones greyed and shut.

   A card you have not found does not appear here at all — not dimmed, not
   a silhouette, not a slot. The set is meant to be a surprise, and a grid
   of locked cards is a catalogue of everything you have not got. The
   shelf shows how many you hold and nothing about how many exist.

   Starter is the twelve free animals. They are not cards and carry no
   colour, which is why the colour filter leaves that shelf alone
   instead of emptying it.
   ═══════════════════════════════════════════════════════════════ */

import { AVATAR_BY_ID, XTY_AVATARS, avatarById, speciesById } from './avatars.js';
import { XTY_CARDS, XTY_CARD_COLORS, cardById, cardDescriptorTh, cardNameTh } from './cards.js';
import { cardMarkup } from './card-ui.js';
import { getProfile } from './store.js';

const RARITIES = Object.freeze([
  { id: 'starter', label: 'STARTER', labelTh: 'สัตว์เริ่มต้น' },
  { id: 'common', label: 'COMMON', labelTh: 'คอมมอน' },
  { id: 'rare', label: 'RARE', labelTh: 'แรร์' },
  { id: 'epic', label: 'EPIC', labelTh: 'อีพิก' },
  { id: 'legendary', label: 'LEGENDARY', labelTh: 'เลเจนดารี' },
]);

const COLOR_LABEL = Object.freeze({
  red: 'แดง', green: 'เขียว', blue: 'น้ำเงิน', silver: 'เงิน',
});

export function ownedCardIds(profile = getProfile()) {
  const list = Array.isArray(profile?.ownedCards) ? profile.ownedCards : [];
  return new Set(list.map(item => item?.cardId).filter(Boolean));
}

/* Only what the player actually holds. The catalogue is never consulted for
   display, so nothing here can leak a card they have not found. */
function ownedCardsOf(rarity, owned) {
  return XTY_CARDS.filter(card => (card.rarity || 'common') === rarity && owned.has(card.cardId));
}

function starterItems() {
  return XTY_AVATARS.map(animal => ({
    key: `starter:${animal.id}`, kind: 'starter', rarity: 'starter',
    avatarId: animal.id, species: animal.id, color: '',
    title: animal.nameTh, owned: true,
    art: `<img src="${animal.art}" alt="" loading="lazy" decoding="async">`,
  }));
}

function cardItems(rarity, owned) {
  return ownedCardsOf(rarity, owned).map(card => ({
    key: `card:${card.cardId}`, kind: 'card', rarity,
    cardId: card.cardId, species: card.species, color: card.color,
    /* Just the animal. The colour is already on the border and the rarity
       is already the shelf, so spelling both out only made the label too
       long to read. The full description stays on aria-label. */
    title: cardNameTh(card), label: cardDescriptorTh(card), owned: true,
    art: cardMarkup(card),
  }));
}

function installStyles() {
  if (document.getElementById('xty-card-picker-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-card-picker-style';
  style.textContent = `
    .xcp{display:block}
    .xcp-filters{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 10px}
    .xcp-chip{padding:7px 12px;border:1px solid var(--xty-border);border-radius:999px;background:var(--xty-surface);
      color:var(--xty-ink);font:800 12px/1 var(--sans);letter-spacing:.04em}
    .xcp-chip[aria-pressed="true"]{border-color:var(--xty-ink);background:var(--xty-paper)}
    .xcp-chip[data-color]::before{content:"";display:inline-block;width:9px;height:9px;margin-right:6px;
      border:1px solid var(--xty-ink);border-radius:50%;vertical-align:-1px;background:var(--dot,#ccc)}
    .xcp-chip[data-color="red"]{--dot:var(--xty-red)}.xcp-chip[data-color="green"]{--dot:var(--xty-green)}
    .xcp-chip[data-color="blue"]{--dot:var(--xty-blue)}.xcp-chip[data-color="silver"]{--dot:var(--xty-silver)}

    .xcp-shelf{margin:0 0 12px;border:1px solid var(--xty-border);border-radius:16px;background:var(--xty-surface);overflow:hidden}
    .xcp-shelf.is-locked{opacity:.62;background:var(--xty-bg)}
    .xcp-shelf>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:12px 14px;
      font:800 12px/1 var(--sans);letter-spacing:.14em;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .xcp-shelf>summary::-webkit-details-marker{display:none}
    .xcp-shelf>summary::after{content:'⌄';margin-left:auto;font-size:17px;transition:transform .18s ease}
    .xcp-shelf:not([open])>summary::after{transform:rotate(-90deg)}
    .xcp-count{margin-left:auto;color:var(--xty-muted);font:800 11.5px/1 var(--sans);letter-spacing:.06em}
    .xcp-shelf>summary::after{margin-left:9px}
    .xcp-lock{font-size:13px;filter:grayscale(1)}

    .xcp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:9px;padding:0 12px 13px}
    .xcp-opt{padding:0;border:2px solid transparent;border-radius:12px;background:transparent;overflow:hidden}
    .xcp-opt[aria-checked="true"]{border-color:var(--xty-primary)}
    .xcp-opt .animal-card,.xcp-opt img{display:block;width:100%}
    .xcp-opt>.xcp-thumb{aspect-ratio:var(--xty-card-aspect);display:grid;place-items:center;border-radius:10px;background:var(--xty-bg);overflow:hidden}
    .xcp-opt>.xcp-thumb img{width:82%;height:auto}
    .xcp-name{display:block;padding:5px 3px 0;color:var(--xty-muted);font-size:11px;line-height:1.3;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .xcp-opt.is-locked{opacity:.42;cursor:not-allowed;filter:grayscale(.7)}
    .xcp-empty{padding:0 14px 14px;margin:0;color:var(--xty-muted);font-size:12.5px;line-height:1.55}
  `;
  document.head.appendChild(style);
}

/**
 * @param {HTMLElement} host
 * @param {{mode?:'avatar'|'pet', selected?:{avatarId?:string,cardId?:string},
 *          onSelect?:(choice:object)=>void}} options
 */
export function mountCardPicker(host, options = {}) {
  if (!host) return null;
  const { mode = 'avatar', onSelect } = options;
  installStyles();

  const owned = ownedCardIds();
  let color = '';
  let selectedKey = options.selected?.cardId ? `card:${options.selected.cardId}`
    : `starter:${options.selected?.avatarId || getProfile()?.avatarId || XTY_AVATARS[0].id}`;

  host.classList.add('xcp');
  host.innerHTML = '';

  const filters = document.createElement('div');
  filters.className = 'xcp-filters';
  const shelves = document.createElement('div');
  host.append(filters, shelves);

  function itemsFor(rarity) {
    const all = rarity === 'starter' ? starterItems() : cardItems(rarity, owned);
    /* Starter has no colour, so filtering by colour must not blank it out —
       those seven animals are always a valid choice. */
    if (!color || rarity === 'starter') return all;
    return all.filter(item => item.color === color);
  }

  function choiceOf(item) {
    return item.kind === 'starter'
      ? { kind: 'starter', avatarId: item.avatarId, species: item.species, cardId: null }
      : { kind: 'card', cardId: item.cardId, species: item.species, color: item.color, rarity: item.rarity };
  }

  function render() {
    shelves.innerHTML = '';
    for (const rarity of RARITIES) {
      const items = itemsFor(rarity.id);
      const shelf = document.createElement('details');
      shelf.className = 'xcp-shelf';
      /* A shelf with nothing in it is locked and shut, and says 0. It never
         says 0 of how many — that number is exactly the thing a player is
         meant to discover by opening cards. */
      const locked = items.length === 0;
      if (locked) shelf.classList.add('is-locked');
      shelf.open = !locked;

      const summary = document.createElement('summary');
      summary.innerHTML = `${locked ? '<span class="xcp-lock">🔒</span>' : ''}<span>${rarity.label}</span>`
        + `<span class="xcp-count">${items.length}</span>`;
      shelf.appendChild(summary);

      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'xcp-empty';
        empty.textContent = color
          ? `ยังไม่มี${rarity.labelTh}สี${COLOR_LABEL[color] || ''}`
          : `ยังไม่มี${rarity.labelTh}`;
        shelf.appendChild(empty);
        shelves.appendChild(shelf);
        continue;
      }

      const grid = document.createElement('div');
      grid.className = 'xcp-grid';
      for (const item of items) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'xcp-opt';
        option.setAttribute('role', 'radio');
        option.setAttribute('aria-checked', item.key === selectedKey ? 'true' : 'false');
        option.innerHTML = item.kind === 'starter'
          ? `<span class="xcp-thumb">${item.art}</span><span class="xcp-name"></span>`
          : `${item.art}<span class="xcp-name"></span>`;
        option.querySelector('.xcp-name').textContent = item.title;
        option.setAttribute('aria-label', item.label || item.title);
        option.addEventListener('click', () => {
          selectedKey = item.key;
          render();
          if (onSelect) onSelect(choiceOf(item));
        });
        grid.appendChild(option);
      }
      shelf.appendChild(grid);
      shelves.appendChild(shelf);
    }
  }

  function renderFilters() {
    filters.innerHTML = '';
    const options = [{ id: '', label: 'ทุกสี' }].concat(
      XTY_CARD_COLORS.map(id => ({ id, label: COLOR_LABEL[id] || id })),
    );
    for (const option of options) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'xcp-chip';
      if (option.id) chip.dataset.color = option.id;
      chip.textContent = option.label;
      chip.setAttribute('aria-pressed', color === option.id ? 'true' : 'false');
      chip.addEventListener('click', () => { color = option.id; renderFilters(); render(); });
      filters.appendChild(chip);
    }
  }

  renderFilters();
  render();

  return {
    get value() {
      const [kind, id] = selectedKey.split(':');
      return kind === 'card'
        ? { kind: 'card', cardId: id, species: cardById(id)?.species || '', mode }
        : { kind: 'starter', avatarId: id, species: id, mode };
    },
    refresh: render,
  };
}

/* A card and the animal it depicts are the same character — the card art is
   simply the better portrait of it. Callers use this so choosing a card
   never leaves the avatar pointing at a different animal. */
export function avatarForChoice(choice) {
  if (!choice) return null;
  if (choice.kind === 'card') {
    const card = cardById(choice.cardId);
    if (!card) return null;
    return { avatarId: card.species, cardId: card.cardId, art: card.imageFull || card.art };
  }
  const animal = avatarById(choice.avatarId);
  return animal ? { avatarId: animal.id, cardId: null, art: animal.art } : null;
}

/* The portrait a profile should show. An equipped card outranks the plain
   animal drawing — it is the same creature, rendered better. */
export function profilePortrait(profile = getProfile()) {
  const card = profile?.equippedCardId ? cardById(profile.equippedCardId) : null;
  if (card) return { art: card.imageFull || card.art, cardId: card.cardId, avatarId: card.species };
  const animal = avatarById(profile?.avatarId);
  return { art: animal?.art || '', cardId: null, avatarId: animal?.id || '' };
}

/* The best card a player owns of one animal, rarest first. Used where an
   animal already has a place in the game and the card only improves how it
   is drawn — the Pet seat being the first of those. */
const RARITY_RANK = Object.freeze({ legendary: 4, epic: 3, rare: 2, common: 1 });

export function bestCardForSpecies(species, profile = getProfile()) {
  const owned = ownedCardIds(profile);
  let best = null;
  for (const card of XTY_CARDS) {
    if (card.species !== species || !owned.has(card.cardId)) continue;
    const rank = RARITY_RANK[card.rarity] || 0;
    if (!best || rank > (RARITY_RANK[best.rarity] || 0)) best = card;
  }
  return best;
}

/* Species a player may put in the Pet seat: the ones granted outright, plus
   any animal they hold a card for. Today every V1 animal is granted, so this
   only widens once a species ships that is not free. */
export function petSpeciesFor(grantedIds = [], profile = getProfile()) {
  const fromCards = new Set();
  const owned = ownedCardIds(profile);
  for (const card of XTY_CARDS) if (owned.has(card.cardId)) fromCards.add(card.species);
  return new Set([...grantedIds, ...fromCards]);
}

/* A member's stored avatar is either an animal id or, once they equip a
   card, that card's id. Both resolve to the same creature — the card is
   just the rarer drawing of it.
   `species` is what the chat log uses, so a party log stays calm and
   uniform; `cardArt` is what the six party seats use, which is the one
   place a rare skin is worth showing off. */
export function resolveMemberAvatar(value) {
  const card = cardById(String(value || ''));
  if (card) {
    /* speciesById, not avatarById: a card-only animal is not on the Starter
       roster, and the roster helper would answer "orange cat" for it. */
    const animal = speciesById(card.species);
    return {
      species: card.species,
      speciesArt: animal?.art || card.art,
      cardArt: card.imageFull || card.art,
      cardId: card.cardId,
      rarity: card.rarity,
      color: card.color,
    };
  }
  /* AVATAR_BY_ID directly, not avatarById — that helper falls back to the
     orange cat, which would quietly turn an emoji avatar (the '🍀' a party
     is created with) into the wrong animal instead of leaving it alone. */
  const animal = AVATAR_BY_ID[String(value || '')];
  return animal
    ? { species: animal.id, speciesArt: animal.art, cardArt: animal.art, cardId: null, rarity: 'starter', color: '' }
    : null;
}

/* The avatar value to store for a member: the equipped card when there is
   one, otherwise the plain animal. */
export function memberAvatarValue(profile = getProfile()) {
  const card = profile?.equippedCardId ? cardById(profile.equippedCardId) : null;
  return card ? card.cardId : (profile?.avatarId || profile?.avatarFallback || 'orange_cat');
}
