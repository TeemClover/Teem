/**
 * myClover homepage v4 · "ปรุงเว็บใน 3 แตะ" (BLUEPRINT v3.0 §4, owner brief 2026-10-24).
 *   studio  three picks (industry → feature → style) over a full-bleed backdrop that already shows the answer
 *   site    the picked website as a pinned scroll: 5 scenes that hold, then change; every style moves its own way
 *   finale  change any answer (one page, 64 looks), then the two doors: the profile or the 3D house
 * 4 × 4 × 4 = 64 demos from entry/data.json (inlined by tools/sync-frontdoor-root.mjs). Photos and clips in
 * entry/media/v4/ were generated with Higgsfield for fictional businesses; only the ones on screen are loaded.
 * Nothing is sent anywhere: bookings, carts and coupons are simulations.
 * Analytics hooks: window receives CustomEvent('mc:entry', {detail: {type, ...}}); no tracker ships here.
 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!navigator.connection?.saveData;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const icon = name => `<svg><use href="#i-${name}"/></svg>`;
const emit = (type, detail = {}) => dispatchEvent(new CustomEvent('mc:entry', {detail: {type, ...detail}}));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const V = '20261025';

const STEPS = [
  {list: 'industries', q: 'คุณทำอะไร'},
  {list: 'features', q: 'อยากได้อะไร'},
  {list: 'styles', q: 'สไตล์ไหน'},
];

async function loadData() {
  const inline = $('#entry-data');
  if (inline) try { return JSON.parse(inline.textContent); } catch {}
  return (await fetch('/entry/data.json')).json();
}
const data = await loadData();
const lists = STEPS.map(s => data[s.list]);
const find = (step, key) => lists[step].find(o => o.key === key);

/* ---------------- media (entry/media/v4/, listed by the generator) ---------------- */
const MEDIA = data.media?.v4 || {hero: [], detail: [], item: [], loop: []};
const M = '/entry/media/v4/';
const has = (kind, name) => (MEDIA[kind] || []).includes(name);
const hero = c => has('hero', c) ? {src: `${M}hero/${c}-1280.webp`, srcset: `${M}hero/${c}-640.webp 640w, ${M}hero/${c}-1280.webp 1280w, ${M}hero/${c}.webp 1920w`} : null;
const detail = c => has('detail', c) ? {src: `${M}detail/${c}-540.webp`, srcset: `${M}detail/${c}-540.webp 540w, ${M}detail/${c}.webp 960w`} : null;
const item = (c, n) => has('item', `${c}-${n}`) ? {src: `${M}item/${c}-${n}-360.webp`, srcset: `${M}item/${c}-${n}-360.webp 360w, ${M}item/${c}-${n}.webp 640w`} : null;
const loop = c => has('loop', c) && !reduced && !saveData ? `${M}loop/${c}.mp4` : null;
const img = (m, sizes, alt = '', extra = '') => m ? `<img src="${m.src}" srcset="${m.srcset}" sizes="${sizes}" alt="${esc(alt)}" decoding="async"${extra}>` : `<i class="ph" aria-hidden="true"></i>`;

const el = {
  studio: $('#play'), bg: $('#studio-bg'), track: $$('.track-step'), choices: $('#choices'), legend: $('#choices-legend'),
  grid: $('#choice-grid'), announce: $('#announce'), site: $('#site'), stage: $('#stage'), scenes: $('#scenes'),
  rail: $$('#rail li'), domain: $('#site-domain'), finale: $('#finale'), looks: $('#looks'), remix: $('#remix'),
  combo: $('#combo-n'), profile: $('#profile'), toast: $('#toast'), top: $('.top'),
};

const picks = [null, null, null];
let step = 0, started = false, completedOnce = false, opened = false;
const widgetModules = {};
let widgetCleanup = null;
const comboKey = () => `${picks[0]}-${picks[2]}`;
const comboNumber = () => lists[0].findIndex(o => o.key === picks[0]) * 16 + lists[1].findIndex(o => o.key === picks[1]) * 4 + lists[2].findIndex(o => o.key === picks[2]) + 1;

