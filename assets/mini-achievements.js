/* myClover · Mini Achievement registry + local unlocks
   Compact achievements live in Collection without full artwork.
*/

const KEY = 'mc_mini_achievements_v1';

export const MINI_ACHIEVEMENTS = Object.freeze([
  { id:'boss-chest', emoji:'🧰', name:'เปิดหีบ Dungeon', hint:'เปิดหีบ THE DUNGEON โดยไม่งัดจนพัง' },
  { id:'boss-3-stars', emoji:'★★★', name:'หีบ 3 ดาว', hint:'เปิดหีบ THE DUNGEON แล้วล็อกผลที่ 3/5 ดาว' },
  { id:'boss-5-stars', emoji:'★★★★★', name:'หีบ 5 ดาว', hint:'เก็บครบ 5/5 แล้วเปิดหีบ THE DUNGEON' },
  { id:'salt-speedrun', emoji:'🧂', name:'งัดจนได้เกลือ', hint:'งัดหีบ THE DUNGEON ครบ 3 ครั้งจนหีบพังและได้เกลือ' },
  { id:'xp-scroll-used', emoji:'📜', name:'ตีบวกคัมภีร์ครบ', hint:'ใช้คัมภีร์ใน THE DUNGEON และดู LEVEL UP ครบ 3 ครั้ง' },
  { id:'timebox-open', emoji:'😴', name:'เปิดกล่องของเก่า', hint:'เปิดอ่านเรื่อง 14 วันที่เว็บนี้ถูกสร้างใน PHASE 1' },
  { id:'party-box-open', emoji:'🔌', name:'เปิดหน้าต่าง Party', hint:'เปิด Party ในแผนที่ THE DUNGEON' },
  { id:'d20-natural-1', emoji:'🎲', name:'Natural 1 · ทอยจุ๊ง!', hint:'ทอย d20 ได้ 1 — จุ๊งเต็มข้อ ต่อให้แผนดีแค่ไหนก็มีวันที่ลูกเต๋าบอกว่า “วันนี้ไม่ใช่วันของมึง”' },
  { id:'d20-natural-20', emoji:'🎲', name:'Natural 20 · ทอยคริ!', hint:'ทอย d20 ได้ 20 — คริเต็มหน้า! จังหวะที่ความเสี่ยงกลายเป็นตำนาน และโต๊ะควรมีคนร้องเฮ' },
  { id:'clover-song-2010', emoji:'💿', name:'Clover Song · 2010', hint:'เปิดเพลงที่เจ้าของบ้านแต่ง และเพื่อนร้องจริงตั้งแต่ปี 2010', main:true },
  { id:'dungeon-reset', emoji:'♻️', name:'เริ่มด่านใหม่', lockedName:'???', hint:'พบเมนูลับและ Reset THE DUNGEON', secret:true },
  { id:'well-done', emoji:'🔥', name:'Well-Done', hint:'โดนมังกรย่างยกตี้จน PARTY WIPE — สุกกำลังดีแบบไม่มีใครรอด' },
  { id:'lucky-bug', emoji:'🍀', name:'Lucky Bug · 6 ดาว', lockedName:'???', hint:'ขโมยทองมังกรสำเร็จ ขณะยืนอยู่บนโคลเวอร์สี่แฉก แล้วเจอดาวลับดวงที่ 6', secret:true },
]);

function readSet() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

export function unlockMini(id) {
  if (!MINI_ACHIEVEMENTS.some(item => item.id === id)) return false;
  const set = readSet();
  if (set.has(id)) return false;
  set.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* private mode */ }
  try { window.dispatchEvent(new CustomEvent('mc:mini-achievement', { detail:{ id } })); } catch { /* old browser */ }
  try { window.mcEvent?.('mini-achievement', { item:id }); } catch { /* analytics optional */ }
  return true;
}

export function unlockedMiniIds() {
  return [...readSet()];
}

if (typeof window !== 'undefined') {
  window.MC_MINI_UNLOCK = unlockMini;
  window.MC_MINI_ACHIEVEMENTS = MINI_ACHIEVEMENTS;
  if (/^\/classroom\/dungeon\/?(?:index\.html)?$/.test(location.pathname)) {
    import('/assets/dungeon-bridge.js?v=20260811-1').catch(() => {});
  }
}

