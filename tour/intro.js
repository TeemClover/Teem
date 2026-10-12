/**
 * บ้าน myClover — loading intro (classic script, runs before the 3D module arrives).
 * A four-leaf clover is the plot of land; the house goes up on it one storey per real loading
 * milestone (tour.js reports them through `window.__intro(stage)`), one leaf lights per stage, and
 * when the house is ready the clover-shaped opening widens onto it. The loader's own rule in
 * tour.css still fades it out if this file never runs.
 */
(() => {
  const loader = document.getElementById('loader'), core = loader?.querySelector('.intro-core'), msg = document.getElementById('loader-text');
  if (!core || !msg || !document.body.classList.contains('is-loading')) return;
  const LEAF = 'M50 50C40 44 30 36 30 26c0-7 5-12 11-12 4 0 7 2 9 6 2-4 5-6 9-6 6 0 11 5 11 12 0 10-10 18-20 24z';
  const leaf = (i, attrs = '') => `<path transform="rotate(${i * 90} 50 50)" d="${LEAF}"${attrs}/>`;
  const svg = (cls, body, box = '10 10 80 80') => `<svg class="${cls}" viewBox="${box}" aria-hidden="true">${body}</svg>`;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // what is being built at each stage; a stage that takes a while cycles through its lines
  const STEPS = [
    ['กำลังปรับหน้าดิน…', 'กำลังวางฐานราก…', 'กำลังขนไม้กับอิฐเข้ามา…', 'กำลังกางแบบบ้าน…'],
    ['กำลังยกผนังชั้นหนึ่ง…', 'กำลังติดหน้าต่างบานใหญ่…'],
    ['กำลังขึ้นชั้นสอง…', 'กำลังต่อบันไดไปห้องเรียน…'],
    ['กำลังมุงหลังคาสีส้ม…', 'กำลังซ่อนโคลเวอร์สี่ใบไว้ในบ้าน…', 'เอโกะกำลังต้มชารอคุณ…'],
    ['กำลังเปิดไฟในบ้าน…'],
  ];
  const TIPS = [
    'ในบ้านมีโคลเวอร์ซ่อนอยู่ 4 ใบ',
    'หาครบ 4 ใบ มีรางวัล',
    'ตราทอง แตะหยิบได้',
    'เลื่อนลงเพื่อเดินเข้าบ้าน',
    'ชั้นบนมีห้องเรียนกับห้องทำงาน',
    'แตะแผ่นเสียงเพื่อเปิดเพลง',
    'ใบที่สี่ของโคลเวอร์คือโชค',
  ];

  /* ----- the scene ----- */
  let sparks = '';
  for (let i = 0; i < 11; i++) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 26;
    sparks += `<i class="intro-spark${i % 3 ? '' : ' gold'}" style="left:${(50 + Math.cos(a) * r).toFixed(1)}%;top:${(54 + Math.sin(a) * r).toFixed(1)}%;animation-duration:${(3.2 + Math.random() * 3).toFixed(2)}s;animation-delay:-${(Math.random() * 6).toFixed(2)}s"></i>`;
  }
  core.insertAdjacentHTML('afterbegin', '<div class="intro-halo"></div>' + svg('intro-ring', '<circle cx="50" cy="50" r="48"/>', '0 0 100 100'));
  core.insertAdjacentHTML('beforeend',
    [0, 1, 2, 3].map(i => svg(`intro-leaf l${i + 1}`, leaf(i))).join('') + svg('intro-gold', [0, 1, 2, 3].map(i => leaf(i)).join(''))
    + svg('intro-orbit', '<circle cx="50" cy="50" r="48"/>', '0 0 100 100')
    + '<div class="intro-house"><svg class="h-plan" viewBox="0 0 150 104" aria-hidden="true"><path d="M40 64h104v37H40zM46 29h92v32H46zM62.3 9h59.4L145 30H39zM5 101V76h37"/></svg><i class="h-base"></i><i class="h-port"></i><i class="h-f1"></i><i class="h-lit1"></i><i class="h-eave"></i><i class="h-f2"></i><i class="h-lit2"></i><i class="h-roof"></i><i class="intro-scan"></i></div>'
    + sparks);
  const text = msg.closest('.intro-text');
  text.insertAdjacentHTML('beforeend', '<p class="intro-tip"><span></span></p><span class="intro-bar"><i></i></span>');
  const tip = text.querySelector('.intro-tip span'), bar = text.querySelector('.intro-bar i');

  // the backdrop becomes a sheet with a clover-shaped opening; the clover drawn on top fills it until the end
  loader.insertAdjacentHTML('afterbegin', '<svg class="intro-veil" aria-hidden="true"><defs><radialGradient id="intro-bg" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1d3d2c"/><stop offset=".7" stop-color="#0c1a13"/></radialGradient>'
    + `<mask id="intro-hole" maskUnits="userSpaceOnUse"><rect fill="#fff"/><g>${[0, 1, 2, 3].map(i => leaf(i, ' fill="#000"')).join('')}</g></mask></defs><rect fill="url(#intro-bg)" mask="url(#intro-hole)"/></svg>`);
  const veil = loader.firstElementChild, grad = veil.querySelector('radialGradient'), hole = veil.querySelector('mask g');
  let fitted = '';
  function fit() {
    const L = loader.getBoundingClientRect(), C = core.getBoundingClientRect();
    const w = L.width, h = L.height, cx = C.left - L.left + C.width / 2, cy = C.top - L.top + C.height / 2, unit = C.width / 80 * 0.985;
    // writing the same numbers again would repaint the whole sheet, on a large screen right as it starts to move
    const now = [w, h, cx, cy, unit].map(v => v.toFixed(1)).join();
    if (now === fitted) return;
    fitted = now;
    for (const r of veil.querySelectorAll('rect')) { r.setAttribute('width', w); r.setAttribute('height', h); }
    const mask = veil.querySelector('mask'); mask.setAttribute('width', w); mask.setAttribute('height', h); mask.setAttribute('x', 0); mask.setAttribute('y', 0);
    grad.setAttribute('cx', w / 2); grad.setAttribute('cy', h / 2); grad.setAttribute('r', Math.hypot(w, h) / 2);
    hole.setAttribute('transform', `translate(${cx} ${cy}) scale(${unit}) translate(-50 -50)`);
    veil.style.transformOrigin = `${cx}px ${cy}px`;
    // far enough that the leaves pass the farthest corner; the gaps between leaves fade with the sheet
    veil.style.setProperty('--k', (2.4 * Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) / (C.width * 0.45)).toFixed(2));
  }
  fit(); addEventListener('resize', fit);
  loader.classList.add('intro-on');

  /* ----- words ----- */
  const say = (el, s) => { if (el.textContent === s) return; el.textContent = s; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); };
  let stage = 0, line = 0, tipAt = Math.floor(Math.random() * TIPS.length), done = false;
  say(msg, STEPS[0][0]); say(tip, '🍀 ' + TIPS[tipAt]);
  const lines = setInterval(() => { const pool = STEPS[Math.min(stage, 4)]; line = (line + 1) % pool.length; say(msg, pool[line]); }, 1700);
  const tips = setInterval(() => { tipAt = (tipAt + 1) % TIPS.length; say(tip, '🍀 ' + TIPS[tipAt]); }, 4200);

  /* ----- progress: the engine's files arriving, then the stages tour.js reports ----- */
  const files = [...document.querySelectorAll('link[rel="modulepreload"]')].map(l => l.href);
  const arrived = new Set();
  let fetched = 0;
  const progress = () => { bar.style.transform = `scaleX(${[0.06 + 0.44 * fetched, 0.56, 0.72, 0.9, 1][stage].toFixed(3)})`; };
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (files.includes(e.name)) arrived.add(e.name);
      fetched = files.length ? arrived.size / files.length : 0; progress();
    }).observe({type: 'resource', buffered: true});
  } catch {}
  function setStage(n) {
    n = Math.min(4, n | 0);
    if (n <= stage || done) return;
    for (let i = stage + 1; i <= n; i++) loader.classList.add('s' + i);
    stage = n; line = 0; say(msg, STEPS[n][0]); progress();
  }
  window.__intro = setStage;
  progress();

  /* ----- arrival: lights on, then the clover opens onto the house ----- */
  function finish() {
    if (done) return;
    setStage(4); done = true;
    window.__introOpening = true; // tour.js holds the picture behind the opening until it is over
    clearInterval(lines); clearInterval(tips); watch.disconnect();
    loader.classList.add('lit'); say(msg, 'ถึงบ้านแล้ว ยินดีต้อนรับ');
    setTimeout(() => {
      fit(); loader.classList.add('out');
      setTimeout(() => { loader.classList.add('gone'); removeEventListener('resize', fit); window.__introOpening = false; }, calm ? 320 : 980);
    }, calm ? 0 : 320);
  }
  const watch = new MutationObserver(() => { if (!document.body.classList.contains('is-loading')) finish(); });
  watch.observe(document.body, {attributes: true, attributeFilter: ['class']});
})();
