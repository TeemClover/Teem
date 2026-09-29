/**
 * Mediral — page controller.
 * data/routine.json drives every product fact. The story is one cinema (js/cinema.js): a sticky
 * viewport whose layers are posed by one clock T from the scroll position, following js/score.js.
 * Reduced motion and short screens read the same chapters in normal flow. After the cinema comes the
 * real exchange and one way to order: a conversation with myClover on LINE (one channel config,
 * routine.json → order). Each product's full story and listed names live on its own page.
 *
 * The chosen pieces only shape an optional message to paste in LINE. The store's five-piece bundle
 * stays fixed; a partial list never inherits a bundle price or a commission link.
 */
import {createCinema} from './cinema.js';
import {SHOTS, CHAPTERS, score, closingShot, detailHref, toneMark} from './score.js';

const root = document.documentElement;
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const slot = name => $(`[data-slot="${name}"]`);
const base = new URL('../', import.meta.url);
const asset = path => new URL(path, base).href;

root.classList.remove('mr-boot');
root.classList.add('mr-js');

const state = {data: null, selection: new Set(), u: -1, active: null, chapter: null, film: null, cinema: null};
window.__mediral = state; // read-only QA hook

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const pad = n => String(n).padStart(2, '0');
const baht = n => `฿${n.toLocaleString('th-TH')}`;
const thaiDate = iso => new Date(`${iso}T12:00:00+07:00`).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'});

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
  if (!state.data.set.show_offer) return;
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
  return `<span class="mr-pack" style="${style}"><img src="${asset(step.image)}" alt="${decorative ? '' : esc(step.image_alt)}" loading="${loading}" decoding="async"></span>`;
}
// Chapters are added inside the one viewport, beneath the shared foam and ring that carry them.
// Each also gets an invisible marker so #step-* links and the rail land on its first composed hold.
function renderStory() {
  const view = $('[data-view]');
  const actors = $('[data-layer="fx.foam"]', view);
  const story = state.data.steps.filter(step => SHOTS[step.id] && CHAPTERS.some(c => c.id === step.id));
  actors.insertAdjacentHTML('beforebegin', story.map(step => SHOTS[step.id](step, asset)).join(''));
  // The reassembled set sits beneath every chapter, so PO can dissolve away over it.
  if (story.length === state.data.steps.length) $('[data-shot="routine"]', view).insertAdjacentHTML('afterend', closingShot(state.data.steps, state.data.set, asset, state.data.route));
  $('#routine').insertAdjacentHTML('afterend', story.map(step => `<span class="mr-mark" id="step-${step.id}" data-mark="${step.id}" data-step="${step.id}"></span>`).join(''));
  // The story index for assistive technology lists every attributed beat once.
  const index = story.map(step => `<ol class="mr-sr" aria-label="เรื่องที่แบรนด์เล่าใน${esc(step.nick)}">${(step.selling?.beats || []).map((beat, i) => `<li id="beat-${step.id}-${i}" data-selling-step="${step.id}" data-beat-index="${i}"><strong>${esc(beat.kicker)}: ${esc(beat.title)}</strong> ${esc(beat.body)}${beat.names?.length ? ` (${beat.names.map(esc).join(', ')})` : ''}</li>`).join('')}</ol>`).join('');
  $('[data-shot="routine"]', view).insertAdjacentHTML('beforeend', `<div class="mr-sr">${index}</div>`);
}

function renderRail() {
  const told = state.data.steps.filter(step => $(`#step-${step.id}`));
  const items = told.map(step => `
    <a href="#step-${step.id}" data-rail="${step.id}" data-tone="${step.tone.key}" aria-label="ชิ้นที่ ${step.order} ${esc(step.tone.word)} ${esc(step.nick)}">
      <span class="mr-rail__label">${pad(step.order)} ${esc(step.nick)}</span>
      <span class="mr-rail__dot"><b>${step.order}</b></span>
    </a>`).join('');
  slot('rail').innerHTML = items + `<a href="#set" class="mr-rail__set" data-rail="set" aria-label="ดูชุด 5 ชิ้น"><span class="mr-rail__label">ชุด 5 ชิ้น</span><span class="mr-rail__dot">5/5</span></a>`;
}

