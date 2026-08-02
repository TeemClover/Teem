/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Rules Engine
   Pure functions เท่านั้น ห้ามมี UI / Network / Storage ในไฟล์นี้

   กติกาฉบับล็อก:
   🔴 RED  > 🟢 GREEN > 🔵 BLUE > 🔴 RED   ⚙️ GRAY = เสมอทุกสี
   ผู้ชนะ Round เสีย 1 ใบ (ใบที่ลง) — ผู้แพ้เสีย 2 ใบ (ใบที่ลง + ทิ้งเพิ่ม 1)
   เสมอ: เสียคนละ 1 ใบ ไม่มี Round Win

   จบ Match ตามลำดับ:
   1) Round Win ครบ 3
   2) เหลือการ์ดฝ่ายเดียว
   3) หมดมือพร้อมกัน → Tie Break (§6 ของ Brief)
   ═══════════════════════════════════════════════════════════════ */

export const CORE7_RULES_VERSION = '1.0.0';

export const COLORS = ['RED', 'GREEN', 'BLUE', 'GRAY'];

/* สีที่ชนะ → สีที่แพ้ (วงจรปกติ) */
const BEATS = { RED: 'GREEN', GREEN: 'BLUE', BLUE: 'RED' };

export const ROUND_RESULT = { A: 'A', B: 'B', TIE: 'TIE' };

export const MATCH_RESULT_TYPE = {
  THREE_WINS: 'THREE_WINS',           // ชนะครบ 3 Round
  EXHAUSTION: 'EXHAUSTION',           // อีกฝ่ายไม่มีการ์ดเหลือ
  LAST_ROUND: 'TIEBREAK_LAST_ROUND',  // หมดมือพร้อมกัน — รอบสุดท้ายชี้ขาด
  FINAL_GRAY: 'TIEBREAK_FINAL_GRAY',  // หมดมือพร้อมกัน — กฎ Final Gray
  HISTORY: 'TIEBREAK_HISTORY',        // หมดมือพร้อมกัน — ย้อนประวัติ
  DRAW: 'DRAW',                       // เสมอทุก Round
  FORFEIT: 'FORFEIT',
  DISCONNECT: 'DISCONNECT_LOSS',
};

export function isValidColor(c) {
  return COLORS.includes(c);
}

/* ── resolveColor(a, b) → 'A' | 'B' | 'TIE' ──
   ผล Round ปกติจากสี 2 ใบ — GRAY เสมอกับทุกสีเสมอ */
export function resolveColor(a, b) {
  if (!isValidColor(a) || !isValidColor(b)) {
    throw new Error(`invalid color: ${a} vs ${b}`);
  }
  if (a === b) return ROUND_RESULT.TIE;
  if (a === 'GRAY' || b === 'GRAY') return ROUND_RESULT.TIE;
  if (BEATS[a] === b) return ROUND_RESULT.A;
  if (BEATS[b] === a) return ROUND_RESULT.B;
  /* unreachable ถ้าตาราง BEATS ครบวงจร */
  throw new Error(`unresolvable: ${a} vs ${b}`);
}

/* ── resolveRound(choices) ──
   choices = { a: COLOR, b: COLOR }
   คืนคำอธิบายผลของ Round: ใครชนะ ใครต้องทิ้งเพิ่ม
   (การตัดการ์ดออกจากมือเป็นหน้าที่ของ Match Engine ไม่ใช่ไฟล์นี้) */
export function resolveRound(choices) {
  const result = resolveColor(choices.a, choices.b);
  return {
    result,                                       // 'A' | 'B' | 'TIE'
    winner: result === 'TIE' ? null : result,
    loser: result === 'A' ? 'B' : result === 'B' ? 'A' : null,
    /* ผู้แพ้ต้องทิ้งเพิ่ม 1 ใบ — เฉพาะเมื่อมีผู้แพ้ และมือยังมีการ์ดเหลือ
       (เงื่อนไขมือเหลือ ให้ Engine ตรวจตอนสั่ง เพราะ rules ไม่ถือ state) */
    loserMustDiscard: result !== 'TIE',
  };
}

/* ── checkThreeWins(roundWins) ──
   roundWins = { a: number, b: number } → 'A' | 'B' | null */
export function checkThreeWins(roundWins) {
  if (roundWins.a >= 3) return 'A';
  if (roundWins.b >= 3) return 'B';
  return null;
}

/* ── checkHandExhaustion(handCounts) ──
   handCounts = { a: number, b: number }
   → { done: bool, winner: 'A'|'B'|null, both: bool } */
