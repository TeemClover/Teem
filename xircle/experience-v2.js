/* Root-only, fictional demonstration. No telemetry, health input, or backend calls. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const demo = $('#demo');
  const resumeKey = 'xircle.demo.v2.resume';
  const mealImage = '/xircle/assets/lifestyle/eat-640.webp';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Prepared story variants. These are neither measured values nor recommended targets.
  const nights = {
    short: { label: 'นอนน้อย', value: '5 ชม. 40', short: '5:40', detail: 'ชม. · ตัวอย่าง' },
    middle: { label: 'พอใช้', value: '6 ชม. 40', short: '6:40', detail: 'ชม. · ตัวอย่าง' },
    full: { label: 'เต็มที่', value: '7 ชม. 45', short: '7:45', detail: 'ชม. · ตัวอย่าง' },
  };
  const movement = {
    little: { label: 'นั่งเยอะ', steps: '2,450', bars: [8,12,20,40,12,9,6,8,31,19,8,5] },
    some: { label: 'มีเดินบ้าง', steps: '6,100', bars: [10,20,57,38,20,45,23,16,72,54,29,12] },
    active: { label: 'ตั้งใจขยับ', steps: '8,420', bars: [16,28,85,100,44,39,27,23,75,58,34,18] },
  };
  const contexts = {
    work: { label: 'งานเลิกช้า', teem: 'ลองเทียบคืนที่เลิกงานช้า กับคืนที่ไม่ดึก', ako: 'ถ้าเลิกงานเร็วขึ้นยังไม่ได้ เริ่มจากช่วงพักที่พอจัดได้', action: 'กัน 10 นาทีหลังเลิกงานไว้พัก', review: 'อีก 3 วัน ดูข้อมูลคู่กับโน้ตเรื่องงาน แล้วคุยกันว่าทำได้จริงไหม' },
    family: { label: 'ต้องดูแลคนที่บ้าน', teem: 'ทำเครื่องหมายคืนที่ต้องดูแลคนที่บ้านไว้', ako: 'หาช่วงพักที่เป็นไปได้ โดยไม่เพิ่มภาระอีกเรื่อง', action: 'เลือกช่วงพักที่พอจัดได้หนึ่งช่วง', review: 'อีก 3 วัน ดูทั้งการนอนและช่วงที่พักได้จริง แล้วค่อยปรับให้เข้ากับบ้าน' },
    unknown: { label: 'ยังไม่รู้', teem: 'เห็นว่าเวลาเปลี่ยน แต่ยังไม่รู้ว่าเกี่ยวกับอะไร', ako: 'ยังไม่ต้องรีบแก้ ลองเก็บเรื่องก่อนนอนเพิ่มอีกนิด', action: 'จดว่าก่อนนอนทำอะไรอยู่ 3 คืน', review: 'เอาโน้ตมาดูคู่กับเวลานอน แล้วค่อยเลือกสิ่งที่จะลอง' },
  };
  const beats = [
    { id: 'sleep', label: 'จากความจำ สู่บันทึก', title: 'เมื่อวานคุณ<br>ดูแลตัวเองยังไง?', copy: 'เรามักจำได้คร่าว ๆ<br>ลองดูว่าถ้ามีข้อมูลเพิ่ม ภาพจะต่างแค่ไหน' },
    { id: 'food', label: 'เก็บเรื่องที่ตัวเลขเล่าไม่หมด', title: 'มื้อนี้<br>เก็บไว้กลับมาดู', copy: 'ภาพหนึ่งมื้อ เติมเรื่องที่ความจำอาจตกหล่น' },
    { id: 'move', label: 'อีกชิ้นของวัน', title: 'การขยับ<br>ก็มีจังหวะของมัน', copy: 'เห็นทั้งจำนวนก้าว และช่วงที่ได้ขยับ' },
    { id: 'overview', label: 'ภาพรวมวันตัวอย่าง', title: 'พอเก็บไว้<br>เมื่อวานก็ชัดขึ้น', copy: 'การนอน การขยับ และมื้อที่บันทึก<br>อยู่ในภาพเดียว' },
    { id: 'context', label: 'จากแนวโน้ม สู่ชีวิตจริง', title: 'เห็นสิ่งที่เปลี่ยน<br>แล้วชีวิตช่วงนั้นล่ะ?', copy: 'ข้อมูลเดิม เติมบริบท แล้วดูต่อด้วยกัน' },
    { id: 'result', label: 'หนึ่งก้าวที่เข้ากับชีวิต', title: 'ข้อมูลเดียวกัน<br>ก้าวต่อไปอาจต่างกัน', copy: 'ทีมช่วยดูแนวโน้ม เอโกะช่วยต่อกับชีวิตจริง' },
  ];
  const state = { step: 0, sleep: null, food: false, move: null, context: null, editing: null };
  let lastDestination = null;

  function remember(destination) {
    lastDestination = destination;
    try { sessionStorage.setItem(resumeKey, JSON.stringify({ stage: 'start', destination })); } catch { /* ordinary links still work */ }
    // Same-tab and bfcache returns have a stable, non-sensitive continuation URL.
    try { history.replaceState(null, '', `${location.pathname}${location.search}#start`); } catch { /* sandboxed browsers */ }
  }
  function readContinuation() {
    try {
      const value = JSON.parse(sessionStorage.getItem(resumeKey));
      return value?.stage === 'start' && ['register', 'ios', 'android', 'book'].includes(value.destination) ? value.destination : null;
    } catch { return null; }
  }
  function loadMeal() {
    $$('[data-meal-image]').forEach(img => { if (!img.hasAttribute('src')) img.src = mealImage; });
  }
  function loadPeople() {
    $$('[data-portrait]').forEach(img => { if (!img.hasAttribute('src')) img.src = img.dataset.portrait; });
  }
  function announce(message) { $('#demo-status').textContent = message; }

  function renderRecord() {
    const night = nights[state.sleep];
    const move = movement[state.move];
    const multiDay = state.step >= 4;
    const complete = Boolean(night && state.food && move);
    const count = Number(Boolean(night)) + Number(state.food) + Number(Boolean(move));
    $('#record-title').textContent = multiDay ? 'วันเดิม ในภาพหลายวัน' : complete ? 'ภาพรวมวันตัวอย่าง' : 'วันตัวอย่าง';
    $('#record-count').textContent = multiDay ? '7 คืน · ตัวอย่าง' : `${count} / 3 บันทึก`;
    $('#day-visual').hidden = multiDay;
    $('#history').hidden = !multiDay;
    $('#camera').hidden = state.step !== 1;
    $('#day-center').hidden = state.step === 1;
    $('#center-eyebrow').textContent = complete ? 'ภาพรวมวันตัวอย่าง' : night ? 'บันทึกการนอน' : 'เมื่อวาน';
    $('#center-value').textContent = complete ? 'เมื่อวาน' : night ? night.short : 'จำได้คร่าว ๆ';
    $('#center-note').textContent = complete ? 'เห็นทั้งวัน ในภาพเดียว' : night ? 'ชม. · ตัวอย่าง' : 'ลองเติมบันทึกแรก';
    for (const [key, filled] of [['sleep', Boolean(night)], ['food', state.food], ['move', Boolean(move)]]) {
      $(`#ring-${key}`).classList.toggle('is-filled', filled);
      $(`#piece-${key}`).classList.toggle('is-filled', filled);
    }
    $('#sleep-value').textContent = night ? night.short : '—';
    $('#sleep-note').textContent = night ? night.detail : 'ยังไม่มีบันทึก';
    $('#piece-sleep').disabled = !night;
    $('#piece-sleep').setAttribute('aria-label', night ? `แก้ไขคืนตัวอย่าง ${night.label} ${night.value} นาที` : 'แก้ไขคืนตัวอย่าง');
    $('#food-value').textContent = state.food ? '12:30' : '—';
    $('#food-note').textContent = state.food ? 'ภาพมื้อตัวอย่าง' : 'ยังไม่มีภาพ';
    $('#meal-thumb').hidden = !state.food;
    $('#move-value').textContent = move ? move.steps : '—';
    $('#move-note').textContent = move ? 'ก้าว · ตัวอย่าง' : 'ยังไม่มีบันทึก';
    $('#piece-move').disabled = !move;
    $('#piece-move').setAttribute('aria-label', move ? `แก้ไขการขยับตัวอย่าง ${move.label} ${move.steps} ก้าว` : 'แก้ไขการขยับตัวอย่าง');
    $('#movement-strip').hidden = !move || multiDay;
    if (move) {
      $('#movement-bars').replaceChildren(...move.bars.map(height => {
        const bar = document.createElement('i'); bar.style.setProperty('--bar', `${height}%`); return bar;
      }));
      $('#movement-bars').setAttribute('aria-label', `${move.label}: การกระจายการขยับระหว่างวันตัวอย่าง`);
    }
    let feedback = 'คำอธิบายคร่าว ๆ ยังมีช่องว่าง';
    if (night) feedback = `เห็นเวลานอน มากกว่าคำว่า “${night.label}”`;
    if (state.food) feedback = 'เก็บภาพมื้อ 12:30 ไว้แล้ว';
    if (complete) feedback = 'สามบันทึก ประกอบเป็นวันเดียวกัน';
    if (multiDay) feedback = `คืนที่ 7 คือวันเดิม · นอน ${night?.short || '—'} ชม.`;
    $('#record-feedback').textContent = feedback;
    $('#record-footnote').textContent = multiDay ? 'เวลาเริ่มนอน · ข้อมูลตัวอย่างชุดเดิม' : complete ? 'วงแสดงบันทึกที่เก็บครบ ไม่ใช่คะแนนสุขภาพ' : 'บันทึกจากอุปกรณ์ · จำลองเพื่อเล่าเรื่อง';
    const context = contexts[state.context];
    $('#context-note').textContent = context ? `คืน 5–7 · ${context.label}` : 'เติมบริบทให้ 3 คืนที่ต่างไป';
    $('#context-note').classList.toggle('has-context', Boolean(context));
  }

  function render({ focus = false } = {}) {
    const beat = beats[state.step];
    demo.dataset.step = beat.id;
    $('#step-number').textContent = `0${state.step + 1} / 06`;
    $('#step-label').textContent = state.editing !== null ? 'แก้ไขวันตัวอย่าง' : beat.label;
    $('#prompt-title').innerHTML = beat.title;
    $('#prompt-copy').innerHTML = beat.copy;
    $$('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== (state.step === 5 ? 'context' : beat.id); });
    $$('[data-sleep]').forEach(button => button.setAttribute('aria-pressed', String(state.sleep === button.dataset.sleep)));
    $$('[data-move]').forEach(button => button.setAttribute('aria-pressed', String(state.move === button.dataset.move)));
    $$('[data-context]').forEach(button => button.setAttribute('aria-pressed', String(state.context === button.dataset.context)));
    $('#back').hidden = state.step === 0 && state.editing === null;
    $('#restart').hidden = state.step < 3 && state.editing === null;
    if (state.step === 1) loadMeal();
    if (state.step >= 4) loadPeople();
    renderRecord();
    const context = contexts[state.context];
    $('#teem-line').textContent = context ? context.teem : '3 คืนหลัง นอนช้ากว่าเดิม';
    $('#ako-line').textContent = context ? context.ako : 'ช่วงนั้นชีวิตต่างจากเดิมตรงไหน?';
    $('#human-result').hidden = !(state.step === 5 && context);
    $('#result-title').textContent = context?.action || '';
    $('#result-review').textContent = context?.review || '';
    $('#start').hidden = state.step !== 5;
    if (focus) {
      // Focus the new question without scrolling past the persistent record.
      $('#prompt-title').focus({ preventScroll: true });
      if ($('#prompt-title').getBoundingClientRect().bottom < 0) {
        demo.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }
  function advance(next, message) {
    state.step = state.editing !== null ? state.editing : next;
    state.editing = null;
    render({ focus: true });
    announce(message);
  }
  function edit(step) {
    if (state.editing === null) state.editing = state.step;
    state.step = step;
    render({ focus: true });
  }
  function restart() {
    Object.assign(state, { step: 0, sleep: null, food: false, move: null, context: null, editing: null });
    lastDestination = null;
    try { sessionStorage.removeItem(resumeKey); history.replaceState(null, '', `${location.pathname}${location.search}`); } catch { /* optional continuity only */ }
    demo.hidden = false;
    render({ focus: true });
    syncContinuation();
    demo.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    announce('เริ่มวันตัวอย่างใหม่');
  }

  $$('[data-sleep]').forEach(button => button.addEventListener('click', event => {
    if (state.step !== 0 || event.detail > 1) return;
    state.sleep = button.dataset.sleep;
    advance(1, `เก็บการนอนตัวอย่าง ${nights[state.sleep].value} นาทีแล้ว ต่อไปถ่ายมื้อตัวอย่าง`);
  }));
  $('#shutter').addEventListener('click', event => {
    if (state.step !== 1 || event.detail > 1) return;
    state.food = true;
    $('#day-record').classList.remove('just-captured');
    advance(state.move ? 3 : 2, 'เก็บภาพมื้อตัวอย่าง เวลา 12:30 แล้ว ต่อไปเลือกการขยับ');
    $('#day-record').classList.add('just-captured');
  });
  $$('[data-move]').forEach(button => button.addEventListener('click', event => {
    if (state.step !== 2 || event.detail > 1) return;
    state.move = button.dataset.move;
    advance(3, `เก็บการขยับตัวอย่าง ${movement[state.move].steps} ก้าว ประกอบวันตัวอย่างครบแล้ว`);
  }));
  $('#expand-history').addEventListener('click', event => {
    if (state.step !== 3 || event.detail > 1) return;
    advance(4, 'ขยายเป็นเจ็ดคืน สามคืนหลังเริ่มนอนช้ากว่าสี่คืนแรก ลองเติมบริบท');
  });
  $$('[data-context]').forEach(button => button.addEventListener('click', event => {
    if (state.step < 4 || event.detail > 1) return;
    state.context = button.dataset.context;
    state.step = 5;
    render(); // Keep focus and the chosen context in place; the result is not time-dismissed.
    announce(`ข้อมูลเดิม บริบท ${contexts[state.context].label} ลอง ${contexts[state.context].action}`);
  }));
  $('#piece-sleep').addEventListener('click', () => edit(0));
  $('#piece-move').addEventListener('click', () => edit(2));
  $('#back').addEventListener('click', () => {
    state.step = state.editing !== null ? state.editing : Math.max(0, state.step - 1);
    state.editing = null;
    if (state.step === 4) state.context = null;
    render({ focus: true });
  });
  $('#restart').addEventListener('click', restart);
  $('#try-demo').addEventListener('click', event => { event.preventDefault(); restart(); });

  function syncContinuation() {
    const openedRegistration = lastDestination === 'register';
    $('#register-link').classList.toggle('is-opened', openedRegistration);
    $('#register-link').firstChild.textContent = openedRegistration ? 'กลับไปหน้าสมัคร ' : 'สมัคร XIRCLE ';
    $('#register-help').innerHTML = openedRegistration ? 'เปิดหน้าสมัครแล้ว · ยังไม่ทราบผลการสมัคร<br>สมัครเสร็จแล้ว โหลดแอปต่อได้เลย' : 'เปิดหน้าสมัครใหม่ · กด “สมัครสมาชิก XIRCLE”<br>แล้วกลับมาโหลดแอปที่นี่';
    $('#downloads').classList.toggle('is-next', openedRegistration);
    $('#download-label').textContent = openedRegistration ? 'ขั้นถัดไป · ดาวน์โหลดแอป' : 'จากนั้น ดาวน์โหลดแอป';
  }
  for (const [selector, destination] of [['#register-link', 'register'], ['#ios-link', 'ios'], ['#android-link', 'android'], ['#book-link', 'book']]) {
    $(selector).addEventListener('click', () => { remember(destination); syncContinuation(); });
  }
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) $('#android-link').classList.add('is-preferred');
  else if (/iPhone|iPad|iPod/i.test(agent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) $('#ios-link').classList.add('is-preferred');

  // Preserve old invitation destinations without importing legacy state or redirecting the demo.
  const params = new URLSearchParams(location.search);
  const invite = params.get('xty') || params.get('invite') || (params.get('mode') === 'join' ? params.get('c') : '');
  if (/^\d{5}$/.test(invite || '')) {
    const link = $('#legacy-invite');
    link.href = `https://teambook.me/join/?c=${encodeURIComponent(invite)}`;
    link.hidden = false;
  }
  lastDestination = readContinuation();
  $('#try-demo').hidden = false;
  const continuing = location.hash === '#start';
  if (continuing) {
    // Restore the handoff, never synthesize a completed day or external success.
    demo.hidden = true;
    $('#start').hidden = false;
    syncContinuation();
  } else {
    demo.hidden = false;
    render();
  }
  window.addEventListener('pageshow', () => {
    lastDestination = readContinuation();
    syncContinuation();
  });
})();
