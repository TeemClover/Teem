const AUDIO_PREFS_KEY = "mc_xvisor_audio_1";

const DEFAULT_PREFS = Object.freeze({
  muted: false,
  musicEnabled: true,
  sfxEnabled: true,
});

const NOTES = Object.freeze({
  tap: [[520, 0.065, "triangle", 0]],
  talk: [[349, 0.045, "triangle", 0], [440, 0.06, "sine", 0.065]],
  care: [[523, 0.08, "sine", 0], [659, 0.12, "sine", 0.10]],
  plan: [[392, 0.045, "triangle", 0], [494, 0.05, "triangle", 0.055], [587, 0.07, "triangle", 0.115]],
  team: [[440, 0.06, "triangle", 0], [554, 0.06, "triangle", 0.07], [659, 0.1, "sine", 0.14]],
  page: [[420, 0.035, "triangle", 0], [620, 0.045, "triangle", 0.04]],
  confirm: [[659, 0.065, "triangle", 0], [784, 0.12, "triangle", 0.065]],
  cancel: [[260, 0.06, "triangle", 0]],
  warning: [[294, 0.055, "triangle", 0], [247, 0.085, "triangle", 0.07]],
  calendar: [[420, 0.025, "square", 0], [510, 0.035, "square", 0.035]],
  energy: [[760, 0.035, "square", 0]],
  band: [[560, 0.04, "sine", 0], [840, 0.05, "sine", 0.06]],
  scale: [[330, 0.06, "sine", 0], [520, 0.07, "sine", 0.09], [760, 0.1, "sine", 0.18]],
  knowledge: [[659, 0.05, "triangle", 0], [988, 0.1, "triangle", 0.07]],
  select: [[659, 0.07, "triangle", 0]],
  submit: [[440, 0.04, "triangle", 0], [660, 0.06, "triangle", 0.05]],
  correct: [[660, 0.05, "square", 0], [990, 0.11, "square", 0.06]],
  incorrect: [[330, 0.06, "triangle", 0], [270, 0.09, "triangle", 0.07]],
  repair: [[392, 0.04, "square", 0], [523, 0.04, "square", 0.05], [784, 0.1, "square", 0.1]],
  stamp: [[180, 0.08, "square", 0], [720, 0.08, "triangle", 0.09]],
  certificate: [[523, 0.06, "square", 0], [659, 0.06, "square", 0.07], [1047, 0.16, "square", 0.14]],
  coin: [[880, 0.05, "square", 0], [1320, 0.09, "square", 0.05]],
  income: [[659, 0.04, "square", 0], [880, 0.05, "square", 0.045], [1175, 0.11, "triangle", 0.1]],
  sale: [[660, 0.06, "square", 0], [880, 0.06, "square", 0.07], [1320, 0.16, "square", 0.14]],
  reorder: [[520, 0.05, "square", 0], [780, 0.05, "square", 0.06], [1040, 0.12, "square", 0.12]],
  level: [[523, 0.07, "square", 0], [659, 0.07, "square", 0.08], [784, 0.07, "square", 0.16], [1047, 0.18, "square", 0.24]],
  promotion: [[523, 0.055, "square", 0], [659, 0.055, "square", 0.06], [784, 0.055, "square", 0.12], [1175, 0.18, "triangle", 0.2]],
  xircle: [[440, 0.06, "sine", 0], [660, 0.06, "sine", 0.1], [880, 0.08, "sine", 0.2]],
  xircleDone: [[587, 0.06, "triangle", 0], [784, 0.07, "triangle", 0.07], [1175, 0.16, "triangle", 0.15]],
  meeting: [[392, 0.06, "square", 0], [587, 0.06, "square", 0.07], [784, 0.12, "square", 0.14]],
  meetingDone: [[523, 0.07, "triangle", 0], [659, 0.07, "triangle", 0.08], [1047, 0.16, "triangle", 0.16]],
  month: [[392, 0.07, "triangle", 0], [523, 0.07, "triangle", 0.08], [659, 0.14, "triangle", 0.16]],
  event: [[392, 0.05, "square", 0], [587, 0.05, "square", 0.05], [784, 0.05, "square", 0.1], [1175, 0.14, "square", 0.16]],
  monthClose: [[659, 0.06, "triangle", 0], [523, 0.06, "triangle", 0.07], [392, 0.14, "triangle", 0.14]],
  score: [[523, 0.08, "triangle", 0], [659, 0.08, "triangle", 0.09], [784, 0.09, "triangle", 0.18], [1047, 0.24, "sine", 0.28]],
  ending: [[392, 0.1, "sine", 0], [523, 0.1, "sine", 0.12], [659, 0.12, "sine", 0.24], [1047, 0.3, "sine", 0.38]],
  trip: [[523, 0.06, "triangle", 0], [659, 0.07, "triangle", 0.07], [784, 0.08, "triangle", 0.14], [1047, 0.1, "sine", 0.22], [1319, 0.22, "sine", 0.34]],
  newGame: [[784, 0.055, "square", 0], [1047, 0.07, "square", 0.07], [1319, 0.09, "square", 0.15], [1568, 0.18, "triangle", 0.25]],
  notify: [[760, 0.05, "sine", 0], [980, 0.09, "sine", 0.07]],
});

