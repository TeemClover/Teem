// Client router for the arena. Every route is a direct link; the server returns index.html for all.
import { base, href } from './ui.js';
import { brands } from './brands/meta.js';

const routes = {
  '/': () => import('./views/arena.js'),
  '/homechew/': () => import('./brands/homechew.js'),
  '/tmt/': () => import('./brands/tmt.js'),
  '/noomjang/': () => import('./brands/noomjang.js'),
  '/checkout/': () => import('./views/checkout.js'),
  '/branding/': () => import('./views/branding.js'),
  '/lab/': () => import('./views/lab.js')
};

const app = document.getElementById('app');
let cleanup = () => {};
let renderId = 0;
history.scrollRestoration = 'manual';

function routePath() {
  let p = location.pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length) || '/';
  if (!p.endsWith('/')) p += '/';
  return p;
}

function setMeta({ title, description, noindex }, brandId) {
  document.title = title;
  document.querySelector('meta[name="description"]').setAttribute('content', description);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', brands[brandId]?.theme || '#F2EDE4');
  let robots = document.querySelector('meta[name="robots"]');
  if (noindex && !robots) document.head.append(Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' }));
  if (!noindex && robots) robots.remove();
}

function notFound() {
  return `<div class="page checkout" data-brand="arena"><main id="main" class="co-wrap">
    <h1>ไม่พบหน้านี้</h1><p>ลองกลับไปเลือกบูธที่หน้ารวม</p>
    <a class="btn" data-link href="${href('/')}">ไปหน้ารวม</a></main></div>`;
}

async function render({ scrollY = 0, focus = false } = {}) {
  const id = ++renderId;
  const path = routePath();
  const loader = routes[path];
  const mod = loader ? await loader() : null;
  if (id !== renderId) return; // a newer navigation won
  cleanup();
  cleanup = () => {};
  document.body.classList.remove('has-sticky');
  if (!mod) {
    app.innerHTML = notFound();
    setMeta({ title: 'ไม่พบหน้านี้ · Hamburg Food Fair', description: '', noindex: true });
  } else {
    app.innerHTML = mod.render();
    const page = app.firstElementChild;
    const brandId = page?.dataset.brand;
    document.body.dataset.brand = brandId || 'arena';
    setMeta(typeof mod.meta === 'function' ? mod.meta() : mod.meta, brandId);
    cleanup = mod.mount?.(page, () => render({ scrollY: window.scrollY })) || (() => {});
  }
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target && !scrollY) target.scrollIntoView();
  else window.scrollTo(0, scrollY);
  if (focus) {
    const h = app.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}

function navigate(url) {
  history.replaceState({ ...history.state, scrollY: window.scrollY }, '');
  history.pushState({ scrollY: 0 }, '', url);
  render({ focus: true });
}

document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank') return;
  const raw = a.getAttribute('href');
  // In-page anchors (the <base> tag would otherwise send them to the root).
  if (raw.startsWith('#')) {
    e.preventDefault();
    const el = document.getElementById(raw.slice(1));
    if (!el) return;
    a.closest('dialog')?.close();
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    history.replaceState(history.state, '', location.pathname + location.search + raw);
    const heading = el.matches('[tabindex]') ? el : el.querySelector('h2[tabindex], h1, h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    return;
  }
  if (a.hasAttribute('data-link')) {
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    if (url.href === location.href) return;
    navigate(url.pathname + url.search + url.hash);
  }
});

addEventListener('popstate', e => render({ scrollY: e.state?.scrollY || 0 }));
render();
