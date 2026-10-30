const note = (frequency, at = 0, duration = .14, gain = .08, wave = 'triangle', endFrequency = frequency) => ({ frequency, at, duration, gain, wave, endFrequency });
export const SOUND_CUES = {
  click: [note(740, 0, .06, .045, 'square', 1047)],
  join: [note(523, 0, .1), note(784, .09, .19), note(1047, .15, .19, .035)],
  countdown: [note(440, 0, .14, .07, 'square'), note(220, 0, .12, .055, 'sine')],
  question: [note(523, 0, .1), note(659, .06, .1), note(784, .12, .1), note(1047, .18, .28, .1), note(131, 0, .3, .1, 'sine')],
  tick: [note(880, 0, .075, .055, 'square', 660)],
  timeup: [note(392, 0, .13, .08, 'square'), note(330, .13, .13), note(196, .26, .28, .1, 'triangle', 98)],
  answer: [note(659, 0, .08, .055, 'square'), note(988, .06, .12, .065, 'triangle')],
  correct: [note(659, 0, .1), note(784, .09, .1), note(1047, .18, .27, .1), note(523, .18, .28, .035)],
  wrong: [note(294, 0, .14, .065, 'triangle', 220), note(196, .13, .19, .065)],
  reveal: [note(196, 0, .13, .1, 'sine', 65), note(523, .14, .25), note(659, .14, .25, .055), note(784, .14, .3, .055)],
  leaderboard: [note(147, 0, .1, .1, 'sine', 55), note(147, .1, .09, .08, 'sine', 55), note(523, .24, .12), note(784, .34, .23)],
  overtake: [note(659, 0, .1, .07, 'square'), note(784, .07, .1), note(988, .14, .1), note(1319, .21, .24, .08)],
  win: [note(523, 0, .13), note(523, .17, .13), note(523, .34, .13), note(659, .52, .2), note(784, .72, .2), note(1047, .94, .5, .11), note(659, .94, .5, .05), note(784, .94, .5, .05), note(131, .94, .53, .1, 'sine')],
};

// Schedule against the audio clock once, so normal polling and slide switching
// cannot replay countdown beeps or produce several ticks after a delayed frame.
export function roundSoundPlan(startsIn, endsIn) {
  return [
    ...[3, 2, 1].map(n => ({ cue: 'countdown', delay: startsIn - n })),
    { cue: 'question', delay: startsIn },
    ...[5, 4, 3, 2, 1].map(n => ({ cue: 'tick', delay: endsIn - n })),
    { cue: 'timeup', delay: endsIn },
  ].filter(event => event.delay >= 0);
}

export class GameSounds {
  constructor({ enabled = false, volume = .65, createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)() } = {}) {
    this.enabled = enabled;this.volume = Math.min(1, Math.max(0, Number(volume) || 0));this.createContext = createContext;
    this.ctx = null;this.master = null;this.voices = new Set();this.roundVoices = new Set();this.roundKey = null;
  }
  get ready() { return this.ctx?.state === 'running'; }
  async unlock() {
    if (!this.enabled) return false;
    try {
      if (!this.ctx) {
        this.ctx = this.createContext();this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * .9;
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;compressor.knee.value = 12;compressor.ratio.value = 6;
        compressor.attack.value = .003;compressor.release.value = .18;
        this.master.connect(compressor);compressor.connect(this.ctx.destination);this.setVolume(this.volume);
      }
      if (!this.ready) await this.ctx.resume();
      return this.ready;
    } catch { return false; }
  }
  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, Number(value) || 0));
    if (this.master) this.master.gain.setTargetAtTime(this.volume * .9, this.ctx.currentTime, .02);
  }
  setEnabled(enabled) { this.enabled = !!enabled;if (!this.enabled) this.stop(); }
  play(cue, { delay = 0, round = false } = {}) {
    if (!this.enabled || !this.ready || !SOUND_CUES[cue]) return;
    for (const n of SOUND_CUES[cue]) {
      if (this.voices.size >= 96) break;
      const source = this.ctx.createOscillator(), envelope = this.ctx.createGain();
      const time = this.ctx.currentTime + Math.max(0, delay) + n.at;
      source.type = n.wave;source.frequency.setValueAtTime(n.frequency, time);
      if (n.endFrequency !== n.frequency) source.frequency.exponentialRampToValueAtTime(n.endFrequency, time + n.duration);
      envelope.gain.setValueAtTime(0, time);envelope.gain.linearRampToValueAtTime(n.gain, time + .006);
      envelope.gain.exponentialRampToValueAtTime(.0001, time + n.duration);
      source.connect(envelope);envelope.connect(this.master);
      this.voices.add(source);if (round) this.roundVoices.add(source);
      source.onended = () => { this.voices.delete(source);this.roundVoices.delete(source);source.disconnect();envelope.disconnect(); };
      source.start(time);source.stop(time + n.duration + .015);
    }
  }
  scheduleRound(key, startsIn, endsIn) {
    if (!this.enabled || !this.ready || this.roundKey === key) return;
    this.stopRound();this.roundKey = key;
    for (const event of roundSoundPlan(startsIn, endsIn)) this.play(event.cue, { delay: event.delay, round: true });
  }
  stopRound() {
    for (const source of this.roundVoices) { try { source.stop(); } catch {} this.voices.delete(source); }
    this.roundVoices.clear();this.roundKey = null;
  }
  stop() {
    for (const source of this.voices) { try { source.stop(); } catch {} }
    this.voices.clear();this.roundVoices.clear();this.roundKey = null;
  }
}
