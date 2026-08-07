/* myClover · /stat/ — AWAKEN dungeon panel v2
   Loot ไม่มีดาวแล้ว: แยกหีบ, เกลือ, ม้วน EXP และกล่องข้างทางเป็นคนละเหตุการณ์
*/

import { fetchCore7AchievementStats } from '/core7/js/analytics.js';

function isDashboard() {
  return /^\/stat\/?(?:index\.html)?$/.test(location.pathname);
}

function bkkDay(offsetDays = 0) {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);
}

const fmt = n => Number(n || 0).toLocaleString('en-US');
const pct = n => `${Number.isFinite(n) ? n.toFixed(1) : '0.0'}%`;
const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

function injectStyles() {
  if (document.getElementById('stat-awaken-style')) return;
  const style = document.createElement('style');
  style.id = 'stat-awaken-style';
  style.textContent = `
    .awstat{margin-top:34px}.awstat-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px}.awstat-card{padding:15px;border:1px solid rgb(255 255 255/.11);border-radius:16px;background:linear-gradient(145deg,rgb(255 255 255/.065),rgb(255 255 255/.03))}.awstat-card span{display:block;color:rgb(255 255 255/.54);font-size:10px;font-weight:750;letter-spacing:.05em}.awstat-card strong{display:block;margin-top:5px;font:750 clamp(23px,3vw,31px) "Bai Jamjuree",sans-serif}.awstat-card small{display:block;margin-top:3px;color:rgb(255 255 255/.42);font-size:11px;line-height:1.45}.awstat-card.salt{border-color:rgb(255 185 119/.32);background:rgb(255 185 119/.07)}.awstat-card.salt strong{color:#ffb977}.awstat-card.good strong{color:#65d39d}
    .awstat-panels{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:11px}.awstat-panel{padding:17px;border:1px solid rgb(255 255 255/.11);border-radius:16px;background:rgb(255 255 255/.035)}.awstat-panel h3{font:700 16px "Bai Jamjuree",sans-serif}.awstat-panel p{margin-top:4px;color:rgb(255 255 255/.48);font-size:11.5px}.awstat-rows{display:grid;gap:8px;margin-top:13px}.awstat-row{display:grid;grid-template-columns:minmax(125px,1fr) 70px 70px;gap:9px;align-items:center;padding:9px 10px;border-radius:10px;background:rgb(255 255 255/.045);font-size:12px}.awstat-row b{font-weight:650}.awstat-row span{text-align:right;color:rgb(255 255 255/.55)}.awstat-row em{display:block;color:rgb(255 255 255/.33);font-size:9px;font-style:normal}.awstat-note{margin-top:11px;padding:12px 14px;border-left:3px solid #d9b86c;background:rgb(217 184 108/.055);color:rgb(255 255 255/.5);font-size:11.5px;line-height:1.65}
    @media(max-width:1050px){.awstat-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.awstat-grid{grid-template-columns:repeat(2,1fr)}.awstat-panels{grid-template-columns:1fr}}@media(max-width:430px){.awstat-grid{grid-template-columns:1fr 1fr}.awstat-row{grid-template-columns:1fr 58px 58px}}
  `;
  document.head.append(style);
}

function flatten(data) {
  const rows = [];
  for (const stage of data.stages || []) for (const item of stage.items || []) rows.push(item);
  for (const item of data.orphans || []) rows.push(item);
  const map = new Map();
  for (const row of rows) {
    const id = String(row.id || '');
    if (!id) continue;
    const prev = map.get(id) || { id, events:0, users:0 };
    prev.events += Number(row.events || 0);
    prev.users += Number(row.users || 0);
    map.set(id, prev);
  }
  return map;
}

function exact(map, id) {
  return map.get(id) || { id, events:0, users:0 };
}

function prefix(map, start) {
  let events = 0, users = 0;
  for (const row of map.values()) {
    if (!row.id.startsWith(start)) continue;
    events += row.events;
    users += row.users;
  }
  return { events, users };
}

function row(label, data) {
  return `<div class="awstat-row"><b>${esc(label)}</b><span>${fmt(data.events)}<em>ครั้ง</em></span><span>${fmt(data.users)}<em>เครื่อง</em></span></div>`;
}

