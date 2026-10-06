// Offer cards, cart drawer and sticky buy bar shared by all booths. Prices come only from product.js.
import { config, offerById, normalizeCart, totalCart } from './product.js';
import { getCart, changeCart, record } from './store.js';
import { brands } from './brands/meta.js';
import { esc, baht, piecesOf, perPack, startPrice, href } from './ui.js';

const g = config.product.targetNetWeightGrams;
const weightOf = packs => `${(g * packs).toLocaleString('th-TH')} กรัม${config.product.weightConfirmed ? '' : ' (ขนาดเป้าหมาย)'}`;

export const shippingNote = 'ราคาไม่รวมค่าจัดส่ง ตรวจพื้นที่และยอดรวมก่อนยืนยันคำสั่งซื้อ';

/** notes: { single, trio, stock } brand-voiced one-liners. */
export function offerCards(brandId, notes) {
  const names = brands[brandId].offers;
  return `<ul class="offers" role="list">${config.offers.map(o => `
    <li class="offer" data-offer="${o.id}">
      <h3 class="offer-name">${esc(names[o.id])}</h3>
      <p class="offer-what"><strong>${o.packs} แพ็ก</strong> · แฮมเบิร์ก ${piecesOf(o)} ชิ้นพร้อมซอส</p>
      <p class="offer-price"><span class="offer-amount">${baht(o.priceBaht)}</span>
        <span class="offer-per">${o.packs > 1 ? `เฉลี่ยแพ็กละ ${perPack(o)}` : 'ราคาต่อแพ็ก'}</span></p>
      <p class="offer-weight">อาหารสุทธิรวม ${weightOf(o.packs)}</p>
      <p class="offer-note">${esc(notes[o.id])}</p>
      <div class="offer-buy">
        <div class="qty" role="group" aria-label="จำนวนชุด ${esc(names[o.id])}">
          <button type="button" class="qty-btn" data-qty="-1" aria-label="ลดจำนวนชุด">−</button>
          <output class="qty-val" aria-live="polite">1</output>
          <button type="button" class="qty-btn" data-qty="1" aria-label="เพิ่มจำนวนชุด">+</button>
        </div>
        <button type="button" class="btn btn-add" data-add="${o.id}">เพิ่มชุดนี้ในตะกร้า</button>
      </div>
      <p class="offer-incart" data-incart="${o.id}" hidden></p>
    </li>`).join('')}
  </ul>
  <p class="offers-ship">${shippingNote}</p>`;
}

export function cartButton() {
  return `<button type="button" class="cart-btn" data-open-cart aria-haspopup="dialog">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
    <span>ตะกร้า</span><span class="cart-count" data-cart-count>0</span>
  </button>`;
}

export function stickyBar(brandId) {
  return `<div class="sticky-buy" data-sticky hidden>
    <p><span class="sb-line">${config.product.packPieces} ชิ้นพร้อมซอส</span> <strong>เริ่ม ${startPrice()}</strong></p>
    <a class="btn" href="#offers">${esc(brands[brandId].buyCta)}</a>
  </div>`;
}

export function cartLines(brandId, { editable = true } = {}) {
  const names = brands[brandId].offers;
  const rows = normalizeCart(getCart(brandId));
  if (!rows.length) return '';
  return `<ul class="cart-lines" role="list">${rows.map(r => `
    <li class="cart-line" data-line="${r.id}">
      <div class="cl-info">
        <p class="cl-name">${esc(names[r.id])}</p>
        <p class="cl-meta">${r.quantity} ชุด · ${r.packs * r.quantity} แพ็ก · ${piecesOf(r) * r.quantity} ก้อน · ชุดละ ${baht(r.priceBaht)}</p>
      </div>
      ${editable ? `<div class="qty" role="group" aria-label="จำนวนชุด ${esc(names[r.id])}">
        <button type="button" class="qty-btn" data-line-step="-1" aria-label="ลดจำนวน">−</button>
        <output class="qty-val">${r.quantity}</output>
        <button type="button" class="qty-btn" data-line-step="1" aria-label="เพิ่มจำนวน" ${r.quantity >= 99 ? 'disabled' : ''}>+</button>
      </div>` : ''}
      <p class="cl-total">${baht(r.priceBaht * r.quantity)}</p>
      ${editable ? `<button type="button" class="link-btn" data-line-remove>นำออก</button>` : ''}
    </li>`).join('')}
  </ul>`;
}

export function summaryRows(brandId) {
  const t = totalCart(getCart(brandId));
  return `<dl class="sum">
    <div><dt>จำนวนชุด</dt><dd>${t.sets} ชุด</dd></div>
    <div><dt>จำนวนแพ็ก</dt><dd>${t.packs} แพ็ก · ${t.pieces} ก้อน</dd></div>
    <div><dt>ค่าสินค้า</dt><dd>${baht(t.subtotal)}</dd></div>
    <div><dt>ค่าจัดส่ง</dt><dd class="sum-pending">ยืนยันหลังตรวจพื้นที่</dd></div>
    <div class="sum-total"><dt>ยอดรวม</dt><dd>${baht(t.subtotal)} <small>+ ค่าจัดส่ง</small></dd></div>
  </dl>`;
}

function cartDialog(brandId) {
  return `<dialog class="cart" data-brand="${brandId}" aria-labelledby="cart-title">
    <div class="cart-inner">
      <header class="cart-head">
        <h2 id="cart-title">ตะกร้า ${esc(brands[brandId].name)}</h2>
        <button type="button" class="cart-close" data-close-cart aria-label="ปิดตะกร้า">×</button>
      </header>
      <div data-cart-body></div>
    </div>
  </dialog>`;
}