function watchSong() {
  document.addEventListener('play', event => {
    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement)) return;
    const src = String(audio.currentSrc || audio.src || '');
    if (/clover-song/i.test(src)) unlockMini('clover-song-2010');
  }, true);
}

function ensureD20Styles() {
  if (document.getElementById('mc-d20-callout-style')) return;
  const style = document.createElement('style');
  style.id = 'mc-d20-callout-style';
  style.textContent = `
    .mc-d20-callout{position:fixed;left:50%;top:18%;z-index:99999;translate:-50% -50%;pointer-events:none;min-width:min(430px,calc(100vw - 28px));padding:18px 22px;border-radius:18px;text-align:center;background:rgba(7,18,12,.94);color:#fff;border:1px solid rgba(255,255,255,.18);box-shadow:0 24px 80px rgba(0,0,0,.48);backdrop-filter:blur(12px);opacity:0;transform:scale(.78);transition:opacity .18s ease,transform .22s cubic-bezier(.2,.9,.2,1.25)}
    .mc-d20-callout.on{opacity:1;transform:scale(1)}
    .mc-d20-callout.jung{border-color:rgba(255,132,105,.6);box-shadow:0 24px 80px rgba(0,0,0,.48),0 0 0 1px rgba(255,132,105,.14) inset}
    .mc-d20-callout.crit{border-color:rgba(240,201,108,.8);box-shadow:0 24px 80px rgba(0,0,0,.48),0 0 34px rgba(240,201,108,.25)}
    .mc-d20-callout b{display:block;font:900 clamp(25px,6vw,42px)/1.05 system-ui,sans-serif;letter-spacing:-.03em}
    .mc-d20-callout small{display:block;margin-top:8px;color:rgba(255,255,255,.7);font:700 13px/1.5 system-ui,sans-serif}
  `;
  document.head.append(style);
}

let d20CalloutTimer = 0;
function showD20Callout(value) {
  if (value !== 1 && value !== 20) return;
  ensureD20Styles();
  let box = document.getElementById('mc-d20-callout');
  if (!box) {
    box = document.createElement('div');
    box.id = 'mc-d20-callout';
    box.className = 'mc-d20-callout';
    document.body.appendChild(box);
  }
  const crit = value === 20;
  box.className = `mc-d20-callout ${crit ? 'crit' : 'jung'}`;
  box.innerHTML = crit
    ? '<b>💥 NATURAL 20 · ทอยคริ!</b><small>คริเต็มหน้า — จังหวะนี้โต๊ะควรมีคนร้องเฮ</small>'
    : '<b>💀 NATURAL 1 · ทอยจุ๊ง!</b><small>จุ๊งเต็มข้อ — ลูกเต๋าบอกว่า วันนี้ไม่ใช่วันของมึง</small>';
  requestAnimationFrame(() => box.classList.add('on'));
  clearTimeout(d20CalloutTimer);
  d20CalloutTimer = window.setTimeout(() => box.classList.remove('on'), 2200);
}

function watchD20() {
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#d20')) return;
    window.setTimeout(() => {
      const value = Number(document.getElementById('d20num')?.textContent || 0);
      if (value === 1) unlockMini('d20-natural-1');
      if (value === 20) unlockMini('d20-natural-20');
      showD20Callout(value);
    }, 760);
  }, true);
}

function watchDungeonReset() {
  document.addEventListener('click', event => {
    if (event.target.closest?.('.boss-reset-do')) unlockMini('dungeon-reset');
  }, true);
}

