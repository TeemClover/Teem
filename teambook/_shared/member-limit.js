/* One capacity contract for every TeamBook surface.
   The owner is included. Books created before memberLimit existed keep the
   historical default of five; every new value is clamped to 1..11. */

export const MIN_MEMBER_LIMIT = 1;
export const MAX_MEMBER_LIMIT = 11;
export const DEFAULT_MEMBER_LIMIT = 5;

export function normalizeMemberLimit(value, fallback = DEFAULT_MEMBER_LIMIT) {
  const fallbackNumber = Math.floor(Number(fallback));
  const safeFallback = Number.isFinite(fallbackNumber)
    ? Math.min(MAX_MEMBER_LIMIT, Math.max(MIN_MEMBER_LIMIT, fallbackNumber))
    : DEFAULT_MEMBER_LIMIT;
  if (value === '' || value == null) return safeFallback;
  const wanted = Math.floor(Number(value));
  return Number.isFinite(wanted)
    ? Math.min(MAX_MEMBER_LIMIT, Math.max(MIN_MEMBER_LIMIT, wanted))
    : safeFallback;
}
