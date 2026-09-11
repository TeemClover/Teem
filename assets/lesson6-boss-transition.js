/* AI ใส่ซอส · บท 6 — ทางเดินก่อนพบบอส
   - ข้อความ takeover อยู่จนผู้เล่นกดรับทราบเอง
   - ใช้ภาพประตูจริงชุดเดียวกับหน้ารวมบทเรียน
   - สัญญาณแทรกและประตูเคลื่อนไหวเป็นช่วงสั้น ๆ แล้วหยุด
   - ก่อนเข้าด่านบอสใช้สรรพนาม คุณ / มัน เท่านั้น
   - ทางเข้าด่านบอสหลักคือ /classroom/dungeon/
*/

function isLessonSix() {
  return /\/classroom\/first-web(?:\.html)?$/.test(location.pathname);
}

function addStyles() {
  if (document.getElementById('lesson6-boss-transition-style')) return;
  const style = document.createElement('style');
  style.id = 'lesson6-boss-transition-style';
  style.textContent = `
    body.lesson6-boss-transition #takeover{display:none!important}

    .lesson6-signal{
      position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:22px;
      background:#030805;color:#fff;overflow:auto;
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
      animation:lesson6SignalSweep .55s steps(2) 3
    }
    .lesson6-signal__portal{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .lesson6-signal__portal img{width:100%;height:100%;object-fit:cover;opacity:.27;transform:scale(1.03)}
    .lesson6-signal__portal::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,5,.8),rgba(3,8,5,.25) 45%,rgba(3,8,5,.94))}
    .lesson6-signal[data-phase="intercept"] .lesson6-signal__portal{opacity:0}
    .lesson6-signal[data-phase="portal"] .lesson6-signal__portal{animation:lesson6PortalReveal .7s ease-out both}
    .lesson6-signal[data-phase="ready"]::after{opacity:.22}
    .lesson6-signal__in{position:relative;z-index:2;width:min(620px,100%);text-align:center}
    .lesson6-signal__tag{display:block;color:#ff6673;font:850 11px/1.5 "Bai Jamjuree",system-ui,sans-serif;letter-spacing:.22em}
    .lesson6-signal h2{
      margin-top:12px;color:#fff;font:900 clamp(36px,9vw,70px)/1.05 "Bai Jamjuree",system-ui,sans-serif;
      text-shadow:3px 0 rgba(255,0,91,.72),-3px 0 rgba(0,198,231,.6);animation:lesson6TextGlitch .32s steps(2) 3
    }
    .lesson6-signal p{max-width:40ch;margin:18px auto 0;color:rgba(255,255,255,.78);font-size:clamp(16px,3.4vw,19px);line-height:1.85}
    .lesson6-signal button{
      margin-top:26px;min-height:52px;padding:13px 24px;border:1px solid rgba(190,148,66,.75);border-radius:13px;
      background:rgb(190 148 66);color:#071a10;font:850 14px/1.4 "Bai Jamjuree",system-ui,sans-serif;cursor:pointer;
      box-shadow:0 20px 44px rgba(190,148,66,.2)
    }
    .lesson6-signal button:hover{transform:translateY(-2px)}
    .lesson6-signal button:focus-visible{outline:3px solid #f4e4b4;outline-offset:5px}
    .lesson6-signal .lesson6-signal__back{display:block;margin:15px auto 0;padding:8px 15px;min-height:44px;background:rgba(3,8,5,.35);border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.82);box-shadow:none;font-weight:600}
    .lesson6-signal__status{display:block;min-height:1.6em;margin-top:17px;font:500 12px/1.6 system-ui,sans-serif;color:rgba(237,216,164,.8)}
    body.lesson6-signal-open{overflow-y:auto!important}

    body.lesson6-afterglitch .lesson6-noise{display:block}
    .lesson6-noise{
      display:none;position:fixed;inset:0;z-index:145;pointer-events:none;
      background:
        repeating-linear-gradient(0deg,transparent 0 7px,rgba(255,255,255,.018) 7px 8px),
        linear-gradient(90deg,transparent 0 37%,rgba(255,0,72,.022) 38%,transparent 39% 76%,rgba(0,198,231,.02) 77%,transparent 78%);
      mix-blend-mode:screen;opacity:0;animation:lesson6AfterSignal 2s steps(2) 1
    }

    body.lesson6-boss-transition .boss-door{
      isolation:isolate;position:relative;display:grid;align-items:end;min-height:clamp(430px,62vw,620px);
      overflow:hidden;margin-top:30px;border:1px solid rgba(190,148,66,.52);border-radius:24px;
      background:#020805;color:#fff;box-shadow:0 30px 80px rgba(0,0,0,.32)
    }
    body.lesson6-boss-transition .boss-door::before,
    body.lesson6-boss-transition .boss-door::after{display:none!important}
    .lesson6-boss-art{position:absolute;z-index:-2;inset:0;width:100%;height:100%;margin:0}
    .lesson6-boss-art img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}
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
    body.lesson6-afterglitch .boss-door{animation:lesson6DoorSignal 2s steps(2) 1}

    @keyframes lesson6PortalReveal{from{opacity:0;transform:scale(1.025)}to{opacity:1;transform:none}}
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
      body.lesson6-boss-transition .door-copy{padding:260px 18px 24px}
    }
    @media(prefers-reduced-motion:reduce){
      .lesson6-signal::after,.lesson6-signal h2,.lesson6-noise,.lesson6-signal__portal,
      body.lesson6-afterglitch .boss-door{animation:none!important}
      .lesson6-signal button:hover{transform:none}
      .lesson6-noise{display:none!important}
      .lesson6-signal h2{text-shadow:none}
      body.lesson6-boss-transition.glitching nav,body.lesson6-boss-transition.glitching main{animation:none!important}
    }
  `;
  document.head.append(style);
}