function toast(text) {
  el.toast.textContent = text; el.toast.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.toast.hidden = true; }, 2800);
}

const loadedFonts = new Set();
function loadFont(style) {
  if (!style?.fontUrl || loadedFonts.has(style.fontUrl)) return;
  loadedFonts.add(style.fontUrl);
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = style.fontUrl; document.head.append(link);
}

/* ---------------- studio backdrop: it already shows the answer ---------------- */
let shown = el.bg.querySelector('img')?.dataset.combo || null;
function backdrop(combo) {
  const m = hero(combo);
  if (!m || shown === combo) return;
  shown = combo;
  const next = new Image();
  next.alt = ''; next.decoding = 'async'; next.sizes = '100vw'; next.srcset = m.srcset; next.src = m.src; next.dataset.combo = combo;
  const swap = () => {
    if (shown !== combo) return;
    const old = $$('img', el.bg);
    el.bg.append(next);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      next.classList.add('is-on');
      old.forEach(o => o.classList.remove('is-on'));
      setTimeout(() => old.forEach(o => o.remove()), 1300);
    }));
  };
  (next.decode ? next.decode() : Promise.resolve()).then(swap, swap);
}
// before the first pick the backdrop flips through a few of the 64; after it, through the four styles of that business
const TEASER = ['cafe-luxury', 'shop-warm', 'studio-playful', 'coach-minimal', 'cafe-playful', 'shop-minimal', 'studio-luxury', 'coach-warm'];
let teaseAt = 0, teaseTimer = 0;
function teaseList() {
  if (picks[2]) return [];
  if (picks[0]) return lists[2].map(s => `${picks[0]}-${s.key}`);
  return TEASER;
}
function tease() {
  clearInterval(teaseTimer);
  if (reduced || opened) return;
  teaseTimer = setInterval(() => {
    const l = teaseList();
    if (!l.length || document.hidden) return;
    teaseAt = (teaseAt + 1) % l.length;
    backdrop(l[teaseAt]);
  }, 3600);
}

/* ---------------- studio: three picks ---------------- */
function renderChoices(animate = true) {
  if (step > 2) {
    el.legend.innerHTML = '<span class="step-tag">3/3</span> ครบแล้ว';
    el.grid.innerHTML = `<div class="ready"><p>เว็บของคุณประกอบเสร็จแล้ว · แตะขั้นไหนด้านบนก็เปลี่ยนได้</p><button type="button" class="btn-go" data-open>ดูเว็บของคุณ${icon('arrow')}</button></div>`;
    return;
  }
  const legend = `<span class="step-tag">${step + 1}/3</span> ${esc(STEPS[step].q)}`;
  const grid = lists[step].map(o => `<button type="button" class="choice" data-key="${esc(o.key)}" aria-pressed="${picks[step] === o.key}">${icon(o.icon)}<span>${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span></button>`).join('');
  if (el.legend.innerHTML !== legend) el.legend.innerHTML = legend;
  if (el.grid.innerHTML !== grid) el.grid.innerHTML = grid;
  if (animate && !reduced) { el.choices.classList.remove('enter'); void el.choices.offsetWidth; el.choices.classList.add('enter'); }
}

function renderTrack() {
  const done = picks.filter(Boolean).length;
  el.studio.dataset.done = String(done);
  el.track.forEach((b, i) => {
    const pick = picks[i] && find(i, picks[i]);
    $('[data-answer]', b).textContent = pick ? pick.short || pick.label : '';
    b.dataset.state = i === step ? 'active' : pick ? 'done' : 'locked';
    $('[data-sr]', b).textContent = pick ? ' · เลือกแล้ว แตะเพื่อเปลี่ยน' : i === step ? ' · กำลังเลือก' : ' · ยังไม่ถึง';
    b.setAttribute('aria-current', i === step ? 'step' : 'false');
    b.disabled = !pick && i !== step;
  });
}

