/* myClover · Forge EP7 path choice
   หลังอ่านตอนที่ 7 จบจริง เปิดทางเลือก 2 Main Quest + 1 Subquest

   สำคัญ:
   - ไม่เด้งตอน quest.js นับ 70% เพราะยังอาจอ่านช่องสุดท้ายไม่จบ
   - รอจนผู้อ่านเลื่อนผ่านภาพช่องสุดท้าย เข้าสู่พื้นที่ท้ายตอน
   - ต้องค้างอยู่ตรงนั้นต่อเนื่อง 3 วินาที จึงแสดงครั้งเดียว
   - ทางเลือกทั้งหมดเปิดอยู่ ไม่บังคับ Walkthrough และไม่ล็อกห้องเรียน
*/

const EP7_PATH = '/forge/ep7-a-voice-that-went-further/';
const EP7_SLUG = 'ep7-a-voice-that-went-further';
const SEEN_KEY = 'mc_forge_paths_seen_v1';
const DWELL_MS = 3000;
const MODAL_ID = 'mcForgePathChoice';

function onEp7() {
  const path = location.pathname.replace(/index\.html$/, '');
  return path === EP7_PATH || path === EP7_PATH.slice(0, -1);
}

function read(key, fallback = '') {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

function forgeTrack() {
  try { return window.MC_QUEST?.track?.('forge') || null; } catch { return null; }
}

function forgeComplete() {
  const track = forgeTrack();
  if (track?.complete?.()) return true;
  if (read('mc_forge_done') === '1') return true;
  try {
    const titles = JSON.parse(read('mc_titles', '[]'));
    return Array.isArray(titles) && titles.includes('BLACKSMITH');
  } catch {
    return false;
  }
}

function ensureEp7Complete() {
  try { forgeTrack()?.mark?.(EP7_SLUG); } catch { /* quest system optional */ }
  try { window.MC_QUEST?.paint?.(); } catch { /* quest system optional */ }
  return forgeComplete();
}

function addStyles() {
  if (document.getElementById('mc-forge-path-style')) return;
  const style = document.createElement('style');
  style.id = 'mc-forge-path-style';
  style.textContent = `
    .forge-routes{margin-top:30px}
    .forge-routes__head{display:flex;align-items:center;gap:12px;margin-bottom:12px;color:rgb(var(--muted));font-family:"Bai Jamjuree",system-ui;font-size:11.5px;font-weight:700;letter-spacing:.12em}
    .forge-routes__head::before,.forge-routes__head::after{content:"";height:1px;flex:1;background:rgb(var(--ink)/.16)}
    .forge-routes__intro{margin:0 0 14px;text-align:center;color:rgb(var(--muted));font-size:14px}
    .forge-routes__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
    .forge-route{position:relative;display:flex;flex-direction:column;min-height:190px;padding:20px;border:1px solid rgb(var(--ink)/.12);border-radius:18px;background:#fff;color:rgb(var(--ink));box-shadow:0 16px 38px -30px rgb(18 40 28/.45);transition:transform .18s,border-color .18s,box-shadow .18s}
    .forge-route:hover{transform:translateY(-3px);border-color:rgb(var(--green)/.45);box-shadow:0 23px 46px -28px rgb(18 40 28/.52)}
    .forge-route--recommended{border:1.5px solid rgb(var(--gold));background:linear-gradient(145deg,rgb(190 148 66/.16),#fff 72%)}
    .forge-route--sub{grid-column:1/-1;min-height:0;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:16px 18px;background:rgb(var(--ink)/.025)}
    .forge-route__icon{font-size:31px;line-height:1}
    .forge-route__tag{display:block;margin-top:12px;color:rgb(var(--green));font-family:"Bai Jamjuree",system-ui;font-size:10.5px;font-weight:800;letter-spacing:.12em}
    .forge-route--recommended .forge-route__tag{color:rgb(145 105 34)}
    .forge-route__title{display:block;margin-top:5px;font-family:"Bai Jamjuree",system-ui;font-size:18px;line-height:1.35}
    .forge-route__desc{display:block;margin-top:7px;color:rgb(var(--muted));font-size:13.5px;line-height:1.68}
    .forge-route__go{display:block;margin-top:auto;padding-top:13px;color:rgb(var(--green));font-family:"Bai Jamjuree",system-ui;font-size:13px;font-weight:800}
    .forge-route--recommended .forge-route__go{color:rgb(130 92 25)}
    .forge-route--sub .forge-route__icon{font-size:26px}.forge-route--sub .forge-route__tag{margin-top:0}.forge-route--sub .forge-route__go{margin:0;padding:0;white-space:nowrap}

    .forge-choice{position:fixed;inset:0;z-index:3200;display:grid;place-items:center;padding:18px;background:rgb(3 14 8/.86);backdrop-filter:blur(11px);animation:forgeChoiceFade .22s ease both}
    .forge-choice[hidden]{display:none!important}
    .forge-choice__panel{position:relative;width:min(780px,100%);max-height:min(90dvh,900px);overflow:auto;border:1px solid rgb(229 199 121/.48);border-radius:26px;padding:clamp(24px,5vw,38px);color:#fff;background:radial-gradient(620px 320px at 100% 0%,rgb(190 148 66/.25),transparent 65%),radial-gradient(520px 340px at 0% 100%,rgb(27 106 66/.48),transparent 68%),linear-gradient(145deg,#071a10,#103421);box-shadow:0 44px 120px rgb(0 0 0/.72);animation:forgeChoicePop .36s cubic-bezier(.22,1,.36,1) both}
    .forge-choice__close{position:absolute;right:14px;top:13px;width:42px;height:42px;border:1px solid rgb(255 255 255/.2);border-radius:50%;background:rgb(255 255 255/.07);color:#fff;font-size:18px;cursor:pointer}
    .forge-choice__eyebrow{display:block;color:rgb(var(--gold));font-family:"Bai Jamjuree",system-ui;font-size:11px;font-weight:800;letter-spacing:.15em}
    .forge-choice h2{max-width:20ch;margin:11px 0 10px;color:#fff;font-family:"Bai Jamjuree",system-ui;font-size:clamp(27px,5vw,40px);line-height:1.17;letter-spacing:-.025em}
    .forge-choice__lead{margin:0;color:rgb(255 255 255/.76);font-size:15.5px;line-height:1.75}
    .forge-choice__routes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:22px}
    .forge-choice__route{display:flex;flex-direction:column;min-height:190px;padding:19px;border:1px solid rgb(255 255 255/.17);border-radius:18px;background:rgb(255 255 255/.065);color:#fff;text-decoration:none;transition:transform .18s,border-color .18s,background .18s}
    .forge-choice__route:hover{transform:translateY(-3px);border-color:rgb(var(--gold));background:rgb(255 255 255/.1)}
    .forge-choice__route--recommended{border-color:rgb(var(--gold));background:linear-gradient(145deg,rgb(190 148 66/.22),rgb(255 255 255/.06))}
    .forge-choice__route--sub{grid-column:1/-1;min-height:0;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:16px 18px}
    .forge-choice__route .forge-route__tag{color:rgb(var(--gold))}
    .forge-choice__route .forge-route__title{color:#fff}
    .forge-choice__route .forge-route__desc{color:rgb(255 255 255/.66)}
    .forge-choice__route .forge-route__go{color:rgb(var(--gold))}
    .forge-choice__later{display:block;width:100%;margin-top:13px;border:0;background:transparent;color:rgb(255 255 255/.58);font:650 13px/1.5 system-ui;cursor:pointer;padding:10px}
    @keyframes forgeChoiceFade{from{opacity:0}to{opacity:1}}
    @keyframes forgeChoicePop{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
    @media(max-width:650px){
      .forge-routes__grid,.forge-choice__routes{grid-template-columns:1fr}
      .forge-route--sub,.forge-choice__route--sub{grid-column:auto;display:flex;align-items:flex-start}
      .forge-choice{align-items:end;padding:9px}
      .forge-choice__panel{max-height:92dvh;border-radius:23px 23px 18px 18px;padding:27px 18px 19px}
      .forge-choice__route{min-height:0}
    }
    @media(prefers-reduced-motion:reduce){.forge-choice,.forge-choice__panel{animation:none}.forge-route,.forge-choice__route{transition:none}}
  `;
  document.head.append(style);
}

const routesMarkup = ({ modal = false } = {}) => {
  const cardClass = modal ? 'forge-choice__route' : 'forge-route';
  return `
    <a class="${cardClass} ${cardClass}--recommended" href="/core7/tutorial/?entry=walkthrough" data-forge-route="core7">
      <span class="forge-route__icon" aria-hidden="true">🎮</span>
      <span class="forge-route__tag">MAIN QUEST · เข็มทิศแนะนำ</span>
      <b class="forge-route__title">ลอง CORE7 ก่อน · ประมาณ 1 นาที</b>
      <span class="forge-route__desc">ดูหลักฐานว่า Source ที่จัดไว้ดี สามารถกลายเป็นเกมออนไลน์ที่เล่นได้จริงอย่างไร</span>
      <span class="forge-route__go">Quick Tutorial → เล่นกับบอท</span>
    </a>
    <a class="${cardClass}" href="/classroom/" data-forge-route="classroom">
      <span class="forge-route__icon" aria-hidden="true">🧴</span>
      <span class="forge-route__tag">MAIN QUEST</span>
      <b class="forge-route__title">เรียน AI ใส่ซอส · 6 บท</b>
      <span class="forge-route__desc">เอา Source-based AI Workflow ไปใช้กับงานจริงของคุณ เริ่มเรียนได้ทันทีโดยไม่ต้องผ่านเกม</span>
      <span class="forge-route__go">เริ่มบทที่ 1 →</span>
    </a>
    <a class="${cardClass} ${cardClass}--sub" href="/walkthrough/" data-forge-route="walkthrough">
      <span class="forge-route__icon" aria-hidden="true">🗺️</span>
      <span>
        <span class="forge-route__tag">SUBQUEST · OPTIONAL</span>
        <b class="forge-route__title">Walkthrough · อ่านเบื้องหลัง 1 นาที</b>
        <span class="forge-route__desc">ดูว่าเรื่อง 7 ตอน หลักสูตร และ CORE7 เชื่อมกันด้วย Source อย่างไร — ข้ามได้</span>
      </span>
      <span class="forge-route__go">เปิดดู →</span>
    </a>`;
};

function patchPersistentRoutes() {
  const current = document.querySelector('.nextup');
  if (!current) return;

  current.className = 'forge-routes';
  current.innerHTML = `
    <div class="forge-routes__head">WHY COMPLETE · PATHS UNLOCKED</div>
    <p class="forge-routes__intro"><b>Main Quest เปิด 2 ทาง</b> และมี Walkthrough เป็น Subquest — เลือกเองได้ทั้งหมด</p>
    <div class="forge-routes__grid">${routesMarkup()}</div>`;

  if (forgeComplete()) current.hidden = false;
}

function silenceOldFinishAutoOpen() {
  /* กล่อง BLACKSMITH ยังอยู่ให้กางดูและคัดลอกรหัสได้ แต่ไม่แย่งจังหวะ
     popup ทางเลือกใหม่ด้วยการกางอัตโนมัติ */
  write('mc_forge_finish_seen', '1');
  const finish = document.getElementById('finishBox');
  if (finish) finish.open = false;
}

function trackChoice(route, surface) {
  try { window.gtag?.('event', 'forge_path_choice', { route, surface }); } catch { /* optional */ }
}

function bindRouteTracking(root, surface) {
  root.querySelectorAll('[data-forge-route]').forEach(link => {
    link.addEventListener('click', () => trackChoice(link.dataset.forgeRoute || '', surface));
  });
}

function showChoice() {
  if (read(SEEN_KEY) === '1' || document.getElementById(MODAL_ID)) return false;
  if (!ensureEp7Complete()) return false;

  write(SEEN_KEY, '1');
  patchPersistentRoutes();
  silenceOldFinishAutoOpen();

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.className = 'forge-choice';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'forgeChoiceTitle');
  modal.innerHTML = `
    <section class="forge-choice__panel">
      <button class="forge-choice__close" type="button" data-close aria-label="ปิด">✕</button>
      <span class="forge-choice__eyebrow">⚒️ WHY COMPLETE · 3 PATHS UNLOCKED</span>
      <h2 id="forgeChoiceTitle">อ่านจบแล้ว<br>เปิดทางต่อ 3 ทาง</h2>
      <p class="forge-choice__lead">Main Quest เปิดพร้อมกัน 2 ทาง เลือกเรียนต่อได้เลย หรือทำตามเข็มทิศไปลองของจริงก่อน ส่วน Walkthrough เป็น Subquest ที่ข้ามได้</p>
      <div class="forge-choice__routes">${routesMarkup({ modal: true })}</div>
      <button class="forge-choice__later" type="button" data-close>ยังไม่เลือก · ดูท้ายตอนต่อ</button>
    </section>`;

  const previousOverflow = document.documentElement.style.overflow;
  const returnFocus = document.activeElement;
  const close = () => {
    modal.remove();
    document.documentElement.style.overflow = previousOverflow;
    try { returnFocus?.focus?.(); } catch { /* optional */ }
  };

  modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', function escape(event) {
    if (event.key !== 'Escape' || !document.body.contains(modal)) return;
    close();
  });
  bindRouteTracking(modal, 'popup');

  document.documentElement.style.overflow = 'hidden';
  document.body.append(modal);
  modal.querySelector('[data-forge-route="core7"]')?.focus();
  try { window.gtag?.('event', 'forge_paths_unlocked'); } catch { /* optional */ }
  return true;
}

function startEndDwell() {
  const endArea = document.querySelector('nav[data-mc-end]');
  if (!endArea) return;

  let timer = 0;
  let ticking = false;

  const trulyPastFinalPanel = () => {
    const rect = endArea.getBoundingClientRect();
    const threshold = Math.max(90, window.innerHeight * 0.22);
    return rect.top <= threshold && rect.bottom > 0;
  };

  const cancel = () => {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  };

  const evaluate = () => {
    ticking = false;
    if (read(SEEN_KEY) === '1') {
      cancel();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      return;
    }

    if (!trulyPastFinalPanel()) {
      cancel();
      return;
    }

    if (!timer) {
      timer = window.setTimeout(() => {
        timer = 0;
        if (trulyPastFinalPanel()) showChoice();
      }, DWELL_MS);
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(evaluate);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  evaluate();
}

function boot() {
  if (!onEp7()) return;
  addStyles();
  silenceOldFinishAutoOpen();
  patchPersistentRoutes();

  const persistent = document.querySelector('.forge-routes');
  if (persistent) bindRouteTracking(persistent, 'end-page');

  startEndDwell();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
