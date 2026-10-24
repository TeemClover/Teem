/**
 * QR menu engine: /showcase/menu/ (?table=7). Thai/English, options with prices, allergen filters,
 * "send to kitchen" into the restaurant's bus, a live status tracker the ERP kitchen screen drives,
 * call-staff and check-bill. A kitchen simulator moves orders along when no kitchen screen is open.
 */
import {data, esc, money, $, $$, on, pic, icon, bus, orderNo, toast, sheet, param, hhmm} from './kit.js';

const D = data();
const P = D.pack, B = D.biz, L = D.links;
const app = document.getElementById('app');
const shared = bus(D.demo.biz);
const tableNo = /^\d{1,2}$/.test(param('table') || '') && +param('table') >= 1 && +param('table') <= P.info.tables ? param('table') : P.info.table;
const CART_KEY = `myclover-showcase:menu-cart:${tableNo}`;
const ALLERGEN_EN = {'ถั่วลิสง': 'Peanut', 'กุ้ง': 'Shrimp', 'นม': 'Milk', 'ไข่': 'Egg', 'ถั่วเหลือง': 'Soy', 'หอย': 'Shellfish', 'กลูเตน': 'Gluten', 'ถั่วเขียว': 'Mung bean', 'ปลา': 'Fish'};
const T = {
  th: {table: 'โต๊ะ', hint: 'สั่งจากโต๊ะได้เลย อาหารจะมาเสิร์ฟที่โต๊ะนี้', filters: 'กรองเมนู', veg: 'มังสวิรัติ', noPeanut: 'ไม่มีถั่ว', noShrimp: 'ไม่มีกุ้ง', mild: 'ไม่เผ็ด', none: 'ไม่มีเมนูที่ตรงตัวกรอง', add: 'ใส่ตะกร้า', cart: 'ดูรายการ', send: 'ส่งเข้าครัว', yourCart: 'รายการที่จะสั่ง', empty: 'ยังไม่ได้เลือกเมนู', note: 'หมายเหตุถึงครัว', qty: 'จำนวน', allergens: 'สารก่อภูมิแพ้', spicy: 'เผ็ด', vegan: 'มังสวิรัติ', status: 'สถานะอาหารของโต๊ะนี้', call: 'เรียกพนักงาน', bill: 'เช็กบิล', items: 'รายการ', total: 'รวม', sim: 'ครัวจำลองอัตโนมัติ', simOff: 'ปิดแล้วไปกดเองที่จอครัว', kitchen: 'ดูจอครัวในหลังบ้าน', s: {new: 'ส่งเข้าครัวแล้ว', doing: 'ครัวกำลังทำ', ready: 'พร้อมเสิร์ฟ', done: 'เสิร์ฟแล้ว', cancel: 'ยกเลิก'}, vat: 'ราคารวมภาษีมูลค่าเพิ่มแล้ว', pay: 'จ่ายด้วยพร้อมเพย์ที่โต๊ะ (สาธิต)', paid: 'ชำระแล้ว ขอบคุณค่ะ', called: 'แจ้งพนักงานแล้ว กำลังมาที่โต๊ะ', sent: 'ส่งเข้าครัวแล้ว'},
  en: {table: 'Table', hint: 'Order from your table. We will bring it to you.', filters: 'Filter menu', veg: 'Vegetarian', noPeanut: 'No peanuts', noShrimp: 'No shrimp', mild: 'Not spicy', none: 'Nothing matches these filters', add: 'Add', cart: 'View order', send: 'Send to kitchen', yourCart: 'Your order', empty: 'Nothing selected yet', note: 'Note to kitchen', qty: 'Qty', allergens: 'Allergens', spicy: 'Spicy', vegan: 'Vegetarian', status: 'Your table\'s orders', call: 'Call staff', bill: 'Check bill', items: 'items', total: 'Total', sim: 'Simulated kitchen', simOff: 'Turn off to press buttons on the kitchen screen', kitchen: 'Open the kitchen screen', s: {new: 'Sent to kitchen', doing: 'Cooking', ready: 'Ready to serve', done: 'Served', cancel: 'Cancelled'}, vat: 'Prices include VAT', pay: 'Pay by PromptPay at the table (demo)', paid: 'Paid. Thank you!', called: 'Staff notified', sent: 'Sent to kitchen'},
};
const state = {lang: 'th', filters: new Set(), cart: load(), sim: true};
const t = k => T[state.lang][k];
const nm = it => state.lang === 'en' ? it.en : it.name;
const lb = x => state.lang === 'en' ? (x.en || x.label) : x.label;