const nextStep = () => { const open = picks.findIndex(p => !p); return open === -1 ? 3 : open; };

function choose(key, button, viaKeyboard) {
  const at = step;
  const opt = find(at, key);
  if (!opt) return;
  if (!started) { started = true; emit('start'); }
  picks[at] = key;
  step = nextStep();
  emit('pick', {step: at, key});
  const done = picks.filter(Boolean).length;
  el.announce.textContent = `เลือก ${opt.label} แล้ว` + (step < 3 ? ` · ${done}/3 · ต่อไป: ${STEPS[step].q}` : ' · ครบ 3 อย่างแล้ว เว็บตัวอย่างประกอบเสร็จ');
  if (at === 0) { teaseAt = 0; backdrop(`${key}-${picks[2] || 'warm'}`); }
  if (at === 2) backdrop(comboKey());
  renderTrack(); renderChoices(true); tease();
  if (picks.every(Boolean)) {
    const first = !opened;
    openSite();
    if (first) setTimeout(() => goto(0, {smooth: true}), reduced ? 0 : 260);
    if (viaKeyboard) setTimeout(() => $('.sc[data-sc="0"] .sc-cta')?.focus({preventScroll: true}), 700);
  } else if (viaKeyboard) $('.choice', el.grid)?.focus();
}

el.grid.addEventListener('click', e => {
  const b = e.target.closest('.choice');
  if (b) return choose(b.dataset.key, b, e.detail === 0);
  if (e.target.closest('[data-open]')) goto(0, {smooth: true});
});
// hovering a style previews it on the backdrop; hovering a feature warms its module
el.grid.addEventListener('pointerover', e => {
  const b = e.target.closest('.choice');
  if (!b) return;
  if (step === 2) { const s = find(2, b.dataset.key); loadFont(s); if (picks[0]) backdrop(`${picks[0]}-${s.key}`); }
  if (step === 1) widgetModules[b.dataset.key] ||= import(`./widgets/${b.dataset.key}.js?v=${V}`);
});
el.grid.addEventListener('focusin', e => {
  const b = e.target.closest('.choice');
  if (b && step === 2 && picks[0]) backdrop(`${picks[0]}-${b.dataset.key}`);
});
el.track.forEach((b, i) => b.addEventListener('click', e => {
  if (!picks[i] && i !== step) return;
  step = i; renderTrack(); renderChoices(true);
  el.choices.scrollIntoView({block: 'nearest', behavior: reduced ? 'auto' : 'smooth'});
  if (e.detail === 0) $('.choice', el.grid)?.focus();
}));

/* ---------------- the generated site ---------------- */
const FEATURE_KICKER = {profile: 'รู้จักเรา', booking: 'จองล่วงหน้า', store: 'สั่งออนไลน์', minigame: 'เล่นแล้วได้คูปอง'};
const money = n => n === 0 ? 'ฟรี' : '฿' + n.toLocaleString('th-TH');
function fact(line) { const at = line.indexOf(':'); return at > 0 ? `<b>${esc(line.slice(0, at))}</b>${esc(line.slice(at + 1).trim())}` : esc(line); }

