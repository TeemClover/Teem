/**
 * myClover homepage v5 · "ปรุงเว็บใน 3 แตะ" (BLUEPRINT v3.0 §4, owner briefs 2026-10-24 and 2026-10-25).
 *   studio  three picks (industry → feature → style) over a full-bleed backdrop that already shows the answer
 *   site    the picked website as a pinned scroll (entry/site.js): each style is its own template of chapters;
 *           luxury is the long one, a film you scroll through (entry/lux.js)
 *   finale  change any answer (one page, 64 looks), then the two doors: the profile or the 3D house
 * 4 × 4 × 4 = 64 demos from entry/data.json (inlined by tools/sync-frontdoor-root.mjs). Photos, clips and film
 * frames in entry/media/v4/ and v5/ were generated with Higgsfield for fictional businesses; only the ones on
 * screen are loaded.
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
const V = '20261030';

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
const MEDIA5 = data.media?.v5 || {film: {}, craft: []};
const M5 = '/entry/media/v5/';
const craft = (ind, n) => (MEDIA5.craft || []).includes(`${ind}-${n}`) && !reduced && !saveData ? `${M5}craft/${ind}-${n}.mp4` : null;
const film = ind => {
  const n = MEDIA5.film?.[ind] || 0;
  return n > 1 && !reduced && !saveData ? {count: n, url: (i, portrait) => `${M5}film/${ind}/${portrait ? 'p' : 'w'}/${String(i + 1).padStart(3, '0')}.webp`} : null;
};
const img = (m, sizes, alt = '', extra = '') => m ? `<img src="${m.src}" srcset="${m.srcset}" sizes="${sizes}" alt="${esc(alt)}" decoding="async"${extra}>` : `<i class="ph" aria-hidden="true"></i>`;

const el = {
  studio: $('#play'), bg: $('#studio-bg'), track: $$('.track-step'), choices: $('#choices'), legend: $('#choices-legend'),
  grid: $('#choice-grid'), announce: $('#announce'), site: $('#site'), stage: $('#stage'), scenes: $('#scenes'),
  rail: $('#rail'), domain: $('#site-domain'), finale: $('#finale'), looks: $('#looks'), remix: $('#remix'),
  combo: $('#combo-n'), profile: $('#profile'), toast: $('#toast'), top: $('.top'),
};

const picks = [null, null, null];
let step = 0, started = false, completedOnce = false, opened = false;

/* ---------------- your shop's name: the whole demo takes it (kept on this device only) ---------------- */
const cleanName = v => [...String(v || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim()].slice(0, 24).join('');
let shopName = cleanName(new URLSearchParams(location.search).get('n'));
try { if (!shopName) shopName = cleanName(sessionStorage.getItem('mc_shop_name')); } catch {}
const latin = v => /^[\x20-\x7e]+$/.test(v);
function named(ind) {
  if (!shopName) return ind;
  const slug = shopName.toLowerCase().replace(/[\s'"]+/g, '').replace(/[^\p{L}\p{M}\p{N}-]/gu, '') || 'yourshop';
  return {...ind, brand: shopName, brandEn: latin(shopName) ? shopName : ind.genericEn, domain: `${slug}.example`};
}
const widgetModules = {};
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
    openSite().then(ok => {
      if (!ok) return;
      if (first) setTimeout(() => goto(0, {smooth: true}), reduced ? 0 : 260);
      if (viaKeyboard) setTimeout(() => $('.sc-hero .sc-cta')?.focus({preventScroll: true}), 700);
    });
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
  if (step === 2) {
    const s = find(2, b.dataset.key); loadFont(s);
    if (picks[0]) backdrop(`${picks[0]}-${s.key}`);
    if (s.key === 'luxury' && !reduced) import(`./lux.js?v=${V}`).catch(() => {});
  }
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

/* ---------------- the generated site (entry/site.js + site.css, fetched once the page is idle) ---------------- */
let site = null, siteLoading = null;
function loadSite() {
  siteLoading ||= Promise.all([
    import(`./site.js?v=${V}`),
    new Promise(done => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `/entry/site.css?v=${V}`; l.onload = l.onerror = done; document.head.append(l); }),
  ]).then(([mod]) => (site = mod.createSite({
    el: {site: el.site, stage: el.stage, scenes: el.scenes, rail: el.rail},
    data, esc, icon, toast, reduced, saveData, V,
    media: {hero, detail, item, loop, img, craft, film},
    widget: key => (widgetModules[key] ||= import(`./widgets/${key}.js?v=${V}`)),
  }))).catch(err => { siteLoading = null; throw err; });
  return siteLoading;
}

function renderSite() {
  const [ind, feat, sty] = picks.map((k, i) => find(i, k));
  loadFont(sty);
  const own = named(ind);
  el.domain.textContent = own.domain;
  el.combo.textContent = `ชุดที่ ${comboNumber()} / 64`;
  el.stage.dataset.state = 'done';
  site.render({ind: own, feat, sty});
  renderFinale();
  paperTop();
}
const goto = (k, o) => { if (opened) site?.goto(k, o); };
$('[data-goto-remix]').addEventListener('click', () => el.finale.scrollIntoView({behavior: reduced ? 'auto' : 'smooth'}));

async function openSite() {
  try { await loadSite(); } catch { toast('โหลดเว็บตัวอย่างไม่สำเร็จ ลองแตะอีกครั้ง'); return false; }
  if (!picks.every(Boolean)) return false; // started over while it loaded
  if (!opened) {
    opened = true;
    el.site.hidden = false; el.finale.hidden = false;
    document.body.classList.add('is-open');
    clearInterval(teaseTimer);
  }
  renderSite();
  return true;
}

/* ---------------- finale: same page, other answers; then the doors ---------------- */
function renderFinale() {
  const ind = picks[0];
  el.looks.innerHTML = lists[2].map(s => {
    const m = hero(`${ind}-${s.key}`);
    return `<button type="button" class="look" data-look="${esc(s.key)}" aria-pressed="${picks[2] === s.key}">${m ? `<img src="${M}hero/${ind}-${s.key}-640.webp" alt="" loading="lazy" decoding="async" width="640" height="360">` : ''}<span>${esc(s.label)}</span></button>`;
  }).join('');
  $('#want').href = `/hire/?from=demo&r=${picks.join('-')}`;
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
  const url = `${location.origin}/?r=${combo}${shopName ? `&n=${encodeURIComponent(shopName)}` : ''}`;
  emit('share', {combo});
  const ind = named(find(0, picks[0]));
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({title: `${ind.brand} · ตัวอย่างจาก myClover`, text: 'ลองดูเว็บที่ประกอบจาก 3 ตัวเลือกนี้', url}); return; }
    await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย');
  } catch (err) { if (err?.name !== 'AbortError') toast(url); }
});
$('#replay').addEventListener('click', () => {
  picks.fill(null); step = 0; opened = false; completedOnce = false;
  site?.stop();
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  el.site.hidden = true; el.finale.hidden = true; el.profile.classList.remove('is-open'); document.body.classList.remove('is-open');
  el.scenes.innerHTML = ''; el.stage.dataset.state = 'empty';
  renderTrack(); renderChoices(true); tease();
  scrollTo({top: 0, behavior: 'auto'});
  $('.choice', el.grid)?.focus({preventScroll: true});
});

