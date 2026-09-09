/** Front Door identities and checkpoints. No analytics, legacy writes or eager UI work. */
import { randomId, validId, validInstallId, INTENTS, SECONDARY_INTENTS, DOORS, SOURCES } from './contract.js';

export const STATE_VERSION = 1;
export const VISIT_IDLE_MS = 30 * 60 * 1000;
export const STATE_KEYS = Object.freeze({ installation: 'c7:install_id', activeJourney: 'mc:frontdoor:v2:active_journey', visit: 'mc:frontdoor:v2:visit', journey: id => `mc:frontdoor:v2:journey:${id}` });
const STAGES = Object.freeze(['state-0', 'choice', 'reaction', 'value', 'reward', 'door-found', 'door-open', 'saved', 'anomaly', 'legacy', 'handoff']);
const MAX_RECORD_CHARS = 8192;
const READING_SLUGS = ['ep1-everyone-gets-to-play', 'ep2-the-first-item', 'ep3-the-item-that-came-back', 'ep4-what-traveled-without-us', 'ep5-from-answers-to-a-system', 'ep6-the-starter-kit', 'ep7-a-voice-that-went-further'];
const LESSON_SLUGS = ['free-ai', 'image-ai', 'clip-ai', 'notebooklm', 'prompts', 'first-web'];

function defaultStorage(name) { try { return globalThis[name]; } catch { return null; } }
function read(storage, key) { try { return storage?.getItem(key) ?? null; } catch { return null; } }
function json(storage, key) {
  const value = read(storage, key);
  if (!value || value.length > MAX_RECORD_CHARS) return null;
  try { return JSON.parse(value); } catch { return null; }
}
function writeVerified(storage, key, value) {
  try { storage?.setItem(key, value); return !!storage && storage.getItem(key) === value; } catch { return false; }
}
function copy(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function time(value) { return Number.isSafeInteger(value) && value > 0; }
function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }

/** Coarse recognition only. It intentionally neither scans storage nor evaluates achievements. */
export function classifyLegacyVisitor(storage) {
  const permanent = ['mc_nb_seen', 'mc_nb_seen_ever_v1', 'mc_nb_restored', 'mc_nb_restored_ever_v1', 'mc_secret_end', 'mc_secret_end_ever_v1', 'mc_dungeon_cleared_v1', 'mc_dungeon_awakened_v1'];
  if (permanent.some(key => read(storage, key) === '1')) return 'veteran';
  const titles = json(storage, 'mc_titles');
  if (Array.isArray(titles) && titles.some(value => ['BLACKSMITH', 'HERO', 'SEEKER', 'GLHF'].includes(value))) return 'veteran';
  const matches = ['c7:stats_bot', 'c7:stats_casual'].some(key => {
    const stats = json(storage, key);
    return record(stats) && typeof stats.matchesPlayed === 'number' && Number.isFinite(stats.matchesPlayed) && stats.matchesPlayed > 0;
  });
  if (matches || json(storage, 'c7:tutorial_completed') === true) return 'returning-room';
  const dungeon = json(storage, 'mc_dungeon_state_v2');
  if (record(dungeon) && dungeon.v === 2 && (record(dungeon.loot) || dungeon.notebook === true || dungeon.network === true)) return 'returning-room';
  const completed = (key, allowed) => (read(storage, key) || '').slice(0, MAX_RECORD_CHARS).split(',').some(value => allowed.includes(value));
  if (completed('mc_read', READING_SLUGS) || completed('mc_learn', LESSON_SLUGS) || read(storage, 'mc_walk_done') === '1' || ['TASTER', 'KEEPER', 'THINKER', 'MAKER'].includes(read(storage, 'mc_class'))) return 'legacy';
  return 'new';
}

function safePatch(input = {}) {
  if (!record(input)) return {};
  const patch = {};
  for (const [key, allowed] of Object.entries({ stage: STAGES, intentPrimary: INTENTS, intentSecondary: SECONDARY_INTENTS, doorId: DOORS, source: SOURCES })) {
    if (allowed.includes(input[key])) patch[key] = input[key];
  }
  if (Number.isSafeInteger(input.activeMs) && input.activeMs >= 0 && input.activeMs <= 604800000) patch.activeMs = input.activeMs;
  if (typeof input.experienceVersion === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(input.experienceVersion)) patch.experienceVersion = input.experienceVersion;
  // Optional local visual companion. Not part of the analytics envelope.
  if (typeof input.checkpointRef === 'string' && /^cp-[a-zA-Z0-9_-]{1,64}$/.test(input.checkpointRef)) patch.checkpointRef = input.checkpointRef;
  return patch;
}

