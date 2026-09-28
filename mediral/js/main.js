/**
 * Mediral — "หนึ่งหน้า ห้าเรื่อง": page controller.
 * data/routine.json drives every product fact. Each product is one scene whose motion is the shape of
 * its job (clear away, extract → drop, light reveals, glass glides, powder settles). One read/write pass
 * per frame turns scroll position into --a/--b/--c on each scene; CSS does the rest. Crisp packs and
 * every word live in the DOM; js/story.js adds only optional ambient light behind them.
 *
 * The saved list changes only by the reader's own ticks. The store's five-piece bundle stays fixed;
 * a partial saved list must never inherit that bundle's price or checkout link.
 */
const root = document.documentElement;
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const slot = name => $(`[data-slot="${name}"]`);
const base = new URL('../', import.meta.url);
const asset = path => new URL(path, base).href;

root.classList.remove('mr-boot');
root.classList.add('mr-js');

const state = {data: null, selection: new Set(), u: -1, stage: null, active: null, contextLost: false, beat: null, mood: 'intro', film: null};
window.__mediral = state; // read-only QA hook

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const pad = n => String(n).padStart(2, '0');
const baht = n => `฿${n.toLocaleString('th-TH')}`;
const thaiDate = iso => new Date(`${iso}T12:00:00+07:00`).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'});
const byId = id => state.data.steps.find(s => s.id === id);

const isLocalQA = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
const isCalendarDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

// The date override is only for a local preview; public links always use Bangkok's real date.
function today() {
  const q = new URLSearchParams(location.search).get('today');
  if (isLocalQA && isCalendarDate(q)) return q;
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Bangkok'}).format(new Date());
}

function posterPhase(poster, day = today()) {
  if (!isCalendarDate(poster.valid_from) || !isCalendarDate(poster.valid_to)
      || poster.valid_from > poster.valid_to) return 'unknown';
  if (day < poster.valid_from) return 'upcoming';
  return day > poster.valid_to ? 'expired' : 'within';
}

const fullSelection = () => state.data.steps.length > 0
  && state.data.steps.every(step => state.selection.has(step.id));

let offerTimer;
function scheduleOfferRefresh() {
  clearTimeout(offerTimer);
  const now = Date.now();
  const day = 86_400_000;
  const offset = 7 * 3_600_000;
  const nextMidnight = (Math.floor((now + offset) / day) + 1) * day - offset;
  offerTimer = setTimeout(() => {
    renderOffer();
    scheduleOfferRefresh();
  }, nextMidnight - now + 50);
}

/* ---------- render ---------- */
// Crop only transparent canvas around the original artwork; never redraw or relight the label.
function packImage(step, {loading = 'lazy', decorative = false} = {}) {
  if (!step.image) return '';
  const b = step.image_bounds;
  const crop = b && b.x1 > b.x0 && b.y1 > b.y0 ? b : {x0: 0, y0: 0, x1: 1, y1: 1, aspect: 2 / 3};
  const w = crop.x1 - crop.x0, h = crop.y1 - crop.y0;
  const style = `--pack-aspect:${crop.aspect};--pack-img-width:${100 / w}%;--pack-img-height:${100 / h}%;--pack-img-left:${-100 * crop.x0 / w}%;--pack-img-top:${-100 * crop.y0 / h}%`;
  return `<span class="mr-pack" style="${style}"><img src="${asset(step.image)}" alt="${decorative ? '' : esc(`${step.nick} — ${step.image_note}`)}" loading="${loading}" decoding="async"></span>`;
}
const listedCount = step => (step.featured?.length || 0) + (step.ingredients?.length || 0);
const whenText = step => (step.when || []).map(esc).join(' · ');
const namedIngredients = step => new Map([...(step.featured || []), ...(step.ingredients || [])].map(item => [item.name, item]));

