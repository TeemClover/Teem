const API = '/api/auth';
const LAST_SYNC_KEY = 'teambook_account_last_sync';

let user = null;
let providers = { email: true, google: false, line: false };
let syncTimer = 0;
let dialog;
let previousFocus = null;

function addStyles() {
  if (document.querySelector('link[data-mc-account-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = '/assets/account.css?v=20260809'; link.dataset.mcAccountCss = '1';
  document.head.appendChild(link);
}

function storageGet(key, fallback = '') { try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }

function publishUser() {
  window.dispatchEvent(new CustomEvent('teambook:account-changed', { detail: { user } }));
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    const error = new Error(body.message || body.error || 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งครับ');
    error.status = response.status; error.info = body; throw error;
  }
  return body;
}

function currentSurfacePath() {
  return location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';
}

async function syncTeamBookState() {
  try {
    const account = await import('/_shared/account.js?v=20260820-teambook-account1');
    const result = await account.syncXtyProfile();
    window.dispatchEvent(new CustomEvent('teambook:synced', { detail: result }));
    return !result?.error;
  } catch {
    window.dispatchEvent(new CustomEvent('teambook:synced', { detail: { ok: false, error: 'TEAMBOOK_SYNC_ERROR' } }));
    return false;
  }
}

export async function syncProgress({ quiet = false } = {}) {
  if (!user) return false;
  try {
    const synced = await syncTeamBookState();
    storageSet(LAST_SYNC_KEY, new Date().toISOString());
    if (!quiet) toast(synced ? 'Progress ของ TeamBook Sync แล้ว ✓' : 'ยัง Sync ไม่สำเร็จ — ของในเครื่องยังอยู่ครบ');
    paintChip();
    return synced;
  } catch (error) {
    if (!quiet) toast('ยัง Sync ไม่สำเร็จ — Progress ในเครื่องยังอยู่ครบ');
    return false;
  }
}

function scheduleSync() {
  if (!user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncProgress({ quiet: true }), 1200);
}

function toast(message) {
  let node = document.querySelector('.mc-account-toast');
  if (!node) { node = document.createElement('div'); node.className = 'mc-account-toast'; node.setAttribute('role', 'status'); document.body.appendChild(node); }
  node.textContent = message; node.classList.add('show');
  clearTimeout(node._timer); node._timer = setTimeout(() => node.classList.remove('show'), 3600);
}

function oauthLink(provider) {
  const here = `${location.pathname}${location.search.replace(/([?&])account=[^&]*/g, '$1').replace(/[?&]$/, '')}${location.hash}`;
  return `${API}/oauth/${provider}/start?return=${encodeURIComponent(here)}`;
}

function memberHTML() {
  const last = storageGet(LAST_SYNC_KEY);
  return `<span class="mc-account-kicker">TEAMBOOK ACCOUNT</span>
    <h2>Progress ของคุณกลับบ้านแล้ว</h2>
    <div class="mc-account-member"><strong>${escapeHTML(user.displayName || 'สมาชิก')}</strong>
      <span>${escapeHTML(user.email || 'บัญชี LINE')}</span>${user.memberNo ? `<small>${escapeHTML(user.memberNo)}</small>` : ''}</div>
    <div class="mc-account-status">☁️ <span>${last ? `Sync ล่าสุด ${new Date(last).toLocaleString('th-TH')}` : 'กำลัง Sync ข้อมูลครั้งแรก…'}</span></div>
    <button type="button" class="mc-account-primary" data-account-sync>Sync ตอนนี้</button>
    <button type="button" class="mc-account-logout" data-account-logout>ออกจากระบบ</button>`;
}

function authHTML(mode) {
  const signup = mode !== 'login';
  return `<span class="mc-account-kicker">OPTIONAL CLOUD SAVE</span>
    <h2>${signup ? 'เก็บสมุดและการ์ดไว้ ไม่ให้หายตอนย้ายเครื่อง' : 'กลับมาเอา Progress ของ TeamBook คืน'}</h2>
    <p>${signup ? 'ไม่สมัครก็ใช้ต่อได้เหมือนเดิม บัญชี TeamBook มีไว้ Sync สมุด โปรไฟล์ และการ์ดของ TeamBook เท่านั้น' : 'Login แล้วระบบจะรวมข้อมูล TeamBook ในเครื่องนี้กับบัญชี TeamBook ของคุณ'}</p>
    <div class="mc-account-tabs" role="tablist">
      <button type="button" class="mc-account-tab" data-account-mode="signup" aria-selected="${signup}">สมัครสมาชิก</button>
      <button type="button" class="mc-account-tab" data-account-mode="login" aria-selected="${!signup}">เข้าสู่ระบบ</button>
    </div>
    <form class="mc-account-form" data-account-form="${signup ? 'signup' : 'login'}">
      ${signup ? '<div class="mc-account-field"><label for="mc-account-name">ชื่อที่ให้เราเรียก</label><input id="mc-account-name" name="name" maxlength="80" autocomplete="name" required></div>' : ''}
      <div class="mc-account-field"><label for="mc-account-email">อีเมล</label><input id="mc-account-email" name="email" type="email" maxlength="120" autocomplete="email" required></div>
      <div class="mc-account-field"><label for="mc-account-password">รหัสผ่าน <small>อย่างน้อย 8 ตัวอักษร</small></label><input id="mc-account-password" name="password" type="password" minlength="8" maxlength="128" autocomplete="${signup ? 'new-password' : 'current-password'}" required></div>
      ${signup ? '<label class="mc-account-consent"><input type="checkbox" name="consent" required><span>ยินยอมให้ TeamBook เก็บบัญชีและ Progress เพื่อเรียกคืนเมื่อ Login · <a href="/privacy/" target="_blank" rel="noopener">อ่านเรื่องข้อมูลของคุณ</a></span></label>' : ''}
      <button class="mc-account-primary" type="submit">${signup ? 'สร้างบัญชีและเก็บ Progress' : 'เข้าสู่ระบบและเรียก Progress คืน'}</button>
    </form>
    ${(providers.google || providers.line) ? `<div class="mc-account-divider">หรือใช้บัญชีที่มีอยู่แล้ว</div><div class="mc-account-providers">
      ${providers.line ? `<a class="mc-account-provider mc-account-provider--line" href="${oauthLink('line')}">LINE Login</a>` : ''}
      ${providers.google ? `<a class="mc-account-provider" href="${oauthLink('google')}">G&nbsp; Continue with Google</a>` : ''}
    </div><p class="mc-account-soft">การกด LINE หรือ Google คือการยินยอมให้เก็บบัญชีและ Progress ตามหน้าข้อมูลของคุณ</p>` : ''}
    <div class="mc-account-msg" role="status" aria-live="polite"></div>
    <button type="button" class="mc-account-skip" data-account-close>${signup ? 'ไว้ทีหลัง — เล่นต่อโดยเก็บในเครื่องนี้' : 'ปิดหน้าต่าง'}</button>`;
}

function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

function ensureDialog() {
  if (dialog) return dialog;
  const backdrop = document.createElement('div'); backdrop.className = 'mc-account-backdrop'; backdrop.hidden = true;
  backdrop.innerHTML = '<section class="mc-account-dialog" role="dialog" aria-modal="true" aria-labelledby="mc-account-title"><button type="button" class="mc-account-close" aria-label="ปิด" data-account-close>×</button><div data-account-body></div></section>';
  document.body.appendChild(backdrop); dialog = backdrop;
  backdrop.addEventListener('click', event => { if (event.target === backdrop || event.target.closest('[data-account-close]')) close(); });
  backdrop.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); return; }
    if (event.key !== 'Tab') return;
    const nodes = [...backdrop.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')].filter(node => !node.hidden);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  return backdrop;
}

export function open(mode = 'signup') {
  const backdrop = ensureDialog();
  if (backdrop.hidden) previousFocus = document.activeElement;
  backdrop.querySelector('[data-account-body]').innerHTML = user ? memberHTML() : authHTML(mode);
  backdrop.hidden = false; document.body.style.overflow = 'hidden';
  const title = backdrop.querySelector('h2'); if (title) title.id = 'mc-account-title';
  const focus = backdrop.querySelector('input,button'); if (focus) setTimeout(() => focus.focus(), 20);
}

export function close() {
  if (!dialog) return;
  dialog.hidden = true; document.body.style.overflow = '';
  if (previousFocus && previousFocus.focus) previousFocus.focus();
}

async function submitAuth(form) {
  const button = form.querySelector('button[type="submit"]'); const message = dialog.querySelector('.mc-account-msg');
  const data = Object.fromEntries(new FormData(form));
  if (String(data.password || '').length < 8) { message.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'; return; }
  button.disabled = true; message.textContent = 'กำลังเปิดหีบ Save…';
  try {
    const result = await api(`${API}/${form.dataset.accountForm}`, { method: 'POST', body: JSON.stringify({
      name: data.name || '', email: data.email || '', password: data.password || '', consent: data.consent === 'on',
    }) });
    user = result.user; publishUser(); await syncProgress({ quiet: true }); paintChip(); open();
    toast('เรียบร้อย — Progress ในเครื่องถูกผูกกับบัญชีแล้ว ✓');
  } catch (error) { message.textContent = error.message; button.disabled = false; }
}

async function logout() {
  try { await api(`${API}/logout`, { method: 'POST', body: '{}' }); } catch { /* clear UI anyway */ }
  user = null; publishUser(); close(); paintChip(); toast('ออกจากระบบแล้ว — Progress ในเครื่องนี้ยังอยู่ครบ');
}

function bindEvents() {
  document.addEventListener('click', event => {
    const mode = event.target.closest('[data-account-mode]');
    if (mode) { open(mode.dataset.accountMode); return; }
    if (event.target.closest('[data-account-open]')) { open(event.target.closest('[data-account-open]').dataset.accountOpen || 'signup'); return; }
    if (event.target.closest('[data-account-sync]')) { syncProgress(); return; }
    if (event.target.closest('[data-account-logout]')) logout();
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-account-form]');
    if (form) { event.preventDefault(); submitAuth(form); }
  });
  window.addEventListener('focus', scheduleSync);
  window.addEventListener('online', scheduleSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync();
  });
}

