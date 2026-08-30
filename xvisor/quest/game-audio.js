const NOTES = {
  tap: [[520, 0.04, "square", 0]],
  confirm: [[620, 0.05, "square", 0], [820, 0.08, "square", 0.05]],
  cancel: [[260, 0.06, "triangle", 0]],
  coin: [[880, 0.05, "square", 0], [1320, 0.09, "square", 0.05]],
  sale: [[660, 0.06, "square", 0], [880, 0.06, "square", 0.07], [1320, 0.16, "square", 0.14]],
  level: [[523, 0.07, "square", 0], [659, 0.07, "square", 0.08], [784, 0.07, "square", 0.16], [1047, 0.18, "square", 0.24]],
  xircle: [[440, 0.06, "sine", 0], [660, 0.06, "sine", 0.1], [880, 0.08, "sine", 0.2]],
  xircleDone: [[660, 0.06, "triangle", 0], [990, 0.14, "triangle", 0.07]],
  meeting: [[392, 0.06, "square", 0], [587, 0.06, "square", 0.07], [784, 0.12, "square", 0.14]],
  meetingDone: [[523, 0.07, "triangle", 0], [659, 0.07, "triangle", 0.08], [1047, 0.16, "triangle", 0.16]],
  month: [[392, 0.07, "triangle", 0], [523, 0.07, "triangle", 0.08], [659, 0.14, "triangle", 0.16]],
  notify: [[760, 0.05, "sine", 0], [980, 0.09, "sine", 0.07]],
};

export function createAudio(initiallyOn = true) {
  let enabled = Boolean(initiallyOn);
  let context = null;

  function ensureContext() {
    if (!enabled) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!context) context = new AudioContext();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  }

  function tone(frequency, duration, type, delay) {
    const ctx = ensureContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(name) {
    if (!enabled) return;
    (NOTES[name] || NOTES.tap).forEach(([frequency, duration, type, delay]) => {
      tone(frequency, duration, type, delay);
    });
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) {
      ensureContext();
      play("confirm");
    }
    return enabled;
  }

  return {
    play,
    setEnabled,
    isEnabled: () => enabled,
    unlock: ensureContext,
  };
}
