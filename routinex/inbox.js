/* RoutineX · "เปิดกล่อง" — การ์ดสินค้าซ้อนขึ้นมาตามการเลื่อน
   แต่ละฉากได้ตัวแปร: --e เข้ามาแค่ไหน (0..1) · --p เลื่อนอยู่ในฉากแค่ไหน (0..1) · --x ถูกฉากถัดไปทับแค่ไหน (0..1) */
(() => {
  const wrap = document.getElementById('inbox');
  if (!wrap) return;
  const stages = [...wrap.querySelectorAll('.stage')];
  const rail = wrap.querySelector('.rail');
  const railBtns = rail ? [...rail.querySelectorAll('button')] : [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v) => { const k = clamp(v); return k * k * (3 - 2 * k); };
  const outCubic = (v) => 1 - Math.pow(1 - clamp(v), 3);

  const ENTER = 0.45;                      // ช่วงที่ฉากถัดไปเลื่อนขึ้นมาทับ
  const UNIT = 74;                         // 1 หน่วยของฉาก = กี่ vh ของการเลื่อน
  const OPEN_AT = 0.9;                     // กดกล่องแล้วพาไปถึงจุดนี้ของฉากกล่อง (ฝาเปิด ซองออกครบ)
  const len = stages.map((s) => parseFloat(s.dataset.len) || 1);
  const start = len.map((_, i) => len.slice(0, i).reduce((a, b) => a + b, 0));
  const total = len.reduce((a, b) => a + b, 0);
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let pinned = false, raf = 0, active = -1;

  function setPinned() {
    const want = !calm.matches && innerHeight >= 560 && CSS.supports('position', 'sticky');
    if (want === pinned) return;
    pinned = want;
    wrap.classList.toggle('pin', pinned);
    if (pinned) wrap.style.setProperty('--span', `${total * UNIT}vh`);
    else {
      wrap.style.removeProperty('--span');
      stages.forEach((s) => { s.removeAttribute('style'); s.classList.add('is-on'); });
      wrap.querySelectorAll('.all3 span').forEach((el) => el.classList.add('hit'));
    }
    countAll();
  }

  /* ตัวเลขนับขึ้น ครั้งแรกที่ฉากนั้นขึ้นมา */
  function count(stage) {
    if (stage._counted) return;
    stage._counted = true;
    stage.querySelectorAll('[data-count]').forEach((el) => {
      const to = +el.dataset.count, t0 = performance.now(), ms = 900;
      if (calm.matches) { el.textContent = String(to); return; }
      const step = (t) => {
        const k = outCubic((t - t0) / ms);
        el.textContent = String(Math.round(to * k));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  function countAll() { if (!pinned) stages.forEach(count); }

  function frame() {
    raf = 0;
    if (!pinned) return;
    const r = wrap.getBoundingClientRect();
    const span = r.height - innerHeight;
    if (span <= 0 || r.bottom < -innerHeight || r.top > innerHeight * 2) return;
    const P = clamp(-r.top / span) * total;
    const inView = r.top < innerHeight * 0.55;
    let now = 0;

    stages.forEach((s, i) => {
      const last = i === stages.length - 1;
      const e = i === 0 ? 1 : outCubic((P - (start[i] - ENTER)) / ENTER);
      const p = clamp((P - start[i]) / (last ? len[i] : len[i] - ENTER));
      const x = last ? 0 : clamp((P - (start[i + 1] - ENTER)) / ENTER);
      const st = s.style;
      st.setProperty('--e', e.toFixed(4));
      st.setProperty('--p', p.toFixed(4));
      st.setProperty('--x', x.toFixed(4));
      st.setProperty('--par', (e - 1 + p).toFixed(4));
      st.setProperty('--vis', e > 0 && x < 1 ? 'visible' : 'hidden');
      const on = inView && e > 0.55 && x < 0.6;
      if (on) { now = i; count(s); }
      s.classList.toggle('is-on', on);

      if (i === 0) {                         // กล่อง: ข้อความสลับ เปิดฝา แล้วซองลอยออกมา
        st.setProperty('--swap', smooth((p - 0.06) / 0.16).toFixed(4));
        st.setProperty('--open', smooth((p - 0.14) / 0.2).toFixed(4));
        st.setProperty('--fly', smooth((p - 0.36) / 0.46).toFixed(4));
        s.classList.toggle('is-swap', p > 0.16);
        const hint = s.querySelector('[data-box-hint]');
        const say = p > OPEN_AT - 0.1 ? 'กดอีกครั้ง ดูทีละชิ้น' : 'กดกล่องเพื่อเปิด';
        if (hint && hint.textContent !== say) hint.textContent = say;
        s.classList.toggle('is-on', inView ? x < 0.6 : true);   // ส่วนหัว: เปิดไว้ตั้งแต่โหลดหน้า
      }
      if (last) {                            // ฉากปิด: สามคำขึ้นทีละคำ แล้วซองมารวมกัน
        const words = s.querySelectorAll('.all3 span');
        [0.04, 0.24, 0.44].forEach((at, k) => words[k] && words[k].classList.toggle('hit', on && p >= at));
        st.setProperty('--join', smooth((p - 0.3) / 0.45).toFixed(4));
      }
    });

    if (now !== active) {
      active = now;
      if (rail) rail.dataset.off = String(now === 0 || now === stages.length - 1);
      railBtns.forEach((b) => b.setAttribute('aria-current', String(+b.dataset.go === now)));
    }
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(frame); };

  function goTo(i) {
    const r = wrap.getBoundingClientRect(), span = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + ((start[i] + 0.04) / total) * span, behavior: 'smooth' });
  }
  railBtns.forEach((b) => b.addEventListener('click', () => goTo(+b.dataset.go)));

  /* กดกล่อง: เลื่อนให้เองช้า ๆ จนฝาเปิดและซองลอยออกมา · กดอีกครั้ง: ไปการ์ด A
     ผู้ใช้เลื่อนเองหรือแตะจอระหว่างนั้น = หยุดทันที ให้เขาคุมต่อ */
  let glide = 0;
  function glideTo(top, ms) {
    cancelAnimationFrame(glide);
    const from = scrollY, t0 = performance.now();
    const stop = () => {
      cancelAnimationFrame(glide); glide = 0;
      ['wheel', 'touchstart', 'keydown'].forEach((ev) => removeEventListener(ev, stop));
    };
    ['wheel', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, stop, { passive: true }));
    const step = (t) => {
      const k = clamp((t - t0) / ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      scrollTo({ top: from + (top - from) * e, behavior: 'instant' });
      if (k < 1) glide = requestAnimationFrame(step); else stop();
    };
    glide = requestAnimationFrame(step);
  }
  document.querySelectorAll('[data-box-open]').forEach((b) => b.addEventListener('click', () => {
    if (!pinned) { document.getElementById('abcd')?.scrollIntoView({ behavior: 'smooth' }); return; }
    const r = wrap.getBoundingClientRect(), span = r.height - innerHeight, base = scrollY + r.top;
    const rest = len[0] - ENTER;
    const p = clamp(((-r.top / span) * total) / rest);
    if (p < OPEN_AT - 0.1) glideTo(base + ((OPEN_AT * rest) / total) * span, 1800);
    else glideTo(base + ((start[1] + 0.04) / total) * span, 1000);
  }));
  document.querySelectorAll('[data-inbox-go]').forEach((a) => a.addEventListener('click', (e) => {
    if (!pinned) return;                     // ไม่ปักหมุด: ปล่อยให้ลิงก์ #inbox ทำงานปกติ
    e.preventDefault();
    goTo(+a.dataset.inboxGo);
  }));

  setPinned();
  frame();
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { setPinned(); request(); });
  calm.addEventListener?.('change', () => { setPinned(); request(); });
})();