function showAccountChip() {
  const path = currentSurfacePath();
  return path === '/profile' || path === '/collection';
}

function paintChip() {
  let chip = document.querySelector('.mc-account-chip');
  if (!showAccountChip()) {
    if (chip) chip.remove();
    return;
  }
  if (!chip) { chip = document.createElement('button'); chip.type = 'button'; chip.className = 'mc-account-chip'; chip.dataset.accountOpen = 'login'; document.body.appendChild(chip); }
  chip.dataset.state = user ? 'member' : 'guest';
  chip.textContent = '☁️SAVE';
  chip.setAttribute('aria-label', user ? `เปิด SAVE ของ ${user.displayName || 'ฉัน'}` : 'เปิด SAVE เพื่อสมัครหรือเข้าสู่ระบบ');
}

async function boot() {
  addStyles(); bindEvents();
  try {
    const [session, available] = await Promise.all([api(`${API}/session`), api(`${API}/providers`)]);
    user = session.user || null; providers = available.providers || providers;
  } catch { user = null; }
  publishUser();
  paintChip();
  if (user) {
    const lastSync = Date.parse(storageGet(LAST_SYNC_KEY));
    if (!Number.isFinite(lastSync) || Date.now() - lastSync > 15000) await syncProgress({ quiet: true });
    if (new URLSearchParams(location.search).get('account') === 'connected') toast('Login สำเร็จ — ของที่เคยเก็บกลับมาครบแล้ว ✓');
  }
  const accountState = new URLSearchParams(location.search).get('account');
  if (accountState === 'oauth_error') { open('login'); const msg = dialog.querySelector('.mc-account-msg'); if (msg) msg.textContent = 'เชื่อมบัญชีไม่สำเร็จ ลองใหม่อีกครั้งครับ'; }
  if (accountState === 'rate_limited') { open('login'); const msg = dialog.querySelector('.mc-account-msg'); if (msg) msg.textContent = 'ลองเชื่อมบัญชีถี่เกินไป รออีกสักครู่นะครับ'; }
  if (accountState && history.replaceState) {
    const cleanURL = new URL(location.href); cleanURL.searchParams.delete('account');
    history.replaceState(null, '', `${cleanURL.pathname}${cleanURL.search}${cleanURL.hash}`);
  }
  window.dispatchEvent(new CustomEvent('teambook:account-ready', { detail: { user } }));
}

window.TEAMBOOK_ACCOUNT = { open, close, syncProgress, get user() { return user; } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
