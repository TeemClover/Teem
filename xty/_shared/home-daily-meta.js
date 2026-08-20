import { getParty, committedToday, dayKey } from './store.js';

function messagesToday(party, when) {
  const key = dayKey(when);
  return (party?.log || []).filter(post =>
    post?.kind === 'message' && !post?.retracted && dayKey(post?.sentAt) === key
  ).length;
}

function todayLine(party) {
  const done = committedToday(party).size;
  const members = Array.isArray(party?.members) ? party.members.length : 0;
  const updates = messagesToday(party);
  return `วันนี้ : ${done}/${members} ลงชื่อแล้ว · มี ${updates} อัพเดท`;
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
    const whispers = slide.querySelectorAll('.xty-party-copy .whisper');
    const target = whispers[whispers.length - 1];
    if (target) target.textContent = todayLine(party);
  });
}

function syncSmallCards() {
  document.querySelectorAll('#leadPartyRows a.row, #joinedPartyRows a.row').forEach(row => {
    const party = getParty(partyCodeFromRow(row));
    if (!party) return;
    const target = row.querySelector('.tx small');
    if (target) target.textContent = todayLine(party);
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
