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
  /* ดึงไฟล์เสียงตั้งแต่ตอนว่าง ไม่ต้องรอให้ถึงจังหวะที่ต้องดังจริง
     ไม่แตะ AudioContext ตรงนี้ แค่โหลดไบต์เก็บไว้ */
  const warm = () => prefetchSamples();
  if (document.readyState === 'complete') setTimeout(warm, 400);
  else addEventListener('load', () => setTimeout(warm, 400), { once: true });
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

/* ── เสียงจากไฟล์จริง ──
   เสียงสังเคราะห์ยังใช้กับจังหวะเล็ก ๆ ที่ยิงถี่ (เลือกไพ่ ล็อก ชนะแพ้)
   เพราะไม่ต้องโหลดอะไรและไม่มีทางดีเลย์ ส่วนสามเสียงนี้เป็นไฟล์ที่เลือก
   มาเอง สังเคราะห์ให้เหมือนไม่ได้ ถ้าโหลดหรือ decode ไม่ผ่านก็ถอยไปใช้
   PATTERNS ของชื่อเดียวกัน เสียงเพี้ยนดีกว่าเงียบสนิท */
const SAMPLES = {
  /* ดังเฉพาะตอนมีผู้เล่นอีกคนเข้ามาในเกมจริง ๆ เท่านั้น — ตอนเราสร้างห้อง
     หรือกดเข้าห้องเองยังใช้เสียงสังเคราะห์สั้น ๆ ('join') เหมือนเดิม
     ไฟล์นี้ยาว 2 วิ ถ้ายิงทุกจังหวะที่มีคำว่า join จะรำคาญ */
  playerJoined: '/core7/assets/audio/player-joined.mp3',
  cardFlip: '/core7/assets/audio/card-flip.mp3',
  /* ต้นฉบับเป็น .m4a (AAC) — แปลงเป็น mp3 เพราะ AAC ต้องพึ่ง decoder ของ
     ระบบ บางเบราว์เซอร์/บางเครื่องเลยเล่นไม่ได้ ส่วน mp3 เล่นได้ทุกที่ */
  cardSwap: '/core7/assets/audio/card-swap.mp3',
};

const decoded = new Map();   // name → AudioBuffer | null (null = เจ๊งแล้ว อย่าลองซ้ำ)
const bytes = new Map();     // name → ArrayBuffer ที่โหลดไว้ล่วงหน้า
const decoding = new Map();

/* โหลดไฟล์ไว้ก่อนตั้งแต่หน้าโหลดเสร็จ แต่ยังไม่ decode เพราะ decode ต้องมี
   AudioContext ซึ่งสร้างก่อนผู้ใช้แตะจะโดนเบราว์เซอร์พักไว้อยู่ดี
   แยกสองจังหวะแบบนี้ เสียงครั้งแรกเลยไม่ต้องรอเน็ต */
function prefetchSamples() {
  for (const [name, url] of Object.entries(SAMPLES)) {
    if (bytes.has(name) || decoded.has(name)) continue;
    bytes.set(name, null);
    fetch(url)
      .then(response => (response.ok ? response.arrayBuffer() : null))
      .then(buffer => { if (buffer) bytes.set(name, buffer); })
      .catch(() => { /* ไม่มีไฟล์ก็ถอยไปใช้เสียงสังเคราะห์ */ });
  }
}

function sampleBuffer(name) {
  if (decoded.has(name)) return Promise.resolve(decoded.get(name));
  if (decoding.has(name)) return decoding.get(name);
  const url = SAMPLES[name];
  if (!url) return Promise.resolve(null);
  /* decodeAudioData ยึด ArrayBuffer ไปเลย (detach) ถ้า decode พลาดจะเหลือ
     ก้อนเปล่า เลยส่งสำเนาเข้าไปแทน ต้นฉบับจะได้ลองใหม่ได้ */
  const source = bytes.get(name)
    ? Promise.resolve(bytes.get(name).slice(0))
    : fetch(url).then(response => (response.ok ? response.arrayBuffer() : Promise.reject(new Error('HTTP'))));
  const job = source
    .then(raw => audioContext().decodeAudioData(raw))
    .then(buffer => { decoded.set(name, buffer); return buffer; })
    .catch(() => { decoded.set(name, null); return null; })
    .finally(() => decoding.delete(name));
  decoding.set(name, job);
  return job;
}

function playSample(name, { rate = 1, gain = 1 } = {}) {
  if (isMuted()) return Promise.resolve(false);
  return sampleBuffer(name).then(buffer => {
    /* เช็ค mute อีกรอบ — ระหว่างรอ decode ผู้ใช้อาจกดปิดเสียงไปแล้ว */
    if (!buffer || isMuted()) return false;
    try {
      const audio = audioContext();
      const source = audio.createBufferSource();
      const volume = audio.createGain();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      volume.gain.value = gain;
      source.connect(volume).connect(audio.destination);
      source.start();
      return true;
    } catch { return false; }
  });
}

const PATTERNS = {
  select: [[420, .035, .035]],
  /* สำรองของเสียงสลับไพ่ เผื่อโหลดไฟล์ไม่ได้ (ออฟไลน์ / ไฟล์หาย) */
  cardSwap: [[520, .035, .03], [300, .045, .02]],
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
  if (isMuted()) return;
  /* ชื่อที่มีไฟล์จริงให้ไฟล์ชนะเสมอ ถ้าเล่นไม่ได้ค่อยถอยไปสังเคราะห์
     call site เดิมจึงไม่ต้องรู้ว่าเสียงไหนเป็นไฟล์เสียงไหนเป็นคลื่น */
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

/* พลิกการ์ด — ใช้ไฟล์เสียงจริง ส่วนตอนคว่ำกลับเล่นช้าลงนิดให้รู้สึกว่า
   เป็นทิศตรงข้าม ไฟล์หายเมื่อไหร่ค่อยถอยไปใช้เสียงกระดาษที่สังเคราะห์ไว้ */
export function playCardFlip(reverse = false) {
  if (isMuted()) return;
  playSample('cardFlip', { rate: reverse ? .92 : 1 })
    .then(played => { if (!played) synthCardFlip(reverse); });
}

/* Paper sweep through the turn, followed by the card touching the table. */
function synthCardFlip(reverse = false) {
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
