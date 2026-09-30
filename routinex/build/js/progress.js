// A checkpoint belongs to this history entry, never another visitor, tab, or fresh navigation.
export function createProgress() {
  const key = 'routinex.build.progress.v1';
  let entry = history.state?.buildEntry;
  if (!entry) {
    entry = Date.now().toString(36) + Math.random().toString(36).slice(2);
    try { history.replaceState({ ...history.state, buildEntry: entry }, ''); } catch (e) { /* ignore */ }
  }
  // Own restoration so a saved pixel offset cannot override chapter progress.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  return {
    save(T, flow) {
      if (!Number.isFinite(T)) return;
      try { sessionStorage.setItem(key, JSON.stringify({ entry, T, flow: !!flow, hash: location.hash, at: Date.now() })); } catch (e) { /* ignore */ }
    },
    restore() {
      try {
        const v = JSON.parse(sessionStorage.getItem(key));
        if (v?.entry !== entry || v.hash !== location.hash || Date.now() - v.at > 12 * 60 * 60 * 1000 || !Number.isFinite(v.T) || v.T < 0 || v.T >= 7) return null;
        return v;
      } catch (e) { return null; }
    },
  };
}