export function checkHandExhaustion(handCounts) {
  const aEmpty = handCounts.a <= 0;
  const bEmpty = handCounts.b <= 0;
  if (aEmpty && bEmpty) return { done: true, winner: null, both: true };
  if (aEmpty) return { done: true, winner: 'B', both: false };
  if (bEmpty) return { done: true, winner: 'A', both: false };
  return { done: false, winner: null, both: false };
}

/* ── resolveFinalGray(lastRound) ──
   ใช้เมื่อหมดมือพร้อมกันและรอบสุดท้ายมี GRAY ปน:
   GRAY แพ้ทุกสีที่ไม่ใช่ GRAY เฉพาะใบสุดท้ายเท่านั้น
   lastRound = { a: COLOR, b: COLOR } → 'A' | 'B' | null (null = ไม่เข้าเงื่อนไข) */
export function resolveFinalGray(lastRound) {
  const { a, b } = lastRound;
  if (a === 'GRAY' && b !== 'GRAY') return 'B';
  if (b === 'GRAY' && a !== 'GRAY') return 'A';
  return null;
}

/* ── resolveHistoryTiebreak(rounds) ──
   ย้อนประวัติจากล่าสุด → เก่าสุด ข้ามรอบเสมอ
   rounds = [{ result: 'A'|'B'|'TIE' }, ...] เรียงตามลำดับการเล่น
   → 'A' | 'B' | null (null = เสมอทุกรอบ) */
export function resolveHistoryTiebreak(rounds) {
  for (let i = rounds.length - 1; i >= 0; i--) {
    if (rounds[i].result === ROUND_RESULT.A) return 'A';
    if (rounds[i].result === ROUND_RESULT.B) return 'B';
  }
  return null;
}

/* ── resolveMatch(state) ──
   ตรวจเงื่อนไขจบ Match หลังจบ Resolution ของแต่ละ Round ตามลำดับ Priority
   state = {
     roundWins: { a, b },
     handCounts: { a, b },
     rounds: [{ a: COLOR, b: COLOR, result }],   // ประวัติทุกรอบที่จบแล้ว
   }
   → null (ยังไม่จบ) หรือ
     { winner: 'A'|'B'|null, resultType, draw: bool } */
export function resolveMatch(state) {
  /* Priority 1 — ชนะครบ 3 Round */
  const three = checkThreeWins(state.roundWins);
  if (three) return { winner: three, resultType: MATCH_RESULT_TYPE.THREE_WINS, draw: false };

  const ex = checkHandExhaustion(state.handCounts);
  if (!ex.done) return null;

  /* Priority 2 — เหลือการ์ดฝ่ายเดียว */
  if (!ex.both) return { winner: ex.winner, resultType: MATCH_RESULT_TYPE.EXHAUSTION, draw: false };

  /* Priority 3 — หมดมือพร้อมกัน → Tie Break */
  const last = state.rounds[state.rounds.length - 1];

  /* 6.1 รอบสุดท้ายมีผู้ชนะตามวงสีปกติ */
  if (last.result === ROUND_RESULT.A || last.result === ROUND_RESULT.B) {
    return { winner: last.result, resultType: MATCH_RESULT_TYPE.LAST_ROUND, draw: false };
  }

  /* 6.2 Final Gray — GRAY แพ้สีอื่นเมื่อเป็นใบสุดท้ายของทั้งคู่ */
  const fg = resolveFinalGray(last);
  if (fg) return { winner: fg, resultType: MATCH_RESULT_TYPE.FINAL_GRAY, draw: false };

  /* 6.3 รอบสุดท้ายสีเดียวกัน (รวม GRAY vs GRAY) → ย้อนประวัติ */
  const hist = resolveHistoryTiebreak(state.rounds);
  if (hist) return { winner: hist, resultType: MATCH_RESULT_TYPE.HISTORY, draw: false };

  /* 6.4 เสมอทุก Round → DRAW (ผลจริง ไม่ใช่ Error) */
  return { winner: null, resultType: MATCH_RESULT_TYPE.DRAW, draw: true };
}

/* ── validateHand(colors) ──
   มือต้องมี 7 ใบพอดี และทุกใบเป็นสีที่ถูกต้อง */
export const HAND_SIZE = 7;

export function validateHand(colors) {
  if (!Array.isArray(colors) || colors.length !== HAND_SIZE) {
    return { ok: false, reason: 'HAND_MUST_HAVE_7' };
  }
  if (!colors.every(isValidColor)) {
    return { ok: false, reason: 'INVALID_COLOR' };
  }
  return { ok: true };
}
