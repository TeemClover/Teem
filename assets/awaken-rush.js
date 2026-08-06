/* myClover · AWAKEN dialogue skip detector
   - เปรียบเทียบภาษาลัดกับรูปแบบ Asking / Doing จากงานวิจัยสาธารณะ
   - วัดเวลาอ่านแบบ active time และความเร็วในการพุ่งถึงท้ายหน้า
   - คน Skip All Dialogue ยัง Clear ได้ แต่หีบแรกมีเกลือ 1 ขวด
*/

const RUN_SESSION_KEY = 'mc_awaken_run_session_v2';
const RUN_REPORT_KEY = 'mc_awaken_run_reported_v2';
const LOOT_KEY = 'mc_awaken_loot_v1';
const EXPLORE_KEY = 'mc_awaken_explore_v1';

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

function injectStyles() {
  if (document.getElementById('awaken-rush-style')) return;
  const style = document.createElement('style');
  style.id = 'awaken-rush-style';
  style.textContent = `
    .public-usage-note{margin-top:12px;padding:13px 14px;border:1px solid rgba(127,169,255,.28);border-radius:13px;background:rgba(127,169,255,.07);color:rgba(248,246,240,.72);font-size:12.8px;line-height:1.72}.public-usage-note strong{color:#fff!important;-webkit-text-fill-color:#fff!important}.public-usage-note a{color:#9ebcff!important;-webkit-text-fill-color:#9ebcff!important;border-bottom:1px solid rgba(158,188,255,.4)}
    .salt-screen{width:min(520px,100%);max-height:91dvh;overflow:auto;padding:3px 2px 18px;overscroll-behavior:contain}.salt-screen .micro{color:#ffb977;font:800 10.5px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.18em}.salt-screen .big{margin-top:8px;color:#fff;font:850 clamp(30px,8vw,44px)/1.18 "Bai Jamjuree",sans-serif}.salt-bottle{display:grid;place-items:center;width:132px;height:132px;margin:20px auto 9px;border:1px solid rgba(255,255,255,.25);border-radius:30px 30px 22px 22px;background:linear-gradient(180deg,rgba(255,255,255,.25),rgba(255,255,255,.07));font-size:72px;filter:drop-shadow(0 20px 28px rgba(0,0,0,.5));transform:rotate(-3deg)}.salt-screen .rank{margin-top:13px;color:#ffb977;font:800 11px/1.6 "Bai Jamjuree",sans-serif;letter-spacing:.15em}.salt-screen .say{margin-top:13px;color:rgba(248,246,240,.82);font-size:15px;line-height:1.82}.salt-screen .say strong{color:#fff}.salt-loot{margin-top:17px;padding:14px 16px;border:1px solid rgba(255,185,119,.4);border-radius:14px;background:rgba(255,185,119,.08);text-align:left}.salt-loot b{display:block;color:#ffcf9f;font:800 15px/1.5 "Bai Jamjuree",sans-serif}.salt-loot small{display:block;margin-top:4px;color:rgba(248,246,240,.58);font-size:12.5px;line-height:1.62}.salt-screen .loot-code{margin-top:17px}.salt-screen .loot-actions{margin-top:18px}.salt-screen .fine{margin-top:13px;color:rgba(248,246,240,.47);font-size:12.3px;line-height:1.65}
    @media(max-width:560px){.salt-screen{max-height:94dvh}.salt-bottle{width:116px;height:116px;font-size:64px}}
  `;
  document.head.append(style);
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
    { label:'ตัวอย่างจำลอง · Asking / Doing แบบที่คนทั่วไปมักใช้', text:common },
    { label:'ภาษาลัดของ Party · เมื่อทุกคนรู้ Shared State', text:hotkey },
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

  const note = document.createElement('p');
  note.className = 'public-usage-note';
  note.innerHTML = '<strong>สถิติที่กูอ้างได้จริง:</strong> งานวิจัยสาธารณะของ OpenAI วิเคราะห์บทสนทนา 1.5 ล้านรายการแบบรักษาความเป็นส่วนตัว พบว่าข้อความประมาณ 49% เป็นการถาม (Asking), 40% เป็นการสั่งให้ทำงาน (Doing) และ 11% เป็นการแสดงออก (Expressing) งานวิจัยไม่ได้เปิดเผย “ประโยคที่คนพูดมากที่สุด” แบบคำต่อคำ ดังนั้นข้อความด้านบนคือ <strong>ตัวอย่างจำลองของรูปแบบ Asking / Doing</strong> ไม่ใช่แชตจริงของผู้ใช้อื่น · <a href="https://openai.com/index/how-people-are-using-chatgpt/" target="_blank" rel="noopener">ดูงานวิจัย</a>';
  root.querySelector('.language-sample')?.insertAdjacentElement('afterend', note);
  return true;
}

