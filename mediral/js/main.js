/**
 * Mediral 5 Steps — page controller.
 * data/routine.json drives every product fact. The 3D story (js/story.js) only mirrors scroll progress
 * and the buyer's set selection; without WebGL the DOM story is complete with static stills.
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

const state = {data: null, selection: new Set(), u: -1, stage: null, active: null, contextLost: false, ingredientOverride: null, labKey: null};
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
function stillFigure(step) {
  const bots = (step.featured || []).map(f => `<img src="${asset(f.image)}" alt="ภาพประกอบ AI: ${esc(f.name)}" loading="lazy" decoding="async">`).join('');
  const pack = step.image
    ? `<img class="mr-still__pack" src="${asset(step.image)}" alt="${esc(step.image_note)}: ${esc(step.nick)}" loading="lazy" decoding="async">`
    : '<span class="mr-still__foam" aria-hidden="true"></span>';
  return `<figure class="mr-still">${pack}<div class="mr-still__bots">${bots}</div><figcaption>${esc(step.image_note)}</figcaption></figure>`;
}

const listedCount = step => (step.featured?.length || 0) + (step.ingredients?.length || 0);
const whenText = step => step.when.map(esc).join(' · ');

function ingredientPanel(step) {
  if (!step.featured?.length) return step.ingredients_status === 'pending-current-sku'
    ? `<p class="mr-step__note">${esc(step.ingredients_note)}</p>` : '';
  const first = step.featured[0];
  const families = (step.ingredient_groups || []).filter(group => group.ingredientNames?.length);
  return `<section class="mr-lab" data-lab="${step.id}" aria-label="สำรวจส่วนผสม ${esc(step.nick)}">
    <p class="mr-lab__eyebrow">เลือกส่วนผสม แล้วดูว่ามีบทบาทอะไร <span class="mr-tag">ภาพจำลอง</span></p>
    <div class="mr-lab__tabs" aria-label="ส่วนผสมเด่น">${step.featured.map((f, i) => `<button type="button" data-ingredient-step="${step.id}" data-ingredient-index="${i}" aria-pressed="${i === 0}" aria-controls="lab-${step.id}">${esc(f.name)}</button>`).join('')}</div>
    <div class="mr-lab__detail" id="lab-${step.id}">
      <h3 class="mr-lab__name">${esc(first.name)}</h3>
      <p class="mr-lab__benefit">${esc(first.benefit || 'สื่อแบรนด์ระบุชื่อส่วนผสมนี้ ยังไม่มีคำอธิบายบทบาทเฉพาะในข้อมูลที่ได้รับ')}</p>
      <small class="mr-lab__source">${esc(ingredientSource(first))}</small>
    </div>
    ${families.length ? `<p class="mr-lab__families"><span>กลุ่มส่วนผสม</span>${families.map(group => esc(group.title)).join(' · ')}</p>` : ''}
    <a class="mr-lab__all" href="#formula-${step.id}">อ่านส่วนผสมทั้งหมด ${listedCount(step)} ชื่อ <span aria-hidden="true">↓</span></a>
  </section>`;
}
function ingredientSource(ingredient) {
  return `${ingredient.benefit_status === 'brand-claim' ? 'บทบาทตามสื่อแบรนด์' : 'ข้อมูลจากสื่อแบรนด์'}${ingredient.benefit_source ? ` · ${ingredient.benefit_source}` : ''}`;
}
function formulaIngredients(step, groupIndex) {
  const named = new Map([...(step.featured || []), ...(step.ingredients || [])].map(ingredient => [ingredient.name, ingredient]));
  return (step.ingredient_groups?.[groupIndex]?.ingredientNames || []).map(name => named.get(name)).filter(Boolean);
}
// The complete list is optional deep reading: closed by default, opened by the reader or a direct link.
function ingredientAtlas(step) {
  if (step.ingredients_status === 'pending-current-sku' || !step.ingredient_groups?.some(group => group.ingredientNames.length)) return '';
  const groups = step.ingredient_groups.filter(group => group.ingredientNames.length).length;
  return `<details class="mr-ingredient-atlas mr-reading-chapter" id="formula-${step.id}" data-atlas="${step.id}">
    <summary id="formula-title-${step.id}"><span class="mr-atlas__num">${pad(step.order)}</span><span class="mr-atlas__name">${esc(step.nick)}<small>${esc(step.role_short || step.verb)}</small></span><span class="mr-atlas__count">${listedCount(step)} ชื่อ · ${groups} กลุ่ม</span></summary>
    <header>
      <p>เลือกชื่อในแต่ละกลุ่ม เพื่ออ่านบทบาทและที่มาที่แบรนด์ระบุ ${esc(step.ingredients_note)}</p>
    </header>
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
  return `
    ${ingredientPanel(step)}
    <details class="mr-more">
      <summary>วิธีใช้และรายละเอียดชิ้นนี้</summary>
      <dl class="mr-facts">
        <div><dt>ใช้อย่างไร</dt><dd>${esc(step.how)}</dd></div>
        <div><dt>เมื่อไร</dt><dd>${step.when.map(w => `<span class="mr-tag">${esc(w)}</span>`).join(' ')}</dd></div>
        ${step.size ? `<div><dt>ขนาด</dt><dd>${esc(step.size)}</dd></div>` : ''}
      </dl>
      <ul>
        <li>${esc(step.ingredients_note)}</li>
        <li class="${step.image_status === 'ai-draft' ? '' : 'is-warn'}">${esc(step.image_note)}</li>
        ${step.size_note ? `<li>${esc(step.size_note)}</li>` : ''}
        <li>${esc(state.data.order_note)}</li>
      </ul>
    </details>
    ${stillFigure(step)}`;
}

function renderRoutine() {
  // Role first, product second, brand-stated time last: the whole set can be read in one glance.
  slot('routine-map').innerHTML = state.data.steps.map(step => `<li><a href="#step-${step.id}"><span>${pad(step.order)}</span><strong>${esc(step.role_short || step.verb)}<em>${esc(step.nick)}</em></strong><small>${whenText(step)}</small></a></li>`).join('');
  slot('routine-still').innerHTML = state.data.steps.map(step => `<figure><img src="${asset(step.image)}" alt="${esc(step.nick)} — ภาพแพ็ก AI ร่าง" decoding="async"><figcaption>${esc(step.nick)}</figcaption></figure>`).join('');
}

function renderCompare() {
  // Two serums, two roles. Points and times come from brand copy; nothing here pairs or sequences them.
  slot('compare').innerHTML = state.data.steps.filter(step => step.compare_points?.length).map(step => `
    <article class="mr-serum mr-serum--${step.id.toLowerCase()}">
      <figure class="mr-serum__pack"><img src="${asset(step.image)}" alt="${esc(step.image_note)}: ${esc(step.nick)}" loading="lazy" decoding="async"><figcaption>ภาพแพ็ก AI ฉบับร่าง</figcaption></figure>
      <p class="mr-serum__code"><span>${pad(step.order)}</span>${esc(step.nick)}${step.size ? ` · ${esc(step.size)}` : ''}</p>
      <h3>${esc(step.headline)}</h3>
      <p class="mr-serum__label">สื่อแบรนด์เล่าเรื่อง</p>
      <ul class="mr-serum__points">${step.compare_points.map(point => `<li>${esc(point)}</li>`).join('')}</ul>
      <dl class="mr-serum__facts">
        <div><dt>ใช้เมื่อไร</dt><dd>${whenText(step)} <small>ตามสื่อแบรนด์</small></dd></div>
        <div><dt>ส่วนผสมเด่นที่แบรนด์เล่า</dt><dd>${step.featured.map(item => esc(item.name)).join(' · ')}</dd></div>
      </dl>
      <p class="mr-serum__links"><a href="#step-${step.id}">ดูบทบาทของขวดนี้ <span aria-hidden="true">↓</span></a><a href="#formula-${step.id}">ส่วนผสมทั้งหมด ${listedCount(step)} ชื่อ</a></p>
    </article>`).join('');
}

function renderUses() {
  const labels = state.data.use_time_labels;
  const keys = Object.keys(labels);
  slot('uses').innerHTML = `<table class="mr-uses__table">
    <caption>แต่ละชิ้นใช้เมื่อไร <small>ตามข้อมูลที่แบรนด์ระบุ</small></caption>
    <thead><tr><th scope="col">ชิ้นในชุด</th>${keys.map(key => `<th scope="col">${esc(labels[key])}</th>`).join('')}</tr></thead>
    <tbody>${state.data.steps.map(step => `<tr>
      <th scope="row"><span>${pad(step.order)}</span>${esc(step.nick)}</th>
      ${step.use_times.length
        ? keys.map(key => step.use_times.includes(key)
          ? `<td><span class="mr-uses__dot" role="img" aria-label="${esc(labels[key])}"></span></td>`
          : '<td><span class="mr-sr">ไม่ระบุ</span></td>').join('')
        : `<td colspan="${keys.length}" class="mr-uses__label">ยึดวิธีใช้บนฉลากขวดที่ได้รับ</td>`}
    </tr>`).join('')}</tbody>
  </table>`;
}

function renderSteps() {
  // The routine overview precedes the five steps; the first step keeps static HTML for resilience.
  const [first, ...rest] = state.data.steps;
  slot('hero-body').innerHTML = stepBody(first);
  slot('steps').innerHTML = rest.map(step => `
    <section class="mr-step" id="step-${step.id}" data-step="${step.id}" data-index="${step.order - 1}" aria-labelledby="h-${step.id}">
      <div class="mr-step__sticky">
        <div class="mr-step__left">
          <p class="mr-step__code"><span class="mr-step__num">${pad(step.order)}</span><span class="mr-step__en">${esc(step.verb_en)}</span><span class="mr-step__verb">${esc(step.verb)} · ${esc(step.nick)}</span></p>
          <h2 class="mr-step__title" id="h-${step.id}">${esc(step.headline)}</h2>
          <p class="mr-step__lead">${esc(step.for_you)}</p>
          <p class="mr-step__when"><span>ใช้เมื่อไร</span> ${whenText(step)}${step.use_times.includes('reapply') ? ' · ทาซ้ำระหว่างวันได้' : ''}</p>
          ${step.visible_note ? `<p class="mr-step__note">${esc(step.visible_note)}</p>` : ''}
          <ol class="mr-phase" aria-hidden="true"><li>วัตถุดิบ</li><li>สกัด · ผสม</li><li>บทบาท</li></ol>
        </div>
        <div class="mr-step__right">${stepBody(step)}</div>
      </div>
    </section>`).join('');
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
  slot('set-headline').textContent = set.headline;
  slot('pieces').insertAdjacentHTML('beforeend', steps.map(step => `
    <label class="mr-piece">
      <input type="checkbox" value="${step.id}" checked data-piece>
      <span class="mr-piece__num">${step.order}</span>
      <span class="mr-piece__name">${esc(step.nick)}<small>${esc(step.verb)}${step.size ? ` · ${esc(step.size)}` : ''}</small></span>
      <span class="mr-piece__when">${step.when.map(esc).join(' · ')}</span>
    </label>`).join(''));
  slot('set-row').innerHTML = steps.map(step => `
    <figure data-row="${step.id}">
      ${step.image ? `<img src="${asset(step.image)}" alt="" loading="lazy" decoding="async">` : '<span class="mr-still__foam" aria-hidden="true"></span>'}
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
  state.stage?.setSelection([...state.selection]);
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
  return [$('#routine'), $('#step-CL'), ...$$('#story [data-step]'), $('#set')];
}
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
    if (r.top <= vh * 0.001 || i === 0) u = i - 1 + t;
  });
  return u;
}
// QA only: ?u=1.6 pins the story at a progress value (-1..6) so a frame can be inspected without scrolling.
const pinnedU = (() => {
  const v = parseFloat(new URLSearchParams(location.search).get('u'));
  return Number.isFinite(v) ? Math.min(6, Math.max(-1, v)) : null;
})();

function measureBand() {
  const card = $('#set .mr-card')?.getBoundingClientRect();
  const rail = slot('rail')?.getBoundingClientRect();
  if (!card || !rail || !innerWidth) return;
  const left = Math.min(0.9, (card.right + 24) / innerWidth);
  const right = Math.max(left + 0.05, Math.min(1, (rail.left - 12) / innerWidth));
  state.stage?.setBand({left, right});
}

function setIngredientDetail(step, index) {
  const ingredient = step.featured[index];
  const panel = $(`[data-lab="${step.id}"]`);
  if (!panel || !ingredient) return;
  $$('.mr-lab__tabs button', panel).forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  $('.mr-lab__name', panel).textContent = ingredient.name;
  $('.mr-lab__benefit', panel).textContent = ingredient.benefit || 'สื่อแบรนด์ระบุชื่อส่วนผสมนี้ ยังไม่มีคำอธิบายบทบาทเฉพาะในข้อมูลที่ได้รับ';
  $('.mr-lab__source', panel).textContent = ingredientSource(ingredient);
}
function syncIngredient(i, t) {
  const step = state.data.steps[i];
  if (!step?.featured?.length) { state.stage?.setIngredient?.(null); return; }
  const override = state.ingredientOverride;
  if (override && (override.id !== step.id || Math.abs(scrollY - override.y) > 8)) state.ingredientOverride = null;
  const index = state.ingredientOverride?.index ?? Math.min(step.featured.length - 1, Math.floor(Math.min(t, .359) / .36 * step.featured.length));
  const key = `${step.id}:${index}`;
  if (state.labKey !== key) { setIngredientDetail(step, index); state.labKey = key; }
  state.stage?.setIngredient?.(t < .52 ? index : null);
}
function chooseIngredient(id, index) {
  const step = byId(id);
  if (!step || !Number.isInteger(index) || !step.featured[index]) return;
  const section = $(`#step-${id}`);
  const r = section.getBoundingClientRect();
  const span = Math.max(1, section.offsetHeight - innerHeight);
  // Selecting a material returns to its lab view without touching the saved shopping list.
  if (state.active !== step.order - 1 || state.u % 1 >= .36) {
    window.scrollTo({top: r.top + scrollY + span * .12, behavior: 'instant'});
    onScroll();
  }
  state.ingredientOverride = {id, index, y: scrollY};
  state.labKey = null;
  onScroll();
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
    state.ingredientOverride = null;
    state.labKey = null;
    // The large word behind the scene names the role (CLEANSE, TREAT · I …), as in the owner's references.
    const word = slot('word');
    word.classList.remove('is-in');
    void word.offsetWidth;
    word.textContent = i < 0 ? 'SKIN ROUTINE' : step ? step.verb_en : '5 STEPS';
    word.classList.add('is-in');
  }
  $$('[data-rail]').forEach((a, k) => {
    a.classList.toggle('is-active', k === i);
    a.classList.toggle('is-done', k < state.data.steps.length && u >= k + 0.92);
    if (k === i) a.setAttribute('aria-current', 'step');
    else a.removeAttribute('aria-current');
  });
  // Phase dots inside the active step: origin → combine → role.
  const t = u - Math.floor(u);
  const sec = sections()[i + 1];
  $$('.mr-phase li', sec).forEach((li, k) => li.classList.toggle('is-on', t >= (i === 0 ? [0, 0.3, 0.64] : [0, 0.38, 0.81])[k]));
  syncIngredient(i, t);
  state.stage?.setProgress(u);
}

/* ---------- 3D (optional, lazy) ---------- */
function preserveReadingPosition(update) {
  const chapter = readingChapter();
  const chapterTop = chapter?.getBoundingClientRect().top;
  const current = chapter || sections()[Math.max(0, Math.min(sections().length - 1, Math.floor(progress()) + 1))];
  const reading = scrollY > 10;
  const fraction = current
    ? Math.min(1, Math.max(0, -current.getBoundingClientRect().top / Math.max(1, current.offsetHeight - innerHeight)))
    : 0;
  update();
  if (reading && current) {
    const top = current.getBoundingClientRect().top + scrollY;
    const target = chapter ? top - chapterTop : top + fraction * Math.max(0, current.offsetHeight - innerHeight);
    window.scrollTo({top: target, behavior: 'instant'});
  }
  onScroll();
  measureBand();
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
  const change = event => preserveReadingPosition(() => {
    root.classList.toggle('mr-reduced', event.matches);
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
    state.stage = await createStory({canvas: $('#scene'), steps: state.data.steps, asset, reduced: env.reduced, onContextChange});
    state.contextLost = Boolean(state.stage.state.contextLost);
    syncStagePlayback();
    // Preferences and context can change while scene textures are loading.
    state.stage.setReducedMotion(matchMedia('(prefers-reduced-motion: reduce)').matches);
    state.stage.setSelection([...state.selection]);
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
  const incomingChapter = [...sections(), ...$$('.mr-reading-chapter')].find(section => `#${section.id}` === location.hash);
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
    // Product chapters keep their exact scene anchor. Reading chapters and atlases honour their CSS
    // scroll-margin (header clearance), measured each time because the header changes with layout.
    const anchorOffset = () => sections().includes(incomingChapter) ? 0
      : parseFloat(globalThis.getComputedStyle?.(incomingChapter)?.scrollMarginTop) || 0;
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
    syncStagePlayback();
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
    const ingredient = e.target.closest('[data-ingredient-index]');
    if (ingredient) chooseIngredient(ingredient.dataset.ingredientStep, Number(ingredient.dataset.ingredientIndex));
    const formula = e.target.closest('[data-formula-index]');
    if (formula) chooseFormulaIngredient(formula.dataset.formulaStep, Number(formula.dataset.formulaGroupIndex), Number(formula.dataset.formulaIndex));
    const act = e.target.closest('[data-action]');
    if (act?.dataset.action === 'copy') copyList();
    if (act?.dataset.action === 'card') saveCard(act);
    if (act?.dataset.action === 'select-all') selectAll();
  });

  const reveal = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('is-in'); }), {threshold: 0.12});
  $$('.mr-chapter, .mr-step, .mr-routine').forEach(el => reveal.observe(el));
  $$('.mr-compare, .mr-library').forEach(el => reveal.observe(el));
  addEventListener('scroll', onScroll, {passive: true});
  addEventListener('resize', () => { onScroll(); measureBand(); });
  onScroll();
  // Let the page paint first; the 3D module and its textures come after.
  (window.requestIdleCallback || (fn => setTimeout(fn, 200)))(bootStage);
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

// Enhance approved media independently of product-data loading; pending media remains a still.
if ($('#lab-film')?.id === 'lab-film') {
  (window.requestIdleCallback || (fn => setTimeout(fn, 200)))(() => {
    import('./lab-film.js').then(({initLabFilm}) => initLabFilm()).catch(err => console.warn('[mediral] film enhancement unavailable', err));
  });
}
