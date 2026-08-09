/* AI ใส่ซอส · Subquest หลังจบบท 1
   ทางหลักยังไปบท 2 ตามเดิม ส่วน Walkthrough และการ์ดเป็นของแถมที่เลือกทำได้
*/

const LESSON_ONE_PATH = '/classroom/free-ai.html';
const COMPLETE_KEY = 'mc-sauce-lesson-1-complete';
const WALK_KEY = 'mc_walk_done';
const ROOT_ID = 'lessonOneSubquests';

function onLessonOne() {
  return location.pathname === LESSON_ONE_PATH;
}

function read(key, fallback = '') {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function addStyles() {
  if (document.getElementById('lesson-one-subquest-style')) return;
  const style = document.createElement('style');
  style.id = 'lesson-one-subquest-style';
  style.textContent = `
    .lesson-subquests{margin:22px 0 8px;padding:22px;border:1px solid rgb(var(--gold)/.42);border-radius:20px;background:linear-gradient(145deg,rgb(var(--gold)/.11),#fff 68%);box-shadow:0 16px 38px rgb(18 40 28/.06);animation:subquestIn .35s ease both}
    .lesson-subquests__tag{display:block;color:#7c5a1c;font-family:"Bai Jamjuree",system-ui;font-size:11px;font-weight:800;letter-spacing:.14em}
    .lesson-subquests h2{margin:7px 0 5px;font-family:"Bai Jamjuree",system-ui;font-size:clamp(20px,4vw,27px);line-height:1.3}
    .lesson-subquests__lead{margin:0;color:rgb(var(--muted));font-size:13.5px;line-height:1.7}
    .lesson-subquests__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:17px}
    .lesson-subquests__grid.is-single{grid-template-columns:1fr}
    .lesson-subquest{display:flex;flex-direction:column;min-height:172px;padding:18px;border:1px solid rgb(var(--ink)/.11);border-radius:16px;background:#fff;color:rgb(var(--ink));text-decoration:none;transition:transform .18s,border-color .18s,box-shadow .18s}
    .lesson-subquest:hover{transform:translateY(-3px);border-color:rgb(var(--green)/.4);box-shadow:0 18px 36px -25px rgb(18 40 28/.55)}
    .lesson-subquest__icon{font-size:29px;line-height:1}
    .lesson-subquest__kind{display:block;margin-top:11px;color:rgb(var(--green));font-family:"Bai Jamjuree",system-ui;font-size:10.5px;font-weight:800;letter-spacing:.11em}
    .lesson-subquest b{display:block;margin-top:4px;font-family:"Bai Jamjuree",system-ui;font-size:17px;line-height:1.38}
    .lesson-subquest p{margin:6px 0 0;color:rgb(var(--muted));font-size:13px;line-height:1.65}
    .lesson-subquest__go{display:block;margin-top:auto;padding-top:12px;color:rgb(var(--green));font-family:"Bai Jamjuree",system-ui;font-size:12.5px;font-weight:800}
    .lesson-subquest.is-done{background:rgb(var(--green)/.055);border-color:rgb(var(--green)/.28)}
    .lesson-subquest.is-done .lesson-subquest__kind,.lesson-subquest.is-done .lesson-subquest__go{color:rgb(var(--green))}
    @keyframes subquestIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @media(max-width:620px){.lesson-subquests{padding:19px 16px}.lesson-subquests__grid{grid-template-columns:1fr}.lesson-subquest{min-height:0}}
    @media(prefers-reduced-motion:reduce){.lesson-subquests{animation:none}.lesson-subquest{transition:none}}
  `;
  document.head.append(style);
}

function walkthroughCard() {
  return `
    <a class="lesson-subquest" href="/walkthrough/" data-subquest="walkthrough">
      <span class="lesson-subquest__icon" aria-hidden="true">🗺️</span>
      <span class="lesson-subquest__kind">SUBQUEST · OPTIONAL · 1 นาที</span>
      <b>อ่าน Walkthrough</b>
      <p>มัดเรื่อง 7 ตอน หลักสูตร และ CORE7 ให้เห็นว่าซอสขวดเดียวเดินทางไปเป็นงานหลายแบบได้อย่างไร</p>
      <span class="lesson-subquest__go">เปิดอ่าน →</span>
    </a>`;
}

function cardQuest() {
  const done = read('mc_opened') === '1';
  return `
    <a class="lesson-subquest${done ? ' is-done' : ''}" href="/card/" data-subquest="card">
      <span class="lesson-subquest__icon" aria-hidden="true">🎴</span>
      <span class="lesson-subquest__kind">SUBQUEST · OPTIONAL${done ? ' · ทำแล้ว ✓' : ''}</span>
      <b>${done ? 'กลับไปดูการ์ดประจำตัว' : 'ทำการ์ดประจำตัวใบแรก'}</b>
      <p>เก็บสายที่เลือก ตราที่ปลด และหลักฐานการเดินทางของคุณไว้ในภาพเดียว ส่งต่อหรือกลับมาดูทีหลังได้</p>
      <span class="lesson-subquest__go">${done ? 'เปิดการ์ด →' : 'สร้างการ์ด →'}</span>
    </a>`;
}

function render() {
  if (!onLessonOne() || read(COMPLETE_KEY) !== '1') return;
  addStyles();

  const quest = document.querySelector('.quest');
  const next = document.querySelector('.nextrow');
  if (!quest || !next) return;

  document.getElementById(ROOT_ID)?.remove();
  const walkUnread = read(WALK_KEY) !== '1';
  const cards = `${walkUnread ? walkthroughCard() : ''}${cardQuest()}`;

  const section = document.createElement('section');
  section.id = ROOT_ID;
  section.className = 'lesson-subquests';
  section.setAttribute('aria-labelledby', 'lessonOneSubquestTitle');
  section.innerHTML = `
    <span class="lesson-subquests__tag">🔓 SUBQUEST UNLOCKED · ไม่บังคับ</span>
    <h2 id="lessonOneSubquestTitle">ซอสขวดแรกเสร็จแล้ว<br>ของแถมเปิดเพิ่ม</h2>
    <p class="lesson-subquests__lead">Main Quest ไปบทที่ 2 ได้เลย ส่วนของด้านล่างเลือกทำเมื่อพร้อม${walkUnread ? ' — มี 2 ช่องพอดี' : ''}</p>
    <div class="lesson-subquests__grid${walkUnread ? '' : ' is-single'}">${cards}</div>`;
  next.insertAdjacentElement('beforebegin', section);

  section.querySelectorAll('[data-subquest]').forEach(link => {
    link.addEventListener('click', () => {
      try { window.gtag?.('event', 'lesson_one_subquest', { quest: link.dataset.subquest || '' }); } catch { /* optional */ }
    });
  });
}

function boot() {
  if (!onLessonOne()) return;
  render();
  document.getElementById('finishLesson')?.addEventListener('click', () => window.setTimeout(render, 0));
  window.addEventListener('pageshow', render);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
