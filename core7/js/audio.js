const KEY = 'c7:sfx-muted';
let context = null;

export function isMuted() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setMuted(value) {
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('core7:mute', { detail: { muted: value } }));
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

const PATTERNS = {
  select: [[420, .035, .035]],
  lock: [[330, .05, .04], [520, .06, .02]],
  reveal: [[220, .06, .02], [440, .08, .02], [660, .1, .02]],
  win: [[440, .08, .02], [554, .09, .02], [659, .14, .03]],
  lose: [[330, .09, .025], [247, .14, .025]],
  draw: [[392, .08, .02], [392, .12, .015]],
  discard: [[260, .05, .025], [180, .09, .02]],
  join: [[523, .06, .02], [659, .09, .025]],
  error: [[180, .07, .02], [150, .1, .02]],
};

export function playSfx(name) {
  if (isMuted() || !PATTERNS[name]) return;
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    let at = context.currentTime;
    for (const [frequency, duration, gainValue] of PATTERNS[name]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(gainValue, at + .01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at); oscillator.stop(at + duration + .02);
      at += duration + .025;
    }
  } catch { /* Audio is cosmetic; gameplay must continue. */ }
}
