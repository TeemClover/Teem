import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../../xvisor/quest/game-audio.js';

function audioHarness(t, options = {}) {
  const originalWindow = globalThis.window;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const intervals = new Map();
  const contexts = [];
  const storage = new Map();
  let nextTimer = 0;
  class FakeAudioContext {
    constructor() {
      if (options.constructorFails) throw new Error('Audio hardware unavailable');
      this.state = 'suspended';
      this.currentTime = 10;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      contexts.push(this);
    }
    resume() {
      if (options.resumeFails) return Promise.reject(new Error('Gesture required'));
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createGain() {
      const gain = { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() { this.disconnected = true; } };
      this.gains.push(gain);
      return gain;
    }
    createOscillator() {
      const oscillator = {
        frequency: { setValueAtTime() {} }, stops: [],
        connect() {}, disconnect() { this.disconnected = true; },
        start(time) { this.startAt = time; },
        stop(time) { this.stops.push(time); },
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }
  }
  globalThis.window = {
    AudioContext: FakeAudioContext,
    setInterval(fn) { intervals.set(nextTimer, fn); return nextTimer++; },
    clearInterval(id) { intervals.delete(id); },
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } });
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", originalStorage);
  });
  return { contexts, intervals, storage };
}

test('sound waits for interaction and repeated unlocks keep one music clock, including timer ID zero', (t) => {
  const { contexts, intervals } = audioHarness(t);
  const audio = createAudio();
  audio.play('confirm');
  assert.equal(contexts.length, 0);
  audio.unlock();
  audio.unlock();
  audio.unlock();
  assert.equal(contexts.length, 1);
  assert.equal(intervals.size, 1);
  audio.destroy();
  assert.equal(intervals.size, 0);
});

test('muting cancels delayed celebration tones so unmuting cannot replay stale rewards', (t) => {
  const { contexts, intervals } = audioHarness(t);
  const audio = createAudio();
  audio.unlock();
  audio.play('level');
  const ctx = contexts[0];
  const scheduled = [...ctx.oscillators];
  assert.ok(scheduled.some((voice) => voice.startAt > ctx.currentTime));
  audio.setMuted(true);
  assert.equal(ctx.state, 'suspended');
  assert.equal(intervals.size, 0);
  assert.ok(scheduled.every((voice) => voice.disconnected && voice.stops.at(-1) === undefined));
  audio.setMuted(false);
  assert.equal(intervals.size, 1);
  assert.ok(scheduled.every((voice) => voice.disconnected));
  audio.destroy();
});

test('music and SFX switches cancel only their own channel, and completed voices disconnect', (t) => {
  const { contexts, intervals } = audioHarness(t);
  const audio = createAudio();
  audio.unlock();
  const ctx = contexts[0];
  const music = [...ctx.oscillators];
  audio.play('level');
  const effects = ctx.oscillators.slice(music.length);
  audio.setMusicEnabled(false);
  assert.equal(intervals.size, 0);
  assert.ok(music.every((voice) => voice.disconnected));
  assert.ok(effects.every((voice) => !voice.disconnected));
  effects[0].onended();
  assert.equal(effects[0].disconnected, true);
  audio.setSfxEnabled(false);
  assert.ok(effects.every((voice) => voice.disconnected));
  audio.destroy();
});

test('hiding the game releases all voices and restoring the tab respects music-off preferences', (t) => {
  const { contexts, intervals } = audioHarness(t);
  const audio = createAudio();
  audio.unlock();
  audio.setMusicEnabled(false);
  audio.play('trip');
  const ctx = contexts[0];
  audio.setSuspended(true);
  const count = ctx.oscillators.length;
  audio.play('ending');
  assert.equal(ctx.oscillators.length, count);
  assert.ok(ctx.oscillators.every((voice) => voice.disconnected));
  assert.equal(ctx.state, 'suspended');
  audio.setSuspended(false);
  assert.equal(ctx.state, 'running');
  assert.equal(intervals.size, 0);
  audio.play('tap');
  assert.equal(ctx.oscillators.length, count + 1);
  audio.destroy();
  audio.unlock();
  audio.play('tap');
  assert.equal(ctx.state, 'closed');
  assert.equal(contexts.length, 1);
});

test('audio hardware failure stays optional', (t) => {
  const first = audioHarness(t, { constructorFails: true });
  const audio = createAudio();
  assert.doesNotThrow(() => { audio.unlock(); audio.play('confirm'); audio.setMuted(true); });
  assert.equal(first.intervals.size, 0);
  audio.destroy();
});

test('failed resumes clear the pending sound queue', async (t) => {
  const second = audioHarness(t, { resumeFails: true });
  const blockedAudio = createAudio();
  blockedAudio.unlock();
  blockedAudio.play('level');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(second.intervals.size, 0);
  assert.ok(second.contexts[0].oscillators.every((voice) => voice.disconnected));
  blockedAudio.destroy();
});

test('rapid repeated input cannot leave an unbounded number of connected voices', (t) => {
  const { contexts } = audioHarness(t);
  const audio = createAudio();
  audio.unlock();
  for (let index = 0; index < 100; index += 1) audio.play('level');
  assert.ok(contexts[0].oscillators.filter((voice) => !voice.disconnected).length <= 32);
  audio.destroy();
  assert.ok(contexts[0].gains.every((gain) => gain.disconnected));
});
