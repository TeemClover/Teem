// Scroll-linked signature scenes. Native scroll only: each scene gets --p (0..1) from its
// position, so scrolling back restores earlier states. Without JS or with reduced motion the
// scene keeps its static final composition (CSS default --p: 1).
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

export function mountScenes(root) {
  const scenes = [...root.querySelectorAll('[data-scene]')];
  if (!scenes.length) return () => {};
  let frame = 0;

  const measure = () => {
    frame = 0;
    const vh = innerHeight;
    for (const s of scenes) {
      if (!s.classList.contains('is-live')) continue;
      const r = s.getBoundingClientRect();
      const travel = Math.max(1, r.height - vh);
      const p = Math.min(1, Math.max(0, -r.top / travel));
      s.style.setProperty('--p', p.toFixed(4));
      const beats = Number(s.dataset.beats || 3);
      const beat = Math.min(beats - 1, Math.floor(p * beats * 0.999));
      if (s.dataset.beat !== String(beat)) s.dataset.beat = beat;
      s.classList.toggle('is-end', p > 0.8);
    }
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };

  const apply = () => {
    for (const s of scenes) {
      s.classList.toggle('is-live', !reduce.matches);
      if (reduce.matches) { s.style.removeProperty('--p'); s.dataset.beat = 'all'; s.classList.add('is-end'); }
    }
    measure();
  };

  apply();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  reduce.addEventListener('change', apply);
  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    reduce.removeEventListener('change', apply);
    cancelAnimationFrame(frame);
  };
}

/** Gentle reveal for editorial blocks; content is visible by default and when motion is reduced. */
export function mountReveals(root) {
  if (reduce.matches) return () => {};
  const els = [...root.querySelectorAll('[data-reveal]')];
  const io = new IntersectionObserver(entries => {
    for (const e of entries) e.target.classList.toggle('is-in', e.isIntersecting || e.boundingClientRect.top < 0);
  }, { rootMargin: '0px 0px -12% 0px' });
  els.forEach(el => { el.classList.add('reveal'); io.observe(el); });
  return () => io.disconnect();
}