// The real exchange, as the unchanged original screenshot, then Teem's own experience in his words.
function renderTrust() {
  const {exchange} = state.data;
  const target = slot('trust');
  if (!target || !exchange) return;
  const shot = exchange.screenshot;
  const [first, reply] = exchange.messages;
  const said = `${first.text} — ${reply.text}`;
  target.innerHTML = `<figcaption class="mr-trust__intro" id="trust-title">${esc(exchange.intro)}</figcaption>
    <a class="mr-trust__shot" href="${asset(shot.src)}" target="_blank" rel="noopener">
      <img src="${asset(shot.src)}" width="${shot.width}" height="${shot.height}" loading="lazy" decoding="async"
        alt="${esc(`ภาพแชตจริง: Teem ส่งข้อความว่า “${first.text}” และเจ้าของ Mediral ตอบว่า “${reply.text}”`)}">
    </a>
    <p class="mr-trust__caption">${esc(shot.caption)} · <span>เปิดดูภาพเต็ม</span></p>
    <blockquote class="mr-trust__experience"><p>${esc(exchange.experience.text)}</p>
      <footer>— ${esc(exchange.experience.credit)} <small>${esc(exchange.experience.note)}</small></footer></blockquote>
    <p class="mr-sr">${esc(said)}</p>`;
}

// One order channel, read from data: every LINE action on the page shows the same verified link.
function renderOrder() {
  const {order, steps} = state.data;
  const verified = order?.status === 'verified' && /^https:\/\//.test(order.url || '');
  $$('[data-slot="line-link"]').forEach(link => {
    link.hidden = !verified;
    if (verified) Object.assign(link, {href: order.url, target: '_blank', rel: 'noopener', textContent: order.label});
  });
  slot('order-title').textContent = order.heading;
  slot('order-how').textContent = order.how;
  slot('order-note').textContent = order.note;
  // The route in one short line, then one list: each piece's number, colour and name, its own page,
  // and whether to mention it in the chat.
  slot('route-close').textContent = state.data.route.close;
  slot('pieces').insertAdjacentHTML('beforeend', steps.map(step => `
    <label class="mr-pick" data-row="${step.id}">
      <input type="checkbox" value="${step.id}" checked data-piece>
      ${packImage(step, {decorative: true})}
      <span class="mr-pick__name"><span class="mr-pick__mark">${toneMark(step)}</span>${esc(step.order_name)}<small>${esc(step.nick)}${step.id === 'PO' ? ' · เมื่ออยากแต่ง' : ''} · ${esc(step.scene.headline.join(' '))}</small></span>
      <a class="mr-pick__more" href="${detailHref(step)}">รายละเอียด <span aria-hidden="true">→</span></a>
    </label>`).join(''));
}

// A dated poster offer is shown only when the data says it may be; otherwise the slot stays empty.
function renderOffer() {
  const {poster, show_offer: showOffer} = state.data.set;
  const target = slot('offer');
  target.hidden = !showOffer;
  if (!showOffer) { target.innerHTML = ''; return; }
  if (!fullSelection()) {
    target.innerHTML = '<p>รายการที่บันทึกนี้ไม่ใช่ชุดขาย 5 ชิ้น จึงไม่แสดงราคาชุดกับรายการนี้ ราคาสินค้าแยกชิ้นให้ดูที่ร้าน</p>';
    return;
  }
  const phase = posterPhase(poster);
  target.innerHTML = phase === 'within'
    ? `<p class="mr-offer__label"><span class="mr-tag mr-tag--warn">ข้อเสนอที่พบในสื่อแบรนด์</span></p>
       <p class="mr-offer__price">${baht(poster.price)} <small>ชุด 5 ชิ้น</small></p>
       <p>โปสเตอร์ระบุช่วง ${thaiDate(poster.valid_from)} – ${thaiDate(poster.valid_to)} · ${esc(poster.gift)} · ${esc(poster.terms)}</p>
       <p>${esc(poster.note)} ราคาจริงยืนยันในแชตก่อนสั่ง</p>`
    : phase === 'unknown'
      ? '<p>ยังยืนยันช่วงเวลาของข้อเสนอไม่ได้ ดูราคาและข้อเสนอปัจจุบันที่ร้าน</p>'
      : `<p class="mr-offer__label"><span class="mr-tag">${phase === 'upcoming' ? 'ยังไม่ถึงช่วงข้อเสนอในโปสเตอร์' : 'ข้อเสนอในโปสเตอร์สิ้นสุดแล้ว'}</span></p>
         <p>โปสเตอร์ชุด 5 ชิ้นที่เราได้รับระบุช่วง ${thaiDate(poster.valid_from)} – ${thaiDate(poster.valid_to)} ดูราคาและข้อเสนอปัจจุบันที่ร้าน</p>`;
}

