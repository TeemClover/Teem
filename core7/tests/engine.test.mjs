/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Match Engine Tests (Security / State — Brief §32)
   ═══════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MatchAuthority, PHASE } from '../js/engine.js';
import { Core7Bot, seededRng } from '../js/bot.js';
import { FIRST_HAND } from '../js/cards.js';
import {
  CORE7_ART_VERSION, FIRST_HAND_ART, GENERIC_CARD_ART,
  sceneSVG, cardSVG, genericCardSVG,
} from '../js/art.js';

const G = { R: 'gen-red', G: 'gen-green', B: 'gen-blue', X: 'gen-gray' };
const hand = spec => spec.split('').map(ch => G[ch]);

function newMatch(aSpec = 'RRGGBBX', bSpec = 'RRGGBBX') {
  return new MatchAuthority({
    matchId: 'm-test',
    players: {
      a: { id: 'pa', name: 'A', cards: hand(aSpec) },
      b: { id: 'pb', name: 'B', cards: hand(bSpec) },
    },
  });
}

/* helper: เล่น 1 รอบให้จบ (รวมทิ้งเพิ่มแบบอัตโนมัติ) */
function playRound(m, aIid, bIid, discardIid = null) {
  assert.equal(m.action('pa', { type: 'select_card', cardInstanceId: aIid }).ok, true);
  assert.equal(m.action('pb', { type: 'select_card', cardInstanceId: bIid }).ok, true);
  assert.equal(m.action('pa', { type: 'lock_choice' }).ok, true);
  assert.equal(m.action('pb', { type: 'lock_choice' }).ok, true);
  if (m.state.phase === PHASE.DISCARD_REQUIRED && discardIid) {
    const who = m.state.discardBy === 'a' ? 'pa' : 'pb';
    assert.equal(m.action(who, { type: 'discard_card', cardInstanceId: discardIid }).ok, true);
  }
}

test('Cannot play a card not in hand', () => {
  const m = newMatch();
  assert.equal(m.action('pa', { type: 'select_card', cardInstanceId: 'b1' }).ok, false);
  assert.equal(m.action('pa', { type: 'select_card', cardInstanceId: 'a99' }).ok, false);
});

test('Cannot change selection after lock', () => {
  const m = newMatch();
  m.action('pa', { type: 'select_card', cardInstanceId: 'a1' });
  m.action('pa', { type: 'lock_choice' });
  const res = m.action('pa', { type: 'select_card', cardInstanceId: 'a2' });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'ALREADY_LOCKED');
});

test('Cannot lock without selecting', () => {
  const m = newMatch();
  assert.equal(m.action('pa', { type: 'lock_choice' }).error, 'NOTHING_SELECTED');
});

test('Opponent choice is never visible before both lock', () => {
  const m = newMatch();
  m.action('pa', { type: 'select_card', cardInstanceId: 'a1' });
  m.action('pa', { type: 'lock_choice' });
  const viewB = m.viewFor('pb');
  /* view ของ B รู้แค่ว่า A lock แล้ว — ไม่รู้ว่าเลือกใบไหน/สีอะไร */
  assert.equal(viewB.opponent.locked, true);
  const raw = JSON.stringify(viewB);
  assert.ok(!raw.includes('"a1"'), 'view must not contain opponent selection');
  assert.ok(!('hand' in viewB.opponent), 'view must not contain opponent hand');
});

test('View never exposes opponent unplayed cards', () => {
  const m = newMatch('RRRRRRR', 'GGGGGGG');
  playRound(m, 'a1', 'b1', 'b2');   // RED beats GREEN
  const viewA = m.viewFor('pa');
  /* A เห็นเฉพาะใบที่ B เปิดแล้ว (b1 ที่ลง + b2 ที่ทิ้ง) */
  const seen = JSON.stringify(viewA.rounds);
  assert.ok(seen.includes('b1') && seen.includes('b2'));
  assert.ok(!JSON.stringify(viewA).includes('b3'));
  assert.equal(viewA.opponent.handCount, 5);
});

test('Loser must discard; winner does not', () => {
  const m = newMatch('RRRRRRR', 'GGGGGGG');
  m.action('pa', { type: 'select_card', cardInstanceId: 'a1' });
  m.action('pb', { type: 'select_card', cardInstanceId: 'b1' });
  m.action('pa', { type: 'lock_choice' });
  m.action('pb', { type: 'lock_choice' });
  assert.equal(m.state.phase, PHASE.DISCARD_REQUIRED);
  /* ผู้ชนะทิ้งไม่ได้ */
  assert.equal(m.action('pa', { type: 'discard_card', cardInstanceId: 'a2' }).error, 'NOT_YOUR_DISCARD');
  /* ผู้แพ้ทิ้งการ์ดของคู่แข่งไม่ได้ */
  assert.equal(m.action('pb', { type: 'discard_card', cardInstanceId: 'a2' }).error, 'CARD_NOT_IN_HAND');
  /* ผู้แพ้ทิ้งของตัวเองได้ */
  assert.equal(m.action('pb', { type: 'discard_card', cardInstanceId: 'b2' }).ok, true);
  assert.equal(m.viewFor('pa').you.hand.filter(c => c.status === 'IN_HAND').length, 6);
  assert.equal(m.viewFor('pb').you.hand.filter(c => c.status === 'IN_HAND').length, 5);
});

