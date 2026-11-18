/* RoutineX · หน้าเริ่มต้น: นับวัน, จุดแวะ, เครื่องมือของแต่ละตอน
   ทุกอย่างเก็บในเครื่องของผู้ใช้ (localStorage) ไม่ส่งออกไปไหน */
(() => {
  const d = document;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const RX = window.RoutineX || { toast() {}, copy: async () => false, share: async () => 'fail' };

  /* ---------- ที่เก็บ ---------- */
  const KEY = 'routinex.start.v1';
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { state = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* โหมดส่วนตัว: ใช้ได้เฉพาะรอบนี้ */ } };

  const STOPS = [0, 3, 7, 14, 21, 28];
  const TITLES = {
    0: 'Day 0 · เปิดกล่อง รู้จัก 4 กลไก ABCD',
    3: 'Day 3 · เริ่มได้สะดวกไหม',
    7: 'Day 7 · ให้คะแนนตัวเอง กิน ขยับ นอน',
    14: 'Day 14 · แก้ทีละเรื่อง ตั้งเป้าหนึ่งข้อ',
    21: 'Day 21 · รักษาจังหวะ',
    28: 'Day 28 · ทบทวน แล้วไปต่อ',
  };

  /* ---------- วันที่ ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const dayNow = () => { const s = parse(state.start); return s ? Math.round((today() - s) / 864e5) : null; };

  /* ---------- กล่อง ---------- */
  const box = $('.box');
  function openBox(scroll) {
    box?.classList.add('is-open');
    box?.classList.remove('float');
    if (scroll) setTimeout(() => $('#today')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 650);
  }
  $$('[data-open-box]').forEach((b) => b.addEventListener('click', () => openBox(true)));

  /* ---------- ตัวนับวัน ---------- */
  const setBox = $('#trackerSet'), live = $('#trackerLive'), dateIn = $('#startDate');
  if (dateIn) dateIn.max = iso(today());

  function renderTracker() {
    const n = dayNow();
    const has = n !== null && n >= 0;
    setBox.hidden = has;
    live.hidden = !has;
    $$('.chap').forEach((c) => {
      c.classList.remove('is-now', 'is-done');
      const b = $('.badge[data-state]', c);
      if (b) b.hidden = true;
    });
    if (!has) { renderLocks(null); return; }

    const shown = Math.min(n, 28);
    $('#ringDay').textContent = n > 28 ? '28+' : String(n);
    requestAnimationFrame(() => { $('#ringFg').style.strokeDashoffset = String(440 - 440 * (shown / 28)); });

    const cur = [...STOPS].reverse().find((s) => s <= n) ?? 0;
    const next = STOPS.find((s) => s > n);
    $('#nowTitle').textContent = TITLES[cur];
    $('#nowGo').href = `#day${cur}`;
    $('#nowKicker').textContent = n > 28 ? 'ครบรอบแรกแล้ว' : 'ตอนของคุณตอนนี้';
    $('#nowNext').textContent = n > 28
      ? 'ทบทวน Day 28 ให้เรียบร้อย แล้วกด “เริ่มรอบถัดไป” เพื่อเริ่มนับใหม่กับ X-VISOR ของคุณ'
      : next === undefined ? 'วันนี้ครบ 28 วันพอดี เปิดคลิปสุดท้ายแล้วทบทวนไปด้วยกัน'
      : next - n === 1 ? `พรุ่งนี้ถึงจุดแวะ Day ${next}`
      : `อีก ${next - n} วันถึงจุดแวะ Day ${next}`;

    const tp = $('#todayPack');
    if (n >= 1 && n <= 28) {
      tp.hidden = false;
      tp.textContent = n % 2 === 1
        ? `Day ${n} เป็นวันคี่ · ซอง G.U.S. day (Protein HMB+ · Core Duo · G.U.S.+)`
        : `Day ${n} เป็นวันคู่ · ซอง Core day (Protein HMB+ · Core Duo)`;
      setParity(n % 2 === 1 ? 'odd' : 'even');
    } else if (n === 0) {
      tp.hidden = false;
      tp.textContent = 'วันนี้คือวันตั้งต้น · พรุ่งนี้ Day 1 เริ่มที่ซองวันคี่';
    } else tp.hidden = true;

    $$('.chap').forEach((c) => {
      const day = +c.dataset.day;
      const b = $('.badge[data-state]', c);
      if (day === cur && n <= 28) { c.classList.add('is-now'); if (b) { b.hidden = false; b.textContent = 'ตอนนี้'; } }
      else if (day < cur || n > 28) { c.classList.add('is-done'); if (b) { b.hidden = false; b.textContent = 'ผ่านแล้ว'; } }
      else if (b) { b.hidden = false; b.textContent = day - n === 1 ? 'พรุ่งนี้' : `อีก ${day - n} วัน`; }
    });
    renderLocks(n);
  }

  /* ---------- รอให้ถึงวัน และข้ามการรอ (ต้องกดยืนยัน) ----------
     ตอนที่ยังไม่ถึงวันจะปิดเนื้อหาไว้ก่อน ข้ามได้สองแบบ:
     ขอดูก่อน (เปิดเฉพาะตอนนั้น) หรือ ตั้งวันนี้เป็น Day นั้น (เช่น เปลี่ยนเครื่องมา) */
  const isLocked = (day, n) => day > 0 && !(state.skip && state.skip[day]) && (n === null || n < day);

  function buildGate(chap) {
    const day = +chap.dataset.day;
    const g = d.createElement('div');
    g.className = 'gate';
    g.hidden = true;
    g.innerHTML = `
      <p class="k">ยังไม่ถึงวัน</p>
      <h4>ตอนนี้เปิดให้เมื่อถึง Day ${day}</h4>
      <p data-gate-when></p>
      <div class="gate__act" data-gate-act>
        <button class="btn btn--line btn--sm" type="button" data-gate="skip">ข้ามการรอ ขอดูตอนนี้</button>
        <button class="linkbtn" type="button" data-gate="move">เปลี่ยนเครื่องมา? ฉันถึง Day ${day} แล้ว</button>
      </div>
      <div class="gate__confirm" data-gate-confirm role="group" aria-label="ยืนยันการข้าม" hidden>
        <p data-gate-q aria-live="polite"></p>
        <div class="gate__act">
          <button class="btn btn--go btn--sm" type="button" data-gate-yes></button>
          <button class="btn btn--line btn--sm" type="button" data-gate-no>ยังไม่ข้าม</button>
        </div>
      </div>`;
    const act = $('[data-gate-act]', g), confirmBox = $('[data-gate-confirm]', g);
    const q = $('[data-gate-q]', g), yes = $('[data-gate-yes]', g);
    let mode = '';
    const ask = (m) => {
      mode = m;
      q.textContent = m === 'skip'
        ? `ยืนยันว่าจะข้ามจริง ๆ ใช่ไหม ตอน Day ${day} ทำไว้ให้ดูเมื่อคุณทำมาถึงวันนั้น ถ้าข้าม ตัวนับวันของคุณยังเหมือนเดิม`
        : `ยืนยันว่าวันนี้คือ Day ${day} ของคุณ ตัวนับวันจะตั้งใหม่ตามนี้ และตอนก่อนหน้าจะนับว่าผ่านแล้ว`;
      yes.textContent = m === 'skip' ? 'ยืนยัน ข้ามจริง ๆ' : `ยืนยัน วันนี้คือ Day ${day}`;
      act.hidden = true;
      confirmBox.hidden = false;
      yes.focus();
    };
    const back = () => { confirmBox.hidden = true; act.hidden = false; };
    $$('[data-gate]', g).forEach((b) => b.addEventListener('click', () => ask(b.dataset.gate)));
    $('[data-gate-no]', g).addEventListener('click', () => { back(); $('[data-gate="skip"]', g).focus(); });
    yes.addEventListener('click', () => {
      if (mode === 'skip') {
        state.skip = { ...(state.skip || {}), [day]: true };
        save();
        renderTracker();
        RX.toast(`เปิดตอน Day ${day} ให้แล้ว`);
      } else {
        const s = today();
        s.setDate(s.getDate() - day);
        setStart(iso(s));
        RX.toast(`ตั้งแล้ว วันนี้คือ Day ${day} ของคุณ`);
      }
      chap.open = true;
      $('summary', chap)?.focus();
    });
    g._reset = back;
    $('summary', chap).after(g);
    return g;
  }

  function renderLocks(n) {
    $$('.chap').forEach((c) => {
      const day = +c.dataset.day;
      if (!day) return;
      const g = c._gate || (c._gate = buildGate(c));
      const lock = isLocked(day, n);
      c.classList.toggle('is-locked', lock);
      g.hidden = !lock;
      g._reset();
      $('[data-gate-when]', g).textContent = n === null
        ? 'ตั้งวันเริ่มด้านบนก่อน แล้วแต่ละตอนจะเปิดให้เองเมื่อถึงวัน'
        : day - n === 1 ? 'เปิดให้พรุ่งนี้ วันนี้ทำของตอนปัจจุบันให้ครบก่อน'
        : `อีก ${day - n} วัน ระหว่างนี้ทำของตอนปัจจุบันให้ครบก่อน`;
    });
  }

  function setStart(value, { focus } = {}) {
    state.start = value;
    save();
    openBox(false);
    renderTracker();
    if (focus) {
      const n = dayNow();
      const cur = [...STOPS].reverse().find((s) => s <= n) ?? 0;
      $$('.chap').forEach((c) => { c.open = +c.dataset.day === cur; });
    }
  }
  $('#startToday')?.addEventListener('click', () => { setStart(iso(today()), { focus: true }); RX.toast('เริ่มนับแล้ว วันนี้คือ Day 0'); });
  dateIn?.addEventListener('change', () => {
    const p = parse(dateIn.value);
    if (!p || p > today()) return;
    setStart(dateIn.value, { focus: true });
    RX.toast(`บันทึกแล้ว วันนี้คุณอยู่ Day ${dayNow()}`);
  });
  $('#resetStart')?.addEventListener('click', () => {
    delete state.start; save(); renderTracker();
    dateIn.value = '';
    $('#startToday')?.focus();
  });
  $('#nowGo')?.addEventListener('click', (e) => {
    const t = $(e.currentTarget.getAttribute('href'));
    if (t && t.tagName === 'DETAILS') t.open = true;
  });
  $('#nextRound')?.addEventListener('click', () => {
    const keep = { rounds: (state.rounds || 1) + 1 };
    state = { ...keep, start: iso(today()) };
    save();
    restoreAll();
    renderTracker();
    $$('.chap').forEach((c) => { c.open = c.dataset.day === '0'; });
    $('#today')?.scrollIntoView({ behavior: 'smooth' });
    RX.toast('เริ่มรอบถัดไปแล้ว วันนี้คือ Day 0');
  });

  /* เปิดตอนที่ลิงก์ชี้มา เช่น /routinex/start/#day7 */
  function openFromHash() {
    const t = location.hash && $(location.hash);
    if (t && t.classList.contains('chap')) { t.open = true; openBox(false); }
  }
  addEventListener('hashchange', openFromHash);

  /* ---------- รายการติ๊ก ---------- */
  function initChecks(wrap) {
    const key = wrap.dataset.checks;
    const boxes = $$('input[type=checkbox]', wrap);
    const note = $('[data-check-note]', wrap);
    const base = note?.textContent || '';
    const draw = () => {
      const got = state[key] || {};
      let n = 0;
      boxes.forEach((b) => { b.checked = !!got[b.dataset.id]; if (b.checked) n += 1; });
      $('.meter i', wrap)?.style.setProperty('--p', String(n / boxes.length));
      if (note) note.textContent = n === boxes.length ? 'ครบทุกข้อแล้ว เยี่ยมมาก' : n ? `ทำแล้ว ${n} จาก ${boxes.length} ข้อ` : base;
    };
    boxes.forEach((b) => b.addEventListener('change', () => {
      state[key] = { ...(state[key] || {}), [b.dataset.id]: b.checked };
      save(); draw();
    }));
    wrap._draw = draw;
    draw();
  }

  /* ---------- Day 3 ---------- */
  function initPick(wrap) {
    const key = wrap.dataset.pick;
    const chips = $$('.chip', wrap);
    const draw = () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(state[key] === c.dataset.v)));
      $$('[data-tip]', wrap).forEach((t) => { t.hidden = t.dataset.tip !== state[key]; });
    };
    chips.forEach((c) => c.addEventListener('click', () => { state[key] = c.dataset.v; save(); draw(); }));
    wrap._draw = draw;
    draw();
  }

  /* ---------- ข้อความถึง X-VISOR ---------- */
  function bindMsg(root, build) {
    const boxEl = $('[data-msg]', root), text = $('[data-msg-text]', root);
    const draw = () => {
      const m = build();
      boxEl.hidden = !m;
      if (m) text.textContent = m;
    };
    $('[data-msg-copy]', root)?.addEventListener('click', async () => {
      RX.toast((await RX.copy(text.textContent)) ? 'คัดลอกแล้ว วางในแชตกับ X-VISOR ได้เลย' : 'คัดลอกไม่ได้ ลองกดค้างที่ข้อความ');
    });
    $('[data-msg-send]', root)?.addEventListener('click', () => RX.share({ title: 'RoutineX', text: text.textContent }));
    return draw;
  }

  /* ---------- Day 7 ---------- */
  const LABEL = { eat: 'การกิน', move: 'การขยับ', sleep: 'การนอน' };
  const t7 = $('#tool7');
  let draw7 = () => {};
  if (t7) {
    $$('.score', t7).forEach((row) => {
      const k = row.dataset.score, dots = $('.dots', row);
      for (let i = 1; i <= 5; i += 1) {
        const b = d.createElement('button');
        b.type = 'button'; b.className = 'dot'; b.textContent = String(i);
        b.setAttribute('aria-label', `${LABEL[k]} ${i} คะแนน`);
        b.addEventListener('click', () => {
          state.s7 = { ...(state.s7 || {}), [k]: i };
          // ยังไม่ได้เลือกเอง: ชี้เรื่องที่คะแนนต่ำสุดให้ก่อน
          const s = state.s7;
          if (!state.f7user && s.eat && s.move && s.sleep) {
            state.f7 = ['eat', 'move', 'sleep'].reduce((a, c) => (s[c] < s[a] ? c : a), 'eat');
          }
          save(); draw7();
        });
        dots.append(b);
      }
    });
    $$('[data-focus] .chip', t7).forEach((c) => c.addEventListener('click', () => { state.f7 = c.dataset.v; state.f7user = true; save(); draw7(); }));
    const msg = bindMsg(t7, () => {
      const s = state.s7 || {};
      if (!state.f7 || !(s.eat && s.move && s.sleep)) return '';
      return `ครบ 7 วันของ RoutineX แล้ว\nคะแนนที่ให้ตัวเอง: กิน ${s.eat}/5 · ขยับ ${s.move}/5 · นอน ${s.sleep}/5\nสัปดาห์นี้อยากแก้เรื่อง${LABEL[state.f7]}ก่อน ช่วยดูด้วยกันหน่อย`;
    });
    draw7 = () => {
      const s = state.s7 || {};
      $$('.score', t7).forEach((row) => {
        const v = s[row.dataset.score] || 0;
        $$('.dot', row).forEach((b, i) => { b.classList.toggle('on', i < v); b.setAttribute('aria-pressed', String(i + 1 === v)); });
      });
      $$('[data-focus] .chip', t7).forEach((c) => c.setAttribute('aria-pressed', String(state.f7 === c.dataset.v)));
      msg();
    };
  }

  /* ---------- Day 14 ---------- */
  const t14 = $('#tool14');
  let draw14 = () => {};
  if (t14) {
    const own = $('[data-goal-own]', t14);
    $$('[data-goal] .chip', t14).forEach((c) => c.addEventListener('click', () => { state.g14 = c.dataset.v; own.value = ''; save(); draw14(); }));
    own.addEventListener('input', () => { state.g14 = own.value.trim(); save(); draw14(true); });
    const msg = bindMsg(t14, () => (state.g14
      ? `ครบ 14 วันของ RoutineX แล้ว\nอีก 14 วันข้างหน้าขอตั้งเป้าเพิ่มหนึ่งเรื่อง: ${state.g14}\nช่วยตามดูด้วยกันหน่อย`
      : ''));
    draw14 = (typing) => {
      const chips = $$('[data-goal] .chip', t14);
      const preset = chips.some((c) => c.dataset.v === state.g14);
      chips.forEach((c) => c.setAttribute('aria-pressed', String(state.g14 === c.dataset.v)));
      if (!typing) own.value = !preset && state.g14 ? state.g14 : '';
      msg();
      const echo = $('[data-goal-echo]');
      if (echo) echo.textContent = state.g14 ? `เป้าจาก Day 14: ${state.g14}` : 'เป้าที่ตั้งไว้ตอน Day 14';
    };
  }

  /* ---------- Day 28 ---------- */
  const t28 = $('#tool28');
  let draw28 = () => {};
  if (t28) {
    const proud = $('[data-proud]', t28);
    $$('[data-seen] .chip', t28).forEach((c) => c.addEventListener('click', () => {
      const set = new Set(state.seen28 || []);
      if (set.has(c.dataset.v)) set.delete(c.dataset.v); else set.add(c.dataset.v);
      state.seen28 = [...set]; save(); draw28();
    }));
    $$('[data-next] .chip', t28).forEach((c) => c.addEventListener('click', () => { state.n28 = c.dataset.v; save(); draw28(); }));
    proud.addEventListener('input', () => { state.p28 = proud.value.trim(); save(); draw28(true); });
    const msg = bindMsg(t28, () => {
      if (!state.n28) return '';
      const lines = ['ครบ 28 วันของ RoutineX แล้ว'];
      if (state.seen28?.length) lines.push(`สิ่งที่สังเกตเห็น: ${state.seen28.join(' · ')}`);
      if (state.p28) lines.push(`ประทับใจที่สุด: ${state.p28}`);
      lines.push(`อีก 28 วันข้างหน้าอยาก${state.n28} ขอปรึกษาแผนรอบถัดไปหน่อย`);
      return lines.join('\n');
    });
    draw28 = (typing) => {
      const seen = new Set(state.seen28 || []);
      $$('[data-seen] .chip', t28).forEach((c) => c.setAttribute('aria-pressed', String(seen.has(c.dataset.v))));
      $$('[data-next] .chip', t28).forEach((c) => c.setAttribute('aria-pressed', String(state.n28 === c.dataset.v)));
      if (!typing) proud.value = state.p28 || '';
      msg();
    };
  }

  /* ---------- ซองของวันนี้ ---------- */
  const sachets = $('#sachets');
  function setParity(p) {
    sachets?.classList.toggle('is-even', p === 'even');
    $$('[data-parity]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.parity === p)));
    const a = $('.sachet--a');
    if (a) a.setAttribute('aria-label', p === 'even' ? 'G.U.S.+ ไม่อยู่ในซองวันคู่' : 'G.U.S.+');
  }
  function showSachet(k) {
    $$('.sachet').forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.s === k)));
    $$('[data-info]').forEach((i) => { i.hidden = i.dataset.info !== k; });
  }
  $$('[data-parity]').forEach((b) => b.addEventListener('click', () => setParity(b.dataset.parity)));
  $$('.sachet').forEach((s) => s.addEventListener('click', () => showSachet(s.dataset.s)));

  /* ---------- เริ่ม ---------- */
  function restoreAll() {
    $$('[data-checks]').forEach((w) => w._draw && w._draw());
    $$('[data-pick]').forEach((w) => w._draw && w._draw());
    draw7(); draw14(); draw28();
  }
  $$('[data-checks]').forEach(initChecks);
  $$('[data-pick]').forEach(initPick);
  draw7(); draw14(); draw28();

  // ดูคลิป Day 0 แล้วติ๊กข้อแรกให้เอง
  $('#day0')?.addEventListener('clip:play', () => {
    state.d0 = { ...(state.d0 || {}), watch: true };
    save();
    $('[data-checks="d0"]')?._draw?.();
  });

  if (state.start) {
    if (dayNow() < 0) delete state.start;
    else {
      openBox(false);
      const n = dayNow();
      const cur = [...STOPS].reverse().find((s) => s <= n) ?? 0;
      $$('.chap').forEach((c) => { c.open = +c.dataset.day === cur; });
    }
  }
  renderTracker();
  openFromHash();
})();
