/* TeamBook V1.2 — Active Home only.
   Completed/dissolved books live in Collection > Finished Books, not in the
   everyday party lists. The source rows may still exist for legacy/local
   history, so this layer filters the rendered Home without deleting data. */

import { allParties, isActiveParty } from './store.js';

function codeFromRow(row) {
  try {
    return new URL(row?.href || '', location.origin).searchParams.get('c') || '';
  } catch { return ''; }
}

function filterGroup(rowsId, emptyId, countId) {
  const rows = document.getElementById(rowsId);
  const empty = document.getElementById(emptyId);
  const count = document.getElementById(countId);
  if (!rows || !empty || !count) return 0;

  const byCode = new Map(allParties().map(party => [String(party.code || ''), party]));
  let visible = 0;
  rows.querySelectorAll('a.row').forEach(row => {
    const party = byCode.get(codeFromRow(row));
    const active = !!party && isActiveParty(party);
    row.hidden = !active;
    if (active) visible += 1;
  });

  rows.hidden = visible === 0;
  empty.hidden = visible !== 0;
  count.textContent = `${visible} สมุด`;
  return visible;
}

let queued = false;
function sync() {
  if (!/^\/$/.test(location.pathname)) return;
  const lead = filterGroup('leadPartyRows', 'leadPartyEmpty', 'leadPartyCount');
  const joined = filterGroup('joinedPartyRows', 'joinedPartyEmpty', 'joinedPartyCount');
  const total = lead + joined;
  const section = document.getElementById('allPartiesSection');
  if (section) section.hidden = total === 0;
  const heading = document.getElementById('partyHeading');
  if (heading && total) heading.textContent = 'สมุดที่กำลังเขียน';
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
  if (!/^\/$/.test(location.pathname)) return;
  const home = document.getElementById('home') || document.body;
  const observer = new MutationObserver(schedule);
  observer.observe(home, { childList: true, subtree: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
