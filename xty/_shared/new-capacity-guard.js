/* XTY create-page capacity guard.
   Merge/Resync may legitimately leave an account over its current entitlement;
   those books stay. This guard only prevents adding another active owned book
   and explains the limit as soon as the player starts naming a new one. */

import { getProfile, activePartyUsage } from './store.js';

const input = document.getElementById('pname');
const button = document.getElementById('go');

if (input && button) {
  let warning = document.getElementById('capacityWarning');
  if (!warning) {
    warning = document.createElement('p');
    warning.id = 'capacityWarning';
    warning.className = 'hint';
    warning.style.color = 'var(--xty-red)';
    warning.hidden = true;
    input.insertAdjacentElement('afterend', warning);
  }

  let applying = false;
  function syncCapacity() {
    if (applying) return;
    const profile = getProfile();
    if (!profile) return;
    const capacity = activePartyUsage(profile);
    const full = Number(capacity.owned || 0) >= Number(capacity.maxOwned || 1);
    const hasName = input.value.trim().length > 0;

    warning.hidden = !(full && hasName);
    if (full && hasName) {
      warning.textContent = `ช่องสร้างสมุดเต็มแล้ว (${capacity.owned}/${capacity.maxOwned}) · ปิดสมุดที่กำลังเขียนอยู่ก่อน หรือปลดช่องเพิ่ม`;
    }

    button.dataset.capacityBlocked = full ? '1' : '0';
    if (full && !button.disabled) {
      applying = true;
      button.disabled = true;
      applying = false;
    }
  }

  input.addEventListener('input', syncCapacity);
  document.addEventListener('change', syncCapacity, true);
  document.addEventListener('click', event => {
    if (event.target?.closest?.('.card-select,.mode-choice,.preset-choice,.pill-choice,.wide-choice,.pet-choice')) {
      queueMicrotask(syncCapacity);
    }
  }, true);

  /* Existing page logic also writes go.disabled. If it decides the form is
     otherwise ready, this observer reapplies the capacity gate immediately. */
  new MutationObserver(syncCapacity).observe(button, { attributes: true, attributeFilter: ['disabled'] });
  window.addEventListener('pageshow', syncCapacity);
  syncCapacity();
}
