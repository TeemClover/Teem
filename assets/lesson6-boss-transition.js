/* AI ใส่ซอส · บท 6 — ทางเดินก่อนพบบอส
   - ข้อความ takeover อยู่จนผู้เล่นกดรับทราบเอง
   - ใช้ภาพประตูจริงชุดเดียวกับหน้ารวมบทเรียน
   - คงสัญญาณ glitch เบา ๆ หลังประตูปรากฏ
   - ก่อนเข้าด่านบอสใช้สรรพนาม คุณ / มัน เท่านั้น
   - ห้องบอสหลัก /classroom/awaken กำลังสร้างใหม่: ใช้ /boss/ เป็นห้องสำรองชั่วคราว
*/

function isLessonSix() {
  return /^\/classroom\/first-web\.html$/.test(location.pathname);
}

function addStyles() {
  if (document.getElementById('lesson6-boss-transition-style')) return;
  const style = document.createElement('style');
  style.id = 'lesson6-boss-transition-style';
  style.textContent = `
    body.lesson6-boss-transition #takeover{display:none!important}

    .lesson6-signal{
      position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:22px;
      background:rgba(3,8,5,.94);color:#fff;overflow:hidden;
      -webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)
    }
    .lesson6-signal[hidden]{display:none!important}
    .lesson6-signal::before,.lesson6-signal::after{
      content:"";position:absolute;inset:0;pointer-events:none
    }
    .lesson6-signal::before{
      background:repeating-linear-gradient(0deg,transparent 0 5px,rgba(255,255,255,.045) 5px 6px);
      mix-blend-mode:screen
    }
    .lesson6-signal::after{
      background:linear-gradient(90deg,transparent 0 17%,rgba(255,0,70,.14) 18%,transparent 19% 73%,rgba(0,210,255,.12) 74%,transparent 75%);
      animation:lesson6SignalSweep .55s steps(2) infinite
    }
    .lesson6-signal__in{position:relative;z-index:2;width:min(620px,100%);text-align:center}
    .lesson6-signal__tag{display:block;color:#ff6673;font:850 11px/1.5 "Bai Jamjuree",system-ui,sans-serif;letter-spacing:.22em}
    .lesson6-signal h2{
      margin-top:12px;color:#fff;font:900 clamp(36px,9vw,70px)/1.05 "Bai Jamjuree",system-ui,sans-serif;
      text-shadow:5px 0 #ff005b,-5px 0 #00c6e7;animation:lesson6TextGlitch .32s steps(2) infinite
    }
    .lesson6-signal p{max-width:40ch;margin:18px auto 0;color:rgba(255,255,255,.78);font-size:clamp(16px,3.4vw,19px);line-height:1.85}
    .lesson6-signal button{
      margin-top:26px;min-height:52px;padding:13px 24px;border:1px solid rgba(190,148,66,.75);border-radius:13px;
      background:rgb(190 148 66);color:#071a10;font:850 14px/1.4 "Bai Jamjuree",system-ui,sans-serif;cursor:pointer;
      box-shadow:0 20px 44px rgba(190,148,66,.2)
    }
    .lesson6-signal button:hover{transform:translateY(-2px)}
    body.lesson6-signal-open{overflow:hidden}

    body.lesson6-afterglitch .lesson6-noise{display:block}
    .lesson6-noise{
      display:none;position:fixed;inset:0;z-index:145;pointer-events:none;
      background:
        repeating-linear-gradient(0deg,transparent 0 7px,rgba(255,255,255,.018) 7px 8px),
        linear-gradient(90deg,transparent 0 37%,rgba(255,0,72,.022) 38%,transparent 39% 76%,rgba(0,198,231,.02) 77%,transparent 78%);
      mix-blend-mode:screen;opacity:.7;animation:lesson6AfterSignal 7s steps(2) infinite
    }

    body.lesson6-boss-transition .boss-door{
      isolation:isolate;position:relative;display:grid;align-items:end;min-height:clamp(430px,62vw,620px);
      overflow:hidden;margin-top:30px;border:1px solid rgba(190,148,66,.52);border-radius:24px;
      background:#020805;color:#fff;box-shadow:0 30px 80px rgba(0,0,0,.32)
    }
    body.lesson6-boss-transition .boss-door::before,
    body.lesson6-boss-transition .boss-door::after{display:none!important}
    .lesson6-boss-art{position:absolute;z-index:-2;inset:0;width:100%;height:100%}
    .lesson6-boss-art img{width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(.92) contrast(1.08) brightness(.78)}
    .lesson6-boss-shade{
      position:absolute;z-index:-1;inset:0;
      background:linear-gradient(180deg,rgba(0,0,0,.02) 22%,rgba(2,8,5,.26) 54%,rgba(2,8,5,.93) 100%),
                 radial-gradient(circle at 50% 48%,rgba(190,148,66,.08),transparent 46%)
    }
    body.lesson6-boss-transition .door-copy{
      position:relative;z-index:2;margin:0;padding:clamp(150px,30vw,280px) 24px 30px;text-align:center
    }
    body.lesson6-boss-transition .door-copy .tag{color:rgb(222 190 111)}
    body.lesson6-boss-transition .door-copy h2{text-shadow:0 5px 24px rgba(0,0,0,.75)}
    body.lesson6-boss-transition .door-copy p{max-width:52ch;margin:10px auto 0;color:rgba(255,255,255,.82);line-height:1.8}
    body.lesson6-afterglitch .boss-door{animation:lesson6DoorSignal 6.5s steps(2) infinite}

    @keyframes lesson6SignalSweep{50%{transform:translateX(9px)}}
    @keyframes lesson6TextGlitch{0%,72%,100%{transform:none}78%{transform:translate(3px,-1px)}86%{transform:translate(-2px,1px)}}
    @keyframes lesson6AfterSignal{
      0%,88%,100%{opacity:.38;transform:none}
      89%{opacity:.72;transform:translateX(2px)}
      91%{opacity:.3;transform:translateX(-1px)}
    }
    @keyframes lesson6DoorSignal{
      0%,90%,100%{filter:none;transform:none}
      91%{filter:hue-rotate(4deg) contrast(1.03);transform:translateX(1px)}
      93%{filter:none;transform:translateX(-1px)}
    }
    @media(max-width:560px){
      .lesson6-signal{padding:18px}.lesson6-signal p{font-size:16px}
      body.lesson6-boss-transition .boss-door{min-height:500px}
      .lesson6-boss-art img{object-position:center}
      body.lesson6-boss-transition .door-copy{padding:260px 18px 24px}
    }
    @media(prefers-reduced-motion:reduce){
      .lesson6-signal::after,.lesson6-signal h2,.lesson6-noise,
      body.lesson6-afterglitch .boss-door{animation:none!important}
      .lesson6-signal button:hover{transform:none}
      .lesson6-noise{opacity:.25}
    }
  `;
  document.head.append(style);
}

