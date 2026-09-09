import { ANALYTICS_VERSION, EXPERIENCE_VERSION, EVENTS, dedupeKey, environmentForHost, normalizeSource, randomId, validateEvent } from './contract.js';
import { createState } from './state.js';

const QUEUE_LIMIT = 32;
const QUEUE_BYTES = 32768;
const MAX_AGE = 86400000;
const lifecycleEvents = new Set(['SAVE', 'RETURN', 'RESUME', 'REBUILD']);
const timingFor = { FRONTDOOR_CHOICE: 'activeMsToFirstChoice', LUCKY_RETURN: 'activeMsToLuckyReturn', DOOR_FOUND: 'activeMsToDoorFound' };

/** Event-driven clock: no pings or animation loop. Visibility alone is not activity. */
export function createActiveClock({ now = () => performance.now(), document: doc = globalThis.document, window: win = globalThis.window, idleMs = 30000, onActivity = () => {} } = {}) {
  let total = 0, last = now(), lastActivity = last, hidden = !!doc?.hidden;
  function tick() {
    const at = now();
    if (!hidden) total += Math.max(0, Math.min(at, lastActivity + idleMs) - last);
    last = at;
    return Math.floor(total);
  }
  function activity() { tick(); lastActivity = now(); onActivity(); }
  function visibility() { tick(); hidden = !!doc?.hidden; }
  const types = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
  types.forEach(type => win?.addEventListener(type, activity, { passive: true }));
  doc?.addEventListener('visibilitychange', visibility);
  return {
    sample: tick, activity,
    reset() { total = 0; last = lastActivity = now(); },
    dispose() { types.forEach(type => win?.removeEventListener(type, activity)); doc?.removeEventListener('visibilitychange', visibility); },
  };
}

function browserStorage(name) { try { return globalThis[name]; } catch { return undefined; } }