// The chosen pieces become a short message the reader may paste in LINE; nothing is sent from here.
function renderMessage() {
  const chosen = state.data.steps.filter(s => state.selection.has(s.id));
  slot('message').textContent = chosen.length ? copyText() : 'ยังไม่ได้เลือกชิ้นไหน เลือกอย่างน้อยหนึ่งชิ้น หรือแอด LINE แล้วถามได้เลย';
  $$('[data-row]').forEach(f => f.classList.toggle('is-off', !state.selection.has(f.dataset.row)));
  $$('[data-action="copy"]').forEach(b => { b.disabled = !chosen.length; });
  renderOffer();
  renderBuy();
}

// A store link appears only once its destination is verified; a commission link is disclosed beside it.
// Without one, the working actions are the way forward and no button pretends checkout exists.
function verifiedLink(buy) {
  if (buy.status === 'verified' && /^https:\/\//.test(buy.affiliate_url || '')) return {href: buy.affiliate_url, rel: 'noopener sponsored', sponsored: true};
  return null;
}
function renderBuy() {
  const {buy, disclosure} = state.data;
  const actions = slot('actions');
  // The brand's own profile (footer) is a verified place to learn more, for any list: it is not
  // the set's checkout, a price, or a commission link.
  const profile = slot('profile-link');
  const verifiedProfile = buy.profile?.status === 'verified' && /^https:\/\//.test(buy.profile.url || '');
  profile.hidden = !verifiedProfile;
  if (verifiedProfile) Object.assign(profile, {href: buy.profile.url, target: '_blank', rel: 'noopener', textContent: buy.profile.label});
  else profile.removeAttribute('href');
  let link = slot('buy-link');
  const target = fullSelection() ? verifiedLink(buy) : null;
  if (!target) {
    link?.remove?.();
    slot('disclosure').hidden = true;
    slot('disclosure').textContent = '';
    return;
  }
  if (!link) {
    link = document.createElement('a');
    link.className = 'mr-btn';
    link.dataset.slot = 'buy-link';
    actions.prepend(link);
  }
  Object.assign(link, {href: target.href, target: '_blank', rel: target.rel, textContent: buy.cta_label});
  slot('disclosure').hidden = !target.sponsored;
  slot('disclosure').textContent = target.sponsored ? disclosure : '';
}

/* ---------- actions ---------- */
function copyText() {
  const {order, steps} = state.data;
  const chosen = steps.filter(s => state.selection.has(s.id));
  return chosen.length === steps.length ? order.message_all : `${order.message_some} ${chosen.map(s => s.order_name).join(', ')}`;
}

async function copyList() {
  if (!state.selection.size) return;
  const text = copyText();
  try {
    await navigator.clipboard.writeText(text);
    slot('buy-hint').textContent = 'คัดลอกข้อความแล้ว วางในแชต LINE ได้เลย';
  } catch {
    const hint = slot('buy-hint');
    hint.textContent = '';
    const label = document.createElement('label');
    label.className = 'mr-copy-fallback';
    label.textContent = 'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความในช่องนี้แล้วคัดลอกไปวางใน LINE ได้เลย';
    const field = document.createElement('textarea');
    field.readOnly = true;
    field.rows = 4;
    field.value = text;
    field.setAttribute('aria-label', 'ข้อความสั่ง Mediral สำหรับคัดลอก');
    label.append(field);
    hint.append(label);
    field.focus();
    field.select();
  }
}

/* ---------- scroll → story progress ---------- */
// The story index: the opening, one marker per told product, then the set.
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
    // A chapter marker covers its whole stretch of the story; an ordinary section ends one screen early.
    const span = Math.max(1, sec.dataset?.mark ? sec.offsetHeight : sec.offsetHeight - vh);
    const end = i < list.length - 1 ? 0.9995 : 1;
    const t = Math.min(end, Math.max(0, -r.top / span));
    // Native anchor navigation stops below the fixed header. That is already this chapter,
    // even when its top has not crossed the viewport's absolute top yet.
    if (r.top <= Math.max(vh * 0.001, anchorClearance(sec) + .5) || i === 0) u = i - 1 + t;
  });
  return u;
}

