/**
 * Mediral — the product pages' restrained motion. Each [data-reveal] element arrives once, when it
 * first enters the view; CSS gives every page its own rhythm. Nothing is hidden unless this module
 * runs with motion allowed: without it, under reduced motion, or with no IntersectionObserver, the
 * page is complete and still.
 */
const REDUCE = '(prefers-reduced-motion: reduce)';

export function initDetailMotion(root = document) {
  const html = document.documentElement;
  const targets = [...root.querySelectorAll('[data-reveal]')];
  const media = typeof matchMedia === 'function' ? matchMedia(REDUCE) : null;
  const showAll = () => {
    html.classList.remove('mr-reveal');
    for (const el of targets) el.classList.add('is-in');
  };
  if (!targets.length || media?.matches || typeof IntersectionObserver !== 'function') return showAll();
  html.classList.add('mr-reveal');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, {rootMargin: '0px 0px -10% 0px', threshold: 0.12});
  for (const el of targets) observer.observe(el);
  // A reader who turns motion off mid-visit gets the finished page at once.
  media?.addEventListener?.('change', event => { if (event.matches) { observer.disconnect(); showAll(); } });
  // Printing, or a jump to a deep link, never leaves a section waiting to arrive.
  addEventListener('beforeprint', showAll);
  return observer;
}
