import { getParty, partyIdentity } from './store.js';

const code = String(new URLSearchParams(location.search).get('c') || '').toUpperCase();

function ictDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function hasConfirmation(post) {
  if (post?.valid === true) return true;
  if (Array.isArray(post?.confirmedBy)) return post.confirmedBy.length > 0;
  return !!post?.confirmedBy;
}

function statusFor(party, userId) {
  const today = ictDayKey();
  const commit = [...(party?.log || [])].reverse().find(post =>
    post?.kind === 'commit' && !post?.retracted && post?.userId === userId
      && ictDayKey(post?.sentAt) === today
  );
  if (!commit) return { key: 'idle', label: 'ยังไม่ได้ลงชื่อวันนี้' };
  const valid = party?.verificationMode !== 'confirm' || hasConfirmation(commit);
  return valid
    ? { key: 'done', label: 'ลงชื่อแล้วและผ่าน เห็นแล้ว' }
    : { key: 'waiting', label: 'ลงชื่อแล้ว · รอเพื่อนกด เห็นแล้ว' };
}

function installStyle() {
  if (document.getElementById('xty-self-status-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-self-status-style';
  style.textContent = `
    #seats>.seat-card-wrap:last-child{overflow:visible!important}
    .xty-self-status-under-pet{
      display:flex;align-items:center;justify-content:center;
      width:100%;min-height:20px;margin-top:8px;
    }
    .xty-self-status-dot{
      display:block;width:17px;height:17px;border-radius:999px;
      border:2px solid rgba(62,51,44,.16);
      box-shadow:0 1px 0 rgba(255,255,255,.78) inset,0 1px 3px rgba(62,51,44,.10);
      background:#b9b7b0;
    }
    .xty-self-status-dot.waiting{background:#f0c84f;border-color:#d4aa27}
    .xty-self-status-dot.done{background:#55b56a;border-color:#32905a}
  `;
  document.head.appendChild(style);
}

function sync() {
  if (!code) return;
  const party = getParty(code);
  const userId = partyIdentity(code)?.userId;
  const seats = document.getElementById('seats');
  const petSeat = seats?.lastElementChild;
  if (!party || !userId || !petSeat) return;

  const state = statusFor(party, userId);
  let holder = petSeat.querySelector(':scope > .xty-self-status-under-pet');
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'xty-self-status-under-pet';
    petSeat.appendChild(holder);
  }
  holder.innerHTML = `<span class="xty-self-status-dot ${state.key}" role="img" aria-label="สถานะของคุณ: ${state.label}" title="${state.label}"></span>`;
}

installStyle();
const seats = document.getElementById('seats');
if (seats) new MutationObserver(() => queueMicrotask(sync)).observe(seats, { childList: true, subtree: false });
window.addEventListener('pageshow', sync);
window.addEventListener('focus', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
queueMicrotask(sync);
