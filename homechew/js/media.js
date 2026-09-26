/**
 * Homechew media: silent dip loops in the taste circles and the film player.
 * Rules (pack v1.2 brief, "Video behavior"):
 * - nothing video downloads on first paint (preload="none", src bound near the viewport)
 * - muted + playsinline autoplay only while visible; paused when off-screen or tab hidden
 * - at most one loop plays at a time; reduced motion / Save-Data keep posters until the viewer taps
 * - sound only after the viewer presses "เปิดเสียง"; a failed video leaves its poster and the page intact
 */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const saveData = !!navigator.connection?.saveData;
const autoplayOK = () => !reduced.matches && !saveData;
const tall = matchMedia('(max-width: 700px)');

const bind = video => {
  if (!video.src && video.dataset.src) { video.src = video.dataset.src; video.load(); }
};
const safePlay = video => video.play().catch(() => { /* autoplay refused: the poster stays */ });

/* ---------- taste loops: play the most visible one ---------- */
const loops = [...document.querySelectorAll('.hc-loop')];
const ratios = new Map();
function pickLoop() {
  let best = null, bestRatio = 0.45;
  for (const [v, r] of ratios) if (r > bestRatio) { best = v; bestRatio = r; }
  for (const v of loops) {
    if (v === best && autoplayOK() && !document.hidden) { bind(v); safePlay(v); }
    else if (!v.paused) v.pause();
  }
}
const loopIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    ratios.set(e.target, e.intersectionRatio);
    if (e.isIntersecting && e.intersectionRatio > 0) bind(e.target); // fetch only when it is about to be seen
  }
  pickLoop();
}, {threshold: [0, 0.25, 0.45, 0.6, 0.8, 1], rootMargin: '200px 0px'});
loops.forEach(v => {
  loopIO.observe(v);
  v.addEventListener('error', () => v.removeAttribute('src'));
  // tap to play/pause when autoplay is off (reduced motion, Save-Data)
  v.closest('figure')?.addEventListener('click', () => {
    if (autoplayOK()) return;
    bind(v);
    v.paused ? safePlay(v) : v.pause();
  });
});

/* ---------- film player ---------- */
const film = document.querySelector('.hc-film');
if (film) {
  const video = film.querySelector('.hc-film__video');
  const tabs = [...film.querySelectorAll('[data-film]')];
  const playBtn = film.querySelector('.hc-film__play');
  const soundBtn = film.querySelector('.hc-film__sound');
  const ORDER = ['hy', 'mc', 'ck'];
  const LABEL = {
    hy: 'หนังสั้นรสซอสไก่ทอดหาดใหญ่: วัตถุดิบ ซอส และไก่ทอดจุ่มซอส',
    mc: 'หนังสั้นรสซอสซีฟู้ดมหาชัย: วัตถุดิบ ซอส และอาหารทะเลสุกจุ่มซอส',
    ck: 'หนังสั้นรสซอสแจ่วเชียงคาน: วัตถุดิบ ซอส และหมูย่างจุ่มซอส',
    trio: 'หนังสั้นรวม 3 รส 30 วินาที',
  };
  let current = 'hy', visible = false, userPaused = false, userStarted = false;
  const file = key => `assets/video/${key === 'trio' ? 'trio-film-30s' : key + '-film-12s'}-${tall.matches ? '9x16' : '16x9'}`;

  function setPoster() {
    video.poster = file(current) + '.webp';
    video.width = tall.matches ? 720 : 1280;
    video.height = tall.matches ? 1280 : 720;
    film.classList.toggle('is-tall', tall.matches);
  }
  function load(key, {play = true} = {}) {
    current = key;
    tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.film === key)));
    video.setAttribute('aria-label', LABEL[key]);
    setPoster();
    video.dataset.src = file(key) + '.mp4';
    video.removeAttribute('src');
    if (play) { bind(video); safePlay(video); }
  }
  function sync() {
    const label = playBtn.querySelector('.hc-film__label');
    label.textContent = video.paused ? 'เล่น' : 'หยุด';
    playBtn.setAttribute('aria-pressed', String(!video.paused));
    soundBtn.setAttribute('aria-pressed', String(!video.muted));
    soundBtn.querySelector('.hc-film__label').textContent = video.muted ? 'เปิดเสียง' : 'ปิดเสียง';
  }
  ['play', 'pause', 'volumechange'].forEach(e => video.addEventListener(e, sync));
  video.addEventListener('ended', () => {
    // flavour films advance to the next flavour; the 30s film rests on its end card
    if (current === 'trio') return;
    load(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length], {play: visible && !userPaused});
  });
  video.addEventListener('error', () => { video.removeAttribute('src'); film.classList.add('is-error'); sync(); });

  tabs.forEach(t => t.addEventListener('click', () => {
    userStarted = true; userPaused = false;
    load(t.dataset.film);
  }));
  playBtn.addEventListener('click', () => {
    userStarted = true;
    if (video.paused) { userPaused = false; bind(video); safePlay(video); } else { userPaused = true; video.pause(); }
  });
  soundBtn.addEventListener('click', () => {
    userStarted = true; userPaused = false;
    video.muted = !video.muted;
    if (!video.muted && video.paused) { bind(video); safePlay(video); }
  });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && e.intersectionRatio >= 0.35;
    if (visible && !userPaused && (autoplayOK() || userStarted) && !document.hidden) { bind(video); safePlay(video); }
    else if (!visible && !video.paused) video.pause();
  }, {threshold: [0, 0.35, 0.7]}).observe(video);

  tall.addEventListener('change', () => { const was = !video.paused; load(current, {play: was}); });
  load('hy', {play: false}); // sets poster + data-src; nothing downloads until the film is in view
  sync();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(v => v.pause());
  else pickLoop();
});
