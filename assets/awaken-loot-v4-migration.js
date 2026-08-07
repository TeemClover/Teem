/* Preserve the locked result from the original star chest when moving to loot v4.
   v3 temporarily removed stars and stored only “opened”; this bridge restores the
   original snapshot before v4 reads it. New v4 chests are never touched.
*/

(function(){
'use strict';
if (!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

const CURRENT_KEY = 'mc_awaken_loot_v3';
const ORIGINAL_KEY = 'mc_awaken_loot_v1';
const MINI_KEY = 'mc_mini_achievements_v1';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } }

const original = read(ORIGINAL_KEY, null);
if (!original || !Number.isFinite(Number(original.stars))) return;

const current = read(CURRENT_KEY, null);
if (current?.version === 4 && current.chestOpened && current.migratedFrom !== 'mc_awaken_loot_v2') return;
if (current?.chestOpened && !current.migratedFrom) return;

const speedrun = !!original.salt || Number(original.stars) === 0;
const items = speedrun ? [
  { id:'salt', icon:'🧂', name:'เกลือ 1 ขวด', note:'ได้จากการเปิดหีบก่อน Active Time ครบ 10 วินาที' }
] : (Array.isArray(original.items) ? original.items : []).map((item, index) => {
  const name = String(item?.name || '');
  if (/ม้วนประสบการณ์/.test(name)) return { id:'xp-scroll', icon:'📜', name:'ม้วนประสบการณ์ ×3', note:'กดใช้เพื่อเล่น LEVEL UP แบบเดิมได้ 1 ครั้ง', action:'xp' };
  if (/Party Compass/.test(name)) return { id:'relay-coupler', icon:'🔌', name:'Party Relay Coupler', note:'หัวต่อส่งไม้ระหว่าง GPT หน้าบ้าน, Claude หลังบ้าน, Gemini เปิดแมพ และ Teem กด Final Call' };
  if (/Chrono Shard/.test(name)) return { id:'sleep-debt', icon:'😴', name:'ใบเสร็จหนี้การนอน 14 วัน', note:'หลักฐานช่วงไอ้ทีมสั่ง AI แทบทุกนาที' };
  return { id:item?.id || `legacy-${index}`, icon:item?.icon || '🎁', name:name || 'ของจากหีบเดิม', note:item?.note || '' };
});
if (!speedrun && !items.some(item => item.id === 'xp-scroll')) {
  items.unshift({ id:'xp-scroll', icon:'📜', name:'ม้วนประสบการณ์ ×3', note:'กดใช้เพื่อเล่น LEVEL UP แบบเดิมได้ 1 ครั้ง', action:'xp' });
}

const state = {
  version:4,
  chestOpened:true,
  stars:Math.max(0, Math.min(5, Number(original.stars))),
  salt:speedrun,
  xpUsed:current?.xpUsed || localStorage.getItem('mc_awaken_xp_used_v1') === '1',
  items,
  progress:current?.progress || null,
  openedAt:original.claimedAt || current?.openedAt || Date.now(),
  activeMsAtOpen:current?.activeMsAtOpen || null,
  migratedFrom:'mc_awaken_loot_v1',
};
write(CURRENT_KEY, state);

const minis = new Set(read(MINI_KEY, []));
minis.add('boss-chest');
if (state.stars === 3) minis.add('boss-3-stars');
if (state.stars === 5) minis.add('boss-5-stars');
if (state.salt) minis.add('salt-speedrun');
write(MINI_KEY, [...minis]);
})();
