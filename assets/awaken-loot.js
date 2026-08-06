/* myClover · AWAKEN boss loot
   - เพิ่ม Hotkey / Turn Reference เป็น Optional Side Quest
   - จำกล่องที่ผู้เล่นเปิด และสถานะสมุดลับ
   - แทนฉาก Level Up อัตโนมัติด้วยหีบที่ต้องกดเปิดเอง
*/

const EXPLORE_KEY = 'mc_awaken_explore_v1';
const LOOT_KEY = 'mc_awaken_loot_v1';

function isBossPage() {
  return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname);
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

function readFlag(key) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function explored() {
  const value = readJSON(EXPLORE_KEY, []);
  return new Set(Array.isArray(value) ? value : []);
}

function markExplore(id) {
  if (!id) return;
  const set = explored();
  if (set.has(id)) return;
  set.add(id);
  writeJSON(EXPLORE_KEY, [...set]);
  try { window.MC_ACT?.(`awaken-explore-${id}`); } catch { /* optional */ }
}

function injectStyles() {
  if (document.getElementById('awaken-loot-style')) return;
  const style = document.createElement('style');
  style.id = 'awaken-loot-style';
  style.textContent = `
    .turn-hotkey-demo{display:grid;gap:10px;margin:16px 0}.turn-hotkey-demo article{padding:14px 15px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(0,0,0,.2)}.turn-hotkey-demo b{display:block;color:#91e2bc!important;-webkit-text-fill-color:#91e2bc!important;font-size:13px!important}.turn-hotkey-demo p{margin-top:5px!important;color:rgba(248,246,240,.84)!important;-webkit-text-fill-color:rgba(248,246,240,.84)!important;font-size:14px!important;line-height:1.72!important}
    .hotkey-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.hotkey-compare div{padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(0,0,0,.17)}.hotkey-compare b{display:block;color:#f0d58e!important;-webkit-text-fill-color:#f0d58e!important;font-size:13px!important}.hotkey-compare p{margin-top:5px!important;color:rgba(248,246,240,.78)!important;-webkit-text-fill-color:rgba(248,246,240,.78)!important;font-size:13.5px!important;line-height:1.68!important}
    .hotkey-truth{margin-top:15px;padding:14px 15px;border:1px solid rgba(42,154,104,.35);border-left:4px solid #2a9a68;border-radius:13px;background:rgba(42,154,104,.075);color:rgba(248,246,240,.84)!important;-webkit-text-fill-color:rgba(248,246,240,.84)!important;font-size:14px;line-height:1.75}.hotkey-truth strong{color:#fff!important;-webkit-text-fill-color:#fff!important}

    .loot-screen{width:min(540px,100%);max-height:91dvh;overflow:auto;padding:4px 2px 18px;overscroll-behavior:contain}.loot-screen .micro{color:rgba(255,255,255,.52);font:750 10.5px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.18em}.loot-screen .big{margin-top:8px;color:#d9b967;font:850 clamp(31px,9vw,48px)/1.15 "Bai Jamjuree",sans-serif;text-shadow:0 0 34px rgba(217,185,103,.42)}.loot-screen .say{margin-top:14px;color:rgba(248,246,240,.82);font-size:15.5px;line-height:1.85}.loot-screen .say strong{color:#fff}.loot-chest{display:grid;place-items:center;width:132px;height:112px;margin:21px auto 7px;border:1px solid rgba(217,185,103,.5);border-radius:20px;background:radial-gradient(circle at 50% 35%,rgba(217,185,103,.3),rgba(217,185,103,.06) 58%,transparent 72%);font-size:67px;filter:drop-shadow(0 18px 28px rgba(0,0,0,.48));animation:lootFloat 2.3s ease-in-out infinite}.loot-actions{display:grid;gap:9px;margin-top:21px}.loot-actions button,.loot-actions a{display:flex;align-items:center;justify-content:center;min-height:50px;border:0;border-radius:12px;padding:12px 18px;background:#d9b967;color:#07110b;font:800 14px/1.45 "Bai Jamjuree",sans-serif;cursor:pointer;text-decoration:none}.loot-actions .secondary{border:1px solid rgba(255,255,255,.2);background:none;color:rgba(248,246,240,.72)}
    .loot-stars{margin:15px 0 4px;color:#d9b967;font-size:30px;letter-spacing:.08em;text-shadow:0 0 22px rgba(217,185,103,.38)}.loot-rank{color:#91e2bc;font:800 11px/1.6 "Bai Jamjuree",sans-serif;letter-spacing:.15em}.loot-list{display:grid;gap:9px;margin-top:19px;text-align:left}.loot-item{display:grid;grid-template-columns:42px 1fr;gap:11px;align-items:center;padding:11px 13px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(255,255,255,.04)}.loot-item .icon{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:rgba(217,185,103,.1);font-size:23px}.loot-item b{display:block;color:#fff;font:750 14px/1.45 "Bai Jamjuree",sans-serif}.loot-item small{display:block;margin-top:2px;color:rgba(248,246,240,.57);font-size:12.5px;line-height:1.55}.loot-code{margin-top:18px;border:1px solid rgba(217,185,103,.4);border-radius:14px;padding:14px;background:rgba(217,185,103,.08)}.loot-code small{display:block;color:rgba(248,246,240,.5);font:700 10px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.15em}.loot-code strong{display:block;margin-top:4px;color:#d9b967;font:850 28px/1.4 "Bai Jamjuree",sans-serif;letter-spacing:.2em}.loot-note{margin-top:14px;color:rgba(248,246,240,.5);font-size:12.5px;line-height:1.65}
    @keyframes lootFloat{50%{transform:translateY(-7px)}}
    @media(max-width:560px){.hotkey-compare{grid-template-columns:1fr}.loot-screen{max-height:94dvh}.loot-chest{width:118px;height:102px;font-size:60px}}
    @media(prefers-reduced-motion:reduce){.loot-chest{animation:none}}
  `;
  document.head.append(style);
}