function ingredientSource(ingredient) {
  return `${ingredient.benefit_status === 'brand-claim' ? 'บทบาทตามสื่อแบรนด์' : 'ข้อมูลจากสื่อแบรนด์'}${ingredient.benefit_source ? ` · ${ingredient.benefit_source}` : ''}`;
}
function formulaIngredients(step, groupIndex) {
  const named = new Map([...(step.featured || []), ...(step.ingredients || [])].map(ingredient => [ingredient.name, ingredient]));
  return (step.ingredient_groups?.[groupIndex]?.ingredientNames || []).map(name => named.get(name)).filter(Boolean);
}
// The complete list is optional deep reading: closed by default, opened by the reader or a direct link.
function ingredientAtlas(step) {
  if (step.ingredients_status === 'pending-current-sku' || !step.ingredient_groups?.some(group => group.ingredientNames.length)) {
    // No names are shown for a formula that is not confirmed; method and provenance stay readable.
    return `<details class="mr-ingredient-atlas mr-reading-chapter" id="formula-${step.id}" data-atlas="${step.id}">
      <summary id="formula-title-${step.id}"><span class="mr-atlas__num">${pad(step.order)}</span><span class="mr-atlas__name">${esc(step.nick)}<small>${esc(step.role_short || step.verb)}</small></span><span class="mr-atlas__count">สูตรแพ็กปัจจุบันรอยืนยัน</span></summary>
      <header><p>${esc(step.ingredients_note)}</p></header>
      ${stepBody(step)}
    </details>`;
  }
  const groups = step.ingredient_groups.filter(group => group.ingredientNames.length).length;
  return `<details class="mr-ingredient-atlas mr-reading-chapter" id="formula-${step.id}" data-atlas="${step.id}">
    <summary id="formula-title-${step.id}"><span class="mr-atlas__num">${pad(step.order)}</span><span class="mr-atlas__name">${esc(step.nick)}<small>${esc(step.role_short || step.verb)}</small></span><span class="mr-atlas__count">${listedCount(step)} ชื่อ · ${groups} กลุ่ม</span></summary>
    <header>
      <p>เลือกชื่อในแต่ละกลุ่ม เพื่ออ่านบทบาทและที่มาที่แบรนด์ระบุ ${esc(step.ingredients_note)}</p>
    </header>
    ${stepBody(step)}
    <div class="mr-ingredient-atlas__groups">${step.ingredient_groups.map((group, groupIndex) => {
      const ingredients = formulaIngredients(step, groupIndex);
      if (!ingredients.length) return '';
      const first = ingredients[0];
      const detailId = `formula-detail-${step.id}-${groupIndex}`;
      return `<article class="mr-ingredient-group" data-formula-group="${step.id}:${groupIndex}">
        <h3 id="formula-group-${step.id}-${groupIndex}">${esc(group.title)}</h3>
        <p class="mr-ingredient-group__summary">${esc(group.summary)}<small class="mr-ingredient-group__origin">${esc(group.source)}</small></p>
        <div class="mr-ingredient-group__names" role="group" aria-labelledby="formula-group-${step.id}-${groupIndex}">${ingredients.map((ingredient, index) => `<button type="button" data-formula-step="${step.id}" data-formula-group-index="${groupIndex}" data-formula-index="${index}" aria-pressed="${index === 0}" aria-controls="${detailId}">${esc(ingredient.name)}</button>`).join('')}</div>
        <div class="mr-ingredient-group__detail" id="${detailId}" aria-live="polite" aria-atomic="true">
          <h4 class="mr-ingredient-group__name">${esc(first.name)}</h4>
          <p class="mr-ingredient-group__benefit">${esc(first.benefit || 'สื่อแบรนด์ระบุชื่อส่วนผสมนี้ ยังไม่มีคำอธิบายบทบาทเฉพาะในข้อมูลที่ได้รับ')}</p>
          <small class="mr-ingredient-group__source">${esc(ingredientSource(first))}</small>
        </div>
      </article>`;
    }).join('')}</div>
    <p class="mr-ingredient-atlas__next"><a href="#step-${step.id}">กลับไปดู${esc(step.nick)} <span aria-hidden="true">↑</span></a><a href="#set">ดูข้อเสนอชุด 5 ชิ้น <span aria-hidden="true">↑</span></a></p>
  </details>`;
}
function stepBody(step) {
  return `<details class="mr-more">
      <summary>วิธีใช้และรายละเอียดชิ้นนี้</summary>
      <dl class="mr-facts">
        <div><dt>ใช้อย่างไร</dt><dd>${esc(step.how)}</dd></div>
        <div><dt>เมื่อไร</dt><dd>${(step.when || []).map(w => `<span class="mr-tag">${esc(w)}</span>`).join(' ')}</dd></div>
        ${step.size ? `<div><dt>ขนาด</dt><dd>${esc(step.size)}</dd></div>` : ''}
      </dl>
      <ul>
        <li>${esc(step.ingredients_note)}</li>
        <li>${esc(step.image_note)}</li>
        ${step.visible_note ? `<li>${esc(step.visible_note)}</li>` : ''}
        ${step.size_note ? `<li>${esc(step.size_note)}</li>` : ''}
        <li>${esc(state.data.order_note)}</li>
      </ul>
    </details>`;
}

// Five everyday skin moments, each written above the pack that looks after it. The static lineup
// already paints with the first HTML; it is rebuilt only if missing, so decoded packs never reload.
function renderRoutine() {
  const lineup = slot('routine-map');
  if (lineup.querySelectorAll?.('[data-lineup]').length === state.data.steps.length) return;
  lineup.innerHTML = state.data.steps.map((step, i) => `<a class="mr-lineup__item" href="#step-${step.id}" data-lineup="${step.id}" style="--i:${i}">
    <span class="mr-lineup__label">${esc(step.hero_label)}</span>${packImage(step, {loading: 'eager'})}<span class="mr-lineup__name">${esc(step.nick)}</span>
    <span class="mr-sr">${esc(step.role_short)} · ${whenText(step)}</span></a>`).join('');
}

function renderCompare() {
  const target = slot('compare');
  if (!target) return;
  target.innerHTML = state.data.steps.filter(step => ['AC', 'BR'].includes(step.id)).map(step => `
    <article class="mr-serum mr-serum--${step.id.toLowerCase()}">
      <figure class="mr-serum__pack">${packImage(step)}<figcaption>ภาพแพ็ก AI ฉบับร่าง</figcaption></figure>
      <p class="mr-serum__code"><span>${pad(step.order)}</span>${esc(step.nick)}${step.size ? ` · ${esc(step.size)}` : ''}</p>
      <h3>${esc(step.headline)}</h3>
      <p>${esc(step.selling?.choose || step.for_you)}</p>
      <ul class="mr-serum__points">${(step.selling?.beats || []).slice(0, 2).map(beat => `<li>${esc(beat.title)}</li>`).join('')}</ul>
      <p>${whenText(step)} · ตามสื่อแบรนด์</p>
      <p class="mr-serum__links"><a href="#step-${step.id}">ดูบทบาทของขวดนี้</a><a href="#formula-${step.id}">ส่วนผสมทั้งหมด ${listedCount(step)} ชื่อ</a></p>
    </article>`).join('');
}

function renderUses() {
  const target = slot('uses');
  if (!target) return;
  target.innerHTML = `<table class="mr-uses__table">
    <caption>แต่ละชิ้นใช้เมื่อไร <small>ตามข้อมูลที่แบรนด์ระบุ</small></caption>
    <thead><tr><th scope="col">ชิ้นในชุด</th><th scope="col">เมื่อไร</th><th scope="col">วิธีใช้ที่ระบุ</th></tr></thead>
    <tbody>${state.data.steps.map(step => `<tr><th scope="row"><span>${pad(step.order)}</span>${esc(step.nick)}</th><td>${whenText(step)}</td><td>${esc(step.how)}</td></tr>`).join('')}</tbody>
  </table>`;
}

function ambientFilm() {
  return `<div class="mr-fx__clip" id="lab-film" data-lab-film data-film-ready="true">
    <div class="mr-fx__clipframe" data-film-frame>
      <img src="${asset('assets/motion/lab-film-poster.webp')}" alt="" loading="lazy" decoding="async">
      <video data-film-video data-src="${asset('assets/motion/lab-film-10s.mp4')}" poster="${asset('assets/motion/lab-film-poster.webp')}" muted playsinline preload="none" aria-hidden="true" tabindex="-1" hidden></video>
    </div>
  </div>`;
}

const experience = file => asset(`assets/experience/${file}`);
const shortName = name => name.replace(/^สารสกัด/, '').replace(/ ตามชื่อในสื่อแบรนด์$/, '');
const beatNames = (step, id) => step.selling?.beats.find(beat => beat.id === id)?.names || [];
const nameList = names => names.map(shortName).map(esc).join(' · ');

