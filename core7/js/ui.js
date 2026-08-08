/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Shared UI Shell
   Nav / Footer / Toast / helper เล็ก ๆ ที่ทุกหน้าใช้ร่วมกัน
   ═══════════════════════════════════════════════════════════════ */
import { cloverLogo } from './art.js';
import { isMuted, toggleMuted } from './audio.js';
import { reportCore7View, CORE7_GAME_VERSION } from './analytics.js';
import { applyLang, getLang, setLang, t } from './i18n.js';
import { notifyFirstHandCardReceived } from '/assets/sauce-proof.js';
/* หน้าฝั่งเกมไม่ได้โหลด /assets/track.js (มันพ่วงโมดูลของบทเรียนมาอีกยี่สิบตัว
   ซึ่งไม่เกี่ยวกับเกมเลย) ตัวรายงาน Journey จึงต้องเข้ามาทางนี้แทน
   ไม่งั้นขั้นที่เกิดในเกม เช่น LOADOUT_VIEW จะไม่มีวันถูกนับ */
import '/assets/stat-report.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

/* FIRST HAND reward is created after the result page loads. Listen in the
   shared shell so both bot and online result flows use the same one-time
   Sauce → Kickstarter handoff without coupling it to the reward UI itself. */
if (typeof document !== 'undefined' && /\/core7\/result\/?$/.test(location.pathname)) {
  document.addEventListener('click', event => {
    const close = event.target?.closest?.('#c7Reward [data-close]');
    const reward = close?.closest?.('#c7Reward');
    if (!reward || reward.dataset.revealed !== 'true') return;
    window.setTimeout(notifyFirstHandCardReceived, 120);
  }, true);

  /* Result page = game information only.
     First-time players only know the four colours, so do not interrupt the
     post-match read with card-personality prompts, collection unlocks,
     membership pitches or social-share CTAs. Keep the existing DOM in place
     for compatibility with legacy result code, but make these retired layers
     impossible to surface even if old JS toggles `hidden` later. */
  const resultFocus = document.createElement('style');
  resultFocus.id = 'c7-result-game-only';
  resultFocus.textContent = `
    #timeline + h2[data-en="Talk it over"],
    #timeline + h2[data-en="Talk it over"] + p,
    .wrap-slim > .prompt-card,
    #nightUnlock,
    #signup,
    #actions > .btn-dark {
      display: none !important;
    }
  `;
  document.head.append(resultFocus);
}

