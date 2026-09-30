// A checkpoint belongs to this history entry, never another visitor or tab.
export function createProgress() {
  const key = 'routinex.absorb.progress.v1';
  let entry = history.state?.absorbEntry;
  if (!entry) {
    entry = Date.now().toString(36) + Math.random().toString(36).slice(2);
    try { history.replaceState({ ...history.state, absorbEntry: entry }, ''); } catch {}
  }
  // Own restoration so a browser's saved pixel offset cannot override chapter progress.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  return {
    save(T, flow) {
      if (!Number.isFinite(T)) return;
      try { sessionStorage.setItem(key, JSON.stringify({ entry, T, flow: !!flow, hash: location.hash, at: Date.now() })); } catch {}
    },
    restore() {
      try {
        const value = JSON.parse(sessionStorage.getItem(key));
        if (value?.entry !== entry || value.hash !== location.hash || Date.now() - value.at > 12 * 60 * 60 * 1000 || !Number.isFinite(value.T) || value.T < 0 || value.T >= 10) return null;
        return value;
      } catch { return null; }
    },
  };
}