function readingChapter() {
  const readingTop = Math.min(innerHeight / 3, ($('.mr-header')?.getBoundingClientRect().bottom || 88) + 16);
  return $$('.mr-reading-chapter').find(chapter => {
    const rect = chapter.getBoundingClientRect();
    return rect.top <= readingTop && rect.bottom > readingTop;
  });
}

// AC's film plays from the portal to the lens, once per visit. Leaving the chapter well behind (or
// ahead) and coming back is a new visit: the film starts again from its first frame.
const FILM_WINDOW = [3.25, 6.35];
const FILM_AWAY = [2.6, 7.4];
const filmVisit = {away: true};
const resizing = {held: null};

function onScroll() {
  if (!state.data) return;
  // Every layout read comes before the cinema writes this frame's poses: no forced style recalc.
  const chapter = readingChapter();
  const u = progress();
  const storyRect = $('#story').getBoundingClientRect();
  const T = state.cinema ? state.cinema.render() : 0;
  if (chapter) document.body.dataset.readingChapter = chapter.id;
  else delete document.body.dataset.readingChapter;
  state.u = u;
  const i = Math.min(state.data.steps.length, Math.floor(u));
  // The index counts story markers, so it names whichever chapter the marker list really holds.
  const activeId = i < 0 ? 'routine' : sections()[i + 1]?.dataset?.step || 'set';
  if (activeId !== state.active) {
    state.active = activeId;
    document.body.dataset.step = activeId;
  }
  // The header takes the colour of the chapter on screen; after the story it returns to ivory.
  const inStory = Boolean(state.cinema) && !state.cinema.state.flow && storyRect.bottom > innerHeight * 0.5;
  // It leads the chapter marker slightly: a portal is mostly open before its chapter's first hold.
  const chapterId = inStory ? (CHAPTERS[state.cinema.chapterAt(T + 0.3)]?.id || 'routine') : 'page';
  if (chapterId !== state.chapter) document.body.dataset.chapter = state.chapter = chapterId;
  const order = sections().slice(1).map(sec => sec.dataset?.step || 'set');
  $$('[data-rail]').forEach(a => {
    const k = order.indexOf(a.dataset.rail);
    const current = a.dataset.rail === activeId;
    a.classList.toggle('is-active', current);
    a.classList.toggle('is-done', a.dataset.rail !== 'set' && k >= 0 && u >= k + 0.92);
    if (current) a.setAttribute('aria-current', 'step');
    else a.removeAttribute('aria-current');
  });
  // The last frame measured with a settled layout: a resize burst restores the reader from it.
  if (!resizing.held && state.cinema && !state.cinema.state.flow) {
    const {H} = state.cinema.state.layout;
    state.stable = {T, H, inTrack: storyRect.top <= 0 && storyRect.bottom > H};
  }
  const filmOn = inStory && T >= FILM_WINDOW[0] && T <= FILM_WINDOW[1] && document.visibilityState !== 'hidden';
  // Edges only: leaving AC deactivates the film once; coming back after truly leaving rewinds it once,
  // before it may play. Frames spent elsewhere, and tab visibility, never seek it.
  const away = !inStory || T < FILM_AWAY[0] || T > FILM_AWAY[1];
  if (state.film && away !== filmVisit.away) {
    if (away) state.film.setActive(false);
    else state.film.rewind?.();
    filmVisit.away = away;
  }
  state.film?.setActive(filmOn);
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

/* ---------- cinema ---------- */
// Same queries as the inline head script and the CSS: flow reading, and tall compositions.
const flowQuery = matchMedia('(prefers-reduced-motion: reduce), (max-height: 520px)');
const tallQuery = matchMedia('(max-aspect-ratio: 1/1)');

// Switching between cinema and flow keeps the reader on the same chapter.
function keepChapter(update) {
  const marks = $$('#story [data-mark]');
  const current = [...marks].reverse().find(mark => mark.getBoundingClientRect().top <= 1);
  const fraction = current ? Math.min(1, Math.max(0, -current.getBoundingClientRect().top / Math.max(1, current.offsetHeight))) : 0;
  const pastStory = $('#story').getBoundingClientRect().bottom < 0;
  update();
  if (current && !pastStory && scrollY > 10) {
    window.scrollTo({top: current.getBoundingClientRect().top + scrollY + fraction * current.offsetHeight, behavior: 'instant'});
  }
  onScroll();
}

function bootCinema() {
  const section = $('#story');
  // The viewport clips (CSS overflow: clip). Where a browser still treats it as scrollable, any
  // internal scroll a focus or scroll-into-view caused is undone at once: only the page scrolls.
  section.addEventListener?.('scroll', event => {
    const el = event.target;
    if (el !== section && el?.nodeType === 1 && (el.scrollTop || el.scrollLeft)) { el.scrollTop = 0; el.scrollLeft = 0; }
  }, {capture: true, passive: true});
  state.cinema = createCinema({section, view: $('[data-view]', section), score, tallQuery});
  const applyFlow = () => {
    root.classList.toggle('mr-flow', flowQuery.matches);
    state.cinema.setFlow(flowQuery.matches);
  };
  applyFlow();
  const onFlowChange = () => keepChapter(applyFlow);
  if (flowQuery.addEventListener) flowQuery.addEventListener('change', onFlowChange);
  else flowQuery.addListener(onFlowChange);
  // Text boxes change size when the web font arrives; homes are measured again, never guessed.
  const remeasure = () => {
    if (state.cinema.state.flow) state.cinema.placeFlowMarks();
    else state.cinema.measure();
    requestScroll();
  };
  Promise.resolve(document.fonts?.ready).then(remeasure, remeasure);
  addEventListener('load', remeasure, {once: true});
  // A new viewport changes the track's pixel length, so the same scroll offset would be another
  // moment. The first resize of a burst keeps the last stable T; once the burst settles the reader
  // returns to that T — only if they were inside the story and did nothing themselves meanwhile.
  // By the time a resize event arrives the layout has already changed, so the position to keep is the
  // last settled frame's, not one measured now.
  let resizeTimer;
  const released = () => { if (resizing.held) resizing.held.touched = true; };
  ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'].forEach(event => addEventListener(event, released, {capture: true, passive: true}));
  addEventListener('resize', () => {
    if (!resizing.held) resizing.held = {...(state.stable || {T: 0, inTrack: false}), touched: false};
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const keep = resizing.held;
      resizing.held = null;
      remeasure();
      // A phone's toolbar also fires resize while scrolling, without changing svh: the track is the
      // same length then, so the reader's own scroll stands.
      if (keep.inTrack && !keep.touched && !state.cinema.state.flow && state.cinema.state.layout.H !== keep.H) {
        const top = $('#story').getBoundingClientRect().top + scrollY;
        window.scrollTo({top: top + keep.T * state.cinema.state.layout.H, behavior: 'instant'});
        onScroll();
      }
    }, 120);
  });
}

