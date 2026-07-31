/* ═══ myClover: CORE7 — Ranking (Glicko-2) Tests ═══ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newRating, updateRating, scoreOf, tierOf, GLICKO_CONFIG } from '../js/ranking.js';

test('Glickman paper example produces canonical result', () => {
  /* ตัวอย่างมาตรฐานจากเอกสาร Glicko-2:
     ผู้เล่น 1500/200/0.06 เจอ 1400/30 (ชนะ), 1550/100 (แพ้), 1700/300 (แพ้)
     → rating ≈ 1464.06, RD ≈ 151.52 */
  const p = { rating: 1500, rd: 200, volatility: 0.06 };
  const out = updateRating(p, [
    { rating: 1400, rd: 30, score: 1 },
    { rating: 1550, rd: 100, score: 0 },
    { rating: 1700, rd: 300, score: 0 },
  ]);
  assert.ok(Math.abs(out.rating - 1464.06) < 0.5, `rating ${out.rating}`);
  assert.ok(Math.abs(out.rd - 151.52) < 0.5, `rd ${out.rd}`);
});

test('Ranked win raises rating, loss lowers it', () => {
  const p = newRating();
  const opp = newRating();
  const win = updateRating(p, [{ ...opp, score: 1 }]);
  const loss = updateRating(p, [{ ...opp, score: 0 }]);
  assert.ok(win.rating > p.rating);
  assert.ok(loss.rating < p.rating);
});

test('Draw between equals barely moves rating (score 0.5)', () => {
  const p = newRating();
  const out = updateRating(p, [{ ...newRating(), score: 0.5 }]);
  assert.ok(Math.abs(out.rating - p.rating) < 1);
  assert.ok(out.rd < p.rd);   // ความมั่นใจเพิ่มขึ้นแม้เสมอ
});

test('No games: RD expands but rating unchanged', () => {
  const p = { rating: 1600, rd: 80, volatility: 0.06 };
  const out = updateRating(p, []);
  assert.equal(out.rating, 1600);
  assert.ok(out.rd > 80);
  assert.ok(out.rd <= GLICKO_CONFIG.initialRD);
});

test('scoreOf maps match outcomes correctly; cancelled = null', () => {
  assert.equal(scoreOf('WIN'), 1);
  assert.equal(scoreOf('DRAW'), 0.5);
  assert.equal(scoreOf('LOSS'), 0);
  assert.equal(scoreOf('FORFEIT_WIN'), 1);
  assert.equal(scoreOf('DISCONNECT_LOSS'), 0);
  assert.equal(scoreOf('CANCELLED'), null);
});

test('Tiers are ordered and cosmetic thresholds work', () => {
  assert.equal(tierOf(1000).name, 'SEED');
  assert.equal(tierOf(1500).name, 'SPROUT');
  assert.equal(tierOf(2100).name, 'FOUR-LEAF');
});
