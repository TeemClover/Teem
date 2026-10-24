/**
 * myClover homepage · "ปรุงเว็บใน 3 แตะ" (BLUEPRINT v3.0 §4).
 * Three picks (industry → feature → style) assemble a simulated website in front of the visitor.
 * 4 × 4 × 4 = 64 demos from entry/data.json (inlined into the page by tools/sync-frontdoor-root.mjs).
 * Nothing is sent anywhere: the demo is a simulation, bookings and carts are not real.
 * Analytics hooks: window receives CustomEvent('mc:entry', {detail: {type, ...}}); no tracker ships here.
 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const icon = name => `<svg><use href="#i-${name}"/></svg>`;
const emit = (type, detail = {}) => dispatchEvent(new CustomEvent('mc:entry', {detail: {type, ...detail}}));

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
const media = data.media || {};
const lists = STEPS.map(s => data[s.list]);
const find = (step, key) => lists[step].find(o => o.key === key);

const el = {
  hero: $('.hero'), clover: $('#clover'), leaves: $$('.leaf'), hint: $('#lab-hint'), choices: $('#choices'),
  legend: $('#choices-legend'), grid: $('#choice-grid'), announce: $('#announce'), stage: $('#stage'), device: $('#device'),
  demo: $('#demo'), url: $('#demo-url'), hudStatus: $('#hud-status'), hudCombo: $('#hud-combo'), sauce: $('#sauce'),
  sauceLines: $$('#sauce-lines li'), finale: $('#finale'), toast: $('#toast'), top: $('.top'),
};

const picks = [null, null, null];
let step = 0, started = false, completedOnce = false;
const widgetModules = {};
let widgetCleanup = null;

/* ---------------- choices ---------------- */
function renderChoices(animate = true) {
  if (step > 2) { el.choices.hidden = true; return; }
  el.choices.hidden = false;
  const legend = `<span class="step-tag">${step + 1}/3</span> ${esc(STEPS[step].q)}`;
  const grid = lists[step].map(o => `<button type="button" class="choice" data-key="${esc(o.key)}" aria-pressed="${picks[step] === o.key}">${icon(o.icon)}<span>${esc(o.label)}</span></button>`).join('');
  if (el.legend.innerHTML !== legend) el.legend.innerHTML = legend;
  if (el.grid.innerHTML !== grid) el.grid.innerHTML = grid;
  if (animate && !reduced) { el.choices.classList.remove('enter'); void el.choices.offsetWidth; el.choices.classList.add('enter'); }
}

function renderLeaves() {
  const done = picks.filter(Boolean).length;
  el.clover.dataset.done = String(done);
  el.leaves.forEach((leaf, i) => {
    const answer = $('[data-answer]', leaf);
    if (i < 3) {
      const pick = picks[i] && find(i, picks[i]);
      answer.textContent = pick ? pick.short || pick.label : '';
      leaf.dataset.state = i === step ? 'active' : pick ? 'done' : 'locked';
      $('[data-sr]', leaf).textContent = pick ? ' · เลือกแล้ว แตะเพื่อเปลี่ยน' : i === step ? ' · กำลังเลือก' : ' · ยังไม่ถึง';
      leaf.setAttribute('aria-current', i === step ? 'step' : 'false');
      leaf.disabled = !pick && i !== step;
    } else {
      const ready = done === 3;
      leaf.dataset.state = ready ? 'bloom' : 'locked';
      answer.textContent = ready ? 'พร้อมแล้ว' : '';
      leaf.disabled = !ready;
      $('[data-sr]', leaf).textContent = ready ? ' · ไปดูทางต่อ' : ' · เรืองเองเมื่อเลือกครบ 3 ใบ';
    }
  });
  el.hint.textContent = done === 3 ? 'เว็บของคุณประกอบเสร็จแล้ว · แตะใบไหนก็เปลี่ยนได้' : step === 0 && !done ? 'เลือก 3 อย่าง แล้วดูเว็บของคุณประกอบขึ้นตรงหน้า' : `เหลืออีก ${3 - done} แตะ`;
}