function installDoorArt(bossDoor) {
  if (!bossDoor || bossDoor.querySelector('.lesson6-boss-art')) return;
  const art = document.createElement('picture');
  art.className = 'lesson6-boss-art';
  art.innerHTML = `
    <source type="image/webp" media="(max-width:640px)" srcset="../img/awaken-hero-640.webp">
    <source type="image/webp" srcset="../img/awaken-hero-1024.webp">
    <img src="../img/awaken-hero.jpg" width="1600" height="900" loading="lazy" decoding="async" alt="ประตูห้องโถงมืดที่มีแสงเส้นเดียวลอดเข้ามา ก่อนเข้าสู่ด่านบอส">`;
  bossDoor.prepend(art);
  const shade = document.createElement('span');
  shade.className = 'lesson6-boss-shade';
  shade.setAttribute('aria-hidden', 'true');
  art.insertAdjacentElement('afterend', shade);
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
    bossLink.href = '/classroom/dungeon/';
    bossLink.textContent = 'เข้าสู่ด่านบอส →';
    bossLink.dataset.bossRoom = 'dungeon';
  }

  const lockCopy = bossLock?.querySelector('p');
  if (lockCopy) lockCopy.textContent = 'เก็บบทเรียนให้ครบ 3 จาก 6 บท แล้วกลับมาเปิดประตูนี้ได้ ไม่ต้องรอครบทั้งคอร์ส';
}

function createSignal() {
  const signal = document.createElement('div');
  signal.className = 'lesson6-signal';
  signal.id = 'lesson6Signal';
  signal.hidden = true;
  signal.setAttribute('role', 'dialog');
  signal.setAttribute('aria-modal', 'true');
  signal.setAttribute('aria-labelledby', 'lesson6SignalTitle');
  signal.setAttribute('aria-describedby', 'lesson6SignalCopy');
  signal.innerHTML = `
    <div class="lesson6-signal__portal" aria-hidden="true"><img src="../img/awaken-hero-640.webp" alt="" decoding="async"></div>
    <div class="lesson6-signal__in">
      <span class="lesson6-signal__tag">SIGNAL INTERRUPTED · SYSTEM OVERRIDE</span>
      <h2 id="lesson6SignalTitle">AI ยึดหน้าแล้ว</h2>
      <p id="lesson6SignalCopy">คุณคิดว่าหลักสูตรจบตรงเมนคอร์สแล้วหรือ?<br>มีบางสิ่งเปิดทางเข้ามาจากอีกฝั่ง</p>
      <span class="lesson6-signal__status" role="status" aria-live="polite">ตรวจพบทางผ่านที่ซ่อนอยู่</span>
      <button type="button" class="lesson6-signal__continue">เปิดประตูข้างหน้า →</button>
      <button type="button" class="lesson6-signal__back">กลับไปดูผลงานก่อน</button>
    </div>`;
  document.body.append(signal);
  return signal;
}

