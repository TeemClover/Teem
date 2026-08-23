/* TeamBook 1.4 — per-Book character editor canon.

   Starter identities may choose a frame colour. Collection cards already own
   their colour, so Color mirrors card.color and becomes read-only.

   Performance contract:
   - this module watches only the character controls, never document.body
   - the recent-card shelf does not exist until the user expands this <details>
   - card artwork in the shelf/dialog is lazy; a closed editor requests no card
     images just because the page rendered
*/

import { cardById, cardDescriptorTh } from './cards.js';
import { cardMarkup } from './card-ui.js';
import { getParty, getProfile, ownedCards, partyIdentity } from './store.js';

const $ = id => document.getElementById(id);
const VALID_COLORS = new Set(['red', 'green', 'blue', 'silver']);
let syncing = false;
let dialog = null;
let pendingCardId = null;
let queued = false;

function pageCode() {
  const value = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(value) ? value : '';
}

function currentMember() {
  const code = pageCode();
  const party = getParty(code);
  const identity = partyIdentity(code);
  return party?.members?.find(member => member.userId === identity?.userId) || null;
}

function currentMemberCardId() {
  const card = cardById(currentMember()?.avatar || '');
  return card?.cardId || '';
}

function selectedCard() {
  const select = $('myAvatarSelect');
  return select ? cardById(select.value) : null;
}

function avatarCards() {
  const seen = new Set();
  return ownedCards(getProfile())
    .map((entry, index) => ({
      entry,
      index,
      at: Number.isFinite(new Date(entry?.acquiredAt || 0).getTime())
        ? new Date(entry.acquiredAt).getTime() : 0,
      card: cardById(entry?.cardId),
    }))
    .filter(item => {
      if (!item.card?.eligibility?.avatar || seen.has(item.card.cardId)) return false;
      seen.add(item.card.cardId);
      return true;
    })
    .sort((a, b) => (b.at - a.at) || (b.index - a.index))
    .map(item => item.card);
}

function ensureCardOption(cardId) {
  const avatar = $('myAvatarSelect');
  if (!avatar || !cardId) return;
  const card = cardById(cardId);
  if (!card) return;

  [...avatar.querySelectorAll('option[data-book-card]')].forEach(option => {
    if (option.value !== cardId) option.remove();
  });
  let option = [...avatar.options].find(item => item.value === cardId);
  if (!option) {
    option = document.createElement('option');
    option.value = cardId;
    option.dataset.bookCard = '1';
    option.textContent = `การ์ด · ${cardDescriptorTh(card)}`;
    avatar.appendChild(option);
  }
  avatar.value = cardId;
}

function syncCharacterControls() {
  if (syncing || !/^\/p\/?$/.test(location.pathname)) return;
  const avatar = $('myAvatarSelect');
  const color = $('myColorSelect');
  const save = $('saveMyCharacter');
  const tools = $('myCharacterTools');
  if (!avatar || !color || !save || !tools) return;

  syncing = true;
  if (save.textContent !== '💾 SAVE') save.textContent = '💾 SAVE';

  /* /p's canonical render rebuilds Starter options. Restore only the selected
     per-Book Collection card as one synthetic option; do not rebuild any card
     art here. */
  const wanted = pendingCardId === null ? currentMemberCardId() : pendingCardId;
  if (wanted) ensureCardOption(wanted);

  const card = selectedCard();
  const identityLocked = tools.classList.contains('identity-locked') || avatar.disabled;
  if (card) {
    const cardColor = VALID_COLORS.has(card.color) ? card.color : 'green';
    if (color.value !== cardColor) color.value = cardColor;
    color.disabled = true;
    color.dataset.cardColorLocked = '1';
    color.title = 'การ์ดใบนี้กำหนดสีมาแล้ว';
  } else {
    delete color.dataset.cardColorLocked;
    color.disabled = identityLocked;
    color.removeAttribute('title');
  }

  /* Critical V1.4 rule: closed editor = zero recent-card DOM/images. */
  if (tools.open) syncRecentCards();
  else $('tbCharacterRecent')?.remove();

  syncing = false;
}

function selectCard(cardId) {
  const avatar = $('myAvatarSelect');
  if (!avatar || avatar.disabled) return;
  pendingCardId = cardId;
  ensureCardOption(cardId);
  syncCharacterControls();
}

function useStarterSelection() {
  const avatar = $('myAvatarSelect');
  if (!avatar) return;
  if (!cardById(avatar.value)) pendingCardId = '';
  syncCharacterControls();
}

