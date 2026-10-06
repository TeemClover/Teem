// View events with one definition for all booths.
import { record } from './store.js';

/** Runs fn once the tab is actually visible (not a background prefetch). */
export function whenVisible(fn) {
  if (document.visibilityState === 'visible') { fn(); return () => {}; }
  const on = () => { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', on); fn(); } };
  document.addEventListener('visibilitychange', on);
  return () => document.removeEventListener('visibilitychange', on);
}

/*
 * section_view: a [data-section] block covers at least 40% of the viewport, or 40% of
 * itself when shorter than the viewport, for 600 ms. Counted once per page view.
 */
export function trackSections(root, brandId) {
  const seen = new Set();
  const timers = new Map();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const id = e.target.dataset.section;
      if (seen.has(id)) continue;
      const need = Math.min(e.boundingClientRect.height, innerHeight) * 0.4;
      if (e.intersectionRect.height >= need && e.isIntersecting) {
        if (!timers.has(id)) timers.set(id, setTimeout(() => {
          if (document.visibilityState !== 'visible') return timers.delete(id);
          seen.add(id);
          record('section_view', brandId, { section_id: id });
          io.unobserve(e.target);
        }, 600));
      } else {
        clearTimeout(timers.get(id));
        timers.delete(id);
      }
    }
  }, { threshold: Array.from({ length: 11 }, (_, i) => i / 10) });
  root.querySelectorAll('[data-section]').forEach(el => io.observe(el));
  return () => { io.disconnect(); timers.forEach(clearTimeout); };
}