function validCheckpoint(input, journeyId) {
  if (!record(input) || input.version !== STATE_VERSION || input.journeyId !== journeyId || !time(input.savedAt) || !validId(input.savedVisitId, 'v')) return null;
  return { version: STATE_VERSION, journeyId, savedAt: input.savedAt, savedVisitId: input.savedVisitId, ...safePatch(input) };
}
function validJourney(input, expectedId) {
  if (!record(input) || input.version !== STATE_VERSION || input.journeyId !== expectedId || !validId(input.journeyId, 'j') || !time(input.createdAt) || !time(input.updatedAt)) return null;
  const journey = { version: STATE_VERSION, journeyId: input.journeyId, createdAt: input.createdAt, updatedAt: input.updatedAt, ...safePatch(input) };
  const checkpoint = validCheckpoint(input.checkpoint, input.journeyId);
  if (checkpoint) journey.checkpoint = checkpoint;
  return journey;
}
function validVisit(input) {
  if (!record(input) || input.version !== STATE_VERSION || !validId(input.visitId, 'v') || !time(input.startedAt) || !time(input.lastActiveAt)) return null;
  const visit = { version: STATE_VERSION, visitId: input.visitId, startedAt: input.startedAt, lastActiveAt: input.lastActiveAt };
  if (validId(input.returningJourneyId, 'j') && validId(input.returnSavedVisitId, 'v')) {
    visit.returningJourneyId = input.returningJourneyId;
    visit.returnSavedVisitId = input.returnSavedVisitId;
  }
  if (validId(input.resumedJourneyId, 'j')) visit.resumedJourneyId = input.resumedJourneyId;
  return visit;
}

/**
 * A visit starts on runtime entry after 30 minutes without recorded activity.
 * Reload always continues the previous visit, even after a long pause. Focus and
 * visibility changes cannot begin a visit. New tabs reuse the shared active visit.
 * beginVisit is an explicit navigation boundary; recordActivity never creates one.
 */
