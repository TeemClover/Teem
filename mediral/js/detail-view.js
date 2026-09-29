/**
 * Mediral — one product's own page, as HTML. Pure: data in, markup out (no DOM, no fetch), so the
 * five pages share one template and the tests can read exactly what a visitor would.
 *
 *   detailHTML({routine, details, id, asset}) -> string
 *     routine = data/routine.json (packs, order channel, facts); details = data/details.json
 *     (public product copy and every source-listed name); id = CL | AC | BR | SU | PO
 *
 * Hierarchy: problem → promise → one short sequence (ingredients → material → care) → how and when
 * → every listed name, grouped, each with its picture → questions → one LINE action → back to the
 * exact chapter, and on to the next piece.
 * A name the source lists without a role is shown as a name only; nothing is filled in for it.
 * Pictures are illustrations of a name or a material, never a supplier photo or proof of origin.
 * Motion is added by detail-motion.js: anything marked data-reveal is complete without it.
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

function pack(step, asset, {lazy = false} = {}) {
  const b = step.image_bounds;
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const style = `--pack-aspect:${b.aspect};--pack-img-width:${100 / w}%;--pack-img-height:${100 / h}%;--pack-img-left:${-100 * b.x0 / w}%;--pack-img-top:${-100 * b.y0 / h}%`;
  // The hero pack is the page's first image; a repeat further down is decorative and loads late.
  const img = lazy ? `alt="" loading="lazy"` : `alt="${esc(step.image_alt)}" fetchpriority="high"`;
  return `<span class="mr-pack" style="${style}"><img src="${asset(step.image)}" ${img} decoding="async"></span>`;
}

export function lineAction(order, label = order.label) {
  if (order?.status !== 'verified' || !/^https:\/\//.test(order.url || '')) return '';
  return `<a class="mr-btn mr-btn--line" href="${esc(order.url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

// Every listed name, image-led: one card per name, in the brand's groups, all open. A name whose
// picture is not ready yet keeps a quiet tile, never a bare dot. Two names sharing one abstract
// material picture stay two cards; the second is mirrored so they do not read as a duplicate.
function ingredients(product, asset) {
  const groups = product.ingredient_groups || [];
  if (!groups.length) return '';
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return `<section class="mr-detail__block mr-atlas" id="ingredients" aria-labelledby="names-title">
    <h2 id="names-title">${esc(product.ingredients_heading)}</h2>
    <p class="mr-detail__intro">${esc(product.ingredients_intro)} · ${total} รายการ</p>
    ${groups.map((g, i) => {
      const seen = new Set();
      const roles = g.items.some(item => item.benefit);
      return `<section class="mr-atlas__group${roles ? ' mr-atlas__group--roles' : ''}" aria-labelledby="names-${i + 1}">
      <h3 id="names-${i + 1}"><span>${esc(g.title)}</span><small>${g.items.length} รายการ</small></h3>
      ${g.summary ? `<p class="mr-atlas__summary">${esc(g.summary)}</p>` : ''}
      <ul class="mr-atlas__grid">${g.items.map((item, k) => {
        const repeat = item.image && seen.has(item.image);
        if (item.image) seen.add(item.image);
        const picture = item.image
          ? `<img src="${asset(item.image)}" alt="" width="768" height="768" loading="lazy" decoding="async">`
          : '<span class="mr-atlas__tile"></span>';
        return `<li class="mr-atlas__item" data-reveal style="--i:${Math.min(k, 8)}"><span class="mr-atlas__img${repeat ? ' is-repeat' : ''}" aria-hidden="true">${picture}</span><span class="mr-atlas__text"><b>${esc(item.name)}</b>${item.benefit ? `<small>${esc(item.benefit)}</small>` : ''}</span></li>`;
      }).join('')}</ul>
    </section>`;
    }).join('')}
    ${product.ingredient_note ? `<p class="mr-detail__fine">${esc(product.ingredient_note)} · ภาพส่วนผสมเป็นภาพประกอบชื่อหรือลักษณะวัตถุดิบ ไม่ใช่ภาพจากผู้ผลิต</p>` : ''}
    ${product.name_notes?.length ? `<div class="mr-detail__aka"><h3>ชื่อที่พบในสื่อแบรนด์</h3>${product.name_notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
  </section>`;
}

// One short editorial sequence per page: what goes in, what it becomes, what it does for skin.
// Each page keeps its own rhythm (wipe, rise, bloom, glide, settle); the words are the product's own
// sourced lines, and pictures only illustrate them.
function tableau(select, product, asset) {
  if (select.image) return `<div class="mr-tableau mr-tableau--scene"><img src="${asset(select.image)}" alt="" loading="lazy" decoding="async"></div>`;
  const items = new Map((product.ingredient_groups || []).flatMap(g => g.items).map(item => [item.name, item]));
  const shown = select.names.map(name => items.get(name)).filter(item => item?.image);
  const ring = select.layout === 'ring';
  return `<div class="mr-tableau${ring ? ' mr-tableau--ring' : ''}" style="--n:${shown.length}">
    ${ring ? `<b class="mr-tableau__count">${select.names.length}</b>` : ''}
    ${shown.map((item, k) => `<span class="mr-tableau__item" style="--k:${k}"><img src="${asset(item.image)}" alt="" width="768" height="768" loading="lazy" decoding="async"></span>`).join('')}
  </div>`;
}

// A bold title breaks only between its phrases, and the dot stays with the phrase before it.
const phrases = title => title.split(' · ').map(part => `<span>${esc(part)}</span>`).join('&nbsp;· ');

function sequence(product, step, routine, asset) {
  const seq = product.sequence;
  if (!seq) return '';
  const {select, material, care} = seq;
  const beat = (n, key, visual, copy) => `<li class="mr-beat mr-beat--${key}" data-reveal>
      <div class="mr-beat__visual" aria-hidden="true">${visual}</div>
      <div class="mr-beat__copy"><p class="mr-beat__label"><b>0${n}</b> ${esc(seq[key].label)}</p><h3>${phrases(seq[key].title)}</h3>${copy}</div>
    </li>`;
  const total = (product.ingredient_groups || []).reduce((n, g) => n + g.items.length, 0);
  return `<section class="mr-seq mr-seq--${esc(seq.rhythm)}" aria-labelledby="seq-title">
    <h2 id="seq-title" class="mr-seq__title" data-reveal>${esc(seq.title)}</h2>
    <ol class="mr-seq__beats">
      ${beat(1, 'select', tableau(select, product, asset), `<p>${esc(select.body)}</p>
        ${select.names?.length ? `<ul class="mr-beat__names">${select.names.map(name => `<li>${esc(name)}</li>`).join('')}</ul>` : ''}
        ${total ? `<a class="mr-beat__more" href="#ingredients">ดูส่วนผสมทั้ง ${total} รายการ</a>` : ''}`)}
      ${beat(2, 'material', `<div class="mr-material"><img src="${asset(material.image)}" alt="" loading="lazy" decoding="async"></div>`, `<p>${esc(material.body)}</p>`)}
      ${beat(3, 'care', `<div class="mr-beat__pack">${pack(step, asset, {lazy: true})}</div>`, `<ul class="mr-care">${product.benefits.map(b => `<li><b>${esc(b.title)}</b><span>${esc(b.body)}</span></li>`).join('')}</ul>
        ${product.fit ? `<p class="mr-detail__fit">${esc(product.fit)}</p>` : ''}
        ${fact(step)}`)}
    </ol>
    <p class="mr-seq__fine">${esc(product.brand_attribution)} · ภาพเป็นภาพประกอบ ไม่ใช่ภาพจากผู้ผลิตหรือเนื้อสินค้าจริง</p>
  </section>`;
}

function fact(step) {
  const f = step.fact;
  if (!f) return '';
  return `<details class="mr-fact"><summary>${esc(f.label)}</summary><p>${esc(f.text)}</p>
    <small>${esc(f.source)} · ${f.links.map(link => `<a href="${esc(link.href)}" rel="noopener" target="_blank">${esc(link.label)}</a>`).join(' · ')}</small></details>`;
}

// The set's route, at the top of every product page: number and colour for each piece, the current
// one named and marked, each a link. Colour is never the only cue.
function routeStrip(routine, id) {
  return `<nav class="mr-route-nav" aria-label="ลำดับของชุด: ${esc(routine.route.title.join(' '))}">
    <p>${esc(routine.route.title.join(' '))}</p>
    <ol>${routine.steps.map(step => `<li${step.id === id ? ' class="is-current"' : ''}><a href="../${detailPath(step.id)}" aria-label="${esc(`ขั้น ${pad(step.order)} ${step.tone.word} ${step.nick}`)}"${step.id === id ? ' aria-current="page"' : ''}>${mark(step)}<span class="mr-route-nav__name">${esc(step.nick)}</span></a></li>`).join('')}</ol>
  </nav>`;
}
const mark = step => `<b>${pad(step.order)}</b><i class="mr-tone mr-tone--${step.tone.key}" aria-hidden="true"></i>${esc(step.tone.word)}`;

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
  ${routeStrip(routine, id)}
  <section class="mr-detail__hero" aria-labelledby="detail-title">
    <div class="mr-detail__material" aria-hidden="true"><img src="${asset(MATERIAL[id])}" alt="" decoding="async"></div>
    <div class="mr-detail__copy">
      <p class="mr-kicker">${mark(step)} · Mediral${size ? ` · ${esc(size)}` : ''}</p>
      <p class="mr-detail__problem">${esc(product.problem)}</p>
      <h1 id="detail-title">${(([name, ...role]) => `${esc(name)}${role.length ? `<span class="mr-detail__role">${esc(role.join(' · '))}</span>` : ''}`)(product.short_name.split(' · '))}</h1>
      <p class="mr-detail__headline">${esc(product.headline)}</p>
      <p class="mr-detail__lead">${esc(product.lead)}</p>
      <div class="mr-actions">${lineAction(order, order.label_product)}<a class="mr-btn mr-btn--ghost" href="${back}">กลับไปดูรูทีน 5 ชิ้น</a></div>
    </div>
    <figure class="mr-detail__pack">${pack(step, asset)}</figure>
  </section>

  ${sequence(product, step, routine, asset)}

  <section class="mr-detail__block mr-detail__use" aria-labelledby="use-title">
    <h2 id="use-title">ใช้อย่างไร</h2>
    <dl>
      <div><dt>วิธีใช้</dt><dd>${esc(product.how)}</dd></div>
      <div><dt>เมื่อไร</dt><dd>${(step.when || []).map(w => `<span class="mr-tag">${esc(w)}</span>`).join(' ')}</dd></div>
      ${size ? `<div><dt>ขนาด</dt><dd>${esc(size)}</dd></div>` : ''}
      ${step.size_note ? `<div><dt>หมายเหตุ</dt><dd>${esc(step.size_note)}</dd></div>` : ''}
    </dl>
    ${product.texture ? `<p class="mr-detail__texture"><b>เนื้อสัมผัส</b> ${esc(product.texture)}</p>` : ''}
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
    ${prev ? `<a href="../${detailPath(prev.id)}" rel="prev"><span aria-hidden="true">←</span> ${mark(prev)} · ${esc(prev.nick)}</a>` : '<span></span>'}
    <a href="${back}">กลับไปดู${esc(step.nick)}ในรูทีน</a>
    ${next ? `<a href="../${detailPath(next.id)}" rel="next">${mark(next)} · ${esc(next.nick)} <span aria-hidden="true">→</span></a>` : '<a href="../#set">ชุด 5 ชิ้น</a>'}
  </nav>`;
}
