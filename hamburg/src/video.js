// Only the mounted booth loads a clip. Poster remains usable on slow networks,
// autoplay rejection, reduced motion and data saving. User controls are always real buttons.
export function mountVideos(root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData;
  const films = [...root.querySelectorAll('[data-film]')].map(el => ({
    el, video: el.querySelector('video'), button: el.querySelector('[data-film-toggle]'),
    visible: false, intersecting: false, userPaused: false, userPlayed: false, failed: false, disposed: false
  }));
  const update = film => {
    const playing = !film.video.paused;
    film.button.textContent = playing ? 'พักคลิป' : 'เล่นคลิป';
  };
  const play = async film => {
    if (film.failed || film.disposed) return;
    const { video, el } = film;
    video.muted = true;
    if (!video.getAttribute('src')) video.src = video.dataset.videoSrc;
    try {
      await video.play();
      if (film.disposed || !el.isConnected) { video.pause(); return; }
      if (!(film.userPlayed ? film.intersecting : film.visible) || document.hidden) { video.pause(); return; }
      el.classList.add('has-started');
    } catch { /* Poster and explicit play button are the autoplay fallback. */ }
    update(film);
  };
  const pause = film => { film.video.pause(); update(film); };
  const resumeVisible = () => {
    for (const film of films) {
      if (film.failed || document.hidden || !(film.userPlayed ? film.intersecting : film.visible) || film.userPaused) pause(film);
      else if (film.userPlayed || (!reduce.matches && !saveData)) play(film);
      else pause(film);
    }
  };
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const film = films.find(f => f.el === entry.target);
      film.intersecting = entry.isIntersecting;
      film.visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
    }
    resumeVisible();
  }, { threshold: [0, 0.25] });
  const onMotion = () => {
    if (reduce.matches) for (const film of films) {
      film.userPlayed = false;
      film.el.classList.remove('has-started');
    }
    resumeVisible();
  };
  for (const film of films) {
    film.onClick = () => {
      if (film.video.paused) { film.userPaused = false; film.userPlayed = true; play(film); }
      else { film.userPaused = true; pause(film); }
    };
    film.onError = () => { film.failed = true; pause(film); film.el.classList.remove('has-started'); film.button.hidden = true; };
    film.button.addEventListener('click', film.onClick);
    film.video.addEventListener('error', film.onError);
    io.observe(film.el);
  }
  document.addEventListener('visibilitychange', resumeVisible);
  reduce.addEventListener('change', onMotion);
  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', resumeVisible);
    reduce.removeEventListener('change', onMotion);
    for (const film of films) {
      film.disposed = true;
      pause(film);
      film.button.removeEventListener('click', film.onClick);
      film.video.removeEventListener('error', film.onError);
      film.video.removeAttribute('src');
      film.video.load();
    }
  };
}
