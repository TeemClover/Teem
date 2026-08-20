/* TeamBook Collection skin picker
   One tiny entry point, three surfaces:
   - New Party -> Pet skin
   - Party -> My Character skin
   - Party management -> Pet skin

   The existing page state/API stays canonical. This layer only gives those
   existing controls the same visual Collection picker already used by
   Profile/Collection. A card is presentation; its species remains the CORE. */

import { mountCardPicker } from './card-picker.js';
import { cardById, cardDescriptorTh } from './cards.js';
import { availableOwnedCards, getParty, partyIdentity } from './store.js';

const $ = id => document.getElementById(id);
let dialog = null;
let pendingMyCharacterCardId = null;
let syncQueued = false;

function installStyles() {
  if ($('xty-collection-skin-picker-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-collection-skin-picker-style';
  style.textContent = `
    .xskin-trigger{width:100%;margin-top:10px}
    .xskin-dialog{width:min(94vw,720px);max-width:720px;max-height:88dvh;margin:auto;padding:0;
      border:1px solid var(--xty-border);border-radius:20px;background:var(--xty-paper,#fffaf0);
      color:var(--xty-ink);box-shadow:0 24px 70px rgba(0,0,0,.24);overflow:hidden}
    .xskin-dialog::backdrop{background:rgba(25,22,18,.48);backdrop-filter:blur(2px)}
    .xskin-head{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;justify-content:space-between;
      gap:14px;padding:16px 16px 13px;border-bottom:1px solid var(--xty-border);background:var(--xty-paper,#fffaf0)}
    .xskin-head b{display:block;font-size:18px;line-height:1.25}.xskin-head small{display:block;margin-top:4px;color:var(--xty-muted);line-height:1.45}
    .xskin-close{flex:none;width:38px;height:38px;border:1px solid var(--xty-border);border-radius:999px;
      background:var(--xty-surface,#fff);color:var(--xty-ink);font-size:22px;line-height:1}
    .xskin-body{padding:14px 14px 18px;overflow:auto;max-height:calc(88dvh - 84px)}
    .xskin-status{min-height:20px;margin:0 0 10px;color:var(--xty-muted);font-size:12.5px;line-height:1.45}
    .xskin-status.error{color:#9b342e;font-weight:700}
    .xskin-current{margin-top:7px;color:var(--xty-muted);font-size:12px;line-height:1.45}
  `;
  document.head.appendChild(style);
}

function closeDialog() {
  if (!dialog) return;
  try { if (dialog.open && typeof dialog.close === 'function') dialog.close(); }
  catch {}
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
    <div class="xskin-head">
      <div><b></b><small></small></div>
      <button class="xskin-close" type="button" aria-label="ปิด">×</button>
    </div>
    <div class="xskin-body">
      <p class="xskin-status">เลือกจากการ์ดที่เปิดได้แล้วในคอลเลกชัน</p>
      <div class="xskin-picker"></div>
    </div>`;
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

  /* This button explicitly says Collection, so Starter is intentionally not
     part of the popup. Starter choices remain in each page's normal control. */
  const starterShelf = host.querySelector('.xcp-shelf');
  if (starterShelf) starterShelf.hidden = true;

  dialog.querySelector('.xskin-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });
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

  /* Keep the old grid alive but invisible: clicking its real buttons updates
     the page's private npcCardId closure, so this enhancement cannot drift
     from createPartyV2 state. */
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
        /* Picking the already-equipped skin is a no-op, not a toggle-off. */
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

function currentMemberCardId() {
  const code = partyCode();
  const party = getParty(code);
  const identity = partyIdentity(code);
  const member = party?.members?.find(item => item.userId === identity?.userId);
  return cardById(member?.avatar)?.cardId || '';
}

function ensureSyntheticCharacterOption() {
  const select = $('myAvatarSelect');
  const color = $('myColorSelect');
  if (!select) return;

  const wanted = pendingMyCharacterCardId === null ? currentMemberCardId() : pendingMyCharacterCardId;
  [...select.querySelectorAll('option[data-card-skin]')].forEach(option => {
    if (option.value !== wanted) option.remove();
  });

  if (wanted) {
    const card = cardById(wanted);
    if (!card) return;
    let option = [...select.options].find(item => item.value === wanted);
    if (!option) {
      option = document.createElement('option');
      option.value = wanted;
      option.dataset.cardSkin = '1';
      option.textContent = `การ์ด · ${cardDescriptorTh(card)}`;
      select.appendChild(option);
    }
    select.value = wanted;
    if (color) color.disabled = true;
  } else if (color) {
    color.disabled = false;
  }
}

function syncPartyControls() {
  if (!/^\/p(?:\/|$)/.test(location.pathname)) return;
  const myTools = $('myCharacterTools');
  const partyTools = $('partyTools');
  if (!myTools || !partyTools) return;

  if (!$('chooseMyCharacterCard')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'chooseMyCharacterCard';
    button.className = 'btn ghost sm xskin-trigger';
    button.textContent = 'เลือกการ์ดในคอลเลกชัน';
    $('saveMyCharacter')?.insertAdjacentElement('beforebegin', button);
    button.addEventListener('click', () => {
      openCollectionPicker({
        title: 'เลือกการ์ดเป็นตัวละครของฉัน',
        selectedCardId: pendingMyCharacterCardId || currentMemberCardId(),
        onPick(choice) {
          pendingMyCharacterCardId = choice.cardId;
          ensureSyntheticCharacterOption();
          return true;
        },
      });
    });
  }

  const avatarSelect = $('myAvatarSelect');
  if (avatarSelect && !avatarSelect.dataset.skinPickerBound) {
    avatarSelect.dataset.skinPickerBound = '1';
    avatarSelect.addEventListener('change', event => {
      if (event.target.selectedOptions[0]?.dataset.cardSkin) return;
      pendingMyCharacterCardId = '';
      if ($('myColorSelect')) $('myColorSelect').disabled = false;
    });
  }
  ensureSyntheticCharacterOption();

  if (!$('choosePartyPetCard')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'choosePartyPetCard';
    button.className = 'btn ghost sm xskin-trigger';
    button.textContent = 'เลือกการ์ดในคอลเลกชัน';
    const npcRow = $('npcSelect')?.closest('.tool-row');
    npcRow?.insertAdjacentElement('afterend', button);
    button.addEventListener('click', () => {
      const code = partyCode();
      const party = getParty(code);
      const available = availableOwnedCards({ role: 'npc', exceptPartyCode: code })
        .filter(card => card.cardId !== party?.leadCardId);
      openCollectionPicker({
        title: 'เลือกการ์ดเป็นเพื่อนร่วมทาง',
        selectedCardId: party?.npcCardId || '',
        allowedCardIds: new Set(available.map(card => card.cardId)),
        onPick(choice, card, status) {
          const select = $('npcSelect');
          if (!select) return false;
          const value = `card:${choice.cardId}`;
          const option = [...select.options].find(item => item.value === value);
          if (!option) {
            status.textContent = 'การ์ดใบนี้ยังไม่ว่างสำหรับเพื่อนร่วมทางในสมุดนี้';
            status.classList.add('error');
            return false;
          }
          select.value = value;
          const nextText = `การ์ด · ${cardDescriptorTh(card)}`;
          if (option.textContent !== nextText) option.textContent = nextText;
          return true;
        },
      });
    });
  }

  /* The data/API name is still npcCardId for compatibility, but user-facing
     copy now consistently calls the slot Pet. */
  const npcSelect = $('npcSelect');
  if (npcSelect) {
    [...npcSelect.options].forEach(option => {
      if (!option.value.startsWith('card:')) return;
      const nextText = option.textContent.replace(/^(?:NPC|เพื่อนร่วมทาง)\s*·\s*/, 'การ์ด · ');
      if (nextText !== option.textContent) option.textContent = nextText;
    });
  }
}

function queueSyncPartyControls() {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(() => {
    syncQueued = false;
    syncPartyControls();
  });
}

function installPartyPickers() {
  syncPartyControls();

  /* render() rebuilds the two selects. Restore the skin option/button after
     every rebuild without touching the page's own save/manage handlers. */
  const observer = new MutationObserver(queueSyncPartyControls);
  observer.observe(document.body, { childList: true, subtree: true });

  $('saveMyCharacter')?.addEventListener('click', () => {
    setTimeout(() => {
      pendingMyCharacterCardId = null;
      queueSyncPartyControls();
    }, 900);
  });
}

function boot() {
  installStyles();
  if (/^\/new(?:\/|$)/.test(location.pathname)) installNewPartyPicker();
  if (/^\/p(?:\/|$)/.test(location.pathname)) installPartyPickers();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(boot), { once: true });
else requestAnimationFrame(boot);
