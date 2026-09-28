/**
 * Mediral 5 Steps — page controller.
 * data/routine.json drives every product fact. The 3D story (js/story.js) only mirrors scroll progress
 * and the buyer's set selection; without WebGL the DOM story is complete with static stills.
 *
 * The purchase choice (which of the five pieces) changes only by the buyer's own ticks. Scrolling,
 * resizing and the scene never touch it.
 */
const root = document.documentElement;
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const slot = name => $(`[data-slot="${name}"]`);
const base = new URL('../', import.meta.url);
const asset = path => new URL(path, base).href;

root.classList.remove('mr-boot');
root.classList.add('mr-js');

const state = {data: null, selection: new Set(), u: 0, stage: null, active: -1};
window.__mediral = state; // read-only QA hook

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const pad = n => String(n).padStart(2, '0');
const baht = n => `฿${n.toLocaleString('th-TH')}`;
const thaiDate = iso => new Date(`${iso}T12:00:00+07:00`).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'});
const byId = id => state.data.steps.find(s => s.id === id);

// Bangkok calendar date; ?today=YYYY-MM-DD lets QA check the poster's expiry without changing the clock.
function today() {
  const q = new URLSearchParams(location.search).get('today');
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Bangkok'}).format(new Date());
}

/* ---------- render ---------- */
function stillFigure(step) {
  const bots = (step.featured || []).map(f => `<img src="${asset(f.image)}" alt="ภาพประกอบ AI: ${esc(f.name)}" loading="lazy" decoding="async">`).join('');
  const pack = step.image
    ? `<img class="mr-still__pack" src="${asset(step.image)}" alt="${esc(step.image_note)}: ${esc(step.nick)}" loading="lazy" decoding="async">`
    : '<span class="mr-still__foam" aria-hidden="true"></span>';
  return `<figure class="mr-still">${pack}<div class="mr-still__bots">${bots}</div><figcaption>${esc(step.image_note)}</figcaption></figure>`;
}

function stepBody(step) {
  const names = (step.featured || []).map(f => `<li>${esc(f.name)}</li>`).join('');
  const more = (step.ingredients || []).map(f => esc(f.name)).join(' · ');
  return `
    ${names ? `<p class="mr-step__label">วัตถุดิบที่แบรนด์เล่า <span class="mr-tag">ภาพประกอบ AI</span></p><ul class="mr-names">${names}</ul>` : ''}
    <dl class="mr-facts">
      <div><dt>ใช้อย่างไร</dt><dd>${esc(step.how)}</dd></div>
      <div><dt>เมื่อไร</dt><dd>${step.when.map(w => `<span class="mr-tag">${esc(w)}</span>`).join(' ')}</dd></div>
      ${step.size ? `<div><dt>ขนาด</dt><dd>${esc(step.size)}</dd></div>` : ''}
    </dl>
    <details class="mr-more">
      <summary>ข้อมูลเพิ่มและข้อจำกัด</summary>
      <ul>
        ${more ? `<li>ชื่ออื่นที่สื่อแบรนด์ยกมา: ${more}</li>` : ''}
        <li>${esc(step.ingredients_note)}</li>
        <li class="${step.image_status === 'ai-draft' ? '' : 'is-warn'}">${esc(step.image_note)}</li>
        ${step.size_note ? `<li>${esc(step.size_note)}</li>` : ''}
        <li>${esc(state.data.order_note)}</li>
      </ul>
    </details>
    ${stillFigure(step)}`;
}

