/** Additive destination receipts. The canonical 15-event P0 registry stays unchanged. */
import { ENVIRONMENTS, validId } from './contract.js';
import { RECIPE_LINKS } from '../../ako/kitchen/catalog.js';
export const OUTCOME_VERSION = '1.0.0';
export const OUTCOMES = Object.freeze(['DESTINATION_ARRIVAL', 'MEET_REQUEST_ACCEPTED']);
// Explicit routes only. Do not replace these with prefix matches: old bonus pages,
// private tools, query strings and arbitrary new lessons are not receipt endpoints.
export const FORGE_PATHS = Object.freeze([
  '/forge/',
  '/forge/ep1-everyone-gets-to-play/',
  '/forge/ep2-the-first-item/',
  '/forge/ep3-the-item-that-came-back/',
  '/forge/ep4-what-traveled-without-us/',
  '/forge/ep5-from-answers-to-a-system/',
  '/forge/ep6-the-starter-kit/',
  '/forge/ep7-a-voice-that-went-further/',
]);
export const CLASSROOM_PATHS = Object.freeze([
  '/classroom/', '/classroom/free-ai.html', '/classroom/image-ai.html',
  '/classroom/clip-ai.html', '/classroom/notebooklm.html',
  '/classroom/prompts.html', '/classroom/first-web.html',
]);
export const DOOR_ARRIVAL_PATHS = Object.freeze({
  ako: Object.freeze(['/ako/', '/ako/kitchen/', '/ako/story/', ...RECIPE_LINKS.map(recipe=>recipe.path)]), xircle: Object.freeze(['/xircle/']),
  xvisor: Object.freeze(['/xvisor/']),
  meet: Object.freeze(['/meet/']), dungeon: Object.freeze(['/classroom/dungeon/']),
  forge: FORGE_PATHS, classroom: CLASSROOM_PATHS, home: Object.freeze(['/home/']), hall: Object.freeze(['/hall.html']),
});
export const OUTCOME_PATHS = Object.freeze(Object.values(DOOR_ARRIVAL_PATHS).flat());
// Read-only knowledge stops can carry a reference onward, never claim an arrival
// or prepare a new Front Door departure. Keep this separate from receipt routes.
export const KNOWLEDGE_CARRY_PATHS = Object.freeze([
  '/xircle/learn/', '/xircle/learn/topic/', '/xircle/doc/xvisor/',
]);
export function outcomeDoor(path) {
  return Object.keys(DOOR_ARRIVAL_PATHS).find(door => DOOR_ARRIVAL_PATHS[door].includes(path));
}
// Onward receipts share the original handoff, but only its original door's routes
// count as that door's arrival in Stat. A meeting request is never an arrival proxy.
export function acceptsOutcomePath(door, path) {
  return path === '/meet/' || DOOR_ARRIVAL_PATHS[door]?.includes(path) === true
    || (door === 'ako' && path === '/xircle/')
    || ((door === 'ako' || door === 'xircle') && path === '/xvisor/')
    || (door === 'forge' && CLASSROOM_PATHS.includes(path))
    || (door === 'home' && (path === '/hall.html' || FORGE_PATHS.includes(path) || CLASSROOM_PATHS.includes(path) || path === '/classroom/dungeon/'));
}
export function validateOutcome(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {ok:false,error:'INVALID_OUTCOME'};
  if (new TextEncoder().encode(JSON.stringify(value)).length > 1024) return {ok:false,error:'PAYLOAD_TOO_LARGE'};
  if (value.version !== OUTCOME_VERSION || !ENVIRONMENTS.includes(value.env) || !OUTCOMES.includes(value.name)
    || !validId(value.eventId,'o') || !validId(value.handoffId,'h') || !Number.isSafeInteger(value.occurredAt) || value.occurredAt < 1 || value.occurredAt > Date.now()+300000
    || !OUTCOME_PATHS.includes(value.path) || (value.name==='MEET_REQUEST_ACCEPTED' && value.path!=='/meet/')) return {ok:false,error:'INVALID_OUTCOME'};
  return {ok:true,event:{version:OUTCOME_VERSION,eventId:value.eventId,handoffId:value.handoffId,env:value.env,name:value.name,occurredAt:value.occurredAt,path:value.path}};
}
