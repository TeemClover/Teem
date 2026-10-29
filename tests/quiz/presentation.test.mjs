import test from 'node:test';
import assert from 'node:assert/strict';
import { stepAvatar, randomAvatar } from '../../quiz/avatar-picker.js';
import { countValue, planStandings, animateNumber } from '../../quiz/standings-motion.js';

test('left/right wraps at both ends; shuffle offers every other card without repeating the selection', () => {
  assert.equal(stepAvatar(0, -1, 68), 67);
  assert.equal(stepAvatar(67, 1, 68), 0);
  assert.equal(stepAvatar(0, -1, 1), 0);
  assert.equal(stepAvatar(0, 1, 0), -1);
  for (let current = 0; current < 68; current++) {
    const outcomes = Array.from({ length: 67 }, (_, n) => randomAvatar(current, 68, () => (n + .5) / 67));
    assert.equal(new Set(outcomes).size, 67);
    assert.ok(!outcomes.includes(current));
    assert.ok(outcomes.every(index => index >= 0 && index < 68));
  }
  assert.equal(randomAvatar(0, 1), 0);
  assert.equal(randomAvatar(0, 0), -1);
});

test('overtake plan retains the former leaders, includes incoming players, and uses actual prior scores', () => {
  const previous = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, rank: i + 1, score: 800 - i * 50 }));
  const current = ['p7', 'p1', 'p5', 'p0', 'p3', 'p2', 'p4', 'p6'].map((id, i) => ({ id, rank: i + 1, score: 1800 - i * 70 }));
  const plan = planStandings(previous, current, 5);
  const newcomer = plan.find(p => p.player.id === 'p7');
  assert.equal(newcomer.from, 450);
  assert.equal(newcomer.to, 1800);
  assert.equal(newcomer.climb, 7);
  assert.equal(newcomer.gain, 1350);
  assert.equal(newcomer.wasVisible, false);
  assert.equal(newcomer.visible, true);
  const outgoing = plan.find(p => p.player.id === 'p4');
  assert.equal(outgoing.wasVisible, true);
  assert.equal(outgoing.visible, false);
  assert.equal(outgoing.climb, -2);
  assert.equal(previous[0].score, 800, 'presentation never modifies authoritative scores');
  assert.equal(current[0].rank, 1);
  assert.equal(planStandings(previous, current, 100).length, 8);
});

test('a new browser counts from zero without inventing an overtake; absent players are excluded', () => {
  const current = [{ id: 'winner', score: 1245, rank: 1 }];
  const [p] = planStandings([{ id: 'gone', rank: 1, score: 999 }], current);
  assert.equal(p.from, 0);assert.equal(p.to, 1245);assert.equal(p.oldRank, null);assert.equal(p.climb, 0);
  assert.equal(planStandings([], [], 5).length, 0);
});

test('score interpolation accelerates, never overshoots and lands on the exact server score', () => {
  let last = 5432;
  for (let n = 0; n <= 100; n++) {
    const value = countValue(5432, 6387, n / 100);
    assert.ok(value >= last && value <= 6387);last = value;
  }
  assert.equal(last, 6387);
  assert.equal(countValue(5432, 6387, -1), 5432);
  assert.equal(countValue(5432, 6387, 5), 6387);
  assert.equal(countValue(1000, 1000, .5), 1000);
});

function counterFixture(reduced = false) {
  let next = 0, time = 0;
  const frames = new Map();
  const view = { matchMedia: () => ({ matches: reduced }), requestAnimationFrame(fn) { frames.set(++next, fn); return next; }, cancelAnimationFrame(id) { frames.delete(id); } };
  const element = { ownerDocument: { defaultView: view }, isConnected: true, textContent: '' };
  return { element, frames, tick(ms) { time += ms; const pending = [...frames.values()]; frames.clear();pending.forEach(fn => fn(time)); } };
}

test('number animator advances on real frame time and stops scheduling at completion', () => {
  const f = counterFixture();animateNumber(f.element, 500, 1500);
  assert.equal(f.element.textContent, '500');
  f.tick(0);f.tick(800);assert.equal(f.element.textContent, '1,375');
  f.tick(800);assert.equal(f.element.textContent, '1,500');assert.equal(f.frames.size, 0);
});

test('reduced motion, cancellation and a removed screen cannot leave stale counters running', () => {
  const reduced = counterFixture(true);animateNumber(reduced.element, 0, 1789);
  assert.equal(reduced.element.textContent, '1,789');assert.equal(reduced.frames.size, 0);
  const f = counterFixture(), stop = animateNumber(f.element, 0, 2500);
  f.tick(0);f.tick(300);stop();assert.equal(f.element.textContent, '2,500');assert.equal(f.frames.size, 0);
  const removed = counterFixture();animateNumber(removed.element, 0, 900);removed.element.isConnected = false;removed.tick(100);
  assert.equal(removed.frames.size, 0);
});
