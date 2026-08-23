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
  (party?.log || []).forEach(post => {
    if (post?.kind !== 'commit' || post?.retracted || !post?.confirmedBy) return;
    if (dayKey(post?.sentAt) !== key) return;
    seenMembers.add(post.userId || `seq:${post.seq}`);
  });
  return seenMembers.size;
}

function mainTodayLine(party) {
  const done = committedToday(party).size;
  const members = Array.isArray(party?.members) ? party.members.length : 0;
  return `วันนี้ ${done}/${members} ลงชื่อ · ${seenToday(party)} เห็นแล้ว`;
}

function updatesLine(party) {
  return `มี ${messagesToday(party)} อัปเดท`;
}

function smallCardLine(party) {
  const done = committedToday(party).size;
  const members = Array.isArray(party?.members) ? party.members.length : 0;
  const updates = messagesToday(party);
  return `วันนี้ : ${done}/${members} ลงชื่อแล้ว · มี ${updates} อัปเดต`;
}

function partyCodeFromRow(row) {
  try {
    return String(new URL(row.href, location.href).searchParams.get('c') || '').toUpperCase();
  } catch {
    return '';
  }
}

function syncHeroCards() {
  document.querySelectorAll('#mainParty .xty-party-slide[data-code]').forEach(slide => {
    const code = String(slide.dataset.code || '').toUpperCase();
    const party = getParty(code);
    if (!party) return;

    const copy = slide.querySelector('.xty-party-copy');
    if (!copy) return;
    let today = copy.querySelector('.home-today-line');
    let updates = copy.querySelector('.home-update-line');

    if (!today) {
      const whispers = copy.querySelectorAll('.whisper');
      today = whispers[whispers.length - 1] || null;
      if (today) today.classList.add('home-today-line');
    }
    if (!updates && today) {
      updates = document.createElement('p');
      updates.className = 'whisper home-update-line';
      today.insertAdjacentElement('afterend', updates);
    }

    if (today) today.textContent = mainTodayLine(party);
    if (updates) updates.textContent = updatesLine(party);
  });
}

function syncSmallCards() {
  document.querySelectorAll('#leadPartyRows a.row, #joinedPartyRows a.row, #closedPartyRows a.row').forEach(row => {
    const party = getParty(partyCodeFromRow(row));
    if (!party) return;
    const target = row.querySelector('.tx small');
    if (target) target.textContent = smallCardLine(party);
  });
}

let queued = false;
function syncAll() {
  queued = false;
  syncHeroCards();
  syncSmallCards();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(syncAll);
}

const home = document.getElementById('home');
if (home) new MutationObserver(schedule).observe(home, {
  childList: true, subtree: true, characterData: true,
});
window.addEventListener('pageshow', schedule);
window.addEventListener('focus', schedule);
window.addEventListener('storage', schedule);
document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
queueMicrotask(syncAll);
