/* Navigation enhancement only. The page and every destination work without JS. */
const menu = document.querySelector('.journey-menu');
if (menu) {
  const summary = menu.querySelector('summary');
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); }
  });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  menu.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!menu.contains(document.activeElement)) menu.open = false; });
  });
  const desktop = matchMedia('(min-width: 1050px)');
  desktop.addEventListener('change', () => { if (desktop.matches) menu.open = false; });
}

// A deep document keeps its original in-page links, beside common section navigation.
const local = document.querySelector('.journey-local-nav');
if (local) {
  // Fresh links use native fragment history rather than the legacy scroll-only handler.
  const links = [...local.querySelectorAll('.navlinks a')].map(link => link.cloneNode(true));
  const list = document.createElement('details');
  const title = document.createElement('summary'); title.textContent = 'หัวข้อในหน้านี้';
  list.append(title, ...links); local.replaceChildren(list);
}
