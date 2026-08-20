export const TEAMBOOK_TIMEZONE = 'Asia/Bangkok';
export const TEAMBOOK_TIMEZONE_OFFSET_MINUTES = 7 * 60;
export const TEAMBOOK_DEFAULT_DURATION_DAYS = 7;

/* A day's message is meant to be readable in a glance, so the whole book
   stays catchable-up in a minute and never accrues reading debt. 120 is the
   locked product number, not a storage limit — the column is TEXT. The client
   shows a counter against the same constant; both sides must agree, so this
   is the one place it is written down. */
export const MESSAGE_MAX_CHARS = 120;

/* The episode/cover ladder lives in xty/_shared so the page and the server
   cut the same book the same way. Re-exported here because this is where
   the rest of the party rules are looked up. */
export { COVER_CANDIDATES, EPISODE_DAYS, endingPlan, episodeOfDay } from '../../_shared/ending-plan.js';

function validDate(value, fallback = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value || fallback);
  return Number.isFinite(date.getTime()) ? date : new Date(fallback);
}

function offsetFor(timezone) {
  /* TeamBook v0.5 launches with an ICT party-day boundary. Keep the timezone
     field durable, but fail safely to the locked launch zone instead of
     guessing daylight-saving rules for an unsupported value. */
  return timezone === TEAMBOOK_TIMEZONE ? TEAMBOOK_TIMEZONE_OFFSET_MINUTES : TEAMBOOK_TIMEZONE_OFFSET_MINUTES;
}

export function normalizeVerificationMode(value) {
  return String(value || '').toLowerCase() === 'confirm' ? 'confirm' : 'trust';
}

export function validPartyCode(value) {
  return /^\d{5}$/.test(String(value || ''));
}

export function partyDateKey(value = new Date(), timezone = TEAMBOOK_TIMEZONE) {
  const shifted = validDate(value);
  shifted.setTime(shifted.getTime() + offsetFor(timezone) * 60000);
  return shifted.toISOString().slice(0, 10);
}

export function startOfPartyDay(value = new Date(), timezone = TEAMBOOK_TIMEZONE) {
  const date = validDate(value);
  const offset = offsetFor(timezone) * 60000;
  const shifted = new Date(date.getTime() + offset);
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(utcMidnight - offset);
}

export function scheduledEndAt(startedAt, durationDays = TEAMBOOK_DEFAULT_DURATION_DAYS, timezone = TEAMBOOK_TIMEZONE) {
  const days = Math.max(1, Math.floor(Number(durationDays) || TEAMBOOK_DEFAULT_DURATION_DAYS));
  /* A Quest is counted in party days, not in elapsed hours, and every
     boundary in TeamBook is the same midnight: a 7-day Quest opened at any time
     on day 1 ends at midnight after day 7. Players can then answer "which
     day are we on" by looking at a calendar instead of at a clock. */
  return new Date(startOfPartyDay(startedAt, timezone).getTime() + days * 86400000);
}

export function partyDayNumber(startedAt, at = new Date(), timezone = TEAMBOOK_TIMEZONE) {
  const start = startOfPartyDay(startedAt, timezone).getTime();
  const current = startOfPartyDay(at, timezone).getTime();
  return Math.max(1, Math.floor((current - start) / 86400000) + 1);
}

export function confirmDeadlineForDayKey(dayKey, timezone = TEAMBOOK_TIMEZONE) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''));
  if (!match) return null;
  const offset = offsetFor(timezone) * 60000;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 2) - offset);
}

export function completionGate(party, at = new Date()) {
  const now = validDate(at);
  const startedAt = validDate(
    party?.started_at || party?.startedAt || party?.startAt || party?.created_at || party?.createdAt,
    now,
  );
  const durationDays = Math.max(1, Number(party?.duration_days || party?.durationDays || TEAMBOOK_DEFAULT_DURATION_DAYS));
  const strictEnd = scheduledEndAt(startedAt, durationDays, party?.timezone || TEAMBOOK_TIMEZONE);
  const storedValue = party?.scheduled_end_at || party?.scheduledEndAt;
  const storedEnd = storedValue ? validDate(storedValue, strictEnd) : strictEnd;
  /* Parties created while the rule was elapsed-hours carry a later
     scheduled_end_at than the midnight rule produces. Honour the earlier of
     the two so nobody's running Quest gets pushed further away by the
     change; new parties are on the midnight rule from creation. */
  const end = new Date(Math.min(strictEnd.getTime(), storedEnd.getTime()));
  const day = Math.min(durationDays, partyDayNumber(
    startedAt,
    now,
    party?.timezone || TEAMBOOK_TIMEZONE,
  ));
  return {
    eligible: now.getTime() >= end.getTime(),
    scheduledEndAt: end.toISOString(),
    day,
    durationDays,
    remainingMs: Math.max(0, end.getTime() - now.getTime()),
  };
}
