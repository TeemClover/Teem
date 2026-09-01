(() => {
  const $ = (id) => document.getElementById(id);
  const gateView = $('gateView');
  const compendiumView = $('compendiumView');
  const loginForm = $('loginForm');
  const password = $('password');
  const loginStatus = $('loginStatus');
  const logoutButton = $('logoutButton');

  async function api(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok || data.ok === false) {
      const error = new Error(data.message || data.error || 'REQUEST_FAILED');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showCompendium() {
    gateView.hidden = true;
    compendiumView.hidden = false;
    document.body.classList.add('open');
  }

  function showGate() {
    compendiumView.hidden = true;
    gateView.hidden = false;
    document.body.classList.remove('open');
    password?.focus();
  }

  async function restoreSession() {
    try {
      await api('/api/xty/admin/session');
      showCompendium();
    } catch {
      showGate();
    }
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginStatus.textContent = 'กำลังเปิดบันทึก…';
    const submit = loginForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await api('/api/xty/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: password.value }),
      });
      password.value = '';
      loginStatus.textContent = '';
      showCompendium();
    } catch (error) {
      loginStatus.textContent = error.message === 'ADMIN_LOGIN_FAILED' ? 'รหัสไม่ถูก' : error.message;
      password.select();
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  logoutButton?.addEventListener('click', async () => {
    try {
      await api('/api/xty/admin/logout', { method: 'POST', body: '{}' });
    } catch {}
    showGate();
  });

  restoreSession();
})();
