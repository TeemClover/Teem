/* AI ใส่ซอส · คำเชิญเข้าด่านบอสเมื่อเรียนถึงครึ่งทาง
   ────────────────────────────────────────────────
   ปัญหาเดิม: ห้องบอสคือห้องที่ดีที่สุด แต่ถูกเก็บไว้ท้ายสุด
   คนจำนวนมากจึงเลิกก่อนจะได้เห็น

   สคริปต์นี้จึงเคาะประตูบอกเองเมื่อเรียนครบ 3 บท แล้วให้เลือกเองว่า
   จะเข้าเลยหรือเรียนต่อ ไม่บังคับ ไม่ปิดทาง และขึ้นครั้งเดียวตลอดกาล

   ใช้ localStorage ชุดเดียวกับ quest.js (mc_learn) จึงไม่ต้องนับซ้ำ
   และทำงานได้แม้ quest.js ยังโหลดไม่เสร็จ */
(function () {
  'use strict';

  var NEED = 3;
  var SEEN = 'mc_boss_invite';
  var KEY = 'mc_learn';
  var DUNGEON = '/classroom/dungeon/';
  var ITEMS = ['free-ai', 'image-ai', 'clip-ai', 'notebooklm', 'prompts', 'first-web'];
  var TITLES = {
    'free-ai': 'บทที่ 1 · Source',
    'image-ai': 'บทที่ 2 · Taste',
    'clip-ai': 'บทที่ 3 · Cook',
    'notebooklm': 'บทที่ 4 · Split',
    'prompts': 'บทที่ 5 · Season',
    'first-web': 'บทที่ 6 · Serve'
  };

  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function learned() {
    return ls(KEY).split(',').filter(function (x) { return ITEMS.indexOf(x) >= 0; });
  }
  function nextLesson(done) {
    for (var i = 0; i < ITEMS.length; i++) if (done.indexOf(ITEMS[i]) < 0) return ITEMS[i];
    return null;
  }

  function style() {
    if (document.getElementById('mc-boss-invite-style')) return;
    var s = document.createElement('style');
    s.id = 'mc-boss-invite-style';
    s.textContent = [
      '.mc-bi[hidden]{display:none!important}',
      '.mc-bi{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:20px;background:rgba(3,10,6,.72);backdrop-filter:blur(3px)}',
      '.mc-bi__card{position:relative;width:min(460px,100%);max-height:calc(100vh - 40px);overflow:auto;border:1px solid rgba(199,155,69,.42);border-radius:22px;background:linear-gradient(150deg,#0a2818,#12482d);color:#fff;box-shadow:0 30px 80px rgba(0,0,0,.5);padding:26px 24px 22px;text-align:center;animation:mcBiIn .26s ease}',
      '@keyframes mcBiIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion: reduce){.mc-bi__card{animation:none}}',
      '.mc-bi__tag{display:inline-block;padding:5px 12px;border:1px solid rgba(244,211,127,.5);border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.08em;color:#f4d37f}',
      '.mc-bi__card h2{margin-top:13px;font-family:"Bai Jamjuree",sans-serif;font-size:23px;line-height:1.35}',
      '.mc-bi__card p{margin-top:10px;font-size:14.6px;line-height:1.75;color:rgba(255,255,255,.86)}',
      '.mc-bi__why{margin-top:12px;padding:11px 13px;border-left:3px solid rgba(244,211,127,.55);border-radius:0 10px 10px 0;background:rgba(255,255,255,.07);font-size:13.6px;line-height:1.7;text-align:left;color:rgba(255,255,255,.82)}',
      '.mc-bi__acts{margin-top:18px;display:grid;gap:9px}',
      '.mc-bi__go{display:block;padding:13px 18px;border-radius:13px;background:#f4d37f;color:#0a2818;font-family:"Bai Jamjuree",sans-serif;font-weight:800;font-size:15.5px;text-decoration:none}',
      '.mc-bi__go:hover{filter:brightness(1.06)}',
      '.mc-bi__next{display:block;padding:12px 18px;border-radius:13px;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff;font-family:"Bai Jamjuree",sans-serif;font-weight:700;font-size:14.6px;text-decoration:none}',
      '.mc-bi__next:hover{background:rgba(255,255,255,.09)}',
      '.mc-bi__later{margin-top:4px;background:none;border:0;color:rgba(255,255,255,.62);font-size:13.4px;cursor:pointer;padding:8px;font-family:inherit}',
      '.mc-bi__later:hover{color:#fff}',
      '.mc-bi__x{position:absolute;top:10px;right:12px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:18px;line-height:1;cursor:pointer}',
      '.mc-bi__x:hover{background:rgba(255,255,255,.2)}',
      '.mc-bi :focus-visible{outline:2px solid #f4d37f;outline-offset:2px}',
      '@media(max-width:480px){.mc-bi__card{padding:24px 18px 18px}.mc-bi__card h2{font-size:20.5px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var shown = false;

  function show(done) {
    if (shown) return;
    shown = true;
    save(SEEN, '1');
    style();

    var nx = nextLesson(done);
    var opener = document.activeElement;

    var wrap = document.createElement('div');
    wrap.className = 'mc-bi';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'mcBiTitle');

    var nextHTML = nx
      ? '<a class="mc-bi__next" href="/classroom/' + nx + '.html">อ่าน ' + TITLES[nx] + ' ก่อน</a>'
      : '';

    wrap.innerHTML =
      '<div class="mc-bi__card">' +
        '<button class="mc-bi__x" type="button" aria-label="ปิด">×</button>' +
        '<span class="mc-bi__tag">BOSS STAGE · UNLOCKED</span>' +
        '<h2 id="mcBiTitle">เรียนจบ ' + done.length + '/' + ITEMS.length + ' บทแล้ว</h2>' +
        '<p>ประตูด่านบอสเปิดให้คุณแล้ว จะเข้าเลยตอนนี้ หรือเก็บบทต่อไปก่อนก็ได้ ประตูจะไม่ปิดอีก</p>' +
        '<div class="mc-bi__why">ห้องบอสคือห้องที่สนุกที่สุดของคอร์สนี้ เราเลยไม่อยากเก็บไว้ท้ายสุดจนหลายคนไปไม่ถึง เข้าไปเล่นก่อนได้เลย แล้วค่อยกลับมาเรียนต่อ</div>' +
        '<div class="mc-bi__acts">' +
          '<a class="mc-bi__go" href="' + DUNGEON + '">🚪 เข้าด่านบอสเลย</a>' +
          nextHTML +
          '<button class="mc-bi__later" type="button">ไว้ทีหลัง</button>' +
        '</div>' +
      '</div>';

    function close() {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus) { try { opener.focus(); } catch (e) {} }
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    }

    wrap.querySelector('.mc-bi__x').addEventListener('click', close);
    wrap.querySelector('.mc-bi__later').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(wrap);
    var first = wrap.querySelector('.mc-bi__go');
    if (first) { try { first.focus(); } catch (e) {} }

    try { window.MC_ACT && window.MC_ACT('boss-invite-shown'); } catch (e) {}
  }

  /* บท 6 มีทางจบของตัวเองอยู่แล้ว — ประตูบอสโผล่ตอนเลื่อนลงมาถึงท้ายบท
     จึงไม่ต้องเด้งซ้ำ แต่ยังปั๊มว่าเห็นแล้ว กันไม่ให้ไปเด้งย้อนหลังหน้าอื่น */
  function isLessonSix() {
    return /\/classroom\/first-web(?:\.html)?$/.test(location.pathname);
  }

  function check() {
    if (shown) return true;
    if (ls(SEEN) === '1') return true;
    var done = learned();
    if (done.length < NEED) return false;
    if (isLessonSix()) { save(SEEN, '1'); shown = true; return true; }
    show(done);
    return true;
  }

  function boot() {
    if (check()) return;
    /* quest.js ทำเครื่องหมายตอนเลื่อนอ่านถึงท้ายบท ซึ่งเกิดหลังโหลดหน้า
       จึงต้องคอยดูต่อ ไม่ใช่เช็กครั้งเดียวตอนเปิดหน้า */
    var timer = setInterval(function () { if (check()) clearInterval(timer); }, 700);
    window.addEventListener('pageshow', check);
    window.addEventListener('storage', check);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