function scenesHTML(ind, feat, sty) {
  const c = `${ind.key}-${sty.key}`;
  const k = i => ` style="--k:${i}"`;
  return `
  <section class="sc sc-hero" data-sc="0" aria-label="${esc(ind.brand)}">
    <div class="sc-media">${img(hero(c), '100vw')}</div><div class="sc-scrim"></div>
    <div class="sc-copy">
      <p class="sc-kicker en"${k(0)}>${esc(ind.brandEn)}</p>
      <h2 class="sc-title"${k(1)}>${esc(ind.brand)}</h2>
      <p class="sc-tag"${k(2)}>${esc(ind.tagline)}</p>
      <p class="sc-sub"${k(3)}>${esc(ind.sub)}</p>
      <button type="button" class="sc-cta"${k(4)} data-goto="3">${esc(feat.cta)}</button>
    </div>
  </section>
  <section class="sc sc-story" data-sc="1" aria-label="เรื่องของ ${esc(ind.brand)}">
    <figure class="sc-detail">${img(detail(c), '(min-width: 760px) 40vw, 100vw')}</figure>
    <div class="sc-copy">
      <p class="sc-kicker"${k(0)}>เรื่องของเรา</p>
      <h2 class="sc-h2"${k(1)}>${esc(ind.storyTitle)}</h2>
      <ol class="sc-facts"${k(2)}>${ind.sauce.map((s, i) => `<li${k(i)}><span>${fact(s)}</span></li>`).join('')}</ol>
    </div>
  </section>
  <section class="sc sc-items" data-sc="2" aria-label="${esc(ind.itemsTitle)}">
    <header class="sc-copy"><p class="sc-kicker"${k(0)}>${esc(ind.brand)}</p><h2 class="sc-h2"${k(1)}>${esc(ind.itemsTitle)}</h2></header>
    <div class="sc-track">${ind.items.map((it, i) => `<article class="sc-card"${k(i)}><figure>${img(item(c, i + 1), '(min-width: 760px) 30vw, 72vw', it.name, ' loading="lazy"')}</figure><b>${esc(it.name)}</b><span>${esc(it.desc)}</span><span class="sc-price">${money(it.price)}<small>ราคาตัวอย่าง</small></span></article>`).join('')}</div>
  </section>
  <section class="sc sc-feature" data-sc="3" aria-label="${esc(feat.label)}">
    <div class="sc-media sc-ambient">${img(detail(c), '50vw', '', ' loading="lazy"')}</div>
    <div class="sc-copy">
      <p class="sc-kicker"${k(0)}>${esc(FEATURE_KICKER[feat.key] || feat.label)}</p>
      <h2 class="sc-h2"${k(1)}>${esc(feat.headline)}</h2>
      <p class="sc-sub"${k(2)}>ส่วนนี้ใช้ได้จริงในตัวอย่าง ลองกดดู ไม่มีการจองหรือสั่งซื้อจริง</p>
    </div>
    <div class="sc-widget" data-widget><p class="d-try">${esc(feat.try)}</p><div data-widget-body></div></div>
  </section>
  <section class="sc sc-close" data-sc="4" aria-label="ท้ายเว็บ">
    <div class="sc-media">${img(hero(c), '100vw')}</div><div class="sc-scrim"></div>
    <div class="sc-copy">
      <p class="sc-kicker en"${k(0)}>${esc(ind.brandEn)}</p>
      <h2 class="sc-h2"${k(1)}>${esc(ind.closing)}</h2>
      <p class="sc-sign"${k(2)}>${esc(ind.domain)} · ${esc(ind.sub)}</p>
      <p class="sc-fine"${k(3)}>© ${esc(ind.brand)} · ธุรกิจสมมติ ตัวอย่างสาธิตโดย myClover</p>
    </div>
  </section>`;
}

async function mountWidget(ind, feat) {
  if (widgetCleanup) { try { widgetCleanup(); } catch {} widgetCleanup = null; }
  const body = $('[data-widget-body]', el.scenes);
  if (!body) return;
  widgetModules[feat.key] ||= import(`./widgets/${feat.key}.js?v=${V}`);
  const mod = await widgetModules[feat.key];
  if (picks[1] !== feat.key || picks[0] !== ind.key || !body.isConnected) return; // a newer pick won
  widgetCleanup = mod.mount(body, {industry: ind, feature: feat, toast, icon, esc}) || null;
}

let video = null;
function setupVideo(c) {
  video = null;
  const src = loop(c);
  const media = $('.sc-hero .sc-media', el.scenes);
  if (!src || !media) return;
  const m = hero(c);
  media.insertAdjacentHTML('beforeend', `<video muted loop playsinline preload="none" poster="${m.src}" aria-hidden="true"></video>`);
  video = $('video', media);
  video.addEventListener('playing', () => video?.classList.add('is-on'), {once: true});
  video.src = src;
}

