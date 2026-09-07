/** Universe Telemetry V2 — shared by browser, collector and Stat. No side effects. */
export const ANALYTICS_VERSION = '2.0.0';
export const EXPERIENCE_VERSION = 'frontdoor-2026.09-v1';
export const MAX_PAYLOAD_BYTES = 8192;
export const SCOPES = Object.freeze(['event', 'journey', 'installation']);
export const SOURCES = Object.freeze(['direct', 'astra-post', 'facebook', 'instagram', 'line', 'dm', 'qr', 'door-share', 'teambook', 'search', 'unknown']);
export const ENVIRONMENTS = Object.freeze(['local', 'preview', 'prod']);
export const VISITOR_CLASSES = Object.freeze(['new', 'legacy', 'returning-frontdoor', 'returning-room', 'veteran']);
export const INTENTS = Object.freeze(['self', 'build', 'people', 'income', 'curious']);
export const SECONDARY_INTENTS = Object.freeze(['see', 'repeat', 'human-help', 'proof', 'learn', 'improve', 'help', 'system', 'together', 'skill', 'business', 'structured-work', 'urgent', 'anomaly']);
export const DOORS = Object.freeze(['dungeon', 'classroom', 'hall', 'xircle', 'routinex', 'meet', 'xvisor', 'teambook']);
export const VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);
export const GRAPHICS_TIERS = Object.freeze(['essential', 'premium', 'cinematic']);
export const MOTIONS = Object.freeze(['full', 'reduced']);
export const AUDIO_STATES = Object.freeze(['unavailable', 'available', 'enabled', 'muted']);
export const EVENTS = Object.freeze(Object.fromEntries([
  ['FRONTDOOR_OPEN', 'เปิด Front Door', 'event'],
  ['FRONTDOOR_CHOICE', 'แตะครั้งแรก', 'event'],
  ['FRONTDOOR_REACTION_COMPLETE', 'เว็บตอบสนองแล้ว', 'journey'],
  ['LUCKY_RETURN', 'ได้รับคุณค่า', 'journey'],
  ['REWARD_HORIZON', 'เห็นสิ่งที่รออยู่', 'journey'],
  ['DOOR_FOUND', 'พบประตู', 'journey'],
  ['SAVE', 'บันทึกสำเร็จ', 'journey'],
  ['DOOR_OPEN', 'เปิดประตู', 'event'],
  ['RETURN', 'กลับมา', 'event'],
  ['RESUME', 'ไปต่อ', 'event'],
  ['REBUILD', 'ประกอบใหม่', 'event'],
  ['FRONTDOOR_FREE_ROAM', 'สำรวจบ้าน', 'event'],
  ['ANOMALY_START', 'พบความผิดปกติ', 'journey'],
  ['LEGACY_WARNING', 'เห็นคำเตือนเก่า', 'journey'],
  ['DUNGEON_HANDOFF', 'ออกเดินทางไป Dungeon', 'event'],
].map(([name, label, scope]) => [name, Object.freeze({ name, label, scope })])));
export const PRIMARY_EVENTS = Object.freeze(['FRONTDOOR_OPEN', 'FRONTDOOR_CHOICE', 'LUCKY_RETURN', 'REWARD_HORIZON', 'DOOR_FOUND', 'SAVE', 'DOOR_OPEN', 'RETURN']);

export function randomId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}
export function validId(value, prefix) {
  return typeof value === 'string' && value.length <= 100 && new RegExp(`^${prefix}-[A-Za-z0-9][A-Za-z0-9_-]{2,96}$`).test(value);
}
// Existing V1 installations can be UUIDs or older safe identifiers; never rotate them.
export function validInstallId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{2,127}$/.test(value);
}
export function environmentForHost(hostname = '') {
  const host = hostname.toLowerCase();
  if (/^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(host)) return 'local';
  if (['myclover.com', 'www.myclover.com', 'teem.pages.dev'].includes(host)) return 'prod';
  return 'preview';
}
export function normalizeSource({ search = '', referrer = '' } = {}) {
  const query = new URLSearchParams(search);
  const raw = (query.get('from') || query.get('utm_source') || '').toLowerCase().trim();
  const aliases = { fb: 'facebook', ig: 'instagram', astra: 'astra-post', google: 'search', bing: 'search', 'teambook.me': 'teambook' };
  if (raw) return SOURCES.includes(raw) ? raw : Object.hasOwn(aliases, raw) ? aliases[raw] : 'unknown';
  if (!referrer) return 'direct';
  let host;
  try { host = new URL(referrer).hostname.toLowerCase(); } catch { return 'unknown'; }
  const is = domain => host === domain || host.endsWith(`.${domain}`);
  if (is('facebook.com') || is('fb.com')) return 'facebook';
  if (is('instagram.com')) return 'instagram';
  if (is('line.me')) return 'line';
  if (is('teambook.me')) return 'teambook';
  if (['google.com', 'google.co.th', 'bing.com', 'duckduckgo.com', 'search.yahoo.com'].some(is)) return 'search';
  if (is('myclover.com')) return 'direct';
  return 'unknown';
}

