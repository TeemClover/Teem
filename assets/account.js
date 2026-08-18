const API = '/api/auth';
/* v2 deliberately ignores the old flag: that version could be written by an
   incorrect Home-page popup before the player ever reached card 14. */
const PROMPT_KEY = 'mc_account_prompt_first_hand_14_reward_v2';
const LAST_SYNC_KEY = 'mc_account_last_sync';
const OWNER_KEY = 'mc_account_progress_owner';
const EXCLUDED = [
  /^c7:match_/, /^c7roomtoken:/, /^mc_account_/, /^mc_collection_seen$/,
  /^c7:current_match$/, /^c7:install_id$/, /^c7tab_pid$/, /^mc_(email|name|nick|line|registered)$/,
  /* XTY has its own lossless merge rules for cards/profile ids/party recovery.
     Never let the generic shallow Progress merger touch XTY save data. */
  /^mc_xty_/,
];

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
  if (user && user.memberNo) storageSet('mc_member', user.memberNo);
  window.dispatchEvent(new CustomEvent('mc:account-changed', { detail: { user } }));
}

function allowedKey(key) {
  return (key === 'xircle.local.v1' || key.startsWith('mc_') || key.startsWith('mc-') || key.startsWith('c7:')) &&
    !EXCLUDED.some(pattern => pattern.test(key));
}

export function localProgress() {
  const progress = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !allowedKey(key)) continue;
      const value = localStorage.getItem(key);
      if (typeof value === 'string' && value.length <= 120000) progress[key] = value;
    }
  } catch { /* private mode */ }
  return progress;
}

function clearDeviceProgress() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && allowedKey(key)) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch { /* private mode */ }
}

function parseMaybe(value) { try { return JSON.parse(value); } catch { return null; } }
function union(a, b) { return [...new Set([...a, ...b].filter(value => typeof value === 'string'))]; }
function mergeObject(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return union(a, b);
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = { ...a };
    for (const [key, value] of Object.entries(b)) {
      if (typeof value === 'number' && typeof out[key] === 'number') out[key] = Math.max(out[key], value);
      else if (typeof value === 'boolean' && typeof out[key] === 'boolean') out[key] = out[key] || value;
      else out[key] = value;
    }
    return out;
  }
  return b;
}
function mergeValue(key, cloud, local) {
  if (local === undefined) return cloud;
  if (cloud === undefined) return local;
  if (local === '1' || cloud === '1') return '1';
  if (key === 'mc_read' || key === 'mc_learn') return union(cloud.split(',').filter(Boolean), local.split(',').filter(Boolean)).join(',');
  const a = parseMaybe(cloud), b = parseMaybe(local);
  if (a !== null && b !== null) return JSON.stringify(mergeObject(a, b));
  const an = Number(cloud), bn = Number(local);
  if (Number.isFinite(an) && Number.isFinite(bn) && cloud !== '' && local !== '') return String(Math.max(an, bn));
  return local;
}

