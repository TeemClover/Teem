import { partyIdentity } from './store.js';

const HOT_FOR_MS = 2 * 60 * 1000;
const HOT_POLL_MS = 1000;
const IDLE_POLL_MS = 4000;
const FULL_FALLBACK_MS = 15000;
const SYNC_COOLDOWN_MS = 1800;

function pageCode() {
  if (!/^\/p\/?$/.test(location.pathname)) return '';
  const value = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(value) ? value : '';
}

const code = pageCode();
let hotUntil = Date.now() + HOT_FOR_MS;
let lastVersion = '';
let lastFullSyncAt = 0;
let pulseInFlight = false;
let fullSyncLocked = false;
let timer = null;
let channel = null;

function markHot() {
  hotUntil = Date.now() + HOT_FOR_MS;
}

function pollDelay() {
  return Date.now() < hotUntil ? HOT_POLL_MS : IDLE_POLL_MS;
}

function authHeaders() {
  const headers = { accept: 'application/json' };
  const token = partyIdentity(code)?.token || '';
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

function schedule(delay = pollDelay()) {
  clearTimeout(timer);
  if (!code || document.hidden) return;
  timer = setTimeout(pulse, delay);
}

function requestFullSync() {
  if (fullSyncLocked || document.hidden) return;
  fullSyncLocked = true;
  lastFullSyncAt = Date.now();

  /* /p already owns the canonical refresh + render pipeline on this event.
     Reusing it means live sync cannot drift from manual refresh semantics. */
  document.dispatchEvent(new Event('visibilitychange'));

  setTimeout(() => { fullSyncLocked = false; }, SYNC_COOLDOWN_MS);
}

async function pulse() {
  if (!code || document.hidden || pulseInFlight) {
    schedule();
    return;
  }
  pulseInFlight = true;
  try {
    const response = await fetch(`/api/teambook-pulse?code=${encodeURIComponent(code)}&_=${Date.now()}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.version) {
      if (!lastVersion) {
        lastVersion = data.version;
      } else if (data.version !== lastVersion) {
        lastVersion = data.version;
        requestFullSync();
      } else if (Date.now() - lastFullSyncAt >= FULL_FALLBACK_MS) {
        /* Safety net for a write path that forgot to touch updated_at. */
        requestFullSync();
      }
    }
  } catch {
    /* Offline is not an error state for the notebook. Retry quietly. */
  } finally {
    pulseInFlight = false;
    schedule();
  }
}

function pokeSoon() {
  markHot();
  schedule(180);
  setTimeout(() => {
    if (!document.hidden) {
      clearTimeout(timer);
      pulse();
    }
  }, 850);
}

function installOptimisticTapFeedback() {
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;

    const seen = button.matches('.confirm-button,.trust-seen-button');
    const mutation = seen || button.matches([
      '#commitDo', '#send', '#renameBtn', '#ruleBtn', '#leadBtn', '#npcBtn',
      '#saveMyCharacter', '#completeParty', '[data-react]', '[data-reaction]',
    ].join(','));
    if (!mutation) return;

    markHot();
    try { channel?.postMessage({ type: 'poke', code, at: Date.now() }); } catch {}

    if (seen) {
      /* The canonical handler still decides success/failure. This only removes
         the dead-looking wait between tap and response; an API error restores
         the real button state afterwards. */
      queueMicrotask(() => {
        if (!button.isConnected || !button.disabled) return;
        button.classList.add('tb-live-optimistic');
        button.textContent = '◎ เห็นแล้ว ✓';
      });
    }

    pokeSoon();
  }, true);
}

function installStyles() {
  if (document.getElementById('tb-live-sync-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-live-sync-style';
  style.textContent = `
    .tb-live-optimistic{transition:transform .12s ease,opacity .12s ease;transform:scale(.985);opacity:.88}
  `;
  document.head.appendChild(style);
}

function wake() {
  if (!code) return;
  markHot();
  clearTimeout(timer);
  pulse();
}

function boot() {
  if (!code || globalThis.__teambookLiveSyncInstalled) return;
  globalThis.__teambookLiveSyncInstalled = true;
  installStyles();
  installOptimisticTapFeedback();

  if ('BroadcastChannel' in globalThis) {
    try {
      channel = new BroadcastChannel('teambook-live-v1');
      channel.addEventListener('message', event => {
        if (event.data?.type !== 'poke' || event.data?.code !== code) return;
        wake();
      });
    } catch {}
  }

  addEventListener('focus', wake);
  addEventListener('pageshow', wake);
  addEventListener('online', wake);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(timer);
      return;
    }
    wake();
  });

  /* Initial full render already runs in /p. Pulse starts shortly afterwards so
     a second device in the same room feels live during a demo/conversation. */
  lastFullSyncAt = Date.now();
  schedule(450);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