function botanical(step, name, variant) {
  const item = namedIngredients(step).get(name);
  if (!item?.image) return '';
  return `<figure class="mr-fx__botanical mr-fx__botanical--${variant}"><img src="${asset(item.image)}" alt="" loading="lazy" decoding="async"><figcaption>${esc(shortName(name))}</figcaption></figure>`;
}
const drop = (tone, variant) => `<span class="mr-fx__drop mr-fx__drop--${variant}"><img src="${experience(`p0-2-drop-${tone}.webp`)}" alt="" loading="lazy" decoding="async"></span>`;
const scatter = (count, make) => Array.from({length: count}, (_, i) => make(i)).join('');

// One visual grammar per product. Every label is a name or role that the selling beats already carry.
const SCENE_FX = {
  erase: step => `<p class="mr-fx__word">${esc(step.scene.erase_word)}</p>
    <span class="mr-fx__foam"><img src="${experience('p0-3-foam-band.webp')}" alt="" loading="lazy" decoding="async"></span>
    ${scatter(7, i => `<span class="mr-fx__bubble" style="--x:${[8, 20, 34, 58, 70, 82, 46][i]}%;--s:${[16, 26, 12, 22, 14, 30, 10][i]}px;--rise:${[34, 52, 44, 60, 38, 48, 66][i]}%"></span>`)}`,
  drop: step => {
    const [balance, hydrate] = step.scene.balance;
    return `<div class="mr-fx__source">${ambientFilm()}
        <p class="mr-fx__tag mr-fx__tag--select">${esc(step.scene.select.label)}<small>${nameList(beatNames(step, step.scene.select.beat))}</small></p></div>
      ${botanical(step, 'น้ำมันใบทีทรี', 'a')}${botanical(step, 'สารสกัดเปลือกมังคุด', 'b')}
      ${drop('amber', 'fall')}<span class="mr-fx__ripple"></span><span class="mr-fx__balance"></span>
      <p class="mr-fx__end mr-fx__end--l"><img src="${experience('p0-2-drop-amber.webp')}" alt="" loading="lazy" decoding="async">${esc(balance.label)}<small>${nameList(beatNames(step, balance.beat))}</small></p>
      <p class="mr-fx__end mr-fx__end--r"><img src="${experience('p0-2-drop-clear.webp')}" alt="" loading="lazy" decoding="async">${esc(hydrate.label)}<small>${nameList(beatNames(step, hydrate.beat))}</small></p>`;
  },
  reveal: step => {
    const [glow, pair] = step.scene.reveal;
    const [probiotic, bakuchiol] = beatNames(step, pair.beat);
    const evenNames = beatNames(step, glow.beat);
    return `${botanical(step, evenNames[0], 'a')}${botanical(step, evenNames[1], 'b')}
      <p class="mr-fx__tag mr-fx__tag--vitc">${esc(shortName(evenNames[2]))}</p>
      <p class="mr-fx__tag mr-fx__tag--glow">${esc(glow.label)}</p>
      <p class="mr-fx__tag mr-fx__tag--probiotic">${esc(shortName(probiotic))}<small>สมดุล</small></p>
      <p class="mr-fx__tag mr-fx__tag--bakuchiol">${esc(shortName(bakuchiol))}<small>เรียบเนียน</small></p>
      <span class="mr-fx__shade"></span><span class="mr-fx__sweep"></span>`;
  },
  glide: step => {
    const giga = step.selling.beats.find(beat => beat.id === step.scene.garden.beat);
    return `<span class="mr-fx__sheet"></span>
      <p class="mr-fx__tag mr-fx__tag--filters">${esc(step.scene.filters.label)}<small>${nameList(beatNames(step, step.scene.filters.beat))}</small></p>
      ${drop('clear', 'sheet')}
      <p class="mr-fx__tag mr-fx__tag--hydrate">ไฮยา<small>${esc(step.scene.drop.label)}</small></p>
      <div class="mr-fx__garden"><p>${esc(step.scene.garden.label)}</p><ul>${giga.names.map((name, k) => `<li style="--k:${k}">${esc(shortName(name))}<small>${esc(giga.tags?.[name] || '')}</small></li>`).join('')}</ul></div>`;
  },
  settle: step => {
    const [powder, hydrate] = step.scene.groups;
    return `<p class="mr-fx__word mr-fx__word--veil">${esc(step.scene.veil_word)}</p>
      ${scatter(18, i => `<span class="mr-fx__mote" style="--x:${8 + (i * 37) % 84}%;--s:${5 + (i * 7) % 11}px;--fall:${62 + (i * 17) % 26}%"></span>`)}
      <span class="mr-fx__veil"></span>
      <p class="mr-fx__tag mr-fx__tag--powder">${esc(powder.label)}</p>
      <p class="mr-fx__tag mr-fx__tag--hydrate">${esc(hydrate.label)}</p>`;
  },
};
const SCENE_LENGTH = {CL: 150, AC: 210, BR: 180, SU: 200, PO: 150};

