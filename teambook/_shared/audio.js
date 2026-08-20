const KEY = 'teambook_sfx_muted';

/* Real physical-card samples. Keep these at the top because we now prepare
   every asset as soon as the module is evaluated — before the first tap. */
const SAMPLES = {
  playerJoined: '/assets/audio/player-joined.mp3',
  cardFlip: '/assets/audio/card-flip.mp3',
  cardSwap: '/assets/audio/card-swap.mp3',
};

let context = null;
let primed = false;
let priming = null;
let gestureSeen = false;

const decoded = new Map();
const bytes = new Map();
const decoding = new Map();
const media = new Map();

/* iOS 16.4+ can expose AudioSession. Claim playback so game SFX behave like
   game audio rather than ambient audio when the device is in silent mode. */
function claimPlaybackSession() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
      navigator.audioSession.type = 'playback';
    }
  } catch { /* unsupported */ }
}

function audioContext() {
  claimPlaybackSession();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error('WEB_AUDIO_UNAVAILABLE');
  if (!context || context.state === 'closed') {
    context = new AudioCtx({ latencyHint:'interactive' });
    primed = context.state === 'running';
  }
  return context;
}

function mediaElement(name) {
  if (media.has(name)) return media.get(name);
  const url = SAMPLES[name];
  if (!url || typeof Audio === 'undefined') return null;
  const el = new Audio(url);
  el.preload = 'auto';
  el.playsInline = true;
  el.load();
  media.set(name, el);
  return el;
}

function prefetchSamples() {
  for (const [name,url] of Object.entries(SAMPLES)) {
    mediaElement(name);
    if (bytes.has(name)) continue;
    fetch(url, { cache:'force-cache' })
      .then(response => response.ok ? response.arrayBuffer() : null)
      .then(buffer => {
        if (!buffer) return;
        bytes.set(name, buffer);
        /* Decoding does not require audible playback. Doing it while the page
           opens means the first real click only has to resume the context. */
        void sampleBuffer(name);
      })
      .catch(() => {});
  }
}

function sampleBuffer(name) {
  if (decoded.has(name)) return Promise.resolve(decoded.get(name));
  if (decoding.has(name)) return decoding.get(name);
  const url = SAMPLES[name];
  if (!url) return Promise.resolve(null);

  const raw = bytes.has(name)
    ? Promise.resolve(bytes.get(name).slice(0))
    : fetch(url, { cache:'force-cache' }).then(response => {
        if (!response.ok) throw new Error('HTTP');
        return response.arrayBuffer();
      }).then(buffer => {
        bytes.set(name, buffer.slice(0));
        return buffer;
      });

  const job = raw
    .then(buffer => audioContext().decodeAudioData(buffer))
    .then(buffer => {
      decoded.set(name, buffer);
      return buffer;
    })
    /* Never cache failure. Safari may decode successfully on the next attempt. */
    .catch(() => null)
    .finally(() => decoding.delete(name));

  decoding.set(name, job);
  return job;
}

function unlockMediaElements() {
  /* HTMLAudio is the safety net if WebAudio gets suspended by iOS. Touch every
     real sample while user activation is live, but muted, so later fallback
     playback does not need a navigation-away/back cycle to become eligible. */
  for (const name of Object.keys(SAMPLES)) {
    const el = mediaElement(name);
    if (!el) continue;
    try {
      const oldMuted = el.muted;
      const oldVolume = el.volume;
      el.muted = true;
      el.volume = 0;
      el.currentTime = 0;
      const p = el.play();
      if (p?.then) p.then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = oldMuted;
        el.volume = oldVolume;
      }).catch(() => {
        el.muted = oldMuted;
        el.volume = oldVolume;
      });
    } catch { /* fallback is optional */ }
  }
}

/* Called synchronously from the capture-phase first gesture. Assets are already
   loaded/decoding, so this function only unlocks playback. */
export function primeAudio() {
  if (isMuted()) return Promise.resolve(false);
  gestureSeen = true;

  let audio;
  try { audio = audioContext(); }
  catch { return Promise.resolve(false); }

  if (audio.state === 'running') {
    primed = true;
    unlockMediaElements();
    return Promise.resolve(true);
  }
  if (priming) return priming;

  try {
    /* Queue a silent frame BEFORE any await. On iOS the source is then already
       attached to the user gesture when resume() changes state. */
    const source = audio.createBufferSource();
    source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    source.connect(audio.destination);
    source.start(audio.currentTime);
    unlockMediaElements();

    priming = Promise.resolve(audio.resume())
      .then(() => {
        primed = audio.state === 'running';
        return primed;
      })
      .catch(() => {
        primed = false;
        return false;
      })
      .finally(() => { priming = null; });
    return priming;
  } catch {
    primed = false;
    priming = null;
    return Promise.resolve(false);
  }
}

export function isMuted() {
  try { return localStorage.getItem(KEY) === '1'; }
  catch { return false; }
}

export function setMuted(value) {
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('teambook:mute', { detail:{ muted:value } }));
  if (!value) {
    gestureSeen = true;
    /* The sound button itself is a user gesture. Recover playback and give an
       audible confirmation instead of changing only the icon. */
    void primeAudio().then(() => {
      if (!isMuted()) playSfx('cardSwap');
    });
  }
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