/** No side effects until constructed. emit/save/resume/rebuild never await the network. */
export function createTelemetry(options = {}) {
  const location = options.location || globalThis.location || { hostname: 'localhost', origin: 'http://localhost', pathname: '/', search: '' };
  const env = environmentForHost(location.hostname);
  const storage = Object.hasOwn(options, 'storage') ? options.storage : browserStorage('localStorage');
  const sessionStorage = Object.hasOwn(options, 'sessionStorage') ? options.sessionStorage : browserStorage('sessionStorage');
  const now = options.now || Date.now;
  const id = options.idFactory || randomId;
  const state = options.state || createState({ storage, sessionStorage, now, idFactory: id, navigationType: options.navigationType || globalThis.performance?.getEntriesByType?.('navigation')?.[0]?.type || 'navigate' });
  const source = normalizeSource({ search: location.search, referrer: options.referrer ?? globalThis.document?.referrer ?? '' });
  if (!state.snapshot().journey.source) state.updateJourney({ source, experienceVersion: EXPERIENCE_VERSION });
  const clock = options.clock || createActiveClock({ document: options.document, window: options.window, onActivity: () => state.recordActivity() });
  let activeOffset = state.snapshot().journey.activeMs || 0;
  const defaultEndpoint = env === 'prod' && /^(www\.)?myclover\.com$/.test(location.hostname)
    ? 'https://teem.pages.dev/api/core7/analytics/frontdoor' : '/api/core7/analytics/frontdoor';
  let endpoint;
  try { endpoint = new URL(options.endpoint || defaultEndpoint, location.origin); } catch { endpoint = null; }
  // A caller cannot relabel localhost or send its queue to a production collector.
  const endpointSafe = endpoint && environmentForHost(endpoint.hostname) === env;
  const enabled = (options.enabled ?? env === 'prod') && endpointSafe && (!options.env || options.env === env);
  const fetcher = options.fetch || globalThis.fetch?.bind(globalThis);
  const schedule = options.setTimeout || globalThis.setTimeout;
  const cancel = options.clearTimeout || globalThis.clearTimeout;
  const queueKey = `mc:frontdoor:v2:outbox:${env}`;
  let queue = [], inFlight = null, timer = null, disposed = false, opened = false;
  const acknowledged = new Set();
  // Per-tab session outbox survives refresh without letting another tab overwrite it.
  // Closing the tab can discard pending events; P0 deliberately has no long-lived offline log.
  function persistQueue() { try { sessionStorage?.setItem(queueKey, JSON.stringify(queue)); } catch { /* Memory queue remains usable. */ } }
  try {
    const saved = JSON.parse(sessionStorage?.getItem(queueKey) || '[]');
    if (Array.isArray(saved)) queue = saved.slice(0, QUEUE_LIMIT).flatMap(item => {
      const result = validateEvent(item?.event);
      return result.ok && result.event.env === env && result.event.installId === state.snapshot().installation.installId && now() - item.createdAt < MAX_AGE
        ? [{ event: result.event, attempts: 0, createdAt: item.createdAt, nextAt: 0 }] : [];
    });
    while (JSON.stringify(queue).length > QUEUE_BYTES) queue.pop();
  } catch { /* Corrupt outbox never prevents the product from starting. */ }

  function wake(delay = 0) {
    if (!enabled || disposed || timer !== null || !queue.length) return;
    timer = schedule(() => { timer = null; void flush(); }, delay);
    timer?.unref?.();
  }
  function queueEvent(eventName, details = {}) {
    if (disposed) return { ok: false, error: 'DISPOSED' };
    const snapshot = state.snapshot();
      const activeMs = activeOffset + clock.sample();
    state.updateJourney({ activeMs });
    const properties = { ...details.properties, identityDurable: snapshot.installation.durable, activeMsInJourney: activeMs };
    if (timingFor[eventName]) properties[timingFor[eventName]] = activeMs;
    const eventId = id('e');
    const candidate = {
      eventId, installId: snapshot.installation.installId,
      journeyId: snapshot.journey.journeyId, visitId: snapshot.visit.visitId,
      eventName, occurredAt: now(), path: location.pathname || '/', env,
      source: snapshot.journey.source || source, visitorClass: snapshot.visitorClass,
      intentPrimary: snapshot.journey.intentPrimary, intentSecondary: snapshot.journey.intentSecondary,
      doorId: snapshot.journey.doorId, experienceVersion: snapshot.journey.experienceVersion || EXPERIENCE_VERSION,
      analyticsVersion: ANALYTICS_VERSION, graphicsTier: 'essential', ...options.context, ...details, properties,
    };
    // Context cannot override identity, environment or schema ownership.
    Object.assign(candidate, { installId: snapshot.installation.installId, journeyId: snapshot.journey.journeyId, visitId: snapshot.visit.visitId, eventId, eventName, env, analyticsVersion: ANALYTICS_VERSION });
    const result = validateEvent(candidate);
    if (!result.ok) return result;
    const event = result.event, key = dedupeKey(event);
    if (event.scope !== 'event' && (acknowledged.has(key) || queue.some(item => dedupeKey(item.event) === key))) return { ok: true, duplicate: true };
    const item = { event, attempts: 0, createdAt: now(), nextAt: 0 };
    if (queue.length >= QUEUE_LIMIT || new TextEncoder().encode(JSON.stringify([...queue, item])).length > QUEUE_BYTES) return { ok: false, error: 'QUEUE_FULL' };
    queue.push(item); persistQueue(); wake();
    return { ok: true, eventId: event.eventId, delivery: enabled ? 'queued' : 'disabled' };
  }
  async function flush({ force = false } = {}) {
    if (inFlight) return inFlight;
    if (!enabled || !fetcher || disposed) return { ok: false, error: endpointSafe ? 'DELIVERY_DISABLED' : 'ENVIRONMENT_MISMATCH', pending: queue.length };
    if (timer !== null) { cancel(timer); timer = null; }
    inFlight = (async () => {
      let delivered = 0, rejected = 0;
      const before = queue.length;
      queue = queue.filter(item => now() - item.createdAt < MAX_AGE);
      const expired = before - queue.length;
      for (const item of [...queue]) {
        if (!force && (item.nextAt > now() || item.attempts >= 5)) continue;
        let success = false, retryable = true;
        try {
          const response = await fetcher(endpoint.href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item.event), keepalive: true, credentials: 'omit' });
          const result = await response.json();
          success = response.ok && result.ok === true;
          retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        } catch { /* Offline: retry this exact event ID. */ }
        if (success || !retryable) {
          if (success) delivered += 1; else rejected += 1;
          queue = queue.filter(entry => entry !== item);
          if (success && item.event.scope !== 'event') acknowledged.add(dedupeKey(item.event));
        } else {
          item.attempts += 1;
          item.nextAt = now() + Math.min(60000, 1000 * 2 ** Math.min(item.attempts, 6));
        }
        persistQueue();
      }
      return { ok: queue.length === 0 && rejected === 0 && expired === 0, pending: queue.length, delivered, rejected, expired };
    })();
    try { return await inFlight; }
    finally {
      inFlight = null;
      const retryable = queue.filter(item => item.attempts < 5);
      if (retryable.length) wake(Math.max(1000, Math.min(...retryable.map(item => item.nextAt)) - now()));
    }
  }
  const win = options.window || globalThis.window;
  const online = () => void flush({ force: true });
  function openRuntime() {
    if (opened) return { ok: true, duplicate: true };
    opened = true;
    const result = queueEvent('FRONTDOOR_OPEN');
    if (state.snapshot().qualifyingReturn) queueEvent('RETURN', { properties: { returnReason: 'later-visit', savedVisitId: state.snapshot().journey.checkpoint.savedVisitId } });
    return result;
  }
  const pagehide = () => { state.recordActivity({ force: true }); state.updateJourney({ activeMs: activeOffset + clock.sample() }); persistQueue(); void flush({ force: true }); };
  const pageshow = event => {
    if (!event.persisted) return;
    const previous = state.snapshot().visit.visitId;
    state.beginVisit({ navigationType: 'back_forward' });
    if (state.snapshot().visit.visitId !== previous) { opened = false; openRuntime(); }
  };
  win?.addEventListener('online', online);
  win?.addEventListener('pagehide', pagehide);
  win?.addEventListener('pageshow', pageshow);
  wake();
  return {
    state, env, enabled: !!enabled, clock,
    emit(eventName, details) { return lifecycleEvents.has(eventName) ? { ok: false, error: 'USE_LIFECYCLE_METHOD' } : queueEvent(eventName, details); },
    open: openRuntime,
    save(patch = {}) {
      const result = state.saveCheckpoint({ ...patch, activeMs: activeOffset + clock.sample() });
      if (!result.ok || !result.durable) return result;
      return { ...result, telemetry: queueEvent('SAVE', { properties: { checkpointDurable: true } }) };
    },
    resume() {
      const result = state.resume();
      return result.ok ? { ...result, telemetry: queueEvent('RESUME') } : result;
    },
    rebuild() {
      const result = state.rebuild();
      activeOffset = 0; clock.reset();
      state.updateJourney({ source, experienceVersion: EXPERIENCE_VERSION });
      return { ...result, telemetry: queueEvent('REBUILD', { properties: { previousJourneyId: result.previousJourneyId } }) };
    },
    flush,
    pending() { return queue.map(item => structuredClone(item.event)); },
    dispose() { disposed = true; if (timer !== null) cancel(timer); clock.dispose?.(); win?.removeEventListener('online', online); win?.removeEventListener('pagehide', pagehide); win?.removeEventListener('pageshow', pageshow); },
  };
}