/* ── Nav + Footer ── */
export function renderShell({ active = '', minimal = false } = {}) {
  reportCore7View().catch(() => {});
  /* เลขเวอร์ชันมีที่มาที่เดียวคือ CORE7_GAME_VERSION — หน้าไหนอยากโชว์ก็แค่ใส่
     <span data-c7-version> ไว้ จะได้ไม่มีเลขค้างคนละตัวเหมือนที่ผ่านมา */
  for (const node of $$('[data-c7-version]')) node.textContent = `v${CORE7_GAME_VERSION}`;
  const onCore7Home = location.pathname === '/core7/' || location.pathname === '/core7/index.html';
  /* ในเกมโลโก้พากลับหน้าแรกของเกม แต่พอยืนอยู่หน้าแรกของเกมแล้ว การกดอีกทีคือ
     "ออกจากเกม" ซึ่งปลายทางคือเข็มทิศของบ้าน ไม่ใช่ประตูหน้าบ้าน —
     เข็มทิศรู้ว่าคนนี้ค้างอยู่ตรงไหน ส่วนประตูเริ่มนับหนึ่งใหม่ทุกครั้ง */
  const logoHref = onCore7Home ? '/hall.html#quest' : '/core7/';
  const mobileNav = window.matchMedia?.('(max-width: 720px)').matches;
  const playShortcut = mobileNav
    ? ''
    : '<a class="play keep" href="/core7/play/" data-en="Play">เล่นเลย</a>';
  const nav = $('#c7nav');
  if (nav) {
    nav.innerHTML = `
      <div class="wrap bar">
        <a class="logo" href="${logoHref}" aria-label="${onCore7Home ? 'กลับไปที่เข็มทิศของบ้าน myClover' : 'กลับหน้าแรก CORE7'}" data-en-attr="aria-label:${onCore7Home ? 'Back to the myClover compass' : 'Back to the CORE7 home page'}">
          ${cloverLogo(30)}
          <span>my<em>Clover</em>&thinsp;· CORE7</span>
        </a>
        ${minimal ? '' : `
        <div class="links">
          <a href="/core7/rules/" data-en="Rules" ${active === 'rules' ? 'aria-current="page"' : ''}>กติกา</a>
          <a href="/core7/collection/" ${active === 'collection' ? 'aria-current="page"' : ''}>Collection</a>
          <a href="/core7/rank/" ${active === 'rank' ? 'aria-current="page"' : ''}>Ranking</a>
          <a href="/core7/profile/" data-en="Profile" ${active === 'profile' ? 'aria-current="page"' : ''}>โปรไฟล์</a>
          ${playShortcut}
          <div class="lang-sw" role="group" aria-label="Language / ภาษา">
            <button type="button" data-lang="th">TH</button><button type="button" data-lang="en">EN</button>
          </div>
          <button class="sfx-toggle" id="c7Sfx" aria-label="เปิดหรือปิดเสียงเอฟเฟกต์"
            data-en-attr="aria-label:Toggle sound effects"></button>
        </div>`}
      </div>`;
    /* ปุ่มภาษาอยู่มุมขวาบนของทุกหน้าในเกม จำค่าไว้ใน localStorage
       เปลี่ยนหน้าไหนก็ตาม หน้าถัดไปขึ้นภาษาเดิมทันที */
    const langSw = $('.lang-sw');
    if (langSw) {
      const paint = () => {
        const now = getLang();
        for (const b of $$('button', langSw)) {
          b.setAttribute('aria-pressed', String(b.dataset.lang === now));
        }
      };
      langSw.addEventListener('click', event => {
        const btn = event.target.closest('button[data-lang]');
        if (btn) { setLang(btn.dataset.lang); paint(); }
      });
      window.addEventListener('core7:lang', paint);
      paint();
    }

    const sound = $('#c7Sfx');
    if (sound) {
      const sync = () => {
        sound.textContent = isMuted() ? '🔇' : '🔊';
        sound.title = isMuted() ? t('เปิดเสียง', 'Turn sound on') : t('ปิดเสียง', 'Turn sound off');
      };
      sync();
      sound.addEventListener('click', () => { toggleMuted(); sync(); });
      window.addEventListener('core7:mute', sync, { once: true });
    }
  }
  const foot = $('#c7foot');
  if (foot) {
    foot.innerHTML = `
      <div class="wrap cols">
        <div>
          <strong class="disp">myClover: CORE7 <small>v${CORE7_GAME_VERSION}</small></strong> <span data-en="— 7 cards. No deck. No luck.">— 7 ใบ ไม่มีเด็ค ไม่มีดวง</span><br>
          <span data-en="Free to play with any cards">เล่นฟรีด้วยการ์ดอะไรก็ได้</span> · <a href="/core7/open-play/">Open Play</a> · <a href="/core7/about/" data-en="The story behind it">เรื่องของเกมนี้</a>
        </div>
        <div>
          <a href="/core7/rules/" data-en="Rules">กติกา</a> · <a href="/core7/print/">Print</a> ·
          <a href="/" data-en="Back to myclover">กลับบ้าน myclover</a>
        </div>
      </div>`;
  }
  /* ทาภาษาให้ทั้งหน้าหลังวาด nav/footer เสร็จ */
  applyLang();
}

/* ── Toast ── */
let toastTimer = null;
export function toast(msg, ms = 2600) {
  let t = $('#c7toast');
  if (!t) {
    t = el('div', { id: 'c7toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ── Modal ── */
export function modal(contentNode, { closable = true } = {}) {
  const back = el('div', { class: 'modal-back' });
  const box = el('div', { class: 'modal anim-pop', role: 'dialog', 'aria-modal': 'true' });
  box.append(contentNode);
  back.append(box);
  const close = () => back.remove();
  if (closable) {
    back.addEventListener('click', e => { if (e.target === back) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }
  document.body.append(back);
  return { close, box };
}

/* ── Room code / share helpers ── */
export function newRoomCode() {
  const values = new Uint16Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 10000).padStart(4, '0');
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = el('textarea', { style: 'position:fixed;opacity:0' });
    ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); return true; }
    catch { return false; }
    finally { ta.remove(); }
  }
}

/* ── URL param / path segment ── */
export function pathSegment(afterDir) {
  /* /core7/room/0042/ → '0042' — รองรับทั้ง path และ ?c= */
  const parts = location.pathname.split('/').filter(Boolean);
  const i = parts.indexOf(afterDir);
  if (i >= 0 && parts[i + 1] && parts[i + 1] !== 'index.html') {
    return decodeURIComponent(parts[i + 1]);
  }
  return new URLSearchParams(location.search).get('c')
    || new URLSearchParams(location.search).get('id') || '';
}

/* ── Haptic (ถ้ารองรับ) ── */
export function haptic(pattern = 12) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* ok */ }
}

export const reducedMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;