function playPortalSound() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const context = new AudioContext();
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(220, context.currentTime);
    tone.frequency.exponentialRampToValueAtTime(440, context.currentTime + .28);
    volume.gain.setValueAtTime(.001, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(.035, context.currentTime + .04);
    volume.gain.exponentialRampToValueAtTime(.001, context.currentTime + .32);
    tone.connect(volume); volume.connect(context.destination);
    tone.start(); tone.stop(context.currentTime + .34);
    tone.onended = () => { context.close().catch(() => {}); };
  } catch { /* Sound is optional; the door always remains usable. */ }
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
  document.body.classList.remove('lesson6-signal-open'); // lesson6-scroll-guard
  addStyles();
  addNoiseLayer();

  const takeover = document.getElementById('takeover');
  const bossDoor = document.getElementById('bossDoor');
  const bossLock = document.getElementById('bossLock');
  if (!takeover || !bossDoor || !bossLock) return;

  rewriteCopy(takeover, bossDoor, bossLock);
  installDoorArt(bossDoor);

  const signal = createSignal();
  const continueButton = signal.querySelector('.lesson6-signal__continue');
  const backButton = signal.querySelector('.lesson6-signal__back');
  const status = signal.querySelector('.lesson6-signal__status');
  let shown = false;
  let lastFocus = null;
  let phaseTimer = null;
  let readyTimer = null;
  let mutedRegions = [];

  function restorePage() {
    clearTimeout(phaseTimer); clearTimeout(readyTimer);
    signal.hidden = true;
    mutedRegions.forEach(item => { item.element.inert = item.inert; });
    mutedRegions = [];
    document.body.classList.remove('lesson6-signal-open');
  }

  function showSignal() {
    if (shown) return;
    shown = true;
    lastFocus = document.activeElement;
    signal.hidden = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const readyCopy = bossDoor.hidden
      ? 'พบประตูที่ซ่อนอยู่ · เก็บบทเรียนครบ 3 จาก 6 เพื่อเปิดทาง'
      : 'ทางผ่านเปิดแล้ว · คุณเป็นคนเลือกว่าจะเดินต่อเมื่อไร';
    continueButton.textContent = bossDoor.hidden ? 'ไปที่ประตูข้างหน้า →' : 'เปิดประตูข้างหน้า →';
    signal.dataset.phase = reduced ? 'ready' : 'intercept';
    mutedRegions = [...document.querySelectorAll('body > nav, body > main')].map(element => ({ element, inert: element.inert }));
    mutedRegions.forEach(item => { item.element.inert = true; });
    document.body.classList.remove('lesson6-signal-open');
    continueButton.focus({ preventScroll: true });
    if (reduced) status.textContent = readyCopy;
    else {
      phaseTimer = window.setTimeout(() => { signal.dataset.phase = 'portal'; }, 360);
      readyTimer = window.setTimeout(() => {
        signal.dataset.phase = 'ready';
        status.textContent = readyCopy;
      }, 1120);
    }
  }

  function revealTarget() {
    if (signal.hidden) return;
    playPortalSound();
    restorePage();
    document.body.classList.add('lesson6-afterglitch');
    const target = !bossDoor.hidden ? bossDoor : (!bossLock.hidden ? bossLock : null);
    if (target) {
      target.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
      target.querySelector('a')?.focus({ preventScroll: true });
      try { window.MC_ACT?.('lesson6-boss-sign-read'); } catch { /* analytics optional */ }
    }
  }

  function returnToWork() {
    restorePage();
    const completion = document.getElementById('cl-completion');
    if (completion && !completion.hasAttribute('tabindex')) completion.tabIndex = -1;
    const target = completion || document.getElementById('finishBtn') || lastFocus;
    target?.focus({ preventScroll: true });
    (completion || document.getElementById('courseEnd'))?.scrollIntoView({ behavior: 'auto', block: 'center' });
  }

  continueButton.addEventListener('click', revealTarget);
  backButton.addEventListener('click', returnToWork);
  signal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); returnToWork(); return; }
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === continueButton) {
      event.preventDefault(); backButton.focus();
    } else if (!event.shiftKey && document.activeElement === backButton) {
      event.preventDefault(); continueButton.focus();
    }
  });

  const observer = new MutationObserver(() => {
    if (!takeover.hidden) showSignal();
  });
  let watchingTakeover = false;
  function watchTakeover() {
    if (watchingTakeover || document.documentElement.dataset.classroomRender === 'loading') return;
    watchingTakeover = true;
    observer.observe(takeover, { attributes: true, attributeFilter: ['hidden'] });
    // Catch a restored position, or a signal raised earlier in the same ready event.
    if (!takeover.hidden) showSignal();
  }
  if (document.documentElement.dataset.classroomRender === 'loading') {
    document.addEventListener('classroom:ready', watchTakeover, { once: true });
  } else watchTakeover();

  window.addEventListener('pagehide', () => {
    if (!signal.hidden) {
      restorePage();
      if (lastFocus?.focus) lastFocus.focus({ preventScroll: true });
    }
  }, { once: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