function render(data) {
  const map = flatten(data);
  const entered = exact(map, 'awaken-open');
  const read = exact(map, 'awaken-run-read');
  const rush = exact(map, 'awaken-run-rush');
  const chests = exact(map, 'awaken-chest-open');
  const salt = exact(map, 'awaken-loot-salt');
  const xp = exact(map, 'awaken-xp-used');
  const timeBox = exact(map, 'awaken-explore-time-saver');
  const partyBox = exact(map, 'awaken-explore-party-loadout');
  const loadouts = prefix(map, 'awaken-loadout-');
  const explores = prefix(map, 'awaken-explore-');
  const classified = read.users + rush.users;
  const rushRate = classified ? (rush.users / classified) * 100 : 0;
  const saltRate = chests.users ? (salt.users / chests.users) * 100 : 0;

  const section = document.createElement('section');
  section.className = 'section awstat';
  section.innerHTML = `
    <p class="eyebrow2">CHAPTER 7 · BOSS BEHAVIOR · 30 DAYS</p>
    <h2>ใครอ่าน ใครรีบ และใครเปิดของจริง</h2>
    <p class="sub">Loot ไม่ใช้ดาวแล้ว แต่ละกล่องและม้วน EXP เป็นเหตุการณ์แยก ไม่บังคับให้ใครเปิดครบ</p>
    <div class="awstat-grid">
      <article class="awstat-card"><span>เข้าหน้าบอส</span><strong>${fmt(entered.users)}</strong><small>${fmt(entered.events)} ครั้ง</small></article>
      <article class="awstat-card good"><span>อ่านเกิน 10 วินาที</span><strong>${fmt(read.users)}</strong><small>${classified ? pct(100-rushRate) : 'ยังไม่มีฐาน'}</small></article>
      <article class="awstat-card"><span>ต่ำกว่า 10 วินาที</span><strong>${fmt(rush.users)}</strong><small>${classified ? pct(rushRate) : 'ยังไม่มีฐาน'}</small></article>
      <article class="awstat-card"><span>เปิดหีบ</span><strong>${fmt(chests.users)}</strong><small>Achievement เดียว</small></article>
      <article class="awstat-card salt"><span>ได้เกลือ</span><strong>${fmt(salt.users)}</strong><small>${chests.users ? pct(saltRate)+' ของคนเปิดหีบ' : 'ยังไม่มีคนเปิดหีบ'}</small></article>
    </div>
    <div class="awstat-panels">
      <article class="awstat-panel">
        <h3>⏱ Active Time ตอนเปิดหีบ</h3><p>นับเฉพาะเวลาที่หน้าอยู่ตรงหน้า เกลือมีเงื่อนไขเดียวคือต่ำกว่า 10 วินาที</p>
        <div class="awstat-rows">
          ${row('ต่ำกว่า 10 วินาที', exact(map,'awaken-run-under-10s'))}
          ${row('10–30 วินาที', exact(map,'awaken-run-10-30s'))}
          ${row('30–90 วินาที', exact(map,'awaken-run-30-90s'))}
          ${row('เกิน 90 วินาที', exact(map,'awaken-run-over-90s'))}
        </div>
      </article>
      <article class="awstat-panel">
        <h3>🧰 Loot แยกตามเหตุการณ์</h3><p>ไม่มีดาว ไม่มีเกณฑ์เปิด 2 หรือ 5 ห้อง</p>
        <div class="awstat-rows">
          ${row('เปิดหีบ', chests)}
          ${row('ใช้ม้วน EXP', xp)}
          ${row('😴 เปิดกล่อง 14 วัน', timeBox)}
          ${row('🔌 เปิดกล่อง Party', partyBox)}
          ${row('🎒 เปิด Loadout สมาชิก', loadouts)}
          ${row('🧂 เกลือต่ำกว่า 10 วิ', salt)}
        </div>
      </article>
    </div>
    <div class="awstat-note">ยอด Side Quest แบบรวมมี ${fmt(explores.events)} ครั้ง จาก ${fmt(explores.users)} เครื่อง · “เครื่อง” คือ Anonymous Installation ID ไม่ใช่คนจริง 1:1 และการเปิดหลาย Loadout นับเป็นหลายเหตุการณ์ตามที่เกิดขึ้นจริง</div>`;

  const rooms = document.getElementById('rooms')?.closest('.section');
  (rooms || document.getElementById('dashboard'))?.insertAdjacentElement(rooms ? 'beforebegin' : 'beforeend', section);
}

async function boot() {
  if (!isDashboard() || document.querySelector('.awstat')) return;
  injectStyles();
  try {
    const data = await fetchCore7AchievementStats({ from:bkkDay(29), to:bkkDay(0) });
    render(data);
  } catch (error) {
    console.warn('AWAKEN stat unavailable', error);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
