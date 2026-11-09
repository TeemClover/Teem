/** Native office portfolio: static cards remain the source, URL state stays bounded. */
const FILTERS = new Set(['all', 'cloverx', 'systems', 'learning']);
const controllers = new WeakMap();
const single = (params, key) => params.getAll(key).length === 1 ? params.get(key) : null;

export function initOfficePortfolio({onOpen = () => {}, onClose = () => {}} = {}) {
  const dialog = document.querySelector('#workbench');
  if (!dialog || typeof dialog.showModal !== 'function') return {open() {}, close() {}, destroy() {}};
  if (controllers.has(dialog)) return controllers.get(dialog);

  const openers = [...document.querySelectorAll('[data-open-workbench]')];
  const closers = [...dialog.querySelectorAll('[data-close-workbench]')];
  const buttons = [...dialog.querySelectorAll('[data-work-filter]')];
  const cards = [...dialog.querySelectorAll('[data-work-card]')];
  const heading = dialog.querySelector('#workbench-title');
  const status = dialog.querySelector('#workbench-count');
  const empty = dialog.querySelector('#workbench-empty');
  const listeners = [];
  let active = false;
  let filter = 'all';
  let returnFocus = null;
  let destroyed = false;

  let grid = dialog.querySelector('[data-work-grid], .workbench-grid');
  if (!grid && cards.length) {
    grid = document.createElement('div');
    cards[0].before(grid);
    cards.forEach(card => grid.append(card));
  }
  if (grid) {
    grid.classList.add('workbench-grid');
    if (!grid.id) grid.id = 'workbench-grid';
  }
  dialog.setAttribute('data-lenis-prevent', '');
  if (heading && !heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  if (status) {
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
  }
  for (const button of [...openers, ...closers, ...buttons]) button.type = 'button';
  for (const opener of openers) {
    opener.setAttribute('aria-haspopup', 'dialog');
    opener.setAttribute('aria-controls', dialog.id);
    opener.setAttribute('aria-expanded', 'false');
    opener.hidden = false;
  }
  if (grid) for (const button of buttons) button.setAttribute('aria-controls', grid.id);

  const listen = (target, name, handler) => {
    target.addEventListener(name, handler);
    listeners.push(() => target.removeEventListener(name, handler));
  };
  const fromURL = () => {
    const params = new URLSearchParams(location.search);
    const requested = single(params, 'filter');
    return {open: single(params, 'view') === 'work', filter: FILTERS.has(requested) ? requested : 'all'};
  };
  function saveURL(open, method = 'replaceState') {
    const url = new URL(location.href);
    if (open) {
      url.searchParams.set('view', 'work');
      url.searchParams.set('filter', filter);
      url.hash = 'office';
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('filter');
    }
    if (url.href !== location.href) {
      try { history[method](history.state, '', url.pathname + url.search + url.hash); } catch { /* Native controls remain usable without history access. */ }
    }
  }
  function renderFilter(value, {resetScroll = false} = {}) {
    filter = FILTERS.has(value) ? value : 'all';
    let count = 0;
    for (const card of cards) {
      const categories = (card.dataset.workCategory || '').split(/\s+/).filter(Boolean);
      const visible = filter === 'all' || categories.includes(filter);
      card.hidden = !visible;
      if (visible) count++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.workFilter === filter));
    if (status) status.textContent = `${filter === 'all' ? 'ผลงานทั้งหมด' : 'ผลงานในหมวดนี้'} · ${count} ผลงาน`;
    if (empty) empty.hidden = count !== 0;
    if (resetScroll) dialog.scrollTop = 0;
  }
  function finishClose({focus = true} = {}) {
    if (!active) return;
    active = false;
    document.body.classList.remove('portfolio-open');
    openers.forEach(button => button.setAttribute('aria-expanded', 'false'));
    onClose();
    if (focus) {
      const available = element => element?.isConnected && !element.closest('[hidden], [inert], dialog:not([open])') && element.getClientRects().length > 0;
      const target = available(returnFocus) ? returnFocus : openers.find(available);
      target?.focus({preventScroll: true});
    }
  }
  function show({push = true, focus = true} = {}) {
    if (destroyed) return;
    if (dialog.open) {
      if (push) saveURL(true, 'replaceState');
      return;
    }
    returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : openers[0];
    if (push) saveURL(true, 'pushState');
    dialog.showModal();
    active = true;
    document.body.classList.add('portfolio-open');
    openers.forEach(button => button.setAttribute('aria-expanded', 'true'));
    dialog.scrollTop = 0;
    onOpen();
    if (focus) (heading || closers[0] || dialog).focus({preventScroll: true});
  }
  function close({rewrite = true, focus = true} = {}) {
    if (rewrite) saveURL(false);
    if (dialog.open) dialog.close();
    finishClose({focus});
  }
  function restore() {
    if (destroyed) return;
    const desired = fromURL();
    renderFilter(desired.filter);
    if (desired.open) show({push: false});
    else close({rewrite: false});
  }

  for (const opener of openers) listen(opener, 'click', () => show());
  for (const closer of closers) listen(closer, 'click', event => { event.preventDefault(); close(); });
  for (const button of buttons) listen(button, 'click', () => {
    renderFilter(button.dataset.workFilter, {resetScroll: true});
    if (dialog.open) saveURL(true);
    button.focus({preventScroll: true});
  });
  listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
  // An old queued close event must never close a dialog reopened by Forward.
  listen(dialog, 'close', () => {
    if (dialog.open || !active) return;
    saveURL(false);
    finishClose();
  });
  listen(window, 'popstate', restore);

  const controller = {
    open(value = filter) { renderFilter(value); show(); },
    close,
    destroy() {
      close({rewrite: false, focus: false});
      destroyed = true;
      listeners.splice(0).forEach(remove => remove());
      controllers.delete(dialog);
      delete dialog.dataset.portfolioReady;
    },
  };
  controllers.set(dialog, controller);
  dialog.dataset.portfolioReady = 'true';
  restore();
  return controller;
}