function renderSteps() {
  slot('steps').innerHTML = state.data.steps.map((step, index) => {
    const scene = step.scene;
    const next = state.data.steps[index + 1];
    return `<section class="mr-scene mr-scene--${step.id.toLowerCase()}" id="step-${step.id}" data-step="${step.id}" data-index="${index}" data-scene="${step.id}" data-grammar="${scene.grammar}" data-pin="true" style="--len:${SCENE_LENGTH[step.id] || 180}" aria-labelledby="h-${step.id}">
      <div class="mr-scene__frame">
        <header class="mr-scene__type">
          <p class="mr-scene__code"><b>${pad(step.order)}</b><span>${esc(step.nick)}${step.size ? ` · ${esc(step.size)}` : ''}</span></p>
          <p class="mr-scene__problem">${esc(scene.problem)}</p>
          <h2 class="mr-scene__title" id="h-${step.id}">${scene.headline.map(line => `<span class="mr-line">${esc(line)}</span>`).join('')}</h2>
        </header>
        <div class="mr-scene__stage">
          <div class="mr-fx" aria-hidden="true">${SCENE_FX[scene.grammar](step)}</div>
          <div class="mr-scene__pack">${packImage(step)}</div>
          ${scene.pack_note ? `<p class="mr-scene__packnote">${esc(scene.pack_note)}</p>` : ''}
        </div>
        <div class="mr-scene__copy">
          ${scene.fact ? `<p class="mr-scene__fact">${esc(scene.fact.text)}<small>${esc(scene.fact.source)} · ${scene.fact.links.map(link => `<a href="${esc(link.href)}" rel="noopener" target="_blank">${esc(link.label)}</a>`).join(' · ')}</small></p>` : ''}
          <p class="mr-scene__role">${esc(scene.role)}</p>
          <p class="mr-scene__proof">${esc(scene.proof)}<small class="mr-scene__source">${esc(step.selling?.source || '')}</small></p>
          <ol class="mr-sr" aria-label="เรื่องที่แบรนด์เล่าในชิ้นนี้">${(step.selling?.beats || []).map((beat, i) => `<li id="beat-${step.id}-${i}" data-selling-step="${step.id}" data-beat-index="${i}"><strong>${esc(beat.kicker)}: ${esc(beat.title)}</strong> ${esc(beat.body)}${beat.names?.length ? ` (${beat.names.map(esc).join(', ')})` : ''}</li>`).join('')}</ol>
          <p class="mr-scene__links"><a href="#set">ดูชุด 5 ชิ้น</a>${listedCount(step) ? `<a href="#formula-${step.id}">ส่วนผสมทั้งหมด ${listedCount(step)} ชื่อ</a>` : `<a href="#formula-${step.id}">รายละเอียดชิ้นนี้</a>`}${next ? `<a href="#step-${next.id}">ต่อไป ${esc(next.hero_label)} ↓</a>` : ''}</p>
        </div>
      </div>
    </section>`;
  }).join('');
}

function renderLibrary() {
  // Every listed name stays one tap away, after the offer, without lengthening the product story.
  slot('library').innerHTML = state.data.steps.map(ingredientAtlas).join('');
}

