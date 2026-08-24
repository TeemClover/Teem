/* TeamBook 1.5 — canonical per-book people capacity for client renderers.

   The server is the only place allowed to apply the historical fallback:
   old books without memberLimit are 5-person books. Client renderers must
   never guess 5, because doing so caused a correct 1..11 value to flash and
   then be overwritten by a legacy N/5 fallback.
*/

import { MAX_MEMBER_LIMIT, MIN_MEMBER_LIMIT } from './member-limit.js';

export const TEAMBOOK_MEMBER_LIMIT_MAX = MAX_MEMBER_LIMIT;

export function bookCapacity(book = {}) {
  const memberCount = Math.max(0, Math.floor(Number(book.memberCount ?? book.member_count ?? 0)) || 0);
  const rawLimit = book.maxMembers ?? book.memberLimit ?? book.member_limit;
  const memberLimit = Math.floor(Number(rawLimit));

  if (!Number.isFinite(memberLimit)
      || memberLimit < MIN_MEMBER_LIMIT
      || memberLimit > TEAMBOOK_MEMBER_LIMIT_MAX) {
    return null;
  }

  return Object.freeze({
    memberCount,
    memberLimit,
    remaining: Math.max(0, memberLimit - memberCount),
    full: memberCount >= memberLimit,
  });
}

export function requireBookCapacity(book = {}) {
  const capacity = bookCapacity(book);
  if (capacity) return capacity;
  const error = new Error('BOOK_CAPACITY_MISSING');
  error.code = 'BOOK_CAPACITY_MISSING';
  throw error;
}
