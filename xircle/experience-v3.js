import {entryContext, FOCUS_LABELS, notebookHref, XIRCLE_HOME} from './route-contract.js';
/* Fictional, in-memory experience. No health input, analytics or legacy-state writes. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  if (!stage) return;
  const scenes = ['sleep', 'food', 'move', 'day', 'pattern', 'human', 'real'];
  const sleepOptions = { short: '5:40', middle: '6:40', full: '7:45' };
  const moveOptions = { little: '2,450', some: '6,100', active: '8,420' };
  const movementPaths = {
    little: 'M0 100H45Q65 70 85 100H145Q165 80 185 100H260Q280 60 300 100H380Q405 85 430 100H480',
    some: 'M0 100Q35 100 60 90T110 60T160 100T215 55T255 90T305 35T350 70T395 45T480 90',
    active: 'M0 110Q30 105 55 75T105 100T155 35T210 95T260 20T310 80T365 25T420 70T480 40'
  };
  const contexts = {
    work: { tag: 'คืน 5–7 · งานเลิกช้า', teem: 'นอนช้าขึ้นตรงกับคืนที่งานเลิกช้า ลองเทียบกับคืนที่เลิกตรงเวลา', ako: 'ถ้าเลิกงานเร็วขึ้นไม่ได้ ลองหาช่วงพักหลังงาน', experiment: 'พัก 10 นาที หลังเลิกงาน' },
    family: { tag: 'คืน 5–7 · ดูแลคนที่บ้าน', teem: 'แยกคืนที่ต้องดูแลคนที่บ้าน แล้วเทียบกับคืนอื่นดู', ako: 'ตารางนอนอาจเลือกเองไม่ได้ หาช่วงพักที่ทำได้จริงกัน', experiment: 'เลือกช่วงพัก ที่พอจัดได้หนึ่งช่วง' },
    unknown: { tag: 'คืน 5–7 · ยังไม่รู้บริบท', teem: 'เห็นเวลานอนที่เปลี่ยน แต่ยังบอกเหตุผลไม่ได้', ako: 'จดเรื่องก่อนนอนเพิ่มนิดหนึ่ง แล้วกลับมาดูด้วยกัน', experiment: 'จดเรื่องก่อนนอน อีก 3 คืน' }
  };
  const headings = [
    ['01', 'ลองเห็นหนึ่งวัน', 'เมื่อวาน<br>เป็นแบบไหน?', 'ลองคืนตัวอย่างหนึ่งคืน', 'เมื่อวาน'],
    ['02', 'เก็บสิ่งที่จำยาก', 'มื้อนี้<br>จำอะไรได้บ้าง?', 'ภาพเดียว เก็บรายละเอียดไว้ให้กลับมาดู', '12:30 · มื้อหนึ่ง'],
    ['03', 'อีกส่วนของวัน', 'วันนั้น<br>ได้ขยับแค่ไหน?', 'ลองเลือกจังหวะการขยับหนึ่งแบบ', 'ระหว่างวัน'],
    ['04', 'เห็นวันเดียวกัน', 'วันเดียว<br>เห็นเหตุการณ์', 'นอน กิน ขยับ อยู่ในภาพเดียวกัน<br>ไม่ต้องค่อย ๆ นึกย้อนทีละเรื่อง', 'เมื่อวาน · เก็บไว้แล้ว'],
    ['05', 'ขยายเวลา', 'หลายวัน<br>เริ่มเห็นสิ่งที่เปลี่ยน', 'สามคืนหลัง เริ่มนอนช้าขึ้น', '7 คืนตัวอย่าง'],
    ['06', 'เติมชีวิตจริง', 'ข้อมูลเดิม<br>เข้าใจชีวิตมากขึ้น', 'ตัวเลขไม่ได้เล่าเหตุผลทั้งหมด', '7 คืนเดิม · เพิ่มบริบท'],
    ['07', 'จากตัวอย่าง สู่ตัวคุณ', 'คราวนี้<br>เป็นเรื่องของคุณ', 'เราเอา Scale ไปวัดจริง<br>แล้วดูข้อมูลกับชีวิตจริงของคุณด้วยกัน', '']
  ];
  const fresh = () => ({ step: 0, sleep: null, food: false, move: null, context: null, editing: null, phase: 'ready' });
  let state = fresh(), generation = 0, targetArt = 'art-hero', soundEnabled = false, audioContext;
  const timers = new Set(), flights = new Set();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => media.matches;
  function later(callback, delay) {
    const token = generation;
    const id = window.setTimeout(() => { timers.delete(id); if (token === generation) callback(); }, delay);
    timers.add(id); return id;
  }
  function cancelMotion() {
    generation += 1; timers.forEach(id => window.clearTimeout(id)); timers.clear();
    flights.forEach(({ node, animation }) => { animation?.cancel(); node.remove(); }); flights.clear();
    document.querySelectorAll('.just-added').forEach(node => node.classList.remove('just-added'));
  }
  function loadImage(img) {
    if (!img || img.hasAttribute('src')) return;
    img.addEventListener('error', () => img.classList.add('image-unavailable'), { once: true });
    if (img.dataset.srcset) { img.sizes = img.dataset.sizes || '(max-width:760px) 100vw,72vw'; img.srcset = img.dataset.srcset; }
    if (img.dataset.src) img.src = img.dataset.src;
  }
  function loadWithin(id) { $(id).querySelectorAll('img[data-src]').forEach(loadImage); }
  function art(id) {
    targetArt = id; if (!id) return;
    const img = $(id);
    const show = () => { if (targetArt === id) document.querySelectorAll('.scene-plate').forEach(plate => plate.classList.toggle('is-active', plate === img && img.naturalWidth > 0)); };
    loadImage(img);
    if (img.complete) show();
    else { img.addEventListener('load', show, { once: true }); img.addEventListener('error', show, { once: true }); }
  }
  function cue(kind) {
    if (!soundEnabled || !audioContext) return;
    try {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'capture' ? 900 : 520, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'capture' ? 320 : 780, now + .09);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.045, now + .01); gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + .18);
    } catch { /* Optional sound never blocks interaction. */ }
  }
  function announce(text) { $('experience-status').textContent = text; }
  function updateRecords(added) {
    const count = Number(Boolean(state.sleep)) + Number(state.food) + Number(Boolean(state.move));
    $('record-count').textContent = `${count} / 3`;
    $('record-sleep').textContent = state.sleep ? sleepOptions[state.sleep] : '—';
    $('record-food').textContent = state.food ? '12:30' : '—';
    $('record-move').textContent = state.move ? moveOptions[state.move] : '—';
    $('day-sleep').textContent = state.sleep ? sleepOptions[state.sleep] : '—';
    $('day-move').textContent = state.move ? moveOptions[state.move] : '—';
    $('edit-sleep').disabled = !state.sleep; $('edit-move').disabled = !state.move;
    for (const [id, filled] of [['edit-sleep', state.sleep], ['food-stamp', state.food], ['edit-move', state.move]]) $(id).classList.toggle('is-filled', Boolean(filled));
    $('meal-stamp').hidden = !state.food; if (state.food) loadImage($('meal-stamp'));
    $('day-ribbon').hidden = !count || state.step === 6;
    if (added) { const record = $(added); record.classList.remove('just-added'); void record.offsetWidth; record.classList.add('just-added'); later(() => record.classList.remove('just-added'), 520); }
  }
  function focusScene() {
    $('scene-title').focus({ preventScroll: true });
    if (window.scrollY > stage.offsetTop + 70) window.scrollTo({ top: stage.offsetTop, behavior: reduced() ? 'auto' : 'smooth' });
  }
  function render({ focus = false } = {}) {
    const scene = scenes[state.step], [number, chapter, title, support, time] = headings[state.step];
    stage.dataset.scene = scene; stage.dataset.phase = state.phase;
    $('chapter-number').textContent = number; $('chapter-name').textContent = state.editing !== null ? 'ปรับวันตัวอย่าง' : chapter;
    $('scene-title').innerHTML = title; $('scene-support').innerHTML = support; $('scene-time').textContent = time;
    $('sample-label').textContent = state.step === 6 ? 'XIRCLE · ถึงตาคุณ' : 'วันตัวอย่าง · ไม่ใช่ค่าของคุณ';
    $('world').setAttribute('aria-label', state.step === 6 ? 'ทีม เอโกะ และ XIRCLE Scale สำหรับการพบกันจริง' : 'ฉากวันตัวอย่าง');
    document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel === 'context' ? ![4, 5].includes(state.step) : panel.dataset.panel !== scene; });
    $('sleep-record').hidden = state.phase !== 'sleep-recorded'; $('camera-view').hidden = state.step !== 1;
    $('capture-photo').hidden = !['capturing', 'docking'].includes(state.phase);
    $('movement-visual').hidden = state.phase !== 'move-recorded'; $('assembled-day').hidden = state.step !== 3;
    $('pattern-world').hidden = ![4, 5].includes(state.step); $('people-reveal').hidden = state.step !== 5;
    $('context-tag').hidden = state.step !== 5; $('human-insight').hidden = state.step !== 5; $('real-world').hidden = state.step !== 6;
    $('context-question').textContent = state.step === 5 ? 'ลองบริบทอื่น กับข้อมูลเดิม' : 'ช่วงนั้นต่างไปเพราะอะไร?';
    $('back').hidden = (state.step === 0 && state.editing === null && state.phase === 'ready') || (state.step === 6 && !state.context);
    $('replay').hidden = state.step === 0 && !state.sleep;
    $('nav-note').textContent = state.editing !== null ? 'เลือกแล้วกลับไปจุดเดิม' : state.step === 0 ? 'แค่ลอง ยังไม่ต้องรู้จัก XIRCLE' : state.step === 6 ? 'เริ่มด้วยการนัดพบกัน' : state.step < 3 ? 'แตะบันทึกด้านบนเพื่อแก้ไขได้' : 'ข้อมูลตัวอย่างชุดเดิม';
    document.querySelectorAll('[data-sleep]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sleep === state.sleep)));
    document.querySelectorAll('[data-move]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.move === state.move)));
    document.querySelectorAll('[data-context]').forEach(button => button.setAttribute('aria-pressed', String(state.step === 5 && button.dataset.context === state.context)));
    $('shutter').disabled = ['capturing', 'docking'].includes(state.phase);
    $('shutter-label').innerHTML = state.phase === 'capturing' ? 'กำลังเก็บมื้อนี้<small>ภาพกำลังถูกบันทึก</small>' : state.phase === 'docking' ? 'อยู่ในวันเดียวกันแล้ว<small>12:30 · บันทึกแล้ว</small>' : 'เก็บมื้อนี้ไว้<small>แตะชัตเตอร์</small>';
    $('capture-caption').textContent = state.phase === 'capturing' ? '12:30 · เก็บไว้กลับมาดู' : state.phase === 'docking' ? 'มื้อนี้ อยู่ในวันของเราแล้ว' : 'เก็บภาพนี้ ไว้กลับมาดู';
    if (state.step === 5 && state.context) { const context = contexts[state.context]; $('context-tag-text').textContent = context.tag; $('teem-insight').textContent = context.teem; $('ako-insight').textContent = context.ako; $('experiment-title').textContent = context.experiment; }
    updateRecords();
    if (state.step === 0) art(state.phase === 'sleep-recorded' ? 'art-sleep' : 'art-hero');
    if (state.step === 1) { art('art-food'); loadWithin('camera-view'); loadImage($('art-move')); }
    if (state.step === 2) { art('art-move'); loadWithin('assembled-day'); loadImage($('art-day')); }
    if (state.step === 3) { art('art-day'); loadWithin('assembled-day'); loadImage($('art-context')); }
    if ([4, 5].includes(state.step)) {
      art('art-context'); document.querySelectorAll('.night-film i').forEach((night, index) => { night.style.backgroundImage = 'url("/xircle/assets/v3/sleep-clean-800.webp")'; night.style.setProperty('--delay', `${(6-index)*.045}s`); night.style.setProperty('--shift', `${(6-index)*70}px`); }); loadWithin('people-reveal');
    }
    if (state.step >= 5) loadWithin('real-world'); if (state.step === 6) art(null); if (focus) focusScene();
  }
  function advance(step, phase = 'ready') { cancelMotion(); state.step = step; state.phase = phase; render({ focus: true }); }
  function finishRecord(nextStep) { const destination = state.editing ?? nextStep; state.editing = null; advance(destination); }
  function busy() { return ['sleep-recorded', 'capturing', 'docking', 'move-recorded'].includes(state.phase); }
  function validTap(event) { return event.detail <= 1 && !busy(); }
  function fly(node, from, to, duration) {
    if (reduced() || !node.animate || !from.width || !to.width) { node.remove(); return; }
    Object.assign(node.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, margin: '0', transformOrigin: 'top left' }); document.body.append(node);
    // A saved photograph keeps its proportions while moving into the day's record.
    const scale = Math.min(to.width/from.width, to.height/from.height);
    const x = to.left-from.left+(to.width-from.width*scale)/2;
    const y = to.top-from.top+(to.height-from.height*scale)/2;
    const animation = node.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${x}px,${y}px) scale(${scale})`, opacity: .45 }], { duration, easing: 'cubic-bezier(.22,.75,.25,1)', fill: 'forwards' });
    const flight = { node, animation }; flights.add(flight); animation.onfinish = () => { node.remove(); flights.delete(flight); };
  }
  document.querySelectorAll('[data-sleep]').forEach(button => button.addEventListener('click', event => {
    if (!validTap(event) || state.step !== 0) return;
    state.sleep = button.dataset.sleep; state.phase = 'sleep-recorded'; $('sleep-reveal-value').textContent = sleepOptions[state.sleep];
    loadImage($('art-food')); cue('record'); render(); updateRecords('edit-sleep'); announce(`เก็บคืนตัวอย่าง ${sleepOptions[state.sleep]} ชั่วโมงแล้ว`);
    later(() => finishRecord(1), reduced() ? 180 : 1100);
  }));
  $('shutter').addEventListener('click', event => {
    if (!validTap(event) || state.step !== 1) return;
    state.phase = 'capturing'; cue('capture'); render(); announce('ภาพมื้ออาหารกำลังถูกบันทึก');
    later(() => {
      const photo = $('capture-photo').querySelector('img'), from = photo.getBoundingClientRect();
      state.food = true; state.phase = 'docking'; render(); updateRecords('food-stamp');
      const clone = photo.cloneNode(false); clone.removeAttribute('id'); clone.alt = ''; clone.className = 'flying-meal'; clone.setAttribute('aria-hidden', 'true');
      fly(clone, from, $('meal-stamp').getBoundingClientRect(), 410); announce('มื้อ 12:30 ถูกเก็บในวันตัวอย่างแล้ว');
      later(() => advance(2), reduced() ? 120 : 530);
    }, reduced() ? 230 : 850);
  });
  document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', event => {
    if (!validTap(event) || state.step !== 2) return;
    state.move = button.dataset.move; state.phase = 'move-recorded'; $('move-reveal-value').textContent = moveOptions[state.move]; $('move-trace').setAttribute('d', movementPaths[state.move]);
    cue('record'); render(); updateRecords('edit-move'); announce(`เก็บการขยับ ${moveOptions[state.move]} ก้าวตัวอย่างแล้ว`); later(() => finishRecord(3), reduced() ? 180 : 850);
  }));
  $('expand-days').addEventListener('click', event => {
    if (!validTap(event) || state.step !== 3) return;
    const assembled = $('assembled-day'), from = assembled.getBoundingClientRect(), clone = assembled.cloneNode(true);
    clone.removeAttribute('id'); clone.className = 'assembled-day flying-day'; clone.setAttribute('aria-hidden', 'true'); clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    advance(4, 'expanding'); fly(clone, from, document.querySelector('.night-film .latest').getBoundingClientRect(), 760); cue('record'); announce('จากวันเดียวเป็นเจ็ดคืน สามคืนหลังเริ่มนอนช้าขึ้น');
  });
  document.querySelectorAll('[data-context]').forEach(button => button.addEventListener('click', event => {
    if (!validTap(event) || ![4, 5].includes(state.step)) return;
    const first = state.step === 4; cancelMotion(); state.context = button.dataset.context; state.step = 5; state.phase = 'context-change';
    stage.dataset.phase = 'ready'; void stage.offsetWidth; render({ focus: first }); cue('record');
    announce(`ข้อมูลเจ็ดคืนเดิม ${contexts[state.context].tag} ${contexts[state.context].experiment}`);
  }));
  $('see-yours').addEventListener('click', event => {
    if (!validTap(event) || state.step !== 5) return;
    advance(6, reduced() ? 'ready' : 'arriving'); cue('record'); announce('จบวันตัวอย่าง คราวนี้มาลอง XIRCLE Scale และดูชีวิตจริงของคุณกับทีมและเอโกะ');
    later(() => { state.phase = 'ready'; stage.dataset.phase = 'ready'; }, reduced() ? 0 : 1400);
  });
  function editRecord(step) {
    if (busy() || state.step === 6 || state.step === step) return;
    const destination = state.editing ?? state.step; cancelMotion(); state.editing = destination; state.step = step; state.phase = 'ready'; render({ focus: true });
  }
  $('edit-sleep').addEventListener('click', () => editRecord(0)); $('edit-move').addEventListener('click', () => editRecord(2));
  $('back').addEventListener('click', () => { const destination = state.editing ?? (busy() ? state.step : Math.max(0, state.step-1)); state.editing = null; advance(destination); announce('ย้อนกลับแล้ว'); });
  $('replay').addEventListener('click', () => {
    cancelMotion(); state = fresh();
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* History can be unavailable. */ }
    render({ focus: true }); announce('เริ่มวันตัวอย่างใหม่');
  });
  $('sound-toggle').addEventListener('click', async () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) { try { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) throw new Error('Audio unavailable'); audioContext ||= new Audio(); await audioContext.resume(); } catch { soundEnabled = false; announce('อุปกรณ์นี้เปิดเสียงไม่ได้ ลองต่อโดยไม่มีเสียงได้เลย'); } }
    $('sound-toggle').setAttribute('aria-pressed', String(soundEnabled)); $('sound-toggle').querySelector('span').textContent = soundEnabled ? 'เสียงเปิด' : 'เสียงปิด'; if (soundEnabled) cue('record');
  });
  $('book-link').addEventListener('click', () => { try { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#appointment'); } catch { /* The booking href works without history. */ } });
  // Bounded entry context only; fictional sample records never leave this runtime.
  try {
    if (window.location.pathname !== XIRCLE_HOME) window.history.replaceState(null, '', XIRCLE_HOME + window.location.search + window.location.hash);
  } catch { /* Case aliases remain playable without history access. */ }
  let storage;
  try { storage = window.localStorage; } catch { /* Storage is optional. */ }
  const entry = entryContext(window.location.search, storage);
  if (entry.focus) headings[0][3] = {
    food: 'มื้อหนึ่งเกี่ยวกับทั้งวันยังไง?<br>ลองเก็บวันตัวอย่างนี้ด้วยกัน',
    move: 'การขยับไม่ได้อยู่ลำพัง<br>ลองเห็นทั้งวัน ตั้งแต่คืนก่อนหน้า',
    sleep: 'เริ่มจากการพักที่คุณเลือก<br>ลองดูว่าเมื่อเก็บไว้ เราจะเห็นอะไรเพิ่ม'
  }[entry.focus];
  if (entry.compass) {
    $('compass-subject').textContent = entry.focus ? `จากเข็มทิศ · วันนี้คุณเลือกใส่ใจ${FOCUS_LABELS[entry.focus]}` : 'เดินต่อจากเข็มทิศ';
    $('compass-continuation').hidden = false;
  }
  if (entry.focus) {
    document.querySelectorAll('a[href^="/meet/"]').forEach(link => {
      const href = new URL(link.getAttribute('href'), window.location.origin);
      href.searchParams.set('focus', entry.focus); link.href = href.pathname + href.search;
    });
  }
  if (entry.invitation || entry.createNotebook) {
    const link = $('legacy-invite'); link.href = notebookHref(entry);
    link.textContent = entry.invitation && !entry.createNotebook ? 'เปิดคำเชิญสมุดของคุณ ↗' : 'เปิดสมุดของคุณ ↗';
    link.hidden = false;
  }
  for (const id of ['knowledge-link', 'xvisor-link']) $(id).addEventListener('click', () => {
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search + '#appointment'); } catch { /* Knowledge links work without history. */ }
  });
  if (['#appointment', '#start'].includes(window.location.hash)) state.step = 6;
  render(); document.querySelector('.skip-link').href = '#experience'; $('experience').hidden = false; $('fallback').hidden = true; $('sound-toggle').hidden = false;
})();