test('Cannot discard when not required (tie round)', () => {
  const m = newMatch('RRRRRRR', 'RRRRRRR');
  playRound(m, 'a1', 'b1');   // RED vs RED = TIE
  assert.equal(m.state.phase, PHASE.ROUND_SELECT);
  assert.equal(m.action('pa', { type: 'discard_card', cardInstanceId: 'a2' }).error, 'DISCARD_NOT_REQUIRED');
});

test('Duplicate action with same action_id is idempotent', () => {
  const m = newMatch();
  const act = { type: 'select_card', cardInstanceId: 'a1', action_id: 'act-1' };
  assert.equal(m.action('pa', act).ok, true);
  m.action('pa', { type: 'lock_choice', action_id: 'act-2' });
  /* ส่งซ้ำ (refresh/duplicate event) — ตอบผลเดิม ไม่ error ไม่เปลี่ยน state */
  assert.equal(m.action('pa', act).ok, true);
  assert.equal(m.action('pa', { type: 'lock_choice', action_id: 'act-2' }).ok, true);
  assert.equal(m.state.current.a.locked, true);
});

test('Lock twice without action_id is still safe (no double resolve)', () => {
  const m = newMatch();
  m.action('pa', { type: 'select_card', cardInstanceId: 'a1' });
  m.action('pa', { type: 'lock_choice' });
  const again = m.action('pa', { type: 'lock_choice' });
  assert.equal(again.ok, true);
  assert.equal(again.already, true);
  assert.equal(m.state.rounds.length, 0);   // ยังไม่ reveal เพราะ B ยังไม่ lock
});

test('First to 3 round wins ends match', () => {
  const m = newMatch('RRRGGBX', 'GGGRRBX');
  playRound(m, 'a1', 'b1', 'b7');  // R>G — A ชนะ
  playRound(m, 'a2', 'b2', 'b6');  // R>G — A ชนะ
  playRound(m, 'a3', 'b3');        // R>G — A ครบ 3 → จบทันที ไม่ต้องทิ้งเพิ่ม
  assert.equal(m.state.phase, PHASE.MATCH_RESULT);
  assert.equal(m.state.result.winnerId, 'pa');
  assert.equal(m.state.result.resultType, 'THREE_WINS');
});

test('Match cannot resolve twice / actions rejected after end', () => {
  const m = newMatch('RRRGGBX', 'GGGRRBX');
  playRound(m, 'a1', 'b1', 'b7');
  playRound(m, 'a2', 'b2', 'b6');
  playRound(m, 'a3', 'b3');
  const r = m.action('pa', { type: 'select_card', cardInstanceId: 'a4' });
  assert.equal(r.ok, false);
  assert.equal(m.action('pa', { type: 'forfeit' }).error, 'MATCH_OVER');
});

test('Hand exhaustion: loser of last decisive round has no extra card to discard', () => {
  /* A ถือใบเดียวไม่ได้ — มือต้อง 7 ใบ ดังนั้นจำลองด้วยการเล่นให้เหลือน้อย
     เกม 7 ใบ: แพ้ = เสีย 2 → แพ้ 3 รอบเหลือ 1 ใบ ชนะอีกฝ่ายห้ามครบ 3
     ใช้: A แพ้รอบ 1-2 (เหลือ 3), เสมอรอบ 3 (เหลือ 2), แพ้รอบ 4 → ลง 1 ทิ้ง 1 เหลือ 0 */
  const m = newMatch('GGGGRRX', 'RRRRGGX');
  playRound(m, 'a1', 'b1', 'a7');   // G<R : A แพ้ ทิ้ง a7 → A เหลือ 5, B: 6, wins B=1
  playRound(m, 'a2', 'b2', 'a6');   // G<R : A แพ้ ทิ้ง a6 → A เหลือ 3, B: 5, wins B=2
  playRound(m, 'a5', 'b5');         // R vs G : A ชนะ! B ต้องทิ้ง
  m.action('pb', { type: 'discard_card', cardInstanceId: 'b7' });
  /* A เหลือ 2 (a3,a4=G), B เหลือ 3 (b3,b4=R, b6=G), wins B=2 A=1 */
  playRound(m, 'a3', 'b3', 'a4');   // G<R : B ครบ 3 → จบทันที
  assert.equal(m.state.phase, PHASE.MATCH_RESULT);
  assert.equal(m.state.result.resultType, 'THREE_WINS');
});