function applyStyle(sty) {
  for (const k of Object.keys(data.styles[0].vars)) el.site.style.removeProperty(k);
  for (const [k, v] of Object.entries(sty.vars)) el.site.style.setProperty(k, v);
  el.site.dataset.style = sty.key; el.site.dataset.motion = sty.motion;
  loadFont(sty);
}

function renderSite() {
  const [ind, feat, sty] = picks.map((k, i) => find(i, k));
  const c = `${ind.key}-${sty.key}`;
  applyStyle(sty);
  el.site.dataset.industry = ind.key;
  el.scenes.innerHTML = scenesHTML(ind, feat, sty);
  el.domain.textContent = ind.domain;
  el.combo.textContent = `ชุดที่ ${comboNumber()} / 64`;
  el.stage.dataset.state = 'done';
  mountWidget(ind, feat);
  setupVideo(c);
  renderFinale();
  lastRound = -1;
  measure(); paint();
}

/* ---------------- pinned scroll: hold each scene, then change ---------------- */
const WEIGHTS = {rise: [1, 1.2, 1.25, 1.5, .9], slow: [1.3, 1.4, 1.35, 1.6, 1.1], pop: [.95, 1.1, 1.2, 1.4, .85], wipe: [1, 1.2, 1.25, 1.5, .9]};
const HOLD = .58; // share of each scene's scroll that holds still before the change starts
let weights = WEIGHTS.rise, total = 0, starts = [];
function measure() {
  weights = WEIGHTS[el.site.dataset.motion] || WEIGHTS.rise;
  total = weights.reduce((a, b) => a + b, 0);
  starts = weights.map((_, i) => weights.slice(0, i).reduce((a, b) => a + b, 0));
  el.site.style.setProperty('--len', `${(total + 1) * 100}svh`);
  const items = $('.sc-items', el.scenes), track = $('.sc-track', el.scenes);
  if (items && track) items.style.setProperty('--pan', `${Math.max(0, track.scrollWidth - innerWidth)}px`);
}
function position(raw) {
  const u = raw * total;
  let i = weights.length - 1;
  while (i > 0 && u < starts[i]) i--;
  const f = clamp((u - starts[i]) / weights[i]);
  if (i === weights.length - 1) return {pos: i, h: f};
  if (f < HOLD) return {pos: i, h: f / HOLD};
  return {pos: i + smooth((f - HOLD) / (1 - HOLD)), h: 1};
}
const scrollFor = (k, h = k ? .08 : 0) => {
  const top = el.site.getBoundingClientRect().top + scrollY;
  const span = el.site.offsetHeight - innerHeight;
  return top + span * clamp((starts[k] + weights[k] * HOLD * h) / total);
};
function goto(k, {smooth: s = false} = {}) {
  if (!opened) return;
  if (reduced) { $(`.sc[data-sc="${k}"]`, el.scenes)?.scrollIntoView(); return; }
  scrollTo({top: scrollFor(k), behavior: s ? 'smooth' : 'auto'});
}
let raf = 0, lastRound = -1;
function paint() {
  raf = 0;
  if (!opened) return;
  const scenes = $$('.sc', el.scenes);
  if (reduced) { scenes.forEach(s => { s.style.setProperty('--d', '0'); s.inert = false; s.removeAttribute('aria-hidden'); }); return; }
  const r = el.site.getBoundingClientRect();
  const span = el.site.offsetHeight - innerHeight;
  const raw = span > 0 ? clamp(-r.top / span) : 0;
  const {pos, h} = position(raw);
  scenes.forEach((s, i) => {
    const d = pos - i;
    s.style.setProperty('--d', d.toFixed(4));
    s.style.setProperty('--h', (i < Math.floor(pos) ? 1 : i > pos ? 0 : i === Math.floor(pos) ? h : 0).toFixed(4));
    const near = Math.abs(d) < 1;
    if (near) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
    s.inert = Math.abs(d) > .5;
  });
  const round = Math.round(pos);
  if (round !== lastRound) { el.rail.forEach((li, i) => li.classList.toggle('on', i === round)); lastRound = round; el.site.dataset.scene = String(round); }
  el.site.dataset.pos = pos.toFixed(2);
  el.stage.dataset.pastHero = pos > .25 ? '1' : '0';
  if (video) {
    if (pos < 1 && r.top < innerHeight && r.bottom > 0 && !document.hidden) { if (video.paused) video.play().catch(() => {}); }
    else if (!video.paused) video.pause();
  }
}
addEventListener('scroll', () => { raf ||= requestAnimationFrame(paint); }, {passive: true});
addEventListener('resize', () => { if (opened) { measure(); paint(); } });
document.addEventListener('visibilitychange', () => { if (opened) paint(); });
el.scenes.addEventListener('click', e => {
  const g = e.target.closest('[data-goto]');
  if (g) goto(+g.dataset.goto, {smooth: true});
});
$('[data-goto-remix]').addEventListener('click', () => el.finale.scrollIntoView({behavior: reduced ? 'auto' : 'smooth'}));

