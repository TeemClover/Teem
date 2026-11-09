import { readBrandState, visitStation, brandURL } from '/xircle/brand-state.js?v=20261109';

/* Opt-in bridge from the Clover X brand map; standalone room behavior is unchanged. */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.getAll('brand').length !== 1 || params.get('brand') !== 'xircle') return;

  const returnKeys = new Set(['at', 'path', 'moment', 'device', 'loop', 'product', 'sample', 'trail']);
  function readReturn() {
    if (params.getAll('return').length !== 1) return null;
    const value = params.get('return');
    if (!value || value.length > 2048) return null;
    try {
      const target = new URL(value, location.href);
      if (target.origin !== location.origin || target.pathname !== '/xircle/' || target.hash !== '#visit-routine') return null;
      // Keep the room return limited to the bounded public walk state.
      const clean = new URL('/xircle/', location.origin);
      for (const [key, value] of target.searchParams) {
        if (returnKeys.has(key)) clean.searchParams.append(key, value);
      }
      clean.hash = '#visit-routine';
      return brandURL(visitStation(readBrandState(clean.href), 'routine'), clean.href);
    } catch { return null; }
  }
  const returnURL = readReturn();
  const map = returnURL || '/xircle/#visit-routine';
  const download = 'https://www.xircle.health/download';
  document.documentElement.classList.add('routinex-brand');
  document.querySelector('meta[property="og:site_name"]')?.setAttribute('content', 'RoutineX · Clover X');

  // Keep a room-to-room walk inside the same brand experience. Scientific references stay intact.
  for (const link of document.querySelectorAll('a[href]')) {
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin === location.origin && /^\/routinex\/(?:absorb|build)\/$/.test(url.pathname)) {
      url.searchParams.set('brand', 'xircle');
      if (returnURL) url.searchParams.set('return', returnURL);
      else url.searchParams.delete('return');
      link.setAttribute('href', url.pathname + url.search + url.hash);
    }
    if (url.hostname === 'lin.ee' || url.hostname === 'line.me') {
      link.href = map;
      link.textContent = 'กลับแผนที่ Clover X →';
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.dataset.brandExit = 'map';
    }
    if (url.origin === location.origin && url.pathname === '/xircle/doc/routinex/') {
      link.href = map;
      link.textContent = 'กลับแผนที่ RoutineX →';
    }
  }
  for (const note of document.querySelectorAll('[data-brand-note]')) {
    note.textContent = 'เลือกห้องต่อไป หรือกลับแผนที่ Clover X เพื่อเดินต่อในแบบของคุณ';
  }
  for (const heading of document.querySelectorAll('[data-brand-title]')) {
    heading.textContent = heading.dataset.brandTitle;
  }

  const nav = document.createElement('nav');
  nav.className = 'routine-brand-nav';
  nav.setAttribute('aria-label', 'เส้นทาง Clover X');
  const brand = document.createElement('span');
  brand.className = 'routine-brand-label';
  brand.textContent = 'CLOVER X / EXPERIENCE';
  const back = document.createElement('a');
  back.href = map;
  back.className = 'routine-brand-map';
  back.textContent = '← กลับแผนที่';
  const app = document.createElement('a');
  app.href = download;
  app.textContent = 'โหลด Xircle ↗';
  app.target = '_blank';
  app.rel = 'noopener';
  app.className = 'routine-brand-download';
  nav.append(back, brand, app);
  document.body.append(nav);

  // Existing sources/formula drawers own the screen and keyboard while open.
  const drawers = [...document.querySelectorAll('.drawer')];
  const updateDrawerState = () => { nav.hidden = drawers.some(drawer => !drawer.hidden); };
  const observer = new MutationObserver(updateDrawerState);
  for (const drawer of drawers) observer.observe(drawer, { attributes: true, attributeFilter: ['hidden'] });
  updateDrawerState();
})();