test('Refresh restores correct state via snapshot; hidden choice stays hidden', () => {
  const m = newMatch();
  m.action('pa', { type: 'select_card', cardInstanceId: 'a3' });
  m.action('pa', { type: 'lock_choice' });
  const snap = m.toJSON();
  const m2 = MatchAuthority.restore(snap);
  const viewB = m2.viewFor('pb');
  assert.equal(viewB.phase, PHASE.ROUND_SELECT);
  assert.equal(viewB.opponent.locked, true);
  assert.ok(!JSON.stringify(viewB).includes('"a3"'));
  /* เล่นต่อจาก snapshot ได้ */
  m2.action('pb', { type: 'select_card', cardInstanceId: 'b1' });
  m2.action('pb', { type: 'lock_choice' });
  assert.equal(m2.state.rounds.length, 1);
});

test('Forfeit gives win to the other player', () => {
  const m = newMatch();
  assert.equal(m.action('pb', { type: 'forfeit' }).ok, true);
  assert.equal(m.state.result.winnerId, 'pa');
  assert.equal(m.state.result.resultType, 'FORFEIT');
});

test('Full-tie match ends as DRAW', () => {
  const m = newMatch('RRRRRRR', 'RRRRRRR');
  for (let i = 1; i <= 7; i++) playRound(m, `a${i}`, `b${i}`);
  assert.equal(m.state.phase, PHASE.MATCH_RESULT);
  assert.equal(m.state.result.draw, true);
  assert.equal(m.state.result.resultType, 'DRAW');
});

test('Final Gray: gray last card loses the match', () => {
  /* ทั้งคู่เสมอกัน 6 รอบแรก (สีเดียวกัน) รอบสุดท้าย A=GRAY B=RED */
  const m = newMatch('RRRRRRX', 'RRRRRRR');
  for (let i = 1; i <= 6; i++) playRound(m, `a${i}`, `b${i}`);
  playRound(m, 'a7', 'b7');   // GRAY vs RED — เสมอในรอบปกติ แต่เป็นใบสุดท้าย
  assert.equal(m.state.result.resultType, 'TIEBREAK_FINAL_GRAY');
  assert.equal(m.state.result.winnerId, 'pb');
});

test('History tiebreak on same-color final round', () => {
  /* รอบ 1: A ชนะ (R>G) → B ทิ้งเพิ่ม, ที่เหลือเสมอหมด, ปิดท้ายสีเดียวกัน */
  const m = newMatch('RGGGGXX', 'GGGGGXG');
  playRound(m, 'a1', 'b1', 'b7');            // R>G — A ชนะ, B ทิ้ง b7(G) → B เหลือ 5
  playRound(m, 'a2', 'b2');                   // G=G
  playRound(m, 'a3', 'b3');                   // G=G
  playRound(m, 'a4', 'b4');                   // G=G
  playRound(m, 'a5', 'b5');                   // G=G
  playRound(m, 'a6', 'b6');                   // X=X (GRAY vs GRAY)
  /* A เหลือ a7(X), B เหลือ 0?  A:7ใบ ลง6 เหลือ1 — B:7ใบ ลง6 ทิ้ง1 เหลือ0
     B หมดมือก่อน → Priority 2: A ชนะแบบ EXHAUSTION ก่อนถึงรอบสุดท้าย */
  assert.equal(m.state.phase, PHASE.MATCH_RESULT);
  assert.equal(m.state.result.resultType, 'EXHAUSTION');
  assert.equal(m.state.result.winnerId, 'pa');
});

test('History tiebreak proper: both empty on same-color final', () => {
  /* ให้ A ชนะรอบแรก แล้วจบด้วยเสมอทุกใบ ทั้งคู่หมดพร้อมกัน
     A: 7 ใบ ลงครบ 7 — B: ลง 6 + ทิ้ง 1 = 7
     รอบสุดท้ายสีเดียวกัน → ย้อนประวัติ → A ชนะรอบ 1 */
  const m = newMatch('RGGGGGG', 'GGGGGGG');
  playRound(m, 'a1', 'b1', 'b2');   // R>G, B ทิ้ง b2 → A:6 B:5
  playRound(m, 'a2', 'b3');          // G=G  A:5 B:4
  playRound(m, 'a3', 'b4');          // G=G  A:4 B:3
  playRound(m, 'a4', 'b5');          // G=G  A:3 B:2
  playRound(m, 'a5', 'b6');          // G=G  A:2 B:1
  playRound(m, 'a6', 'b7');          // G=G  A:1 B:0 → B หมด → EXHAUSTION อีกแล้ว
  assert.equal(m.state.result.resultType, 'EXHAUSTION');
});

