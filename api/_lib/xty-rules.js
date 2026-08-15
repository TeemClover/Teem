export const XTY_TIMEZONE = 'Asia/Bangkok';
export const XTY_TIMEZONE_OFFSET_MINUTES = 7 * 60;
export const XTY_DEFAULT_DURATION_DAYS = 7;

function validDate(value, fallback = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value || fallback);
  return Number.isFinite(date.getTime()) ? date : new Date(fallback);
}

function offsetFor(timezone) {
  /* XTY v0.5 launches with an ICT party-day boundary. Keep the timezone
     field durable, but fail safely to the locked launch zone instead of
     guessing daylight-saving rules for an unsupported value. */
  return timezone === XTY_TIMEZONE ? XTY_TIMEZONE_OFFSET_MINUTES : XTY_TIMEZONE_OFFSET_MINUTES;
}

export function normalizeVerificationMode(value) {
  return String(value || '').toLowerCase() === 'confirm' ? 'confirm' : 'trust';
}

export function validPartyCode(value) {
  return /^\d{5}$/.test(String(value || ''));
}

export function partyDateKey(value = new Date(), timezone = XTY_TIMEZONE) {
  const shifted = validDate(value);
  shifted.setTime(shifted.getTime() + offsetFor(timezone) * 60000);
  return shifted.toISOString().slice(0, 10);
}

export function startOfPartyDay(value = new Date(), timezone = XTY_TIMEZONE) {
  const date = validDate(value);
  const offset = offsetFor(timezone) * 60000;
  const shifted = new Date(date.getTime() + offset);
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(utcMidnight - offset);
}

export function scheduledEndAt(startedAt, durationDays = XTY_DEFAULT_DURATION_DAYS, timezone = XTY_TIMEZONE) {
  const days = Math.max(1, Math.floor(Number(durationDays) || XTY_DEFAULT_DURATION_DAYS));
  return new Date(startOfPartyDay(startedAt, timezone).getTime() + days * 86400000);
}

export function partyDayNumber(startedAt, at = new Date(), timezone = XTY_TIMEZONE) {
  const start = startOfPartyDay(startedAt, timezone).getTime();
  const current = startOfPartyDay(at, timezone).getTime();
  return Math.max(1, Math.floor((current - start) / 86400000) + 1);
}

export function confirmDeadlineForDayKey(dayKey, timezone = XTY_TIMEZONE) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''));
  if (!match) return null;
  const offset = offsetFor(timezone) * 60000;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 2) - offset);
}

export function completionGate(party, at = new Date()) {
  const now = validDate(at);
  const end = party?.scheduled_end_at || party?.scheduledEndAt
    ? validDate(party.scheduled_end_at || party.scheduledEndAt)
    : scheduledEndAt(
      party?.started_at || party?.startedAt || party?.startAt || party?.created_at || party?.createdAt,
      party?.duration_days || party?.durationDays,
      party?.timezone || XTY_TIMEZONE,
    );
  const durationDays = Math.max(1, Number(party?.duration_days || party?.durationDays || XTY_DEFAULT_DURATION_DAYS));
  const day = Math.min(durationDays, partyDayNumber(
    party?.started_at || party?.startedAt || party?.startAt || party?.created_at || party?.createdAt,
    now,
    party?.timezone || XTY_TIMEZONE,
  ));
  return {
    eligible: now.getTime() >= end.getTime(),
    scheduledEndAt: end.toISOString(),
    day,
    durationDays,
    remainingMs: Math.max(0, end.getTime() - now.getTime()),
  };
}
