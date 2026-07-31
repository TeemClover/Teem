/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Ranking Logic (Glicko-2)

   ใช้กับ Ranked Match เท่านั้น (Official Queue):
   - Casual / Bot / Private Room ไม่เรียกไฟล์นี้เด็ดขาด
   - Draw ใช้ score 0.5 ตามกติกา §6.4
   - ค่า Config แยกไว้ให้ปรับได้โดยไม่แก้สูตร

   อ้างอิงสูตรจาก Glickman, "Example of the Glicko-2 system" (public domain)
   ═══════════════════════════════════════════════════════════════ */

export const GLICKO_CONFIG = {
  initialRating: 1500,
  initialRD: 350,
  initialVolatility: 0.06,
  tau: 0.5,               // ความไวของ volatility
  epsilon: 1e-6,
};

export const TIERS = [
  { name: 'SEED', th: 'เมล็ด', min: -Infinity },
  { name: 'ROOT', th: 'ราก', min: 1300 },
  { name: 'SPROUT', th: 'ต้นอ่อน', min: 1450 },
  { name: 'LEAF', th: 'ใบ', min: 1600 },
  { name: 'BLOOM', th: 'ผลิบาน', min: 1750 },
  { name: 'FOUR-LEAF', th: 'สี่แฉก', min: 1900 },
];

export function tierOf(rating) {
  let t = TIERS[0];
  for (const tier of TIERS) if (rating >= tier.min) t = tier;
  return t;
}

export function newRating() {
  return {
    rating: GLICKO_CONFIG.initialRating,
    rd: GLICKO_CONFIG.initialRD,
    volatility: GLICKO_CONFIG.initialVolatility,
  };
}

const SCALE = 173.7178;
const toMu = r => (r - 1500) / SCALE;
const toPhi = rd => rd / SCALE;
const g = phi => 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
const E = (mu, muJ, phiJ) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/* อัปเดต Rating ของผู้เล่น 1 คน จากผล 1 ชุด (โดยทั่วไป 1 Match ต่อครั้ง)
   results = [{ rating, rd, score }] — score: 1 ชนะ, 0.5 เสมอ, 0 แพ้ */
export function updateRating(player, results, cfg = GLICKO_CONFIG) {
  if (results.length === 0) {
    /* ไม่มีเกมในช่วงเวลา: RD ขยายตาม volatility (ผู้เล่นหายไปนาน) */
    const phi = toPhi(player.rd);
    const newPhi = Math.sqrt(phi * phi + player.volatility * player.volatility);
    return { ...player, rd: Math.min(newPhi * SCALE, cfg.initialRD) };
  }
  const mu = toMu(player.rating);
  const phi = toPhi(player.rd);

  let vInv = 0, deltaSum = 0;
  for (const r of results) {
    const muJ = toMu(r.rating), phiJ = toPhi(r.rd);
    const e = E(mu, muJ, phiJ), gj = g(phiJ);
    vInv += gj * gj * e * (1 - e);
    deltaSum += gj * (r.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  /* หา volatility ใหม่ (Illinois algorithm) */
  const a = Math.log(player.volatility * player.volatility);
  const f = x => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * Math.pow(phi * phi + v + ex, 2);
    return num / den - (x - a) / (cfg.tau * cfg.tau);
  };
  let A = a, B;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * cfg.tau) < 0) k++;
    B = a - k * cfg.tau;
  }
  let fA = f(A), fB = f(B);
  while (Math.abs(B - A) > cfg.epsilon) {
    const C = A + (A - B) * fA / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else { fA = fA / 2; }
    B = C; fB = fC;
  }
  const newVol = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + newVol * newVol);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  return {
    rating: Math.round((newMu * SCALE + 1500) * 100) / 100,
    rd: Math.round(newPhi * SCALE * 100) / 100,
    volatility: newVol,
  };
}

/* ผล Match → score ของ Glicko-2 (Brief §21) */
export function scoreOf(resultForPlayer /* 'WIN'|'LOSS'|'DRAW'|'FORFEIT_WIN'|'FORFEIT_LOSS' */) {
  switch (resultForPlayer) {
    case 'WIN': case 'FORFEIT_WIN': return 1;
    case 'DRAW': return 0.5;
    case 'LOSS': case 'FORFEIT_LOSS': case 'DISCONNECT_LOSS': return 0;
    default: return null;   // CANCELLED → ไม่คิด Rating
  }
}