export function createState({ storage = defaultStorage('localStorage'), sessionStorage = defaultStorage('sessionStorage'), now = Date.now, idFactory = randomId, navigationType = 'navigate' } = {}) {
  const makeId = prefix => {
    const id = idFactory(prefix);
    return (prefix === 'i' ? validInstallId(id) : validId(id, prefix)) ? id : randomId(prefix);
  };
  const currentTime = () => Math.max(1, Math.trunc(now()));
  const existingInstallation = read(storage, STATE_KEYS.installation);
  const installId = validInstallId(existingInstallation) ? existingInstallation : makeId('i');
  // Do not replace an existing malformed legacy identity. Use an honest memory fallback.
  const durable = validInstallId(existingInstallation) || (existingInstallation === null && writeVerified(storage, STATE_KEYS.installation, installId));
  const installation = Object.freeze({ installId, durable });
  const legacyClass = classifyLegacyVisitor(storage);
  const activeId = read(storage, STATE_KEYS.activeJourney);
  let journey = validId(activeId, 'j') ? validJourney(json(storage, STATE_KEYS.journey(activeId)), activeId) : null;
  let visitorClass = journey?.checkpoint ? 'returning-frontdoor' : legacyClass;
  function freshJourney() {
    const at = currentTime();
    return { version: STATE_VERSION, journeyId: makeId('j'), createdAt: at, updatedAt: at, stage: 'state-0' };
  }
  function persistJourney(value) {
    // Commit the complete record before switching the active pointer.
    if (!writeVerified(storage, STATE_KEYS.journey(value.journeyId), JSON.stringify(value))) return false;
    return writeVerified(storage, STATE_KEYS.activeJourney, value.journeyId);
  }
  if (!journey) { journey = freshJourney(); persistJourney(journey); }
  let visit = null;
  let qualifyingReturn = false;
  let lastVisitPersist = 0;

  function persistVisit() {
    const serialized = JSON.stringify(visit);
    writeVerified(storage, STATE_KEYS.visit, serialized);
    writeVerified(sessionStorage, STATE_KEYS.visit, serialized);
    lastVisitPersist = currentTime();
  }
  function storedVisit() {
    const candidates = [visit, validVisit(json(storage, STATE_KEYS.visit)), validVisit(json(sessionStorage, STATE_KEYS.visit))].filter(Boolean);
    return candidates.sort((a, b) => b.lastActiveAt - a.lastActiveAt || b.startedAt - a.startedAt)[0] || null;
  }
  function beginVisit({ navigationType: type = 'navigate' } = {}) {
    const at = currentTime();
    const previous = storedVisit();
    const startsNew = !previous || (['navigate', 'back_forward'].includes(type) && at - previous.lastActiveAt >= VISIT_IDLE_MS);
    visit = startsNew ? { version: STATE_VERSION, visitId: makeId('v'), startedAt: at, lastActiveAt: at } : { ...previous, lastActiveAt: at };
    const saved = journey.checkpoint;
    const previousActivity = previous?.lastActiveAt ?? saved?.savedAt;
    qualifyingReturn = !!(startsNew && type !== 'reload' && saved && saved.savedVisitId !== visit.visitId && at - previousActivity >= VISIT_IDLE_MS);
    if (qualifyingReturn) {
      visitorClass = 'returning-frontdoor';
      visit.returningJourneyId = journey.journeyId;
      visit.returnSavedVisitId = saved.savedVisitId;
    }
    persistVisit();
    return snapshot();
  }
  function snapshot() {
    return copy({ installation, journey, visit, qualifyingReturn, visitorClass });
  }
  beginVisit({ navigationType });

  return {
    get installation() { return installation; },
    get visit() { return copy(visit); },
    get journey() { return copy(journey); },
    get qualifyingReturn() { return qualifyingReturn; },
    get visitorClass() { return visitorClass; },
    snapshot, beginVisit,
    recordActivity({ force = false } = {}) {
      visit.lastActiveAt = currentTime();
      if (force || visit.lastActiveAt - lastVisitPersist >= 10000) persistVisit();
      return copy(visit);
    },
    updateJourney(patch) {
      journey = { ...journey, ...safePatch(patch), updatedAt: currentTime() };
      persistJourney(journey);
      return copy(journey);
    },
    saveCheckpoint(patch) {
      const at = currentTime();
      const next = { ...journey, ...safePatch(patch), updatedAt: at };
      const checkpoint = { version: STATE_VERSION, journeyId: journey.journeyId, savedAt: at, savedVisitId: visit.visitId, ...safePatch(next) };
      next.checkpoint = checkpoint;
      // A read-back of the complete checkpoint and pointer is required for SAVE.
      if (!installation.durable || !persistJourney(next)) {
        journey = { ...journey, ...safePatch(patch), updatedAt: at };
        return { ok: false, durable: false, checkpoint: null, error: 'CHECKPOINT_PERSISTENCE_FAILED' };
      }
      journey = next;
      return { ok: true, durable: true, checkpoint: copy(checkpoint) };
    },
    resume() {
      const saved = journey.checkpoint;
      if (!saved || saved.savedVisitId === visit.visitId || visit.returningJourneyId !== journey.journeyId || visit.resumedJourneyId === journey.journeyId) return { ok: false, error: 'NO_RESUMABLE_JOURNEY' };
      journey = { ...journey, ...safePatch(saved), updatedAt: currentTime() };
      visit.resumedJourneyId = journey.journeyId;
      persistJourney(journey);
      persistVisit();
      return { ok: true, journey: copy(journey), previousSavedVisitId: saved.savedVisitId };
    },
    rebuild() {
      const previousJourneyId = journey.journeyId;
      // Preserve the previous record, checkpoint, achievements and all legacy keys.
      persistJourney(journey);
      journey = freshJourney();
      persistJourney(journey);
      qualifyingReturn = false;
      delete visit.returningJourneyId;
      delete visit.returnSavedVisitId;
      delete visit.resumedJourneyId;
      persistVisit();
      return { previousJourneyId, journey: copy(journey) };
    },
  };
}
