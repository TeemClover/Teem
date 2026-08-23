/* TeamBook V1.2 — Home book lanes.
   Active books stay in the everyday owner/joined groups and in the large Home
   carousel. Completed/dissolved books are combined in one closed-book lane.
   This is presentation-only: no local/server book data is deleted. */

import { allParties, isActiveParty, activePartyUsage, getProfile } from './store.js';
import { bookActivityLine } from './book-mode.js';

const DEBUG_MAX7_KEY = 'teambook_debug_max_owned_7';
let closedSignature = '';

function debugMax7Enabled() {
  try { return localStorage.getItem(DEBUG_MAX7_KEY) === '1'; }
  catch { return false; }
}

function codeFromRow(row) {
  try {
    return new URL(row?.href || '', location.origin).searchParams.get('c') || '';
  } catch { return ''; }
}

function ownerAlias(party) {
  const members = Array.isArray(party?.members) ? party.members : [];
  const owner = members.find(member => member?.userId && member.userId === party?.ownerId)
    || members.find(member => member?.role === 'lead')
    || null;
  return String(owner?.alias || owner?.name || owner?.displayName || 'ไม่ทราบชื่อ').trim();
}

function decorateRowCopy(row, party) {
  const tx = row?.querySelector('.tx');
  const title = tx?.querySelector('b');
  if (!tx || !title || !party) return;

  let meta = tx.querySelector('.home-book-meta');
  if (!meta) {
    meta = document.createElement('span');
    meta.className = 'home-book-meta';
    tx.insertBefore(meta, title);
  }

  const activity = String(bookActivityLine(party, 'ยังไม่ระบุกิจกรรม') || 'ยังไม่ระบุกิจกรรม').trim();
  meta.textContent = `เจ้าของ: ${ownerAlias(party)} · ${activity}`;
}

function ensureClosedGroup() {
  let group = document.getElementById('closedPartyGroup');
  if (group) return group;

  const joined = document.getElementById('joinedPartyGroup');
  const section = document.getElementById('allPartiesSection');
  if (!section) return null;

  group = document.createElement('details');
  group.className = 'party-group';
  group.id = 'closedPartyGroup';
  group.innerHTML = `
    <summary><span>สมุดที่ปิดเล่มแล้ว</span><span class="party-group-count" id="closedPartyCount">0 สมุด</span></summary>
    <div class="rows" id="closedPartyRows"></div>
    <div class="party-group-empty" id="closedPartyEmpty" hidden>ยังไม่มีสมุดที่ปิดเล่ม</div>`;

  if (joined?.parentNode === section) joined.insertAdjacentElement('afterend', group);
  else section.appendChild(group);
  return group;
}

function filterGroup(rowsId, emptyId, countId, groupId, byCode, terminalRows) {
  const rows = document.getElementById(rowsId);
  const empty = document.getElementById(emptyId);
  const count = document.getElementById(countId);
  const group = document.getElementById(groupId);
  if (!rows || !empty || !count) return 0;

  let visible = 0;
  rows.querySelectorAll('a.row').forEach(row => {
    const party = byCode.get(codeFromRow(row));
    if (!party) {
      row.hidden = true;
      return;
    }

    decorateRowCopy(row, party);
    const active = isActiveParty(party);
    row.hidden = !active;
    if (active) visible += 1;
    else terminalRows.push({ row, party });
  });

  rows.hidden = visible === 0;
  empty.hidden = true;
  count.textContent = `${visible} สมุด`;
  if (group) group.hidden = visible === 0;
  return visible;
}

