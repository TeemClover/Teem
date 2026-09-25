/* Small, local interactions. Nothing is sent or saved outside this page. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let ui = {};
  try {
    const content = JSON.parse($('#site-ui')?.textContent || '{}');
    if (content && typeof content === 'object' && !Array.isArray(content)) ui = content;
  } catch { /* The static page remains usable if optional labels are absent. */ }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const counters = new Map();
  const count = (label) => counters.set(label, (counters.get(label) || 0) + 1);
  const text = (node) => node?.textContent.trim().replace(/\s+/g, ' ') || '';
  const make = (tag, value, className) => {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    if (className) node.className = className;
    return node;
  };

  document.documentElement.classList.add('js');

  // Preserve bookmarked rooms from the original one-page house.
  if (document.body.dataset.page === 'home') {
    const roomPaths = { kitchen: 'kitchen', mindfulness: 'mindfulness', stories: 'stories', workshop: 'workshop', about: 'about', picks: 'about' };
    function openBookmarkedRoom() {
      const oldRoom = window.location.hash.slice(1);
      if (!Object.prototype.hasOwnProperty.call(roomPaths, oldRoom)) return false;
      window.location.replace(`/asksydscience/${roomPaths[oldRoom]}/${window.location.search}${oldRoom === 'picks' ? '#picks' : ''}`);
      return true;
    }
    window.addEventListener('hashchange', openBookmarkedRoom);
    if (openBookmarkedRoom()) return;
  }

  // A disclosure on small screens; the desktop navigation remains independent.
  const menuToggle = $('#menu-toggle');
  const menu = $('#mobile-menu');
  function setMenu(open, restoreFocus = false) {
    if (!menu || !menuToggle) return;
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.classList.toggle('is-active', open);
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }
  menuToggle?.addEventListener('click', () => setMenu(menu.hidden));
  document.addEventListener('click', (event) => {
    if (!menu || menu.hidden || !(event.target instanceof Element)) return;
    if (event.target.closest('#mobile-menu a')) setMenu(false);
    else if (!menu.contains(event.target) && !menuToggle?.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu && !menu.hidden) setMenu(false, true);
  });
  const desktop = window.matchMedia('(min-width: 601px)');
  desktop.addEventListener('change', (event) => { if (event.matches) setMenu(false); });

  // All stories are present in HTML, including when scripting is unavailable.
  const filters = $$('[data-filter]');
  const stories = $$('.story-card[data-topic]');
  const storyCount = $('#story-count');
  function filterStories(topic, record = false) {
    const selected = filters.find((button) => button.dataset.filter === topic);
    if (!selected) return;
    filters.forEach((button) => {
      const active = button === selected;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    let visible = 0;
    stories.forEach((card) => {
      card.hidden = topic !== 'all' && card.dataset.topic !== topic;
      if (!card.hidden) visible += 1;
    });
    if (storyCount) storyCount.textContent = `${ui.resultPrefix || ''}${visible}${ui.resultSuffix || ''}`;
    if (record) count(`${ui.eventFilter || ''}${text(selected)}`);
  }
  filters.forEach((button) => button.addEventListener('click', () => {
    filterStories(button.dataset.filter, true);
  }));
  if (filters.length) filterStories(filters.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all');

  const intentions = $$('[data-intention]');
  intentions.forEach((button) => button.addEventListener('click', () => {
    intentions.forEach((item) => {
      const active = item === button;
      item.setAttribute('aria-pressed', String(active));
      item.classList.toggle('is-active', active);
    });
    const note = $('#intention-note');
    if (note && button.dataset.note) note.textContent = button.dataset.note;
    filterStories(button.dataset.intention, true);
  }));

  // Automatic-activation tabs with a single keyboard stop in each tablist.
  $$('[role="tablist"]').forEach((tablist) => {
    const tabs = $$('[data-week]', tablist);
    const pairs = tabs.map((tab) => ({
      tab,
      panel: document.getElementById(tab.getAttribute('aria-controls') || `week-${tab.dataset.week}`)
    })).filter(({ panel }) => panel);
    if (!pairs.length) return;
    pairs.forEach(({ tab, panel }) => {
      tab.id ||= `week-tab-${tab.dataset.week}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
    });
    function activate(index, record = false) {
      pairs.forEach(({ tab, panel }, current) => {
        const active = current === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        tab.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
      if (record) count(`${ui.eventWeek || ''}${pairs[index].tab.dataset.week}`);
    }
    pairs.forEach(({ tab }, index) => {
      tab.addEventListener('click', () => activate(index, true));
      tab.addEventListener('keydown', (event) => {
        const vertical = tablist.getAttribute('aria-orientation') === 'vertical';
        let next;
        if (event.key === (vertical ? 'ArrowDown' : 'ArrowRight')) next = (index + 1) % pairs.length;
        else if (event.key === (vertical ? 'ArrowUp' : 'ArrowLeft')) next = (index + pairs.length - 1) % pairs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = pairs.length - 1;
        else return;
        event.preventDefault();
        activate(next, true);
        pairs[next].tab.focus({ preventScroll: true });
      });
    });
    const selected = pairs.findIndex(({ tab }) => tab.getAttribute('aria-selected') === 'true');
    activate(Math.max(0, selected));
  });

  // Native modal behavior supplies focus containment and Escape support.
  const dialog = $('#detail-dialog');
  const dialogTitle = $('#dialog-title');
  const dialogContent = $('#dialog-content');
  let returnFocus = null;
  let backdropPress = false;
  function renderCounts() {
    if (!dialogContent) return;
    let container = $('#review-counts', dialogContent);
    if (!container) {
      container = make('div');
      container.id = 'review-counts';
      dialogContent.append(container);
    }
    container.setAttribute('aria-live', 'polite');
    const rows = [];
    if (!counters.size) rows.push(make('p', ui.emptyCounts || '', 'empty-counts'));
    counters.forEach((value, label) => {
      const row = make('div', undefined, 'metric-row');
      row.append(make('span', label), make('b', String(value)));
      rows.push(row);
    });
    container.replaceChildren(...rows);
  }
  function openDetail(template, trigger) {
    if (!dialog || !dialogTitle || !dialogContent || !(template instanceof HTMLTemplateElement)) return false;
    const content = template.content.cloneNode(true);
    const heading = $('h2, h3', content);
    dialogTitle.textContent = template.dataset.title || text(heading) || trigger.dataset.title || trigger.getAttribute('aria-label') || text(trigger);
    if (heading && text(heading) === dialogTitle.textContent) heading.remove();
    dialogContent.replaceChildren(content);
    returnFocus = trigger;
    setMenu(false);
    document.body.classList.add('dialog-open');
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('role', 'dialog');
    }
    dialogContent.scrollTop = 0;
    dialog.scrollTop = 0;
    $('[data-close-dialog]', dialog)?.focus({ preventScroll: true });
    return true;
  }
  function finishClose() {
    document.body.classList.remove('dialog-open');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }
  function closeDetail() {
    if (!dialog?.hasAttribute('open')) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); finishClose(); }
  }
  const outsideDialog = (event) => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog?.addEventListener('close', finishClose);
  dialog?.addEventListener('pointerdown', (event) => {
    backdropPress = event.target === dialog && outsideDialog(event);
  });
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog && backdropPress && outsideDialog(event)) closeDetail();
    backdropPress = false;
  });
  dialog?.addEventListener('keydown', (event) => {
    if (typeof dialog.showModal === 'function') return;
    if (event.key === 'Escape') { event.preventDefault(); closeDetail(); }
    if (event.key !== 'Tab') return;
    const nodes = $$('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]', dialog)
      .filter((node) => node.getClientRects().length && !node.closest('[hidden]'));
    if (!nodes.length) return;
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('[data-story], [data-dialog], [data-close-dialog], [data-reset-counts], [data-room]');
    if (!trigger) return;
    if (trigger.hasAttribute('data-close-dialog')) { closeDetail(); return; }
    if (trigger.hasAttribute('data-reset-counts')) { counters.clear(); renderCounts(); return; }
    if (trigger.dataset.story) {
      const template = document.getElementById(`story-${trigger.dataset.story}`);
      if (openDetail(template, trigger)) {
        event.preventDefault();
        count(`${ui.eventStory || ''}${dialogTitle.textContent.replace(/\s+/g, ' ')}`);
      }
      return;
    }
    if (trigger.dataset.dialog) {
      const type = trigger.dataset.dialog;
      if (openDetail(document.getElementById(`template-${type}`), trigger)) {
        event.preventDefault();
        if (type === 'review') renderCounts();
        else count((type === 'registration' ? ui.eventRegistration : type === 'picks' ? ui.eventPicks : '') || dialogTitle.textContent);
      }
      return;
    }
    if (trigger.dataset.room) count(`${ui.eventRoom || ''}${trigger.dataset.label || text($('strong', trigger)) || text(trigger)}`);
  });

  // Only offscreen content receives a reveal state; reduced-motion stays still.
  const reveals = $$('.reveal');
  let revealObserver;
  function revealAll() {
    revealObserver?.disconnect();
    reveals.forEach((node) => {
      node.classList.remove('reveal-ready');
      node.classList.add('is-visible');
    });
  }
  if (!motion.matches && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.add('is-visible');
        revealObserver.unobserve(target);
      });
    }, { rootMargin: '0px 0px -24px 0px', threshold: 0.04 });
    reveals.forEach((node) => {
      if (node.getBoundingClientRect().top < window.innerHeight - 24) node.classList.add('is-visible');
      else { node.classList.add('reveal-ready'); revealObserver.observe(node); }
    });
  } else revealAll();
  motion.addEventListener('change', (event) => { if (event.matches) revealAll(); });

  const header = $('#site-header');
  const progress = $('#reading-progress');
  const sectionLinks = $$('[data-section-link]').filter((link) => link.hash && document.getElementById(link.hash.slice(1)));
  const sections = [...new Set(sectionLinks.map((link) => document.getElementById(link.hash.slice(1))))];
  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    header?.classList.toggle('is-scrolled', window.scrollY > 16);
    if (progress) {
      const length = document.documentElement.scrollHeight - window.innerHeight;
      const value = length > 0 ? Math.min(1, Math.max(0, window.scrollY / length)) : 0;
      progress.style.transform = `scaleX(${value})`;
    }
    let active = '';
    const line = (header?.offsetHeight || 80) + 90;
    sections.forEach((section) => { if (section.getBoundingClientRect().top <= line) active = section.id; });
    sectionLinks.forEach((link) => {
      const selected = link.hash === `#${active}`;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScroll);
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  window.addEventListener('load', queueScroll, { once: true });
  updateScroll();
})();
