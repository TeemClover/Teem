/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Shared UI Shell
   Nav / Footer / Toast / helper เล็ก ๆ ที่ทุกหน้าใช้ร่วมกัน
   ═══════════════════════════════════════════════════════════════ */
import { cloverLogo } from './art.js';
import { isMuted, toggleMuted } from './audio.js';

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

/* ── Nav + Footer ── */
export function renderShell({ active = '', minimal = false } = {}) {
  const onCore7Home = location.pathname === '/core7/' || location.pathname === '/core7/index.html';
  const logoHref = onCore7Home ? '/' : '/core7/';
  const nav = $('#c7nav');
  if (nav) {
    nav.innerHTML = `
      <div class="wrap bar">
        <a class="logo" href="${logoHref}" aria-label="${onCore7Home ? 'กลับหน้าแรก myClover' : 'กลับหน้าแรก CORE7'}">
          ${cloverLogo(30)}
          <span>my<em>Clover</em>&thinsp;· CORE7</span>
        </a>
        ${minimal ? '' : `
        <div class="links">
          <a href="/core7/rules/" ${active === 'rules' ? 'aria-current="page"' : ''}>กติกา</a>
          <a href="/core7/collection/" ${active === 'collection' ? 'aria-current="page"' : ''}>Collection</a>
          <a href="/core7/rank/" ${active === 'rank' ? 'aria-current="page"' : ''}>Ranking</a>
          <a href="/core7/profile/" ${active === 'profile' ? 'aria-current="page"' : ''}>โปรไฟล์</a>
          <a class="play keep" href="/core7/play/">เล่นเลย</a>
          <button class="sfx-toggle" id="c7Sfx" aria-label="เปิดหรือปิดเสียงเอฟเฟกต์"></button>
        </div>`}
      </div>`;
    const sound = $('#c7Sfx');
    if (sound) {
      const sync = () => { sound.textContent = isMuted() ? '🔇' : '🔊'; sound.title = isMuted() ? 'เปิดเสียง' : 'ปิดเสียง'; };
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
          <strong class="disp">myClover: CORE7 <small>v0.4.2</small></strong> — 7 ใบ ไม่มีเด็ค ไม่มีดวง<br>
          เล่นฟรีด้วยการ์ดอะไรก็ได้ · <a href="/core7/open-play/">Open Play</a> · <a href="/core7/about/">เรื่องของเกมนี้</a>
        </div>
        <div>
          <a href="/core7/rules/">กติกา</a> · <a href="/core7/print/">Print</a> ·
          <a href="/">กลับบ้าน myclover</a>
        </div>
      </div>`;
  }
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
