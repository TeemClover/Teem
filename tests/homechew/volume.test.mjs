/** Physical regressions: independently integrate the cavity and account for every serving. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOTTLE, BOTTLE_CAVITY, BOWL, SAUCE, pose, bowlInnerRadius, bowlVolumeAt,
  bowlLevelForVolume, bottleVolumeBelow, bottleLevelForVolume,
} from '../../homechew/js/scene/timeline.js';

const near = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

// A separate fine midpoint integral deliberately does not reuse the production quadrature.
function referenceVolume(level, angle) {
  const sin = Math.abs(Math.sin(angle)), cos = Math.cos(angle);
  let total = 0;
  for (let i = 0; i < BOTTLE_CAVITY.length - 1; i++) {
    const [y0, r0] = BOTTLE_CAVITY[i], [y1, r1] = BOTTLE_CAVITY[i + 1];
    const steps = Math.ceil((y1 - y0) * 8000), dy = (y1 - y0) / steps;
    for (let j = 0; j < steps; j++) {
      const fraction = (j + 0.5) / steps, y = y0 + fraction * (y1 - y0), r = r0 + fraction * (r1 - r0);
      if (sin < 1e-8) { if (cos * y <= level) total += Math.PI * r * r * dy; continue; }
      const x = Math.min(r, Math.max(-r, (level - cos * y) / sin));
      total += (r * r * Math.acos(-x / r) + x * Math.sqrt(Math.max(0, r * r - x * x))) * dy;
    }
  }
  return total;
}

test('tilting preserves the actual cavity volume, including horizontal and almost upright', () => {
  for (const angle of [0, 0.0001, 0.02, 0.35, 0.8, Math.PI / 2, 1.7, 2.02, Math.PI]) {
    for (const volume of [SAUCE.initialVolume, SAUCE.initialVolume - SAUCE.servingVolume]) {
      const level = bottleLevelForVolume(angle, volume);
      near(referenceVolume(level, angle), volume, SAUCE.initialVolume * 0.0001, `angle ${angle}`);
    }
  }
});

test('one bowl is removed from the bottle, with more than 90% retained', () => {
  const end = pose(1);
  near(SAUCE.initialVolume - end.fill.volume, bowlVolumeAt(BOWL.servingLevel), 1e-8, 'one serving');
  near(end.pool.height, BOWL.servingLevel, 1e-6, 'bowl height');
  near(end.fill.level, BOTTLE.fillAfter, 1e-6, 'upright bottle height');
  assert.ok(end.fill.volume / SAUCE.initialVolume > 0.9);
  assert.ok(BOTTLE.fillAfter > 4.1, 'sauce still reaches the shoulder after serving');
});

test('bottle, airborne ribbon and bowl conserve sauce throughout the whole scroll', () => {
  let lastBottle = Infinity, lastBowl = 0;
  for (let i = 0; i <= 2000; i++) {
    const p = pose(i / 2000);
    near(p.fill.volume + p.stream.volume + p.pool.volume, SAUCE.initialVolume, 1e-9, 'total volume');
    assert.ok(p.fill.volume <= lastBottle + 1e-9, `bottle refilled at ${p.u}`);
    assert.ok(p.pool.volume >= lastBowl - 1e-9, `bowl emptied at ${p.u}`);
    if (p.stream.head < 1) assert.equal(p.pool.volume, 0, 'pool cannot fill before the first drop lands');
    if (p.stream.tail > 0) near(p.fill.volume, SAUCE.initialVolume - SAUCE.servingVolume, 1e-9, 'detached ribbon belongs to bowl');
    lastBottle = p.fill.volume;
    lastBowl = p.pool.volume;
  }
});

test('bowl height follows its widening shape instead of a linear height animation', () => {
  for (const fraction of [0.05, 0.25, 0.5, 0.75, 1]) {
    const wanted = SAUCE.servingVolume * fraction;
    const level = bowlLevelForVolume(wanted);
    const dy = (level - BOWL.innerBottom) / 10000;
    let independent = 0;
    for (let i = 0; i < 10000; i++) independent += Math.PI * bowlInnerRadius(BOWL.innerBottom + (i + 0.5) * dy) ** 2 * dy;
    near(independent, wanted, 1e-5, `bowl fraction ${fraction}`);
  }
});

test('volume state is deterministic when rewinding through the pour', () => {
  const positions = [0.44, 0.49, 0.55, 0.64, 0.74, 0.8, 0.89];
  const states = positions.map(s => pose(s));
  for (const s of [1, -1, 0.8, 0.1, 0.94]) pose(s);
  positions.reverse().forEach((s, i) => assert.deepEqual(pose(s), states[states.length - i - 1]));
});
