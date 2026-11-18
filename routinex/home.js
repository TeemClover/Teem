/* RoutineX · หน้าแรก: การ์ดพลิก, กลีบ ABCD, จุดแวะ 28 วัน */
(() => {
  const d = document;
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];

  /* การ์ดพลิก */
  $$('.flip').forEach((f) => f.addEventListener('click', () => {
    f.setAttribute('aria-pressed', String(f.getAttribute('aria-pressed') !== 'true'));
  }));

  /* แท็บแบบลูกศรซ้ายขวา ใช้ร่วมกันสองชุด */
  function tabs(list, onPick) {
    const pick = (i, focus) => {
      list.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      if (focus) list[i].focus();
      onPick(i);
    };
    list.forEach((t, i) => {
      t.addEventListener('click', () => pick(i));
      t.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        pick((i + step + list.length) % list.length, true);
      });
    });
    return pick;
  }

  /* ABCD */
  const petals = $$('.petal');
  if (petals.length) {
    tabs(petals, (i) => {
      petals.forEach((p, k) => {
        const panel = d.getElementById(p.getAttribute('aria-controls'));
        if (panel) panel.hidden = k !== i;
      });
    });
  }

  /* 28 วัน */
  const STOPS = [
    { k: 'DAY 0 · เริ่ม', h: 'เปิดกล่อง ตั้งเป้า รู้จัก ABCD', p: 'โค้ชซิงพาเปิดกล่องทีละชั้น คุณจดค่าเริ่มต้นของตัวเอง เขียนเป้าหนึ่งข้อ แล้วบอก X-VISOR ว่าเริ่มแล้ว', c: 'มีคลิปโค้ชซิง 3:23' },
    { k: 'DAY 3 · เช็ก', h: 'เริ่มได้สะดวกไหม', p: 'ยังไม่ดูผล ดูแค่ว่ารูทีนเข้ากับชีวิตจริงหรือยัง ถ้าหลุดบางวันก็แค่หาเวลาที่เหมาะกว่าเดิม', c: '' },
    { k: 'DAY 7 · ดู', h: 'ให้คะแนนตัวเอง กิน ขยับ นอน', p: 'ถามตัวเองว่า 7 วันนี้ทำอะไรได้ดี แล้วเลือกแก้ก่อนแค่หนึ่งเรื่อง บอกโค้ชของคุณ', c: 'มีคลิปโค้ชซิง 0:56' },
    { k: 'DAY 14 · ปรับ', h: 'ตั้งเป้าเพิ่มหนึ่งข้อ', p: 'อะไรที่ทำได้ดีทำต่อ อะไรที่ยังไม่พอค่อยเพิ่มทีละเรื่อง เช่น โปรตีนต่อมื้อ จำนวนก้าว หรือชั่วโมงนอน', c: 'มีคลิปโค้ชซิง 0:49' },
    { k: 'DAY 21 · รักษา', h: 'รักษาจังหวะ ไม่เพิ่มความยาก', p: 'สัปดาห์นี้ไม่ต้องหาอะไรใหม่ ทำของเดิมให้ครบ และบอก X-VISOR ถ้ามีข้อไหนเริ่มหลุด', c: '' },
    { k: 'DAY 28 · ทบทวน', h: 'ได้เรียนรู้อะไร แล้วไปต่ออย่างไร', p: 'หาเรื่องที่คุณประทับใจจากรอบแรก เก็บสิ่งที่ได้ผลไว้ แล้วเขียนเป้าของ 28 วันถัดไปกับคนที่ดูแลคุณ', c: 'มีคลิปโค้ชซิง 1:10' },
  ];
  const steps = $$('.rstep');
  const panel = d.getElementById('rhythmPanel');
  const fill = d.querySelector('.rhythm__fill');
  if (steps.length && panel) {
    let touched = false, timer;
    const show = (i) => {
      const s = STOPS[i];
      steps.forEach((b, k) => b.classList.toggle('is-past', k < i));
      fill?.style.setProperty('--p', String(i / (steps.length - 1)));
      panel.querySelector('[data-r=k]').textContent = s.k;
      panel.querySelector('[data-r=h]').textContent = s.h;
      panel.querySelector('[data-r=p]').textContent = s.p;
      const c = panel.querySelector('[data-r=c]');
      c.textContent = s.c; c.hidden = !s.c;
      panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
    };
    const pick = tabs(steps, show);
    const stop = () => { touched = true; clearInterval(timer); };
    steps.forEach((b) => { b.addEventListener('pointerdown', stop); b.addEventListener('keydown', stop); });

    /* เดินเองหนึ่งรอบเมื่อเลื่อนมาถึง ให้เห็นว่ากดได้ */
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        let i = 0;
        timer = setInterval(() => {
          if (touched) return;
          i += 1;
          if (i >= steps.length) { clearInterval(timer); return; }
          pick(i);
        }, 1700);
      }, { threshold: 0.6 });
      io.observe(panel);
    }
  }
})();