function renderSteps() {
  // Step 1 is the hero (static HTML, so the page opens on the mousse even before data); fill its details.
  const [first, ...rest] = state.data.steps;
  slot('hero-body').innerHTML = stepBody(first);
  slot('steps').innerHTML = rest.map(step => `
    <section class="mr-step" id="step-${step.id}" data-step="${step.id}" data-index="${step.order - 1}" aria-labelledby="h-${step.id}">
      <div class="mr-step__sticky">
        <div class="mr-step__left">
          <p class="mr-step__code"><span class="mr-step__num">${pad(step.order)}</span><span class="mr-step__en">${esc(step.verb_en)}</span><span class="mr-step__verb">${esc(step.verb)} · ${esc(step.nick)}</span></p>
          <h2 class="mr-step__title" id="h-${step.id}">${esc(step.headline)}</h2>
          <p class="mr-step__lead">${esc(step.for_you)}</p>
          ${step.visible_note ? `<p class="mr-step__note">${esc(step.visible_note)}</p>` : ''}
          <ol class="mr-phase" aria-hidden="true"><li>ที่มา</li><li>รวม</li><li>บทบาท</li></ol>
        </div>
        <div class="mr-step__right">${stepBody(step)}</div>
      </div>
    </section>`).join('');
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

function renderOffer() {
  const {poster} = state.data.set;
  const live = today() <= poster.valid_to;
  slot('offer').innerHTML = live
    ? `<p class="mr-offer__label"><span class="mr-tag mr-tag--warn">ข้อเสนอที่พบในสื่อแบรนด์</span></p>
       <p class="mr-offer__price">${baht(poster.price)} <small>ชุด 5 ชิ้น</small></p>
       <p>โปสเตอร์ระบุช่วง ${thaiDate(poster.valid_from)} – ${thaiDate(poster.valid_to)} · ${esc(poster.gift)} · ${esc(poster.terms)}</p>
       <p>${esc(poster.note)} ยอดที่ต้องจ่ายจริงดูที่หน้าชำระเงิน</p>`
    : `<p class="mr-offer__label"><span class="mr-tag">ข้อเสนอในโปสเตอร์สิ้นสุดแล้ว</span></p>
       <p>โปสเตอร์ชุด 5 ชิ้นที่เราได้รับระบุช่วง ${thaiDate(poster.valid_from)} – ${thaiDate(poster.valid_to)} ดูราคาและข้อเสนอปัจจุบันที่ร้าน</p>`;
}

function renderSummary() {
  const {steps} = state.data;
  const chosen = steps.filter(s => state.selection.has(s.id));
  const full = chosen.length === steps.length;
  slot('summary').innerHTML = chosen.length
    ? `<p class="mr-summary__label">${full ? 'ครบ 5 ขั้น' : `เลือก ${chosen.length} จาก ${steps.length} ชิ้น`}</p>
       <ol>${chosen.map(s => `<li>${esc(s.nick)}${s.size ? ` ${esc(s.size)}` : ''} <small>· ${esc(s.verb)} · ${s.when.map(esc).join('/')}</small></li>`).join('')}</ol>
       <p>${full ? 'ถ้าร้านมีรายการชุด 5 ชิ้น ให้เทียบว่าในชุดมีครบทั้งห้าชิ้นนี้ก่อนกดจ่าย' : 'ข้อเสนอชุด 5 ชิ้นในโปสเตอร์ใช้กับชุดครบ และโปสเตอร์ระบุว่าเปลี่ยนสินค้าไม่ได้ ถ้าเลือกบางชิ้น ให้ดูราคาแยกชิ้นที่ร้าน'}</p>`
    : '<p class="mr-summary__label">ยังไม่ได้เลือกชิ้นไหน</p><p>ติ๊กชิ้นที่ต้องการด้านบน</p>';
  $$('[data-row]').forEach(f => f.classList.toggle('is-off', !state.selection.has(f.dataset.row)));
  $$('[data-action]').forEach(b => { b.disabled = !chosen.length; });
  state.stage?.setSelection([...state.selection]);
}

function renderBuy() {
  const {buy, disclosure} = state.data;
  const link = slot('buy-link');
  if (buy.affiliate_url && /^https:\/\//.test(buy.affiliate_url)) {
    Object.assign(link, {href: buy.affiliate_url, target: '_blank', rel: 'noopener sponsored', textContent: buy.cta_label});
    link.removeAttribute('aria-disabled');
    link.removeAttribute('role');
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
  const text = copyText();
  try {
    await navigator.clipboard.writeText(text);
    slot('buy-hint').textContent = `คัดลอกแล้ว: “${text}”`;
  } catch {
    slot('buy-hint').textContent = `คัดลอกอัตโนมัติไม่ได้ รายการคือ “${text}”`;
  }
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
  return [$('#step-CL'), ...$$('#story [data-step]'), $('#set')];
}
function progress() {
  const vh = innerHeight;
  const list = sections();
  let u = 0;
  list.forEach((sec, i) => {
    const r = sec.getBoundingClientRect();
    const span = Math.max(1, sec.offsetHeight - vh);
    const t = Math.min(1, Math.max(0, -r.top / span));
    if (r.top <= vh * 0.001 || i === 0) u = i + t;
  });
  return u;
}
// QA only: ?u=1.6 pins the story at a progress value (0..6) so a frame can be inspected without scrolling.
const pinnedU = (() => {
  const v = parseFloat(new URLSearchParams(location.search).get('u'));
  return Number.isFinite(v) ? Math.min(6, Math.max(0, v)) : null;
})();

function measureBand() {
  const card = $('#set .mr-card')?.getBoundingClientRect();
  const rail = slot('rail')?.getBoundingClientRect();
  if (!card || !rail || !innerWidth) return;
  const left = Math.min(0.9, (card.right + 24) / innerWidth);
  const right = Math.max(left + 0.05, Math.min(1, (rail.left - 12) / innerWidth));
  state.stage?.setBand({left, right});
}

function onScroll() {
  const u = pinnedU ?? progress();
  state.u = u;
  const i = Math.min(state.data.steps.length, Math.floor(u));
  if (i !== state.active) {
    state.active = i;
    const step = state.data.steps[i];
    document.body.dataset.step = step ? step.id : 'set';
    // The large word behind the scene names the role (CLEANSE, TREAT · I …), as in the owner's references.
    const word = slot('word');
    word.classList.remove('is-in');
    void word.offsetWidth;
    word.textContent = step ? step.verb_en : '5 STEPS';
    word.classList.add('is-in');
  }
  $$('[data-rail]').forEach((a, k) => {
    a.classList.toggle('is-active', k === i);
    a.classList.toggle('is-done', k < state.data.steps.length && u >= k + 0.92);
  });
  // Phase dots inside the active step: origin → combine → role.
  const t = u - Math.floor(u);
  const sec = sections()[i];
  $$('.mr-phase li', sec).forEach((li, k) => li.classList.toggle('is-on', t >= [0, 0.3, 0.64][k]));
  state.stage?.setProgress(u);
}

/* ---------- 3D (optional, lazy) ---------- */
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
  if (env.reduced) root.classList.add('mr-reduced');
  if (env.no3d || env.saveData) { root.classList.add('mr-static'); return; }
  try {
    const {createStory} = await import('./story.js');
    state.stage = await createStory({canvas: $('#scene'), steps: state.data.steps, asset, reduced: env.reduced});
    state.stage.setSelection([...state.selection]);
    state.stage.setProgress(state.u);
    measureBand();
    root.classList.add('mr-3d');
  } catch (err) {
    console.warn('[mediral] 3D story unavailable, using stills', err);
    // Static steps are much shorter; keep the reader on the section they were reading.
    const at = Math.min(sections().length - 1, Math.floor(progress()));
    const reading = scrollY > 10;
    root.classList.add('mr-static');
    if (reading) sections()[at]?.scrollIntoView({block: 'start'});
  }
}

/* ---------- boot ---------- */
async function boot() {
  const res = await fetch(new URL('data/routine.json', base), {cache: 'no-cache'});
  if (!res.ok) throw new Error(`routine.json ${res.status}`);
  state.data = await res.json();
  state.selection = new Set(state.data.steps.map(s => s.id));
  renderSteps();
  renderRail();
  renderSet();
  renderOffer();
  renderSummary();
  renderBuy();

  document.addEventListener('change', e => {
    const box = e.target.closest('[data-piece]');
    if (!box) return;
    if (box.checked) state.selection.add(box.value); else state.selection.delete(box.value);
    renderSummary();
  });
  document.addEventListener('click', e => {
    const act = e.target.closest('[data-action]');
    if (act?.dataset.action === 'copy') copyList();
    if (act?.dataset.action === 'card') saveCard(act);
  });

  const reveal = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('is-in'); }), {threshold: 0.12});
  $$('.mr-chapter, .mr-step').forEach(el => reveal.observe(el));
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
  note.innerHTML = `<p><strong>โหลดข้อมูลรูทีนไม่สำเร็จ</strong> รูทีน 5 ขั้นตามโปสเตอร์ชุดของแบรนด์: 1 มูสโฟมล้างหน้า · 2 เซรั่มขวดขาว · 3 เซรั่มขวดเหลืองเขียว · 4 เซรั่มกันแดด · 5 แป้งพัฟ ก่อนจ่ายให้เช็กรายการในชุดและยอดที่หน้าชำระ</p>
    <button type="button" class="mr-btn mr-btn--small">ลองโหลดอีกครั้ง</button>`;
  note.querySelector('button').addEventListener('click', () => location.reload());
  $('#main').prepend(note);
  const summary = slot('summary');
  if (summary) summary.textContent = 'ข้อมูลชุดยังโหลดไม่ได้ — ดูข้อความด้านบนสุดของหน้า';
  $$('[data-action]').forEach(b => { b.disabled = true; });
}

boot().catch(bootFailed);