/* ---------------- sauce ---------------- */
function sauceLines() {
  const [ind, feat, sty] = picks.map((k, i) => k && find(i, k));
  return [ind?.sauce[0], ind?.sauce[1], ind?.sauce[2], sty?.tone, feat?.sauce, ind?.rule];
}
function renderSauce(animate) {
  const lines = sauceLines();
  let filled = 0;
  lines.forEach((text, i) => {
    const li = el.sauceLines[i];
    const next = text ? (() => { const at = text.indexOf(':'); return at > 0 ? `<b>${esc(text.slice(0, at))}:</b>${esc(text.slice(at + 1))}` : esc(text); })() : '';
    if (text) filled++;
    if (li.innerHTML !== next) {
      li.innerHTML = next;
      li.classList.remove('typed');
      if (text && animate && !reduced) { void li.offsetWidth; li.classList.add('typed'); }
    }
  });
  el.sauce.style.setProperty('--fill', String(filled / 6));
}

/* ---------------- demo ---------------- */
let demoIndustry = null, demoFeature = null;
function demoShell(ind) {
  const art = media.demo && media.demo[ind.key]
    ? `<img src="${esc(media.demo[ind.key])}" alt="" width="1200" height="750" decoding="async">`
    : `<i class="orb"></i><i class="orb"></i>${icon(ind.icon)}`;
  return `<div class="d">
    <div class="d-nav blk" style="--i:0"><span class="d-logo" aria-hidden="true">${esc([...ind.brand][0])}</span><b class="d-brand">${esc(ind.brand)}</b><span class="d-menu"><span>เกี่ยวกับ</span><span>บริการ</span><span>☰</span></span></div>
    <div class="d-hero blk" style="--i:1"><div class="d-art" data-art="${esc(ind.key)}">${art}</div>
      <div class="d-hero-text"><h3>${esc(ind.tagline)}</h3><p>${esc(ind.sub)}</p><button type="button" class="d-cta" data-cta>ปุ่มหลัก</button></div></div>
    <div class="d-widget ske-box blk" style="--i:2" data-widget>ส่วนนี้รอใบที่ 2</div>
    <p class="d-sim blk" style="--i:3">จำลอง ไม่มีการจองหรือสั่งซื้อจริง</p>
  </div>`;
}

function toast(text) {
  el.toast.textContent = text; el.toast.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.toast.hidden = true; }, 2600);
}

async function mountWidget(ind, feat) {
  const host = $('[data-widget]', el.demo);
  if (!host) return;
  if (widgetCleanup) { try { widgetCleanup(); } catch {} widgetCleanup = null; }
  const cta = $('[data-cta]', el.demo);
  if (!feat) { host.className = 'd-widget ske-box'; host.textContent = 'ส่วนนี้รอใบที่ 2'; if (cta) cta.textContent = 'ดูเพิ่ม'; return; }
  if (cta) cta.textContent = feat.cta;
  widgetModules[feat.key] ||= import(`./widgets/${feat.key}.js?v=20261024`);
  const mod = await widgetModules[feat.key];
  if (picks[1] !== feat.key || picks[0] !== ind.key) return; // a newer pick won
  host.className = 'd-widget' + (reduced ? '' : ' blk'); host.style.setProperty('--i', '0');
  host.innerHTML = `<p class="d-try">${esc(feat.try)}</p><div data-widget-body></div>`;
  widgetCleanup = mod.mount($('[data-widget-body]', host), {industry: ind, feature: feat, toast, icon, esc}) || null;
  if (cta) cta.onclick = () => host.scrollIntoView({block: 'nearest', behavior: reduced ? 'auto' : 'smooth'});
}

const loadedFonts = new Set();
function loadFont(style) {
  if (!style?.fontUrl || loadedFonts.has(style.fontUrl)) return;
  loadedFonts.add(style.fontUrl);
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = style.fontUrl; document.head.append(link);
}

function applyStyle(sty) {
  const all = Object.keys(data.styles[0].vars);
  for (const k of all) el.demo.style.removeProperty(k);
  el.demo.toggleAttribute('data-draft', !sty);
  if (!sty) return;
  loadFont(sty);
  for (const [k, v] of Object.entries(sty.vars)) el.demo.style.setProperty(k, v);
}

function sweep() {
  if (reduced) return;
  el.device.classList.remove('is-building'); void el.device.offsetWidth; el.device.classList.add('is-building');
}

