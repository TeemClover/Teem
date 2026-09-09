/* myClover Session — editorial landing + conversational booking */
(() => {
  'use strict';

  const BOOKING_ENDPOINT = '/api/meet';
  /* editable settings — safe to change without touching logic below */
  const CONFIG = {
    lineUrl: '',                       // e.g. 'https://lin.ee/xxxxxxx' — leave '' to hide LINE shortcuts
    replyWindow: 'ภายใน 24 ชม.',
    draftKey: 'myclover.meet.draft.v1',
  };
  const FLEXIBLE_DAY = 'flexible';
  const FLEXIBLE_TIME = 'เวลาไหนก็ได้';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.querySelector('#session-root');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const entryParams = new URLSearchParams(window.location.search);
  const entryValue = (key, value) => entryParams.getAll(key).length === 1 && entryParams.get(key) === value;
  const compassEntry = entryValue('entry', 'compass');
  const compassOpportunityEntry = compassEntry && entryValue('intent', 'opportunity');
  const OPPORTUNITY_NEEDS = Object.freeze({ 'first-test': 'ลองก้าวแรกให้เห็นภาพ', partner: 'คุยเรื่องหาคนร่วมทำ', mentor: 'คุยกับคนที่ช่วยมองทางได้' });
  const OPPORTUNITY_OFFERS = Object.freeze({ skill: 'ทักษะที่มี', time: 'เวลาที่พร้อมลอง', project: 'โครงการที่กำลังทำ' });
  const boundedValue = (registry, value) => typeof value === 'string' && Object.hasOwn(registry, value) ? value : null;
  const entryOpportunityNeed = compassOpportunityEntry && entryParams.getAll('need').length === 1 ? boundedValue(OPPORTUNITY_NEEDS, entryParams.get('need')) : null;
  const entryOpportunityOffer = compassOpportunityEntry && entryParams.getAll('offer').length === 1 ? boundedValue(OPPORTUNITY_OFFERS, entryParams.get('offer')) : null;
  const xircleEntry = entryValue('intent', 'health') && entryValue('from', 'xircle');
  const openXircleBooking = xircleEntry && entryValue('open', 'booking');
  const HEALTH_FOCUS = Object.freeze({ sleep: 'การพัก', move: 'การขยับ', food: 'การกิน' });
  const validHealthFocus = value => typeof value === 'string' && Object.hasOwn(HEALTH_FOCUS, value);
  const entryHealthFocus = xircleEntry && entryParams.getAll('focus').length === 1 && validHealthFocus(entryParams.get('focus'))
    ? entryParams.get('focus') : null;
  let pendingXircleDraft = null;

  const INTENTS = [
    {
      id: 'ai', label: 'เรียนและใช้ AI', short: 'จากสิ่งที่อยากทำ ไปถึงวิธีเรียนที่เหมาะกับคุณ',
      kicker: 'AI WITH TEEM', head: 'เอางานที่อยากทำ มาคุยว่าจะใช้ AI ช่วยตรงไหน',
      outcomes: [
        'เริ่มจากงานและเป้าหมายของคุณ แล้วคุยขอบเขตที่อยากทำให้ได้',
        'เลือกได้ทั้งเรียน 1–1 / Executive coaching หรือเวิร์กช็อปให้ทีมและองค์กร',
        'คุยเรื่องคอร์สย่อยของทีม หรือให้ช่วยแนะนำคอร์ส Pi R Academy ที่ตรงกับคุณ',
      ],
      qualifier: 'นี่คือคำขอคุยเรื่องการเรียน เรายืนยันขอบเขต เวลา และค่าเรียนกับคุณก่อนตัดสินใจ',
      cta: 'คุยกับทีมเรื่อง AI',
      ack: ['เอาสิ่งที่อยากทำด้วย AI มาคุยกับทีมได้', 'เราจะคุยเป้าหมายและรูปแบบการเรียนก่อนยืนยันขอบเขต เวลา และค่าเรียน'],
      color: '#4f8cff', icon: 'path',
    },
    {
      id: 'health', label: 'สุขภาพและ Routine', short: 'อยากรู้จักร่างกายและสิ่งที่ทำได้จริง',
      kicker: 'XIRCLE SCALE → HEALTH PLAN', head: 'วัดให้เห็นก่อน แล้วเลือกจุดเริ่มที่ทำได้จริง',
      outcomes: [
        'วัดองค์ประกอบร่างกายด้วย Xircle Scale และอ่าน baseline ให้เข้าใจง่าย',
        'เชื่อมข้อมูลกับ Eat · Move · Sleep และ Routine ที่เกิดขึ้นจริงในชีวิตคุณ',
        'กลับไปพร้อม 1–2 จุดเริ่มที่ทำได้ทันที และมีค่าไว้เทียบครั้งต่อไป',
      ],
      qualifier: 'ไม่ต้องซื้อผลิตภัณฑ์เพื่อมาวัดและวางแผนกับเรา',
      cta: 'นัด Xircle Body Check-in',
      ack: ['เราจะเริ่มจากข้อมูลร่างกายจริงของคุณ ไม่ใช่การเดา', 'แล้วช่วยกันเลือกเพียง 1–2 จุดที่เหมาะกับชีวิตจริงและเริ่มได้ทันที'],
      color: '#287354', icon: 'body',
    },
    {
      id: 'opportunity', label: 'ต่อยอดเป็นธุรกิจ', short: 'อยากรู้ว่าเราช่วยต่อยอดเส้นทางนี้ยังไง',
      kicker: 'SERVICE → BUSINESS', head: 'เริ่มจากการดูแลคนให้ดี แล้วค่อยต่อยอดเป็นงาน',
      outcomes: [
        'เห็นก่อนว่าคุณอยากช่วยใคร และบริการแบบไหนที่เหมาะกับคุณ',
        'ถ้าอยากต่อยอดเป็นอาชีพ เราช่วยวางเส้นทางและเตรียมสอบใบอนุญาตให้',
        'มีเครื่องมือ Routine และระบบดูแลต่อเนื่องให้ใช้หลังเริ่มต้น ไม่ต้องเริ่มจากการขาย',
      ],
      qualifier: 'บริการและคุณค่าที่คุณให้คนคือแกนหลัก ธุรกิจเป็นทางเลือก ไม่ใช่เงื่อนไขของการมาเจอเรา',
      cta: 'นัดคุยเรื่องการต่อยอด',
      ack: ['ถ้าคุณอยากต่อยอด เราจะเริ่มจากการดูแลคนและคุณค่าที่คุณอยากสร้างก่อน', 'จากนั้นค่อยเปิดให้ดูเส้นทางเตรียมสอบ เครื่องมือ Routine และระบบสนับสนุนที่มีให้ใช้'],
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

  if (xircleEntry) {
    root.dataset.entry = 'xircle';
    Object.assign(INTENTS.find(intent => intent.id === 'health'), {
      kicker: 'XIRCLE · TEAM + AKO',
      head: 'ดูข้อมูล XIRCLE และกิจวัตรกับทีม + เอโกะ',
      outcomes: [
        'ดูแนวโน้มจากข้อมูลที่คุณสะดวกแชร์',
        'ต่อข้อมูลกับสิ่งที่เกิดขึ้นจริงในชีวิตคุณ',
        'เลือกหนึ่งก้าวที่พอลองทำได้ หรือคุยเรื่องเริ่มใช้ XIRCLE',
      ],
      qualifier: 'มีแอปแล้ว หรือยังไม่มี ก็นัดเริ่มต้นได้ · Session แรกไม่มีค่าใช้จ่าย',
      cta: 'นัดดูข้อมูลกับทีม + เอโกะ',
      ack: ['ดูข้อมูล XIRCLE และกิจวัตรกับทีม + เอโกะ', 'มีแอปแล้ว หรือยังไม่มี ก็นัดเริ่มต้นได้'],
    });
  }
  const legacyOpportunity = { ...INTENTS.find(intent => intent.id === 'opportunity') };
  function useCompassOpportunity(enabled = true) {
    if (!enabled) {
      delete root.dataset.opportunity;
      Object.assign(INTENTS.find(intent => intent.id === 'opportunity'), legacyOpportunity);
      return;
    }
    root.dataset.opportunity = 'compass';
    Object.assign(INTENTS.find(intent => intent.id === 'opportunity'), {
      label: 'คุยเรื่องโอกาสและคนร่วมทาง', short: 'เริ่มจากสิ่งที่คุณมี และสิ่งที่อยากลอง',
      kicker: 'ONE POSSIBLE NEXT STEP', head: 'เอาสิ่งที่มี มาดูว่าต่อยอดทางไหนได้บ้าง',
      outcomes: [
        'คุยสิ่งที่อยากลอง คู่กับทักษะ เวลา หรือโครงการที่คุณมี',
        'ช่วยกันเลือกก้าวเล็กๆ ที่พอทดสอบได้ก่อนลงทุนมากขึ้น',
        'ถ้ามีคนหรือความรู้ในเครือข่ายที่เข้ากัน ค่อยคุยความเป็นไปได้ในการแนะนำ',
      ],
      qualifier: 'เริ่มจากการคุยให้เห็นความเหมาะสม ยังไม่ได้ยืนยันรายได้ งาน หรือการจับคู่กับใคร',
      cta: 'นัดคุยเรื่องก้าวถัดไป',
      ack: ['เอาสิ่งที่คุณมี กับสิ่งที่อยากลอง มาคุยกันได้', 'เราจะเริ่มจากความเหมาะสมและก้าวที่ลองได้จริง แล้วค่อยดูว่ามีอะไรหรือใครที่ช่วยต่อได้'],
    });
  }
  if (compassOpportunityEntry) useCompassOpportunity();
  function compassReturnLink(className = 'button button-quiet') {
    const link = document.createElement('a'); link.href = '/frontdoor/'; link.className = className;
    link.textContent = 'กลับไปที่เข็มทิศ'; return link;
  }
  if (compassEntry) {
    const brand = $('.brand-lockup');
    brand.href = '/frontdoor/'; brand.setAttribute('aria-label', 'myClover — กลับไปที่เข็มทิศ');
    $('#ready').appendChild(compassReturnLink());
  }

  const ICONS = {
    body: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M7 20c.5-5 2.2-7 5-7s4.5 2 5 7"/><path d="M4 12h3m10 0h3"/></svg>',
    path: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19c1-7 4-11 9-11h5"/><path d="m15 4 4 4-4 4"/><circle cx="5" cy="19" r="2"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 6v12M6 12h12"/></svg>',
  };

  const AI_TOPICS = [
    { id: 'private', label: 'เรียน 1–1 / Executive coaching', detail: 'ให้เข้ากับงานและเป้าหมายของคุณ' },
    { id: 'team', label: 'เวิร์กช็อปทีม / องค์กร', detail: 'คุยโจทย์และการใช้ AI ร่วมกันในทีม' },
    { id: 'course', label: 'คอร์สย่อยของทีม', detail: 'อยากเรียนเรื่องหนึ่งให้ทำได้จริง' },
    { id: 'academy', label: 'แนะนำคอร์ส Pi R Academy', detail: 'ให้ช่วยเลือกคอร์สที่เหมาะกับพื้นฐานและเป้าหมาย' },
    { id: 'explore', label: 'ช่วยเลือกวิธีเรียน AI', detail: 'ยังไม่ต้องรู้ว่าจะเรียนแบบไหน' },
  ];
  const aiTopicById = id => AI_TOPICS.find(topic => topic.id === id) || null;
  const page = { intent: null, aiTopic: null };
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
    $('#closed-folder').hidden = page.intent !== 'opportunity' || root.dataset.opportunity === 'compass';
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
    open: false, step: 0, schedulePart: 'date', scheduleWeek: null, intent: null, aiTopic: null, healthFocus: null, mode: null, day: null, time: null,
    opportunityContext: false, opportunityNeed: null, opportunityOffer: null,
    name: '', contact: '', note: '', consent: false, preparing: false, sending: false,
    done: false, error: '', reference: '', closeConfirm: false, opener: null,
  };

  const MODES = {
    ai: [
      { value: 'ออนไลน์', label: 'ออนไลน์', meta: 'ขอเวลาคุยผ่าน Video call' },
      { value: 'เจอกันจริง', label: 'เจอกันจริง', meta: 'คุยสถานที่และเวลาร่วมกัน' },
    ],
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

  function localNoon(date = new Date()) {
    const copy = new Date(date);
    copy.setHours(12, 0, 0, 0);
    return copy;
  }

  function addDays(date, amount) {
    const copy = localNoon(date);
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function timesForMode(mode = booking.mode) {
    return mode === 'ออนไลน์' ? ONLINE_TIMES : IN_PERSON_TIMES;
  }

  function availableTimesForDate(date) {
    let values = timesForMode().slice();
    if (dateKey(date) === dateKey(new Date())) {
      const now = new Date();
      const cutoff = now.getHours() * 60 + now.getMinutes() + 60;
      values = values.filter(value => {
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute > cutoff;
      });
    }
    return values;
  }

  function requestDates() {
    const dates = [];
    const start = localNoon();
    for (let index = 0; index < 14; index += 1) {
      const date = addDays(start, index);
      if (index === 0 && availableTimesForDate(date).length === 0) continue;
      dates.push(date);
    }
    return dates;
  }

  function weekStart(date) {
    const copy = localNoon(date);
    const mondayOffset = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - mondayOffset);
    return copy;
  }

  function thaiShortDate(date) {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }

  function thaiDayName(date) {
    return new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(date);
  }

  function thaiCompactDate(date) {
    return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(date);
  }

  function weekRangeLabel(dates) {
    if (!dates.length) return '';
    return `${thaiCompactDate(dates[0])} – ${thaiCompactDate(dates[dates.length - 1])}`;
  }

  function scheduleGroups() {
    const today = localNoon();
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);
    const dates = requestDates();
    const byKey = new Map(dates.map(date => [dateKey(date), date]));
    const direct = [
      { label: 'วันนี้', date: byKey.get(dateKey(today)) },
      { label: 'พรุ่งนี้', date: byKey.get(dateKey(tomorrow)) },
      { label: 'มะรืนนี้', date: byKey.get(dateKey(dayAfter)) },
    ].filter(item => item.date);

    const thisWeekStart = weekStart(today);
    const nextWeekStart = addDays(thisWeekStart, 7);
    const afterNextWeek = addDays(nextWeekStart, 7);
    const later = dates.filter(date => date > dayAfter);
    const thisWeek = later.filter(date => date >= thisWeekStart && date < nextWeekStart);
    const nextWeek = later.filter(date => date >= nextWeekStart && date < afterNextWeek);
    return { direct, thisWeek, nextWeek };
  }

  function dateParts(value) {
    const date = new Date(`${value}T12:00:00`);
    const parts = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(date);
    const get = type => parts.find(part => part.type === type)?.value || '';
    return { weekday: get('weekday').toUpperCase(), day: get('day'), month: get('month').toUpperCase(), year: get('year') };
  }

  function dateLabel(value, includeYear = true) {
    if (!value) return '';
    if (value === FLEXIBLE_DAY) return 'วันไหนก็ได้ (ให้เราเสนอมา)';
    const part = dateParts(value);
    return `${part.weekday} ${part.day} ${part.month}${includeYear ? ` ${part.year}` : ''}`;
  }

  function modeLabel(value) {
    const found = (MODES[booking.intent] || Object.values(MODES).flat()).find(mode => mode.value === value);
    if (found && booking.intent === 'opportunity' && booking.opportunityContext) return `${found.label} · คุยเวลาและรายละเอียดร่วมกัน`;
    return found ? `${found.label} · ${found.meta}` : value || '';
  }

  function openBooking(source) {
    booking.open = true;
    booking.opener = document.activeElement;
    booking.step = page.intent ? 1 : 0;
    booking.schedulePart = 'date';
    booking.scheduleWeek = null;
    booking.intent = page.intent;
    booking.aiTopic = page.intent === 'ai' ? page.aiTopic : null;
    booking.healthFocus = source !== 'draft' && page.intent === 'health' ? entryHealthFocus : null;
    booking.opportunityContext = source !== 'draft' && page.intent === 'opportunity' && compassOpportunityEntry;
    booking.opportunityNeed = booking.opportunityContext ? entryOpportunityNeed : null;
    booking.opportunityOffer = booking.opportunityContext ? entryOpportunityOffer : null;
    if (booking.intent === 'opportunity' && source !== 'draft') useCompassOpportunity(booking.opportunityContext);
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

  function dateChoiceButton(date) {
    const value = dateKey(date);
    const part = dateParts(value);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice date-choice';
    button.innerHTML = `<span>${part.weekday}</span><strong>${part.day} ${part.month}</strong><small>${part.year}</small>`;
    button.setAttribute('aria-label', `${thaiDayName(date)} ${thaiCompactDate(date)}`);
    button.addEventListener('click', () => pacedAdvance(() => {
      booking.day = value;
      booking.scheduleWeek = null;
    }, () => { booking.schedulePart = 'time'; }));
    return button;
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
    if (!(xircleEntry && booking.intent === 'health' && booking.step > 0)) {
      thread.appendChild(guideMessage(['ก่อนลงนัด ขอรู้จักคุณนิดหนึ่ง', 'วันนี้อะไรพาคุณมาหาเรา?'], true));
    }
    if (booking.step === 0) return;
    const intent = intentById(booking.intent);
    if (!intent) return;
    thread.appendChild(visitorMessage(intent.label));
    if (booking.intent === 'ai' && aiTopicById(booking.aiTopic)) thread.appendChild(visitorMessage(aiTopicById(booking.aiTopic).label));
    if (booking.intent === 'opportunity' && booking.opportunityContext) {
      const details = [OPPORTUNITY_NEEDS[booking.opportunityNeed], OPPORTUNITY_OFFERS[booking.opportunityOffer]].filter(Boolean);
      if (details.length) thread.appendChild(visitorMessage(details.join(' · ')));
    }
    if (booking.step > 0 || booking.preparing) {
      const focus = booking.intent === 'health' && validHealthFocus(booking.healthFocus) ? HEALTH_FOCUS[booking.healthFocus] : null;
      thread.appendChild(guideMessage(focus ? [`จากที่คุณอยากเริ่มดูแลเรื่อง${focus} มาคุยต่อกับทีม + เอโกะได้`, intent.ack[1]] : intent.ack, true));
    }
    if (!booking.mode) return;
    thread.appendChild(visitorMessage(modeLabel(booking.mode)));
    if (booking.day) thread.appendChild(visitorMessage(dateLabel(booking.day)));
    if (booking.time) thread.appendChild(visitorMessage(booking.time === FLEXIBLE_TIME ? FLEXIBLE_TIME : `${booking.time} น.`));
    if (booking.name.trim()) thread.appendChild(visitorMessage(`เรียกฉันว่า ${booking.name.trim()} · ติดต่อ ${booking.contact.trim() || 'ยังไม่ระบุ'}`));
  }

  function renderBooking() {
    setProgress(booking.step);
    saveDraft();
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
    if (pendingXircleDraft) return renderXircleDraftChoice(thread, footer);

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
        booking.aiTopic = intent.id === 'ai' ? page.aiTopic : null;
        if (intent.id !== 'health') booking.healthFocus = null;
        if (intent.id !== 'opportunity') { booking.opportunityContext = false; booking.opportunityNeed = null; booking.opportunityOffer = null; }
        else if (compassOpportunityEntry && !booking.opportunityContext) {
          booking.opportunityContext = true; booking.opportunityNeed = entryOpportunityNeed; booking.opportunityOffer = entryOpportunityOffer;
        }
        selectIntent(intent.id, 'booking');
        track('meet_booking_step_completed', { step: 'intent', intent: intent.id });
      }, () => { booking.step = 1; });
    }));
    const set = choices(buttons);
    thread.appendChild(set);
  }

  function renderModeStep(thread) {
    if (booking.intent === 'ai') {
      if (!aiTopicById(booking.aiTopic)) {
        thread.appendChild(guideMessage(['อยากคุยเรื่องการเรียนแบบไหน?']));
        thread.appendChild(choices(AI_TOPICS.map(topic => choiceButton(topic.label, topic.detail, () => {
          booking.aiTopic = topic.id;
          renderBooking();
        }))));
        return;
      }
      const change = document.createElement('button');
      change.type = 'button'; change.className = 'edit-answer'; change.textContent = 'เปลี่ยนเรื่องที่อยากคุยเกี่ยวกับ AI';
      change.addEventListener('click', () => { booking.aiTopic = null; renderBooking(); });
      thread.appendChild(change);
    }
    thread.appendChild(guideMessage(['อยากเริ่มเจอกันแบบไหน?']));
    const modes = MODES[booking.intent] || MODES.curious;
    const buttons = modes.map(mode => choiceButton(mode.label,
      xircleEntry && booking.intent === 'health' && mode.value === 'ออนไลน์'
        ? '25 นาที · เปิดข้อมูลที่คุณสะดวกแชร์ แล้วคุยเรื่องกิจวัตรด้วยกัน'
        : booking.intent === 'opportunity' && booking.opportunityContext ? 'คุยเวลาและรายละเอียดร่วมกัน' : mode.meta, () => {
      pacedAdvance(() => {
        booking.mode = mode.value;
        booking.scheduleWeek = null;
        track('meet_mode_selected', { intent: booking.intent, mode: mode.value });
      }, () => { booking.step = 2; booking.schedulePart = 'date'; });
    }));
    thread.appendChild(choices(buttons));
  }

  function renderScheduleStep(thread) {
    if (booking.schedulePart === 'date') {
      thread.appendChild(guideMessage(['อยากเจอกันเมื่อไหร่?', booking.intent === 'ai' ? 'เลือกเวลาที่คุณสะดวกก่อน เรายังต้องติดต่อกลับเพื่อยืนยันเวลาคุย' : 'เราจะโชว์เฉพาะวันที่ยังมีช่วงเวลาที่เป็นไปได้จากเวลาในเครื่องนี้']));
      const groups = scheduleGroups();
      const buttons = groups.direct.map(item => choiceButton(item.label, thaiShortDate(item.date), () => {
        pacedAdvance(() => {
          booking.day = dateKey(item.date);
          booking.scheduleWeek = null;
        }, () => { booking.schedulePart = 'time'; });
      }));
      if (groups.thisWeek.length || groups.nextWeek.length) {
        buttons.push(choiceButton('หลังจากนั้น', 'เลือกสัปดาห์ก่อน แล้วค่อยเลือกวัน', () => {
          booking.schedulePart = 'week';
          booking.scheduleWeek = null;
          track('meet_later_dates_opened', { intent: booking.intent });
          renderBooking();
        }));
      }
      thread.appendChild(choices(buttons, 'date-near-set'));
      thread.appendChild(choices([choiceButton('วันไหนก็ได้', 'ให้เราเสนอเวลาที่ว่างให้', () => {
        pacedAdvance(() => {
          booking.day = FLEXIBLE_DAY;
          booking.scheduleWeek = null;
          track('meet_flexible_day_selected', { intent: booking.intent });
        }, () => { booking.schedulePart = 'time'; });
      }, 'choice-soft')]));
      return;
    }

    if (booking.schedulePart === 'week') {
      thread.appendChild(guideMessage(['หลังจากนั้น อยากดูช่วงไหน?', 'เลือกสัปดาห์ก่อน จะได้ไม่ต้องเห็นวันยาว ๆ ทีเดียว']));
      const groups = scheduleGroups();
      const buttons = [];
      if (groups.thisWeek.length) {
        buttons.push(choiceButton('สัปดาห์นี้', weekRangeLabel(groups.thisWeek), () => {
          booking.scheduleWeek = 'this';
          booking.schedulePart = 'week-day';
          renderBooking();
        }));
      }
      if (groups.nextWeek.length) {
        buttons.push(choiceButton('สัปดาห์หน้า', weekRangeLabel(groups.nextWeek), () => {
          booking.scheduleWeek = 'next';
          booking.schedulePart = 'week-day';
          renderBooking();
        }));
      }
      if (!buttons.length) {
        booking.schedulePart = 'date';
        booking.scheduleWeek = null;
        return renderScheduleStep(thread);
      }
      thread.appendChild(choices(buttons));
      return;
    }

    if (booking.schedulePart === 'week-day') {
      const groups = scheduleGroups();
      const dates = booking.scheduleWeek === 'this' ? groups.thisWeek : groups.nextWeek;
      if (!dates.length) {
        booking.schedulePart = 'week';
        booking.scheduleWeek = null;
        return renderScheduleStep(thread);
      }
      thread.appendChild(guideMessage([booking.scheduleWeek === 'this' ? 'สัปดาห์นี้ วันไหนสะดวก?' : 'สัปดาห์หน้า วันไหนสะดวก?', 'เลือกวันก่อน แล้วค่อยเลือกเวลา']));
      thread.appendChild(choices(dates.map(dateChoiceButton), 'date-set'));
      return;
    }

    thread.appendChild(guideMessage([booking.day === FLEXIBLE_DAY ? 'ปกติสะดวกช่วงไหนของวัน?' : `${dateLabel(booking.day)} สะดวกช่วงไหนที่สุด?`]));
    let values = booking.day === FLEXIBLE_DAY
      ? timesForMode().slice()
      : availableTimesForDate(new Date(`${booking.day}T12:00:00`));
    const buttons = values.map(value => choiceButton(`${value} น.`, '', () => {
      pacedAdvance(() => {
        booking.time = value;
        track('meet_slot_requested', { intent: booking.intent, day: booking.day, time: value });
      }, () => { booking.step = 3; });
    }));
    buttons.push(choiceButton(FLEXIBLE_TIME, 'ให้เราเสนอเวลาให้', () => {
      pacedAdvance(() => {
        booking.time = FLEXIBLE_TIME;
        track('meet_flexible_time_selected', { intent: booking.intent });
      }, () => { booking.step = 3; });
    }, 'choice-soft'));
    thread.appendChild(choices(buttons));
  }

  function slotLabel() {
    if (booking.time === FLEXIBLE_TIME) return `${dateLabel(booking.day)} · ${FLEXIBLE_TIME}`;
    return `${dateLabel(booking.day)} · ${booking.time} น.`;
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
    if (booking.intent === 'health' && (xircleEntry || validHealthFocus(booking.healthFocus))) {
      const focus = document.createElement('label'); focus.className = 'field-label';
      const caption = document.createElement('span'); caption.textContent = 'จุดเริ่มที่อยากคุย';
      const select = document.createElement('select'); select.id = 'session-health-focus'; select.className = 'field';
      select.setAttribute('aria-label', 'จุดเริ่มที่อยากคุย');
      for (const [value, label] of [['', 'ยังไม่ระบุ'], ...Object.entries(HEALTH_FOCUS)]) {
        const option = document.createElement('option'); option.value = value; option.textContent = label; select.appendChild(option);
      }
      select.value = validHealthFocus(booking.healthFocus) ? booking.healthFocus : '';
      select.addEventListener('change', () => { booking.healthFocus = validHealthFocus(select.value) ? select.value : null; });
      focus.append(caption, select); card.appendChild(focus);
    }
    if (booking.intent === 'opportunity' && booking.opportunityContext) {
      for (const [key, label, registry] of [
        ['opportunityNeed', 'สิ่งที่อยากคุยต่อ', OPPORTUNITY_NEEDS],
        ['opportunityOffer', 'สิ่งที่คุณพร้อมนำมาลอง', OPPORTUNITY_OFFERS],
      ]) {
        const wrap = document.createElement('label'); wrap.className = 'field-label'; wrap.textContent = label;
        const select = document.createElement('select'); select.className = 'field'; select.id = `session-${key}`;
        for (const [value, text] of [['', 'ยังไม่ระบุ'], ...Object.entries(registry)]) {
          const option = document.createElement('option'); option.value = value; option.textContent = text; select.appendChild(option);
        }
        select.value = boundedValue(registry, booking[key]) || '';
        select.addEventListener('change', () => { booking[key] = boundedValue(registry, select.value); });
        wrap.appendChild(select); card.appendChild(wrap);
      }
    }
    if (CONFIG.lineUrl) {
      const shortcut = document.createElement('a');
      shortcut.className = 'button button-quiet line-shortcut';
      shortcut.href = CONFIG.lineUrl; shortcut.target = '_blank'; shortcut.rel = 'noopener noreferrer';
      shortcut.textContent = 'เพิ่มเราใน LINE แล้วทักได้เลย';
      shortcut.addEventListener('click', () => track('meet_line_shortcut_clicked', { step: 'contact' }));
      thread.appendChild(shortcut);
    }

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
    const row = plainReviewRow(label, value);
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'edit-answer'; edit.textContent = 'แก้ไข';
    edit.addEventListener('click', () => {
      booking.step = step; booking.error = '';
      if (step === 0) {
        booking.intent = null; booking.mode = null; booking.day = null; booking.time = null; booking.scheduleWeek = null;
      } else if (step === 1) {
        booking.mode = null; booking.day = null; booking.time = null; booking.scheduleWeek = null;
      } else if (step === 2) {
        booking.day = null; booking.time = null; booking.schedulePart = 'date'; booking.scheduleWeek = null;
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
      reviewRow('เรื่อง', bookingIntentLabel(), 0),
      reviewRow('รูปแบบ', modeLabel(booking.mode), 1),
      reviewRow('เวลาที่ขอ', slotLabel(), 2),
      reviewRow('ติดต่อ', `${booking.name.trim()} · ${booking.contact.trim()}`, 3));
    if (booking.intent === 'health' && validHealthFocus(booking.healthFocus)) card.appendChild(reviewRow('จุดเริ่มที่อยากคุย', HEALTH_FOCUS[booking.healthFocus], 3));
    if (booking.intent === 'opportunity' && booking.opportunityContext) {
      card.append(reviewRow('สิ่งที่อยากคุยต่อ', OPPORTUNITY_NEEDS[booking.opportunityNeed] || 'ยังไม่ระบุ', 3), reviewRow('สิ่งที่พร้อมนำมาลอง', OPPORTUNITY_OFFERS[booking.opportunityOffer] || 'ยังไม่ระบุ', 3));
    }
    thread.appendChild(card);

    const consent = document.createElement('label'); consent.className = 'consent';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = booking.consent;
    const copy = document.createElement('span'); copy.textContent = booking.intent === 'ai'
      ? 'ฉันต้องการให้ติดต่อกลับเรื่องการเรียน AI และเข้าใจว่ายังต้องยืนยันขอบเขต เวลา และค่าเรียนก่อนตัดสินใจ'
      : booking.intent === 'opportunity' && booking.opportunityContext
        ? 'ฉันต้องการให้ติดต่อกลับเพื่อคุยความเป็นไปได้ และเข้าใจว่ายังไม่มีการยืนยันงาน รายได้ หรือคนร่วมทำ'
        : 'ฉันเข้าใจว่านี่เป็นการพูดคุยและข้อมูลเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ และไม่ใช่การรับประกันผลสุขภาพ ผลสอบ หรือรายได้';
    consent.append(checkbox, copy); thread.appendChild(consent);
    if (booking.error) {
      const error = document.createElement('p'); error.className = 'booking-error'; error.setAttribute('role','alert'); error.textContent = `${booking.error} · ข้อมูลที่กรอกยังอยู่`; thread.appendChild(error);
    }

    const risk = document.createElement('p'); risk.className = 'booking-risk';
    risk.textContent = booking.intent === 'ai' ? 'การส่งคำขอนี้ยังไม่ใช่การซื้อหรือยืนยันที่นั่งเรียน' : 'ไม่มีค่าใช้จ่าย · ไม่ต้องซื้ออะไร · เลื่อนหรือยกเลิกได้';
    if (booking.intent === 'opportunity' && booking.opportunityContext) risk.textContent = 'ส่งเรื่องที่อยากคุยไว้ก่อน ทีมจะติดต่อกลับเพื่อยืนยันเวลาและขอบเขต';
    if (document.querySelector('meta[name="meet-environment"]')?.content === 'local') risk.textContent = 'รุ่นทดลอง · คำขอนี้เก็บบนเครื่องนี้เท่านั้น ไม่มีการส่งนัดจริง';
    thread.appendChild(risk);

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
    if (xircleEntry && intent === 'health') return 'ส่งคำขอนัดดูข้อมูลกับทีม + เอโกะ';
    if (intent === 'ai') return 'ส่งคำขอคุยเรื่อง AI';
    if (intent === 'health') return 'ส่งคำขอ Xircle Body Check-in';
    if (intent === 'opportunity') return 'ส่งคำขอคุยเรื่องการต่อยอด';
    return 'ส่งคำขอ Open Table Session';
  }

  async function submitBooking() {
    if (booking.sending || !booking.consent) return;
    booking.sending = true; booking.error = ''; renderBooking();
    track('meet_request_submitted', { intent: booking.intent, mode: booking.mode });
    try {
      const response = await fetch(BOOKING_ENDPOINT, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: booking.intent, ...(booking.intent === 'ai' ? { topic: booking.aiTopic || 'explore' } : {}), ...(booking.intent === 'health' && validHealthFocus(booking.healthFocus) ? { focus: booking.healthFocus } : {}),
          ...(booking.intent === 'opportunity' && booking.opportunityContext ? { entry: 'compass', need: booking.opportunityNeed || undefined, offer: booking.opportunityOffer || undefined } : {}), mode: booking.mode, day: booking.day, time: booking.time,
          name: booking.name.trim(), contact: booking.contact.trim(), note: booking.note.trim(), website: '' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'ส่งคำขอนัดไม่สำเร็จ');
      booking.sending = false; booking.done = true; booking.reference = result.reference || '';
      booking.localReceipt = result.receipt?.env === 'local';
      clearDraft();
      track('meet_request_completed', { intent: booking.intent, mode: booking.mode });
      renderBooking();
      window.dispatchEvent(new Event('frontdoor:meet-requested'));
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
    if (booking.localReceipt) {
      success.querySelector('h3').textContent = 'บันทึกคำขอทดลองแล้ว 🍀';
      success.querySelector('p').textContent = 'เก็บในฐานข้อมูลบนเครื่องนี้แล้ว · ยังไม่ได้ส่งนัดจริง';
    }
    const card = document.createElement('div'); card.className = 'review-card';
    const title = document.createElement('div'); title.className = 'review-title'; title.textContent = booking.reference || 'MYCLOVER SESSION';
    card.append(title,
      plainReviewRow('เรื่อง', bookingIntentLabel()), plainReviewRow('รูปแบบ', modeLabel(booking.mode)),
      plainReviewRow('เวลาที่ขอ', slotLabel()), plainReviewRow('ติดต่อกลับ', booking.contact.trim()));
    if (booking.intent === 'health' && validHealthFocus(booking.healthFocus)) card.appendChild(plainReviewRow('จุดเริ่มที่อยากคุย', HEALTH_FOCUS[booking.healthFocus]));
    if (booking.intent === 'opportunity' && booking.opportunityContext) card.append(plainReviewRow('สิ่งที่อยากคุยต่อ', OPPORTUNITY_NEEDS[booking.opportunityNeed] || 'ยังไม่ระบุ'), plainReviewRow('สิ่งที่พร้อมนำมาลอง', OPPORTUNITY_OFFERS[booking.opportunityOffer] || 'ยังไม่ระบุ'));
    const nextLine = document.createElement('p'); nextLine.className = 'success-next';
    nextLine.textContent = `เราจะติดต่อกลับตามช่องทางที่คุณให้ไว้ ${CONFIG.replyWindow} เพื่อยืนยันเวลา`;
    if (booking.localReceipt) nextLine.textContent = 'รุ่นทดลองนี้ปิดการแจ้งเตือน ทีมและเอโกะจะไม่ได้รับคำขอนี้';

    const actions = document.createElement('div'); actions.className = 'success-actions';
    if (!booking.localReceipt && booking.day && booking.day !== FLEXIBLE_DAY && booking.time && booking.time !== FLEXIBLE_TIME) {
      const ics = document.createElement('button'); ics.type = 'button'; ics.className = 'button button-quiet';
      ics.textContent = 'เพิ่มลงปฏิทิน';
      ics.addEventListener('click', downloadInvite);
      actions.appendChild(ics);
    }
    if (!booking.localReceipt && CONFIG.lineUrl) {
      const line = document.createElement('a'); line.className = 'button button-quiet';
      line.href = CONFIG.lineUrl; line.target = '_blank'; line.rel = 'noopener noreferrer';
      line.textContent = 'ทักหาเราใน LINE';
      line.addEventListener('click', () => track('meet_line_shortcut_clicked', { step: 'success' }));
      actions.appendChild(line);
    }
    const close = document.createElement('button'); close.type = 'button'; close.className = 'button button-primary'; close.textContent = 'ปิด'; close.addEventListener('click', () => closeBooking(true));
    actions.appendChild(close);
    if (compassEntry || booking.opportunityContext) actions.appendChild(compassReturnLink());
    success.append(card, nextLine, actions); thread.appendChild(success);
  }

  function plainReviewRow(label, value) {
    const row = document.createElement('div'); row.className = 'review-row';
    const key = document.createElement('span'); key.textContent = label;
    const text = document.createElement('strong'); text.textContent = value;
    row.append(key, text); return row;
  }

  function bookingIntentLabel() {
    const label = intentById(booking.intent)?.label || '';
    const topic = booking.intent === 'ai' && aiTopicById(booking.aiTopic);
    return topic ? `${label} · ${topic.label}` : label;
  }

  function renderCloseConfirm(thread, footer) {
    footer.hidden = true;
    const box = document.createElement('div'); box.className = 'exit-confirm';
    box.innerHTML = '<p>พักการลงนัดตรงนี้ก่อนหรือเปล่า? ยังไม่มีการส่งคำขอนัด</p><div class="exit-actions"></div>';
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
    if (pendingXircleDraft) return closeBooking(true);
    if (booking.done) return closeBooking(true);
    if (booking.step === 0) return closeBooking();
    booking.error = '';
    if (booking.step === 2 && booking.schedulePart === 'week-day') {
      booking.schedulePart = 'week';
      booking.scheduleWeek = null;
    } else if (booking.step === 2 && booking.schedulePart === 'week') {
      booking.schedulePart = 'date';
      booking.scheduleWeek = null;
    } else if (booking.step === 2 && booking.schedulePart === 'time') {
      booking.day = null; booking.time = null; booking.schedulePart = 'date'; booking.scheduleWeek = null;
    } else {
      if (booking.step === 1) {
        booking.intent = null; booking.mode = null; booking.day = null; booking.time = null; booking.scheduleWeek = null;
      } else if (booking.step === 2) {
        booking.mode = null; booking.day = null; booking.time = null; booking.scheduleWeek = null;
      } else if (booking.step === 3) {
        booking.time = null;
      }
      booking.step -= 1;
      if (booking.step === 2) booking.schedulePart = booking.day ? 'time' : 'date';
    }
    renderBooking();
  }

  function icsStamp(date) {
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}00Z`;
  }

  function downloadInvite() {
    const [hour, minute] = String(booking.time).split(':').map(Number);
    const start = new Date(`${booking.day}T00:00:00+07:00`);
    start.setTime(start.getTime() + (hour * 60 + minute) * 60000);
    const end = new Date(start.getTime() + (booking.mode === 'ออนไลน์' ? 25 : 45) * 60000);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//myClover//Session//TH', 'BEGIN:VEVENT',
      `UID:${(booking.reference || Date.now())}@myclover.com`,
      `DTSTAMP:${icsStamp(new Date())}`, `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
      'SUMMARY:myClover Session',
      `DESCRIPTION:${modeLabel(booking.mode)} — รอการยืนยันเวลาจากทีมงาน`,
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'myclover-session.ics';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    track('meet_ics_downloaded', { intent: booking.intent });
  }

  function saveDraft() {
    try {
      if (pendingXircleDraft) return;
      if (xircleEntry && !booking.mode && !booking.day && !booking.name.trim() && !booking.contact.trim() && !booking.note.trim()) return;
      if (booking.done || !(booking.intent || booking.day || booking.name.trim() || booking.contact.trim())) return;
      window.localStorage.setItem(CONFIG.draftKey, JSON.stringify({
        savedAt: Date.now(), step: booking.step, schedulePart: booking.schedulePart, scheduleWeek: booking.scheduleWeek,
        intent: booking.intent, aiTopic: booking.intent === 'ai' ? booking.aiTopic : null, mode: booking.mode, day: booking.day, time: booking.time,
        healthFocus: booking.intent === 'health' && validHealthFocus(booking.healthFocus) ? booking.healthFocus : null,
        opportunityContext: booking.intent === 'opportunity' && booking.opportunityContext,
        opportunityNeed: booking.intent === 'opportunity' ? boundedValue(OPPORTUNITY_NEEDS, booking.opportunityNeed) : null,
        opportunityOffer: booking.intent === 'opportunity' ? boundedValue(OPPORTUNITY_OFFERS, booking.opportunityOffer) : null,
        name: booking.name, contact: booking.contact, note: booking.note,
      }));
    } catch (error) { /* storage unavailable */ }
  }

  function clearDraft() {
    pendingXircleDraft = null;
    try { window.localStorage.removeItem(CONFIG.draftKey); } catch (error) { /* noop */ }
    $$('.draft-resume').forEach(bar => bar.remove());
  }

  function readDraft() {
    try {
      const raw = window.localStorage.getItem(CONFIG.draftKey);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft || Date.now() - (draft.savedAt || 0) > 14 * 864e5) { clearDraft(); return null; }
      if (draft.day && draft.day !== FLEXIBLE_DAY && draft.day < dateKey(new Date())) {
        draft.day = null; draft.time = null; draft.schedulePart = 'date'; draft.scheduleWeek = null; draft.step = Math.min(draft.step || 0, 2);
      }
      return draft;
    } catch (error) { return null; }
  }

  function resumeBooking(draft) {
    openBooking('draft');
    Object.assign(booking, {
      step: Math.min(4, Math.max(0, draft.step || 0)), schedulePart: draft.schedulePart || 'date', scheduleWeek: draft.scheduleWeek || null,
      intent: draft.intent || null, mode: draft.mode || null, day: draft.day || null, time: draft.time || null,
      aiTopic: draft.intent === 'ai' && aiTopicById(draft.aiTopic) ? draft.aiTopic : null,
      healthFocus: draft.intent === 'health' && validHealthFocus(draft.healthFocus) ? draft.healthFocus : null,
      opportunityContext: draft.intent === 'opportunity' && draft.opportunityContext === true,
      opportunityNeed: draft.intent === 'opportunity' && draft.opportunityContext === true ? boundedValue(OPPORTUNITY_NEEDS, draft.opportunityNeed) : null,
      opportunityOffer: draft.intent === 'opportunity' && draft.opportunityContext === true ? boundedValue(OPPORTUNITY_OFFERS, draft.opportunityOffer) : null,
      name: draft.name || '', contact: draft.contact || '', note: draft.note || '',
    });
    if (booking.intent === 'opportunity') useCompassOpportunity(booking.opportunityContext);
    if (booking.intent) selectIntent(booking.intent, 'draft');
    track('meet_draft_resumed', { intent: booking.intent || 'none' });
    renderBooking();
  }

  function initDraftResume() {
    const draft = readDraft();
    const host = $('#ready');
    if (!draft || !host) return;
    const bar = document.createElement('div');
    bar.className = 'draft-resume';
    const label = document.createElement('span');
    label.textContent = 'คุณเริ่มลงนัดไว้แล้ว คำตอบเดิมยังอยู่';
    const resume = document.createElement('button');
    resume.type = 'button'; resume.className = 'button button-quiet'; resume.textContent = 'กลับไปลงนัดต่อ';
    resume.addEventListener('click', () => {
      const latest = readDraft();
      if (!latest) { bar.remove(); return; }
      pendingXircleDraft = null;
      resumeBooking(latest);
    });
    const drop = document.createElement('button');
    drop.type = 'button'; drop.className = 'edit-answer'; drop.textContent = 'เริ่มใหม่';
    drop.addEventListener('click', () => { clearDraft(); bar.remove(); });
    bar.append(label, resume, drop);
    host.appendChild(bar);
  }

  function renderXircleDraftChoice(thread, footer) {
    footer.hidden = true;
    thread.appendChild(guideMessage(['คุณมีคำขอนัดที่เริ่มไว้', 'ลงนัดเดิมต่อ หรือเริ่มนัดใหม่จาก XIRCLE?']));
    thread.appendChild(choices([
      choiceButton('ลงนัดเดิมต่อ', 'เก็บหัวข้อและคำตอบที่กรอกไว้', () => {
        const draft = pendingXircleDraft;
        pendingXircleDraft = null;
        resumeBooking(draft);
      }),
      choiceButton('เริ่มนัดใหม่จาก XIRCLE', 'แทนที่ร่างเดิม เริ่มจากเลือกรูปแบบการคุย', () => {
        pendingXircleDraft = null;
        clearDraft();
        $$('.draft-resume').forEach(bar => bar.remove());
        selectIntent('health', 'xircle');
        openBooking('xircle');
      }),
    ]));
    scrollConversation();
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
  initDraftResume();
  if (xircleEntry) {
    selectIntent('health', 'xircle');
    if (openXircleBooking) {
      pendingXircleDraft = readDraft();
      openBooking('xircle');
    }
  }
  const incoming = new URLSearchParams(location.search);
  if (!xircleEntry && entryValue('entry', 'compass') && incoming.getAll('intent').length === 1 && intentById(incoming.get('intent'))) {
    page.aiTopic = incoming.get('intent') === 'ai' && aiTopicById(incoming.get('topic')) ? incoming.get('topic') : null;
    selectIntent(incoming.get('intent'), 'compass');
    // The visitor explicitly opened the appointment Door. Keep any old draft.
    if (!readDraft()) openBooking('compass');
  }
  track('meet_view');
})();
