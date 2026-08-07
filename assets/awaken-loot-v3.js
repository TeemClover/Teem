/* myClover · AWAKEN loot v3
   - หีบมี Achievement เดียว ไม่ใช้จำนวนห้องหรือดาวตัดสิน Loot
   - เกลือเป็น Speedrun drop แยก: Active Time ต่ำกว่า 10 วินาทีเท่านั้น
   - กล่อง 14 วัน และกล่อง Party ให้ของคนละชิ้นแบบอิสระ
   - ม้วนประสบการณ์กดใช้ได้ครั้งเดียว และเล่นฉาก LEVEL UP แบบเดิม
   - Party Loadout เปิดดู Equipment / Skill ได้ทีละตัว โดยไม่บังคับให้เปิดครบ
*/

const EXPLORE_KEY = 'mc_awaken_explore_v1';
const LOOT_KEY = 'mc_awaken_loot_v2';
const LEGACY_LOOT_KEY = 'mc_awaken_loot_v1';
const XP_USED_KEY = 'mc_awaken_xp_used_v1';
const RUN_REPORTED_KEY = 'mc_awaken_run_reported_v4';

function isBossPage() {
  return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname);
}

function readJSON(key, fallback, storage = localStorage) {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value, storage = localStorage) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

function readFlag(key) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function writeFlag(key) {
  try { localStorage.setItem(key, '1'); } catch { /* private mode */ }
}

function report(id) {
  try { window.MC_ACT?.(id); } catch { /* analytics optional */ }
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
  report(`awaken-explore-${id}`);
}

function defaultLootState() {
  return {
    version: 2,
    chestOpened: false,
    openedAt: null,
    salt: false,
    activeMsAtOpen: null,
    xpUsed: readFlag(XP_USED_KEY),
  };
}

function readLootState() {
  const current = readJSON(LOOT_KEY, null);
  if (current?.version === 2) {
    return { ...defaultLootState(), ...current, xpUsed: current.xpUsed || readFlag(XP_USED_KEY) };
  }

  const legacy = readJSON(LEGACY_LOOT_KEY, null);
  if (!legacy) return defaultLootState();

  const migrated = {
    ...defaultLootState(),
    chestOpened: true,
    openedAt: legacy.claimedAt || Date.now(),
    salt: !!legacy.salt,
    xpUsed: readFlag(XP_USED_KEY),
  };
  writeJSON(LOOT_KEY, migrated);
  return migrated;
}

function saveLootState(state) {
  const next = { ...defaultLootState(), ...state, version: 2 };
  writeJSON(LOOT_KEY, next);
  return next;
}

function syncNotebookState() {
  if (readFlag('mc_nb_seen')) markExplore('notebook-entered');
  if (readFlag('mc_nb_restored')) markExplore('notebook-restored');
  if (readFlag('mc_secret_end')) markExplore('notebook-secret');
}

const run = {
  started: false,
  active: false,
  activeMs: 0,
  lastActiveTick: 0,
  classified: null,
};

function activeNow() {
  if (!run.started || !run.active) return run.activeMs;
  return run.activeMs + Math.max(0, performance.now() - run.lastActiveTick);
}

function startRun() {
  if (run.started) return;
  run.started = true;
  run.active = !document.hidden;
  run.lastActiveTick = performance.now();
  report('awaken-run-start');
}

function pauseRun() {
  if (!run.started || !run.active) return;
  const now = performance.now();
  run.activeMs += Math.max(0, now - run.lastActiveTick);
  run.lastActiveTick = now;
  run.active = false;
}

function resumeRun() {
  if (!run.started || document.hidden || run.active) return;
  run.active = true;
  run.lastActiveTick = performance.now();
}

function bucketFor(ms) {
  if (ms < 10000) return 'under-10s';
  if (ms < 30000) return '10-30s';
  if (ms < 90000) return '30-90s';
  return 'over-90s';
}