const run = {
  started:false,
  startWall:0,
  activeMs:0,
  lastActiveTick:0,
  maxProgress:0,
  first90Ms:null,
  rapidBursts:0,
  lastScrollY:0,
  lastScrollAt:0,
  classified:null,
};

function activeNow() {
  if (!run.started || document.hidden) return run.activeMs;
  return run.activeMs + Math.max(0, performance.now() - run.lastActiveTick);
}

function startRun() {
  if (run.started) return;
  run.started = true;
  run.startWall = Date.now();
  run.lastActiveTick = performance.now();
  run.lastScrollY = scrollY;
  run.lastScrollAt = performance.now();
  report('awaken-run-start');
}

function pauseActive() {
  if (!run.started || document.hidden) return;
  const now = performance.now();
  run.activeMs += Math.max(0, now - run.lastActiveTick);
  run.lastActiveTick = now;
}

function resumeActive() {
  if (!run.started || document.hidden) return;
  run.lastActiveTick = performance.now();
}

function scrollProgress() {
  const doc = document.documentElement;
  const total = Math.max(doc.scrollHeight, document.body.scrollHeight) - innerHeight;
  return total <= 0 ? 1 : Math.max(0, Math.min(1, (scrollY || doc.scrollTop || 0) / total));
}

function onScroll() {
  if (!run.started) return;
  const now = performance.now();
  const progress = scrollProgress();
  run.maxProgress = Math.max(run.maxProgress, progress);
  if (progress >= .9 && run.first90Ms === null) run.first90Ms = activeNow();

  const dt = Math.max(1, now - run.lastScrollAt);
  const dy = Math.abs(scrollY - run.lastScrollY);
  const viewportPerSecond = (dy / Math.max(1, innerHeight)) / (dt / 1000);
  if (viewportPerSecond >= 3.2 && dy > innerHeight * .65) run.rapidBursts += 1;
  run.lastScrollY = scrollY;
  run.lastScrollAt = now;
}

function bucketFor(ms) {
  const sec = Math.round(ms / 1000);
  if (sec < 15) return 'under-15s';
  if (sec < 30) return '15-30s';
  if (sec < 45) return '30-45s';
  if (sec < 90) return '45-90s';
  return 'over-90s';
}

function exploreCount() {
  const values = readJSON(EXPLORE_KEY, []);
  return Array.isArray(values) ? values.length : 0;
}

function classifyRun() {
  if (run.classified) return run.classified;
  pauseActive();
  const activeMs = activeNow();
  const first90Ms = run.first90Ms ?? activeMs;
  const explored = exploreCount();
  const notebook = readFlag('mc_nb_seen');
  const hardSkip = first90Ms < 16000 && run.maxProgress >= .88;
  const emptySprint = activeMs < 42000 && run.maxProgress >= .95 && explored === 0 && !notebook;
  const mouseWheelWarp = activeMs < 52000 && run.rapidBursts >= 4 && explored === 0 && !notebook;
  const rush = hardSkip || emptySprint || mouseWheelWarp;

  run.classified = {
    activeMs:Math.round(activeMs),
    first90Ms:Math.round(first90Ms),
    maxProgress:Number(run.maxProgress.toFixed(3)),
    rapidBursts:run.rapidBursts,
    explored,
    notebook,
    rush,
    bucket:bucketFor(activeMs),
    classifiedAt:Date.now(),
  };
  writeJSON(RUN_SESSION_KEY, run.classified, sessionStorage);

  try {
    if (localStorage.getItem(RUN_REPORT_KEY) !== '1') {
      localStorage.setItem(RUN_REPORT_KEY, '1');
      report(`awaken-run-${run.classified.bucket}`);
      report(rush ? 'awaken-run-rush' : 'awaken-run-read');
    }
  } catch {
    report(`awaken-run-${run.classified.bucket}`);
    report(rush ? 'awaken-run-rush' : 'awaken-run-read');
  }
  return run.classified;
}

function closeModal() {
  const modal = document.getElementById('awaken');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  document.getElementById('replay')?.focus();
}