function syncClosedGroup(terminalRows) {
  const group = ensureClosedGroup();
  const rows = document.getElementById('closedPartyRows');
  const empty = document.getElementById('closedPartyEmpty');
  const count = document.getElementById('closedPartyCount');
  if (!group || !rows || !empty || !count) return 0;

  const unique = [];
  const seen = new Set();
  for (const entry of terminalRows) {
    const code = String(entry.party?.code || codeFromRow(entry.row));
    if (!code || seen.has(code)) continue;
    seen.add(code);
    unique.push(entry);
  }

  const signature = unique.map(({ row, party }) => `${party.code}:${party.state}:${row.innerHTML}`).join('|');
  if (signature !== closedSignature) {
    const clones = unique.map(({ row, party }) => {
      const clone = row.cloneNode(true);
      clone.hidden = false;
      decorateRowCopy(clone, party);
      return clone;
    });
    rows.replaceChildren(...clones);
    closedSignature = signature;
  }

  const total = unique.length;
  group.hidden = total === 0;
  rows.hidden = total === 0;
  empty.hidden = total !== 0;
  count.textContent = `${total} สมุด`;
  return total;
}

function syncHero(byCode) {
  const host = document.getElementById('mainParty');
  if (!host) return;
  const carousel = host.querySelector('.xty-party-carousel');
  if (!carousel) return;

  let activeCount = 0;
  carousel.querySelectorAll('.xty-party-slide[data-code]').forEach(slide => {
    const party = byCode.get(String(slide.dataset.code || ''));
    const active = !!party && isActiveParty(party);
    slide.hidden = !active;
    if (active) activeCount += 1;
  });
  carousel.hidden = activeCount === 0;
}

function syncDebugCapacity() {
  if (!debugMax7Enabled()) return;
  const node = document.getElementById('ownedCapacityN');
  const profile = getProfile();
  if (!node || !profile) return;
  const capacity = activePartyUsage(profile);
  node.innerHTML = `${capacity.owned} / 7<small>สร้างสมุด</small>`;
}

let queued = false;
function sync() {
  if (!/^\/$/.test(location.pathname)) return;

  const byCode = new Map(allParties().map(party => [String(party.code || ''), party]));
  const terminalRows = [];
  const lead = filterGroup('leadPartyRows', 'leadPartyEmpty', 'leadPartyCount', 'leadPartyGroup', byCode, terminalRows);
  const joined = filterGroup('joinedPartyRows', 'joinedPartyEmpty', 'joinedPartyCount', 'joinedPartyGroup', byCode, terminalRows);
  const closed = syncClosedGroup(terminalRows);
  const activeTotal = lead + joined;

  syncHero(byCode);
  syncDebugCapacity();

  const section = document.getElementById('allPartiesSection');
  if (section) section.hidden = activeTotal + closed === 0;
  const heading = document.getElementById('partyHeading');
  if (heading) {
    heading.textContent = 'สมุดที่กำลังเขียน';
    heading.hidden = activeTotal === 0;
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    sync();
  });
}

function installStyle() {
  if (document.getElementById('teambook-home-lanes-style')) return;
  const style = document.createElement('style');
  style.id = 'teambook-home-lanes-style';
  style.textContent = `
    /* Home cover/row modules use display:grid!important for layout. Without an
       equally strong hidden rule, a terminal row is logically hidden but can
       still render inside the active owner/joined group. */
    #leadPartyRows > a.row[hidden],
    #joinedPartyRows > a.row[hidden],
    #mainParty .xty-party-slide[hidden],
    #mainParty .xty-party-carousel[hidden]{
      display:none!important;
    }
    .home-book-meta{
      display:block;
      max-width:100%;
      margin:0 0 3px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      color:var(--xty-muted);
      font-size:11px;
      font-weight:750;
      line-height:1.35;
    }
    #closedPartyGroup{margin-top:14px}
  `;
  document.head.appendChild(style);
}

function install() {
  if (!/^\/$/.test(location.pathname)) return;
  installStyle();
  ensureClosedGroup();
  const home = document.getElementById('home') || document.body;
  const observer = new MutationObserver(schedule);
  observer.observe(home, { childList: true, subtree: true });
  addEventListener('pageshow', schedule);
  addEventListener('storage', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
