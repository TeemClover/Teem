/**
 * Homechew media: every photo that has matching footage is shown as that footage.
 * The photo is the <video poster>, so the page reads the same before, during and without video.
 * Rules (pack v1.2 brief, "Video behavior"):
 * - nothing video downloads on first paint (preload="none", src bound near the viewport)
 * - muted + playsinline, playing only while visible; paused off-screen or when the tab is hidden
 * - taste loops: only the most visible one plays; living images: at most MAX_LIVE at once
 * - reduced motion / Save-Data keep the posters until the viewer taps
 * - a failed video keeps its poster
 */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const saveData = !!navigator.connection?.saveData;
const autoplayOK = () => !reduced.matches && !saveData;
const MAX_LIVE = 3;

const bind = video => {
  if (!video.src && video.dataset.src) { video.src = video.dataset.src; video.load(); }
};
const safePlay = video => video.play().catch(() => { /* autoplay refused: the poster stays */ });
const failSafe = video => video.addEventListener('error', () => { video.removeAttribute('src'); video.load(); });

/* ---------- taste loops: play the most visible one ---------- */
const loops = [...document.querySelectorAll('.hc-loop')];
const loopRatio = new Map();
function pickLoop() {
  let best = null, bestRatio = 0.45;
  for (const [v, r] of loopRatio) if (r > bestRatio) { best = v; bestRatio = r; }
  for (const v of loops) {
    if (v === best && autoplayOK() && !document.hidden) { bind(v); safePlay(v); }
    else if (!v.paused) v.pause();
  }
}
const loopIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    loopRatio.set(e.target, e.intersectionRatio);
    if (e.isIntersecting) bind(e.target);
  }
  pickLoop();
}, {threshold: [0, 0.25, 0.45, 0.6, 0.8, 1], rootMargin: '200px 0px'});

/* ---------- living images: play the most visible few ---------- */
const lives = [...document.querySelectorAll('.hc-live')];
const liveRatio = new Map();
function pickLive() {
  const ranked = [...liveRatio].filter(([, r]) => r >= 0.3).sort((a, b) => b[1] - a[1]).slice(0, MAX_LIVE).map(([v]) => v);
  for (const v of lives) {
    if (ranked.includes(v) && autoplayOK() && !document.hidden) { bind(v); safePlay(v); }
    else if (!v.paused) v.pause();
  }
}
const liveIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    liveRatio.set(e.target, e.intersectionRatio);
    if (e.isIntersecting) bind(e.target);
  }
  pickLive();
}, {threshold: [0, 0.15, 0.3, 0.5, 0.75, 1], rootMargin: '250px 0px'});

for (const v of [...loops, ...lives]) {
  (v.classList.contains('hc-loop') ? loopIO : liveIO).observe(v);
  failSafe(v);
  // tap to play/pause when autoplay is off (reduced motion, Save-Data)
  (v.closest('figure, li') || v).addEventListener('click', () => {
    if (autoplayOK()) return;
    bind(v);
    v.paused ? safePlay(v) : v.pause();
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(v => v.pause());
  else { pickLoop(); pickLive(); }
});
reduced.addEventListener('change', () => { pickLoop(); pickLive(); });
