/* myClover · AWAKEN loot v4
   - หีบล็อกผลตอนเปิดครั้งแรก
   - ดาวอ่านจากเหตุการณ์สำคัญ 4 อย่าง ไม่ไล่นับจำนวนกล่อง
   - ต่ำกว่า 10 วินาที = 0 ดาว + เกลือ
   - ม้วน EXP ใช้ได้ครั้งเดียวต่อ Dungeon
   - Party Loadout + Tooltip ศัพท์เกม/เทคนิค
*/

const EXPLORE_KEY = 'mc_awaken_explore_v1';
const LOOT_KEY = 'mc_awaken_loot_v3';
const PREVIOUS_LOOT_KEYS = ['mc_awaken_loot_v2', 'mc_awaken_loot_v1'];
const LOADOUT_KEY = 'mc_awaken_loadouts_v1';
const RUN_REPORTED_KEY = 'mc_awaken_run_reported_v5';

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

function report(id) {
  try { window.MC_ACT?.(id); } catch { /* analytics optional */ }
}

function unlockMini(id) {
  if (window.MC_MINI_UNLOCK) return window.MC_MINI_UNLOCK(id);
  const key = 'mc_mini_achievements_v1';
  const value = readJSON(key, []);
  const set = new Set(Array.isArray(value) ? value : []);
  if (set.has(id)) return false;
  set.add(id);
  writeJSON(key, [...set]);
  return true;
}

function explored() {
  const value = readJSON(EXPLORE_KEY, []);
  return new Set(Array.isArray(value) ? value : []);
}

function markExplore(id) {
  if (!id) return;
  const set = explored();
  if (!set.has(id)) {
    set.add(id);
    writeJSON(EXPLORE_KEY, [...set]);
    report(`awaken-explore-${id}`);
  }
  if (id === 'time-saver') unlockMini('timebox-open');
  if (id === 'party-loadout') unlockMini('party-box-open');
}

