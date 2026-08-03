const KEY = 'c7:sfx-muted';
let context = null;

/* iPhone เงียบเพราะสวิตช์กระดิ่งข้างเครื่อง ไม่ใช่เพราะโค้ดพัง
   Web Audio บน iOS ถูกจัดเป็นเสียง ambient โดยปริยาย ซึ่งโดนสวิตช์ silent ปิดทั้งหมด
   บอก iOS 16.4+ ว่านี่คือเสียง playback เสียงเกมจะดังแม้ปิดกระดิ่ง
   เบราว์เซอร์ที่ไม่รู้จัก audioSession จะข้ามบรรทัดนี้ไปเอง */
function claimPlaybackSession() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
      navigator.audioSession.type = 'playback';
    }
  } catch { /* ไม่รองรับก็ไม่เป็นไร */ }
}

function audioContext() {
  claimPlaybackSession();
  context ||= new (window.AudioContext || window.webkitAudioContext)();
  if (context.state === 'suspended') context.resume();
  return context;
}

/* iOS พัก AudioContext ทุกครั้งที่สลับแอปหรือปิดจอ กลับมาแล้วต้องปลุกเอง
   ไม่งั้นเสียงจะหายไปเงียบ ๆ ทั้งที่โค้ดยังเรียก playSfx อยู่ */
if (typeof document !== 'undefined') {
  const wake = () => { if (context && context.state === 'suspended') context.resume(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  /* แตะครั้งแรกที่ไหนก็ได้ = ปลุกเสียงให้พร้อมก่อนถึงจังหวะที่ต้องดังจริง */
  const prime = () => { claimPlaybackSession(); wake(); };
  addEventListener('pointerdown', prime, { once: true, passive: true });
  addEventListener('keydown', prime, { once: true, passive: true });
}

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
  fling: [[260, .035, .02], [420, .045, .025], [720, .08, .035]],
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
    const audio = audioContext();
    let at = audio.currentTime;
    for (const [frequency, duration, gainValue] of PATTERNS[name]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(gainValue, at + .01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(at); oscillator.stop(at + duration + .02);
      at += duration + .025;
    }
  } catch { /* Audio is cosmetic; gameplay must continue. */ }
}

/* Paper sweep through the turn, followed by the card touching the table. */
export function playCardFlip(reverse = false) {
  if (isMuted()) return;
  try {
    const audio = audioContext();
    const start = audio.currentTime;
    const duration = .46;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const envelope = Math.sin(Math.PI * i / data.length);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const paper = audio.createBufferSource();
    const paperFilter = audio.createBiquadFilter();
    const paperGain = audio.createGain();
    paper.buffer = buffer;
    paper.playbackRate.value = reverse ? .94 : 1.04;
    paperFilter.type = 'bandpass';
    paperFilter.Q.value = .72;
    paperFilter.frequency.setValueAtTime(reverse ? 2600 : 1900, start);
    paperFilter.frequency.exponentialRampToValueAtTime(reverse ? 1150 : 3400, start + .34);
    paperGain.gain.setValueAtTime(.0001, start);
    paperGain.gain.exponentialRampToValueAtTime(.16, start + .045);
    paperGain.gain.exponentialRampToValueAtTime(.055, start + .25);
    paperGain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    paper.connect(paperFilter).connect(paperGain).connect(audio.destination);
    paper.start(start); paper.stop(start + duration);

    const tap = audio.createOscillator();
    const tapGain = audio.createGain();
    tap.type = 'triangle';
    tap.frequency.setValueAtTime(150, start + .38);
    tap.frequency.exponentialRampToValueAtTime(72, start + .47);
    tapGain.gain.setValueAtTime(.0001, start + .37);
    tapGain.gain.exponentialRampToValueAtTime(.14, start + .385);
    tapGain.gain.exponentialRampToValueAtTime(.0001, start + .49);
    tap.connect(tapGain).connect(audio.destination);
    tap.start(start + .37); tap.stop(start + .5);
  } catch { /* Audio is cosmetic; the card must always keep flipping. */ }
}