// A direct link to a closed atlas opens it first, so the reader lands on visible content.
function openAtlas(hash) {
  if (!/^#formula-[A-Z]{2}$/.test(hash || '')) return null;
  const atlas = $(hash);
  if (atlas?.tagName === 'DETAILS' && !atlas.open) atlas.open = true;
  return atlas;
}

function renderRail() {
  const items = state.data.steps.map(step => `
    <a href="#step-${step.id}" data-rail="${step.id}" aria-label="ขั้น ${step.order} ${esc(step.nick)}">
      <span class="mr-rail__label">${pad(step.order)} ${esc(step.verb)}</span>
      <span class="mr-rail__dot">${step.image ? `<img src="${asset(step.image)}" alt="" loading="lazy" decoding="async">` : '<i class="mr-rail__foam"></i>'}<b>${step.order}</b></span>
    </a>`).join('');
  slot('rail').innerHTML = items + `<a href="#set" class="mr-rail__set" data-rail="set" aria-label="ดูชุด 5 ชิ้น"><span class="mr-rail__label">ชุด 5 ชิ้น</span><span class="mr-rail__dot">5/5</span></a>`;
}

function renderSet() {
  const {steps, set} = state.data;
  if (slot('set-headline')) slot('set-headline').textContent = set.headline;
  slot('pieces').insertAdjacentHTML('beforeend', steps.map(step => `
    <label class="mr-piece">
      <input type="checkbox" value="${step.id}" checked data-piece>
      <span class="mr-piece__num">${step.order}</span>
      <span class="mr-piece__name">${esc(step.nick)}<small>${esc(step.verb)}${step.size ? ` · ${esc(step.size)}` : ''}</small></span>
      <span class="mr-piece__when">${step.when.map(esc).join(' · ')}</span>
    </label>`).join(''));
  slot('set-row').innerHTML = steps.map(step => `
    <figure data-row="${step.id}">
      ${packImage(step)}
      <figcaption>${step.order} ${esc(step.nick)}</figcaption>
    </figure>`).join('');
}

// The opening describes the fixed set itself, so it follows the poster dates but never the saved list.
function renderHeroOffer() {
  const {poster} = state.data.set;
  const phase = posterPhase(poster);
  slot('hero-offer').innerHTML = phase === 'within'
    ? `<p class="mr-hero-offer__label">ข้อเสนอชุดในโปสเตอร์แบรนด์ · ถึง ${thaiDate(poster.valid_to)}</p>
       <p class="mr-hero-offer__price">${baht(poster.price)} <small>ชุด 5 ชิ้น · ยังไม่ยืนยันในตะกร้า ยอดจริงดูที่หน้าชำระเงิน</small></p>`
    : `<p class="mr-hero-offer__label">${phase === 'upcoming' ? 'ข้อเสนอชุดในโปสเตอร์ยังไม่เริ่ม' : phase === 'expired' ? 'ข้อเสนอชุดในโปสเตอร์สิ้นสุดแล้ว' : 'ยังยืนยันช่วงข้อเสนอชุดไม่ได้'}</p>
       <p class="mr-hero-offer__note">ดูราคาและสิทธิปัจจุบันของชุด 5 ชิ้นที่ร้าน</p>`;
}

function renderOffer() {
  const {poster} = state.data.set;
  renderHeroOffer();
  if (!fullSelection()) {
    slot('offer').innerHTML = '<p>รายการที่บันทึกนี้ไม่ใช่ชุดขาย 5 ชิ้น จึงไม่แสดงราคาชุดกับรายการนี้ ราคาสินค้าแยกชิ้นให้ดูที่ร้าน</p>';
    return;
  }
  const phase = posterPhase(poster);
  slot('offer').innerHTML = phase === 'within'
    ? `<p class="mr-offer__label"><span class="mr-tag mr-tag--warn">ข้อเสนอที่พบในสื่อแบรนด์</span></p>
       <p class="mr-offer__price">${baht(poster.price)} <small>ชุด 5 ชิ้น</small></p>
       <p>โปสเตอร์ระบุช่วง ${thaiDate(poster.valid_from)} – ${thaiDate(poster.valid_to)} · ${esc(poster.gift)} · ${esc(poster.terms)}</p>
       <p>${esc(poster.note)} ยอดที่ต้องจ่ายจริงดูที่หน้าชำระเงิน</p>`
    : phase === 'unknown'
      ? '<p>ยังยืนยันช่วงเวลาของข้อเสนอไม่ได้ ดูราคาและข้อเสนอปัจจุบันที่ร้าน</p>'
      : `<p class="mr-offer__label"><span class="mr-tag">${phase === 'upcoming' ? 'ยังไม่ถึงช่วงข้อเสนอในโปสเตอร์' : 'ข้อเสนอในโปสเตอร์สิ้นสุดแล้ว'}</span></p>
         <p>โปสเตอร์ชุด 5 ชิ้นที่เราได้รับระบุช่วง ${thaiDate(poster.valid_from)} – ${thaiDate(poster.valid_to)} ดูราคาและข้อเสนอปัจจุบันที่ร้าน</p>`;
}

function renderSummary() {
  const {steps} = state.data;
  const chosen = steps.filter(s => state.selection.has(s.id));
  const full = chosen.length === steps.length;
  slot('summary').innerHTML = chosen.length
    ? `<p class="mr-summary__label">${full ? 'บันทึกครบ 5 ชิ้น' : `บันทึกไว้ ${chosen.length} จาก ${steps.length} ชิ้น`}</p>
       <ol>${chosen.map(s => `<li>${esc(s.nick)}${s.size ? ` ${esc(s.size)}` : ''} <small>· ${esc(s.verb)} · ${s.when.map(esc).join('/')}</small></li>`).join('')}</ol>
       <p>${full ? 'ถ้าร้านมีรายการชุด 5 ชิ้น ให้เทียบว่าในชุดมีครบทั้งห้าชิ้นนี้ก่อนกดจ่าย' : 'ข้อเสนอชุด 5 ชิ้นในโปสเตอร์ใช้กับชุดครบ และโปสเตอร์ระบุว่าเปลี่ยนสินค้าไม่ได้ ถ้าเลือกบางชิ้น ให้ดูราคาแยกชิ้นที่ร้าน'}</p>`
    : '<p class="mr-summary__label">ยังไม่มีชิ้นที่บันทึก</p><p>ติ๊กชิ้นที่ต้องการเก็บไว้ หรือกลับไปดูชุดครบ 5 ชิ้น</p>';
  if (!full) slot('summary').insertAdjacentHTML('beforeend', '<button type="button" class="mr-btn mr-btn--ghost mr-btn--small" data-action="select-all">กลับไปดูชุดครบ 5 ชิ้น</button>');
  $$('[data-row]').forEach(f => f.classList.toggle('is-off', !state.selection.has(f.dataset.row)));
  $$('[data-action="copy"], [data-action="card"]').forEach(b => { b.disabled = !chosen.length; });
  renderOffer();
  renderBuy();
}

function renderBuy() {
  const {buy, disclosure} = state.data;
  const link = slot('buy-link');
  link.removeAttribute('href');
  link.removeAttribute('target');
  link.removeAttribute('rel');
  link.setAttribute('aria-disabled', 'true');
  link.setAttribute('role', 'link');
  if (!fullSelection()) {
    link.textContent = state.selection.size ? 'รายการที่บันทึกเป็นบางชิ้น' : 'ยังไม่มีรายการที่บันทึก';
    slot('buy-hint').textContent = state.selection.size
      ? 'เก็บรายการนี้ไว้ดูราคาแยกชิ้นที่ร้าน หรือกลับไปดูชุดครบ 5 ชิ้น'
      : 'เลือกชิ้นที่ต้องการบันทึก หรือกลับไปดูชุดครบ 5 ชิ้น';
  } else if (buy.status === 'verified' && buy.affiliate_url && /^https:\/\//.test(buy.affiliate_url)) {
    Object.assign(link, {href: buy.affiliate_url, target: '_blank', rel: 'noopener sponsored', textContent: buy.cta_label});
    link.removeAttribute('aria-disabled');
    link.removeAttribute('role');
    slot('buy-hint').textContent = 'ตรวจรายการทั้ง 5 ชิ้น ราคา และสิทธิที่หน้าร้านก่อนชำระ';
  } else {
    link.removeAttribute('href');
    link.textContent = buy.pending_label;
    slot('buy-hint').textContent = `ระหว่างนี้คัดลอกรายการแล้วค้นร้าน ${buy.store} ใน ${buy.platform} ได้`;
  }
  slot('disclosure').textContent = disclosure;
}

/* ---------- actions ---------- */
function copyText() {
  const {set} = state.data;
  const chosen = state.data.steps.filter(s => state.selection.has(s.id)).map(s => set.shop_names[s.id]);
  return chosen.length === state.data.steps.length ? `${set.copy_prefix}: ${chosen.join(', ')}` : `Mediral: ${chosen.join(', ')}`;
}

async function copyList() {
  if (!state.selection.size) return;
  const text = copyText();
  try {
    await navigator.clipboard.writeText(text);
    slot('buy-hint').textContent = `คัดลอกแล้ว: “${text}”`;
  } catch {
    const hint = slot('buy-hint');
    hint.textContent = '';
    const label = document.createElement('label');
    label.className = 'mr-copy-fallback';
    label.textContent = 'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความในช่องนี้แล้วคัดลอกได้เลย';
    const field = document.createElement('textarea');
    field.readOnly = true;
    field.rows = 4;
    field.value = text;
    field.setAttribute('aria-label', 'รายการ Mediral สำหรับคัดลอก');
    label.append(field);
    hint.append(label);
    field.focus();
    field.select();
  }
}

function selectAll() {
  state.selection = new Set(state.data.steps.map(step => step.id));
  $$('[data-piece]').forEach(box => { box.checked = true; });
  renderSummary();
  // The restore button is replaced by the new summary; leave focus on a stable control.
  const summary = slot('summary');
  summary.setAttribute('tabindex', '-1');
  summary.focus({preventScroll: true});
}

async function saveCard(button) {
  const hint = slot('buy-hint');
  button.disabled = true;
  hint.textContent = 'กำลังทำใบสรุป…';
  try {
    const {drawRoutineCard} = await import('./card.js');
    const pieces = state.data.steps.filter(s => state.selection.has(s.id));
    const url = await drawRoutineCard({pieces, data: state.data, asset});
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediral-routine-${pieces.map(p => p.id.toLowerCase()).join('-')}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    hint.textContent = 'บันทึกใบสรุปแล้ว เปิดดูคู่กับหน้าชำระก่อนกดจ่าย';
  } catch (err) {
    console.warn('[mediral] routine card failed', err);
    hint.textContent = 'บันทึกใบสรุปไม่สำเร็จ ลองอีกครั้ง หรือแคปหน้าจอส่วนนี้แทน';
  } finally {
    button.disabled = !state.selection.size;
  }
}

/* ---------- scroll → story progress ---------- */
function sections() {
  return [$('#routine'), ...$$('#story [data-step]'), $('#set')].filter(Boolean);
}
const anchorClearance = section => parseFloat(globalThis.getComputedStyle?.(section)?.scrollMarginTop) || 0;
function progress() {
  const vh = innerHeight;
  const list = sections();
  let u = -1;
  list.forEach((sec, i) => {
    const r = sec.getBoundingClientRect();
    const span = Math.max(1, sec.offsetHeight - vh);
    // Finish the visual phase without advancing the rail until the next section actually arrives.
    const end = i < list.length - 1 ? 0.9995 : 1;
    const t = Math.min(end, Math.max(0, -r.top / span));
    // Native anchor navigation stops below the fixed header. That is already this chapter,
    // even when its section top has not crossed the viewport's absolute top yet.
    if (r.top <= Math.max(vh * 0.001, anchorClearance(sec) + .5) || i === 0) u = i - 1 + t;
  });
  return u;
}
// QA only: ?u=1.6 pins the story at a progress value (-1..6) so a frame can be inspected without scrolling.
const pinnedU = (() => {
  const v = parseFloat(new URLSearchParams(location.search).get('u'));
  return Number.isFinite(v) ? Math.min(6, Math.max(-1, v)) : null;
})();

/* ---------- scenes: scroll position → --a/--b/--c ---------- */
// Phase windows per grammar, as fractions of a scene's own progress. Easing lives here so CSS only
// multiplies; every value defaults to 1 in CSS, which is the composed still.
const SCENE_PHASES = {
  founder: {a: [0.02, 0.55], b: [0.35, 0.8]},
  relay: {a: [0.02, 0.4], b: [0.25, 0.65], c: [0.5, 0.9]},
  erase: {a: [0.04, 0.5], b: [0.46, 0.78], c: [0.7, 0.92]},
  drop: {a: [0, 0.28], b: [0.26, 0.62], c: [0.58, 0.86]},
  reveal: {a: [0.04, 0.58], b: [0.3, 0.7], c: [0.62, 0.88]},
  glide: {a: [0, 0.4], b: [0.36, 0.6], c: [0.56, 0.86]},
  settle: {a: [0.02, 0.48], b: [0.34, 0.66], c: [0.6, 0.88]},
};
// Ambient layer mood for each third of a product scene; the page never depends on it.
const SCENE_MOODS = {
  erase: ['foam', 'foam', 'foam'], drop: ['botanical', 'hydration', 'texture'], reveal: ['botanical', 'botanical', 'texture'],
  glide: ['texture', 'hydration', 'plants'], settle: ['powder', 'powder', 'texture'],
};
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => x * x * (3 - 2 * x);
// Short screens unpin every scene; they still move lightly with position unless motion is reduced.
const flowLayout = matchMedia('(max-height: 699px)');

function sceneProgress(el, rect, vh) {
  if (el.dataset.pin === 'true' && !flowLayout.matches) return clamp01(-rect.top / Math.max(1, rect.height - vh));
  return clamp01((vh * 0.9 - rect.top) / Math.max(1, rect.height * 0.75 + vh * 0.2));
}

function syncScenes() {
  const vh = innerHeight;
  // Read every rectangle first, then write: one layout per frame however many scenes are near.
  const near = $$('[data-scene]').map(el => ({el, rect: el.getBoundingClientRect()}))
    .filter(({rect}) => rect.bottom > -vh * 0.5 && rect.top < vh * 1.5);
  for (const {el, rect} of near) {
    const p = sceneProgress(el, rect, vh);
    if (el.mrProgress !== undefined && Math.abs(el.mrProgress - p) < 0.0004) continue;
    el.mrProgress = p;
    el.style.setProperty('--p', p.toFixed(4));
    for (const [key, [from, to]] of Object.entries(SCENE_PHASES[el.dataset.grammar || el.dataset.scene] || {})) {
      el.style.setProperty(`--${key}`, smooth(clamp01((p - from) / (to - from))).toFixed(4));
    }
  }
}

function syncStory(step, chapter) {
  if (!step) {
    state.beat = null;
    state.mood = state.active < 0 ? 'intro' : 'set';
    state.stage?.setMood?.(state.mood);
    state.film?.setActive(false);
    delete document.body.dataset.beat;
    return;
  }
  const scene = $(`#step-${step.id}`);
  const p = scene?.mrProgress ?? 0;
  const third = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
  const key = `${step.id}:${third}`;
  if (state.beat?.key !== key) {
    state.beat = {id: step.id, index: third, key};
    document.body.dataset.beat = key;
  }
  state.mood = SCENE_MOODS[step.scene?.grammar]?.[third] || 'texture';
  state.stage?.setMood?.(state.mood);
  // The extraction clip belongs to AC's opening; it rests once the drop has left it.
  state.film?.setActive(!chapter && step.id === 'AC' && p < 0.5 && document.visibilityState !== 'hidden');
}

function chooseFormulaIngredient(id, groupIndex, index) {
  const step = byId(id);
  if (!step || !Number.isInteger(groupIndex) || !Number.isInteger(index) || groupIndex < 0 || index < 0) return;
  const ingredient = formulaIngredients(step, groupIndex)[index];
  const group = $(`[data-formula-group="${id}:${groupIndex}"]`);
  if (!ingredient || !group) return;
  $$('[data-formula-index]', group).forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  $('.mr-ingredient-group__name', group).textContent = ingredient.name;
  $('.mr-ingredient-group__benefit', group).textContent = ingredient.benefit || 'สื่อแบรนด์ระบุชื่อส่วนผสมนี้ ยังไม่มีคำอธิบายบทบาทเฉพาะในข้อมูลที่ได้รับ';
  $('.mr-ingredient-group__source', group).textContent = ingredientSource(ingredient);
}

// Same query as STACKED_QUERY in js/story.js and the CSS words-below-scene switch.
const stackedLayout = matchMedia('(max-width: 1100px)');

function readingChapter() {
  const readingTop = Math.min(innerHeight / 3, ($('.mr-header')?.getBoundingClientRect().bottom || 88) + 16);
  const covers = chapter => {
    const rect = chapter.getBoundingClientRect();
    return rect.top <= readingTop && rect.bottom > readingTop;
  };
  const chapter = $$('.mr-reading-chapter').find(covers);
  if (chapter) return chapter;
  // Stacked layouts give the purchase card the whole screen: the hero already showed all five,
  // so the set is read like a chapter, and the scene behind it pauses.
  const set = stackedLayout.matches ? $('#set') : null;
  return set && covers(set) ? set : undefined;
}

function syncStagePlayback(chapter = readingChapter()) {
  if (!state.stage) return;
  // Reading chapters cover the canvas. Keep its target current, but spend no frames behind them.
  if (chapter || document.visibilityState === 'hidden') state.stage.pause();
  else state.stage.resume();
}

function onScroll() {
  if (!state.data) return;
  const chapter = readingChapter();
  syncStagePlayback(chapter);
  if (chapter) document.body.dataset.readingChapter = chapter.id;
  else delete document.body.dataset.readingChapter;
  const u = pinnedU ?? progress();
  state.u = u;
  const i = Math.min(state.data.steps.length, Math.floor(u));
  if (i !== state.active) {
    state.active = i;
    const step = state.data.steps[i];
    document.body.dataset.step = i < 0 ? 'routine' : step ? step.id : 'set';
    // The optional large word behind the scene names the current product role.
    const word = slot('word');
    if (word) {
      word.classList.remove('is-in');
      void word.offsetWidth;
      word.textContent = i < 0 ? 'SKIN ROUTINE' : step ? step.verb_en : '5 STEPS';
      word.classList.add('is-in');
    }
  }
  $$('[data-rail]').forEach((a, k) => {
    a.classList.toggle('is-active', k === i);
    a.classList.toggle('is-done', k < state.data.steps.length && u >= k + 0.92);
    if (k === i) a.setAttribute('aria-current', 'step');
    else a.removeAttribute('aria-current');
  });
  syncScenes();
  syncStory(state.data.steps[i], chapter);
  state.stage?.setProgress(u);
}
// Scroll and resize schedule one update per frame. Some embedded browsers throttle animation frames
// for unfocused views; a short timer then does the same single update so text and art never lag.
// Exactly one pending pair (frame + timer) exists at a time; whichever fires first cancels the other,
// and a generation token stops any late callback from consuming a newer request.
const scrollRequest = {generation: 0, frame: 0, timer: 0, pending: false};
function requestScroll() {
  if (scrollRequest.pending) return;
  scrollRequest.pending = true;
  const generation = ++scrollRequest.generation;
  const run = () => {
    if (!scrollRequest.pending || generation !== scrollRequest.generation) return;
    scrollRequest.pending = false;
    if (scrollRequest.frame) window.cancelAnimationFrame?.(scrollRequest.frame);
    clearTimeout(scrollRequest.timer);
    scrollRequest.frame = 0;
    scrollRequest.timer = 0;
    onScroll();
  };
  scrollRequest.frame = window.requestAnimationFrame?.(run) || 0;
  scrollRequest.timer = setTimeout(run, 60);
}

/* ---------- 3D (optional, lazy) ---------- */
function preserveReadingPosition(update) {
  const chapter = readingChapter();
  const chapterTop = chapter?.getBoundingClientRect().top;
  const current = chapter || sections()[Math.max(0, Math.min(sections().length - 1, Math.floor(progress()) + 1))];
  const currentTop = current?.getBoundingClientRect().top;
  const reading = scrollY > 10;
  const fraction = current
    ? Math.min(1, Math.max(0, -current.getBoundingClientRect().top / Math.max(1, current.offsetHeight - innerHeight)))
    : 0;
  update();
  if (reading && current) {
    const top = current.getBoundingClientRect().top + scrollY;
    const target = chapter ? top - chapterTop : currentTop > 0 ? top - currentTop
      : top + fraction * Math.max(0, current.offsetHeight - innerHeight);
    window.scrollTo({top: target, behavior: 'instant'});
  }
  onScroll();
}

function sceneAvailability(available) {
  preserveReadingPosition(() => {
    root.classList.toggle('mr-static', !available);
    root.classList.toggle('mr-3d', available);
  });
}

function onContextChange(status) {
  state.contextLost = status === 'lost';
  if (state.contextLost) sceneAvailability(false);
  else if (state.stage) sceneAvailability(true);
}

function watchReducedMotion() {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.toggle('mr-reduced', media.matches);
  root.classList.toggle('mr-motion', !media.matches);
  const change = event => preserveReadingPosition(() => {
    root.classList.toggle('mr-reduced', event.matches);
    root.classList.toggle('mr-motion', !event.matches);
    state.stage?.setReducedMotion(event.matches);
  });
  if (media.addEventListener) media.addEventListener('change', change);
  else media.addListener(change);
}

function environment() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData;
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return {no3d: !gl, reduced, saveData};
}