function injectCollectionStyles() {
  if (document.getElementById('mini-achievement-style')) return;
  const style = document.createElement('style');
  style.id = 'mini-achievement-style';
  style.textContent = `
    .mini-achievement-group{margin-top:34px!important;padding:22px!important;border:1px solid rgb(190 148 66/.28)!important;border-radius:20px!important;background:linear-gradient(145deg,rgb(190 148 66/.08),rgb(255 255 255/.65))!important}
    .mini-achievement-group .group-count{background:rgb(190 148 66/.14)!important;color:#77591f!important}
    .mini-achievement-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:17px}
    .mini-achievement{position:relative;display:grid;grid-template-columns:44px 1fr;gap:11px;align-items:center;min-height:82px;padding:13px;border:1px solid rgb(18 40 28/.11);border-radius:14px;background:#fff}
    .mini-achievement.locked{opacity:.5;filter:saturate(.35)}
    .mini-achievement .mini-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:rgb(27 106 66/.08);font-size:22px;font-weight:850;line-height:1;text-align:center}
    .mini-achievement .mini-icon.stars{font-size:10px;letter-spacing:-.08em;color:#9b7627;background:rgb(190 148 66/.13)}
    .mini-achievement b{display:block;font:750 13.5px/1.4 "Bai Jamjuree",system-ui,sans-serif;color:rgb(18 40 28)}
    .mini-achievement small{display:block;margin-top:3px;color:rgb(96 108 100);font-size:11.5px;line-height:1.5}
    .mini-achievement .mini-state{position:absolute;right:9px;top:8px;color:rgb(27 106 66);font-size:11px;font-weight:800}
    @media(max-width:760px){.mini-achievement-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:470px){.mini-achievement-grid{grid-template-columns:1fr}.mini-achievement-group{padding:17px!important}}
  `;
  document.head.append(style);
}

function collectionFilter() {
  return document.querySelector('.filter[aria-pressed="true"]')?.dataset.filter || 'all';
}

function miniCard(item, unlocked) {
  const shown = unlocked ? item.name : (item.secret ? item.lockedName || '???' : item.name);
  const iconClass = /★/.test(item.emoji) ? 'mini-icon stars' : 'mini-icon';
  return `<article class="mini-achievement ${unlocked ? 'unlocked' : 'locked'}" data-mini-id="${item.id}">
    <span class="${iconClass}" aria-hidden="true">${item.emoji}</span>
    <span><b>${shown}</b><small>${unlocked ? '✓ ปลดแล้ว · ' : 'ปลดเมื่อ · '}${item.hint}</small></span>
    <span class="mini-state" aria-hidden="true">${unlocked ? '✓' : '🔒'}</span>
  </article>`;
}

function renderMiniCollection() {
  if (!/^\/collection\/?(?:index\.html)?$/.test(location.pathname)) return;
  const root = document.getElementById('album');
  if (!root || !root.children.length || root.querySelector('.mini-achievement-group')) return;

  const unlocked = readSet();
  const filter = collectionFilter();
  const miniItems = MINI_ACHIEVEMENTS.filter(item => !item.main);
  const visible = miniItems.filter(item => filter === 'all' || (filter === 'unlocked' ? unlocked.has(item.id) : !unlocked.has(item.id)));
  if (!visible.length) return;

  injectCollectionStyles();
  const section = document.createElement('section');
  section.className = 'group mini-achievement-group';
  const count = miniItems.filter(item => unlocked.has(item.id)).length;
  section.innerHTML = `<div class="group-head"><div><span class="eyebrow">✨ MINI ACHIEVEMENTS</span><h2>เหตุการณ์ที่คุณค้นพบในด่านบอส</h2><p class="group-desc">ไม่มีภาพใหญ่และไม่รวมในเปอร์เซ็นต์หลัก เป็นรอยเท้าจากเหตุการณ์พิเศษที่คุณค้นพบระหว่างเล่น THE DUNGEON</p></div><span class="group-count">${count}/${miniItems.length}</span></div><div class="mini-achievement-grid">${visible.map(item => miniCard(item, unlocked.has(item.id))).join('')}</div>`;

  const note = root.querySelector(':scope > .note');
  root.insertBefore(section, note || null);
}

function mountCollectionMini() {
  if (!/^\/collection\/?(?:index\.html)?$/.test(location.pathname)) return;
  const album = document.getElementById('album');
  if (!album) return;
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; renderMiniCollection(); });
  };
  new MutationObserver(queue).observe(album, { childList:true });
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => setTimeout(queue, 0)));
  window.addEventListener('mc:mini-achievement', queue);
  queue();
}

function boot() {
  watchSong();
  watchD20();
  watchDungeonReset();
  mountCollectionMini();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();