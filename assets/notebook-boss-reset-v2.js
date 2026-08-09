/* myClover · Boss Dungeon reset v4
   Hidden at the end of the restored notebook.
   Reset one Chapter 7 run completely while preserving permanent collection data.
*/

const RESET_EPOCH_KEY = 'mc_awaken_reset_epoch';
const RESET_PENDING_KEY = 'mc_awaken_reset_pending';
const KEEP_LOCAL_KEYS = new Set([
  RESET_EPOCH_KEY,
  RESET_PENDING_KEY,
  'mc_awaken_reset_count',
  'mc_mini_achievements_v1',
]);

function isNotebookPage() {
  return /^\/classroom\/awaken\/notebook\/?(?:index\.html)?$/.test(location.pathname);
}

function report(id) {
  try { window.MC_ACT?.(id); } catch { /* analytics optional */ }
}

function dungeonKey(key) {
  return ((key.startsWith('mc_awaken_') && !KEEP_LOCAL_KEYS.has(key)) ||
    key.startsWith('mc_ch7_') ||
    key.startsWith('mc_nb_') ||
    key === 'mc_secret_end');
}

function clearDungeonStorage(storage) {
  const remove = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || KEEP_LOCAL_KEYS.has(key)) continue;
    if (dungeonKey(key)) remove.push(key);
  }
  remove.forEach(key => storage.removeItem(key));
  return remove;
}

function resetPayload() {
  const progress = {};
  try {
    [RESET_EPOCH_KEY, 'mc_awaken_reset_count', 'mc_mini_achievements_v1'].forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) progress[key] = value;
    });
  } catch { /* private mode */ }
  return progress;
}

async function pushResetToCloud() {
  try {
    const response = await fetch('/api/progress', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: resetPayload() }),
    });
    if (response.ok || response.status === 401) {
      try { localStorage.removeItem(RESET_PENDING_KEY); } catch { /* private mode */ }
      return true;
    }
  } catch { /* retry on next page */ }
  return false;
}

function guardPendingReset() {
  let pending = false;
  try { pending = localStorage.getItem(RESET_PENDING_KEY) === '1'; } catch { return; }
  if (!pending) return;

  /* account.js may have merged an old cloud save before this module ran.
     Kill resurrected run keys again, then retry the server tombstone. */
  try { clearDungeonStorage(localStorage); } catch { /* private mode */ }
  try { clearDungeonStorage(sessionStorage); } catch { /* private mode */ }
  pushResetToCloud();
}

