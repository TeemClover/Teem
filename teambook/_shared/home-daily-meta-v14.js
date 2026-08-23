/* TeamBook 1.4 — Home daily metadata component.
   Owns ONLY the two daily text lines. It never rebuilds cards and never watches
   characterData, so writing copy cannot trigger its own observer. */

import { getParty, committedToday, dayKey } from './store.js';

function messagesToday(party, when) {
  const key = dayKey(when);
  return (party?.log || []).filter(post =>
    post?.kind === 'message' && !post?.retracted && dayKey(post?.sentAt) === key
  ).length;
}

function seenToday(party, when) {
  const key = dayKey(when);
  const seenMembers = new Set();
  for (const post of party?.log || []) {
    if (post?.kind !== 'commit' || post?.retracted || !post?.confirmedBy) continue;
    if (dayKey(post?.sentAt) !== key) continue;
    seenMembers.add(post.userId || `seq:${post.seq}`);
  }
  return seenMembers.size;
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function codeFromRow(row) {
  try { return String(new URL(row.href, location.href).searchParams.get('c') || '').toUpperCase(); }
  catch { return ''; }
}

function syncHero() {
  document.querySelectorAll('#mainParty .xty-party-slide[data-code]').forEach(slide => {
    const party = getParty(String(slide.dataset.code || '').toUpperCase());
    const copy = slide.querySelector('.xty-party-copy');
    if (!party || !copy) return;

    let today = copy.querySelector('.home-today-line');
    let updates = copy.querySelector('.home-update-line');
    if (!today) {
      const whispers = copy.querySelectorAll(':scope > .whisper');
      today = whispers[whispers.length - 1] || null;
      today?.classList.add('home-today-line');
    }
    if (!updates && today) {
      updates = document.createElement('p');
      updates.className = 'whisper home-update-line';
      today.insertAdjacentElement('afterend', updates);
    }

    const done = committedToday(party).size;
    const members = Array.isArray(party.members) ? party.members.length : 0;
    setText(today, `วันนี้ ${done}/${members} ลงชื่อ · ${seenToday(party)} เห็นแล้ว`);
    setText(updates, `มี ${messagesToday(party)} อัปเดท`);
  });
}

function syncRows() {
  document.querySelectorAll('#leadPartyRows a.row, #joinedPartyRows a.row, #closedPartyRows a.row').forEach(row => {
    const party = getParty(codeFromRow(row));
    const target = row.querySelector('.tx small');
    if (!party || !target) return;
    const done = committedToday(party).size;
    const members = Array.isArray(party.members) ? party.members.length : 0;
    setText(target, `วันนี้ ${done}/${members} ลงชื่อ · ${seenToday(party)} เห็นแล้ว · ${messagesToday(party)} อัปเดท`);
  });
}

let queued = false;
function sync() {
  queued = false;
  syncHero();
  syncRows();
}
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(sync);
}

function install() {
  if (location.pathname !== '/') return;
  ['mainParty','leadPartyRows','joinedPartyRows','closedPartyRows'].forEach(id => {
    const node = document.getElementById(id);
    if (node) new MutationObserver(schedule).observe(node, { childList: true, subtree: true });
  });
  addEventListener('pageshow', schedule);
  addEventListener('storage', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

install();
