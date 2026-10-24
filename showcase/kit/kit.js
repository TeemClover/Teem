/**
 * Shared runtime for the showcase demos. No dependencies, no network calls.
 *
 * The "bus" ties one fictional business together across its demos: an order placed in the
 * shop, the QR menu or the LINE OA demo is written to localStorage under that business, and the
 * ERP demo (in this or another tab) reads it live. Nothing leaves the visitor's browser and the
 * demos never ask for personal data, so nothing personal is stored.
 */
import {art} from './art.js';

export {art};
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const money = (n, unit = '฿') => { const v = Math.round(Number(n) || 0); return (v < 0 ? '−' : '') + unit + Math.abs(v).toLocaleString('th-TH'); };
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const sleep = ms => new Promise(r => setTimeout(r, reduced() ? Math.min(ms, 60) : ms));

/** read the page's inline JSON (written by the generator) */
export function data() {
  return JSON.parse(document.getElementById('sc-data').textContent);
}

/** delegate: on(root, 'click', '[data-act]', (el, ev) => …) */
export function on(root, type, selector, fn) {
  root.addEventListener(type, ev => {
    const el = ev.target.closest(selector);
    if (el && root.contains(el)) fn(el, ev);
  });
}

/** an illustration or, when the generator found a photo, the photo */
export function pic(item, {label = '', eager = false} = {}) {
  if (item.img) return `<img src="${esc(item.img)}" alt="${esc(label)}" width="800" height="800" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
  return art(item.art || {}, {label, uid: 'p' + String(item.id || Math.random()).replace(/[^a-z0-9]/gi, '')});
}

export const ICON = {
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  home: '<path d="M4 11.5 12 5l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  truck: '<path d="M2 6h11v10H2zM13 10h4l4 3v3h-8z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 4 6"/>',
  doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
  pos: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/>',
  chef: '<path d="M7 14a4 4 0 1 1 1.5-7.7A4 4 0 0 1 16 6a4 4 0 1 1 1 8v6H7z"/><path d="M7 17h10"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8S9 3 6.5 4.5 8 8 12 8zM12 8s3-5 5.5-3.5S16 8 12 8z"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>',
};
export const icon = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ''}</svg>`;

/* ---------------------------------------------------------------- the bus */
const EMPTY = () => ({orders: [], bookings: [], moves: [], po: [], calls: [], marks: {}, seq: 0});
export function bus(biz) {
  const key = `myclover-showcase:v1:${biz}`;
  const listeners = new Set();
  let memory = EMPTY();
  const read = () => {
    try { const raw = localStorage.getItem(key); return raw ? {...EMPTY(), ...JSON.parse(raw)} : memory; } catch { return memory; }
  };
  const write = state => {
    memory = state;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* private mode: keep in memory */ }
    listeners.forEach(fn => fn(state, 'local'));
  };
  addEventListener('storage', e => { if (e.key === key) listeners.forEach(fn => fn(read(), 'remote')); });
  return {
    key,
    get: read,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** add a record; returns it with id, at and a running number */
    add(kind, rec) {
      const s = read();
      s.seq = (s.seq || 0) + 1;
      const item = {id: rec.id || `${kind[0]}${Date.now().toString(36)}${s.seq}`, at: Date.now(), n: s.seq, ...rec};
      s[kind] = [...(s[kind] || []), item];
      write(s);
      return item;
    },
    patch(kind, id, patch) {
      const s = read();
      s[kind] = (s[kind] || []).map(r => r.id === id ? {...r, ...patch, updated: Date.now()} : r);
      write(s);
    },
    /** change several things at once: mutate(s => { s.marks[id] = 'done'; }) */
    mutate(fn) { const s = read(); fn(s); write(s); return s; },
    reset() { write(EMPTY()); },
  };
}

/** a readable order number: KHD-241024-0042 (history) or KHD-241024-W007 (placed in a demo; W web, Q QR, L LINE, P POS) */
export const CH_LETTER = {web: 'W', qr: 'Q', line: 'L', pos: 'P', market: 'M', live: 'V', b2b: 'B', delivery: 'D'};
export function orderNo(code, n, at = Date.now(), channel = '') {
  const d = new Date(at);
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const letter = CH_LETTER[channel] || '';
  return `${code}-${ymd}-${letter}${String(n).padStart(letter ? 3 : 4, '0')}`;
}

export function ago(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'เมื่อสักครู่';
  if (s < 3600) return `${Math.round(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.round(s / 3600)} ชม.ที่แล้ว`;
  return `${Math.round(s / 86400)} วันที่แล้ว`;
}
export const hhmm = ts => new Date(ts).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'});
export const dayLabel = ts => new Date(ts).toLocaleDateString('th-TH', {weekday: 'short', day: 'numeric', month: 'short'});

/** deterministic random numbers, so the made-up history looks the same on every visit */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------------------------------------------------------------- UI bits */
let toastEl, toastTimer;
export function toast(html, ms = 3200) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.append(toastEl); }
  toastEl.innerHTML = html;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}

/** a modal sheet built on <dialog>: focus trap, Esc and backdrop close come with it */
export function sheet({title = '', body = '', foot = '', side = false, label = ''} = {}) {
  const d = document.createElement('dialog');
  d.className = 'sheet' + (side ? ' side' : '');
  d.setAttribute('aria-label', label || title);
  d.innerHTML = `<div class="sheet-head"><h2>${title}</h2><button class="sheet-x" type="button" data-close aria-label="ปิด">×</button></div><div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}`;
  document.body.append(d);
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  d.addEventListener('close', () => d.remove());
  d.showModal();
  return {
    el: d,
    body: d.querySelector('.sheet-body'),
    foot: d.querySelector('.sheet-foot'),
    set(html) { d.querySelector('.sheet-body').innerHTML = html; },
    setFoot(html) { const f = d.querySelector('.sheet-foot'); if (f) f.innerHTML = html; },
    setTitle(html) { d.querySelector('.sheet-head h2').innerHTML = html; },
    close() { d.close(); },
  };
}

/** apply ?param overrides like ?order=ID or ?view=kitchen */
export const param = name => new URLSearchParams(location.search).get(name);
