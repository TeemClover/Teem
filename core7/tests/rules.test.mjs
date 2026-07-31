/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Rules Engine Tests (Brief §32)
   รัน: node --test core7/tests/
   ═══════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE7_RULES_VERSION, resolveColor, resolveRound,
  checkThreeWins, checkHandExhaustion,
  resolveFinalGray, resolveHistoryTiebreak, resolveMatch,
  validateHand, MATCH_RESULT_TYPE,
} from '../js/rules.js';

/* ── Color Resolution ── */
test('Red beats Green', () => assert.equal(resolveColor('RED', 'GREEN'), 'A'));
test('Green beats Blue', () => assert.equal(resolveColor('GREEN', 'BLUE'), 'A'));
test('Blue beats Red', () => assert.equal(resolveColor('BLUE', 'RED'), 'A'));
test('Reverse order flips winner', () => {
  assert.equal(resolveColor('GREEN', 'RED'), 'B');
  assert.equal(resolveColor('BLUE', 'GREEN'), 'B');
  assert.equal(resolveColor('RED', 'BLUE'), 'B');
});
test('Same color ties', () => {
  for (const c of ['RED', 'GREEN', 'BLUE', 'GRAY']) {
    assert.equal(resolveColor(c, c), 'TIE');
  }
});
test('Gray ties Red / Green / Blue / Gray (both seats)', () => {
  for (const c of ['RED', 'GREEN', 'BLUE', 'GRAY']) {
    assert.equal(resolveColor('GRAY', c), 'TIE');
    assert.equal(resolveColor(c, 'GRAY'), 'TIE');
  }
});
test('Invalid color throws', () => {
  assert.throws(() => resolveColor('PURPLE', 'RED'));
  assert.throws(() => resolveColor('RED', undefined));
});

/* ── Round Cost ── */
test('Winner loses only the played card; loser must discard extra', () => {
  const r = resolveRound({ a: 'RED', b: 'GREEN' });
  assert.equal(r.winner, 'A');
  assert.equal(r.loser, 'B');
  assert.equal(r.loserMustDiscard, true);
});
test('Tie: nobody discards extra, no round win', () => {
  const r = resolveRound({ a: 'GRAY', b: 'BLUE' });
  assert.equal(r.winner, null);
  assert.equal(r.loser, null);
  assert.equal(r.loserMustDiscard, false);
});

/* ── Match Win: Priority 1 — three round wins ── */
test('First to 3 Round Wins ends the match', () => {
  const res = resolveMatch({
    roundWins: { a: 3, b: 1 },
    handCounts: { a: 2, b: 1 },
    rounds: [],
  });
  assert.equal(res.winner, 'A');
  assert.equal(res.resultType, MATCH_RESULT_TYPE.THREE_WINS);
});
test('Three wins outranks empty hand', () => {
  const res = resolveMatch({
    roundWins: { a: 0, b: 3 },
    handCounts: { a: 0, b: 0 },
    rounds: [{ a: 'RED', b: 'BLUE', result: 'B' }],
  });
  assert.equal(res.winner, 'B');
  assert.equal(res.resultType, MATCH_RESULT_TYPE.THREE_WINS);
});
test('2 wins does not end the match', () => {
  assert.equal(resolveMatch({
    roundWins: { a: 2, b: 2 },
    handCounts: { a: 3, b: 3 },
    rounds: [],
  }), null);
});

/* ── Match Win: Priority 2 — one side has cards, other has none ── */
test('One player has cards, other has none → remaining player wins', () => {
  const res = resolveMatch({
    roundWins: { a: 1, b: 2 },
    handCounts: { a: 4, b: 0 },
    rounds: [{ a: 'RED', b: 'GREEN', result: 'A' }],
  });
  assert.equal(res.winner, 'A');
  assert.equal(res.resultType, MATCH_RESULT_TYPE.EXHAUSTION);
});
test('Hand counts never go below zero conceptually', () => {
  const ex = checkHandExhaustion({ a: 0, b: 0 });
  assert.deepEqual(ex, { done: true, winner: null, both: true });
});

