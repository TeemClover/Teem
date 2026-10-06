// "/checkout/?brand=…" — shared checkout in the selected booth's identity. One booth per checkout.
import { brandIds, config, totalCart, orderAdapter } from '../product.js';
import { getCart, changeCart, record } from '../store.js';
import { brands } from '../brands/meta.js';
import { cartLines, summaryRows, replaceCartContent } from '../commerce.js';
import { esc, href, baht, facts } from '../ui.js';

const brandParam = () => new URLSearchParams(location.search).get('brand');

export function meta() {
  const b = brands[brandParam()];
  return { title: b ? `สรุปชุดที่เลือก · ${b.name}` : 'สรุปชุดที่เลือก · Hamburg Food Fair', description: 'สรุปชุดแฮมเบิร์กที่เลือก', noindex: true };
}

/** Final button state from Arena_Prd §4. Never claims an order from a click. */
function finalAction() {
  if (config.salesMode !== 'live') return { kind: 'preview', label: 'สรุปชุดที่เลือก' };
  const url = orderAdapter();
  if (!url) return { kind: 'blocked', label: 'ช่องทางสั่งซื้อยังไม่พร้อม' };
  if (!config.commercial.shippingRules) return { kind: 'ask', label: 'สอบถามพื้นที่และยอดรวม', url };
  return { kind: 'order', label: 'ดำเนินการสั่งซื้อ', url };
}

function body(id) {
  const b = brands[id];
  const t = totalCart(getCart(id));
  if (!t.sets) return `<div class="co-empty">
    <p>ยังไม่มีชุดในตะกร้าของบูธ ${esc(b.name)}</p>
    <a class="btn" data-link href="${href(`/${id}/#offers`)}">${esc(b.buyCta)}</a>
  </div>`;
  const action = finalAction();
  const others = brandIds.filter(o => o !== id && totalCart(getCart(o)).sets > 0);
  return `<div class="co-grid">
    <section class="co-lines" aria-labelledby="co-lines-title">
      <h2 id="co-lines-title">ชุดที่เลือก</h2>
      ${cartLines(id)}
      <a class="text-link" data-link href="${href(`/${id}/#offers`)}">← กลับไปเลือกชุด</a>
      <div class="co-ship">
        <h3>ตรวจพื้นที่จัดส่ง</h3>
        <p>${esc(facts.fulfilment())}</p>
        <p>ค่าจัดส่งยังไม่รวมในยอดนี้ จะแจ้งหลังตรวจพื้นที่</p>
      </div>
      ${others.length ? `<p class="co-others">คุณมีตะกร้าที่บูธ ${others.map(o => `<a data-link href="${href(`/checkout/?brand=${o}`)}">${esc(brands[o].name)}</a>`).join(' และ ')} เป็นร่างแยก ซึ่งจะไม่ถูกรวมในสรุปนี้</p>` : ''}
    </section>
    <aside class="co-summary" aria-labelledby="co-sum-title">
      <h2 id="co-sum-title">สรุปยอด</h2>
      ${summaryRows(id)}
      ${action.kind === 'preview' ? '<p class="preview-flag">หน้าทดลอง ยังไม่รับคำสั่งซื้อ</p>' : ''}
      ${action.url
        ? `<a class="btn btn-block" data-intent href="${esc(action.url)}" target="_blank" rel="noopener">${action.label}</a>`
        : `<button type="button" class="btn btn-block" data-final ${action.kind === 'blocked' ? 'disabled' : ''}>${action.label}</button>`}
      <div class="co-result" data-result tabindex="-1" hidden></div>
      ${facts.seller().map(s => `<p class="co-seller">${esc(s)}</p>`).join('')}
    </aside>
  </div>`;
}

export function render() {
  const id = brandParam();
  if (!brandIds.includes(id)) return `<div class="page checkout" data-brand="arena"><main id="main" class="co-wrap">
    <h1>เลือกบูธก่อนสรุปชุด</h1>
    <p>ลิงก์นี้ไม่ได้ระบุบูธที่ถูกต้อง</p>
    <a class="btn" data-link href="${href('/')}">ไปหน้าเลือกบูธ</a>
  </main></div>`;
  const b = brands[id];
  return `<div class="page checkout co-${id}" data-brand="${id}">
    <header class="co-head">
      <a class="back-link" data-link href="${href(`/${id}/`)}"><span aria-hidden="true">←</span> กลับบูธ ${esc(b.name)}</a>
      <p class="co-brand"><strong>${esc(b.name)}</strong> <span>${esc(b.sub)}</span></p>
    </header>
    <main id="main" class="co-wrap">
      <h1>สรุปชุดที่เลือก</h1>
      <div data-co-body>${body(id)}</div>
    </main>
  </div>`;
}

export function mount(root) {
  const id = brandParam();
  if (!brandIds.includes(id)) return () => {};
  const slot = root.querySelector('[data-co-body]');
  if (totalCart(getCart(id)).sets) record('checkout_start', id);

  const onClick = e => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.matches('[data-line-step]')) {
      const line = t.closest('[data-line]').dataset.line;
      const q = (getCart(id)[line] || 0) + Number(t.dataset.lineStep);
      changeCart(id, line, Math.max(0, Math.min(99, q)));
      replaceCartContent(slot, body(id));
    } else if (t.matches('[data-line-remove]')) {
      changeCart(id, t.closest('[data-line]').dataset.line, 0);
      replaceCartContent(slot, body(id));
    } else if (t.matches('[data-final]')) {
      const totals = totalCart(getCart(id));
      if (!totals.sets) { slot.innerHTML = body(id); return; }
      record('preview_complete', id, { quantity: totals.sets });
      const out = slot.querySelector('[data-result]');
      out.hidden = false;
      out.innerHTML = `<p><strong>คุณเลือกชุดนี้ไว้แล้ว</strong> กลับไปเปลี่ยนชุดหรือเดินดูบูธอื่นได้</p>
        <p class="co-small">${totals.sets} ชุด · ${totals.packs} แพ็ก · ${baht(totals.subtotal)} ก่อนค่าจัดส่ง — หน้าทดลอง ยังไม่มีคำสั่งซื้อหรือการชำระเงิน</p>
        <div class="cta-row"><a class="btn btn-ghost" data-link href="${href(`/${id}/#offers`)}">เปลี่ยนชุด</a>
        <a class="btn btn-ghost" data-link href="${href('/')}">เดินดูบูธอื่น</a></div>`;
      t.disabled = true;
      out.focus();
    } else if (t.matches('[data-intent]')) {
      // Opening the chat/order channel is intent only; confirmation needs a real order ID.
      record('order_intent', id, { quantity: totalCart(getCart(id)).sets });
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
