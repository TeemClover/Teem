export * from './game-commercial-config.js?v7legacy';
import * as legacy from './game-commercial-config.js?v7legacy';

export const BREAKAWAY_INCOME_RULE = Object.freeze({
  ...legacy.BREAKAWAY_INCOME_RULE,
  id: 'breakaway-disabled-v8',
  rate: 0,
  status: legacy.COMMERCIAL_STATUS?.NOT_FOR_SALE || 'NOT_FOR_SALE',
});

export function getRetailTier(personalXV) {
  const amount = Math.max(0, Number(personalXV || 0));
  return legacy.INCOME_RULE.tiers.find((tier) => tier.max == null || amount <= tier.max)
    || legacy.INCOME_RULE.tiers[0];
}