function renderDemo(animate) {
  const [ind, feat, sty] = picks.map((k, i) => k && find(i, k));
  if (!ind) {
    demoIndustry = demoFeature = null;
    el.demo.removeAttribute('data-draft');
    for (const k of Object.keys(data.styles[0].vars)) el.demo.style.removeProperty(k);
    el.demo.innerHTML = el.emptyDemo;
    el.url.textContent = 'ร่างเว็บใหม่';
    return;
  }
  if (demoIndustry !== ind.key) {
    el.demo.innerHTML = demoShell(ind);
    if (!animate || reduced) $$('.blk', el.demo).forEach(b => b.classList.remove('blk'));
    demoIndustry = ind.key; demoFeature = null;
  }
  if (demoFeature !== (feat?.key || null)) { demoFeature = feat?.key || null; mountWidget(ind, feat); }
  applyStyle(sty);
  el.url.textContent = ind.domain + (feat ? '/' + feat.key : '');
  if (animate) sweep();
}

function renderHud() {
  const done = picks.filter(Boolean).length;
  el.stage.dataset.state = done === 3 ? 'done' : done ? 'building' : 'empty';
  el.hudStatus.textContent = done === 3 ? 'พร้อมใช้ · จำลอง' : done ? `ประกอบแล้ว ${done}/3` : 'รอซอส';
  if (done === 3) {
    const n = lists[0].findIndex(o => o.key === picks[0]) * 16 + lists[1].findIndex(o => o.key === picks[1]) * 4 + lists[2].findIndex(o => o.key === picks[2]) + 1;
    el.hudCombo.textContent = `ชุดที่ ${n} / 64`;
  } else {
    el.hudCombo.textContent = `เหลือ ${64 / 4 ** done} แบบจาก 64`;
  }
}

/* ---------------- flow ---------------- */
function nextStep() {
  const open = picks.findIndex(p => !p);
  return open === -1 ? 3 : open;
}

function complete(animate) {
  el.finale.hidden = false;
  if (animate && !reduced) {
    el.finale.classList.remove('enter'); void el.finale.offsetWidth; el.finale.classList.add('enter');
    el.clover.classList.remove('burst'); void el.clover.offsetWidth; el.clover.classList.add('burst');
  }
  if (!completedOnce) emit('complete', {combo: picks.join('-')});
  completedOnce = true;
}

function update({animate = true} = {}) {
  renderLeaves(); renderChoices(animate); renderSauce(animate); renderDemo(animate); renderHud();
  if (picks.every(Boolean)) complete(animate); else el.finale.hidden = true;
}

function choose(key, button, viaKeyboard) {
  const at = step;
  const opt = find(at, key);
  if (!opt) return;
  if (!started) { started = true; emit('start'); }
  const run = () => {
    picks[at] = key;
    step = nextStep();
    update();
    if (button) button.style.viewTransitionName = '';
    const answer = $('[data-answer]', el.leaves[at]);
    if (answer) answer.style.viewTransitionName = '';
  };
  emit('pick', {step: at, key});
  if (document.startViewTransition && !reduced && button) {
    button.style.viewTransitionName = 'pick';
    const vt = document.startViewTransition(() => {
      button.style.viewTransitionName = '';
      run();
      $('[data-answer]', el.leaves[at]).style.viewTransitionName = 'pick';
    });
    vt.finished.finally(() => { const a = $('[data-answer]', el.leaves[at]); if (a) a.style.viewTransitionName = ''; afterPick(at, viaKeyboard); });
  } else { run(); afterPick(at, viaKeyboard); }
  el.announce.textContent = `เลือก ${opt.label} แล้ว` + (step < 3 ? ` · ต่อไป: ${STEPS[step].q}` : ' · เว็บตัวอย่างประกอบเสร็จแล้ว');
}

function afterPick(at, viaKeyboard) {
  if (viaKeyboard) {
    const target = step < 3 ? $('.choice', el.grid) : $('.btn-door', el.finale);
    target?.focus({preventScroll: false});
  }
  if (innerWidth >= 1040) return;
  // keep both the choices and the growing website in view on phones
  const deviceTop = el.device.getBoundingClientRect().top;
  if (step === 3) {
    const y = scrollY + deviceTop - 70;
    scrollTo({top: y, behavior: reduced ? 'auto' : 'smooth'});
  } else if (at === 0) {
    const delta = deviceTop - innerHeight * 0.64;
    const room = el.choices.getBoundingClientRect().top - 74;
    const by = Math.min(delta, room);
    if (by > 24) scrollBy({top: by, behavior: reduced ? 'auto' : 'smooth'});
  }
}