function load() { try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function save() { try { sessionStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch {} paintBar(); }

const optPrice = (it, sel) => (it.options || []).reduce((s, key) => s + (P.optionSets[key].choices.reduce((a, c, i) => a + (sel[key]?.includes(i) ? c.price || 0 : 0), 0)), 0);
const optText = (it, sel, notes = [], lang = 'th') => [...(it.options || []).flatMap(key => (sel[key] || []).map(i => { const c = P.optionSets[key].choices[i]; return lang === 'en' ? c.en : c.label; })), ...notes.map(i => lang === 'en' ? P.notes[i].en : P.notes[i].label)].join(', ');
const passes = it => [...state.filters].every(f => f === 'veg' ? it.tags.includes('vegan') : f === 'noPeanut' ? !it.allergens.includes('ถั่วลิสง') : f === 'noShrimp' ? !it.allergens.includes('กุ้ง') : f === 'mild' ? !it.tags.includes('spicy') : true);

function page() {
  return `<div class="mn-stage">
  <aside class="mn-aside" aria-label="เกี่ยวกับตัวอย่างนี้">
    <div class="mn-tent"><span class="mn-tent-mark">${esc(P.brand.mark)}</span><b>${esc(P.brand.name)}</b><div class="mn-qr" aria-hidden="true">${Array.from({length: 49}, (_, i) => `<i class="${[0, 1, 2, 7, 14, 15, 16, 4, 5, 6, 13, 20, 27, 28, 29, 34, 35, 36, 42, 43, 44, 9, 17, 23, 25, 31, 39, 46].includes(i) ? 'on' : ''}"></i>`).join('')}</div><span>สแกนเพื่อสั่งอาหาร · โต๊ะ ${esc(tableNo)}</span></div>
    <ol class="mn-steps"><li>ลูกค้าสแกน QR ที่โต๊ะ แล้วหน้านี้เปิดขึ้นพร้อมเลขโต๊ะ</li><li>เลือกเมนู ระดับเผ็ด ท็อปปิ้ง แล้วกด “ส่งเข้าครัว”</li><li>ออเดอร์ขึ้นจอครัวในหลังบ้าน สถานะที่โต๊ะเปลี่ยนตามที่ครัวกด</li></ol>
    <a class="b-btn" href="${esc(L.erp)}?view=kitchen" target="_blank" rel="noopener">${icon('chef')}เปิดจอครัวในแท็บใหม่</a>
    <p class="mn-aside-note">เปลี่ยนโต๊ะได้ที่ท้ายลิงก์ เช่น ?table=3</p>
  </aside>
  <div class="mn" id="mn">
    <header class="mn-head">
      <div class="mn-brand"><span class="mn-mark">${esc(P.brand.mark)}</span><div><b>${esc(P.brand.name)}</b><small id="mn-hours"></small></div></div>
      <button class="mn-lang" type="button" data-lang aria-label="Switch to English">EN</button>
    </header>
    <p class="mn-table"><span class="mn-tno" id="mn-tno"></span><span id="mn-hint"></span></p>
    <div class="mn-orders" id="mn-orders" aria-live="polite"></div>
    <nav class="mn-cats" id="mn-cats" aria-label="หมวดเมนู"></nav>
    <div class="mn-filters" id="mn-filters" role="group"></div>
    <div id="mn-list"></div>
    <p class="mn-vat" id="mn-vat"></p>
    <div class="mn-bar" id="mn-bar"></div>
  </div>
</div>`;
}

function paintStatic() {
  $('#mn-hours').textContent = state.lang === 'en' ? P.info.hoursEn : P.info.hours;
  $('#mn-tno').textContent = `${t('table')} ${tableNo}`;
  $('#mn-hint').textContent = t('hint');
  $('#mn-vat').textContent = state.lang === 'en' ? P.info.noteEn : P.info.note;
  const lang = $('[data-lang]');
  lang.textContent = state.lang === 'en' ? 'ไทย' : 'EN';
  lang.setAttribute('aria-label', state.lang === 'en' ? 'เปลี่ยนเป็นภาษาไทย' : 'Switch to English');
  document.documentElement.lang = state.lang;
  $('#mn-cats').innerHTML = P.categories.map(c => `<a class="chip" href="#cat-${c.id}">${esc(lb(c))}</a>`).join('');
  $('#mn-filters').setAttribute('aria-label', t('filters'));
  $('#mn-filters').innerHTML = ['veg', 'noPeanut', 'noShrimp', 'mild'].map(f => `<button class="chip" type="button" data-filter="${f}" aria-pressed="${state.filters.has(f)}">${esc(t(f))}</button>`).join('');
}

function row(it, big = false) {
  const tags = [it.tags.includes('spicy') ? `<span class="pill bad">${t('spicy')}</span>` : '', it.tags.includes('vegan') ? `<span class="pill ok">${t('vegan')}</span>` : ''].join('');
  return `<article class="mn-item${big ? ' big' : ''}">
    <button class="mn-pic" type="button" data-item="${it.id}" aria-label="${esc(nm(it))}">${pic(it, {label: ''})}</button>
    <div class="mn-text">
      <h3><button type="button" data-item="${it.id}">${esc(nm(it))}</button></h3>
      ${state.lang === 'th' ? `<p class="mn-en">${esc(it.en)}</p>` : ''}
      <p class="mn-desc">${esc(state.lang === 'en' ? it.descEn : it.desc)}</p>
      <p class="mn-tags">${tags}${it.allergens.length ? `<span class="mn-alg">${esc(it.allergens.map(a => state.lang === 'en' ? ALLERGEN_EN[a] || a : a).join(' · '))}</span>` : ''}</p>
    </div>
    <div class="mn-buy"><span class="price">${money(it.price)}</span><button class="mn-add" type="button" data-item="${it.id}" aria-label="${t('add')} ${esc(nm(it))}">${icon('plus')}</button></div>
  </article>`;
}

function paintList() {
  const html = P.categories.map(c => {
    const list = P.items.filter(it => (c.id === 'rec' ? it.rec : it.cat === c.id) && passes(it));
    if (!list.length) return '';
    return `<section class="mn-sec${c.id === 'rec' ? ' rec' : ''}" id="cat-${c.id}" aria-labelledby="h-${c.id}"><h2 id="h-${c.id}">${esc(lb(c))}</h2><div class="mn-rows">${list.map(it => row(it, c.id === 'rec')).join('')}</div></section>`;
  }).join('');
  $('#mn-list').innerHTML = html || `<p class="mn-none">${t('none')}</p>`;
}

/* ------------------------------------------------------------ item sheet */
function openItem(id) {
  const it = P.items.find(x => x.id === id);
  const sel = {};
  for (const key of it.options || []) { const set = P.optionSets[key]; sel[key] = set.type === 'one' ? [set.default ?? 0] : []; }
  const notes = new Set();
  let qty = 1;
  const s = sheet({title: esc(nm(it)), label: nm(it), foot: ' '});
  const draw = () => {
    s.set(`<div class="mn-detail">
      <div class="art-box">${pic(it, {label: nm(it)})}</div>
      <p>${esc(state.lang === 'en' ? it.descEn : it.desc)}</p>
      ${it.allergens.length ? `<p class="mn-detail-alg"><b>${t('allergens')}:</b> ${it.allergens.map(a => `<span class="pill warn">${esc(state.lang === 'en' ? ALLERGEN_EN[a] || a : a)}</span>`).join(' ')}</p>` : ''}
      ${(it.options || []).map(key => { const set = P.optionSets[key]; return `<fieldset class="mn-opt"><legend>${esc(lb(set))}</legend><div>${set.choices.map((c, i) => `<button class="chip" type="button" role="${set.type === 'one' ? 'radio' : 'checkbox'}" aria-checked="${sel[key].includes(i)}" data-opt="${key}" data-i="${i}">${esc(lb(c))}${c.price ? ` +${money(c.price)}` : ''}</button>`).join('')}</div></fieldset>`; }).join('')}
      <fieldset class="mn-opt"><legend>${t('note')}</legend><div>${P.notes.map((n, i) => `<button class="chip" type="button" role="checkbox" aria-checked="${notes.has(i)}" data-note="${i}">${esc(lb(n))}</button>`).join('')}</div></fieldset>
    </div>`);
    s.setFoot(`<div class="st-buy mn-buyrow"><div class="qty" role="group" aria-label="${t('qty')}"><button type="button" data-q="-1" aria-label="−">−</button><output>${qty}</output><button type="button" data-q="1" aria-label="+">+</button></div><button class="b-btn wide" type="button" data-addcart>${t('add')} · ${money((it.price + optPrice(it, sel)) * qty)}</button></div>`);
  };
  draw();
  on(s.el, 'click', '[data-opt]', el => {
    const key = el.dataset.opt, i = +el.dataset.i, set = P.optionSets[key];
    sel[key] = set.type === 'one' ? [i] : sel[key].includes(i) ? sel[key].filter(x => x !== i) : [...sel[key], i];
    draw(); s.el.querySelector(`[data-opt="${key}"][data-i="${i}"]`)?.focus();
  });
  on(s.el, 'click', '[data-note]', el => { const i = +el.dataset.note; notes.has(i) ? notes.delete(i) : notes.add(i); draw(); s.el.querySelector(`[data-note="${i}"]`)?.focus(); });
  on(s.el, 'click', '[data-q]', el => { qty = Math.max(1, Math.min(20, qty + +el.dataset.q)); draw(); });
  on(s.el, 'click', '[data-addcart]', () => {
    state.cart.push({id: it.id, sel, notes: [...notes], qty});
    save(); s.close();
    toast(`${esc(nm(it))} × ${qty} <a href="#cart" data-opencart>${t('cart')}</a>`);
  });
}

/* ---------------------------------------------------------- cart & send */
const lineOf = l => { const it = P.items.find(x => x.id === l.id); return {it, unit: it.price + optPrice(it, l.sel), text: optText(it, l.sel, l.notes, state.lang)}; };

function paintBar() {
  const n = state.cart.reduce((s, l) => s + l.qty, 0);
  const total = state.cart.reduce((s, l) => s + lineOf(l).unit * l.qty, 0);
  const mine = myOrders();
  $('#mn-bar').innerHTML = `${mine.length ? `<button class="mn-mini" type="button" data-call>${icon('bell')}${t('call')}</button><button class="mn-mini" type="button" data-bill>${icon('receipt')}${t('bill')}</button>` : ''}${n ? `<button class="b-btn mn-cartbtn" type="button" data-opencart><span class="mn-n">${n}</span>${t('cart')}<span class="price">${money(total)}</span></button>` : ''}`;
  $('#mn-bar').hidden = !n && !mine.length;
}

function openCart() {
  const s = sheet({title: t('yourCart'), label: t('yourCart'), foot: ' '});
  const draw = () => {
    if (!state.cart.length) { s.set(`<p class="mn-none">${t('empty')}</p>`); s.setFoot(''); return; }
    s.set(`<ul class="mn-lines">${state.cart.map((l, i) => { const {it, unit, text} = lineOf(l); return `<li><div><b>${esc(nm(it))}</b>${text ? `<small>${esc(text)}</small>` : ''}<span class="price">${money(unit * l.qty)}</span></div><div class="qty" role="group" aria-label="${t('qty')} ${esc(nm(it))}"><button type="button" data-l="${i}" data-d="-1" aria-label="−">−</button><output>${l.qty}</output><button type="button" data-l="${i}" data-d="1" aria-label="+">+</button></div></li>`; }).join('')}</ul>
      <p class="mn-total"><span>${t('total')}</span><b>${money(state.cart.reduce((a, l) => a + lineOf(l).unit * l.qty, 0))}</b></p>`);
    s.setFoot(`<button class="b-btn wide" type="button" data-send>${icon('chef')}${t('send')} · ${t('table')} ${esc(tableNo)}</button>`);
  };
  draw();
  on(s.el, 'click', '[data-l]', el => { const l = state.cart[+el.dataset.l]; l.qty += +el.dataset.d; if (l.qty <= 0) state.cart.splice(+el.dataset.l, 1); save(); draw(); });
  on(s.el, 'click', '[data-send]', () => {
    const items = state.cart.map(l => { const {it, unit} = lineOf(l); return {id: it.id, name: it.name, qty: l.qty, price: unit, opts: optText(it, l.sel, l.notes, 'th')}; });
    const total = items.reduce((a, i) => a + i.price * i.qty, 0);
    const rec = shared.add('orders', {channel: 'qr', status: 'new', demo: 'menu', table: tableNo, customer: `โต๊ะ ${tableNo}`, items, total, subtotal: total});
    shared.patch('orders', rec.id, {no: orderNo(B.code, rec.n, rec.at, 'qr')});
    state.cart = []; save(); s.close();
    toast(`${t('sent')} · ${t('table')} ${esc(tableNo)}`);
    simulate(rec.id);
    $('#mn-orders').scrollIntoView({behavior: 'smooth', block: 'start'});
  });
}

/* ------------------------------------------- live status from the kitchen */
const myOrders = () => shared.get().orders.filter(o => o.channel === 'qr' && o.table === tableNo && !o.paid).sort((a, b) => b.at - a.at);
const STEPS = ['new', 'doing', 'ready', 'done'];
function paintOrders() {
  const list = myOrders();
  const marks = shared.get().marks || {};
  $('#mn-orders').innerHTML = list.length ? `<h2>${t('status')}</h2>${list.map(o => {
    const st = marks[o.id] || o.status, at = STEPS.indexOf(st);
    return `<article class="mn-track" data-status="${st}"><header><b>${esc(o.no || '')}</b><span>${hhmm(o.at)} · ${o.items.reduce((a, i) => a + i.qty, 0)} ${t('items')}</span></header>
      <ol>${STEPS.map((k, i) => `<li class="${i < at ? 'past' : i === at ? 'now' : ''}">${esc(t('s')[k])}</li>`).join('')}</ol>
      <p>${o.items.map(i => `${esc(i.name)} × ${i.qty}`).join(' · ')}</p></article>`;
  }).join('')}<div class="mn-simrow"><label><input type="checkbox" data-sim ${state.sim ? 'checked' : ''}> ${t('sim')}</label><small>${t('simOff')}</small><a href="${esc(L.erp)}?view=kitchen" target="_blank" rel="noopener">${t('kitchen')}</a></div>` : '';
  paintBar();
}

const timers = new Map();
function simulate(id) {
  const step = (from, to, ms) => setTimeout(() => {
    if (!state.sim) return;
    const s = shared.get(), o = s.orders.find(x => x.id === id);
    if (!o) return;
    const now = (s.marks || {})[id] || o.status;
    if (now === from) shared.mutate(x => { x.marks = {...(x.marks || {}), [id]: to}; });
  }, ms);
  timers.set(id, [step('new', 'doing', 7000), step('doing', 'ready', 17000), step('ready', 'done', 29000)]);
}

function openBill() {
  const list = myOrders();
  const items = list.flatMap(o => o.items);
  const total = items.reduce((a, i) => a + i.price * i.qty, 0);
  shared.add('calls', {table: tableNo, kind: 'bill'});
  const s = sheet({title: `${t('bill')} · ${t('table')} ${esc(tableNo)}`, foot: ' '});
  s.set(`<ul class="mn-lines bill">${items.map(i => `<li><div><b>${esc(i.name)} × ${i.qty}</b>${i.opts ? `<small>${esc(i.opts)}</small>` : ''}</div><span class="price">${money(i.price * i.qty)}</span></li>`).join('')}</ul>
    <p class="mn-total"><span>${t('total')}</span><b>${money(total)}</b></p><p class="mn-vat">${t('vat')} (VAT ${money(total * 7 / 107)})</p>`);
  s.setFoot(`<button class="b-btn wide" type="button" data-pay>${t('pay')}</button>`);
  on(s.el, 'click', '[data-pay]', () => {
    shared.mutate(x => { x.orders = x.orders.map(o => list.some(m => m.id === o.id) ? {...o, paid: true, pay: 'พร้อมเพย์', marks: undefined} : o); x.marks = {...(x.marks || {}), ...Object.fromEntries(list.map(o => [o.id, 'done']))}; });
    s.close(); toast(t('paid'));
  });
}

/* ------------------------------------------------------------------ boot */
app.innerHTML = page();
const repaint = () => { paintStatic(); paintList(); paintOrders(); };
repaint();
shared.on(paintOrders);
on(app, 'click', '[data-item]', el => openItem(el.dataset.item));
on(document.body, 'click', '[data-opencart]', (el, e) => { e.preventDefault(); openCart(); });
on(app, 'click', '[data-lang]', () => { state.lang = state.lang === 'th' ? 'en' : 'th'; repaint(); });
on(app, 'click', '[data-filter]', el => { const f = el.dataset.filter; state.filters.has(f) ? state.filters.delete(f) : state.filters.add(f); paintStatic(); paintList(); });
on(app, 'change', '[data-sim]', el => { state.sim = el.checked; if (state.sim) myOrders().forEach(o => simulate(o.id)); });
on(app, 'click', '[data-call]', () => { shared.add('calls', {table: tableNo, kind: 'staff'}); toast(t('called')); });
on(app, 'click', '[data-bill]', openBill);
myOrders().forEach(o => simulate(o.id));
document.documentElement.dataset.ready = 'menu';
