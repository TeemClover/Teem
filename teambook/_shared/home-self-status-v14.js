/* TeamBook 1.4 — Home self-status component.

   V1.3 tried to fight Safari card flicker by preloading every Home image,
   forcing eager/sync decode, and duplicating each src as a CSS background.
   That increased work and could make a repaint look like another card render.

   V1.4 owns ONLY the small gray/yellow/green self-status dots and copy. Card
   pixels are left to the one card renderer + browser image cache. */

import { getParty, partyIdentity } from './store.js';

function ictDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit',
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
  if (!commit) return { key:'idle', label:'ยังไม่ได้ลงชื่อวันนี้' };
  const valid = party?.verificationMode !== 'confirm' || hasConfirmation(commit);
  return valid
    ? { key:'done', label:'วันนี้ผ่านแล้ว' }
    : { key:'waiting', label:'ลงชื่อแล้ว · รอคนเห็น' };
}

function installStyle() {
  if (document.getElementById('tb-home-self-status-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-self-status-v14-style';
  style.textContent = `
    .xty-party-slide .party-state{display:inline-flex!important;align-items:center;gap:7px}
    .tb14-home-self-dot{flex:none;width:12px;height:12px;border-radius:999px;background:#b9b7b0;border:1.5px solid rgba(62,51,44,.18)}
    .tb14-home-self-dot.waiting{background:#f0c84f;border-color:#d4aa27}.tb14-home-self-dot.done{background:#55b56a;border-color:#32905a}
    .xty-party-row-pet{position:relative!important}
    .tb14-row-self-dot{position:absolute;left:50%;top:46px;transform:translateX(-50%);z-index:8;width:13px;height:13px;border-radius:999px;background:#b9b7b0;border:1.5px solid rgba(62,51,44,.20);pointer-events:none}
    .tb14-row-self-dot.waiting{background:#f0c84f;border-color:#d4aa27}.tb14-row-self-dot.done{background:#55b56a;border-color:#32905a}
    #home .xty-home-cover img,#home .xty-party-row-visual img{opacity:1!important;transition:none!important;animation:none!important}
  `;
  document.head.appendChild(style);
}

function codeFromRow(row) {
  try { return String(new URL(row.href, location.href).searchParams.get('c') || '').toUpperCase(); }
  catch { return ''; }
}

function syncHero() {
  document.querySelectorAll('#mainParty .xty-party-slide[data-code]').forEach(slide => {
    const code = String(slide.dataset.code || '').toUpperCase();
    const party = getParty(code);
    const userId = partyIdentity(code)?.userId;
    const badge = slide.querySelector('.party-state');
    if (!party || !userId || !badge || !badge.textContent.includes('เจ้าของสมุด')) return;
    const state = statusFor(party, userId);
    let dot = badge.querySelector('.tb14-home-self-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'tb14-home-self-dot';
      badge.prepend(dot);
    }
    const cls = `tb14-home-self-dot ${state.key}`;
    if (dot.className !== cls) dot.className = cls;
    dot.setAttribute('aria-label', `สถานะของคุณ: ${state.label}`);
    dot.title = state.label;

    const link = slide.querySelector('.xty-party-copy a.btn');
    if (link?.textContent.trim() === 'เข้าร่วมสมุด / ลงชื่อ') link.textContent = 'ดูสมุด';
  });
}

function syncRows() {
  document.querySelectorAll('#leadPartyRows a.row, #joinedPartyRows a.row').forEach(row => {
    const code = codeFromRow(row);
    const party = getParty(code);
    const userId = partyIdentity(code)?.userId;
    const pet = row.querySelector('.xty-party-row-pet');
    if (!party || !userId || !pet) return;
    const state = statusFor(party, userId);
    let dot = pet.querySelector(':scope > .tb14-row-self-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'tb14-row-self-dot';
      pet.appendChild(dot);
    }
    const cls = `tb14-row-self-dot ${state.key}`;
    if (dot.className !== cls) dot.className = cls;
    dot.setAttribute('aria-label', `สถานะของคุณ: ${state.label}`);
    dot.title = state.label;
  });
}

let queued = false;
function sync() { queued = false; syncHero(); syncRows(); }
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(sync);
}

function install() {
  if (location.pathname !== '/') return;
  installStyle();
  ['mainParty','leadPartyRows','joinedPartyRows'].forEach(id => {
    const node = document.getElementById(id);
    if (node) new MutationObserver(schedule).observe(node, { childList:true, subtree:true });
  });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

install();