function createAccordion(title, bodyHTML) {
  const box = document.createElement('section');
  box.className = 'boss-more turn-hotkey-quest';
  box.dataset.exploreId = 'turn-hotkey';
  const id = `turn-hotkey-${Math.random().toString(36).slice(2, 9)}`;
  box.innerHTML = `
    <button class="boss-more-toggle" type="button" aria-expanded="false" aria-controls="${id}">
      <span>${title}</span><span class="boss-more-icon" aria-hidden="true">+</span>
    </button>
    <div class="boss-more-body" id="${id}" hidden>${bodyHTML}</div>`;
  const button = box.querySelector('button');
  const body = box.querySelector('.boss-more-body');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    box.classList.toggle('is-open', open);
    body.hidden = !open;
    box.querySelector('.boss-more-icon').textContent = open ? '−' : '+';
    if (open) markExplore('turn-hotkey');
  });
  return box;
}

function addHotkeyQuest() {
  const host = document.querySelector('.language-sidequest');
  if (!host || host.querySelector('.turn-hotkey-quest')) return false;

  const body = `
    <p>เวลาคุยอยู่ใน Session เดียวกัน ไอ้ทีมไม่จำเป็นต้องก๊อปข้อความยาวกลับมาใหม่ทุกครั้ง มันใช้ “พิกัดบทสนทนา” เหมือนเกมเมอร์กด Hotkey</p>
    <div class="turn-hotkey-demo">
      <article><b>ตัวอย่าง 1</b><p>“ย้อนกลับไปดู 3 ข้อความล่าสุดที่พูดเรื่อง Loot แล้วเกลาให้เป็นระบบเดียวกัน”</p></article>
      <article><b>ตัวอย่าง 2</b><p>“เอากติกาจาก 7 เทิร์นก่อน ส่งต่อให้ Claude แล้วแก้เฉพาะ UI ห้ามแตะ Engine”</p></article>
    </div>
    <p>คำว่า <strong>3 เทิร์นก่อน</strong> หรือ <strong>7 เทิร์นก่อน</strong> ทำหน้าที่เหมือนพิกัดบน Timeline ถ้า AI เห็นประวัติเดียวกัน มันย้อนกลับไปหา Context ได้เร็ว โดยไม่ต้องให้คนสั่งเล่าเหตุการณ์ทั้งหมดอีกรอบ</p>
    <div class="hotkey-compare">
      <div><b>🖱️ คลิกเมาส์ทุกคำสั่ง</b><p>หาแชต เลื่อนกลับ ก๊อปข้อความ วางใหม่ อธิบายว่าอันไหนสำคัญ แล้วค่อยเริ่มงาน</p></div>
      <div><b>⌨️ ใช้ Hotkey</b><p>บอกพิกัด + สิ่งที่ต้องทำ + ข้อห้าม แล้วเดินงานต่อทันที เพราะทั้ง Party รู้กติกาชุดเดียวกัน</p></div>
      <div><b>🚙 เกียร์กระปุก</b><p>ต้องคิดคลัตช์ เกียร์ รอบเครื่อง และจังหวะปล่อยเท้าทุกครั้ง ถึงจะขับถึงที่เหมือนกัน</p></div>
      <div><b>🚗 เกียร์ออโต้</b><p>สมองเหลือไปมองถนน ตัดสินใจ และแก้สถานการณ์มากขึ้น ถ้าไม่เชื่อ ลองไปขับเกียร์กระปุกทั้งวันดู</p></div>
    </div>
    <p class="hotkey-truth"><strong>แต่ระวัง:</strong> AI อีกแอปไม่ได้เห็น “7 เทิร์นก่อน” ของแอปนี้โดยอัตโนมัติ เวลาส่งไม้ข้าม Party ต้องแนบข้อความส่วนนั้น หรือส่ง Source / Handoff ที่มีพิกัดและบริบทครบ ภาษาลัดทำงานได้เพราะมี Shared State รองรับ ไม่ใช่เพราะ AI ทุกตัวแอบอ่านใจกัน</p>
    <p class="boss-verdict">นี่คือประโยชน์ระยะยาวของ Keyword: มึงเปลี่ยนคำสั่งที่เคยต้องใช้ 5 ขั้น ให้เหลือ 1 คำที่ทุกคนรู้ความหมาย เหมือน Hotkey ไม่ได้ทำให้คอมแรงขึ้น แต่มันทำให้คนสั่งไม่ต้องเดินอ้อมเมนูเดิมตลอดชีวิต</p>`;

  host.append(createAccordion('⌨️ Hotkey ของ Party · “7 เทิร์นก่อน” คือพิกัดงาน', body));
  return true;
}

