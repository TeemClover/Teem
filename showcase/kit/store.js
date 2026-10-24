/**
 * Storefront engine: /showcase/shop/, /showcase/skincare/, /showcase/supplement/, /showcase/food/.
 * Search, categories, variants that change the picture, cart, coupon, a checkout that asks for no
 * personal data, and an order that lands in the same business's ERP demo through the bus.
 */
import {data, esc, money, $, $$, on, pic, art, icon, bus, orderNo, toast, sheet} from './kit.js';

const D = data();
const P = D.pack, B = D.biz, L = D.links;
const app = document.getElementById('app');
const shared = bus(D.demo.biz);
const CART_KEY = `myclover-showcase:cart:${D.demo.slug}`;
const byId = Object.fromEntries(P.products.map(p => [p.id, p]));
const state = {cat: 'all', q: '', sort: 'rec', cart: loadCart(), coupon: ''};

function loadCart() { try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart() { try { sessionStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch {} paintCount(); }

const variant = (p, vi = 0) => p.variants ? p.variants.options[vi] || p.variants.options[0] : null;
const priceOf = (p, vi = 0) => variant(p, vi)?.price ?? p.price;
const artOf = (p, vi = 0) => ({...p.art, ...(variant(p, vi)?.art || {})});
const picOf = (p, vi = 0, label = '') => p.img ? pic(p, {label}) : art(artOf(p, vi), {label, uid: `${p.id}v${vi}${Math.random().toString(36).slice(2, 6)}`});
const value = v => v && typeof v === 'object' && v.demo ? `<span class="st-demo">${esc(v.demo)}</span>` : esc(v);

/* ----------------------------------------------------------------- page */
function page() {
  const feature = P.hero.feature.map(id => byId[id]).filter(Boolean);
  return `<div class="st">
  <header class="st-head">
    <a class="st-logo" href="#top" aria-label="${esc(P.brand.name)} หน้าแรกร้าน"><span class="st-mark">${esc(P.brand.mark)}</span><span><b>${esc(P.brand.name)}</b><small>${esc(P.brand.en)}</small></span></a>
    <label class="st-search">${icon('search')}<input id="st-q" type="search" placeholder="ค้นหาสินค้า" aria-label="ค้นหาสินค้า" autocomplete="off"></label>
    <button class="st-cartbtn" type="button" data-cart aria-label="ตะกร้า">${icon('cart')}<span class="st-count" aria-hidden="true">0</span></button>
  </header>
  ${P.required ? `<p class="st-required">${P.required.map(esc).join(' · ')}</p>` : ''}
  <section class="st-hero" id="top">
    <div class="st-hero-copy">
      <p class="st-eyebrow">${esc(P.hero.eyebrow)}</p>
      <h1>${esc(P.hero.title)}</h1>
      <p class="st-sub">${esc(P.hero.sub)}</p>
      <div class="st-hero-cta"><a class="b-btn" href="#st-shop">เลือกซื้อเลย</a><button class="b-btn ghost" type="button" data-open="${esc(feature[0]?.id)}">ดูตัวที่ขายดี</button></div>
    </div>
    <div class="st-hero-art" aria-hidden="true">${feature.map((p, i) => `<div class="st-float f${i}">${picOf(p)}</div>`).join('')}</div>
  </section>
  <ul class="st-perks">${P.perks.map(t => `<li>${icon('check')}${esc(t)}</li>`).join('')}</ul>
  <section class="st-shop" id="st-shop" aria-label="สินค้า">
    <div class="st-tools">
      <div class="st-cats" role="group" aria-label="หมวดสินค้า">
        <button class="chip" type="button" data-cat="all" aria-pressed="true">ทั้งหมด</button>
        ${P.categories.map(c => `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="false">${esc(c.label)}</button>`).join('')}
      </div>
      <label class="st-sort"><span class="sr">เรียงสินค้า</span><select id="st-sort" class="input"><option value="rec">แนะนำ</option><option value="low">ราคาต่ำไปสูง</option><option value="high">ราคาสูงไปต่ำ</option></select></label>
    </div>
    <p class="st-found" id="st-found" aria-live="polite"></p>
    <div class="st-grid" id="st-grid"></div>
  </section>
  <section class="st-trust" aria-label="ข้อมูลสำคัญ">
    ${(P.required || []).map(t => `<p class="st-must">${esc(t)}</p>`).join('')}
    <ul>${P.notices.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
  </section>
  <footer class="st-foot">
    <div><b>${esc(P.brand.name)}</b> · ${esc(P.brand.tagline)}</div>
    <div class="st-foot-meta"><span>${esc(B.domain)}</span><span>ร้านสมมติเพื่อสาธิต ไม่มีการขายหรือส่งของจริง</span></div>
  </footer>
</div>`;
}

function card(p) {
  const multi = !!p.variants;
  return `<article class="st-card">
    <button class="st-pic" type="button" data-open="${p.id}" aria-label="ดูรายละเอียด ${esc(p.name)}">${picOf(p)}${p.tag ? `<span class="st-tag">${esc(p.tag)}</span>` : ''}</button>
    <div class="st-info">
      <h3><button type="button" data-open="${p.id}">${esc(p.name)}</button></h3>
      <p>${esc(p.short)}</p>
      ${p.variants ? `<p class="st-swatches" aria-label="${esc(p.variants.label)}ที่มี">${p.variants.options.map(o => `<span>${esc(o.label)}</span>`).join('')}</p>` : ''}
      <div class="st-row"><span class="price">${money(p.price)}${p.compare ? `<s>${money(p.compare)}</s>` : ''}</span>
      <button class="st-add" type="button" ${multi ? `data-open="${p.id}" aria-label="เลือก${esc(p.variants.label)} ${esc(p.name)}"` : `data-add="${p.id}" aria-label="ใส่ตะกร้า ${esc(p.name)}"`}>${icon('plus')}</button></div>
    </div>
  </article>`;
}

function paintGrid() {
  const q = state.q.trim().toLowerCase();
  let list = P.products.filter(p => (state.cat === 'all' || p.cat === state.cat) && (!q || `${p.name} ${p.short} ${p.desc}`.toLowerCase().includes(q)));
  if (state.sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
  if (state.sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
  $('#st-grid').innerHTML = list.length ? list.map(card).join('') : `<div class="st-empty"><p>ไม่พบสินค้าที่ตรงกับ “${esc(state.q)}”</p><button class="b-btn soft" type="button" data-clear>ดูสินค้าทั้งหมด</button></div>`;
  $('#st-found').textContent = q || state.cat !== 'all' ? `พบ ${list.length} รายการ` : '';
  $$('[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
}

function paintCount(bump = false) {
  const n = state.cart.reduce((s, l) => s + l.qty, 0);
  const btn = $('.st-cartbtn');
  if (!btn) return;
  btn.querySelector('.st-count').textContent = n;
  btn.dataset.empty = String(!n);
  btn.setAttribute('aria-label', `ตะกร้า ${n} ชิ้น`);
  if (bump) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
}

function addToCart(id, vi = 0, qty = 1) {
  const line = state.cart.find(l => l.id === id && l.vi === vi);
  if (line) line.qty += qty; else state.cart.push({id, vi, qty});
  saveCart();
  paintCount(true);
  const p = byId[id], v = variant(p, vi);
  toast(`ใส่ตะกร้าแล้ว: ${esc(p.name)}${v ? ` (${esc(v.label)})` : ''} <a href="#cart" data-cart>ดูตะกร้า</a>`);
}

/* ---------------------------------------------------------- product sheet */
function openProduct(id) {
  const p = byId[id];
  if (!p) return;
  let vi = 0, qty = 1;
  const s = sheet({title: esc(p.name), label: p.name, body: '', foot: ' '});
  const draw = () => {
    s.set(`<div class="st-detail">
      <div class="art-box st-detail-pic">${picOf(p, vi, p.name)}</div>
      <div class="st-detail-info">
        <p class="price st-detail-price">${money(priceOf(p, vi))}${p.compare ? `<s>${money(p.compare)}</s>` : ''}</p>
        <p>${esc(p.desc)}</p>
        ${p.variants ? `<fieldset class="st-variants"><legend>${esc(p.variants.label)}</legend><div>${p.variants.options.map((o, i) => `<button class="chip" type="button" role="radio" aria-checked="${i === vi}" data-vi="${i}">${esc(o.label)}${o.price ? ` · ${money(o.price)}` : ''}</button>`).join('')}</div></fieldset>` : ''}
        ${p.allergens?.length ? `<p class="st-allergens"><b>สารก่อภูมิแพ้:</b> ${p.allergens.map(a => `<span class="pill warn">${esc(a)}</span>`).join(' ')}</p>` : ''}
        <dl class="st-dl">${p.details.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${value(v)}</dd></div>`).join('')}</dl>
        ${P.required ? `<p class="st-must">${P.required.map(esc).join(' · ')}</p>` : ''}
      </div>
    </div>`);
    s.setFoot(`<div class="st-buy"><div class="qty" role="group" aria-label="จำนวน"><button type="button" data-q="-1" aria-label="ลดจำนวน">−</button><output>${qty}</output><button type="button" data-q="1" aria-label="เพิ่มจำนวน">+</button></div><button class="b-btn wide" type="button" data-buy>ใส่ตะกร้า · ${money(priceOf(p, vi) * qty)}</button></div>`);
  };
  draw();
  on(s.el, 'click', '[data-vi]', el => { vi = Number(el.dataset.vi); draw(); s.el.querySelector(`[data-vi="${vi}"]`)?.focus(); });
  on(s.el, 'click', '[data-q]', el => { qty = Math.max(1, Math.min(20, qty + Number(el.dataset.q))); draw(); });
  on(s.el, 'click', '[data-buy]', () => { addToCart(p.id, vi, qty); s.close(); });
}

/* ------------------------------------------------------------- cart flow */
function totals(methodId, payId) {
  const lines = state.cart.map(l => ({...l, p: byId[l.id]})).filter(l => l.p);
  const subtotal = lines.reduce((s, l) => s + priceOf(l.p, l.vi) * l.qty, 0);
  const c = P.coupon, code = state.coupon.trim().toUpperCase();
  let discount = 0, couponNote = '';
  if (code) {
    if (code !== c.code) couponNote = 'โค้ดนี้ใช้ไม่ได้';
    else if (c.min && subtotal < c.min) couponNote = `ใช้ได้เมื่อซื้อครบ ${money(c.min)}`;
    else { discount = c.pct ? Math.round(subtotal * c.pct / 100) : c.amount; couponNote = c.label; }
  }
  const method = P.shipping.methods.find(m => m.id === methodId) || P.shipping.methods[0];
  const after = subtotal - discount;
  const ship = method.fee && after < P.shipping.free ? method.fee : 0;
  const pay = P.payments.find(x => x.id === payId) || P.payments[0];
  const fee = pay.id === 'cod' ? 20 : 0;
  return {lines, subtotal, discount, couponNote, couponOk: discount > 0, method, ship, pay, fee, total: Math.max(0, after + ship + fee), toFree: Math.max(0, P.shipping.free - after)};
}

function summary(t) {
  return `<dl class="st-sum">
    <div><dt>ราคาสินค้า</dt><dd>${money(t.subtotal)}</dd></div>
    ${t.discount ? `<div class="good"><dt>ส่วนลด</dt><dd>−${money(t.discount)}</dd></div>` : ''}
    <div><dt>ค่าส่ง (${esc(t.method.label)})</dt><dd>${t.ship ? money(t.ship) : 'ฟรี'}</dd></div>
    ${t.fee ? `<div><dt>ค่าบริการเก็บเงินปลายทาง</dt><dd>${money(t.fee)}</dd></div>` : ''}
    <div class="total"><dt>รวมทั้งหมด</dt><dd>${money(t.total)}</dd></div>
  </dl>`;
}

function openCart() {
  let step = 'cart', methodId = P.shipping.methods[0].id, payId = P.payments[0].id, news = false;
  const s = sheet({title: 'ตะกร้าสินค้า', side: true, label: 'ตะกร้าสินค้า', foot: ' '});
  const draw = () => {
    const t = totals(methodId, payId);
    if (step === 'cart') {
      s.setTitle('ตะกร้าสินค้า');
      if (!t.lines.length) { s.set(`<div class="st-empty"><p>ตะกร้ายังว่าง</p><button class="b-btn soft" type="button" data-close>เลือกสินค้า</button></div>`); s.setFoot(''); return; }
      s.set(`<ul class="st-lines">${t.lines.map((l, i) => { const v = variant(l.p, l.vi); return `<li>
        <div class="art-box">${picOf(l.p, l.vi)}</div>
        <div><b>${esc(l.p.name)}</b>${v ? `<small>${esc(l.p.variants.label)}: ${esc(v.label)}</small>` : ''}<span class="price">${money(priceOf(l.p, l.vi) * l.qty)}</span></div>
        <div class="qty" role="group" aria-label="จำนวน ${esc(l.p.name)}"><button type="button" data-line="${i}" data-d="-1" aria-label="ลด">−</button><output>${l.qty}</output><button type="button" data-line="${i}" data-d="1" aria-label="เพิ่ม">+</button></div>
      </li>`; }).join('')}</ul>
      ${t.toFree > 0 ? `<p class="st-nudge">ซื้อเพิ่มอีก ${money(t.toFree)} ส่งฟรี</p>` : `<p class="st-nudge ok">ได้ส่งฟรีแล้ว</p>`}
      <form class="st-coupon" data-coupon><label class="field"><span>โค้ดส่วนลด (ลองใช้ ${esc(P.coupon.code)})</span><span class="st-coupon-row"><input class="input" name="code" value="${esc(state.coupon)}" autocomplete="off" autocapitalize="characters"><button class="b-btn soft sm" type="submit">ใช้โค้ด</button></span></label>${t.couponNote ? `<p class="${t.couponOk ? 'good' : 'bad'}">${esc(t.couponNote)}</p>` : ''}</form>
      ${summary(t)}`);
      s.setFoot(`<button class="b-btn wide" type="button" data-step="checkout">ไปชำระเงิน · ${money(t.total)}</button>`);
    } else if (step === 'checkout') {
      s.setTitle('ชำระเงิน');
      s.set(`<div class="st-check">
        <section><h3>ส่งถึง</h3><div class="st-addr"><b>คุณตัวอย่าง ทดลองสั่ง</b><span>99/9 ถนนสาธิต แขวงตัวอย่าง กรุงเทพฯ 10000</span><small>ข้อมูลตัวอย่าง ในงานจริงลูกค้ากรอกเอง และระบบขอความยินยอมก่อนเก็บข้อมูล</small></div></section>
        <section><h3>วิธีรับสินค้า</h3>${P.shipping.methods.map(m => `<label class="opt"><input type="radio" name="ship" value="${m.id}" ${m.id === methodId ? 'checked' : ''}><span class="grow">${esc(m.label)}<small>${esc(m.note)}</small></span><b>${m.fee ? money(m.fee) : 'ฟรี'}</b></label>`).join('')}</section>
        <section><h3>วิธีชำระเงิน</h3>${P.payments.map(m => `<label class="opt"><input type="radio" name="pay" value="${m.id}" ${m.id === payId ? 'checked' : ''}><span class="grow">${esc(m.label)}<small>${esc(m.note)}</small></span></label>`).join('')}</section>
        <section class="st-consent"><h3>ความยินยอม</h3>
          <label><input type="checkbox" checked disabled> ใช้ข้อมูลเพื่อจัดส่งคำสั่งซื้อนี้ (จำเป็น)</label>
          <label><input type="checkbox" name="news" ${news ? 'checked' : ''}> รับข่าวสารและโปรโมชันทาง LINE หรืออีเมล (ไม่บังคับ)</label>
        </section>
        ${summary(t)}
      </div>`);
      s.setFoot(`<div class="st-foot-row"><button class="b-btn ghost" type="button" data-step="cart">${icon('back')}กลับ</button><button class="b-btn wide" type="button" data-place>ยืนยันสั่งซื้อ (สาธิต ไม่ตัดเงิน)</button></div>`);
    }
  };
  draw();
  on(s.el, 'click', '[data-line]', el => {
    const l = state.cart[Number(el.dataset.line)];
    l.qty += Number(el.dataset.d);
    if (l.qty <= 0) state.cart.splice(Number(el.dataset.line), 1);
    saveCart(); draw();
  });
  on(s.el, 'submit', '[data-coupon]', (el, e) => { e.preventDefault(); state.coupon = el.code.value; draw(); });
  on(s.el, 'click', '[data-step]', el => { step = el.dataset.step; draw(); s.body.scrollTop = 0; });
  on(s.el, 'change', 'input[name="ship"]', el => { methodId = el.value; draw(); });
  on(s.el, 'change', 'input[name="pay"]', el => { payId = el.value; draw(); });
  on(s.el, 'change', 'input[name="news"]', el => { news = el.checked; });
  on(s.el, 'click', '[data-place]', () => {
    const t = totals(methodId, payId);
    const rec = shared.add('orders', {
      channel: 'web', status: 'new', demo: D.demo.slug, customer: 'ลูกค้าเว็บ (สาธิต)', consent: news,
      items: t.lines.map(l => ({id: l.id, name: l.p.name + (variant(l.p, l.vi) ? ` (${variant(l.p, l.vi).label})` : ''), qty: l.qty, price: priceOf(l.p, l.vi)})),
      subtotal: t.subtotal, discount: t.discount, ship: t.ship + t.fee, total: t.total, shipBy: t.method.label, pay: t.pay.label,
    });
    const no = orderNo(B.code, rec.n, rec.at, 'web');
    shared.patch('orders', rec.id, {no});
    state.cart = []; state.coupon = ''; saveCart();
    s.setTitle('สั่งซื้อสำเร็จ');
    s.set(`<div class="st-done">
      <div class="st-done-mark">${icon('check')}</div>
      <h3>ได้รับคำสั่งซื้อแล้ว</h3>
      <p class="st-no">เลขที่ <b>${esc(no)}</b></p>
      <ul class="st-lines mini">${rec.items.map(i => `<li><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}<li class="total"><span>รวม</span><span>${money(rec.total)}</span></li></ul>
      <ol class="st-next"><li>${icon('check')}บันทึกออเดอร์เข้าหลังบ้านแล้ว</li><li>${icon('check')}ตัดสต็อกสินค้าในหลังบ้านแล้ว</li><li>${icon('check')}ในงานจริง ระบบส่งข้อความยืนยันทาง LINE หรืออีเมล</li></ol>
      <p class="st-hint">ลองเปิดหลังบ้าน แล้วเปลี่ยนสถานะออเดอร์นี้ดู</p>
    </div>`);
    s.setFoot(`<div class="st-foot-col"><a class="b-btn wide" href="${esc(L.erp)}?order=${encodeURIComponent(rec.id)}" target="_blank" rel="noopener">เปิดหลังบ้าน ดูออเดอร์นี้ ${icon('next')}</a>${L.line ? `<a class="b-btn soft wide" href="${esc(L.line)}?ask=track" target="_blank" rel="noopener">ถามสถานะใน LINE OA</a>` : ''}<button class="b-btn ghost wide" type="button" data-close>ช้อปต่อ</button></div>`);
  });
}

/* ------------------------------------------------------------------ boot */
app.innerHTML = page();
paintGrid();
paintCount();
on(app, 'click', '[data-cat]', el => { state.cat = el.dataset.cat; paintGrid(); });
on(app, 'click', '[data-clear]', () => { state.cat = 'all'; state.q = ''; $('#st-q').value = ''; paintGrid(); });
on(document.body, 'click', '[data-open]', (el, e) => { e.preventDefault(); openProduct(el.dataset.open); });
on(app, 'click', '[data-add]', el => addToCart(el.dataset.add));
on(document.body, 'click', '[data-cart]', (el, e) => { e.preventDefault(); openCart(); });
$('#st-q').addEventListener('input', e => { state.q = e.target.value; paintGrid(); });
$('#st-sort').addEventListener('change', e => { state.sort = e.target.value; paintGrid(); });
document.documentElement.dataset.ready = 'store';
