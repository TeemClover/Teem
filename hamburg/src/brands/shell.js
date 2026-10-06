// Frame shared by the three booth homepages: header, footer and runtime wiring.
// Each brand still owns its own markup, type and section order.
import { record } from '../store.js';
import { cartButton, stickyBar, mountCommerce, mountSticky } from '../commerce.js';
import { mountScenes, mountReveals } from '../motion.js';
import { mountVideos } from '../video.js';
import { trackSections, whenVisible } from '../track.js';
import { brands } from './meta.js';
import { esc, href, facts, conceptNote } from '../ui.js';

export function brandHeader(id, { logo, nav }) {
  return `<header class="site-head" data-brand-head="${id}">
    <a class="back-link" data-link href="${href('/')}"><span aria-hidden="true">←</span> <span class="back-text">เลือกบูธอื่น</span></a>
    <a class="brand-logo" href="#top" aria-label="${esc(brands[id].name)} กลับด้านบน">${logo}</a>
    <nav class="site-nav" aria-label="เมนู ${esc(brands[id].name)}">
      ${nav.map(([label, target]) => `<a href="#${target}">${esc(label)}</a>`).join('')}
    </nav>
    ${cartButton()}
  </header>`;
}

export function brandFooter(id, { name, slogan }) {
  const seller = facts.seller();
  return `<footer class="site-foot">
    <div class="foot-brand">
      <p class="foot-name">${name}</p>
      <p class="foot-slogan">${esc(slogan)}</p>
    </div>
    <nav class="foot-links" aria-label="ข้อมูลสินค้า">
      <a href="#pack">รายละเอียดสินค้า</a><a href="#reheat">วิธีอุ่น</a><a href="#faq">การจัดส่ง</a>
      ${seller.length ? '<a href="#contact">ติดต่อ</a>' : ''}
    </nav>
    ${seller.length ? `<div class="foot-seller" id="contact">${seller.map(s => `<p>${esc(s)}</p>`).join('')}</div>` : ''}
    <p class="foot-note">${conceptNote}</p>
    <a class="foot-back" data-link href="${href('/')}">กลับไปเลือกบูธ</a>
  </footer>
  ${stickyBar(id)}`;
}

export function mountBrand(root, id) {
  const cleanups = [
    mountCommerce(root, id),
    mountSticky(root),
    mountScenes(root),
    mountReveals(root),
    mountVideos(root),
    trackSections(root, id),
    whenVisible(() => record('brand_view', id))
  ];
  return () => cleanups.forEach(fn => fn());
}