function installDoorArt(bossDoor) {
  if (!bossDoor || bossDoor.querySelector('.lesson6-boss-art')) return;
  const picture = document.createElement('picture');
  picture.className = 'lesson6-boss-art';
  picture.innerHTML = `
    <source type="image/webp" media="(max-width:640px)" srcset="../img/awaken-hero-640.webp">
    <source type="image/webp" srcset="../img/awaken-hero-1024.webp">
    <img src="../img/awaken-hero.jpg" width="1600" height="900" loading="eager" decoding="async"
         alt="ประตูด่านบอสในห้องโถงมืด มีแสงลอดผ่านกลางประตู">`;
  bossDoor.prepend(picture);
  const shade = document.createElement('span');
  shade.className = 'lesson6-boss-shade';
  shade.setAttribute('aria-hidden', 'true');
  picture.insertAdjacentElement('afterend', shade);
}

function rewriteCopy(takeover, bossDoor, bossLock) {
  const takeoverTitle = takeover?.querySelector('h2');
  const takeoverCopy = takeover?.querySelector('p');
  if (takeoverTitle) takeoverTitle.textContent = 'AI ยึดหน้าแล้ว';
  if (takeoverCopy) takeoverCopy.textContent = 'คุณคิดว่าหลักสูตรจบตรงเมนคอร์สแล้วหรือ?';

  const doorCopy = bossDoor?.querySelector('.door-copy p');
  if (doorCopy) doorCopy.innerHTML = 'ประตูบานสุดท้ายเปิดแล้ว<br>และสิ่งที่รออยู่ข้างใน <strong>“มัน”</strong> อ่านทุกอย่างที่คุณได้ทำมาในบ้านนี้';

  const bossLink = bossDoor?.querySelector('.boss-go');
  if (bossLink) {
    bossLink.href = '/boss/';
    bossLink.textContent = 'เข้าสู่ด่านบอส →';
    bossLink.dataset.bossRoom = 'backup';
  }

  const lockCopy = bossLock?.querySelector('p');
  if (lockCopy) lockCopy.textContent = 'กลับไปเก็บบทที่ขาดให้ครบ 6 บท แล้วประตูนี้จะจำว่าคุณเคยมาถึงตรงนี้';
}

