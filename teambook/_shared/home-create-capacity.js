/* TeamBook Home — creation CTA follows real capacity.

   Product rule:
   - if another owned Book can be created, the V1.3 Create hero stays prominent
   - when creation capacity is full, the large hero is demoted below the active Book
   - the compact create button remains tappable
   - first tap while full explains the limit; tapping again enters /new so the
     person can still browse the setup and decide what to close / unlock
   - max7books debug capacity must match /new and the create API
   - when a slot becomes available again, restore the Create hero automatically

   The server remains the authority that rejects an over-capacity create request. */

import { activePartyUsage, getProfile, hasProfile } from './store.js';

const COMPACT_ID = 'tbCreateCapacityCompact';
const DEBUG_MAX7_KEY = 'teambook_debug_max_owned_7';
let queued = false;

function debugMaxOwned() {
  try { return localStorage.getItem(DEBUG_MAX7_KEY) === '1' ? 7 : 0; }
  catch { return 0; }
}

function installStyle() {
  if (document.getElementById('tb-home-create-capacity-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-create-capacity-style';
  style.textContent = `
    #v13CreateBook[hidden]{display:none!important}
    .tb-create-capacity-compact{margin:10px 0 16px;text-align:center}
    .tb-create-capacity-compact[hidden]{display:none!important}
    .tb-create-capacity-compact .btn{width:min(100%,420px);margin:0;min-height:46px;font-size:13px;opacity:.92;cursor:pointer}
    .tb-create-capacity-message{width:min(100%,420px);margin:8px auto 0;padding:10px 12px;border:1px dashed var(--xty-border);border-radius:13px;background:rgba(255,255,255,.62);color:var(--xty-muted);font-size:12px;line-height:1.55;text-align:left}
    .tb-create-capacity-message[hidden]{display:none!important}
    .tb-create-capacity-message b{display:block;color:var(--xty-ink);margin-bottom:2px}
  `;
  document.head.appendChild(style);
}

function capacityState() {
  const profile = getProfile();
  if (!profile) return null;
  const usage = activePartyUsage(profile);
  const maxOwned = debugMaxOwned() || Number(usage.maxOwned || 1);
  const ownedFull = Number(usage.owned || 0) >= maxOwned;
  const totalFull = Number(usage.total || 0) >= Number(usage.maxTotal || 0);
  return {
    ...usage,
    maxOwned,
    canCreate: !ownedFull && !totalFull,
    ownedFull,
    totalFull,
  };
}

function fullLabel(capacity) {
  if (capacity.ownedFull) {
    if (capacity.owned > capacity.maxOwned) {
      return `ช่องสร้างสมุดเกินสิทธิ์ปัจจุบัน · ใช้อยู่ ${capacity.owned} · สร้างพร้อมกันได้ ${capacity.maxOwned}`;
    }
    return `ช่องสร้างสมุดเต็ม · ${capacity.owned}/${capacity.maxOwned}`;
  }
  return `ช่องสมุดที่ใช้งานเต็ม · ${capacity.total}/${capacity.maxTotal}`;
}

function renameJoinAction() {
  document.querySelectorAll('#homeActions a[href^="/join/"]').forEach(link => {
    if (link.textContent !== 'ใส่รหัสเข้าสมุด') link.textContent = 'ใส่รหัสเข้าสมุด';
  });
}

function ensureCompact(mainParty) {
  let node = document.getElementById(COMPACT_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = COMPACT_ID;
    node.className = 'tb-create-capacity-compact';
    node.innerHTML = `
      <button class="btn ghost" type="button">+ เปิดสมุดใหม่</button>
      <div class="tb-create-capacity-message" role="status" hidden></div>`;
    node.querySelector('button')?.addEventListener('click', () => {
      const capacity = capacityState();
      if (!capacity || capacity.canCreate) {
        location.href = '/new/?quick=1';
        return;
      }
      const message = node.querySelector('.tb-create-capacity-message');
      if (!message) {
        location.href = '/new/?quick=1';
        return;
      }
      /* Full capacity uses a deliberate two-step action: first tap explains,
         second tap respects intent and lets the person enter /new anyway. */
      if (!message.hidden) {
        location.href = '/new/?quick=1';
        return;
      }
      message.innerHTML = `<b>${fullLabel(capacity)}</b><span>ปิดสมุดที่กำลังเขียนอยู่ หรือ Level Up เพื่อเพิ่มช่องสร้างสมุด · กด “+ เปิดสมุดใหม่” อีกครั้งเพื่อเข้าไปดูการตั้งค่าได้</span>`;
      message.hidden = false;
    });
  }
  if (node.previousElementSibling !== mainParty) mainParty.insertAdjacentElement('afterend', node);
  return node;
}

function sync() {
  if (location.pathname !== '/' || !hasProfile()) return;
  installStyle();
  renameJoinAction();

  const capacity = capacityState();
  const mainParty = document.getElementById('mainParty');
  const hero = document.getElementById('v13CreateBook');
  if (!capacity || !mainParty) return;

  if (capacity.canCreate) {
    if (hero && hero.hidden) hero.hidden = false;
    const compact = document.getElementById(COMPACT_ID);
    if (compact && !compact.hidden) compact.hidden = true;
    return;
  }

  if (hero && !hero.hidden) hero.hidden = true;
  const compact = ensureCompact(mainParty);
  const button = compact.querySelector('button');
  if (button) {
    button.disabled = false;
    button.removeAttribute('aria-disabled');
    button.textContent = '+ เปิดสมุดใหม่';
  }
  const message = compact.querySelector('.tb-create-capacity-message');
  const signature = `${capacity.owned}/${capacity.maxOwned}|${capacity.total}/${capacity.maxTotal}`;
  if (compact.dataset.capacitySignature !== signature) {
    compact.dataset.capacitySignature = signature;
    if (message) message.hidden = true;
  }
  if (compact.hidden) compact.hidden = false;
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    sync();
  });
}

function install() {
  if (location.pathname !== '/') return;
  installStyle();
  renameJoinAction();
  const home = document.getElementById('home') || document.body;
  const observer = new MutationObserver(schedule);
  observer.observe(home, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
  addEventListener('pageshow', schedule);
  addEventListener('storage', schedule);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule();
  });
  schedule();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}
