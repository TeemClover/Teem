import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSounds, SOUND_CUES, roundSoundPlan } from '../../quiz/game-sounds.js';

function audioFixture() {
  const sources = [], gains = [];
  const param = () => ({ value: 0, events: [], setValueAtTime(...args) { this.events.push(args); }, linearRampToValueAtTime(...args) { this.events.push(args); }, exponentialRampToValueAtTime(...args) { this.events.push(args); }, setTargetAtTime(...args) { this.events.push(args); } });
  const context = { state: 'suspended', currentTime: 10, destination: {}, resume: async () => { context.state = 'running'; }, createGain() { const node = { gain: param(), connect() {}, disconnect() {} };gains.push(node);return node; }, createDynamicsCompressor() { return { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {} }; }, createOscillator() { const source = { frequency: param(), starts: [], stops: [], connect() {}, disconnect() {}, start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); } };sources.push(source);return source; } };
  return { context, sources, gains, sounds: new GameSounds({ enabled: true, createContext: () => context }) };
}
test('all arcade cues have finite short envelopes and bounded positive pitches and gains', () => {
  assert.ok(Object.keys(SOUND_CUES).length >= 12);
  for (const notes of Object.values(SOUND_CUES)) {
    assert.ok(notes.length > 0);
    for (const n of notes) {
      assert.ok(n.frequency >= 20 && n.frequency <= 20000);assert.ok(n.endFrequency >= 20 && n.endFrequency <= 20000);
      assert.ok(n.at >= 0 && n.duration > .006 && n.at + n.duration < 2);assert.ok(n.gain > 0 && n.gain <= .12);
      assert.ok(['sine', 'triangle', 'square'].includes(n.wave));
    }
  }
});
test('round timing includes a 3–2–1 countdown, start, last five seconds and timeout; late unlock skips expired cues', () => {
  assert.deepEqual(roundSoundPlan(4, 24).map(e => e.delay), [1, 2, 3, 4, 19, 20, 21, 22, 23, 24]);
  assert.deepEqual(roundSoundPlan(-12, 8).map(e => e.cue), ['tick', 'tick', 'tick', 'tick', 'tick', 'timeup']);
  assert.deepEqual(roundSoundPlan(-40, -1), []);
});
test('audio starts after unlock, repeated polls cannot replay a round, and early reveal cancels future cues', async () => {
  const f = audioFixture();f.sounds.play('win');assert.equal(f.sources.length, 0);
  assert.equal(await f.sounds.unlock(), true);f.sounds.scheduleRound('room:1', 4, 24);
  const scheduled = f.sources.length;assert.ok(scheduled > 10);
  assert.ok(f.sources.some(source => source.starts[0] === 34));
  f.sounds.scheduleRound('room:1', 3, 23);assert.equal(f.sources.length, scheduled);
  f.sounds.stopRound();assert.equal(f.sounds.roundVoices.size, 0);assert.equal(f.sounds.voices.size, 0);
  assert.ok(f.sources.every(source => source.stops.at(-1) === undefined));
  f.sounds.play('reveal');assert.equal(f.sources.length, scheduled + SOUND_CUES.reveal.length);
});
test('mute cancels every voice, volume clamps, and enabling mid-question schedules only future effects', async () => {
  const f = audioFixture();await f.sounds.unlock();f.sounds.setVolume(99);assert.equal(f.sounds.volume, 1);
  assert.equal(f.gains[0].gain.events.at(-1)[0], .9);f.sounds.setVolume(-1);assert.equal(f.sounds.volume, 0);
  f.sounds.play('win');f.sounds.setEnabled(false);assert.equal(f.sounds.voices.size, 0);
  const count = f.sources.length;f.sounds.play('join');f.sounds.scheduleRound('room:2', 4, 24);assert.equal(f.sources.length, count);
  f.sounds.setEnabled(true);f.sounds.scheduleRound('room:2', -12, 8);
  assert.equal(f.sources.length - count, 5 * SOUND_CUES.tick.length + SOUND_CUES.timeup.length);
});
test('an autoplay rejection stays silent and can be retried from a user gesture', async () => {
  const f = audioFixture();f.context.resume = async () => { throw new Error('blocked'); };
  assert.equal(await f.sounds.unlock(), false);f.sounds.play('question');assert.equal(f.sources.length, 0);
  f.context.resume = async () => { f.context.state = 'running'; };
  assert.equal(await f.sounds.unlock(), true);f.sounds.play('question');assert.equal(f.sources.length, SOUND_CUES.question.length);
});
