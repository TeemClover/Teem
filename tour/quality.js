// One light renderer: adapt resolution only, without rebuilding the house or adding effects.
export const PIXEL_LEVELS = [1.25, 1.1, 0.9, 0.75];

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
  if (g.slow >= 0.65 && g.level < PIXEL_LEVELS.length - 1) {
    g.level++; g.slow = g.fast = 0; g.cooldown = 15; return true;
  }
  if (!g.cooldown && g.fast >= 10 && g.level > 0) {
    g.level--; g.slow = g.fast = 0; g.cooldown = 15; return true;
  }
  return false;
}

export function pixelRatio({width, height, dpr, mobile, level = 1}) {
  const cap = Math.min(PIXEL_LEVELS[level], mobile ? 1 : 1.25);
  // Cap total pixels as well as DPR: large screens should not overwhelm the GPU.
  const budget = mobile ? 1_000_000 : 1_800_000;
  return Math.min(dpr || 1, cap, Math.sqrt(budget / Math.max(1, width * height)));
}
