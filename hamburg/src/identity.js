import { brands } from './brands/meta.js';
import { esc } from './ui.js';

/** Homechew keeps its approved vector artwork; the two new marks are separate originals. */
export function brandLogo(id, { full = false } = {}) {
  const b = brands[id];
  if (id === 'homechew') return `<span class="identity-homechew ${full ? 'identity-full' : ''}">
    <img class="hc-approved-mark" src="assets/homechew/homechew-mark.svg" width="288" height="246" alt="">
    <span class="hc-approved-name"><img class="hc-wordmark" src="assets/homechew/homechew-wordmark.svg" width="657" height="123" alt="Homechew"><span class="hc-thai">โฮมชิว</span></span>
  </span>`;
  return `<img class="identity-logo identity-${id} ${full ? 'identity-full' : ''}" src="assets/${id}/logo.webp" width="${id === 'tmt' ? 640 : 1000}" height="${id === 'tmt' ? 650 : 500}" alt="${esc(b.name)} · ${esc(b.sub)}">`;
}

export function packPreview(id) {
  return `<figure class="branded-pack branded-pack-${id}">
    <img src="assets/${id}/packaging.webp" width="1200" height="1500" loading="lazy" decoding="async" alt="แบบแพ็กเกจ ${esc(brands[id].name)}: ถุงใสซีลสูญญากาศ แฮมเบิร์ก 2 ชิ้นกับซอส และฉลากของแบรนด์">
    <figcaption>แบบแพ็กเกจ · ถุงซีลสูญญากาศติดฉลาก · ภาพจำลอง</figcaption>
  </figure>`;
}