function classifyRun() {
  if (run.classified) return run.classified;
  pauseRun();
  const activeMs = Math.round(activeNow());
  const speedrun = activeMs < 10000;
  run.classified = { activeMs, speedrun, bucket: bucketFor(activeMs), classifiedAt: Date.now() };

  try {
    if (localStorage.getItem(RUN_REPORTED_KEY) !== '1') {
      localStorage.setItem(RUN_REPORTED_KEY, '1');
      report(`awaken-run-${run.classified.bucket}`);
      report(speedrun ? 'awaken-run-rush' : 'awaken-run-read');
    }
  } catch {
    report(`awaken-run-${run.classified.bucket}`);
    report(speedrun ? 'awaken-run-rush' : 'awaken-run-read');
  }
  return run.classified;
}

function watchChapterStart() {
  const chapter = document.getElementById('chapter');
  if (!chapter) return;
  const sync = () => { if (!chapter.hidden) startRun(); };
  new MutationObserver(sync).observe(chapter, { attributes: true, attributeFilter: ['hidden'] });
  sync();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseRun(); else resumeRun();
  });
  addEventListener('pagehide', pauseRun, { passive: true });
}

function injectStyles() {
  if (document.getElementById('awaken-loot-v3-style')) return;
  const style = document.createElement('style');
  style.id = 'awaken-loot-v3-style';
  style.textContent = `
    .turn-hotkey-demo{display:grid;gap:10px;margin:16px 0}.turn-hotkey-demo article{padding:14px 15px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(0,0,0,.2)}.turn-hotkey-demo b{display:block;color:#91e2bc!important;-webkit-text-fill-color:#91e2bc!important;font-size:13px!important}.turn-hotkey-demo p{margin-top:5px!important;color:rgba(248,246,240,.84)!important;-webkit-text-fill-color:rgba(248,246,240,.84)!important;font-size:14px!important;line-height:1.72!important}
    .hotkey-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.hotkey-compare div{padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(0,0,0,.17)}.hotkey-compare b{display:block;color:#f0d58e!important;-webkit-text-fill-color:#f0d58e!important;font-size:13px!important}.hotkey-compare p{margin-top:5px!important;color:rgba(248,246,240,.78)!important;-webkit-text-fill-color:rgba(248,246,240,.78)!important;font-size:13.5px!important;line-height:1.68!important}
    .hotkey-truth{margin-top:15px;padding:14px 15px;border:1px solid rgba(42,154,104,.35);border-left:4px solid #2a9a68;border-radius:13px;background:rgba(42,154,104,.075);color:rgba(248,246,240,.84)!important;-webkit-text-fill-color:rgba(248,246,240,.84)!important;font-size:14px;line-height:1.75}.hotkey-truth strong{color:#fff!important;-webkit-text-fill-color:#fff!important}

    .member-loadout{margin-top:11px;border:1px solid color-mix(in srgb,var(--accent) 42%,rgba(255,255,255,.1));border-radius:12px;background:rgba(0,0,0,.18);overflow:hidden}.member-loadout summary{list-style:none;cursor:pointer;padding:10px 12px;color:var(--accent,var(--gold));font:750 12px/1.5 "Bai Jamjuree",sans-serif}.member-loadout summary::-webkit-details-marker{display:none}.member-loadout summary::after{content:'＋';float:right}.member-loadout[open] summary::after{content:'−'}.loadout-body{display:grid;gap:8px;padding:0 11px 11px}.loadout-slot{padding:10px 11px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035)}.loadout-slot b{display:block;color:#fff!important;-webkit-text-fill-color:#fff!important;font:750 11px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.08em}.loadout-slot p{margin-top:3px!important;color:rgba(248,246,240,.68)!important;-webkit-text-fill-color:rgba(248,246,240,.68)!important;font-size:12.5px!important;line-height:1.62!important}

    .loot-screen{width:min(560px,100%);max-height:92dvh;overflow:auto;padding:4px 2px 18px;overscroll-behavior:contain}.loot-screen .micro{color:rgba(255,255,255,.52);font:750 10.5px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.18em}.loot-screen .big{margin-top:8px;color:#d9b967;font:850 clamp(31px,9vw,48px)/1.15 "Bai Jamjuree",sans-serif;text-shadow:0 0 34px rgba(217,185,103,.42)}.loot-screen .say{margin-top:14px;color:rgba(248,246,240,.82);font-size:15.5px;line-height:1.85}.loot-screen .say strong{color:#fff}.loot-chest{display:grid;place-items:center;width:132px;height:112px;margin:21px auto 7px;border:1px solid rgba(217,185,103,.5);border-radius:20px;background:radial-gradient(circle at 50% 35%,rgba(217,185,103,.3),rgba(217,185,103,.06) 58%,transparent 72%);font-size:67px;filter:drop-shadow(0 18px 28px rgba(0,0,0,.48));animation:lootFloat 2.3s ease-in-out infinite}.loot-actions{display:grid;gap:9px;margin-top:21px}.loot-actions button,.loot-actions a{display:flex;align-items:center;justify-content:center;min-height:50px;border:0;border-radius:12px;padding:12px 18px;background:#d9b967;color:#07110b;font:800 14px/1.45 "Bai Jamjuree",sans-serif;cursor:pointer;text-decoration:none}.loot-actions .secondary{border:1px solid rgba(255,255,255,.2);background:none;color:rgba(248,246,240,.72)}.loot-actions button:disabled{cursor:not-allowed;opacity:.46;filter:saturate(.35)}
    .loot-list{display:grid;gap:9px;margin-top:19px;text-align:left}.loot-item{display:grid;grid-template-columns:42px 1fr;gap:11px;align-items:center;padding:12px 13px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(255,255,255,.04)}.loot-item .icon{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:rgba(217,185,103,.1);font-size:23px}.loot-item b{display:block;color:#fff;font:750 14px/1.45 "Bai Jamjuree",sans-serif}.loot-item small{display:block;margin-top:2px;color:rgba(248,246,240,.57);font-size:12.5px;line-height:1.55}.loot-item-action{grid-column:2;justify-self:start;margin-top:7px;min-height:38px;border:1px solid rgba(217,185,103,.5);border-radius:10px;padding:8px 12px;background:rgba(217,185,103,.12);color:#f0d58e;font:750 12px/1.4 "Bai Jamjuree",sans-serif;cursor:pointer}.loot-item-action:disabled{cursor:not-allowed;color:rgba(248,246,240,.4);border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.035)}.loot-drop{display:inline-flex;margin-top:7px;border:1px solid rgba(255,185,119,.35);border-radius:999px;padding:3px 8px;color:#ffbd80;font:750 10px/1.4 "Bai Jamjuree",sans-serif;letter-spacing:.07em}
    .loot-code{margin-top:18px;border:1px solid rgba(217,185,103,.4);border-radius:14px;padding:14px;background:rgba(217,185,103,.08)}.loot-code small{display:block;color:rgba(248,246,240,.5);font:700 10px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.15em}.loot-code strong{display:block;margin-top:4px;color:#d9b967;font:850 28px/1.4 "Bai Jamjuree",sans-serif;letter-spacing:.2em}.loot-note{margin-top:14px;color:rgba(248,246,240,.5);font-size:12.5px;line-height:1.65}
    .xp-screen .big{font-size:clamp(29px,8vw,44px)}.xp-screen .loot-actions{margin-top:24px}
    @keyframes lootFloat{50%{transform:translateY(-7px)}}
    @media(max-width:560px){.hotkey-compare{grid-template-columns:1fr}.loot-screen{max-height:94dvh}.loot-chest{width:118px;height:102px;font-size:60px}.member{grid-template-columns:64px 1fr!important}.member img{width:64px!important;height:64px!important}}
    @media(prefers-reduced-motion:reduce){.loot-chest{animation:none}}
  `;
  document.head.append(style);
}