const enumFields = { source: SOURCES, visitorClass: VISITOR_CLASSES, intentPrimary: INTENTS, intentSecondary: SECONDARY_INTENTS, doorId: DOORS, graphicsTier: GRAPHICS_TIERS, viewport: VIEWPORTS, motion: MOTIONS, audio: AUDIO_STATES };
const propertyEnums = {
  fromNode: ['frontdoor', ...INTENTS, 'value', 'reward', 'door', 'anomaly', 'legacy', ...DOORS],
  toNode: ['frontdoor', ...INTENTS, 'value', 'reward', 'door', 'anomaly', 'legacy', ...DOORS],
  returnReason: ['later-visit'], choiceStage: ['primary', 'secondary'],
};
const timingFields = ['activeMsToFirstChoice', 'activeMsToLuckyReturn', 'activeMsToDoorFound', 'activeMsInJourney'];
const boolFields = ['identityDurable', 'checkpointDurable'];
const propertyIdFields = { previousJourneyId: 'j', savedVisitId: 'v' };

/** Unknown properties are discarded, never copied to storage. Extend safe properties here. */
export function validateEvent(input) {
  const fail = error => ({ ok: false, error });
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('MALFORMED_EVENT');
  let size;
  try { size = new TextEncoder().encode(JSON.stringify(input)).length; } catch { return fail('MALFORMED_EVENT'); }
  if (size > MAX_PAYLOAD_BYTES) return fail('PAYLOAD_TOO_LARGE');
  if (typeof input.eventName !== 'string' || !Object.hasOwn(EVENTS, input.eventName)) return fail('UNKNOWN_EVENT');
  if (!ENVIRONMENTS.includes(input.env)) return fail('INVALID_ENV');
  if (input.analyticsVersion !== ANALYTICS_VERSION) return fail('INVALID_VERSION');
  if (!validId(input.eventId, 'e') || !validInstallId(input.installId) || !validId(input.journeyId, 'j') || !validId(input.visitId, 'v')) return fail('INVALID_ID');
  if (input.handoffId != null && !validId(input.handoffId, 'h')) return fail('INVALID_HANDOFF_ID');
  if (!Number.isSafeInteger(input.occurredAt) || input.occurredAt <= 0 || input.occurredAt > Date.now() + 300000) return fail('INVALID_TIME');
  if (typeof input.path !== 'string' || !/^\/[A-Za-z0-9/_\-.]*$/.test(input.path) || input.path.length > 160) return fail('INVALID_PATH');
  if (typeof input.experienceVersion !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(input.experienceVersion)) return fail('INVALID_EXPERIENCE_VERSION');
  const scope = input.scope || EVENTS[input.eventName].scope;
  if (!SCOPES.includes(scope)) return fail('INVALID_SCOPE');
  if (EVENTS[input.eventName].scope === 'journey' && scope === 'event') return fail('INVALID_SCOPE');
  const event = Object.fromEntries(['eventId', 'installId', 'journeyId', 'visitId', 'eventName', 'occurredAt', 'path', 'experienceVersion', 'analyticsVersion', 'env'].map(key => [key, input[key]]));
  event.scope = scope;
  if (input.handoffId != null) event.handoffId = input.handoffId;
  for (const [key, values] of Object.entries(enumFields)) {
    if (input[key] != null) {
      if (!values.includes(input[key])) return fail(`INVALID_${key.toUpperCase()}`);
      event[key] = input[key];
    }
  }
  if (input.properties != null && (typeof input.properties !== 'object' || Array.isArray(input.properties))) return fail('INVALID_PROPERTIES');
  event.properties = {};
  for (const [key, value] of Object.entries(input.properties || {})) {
    if (timingFields.includes(key)) {
      if (!Number.isSafeInteger(value) || value < 0 || value > 604800000) return fail('INVALID_TIMING');
    } else if (boolFields.includes(key)) {
      if (typeof value !== 'boolean') return fail('INVALID_PROPERTY');
    } else if (Object.hasOwn(propertyEnums, key)) {
      if (!propertyEnums[key].includes(value)) return fail('INVALID_PROPERTY');
    } else if (Object.hasOwn(propertyIdFields, key)) {
      if (!validId(value, propertyIdFields[key])) return fail('INVALID_PROPERTY');
    } else continue;
    event.properties[key] = value;
  }
  if (event.eventName === 'SAVE' && event.properties.checkpointDurable !== true) return fail('SAVE_NOT_DURABLE');
  return { ok: true, event };
}

export function dedupeKey(event) {
  const base = `${event.env}:${event.installId}:${event.eventName}`;
  if (event.scope === 'journey') return `${base}:j:${event.journeyId}:${event.doorId || ''}`;
  if (event.scope === 'installation') return `${base}:i:${event.doorId || ''}`;
  return `${event.env}:e:${event.eventId}`;
}