const MUSIC = Object.freeze({
  // A full phrase includes rests, leaving space for dialogue and action sounds.
  pre: { tempo: 520, lead: [262, 0, 330, 392, 0, 330, 294, 0, 262, 0, 349, 440, 392, 0, 330, 0], bass: [131, 147, 175, 131] },
  campaign: { tempo: 455, lead: [392, 0, 494, 523, 0, 494, 440, 0, 392, 0, 523, 659, 587, 0, 523, 0], bass: [196, 220, 175, 196] },
  organization: { tempo: 400, lead: [330, 392, 0, 494, 659, 0, 494, 0, 392, 494, 0, 587, 784, 0, 659, 0], bass: [165, 220, 196, 165] },
});

function loadPrefs(initiallyOn) {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_PREFS_KEY) || "null");
    if (saved && typeof saved === "object") {
      return {
        muted: Boolean(saved.muted),
        musicEnabled: saved.musicEnabled !== false,
        sfxEnabled: saved.sfxEnabled !== false,
      };
    }
  } catch { /* use release defaults */ }
  return { ...DEFAULT_PREFS, muted: initiallyOn === false };
}

export function createAudio(initiallyOn = true) {
  let prefs = loadPrefs(initiallyOn);
  let context = null;
  let interacted = false;
  let suspended = false;
  let musicTimer = null;
  let musicStep = 0;
  let musicMode = "pre";
  let resumePending = false;
  let resumeAttempt = 0;
  let destroyed = false;
  let musicQuietUntil = 0;
  const voices = new Set();

  function persist() {
    try { localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs)); } catch { /* audio remains usable */ }
  }

  function ensureContext() {
    if (!interacted || destroyed || prefs.muted || suspended) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    try {
      if (!context || context.state === "closed") context = new AudioContext();
      if (context.state === "suspended" && !resumePending) {
        resumePending = true;
        const attempt = ++resumeAttempt;
        Promise.resolve(context.resume()).catch(() => {
          if (attempt !== resumeAttempt) return;
          stopMusic();
          stopVoices();
        }).finally(() => { if (attempt === resumeAttempt) resumePending = false; });
      }
      return context;
    } catch {
      // Sound is optional: unavailable audio must never interrupt a game action.
      resumePending = false;
      return null;
    }
  }

  function releaseVoice(voice) {
    voices.delete(voice);
    voice.oscillator.onended = null;
    try { voice.oscillator.disconnect(); voice.gain.disconnect(); } catch { /* already released */ }
  }

  function stopVoices(channel) {
    for (const voice of voices) {
      if (channel && voice.channel !== channel) continue;
      try { voice.oscillator.stop(); } catch { /* a finished voice is safe to release */ }
      releaseVoice(voice);
    }
  }

  function tone(frequency, duration, type, delay, volume = 0.035, channel = "sfx") {
    const ctx = ensureContext();
    if (!ctx || !Number.isFinite(frequency) || frequency <= 0) return;
    let voice;
    try {
      // Bound rapid interactions and release completed nodes instead of keeping
      // them connected for the lifetime of a long game.
      if (voices.size >= 32) {
        const oldest = voices.values().next().value;
        try { oldest.oscillator.stop(); } catch { /* already stopped */ }
        releaseVoice(oldest);
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      voice = { oscillator, gain, channel };
      voices.add(voice);
      const start = ctx.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.onended = () => releaseVoice(voice);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.025);
    } catch {
      if (voice) releaseVoice(voice);
    }
  }

  function stopMusic() {
    if (musicTimer !== null) window.clearInterval(musicTimer);
    musicTimer = null;
    stopVoices("music");
  }

  function suspendContext() {
    // A quick hide/show or mute/unmute may happen before resume settles. The
    // next user action must be able to queue a fresh resume after this suspend.
    resumeAttempt += 1;
    resumePending = false;
    try { Promise.resolve(context?.suspend?.()).catch(() => {}); } catch { /* optional audio */ }
  }

  function musicTick() {
    if (destroyed || !interacted || prefs.muted || !prefs.musicEnabled || suspended) return stopMusic();
    const score = MUSIC[musicMode] || MUSIC.campaign;
    const index = musicStep % score.lead.length;
    const volume = context?.currentTime < musicQuietUntil ? 0.003 : 0.007;
    if (score.lead[index]) tone(score.lead[index], 0.23, "triangle", 0, volume, "music");
    if (index % 4 === 0) tone(score.bass[Math.floor(musicStep / 4) % score.bass.length], 0.42, "sine", 0, volume * 0.75, "music");
    musicStep += 1;
  }

  function startMusic() {
    if (destroyed || !interacted || prefs.muted || !prefs.musicEnabled || suspended || musicTimer !== null) return;
    if (!ensureContext()) return;
    musicTick();
    musicTimer = window.setInterval(musicTick, (MUSIC[musicMode] || MUSIC.campaign).tempo);
  }

  function restartMusic() {
    stopMusic();
    musicStep = 0;
    startMusic();
  }

  function play(name) {
    if (destroyed || !interacted || prefs.muted || !prefs.sfxEnabled || suspended) return;
    const ctx = ensureContext();
    if (!ctx) return;
    musicQuietUntil = ctx.currentTime + 0.45;
    (NOTES[name] || NOTES.tap).forEach(([frequency, duration, type, delay]) => {
      tone(frequency, duration, type, delay);
    });
  }

  function unlock() {
    interacted = true;
    ensureContext();
    startMusic();
    return context;
  }

  function setMuted(value) {
    prefs = { ...prefs, muted: Boolean(value) };
    persist();
    if (prefs.muted) {
      stopMusic();
      stopVoices();
      suspendContext();
    } else {
      unlock();
      play("confirm");
    }
    return !prefs.muted;
  }

  function setMusicEnabled(value) {
    prefs = { ...prefs, musicEnabled: Boolean(value) };
    persist();
    if (prefs.musicEnabled) startMusic();
    else stopMusic();
    return prefs.musicEnabled;
  }

  function setSfxEnabled(value) {
    prefs = { ...prefs, sfxEnabled: Boolean(value) };
    persist();
    if (prefs.sfxEnabled) play("confirm");
    else stopVoices("sfx");
    return prefs.sfxEnabled;
  }

  function setMode(value) {
    const next = MUSIC[value] ? value : "campaign";
    if (next === musicMode) return;
    musicMode = next;
    restartMusic();
  }

  function setSuspended(value) {
    suspended = Boolean(value);
    if (suspended) {
      stopMusic();
      stopVoices();
      suspendContext();
    } else {
      ensureContext();
      startMusic();
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopMusic();
    stopVoices();
    try { Promise.resolve(context?.close?.()).catch(() => {}); } catch { /* optional audio */ }
    context = null;
  }

  return {
    play,
    destroy,
    unlock,
    setMode,
    setMuted,
    setMusicEnabled,
    setSfxEnabled,
    setSuspended,
    setEnabled: (value) => setMuted(!value),
    isEnabled: () => !prefs.muted,
    getPrefs: () => ({ ...prefs }),
  };
}
