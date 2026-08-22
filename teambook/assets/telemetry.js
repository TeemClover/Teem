(() => {
  if (window.__teambookTelemetryLoaded) return;
  window.__teambookTelemetryLoaded = true;

  const path = location.pathname || '/';
  if (/^\/(?:command|stat\/admin)(?:\/|$)/.test(path)) return;
  const API = '/api/telemetry';
  let activeSeconds = 0;
  let maxScroll = 0;
  let lastTick = Date.now();
  let flushedAt = Date.now();

  function id(prefix) {
    try { return `${prefix}_${crypto.randomUUID()}`; }
    catch { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`; }
  }

  function localProfileId() {
    try {
      const raw = localStorage.getItem('teambook_profile_v1');
      if (!raw) return '';
      const profile = JSON.parse(raw);
      const value = String(profile?.id || profile?.profileId || '').trim();
      return /^[a-z0-9_-]{6,80}$/i.test(value) ? value : '';
    } catch { return ''; }
  }

  function safeReferrer() {
    if (!document.referrer) return '';
    try {
      const url = new URL(document.referrer);
      return url.hostname === location.hostname ? `${url.origin}${url.pathname}` : url.origin;
    } catch { return ''; }
  }

  function inviteCode() {
    try {
      const value = new URLSearchParams(location.search).get('c');
      return /^\d{5}$/.test(value || '') ? value : '';
    } catch { return ''; }
  }

  function deviceClass() {
    const width = Math.max(screen?.width || 0, innerWidth || 0);
    return width < 600 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
  }

  function payload(eventType, extra = {}) {
    return {
      eventId: id('e'), eventType, path, title: document.title || '', referrer: safeReferrer(),
      localProfileId: localProfileId(), bookCode: extra.bookCode || '', occurredAt: Date.now(),
      metadata: { device: deviceClass(), language: navigator.language || '', ...extra.metadata },
      activeSeconds: extra.activeSeconds || 0, scrollDepth: extra.scrollDepth || maxScroll,
    };
  }

  function post(data, beacon = false) {
    const body = JSON.stringify(data);
    if (beacon && navigator.sendBeacon) {
      try { return navigator.sendBeacon(API, new Blob([body], { type: 'application/json' })); } catch {}
    }
    fetch(API, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body,
      credentials: 'same-origin', keepalive: true,
    }).catch(() => {});
    return true;
  }

  function oncePerSession(key) {
    try {
      if (sessionStorage.getItem(key) === '1') return false;
      sessionStorage.setItem(key, '1');
    } catch {}
    return true;
  }

  function trackBookContext() {
    const code = inviteCode();
    if (!code) return;
    /* Invite links can route /join/?c=... -> /?c=... before deferred JS runs.
       A session key prevents that routing hop from becoming two invite opens. */
    if (path === '/' || /^\/join(?:\/|$)/.test(path)) {
      if (oncePerSession(`tb:invite-open:${code}`)) post(payload('INVITE_OPEN', { bookCode: code }), false);
      return;
    }
    if (/^\/p(?:\/|$)/.test(path)) {
      post(payload('BOOK_OPEN', { bookCode: code }), false);
    }
  }

  function visible() { return document.visibilityState === 'visible' && document.hasFocus(); }
  function tick() {
    const now = Date.now();
    if (visible()) activeSeconds += Math.max(0, Math.min(5, Math.round((now - lastTick) / 1000)));
    lastTick = now;
    if (now - flushedAt >= 30000) flush(false);
  }

  function updateScroll() {
    const root = document.documentElement;
    const total = Math.max(1, root.scrollHeight - innerHeight);
    const depth = total <= 1 ? 100 : Math.round((scrollY / total) * 100);
    maxScroll = Math.max(maxScroll, Math.max(0, Math.min(100, depth)));
  }

  function flush(beacon) {
    updateScroll();
    if (activeSeconds <= 0 && maxScroll <= 0) return;
    const seconds = activeSeconds;
    activeSeconds = 0;
    flushedAt = Date.now();
    post(payload('ENGAGEMENT', { activeSeconds: seconds, scrollDepth: maxScroll }), beacon);
  }

  function navigate(event) {
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    try {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      const destination = url.pathname;
      if (!destination || destination === path) return;
      post(payload('NAVIGATE', { metadata: { destination } }), false);
    } catch {}
  }

  function boot() {
    updateScroll();
    post(payload('PAGE_VIEW', { scrollDepth: maxScroll }), false);
    trackBookContext();
    addEventListener('scroll', updateScroll, { passive: true });
    document.addEventListener('click', navigate, { capture: true });
    document.addEventListener('visibilitychange', () => {
      tick();
      if (document.visibilityState === 'hidden') flush(true);
    });
    addEventListener('pagehide', () => { tick(); flush(true); });
    setInterval(tick, 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