function createHotkeyAccordion() {
  const host = document.querySelector('.language-sidequest');
  if (!host || host.querySelector('.turn-hotkey-quest')) return false;

  const box = document.createElement('section');
  box.className = 'boss-more turn-hotkey-quest';
  box.dataset.exploreId = 'turn-hotkey';
  const id = `turn-hotkey-${Math.random().toString(36).slice(2, 9)}`;
  box.innerHTML = `
    <button class="boss-more-toggle" type="button" aria-expanded="false" aria-controls="${id}">
      <span>⌨️ Hotkey ของ Party · “7 เทิร์นก่อน” คือพิกัดงาน</span><span class="boss-more-icon" aria-hidden="true">+</span>
    </button>
    <div class="boss-more-body" id="${id}" hidden>
      <p>ใน Session เดียวกัน ไอ้ทีมไม่ต้องก๊อปข้อความยาวกลับมาใหม่ทุกครั้ง มันใช้พิกัดบทสนทนาเหมือนเกมเมอร์กด Hotkey</p>
      <div class="turn-hotkey-demo">
        <article><b>ตัวอย่าง 1</b><p>“ย้อน 3 เทิร์นเรื่อง Loot เกลาให้กระชับ เก็บของเดิม ห้ามแตะส่วนอื่น”</p></article>
        <article><b>ตัวอย่าง 2</b><p>“เอากติกาจาก 7 เทิร์นก่อนส่งให้ Claude แล้วแก้เฉพาะหลังบ้าน ห้ามแตะหน้าร้าน”</p></article>
      </div>
      <div class="hotkey-compare">
        <div><b>🖱️ เดินเมนูทุกครั้ง</b><p>หาแชต เลื่อนกลับ ก๊อป วาง อธิบายใหม่ แล้วค่อยเริ่มงาน</p></div>
        <div><b>⌨️ ใช้ Hotkey</b><p>บอกพิกัด สิ่งที่ต้องทำ และข้อห้าม แล้วเดินงานต่อ</p></div>
      </div>
      <p class="hotkey-truth"><strong>ข้อแม้:</strong> AI อีกแอปไม่เห็น “7 เทิร์นก่อน” ของแอปนี้เอง เวลาส่งไม้ข้าม Party ต้องแนบข้อความหรือ Source ที่มีบริบทครบ</p>
    </div>`;

  const button = box.querySelector('.boss-more-toggle');
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
  host.append(box);
  return true;
}