const TITLE_MAP = [
  [/AI.*คิดเป็นภาษา|ภาษาที่กูใช้/, 'direct-language'],
  [/ภาษาไทยลงรายละเอียด/, 'thai-depth'],
  [/14 วันที่/, 'time-saver'],
  [/Source และ.*\.md|Source.*ภาษา/, 'source-passport'],
  [/ภาษาของ Party|มานาหมด/, 'party-language'],
  [/Hotkey|เทิร์นก่อน/, 'turn-hotkey'],
  [/RTS/, 'rts-commander'],
  [/เปิดดูปาร์ตี้/, 'party-loadout']
];

function exploreIdForButton(button) {
  const explicit = button.closest('[data-explore-id]')?.dataset.exploreId;
  if (explicit) return explicit;
  const title = button.textContent.replace(/[+−]/g, '').trim();
  const match = TITLE_MAP.find(([pattern]) => pattern.test(title));
  return match?.[1] || '';
}

function trackAccordionClicks() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('.boss-more-toggle');
    if (!button) return;
    queueMicrotask(() => {
      if (button.getAttribute('aria-expanded') === 'true') markExplore(exploreIdForButton(button));
    });
  }, true);

  const bookGo = document.getElementById('bookGo');
  if (bookGo) bookGo.addEventListener('click', () => markExplore('notebook-entered'));
}

function syncNotebookState() {
  if (readFlag('mc_nb_seen')) markExplore('notebook-entered');
  if (readFlag('mc_nb_restored')) markExplore('notebook-restored');
  if (readFlag('mc_secret_end')) markExplore('notebook-secret');
}

