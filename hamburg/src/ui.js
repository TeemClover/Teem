// Shared view helpers: paths, escaping, media slots and fact text derived from product.js.
import { config, netWeightLabel, offerById } from './product.js';

export const base = (config.basePath || '').replace(/\/$/, '');
export const href = path => base + path;

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => entities[c]);

export const baht = n => `${Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
export const offerPrice = id => baht(offerById(id).priceBaht);
export const startPrice = () => baht(Math.min(...config.offers.map(o => o.priceBaht)));
export const piecesOf = offer => offer.packs * config.product.packPieces;
export const perPack = offer => {
  const v = offer.priceBaht / offer.packs;
  return Number.isInteger(v) ? baht(v) : `${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
};
export const weight = () => netWeightLabel();
/** "2 ชิ้นพร้อมซอส · 250 กรัม (ขนาดเป้าหมาย) · เริ่ม 179 บาท" */
export const heroFacts = () => [`${config.product.packPieces} ชิ้นพร้อมซอส`, weight(), `เริ่ม ${startPrice()}`]
  .map(t => `<span class="nb">${t}</span>`).join(' · ');

// Fallback wording comes from Product.md so preview never shows null or invented facts.
const p = config.product;
const c = config.commercial;
export const facts = {
  ingredients: () => (p.ingredientsText || p.allergenText)
    ? [p.ingredientsText, p.allergenText].filter(Boolean)
    : ['ส่วนประกอบและข้อมูลผู้แพ้อาหารจะระบุพร้อมสินค้าที่จำหน่าย'],
  storage: () => (p.storageInstructions || p.shelfLifeText)
    ? [p.storageInstructions, p.shelfLifeText].filter(Boolean)
    : ['รายละเอียดการเก็บและอายุสินค้าจะระบุพร้อมแพ็กที่จำหน่าย'],
  reheat: () => p.reheatInstructions || 'วิธีอุ่นของสินค้าจะระบุพร้อมแพ็กที่จำหน่าย',
  fulfilment: () => c.fulfilmentText || 'ตรวจพื้นที่จัดส่งและยอดรวมก่อนสั่งซื้อ',
  seller: () => [c.sellerName, c.contactText, c.issuePolicyText].filter(Boolean)
};

/*
 * Media slots follow the shared asset map in Arena_Prd.md. `status: 'concept'` marks generated
 * art-direction images; swap `src` for real photography and set status 'actual' before selling.
 * Slots with src null render a designed fallback instead of borrowing an unrelated photo.
 */
export const media = {
  plate:   { slot: 'HBG-A01', src: 'assets/hamburg-hero.jpg', small: 'assets/hamburg-hero-900.jpg', w: 1536, h: 1024, status: 'concept',
             alt: 'แฮมเบิร์กญี่ปุ่น 2 ก้อนราดซอสบนจานเซรามิก ก้อนหนึ่งผ่าครึ่งให้เห็นเนื้อด้านใน มีข้าวและผักเป็นไอเดียเสิร์ฟ' },
  whole:   { slot: 'HBG-A01', src: 'assets/hamburg-whole.jpg', small: 'assets/hamburg-whole-900.jpg', w: 1536, h: 1024, status: 'concept',
             alt: 'แฮมเบิร์กญี่ปุ่น 2 ก้อนเต็มราดซอสบนจานเซรามิก' },
  cutaway: { slot: 'HBG-A02', src: 'assets/hamburg-texture.jpg', small: 'assets/hamburg-texture-900.jpg', w: 1536, h: 1024, status: 'concept',
             alt: 'ภาพใกล้เนื้อด้านในของแฮมเบิร์กที่ผ่าครึ่ง ซอสสีน้ำตาลเคลือบผิวที่จี่' },
  grind:   { slot: 'HBG-A03', src: null, status: 'needs-actual' },
  grill:   { slot: 'HBG-A04', src: null, status: 'needs-actual' },
  sauce:   { slot: 'HBG-A05', src: null, status: 'needs-actual' },
  pack:    { slot: 'HBG-A06', src: null, status: 'needs-actual' },
  table:   { slot: 'HBG-A07', src: null, status: 'needs-actual' },
  hands:   { slot: 'HBG-A08', src: null, status: 'needs-actual' }
};

