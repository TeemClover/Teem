/* ═══════════════════════════════════════════════════════════════
   TeamBook — how a finished book is cut into episodes

   A book is told in episodes of seven days. Every seven full days earns
   one episode sauce, and every book that reaches its end earns one
   closing cover regardless of length — the cover is what a book is
   remembered by, so a short book still gets to be a book.

     3 วัน  → 0 ตอน + ปกปิดท้าย
     7 วัน  → 1 ตอน + ปกปิดท้าย
     14 วัน → 2 ตอน + ปกปิดท้าย
     28 วัน → 4 ตอน + ปกปิดท้าย

   Under seven days there is not enough lived material for the companion
   to claim an arc. The plan says so rather than pretending: the closing
   cover is written to be continued, which is both the honest reading and
   the one that leaves a door open to volume two.

   This lives in _shared because the page and the server must cut the
   same book the same way. api/_lib/xty-rules.js re-exports it.
   ═══════════════════════════════════════════════════════════════ */

export const EPISODE_DAYS = 7;
export const COVER_CANDIDATES = 3;

export function endingPlan(durationDays) {
  const days = Math.max(1, Math.floor(Number(durationDays) || 0));
  const episodes = Math.floor(days / EPISODE_DAYS);
  const episodeRanges = Array.from({ length: episodes }, (_, index) => Object.freeze({
    episode: index + 1,
    fromDay: index * EPISODE_DAYS + 1,
    toDay: (index + 1) * EPISODE_DAYS,
  }));
  /* Days past the last whole episode are not an episode of their own; they
     belong to the closing cover, so nothing a person lived falls outside
     the ending. */
  const tailFromDay = episodes * EPISODE_DAYS + 1;
  return Object.freeze({
    days,
    episodes,
    episodeRanges: Object.freeze(episodeRanges),
    tailDays: days >= tailFromDay ? Object.freeze({ fromDay: tailFromDay, toDay: days }) : null,
    closingCover: true,
    coverCandidates: COVER_CANDIDATES,
    /* Only the closing cover may be chosen as the book's cover. Episode art
       is allowed speech in the picture; a cover carrying baked-in words
       cannot serve as the spine of a book. */
    coverEligible: 'closing',
    episodeArtAllowsSpeech: true,
    coverArtAllowsSpeech: false,
    toBeContinued: episodes === 0,
  });
}

/* Which episode a given party day belongs to, or 0 for the tail that the
   closing cover carries. */
export function episodeOfDay(day, plan) {
  const number = Math.max(1, Math.floor(Number(day) || 1));
  const found = plan.episodeRanges.find(range => number >= range.fromDay && number <= range.toDay);
  return found ? found.episode : 0;
}