function rankFor(stars) {
  return [
    '',
    '★ BOSS RUSH',
    '★★ CURIOUS PLAYER',
    '★★★ DUNGEON SCOUT',
    '★★★★ LORE KEEPER',
    '★★★★★ SECRET SEEKER'
  ][stars];
}

function calculateLoot() {
  syncNotebookState();
  const set = explored();
  const optionalIds = ['direct-language','thai-depth','time-saver','source-passport','party-language','turn-hotkey','rts-commander','party-loadout'];
  const opened = optionalIds.filter(id => set.has(id)).length;
  const restored = readFlag('mc_nb_restored');
  const secret = readFlag('mc_secret_end');

  let stars = 1;
  if (opened >= 2) stars += 1;
  if (opened >= 5) stars += 1;
  if (restored) stars += 1;
  if (secret) stars += 1;
  stars = Math.min(5, stars);

  const items = [
    { icon:'📜', name:'ม้วนประสบการณ์ ×3', note:'ของพื้นฐานสำหรับทุกคนที่ Clear ด่านและปลุก AWAKEN' }
  ];
  if (set.has('direct-language') || set.has('thai-depth')) items.push({icon:'🗣️',name:'Rune of Native Tongue',note:'ได้จากการสำรวจว่าภาษาแม่ลดระยะทางระหว่างความคิดกับคำสั่ง'});
  if (set.has('time-saver')) items.push({icon:'⏳',name:'Chrono Shard',note:'ได้จากการเปิดดูต้นทุนเวลาที่สะสมจากคำเล็ก ๆ ทั้งปี'});
  if (set.has('source-passport')) items.push({icon:'🌐',name:'Source Passport',note:'พกความรู้ข้ามโมเดล ข้ามทีม และข้ามภาษา'});
  if (set.has('party-language') || set.has('turn-hotkey')) items.push({icon:'⌨️',name:'Party Hotkey Codex',note:'ภาษาลัดที่ทำงานได้เพราะ Party ใช้ Shared State เดียวกัน'});
  if (set.has('rts-commander')) items.push({icon:'🎖️',name:'Commander’s Build Order',note:'มอง Queue, Resource, Cooldown และ Unit เป็นระบบเดียว'});
  if (set.has('party-loadout')) items.push({icon:'🧭',name:'Party Compass',note:'รู้ว่า AI ตัวไหนควรรับไม้ช่วงไหน และมนุษย์ต้องตัดตรงไหน'});
  if (set.has('notebook-entered')) items.push({icon:'📓',name:'แผนที่สมุดลับ',note:'ได้จากการออกนอกเส้น Main Quest ไปเปิดของเก่าที่ถูกซ่อนไว้'});
  if (restored) items.push({icon:'🔨',name:'Restored Memory',note:'ใช้ BLACKSMITH ซ่อมสิ่งที่เวลาเคยทำให้เลือนหาย'});
  if (secret) items.push({icon:'🍀',name:'Playmate Relic',note:'Loot ลับจากการเดินสมุดไปจนถึง WELL PLAYED'});

  return { version:1, stars, rank:rankFor(stars), opened, items, claimedAt:Date.now() };
}

function itemHTML(item) {
  return `<div class="loot-item"><span class="icon">${item.icon}</span><span><b>${item.name}</b><small>${item.note}</small></span></div>`;
}