// the finale counts as the end of the game: only then the doors are on screen
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && opened && !completedOnce) { completedOnce = true; emit('complete', {combo: picks.join('-')}); }
  }, {threshold: .35}).observe(el.finale);
  // the logo turns dark over paper: the profile, and the demo site when its style is a light one
  const band = {rootMargin: '0px 0px -92% 0px'};
  new IntersectionObserver(([en]) => { atTop.profile = en.isIntersecting; paperTop(); }, band).observe(el.profile);
  new IntersectionObserver(([en]) => { atTop.site = en.isIntersecting; paperTop(); }, band).observe(el.site);
}

const atTop = {profile: false, site: false};
function paperTop() { el.top.classList.toggle('is-paper', atTop.profile || (atTop.site && opened && !!picks[2] && !find(2, picks[2])?.dark)); }

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

// the site template and the four widgets are small modules: fetch them once the page is idle, so a pick never
// waits on the network (the luxury film and its frames load only when "หรู" is picked)
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => {
  loadSite().catch(() => {});
  for (const f of data.features) widgetModules[f.key] ||= import(`./widgets/${f.key}.js?v=${V}`);
}, {timeout: 3000}), {once: true});
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(tease, {timeout: 2500}), {once: true});

/* ---------------- the name dialog ---------------- */
const dlg = $('#name-dlg'), nameInput = $('#name-input');
document.addEventListener('click', e => {
  if (!e.target.closest('[data-name-open]')) return;
  nameInput.value = shopName;
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  setTimeout(() => nameInput.focus(), 30);
});
dlg.addEventListener('close', () => {
  const v = dlg.returnValue === 'reset' ? '' : dlg.returnValue === 'ok' ? cleanName(nameInput.value) : null;
  if (v === null || v === shopName) return;
  shopName = v;
  try { if (v) sessionStorage.setItem('mc_shop_name', v); else sessionStorage.removeItem('mc_shop_name'); } catch {}
  emit('rename', {named: !!v, length: [...v].length}); // the name itself never leaves the page
  if (opened) { renderSite(); goto(0, {smooth: true}); }
  toast(v ? `ใส่ชื่อ “${v}” ให้ทั้งเว็บแล้ว` : 'กลับไปใช้ชื่อตัวอย่างแล้ว');
});

/* ---------------- the film (first screen): entry/film.js draws it; this only decides when ---------------- */
const filmEl = $('#film');
const toChoices = e => { e?.preventDefault(); el.studio.scrollIntoView({behavior: reduced ? 'auto' : 'smooth'}); setTimeout(() => $('.choice', el.grid)?.focus({preventScroll: true}), reduced ? 0 : 700); emit('film-go'); };
$$('[data-film-go]').forEach(a => a.addEventListener('click', toChoices));
let heroFilm = null, filmLoading = null;
function loadFilm(autoplay) {
  filmLoading ||= import(`./film.js?v=${V}`).then(mod => (heroFilm = mod.createFilm({
    root: filmEl, canvas: $('#film-canvas'), data, reduced, autoplay, loadFont, emit, onLeaf: toChoices,
    sound: $('#film-sound'), pause: $('#film-pause'), count: $('#film-count'),
  }))).catch(() => { filmLoading = null; });
  return filmLoading;
}
if (filmEl && 'IntersectionObserver' in window) {
  // the film starts only when it is on screen; reduced motion or Save-Data shows the still and a play button
  const calm = reduced || saveData;
  if (calm) { const b = $('#film-pause'); b.hidden = false; b.querySelector('span').textContent = 'ดูวิดีโอ'; b.querySelector('use').setAttribute('href', '#i-play'); b.addEventListener('click', () => { if (!heroFilm) loadFilm(true); }, {once: true}); }
  new IntersectionObserver(([en]) => { if (en.isIntersecting && !calm && !filmLoading) loadFilm(true); }, {threshold: .2}).observe(filmEl);
}

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
  openSite().then(ok => { if (ok) requestAnimationFrame(() => goto(0)); document.documentElement.classList.add('entry-ready'); });
} else document.documentElement.classList.add('entry-ready');