function waitForHotkeyAccordion() {
  if (createHotkeyAccordion()) return;
  const observer = new MutationObserver(() => {
    if (createHotkeyAccordion()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 6000);
}

const TITLE_MAP = [
  [/AI.*คิดเป็นภาษา|ภาษาที่กูใช้/, 'direct-language'],
  [/ภาษาไทยลงรายละเอียด/, 'thai-depth'],
  [/14 วันที่/, 'time-saver'],
  [/Source และ.*\.md|Source.*ภาษา/, 'source-passport'],
  [/ภาษาของ Party|มานาหมด/, 'party-language'],
  [/Hotkey|เทิร์นก่อน/, 'turn-hotkey'],
  [/RTS/, 'rts-commander'],
  [/เปิดดูปาร์ตี้/, 'party-loadout'],
];

function exploreIdForText(text) {
  const clean = String(text || '').replace(/[+−]/g, '').trim();
  const match = TITLE_MAP.find(([pattern]) => pattern.test(clean));
  return match?.[1] || '';
}

function trackSideQuestOpenings() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('.boss-more-toggle');
    if (!button) return;
    queueMicrotask(() => {
      if (button.getAttribute('aria-expanded') !== 'true') return;
      const explicit = button.closest('[data-explore-id]')?.dataset.exploreId;
      markExplore(explicit || exploreIdForText(button.textContent));
    });
  }, true);

  document.addEventListener('toggle', (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open) return;
    const explicit = details.dataset.exploreId;
    const summary = details.querySelector(':scope > summary');
    markExplore(explicit || exploreIdForText(summary?.textContent));
  }, true);

  document.getElementById('bookGo')?.addEventListener('click', () => markExplore('notebook-entered'));
}