function cartBody(brandId) {
  const lines = cartLines(brandId);
  if (!lines) return `<p class="cart-empty">ยังไม่มีชุดในตะกร้าของบูธนี้</p>
    <a class="btn btn-ghost" href="#offers" data-close-cart>ไปเลือกชุด</a>`;
  return `${lines}${summaryRows(brandId)}
    <p class="preview-flag">หน้าทดลอง ยังไม่รับคำสั่งซื้อ</p>
    <a class="btn btn-block" data-link href="${href(`/checkout/?brand=${brandId}`)}">ไปสรุปชุดที่เลือก</a>
    <button type="button" class="link-btn cart-more" data-close-cart>เลือกชุดต่อ</button>`;
}

export function toast(text) {
  const el = document.querySelector('.toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('is-on'), 2600);
}

/** Quantity changes keep keyboard focus on the corresponding new control. */
export function replaceCartContent(container, html) {
  const active = document.activeElement;
  const wasInside = container.contains(active);
  const line = wasInside && active.closest('[data-line]')?.dataset.line;
  const step = wasInside && active.dataset.lineStep;
  container.innerHTML = html;
  if (!wasInside) return;
  const row = [...container.querySelectorAll('[data-line]')].find(el => el.dataset.line === line);
  const preferred = step && row?.querySelector(`[data-line-step="${step}"]:not([disabled])`);
  const fallback = row?.querySelector('button:not([disabled]), a') || container.querySelector('button:not([disabled]), a');
  (preferred || fallback)?.focus({ preventScroll: true });
}

/** Wires offers, cart drawer and counts inside a brand page. Returns cleanup. */
export function mountCommerce(root, brandId) {
  root.insertAdjacentHTML('beforeend', cartDialog(brandId));
  const dialog = root.querySelector('dialog.cart');
  const body = dialog.querySelector('[data-cart-body]');
  const names = brands[brandId].offers;

  const refresh = () => {
    const cart = getCart(brandId);
    const sets = Object.values(cart).reduce((a, b) => a + b, 0);
    root.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = sets; el.dataset.empty = sets ? 'no' : 'yes'; });
    root.querySelectorAll('[data-incart]').forEach(el => {
      const q = cart[el.dataset.incart];
      el.hidden = !q;
      if (q) el.innerHTML = `อยู่ในตะกร้า ${q} ชุด · <button type="button" class="link-btn" data-open-cart>ดูตะกร้า</button>`;
    });
    if (dialog.open) replaceCartContent(body, cartBody(brandId));
  };

  const onClick = e => {
    const t = e.target.closest('button, a');
    if (!t || !root.contains(t)) return;
    if (t.matches('[data-qty]')) {
      const card = t.closest('.offer');
      const out = card.querySelector('.qty-val');
      const v = Math.min(99, Math.max(1, Number(out.textContent) + Number(t.dataset.qty)));
      out.textContent = v;
      record('offer_select', brandId, { offer_id: card.dataset.offer, quantity: v });
    } else if (t.matches('[data-add]')) {
      const id = t.dataset.add;
      const q = Number(t.closest('.offer').querySelector('.qty-val').textContent);
      const now = getCart(brandId)[id] || 0;
      const next = Math.min(99, now + q);
      record('offer_select', brandId, { offer_id: id, quantity: q });
      if (next > now && changeCart(brandId, id, next)) {
        record('add_to_cart', brandId, { offer_id: id, quantity: next - now });
        toast(`เพิ่ม ${names[id]} ${next - now} ชุดในตะกร้าแล้ว`);
        t.closest('.offer').querySelector('.qty-val').textContent = 1;
      } else toast('ชุดนี้ในตะกร้าครบ 99 ชุดแล้ว');
      refresh();
    } else if (t.matches('[data-open-cart]')) {
      body.innerHTML = cartBody(brandId);
      dialog.showModal();
    } else if (t.matches('[data-close-cart]')) {
      dialog.close();
    } else if (t.matches('[data-line-step]')) {
      const id = t.closest('[data-line]').dataset.line;
      const q = (getCart(brandId)[id] || 0) + Number(t.dataset.lineStep);
      changeCart(brandId, id, Math.max(0, Math.min(99, q)));
      refresh();
    } else if (t.matches('[data-line-remove]')) {
      changeCart(brandId, t.closest('[data-line]').dataset.line, 0);
      refresh();
    }
  };
  // Clicking the backdrop closes the drawer.
  const onDialogClick = e => { if (e.target === dialog) dialog.close(); };

  root.addEventListener('click', onClick);
  dialog.addEventListener('click', onDialogClick);
  refresh();
  return () => root.removeEventListener('click', onClick);
}

/*
 * Mobile sticky buy bar. It hides while the hero CTA or a real add-to-cart button is
 * fully visible, never merely because the offers section has scrolled into view.
 */
export function mountSticky(root) {
  const bar = root.querySelector('[data-sticky]');
  if (!bar) return () => {};
  const targets = [...root.querySelectorAll('[data-hero-cta], [data-add]')];
  const visible = new Set();
  const update = () => {
    const show = visible.size === 0;
    bar.hidden = !show;
    document.body.classList.toggle('has-sticky', show);
  };
  const io = new IntersectionObserver(entries => {
    for (const e of entries) e.intersectionRatio >= 0.9 ? visible.add(e.target) : visible.delete(e.target);
    update();
  }, { threshold: [0, 0.9, 1] });
  targets.forEach(t => io.observe(t));
  return () => { io.disconnect(); document.body.classList.remove('has-sticky'); };
}
