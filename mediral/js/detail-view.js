/**
 * Mediral — one product's own page, as HTML. Pure: data in, markup out (no DOM, no fetch), so the
 * five pages share one template and the tests can read exactly what a visitor would.
 *
 *   detailHTML({routine, details, id, asset}) -> string
 *     routine = data/routine.json (packs, order channel, facts); details = data/details.json
 *     (public product copy and every source-listed name); id = CL | AC | BR | SU | PO
 *
 * Hierarchy: problem → promise → what it looks after → how and when → every listed name, grouped
 * → questions → one LINE action → back to the exact chapter, and on to the next piece.
 * A name the source lists without a role is shown as a name only; nothing is filled in for it.
 */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const pad = n => String(n).padStart(2, '0');

export const DETAIL_IDS = ['CL', 'AC', 'BR', 'SU', 'PO'];
export const detailPath = id => `${id.toLowerCase()}/`;

// Each page keeps the material of its chapter, so it feels like the same room, closer.
export const MATERIAL = {
  CL: 'assets/experience/p0-3-foam-band.webp',
  AC: 'assets/experience/m2-glass-cone.webp',
  BR: 'assets/experience/p0-2-drop-clear.webp',
  SU: 'assets/experience/m2-serum-ribbon.webp',
  PO: 'assets/experience/m2-powder-veil.webp',
};

function pack(step, asset) {
  const b = step.image_bounds;
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const style = `--pack-aspect:${b.aspect};--pack-img-width:${100 / w}%;--pack-img-height:${100 / h}%;--pack-img-left:${-100 * b.x0 / w}%;--pack-img-top:${-100 * b.y0 / h}%`;
  return `<span class="mr-pack" style="${style}"><img src="${asset(step.image)}" alt="${esc(step.image_alt)}" decoding="async" fetchpriority="high"></span>`;
}