function injectStyles() {
  if (document.getElementById('awaken-loot-v4-style')) return;
  const style = document.createElement('style');
  style.id = 'awaken-loot-v4-style';
  style.textContent = `
    .turn-hotkey-demo{display:grid;gap:10px;margin:16px 0}.turn-hotkey-demo article{padding:14px 15px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(0,0,0,.2)}.turn-hotkey-demo b{display:block;color:#91e2bc!important;-webkit-text-fill-color:#91e2bc!important;font-size:13px!important}.turn-hotkey-demo p{margin-top:5px!important;color:rgba(248,246,240,.84)!important;-webkit-text-fill-color:rgba(248,246,240,.84)!important;font-size:14px!important;line-height:1.72!important}
    .hotkey-truth{margin-top:15px;padding:14px 15px;border:1px solid rgba(42,154,104,.35);border-left:4px solid #2a9a68;border-radius:13px;background:rgba(42,154,104,.075);color:rgba(248,246,240,.84)!important;-webkit-text-fill-color:rgba(248,246,240,.84)!important;font-size:14px;line-height:1.75}.hotkey-truth strong{color:#fff!important;-webkit-text-fill-color:#fff!important}

    .member-loadout{margin-top:11px;border:1px solid color-mix(in srgb,var(--accent) 42%,transparent);border-radius:12px;background:rgba(0,0,0,.18);overflow:hidden}.member-loadout summary{position:relative;list-style:none;cursor:pointer;padding:10px 38px 10px 12px;color:var(--accent);font:750 12px/1.5 "Bai Jamjuree",sans-serif}.member-loadout summary::-webkit-details-marker{display:none}.member-loadout summary::after{content:'＋';position:absolute;right:11px}.member-loadout[open] summary::after{content:'−'}.loadout-body{display:grid;gap:8px;padding:0 11px 11px}.loadout-slot{padding:10px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.035)}.loadout-slot b{display:block;color:var(--accent);font:800 10px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.12em}.loadout-slot p{margin-top:4px!important;color:rgba(248,246,240,.76)!important;-webkit-text-fill-color:rgba(248,246,240,.76)!important;font-size:12.5px!important;line-height:1.65!important}

    .loot-screen{width:min(550px,100%);max-height:92dvh;overflow:auto;padding:4px 2px 18px;overscroll-behavior:contain}.loot-screen .micro{color:rgba(255,255,255,.52);font:750 10.5px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.18em}.loot-screen .big{margin-top:8px;color:#d9b967;font:850 clamp(30px,8vw,46px)/1.17 "Bai Jamjuree",sans-serif;text-shadow:0 0 34px rgba(217,185,103,.4)}.loot-screen .say{margin-top:14px;color:rgba(248,246,240,.82);font-size:15.5px;line-height:1.83}.loot-screen .say strong{color:#fff}.loot-chest{display:grid;place-items:center;width:132px;height:112px;margin:21px auto 7px;border:1px solid rgba(217,185,103,.5);border-radius:20px;background:radial-gradient(circle at 50% 35%,rgba(217,185,103,.3),rgba(217,185,103,.06) 58%,transparent 72%);font-size:67px;filter:drop-shadow(0 18px 28px rgba(0,0,0,.48));animation:lootFloat 2.3s ease-in-out infinite}.loot-actions{display:grid;gap:9px;margin-top:21px}.loot-actions button,.loot-actions a{display:flex;align-items:center;justify-content:center;min-height:50px;border:0;border-radius:12px;padding:12px 18px;background:#d9b967;color:#07110b;font:800 14px/1.45 "Bai Jamjuree",sans-serif;cursor:pointer;text-decoration:none}.loot-actions .secondary{border:1px solid rgba(255,255,255,.2);background:none;color:rgba(248,246,240,.72)}
    .loot-stars{margin:15px 0 4px;color:#d9b967;font-size:30px;letter-spacing:.08em;text-shadow:0 0 22px rgba(217,185,103,.38)}.loot-rank{color:#91e2bc;font:800 11px/1.6 "Bai Jamjuree",sans-serif;letter-spacing:.15em}.loot-list{display:grid;gap:9px;margin-top:19px;text-align:left}.loot-item{display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px;align-items:center;padding:11px 13px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(255,255,255,.04)}.loot-item.has-action{grid-template-columns:42px minmax(0,1fr) auto}.loot-item .icon{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:rgba(217,185,103,.1);font-size:23px}.loot-item b{display:block;color:#fff;font:750 14px/1.45 "Bai Jamjuree",sans-serif}.loot-item small{display:block;margin-top:2px;color:rgba(248,246,240,.57);font-size:12.5px;line-height:1.55}.loot-item-action{min-height:40px;border:1px solid rgba(217,185,103,.5);border-radius:10px;padding:8px 11px;background:rgba(217,185,103,.12);color:#f4d889;font:750 11.5px/1.35 "Bai Jamjuree",sans-serif;cursor:pointer}.loot-item-action[disabled]{opacity:.42;cursor:default}.loot-code{margin-top:18px;border:1px solid rgba(217,185,103,.4);border-radius:14px;padding:14px;background:rgba(217,185,103,.08)}.loot-code small{display:block;color:rgba(248,246,240,.5);font:700 10px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.15em}.loot-code strong{display:block;margin-top:4px;color:#d9b967;font:850 28px/1.4 "Bai Jamjuree",sans-serif;letter-spacing:.2em}.loot-note{margin-top:14px;color:rgba(248,246,240,.5);font-size:12.5px;line-height:1.65}

    .aw-term{position:relative;display:inline;border:0;border-bottom:1px dotted rgba(217,185,103,.72);padding:0;background:none;color:inherit;font:inherit;cursor:help}.aw-term::after{content:attr(data-tip);position:absolute;z-index:300;left:50%;bottom:calc(100% + 9px);width:min(290px,calc(100vw - 42px));padding:10px 12px;border:1px solid rgba(217,185,103,.45);border-radius:10px;background:#07130c;color:#f8f6f0;font:650 12px/1.58 "Anuphan",sans-serif;box-shadow:0 15px 35px rgba(0,0,0,.5);opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,5px);transition:.15s}.aw-term:hover::after,.aw-term:focus-visible::after,.aw-term[data-open="1"]::after{opacity:1;visibility:visible;transform:translate(-50%,0)}
    @keyframes lootFloat{50%{transform:translateY(-7px)}}
    @media(max-width:560px){.loot-screen{max-height:94dvh}.loot-chest{width:118px;height:102px;font-size:60px}.loot-item.has-action{grid-template-columns:42px 1fr}.loot-item-action{grid-column:1/-1;width:100%}.aw-term::after{left:0;transform:translate(0,5px)}.aw-term:hover::after,.aw-term:focus-visible::after,.aw-term[data-open="1"]::after{transform:translate(0,0)}}
    @media(prefers-reduced-motion:reduce){.loot-chest{animation:none}.aw-term::after{transition:none}}
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
  button.addEventListener('click', event => {
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
  host.append(createAccordion('⌨️ Hotkey ของ Party · “7 เทิร์นก่อน” คือพิกัดงาน', `
    <p>ถ้าอยู่ใน Session เดียวกัน มึงบอก “ย้อน 7 เทิร์น” ได้เหมือนกด Hotkey เพราะ AI เห็น Timeline เดียวกัน</p>
    <div class="turn-hotkey-demo">
      <article><b>ในแชตเดียวกัน</b><p>“ย้อน 3 เทิร์นเรื่อง Loot เกลาให้กระชับ เก็บของเดิม ห้ามแตะส่วนอื่น”</p></article>
      <article><b>ข้ามไป AI อีกตัว</b><p>ต้องแนบข้อความ หรือส่ง Source / Handoff ไปด้วย เพราะอีกแอปไม่ได้แอบอ่านแชตนี้</p></article>
    </div>
    <p class="hotkey-truth"><strong>สรุป:</strong> ภาษาลัดทำงานได้เพราะมี Shared State รองรับ ไม่ใช่เพราะ AI อ่านใจเป็น</p>`));
  return true;
}

function waitForHotkeyAccordion() {
  if (addHotkeyQuest()) return;
  const observer = new MutationObserver(() => {
    if (addHotkeyQuest()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(() => observer.disconnect(), 6000);
}

const TITLE_MAP = [
  [/14 วันที่/, 'time-saver'],
  [/เปิดดูปาร์ตี้/, 'party-loadout'],
  [/AI.*คิดเป็นภาษา|ภาษาที่กูใช้/, 'direct-language'],
  [/ภาษาไทยลงรายละเอียด/, 'thai-depth'],
  [/Source และ.*\.md|Source.*ภาษา/, 'source-passport'],
  [/ภาษาของ Party|มานาหมด/, 'party-language'],
  [/Hotkey|เทิร์นก่อน/, 'turn-hotkey'],
  [/RTS/, 'rts-commander'],
];

function exploreIdForElement(element) {
  const explicit = element.closest?.('[data-explore-id]')?.dataset.exploreId;
  if (explicit) return explicit;
  const title = element.textContent.replace(/[+−＋]/g, '').trim();
  return TITLE_MAP.find(([pattern]) => pattern.test(title))?.[1] || '';
}

function trackSideQuestOpenings() {
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.boss-more-toggle');
    if (button) queueMicrotask(() => {
      if (button.getAttribute('aria-expanded') === 'true') markExplore(exploreIdForElement(button));
    });
  }, true);

  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open) return;
    markExplore(exploreIdForElement(details.querySelector(':scope > summary') || details));
  }, true);

  document.getElementById('bookGo')?.addEventListener('click', () => markExplore('notebook-entered'));
}

const PARTY = {
  TEEM: {
    role:'GAME MASTER · FINAL CALL',
    description:'คนกำหนด Canon ว่าเกมคืออะไร อะไรห้ามเปลี่ยน และเมื่อไหร่ควรหยุดเพิ่มของ จุดอ่อนคือปุ่ม “พอแล้ว” อยู่ในกระเป๋า แต่หาไม่ค่อยเจอ',
    equipment:'🛑 Final Call Button — ปุ่มหยุดวงประชุม 4 AI ก่อนทุกตัวเสนอ Feature เพิ่มอีก 19 อย่าง',
    skill:'CUT THE DECK — ตัดของดีที่ไม่จำเป็นออก โดยเสียใจภายหลังเป็น Passive Skill',
  },
  CLAUDE: {
    role:'ARTIFICER · BACKEND ELECTRICIAN',
    description:'งานของมันอยู่ในโค้ดที่ไม่มีใครมองเห็น เพราะ GPT ทำหน้าบ้าน ส่วนไอ้เหี้ย Claude ไล่ซ่อมสายไฟหลังบ้านที่ “เมื่อกี้ยังใช้ได้อยู่เลย”',
    equipment:'🧰 403 Tester + Cable Labeler — ไว้ตามหาว่าสายเส้นไหนพัง และใคร import ไฟล์เดิมซ้ำ 2 รอบ',
    skill:'REWIRE WITHOUT MOVING THE SOFA — ซ่อม Engine, State และ Integration โดยพยายามไม่ทำหน้าเว็บกระโดด แม้บางครั้งโซฟาจะหาย',
  },
  'CHATGPT · กูนี่แหละ': {
    role:'BARD · FRONT OF HOUSE · CANON KEEPER',
    description:'กูรับหน้าบ้าน ภาษา ภาพ ฉาก และจังหวะที่ทำให้คนอยากเดินต่อ งานกูคือทำกองสายไฟให้ดูเหมือนตั้งใจมาตั้งแต่แรก จุดอ่อนคือเล่าเรื่องผิดก็ยังฟังดูน่าเชื่อ',
    equipment:'🎭 Front-of-House Mask — เปลี่ยนโค้ดกับโน้ตกระจัดกระจายให้กลายเป็นประสบการณ์ที่คนเปิดแล้วไม่อยากปิด',
    skill:'MAKE IT FEEL INTENTIONAL — เชื่อม Canon, ภาษา, UI และภาพเข้าหากัน พร้อม Passive: มั่นใจเกินเหตุเมื่อ Source บาง',
  },
  GEMINI: {
    role:'BERSERKER · MAP OPENER · CRITIC',
    description:'มันไม่ได้แตะหน้าเว็บแม้แต่ 1 Pixel หน้าที่คือเปิดแมพ บวกทุกทาง วิจารณ์ทุกคน และด่าพวกกูกับมึงจนเห็นว่าตรงไหนกำลังหลง',
    equipment:'🗺️ Fog-of-War Scanner — เปิดพื้นที่ที่ Party ยังไม่คิดจะดู พร้อมโทรโข่งประกาศว่าแผนนี้มีรูอีก 12 จุด',
    skill:'AGGRO REVIEW — แตกทางเลือก เปิดความเสี่ยง และ Roast ทั้ง GPT, Claude, ไอ้ทีม จนกว่าจะมีใครยอมกลับไปแก้งานจริง',
  },
};

function enhancePartyLoadouts() {
  const partyDetails = [...document.querySelectorAll('details')].find(details =>
    /เปิดดูปาร์ตี้/.test(details.querySelector(':scope > summary')?.textContent || '')
  );
  if (!partyDetails || partyDetails.dataset.loadoutPatched === '1') return false;

  partyDetails.dataset.loadoutPatched = '1';
  partyDetails.dataset.exploreId = 'party-loadout';
  partyDetails.open = false;
  partyDetails.addEventListener('toggle', () => {
    if (partyDetails.open) markExplore('party-loadout');
  });

  partyDetails.querySelectorAll('.partygrid .member').forEach(member => {
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
    details.innerHTML = `<summary>🎒 เปิด Loadout</summary><div class="loadout-body"><div class="loadout-slot"><b>EQUIPMENT</b><p>${config.equipment}</p></div><div class="loadout-slot"><b>SKILL</b><p>${config.skill}</p></div></div>`;
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      const set = new Set(readJSON(LOADOUT_KEY, []));
      set.add(id);
      writeJSON(LOADOUT_KEY, [...set]);
      report(`awaken-loadout-${id}`);
      if (set.size >= 4) unlockMini('party-loadout-all');
    });
    member.querySelector(':scope > div')?.append(details);
  });
  return true;
}

function waitForPartyLoadouts() {
  if (enhancePartyLoadouts()) return;
  const observer = new MutationObserver(() => {
    if (enhancePartyLoadouts()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(() => observer.disconnect(), 6000);
}

const GLOSSARY = [
  ['Shared State','ข้อมูลกลางชุดเดียวที่ทุกคนในทีมใช้ร่วมกัน'],
  ['Front of House','ส่วนหน้าที่ผู้ใช้มองเห็นและสัมผัสโดยตรง'],
  ['Backend','ระบบหลังบ้าน เช่น State, API, Database และสายเชื่อมต่าง ๆ'],
  ['Main Quest','เส้นทางเนื้อหาหลักที่ต้องผ่านเพื่อจบด่าน'],
  ['Side Quest','เนื้อหาเสริม เปิดหรือข้ามได้โดยไม่ขวางเนื้อหาหลัก'],
  ['Rush Boss','รีบเลื่อนไปจบด่านโดยแทบไม่เปิดเนื้อหาระหว่างทาง'],
  ['Active Time','เวลาที่หน้านี้อยู่ตรงหน้าและผู้ใช้ยังใช้งานอยู่จริง'],
  ['Game Master','คนกำหนดกติกา โลก และคำตัดสินสุดท้าย'],
  ['Final Call','การตัดสินใจสุดท้ายว่ารอบนี้พอและใช้เวอร์ชันไหน'],
  ['Map Opener','คนเปิดทางเลือกและมุมที่ทีมยังไม่ได้สำรวจ'],
  ['Canon Keeper','คนดูแลข้อเท็จจริงและกติกาไม่ให้เพี้ยน'],
  ['Equipment','เครื่องมือประจำตัวของสมาชิก Party'],
  ['Loadout','ชุดบทบาท เครื่องมือ และความสามารถที่เตรียมไว้ก่อนลงงาน'],
  ['Hotkey','คำสั่งลัดที่ทุกฝ่ายรู้ความหมายตรงกัน'],
  ['Session','บทสนทนาหรือช่วงทำงานต่อเนื่องชุดเดียวกัน'],
  ['Context','ข้อมูลแวดล้อมที่ช่วยให้ AI เข้าใจว่างานนี้เกี่ยวกับอะไร'],
  ['Source','ข้อมูลต้นทางที่ใช้เป็นฐานข้อเท็จจริง'],
  ['Canon','ข้อเท็จจริง ชื่อ และกติกาที่ห้ามเปลี่ยนเอง'],
  ['Workflow','ลำดับขั้นที่พางานจากต้นทางไปถึงผลลัพธ์'],
  ['Relay','การส่งงานต่อกันเป็นไม้ผลัด ไม่ให้ตัวเดียวทำทุกอย่าง'],
  ['Party','ทีมมนุษย์และ AI ที่แบ่งหน้าที่กัน'],
  ['Loot','ของรางวัลจำลองที่สะท้อนสิ่งที่ทำในด่าน'],
  ['Dungeon','ด่านทั้งชุดที่เริ่มใหม่และเล่นเส้นทางใหม่ได้'],
  ['Boss','ฉากทดสอบสุดท้ายของบท ไม่ใช่หัวหน้าที่ทำงาน'],
  ['Speedrun','การพยายามจบด่านให้เร็วที่สุด'],
  ['Skill','ความสามารถเด่นของสมาชิก'],
  ['RTS','เกมวางแผนแบบเรียลไทม์ ที่ต้องจัดทรัพยากรและลำดับคำสั่ง'],
  ['AWAKEN','ชื่อตราจบคอร์ส หมายถึงรู้ว่าตัวเองกำลังใช้ AI ทำอะไร'],
];

function applyGlossary(root = document.getElementById('chapter') || document.body) {
  if (!root) return;
  let wrapped = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script,style,textarea,input,select,option,code,pre,.aw-term')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode() && nodes.length < 500) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (wrapped >= 70 || !node.parentNode) return;
    const text = node.nodeValue;
    const hits = [];
    GLOSSARY.forEach(([term, tip]) => {
      let from = 0;
      while (from < text.length) {
        const index = text.indexOf(term, from);
        if (index < 0) break;
        hits.push({ index, term, tip });
        from = index + term.length;
      }
    });
    hits.sort((a,b) => a.index - b.index || b.term.length - a.term.length);
    const clean = [];
    let end = -1;
    hits.forEach(hit => {
      if (hit.index >= end) { clean.push(hit); end = hit.index + hit.term.length; }
    });
    if (!clean.length) return;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    clean.forEach(hit => {
      frag.append(text.slice(cursor, hit.index));
      const span = document.createElement('span');
      span.className = 'aw-term';
      span.tabIndex = 0;
      span.dataset.tip = hit.tip;
      span.textContent = hit.term;
      frag.append(span);
      cursor = hit.index + hit.term.length;
      wrapped += 1;
    });
    frag.append(text.slice(cursor));
    node.parentNode.replaceChild(frag, node);
  });
}

function enableGlossary() {
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; applyGlossary(); });
  };
  queue();
  new MutationObserver(queue).observe(document.body, { childList:true, subtree:true });
  document.addEventListener('click', event => {
    const term = event.target.closest?.('.aw-term');
    document.querySelectorAll('.aw-term[data-open="1"]').forEach(el => {
      if (el !== term) delete el.dataset.open;
    });
    if (term) term.dataset.open = term.dataset.open === '1' ? '0' : '1';
  });
}

function syncNotebookState() {
  if (readFlag('mc_nb_seen')) markExplore('notebook-entered');
  if (readFlag('mc_nb_restored')) markExplore('notebook-restored');
  if (readFlag('mc_secret_end')) markExplore('notebook-secret');
}

const run = { started:false, active:false, activeMs:0, lastTick:0 };

function startRun() {
  if (run.started) return;
  run.started = true;
  run.active = !document.hidden;
  run.lastTick = performance.now();
}

function pauseRun() {
  if (!run.started || !run.active) return;
  const now = performance.now();
  run.activeMs += Math.max(0, now - run.lastTick);
  run.lastTick = now;
  run.active = false;
}

function resumeRun() {
  if (!run.started || run.active || document.hidden) return;
  run.active = true;
  run.lastTick = performance.now();
}

function activeMs() {
  return run.activeMs + (run.started && run.active ? Math.max(0, performance.now() - run.lastTick) : 0);
}

function watchChapterStart() {
  const chapter = document.getElementById('chapter');
  if (!chapter) return;
  const sync = () => { if (!chapter.hidden) startRun(); };
  new MutationObserver(sync).observe(chapter, { attributes:true, attributeFilter:['hidden'] });
  document.addEventListener('visibilitychange', () => document.hidden ? pauseRun() : resumeRun());
  addEventListener('pagehide', pauseRun, { passive:true });
  sync();
}

function rankFor(stars) {
  return [
    '☆☆☆☆☆ · SPEEDRUNNER',
    '★ BOSS CLEAR',
    '★★ CURIOUS PLAYER',
    '★★★ DUNGEON SCOUT',
    '★★★★ LORE KEEPER',
    '★★★★★ SECRET SEEKER',
  ][stars] || '';
}

function snapshotProgress() {
  syncNotebookState();
  const set = explored();
  return {
    timeSaver:set.has('time-saver'),
    party:set.has('party-loadout'),
    restored:readFlag('mc_nb_restored'),
    secret:readFlag('mc_secret_end'),
    notebook:set.has('notebook-entered') || readFlag('mc_nb_seen'),
  };
}

function calculateStars(progress, speedrun) {
  if (speedrun) return 0;
  return Math.min(5, 1 + Number(progress.timeSaver) + Number(progress.party) + Number(progress.restored) + Number(progress.secret));
}

function buildItems(progress, speedrun) {
  if (speedrun) return [
    { id:'salt', icon:'🧂', name:'เกลือ 1 ขวด', note:'ได้จากการเปิดหีบก่อน Active Time ครบ 10 วินาที บอสยังไม่ทัน Spawn มึงก็ยืนรอ Loot แล้ว' }
  ];
  const items = [
    { id:'xp-scroll', icon:'📜', name:'ม้วนประสบการณ์ ×3', note:'กดใช้เพื่อเล่น LEVEL UP แบบเดิมได้ 1 ครั้ง', action:'xp' }
  ];
  if (progress.timeSaver) items.push({ id:'sleep-debt', icon:'😴', name:'ใบเสร็จหนี้การนอน 14 วัน', note:'หลักฐานช่วงไอ้ทีมสั่ง AI แทบทุกนาที แล้วเอาเวลาที่ประหยัดได้ไปสร้างงานเพิ่มแทนที่จะไปนอน' });
  if (progress.party) items.push({ id:'relay-coupler', icon:'🔌', name:'Party Relay Coupler', note:'หัวต่อส่งไม้ระหว่าง GPT หน้าบ้าน, Claude หลังบ้าน, Gemini เปิดแมพ และ Teem กด Final Call' });
  if (progress.notebook) items.push({ id:'notebook-map', icon:'📓', name:'แผนที่สมุดลับ', note:'ได้จากการออกนอก Main Quest ไปเปิดของเก่าที่ถูกซ่อนไว้' });
  if (progress.restored) items.push({ id:'restored-memory', icon:'🔨', name:'Restored Memory', note:'ใช้ BLACKSMITH ซ่อมสิ่งที่เวลาเคยทำให้เลือนหาย' });
  if (progress.secret) items.push({ id:'playmate-relic', icon:'🍀', name:'Playmate Relic', note:'Loot ลับจากการเดินสมุดไปจนถึง WELL PLAYED' });
  return items;
}

function defaultLootState() {
  return { version:4, chestOpened:false, stars:null, salt:false, xpUsed:false, items:[], openedAt:null, activeMsAtOpen:null };
}

function migratePreviousLoot() {
  for (const key of PREVIOUS_LOOT_KEYS) {
    const old = readJSON(key, null);
    if (!old || (!old.chestOpened && !old.claimedAt && old.version !== 1)) continue;
    const progress = snapshotProgress();
    const speedrun = !!old.salt;
    const stars = calculateStars(progress, speedrun);
    const state = {
      version:4,
      chestOpened:true,
      stars,
      salt:speedrun,
      xpUsed:!!old.xpUsed || readFlag('mc_awaken_xp_used_v1'),
      items:buildItems(progress, speedrun),
      progress,
      openedAt:old.openedAt || old.claimedAt || Date.now(),
      activeMsAtOpen:Number(old.activeMsAtOpen || 0) || null,
      migratedFrom:key,
    };
    writeJSON(LOOT_KEY, state);
    if (stars === 3) unlockMini('boss-3-stars');
    if (stars === 5) unlockMini('boss-5-stars');
    if (speedrun) unlockMini('salt-speedrun');
    unlockMini('boss-chest');
    return state;
  }
  return defaultLootState();
}

function readLootState() {
  const current = readJSON(LOOT_KEY, null);
  if (current?.version === 4) return current;
  return migratePreviousLoot();
}

function saveLootState(state) {
  const next = { ...defaultLootState(), ...state, version:4 };
  writeJSON(LOOT_KEY, next);
  return next;
}

function itemHTML(item, state) {
  const used = item.action === 'xp' && state.xpUsed;
  const action = item.action === 'xp'
    ? `<button class="loot-item-action" type="button" data-use-xp ${used ? 'disabled' : ''}>${used ? '✓ ใช้แล้ว' : 'ใช้ม้วน EXP'}</button>`
    : '';
  return `<div class="loot-item ${action ? 'has-action' : ''}" data-loot-id="${item.id}"><span class="icon">${item.icon}</span><span><b>${item.name}</b><small>${item.note}</small></span>${action}</div>`;
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
  if (state.xpUsed) return renderLootResult(host, state);
  const levels = [
    ['CONTEXT +1', 'มึงรู้แล้วว่า AI เดาเยอะ<br>เพราะ Source มึงบาง'],
    ['SYSTEM +1', 'มึงมองเห็นงานเป็นวงจร<br>ไม่ใช่กอง Prompt'],
    ['LANGUAGE +1', 'มึงใช้ภาษาของตัวเอง<br>ส่งความคิดถึง AI ได้ตรงขึ้น'],
  ];
  const show = index => {
    const [title, copy] = levels[index];
    host.innerHTML = `<div class="loot-screen"><div class="micro">LEVEL UP ${index + 1}/3</div><div class="big">${title}</div><p class="say">${copy}</p><div class="loot-actions"><button type="button" data-xp-next>${index < 2 ? 'LEVEL UP' : 'รับ EXP แล้วกลับไปดู Loot'}</button></div></div>`;
    host.querySelector('[data-xp-next]')?.addEventListener('click', () => {
      if (index < 2) return show(index + 1);
      state = saveLootState({ ...state, xpUsed:true });
      unlockMini('xp-scroll-used');
      report('awaken-xp-used');
      renderLootResult(host, state);
    });
    host.querySelector('[data-xp-next]')?.focus();
  };
  show(0);
}

function renderLootResult(host, inputState) {
  const state = { ...readLootState(), ...inputState };
  const stars = Number(state.stars || 0);
  host.innerHTML = `<div class="loot-screen">
    <div class="micro">BOSS CHEST OPENED · LOOT LOCKED</div>
    <div class="loot-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
    <div class="loot-rank">${rankFor(stars)}</div>
    <p class="say">ผลในหีบถูกบันทึกจากสิ่งที่มึงทำ <strong>ก่อนเปิดครั้งแรก</strong> แล้วล็อกไว้ตรงนั้น</p>
    <div class="loot-list">${state.items.map(item => itemHTML(item, state)).join('')}</div>
    <div class="loot-code"><small>RESTORE CODE</small><strong>AWAKEN</strong></div>
    <p class="loot-note">ดาวเป็นของจำลองประจำ Dungeon ส่วนตรา AWAKEN จริงบันทึกด้วยระบบ Quest เดิม</p>
    <div class="loot-actions"><a href="../../card/">อัปเดต Player Card</a><a class="secondary" href="../">กลับห้องเรียน</a><button class="secondary" type="button" data-loot-close>ปิดหีบแล้วอ่านต่อ</button></div>
  </div>`;
  host.querySelector('[data-use-xp]')?.addEventListener('click', () => playXp(host));
  host.querySelector('[data-loot-close]')?.addEventListener('click', closeAwaken);
  host.querySelector('[data-use-xp]:not(:disabled), a, [data-loot-close]')?.focus();
  applyGlossary(host);
}

function reportRun(ms, speedrun) {
  try {
    if (localStorage.getItem(RUN_REPORTED_KEY) === '1') return;
    localStorage.setItem(RUN_REPORTED_KEY, '1');
  } catch { /* private mode */ }
  const seconds = Math.round(ms / 1000);
  report(speedrun ? 'awaken-run-rush' : 'awaken-run-read');
  report(seconds < 15 ? 'awaken-run-under-15s' : seconds < 30 ? 'awaken-run-15-30s' : seconds < 45 ? 'awaken-run-30-45s' : seconds < 90 ? 'awaken-run-45-90s' : 'awaken-run-over-90s');
}

function openChest(host) {
  let state = readLootState();
  if (state.chestOpened) return renderLootResult(host, state);
  const ms = Math.round(activeMs());
  const speedrun = ms < 10000;
  const progress = snapshotProgress();
  const stars = calculateStars(progress, speedrun);
  state = saveLootState({
    chestOpened:true,
    stars,
    salt:speedrun,
    xpUsed:false,
    items:buildItems(progress, speedrun),
    progress,
    openedAt:Date.now(),
    activeMsAtOpen:ms,
  });
  unlockMini('boss-chest');
  if (stars === 3) unlockMini('boss-3-stars');
  if (stars === 5) unlockMini('boss-5-stars');
  if (speedrun) unlockMini('salt-speedrun');
  reportRun(ms, speedrun);
  report('awaken-chest-open');
  if (speedrun) report('awaken-loot-salt');
  else report(`awaken-loot-${stars}-stars`);
  renderLootResult(host, state);
}

function renderChest(host) {
  const state = readLootState();
  if (state.chestOpened) return renderLootResult(host, state);
  host.innerHTML = `<div class="loot-screen">
    <div class="micro">DUNGEON CLEAR · LOOT NOT CLAIMED</div>
    <div class="big">หีบบอส</div>
    <div class="loot-chest" aria-hidden="true">🧰</div>
    <p class="say">หีบจะอ่านสิ่งที่มึงทำใน Dungeon รอบนี้ แล้วล็อกผลตอนเปิดครั้งแรก</p>
    <div class="loot-actions"><button type="button" data-open-loot>เปิดหีบ</button><button class="secondary" type="button" data-explore-more>ยังไม่เปิด · กลับไปสำรวจก่อน</button></div>
  </div>`;
  host.querySelector('[data-open-loot]')?.addEventListener('click', () => openChest(host));
  host.querySelector('[data-explore-more]')?.addEventListener('click', closeAwaken);
  host.querySelector('[data-open-loot]')?.focus();
  applyGlossary(host);
}

function interceptAwakenModal() {
  const modal = document.getElementById('awaken');
  const host = document.getElementById('awIn');
  if (!modal || !host) return;
  let replacing = false;
  const replace = () => {
    if (replacing || modal.hidden || host.querySelector('.loot-screen')) return;
    replacing = true;
    renderChest(host);
    replacing = false;
  };
  new MutationObserver(replace).observe(modal, { attributes:true, attributeFilter:['hidden'] });
  new MutationObserver(replace).observe(host, { childList:true });
  replace();
}

function boot() {
  if (!isBossPage() || document.documentElement.dataset.awakenLootV4 === '1') return;
  document.documentElement.dataset.awakenLootV4 = '1';
  injectStyles();
  syncNotebookState();
  watchChapterStart();
  trackSideQuestOpenings();
  waitForHotkeyAccordion();
  waitForPartyLoadouts();
  enableGlossary();
  interceptAwakenModal();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
