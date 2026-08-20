const MUTE_KEY = 'teambook_sfx_muted';
let context;

function audioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!context || context.state === 'closed') context = new AudioContext({ latencyHint: 'interactive' });
  return context;
}

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; }
  catch { return false; }
}

export function setMuted(value) {
  try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch {}
  window.dispatchEvent(new CustomEvent('teambook:mute', { detail: { muted: !!value } }));
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

export async function primeAudio() {
  if (isMuted()) return false;
  const audio = audioContext();
  if (!audio) return false;
  try { await audio.resume(); return audio.state === 'running'; }
  catch { return false; }
}

export async function playSfx(name = 'tap') {
  if (isMuted()) return false;
  const audio = audioContext();
  if (!audio || !(await primeAudio())) return false;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  const frequency = name === 'cardFlip' ? 520 : name === 'cardSwap' ? 380 : 440;
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(120, frequency * 0.55), now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.start(now); oscillator.stop(now + 0.11);
  return true;
}

export function playCardFlip() { return playSfx('cardFlip'); }
