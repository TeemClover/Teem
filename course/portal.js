/* Project selector. Access is checked by the server; credentials are never stored here. */
(() => {
  'use strict';
  const projects = {
    thedent: 'TheDent',
    'pir-academy': 'Pi R Academy',
    cloverx: 'Clover X',
    crescohealth: 'CrescoHealth',
    gems: 'GEMS Scientific Beauty'
  };
  const dialog = document.getElementById('access-dialog');
  const form = document.getElementById('access-form');
  const field = document.getElementById('project-password');
  const toggle = document.getElementById('toggle-password');
  const submit = document.getElementById('submit-access');
  const error = document.getElementById('access-error');
  const params = new URLSearchParams(location.search);
  const initialProject = params.get('project') || (/^#(?:learn|present)\//.test(location.hash) ? 'thedent' : null);
  const initialNext = params.get('next');
  const initialHash = location.hash;
  const genericError = 'ไม่สามารถเข้าสู่โปรเจกต์นี้ได้ กรุณาตรวจสอบรหัสแล้วลองอีกครั้ง';
  let selectedProject = null;
  let previousFocus = null;
  let controller = null;
  let attempt = 0;
  let busy = false;
  let checkingCard = null;

  function safeNext(value) {
    if (typeof value !== 'string' || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
    try {
      const rawPath = value.split(/[?#]/, 1)[0];
      if (!/^\/course\/(?:thedent912|thedent)(?:\/|$)/.test(rawPath) || rawPath.includes('%') || rawPath.includes('//')) return null;
      const url = new URL(value, location.origin);
      if (url.origin !== location.origin || url.pathname !== rawPath) return null;
      url.pathname = rawPath.replace(/^\/course\/thedent(?=\/|$)/, '/course/thedent912');
      if (url.pathname === '/course/thedent912') url.pathname += '/';
      return url;
    } catch { return null; }
  }

  function setBusy(value) {
    busy = value;
    form.setAttribute('aria-busy', String(value));
    submit.disabled = value;
    field.readOnly = value;
    document.getElementById('submit-label').textContent = value ? 'กำลังตรวจสอบรหัส…' : 'เข้าสู่โปรเจกต์';
    submit.querySelector('.submit-arrow').hidden = value;
    submit.querySelector('.spinner').hidden = !value;
  }

  function clearError() {
    error.hidden = true;
    error.textContent = '';
    field.removeAttribute('aria-invalid');
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
    field.select();
  }

  function resetVisibility() {
    field.type = 'password';
    toggle.textContent = 'แสดง';
    toggle.setAttribute('aria-label', 'แสดงรหัส');
    toggle.setAttribute('aria-pressed', 'false');
  }

  function cancelAttempt() {
    attempt += 1;
    if (controller) controller.abort();
    controller = null;
    if (checkingCard) {
      checkingCard.removeAttribute('aria-busy');
      checkingCard.disabled = false;
      checkingCard = null;
    }
    setBusy(false);
  }

  function enterClassroom(serverDestination) {
    const requested = initialProject === 'thedent' ? safeNext(initialNext) : null;
    const destination = requested || serverDestination;
    if (initialProject === 'thedent' && initialHash && !destination.hash) destination.hash = initialHash;
    field.value = '';
    location.assign(destination.pathname + destination.search + destination.hash);
  }

  function openProject(id, trigger) {
    if (!Object.hasOwn(projects, id)) return;
    cancelAttempt();
    selectedProject = id;
    previousFocus = trigger || document.querySelector(`[data-project="${id}"]`);
    document.getElementById('dialog-title').textContent = projects[id];
    field.value = '';
    clearError();
    resetVisibility();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => field.focus());
  }

  function closeProject() {
    cancelAttempt();
    field.value = '';
    resetVisibility();
    clearError();
    selectedProject = null;
    if (dialog.open) dialog.close();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }

  async function chooseProject(id, trigger) {
    if (!Object.hasOwn(projects, id)) return;
    if (id !== 'thedent') { openProject(id, trigger); return; }
    cancelAttempt();
    const currentAttempt = ++attempt;
    const requestController = new AbortController();
    controller = requestController;
    checkingCard = trigger || document.querySelector('[data-project="thedent"]');
    if (checkingCard) {
      checkingCard.setAttribute('aria-busy', 'true');
      checkingCard.disabled = true;
    }
    const timeout = setTimeout(() => requestController.abort(), 10000);
    try {
      const response = await fetch('/api/course-access', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ action: 'status', project: id }),
        signal: requestController.signal
      });
      const result = await response.json().catch(() => null);
      if (currentAttempt !== attempt) return;
      const destination = safeNext(result?.redirect);
      if (response.ok && result?.ok === true && destination) {
        enterClassroom(destination);
        return;
      }
    } catch {
      if (currentAttempt !== attempt) return;
    } finally {
      clearTimeout(timeout);
      if (currentAttempt === attempt) cancelAttempt();
    }
    openProject(id, trigger);
  }

  document.querySelectorAll('[data-project]').forEach(card => {
    card.addEventListener('click', () => chooseProject(card.dataset.project, card));
  });
  document.getElementById('close-dialog').addEventListener('click', closeProject);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeProject();
  });
  toggle.addEventListener('click', () => {
    const visible = field.type === 'password';
    field.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'ซ่อน' : 'แสดง';
    toggle.setAttribute('aria-label', visible ? 'ซ่อนรหัส' : 'แสดงรหัส');
    toggle.setAttribute('aria-pressed', String(visible));
    field.focus();
  });
  field.addEventListener('input', clearError);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !selectedProject) return;
    clearError();
    if (!field.value) { showError('กรุณาใส่รหัสเข้าโปรเจกต์'); return; }
    const project = selectedProject;
    const currentAttempt = ++attempt;
    const requestController = new AbortController();
    controller = requestController;
    const timeout = setTimeout(() => requestController.abort(), 20000);
    setBusy(true);
    try {
      const response = await fetch('/api/course-access', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ project, password: field.value }),
        signal: requestController.signal
      });
      const result = await response.json().catch(() => null);
      if (currentAttempt !== attempt || !dialog.open) return;
      const serverDestination = safeNext(result?.redirect);
      if (!response.ok || result?.ok !== true || project !== 'thedent' || !serverDestination) {
        setBusy(false);
        showError(genericError);
        return;
      }
      enterClassroom(serverDestination);
    } catch (failure) {
      if (currentAttempt !== attempt) return;
      setBusy(false);
      showError(genericError);
    } finally {
      clearTimeout(timeout);
      if (currentAttempt === attempt) controller = null;
    }
  });

  window.addEventListener('pagehide', () => {
    cancelAttempt();
    field.value = '';
    resetVisibility();
  });

  if (initialProject && Object.hasOwn(projects, initialProject)) chooseProject(initialProject);
})();
