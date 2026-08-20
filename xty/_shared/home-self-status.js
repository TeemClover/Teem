import { getParty, partyIdentity } from './store.js';

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
  if (document.getElementById('xty-home-self-status-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-home-self-status-style';
  style.textContent = `
    .xty-party-slide .party-state{display:inline-flex!important;align-items:center;gap:7px}
    .xty-home-self-status{
      flex:none;display:inline-block;width:12px;height:12px;border-radius:999px;
      background:#b9b7b0;border:1.5px solid rgba(62,51,44,.18);
      box-shadow:0 1px 0 rgba(255,255,255,.75) inset;
    }
    .xty-home-self-status.waiting{background:#f0c84f;border-color:#d4aa27}
    .xty-home-self-status.done{background:#55b56a;border-color:#32905a}
  `;
  document.head.appendChild(style);
}

function sync() {
  document.querySelectorAll('.xty-party-slide[data-code]').forEach(slide => {
    const code = String(slide.dataset.code || '').toUpperCase();
    const party = getParty(code);
    const userId = partyIdentity(code)?.userId;
    const badge = slide.querySelector('.party-state');
    if (!party || !userId || !badge || badge.textContent.trim() !== 'เจ้าของสมุด') return;

    const state = statusFor(party, userId);
    let dot = badge.querySelector('.xty-home-self-status');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'xty-home-self-status';
      badge.prepend(dot);
    }
    dot.className = `xty-home-self-status ${state.key}`;
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', `สถานะของคุณ: ${state.label}`);
    dot.title = state.label;
  });
}

installStyle();
const host = document.getElementById('mainParty');
if (host) new MutationObserver(() => queueMicrotask(sync)).observe(host, { childList: true, subtree: true });
window.addEventListener('pageshow', sync);
window.addEventListener('focus', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
queueMicrotask(sync);
