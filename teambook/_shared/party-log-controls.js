/* Keep every timeline node in place: Seen, rewards and event decorators share
   their order. Filtering only changes visibility, never the stored notebook. */

const FILTERS = Object.freeze([
  { id: 'all', label: 'ทั้งหมด', empty: 'ยังไม่มีเรื่องในสมุด' },
  { id: 'commit', label: 'ลงชื่อ', empty: 'ยังไม่มีรายการลงชื่อในสมุดนี้' },
  { id: 'message', label: 'ข้อความ', empty: 'ยังไม่มีข้อความแชตในสมุดนี้' },
]);

export function normalizeLogFilter(value) {
  return FILTERS.some(filter => filter.id === value) ? value : 'all';
}

export function matchesLogFilter(kind, filter) {
  const selected = normalizeLogFilter(filter);
  return selected === 'all' || kind === selected;
}

export function installLogControls() {
  const log = document.getElementById('log');
  if (!log || document.getElementById('logControls')) return;

  const code = new URLSearchParams(location.search).get('c') || '';
  const storageKey = `teambook_log_filter_v1:${code}`;
  let selected = 'all';
  try { selected = normalizeLogFilter(sessionStorage.getItem(storageKey)); } catch {}

  const controls = document.createElement('div');
  controls.id = 'logControls';
  controls.className = 'log-controls';
  controls.innerHTML = `
    <div class="log-filters" role="group" aria-label="กรองเรื่องในสมุด">
      ${FILTERS.map(filter => `<button type="button" data-log-filter="${filter.id}" aria-controls="log" aria-pressed="false">${filter.label}</button>`).join('')}
    </div>
    <div class="log-navigation">
      <span id="logFilterStatus" class="whisper" role="status" aria-live="polite" aria-atomic="true"></span>
      <button type="button" class="btn ghost sm" id="logLatest" aria-controls="log"><span aria-hidden="true">↓</span> ไปข้อความล่าสุด</button>
    </div>`;
  const rewards = document.getElementById('rewardStatuses');
  (rewards || log).before(controls);

  const empty = document.createElement('p');
  empty.id = 'logFilterEmpty';
  empty.className = 'log-filter-empty';
  empty.hidden = true;
  controls.after(empty);

  const buttons = [...controls.querySelectorAll('[data-log-filter]')];
  const status = controls.querySelector('#logFilterStatus');
  const latest = controls.querySelector('#logLatest');
  let queued = false;

  function matchingRows() {
    return [...log.children].filter(row =>
      row.matches('.post,.public-entry,.party-event,.public-event')
      && matchesLogFilter(row.dataset.logKind, selected));
  }

  function sync() {
    log.dataset.logFilter = selected;
    if (rewards) rewards.hidden = selected !== 'all';
    buttons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.logFilter === selected));
    });
    const count = matchingRows().length;
    const text = `${FILTERS.find(filter => filter.id === selected).label} · ${count} รายการ`;
    if (status.textContent !== text) status.textContent = text;
    const emptyText = FILTERS.find(filter => filter.id === selected).empty;
    if (empty.textContent !== emptyText) empty.textContent = emptyText;
    // The renderer owns the unfiltered empty state. This one belongs to filters.
    empty.hidden = selected === 'all' || count > 0;
    latest.disabled = count === 0;
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    selected = normalizeLogFilter(button.dataset.logFilter);
    try { sessionStorage.setItem(storageKey, selected); } catch {}
    sync();
    // A desktop history viewport starts at the first matching entry. On mobile
    // the page stays where the reader tapped the controls.
    log.scrollTop = 0;
  }));

  latest.addEventListener('click', () => {
    const target = matchingRows().at(-1);
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: 'end', inline: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  });

  // Watch only entry replacements/insertions, not reactions or text decoration.
  // Controls live outside this subtree, so updating them cannot loop this observer.
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  }).observe(log, { childList: true });
  sync();
}

if (typeof document !== 'undefined') installLogControls();
