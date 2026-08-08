const KEY = 'c7:sfx-muted';
let context = null;
let primed = false;

/* iPhone เงียบเพราะสวิตช์กระดิ่งข้างเครื่อง ไม่ใช่เพราะโค้ดพัง
   Web Audio บน iOS ถูกจัดเป็นเสียง ambient โดยปริยาย ซึ่งโดนสวิตช์ silent ปิดทั้งหมด
   บอก iOS 16.4+ ว่านี่คือเสียง playback เสียงเกมจะดังแม้ปิดกระดิ่ง */
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
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

/* iOS requires the AudioContext to be CREATED/RESUMED inside a real user
   gesture. The old "prime" only woke an already-existing context, so the first
   game sound could create it too late (outside the gesture) and remain silent.
   Create it on the first touch and push one inaudible sample through the graph. */
async function primeAudio() {
  if (isMuted()) return false;
  try {
    claimPlaybackSession();
    const audio = audioContext();
    if (audio.state !== 'running') await audio.resume();
    const source = audio.createBufferSource();
    source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    source.connect(audio.destination);
    source.start();
    primed = audio.state === 'running';
    /* Once iOS has granted playback, decode the physical card samples while
       the player is reading/choosing so reveal never has to wait on decode. */
    for (const name of Object.keys(SAMPLES)) void sampleBuffer(name);
    return primed;
  } catch {
    return false;
  }
}

/* iOS may suspend AudioContext when switching apps or locking the screen. */
if (typeof document !== 'undefined') {
  const wake = () => {
    if (document.hidden || isMuted()) return;
    claimPlaybackSession();
    if (context?.state === 'suspended') context.resume().catch(() => {});
  };
  document.addEventListener('visibilitychange', wake);
  addEventListener('pointerdown', () => { void primeAudio(); }, { once:true, passive:true });
  addEventListener('keydown', () => { void primeAudio(); }, { once:true });

  /* Download bytes early. Decoding happens after the first user gesture. */
  const warm = () => prefetchSamples();
  if (document.readyState === 'complete') setTimeout(warm, 400);
  else addEventListener('load', () => setTimeout(warm, 400), { once:true });
}

export function isMuted() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setMuted(value) {
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('core7:mute', { detail: { muted:value } }));
  if (!value) void primeAudio();
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

/* ── Real samples ─────────────────────────────────────────────────────── */
const SAMPLES = {
  playerJoined: '/core7/assets/audio/player-joined.mp3',
  cardFlip: '/core7/assets/audio/card-flip.mp3',
  cardSwap: '/core7/assets/audio/card-swap.mp3',
};

const decoded = new Map();
const bytes = new Map();
const decoding = new Map();

function prefetchSamples() {
  for (const [name,url] of Object.entries(SAMPLES)) {
    if (bytes.get(name) || decoded.has(name) || decoding.has(name)) continue;
    fetch(url)
      .then(response => response.ok ? response.arrayBuffer() : null)
      .then(buffer => { if (buffer) bytes.set(name,buffer); })
      .catch(() => {});
  }
}

function sampleBuffer(name) {
  if (decoded.has(name)) return Promise.resolve(decoded.get(name));
  if (decoding.has(name)) return decoding.get(name);
  const url = SAMPLES[name];
  if (!url) return Promise.resolve(null);
  const source = bytes.get(name)
    ? Promise.resolve(bytes.get(name).slice(0))
    : fetch(url).then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error('HTTP')));
  const job = source
    .then(raw => audioContext().decodeAudioData(raw))
    .then(buffer => { decoded.set(name,buffer); return buffer; })
    /* Do NOT permanently cache a failed decode as null. iOS can fail while the
       context is still suspended; a later user gesture should be allowed to
       retry instead of leaving the whole session silently broken. */
    .catch(() => null)
    .finally(() => decoding.delete(name));
  decoding.set(name,job);
  return job;
}

async function runningAudio() {
  const audio = audioContext();
  if (audio.state !== 'running') {
    try { await audio.resume(); } catch { /* fallback below */ }
  }
  return audio;
}

async function playSample(name,{rate=1,gain=1}={}) {
  if (isMuted()) return false;
  const buffer = await sampleBuffer(name);
  if (!buffer || isMuted()) return false;
  try {
    const audio = await runningAudio();
    if (audio.state !== 'running') return false;
    const source = audio.createBufferSource();
    const volume = audio.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    volume.gain.value = gain;
    source.connect(volume).connect(audio.destination);
    source.start();
    return true;
  } catch { return false; }
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

export function playSfx(name) {
  if (isMuted()) return;
  if (SAMPLES[name]) {
    playSample(name).then(played => { if (!played) synthSfx(name); });
    return;
  }
  synthSfx(name);
}

function synthSfx(name) {
  if (isMuted() || !PATTERNS[name]) return;
  try {
    const audio = audioContext();
    if (audio.state !== 'running' && !primed) return;
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
      oscillator.start(at); oscillator.stop(at+duration+.02);
      at += duration+.025;
    }
  } catch { /* Audio is cosmetic; gameplay must continue. */ }
}

export function playCardFlip(reverse=false) {
  if (isMuted()) return;
  playSample('cardFlip',{rate:reverse?.92:1})
    .then(played => { if (!played) synthCardFlip(reverse); });
}

/* Paper sweep through the turn, followed by the card touching the table. */
function synthCardFlip(reverse=false) {
  if (isMuted()) return;
  try {
    const audio = audioContext();
    if (audio.state !== 'running' && !primed) return;
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
    paper.start(start); paper.stop(start+duration);

    const tap = audio.createOscillator();
    const tapGain = audio.createGain();
    tap.type = 'triangle';
    tap.frequency.setValueAtTime(150,start+.38);
    tap.frequency.exponentialRampToValueAtTime(72,start+.47);
    tapGain.gain.setValueAtTime(.0001,start+.37);
    tapGain.gain.exponentialRampToValueAtTime(.14,start+.385);
    tapGain.gain.exponentialRampToValueAtTime(.0001,start+.49);
    tap.connect(tapGain).connect(audio.destination);
    tap.start(start+.37); tap.stop(start+.5);
  } catch { /* Audio is cosmetic; the card must always keep flipping. */ }
}