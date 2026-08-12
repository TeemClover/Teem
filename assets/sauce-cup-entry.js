const PATHS = new Set([
  '/forge/ep1-everyone-gets-to-play/',
  '/forge/ep1-everyone-gets-to-play/index.html'
]);
const SEEN_KEY = 'mc_sauce_cup_offer_seen';

function track(choice) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'sauce_cup_offer_choice', choice });
}

function hasSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; }
  catch (_) { return false; }
}

function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); }
  catch (_) { /* Progress can still continue without storage access. */ }
}

function showOffer() {
  if (!PATHS.has(location.pathname) || hasSeen() || document.getElementById('mcSauceCupOffer')) return;
  markSeen();

  const style = document.createElement('style');
  style.textContent = `
    .mc-sauce-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgb(5 20 12/.82);backdrop-filter:blur(6px)}
    .mc-sauce-modal{position:relative;width:min(560px,100%);max-height:min(720px,calc(100dvh - 36px));overflow:auto;padding:clamp(25px,5vw,38px);border-radius:24px;background:#f8f6f0;color:#12281c;border:1px solid rgb(190 148 66/.72);box-shadow:0 32px 75px rgb(0 0 0/.42);font-family:"Anuphan",system-ui,sans-serif;line-height:1.65}
    .mc-sauce-close{position:absolute;right:13px;top:13px;width:42px;height:42px;border:0;border-radius:50%;background:#ebe6da;color:#12281c;font-size:25px;cursor:pointer}.mc-sauce-tag{color:#92702e;font:800 11px "Bai Jamjuree","Anuphan",sans-serif;letter-spacing:.12em}.mc-sauce-modal h2{margin:8px 42px 8px 0;font:800 clamp(25px,6vw,34px)/1.25 "Bai Jamjuree","Anuphan",sans-serif}.mc-sauce-modal>p{margin:0;color:#5f6e63;font-size:15px}.mc-sauce-note{margin:16px 0;padding:13px 15px;border-radius:13px;background:rgb(27 106 66/.07);border-left:4px solid #1b6a42;font-size:13px}.mc-sauce-actions{display:grid;gap:10px;margin-top:18px}.mc-sauce-actions a,.mc-sauce-actions button{min-height:54px;display:flex;align-items:center;justify-content:center;border-radius:13px;padding:12px 16px;text-align:center;text-decoration:none;font:800 15px "Bai Jamjuree","Anuphan",sans-serif;cursor:pointer}.mc-sauce-continue{order:1;border:0;background:#1b6a42;color:#fff;box-shadow:0 11px 24px rgb(27 106 66/.25)}.mc-sauce-taste{order:2;border:1px solid rgb(27 106 66/.35);background:#fff;color:#155634}.mc-sauce-rec{display:block;font-size:10px;color:#d9c080;letter-spacing:.08em;margin-right:7px}.mc-sauce-small{display:block;margin-top:12px;text-align:center;color:#718077;font-size:11px}
    @media(max-width:430px){.mc-sauce-backdrop{padding:12px}.mc-sauce-modal{padding:27px 20px 22px;border-radius:20px}.mc-sauce-modal h2{font-size:26px}.mc-sauce-actions a,.mc-sauce-actions button{min-height:52px}}
  `;

  const backdrop = document.createElement('div');
  backdrop.className = 'mc-sauce-backdrop';
  backdrop.id = 'mcSauceCupOffer';
  backdrop.innerHTML = `
    <section class="mc-sauce-modal" role="dialog" aria-modal="true" aria-labelledby="mcSauceTitle" aria-describedby="mcSauceDesc">
      <button class="mc-sauce-close" type="button" aria-label="ปิดและอ่านการ์ตูนต่อ">×</button>
      <div class="mc-sauce-tag">ก่อนเข้าเรื่อง · เลือกทางเดิน</div>
      <h2 id="mcSauceTitle">อยากชิมบทเรียนก่อน หรืออ่านเรื่องต่อ?</h2>
      <p id="mcSauceDesc">ถ้ามาที่นี่เพราะอยากใช้ AI คุณลองบท 1 แบบย่อได้เลย ใช้เวลาประมาณ 7 นาที และได้ของไปใช้จริงหนึ่งชิ้น</p>
      <div class="mc-sauce-note"><b>เราแนะนำให้อ่านต่อ:</b> การ์ตูน 7 ตอนทำให้เข้าใจบทเต็มเร็วขึ้น เพราะเห็นวิธีคิดก่อนเจอเครื่องมือ</div>
      <div class="mc-sauce-actions">
        <button class="mc-sauce-continue" type="button"><span class="mc-sauce-rec">แนะนำ</span>อ่านต่อ · ตอนที่ 1</button>
        <a class="mc-sauce-taste" href="/classroom/sauce-cup/">ชิมซอส · บทเรียนย่อ 7 นาที</a>
      </div>
      <span class="mc-sauce-small">เลือกครั้งนี้ครั้งเดียว ครั้งหน้าจะไม่ถามซ้ำ</span>
    </section>`;

  const close = (choice) => {
    track(choice);
    backdrop.remove();
    style.remove();
    document.documentElement.style.overflow = '';
  };
  backdrop.querySelector('.mc-sauce-close').addEventListener('click', () => close('close'));
  backdrop.querySelector('.mc-sauce-continue').addEventListener('click', () => close('continue_comic'));
  backdrop.querySelector('.mc-sauce-taste').addEventListener('click', () => track('taste_sauce'));
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close('backdrop'); });
  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close('escape');
    if (event.key === 'Tab') {
      const focusable = [...backdrop.querySelectorAll('button,a')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  document.head.appendChild(style);
  document.body.appendChild(backdrop);
  document.documentElement.style.overflow = 'hidden';
  backdrop.querySelector('.mc-sauce-continue').focus();
  track('shown');
}

function enhanceSauceCupEnding() {
  if (!/^\/classroom\/sauce-cup\/?(?:index\.html)?$/.test(location.pathname)) return;
  if (document.getElementById('mcSauceCupPoster')) return;

  const end = document.querySelector('.end');
  const why = end && end.querySelector('.why');
  if (!end || !why) return;

  const style = document.createElement('style');
  style.id = 'mcSauceCupPosterStyle';
  style.textContent = `
    #mcSauceCupPoster{width:100%;max-width:100%;margin:24px 0 0;transform:none;overflow:hidden}
    #mcSauceCupPoster img{display:block;width:100%;max-width:100%;height:auto}
  `;
  document.head.appendChild(style);

  const figure = document.createElement('figure');
  figure.id = 'mcSauceCupPoster';
  figure.innerHTML = '<img src="/classroom/sauce-cup/banner-classroom.jpg" width="1024" height="1536" alt="ภาพรวม AI ใส่ซอส Workflow 6 บท">';
  why.before(figure);

  why.innerHTML = '<b>ทำไมแนะนำให้กลับไปอ่านการ์ตูนก่อน:</b> เพราะพื้นฐานของวิธีคิดนี้เริ่มมาตั้งแต่ <b>กระดาษ A4 1 แผ่น</b> การ์ตูน 7 ตอนจะพาเห็นว่ากระดาษแผ่นนั้นค่อย ๆ กลายเป็น “ซอส” และต่อยอดมาเป็น Workflow 6 บทที่เห็นในภาพนี้ได้ยังไง';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(showOffer, 280);
    enhanceSauceCupEnding();
  }, { once: true });
} else {
  setTimeout(showOffer, 280);
  enhanceSauceCupEnding();
}
