/**
 * Mediral — a product's own page. The static page already names the piece, its role and a way
 * back; this fills in the full story and every listed name from the same data as the main page.
 */
import {detailHTML} from './detail-view.js';

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
  // Every call to action on this page reads the one order channel.
  const header = document.querySelector('[data-slot="line-link"]');
  if (header && routine.order?.status === 'verified') Object.assign(header, {href: routine.order.url, textContent: routine.order.label_short});
  // A direct link to the names opens there, below the header.
  if (location.hash === '#ingredients') document.getElementById('ingredients')?.scrollIntoView();
}

boot().catch(err => {
  // The static page stays readable: name, role, the way back and the LINE link.
  console.warn('[mediral] product details unavailable', err);
});
