// "/" — Hamburg Food Fair entrance. Three equal booths in the visitor's remembered random order.
import { config, totalCart } from '../product.js';
import { boothOrder, selectBooth, getCart, record } from '../store.js';
import { brands } from '../brands/meta.js';
import { whenVisible } from '../track.js';
import { esc, href, img, baht, weight, conceptNote, facts } from '../ui.js';

export const meta = {
  title: 'Hamburg Food Fair | แฮมเบิร์กญี่ปุ่นพร้อมซอส 3 บูธ',
  description: 'แฮมเบิร์กญี่ปุ่นพร้อมซอส 3 บูธ เลือกเข้าไปดูมื้อที่อยากกิน'
};

// Each booth gets its own first image treatment with equal size and quality.
const boothArt = {
  homechew: () => img('plate', { sizes: '(min-width: 1000px) 31vw, 100vw', pos: '42% 58%' }),
  tmt: () => img('plate', { sizes: '(min-width: 1000px) 31vw, 100vw', pos: '74% 62%' }),
  noomjang: () => img('cutaway', { sizes: '(min-width: 1000px) 31vw, 100vw', pos: '62% 55%' })
};
const boothMark = {
  homechew: `<img class="bm-hc" src="assets/homechew-wordmark.svg" width="657" height="123" alt="Homechew">`,
  tmt: `<span class="bm-tmt">เชื่อปากกู</span>`,
  noomjang: `<span class="bm-nj">นุ่มจัง</span>`
};

export function render() {
  const prices = config.offers.map(o => baht(o.priceBaht)).join(' / ');
  const drafts = boothOrder.map(id => [id, totalCart(getCart(id))]).filter(([, t]) => t.sets > 0);
  return `<div class="page arena" data-brand="arena">
  <header class="arena-head">
    <p class="arena-mark">Hamburg Food Fair</p>
  </header>
  <main id="main">
    <section class="arena-hero">
      <h1><span class="nb">เลือกบูธ</span><span class="nb">ที่ทำให้หิว</span></h1>
      <p class="arena-sub">แฮมเบิร์กญี่ปุ่นพร้อมซอส 3 บูธ เลือกเข้าไปดูมื้อที่อยากกิน</p>
      <p class="arena-invite">เริ่มบูธไหนก็ได้ แล้วค่อยกลับมาเดินดูอีกบูธ</p>
    </section>

    <ul class="booths" role="list">
      ${boothOrder.map((id, i) => {
        const b = brands[id];
        return `<li class="booth booth-${id}" style="--i:${i}">
          <a class="booth-link" data-link data-booth="${id}" href="${href(`/${id}/`)}" aria-label="${esc(b.arenaCta)}">
            <figure class="booth-photo">${boothArt[id]()}</figure>
            <div class="booth-body">
              <h2 class="booth-name">${boothMark[id]}<span class="booth-sub">${esc(b.sub)}</span></h2>
              <p class="booth-line">${esc(b.arenaLine)}</p>
              <span class="booth-cta">${esc(b.arenaCta)} <span aria-hidden="true">→</span></span>
            </div>
          </a>
        </li>`;
      }).join('')}
    </ul>

    <section class="arena-same" aria-labelledby="same-title">
      <h2 id="same-title">ทุกบูธใช้สินค้าและราคาเดียวกัน</h2>
      <p>แฮมเบิร์กสไตล์ญี่ปุ่น ${config.product.packPieces} ก้อนพร้อมซอสต่อแพ็ก · อาหารสุทธิ ${weight()}</p>
      <p>1 / 3 / 5 แพ็ก · ${prices} · ราคาไม่รวมค่าจัดส่ง</p>
    </section>

    ${drafts.length ? `<section class="arena-drafts" aria-labelledby="drafts-title">
      <h2 id="drafts-title">ตะกร้าที่คุณเลือกไว้</h2>
      <ul role="list">${drafts.map(([id, t]) => `<li>
        <span><strong>${esc(brands[id].name)}</strong> · ${t.sets} ชุด · ${t.packs} แพ็ก · ${baht(t.subtotal)}</span>
        <a data-link href="${href(`/checkout/?brand=${id}`)}">ดูสรุป</a>
      </li>`).join('')}</ul>
      <p class="arena-small">ตะกร้าแต่ละบูธเป็นร่างแยกกัน สรุปได้ทีละบูธ</p>
    </section>` : ''}
  </main>
  <footer class="arena-foot">
    ${facts.seller().map(s => `<p>${esc(s)}</p>`).join('')}
    <p>${facts.fulfilment()}</p>
    <p class="arena-small">${conceptNote}</p>
  </footer>
  </div>`;
}

export function mount(root) {
  const onClick = e => {
    const a = e.target.closest('[data-booth]');
    if (a) selectBooth(a.dataset.booth);
  };
  root.addEventListener('click', onClick);
  const stop = whenVisible(() => record('arena_view'));
  return () => { root.removeEventListener('click', onClick); stop(); };
}