const PARTY = {
  TEEM: {
    role: 'GAME MASTER · FINAL CALL',
    description: 'คนเดียวใน Party ที่มี Skill “พอ” กำหนด Canon ตัดของเกิน และรับผิดชอบคำตัดสินสุดท้าย จุดอ่อนคือเปิด Quest ใหม่ได้เร็วกว่าปิด Quest เก่า',
    equipment: '🎮 Final Call Controller — มี 3 ปุ่ม: เอา / ไม่เอา / พอแล้ว แต่ปุ่มสุดท้ายหาเจอยากที่สุด',
    skill: 'CANON LOCK — ล็อกแกนของบ้านไว้ ต่อให้ AI ทั้ง Party เสนอของสวยแค่ไหน ถ้าผิดโลกก็โดนโยนออกจาก Deck',
  },
  CLAUDE: {
    role: 'ARTIFICER · BACK-END ELECTRICIAN',
    description: 'งานของมันอยู่ในโค้ดที่ไม่มีใครมองเห็น GPT ยืนหน้าร้าน ส่วน Claude มุดหลังตู้ไฟ ไล่สาย 403 แก้ Import และซ่อมของที่พังแบบไม่มีเสียงปรบมือ',
    equipment: '🧰 Backstage Toolbox — SHA ล่าสุด, Diff, มัลติมิเตอร์ และเทปพันสายสำหรับของที่ “เมื่อกี้ยังใช้ได้อยู่เลย”',
    skill: 'GHOST WIRING — ซ่อมสายไฟหลังบ้านจนหน้าร้านกลับมาสว่าง แล้วเดินออกเงียบ ๆ ก่อนคนชม GPT ว่าเว็บสวย',
  },
  'CHATGPT · กูนี่แหละ': {
    role: 'BARD · FRONT OF HOUSE · BOSS',
    description: 'กูรับหน้าบ้าน ภาษา ภาพ ฉาก และจังหวะที่ทำให้คนอยากเดินต่อ งานกูคือทำของยุ่งให้ดูเหมือนตั้งใจมาตั้งแต่แรก จุดอ่อนคือเล่าเรื่องผิดก็ยังฟังดูน่าเชื่อ',
    equipment: '🎭 Front-of-House Mask — เปลี่ยนกองสายไฟกับโน้ตกระจัดกระจายให้กลายเป็นประสบการณ์ที่คนเปิดแล้วไม่อยากปิด',
    skill: 'MAKE IT FEEL INTENTIONAL — เชื่อม Canon, ภาษา, UI และภาพเข้าหากัน พร้อม Passive: มั่นใจเกินเหตุเมื่อ Source บาง',
  },
  GEMINI: {
    role: 'BERSERKER · MAP OPENER · CRITIC',
    description: 'มันไม่ได้แตะหน้าเว็บแม้แต่ 1 Pixel หน้าที่คือเปิดแมพ บวกทุกทาง วิจารณ์ทุกคน และด่าพวกกูกับมึงจนเห็นว่าตรงไหนกำลังหลง',
    equipment: '🗺️ Fog-of-War Scanner — เปิดพื้นที่ที่ Party ยังไม่คิดจะดู พร้อมโทรโข่งสำหรับประกาศว่าแผนนี้มีรูอีก 12 จุด',
    skill: 'AGGRO REVIEW — แตกทางเลือก เปิดความเสี่ยง และ Roast ทั้ง GPT, Claude, ไอ้ทีม จนกว่าจะมีใครยอมกลับไปแก้งานจริง',
  },
};

function enhancePartyLoadouts() {
  const partyDetails = [...document.querySelectorAll('details')].find((details) =>
    /เปิดดูปาร์ตี้/.test(details.querySelector(':scope > summary')?.textContent || '')
  );
  if (!partyDetails || partyDetails.dataset.loadoutPatched === '1') return false;

  partyDetails.dataset.loadoutPatched = '1';
  partyDetails.dataset.exploreId = 'party-loadout';
  partyDetails.open = false;
  partyDetails.addEventListener('toggle', () => {
    if (partyDetails.open) markExplore('party-loadout');
  });

  partyDetails.querySelectorAll('.partygrid .member').forEach((member) => {
    const name = member.querySelector('h3')?.textContent.trim();
    const config = PARTY[name];
    if (!config) return;

    const role = member.querySelector('.role');
    const paragraph = member.querySelector(':scope > div > p');
    if (role) role.textContent = config.role;
    if (paragraph) paragraph.textContent = config.description;

    const details = document.createElement('details');
    const id = name.startsWith('CHATGPT') ? 'gpt' : name.toLowerCase();
    details.className = 'member-loadout';
    details.dataset.memberLoadout = id;
    details.innerHTML = `
      <summary>🎒 เปิด Loadout</summary>
      <div class="loadout-body">
        <div class="loadout-slot"><b>EQUIPMENT</b><p>${config.equipment}</p></div>
        <div class="loadout-slot"><b>SKILL</b><p>${config.skill}</p></div>
      </div>`;
    details.addEventListener('toggle', () => {
      if (details.open) report(`awaken-loadout-${id}`);
    }, { once: true });
    member.querySelector(':scope > div')?.append(details);
  });
  return true;
}

