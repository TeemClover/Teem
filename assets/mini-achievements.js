/* myClover · Mini Achievement registry + local unlocks
   Compact achievements live in Collection without full artwork.
*/

const KEY = 'mc_mini_achievements_v1';

export const MINI_ACHIEVEMENTS = Object.freeze([
  { id:'boss-chest', emoji:'🧰', name:'เปิดหีบบอส', hint:'เปิดหีบบอสในบทที่ 7' },
  { id:'boss-3-stars', emoji:'★★★', name:'หีบ 3 ดาว', hint:'เปิดหีบบอสแล้วได้ 3 ดาว' },
  { id:'boss-5-stars', emoji:'★★★★★', name:'หีบ 5 ดาว', hint:'เปิดหีบบอสแล้วได้ 5 ดาว' },
  { id:'salt-speedrun', emoji:'🧂', name:'รีบจนได้เกลือ', hint:'เปิดหีบด้วย Active Time ต่ำกว่า 10 วินาที' },
  { id:'xp-scroll-used', emoji:'📜', name:'ใช้ม้วนประสบการณ์', hint:'ใช้ม้วน EXP และดู LEVEL UP ครบ 3 ครั้ง' },
  { id:'timebox-open', emoji:'😴', name:'เปิดกล่อง 14 วัน', hint:'เปิดดูช่วง 14 วันที่ไอ้ทีมสั่ง AI แทบทุกนาที' },
  { id:'party-box-open', emoji:'🔌', name:'เปิดกล่อง Party', hint:'เปิดดู Party ที่สร้างบ้านหลังนี้' },
  { id:'party-loadout-all', emoji:'🎒', name:'ตรวจ Loadout ครบทีม', hint:'เปิด Equipment และ Skill ของสมาชิกครบ 4 ตัว' },
  { id:'d20-natural-1', emoji:'🎲', name:'Natural 1', hint:'ทอย d20 ได้ 1' },
  { id:'d20-natural-20', emoji:'🎲', name:'Natural 20', hint:'ทอย d20 ได้ 20' },
  { id:'clover-song-2010', emoji:'💿', name:'Clover Song · 2010', hint:'เปิดเพลงที่เจ้าของบ้านแต่ง และเพื่อนร้องจริงตั้งแต่ปี 2010' },
  { id:'dungeon-reset', emoji:'♻️', name:'เริ่มด่านใหม่', lockedName:'???', hint:'พบเมนูลับและเริ่ม Boss Dungeon ใหม่', secret:true },
  { id:'lucky-bug', emoji:'🍀', name:'Lucky Bug', lockedName:'???', hint:'ขโมยทองมังกรสำเร็จ ขณะยืนอยู่บนโคลเวอร์สี่แฉก', secret:true },
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
}

function watchSong() {
  document.addEventListener('play', event => {
    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement)) return;
    const src = String(audio.currentSrc || audio.src || '');
    if (/clover-song/i.test(src)) unlockMini('clover-song-2010');
  }, true);
}

function watchD20() {
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#d20')) return;
    window.setTimeout(() => {
      const value = Number(document.getElementById('d20num')?.textContent || 0);
      if (value === 1) unlockMini('d20-natural-1');
      if (value === 20) unlockMini('d20-natural-20');
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
  const visible = MINI_ACHIEVEMENTS.filter(item => filter === 'all' || (filter === 'unlocked' ? unlocked.has(item.id) : !unlocked.has(item.id)));
  if (!visible.length) return;

  injectCollectionStyles();
  const section = document.createElement('section');
  section.className = 'group mini-achievement-group';
  const count = MINI_ACHIEVEMENTS.filter(item => unlocked.has(item.id)).length;
  section.innerHTML = `<div class="group-head"><div><span class="eyebrow">✨ MINI ACHIEVEMENTS</span><h2>เหตุการณ์เล็ก ๆ ที่เกมจำได้</h2><p class="group-desc">ไม่มีภาพใหญ่และไม่รวมในเปอร์เซ็นต์หลัก เป็นรอยเท้าจากจังหวะพิเศษที่คุณเจอระหว่างทาง</p></div><span class="group-count">${count}/${MINI_ACHIEVEMENTS.length}</span></div><div class="mini-achievement-grid">${visible.map(item => miniCard(item, unlocked.has(item.id))).join('')}</div>`;

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