function renderLootResult(host, loot) {
  host.innerHTML = `
    <div class="loot-screen">
      <div class="micro">BOSS CHEST OPENED · PERSONAL LOOT</div>
      <div class="loot-stars">${'★'.repeat(loot.stars)}${'☆'.repeat(5-loot.stars)}</div>
      <div class="loot-rank">${loot.rank}</div>
      <p class="say">มึง Clear ด่านเหมือนทุกคน แต่ของในหีบไม่เหมือนทุกคน เพราะกูดูว่า <strong>มึง Rush Boss หรือเดินเปิดห้องข้างทางมาด้วย</strong></p>
      <div class="loot-list">${loot.items.map(itemHTML).join('')}</div>
      <div class="loot-code"><small>RESTORE CODE</small><strong>AWAKEN</strong></div>
      <p class="loot-note">ดาวและ Loot เป็นของจำลองประจำด่านนี้ ตรา AWAKEN จริงยังถูกบันทึกด้วยระบบ Quest เดิม ไม่ได้ผูกกับจำนวนดาว และคน Rush Boss ก็ไม่ถูกล็อกออกจากเนื้อหาหลัก</p>
      <div class="loot-actions">
        <a href="../../card/">อัปเดต Player Card</a>
        <a class="secondary" href="../">กลับห้องเรียน</a>
        <button class="secondary" type="button" data-loot-close>ปิดหีบแล้วอ่านต่อ</button>
      </div>
    </div>`;
  host.querySelector('[data-loot-close]')?.addEventListener('click', closeAwaken);
  host.querySelector('a')?.focus();
}

function closeAwaken() {
  const modal = document.getElementById('awaken');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  document.getElementById('replay')?.focus();
}

function renderChest(host) {
  const claimed = readJSON(LOOT_KEY, null);
  if (claimed?.version === 1) {
    renderLootResult(host, claimed);
    return;
  }

  host.innerHTML = `
    <div class="loot-screen">
      <div class="micro">DUNGEON CLEAR · LOOT NOT CLAIMED</div>
      <div class="big">หีบบอส</div>
      <div class="loot-chest" aria-hidden="true">🧰</div>
      <p class="say">มึงจะ Rush Boss ก็ได้ กูไม่ห้าม ทุกคนที่อ่านจบได้ <strong>ม้วนประสบการณ์ 3 ม้วน</strong> และปลุก AWAKEN เหมือนกัน</p>
      <p class="say">แต่คนที่เปิด Side Quest ใช้ Hotkey สำรวจ Party หรือเข้าไปซ่อมสมุด จะมีของจำลองเพิ่มตามสิ่งที่ทำจริงก่อนเปิดหีบนี้</p>
      <div class="loot-actions">
        <button type="button" data-open-loot>เปิดหีบ · สรุป Loot ของกู</button>
        <button class="secondary" type="button" data-explore-more>ยังไม่เปิด · กลับไปสำรวจก่อน</button>
      </div>
      <p class="loot-note">Loot จะถูกล็อกตอนกดเปิดครั้งแรก หลังจากนั้นกลับมาดูซ้ำได้ แต่เปิดกล่องเพิ่มทีหลังแล้วของจะไม่งอก เพราะนี่คือหีบ ไม่ใช่บัญชีเงินฝาก</p>
    </div>`;

  host.querySelector('[data-open-loot]')?.addEventListener('click', () => {
    const loot = calculateLoot();
    writeJSON(LOOT_KEY, loot);
    try { window.MC_ACT?.(`awaken-loot-${loot.stars}-stars`); } catch { /* optional */ }
    renderLootResult(host, loot);
  });
  host.querySelector('[data-explore-more]')?.addEventListener('click', closeAwaken);
  host.querySelector('[data-open-loot]')?.focus();
}

function interceptAwakenModal() {
  const modal = document.getElementById('awaken');
  const host = document.getElementById('awIn');
  if (!modal || !host) return;

  const replace = () => {
    if (modal.hidden) return;
    if (host.querySelector('.loot-screen')) return;
    renderChest(host);
  };

  new MutationObserver(replace).observe(modal, { attributes:true, attributeFilter:['hidden'] });
  new MutationObserver(replace).observe(host, { childList:true });
  replace();
}

function waitForSideQuest() {
  if (addHotkeyQuest()) return;
  const observer = new MutationObserver(() => {
    if (addHotkeyQuest()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  window.setTimeout(() => observer.disconnect(), 5000);
}

function boot() {
  if (!isBossPage() || document.documentElement.dataset.awakenLoot === '1') return;
  document.documentElement.dataset.awakenLoot = '1';
  injectStyles();
  syncNotebookState();
  trackAccordionClicks();
  waitForSideQuest();
  interceptAwakenModal();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