// Older links land on what now tells the same thing: the film and beats on their product,
// the retired maker and reader chapters on the set, where their exchange now lives.
function legacyTarget(hash) {
  if (hash === '#lab-film') return '#step-AC';
  if (['#serums', '#ingredients'].includes(hash)) return '#set';
  const beat = /^#beat-([A-Z]{2})-\d+$/.exec(hash || '');
  if (beat) return `#step-${beat[1]}`;
  return ['#founder', '#relay'].includes(hash) ? '#set' : null;
}
// An old link to a product's full ingredient list goes to that product's own page.
function productPageFor(hash) {
  const id = /^#formula-([A-Z]{2})$/.exec(hash || '')?.[1];
  const step = id && state.data?.steps.find(s => s.id === id);
  return step ? `${detailHref(step)}#ingredients` : null;
}
function resolveHash(hash) {
  const legacy = legacyTarget(hash);
  if (legacy) return $(legacy);
  return [...sections(), ...$$('.mr-reading-chapter'), $('#order')].filter(Boolean).find(section => `#${section.id}` === hash) || null;
}

/* ---------- boot ---------- */
async function boot() {
  const res = await fetch(new URL('data/routine.json', base), {cache: 'no-cache'});
  if (!res.ok) throw new Error(`routine.json ${res.status}`);
  state.data = await res.json();
  state.selection = new Set(state.data.steps.map(s => s.id));
  const page = productPageFor(location.hash);
  if (page) { location.replace(page); return; }
  renderStory();
  renderRail();
  renderTrust();
  renderOrder();
  renderMessage();
  try {
    bootCinema();
  } catch (err) {
    // The story is an enhancement over readable chapters; its failure never hides the data.
    console.warn('[mediral] cinema unavailable, reading in normal flow', err);
    root.classList.add('mr-flow');
    state.cinema?.setFlow?.(true);
  }
  // Product markers are created after the document parses. Restore incoming chapter links now,
  // rather than relying on the browser's early hash pass.
  const incomingChapter = resolveHash(location.hash);
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
    // Match native links for chapters, beats and atlases. Re-measure after responsive/font layout.
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
    renderMessage();
  });
  // Same-document links resolve like fresh ones: legacy names, atlases opened before landing.
  addEventListener('hashchange', () => {
    const page = productPageFor(location.hash);
    if (page) { location.assign(page); return; }
    const target = resolveHash(location.hash);
    if (target && legacyTarget(location.hash)) {
      window.scrollTo({top: target.getBoundingClientRect().top + scrollY - anchorClearance(target), behavior: 'instant'});
    }
    onScroll();
  });
  document.addEventListener('click', e => {
    const act = e.target.closest('[data-action]');
    if (act?.dataset.action === 'copy') copyList();
  });

  addEventListener('scroll', requestScroll, {passive: true});
  addEventListener('resize', requestScroll);
  onScroll();
  (window.requestIdleCallback || (fn => setTimeout(fn, 200)))(bootFilm);
}

function bootFailed(err) {
  console.error('[mediral] boot failed', err);
  root.classList.remove('mr-js');
  root.classList.add('mr-flow', 'mr-nodata');
  const note = document.createElement('div');
  note.className = 'mr-alert';
  note.setAttribute('role', 'alert');
  note.innerHTML = `<p><strong>โหลดข้อมูลชุดไม่สำเร็จ</strong> ชุด 5 ชิ้น: 1 มูสโฟมล้างหน้า · 2 เซรั่มขวดขาว · 3 เซรั่มขวดเหลืองเขียว · 4 เซรั่มกันแดด · 5 แป้งพัฟ วิธีใช้จริงให้ยึดฉลากสินค้า</p>
    <button type="button" class="mr-btn mr-btn--small">ลองโหลดอีกครั้ง</button>`;
  note.querySelector('button').addEventListener('click', () => location.reload());
  $('#main').prepend(note);
  const summary = slot('summary');
  if (summary) summary.textContent = 'ข้อมูลชุดยังโหลดไม่ได้ — ดูข้อความด้านบนสุดของหน้า';
  $$('[data-action]').forEach(b => { b.disabled = true; });
}

boot().catch(bootFailed);

// The film is created with its product chapter. Its optional enhancement never blocks page data.
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