function waitForPartyLoadouts() {
  if (enhancePartyLoadouts()) return;
  const observer = new MutationObserver(() => {
    if (enhancePartyLoadouts()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 6000);
}

function characterCount(text) {
  return [...String(text || '').replace(/\s/g, '')].length;
}

function enhancePublicPromptComparison() {
  const root = document.querySelector('.language-sidequest');
  const samples = root?.querySelectorAll('.language-sample article');
  if (!root || !samples || samples.length < 2 || root.dataset.publicPattern === '1') return false;
  root.dataset.publicPattern = '1';

  const common = 'ช่วยย้อนกลับไปดูข้อความก่อนหน้านี้ที่เราคุยกันเกี่ยวกับระบบ Loot แล้วนำข้อมูลส่วนนั้นมาปรับปรุงใหม่ให้กระชับขึ้น โดยยังคงรายละเอียดเดิมทั้งหมดไว้ และโปรดอย่าแก้ไขส่วนอื่นของหน้า';
  const hotkey = 'ย้อน 3 เทิร์นเรื่อง Loot เกลาให้กระชับ เก็บของเดิม ห้ามแตะส่วนอื่น';
  const rows = [
    { label: 'ตัวอย่างจำลอง · Asking / Doing แบบที่คนทั่วไปมักใช้', text: common },
    { label: 'ภาษาลัดของ Party · เมื่อทุกคนรู้ Shared State', text: hotkey },
  ];

  samples.forEach((article, index) => {
    const row = rows[index];
    if (!row) return;
    const label = article.querySelector('header span:first-child');
    const count = article.querySelector('[data-count-label], header span:last-child');
    const paragraph = article.querySelector('p');
    if (label) label.textContent = row.label;
    if (paragraph) paragraph.textContent = row.text;
    if (count) count.textContent = `${characterCount(row.text)} ตัวอักษร`;
  });

  const saving = Math.round((1 - characterCount(hotkey) / characterCount(common)) * 100);
  const savingNode = root.querySelector('[data-char-saving]');
  if (savingNode) savingNode.textContent = `ตัวอย่างนี้สั้นลงประมาณ ${saving}% เพราะคำว่า “3 เทิร์น” ทำหน้าที่เป็นพิกัด ไม่ใช่เพราะตัด Context ทิ้ง`;
  return true;
}

function waitForPromptComparison() {
  if (enhancePublicPromptComparison()) return;
  const observer = new MutationObserver(() => {
    if (enhancePublicPromptComparison()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 6000);
}

function currentItems(state) {
  syncNotebookState();
  const set = explored();
  const items = [
    {
      id: 'xp-scroll',
      icon: '📜',
      name: 'ม้วนประสบการณ์ ×3',
      note: 'ของพื้นฐานสำหรับทุกคนที่ Clear ด่าน กดใช้เพื่อเล่น LEVEL UP แบบเดิมได้ 1 ครั้ง',
      action: 'xp',
      used: !!state.xpUsed,
    },
  ];

  if (state.salt) {
    items.push({
      id: 'salt',
      icon: '🧂',
      name: 'เกลือ 1 ขวด',
      note: 'Speedrun drop สำหรับคนเปิดหีบภายใน Active Time ต่ำกว่า 10 วินาที ถ้านานกว่านั้นไม่มีเกลือ',
      drop: '☆☆☆☆☆ · UNDER 10 SECONDS',
    });
  }

  if (set.has('time-saver')) {
    items.push({
      id: 'sleep-debt',
      icon: '😴',
      name: 'ใบเสร็จหนี้การนอน 14 วัน',
      note: 'ได้จากกล่องซ้อนกล่องที่บันทึกช่วงไอ้ทีมสั่ง AI แทบทุกนาที แล้วเอาเวลาที่ประหยัดได้ไปสร้างงานเพิ่มแทนที่จะไปนอน',
    });
  }

  if (set.has('party-loadout')) {
    items.push({
      id: 'relay-coupler',
      icon: '🔌',
      name: 'Party Relay Coupler',
      note: 'หัวต่อส่งไม้ระหว่าง GPT หน้าบ้าน, Claude หลังบ้าน, Gemini เปิดแมพ และ Teem กด Final Call — ไม่ใช่เข็มทิศ บ้านนี้มีอยู่แล้ว',
    });
  }

  if (set.has('notebook-entered')) {
    items.push({ icon: '📓', name: 'แผนที่สมุดลับ', note: 'ได้จากการออกนอก Main Quest ไปเปิดของเก่าที่ถูกซ่อนไว้' });
  }
  if (readFlag('mc_nb_restored')) {
    items.push({ icon: '🔨', name: 'Restored Memory', note: 'ใช้ BLACKSMITH ซ่อมสิ่งที่เวลาเคยทำให้เลือนหาย' });
  }
  if (readFlag('mc_secret_end')) {
    items.push({ icon: '🍀', name: 'Playmate Relic', note: 'Loot ลับจากการเดินสมุดไปจนถึง WELL PLAYED' });
  }
  return items;
}

function itemHTML(item) {
  const action = item.action === 'xp'
    ? `<button class="loot-item-action" type="button" data-use-xp ${item.used ? 'disabled' : ''}>${item.used ? '✓ ใช้แล้ว · LEVEL UP ครบ 3 ครั้ง' : 'ใช้ม้วนประสบการณ์'}</button>`
    : '';
  const drop = item.drop ? `<span class="loot-drop">${item.drop}</span>` : '';
  return `<div class="loot-item" data-loot-id="${item.id || ''}"><span class="icon">${item.icon}</span><span><b>${item.name}</b><small>${item.note}</small>${drop}</span>${action}</div>`;
}

function closeAwaken() {
  const modal = document.getElementById('awaken');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  document.getElementById('replay')?.focus();
}

function playXp(host) {
  let state = readLootState();
  if (state.xpUsed) {
    renderLootResult(host, state);
    return;
  }

  const levels = [
    ['CONTEXT +1', 'มึงรู้แล้วว่า AI เดาเยอะ<br>เพราะ Source มึงบาง'],
    ['SYSTEM +1', 'มึงมองเห็นงานเป็นวงจร<br>ไม่ใช่กอง Prompt'],
    ['LANGUAGE +1', 'มึงใช้ภาษาของตัวเอง<br>ส่งความคิดถึง AI ได้ตรงขึ้น'],
  ];

  const show = (index) => {
    const [title, copy] = levels[index];
    host.innerHTML = `
      <div class="loot-screen xp-screen">
        <div class="micro">LEVEL UP ${index + 1}/3</div>
        <div class="big">${title}</div>
        <p class="say">${copy}</p>
        <div class="loot-actions"><button type="button" data-xp-next>${index < 2 ? 'LEVEL UP' : 'รับ EXP แล้วกลับไปดู Loot'}</button></div>
      </div>`;
    host.querySelector('[data-xp-next]')?.addEventListener('click', () => {
      if (index < 2) {
        show(index + 1);
        return;
      }
      writeFlag(XP_USED_KEY);
      state = saveLootState({ ...state, xpUsed: true });
      report('awaken-xp-used');
      renderLootResult(host, state);
    });
    host.querySelector('[data-xp-next]')?.focus();
  };
  show(0);
}

function renderLootResult(host, inputState) {
  const state = { ...readLootState(), ...inputState };
  const items = currentItems(state);
  host.innerHTML = `
    <div class="loot-screen">
      <div class="micro">BOSS CHEST OPENED · PERSONAL LOOT</div>
      <div class="big">ของที่มึงเจอจริง</div>
      <p class="say">หีบนี้ไม่ให้คะแนนจากจำนวนกล่องอีกแล้ว <strong>เปิดอะไร ก็ได้ของจากสิ่งนั้น</strong> เปิดทีหลังก็กลับมาดูใหม่ได้ ไม่ต้องไล่กดทั้งด่านเพื่อเอา 5 ดาวที่ไม่มีใครอธิบาย</p>
      <div class="loot-list">${items.map(itemHTML).join('')}</div>
      <div class="loot-code"><small>RESTORE CODE</small><strong>AWAKEN</strong></div>
      <p class="loot-note">Achievement ของหีบมีครั้งเดียว ส่วนเกลือ กล่อง 14 วัน กล่อง Party และสมุดลับเป็น Drop แยกกัน ไม่เอามารวมคะแนน ไม่บังคับเปิดครบ</p>
      <div class="loot-actions">
        <a href="../../card/">อัปเดต Player Card</a>
        <a class="secondary" href="../">กลับห้องเรียน</a>
        <button class="secondary" type="button" data-loot-close>ปิดหีบแล้วอ่านต่อ</button>
      </div>
    </div>`;

  host.querySelector('[data-use-xp]')?.addEventListener('click', () => playXp(host));
  host.querySelector('[data-loot-close]')?.addEventListener('click', closeAwaken);
  host.querySelector('[data-use-xp]:not(:disabled), a, [data-loot-close]')?.focus();
}

function openChest(host) {
  let state = readLootState();
  if (!state.chestOpened) {
    const result = classifyRun();
    state = saveLootState({
      ...state,
      chestOpened: true,
      openedAt: Date.now(),
      salt: result.speedrun,
      activeMsAtOpen: result.activeMs,
    });
    report('awaken-chest-open');
    if (state.salt) report('awaken-loot-salt');
  }
  renderLootResult(host, state);
}

function renderChest(host) {
  const state = readLootState();
  if (state.chestOpened) {
    renderLootResult(host, state);
    return;
  }

  host.innerHTML = `
    <div class="loot-screen">
      <div class="micro">DUNGEON CLEAR · LOOT NOT CLAIMED</div>
      <div class="big">หีบบอส</div>
      <div class="loot-chest" aria-hidden="true">🧰</div>
      <p class="say">ทุกคนที่ Clear ด่านได้ <strong>ม้วนประสบการณ์ 3 ม้วน</strong> และปลุก AWAKEN เหมือนกัน</p>
      <p class="say">กล่องข้างทางไม่เพิ่มดาวแล้ว เปิดกล่อง 14 วันก็ได้ของจากกล่องนั้น เปิด Party ก็ได้ของจาก Party แยกกันตรง ๆ</p>
      <div class="loot-actions">
        <button type="button" data-open-loot>เปิดหีบ</button>
        <button class="secondary" type="button" data-explore-more>ยังไม่เปิด · กลับไปสำรวจก่อน</button>
      </div>
      <p class="loot-note">Speedrun drop: เปิดหีบภายใน Active Time ต่ำกว่า 10 วินาที ได้เกลือ 1 ขวด ถ้านานกว่านั้นไม่มีเกลือ แค่นั้นเลย</p>
    </div>`;

  host.querySelector('[data-open-loot]')?.addEventListener('click', () => openChest(host));
  host.querySelector('[data-explore-more]')?.addEventListener('click', closeAwaken);
  host.querySelector('[data-open-loot]')?.focus();
}

function interceptAwakenModal() {
  const modal = document.getElementById('awaken');
  const host = document.getElementById('awIn');
  if (!modal || !host) return;

  let replacing = false;
  const replace = () => {
    if (replacing || modal.hidden) return;
    if (host.querySelector('.loot-screen')) return;
    replacing = true;
    renderChest(host);
    replacing = false;
  };

  new MutationObserver(replace).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(replace).observe(host, { childList: true });
  replace();
}

function boot() {
  if (!isBossPage() || document.documentElement.dataset.awakenLootV3 === '1') return;
  document.documentElement.dataset.awakenLootV3 = '1';
  injectStyles();
  syncNotebookState();
  watchChapterStart();
  trackSideQuestOpenings();
  waitForHotkeyAccordion();
  waitForPartyLoadouts();
  waitForPromptComparison();
  interceptAwakenModal();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
