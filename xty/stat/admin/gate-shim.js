(() => {
  const ADMIN_DECOY_PASSWORD = 'calling';
  const STORAGE_KEY = 'xty_admin_decoy_open';
  const realFetch = window.fetch.bind(window);

  function json(body, status = 200) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    }));
  }

  function pathnameOf(input) {
    try {
      const value = typeof input === 'string' ? input : input?.url;
      return new URL(value || '', window.location.href).pathname;
    } catch {
      return '';
    }
  }

  function methodOf(input, init) {
    return String(init?.method || input?.method || 'GET').toUpperCase();
  }

  function wantsRealAdmin(input, init) {
    try {
      const headers = new Headers(init?.headers || input?.headers || {});
      return headers.get('x-xty-admin-real') === '1';
    } catch {
      return false;
    }
  }

  window.fetch = function xtyAdminDecoyFetch(input, init = {}) {
    const pathname = pathnameOf(input);
    const method = methodOf(input, init);

    /* Read-only stats keep the lightweight `calling` gate, but destructive
       recovery tools need a real server session. Requests carrying this
       internal marker must reach the server instead of being swallowed here. */
    if (wantsRealAdmin(input, init)) return realFetch(input, init);

    if (pathname === '/api/xty/admin/login' && method === 'POST') {
      let body = {};
      try { body = JSON.parse(String(init.body || '{}')); } catch {}
      if (String(body.password || '') === ADMIN_DECOY_PASSWORD) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        return json({ ok: true, decoy: true });
      }
      return json({ ok: false, error: 'ADMIN_LOGIN_FAILED', message: 'รหัสไม่ถูก' }, 401);
    }

    if (pathname === '/api/xty/admin/logout' && method === 'POST') {
      sessionStorage.removeItem(STORAGE_KEY);
      return json({ ok: true, decoy: true });
    }

    if (pathname === '/api/xty/admin/session' && method === 'GET') {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        return json({ ok: true, decoy: true });
      }
      return json({ ok: false, error: 'ADMIN_AUTH_REQUIRED' }, 401);
    }

    return realFetch(input, init);
  };
})();
