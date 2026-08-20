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

    /* Treat cover + companion/status as one balanced visual cluster. The pet
       no longer hugs the cover's top edge; its card/art plus the status light
       are centered together against the taller 63:88 cover. */
    .party-group .xty-party-row-visual{
      align-items:center!important;
      overflow:visible!important;
    }
    .party-group .xty-party-row-pet{
      position:relative!important;
      align-self:center!important;
      overflow:visible!important;
      transform:translateY(-8px);
    }
    .xty-party-row-pet.empty.has-self-status{visibility:visible!important}
    .xty-party-row-self-status{
      position:absolute;left:50%;top:46px;transform:translateX(-50%);z-index:8;
      display:block;width:13px;height:13px;border-radius:999px;
      background:#b9b7b0;border:1.5px solid rgba(62,51,44,.20);
      box-shadow:0 1px 0 rgba(255,255,255,.78) inset,0 1px 3px rgba(62,51,44,.10);
      pointer-events:none;
    }
    .xty-party-row-self-status.waiting{background:#f0c84f;border-color:#d4aa27}
    .xty-party-row-self-status.done{background:#55b56a;border-color:#32905a}
    @media(max-width:380px){
      .party-group .xty-party-row-pet{transform:translateY(-8px)}
      .xty-party-row-self-status{top:42px;width:12px;height:12px}
    }

    /* Safari occasionally paints a dynamically inserted cached IMG one frame
       late. The same source is kept as the element background as a visual
       fallback, and all home card images skip fade/async-decode effects. */
    #home .xty-home-cover img,
    #home .xty-party-row-visual img{
      opacity:1!important;
      transition:none!important;
      animation:none!important;
      background-repeat:no-repeat!important;
      background-position:center!important;
    }
  `;
  document.head.appendChild(style);
}

const warmed = new Map();
function warmImage(src) {
  if (!src || warmed.has(src)) return warmed.get(src) || null;
  const image = new Image();
  image.decoding = 'sync';
  image.loading = 'eager';
  image.src = src;
  warmed.set(src, image);
  return image;
}

function stabilizeImage(img) {
  if (!(img instanceof HTMLImageElement)) return;
  const raw = img.getAttribute('src') || '';
  if (!raw) return;
  const src = new URL(raw, location.href).href;

  img.loading = 'eager';
  img.decoding = 'sync';
  try { img.fetchPriority = 'high'; } catch {}

  const contain = !!img.closest('.xty-party-row-pet:not(.is-card)');
  img.style.backgroundImage = `url(${JSON.stringify(src)})`;
  img.style.backgroundSize = contain ? 'contain' : 'cover';
  img.style.backgroundPosition = 'center';
  img.style.backgroundRepeat = 'no-repeat';

  const preloaded = warmImage(src);
  if (img.dataset.xtyStableBound === '1') return;
  img.dataset.xtyStableBound = '1';

  img.addEventListener('error', () => {
    if (img.dataset.xtyStableRetried === '1') return;
    img.dataset.xtyStableRetried = '1';
    const retry = preloaded || warmImage(src);
    if (!retry) return;
    const restore = () => {
      if (!img.isConnected) return;
      img.src = src;
    };
    if (retry.complete && retry.naturalWidth) restore();
    else retry.addEventListener('load', restore, { once: true });
  });
}

function stabilizeImages(root = document) {
  root.querySelectorAll?.('#home .xty-home-cover img, #home .xty-party-row-visual img')
    .forEach(stabilizeImage);
}

/* FIRST HAND on Home is an external WebP nested inside an inline SVG. Mobile
   Safari can render the SVG text/frame but silently skip that nested external
   <image> until a hard refresh. A normal image preload is not enough because
   the failure is in SVG resource painting, not HTTP cache. For Home only,
   fetch the same-origin WebP once and replace the SVG image href with an
   in-memory data URL. The SVG then has no external image dependency at all. */
function syncCopy() {
  /* The hero is already inside the notebook; opening it should read like
     navigation, not like a second join/sign action. */
  document.querySelectorAll('#mainParty .xty-party-copy a.btn').forEach(link => {
    if (link.textContent.trim() === 'เข้าร่วมสมุด / ลงชื่อ') link.textContent = 'ดูสมุด';
  });

  /* "สมุด" is the object name; when a number is counting them, the unit is
     "เล่ม". Keep headings such as "สมุดทั้งหมด" and "สมุดที่คุณเข้าร่วม". */
  const home = document.getElementById('home');
  if (!home) return;
  const walker = document.createTreeWalker(home, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const before = node.nodeValue || '';
    const after = before.replace(/(\d+)\s*สมุด/g, '$1 เล่ม');
    if (after !== before) node.nodeValue = after;
  }
}

function syncHeroStatus() {
  document.querySelectorAll('.xty-party-slide[data-code]').forEach(slide => {
    const code = String(slide.dataset.code || '').toUpperCase();
    const party = getParty(code);
    const userId = partyIdentity(code)?.userId;
    const badge = slide.querySelector('.party-state');
    if (!party || !userId || !badge) return;

    /* The dot belongs only to the owner's active hero badge. Terminal labels
       (COMPLETED / DISSOLVED) keep their own meaning. */
    const badgeWords = badge.textContent.replace(/\s+/g, ' ').trim();
    if (!badgeWords.includes('เจ้าของสมุด')) return;

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

function syncRowStatus() {
  document.querySelectorAll('#leadPartyRows a.row, #joinedPartyRows a.row').forEach(row => {
    let code = '';
    try { code = new URL(row.href, location.href).searchParams.get('c') || ''; } catch {}
    code = String(code).toUpperCase();
    const party = getParty(code);
    const userId = partyIdentity(code)?.userId;
    const pet = row.querySelector('.xty-party-row-pet');
    if (!party || !userId || !pet) return;

    const state = statusFor(party, userId);
    let dot = pet.querySelector(':scope > .xty-party-row-self-status');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'xty-party-row-self-status';
      pet.appendChild(dot);
    }
    pet.classList.add('has-self-status');
    dot.className = `xty-party-row-self-status ${state.key}`;
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', `สถานะของคุณ: ${state.label}`);
    dot.title = state.label;
  });
}

let queued = false;
function syncAll() {
  queued = false;
  syncCopy();
  stabilizeImages(document);
  syncHeroStatus();
  syncRowStatus();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(syncAll);
}

installStyle();
const home = document.getElementById('home');
if (home) new MutationObserver(schedule).observe(home, {
  childList: true, subtree: true, characterData: true,
});
window.addEventListener('pageshow', schedule);
window.addEventListener('focus', schedule);
document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
queueMicrotask(syncAll);