/* ── Match Win: Priority 3 — both empty → tiebreak ── */
test('Both empty after decisive final round → last-round winner wins', () => {
  const res = resolveMatch({
    roundWins: { a: 2, b: 1 },
    handCounts: { a: 0, b: 0 },
    rounds: [
      { a: 'RED', b: 'RED', result: 'TIE' },
      { a: 'BLUE', b: 'RED', result: 'A' },
    ],
  });
  assert.equal(res.winner, 'A');
  assert.equal(res.resultType, MATCH_RESULT_TYPE.LAST_ROUND);
});

/* Final Gray */
test('Final Gray loses to Red', () =>
  assert.equal(resolveFinalGray({ a: 'GRAY', b: 'RED' }), 'B'));
test('Final Gray loses to Green', () =>
  assert.equal(resolveFinalGray({ a: 'GREEN', b: 'GRAY' }), 'A'));
test('Final Gray loses to Blue', () =>
  assert.equal(resolveFinalGray({ a: 'GRAY', b: 'BLUE' }), 'B'));
test('Final Gray vs Gray is not decided by Final Gray rule', () =>
  assert.equal(resolveFinalGray({ a: 'GRAY', b: 'GRAY' }), null));
test('Final Gray applies in full match resolution', () => {
  const res = resolveMatch({
    roundWins: { a: 0, b: 0 },
    handCounts: { a: 0, b: 0 },
    rounds: [{ a: 'GRAY', b: 'RED', result: 'TIE' }],
  });
  assert.equal(res.winner, 'B');
  assert.equal(res.resultType, MATCH_RESULT_TYPE.FINAL_GRAY);
});

/* History tiebreak */
test('Gray vs Gray final checks history', () => {
  const res = resolveMatch({
    roundWins: { a: 1, b: 0 },
    handCounts: { a: 0, b: 0 },
    rounds: [
      { a: 'RED', b: 'GREEN', result: 'A' },
      { a: 'GRAY', b: 'GRAY', result: 'TIE' },
    ],
  });
  assert.equal(res.winner, 'A');
  assert.equal(res.resultType, MATCH_RESULT_TYPE.HISTORY);
});
test('Same-color final tie checks history', () => {
  const res = resolveMatch({
    roundWins: { a: 0, b: 1 },
    handCounts: { a: 0, b: 0 },
    rounds: [
      { a: 'BLUE', b: 'GREEN', result: 'B' },
      { a: 'RED', b: 'RED', result: 'TIE' },
    ],
  });
  assert.equal(res.winner, 'B');
  assert.equal(res.resultType, MATCH_RESULT_TYPE.HISTORY);
});
test('History walks newest → oldest and skips ties', () => {
  assert.equal(resolveHistoryTiebreak([
    { result: 'B' },
    { result: 'A' },
    { result: 'TIE' },
    { result: 'TIE' },
  ]), 'A');
});
test('All history ties returns null → match is a DRAW', () => {
  assert.equal(resolveHistoryTiebreak([{ result: 'TIE' }, { result: 'TIE' }]), null);
  const res = resolveMatch({
    roundWins: { a: 0, b: 0 },
    handCounts: { a: 0, b: 0 },
    rounds: [
      { a: 'RED', b: 'RED', result: 'TIE' },
      { a: 'GRAY', b: 'GRAY', result: 'TIE' },
    ],
  });
  assert.equal(res.winner, null);
  assert.equal(res.draw, true);
  assert.equal(res.resultType, MATCH_RESULT_TYPE.DRAW);
});

/* ── checkThreeWins ── */
test('checkThreeWins', () => {
  assert.equal(checkThreeWins({ a: 3, b: 0 }), 'A');
  assert.equal(checkThreeWins({ a: 0, b: 3 }), 'B');
  assert.equal(checkThreeWins({ a: 2, b: 2 }), null);
});

/* ── validateHand ── */
test('Hand must have exactly 7 valid colors', () => {
  assert.equal(validateHand(['RED', 'RED', 'BLUE', 'BLUE', 'GREEN', 'GREEN', 'GRAY']).ok, true);
  assert.equal(validateHand(['RED', 'RED', 'BLUE']).ok, false);
  assert.equal(validateHand(['RED', 'RED', 'BLUE', 'BLUE', 'GREEN', 'GREEN', 'PINK']).ok, false);
  assert.equal(validateHand(null).ok, false);
});

/* ── Rules version ── */
test('Rules version is locked at 1.0.0', () =>
  assert.equal(CORE7_RULES_VERSION, '1.0.0'));
