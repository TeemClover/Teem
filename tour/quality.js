// Prefer a stable frame budget to expensive full-screen effects. HD surface detail stays on.
export const HD_LEVELS = [
  {ratio: 1.5, ao: true, bloom: true},
  {ratio: 1.35, ao: false, bloom: true},
  {ratio: 1.1, ao: false, bloom: false},
  {ratio: 0.85, ao: false, bloom: false},
];

export function createGovernor(mobile = false) {
  return {level: mobile ? 2 : 1, ema: 1 / 60, slow: 0, fast: 0, cooldown: 2};
}

export function updateGovernor(g, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  // Slow devices can take >250 ms per frame; those samples must not be discarded.
  const dt = Math.min(seconds, 0.5);
  g.ema += (dt - g.ema) * 0.12;
  g.cooldown = Math.max(0, g.cooldown - dt);
  g.slow = g.ema > 1 / 48 ? g.slow + dt : 0;
  g.fast = g.ema < 1 / 59 ? g.fast + dt : 0;
  if (g.slow >= 0.65 && g.level < HD_LEVELS.length - 1) {
    g.level++; g.slow = g.fast = 0; g.cooldown = 15; return true;
  }
  if (!g.cooldown && g.fast >= 10 && g.level > 0) {
    g.level--; g.slow = g.fast = 0; g.cooldown = 15; return true;
  }
  return false;
}

export function pixelRatio({width, height, dpr, hd, mobile, level}) {
  const cap = hd ? HD_LEVELS[level].ratio : (mobile ? 1.25 : 1.5);
  // Cap total pixels as well as DPR: a 4K desktop must not allocate several huge HDR targets.
  const budget = mobile ? 1_300_000 : 2_400_000;
  return Math.min(dpr || 1, cap, Math.sqrt(budget / Math.max(1, width * height)));
}