function saltLoot() {
  return {
    version:1,
    salt:true,
    stars:0,
    rank:'SPEEDRUN · SKIP ALL DIALOGUE',
    items:[{ icon:'🧂', name:'เกลือ 1 ขวด', note:'ได้จากการวิ่งผ่านบทสนทนาจนบอสยังไม่ทัน Spawn' }],
    claimedAt:Date.now(),
  };
}

function renderSalt(host) {
  if (!host || host.dataset.saltRendered === '1') return;
  host.dataset.saltRendered = '1';
  host.innerHTML = `
    <div class="salt-screen">
      <div class="micro">BOSS CHEST OPENED · DIALOGUE SKIP DETECTED</div>
      <div class="big">กูรู้ทันนะ</div>
      <div class="salt-bottle" aria-hidden="true">🧂</div>
      <div class="rank">☆☆☆☆☆ · SPEEDRUNNER</div>
      <p class="say">คุณรีบเดินผ่านด่านเกินไป <strong>บอสยังไม่ทันเกิด มึงก็ยืนอยู่หน้าหีบแล้ว</strong></p>
      <p class="say">พวกกด Skip All Dialogue มีทุกเกม กูรู้ว่าต้องมีคนทำ และใช่—ถือว่า Clear ดันแล้ว ตรา AWAKEN ยังได้ครบ กูไม่ได้ขังคนไว้เพราะไม่ยอมอ่านคำพูดกู</p>
      <div class="salt-loot"><b>🧂 เกลือ 1 ขวด</b><small>เอาไปปรุงชีวิตก่อน ไว้แวะกลับมาอ่านภายหลังได้ แต่ Loot รอบแรกของหีบนี้ถูกล็อกแล้ว</small></div>
      <div class="loot-code"><small>RESTORE CODE</small><strong>AWAKEN</strong></div>
      <p class="fine">ระบบดูจาก Active Time, เวลาที่พุ่งถึงท้ายหน้า, ความเร็วการเลื่อน และการสำรวจ Side Quest ไม่ได้เปิดกล้องดูหน้ามึง—ใจเย็น</p>
      <div class="loot-actions">
        <a href="../../card/">อัปเดต Player Card</a>
        <a class="secondary" href="../">กลับห้องเรียน</a>
        <button class="secondary" type="button" data-salt-close>ปิดหีบแล้วกลับไปอ่าน</button>
      </div>
    </div>`;
  host.querySelector('[data-salt-close]')?.addEventListener('click', closeModal);
  host.querySelector('a')?.focus();
}

function claimedSalt() {
  const loot = readJSON(LOOT_KEY, null);
  return !!loot?.salt;
}

function interceptChest() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-open-loot]');
    if (!button) return;
    const result = classifyRun();
    report('awaken-chest-open');
    if (!result.rush) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const loot = saltLoot();
    writeJSON(LOOT_KEY, loot);
    report('awaken-loot-salt');
    renderSalt(document.getElementById('awIn'));
  }, true);
}

function watchBossModal() {
  const modal = document.getElementById('awaken');
  const host = document.getElementById('awIn');
  if (!modal || !host) return;
  const sync = () => {
    if (!modal.hidden) classifyRun();
    if (!modal.hidden && claimedSalt()) renderSalt(host);
  };
  new MutationObserver(sync).observe(modal, { attributes:true, attributeFilter:['hidden'] });
  new MutationObserver(sync).observe(host, { childList:true, subtree:false });
  sync();
}

function watchChapterStart() {
  const chapter = document.getElementById('chapter');
  if (!chapter) return;
  const sync = () => { if (!chapter.hidden) startRun(); };
  new MutationObserver(sync).observe(chapter, { attributes:true, attributeFilter:['hidden'] });
  sync();
  addEventListener('scroll', onScroll, { passive:true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseActive(); else resumeActive();
  });
  addEventListener('pagehide', pauseActive, { passive:true });
}

function waitForPromptComparison() {
  if (enhancePublicPromptComparison()) return;
  const observer = new MutationObserver(() => {
    if (enhancePublicPromptComparison()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(() => observer.disconnect(), 6000);
}

function boot() {
  if (!isBossPage() || document.documentElement.dataset.awakenRush === '1') return;
  document.documentElement.dataset.awakenRush = '1';
  injectStyles();
  waitForPromptComparison();
  watchChapterStart();
  interceptChest();
  watchBossModal();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