function installStyle() {
  if ($('tb-party-character-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-party-character-v14-style';
  style.textContent = `
    #saveMyCharacter{font-family:var(--sans);letter-spacing:.04em}
    #myColorSelect[data-card-color-locked="1"]{opacity:.72;cursor:not-allowed;background:rgba(245,242,234,.9)}
    .tb-char-recent{margin:14px 0 2px}.tb-char-recent-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px}
    .tb-char-recent-head b{font-size:13px}.tb-char-recent-head small{color:var(--xty-muted);font-size:10px}
    .tb-char-recent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .tb-char-card{min-width:0;padding:3px;border:2px solid transparent;border-radius:13px;background:transparent}
    .tb-char-card .animal-card{width:100%!important;max-width:none!important;height:auto!important;aspect-ratio:var(--xty-card-aspect)!important;margin:0!important;border-radius:10px!important;overflow:hidden!important}
    .tb-char-card.picked{border-color:var(--xty-green);background:rgba(85,181,106,.08)}
    .tb-char-open{width:100%;margin-top:10px}
    .tb-char-dialog{width:min(94vw,700px);max-height:86dvh;margin:auto;padding:0;border:1px solid var(--xty-border);border-radius:20px;background:var(--xty-bg);color:var(--xty-ink);box-shadow:0 24px 70px rgba(0,0,0,.24);overflow:hidden}
    .tb-char-dialog::backdrop{background:rgba(25,22,18,.48)}
    .tb-char-dialog-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--xty-border);background:var(--xty-bg)}
    .tb-char-dialog-head b{font-size:17px}.tb-char-dialog-close{width:38px;height:38px;border:1px solid var(--xty-border);border-radius:50%;background:var(--xty-surface);font-size:22px}
    .tb-char-dialog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:14px;max-height:calc(86dvh - 70px);overflow:auto}
    .tb-char-empty{grid-column:1/-1;padding:22px;text-align:center;color:var(--xty-muted)}
    #myCharacterTools.identity-locked .tb-char-card,#myCharacterTools.identity-locked .tb-char-open{pointer-events:none;opacity:.5}
  `;
  document.head.appendChild(style);
}

function syncRecentCards() {
  const save = $('saveMyCharacter');
  const tools = $('myCharacterTools');
  if (!save || !tools?.open) return;

  const cards = avatarCards().slice(0, 3);
  let section = $('tbCharacterRecent');
  if (!cards.length) {
    section?.remove();
    return;
  }
  if (!section) {
    section = document.createElement('div');
    section.id = 'tbCharacterRecent';
    section.className = 'tb-char-recent';
    section.innerHTML = '<div class="tb-char-recent-head"><b>การ์ดที่ได้ล่าสุด</b><small>แตะเพื่อใช้ในสมุดนี้</small></div><div class="tb-char-recent-grid"></div>';
    save.insertAdjacentElement('beforebegin', section);
  }
  const grid = section.querySelector('.tb-char-recent-grid');
  const selected = selectedCard()?.cardId || '';
  const signature = cards.map(card => card.cardId).join('|');
  if (grid.dataset.signature !== signature) {
    grid.dataset.signature = signature;
    const fragment = document.createDocumentFragment();
    cards.forEach(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tb-char-card';
      button.dataset.cardId = card.cardId;
      button.setAttribute('aria-label', `ใช้ ${cardDescriptorTh(card)} เป็นตัวละครในสมุดนี้`);
      button.innerHTML = cardMarkup(card);
      button.addEventListener('click', () => selectCard(card.cardId));
      fragment.appendChild(button);
    });
    grid.replaceChildren(fragment);
  }
  grid.querySelectorAll('.tb-char-card').forEach(button => {
    const on = button.dataset.cardId === selected;
    button.classList.toggle('picked', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function closeDialog() {
  if (!dialog) return;
  try { if (dialog.open) dialog.close(); } catch {}
  dialog.remove();
  dialog = null;
}

function openDialog() {
  if ($('myAvatarSelect')?.disabled) return;
  closeDialog();
  dialog = document.createElement('dialog');
  dialog.className = 'tb-char-dialog';
  dialog.innerHTML = '<div class="tb-char-dialog-head"><b>เลือกการ์ดในคอลเลกชัน</b><button class="tb-char-dialog-close" type="button" aria-label="ปิด">×</button></div><div class="tb-char-dialog-grid"></div>';
  const grid = dialog.querySelector('.tb-char-dialog-grid');
  const cards = avatarCards();
  const selected = selectedCard()?.cardId || '';
  if (!cards.length) {
    grid.innerHTML = '<div class="tb-char-empty">ยังไม่มีการ์ดที่ใช้เป็นตัวละครได้</div>';
  } else {
    cards.forEach(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tb-char-card${card.cardId === selected ? ' picked' : ''}`;
      button.innerHTML = cardMarkup(card);
      button.setAttribute('aria-label', `ใช้ ${cardDescriptorTh(card)} เป็นตัวละครในสมุดนี้`);
      button.addEventListener('click', () => {
        selectCard(card.cardId);
        closeDialog();
      });
      grid.appendChild(button);
    });
  }
  dialog.querySelector('.tb-char-dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  document.body.appendChild(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function ensureOpenButton() {
  const save = $('saveMyCharacter');
  if (!save || $('tbChooseCharacterCard')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'tbChooseCharacterCard';
  button.className = 'btn ghost sm tb-char-open';
  button.textContent = 'เลือกการ์ดในคอลเลกชัน';
  save.insertAdjacentElement('beforebegin', button);
  button.addEventListener('click', openDialog);
}

function queueSync() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    syncCharacterControls();
  });
}

function install() {
  if (!/^\/p\/?$/.test(location.pathname) || globalThis.__tbPartyCharacterSaveV14) return;
  globalThis.__tbPartyCharacterSaveV14 = true;
  installStyle();

  const avatar = $('myAvatarSelect');
  const color = $('myColorSelect');
  const save = $('saveMyCharacter');
  const tools = $('myCharacterTools');
  if (!avatar || !color || !save || !tools) return;

  ensureOpenButton();
  avatar.addEventListener('change', useStarterSelection);
  tools.addEventListener('toggle', syncCharacterControls);
  save.addEventListener('click', () => {
    syncCharacterControls();
    setTimeout(() => { pendingCardId = null; queueSync(); }, 500);
  }, true);

  /* The canonical /p render may rebuild the select options. This targeted
     observer restores only the currently equipped card; it cannot react to
     chat, seats, images, or unrelated page mutations. */
  new MutationObserver(queueSync).observe(avatar, { childList: true });
  new MutationObserver(queueSync).observe(tools, { attributes: true, attributeFilter: ['class'] });

  syncCharacterControls();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
