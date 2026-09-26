/** Living imagery starts immediately and loops continuously, including offscreen. */
const videos = [...document.querySelectorAll('.hc-loop, .hc-live')];
const failed = new WeakSet();

function start(video) {
  if (failed.has(video) || !video.paused) return;
  video.muted = true;
  // Browser autoplay restrictions may still apply. Keep the poster until playback is allowed.
  video.play().catch(() => {});
}

for (const video of videos) {
  video.removeAttribute('tabindex');
  video.addEventListener('error', () => {
    failed.add(video);
    video.autoplay = false;
    video.removeAttribute('src');
    video.load(); // Restore the poster without repeatedly requesting a broken file.
  });
  start(video);
}

const resume = () => videos.forEach(start);
// Retry browser-blocked playback on a real interaction or return to the page.
// Scrolling never pauses, resets, unloads, or changes a video's source.
document.addEventListener('pointerdown', resume, {passive: true});
document.addEventListener('keydown', resume);
window.addEventListener('pageshow', resume);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) resume();
});