function injectStyles() {
  if (document.getElementById('boss-reset-style')) return;
  const style = document.createElement('style');
  style.id = 'boss-reset-style';
  style.textContent = `
    .boss-reset-vault{max-width:560px;margin:52px auto 18px;padding:18px 19px;border:1px dashed rgba(255,255,255,.16);border-radius:16px;background:rgba(255,255,255,.025);text-align:center}
    .boss-reset-vault .micro{display:block;color:rgba(255,255,255,.34);font:750 9.5px/1.5 "Bai Jamjuree",system-ui,sans-serif;letter-spacing:.16em}
    .boss-reset-vault p{margin-top:8px;color:rgba(255,255,255,.47);font-size:12.5px;line-height:1.72}
    .boss-reset-open{margin-top:12px;border:0;background:none;color:rgba(190,148,66,.7);font:750 12px/1.5 "Bai Jamjuree",system-ui,sans-serif;cursor:pointer;border-bottom:1px dashed rgba(190,148,66,.38);padding:5px 2px}
    .boss-reset-open:hover,.boss-reset-open:focus-visible{color:rgb(224 190 113)}
    .boss-reset-confirm{margin-top:15px;padding:16px;border:1px solid rgba(255,143,123,.28);border-radius:13px;background:rgba(151,49,37,.09);text-align:left}
    .boss-reset-confirm[hidden]{display:none!important}.boss-reset-confirm b{display:block;color:#ffc3b8;font:800 14px/1.5 "Bai Jamjuree",system-ui,sans-serif}.boss-reset-confirm p{margin-top:6px;color:rgba(255,255,255,.67);font-size:13px;line-height:1.7}
    .boss-reset-list{margin-top:10px;display:grid;gap:4px;color:rgba(255,255,255,.55);font-size:12px;line-height:1.6}
    .boss-reset-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.boss-reset-actions button{min-height:44px;border-radius:10px;padding:9px 12px;font:750 12.5px/1.4 "Bai Jamjuree",system-ui,sans-serif;cursor:pointer}
    .boss-reset-cancel{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:rgba(255,255,255,.7)}.boss-reset-do{border:1px solid rgba(255,143,123,.5);background:rgba(151,49,37,.28);color:#ffd6cf}.boss-reset-do:hover{background:rgba(151,49,37,.42)}
    @media(max-width:480px){.boss-reset-vault{margin-top:44px;padding:17px 15px}.boss-reset-actions{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

async function resetDungeon() {
  let count = 1;
  let removedLocal = [];
  let removedSession = [];
  const epoch = Date.now();

  try {
    count = Number(localStorage.getItem('mc_awaken_reset_count') || 0) + 1;
    window.MC_MINI_UNLOCK?.('dungeon-reset');
    removedLocal = clearDungeonStorage(localStorage);
    localStorage.setItem('mc_awaken_reset_count', String(count));
    localStorage.setItem(RESET_EPOCH_KEY, String(epoch));
    localStorage.setItem(RESET_PENDING_KEY, '1');
    /* prevent account boot on the destination page from immediately fetching an
       older cloud save while the reset tombstone is being written */
    localStorage.setItem('mc_account_last_sync', new Date().toISOString());
  } catch { /* private mode */ }

  try { removedSession = clearDungeonStorage(sessionStorage); } catch { /* private mode */ }

  report('awaken-dungeon-reset');
  try {
    window.gtag?.('event', 'awaken_dungeon_reset', {
      reset_count: count,
      cleared_local: removedLocal.length,
      cleared_session: removedSession.length,
    });
  } catch { /* optional */ }

  await Promise.race([
    pushResetToCloud(),
    new Promise(resolve => setTimeout(resolve, 1800)),
  ]);

  location.replace(`/classroom/awaken/?reset=${epoch}`);
}

function createPanel() {
  const panel = document.createElement('aside');
  panel.className = 'boss-reset-vault';
  panel.setAttribute('aria-label', 'เมนูลับสำหรับเริ่มด่านบอสใหม่');
  panel.innerHTML = `
    <span class="micro">HIDDEN DEVELOPER MENU · END OF NOTEBOOK</span>
    <p>ปุ่มนี้ซ่อนอยู่ท้ายสมุด เพราะคนที่หาไม่เจอก็ยังไม่จำเป็นต้องกด</p>
    <button class="boss-reset-open" type="button" aria-expanded="false">♻️ Reset Boss Dungeon</button>
    <div class="boss-reset-confirm" hidden>
      <b>เริ่มด่านบอสใหม่ตั้งแต่หน้าประตู?</b>
      <p>รอบปัจจุบันจะถูกล้าง เพื่อให้มึงเดินใหม่ เปิด Side Quest ใหม่ ซ่อมสมุดใหม่ และเปิดหีบใหม่ได้</p>
      <div class="boss-reset-list"><span>ล้าง: เวลาอ่าน · Side Quest · ดาว · Loot · เกลือ · ม้วน EXP · สถานะสมุด</span><span>เก็บไว้: 6 บท · Achievement ที่เคยปลด · BLACKSMITH · Player Card · Collection</span></div>
      <div class="boss-reset-actions"><button class="boss-reset-cancel" type="button">ยังไม่รีเซ็ต</button><button class="boss-reset-do" type="button">ยืนยัน · เริ่ม Dungeon ใหม่</button></div>
    </div>`;

  const open = panel.querySelector('.boss-reset-open');
  const confirm = panel.querySelector('.boss-reset-confirm');
  const cancel = panel.querySelector('.boss-reset-cancel');
  open.addEventListener('click', () => {
    const expanded = open.getAttribute('aria-expanded') === 'true';
    open.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    confirm.hidden = expanded;
    if (!expanded) { report('awaken-reset-menu-open'); cancel.focus(); }
  });
  cancel.addEventListener('click', () => {
    confirm.hidden = true;
    open.setAttribute('aria-expanded', 'false');
    open.focus();
  });
  panel.querySelector('.boss-reset-do').addEventListener('click', resetDungeon);
  return panel;
}

function mountAtNotebookEnd() {
  if (document.querySelector('.boss-reset-vault')) return true;
  const restored = document.getElementById('restored');
  const finalBox = document.getElementById('finalBox');
  if (finalBox) { finalBox.insertAdjacentElement('afterend', createPanel()); return true; }
  if (restored?.children.length) { restored.append(createPanel()); return true; }
  return false;
}

function enforceFreshNotebookAfterReset() {
  if (!isNotebookPage()) return;
  let restored = false;
  try { restored = localStorage.getItem('mc_nb_restored') === '1'; } catch { return; }
  if (restored) return;
  const story = document.getElementById('restored');
  const torn = document.getElementById('tornWrap');
  if ((story && story.children.length > 0) || torn?.hidden) location.reload();
}

function boot() {
  guardPendingReset();
  window.addEventListener('mc:account-ready', guardPendingReset);
  window.addEventListener('pageshow', event => {
    guardPendingReset();
    if (event.persisted) enforceFreshNotebookAfterReset();
  });

  if (!isNotebookPage() || document.documentElement.dataset.bossResetV2 === '1') return;
  document.documentElement.dataset.bossResetV2 = '1';
  injectStyles();
  enforceFreshNotebookAfterReset();
  if (mountAtNotebookEnd()) return;
  const observer = new MutationObserver(() => {
    if (mountAtNotebookEnd()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