function createSignal() {
  const signal = document.createElement('div');
  signal.className = 'lesson6-signal';
  signal.id = 'lesson6Signal';
  signal.hidden = true;
  signal.setAttribute('role', 'dialog');
  signal.setAttribute('aria-modal', 'true');
  signal.setAttribute('aria-labelledby', 'lesson6SignalTitle');
  signal.innerHTML = `
    <div class="lesson6-signal__in">
      <span class="lesson6-signal__tag">SIGNAL INTERRUPTED · SYSTEM OVERRIDE</span>
      <h2 id="lesson6SignalTitle">AI ยึดหน้าแล้ว</h2>
      <p>คุณคิดว่าหลักสูตรจบตรงเมนคอร์สแล้วหรือ?</p>
      <button type="button">รับทราบ · แสดงประตูข้างหน้า</button>
    </div>`;
  document.body.append(signal);
  return signal;
}

function addNoiseLayer() {
  if (document.querySelector('.lesson6-noise')) return;
  const noise = document.createElement('div');
  noise.className = 'lesson6-noise';
  noise.setAttribute('aria-hidden', 'true');
  document.body.append(noise);
}

function boot() {
  if (!isLessonSix() || document.documentElement.dataset.lesson6BossTransition === '1') return;
  document.documentElement.dataset.lesson6BossTransition = '1';
  document.body.classList.add('lesson6-boss-transition');
  addStyles();
  addNoiseLayer();

  const takeover = document.getElementById('takeover');
  const bossDoor = document.getElementById('bossDoor');
  const bossLock = document.getElementById('bossLock');
  if (!takeover || !bossDoor || !bossLock) return;

  rewriteCopy(takeover, bossDoor, bossLock);
  installDoorArt(bossDoor);

  const signal = createSignal();
  const continueButton = signal.querySelector('button');
  let shown = false;
  let lastFocus = null;

  function showSignal() {
    if (shown) return;
    shown = true;
    lastFocus = document.activeElement;
    signal.hidden = false;
    document.body.classList.add('lesson6-signal-open');
    window.setTimeout(() => continueButton.focus(), 80);
  }

  function revealTarget() {
    signal.hidden = true;
    document.body.classList.remove('lesson6-signal-open');
    document.body.classList.add('lesson6-afterglitch');

    const scrollToTarget = () => {
      const target = !bossDoor.hidden ? bossDoor : (!bossLock.hidden ? bossLock : null);
      if (!target) {
        window.setTimeout(scrollToTarget, 120);
        return;
      }
      target.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
      try { window.MC_ACT?.('lesson6-boss-sign-read'); } catch { /* analytics optional */ }
    };
    scrollToTarget();
  }

  continueButton.addEventListener('click', revealTarget);
  signal.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    continueButton.focus();
  });

  const observer = new MutationObserver(() => {
    if (!takeover.hidden) showSignal();
  });
  observer.observe(takeover, { attributes: true, attributeFilter: ['hidden'] });

  // กรณีโมดูลโหลดช้ากว่าจังหวะที่ takeover ถูกเปิดไปแล้ว
  if (!takeover.hidden) showSignal();

  window.addEventListener('pagehide', () => {
    if (!signal.hidden && lastFocus?.focus) lastFocus.focus();
  }, { once: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