async function bootStage() {
  const env = environment();
  if (env.no3d || env.saveData) { sceneAvailability(false); return; }
  try {
    const {createStory} = await import('./story.js');
    state.stage = await createStory({canvas: $('#scene'), steps: state.data.steps, reduced: env.reduced, onContextChange});
    state.contextLost = Boolean(state.stage.state.contextLost);
    syncStagePlayback();
    // Preferences and context can change while scene textures are loading.
    state.stage.setReducedMotion(matchMedia('(prefers-reduced-motion: reduce)').matches);
    state.stage.setMood(state.mood);
    state.stage.setProgress(state.u);
    sceneAvailability(!state.contextLost);
  } catch (err) {
    console.warn('[mediral] 3D story unavailable, using stills', err);
    state.stage?.dispose();
    state.stage = null;
    sceneAvailability(false);
  }
}

/* ---------- boot ---------- */
async function boot() {
  const res = await fetch(new URL('data/routine.json', base), {cache: 'no-cache'});
  if (!res.ok) throw new Error(`routine.json ${res.status}`);
  state.data = await res.json();
  state.selection = new Set(state.data.steps.map(s => s.id));
  renderRoutine();
  renderCompare();
  renderUses();
  renderSteps();
  renderLibrary();
  renderRail();
  renderSet();
  renderSummary();
  // Product sections are created after the document parses. Restore incoming chapter links now,
  // before the optional scene changes layout, rather than relying on the browser's early hash pass.
  openAtlas(location.hash);
  // Older links to the film or to a single selling beat land on the product scene that now tells it.
  const legacy = location.hash === '#lab-film' ? 'AC' : /^#beat-([A-Z]{2})-\d+$/.exec(location.hash)?.[1];
  const incomingChapter = legacy ? $(`#step-${legacy}`)
    : [...sections(), ...$$('.mr-reading-chapter')].find(section => `#${section.id}` === location.hash);
  if (incomingChapter) {
    const incomingHash = location.hash;
    const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    let active = true;
    let loaded = document.readyState === 'complete';
    let fontsReady = !document.fonts?.ready;
    let restoreTimer;
    const cleanup = () => {
      active = false;
      clearTimeout(restoreTimer);
      inputEvents.forEach(event => removeEventListener(event, cleanup, true));
      removeEventListener('load', onLoad);
      removeEventListener('hashchange', cleanup);
      removeEventListener('pagehide', cleanup);
    };
    // Match native links for products, beats and atlases. Re-measure after responsive/font layout.
    const anchorOffset = () => anchorClearance(incomingChapter);
    const restoreChapter = () => {
      if (active && location.hash === incomingHash) {
        window.scrollTo({top: incomingChapter.getBoundingClientRect().top + scrollY - anchorOffset(), behavior: 'instant'});
        onScroll();
      }
    };
    const queueRestore = () => {
      if (!active) return;
      clearTimeout(restoreTimer);
      // Run after native load restoration; recompute the target after late font layout changes.
      restoreTimer = setTimeout(() => {
        restoreChapter();
        if (loaded && fontsReady) cleanup();
      }, 0);
    };
    function onLoad() { loaded = true; queueRestore(); }
    inputEvents.forEach(event => addEventListener(event, cleanup, {capture: true, passive: true}));
    addEventListener('hashchange', cleanup);
    addEventListener('pagehide', cleanup);
    if (!loaded) addEventListener('load', onLoad, {once: true});
    restoreChapter();
    if (loaded) queueRestore();
    if (!fontsReady) {
      const onFontsReady = () => { fontsReady = true; queueRestore(); };
      Promise.resolve(document.fonts.ready).then(onFontsReady, onFontsReady);
    }
  }
  watchReducedMotion();
  scheduleOfferRefresh();
  document.addEventListener('visibilitychange', () => {
    onScroll();
    if (document.visibilityState !== 'visible') return;
    renderOffer();
    scheduleOfferRefresh();
  });

  document.addEventListener('change', e => {
    const box = e.target.closest('[data-piece]');
    if (!box) return;
    if (box.checked) state.selection.add(box.value); else state.selection.delete(box.value);
    renderSummary();
  });
  // Opening or closing an atlas changes layout without a scroll; re-measure the reading gate now.
  document.addEventListener('toggle', e => { if (e.target?.matches?.('.mr-ingredient-atlas')) onScroll(); }, true);
  addEventListener('hashchange', () => { if (openAtlas(location.hash)) onScroll(); });
  document.addEventListener('click', e => {
    const atlasLink = e.target.closest('a[href^="#formula-"]');
    if (atlasLink) openAtlas(atlasLink.getAttribute('href'));
    const formula = e.target.closest('[data-formula-index]');
    if (formula) chooseFormulaIngredient(formula.dataset.formulaStep, Number(formula.dataset.formulaGroupIndex), Number(formula.dataset.formulaIndex));
    const act = e.target.closest('[data-action]');
    if (act?.dataset.action === 'copy') copyList();
    if (act?.dataset.action === 'card') saveCard(act);
    if (act?.dataset.action === 'select-all') selectAll();
  });

  const reveal = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('is-in'); }), {threshold: 0.12});
  $$('.mr-chapter, .mr-scene, .mr-note, .mr-library').forEach(el => reveal.observe(el));
  addEventListener('scroll', requestScroll, {passive: true});
  addEventListener('resize', requestScroll);
  flowLayout.addEventListener?.('change', requestScroll);
  onScroll();
  // Let the page paint first; the 3D module and its textures come after.
  (window.requestIdleCallback || (fn => setTimeout(fn, 200)))(() => {
    bootStage();
    bootFilm();
  });
}

