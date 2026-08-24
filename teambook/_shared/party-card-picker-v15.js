/* TeamBook — restore the canonical filtered Collection picker inside /p.

   party-character-save-v14 owns persistence and the synthetic <select> option.
   This module owns only the picker UI. It intercepts the old flat modal before
   its click handler runs, shows the shared colour + rarity shelves, then hands
   the chosen card back to the old module by opening its native dialog invisibly
   and clicking the exact matching card. That preserves all existing save logic.
*/

import { mountCardPicker } from './card-picker.js';
import { cardById, cardDescriptorTh } from './cards.js';

let dialog = null;
let bypassNative = false;

function currentCardId() {
  const value = document.getElementById('myAvatarSelect')?.value || '';
  return cardById(value)?.cardId || '';
}

function closePicker() {
  if (!dialog) return;
  try { if (dialog.open) dialog.close(); } catch {}
  dialog.remove();
  dialog = null;
}

function chooseThroughNative(cardId) {
  const card = cardById(cardId);
  const trigger = document.getElementById('tbChooseCharacterCard');
  if (!card || !trigger) return;

  closePicker();
  bypassNative = true;
  trigger.click();
  bypassNative = false;

  queueMicrotask(() => {
    const native = document.querySelector('dialog.tb-char-dialog');
    if (!native) return;
    native.style.visibility = 'hidden';
    const wanted = `ใช้ ${cardDescriptorTh(card)} เป็นตัวละครในสมุดนี้`;
    const target = [...native.querySelectorAll('.tb-char-card')]
      .find(button => button.getAttribute('aria-label') === wanted);
    if (target) {
      target.click();
      return;
    }
    try { native.close(); } catch {}
    native.remove();
  });
}

function installStyle() {
  if (document.getElementById('tb-filtered-party-picker-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-filtered-party-picker-style';
  style.textContent = `
    .tb-filtered-party-picker{width:min(94vw,760px);max-height:88dvh;margin:auto;padding:0;border:1px solid var(--xty-border);border-radius:22px;background:var(--xty-bg);color:var(--xty-ink);box-shadow:0 24px 70px rgba(0,0,0,.24);overflow:hidden}
    .tb-filtered-party-picker::backdrop{background:rgba(25,22,18,.48)}
    .tb-filtered-party-picker__head{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--xty-border);background:var(--xty-bg)}
    .tb-filtered-party-picker__head b{font-size:17px}
    .tb-filtered-party-picker__close{width:40px;height:40px;border:1px solid var(--xty-border);border-radius:50%;background:var(--xty-surface);font-size:23px;line-height:1}
    .tb-filtered-party-picker__body{max-height:calc(88dvh - 70px);padding:14px;overflow:auto;-webkit-overflow-scrolling:touch}
    .tb-filtered-party-picker .xcp-shelf:first-child{display:none!important}
    .tb-filtered-party-picker .xcp-filters{position:sticky;top:0;z-index:3;padding:2px 0 12px;background:var(--xty-bg)}
    .tb-filtered-party-picker .xcp-grid{grid-template-columns:repeat(auto-fill,minmax(118px,1fr))}
    @media(max-width:520px){.tb-filtered-party-picker .xcp-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding-inline:10px}.tb-filtered-party-picker__body{padding:10px}}
  `;
  document.head.appendChild(style);
}

function openFilteredPicker() {
  const select = document.getElementById('myAvatarSelect');
  if (!select || select.disabled) return;
  closePicker();
  installStyle();

  dialog = document.createElement('dialog');
  dialog.className = 'tb-filtered-party-picker';
  dialog.innerHTML = `
    <div class="tb-filtered-party-picker__head">
      <b>เลือกการ์ดในคอลเลกชัน</b>
      <button class="tb-filtered-party-picker__close" type="button" aria-label="ปิด">×</button>
    </div>
    <div class="tb-filtered-party-picker__body"><div id="tbFilteredCardPicker"></div></div>`;

  const host = dialog.querySelector('#tbFilteredCardPicker');
  mountCardPicker(host, {
    mode:'avatar',
    selected:{ cardId:currentCardId() || undefined },
    onSelect:choice => {
      if (choice?.kind !== 'card' || !choice.cardId) return;
      chooseThroughNative(choice.cardId);
    },
  });

  dialog.querySelector('.tb-filtered-party-picker__close').addEventListener('click', closePicker);
  dialog.addEventListener('click', event => { if (event.target === dialog) closePicker(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePicker(); });
  document.body.appendChild(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open','');
}

function install() {
  if (!/^\/p\/?$/.test(location.pathname) || globalThis.__tbFilteredPartyPicker) return;
  globalThis.__tbFilteredPartyPicker = true;
  installStyle();
  document.addEventListener('click', event => {
    if (bypassNative) return;
    const trigger = event.target?.closest?.('#tbChooseCharacterCard');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openFilteredPicker();
  }, true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
else install();
