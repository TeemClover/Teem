/* X-VISOR launch home: scroll chapters (--p 0..1 on each [data-chap]), the horizontal skills track, the scroll-scrubbed clip
   machine, the sticky copy dock, the tap-to-answer demo chat and the value calculator. Copy buttons live in site.js.
   No tracking, no storage, nothing sent anywhere. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* ---------- scroll chapters ---------- */
  // The page ships with .no-motion (everything unpinned and readable); only a browser that runs this script and allows motion gets the scroll scenes.
  if (!reduce) document.documentElement.classList.remove('no-motion');
  const chaps = $$('[data-chap]');
  const bar = $('#progress');
  const dock = $('#dock');
  const topbar = $('.bar');
  const hero = $('.hero');
  const start = $('#start');
  const copies = $$('main [data-copy="start"]');
  let ticking = false;

  function measureTrack(chap) {
    const track = $('.track', chap);
    if (!track) return 0;
    return Math.max(0, track.scrollWidth - window.innerWidth);
  }
  const travel = new Map();
  function measure() { chaps.forEach(c => { if (c.hasAttribute('data-track')) travel.set(c, measureTrack(c)); }); }

  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const max = doc.scrollHeight - vh;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max) : 0})`;
    if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 24);
    if (reduce) return;
    for (const c of chaps) {
      const r = c.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const span = c.classList.contains('hero') ? r.height : r.height - vh;
      const p = span > 0 ? clamp(-r.top / span) : 0;
      c.style.setProperty('--p', p.toFixed(4));
      if (c.hasAttribute('data-track')) {
        const t = clamp((p - 0.08) / 0.84);
        c.style.setProperty('--tx', (t * (travel.get(c) || 0)).toFixed(1) + 'px');
      }
      if (c.hasAttribute('data-scrub')) {
        const play = clamp((p - 0.3) / 0.65);
        c.style.setProperty('--play', play.toFixed(4));
        const scr = $('.scr', c);
        if (scr) scr.dataset.scene = String(Math.min(3, Math.floor(play * 4)));
      }
    }
    if (dock && hero && start) {
      const inView = node => { const b = node.getBoundingClientRect(); return b.top < vh && b.bottom > 0; };
      const pastHero = hero.getBoundingClientRect().bottom < vh * 0.4;
      const show = pastHero && !inView(start) && !copies.some(inView);
      dock.classList.toggle('on', show);
      dock.hidden = false;
      dock.inert = !show;
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  measure(); frame();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); onScroll(); });
  window.addEventListener('load', () => { measure(); onScroll(); });
  if (reduce && dock) dock.hidden = true;

  /* ---------- mascot: cute pose swaps and speech bubble ---------- */
  const poses = $$('.bot-body .pose');
  const say = $('.bot-say span');
  if (poses.length && say) {
    const LINES = ['สวัสดีครับพี่!', 'ให้ผมช่วยคิดบทไหม', 'ตอบแค่ ก ข ค ง', 'ไปทำคลิปกัน!'];
    let i = 0;
    const tick = () => {
      i = (i + 1) % poses.length;
      poses.forEach((p, n) => p.classList.toggle('on', n === i));
      say.textContent = LINES[(i + Math.floor(Date.now() / 7200)) % LINES.length];
      const bubble = say.parentElement;
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    };
    if (!reduce) setInterval(() => { if (!document.hidden) tick(); }, 2400);
  }

  /* ---------- bouncy reveals ---------- */
  const pops = $$('[data-pop]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
    pops.forEach(n => io.observe(n));
  } else pops.forEach(n => n.classList.add('in'));

  /* ---------- sample reels: play only while visible, tap for sound ---------- */
  const reels = $$('.reel-phone');
  reels.forEach(phone => {
    const v = $('video', phone), badge = $('.reel-sound', phone);
    if (!v) return;
    phone.addEventListener('click', () => {
      const unmute = v.muted;
      reels.forEach(other => { const ov = $('video', other); if (ov && ov !== v) { ov.muted = true; const b = $('.reel-sound', other); if (b) b.textContent = 'แตะเพื่อฟังเสียง'; } });
      v.muted = !unmute ? true : false;
      if (unmute) { v.currentTime = 0; v.play().catch(() => {}); }
      if (badge) badge.textContent = v.muted ? 'แตะเพื่อฟังเสียง' : 'กำลังเล่นเสียง · แตะเพื่อปิด';
    });
  });
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver(es => es.forEach(e => {
      const v = $('video', e.target);
      if (!v) return;
      if (e.isIntersecting) { if (!reduce) v.play().catch(() => {}); } else v.pause();
    }), { threshold: 0.35 });
    reels.forEach(r => vio.observe(r));
  }

  /* ---------- demo chat ---------- */
  const log = $('#demoLog'), pick = $('#demoPick');
  if (log && pick) {
    const LETTERS = ['ก', 'ข', 'ค', 'ง'];
    const STEPS = [
      { q: 'สวัสดีครับพี่ วันนี้อยากทำอะไรดีครับ', options: ['ทำคลิปรีวิวสินค้า', 'วางแผนช่องของพี่', 'หาข้อมูลสินค้าไปตอบลูกค้า'] },
      { q: 'พี่มีอะไรอยู่ในมือถือแล้วบ้างครับ', options: ['คลิปที่พี่พูดรีวิว กับแคปหน้าจอแอป', 'มีแต่รูปสินค้า ไม่อยากออกกล้อง', 'ยังไม่มีอะไรเลย'] },
    ];
    const scrollLog = () => { log.scrollTop = log.scrollHeight; };
    const say = (text, who = 'ai') => {
      const b = el('div', who === 'ai' ? 'msg-ai' : 'msg-me');
      if (who === 'ai') b.append(el('span', 'who', 'คู่หู X-VISOR'));
      b.append(document.createTextNode(text));
      log.append(b); scrollLog(); return b;
    };
    const typing = () => { const b = el('div', 'msg-ai'); const t = el('span', 'typing'); t.append(el('i'), el('i'), el('i')); b.append(t); log.append(b); scrollLog(); return b; };
    const later = (fn, ms) => setTimeout(fn, reduce ? 0 : ms);
    function ask(i) {
      pick.replaceChildren();
      const dots = typing();
      later(() => {
        dots.remove();
        say(STEPS[i].q);
        STEPS[i].options.forEach((text, n) => {
          const b = el('button', n === 0 ? 'rec' : '');
          b.type = 'button';
          b.append(el('b', '', LETTERS[n]), document.createTextNode(text));
          if (n === 0) b.append(el('small', '', 'แนะนำ'));
          b.addEventListener('click', () => answer(i, LETTERS[n]));
          pick.append(b);
        });
        const own = el('button'); own.type = 'button';
        own.append(el('b', '', 'ง'), document.createTextNode('พิมพ์เอง'));
        own.addEventListener('click', () => typeOwn(i));
        pick.append(own);
      }, 700);
    }
    function typeOwn(i) {
      pick.replaceChildren();
      const f = el('form'); const input = el('input'); const go = el('button', '', 'ส่ง');
      input.placeholder = 'พิมพ์สั้น ๆ ก็พอ'; input.setAttribute('aria-label', 'คำตอบของพี่'); input.maxLength = 80;
      go.type = 'submit'; go.style.justifyContent = 'center';
      f.append(input, go); pick.append(f); input.focus();
      f.addEventListener('submit', e => { e.preventDefault(); const v = input.value.trim(); if (v) answer(i, v); });
    }
    function answer(i, shown) {
      say(shown, 'me');
      if (i + 1 < STEPS.length) ask(i + 1); else deliver();
    }
    function deliver() {
      pick.replaceChildren();
      const dots = typing();
      later(() => {
        dots.remove();
        const b = say('เสร็จแล้วครับ นี่คือชุดพร้อมถ่ายของพี่ (ตัวอย่าง)');
        const kit = el('div', 'kit');
        const row = (k, v, cls) => { const d = el('div'); d.append(el('span', 'k', k), el('span', cls || '', v)); kit.append(d); };
        row('ประโยคเปิด', '"ชั่งทุกเช้า พี่ดูอะไรในแอปบ้าง"');
        row('ช็อต 1', 'พี่พูดหน้ากล้อง 3 วินาที');
        row('ช็อต 2', 'แคปหน้าจอแอปของพี่ + ซับ');
        row('ปิดท้าย', 'ชวนคนดูเซฟไว้ หรือทักมาถาม');
        row('ตรวจคำ', 'ผ่าน ไม่มีคำรักษาหรือการันตีผล', 'pass');
        b.append(kit);
        later(() => {
          const go = el('button', 'rec'); go.type = 'button';
          go.append(el('b', '', '→'), document.createTextNode('ทำของจริงกับ Claude'));
          go.addEventListener('click', () => { if (start) start.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
          const again = el('button'); again.type = 'button';
          again.append(el('b', '', '↻'), document.createTextNode('ลองตอบใหม่'));
          again.addEventListener('click', begin);
          pick.replaceChildren(go, again);
        }, 500);
      }, 1100);
    }
    function begin() { log.replaceChildren(); ask(0); }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); begin(); } }, { threshold: 0.3 });
      io.observe(log);
    } else begin();
  }

  /* ---------- value calculator ---------- */
  const calc = $('.calc');
  if (calc) {
    const CLAUDE = 700;
    const fmt = n => '฿' + Math.round(n).toLocaleString('en-US');
    const state = {};
    $$('[data-calc]', calc).forEach(group => {
      const key = group.getAttribute('data-calc');
      const on = $('[aria-pressed="true"]', group) || $('button', group);
      state[key] = Number(on.dataset.v);
      $$('button', group).forEach(b => {
        if (!b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => {
          $$('button', group).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          state[key] = Number(b.dataset.v);
          paint();
        });
      });
    });
    const out = { hire: $('#outHire'), save: $('#outSave'), year: $('#outYear'), barHire: $('#barHire'), barMe: $('#barMe') };
    let shown = 0, raf = 0;
    function count(to) {
      cancelAnimationFrame(raf);
      if (reduce) { shown = to; out.save.textContent = fmt(to); return; }
      const from = shown, t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - p, 3);
        shown = from + (to - from) * e;
        out.save.textContent = fmt(shown);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      clearTimeout(count.t); count.t = setTimeout(() => { cancelAnimationFrame(raf); shown = to; out.save.textContent = fmt(to); }, 900);
    }
    function paint() {
      const hire = state.clips * state.mins * state.rate;
      const save = Math.max(0, hire - CLAUDE);
      out.hire.textContent = fmt(hire);
      const max = Math.max(hire, CLAUDE);
      out.barHire.style.width = (hire / max * 100).toFixed(1) + '%';
      out.barMe.style.width = Math.max(2, CLAUDE / max * 100).toFixed(1) + '%';
      count(save);
      out.year.textContent = save > 0 ? `ปีละประมาณ ${fmt(save * 12)}` : 'งานน้อยแบบนี้ จ้างหรือใช้คู่หูก็ใกล้กัน ลองเพิ่มจำนวนคลิปดู';
    }
    paint();
  }
})();
