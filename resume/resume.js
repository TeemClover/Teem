(function () {
  'use strict';

  var page = document.querySelector('.resume-page');
  if (!page || page.classList.contains('enhanced')) return;

  var modes = ['career', 'lifestyle'];
  var filters = ['all', 'learn', 'build', 'play'];
  var steps = ['source', 'check', 'output'];
  var worlds = Array.from(document.querySelectorAll('[data-world]'));
  var modeButtons = Array.from(document.querySelectorAll('button[data-mode]'));
  var languageButtons = Array.from(document.querySelectorAll('button[data-lang]'));
  var filterButtons = Array.from(document.querySelectorAll('button[data-filter]'));
  var projects = Array.from(document.querySelectorAll('[data-category]'));
  var demoButtons = Array.from(document.querySelectorAll('button[data-demo-step]'));
  var demoPanels = Array.from(document.querySelectorAll('[data-demo-panel]'));
  var count = document.getElementById('shelf-count');
  var copyStatus = document.getElementById('copy-status');
  var state = { mode: 'career', language: 'th', filter: 'all', step: 'source', copy: '' };

  // Thai lives in the HTML; English is trusted, static copy on the same leaf.
  var translations = Array.from(document.querySelectorAll('[data-en]')).map(function (element) {
    return { element: element, th: element.innerHTML, en: element.getAttribute('data-en') };
  });
  var translatedAttributes = [];
  ['alt', 'aria-label'].forEach(function (attribute) {
    document.querySelectorAll('[data-en-' + attribute + ']').forEach(function (element) {
      translatedAttributes.push({
        element: element,
        name: attribute,
        th: element.getAttribute(attribute),
        en: element.getAttribute('data-en-' + attribute)
      });
    });
  });

  function stored(key, allowed, fallback) {
    try {
      var value = localStorage.getItem(key);
      return allowed.indexOf(value) !== -1 ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* Storage is optional. */ }
  }

  function hashId() {
    try { return decodeURIComponent(window.location.hash.slice(1)); }
    catch (error) { return ''; }
  }

  function modeForHash(id) {
    if (['career', 'career-proof', 'work'].indexOf(id) !== -1) return 'career';
    if (['lifestyle', 'life-gallery', 'life'].indexOf(id) !== -1) return 'lifestyle';
    var target = document.getElementById(id);
    var world = target && target.closest('[data-world]');
    return world && modes.indexOf(world.dataset.world) !== -1 ? world.dataset.world : null;
  }

  function historyMode() {
    var entry = window.history.state;
    return entry && modes.indexOf(entry.mcResumeMode) !== -1 ? entry.mcResumeMode : null;
  }

  function historyEntry(mode) {
    return Object.assign({}, window.history.state || {}, { mcResumeMode: mode });
  }

  function rememberHistoryMode() {
    try {
      window.history.replaceState(historyEntry(state.mode), '', window.location.href);
    } catch (error) { /* Reading the profile does not require writable history. */ }
  }

  function applyMode(mode, save) {
    state.mode = modes.indexOf(mode) !== -1 ? mode : 'career';
    document.body.dataset.mode = state.mode;
    worlds.forEach(function (world) { world.hidden = world.dataset.world !== state.mode; });
    modeButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    });
    if (save) remember('mc_resume_mode', state.mode);
  }

  function scrollToAnchor(id, moveFocus) {
    var targetId = id === 'lifestyle' ? 'life' : id === 'career' ? 'work' : id;
    var target = document.getElementById(targetId);
    if (!target || target.closest('[hidden]')) return;
    window.requestAnimationFrame(function () {
      if (target.closest('[hidden]')) return;
      if (moveFocus) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }

  function followHash() {
    var id = hashId();
    var focusedWorld = document.activeElement && document.activeElement.closest('[data-world]');
    var nextMode = modeForHash(id) || historyMode() || state.mode;
    var moveFocus = focusedWorld && focusedWorld.dataset.world !== nextMode;
    applyMode(nextMode, true);
    rememberHistoryMode();
    if (id) scrollToAnchor(id, moveFocus);
  }

  function chooseMode(mode) {
    if (modes.indexOf(mode) === -1) return;
    applyMode(mode, true);
    if (window.location.hash !== '#' + mode) {
      var url = new URL(window.location.href);
      url.hash = mode;
      try {
        window.history.pushState(historyEntry(mode), '', url);
      } catch (error) {
        window.location.hash = mode;
      }
    } else {
      rememberHistoryMode();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  function applyFilter(filter) {
    state.filter = filters.indexOf(filter) !== -1 ? filter : 'all';
    var visible = 0;
    projects.forEach(function (project) {
      var categories = project.dataset.category.trim().split(/\s+/);
      var shown = state.filter === 'all' || categories.indexOf(state.filter) !== -1;
      project.hidden = !shown;
      if (shown) visible += 1;
    });
    filterButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
    });
    if (count) {
      count.textContent = state.language === 'en'
        ? 'Showing ' + visible + ' of ' + projects.length + ' projects'
        : 'แสดง ' + visible + ' จาก ' + projects.length + ' ผลงาน';
    }
  }

  function applyDemo(step) {
    state.step = steps.indexOf(step) !== -1 ? step : 'source';
    demoPanels.forEach(function (panel) { panel.hidden = panel.dataset.demoPanel !== state.step; });
    demoButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.demoStep === state.step));
    });
  }

  function updateCopyStatus() {
    if (!copyStatus) return;
    var messages = state.language === 'en' ? {
      copied: 'Bio copied. Ready to share.',
      selected: 'Text selected. Press Ctrl+C or ⌘C, or use your device’s Copy action.',
      failed: 'Automatic copying is unavailable. Please select and copy the bio below.'
    } : {
      copied: 'คัดลอกคำแนะนำตัวแล้ว พร้อมนำไปใช้ได้เลย',
      selected: 'เลือกข้อความให้แล้ว กด Ctrl+C หรือ ⌘C หรือใช้คำสั่งคัดลอกบนอุปกรณ์ของคุณ',
      failed: 'คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกและคัดลอกคำแนะนำตัวด้านล่าง'
    };
    copyStatus.textContent = messages[state.copy] || '';
  }

  function applyLanguage(language, save) {
    state.language = language === 'en' ? 'en' : 'th';
    document.documentElement.lang = state.language;
    translations.forEach(function (entry) { entry.element.innerHTML = entry[state.language]; });
    translatedAttributes.forEach(function (entry) {
      var value = entry[state.language];
      if (value === null) entry.element.removeAttribute(entry.name);
      else entry.element.setAttribute(entry.name, value);
    });
    languageButtons.forEach(function (button) {
      var active = button.dataset.lang === state.language;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('active', active);
    });
    document.title = state.language === 'en'
      ? 'Narin “Teem” Leelaporn — System Builder & AI Instructor | Teem Clover'
      : 'ทีม นรินทร์ ลีลาภรณ์ — นักพัฒนาระบบและผู้สอน AI | Teem Clover';
    applyFilter(state.filter);
    applyDemo(state.step);
    updateCopyStatus();
    if (save) remember('mc_lang', state.language);
  }

  function selectBio(bio) {
    var ancestor = bio.parentElement;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    try {
      var selection = window.getSelection();
      if (!selection) throw new Error('Selection unavailable');
      var range = document.createRange();
      range.selectNodeContents(bio);
      selection.removeAllRanges();
      selection.addRange(range);
      bio.scrollIntoView({ block: 'nearest' });
      state.copy = 'selected';
    } catch (error) {
      state.copy = 'failed';
    }
    updateCopyStatus();
  }

  async function copyBio() {
    var bio = document.getElementById('bio-copy');
    if (!bio) return;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(bio.textContent.trim());
      state.copy = 'copied';
      updateCopyStatus();
    } catch (error) {
      selectBio(bio);
    }
  }

  try {
    var initialId = hashId();
    applyMode(modeForHash(initialId) || historyMode() || stored('mc_resume_mode', modes, 'career'), false);
    applyLanguage(stored('mc_lang', ['th', 'en'], 'th'), false);
    rememberHistoryMode();

    modeButtons.forEach(function (button) {
      button.addEventListener('click', function () { chooseMode(button.dataset.mode); });
    });
    languageButtons.forEach(function (button) {
      button.addEventListener('click', function () { applyLanguage(button.dataset.lang, true); });
    });
    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () { applyFilter(button.dataset.filter); });
    });
    demoButtons.forEach(function (button) {
      button.addEventListener('click', function () { applyDemo(button.dataset.demoStep); });
    });
    var copyButton = document.getElementById('copy-bio');
    if (copyButton) copyButton.addEventListener('click', copyBio);
    var printButton = document.getElementById('print-profile');
    if (printButton) printButton.addEventListener('click', function () { window.print(); });

    window.addEventListener('hashchange', followHash);
    window.addEventListener('popstate', followHash);
    page.classList.add('enhanced');
    if (initialId) scrollToAnchor(initialId);
  } catch (error) {
    // A readable complete profile is the fallback if enhancement cannot start.
    worlds.concat(projects, demoPanels).forEach(function (element) { element.hidden = false; });
    page.classList.remove('enhanced');
    console.warn('Profile enhancements could not start; the full profile remains readable.', error);
  }
})();