const DUNGEON_SYNC_KEEP = new Set([
  'mc_awaken_reset_epoch','mc_awaken_reset_pending','mc_awaken_reset_count','mc_awaken_current_run_epoch',
  'mc_mini_achievements_v1','mc_dungeon_cleared_v1','mc_dungeon_awakened_v1',
  'mc_nb_seen_ever_v1','mc_nb_restored_ever_v1','mc_secret_end_ever_v1','mc_titles'
]);
function dungeonRunProgressKey(key) {
  if (!key || DUNGEON_SYNC_KEEP.has(key)) return false;
  return key === 'mc_dungeon_state_v2' || key === 'mc_secret_end' ||
    key === 'mc_dungeon_reset_requested' || key === 'mc_dungeon_reset_v1' ||
    key === 'mc_platinum_trophy' || key.startsWith('mc_nb_') ||
    key.startsWith('mc_ch7_') || key.startsWith('mc_awaken_');
}
function progressEpoch(progress) {
  const n = Number(progress && progress.mc_awaken_reset_epoch || 0);
  return Number.isFinite(n) ? n : 0;
}
export function mergeIntoDevice(cloud) {
  const local = localProgress();
  const cloudEpoch = progressEpoch(cloud), localEpoch = progressEpoch(local);
  const keys = new Set([...Object.keys(cloud || {}), ...Object.keys(local)]);
  const merged = {};
  for (const key of keys) {
    if (!allowedKey(key)) continue;
    if (dungeonRunProgressKey(key) && localEpoch !== cloudEpoch) {
      const source = localEpoch > cloudEpoch ? local : (cloud || {});
      const value = source[key];
      if (value === undefined) {
        try { localStorage.removeItem(key); } catch { /* private mode */ }
        continue;
      }
      merged[key] = value;
      storageSet(key, value);
      continue;
    }
    merged[key] = mergeValue(key, cloud && cloud[key], local[key]);
    storageSet(key, merged[key]);
  }
  return merged;
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

async function syncXtyProgressIfPresent() {
  const path = currentSurfacePath();
  if (path !== '/profile' && path !== '/xty/collection') return true;
  try {
    const xty = await import('/xty/_shared/account.js?v=20260818-account-bridge1');
    const result = await xty.syncXtyProfile();
    window.dispatchEvent(new CustomEvent('mc:xty-synced', { detail: result }));
    return !result?.error;
  } catch {
    window.dispatchEvent(new CustomEvent('mc:xty-synced', { detail: { ok: false, error: 'XTY_SYNC_ERROR' } }));
    return false;
  }
}

export async function syncProgress({ quiet = false } = {}) {
  if (!user) return false;
  try {
    const cloud = await api('/api/progress');
    const previousOwner = storageGet(OWNER_KEY);
    if (previousOwner && previousOwner !== user.id) clearDeviceProgress();
    const merged = mergeIntoDevice(cloud.progress || {});
    await api('/api/progress', { method: 'PUT', body: JSON.stringify({ progress: merged }) });
    const xtySynced = await syncXtyProgressIfPresent();
    storageSet(OWNER_KEY, user.id);
    storageSet(LAST_SYNC_KEY, new Date().toISOString());
    if (!quiet) toast(xtySynced ? 'Progress จากเครื่องนี้และบัญชีถูกรวมกันแล้ว ✓' : 'Progress หลัก Sync แล้ว · XTY จะลองใหม่อีกครั้ง โดยของในเครื่องยังอยู่ครบ');
    paintChip();
    return xtySynced;
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

function pushOnLeave() {
  if (!user) return;
  try {
    fetch('/api/progress', { method: 'PUT', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: localProgress() }) });
  } catch { /* next page load will retry */ }
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
  return `<span class="mc-account-kicker">MYCLOVER ACCOUNT</span>
    <h2>Progress ของคุณกลับบ้านแล้ว</h2>
    <div class="mc-account-member"><strong>${escapeHTML(user.displayName || 'Clover')}</strong>
      <span>${escapeHTML(user.email || 'บัญชี LINE')}</span>${user.memberNo ? `<small>${escapeHTML(user.memberNo)}</small>` : ''}</div>
    <div class="mc-account-status">☁️ <span>${last ? `Sync ล่าสุด ${new Date(last).toLocaleString('th-TH')}` : 'กำลัง Sync ข้อมูลครั้งแรก…'}</span></div>
    <button type="button" class="mc-account-primary" data-account-sync>Sync ตอนนี้</button>
    <button type="button" class="mc-account-logout" data-account-logout>ออกจากระบบ</button>`;
}

function authHTML(mode) {
  const signup = mode !== 'login';
  const trigger14 = mode === 'signup14';
  return `<span class="mc-account-kicker">OPTIONAL CLOUD SAVE</span>
    <h2>${signup ? (trigger14 ? 'FIRST HAND ครบ 14 ใบแล้ว — เก็บไว้ไหม?' : 'เก็บของที่ปลดไว้ ไม่ให้หายตอนย้ายเครื่อง') : 'กลับมาเอา Progress ของคุณคืน'}</h2>
    <p>${signup ? (trigger14 ? 'การ์ด myClover: FIRST HAND ที่คุณสะสมมาครึ่งสำรับจะอยู่ในเครื่องนี้เท่านั้น สมัครเพื่อสำรองการ์ดและ Progress ไว้ แต่กดข้ามแล้วเล่นต่อได้เหมือนเดิม' : 'ไม่สมัครก็เล่นต่อได้เหมือนเดิม บัญชีมีไว้สำรอง Save ในเครื่องนี้เท่านั้น') : 'Login แล้วระบบจะรวมของในเครื่องนี้กับของที่เคยเก็บไว้ให้อัตโนมัติ'}</p>
    <div class="mc-account-tabs" role="tablist">
      <button type="button" class="mc-account-tab" data-account-mode="signup" aria-selected="${signup}">สมัครสมาชิก</button>
      <button type="button" class="mc-account-tab" data-account-mode="login" aria-selected="${!signup}">เข้าสู่ระบบ</button>
    </div>
    <form class="mc-account-form" data-account-form="${signup ? 'signup' : 'login'}">
      ${signup ? '<div class="mc-account-field"><label for="mc-account-name">ชื่อที่ให้เราเรียก</label><input id="mc-account-name" name="name" maxlength="80" autocomplete="name" required></div>' : ''}
      <div class="mc-account-field"><label for="mc-account-email">อีเมล</label><input id="mc-account-email" name="email" type="email" maxlength="120" autocomplete="email" required></div>
      <div class="mc-account-field"><label for="mc-account-password">รหัสผ่าน <small>อย่างน้อย 8 ตัวอักษร</small></label><input id="mc-account-password" name="password" type="password" minlength="8" maxlength="128" autocomplete="${signup ? 'new-password' : 'current-password'}" required></div>
      ${signup ? '<label class="mc-account-consent"><input type="checkbox" name="consent" required><span>ยินยอมให้ myClover เก็บบัญชีและ Progress เพื่อเรียกคืนเมื่อ Login · <a href="/privacy/" target="_blank" rel="noopener">อ่านเรื่องข้อมูลของคุณ</a></span></label>' : ''}
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
    user = result.user; storageSet(PROMPT_KEY, '1'); publishUser(); await syncProgress({ quiet: true }); paintChip(); open();
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
  window.addEventListener('pagehide', pushOnLeave);
  window.addEventListener('storage', event => { if (event.key && allowedKey(event.key)) scheduleSync(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') scheduleSync(); });
  window.addEventListener('core7:first-hand-reward-closed', maybePromptFirstHand14);
}

function showAccountChip() {
  const path = currentSurfacePath();
  return path === '/card' || path === '/collection' || path === '/xty/collection' || path === '/xircle/explore' || path === '/core7/collection';
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

function maybePromptFirstHand14(event) {
  /* This invitation belongs to one precise game event: the player has just
     revealed and accepted FIRST HAND card 14 on a result page. Never infer
     it later from stored totals; doing that made the dialog leak into Home. */
  if (!/^\/core7\/(?:journey-)?result\//.test(location.pathname)) return;
  if (event?.type !== 'core7:first-hand-reward-closed') return;
  const count = Number(event.detail?.count);
  if (count !== 14) return;
  if (user || storageGet(PROMPT_KEY) === '1') return;
  storageSet(PROMPT_KEY, '1'); open('signup14');
  try { window.mcEvent && window.mcEvent('account_prompt_first_hand_14', { first_hand: count }); } catch { /* analytics optional */ }
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
  window.dispatchEvent(new CustomEvent('mc:account-ready', { detail: { user } }));
}

window.MC_ACCOUNT = { open, close, syncProgress, get user() { return user; } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();