/** Responsive <img> with fixed intrinsic size so layout never jumps. */
export function img(key, { cls = '', pos = '50% 50%', sizes = '100vw', eager = false, alt } = {}) {
  const m = media[key];
  if (!m?.src) return '';
  const srcset = m.small ? `${m.small} 900w, ${m.src} ${m.w}w` : '';
  return `<img class="${cls}" src="${m.src}"${srcset ? ` srcset="${srcset}" sizes="${sizes}"` : ''} width="${m.w}" height="${m.h}"
    alt="${esc(alt ?? m.alt)}" style="object-position:${pos}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

/** A zoomed crop of a shared photo, used for small details within one composition. */
export function crop(key, { cls = '', size = '220%', pos = '50% 50%', label = '' } = {}) {
  const m = media[key];
  return `<div class="crop ${cls}" role="img" aria-label="${esc(label || m.alt)}"
    style="background-image:url('${m.small || m.src}');background-size:${size};background-position:${pos}"></div>`;
}

export const conceptNote = 'ภาพอาหารเป็นภาพแนวทางสำหรับหน้าทดลอง ข้าว ผัก และเครื่องเคียงเป็นไอเดียเสิร์ฟ ไม่รวมในแพ็ก';

// Line icons for craft steps; real kitchen photos replace them once HBG-A03/A04/A05 exist.
export const icons = {
  grind: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 30h48l-4 18a8 8 0 0 1-8 6H20a8 8 0 0 1-8-6z"/><path d="M20 30c2-6 6-9 12-9s10 3 12 9"/><path d="M26 22l-4-12M38 22l4-12"/></svg>`,
  grill: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="30" width="44" height="8" rx="2"/><path d="M50 34h10"/><ellipse cx="20" cy="26" rx="8" ry="4"/><ellipse cx="36" cy="26" rx="8" ry="4"/><path d="M16 50c0-4 4-4 4-8M28 50c0-4 4-4 4-8M40 50c0-4 4-4 4-8"/></svg>`,
  sauce: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 28h44v10a14 14 0 0 1-14 14H24a14 14 0 0 1-14-14z"/><path d="M6 28h52"/><path d="M24 20c0-4 4-4 4-8M36 20c0-4 4-4 4-8"/></svg>`,
  chef: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 30a10 10 0 1 1 6-18 10 10 0 0 1 16 0 10 10 0 1 1 6 18v10H18z"/><path d="M18 46h28v6H18z"/></svg>`
};

/** Pack contents drawn as a diagram; clearly an illustration, not a pack photo. */
export function packDiagram() {
  const pieces = config.product.packPieces;
  return `<figure class="pack-diagram">
    <svg viewBox="0 0 320 220" role="img" aria-label="ภาพประกอบ 1 แพ็ก: แฮมเบิร์ก ${pieces} ก้อนกับซอสในถุงสูญญากาศ">
      <rect class="pd-bag" x="12" y="18" width="296" height="188" rx="22"/>
      <path class="pd-seal" d="M12 46h296"/>
      <ellipse class="pd-sauce" cx="160" cy="140" rx="128" ry="42"/>
      <ellipse class="pd-patty" cx="100" cy="124" rx="54" ry="36"/>
      <ellipse class="pd-patty" cx="220" cy="124" rx="54" ry="36"/>
      <path class="pd-sear" d="M68 116c16-8 48-8 64 0M188 116c16-8 48-8 64 0"/>
    </svg>
    <figcaption>ภาพประกอบสิ่งที่อยู่ใน 1 แพ็ก · รอภาพแพ็กจริง</figcaption>
  </figure>`;
}

export function reheatSteps() {
  const steps = ['ฉีกซอง', 'เทลงภาชนะที่ใช้กับไมโครเวฟได้', 'อุ่นตามวิธีที่ระบุบนแพ็ก', 'จัดจาน เสิร์ฟกับข้าวหรือเครื่องเคียงที่ชอบ'];
  return `<ol class="reheat-steps">${steps.map((s, i) => `<li><span class="rs-n">${i + 1}</span><span>${s}</span></li>`).join('')}</ol>
    <p class="reheat-note">${esc(facts.reheat())}</p>`;
}

export function faqList(items) {
  return `<div class="faq">${items.map(([q, a]) => `<details>
    <summary>${esc(q)}</summary>
    <div class="faq-a">${(Array.isArray(a) ? a : [a]).map(t => `<p>${esc(t)}</p>`).join('')}</div>
  </details>`).join('')}</div>`;
}

/** Shared FAQ answers; brands phrase the questions in their own voice. */
export const faqAnswers = {
  bun: 'เป็นแฮมเบิร์กสไตล์ญี่ปุ่น เนื้อก้อนปรุงสุกพร้อมซอสสำหรับอุ่น ไม่มีขนมปังหรือข้าวรวมในแพ็ก',
  pack: () => `แฮมเบิร์ก ${config.product.packPieces} ชิ้นกับซอสทำเอง อาหารสุทธิ ${weight()}`,
  beef: 'ใช้เนื้อวัวนำเข้าจากญี่ปุ่นเป็นส่วนผสมของสูตรผสม ดูส่วนประกอบของสินค้ารุ่นที่เลือกได้ในรายละเอียดสินค้า',
  allergen: () => facts.ingredients(),
  storage: () => [...facts.storage(), facts.reheat()],
  shipping: () => [facts.fulfilment()]
};