el.grid.addEventListener('click', e => {
  const b = e.target.closest('.choice');
  if (b) choose(b.dataset.key, b, e.detail === 0);
});
el.grid.addEventListener('pointerover', e => {
  const b = e.target.closest('.choice');
  if (b && step === 2) loadFont(find(2, b.dataset.key));
  if (b && step === 1) widgetModules[b.dataset.key] ||= import(`./widgets/${b.dataset.key}.js?v=20261024`);
});
el.leaves.forEach((leaf, i) => leaf.addEventListener('click', e => {
  if (i === 3) {
    if (picks.every(Boolean)) { el.finale.scrollIntoView({block: 'center', behavior: reduced ? 'auto' : 'smooth'}); $('.btn-door', el.finale)?.focus({preventScroll: true}); }
    return;
  }
  if (!picks[i] && i !== step) return;
  step = i; renderLeaves(); renderChoices(true);
  if (e.detail === 0) $('.choice', el.grid)?.focus();
}));

/* ---------------- share, replay ---------------- */
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
  picks.fill(null); step = 0; completedOnce = false;
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  update();
  el.clover.scrollIntoView({block: 'center', behavior: reduced ? 'auto' : 'smooth'});
  $('.choice', el.grid)?.focus({preventScroll: true});
});

/* ---------------- enter the house ---------------- */
const doorSrc = media.door || '/entry/media/door.webp';
let doorWarm = false;
const warmDoor = () => { if (doorWarm) return; doorWarm = true; const i = new Image(); i.src = doorSrc; };
document.addEventListener('pointerover', e => { if (e.target.closest?.('[data-enter-house]')) warmDoor(); });
document.addEventListener('focusin', e => { if (e.target.closest?.('[data-enter-house]')) warmDoor(); });
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-enter-house]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  emit('enter-house', {from: a.closest('.finale') ? 'finale' : a.closest('.top') ? 'top' : 'page'});
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

/* quick links clicked before playing: the visitor chose to skip the game */
$$('.quick a').forEach(a => a.addEventListener('click', () => { if (!started) emit('skip', {href: a.getAttribute('href')}); }));

/* ---------------- ambience ---------------- */
if (fine && !reduced) {
  let raf = 0, ev = null;
  el.hero.addEventListener('pointermove', e => { ev = e; raf ||= requestAnimationFrame(() => {
    raf = 0;
    const r = el.hero.getBoundingClientRect();
    el.hero.style.setProperty('--mx', ((ev.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    el.hero.style.setProperty('--my', ((ev.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    const c = el.clover.getBoundingClientRect();
    const dx = (ev.clientX - (c.left + c.width / 2)) / innerWidth, dy = (ev.clientY - (c.top + c.height / 2)) / innerHeight;
    el.clover.style.setProperty('--ty', (dx * 14).toFixed(2) + 'deg');
    el.clover.style.setProperty('--tx', (-dy * 14).toFixed(2) + 'deg');
  }); }, {passive: true});
  el.hero.addEventListener('pointerleave', () => { el.clover.style.setProperty('--tx', '0deg'); el.clover.style.setProperty('--ty', '0deg'); });
}

// top bar: glass over the night, paper over the day
{
  let raf = 0;
  const paint = () => {
    raf = 0;
    const heroBottom = el.hero.getBoundingClientRect().bottom;
    el.top.classList.toggle('is-solid', scrollY > 8 && heroBottom > 60);
    el.top.classList.toggle('is-paper', heroBottom <= 60);
  };
  addEventListener('scroll', () => { raf ||= requestAnimationFrame(paint); }, {passive: true}); paint();
}

// hero video (if the slot has a file): never before the first paint, never with reduced motion or data saver
const video = $('.hero-video');
if (video && !reduced && !navigator.connection?.saveData) {
  const start = () => { video.src = video.dataset.src; video.addEventListener('playing', () => video.classList.add('is-on'), {once: true}); video.play().catch(() => {}); };
  addEventListener('load', () => (window.requestIdleCallback || setTimeout)(start, {timeout: 2500}), {once: true});
}

// the four widgets are tiny modules: fetch them once the page is idle so a pick never waits on the network
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => { for (const f of data.features) widgetModules[f.key] ||= import(`./widgets/${f.key}.js?v=20261024`); }, {timeout: 3000}), {once: true});

/* ---------------- start ---------------- */
el.emptyDemo = el.demo.innerHTML;
const shared = new URLSearchParams(location.search).get('r');
if (shared) {
  const keys = shared.split('-');
  if (keys.length === 3 && keys.every((k, i) => find(i, k))) {
    keys.forEach((k, i) => { picks[i] = k; });
    started = true; emit('shared', {combo: shared});
  }
}
step = nextStep();
update({animate: false});
document.documentElement.classList.add('entry-ready');