function openSite() {
  if (!opened) {
    opened = true;
    el.site.hidden = false; el.finale.hidden = false;
    document.body.classList.add('is-open');
    clearInterval(teaseTimer);
  }
  renderSite();
}

/* ---------------- finale: same page, other answers; then the doors ---------------- */
function renderFinale() {
  const ind = picks[0];
  el.looks.innerHTML = lists[2].map(s => {
    const m = hero(`${ind}-${s.key}`);
    return `<button type="button" class="look" data-look="${esc(s.key)}" aria-pressed="${picks[2] === s.key}">${m ? `<img src="${M}hero/${ind}-${s.key}-640.webp" alt="" loading="lazy" decoding="async" width="640" height="360">` : ''}<span>${esc(s.label)}</span></button>`;
  }).join('');
  el.remix.innerHTML = STEPS.map((st, i) => `<div class="remix-row" role="group" aria-label="${esc(st.q)}"><b>${esc(st.q)}</b>${lists[i].map(o => `<button type="button" class="chip" data-step="${i}" data-key="${esc(o.key)}" aria-pressed="${picks[i] === o.key}">${icon(o.icon)}${esc(o.short || o.label)}</button>`).join('')}</div>`).join('');
}
function remix(stepAt, key) {
  if (picks[stepAt] === key) return;
  picks[stepAt] = key;
  emit('remix', {step: stepAt, key, combo: picks.join('-')});
  backdrop(comboKey());
  renderTrack(); renderChoices(false); renderSite();
  el.announce.textContent = `เปลี่ยนเป็น ${find(stepAt, key).label} แล้ว · ชุดที่ ${comboNumber()} / 64`;
  goto(0, {smooth: true});
}
el.looks.addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) remix(2, b.dataset.look); });
el.remix.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) remix(+b.dataset.step, b.dataset.key); });
$('#shuffle').addEventListener('click', () => {
  const before = picks.join('-');
  let tries = 0;
  do { lists.forEach((l, i) => { picks[i] = l[Math.floor(Math.random() * l.length)].key; }); } while (picks.join('-') === before && ++tries < 9);
  emit('shuffle', {combo: picks.join('-')});
  backdrop(comboKey()); renderTrack(); renderChoices(false); renderSite();
  el.announce.textContent = `สุ่มได้ชุดที่ ${comboNumber()} / 64`;
  goto(0, {smooth: true});
});
$('#share').addEventListener('click', async () => {
  const combo = picks.join('-');
  const url = `${location.origin}/?r=${combo}`;
  emit('share', {combo});
  const ind = find(0, picks[0]);
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({title: `${ind.brand} · ตัวอย่างจาก myClover`, text: 'ลองดูเว็บที่ประกอบจาก 3 ตัวเลือกนี้', url}); return; }
    await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย');
  } catch (err) { if (err?.name !== 'AbortError') toast(url); }
});
$('#replay').addEventListener('click', () => {
  picks.fill(null); step = 0; opened = false; completedOnce = false;
  if (widgetCleanup) { try { widgetCleanup(); } catch {} widgetCleanup = null; }
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  el.site.hidden = true; el.finale.hidden = true; el.profile.classList.remove('is-open'); document.body.classList.remove('is-open');
  el.scenes.innerHTML = ''; el.stage.dataset.state = 'empty'; video = null;
  renderTrack(); renderChoices(true); tease();
  scrollTo({top: 0, behavior: 'auto'});
  $('.choice', el.grid)?.focus({preventScroll: true});
});