test('History tiebreak: constructed genuine both-empty case', () => {
  /* ทางเดียวที่ทั้งคู่หมดพร้อมกันโดยมีรอบชนะในประวัติ:
     ฝ่ายชนะรอบต้องเป็นฝ่ายที่การ์ดหมดทีหลังพอดี
     A ชนะ 1 รอบ (B เสีย 2) และ B ชนะ 1 รอบ (A เสีย 2) ที่เหลือเสมอ:
     A: ลง 6 + ทิ้ง 1 = 7, B: ลง 6 + ทิ้ง 1 = 7 → รอบที่ 6 คือรอบสุดท้าย */
  const m = newMatch('RGGGGGG', 'GRGGGGG');
  playRound(m, 'a1', 'b1', 'b7');   // R>G — A ชนะ, B ทิ้ง → A:6 B:5
  playRound(m, 'a2', 'b2', 'a7');   // G<R — B ชนะ, A ทิ้ง → A:4 B:4
  playRound(m, 'a3', 'b3');          // G=G → A:3 B:3
  playRound(m, 'a4', 'b4');          // G=G → A:2 B:2
  playRound(m, 'a5', 'b5');          // G=G → A:1 B:1
  playRound(m, 'a6', 'b6');          // G=G → A:0 B:0 ทั้งคู่หมดพร้อมกัน
  assert.equal(m.state.phase, PHASE.MATCH_RESULT);
  assert.equal(m.state.result.resultType, 'TIEBREAK_HISTORY');
  /* ย้อนจากท้าย: รอบ 2 B ชนะ ก่อนถึงรอบ 1 → B ชนะ Match */
  assert.equal(m.state.result.winnerId, 'pb');
});

/* ── Bot integration: บอทเล่นกันเองจนจบ ทุกระดับ ─ deterministic ── */
for (const level of ['easy', 'hard']) {
  test(`Bot (${level}) can finish 50 seeded matches without stalling`, () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = seededRng(seed * 7919);
      const m = new MatchAuthority({
        matchId: `bot-${level}-${seed}`,
        players: {
          a: { id: 'pa', name: 'A', cards: Core7Bot.buildHand(rng) },
          b: { id: 'pb', name: 'B', cards: Core7Bot.buildHand(rng) },
        },
      });
      const botA = new Core7Bot({ level, seed });
      const botB = new Core7Bot({ level, seed: seed + 1 });
      let guard = 0;
      while (m.state.phase !== PHASE.MATCH_RESULT && guard++ < 40) {
        if (m.state.phase === PHASE.ROUND_SELECT) {
          const va = m.viewFor('pa'), vb = m.viewFor('pb');
          if (!va.you.locked) {
            m.action('pa', { type: 'select_card', cardInstanceId: botA.chooseCard(va) });
            m.action('pa', { type: 'lock_choice' });
          }
          if (m.state.phase === PHASE.ROUND_SELECT && !vb.you.locked) {
            m.action('pb', { type: 'select_card', cardInstanceId: botB.chooseCard(vb) });
            m.action('pb', { type: 'lock_choice' });
          }
        } else if (m.state.phase === PHASE.DISCARD_REQUIRED) {
          const seat = m.state.discardBy;
          const pid = seat === 'a' ? 'pa' : 'pb';
          const bot = seat === 'a' ? botA : botB;
          m.action(pid, { type: 'discard_card', cardInstanceId: bot.chooseDiscard(m.viewFor(pid)) });
        }
      }
      assert.equal(m.state.phase, PHASE.MATCH_RESULT, `seed ${seed} stalled`);
      assert.ok(m.state.result.resultType);
    }
  });
}

test('v0.4 uses 28 full-bleed FIRST HAND cards and 4 Generic cards', () => {
  assert.equal(CORE7_ART_VERSION, '0.4.0');
  assert.equal(Object.keys(FIRST_HAND_ART).length, 28);
  assert.equal(Object.keys(GENERIC_CARD_ART).length, 4);
  for (const [cardId, href] of Object.entries(FIRST_HAND_ART)) {
    const svg = cardSVG(cardId);
    assert.match(svg, new RegExp(`href="${href}"`));
    assert.doesNotMatch(svg, /ART v/);
  }
  for (const [color, href] of Object.entries(GENERIC_CARD_ART)) {
    assert.match(genericCardSVG(color), new RegExp(`href="${href}"`));
  }
  assert.equal(FIRST_HAND.length, 28);
  for (const card of FIRST_HAND) assert.ok(sceneSVG(card.id).length > 80, card.id);
});
