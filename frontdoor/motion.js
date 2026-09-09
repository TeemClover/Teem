/** Effects are a preference; the opening film is a finite, staged reveal.
 * A held Compass frame must never be mistaken for a paused video to replay.
 */
export function createMotionPreference({ reduced = false, saveData = false } = {}) {
 let systemReduced = Boolean(reduced || saveData), explicit;
 return {
  get enabled() { return explicit ?? !systemReduced; },
  setEnabled(value) { explicit = Boolean(value); },
  setSystemReduced(value) { systemReduced = Boolean(value || saveData); },
 };
}

export function createOpeningFilm(film, {
 source = '/media/home-opening-bg.mp4#t=10,12', start = 10, end = 12,
} = {}) {
 let stage = 'unloaded', initialized = false, frame = 0, pendingPlay = false, wanted = false, retryRequested = false;
 const setStage = value => { stage = value; film.dataset.stage = value; };
 const cancelFrame = () => {
  if (frame && film.cancelVideoFrameCallback) film.cancelVideoFrameCallback(frame);
  frame = 0;
 };
 function hold() {
  if (stage === 'failed') return;
  wanted = false; setStage('held'); cancelFrame(); film.pause();
  if (film.readyState >= 1 && Math.abs(film.currentTime - end) > .04) {
   try { film.currentTime = end; } catch { /* The poster remains a working artifact. */ }
  }
 }
 function checkEnd() { if (film.currentTime >= end - .025) hold(); }
 function watchFrame() {
  if (!film.requestVideoFrameCallback || stage !== 'playing' || frame) return;
  frame = film.requestVideoFrameCallback((_now, metadata) => {
   frame = 0;
   if (metadata.mediaTime >= end - .025) hold();
   else watchFrame();
  });
 }
 function requestPlay() {
  if (pendingPlay) { retryRequested = true; return; }
  if (!wanted || !film.paused || ['held', 'failed'].includes(stage)) return;
  pendingPlay = true;
  let playing;
  try { playing = film.play(); } catch (error) { playing = Promise.reject(error); }
  Promise.resolve(playing).catch(() => {
   if (!['held', 'failed'].includes(stage)) setStage('paused');
  }).finally(() => {
   pendingPlay = false;
   // A rapid off/on can abort an outstanding play promise. Retry only the
   // subsequent explicit sync, never spin on an autoplay rejection.
   if (retryRequested) { retryRequested = false; requestPlay(); }
  });
 }
 const listeners = {
  loadedmetadata() {
   if (stage === 'held') { hold(); return; }
   if (!initialized) { initialized = true; try { film.currentTime = start; } catch {} }
  },
  play() { if (stage === 'held' || !wanted) { film.pause(); return; } setStage('playing'); watchFrame(); },
  pause() { cancelFrame(); if (!['held', 'failed', 'unloaded'].includes(stage)) setStage('paused'); },
  timeupdate: checkEnd,
  ended: hold,
  error() { cancelFrame(); setStage('failed'); film.style.opacity = '0'; },
 };
 for (const [event, listener] of Object.entries(listeners)) film.addEventListener(event, listener);
 setStage('unloaded');
 return {
  get stage() { return stage; },
  hold,
  sync({ ready, enabled, visible, opening }) {
   wanted = Boolean(ready && enabled && visible && opening);
   if (!opening) { hold(); return; }
   if (['held', 'failed'].includes(stage)) return;
   if (!ready || !enabled || !visible) { film.pause(); return; }
   if (!film.getAttribute('src')) { setStage('loading'); film.muted = true; film.src = source; }
   requestPlay();
  },
  destroy() {
   cancelFrame(); film.pause();
   for (const [event, listener] of Object.entries(listeners)) film.removeEventListener(event, listener);
  },
 };
}
