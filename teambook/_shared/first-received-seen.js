import { getParty, partyIdentity } from './store.js';

const code = new URLSearchParams(location.search).get('c') || '';
const KEY_PREFIX = 'teambook_first_received_seen_welcome_v1';

if (/^\d{5}$/.test(code) && /^\/p\/?$/.test(location.pathname)) install();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
}

function seenKey() {
  return `${KEY_PREFIX}:${code}`;
}

function alreadyShown() {
  try { return localStorage.getItem(seenKey()) === '1'; } catch { return false; }
}

function rememberShown() {
  try { localStorage.setItem(seenKey(), '1'); } catch {}
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || navigator.standalone === true;
}

function deviceGuide() {
  const ua = navigator.userAgent || '';
  const inApp = /Line\//i.test(ua) || /FBAN|FBAV|Instagram|Messenger/i.test(ua);
  if (isStandalone()) {
    return {
      title: 'TeamBook อยู่หน้า Home แล้ว ✓',
      body: 'เปิดจากไอคอนนี้วันละครั้งก็พอ · กลับมาเขียนของคุณ แล้วแวะเห็นสิ่งที่เพื่อนทำ',
    };
  }
  if (inApp) {
    return {
      title: 'เก็บ TeamBook ไว้ใกล้มือ',
      body: 'ถ้าเปิดจาก LINE หรือแอพอื่น ให้เปิดเมนู … แล้วเลือก “เปิดใน Safari/Chrome” ก่อน จากนั้นเพิ่ม TeamBook ไปที่หน้าจอ Home',
    };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return {
      title: 'เพิ่ม TeamBook เป็นไอคอนบน Home',
      body: 'แตะ แชร์ ↑ ในเบราว์เซอร์ → “เพิ่มไปยังหน้าจอโฮม” · แล้วกลับมาหากันได้ง่ายทุกวัน',
    };
  }
  if (/Android/i.test(ua)) {
    return {
      title: 'เพิ่ม TeamBook ไว้บนหน้าจอหลัก',
      body: 'แตะเมนู ⋮ ของเบราว์เซอร์ → “เพิ่มไปยังหน้าจอหลัก” หรือ “ติดตั้งแอป” ถ้ามีตัวเลือกนี้',
    };
  }
  const shortcut = /Macintosh|Mac OS X/i.test(ua) ? '⌘D' : 'Ctrl+D';
  return {
    title: 'เก็บ TeamBook ไว้ใน Favorite',
    body: `กด ${shortcut} เพื่อบันทึก Bookmark/Favorite · ครั้งหน้าจะกลับมาที่สมุดได้ทันที`,
  };
}

function firstReceivedSeen(party) {
  if (!party) return null;
  const myId = partyIdentity(code)?.userId;
  if (!myId) return null;
  const posts = (party.log || [])
    .filter(post => post.kind === 'commit' && !post.retracted && post.userId === myId && post.confirmedBy)
    .sort((a, b) => {
      const aAt = new Date(a.confirmedAt || a.sentAt || 0).getTime();
      const bAt = new Date(b.confirmedAt || b.sentAt || 0).getTime();
      return aAt - bAt;
    });
  if (!posts.length) return null;
  const post = posts[0];
  if (String(post.confirmedBy).startsWith('public:')) {
    return { post, title: 'ใครบางคนนอกสมุด มองเห็นสิ่งที่คุณทำแล้ว' };
  }
  const members = party.memberHistory?.length ? party.memberHistory : party.members || [];
  const confirmer = members.find(member => member.userId === post.confirmedBy);
  return { post, title: `${confirmer?.alias || 'เพื่อนในสมุด'} เห็นสิ่งที่คุณทำแล้ว` };
}

function installStyle() {
  if (document.getElementById('tbFirstReceivedSeenStyle')) return;
  const style = document.createElement('style');
  style.id = 'tbFirstReceivedSeenStyle';
  style.textContent = `
    .tb-seen-welcome{position:fixed;inset:0;z-index:220;display:grid;place-items:center;padding:18px;background:rgba(39,31,22,.42);backdrop-filter:blur(5px)}
    .tb-seen-welcome[hidden]{display:none}
    .tb-seen-card{width:min(100%,480px);max-height:min(760px,calc(100dvh - 36px));overflow:auto;border:1px solid var(--xty-border);border-radius:24px;background:#fffaf0;box-shadow:0 22px 70px rgba(38,27,13,.24);padding:22px}
    .tb-seen-mark{width:64px;height:64px;display:grid;place-items:center;border-radius:50%;margin:0 auto 14px;background:rgba(85,181,106,.14);border:2px solid rgba(85,181,106,.45);font-size:32px}
    .tb-seen-card .kicker{text-align:center;margin-bottom:7px}.tb-seen-card h2{text-align:center;margin:0;font-size:clamp(24px,7vw,32px);line-height:1.22}
    .tb-seen-lede{text-align:center;font-size:15px;line-height:1.7;margin:12px auto 18px;max-width:38ch;color:var(--xty-muted)}
    .tb-home-guide{border-left:4px solid var(--xty-green);border-radius:14px;background:rgba(85,181,106,.08);padding:14px 15px;margin:16px 0}
    .tb-home-guide b{display:block;margin-bottom:5px}.tb-home-guide p{margin:0;color:var(--xty-muted);font-size:13.5px;line-height:1.65}
    .tb-seen-card .btn{width:100%;margin-top:6px}
    @media(max-width:480px){.tb-seen-welcome{padding:12px}.tb-seen-card{padding:19px;border-radius:20px}}
  `;
  document.head.appendChild(style);
}

function showWelcome(title) {
  rememberShown();
  installStyle();
  const guide = deviceGuide();
  const overlay = document.createElement('div');
  overlay.className = 'tb-seen-welcome';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tbSeenWelcomeTitle');
  overlay.innerHTML = `
    <div class="tb-seen-card">
      <div class="tb-seen-mark" aria-hidden="true">◎</div>
      <p class="kicker">เห็นกันแล้ว · ครั้งแรกในสมุดนี้</p>
      <h2 id="tbSeenWelcomeTitle">${esc(title)}</h2>
      <p class="tb-seen-lede">นี่คือหัวใจของ TeamBook — ไม่ต้องคุยกันทั้งวัน แค่กลับมาเขียนของเรา และเห็นกันวันละนิด</p>
      <div class="tb-home-guide">
        <b>${esc(guide.title)}</b>
        <p>${esc(guide.body)}</p>
      </div>
      <button class="btn gold" type="button" data-close-seen-welcome>โอเค · กลับมาเห็นกันพรุ่งนี้</button>
    </div>`;
  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };
  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('[data-close-seen-welcome]')) close();
  });
  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.querySelector('button')?.focus());
}

function maybeShow() {
  if (alreadyShown() || document.querySelector('.tb-seen-welcome')) return;
  const found = firstReceivedSeen(getParty(code));
  if (found) showWelcome(found.title);
}

function install() {
  /* No polling and no extra API request. We only inspect the snapshot that
     the notebook already refreshes on open, foreground and manual refresh. */
  [500, 1400, 3000].forEach(delay => setTimeout(maybeShow, delay));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(maybeShow, 900);
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#refresh')) setTimeout(maybeShow, 1500);
  }, true);
}
