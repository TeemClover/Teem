/**
 * Mediral — a product's own page. The static page already names the piece, its role and a way
 * back; this fills in the full story and every listed name from the same data as the main page.
 */
import {mountCoupon} from './coupon.js';
import {detailHTML} from './detail-view.js';
import {initDetailMotion} from './detail-motion.js';

const root = document.documentElement;
root.classList.remove('mr-boot');
root.classList.add('mr-js');
const id = document.body.dataset.product;
const base = new URL('../', import.meta.url);
const asset = path => new URL(path, base).href;

async function boot() {
  const [routine, details] = await Promise.all(['data/routine.json', 'data/details.json'].map(async path => {
    const res = await fetch(new URL(path, base), {cache: 'no-cache'});
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return res.json();
  }));
  document.getElementById('main').innerHTML = detailHTML({routine, details, id, asset});
  mountCoupon(document.querySelector('[data-coupon]'), routine.order.coupon);
  // Every call to action on this page reads the one order channel.
  const header = document.querySelector('[data-slot="line-link"]');
  if (header && routine.order?.status === 'verified') Object.assign(header, {href: routine.order.url, textContent: routine.order.label_short});
  // A direct link to the names opens there, below the header, with that part already arrived.
  const target = location.hash === '#ingredients' ? document.getElementById('ingredients') : null;
  if (target) for (const el of target.querySelectorAll('[data-reveal]')) el.classList.add('is-in');
  initDetailMotion(document.getElementById('main'));
  target?.scrollIntoView();
}

boot().catch(err => {
  // The static page stays readable: name, role, the way back and the LINE link.
  console.warn('[mediral] product details unavailable', err);
});