function bootFailed(err) {
  console.error('[mediral] boot failed', err);
  root.classList.remove('mr-js');
  root.classList.add('mr-static', 'mr-nodata');
  const note = document.createElement('div');
  note.className = 'mr-alert';
  note.setAttribute('role', 'alert');
  note.innerHTML = `<p><strong>โหลดข้อมูลชุดไม่สำเร็จ</strong> ชุด 5 ชิ้น: 1 มูสโฟมล้างหน้า · 2 เซรั่มขวดขาว · 3 เซรั่มขวดเหลืองเขียว · 4 เซรั่มกันแดด · 5 แป้งพัฟ วิธีใช้จริงให้ยึดฉลากสินค้า ก่อนจ่ายให้เช็กรายการในชุดและยอดที่หน้าชำระ</p>
    <button type="button" class="mr-btn mr-btn--small">ลองโหลดอีกครั้ง</button>`;
  note.querySelector('button').addEventListener('click', () => location.reload());
  $('#main').prepend(note);
  const summary = slot('summary');
  if (summary) summary.textContent = 'ข้อมูลชุดยังโหลดไม่ได้ — ดูข้อความด้านบนสุดของหน้า';
  $$('[data-action]').forEach(b => { b.disabled = true; });
}

boot().catch(bootFailed);

// The film is created with its product beat. Its optional enhancement never blocks page data.
async function bootFilm() {
  const container = $('#lab-film');
  if (container?.id !== 'lab-film') return;
  try {
    const {initLabFilm} = await import('./lab-film.js');
    state.film = initLabFilm(container);
    onScroll();
  } catch (err) {
    console.warn('[mediral] film enhancement unavailable, keeping poster', err);
  }
}
