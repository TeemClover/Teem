/* TeamBook Collection picker for book setup and lead-only book settings.

   The per-book character editor has its own canonical picker. This module
   owns only the two Collection entry points that sit beside legacy selects:
   book cover and companion. Keeping the selects means Card Back and built-in
   PET choices remain available without duplicating the visual Collection UI. */

import { mountCardPicker } from './card-picker.js';
import { cardById, cardDescriptorTh } from './cards.js';
import { availableOwnedCards, getParty, getProfile, ownedCards } from './store.js';

const $ = id => document.getElementById(id);
let dialog = null;

function installStyles() {
  if ($('xty-collection-skin-picker-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-collection-skin-picker-style';
  style.textContent = `
    .xskin-trigger{width:100%;margin-top:10px}
    .xskin-dialog{width:min(94vw,720px);max-width:720px;max-height:88dvh;margin:auto;padding:0;border:1px solid var(--xty-border);border-radius:20px;background:var(--xty-paper,#fffaf0);color:var(--xty-ink);box-shadow:0 24px 70px rgba(0,0,0,.24);overflow:hidden}
    .xskin-dialog::backdrop{background:rgba(25,22,18,.48);backdrop-filter:blur(2px)}
    .xskin-head{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 16px 13px;border-bottom:1px solid var(--xty-border);background:var(--xty-paper,#fffaf0)}
    .xskin-head b{display:block;font-size:18px;line-height:1.25}.xskin-head small{display:block;margin-top:4px;color:var(--xty-muted);line-height:1.45}
    .xskin-close{flex:none;width:38px;height:38px;border:1px solid var(--xty-border);border-radius:999px;background:var(--xty-surface,#fff);color:var(--xty-ink);font-size:22px;line-height:1}
    .xskin-body{padding:14px 14px 18px;overflow:auto;max-height:calc(88dvh - 84px)}
    .xskin-status{min-height:20px;margin:0 0 10px;color:var(--xty-muted);font-size:12.5px;line-height:1.45}.xskin-status.error{color:#9b342e;font-weight:700}
    .xskin-trigger:disabled{opacity:.55;cursor:not-allowed}
  `;
  document.head.appendChild(style);
}

function closeDialog() {
  if (!dialog) return;
  try { if (dialog.open && typeof dialog.close === 'function') dialog.close(); } catch {}
  dialog.remove();
  dialog = null;
}

function openCollectionPicker({
  title = 'เลือกการ์ดในคอลเลกชัน',
  hint = 'การ์ดเป็นสกิน · CORE ยังคือ Species ของการ์ดใบนั้น',
  selectedCardId = '',
  allowedCardIds = null,
  onPick,
} = {}) {
  installStyles();
  closeDialog();
  const allowed = allowedCardIds ? new Set(allowedCardIds) : null;
  dialog = document.createElement('dialog');
  dialog.className = 'xskin-dialog';
  dialog.innerHTML = `
    <div class="xskin-head"><div><b></b><small></small></div><button class="xskin-close" type="button" aria-label="ปิด">×</button></div>
    <div class="xskin-body"><p class="xskin-status">เลือกจากการ์ดที่เปิดได้แล้วในคอลเลกชัน</p><div class="xskin-picker"></div></div>`;
  dialog.querySelector('.xskin-head b').textContent = title;
  dialog.querySelector('.xskin-head small').textContent = hint;
  document.body.appendChild(dialog);

  const status = dialog.querySelector('.xskin-status');
  const host = dialog.querySelector('.xskin-picker');
  mountCardPicker(host, {
    mode: 'pet',
    selected: selectedCardId ? { cardId: selectedCardId } : undefined,
    onSelect(choice) {
      if (choice.kind !== 'card') return;
      if (allowed && !allowed.has(choice.cardId)) {
        status.textContent = 'การ์ดใบนี้กำลังใช้อยู่ในสมุดเล่มอื่นที่ยังเขียนอยู่ หรือชนกับช่องอื่นในสมุดนี้';
        status.classList.add('error');
        return;
      }
      const card = cardById(choice.cardId);
      if (!card) return;
      const result = onPick ? onPick(choice, card, status) : true;
      if (result === false) {
        if (!status.classList.contains('error')) {
          status.textContent = 'ยังใช้การ์ดใบนี้ตรงนี้ไม่ได้';
          status.classList.add('error');
        }
        return;
      }
      closeDialog();
    },
  });
  const starterShelf = host.querySelector('.xcp-shelf');
  if (starterShelf) starterShelf.hidden = true;
  dialog.querySelector('.xskin-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function pickedCardIdFromNpcGrid() {
  const picked = $('npcCardPick')?.querySelector('button.picked');
  if (!picked) return '';
  const aria = picked.getAttribute('aria-label') || '';
  const cards = availableOwnedCards({ role: 'npc' });
  return cards.find(card => aria === `ใช้ ${cardDescriptorTh(card)} เป็นเพื่อนร่วมทาง`)?.cardId || '';
}

function installNewPartyPicker() {
  const petPick = $('petPick');
  const oldGrid = $('npcCardPick');
  const hint = $('petHint');
  if (!petPick || !oldGrid || !hint || $('choosePetCardFromCollection')) return;
  oldGrid.hidden = true;
  const oldLabel = oldGrid.previousElementSibling;
  if (oldLabel?.classList?.contains('label')) oldLabel.hidden = true;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'choosePetCardFromCollection';
  button.className = 'btn ghost xskin-trigger';
  button.textContent = 'เลือกการ์ดในคอลเลกชัน';
  oldGrid.insertAdjacentElement('afterend', button);

  const normalizeHint = () => {
    if (hint.textContent.includes('NPC')) hint.textContent = hint.textContent.replaceAll('NPC', 'Pet');
  };
  normalizeHint();
  new MutationObserver(normalizeHint).observe(hint, { childList: true, subtree: true, characterData: true });

  button.addEventListener('click', () => {
    const available = availableOwnedCards({ role: 'npc' });
    const allowed = new Set(available.map(card => card.cardId));
    const leadLabel = $('leadPick')?.querySelector('.picked')?.getAttribute('aria-label') || '';
    const currentCardId = pickedCardIdFromNpcGrid();
    openCollectionPicker({
      title: 'เลือกการ์ดเป็นเพื่อนร่วมทาง',
      selectedCardId: currentCardId,
      allowedCardIds: allowed,
      onPick(choice, card, status) {
        if (choice.cardId === currentCardId) return true;
        if (leadLabel === `ใช้ ${cardDescriptorTh(card)} เป็นปกสมุด`) {
          status.textContent = 'การ์ดใบเดียวกันใช้เป็นปกสมุดและเพื่อนร่วมทางพร้อมกันไม่ได้';
          status.classList.add('error');
          return false;
        }
        const target = [...oldGrid.querySelectorAll('button')]
          .find(node => node.getAttribute('aria-label') === `ใช้ ${cardDescriptorTh(card)} เป็นเพื่อนร่วมทาง`);
        if (!target) {
          status.textContent = 'การ์ดใบนี้ยังไม่ว่างสำหรับเพื่อนร่วมทางในสมุดนี้';
          status.classList.add('error');
          return false;
        }
        target.click();
        normalizeHint();
        return true;
      },
    });
  });
}

function partyCode() {
  return String(new URLSearchParams(location.search).get('c') || '').toUpperCase();
}

function ownedCardsForBookRole(role) {
  const seen = new Set();
  return ownedCards(getProfile())
    .map(entry => cardById(entry.cardId))
    .filter(card => {
      if (!card?.eligibility?.[role] || seen.has(card.cardId)) return false;
      seen.add(card.cardId);
      return true;
    });
}

function addCollectionButton({ id, select, title, hint, role, conflictKey, valuesFor }) {
  if (!select || $(id)) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = 'btn ghost sm xskin-trigger';
  button.textContent = 'เลือกการ์ดในคอลเลกชัน';
  select.closest('.tool-row')?.insertAdjacentElement('afterend', button);
  button.addEventListener('click', () => {
    const code = partyCode();
    const party = getParty(code);
    /* V1.2 cards are reusable across books. Only the other role in this same
       book can conflict, matching party-profile-covers and the server. */
    const available = ownedCardsForBookRole(role)
      .filter(card => card.cardId !== party?.[conflictKey]);
    openCollectionPicker({
      title,
      hint,
      selectedCardId: role === 'lead' ? (party?.leadCardId || '') : (party?.npcCardId || ''),
      allowedCardIds: new Set(available.map(card => card.cardId)),
      onPick(choice, card, status) {
        const values = valuesFor(choice.cardId);
        const option = [...select.options].find(item => values.includes(item.value));
        if (!option) {
          status.textContent = role === 'lead'
            ? 'การ์ดใบนี้ยังไม่ว่างสำหรับใช้เป็นปกสมุดเล่มนี้'
            : 'การ์ดใบนี้ยังไม่ว่างสำหรับเป็นเพื่อนร่วมทางในสมุดนี้';
          status.classList.add('error');
          return false;
        }
        select.value = option.value;
        option.textContent = `การ์ด · ${cardDescriptorTh(card)}`;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      },
    });
  });
  return button;
}

function installPartySettingsPickers() {
  const leadSelect = $('leadSelect');
  const npcSelect = $('npcSelect');
  if (!leadSelect || !npcSelect || !$('partyTools')) return;

  const coverButton = addCollectionButton({
    id: 'choosePartyCoverCard',
    select: leadSelect,
    title: 'เลือกการ์ดเป็นปกสมุด',
    hint: 'เลือกจากการ์ดที่ใช้เป็นปกได้ แล้วกด “เปลี่ยน” เพื่อบันทึก',
    role: 'lead',
    conflictKey: 'npcCardId',
    valuesFor: cardId => [`v12:card:${cardId}`, cardId],
  });
  if (coverButton) {
    const syncCoverLock = () => {
      coverButton.disabled = leadSelect.disabled;
      coverButton.title = leadSelect.disabled ? 'ปกสมุดเล่มแรกใช้สัตว์ของคุณ' : '';
    };
    new MutationObserver(syncCoverLock).observe(leadSelect, { attributes: true, attributeFilter: ['disabled'] });
    syncCoverLock();
  }

  addCollectionButton({
    id: 'choosePartyPetCard',
    select: npcSelect,
    title: 'เลือกการ์ดเป็นเพื่อนร่วมทาง',
    hint: 'เลือกจากการ์ดที่ใช้เป็นเพื่อนร่วมทางได้ แล้วกด “เปลี่ยน” เพื่อบันทึก',
    role: 'npc',
    conflictKey: 'leadCardId',
    valuesFor: cardId => [`v12:card:${cardId}`, `card:${cardId}`],
  });
}

function boot() {
  installStyles();
  if (/^\/new(?:\/|$)/.test(location.pathname)) installNewPartyPicker();
  if (/^\/p(?:\/|$)/.test(location.pathname)) installPartySettingsPickers();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(boot), { once: true });
else requestAnimationFrame(boot);