export function lineAction(order, label = order.label) {
  if (order?.status !== 'verified' || !/^https:\/\//.test(order.url || '')) return '';
  return `<a class="mr-btn mr-btn--line" href="${esc(order.url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function ingredients(product, asset) {
  const groups = product.ingredient_groups || [];
  if (!groups.length) return '';
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return `<section class="mr-detail__block mr-detail__names" id="ingredients" aria-labelledby="names-title">
    <h2 id="names-title">${esc(product.ingredients_heading)}</h2>
    <p class="mr-detail__intro">${esc(product.ingredients_intro)} · ${total} ชื่อ</p>
    ${groups.map((g, i) => `<details class="mr-names"${i === 0 ? ' open' : ''}>
      <summary><span>${esc(g.title)}</span><small>${g.items.length} ชื่อ</small></summary>
      ${g.summary ? `<p class="mr-names__summary">${esc(g.summary)}</p>` : ''}
      <ul>${g.items.map(item => `<li>${item.image ? `<img src="${asset(item.image)}" alt="" loading="lazy" decoding="async">` : '<span class="mr-names__dot" aria-hidden="true"></span>'}<span><b>${esc(item.name)}</b>${item.benefit ? `<small>${esc(item.benefit)}</small>` : ''}</span></li>`).join('')}</ul>
    </details>`).join('')}
    ${product.ingredient_note ? `<p class="mr-detail__fine">${esc(product.ingredient_note)}</p>` : ''}
    ${product.name_notes?.length ? `<div class="mr-detail__aka"><h3>ชื่อที่พบในสื่อแบรนด์</h3>${product.name_notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
  </section>`;
}

function fact(step) {
  const f = step.fact;
  if (!f) return '';
  return `<details class="mr-fact"><summary>${esc(f.label)}</summary><p>${esc(f.text)}</p>
    <small>${esc(f.source)} · ${f.links.map(link => `<a href="${esc(link.href)}" rel="noopener" target="_blank">${esc(link.label)}</a>`).join(' · ')}</small></details>`;
}

export function detailHTML({routine, details, id, asset = path => `../${path}`}) {
  const step = routine.steps.find(s => s.id === id);
  const product = details.products.find(p => p.id === id);
  if (!step || !product) throw new Error(`unknown product ${id}`);
  const index = DETAIL_IDS.indexOf(id);
  const prev = routine.steps.find(s => s.id === DETAIL_IDS[index - 1]);
  const next = routine.steps.find(s => s.id === DETAIL_IDS[index + 1]);
  const {order} = routine;
  const back = `../#step-${id}`;
  const size = product.size || step.size;
  return `
  <section class="mr-detail__hero" aria-labelledby="detail-title">
    <div class="mr-detail__material" aria-hidden="true"><img src="${asset(MATERIAL[id])}" alt="" decoding="async"></div>
    <div class="mr-detail__copy">
      <p class="mr-kicker"><b>${pad(step.order)}</b> Mediral${size ? ` · ${esc(size)}` : ''}</p>
      <p class="mr-detail__problem">${esc(product.problem)}</p>
      <h1 id="detail-title">${(([name, ...role]) => `${esc(name)}${role.length ? `<span class="mr-detail__role">${esc(role.join(' · '))}</span>` : ''}`)(product.short_name.split(' · '))}</h1>
      <p class="mr-detail__headline">${esc(product.headline)}</p>
      <p class="mr-detail__lead">${esc(product.lead)}</p>
      <div class="mr-actions">${lineAction(order, order.label_product)}<a class="mr-btn mr-btn--ghost" href="${back}">กลับไปที่เรื่องของชิ้นนี้</a></div>
    </div>
    <figure class="mr-detail__pack">${pack(step, asset)}</figure>
  </section>

  <section class="mr-detail__block" aria-labelledby="care-title">
    <h2 id="care-title">ดูแลเรื่องไหน</h2>
    <ul class="mr-detail__benefits">${product.benefits.map(b => `<li><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p></li>`).join('')}</ul>
    ${product.texture ? `<p class="mr-detail__texture"><b>เนื้อสัมผัส</b> ${esc(product.texture)}</p>` : ''}
    ${product.fit ? `<p class="mr-detail__fit">${esc(product.fit)}</p>` : ''}
    ${fact(step)}
  </section>

  <section class="mr-detail__block mr-detail__use" aria-labelledby="use-title">
    <h2 id="use-title">ใช้อย่างไร</h2>
    <dl>
      <div><dt>วิธีใช้</dt><dd>${esc(product.how)}</dd></div>
      <div><dt>เมื่อไร</dt><dd>${(step.when || []).map(w => `<span class="mr-tag">${esc(w)}</span>`).join(' ')}</dd></div>
      ${size ? `<div><dt>ขนาด</dt><dd>${esc(size)}</dd></div>` : ''}
      ${step.size_note ? `<div><dt>หมายเหตุ</dt><dd>${esc(step.size_note)}</dd></div>` : ''}
    </dl>
    ${product.role_in_set ? `<p class="mr-detail__set">${esc(product.role_in_set)}</p>` : ''}
  </section>

  ${ingredients(product, asset)}

  ${product.faq?.length ? `<section class="mr-detail__block mr-detail__faq" aria-labelledby="faq-title">
    <h2 id="faq-title">คำถามที่พบบ่อย</h2>
    ${product.faq.map(f => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}
  </section>` : ''}

  <section class="mr-detail__block mr-detail__order" aria-labelledby="order-title">
    <h2 id="order-title">${esc(order.heading)}</h2>
    <p>${esc(order.how)}</p>
    <div class="mr-actions">${lineAction(order)}</div>
    <p class="mr-order__note">${esc(order.note)}</p>
  </section>

  <nav class="mr-detail__nav" aria-label="ชิ้นอื่นในชุด">
    ${prev ? `<a href="../${detailPath(prev.id)}" rel="prev"><span aria-hidden="true">←</span> ${esc(prev.nick)}</a>` : '<span></span>'}
    <a href="${back}">กลับไปที่เรื่องของ${esc(step.nick)}</a>
    ${next ? `<a href="../${detailPath(next.id)}" rel="next">${esc(next.nick)} <span aria-hidden="true">→</span></a>` : '<a href="../#set">ชุด 5 ชิ้น</a>'}
  </nav>`;
}
