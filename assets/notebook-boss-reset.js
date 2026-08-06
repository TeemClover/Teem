/* myClover · Boss Dungeon reset
   ปุ่มนี้เกิดเฉพาะท้ายสมุดลับ ไม่โผล่ในหน้าบอสหรือสารบัญ
   รีเซ็ตเฉพาะสถานะการเล่น Chapter 7 แต่ไม่ลบ Achievement ถาวร,
   ความคืบหน้า 6 บท, Player Card, BLACKSMITH หรือ Collection
*/

const RESET_LOCAL_KEYS = [
  'mc_awaken_explore_v1',
  'mc_awaken_loot_v1',
  'mc_awaken_run_reported_v2',
  'mc_awaken_run_reported_v3',
  'mc_ch7_done',
  'mc_ch7_entered',
  'mc_ch7_y',
  'mc_nb_seen',
  'mc_nb_restored',
  'mc_secret_end',
];

const RESET_SESSION_KEYS = [
  'mc_awaken_run_session_v2',
  'mc_awaken_run_session_v3',
];

function isNotebookPage() {
  return /^\/classroom\/awaken\/notebook\/?(?:index\.html)?$/.test(location.pathname);
}

function report(id) {
  try { window.MC_ACT?.(id); } catch { /* analytics optional */ }
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
    .boss-reset-confirm[hidden]{display:none!important}
    .boss-reset-confirm b{display:block;color:#ffc3b8;font:800 14px/1.5 "Bai Jamjuree",system-ui,sans-serif}
    .boss-reset-confirm p{margin-top:6px;color:rgba(255,255,255,.67);font-size:13px;line-height:1.7}
    .boss-reset-list{margin-top:10px;display:grid;gap:4px;color:rgba(255,255,255,.55);font-size:12px;line-height:1.6}
    .boss-reset-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
    .boss-reset-actions button{min-height:44px;border-radius:10px;padding:9px 12px;font:750 12.5px/1.4 "Bai Jamjuree",system-ui,sans-serif;cursor:pointer}
    .boss-reset-cancel{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:rgba(255,255,255,.7)}
    .boss-reset-do{border:1px solid rgba(255,143,123,.5);background:rgba(151,49,37,.28);color:#ffd6cf}
    .boss-reset-do:hover{background:rgba(151,49,37,.42)}
    @media(max-width:480px){.boss-reset-vault{margin-top:44px;padding:17px 15px}.boss-reset-actions{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function resetDungeon() {
  let count = 0;
  try {
    count = Number(localStorage.getItem('mc_awaken_reset_count') || 0) + 1;
    localStorage.setItem('mc_awaken_reset_count', String(count));
    RESET_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
  } catch { /* private mode */ }
  try { RESET_SESSION_KEYS.forEach(key => sessionStorage.removeItem(key)); } catch { /* private mode */ }

  report('awaken-dungeon-reset');
  try { window.gtag?.('event', 'awaken_dungeon_reset', { reset_count: count || 1 }); } catch { /* optional */ }

  location.href = '/classroom/awaken/?reset=1';
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
      <p>รอบปัจจุบันจะถูกล้าง เพื่อให้มึงลองเดินใหม่ เปิด Side Quest ใหม่ ซ่อมสมุดใหม่ และเปิดหีบใหม่ได้</p>
      <div class="boss-reset-list">
        <span>ล้าง: เวลาอ่าน · Rush/Read · Side Quest · ดาว · Loot · เกลือ · สถานะสมุด</span>
        <span>เก็บไว้: 6 บท · AWAKEN · BLACKSMITH · Player Card · Collection</span>
      </div>
      <div class="boss-reset-actions">
        <button class="boss-reset-cancel" type="button">ยังไม่รีเซ็ต</button>
        <button class="boss-reset-do" type="button">ยืนยัน · เริ่ม Dungeon ใหม่</button>
      </div>
    </div>`;

  const open = panel.querySelector('.boss-reset-open');
  const confirm = panel.querySelector('.boss-reset-confirm');
  const cancel = panel.querySelector('.boss-reset-cancel');
  const doReset = panel.querySelector('.boss-reset-do');

  open.addEventListener('click', () => {
    const expanded = open.getAttribute('aria-expanded') === 'true';
    open.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    confirm.hidden = expanded;
    if (!expanded) {
      report('awaken-reset-menu-open');
      cancel.focus();
    }
  });
  cancel.addEventListener('click', () => {
    confirm.hidden = true;
    open.setAttribute('aria-expanded', 'false');
    open.focus();
  });
  doReset.addEventListener('click', resetDungeon);
  return panel;
}

function mountAtNotebookEnd() {
  if (document.querySelector('.boss-reset-vault')) return true;

  // หลังซ่อมสมุด เนื้อหาท้ายเล่มถูกสร้างแบบ dynamic ใน #restored
  const restored = document.getElementById('restored');
  const finalBox = document.getElementById('finalBox');
  if (finalBox) {
    finalBox.insertAdjacentElement('afterend', createPanel());
    return true;
  }
  if (restored && restored.children.length) {
    restored.append(createPanel());
    return true;
  }
  return false;
}

function boot() {
  if (!isNotebookPage() || document.documentElement.dataset.bossReset === '1') return;
  document.documentElement.dataset.bossReset = '1';
  injectStyles();
  if (mountAtNotebookEnd()) return;

  const observer = new MutationObserver(() => {
    if (mountAtNotebookEnd()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
