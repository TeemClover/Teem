/* myClover Session — editorial landing + conversational booking */
(() => {
  'use strict';

  const BOOKING_ENDPOINT = '/api/meet';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.querySelector('#session-root');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  const INTENTS = [
    {
      id: 'health', label: 'สุขภาพและ Routine', short: 'อยากรู้จักร่างกายและสิ่งที่ทำได้จริง',
      kicker: 'BODY & ROUTINE', head: 'เริ่มจากชีวิตที่คุณกำลังใช้จริง',
      outcomes: [
        'เข้าใจข้อมูลร่างกายโดยไม่ตัดสินจากน้ำหนักอย่างเดียว',
        'เห็น Eat · Move · Sleep และ Routine ที่กำลังส่งผลกับคุณ',
        'กลับไปพร้อมหนึ่งจุดเริ่มที่ทำได้จริงในชีวิตปัจจุบัน',
      ],
      qualifier: 'ถ้าคำแนะนำครั้งนี้พอแล้ว จบตรงนั้นได้เลย ไม่ต้องซื้อผลิตภัณฑ์',
      cta: 'นัด Body & Routine Session',
      ack: ['เรื่องนี้เราจะไม่เริ่มจากการห้ามกินหรือบอกให้เปลี่ยนทุกอย่าง', 'ทีมจะช่วยมองระบบ ส่วนเอโกะจะช่วยปรับ Routine ให้เข้ากับชีวิตจริงของคุณ'],
      color: '#287354', icon: 'body',
    },
    {
      id: 'opportunity', label: 'สอบใบอนุญาตและระบบดูแล', short: 'อยากรู้วิธีเตรียมสอบและระบบที่มีให้ใช้',
      kicker: 'EXAM & CARE SYSTEM', head: 'คุณเลือกเส้นทาง เราช่วยให้คุณเตรียมพร้อม',
      outcomes: [
        'เห็นภาพสิ่งที่ต้องเรียน ข้อกำหนด และวิธีเตรียมตัวสอบใบอนุญาต',
        'รู้จักระบบติวของเรา โดยไม่รับประกันผลสอบ',
        'เห็นระบบแอปติดตาม Routine ที่ช่วยให้การดูแลต่อเนื่องเป็นรูปธรรม',
      ],
      qualifier: 'เราไม่สามารถชวนหรือรับสมัครคุณได้ การเลือกสอบต้องมาจากคุณเอง และเราไม่รับประกันว่าสอบผ่าน',
      cta: 'นัด Exam & Care System Session',
      ack: ['ถ้าคุณเลือกเส้นทางสอบด้วยตัวเอง ทีมจะช่วยให้เห็นโครงสร้างการเรียนและวิธีเตรียมตัว', 'เอโกะจะช่วยให้เห็นว่าระบบ Routine ถูกนำไปใช้ดูแลในชีวิตจริงอย่างไร—โดยไม่มีแรงกดดันให้ตัดสินใจวันนั้น'],
      color: '#4f8cff', icon: 'path',
    },
    {
      id: 'curious', label: 'ยังไม่แน่ใจ', short: 'แค่อยากเปิดมุมมองและรู้จักกันก่อน',
      kicker: 'OPEN TABLE', head: 'เอาเรื่องที่กำลังคิดมาวางบนโต๊ะ',
      outcomes: [
        'ได้มุมมองจากคนสองแบบที่อ่านเรื่องเดียวกันคนละด้าน',
        'กลับไปพร้อมคำถาม ไอเดีย หรือ Connection อย่างน้อยหนึ่งอย่าง',
        'เห็นก้าวถัดไปหนึ่งทาง แม้ทางนั้นจะไม่เกี่ยวกับ myClover เลย',
      ],
      qualifier: 'ไม่ต้องมี Pitch และไม่ต้องเตรียมคำตอบให้พร้อมก่อนมา',
      cta: 'นัด Open Table Session',
      ack: ['ยังไม่ต้องรู้ว่ากำลังหาอะไร แค่เอาเรื่องที่คิดอยู่มาคุยกันได้', 'เป้าหมายคือให้คุณกลับไปพร้อมมุมมองหรือก้าวถัดไปที่ชัดกว่าเดิม'],
      color: '#c8a85d', icon: 'open',
    },
  ];

  const ICONS = {
    body: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M7 20c.5-5 2.2-7 5-7s4.5 2 5 7"/><path d="M4 12h3m10 0h3"/></svg>',
    path: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19c1-7 4-11 9-11h5"/><path d="m15 4 4 4-4 4"/><circle cx="5" cy="19" r="2"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 6v12M6 12h12"/></svg>',
  };

  const page = { intent: null };
  const intentById = id => INTENTS.find(intent => intent.id === id) || null;
  const track = (event, payload = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
  };

  function renderIntentSelector() {
    const host = $('#intent-grid');
    host.replaceChildren(...INTENTS.map(intent => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'intent-card';
      button.style.setProperty('--card-accent', intent.color);
      button.setAttribute('aria-pressed', String(page.intent === intent.id));
      button.innerHTML = `<span class="intent-icon">${ICONS[intent.icon]}</span>
        <span class="intent-copy"><strong>${intent.label}</strong><small>${intent.short}</small></span>
        <span class="intent-arrow" aria-hidden="true">↗</span>`;
      button.addEventListener('click', () => selectIntent(intent.id, 'selector'));
      return button;
    }));
  }

  function selectIntent(id, source = 'selector') {
    const changed = page.intent !== id;
    page.intent = id;
    root.dataset.intent = id;
    renderIntentSelector();
    renderValue();
    renderFolder();
    syncBookingLabels();
    if (changed) track('meet_intent_selected', { intent: id, source });
  }

  function renderValue() {
    const host = $('#value-panel');
    const intent = intentById(page.intent);
    if (!intent) {
      host.innerHTML = '<p class="value-empty">เลือกหนึ่งเรื่อง แล้วเราจะบอกตรง ๆ ว่าคุณจะได้อะไรกลับไป</p>';
      return;
    }
    host.innerHTML = `<article class="value-shell">
      <p class="value-kicker">${intent.kicker}</p>
      <h3 class="display">${intent.head}</h3>
      <p class="outcome-title">คุณจะกลับไปพร้อมอะไร</p>
      <ol class="outcome-list">${intent.outcomes.map(item => `<li>${item}</li>`).join('')}</ol>
      <p class="value-qualifier">${intent.qualifier}</p>
      <button class="button button-primary value-cta" type="button">${intent.cta}</button>
    </article>`;
    host.querySelector('.value-cta').addEventListener('click', () => {
      track('meet_value_cta_clicked', { intent: intent.id });
      openBooking('value');
    });
  }

  function renderFolder() {
    $('#closed-folder').hidden = page.intent !== 'opportunity';
  }

  function syncBookingLabels() {
    const intent = intentById(page.intent);
    const label = intent ? intent.cta : 'เริ่ม myClover Session';
    $('#sticky-book .button').textContent = label;
  }

  function syncSticky() {
    const sticky = $('#sticky-book');
    const button = sticky.querySelector('button');
    const visible = $('#hero-choose').getBoundingClientRect().bottom < 0 && $('#booking-root').hidden;
    sticky.classList.toggle('is-visible', visible);
    sticky.setAttribute('aria-hidden', String(!visible));
    button.tabIndex = visible ? 0 : -1;
  }

  function initPageInteractions() {
    $('#hero-choose').addEventListener('click', () => $('#choose').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
    $$('[data-book]').forEach(button => button.addEventListener('click', () => openBooking(button.dataset.book || 'page')));

    const accordion = $('#honest-accordion');
    accordion.addEventListener('toggle', event => {
      if (!event.target.open) return;
      accordion.querySelectorAll('details').forEach(item => { if (item !== event.target) item.open = false; });
    }, true);

    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (entry.target.classList.contains('duo-stage')) entry.target.classList.add('is-visible');
      if (entry.target.classList.contains('method-step')) entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: .35 });
    observer.observe($('.duo-stage'));
    $$('.method-step').forEach(step => observer.observe(step));

    const heroAction = $('#hero-choose');
    const stickyObserver = new IntersectionObserver(() => syncSticky());
    stickyObserver.observe(heroAction);
    syncSticky();

    let methodTick = false;
    window.addEventListener('scroll', () => {
      if (methodTick) return;
      methodTick = true;
      requestAnimationFrame(() => {
        const section = $('#method').getBoundingClientRect();
        const travel = Math.max(1, section.height + window.innerHeight * .25);
        const progress = Math.max(0, Math.min(1, (window.innerHeight * .78 - section.top) / travel));
        $('#method').style.setProperty('--method-progress', `${Math.round(progress * 100)}%`);
        methodTick = false;
      });
    }, { passive: true });

    if (!reducedMotion.matches && window.matchMedia('(pointer:fine)').matches) {
      window.addEventListener('pointermove', event => {
        const x = event.clientX / window.innerWidth - .5;
        const y = event.clientY / window.innerHeight - .5;
        root.style.setProperty('--px', `${x * 5}px`);
        root.style.setProperty('--py', `${y * 5}px`);
        root.style.setProperty('--photo-x', `${x * 3}`);
        root.style.setProperty('--photo-y', `${y * 3}`);
        root.style.setProperty('--card-x', `${x * 2}px`);
        root.style.setProperty('--card-y', `${y * 2}px`);
        root.style.setProperty('--folder-x', `${x * 4}`);
        root.style.setProperty('--folder-y', `${y * 4}`);
      }, { passive: true });
    }
  }

  const booking = {
    open: false, step: 0, schedulePart: 'date', intent: null, mode: null, day: null, time: null,
    name: '', contact: '', note: '', consent: false, preparing: false, sending: false,
    done: false, error: '', reference: '', closeConfirm: false, opener: null,
  };

  const MODES = {
    health: [
      { value: 'เจอกัน + Body Check-in', label: 'เจอกัน + Body Check-in', meta: 'Bangkok · 45 นาที' },
      { value: 'ออนไลน์', label: 'ออนไลน์', meta: 'Video call · 25 นาที' },
      { value: 'เจอกันจริง', label: 'เจอกันจริง', meta: 'Bangkok · 45 นาที' },
    ],
    opportunity: [
      { value: 'ออนไลน์', label: 'ออนไลน์', meta: 'Video call · 25 นาที' },
      { value: 'เจอกันจริง', label: 'เจอกันจริง', meta: 'Bangkok · 45 นาที' },
      { value: 'Coffee / Buffet', label: 'Coffee / Buffet', meta: 'คุยกันบนโต๊ะจริง' },
    ],
    curious: [
      { value: 'ออนไลน์', label: 'ออนไลน์', meta: 'Video call · 25 นาที' },
      { value: 'เจอกันจริง', label: 'เจอกันจริง', meta: 'Bangkok · 45 นาที' },
      { value: 'Coffee / Buffet', label: 'Coffee / Buffet', meta: 'คุยกันบนโต๊ะจริง' },
    ],
  };
  const ONLINE_TIMES = ['10:00', '13:30', '16:00', '19:30'];
  const IN_PERSON_TIMES = ['11:00', '14:00', '17:30', '19:00'];

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function requestDates() {
    const dates = [];
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    if (new Date().getHours() >= 18) start.setDate(start.getDate() + 1);
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      dates.push(date);
    }
    return dates;
  }

  function dateParts(value) {
    const date = new Date(`${value}T12:00:00`);
    const parts = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(date);
    const get = type => parts.find(part => part.type === type)?.value || '';
    return { weekday: get('weekday').toUpperCase(), day: get('day'), month: get('month').toUpperCase(), year: get('year') };
  }

  function dateLabel(value, includeYear = true) {
    if (!value) return '';
    const part = dateParts(value);
    return `${part.weekday} ${part.day} ${part.month}${includeYear ? ` ${part.year}` : ''}`;
  }

  function modeLabel(value) {
    const found = Object.values(MODES).flat().find(mode => mode.value === value);
    return found ? `${found.label} · ${found.meta}` : value || '';
  }

  function openBooking(source) {
    booking.open = true;
    booking.opener = document.activeElement;
    booking.step = page.intent ? 1 : 0;
    booking.schedulePart = 'date';
    booking.intent = page.intent;
    booking.mode = null; booking.day = null; booking.time = null;
    booking.name = ''; booking.contact = ''; booking.note = ''; booking.consent = false;
    booking.preparing = false; booking.sending = false; booking.done = false; booking.error = '';
    booking.reference = ''; booking.closeConfirm = false;
    $('#booking-root').hidden = false;
    syncSticky();
    document.body.style.overflow = 'hidden';
    track('meet_booking_opened', { source, intent: booking.intent || 'none' });
    renderBooking();
    window.setTimeout(() => $('#booking-close').focus(), reducedMotion.matches ? 0 : 420);
  }

  function closeBooking(force = false) {
    const hasProgress = booking.day || booking.name.trim() || booking.contact.trim();
    if (!force && hasProgress && !booking.done) {
      booking.closeConfirm = true;
      renderBooking();
      return;
    }
    booking.open = false;
    $('#booking-root').hidden = true;
    document.body.style.overflow = '';
    booking.closeConfirm = false;
    syncSticky();
    if (booking.opener && typeof booking.opener.focus === 'function') booking.opener.focus();
  }

  function setProgress(step) {
    const current = Math.min(4, Math.max(0, step));
    $$('#conversation-progress span').forEach((node, index) => {
      node.classList.toggle('is-done', index < current || booking.done);
      node.classList.toggle('is-current', index === current && !booking.done);
    });
    $('#progress-text').textContent = booking.done ? 'ส่งคำขอนัดเรียบร้อยแล้ว' : `ขั้นตอน ${current + 1} จาก 5`;
  }

  function guideMessage(lines, history = false) {
    const article = document.createElement('article');
    article.className = `message message-guide${history ? ' message-history' : ''}`;
    article.innerHTML = `<div class="message-label"><span class="guide-mark">🍀</span> MYCLOVER SESSION</div><div class="message-body">${lines.map(line => `<p>${line}</p>`).join('')}</div>`;
    return article;
  }

  function visitorMessage(text) {
    const node = document.createElement('div');
    node.className = 'message message-visitor message-history';
    node.textContent = text;
    return node;
  }

  function preparingMessage() {
    const node = document.createElement('div');
    node.className = 'preparing';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-label', 'myClover กำลังเตรียมคำถามถัดไป');
    node.innerHTML = '<span class="preparing-dots" aria-hidden="true"><i></i><i></i><i></i></span> กำลังเตรียมคำถามให้เหมาะกับคุณ';
    return node;
  }

  function choiceButton(label, meta, onClick, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `choice ${className}`.trim();
    button.innerHTML = `<span>${label}${meta ? `<small>${meta}</small>` : ''}</span><b aria-hidden="true">↗</b>`;
    button.addEventListener('click', onClick);
    return button;
  }

  function choices(items, className = '') {
    const set = document.createElement('div');
    set.className = `choice-set ${className}`.trim();
    items.forEach(item => set.appendChild(item));
    return set;
  }

  function pacedAdvance(apply, next) {
    apply();
    booking.preparing = true;
    renderBooking();
    window.setTimeout(() => {
      booking.preparing = false;
      next();
      renderBooking();
    }, reducedMotion.matches ? 20 : 520);
  }

  function appendHistory(thread) {
    thread.appendChild(guideMessage(['ก่อนลงนัด ขอรู้จักคุณนิดหนึ่ง', 'วันนี้อะไรพาคุณมาหาเรา?'], true));
    if (booking.step === 0) return;
    const intent = intentById(booking.intent);
    if (!intent) return;
    thread.appendChild(visitorMessage(intent.label));
    if (booking.step > 0 || booking.preparing) thread.appendChild(guideMessage(intent.ack, true));
    if (!booking.mode) return;
    thread.appendChild(visitorMessage(modeLabel(booking.mode)));
    if (booking.day) thread.appendChild(visitorMessage(dateLabel(booking.day)));
    if (booking.time) thread.appendChild(visitorMessage(`${booking.time} น.`));
    if (booking.name.trim()) thread.appendChild(visitorMessage(`เรียกฉันว่า ${booking.name.trim()} · ติดต่อ ${booking.contact.trim() || 'ยังไม่ระบุ'}`));
  }

  function renderBooking() {
    setProgress(booking.step);
    const conversation = $('#conversation');
    const footer = $('#booking-footer');
    const back = $('#booking-back');
    const next = $('#booking-next');
    conversation.replaceChildren();
    next.hidden = true;
    next.disabled = false;
    next.classList.remove('is-sending');
    footer.hidden = false;
    back.hidden = false;

    const thread = document.createElement('div');
    thread.className = 'thread';
    conversation.appendChild(thread);

    if (booking.closeConfirm) return renderCloseConfirm(thread, footer);
    if (booking.done) return renderSuccess(thread, footer);

    appendHistory(thread);
    if (booking.preparing) {
      thread.appendChild(preparingMessage());
      footer.hidden = true;
      scrollConversation();
      return;
    }

    if (booking.step === 0) renderIntentStep(thread);
    else if (booking.step === 1) renderModeStep(thread);
    else if (booking.step === 2) renderScheduleStep(thread);
    else if (booking.step === 3) renderContactStep(thread, next);
    else renderReviewStep(thread, next);

    back.textContent = booking.step === 0 ? 'ปิด' : 'ย้อนกลับ';
    scrollConversation();
  }

  function renderIntentStep(thread) {
    const buttons = INTENTS.map(intent => choiceButton(intent.label, intent.short, () => {
      pacedAdvance(() => {
        booking.intent = intent.id;
        selectIntent(intent.id, 'booking');
        track('meet_booking_step_completed', { step: 'intent', intent: intent.id });
      }, () => { booking.step = 1; });
    }));
    const set = choices(buttons);
    thread.appendChild(set);
  }

  function renderModeStep(thread) {
    thread.appendChild(guideMessage(['อยากเริ่มเจอกันแบบไหน?']));
    const modes = MODES[booking.intent] || MODES.curious;
    const buttons = modes.map(mode => choiceButton(mode.label, mode.meta, () => {
      pacedAdvance(() => {
        booking.mode = mode.value;
        track('meet_mode_selected', { intent: booking.intent, mode: mode.value });
      }, () => { booking.step = 2; booking.schedulePart = 'date'; });
    }));
    thread.appendChild(choices(buttons));
  }

  function renderScheduleStep(thread) {
    if (booking.schedulePart === 'date' || !booking.day) {
      thread.appendChild(guideMessage(['ช่วงไหนที่คุณอยากเก็บไว้ให้เรา?', 'เวลานี้ยังเป็นคำขอ เราจะติดต่อกลับเพื่อยืนยันอีกครั้ง']));
      const dateButtons = requestDates().map(date => {
        const value = dateKey(date); const part = dateParts(value);
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'choice date-choice';
        button.innerHTML = `<span>${part.weekday}</span><strong>${part.day} ${part.month}</strong><small>${part.year}</small>`;
        button.addEventListener('click', () => pacedAdvance(() => { booking.day = value; }, () => { booking.schedulePart = 'time'; }));
        return button;
      });
      thread.appendChild(choices(dateButtons, 'date-set'));
      return;
    }
    thread.appendChild(guideMessage([`${dateLabel(booking.day)} สะดวกช่วงไหนที่สุด?`]));
    let values = booking.mode === 'ออนไลน์' ? ONLINE_TIMES : IN_PERSON_TIMES;
    if (booking.day === dateKey(new Date())) {
      const now = new Date();
      const cutoff = now.getHours() * 60 + now.getMinutes() + 60;
      values = values.filter(value => {
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute > cutoff;
      });
    }
    const buttons = values.map(value => choiceButton(`${value} น.`, '', () => {
      pacedAdvance(() => {
        booking.time = value;
        track('meet_slot_requested', { intent: booking.intent, day: booking.day, time: value });
      }, () => { booking.step = 3; });
    }));
    thread.appendChild(choices(buttons));
  }

  function field(label, id, value, placeholder, multiline = false) {
    const wrap = document.createElement('label');
    wrap.className = 'field-label'; wrap.htmlFor = id; wrap.textContent = label;
    const input = document.createElement(multiline ? 'textarea' : 'input');
    input.className = 'field'; input.id = id; input.value = value; input.placeholder = placeholder;
    if (multiline) input.maxLength = 200;
    wrap.appendChild(input);
    if (multiline) {
      const meta = document.createElement('span'); meta.className = 'field-meta'; meta.textContent = `${value.length}/200`; wrap.appendChild(meta);
      input.addEventListener('input', () => { meta.textContent = `${input.value.length}/200`; });
    }
    return { wrap, input };
  }

  function renderContactStep(thread, next) {
    thread.appendChild(guideMessage(['อยากให้เราเรียกคุณว่าอะไร?', 'แล้วให้เรายืนยันนัดทางไหนดี?']));
    const card = document.createElement('div'); card.className = 'form-card';
    const name = field('ชื่อที่อยากให้เรียก', 'session-name', booking.name, 'ชื่อเล่นก็ได้');
    const contact = field('LINE หรือเบอร์ที่ติดต่อได้', 'session-contact', booking.contact, '@line / 08x-xxx-xxxx');
    const note = field('มีอะไรที่อยากให้เราเตรียมก่อนไหม?', 'session-note', booking.note, 'ไม่จำเป็นต้องกรอก', true);
    card.append(name.wrap, contact.wrap, note.wrap); thread.appendChild(card);

    const sync = () => {
      booking.name = name.input.value; booking.contact = contact.input.value; booking.note = note.input.value;
      next.disabled = !(booking.name.trim() && booking.contact.trim());
    };
    [name.input, contact.input, note.input].forEach(input => input.addEventListener('input', sync));
    sync();
    next.hidden = false; next.textContent = 'ดูสรุปคำขอนัด';
    next.onclick = () => {
      sync(); if (next.disabled) return;
      booking.step = 4; booking.error = '';
      track('meet_booking_step_completed', { step: 'contact', intent: booking.intent });
      renderBooking();
    };
  }

  function reviewRow(label, value, step) {
    const row = document.createElement('div'); row.className = 'review-row';
    row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'edit-answer'; edit.textContent = 'แก้ไข';
    edit.addEventListener('click', () => {
      booking.step = step; booking.error = '';
      if (step === 0) {
        booking.intent = null; booking.mode = null; booking.day = null; booking.time = null;
      } else if (step === 1) {
        booking.mode = null; booking.day = null; booking.time = null;
      } else if (step === 2) {
        booking.day = null; booking.time = null; booking.schedulePart = 'date';
      }
      renderBooking();
    });
    row.appendChild(edit); return row;
  }

  function renderReviewStep(thread, next) {
    thread.appendChild(guideMessage(['ตรวจอีกครั้ง แล้วเราจะเตรียม myClover Session ให้ตรงกับคุณ']));
    const intent = intentById(booking.intent);
    const card = document.createElement('div'); card.className = 'review-card';
    const title = document.createElement('div'); title.className = 'review-title'; title.textContent = 'YOUR MYCLOVER SESSION';
    card.append(title,
      reviewRow('เรื่อง', intent?.label || '', 0),
      reviewRow('รูปแบบ', modeLabel(booking.mode), 1),
      reviewRow('เวลาที่ขอ', `${dateLabel(booking.day)} · ${booking.time} น.`, 2),
      reviewRow('ติดต่อ', `${booking.name.trim()} · ${booking.contact.trim()}`, 3));
    thread.appendChild(card);

    const consent = document.createElement('label'); consent.className = 'consent';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = booking.consent;
    const copy = document.createElement('span'); copy.textContent = 'ฉันเข้าใจว่านี่เป็นการพูดคุยและข้อมูลเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ และไม่ใช่การรับประกันผลสุขภาพ ผลสอบ หรือรายได้';
    consent.append(checkbox, copy); thread.appendChild(consent);
    if (booking.error) {
      const error = document.createElement('p'); error.className = 'booking-error'; error.setAttribute('role','alert'); error.textContent = `${booking.error} · ข้อมูลที่กรอกยังอยู่`; thread.appendChild(error);
    }

    const sync = () => { booking.consent = checkbox.checked; next.disabled = booking.sending || !booking.consent; };
    checkbox.addEventListener('change', sync);
    next.hidden = false;
    next.textContent = booking.sending ? 'กำลังส่งคำขอ…' : submitLabel(intent?.id);
    next.classList.toggle('is-sending', booking.sending);
    sync();
    next.onclick = submitBooking;
    track('meet_review_viewed', { intent: booking.intent });
  }

  function submitLabel(intent) {
    if (intent === 'health') return 'ส่งคำขอ Body & Routine Session';
    if (intent === 'opportunity') return 'ส่งคำขอ Exam & Care System Session';
    return 'ส่งคำขอ Open Table Session';
  }

  async function submitBooking() {
    if (booking.sending || !booking.consent) return;
    booking.sending = true; booking.error = ''; renderBooking();
    track('meet_request_submitted', { intent: booking.intent, mode: booking.mode });
    try {
      const response = await fetch(BOOKING_ENDPOINT, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: booking.intent, mode: booking.mode, day: booking.day, time: booking.time,
          name: booking.name.trim(), contact: booking.contact.trim(), note: booking.note.trim(), website: '' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'ส่งคำขอนัดไม่สำเร็จ');
      booking.sending = false; booking.done = true; booking.reference = result.reference || '';
      track('meet_request_completed', { intent: booking.intent, mode: booking.mode });
      renderBooking();
    } catch (error) {
      booking.sending = false; booking.error = error.message || 'ส่งคำขอนัดไม่สำเร็จ';
      track('meet_request_failed', { intent: booking.intent });
      renderBooking();
    }
  }

  function renderSuccess(thread, footer) {
    setProgress(5); footer.hidden = true;
    const intent = intentById(booking.intent);
    const success = document.createElement('section'); success.className = 'success';
    success.innerHTML = '<div class="success-clover" aria-hidden="true"><span></span><span></span><span></span><span></span></div><h3 class="display">ได้รับคำขอนัดแล้ว 🍀</h3><p>เราจะติดต่อกลับเพื่อยืนยันเวลาอีกครั้ง</p>';
    const card = document.createElement('div'); card.className = 'review-card';
    const title = document.createElement('div'); title.className = 'review-title'; title.textContent = booking.reference || 'MYCLOVER SESSION';
    card.append(title,
      plainReviewRow('เรื่อง', intent?.label || ''), plainReviewRow('รูปแบบ', modeLabel(booking.mode)),
      plainReviewRow('เวลาที่ขอ', `${dateLabel(booking.day)} · ${booking.time} น.`), plainReviewRow('ติดต่อกลับ', booking.contact.trim()));
    const close = document.createElement('button'); close.type = 'button'; close.className = 'button button-primary'; close.style.marginTop = '1.2rem'; close.textContent = 'ปิด'; close.addEventListener('click', () => closeBooking(true));
    success.append(card, close); thread.appendChild(success);
  }

  function plainReviewRow(label, value) {
    const row = document.createElement('div'); row.className = 'review-row'; row.innerHTML = `<span>${label}</span><strong>${value}</strong>`; return row;
  }

  function renderCloseConfirm(thread, footer) {
    footer.hidden = true;
    const box = document.createElement('div'); box.className = 'exit-confirm';
    box.innerHTML = '<p>ออกจากการลงนัดตอนนี้ไหม? คำตอบที่กรอกไว้จะถูกล้าง</p><div class="exit-actions"></div>';
    const stay = document.createElement('button'); stay.type = 'button'; stay.className = 'button button-primary'; stay.textContent = 'กลับไปลงนัดต่อ';
    stay.addEventListener('click', () => { booking.closeConfirm = false; renderBooking(); });
    const leave = document.createElement('button'); leave.type = 'button'; leave.className = 'button button-quiet'; leave.textContent = 'ออกจากหน้านี้';
    leave.addEventListener('click', () => closeBooking(true));
    box.querySelector('.exit-actions').append(stay, leave); thread.appendChild(box);
  }

  function scrollConversation() {
    requestAnimationFrame(() => { const area = $('#conversation'); area.scrollTop = area.scrollHeight; });
  }

  function bookingBack() {
    if (booking.done) return closeBooking(true);
    if (booking.step === 0) return closeBooking();
    booking.error = '';
    if (booking.step === 2 && booking.schedulePart === 'time') {
      booking.day = null; booking.time = null; booking.schedulePart = 'date';
    } else {
      if (booking.step === 1) {
        booking.intent = null; booking.mode = null; booking.day = null; booking.time = null;
      } else if (booking.step === 2) {
        booking.mode = null; booking.day = null; booking.time = null;
      } else if (booking.step === 3) {
        booking.time = null;
      }
      booking.step -= 1;
      if (booking.step === 2) booking.schedulePart = booking.day ? 'time' : 'date';
    }
    renderBooking();
  }

  function initBooking() {
    $('#booking-close').addEventListener('click', () => closeBooking());
    $('#booking-scrim').addEventListener('click', () => closeBooking());
    $('#booking-back').addEventListener('click', bookingBack);
    window.addEventListener('keydown', event => { if (event.key === 'Escape' && booking.open) closeBooking(); });
  }

  renderIntentSelector();
  renderValue();
  renderFolder();
  syncBookingLabels();
  initPageInteractions();
  initBooking();
  track('meet_view');
})();