async function playMedia(name,{rate=1,gain=1}={}) {
  const el = mediaElement(name);
  if (!el || isMuted()) return false;
  try {
    el.pause();
    el.currentTime = 0;
    el.playbackRate = rate;
    el.muted = false;
    el.volume = Math.max(0, Math.min(1, gain));
    await el.play();
    return true;
  } catch { return false; }
}

async function playSample(name,{rate=1,gain=1}={}) {
  if (isMuted() || !gestureSeen) return false;
  const buffer = await sampleBuffer(name);
  if (!buffer || isMuted()) return playMedia(name,{rate,gain});

  try {
    const audio = audioContext();
    if (audio.state !== 'running') {
      try { await audio.resume(); } catch { /* media fallback below */ }
    }
    primed = audio.state === 'running';
    if (!primed) return playMedia(name,{rate,gain});

    const source = audio.createBufferSource();
    const volume = audio.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    volume.gain.value = gain;
    source.connect(volume).connect(audio.destination);
    source.start(audio.currentTime);
    return true;
  } catch {
    return playMedia(name,{rate,gain});
  }
}

const PATTERNS = {
  select: [[420,.035,.035]],
  cardSwap: [[520,.035,.03],[300,.045,.02]],
  fling: [[260,.035,.02],[420,.045,.025],[720,.08,.035]],
  lock: [[330,.05,.04],[520,.06,.02]],
  reveal: [[220,.06,.02],[440,.08,.02],[660,.1,.02]],
  win: [[440,.08,.02],[554,.09,.02],[659,.14,.03]],
  lose: [[330,.09,.025],[247,.14,.025]],
  draw: [[392,.08,.02],[392,.12,.015]],
  discard: [[260,.05,.025],[180,.09,.02]],
  join: [[523,.06,.02],[659,.09,.025]],
  error: [[180,.07,.02],[150,.1,.02]],
};

function synthSfx(name) {
  if (isMuted() || !gestureSeen || !PATTERNS[name]) return;
  try {
    const audio = audioContext();
    if (audio.state !== 'running') return;
    let at = audio.currentTime;
    for (const [frequency,duration,gainValue] of PATTERNS[name]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(gainValue,at+.01);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at+duration+.02);
      at += duration+.025;
    }
  } catch { /* cosmetic */ }
}

export function playSfx(name) {
  if (isMuted() || !gestureSeen) return;
  if (SAMPLES[name]) {
    void playSample(name).then(played => {
      if (!played) synthSfx(name);
    });
    return;
  }
  synthSfx(name);
}

export function playCardFlip(reverse=false) {
  if (isMuted() || !gestureSeen) return;
  void playSample('cardFlip',{rate:reverse?.92:1}).then(played => {
    if (!played) synthCardFlip(reverse);
  });
}

/* Paper sweep through the turn, followed by the card touching the table. */
function synthCardFlip(reverse=false) {
  if (isMuted() || !gestureSeen) return;
  try {
    const audio = audioContext();
    if (audio.state !== 'running') return;
    const start = audio.currentTime;
    const duration = .46;
    const buffer = audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<data.length;i++) {
      const envelope = Math.sin(Math.PI*i/data.length);
      data[i] = (Math.random()*2-1)*envelope;
    }

    const paper = audio.createBufferSource();
    const paperFilter = audio.createBiquadFilter();
    const paperGain = audio.createGain();
    paper.buffer = buffer;
    paper.playbackRate.value = reverse?.94:1.04;
    paperFilter.type = 'bandpass';
    paperFilter.Q.value = .72;
    paperFilter.frequency.setValueAtTime(reverse?2600:1900,start);
    paperFilter.frequency.exponentialRampToValueAtTime(reverse?1150:3400,start+.34);
    paperGain.gain.setValueAtTime(.0001,start);
    paperGain.gain.exponentialRampToValueAtTime(.16,start+.045);
    paperGain.gain.exponentialRampToValueAtTime(.055,start+.25);
    paperGain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    paper.connect(paperFilter).connect(paperGain).connect(audio.destination);
    paper.start(start);
    paper.stop(start+duration);

    const tap = audio.createOscillator();
    const tapGain = audio.createGain();
    tap.type = 'triangle';
    tap.frequency.setValueAtTime(150,start+.38);
    tap.frequency.exponentialRampToValueAtTime(72,start+.47);
    tapGain.gain.setValueAtTime(.0001,start+.37);
    tapGain.gain.exponentialRampToValueAtTime(.14,start+.385);
    tapGain.gain.exponentialRampToValueAtTime(.0001,start+.49);
    tap.connect(tapGain).connect(audio.destination);
    tap.start(start+.37);
    tap.stop(start+.5);
  } catch { /* cosmetic */ }
}

/* Prepare everything immediately. Creating a suspended AudioContext is allowed;
   audible playback still waits for the first real user gesture. */
if (typeof document !== 'undefined') {
  try { audioContext(); } catch { /* media fallback can still work */ }
  prefetchSamples();

  const fromGesture = () => {
    gestureSeen = true;
    if (!isMuted()) void primeAudio();
  };
  addEventListener('pointerdown', fromGesture, { passive:true, capture:true });
  addEventListener('touchstart', fromGesture, { passive:true, capture:true });
  addEventListener('keydown', fromGesture, { capture:true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || isMuted()) return;
    if (gestureSeen) void primeAudio();
  });
}