// the finale counts as the end of the game: only then the doors are on screen
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && opened && !completedOnce) { completedOnce = true; emit('complete', {combo: picks.join('-')}); }
  }, {threshold: .35}).observe(el.finale);
  new IntersectionObserver(([en]) => el.top.classList.toggle('is-paper', en.isIntersecting), {rootMargin: '0px 0px -92% 0px'}).observe(el.profile);
}

/* ---------------- doors: the profile, the house ---------------- */
function openProfile(e) {
  e?.preventDefault();
  el.profile.classList.add('is-open'); document.body.classList.add('is-open');
  emit('profile', {from: opened ? 'finale' : 'skip'});
  el.profile.scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
  if (location.hash !== '#profile') history.replaceState(null, '', location.pathname + location.search + '#profile');
}
document.addEventListener('click', e => { if (e.target.closest('[data-open-profile]')) openProfile(e); });
if (location.hash === '#profile' || location.hash === '#work') { el.profile.classList.add('is-open'); document.body.classList.add('is-open'); }

const doorSrc = data.media?.door || '/entry/media/door.webp';
let doorWarm = false;
const warmDoor = () => { if (doorWarm) return; doorWarm = true; const i = new Image(); i.src = doorSrc; };
document.addEventListener('pointerover', e => { if (e.target.closest?.('[data-enter-house]')) warmDoor(); });
document.addEventListener('focusin', e => { if (e.target.closest?.('[data-enter-house]')) warmDoor(); });
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-enter-house]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  emit('enter-house', {from: a.closest('.finale') ? 'finale' : a.closest('.profile') ? 'profile' : 'page'});
  const target = new URL(a.href, location.href);
  target.searchParams.set('from', 'home');
  if (reduced) return void (location.href = target.href);
  e.preventDefault();
  const overlay = $('#door-overlay');
  $('.door-still', overlay).style.backgroundImage = `url("${doorSrc}")`;
  overlay.hidden = false;
  setTimeout(() => { location.href = target.href; }, 1150);
});
addEventListener('pageshow', e => { if (e.persisted) $('#door-overlay').hidden = true; });
$$('[data-open-profile]', el.studio).forEach(a => a.addEventListener('click', () => { if (!started) emit('skip', {href: '#profile'}); }));

// the four widgets are tiny modules: fetch them once the page is idle so a pick never waits on the network
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => { for (const f of data.features) widgetModules[f.key] ||= import(`./widgets/${f.key}.js?v=${V}`); }, {timeout: 3000}), {once: true});
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(tease, {timeout: 2500}), {once: true});

/* ---------------- start ---------------- */
const shared = new URLSearchParams(location.search).get('r');
if (shared) {
  const keys = shared.split('-');
  if (keys.length === 3 && keys.every((k, i) => find(i, k))) {
    keys.forEach((k, i) => { picks[i] = k; });
    started = true; emit('shared', {combo: shared});
  }
}
step = nextStep();
renderTrack(); renderChoices(false);
if (picks.every(Boolean)) {
  backdrop(comboKey());
  openSite();
  requestAnimationFrame(() => goto(0));
}
document.documentElement.classList.add('entry-ready');
