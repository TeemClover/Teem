/** Living images, loaded on demand with automatic playback and real viewport bounds. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const autoplayOK = () => !reduced.matches && !navigator.connection?.saveData;
const MAX_LIVE = 3;
const records = [...document.querySelectorAll('.hc-loop, .hc-live')].map(video => ({
  video, ratio: 0, wanted: false, pending: false, blocked: false, failed: false,
}));
const byVideo = new Map(records.map(record => [record.video, record]));

function play(record) {
  const {video} = record;
  if (record.pending || !video.paused) return;
  if (!video.hasAttribute('src')) {
    video.src = video.dataset.src;
    video.load();
  }
  record.pending = true;
  video.play().catch(error => {
    // A scroll/pause can cancel a pending play. Other refusals retain the poster.
    if (record.wanted && error.name !== 'AbortError') record.blocked = true;
  }).finally(() => {
    record.pending = false;
    if (!record.wanted || document.hidden) video.pause();
    if (record.blocked) record.wanted = false;
  });
}

function update() {
  const eligible = record => record.ratio > 0 && !record.failed && !record.blocked
    && autoplayOK() && record.ratio >= (record.video.classList.contains('hc-loop') ? 0.45 : 0.3);
  const rank = (a, b) => b.ratio - a.ratio;
  const selected = new Set();
  if (!document.hidden) {
    for (const [kind, limit] of [['hc-loop', 1], ['hc-live', MAX_LIVE]]) {
      records.filter(r => r.video.classList.contains(kind) && eligible(r)).sort(rank)
        .slice(0, limit).forEach(r => selected.add(r));
    }
  }
  for (const record of records) {
    record.wanted = selected.has(record);
    if (record.wanted) play(record);
    else if (!record.video.paused) record.video.pause();
  }
}

// No expanded rootMargin: prefetch bounds must never masquerade as visible pixels.
// Binding src only when selected also leaves Save-Data/reduced-motion entirely poster-only.
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const record = byVideo.get(entry.target);
    record.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
  }
  update();
}, {threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1]});

for (const record of records) {
  const {video} = record;
  video.removeAttribute('tabindex');
  video.addEventListener('error', () => {
    record.failed = true;
    record.wanted = false;
    video.removeAttribute('src');
    video.load(); // Reset to the original poster; do not loop automatic retries.
    update();
  });
  observer.observe(video);
}

document.addEventListener('visibilitychange', update);
reduced.addEventListener('change', update);
navigator.connection?.addEventListener?.('change', update);
