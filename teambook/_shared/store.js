/* ═══════════════════════════════════════════════════════════════
   TeamBook — server-backed data layer with a local display cache

   The player's lightweight profile and party credentials stay on the
   device; canonical party membership and the shared log live on the
   server. A local party snapshot keeps the last readable state offline.
   ═══════════════════════════════════════════════════════════════ */

import { PET_BY_ID, TEAMBOOK_V1_PET_IDS } from './pets.js';
import { AVATAR_BY_ID, avatarFallback } from './avatars.js';
import { TEAMBOOK_CARDS, canonicalCardId, cardById, cardNameTh, rollRarity } from './cards.js';
import { activityContextForParty } from './activities.js';
import { endingPlan } from './ending-plan.js';

const K_PROFILE = 'teambook_profile_v1';
const K_PARTIES = 'teambook_books_v1';
const K_TOKENS = 'teambook_book_tokens_v1';

export const TEAMBOOK_PROFILE_KEY = K_PROFILE;

/* TeamBook is local-first: a device keeps its own profile, its book
   snapshots and its join tokens. Clearing the server therefore only does
   half a reset — every browser that played before would come back holding
   books the server no longer knows, and the app would spend its life
   reconciling ghosts.

   The epoch closes that gap. Bump it once whenever the server data is
   wiped: each device notices the mismatch on its next load, drops its own
   TeamBook state exactly once, and starts clean. It is deliberately not
   tied to a deploy or a version number — a deploy is not a reset, and
   bumping this on every release would throw away real people's books.

   Only keys owned by TeamBook are ever touched. */
const DATA_EPOCH = 1;
const K_EPOCH = 'teambook_data_epoch';
const EPOCH_KEYS = [
  K_PROFILE, K_PARTIES, K_TOKENS,
  'teambook_profile_ids_v1', 'teambook_public_hide_full',
];

function applyDataEpoch() {
  try {
    if (typeof localStorage === 'undefined') return;
    const stored = localStorage.getItem(K_EPOCH);
    /* A device with no epoch stamp at all is a device from before this
       mechanism existed, not a device that missed a wipe. It is adopted into
       the current epoch and keeps everything it holds. Clearing here would
       mean the first deploy after adding the epoch wiped every existing
       player's books — which is what happened, and is what this guards. */
    if (stored === null) {
      localStorage.setItem(K_EPOCH, String(DATA_EPOCH));
      return;
    }
    /* Only a deliberate bump clears: the device is behind the current epoch,
       so the server data it remembers is gone. A device that is somehow ahead
       is left alone rather than wiped on a rollback. */
    if (Number(stored) >= DATA_EPOCH) return;
    for (const key of EPOCH_KEYS) localStorage.removeItem(key);
    localStorage.setItem(K_EPOCH, String(DATA_EPOCH));
  } catch { /* private mode — the app still runs from memory */ }
}
applyDataEpoch();

export const PARTY_MIN = 2;
export const PARTY_MAX = 5;
/* Absolute v0.4 caps. A new free profile starts at 1 owned slot; the
   effective value still comes from level + unlocked paid milestones. */
export const MAX_OWNED_ACTIVE_PARTIES = 7;
export const MAX_JOINED_ACTIVE_PARTIES = 3;
export const MAX_ACTIVE_PARTIES = 10;
/* Kept for legacy data compatibility only. TeamBook V1 never renders /7. */
export const MAX_PROFILE_WORDS = 7;

/* Message is a limited resource on purpose: the party should be
   catchable-up in one minute, so the log never accrues message debt
   (Party Game Blueprint §10). Commit and React are free — the game
   rewards reporting progress and acknowledging each other, and charges
   only for adding to the reading pile. */
export const MESSAGE_BUDGETS = Object.freeze({
  quiet:  { id: 'quiet',  perDay: 1, labelTh: 'เงียบ',  hintTh: 'วันละ 1 ข้อความต่อคน' },
  normal: { id: 'normal', perDay: 3, labelTh: 'ปกติ',   hintTh: 'วันละ 3 ข้อความต่อคน' },
  social: { id: 'social', perDay: 5, labelTh: 'คุยเยอะ', hintTh: 'วันละ 5 ข้อความต่อคน' },
});
export const DEFAULT_BUDGET = 'normal';

/* One message, one glance. This must match MESSAGE_MAX_CHARS in
   api/_lib/xty-rules.js exactly — the server refuses anything longer, and a
   client that let people type past it would only produce rejected posts. */
export const MESSAGE_MAX_CHARS = 120;

export const REACTIONS = Object.freeze(['❤️', '🔥', '👏', '😂', '🫡', '💪', '👀', '🍀']);

/* The pet wakes four times a day, reads what happened since it last
   spoke, and may say nothing at all. Fixed slots rather than replies
   keep it from becoming a chatbot that answers every message
   (Party Game Blueprint §20, §21). */
export const PET_WAKE_HOURS = Object.freeze([0, 6, 12, 18]);
export const PET_MAX_BUBBLES = 3;

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

function startOfIctDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  const safe = Number.isFinite(date.getTime()) ? date : new Date();
  const shifted = new Date(safe.getTime() + ICT_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - ICT_OFFSET_MS);
}

/* Party days are fixed to Asia/Bangkok for launch, independent of the
   device timezone. This must match api/_lib/xty-rules.js exactly. */
export function dayKey(iso) {
  const date = iso ? new Date(iso) : new Date();
  const safe = Number.isFinite(date.getTime()) ? date : new Date();
  return new Date(safe.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; } /* private mode — the app still works in-memory */
}

const now = () => new Date().toISOString();

export function uid(n = 10) {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const buf = new Uint32Array(n);
  (crypto || window.crypto).getRandomValues(buf);
  for (let i = 0; i < n; i++) s += a[buf[i] % a.length];
  return s;
}

/* Five numeric digits preserve leading zeroes and match the server-only code format. */
export function inviteCode() {
  const buf = new Uint32Array(5);
  (crypto || window.crypto).getRandomValues(buf);
  return [...buf].map(n => String(n % 10)).join('');
}

/* ---------- profile ---------- */

const LEGACY_AVATAR_IDS = Object.freeze({
  clover: 'orange_cat', sun: 'orange_cat', cloud: 'white_pom',
  flame: 'fox', wave: 'white_cat', mountain: 'buffalo',
  ramen: 'pig', dice: 'owl', headphones: 'rabbit', book: 'turtle',
  sneaker: 'white_pom', camera: 'crow',
  '🍀': 'orange_cat', '☀️': 'orange_cat', '🌻': 'orange_cat', '☁️': 'white_pom',
  '🔥': 'fox', '🌊': 'white_cat', '⛰️': 'buffalo', '🍜': 'pig',
  '🎲': 'owl', '🎧': 'rabbit', '📕': 'turtle', '📚': 'turtle',
  '👟': 'white_pom', '📷': 'crow', '🐱': 'orange_cat', '🐶': 'white_pom',
});

function profileAvatarId(value) {
  if (AVATAR_BY_ID[value?.avatarId]) return value.avatarId;
  if (AVATAR_BY_ID[value?.avatar]) return value.avatar;
  return LEGACY_AVATAR_IDS[value?.avatarId] || LEGACY_AVATAR_IDS[value?.avatar] || 'orange_cat';
}

function validHandSize(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(1, n) : 1;
}

function normalizedOwnedCards(value, createdAt) {
  const raw = Array.isArray(value.ownedCards) ? value.ownedCards
    : (Array.isArray(value.cards) ? value.cards : []);
  const cards = [];
  const seen = new Set();
  for (const entry of raw) {
    const cardId = canonicalCardId(String(typeof entry === 'string' ? entry : entry?.cardId || '').trim());
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    cards.push({
      ...(entry && typeof entry === 'object' ? entry : {}),
      cardId,
      acquiredAt: entry?.acquiredAt || createdAt,
      acquiredFrom: String(entry?.acquiredFrom || 'legacy'),
    });
  }
  return cards;
}

function normalizedCardRewards(value, ownedCardIds) {
  const raw = Array.isArray(value.cardRewards) ? value.cardRewards : [];
  const rewards = [];
  const seen = new Set();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const cardId = entry.cardId ? canonicalCardId(entry.cardId) : null;
    const rewardId = String(entry.rewardId || '').trim();
    if (!rewardId || seen.has(rewardId) || (cardId && !ownedCardIds.has(cardId))) continue;
    seen.add(rewardId);
    rewards.push({
      rewardId,
      questId: String(entry.questId || 'milestone').slice(0, 100),
      partyCode: String(entry.partyCode || '').toUpperCase().slice(0, 5),
      cardId,
      complete: !!entry.complete,
      earnedAt: entry.earnedAt || now(),
      revealedAt: entry.revealedAt || null,
      source: entry.source === 'server' ? 'server' : 'local',
    });
  }
  return rewards;
}

export function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const avatarId = profileAvatarId(value);
  const fallback = typeof value.avatarFallback === 'string' && value.avatarFallback
    ? value.avatarFallback
    : (typeof value.avatar === 'string' && !AVATAR_BY_ID[value.avatar] ? value.avatar : avatarFallback(avatarId));
  const currentPets = Array.isArray(value.petIds) ? value.petIds.filter(id => typeof id === 'string') : [];
  const createdAt = value.createdAt || now();
  const avatarFrame = ['red', 'green', 'blue', 'silver'].includes(value.avatarFrame) ? value.avatarFrame : 'green';
  const ownedCards = normalizedOwnedCards(value, createdAt);
  const ownedCardIds = new Set(ownedCards.map(entry => entry.cardId));
  const cardRewards = normalizedCardRewards(value, ownedCardIds);
  const equippedWanted = canonicalCardId(value.equippedCardId || '');
  const equippedCardId = ownedCardIds.has(equippedWanted)
    ? equippedWanted
    : (ownedCards[0]?.cardId || null);
  const wantedLevel = Math.floor(Number(value.level || 1));
  const level = Number.isFinite(wantedLevel) ? Math.min(4, Math.max(1, wantedLevel)) : 1;
  const paidTier = ['plus', 'max'].includes(value.paidTier) ? value.paidTier : 'free';
  const bonusSlotEntitlement = paidTier === 'max' ? 3 : (paidTier === 'plus' ? 2 : 0);
  const wantedBonusSlots = Math.floor(Number(value.unlockedBonusSlots || 0));
  const unlockedBonusSlots = Number.isFinite(wantedBonusSlots)
    ? Math.min(bonusSlotEntitlement, Math.max(0, wantedBonusSlots)) : 0;
  return {
    ...value,
    version: 5,
    id: String(value.id || uid()),
    alias: String(value.alias || '').trim().slice(0, 24),
    avatarId,
    avatarFallback: fallback,
    avatarFrame,
    /* Keep a compact legacy field while party rows migrate from emoji to
       canonical avatar ids. New writes store the id here. */
    avatar: avatarId,
    handSize: validHandSize(value.handSize || value.maxProfileCardSlots || 0),
    level,
    paidTier,
    bonusSlotEntitlement,
    unlockedBonusSlots,
    starterCardId: null,
    equippedCardId,
    ownedCards,
    cardRewards,
    collectionResetAt: value.collectionResetAt || null,
    debugUnlockedAt: value.debugUnlockedAt || null,
    petIds: [...new Set([...currentPets, ...TEAMBOOK_V1_PET_IDS])],
    createdAt,
    updatedAt: value.updatedAt || createdAt,
  };
}

export function saveProfile(value, { touch = false } = {}) {
  const profile = normalizeProfile(value);
  if (!profile) return null;
  if (touch) profile.updatedAt = now();
  write(K_PROFILE, profile);
  return profile;
}

export function getProfile() {
  const raw = read(K_PROFILE, null);
  const profile = normalizeProfile(raw);
  if (profile && JSON.stringify(profile) !== JSON.stringify(raw)) write(K_PROFILE, profile);
  return profile;
}

export function hasProfile() {
  const p = getProfile();
  return !!(p && p.alias);
}

/* Every TeamBook V1 player starts with all eight friendly pets. */
export function createProfile({ alias, avatarId, avatar, avatarFrame = 'green' }) {
  const pickedId = AVATAR_BY_ID[avatarId] ? avatarId
    : (AVATAR_BY_ID[avatar] ? avatar : (LEGACY_AVATAR_IDS[avatar] || 'orange_cat'));
  const pickedFrame = ['red', 'green', 'blue', 'silver'].includes(avatarFrame) ? avatarFrame : 'green';
  const createdAt = now();
  return saveProfile({
    id: uid(),
    alias: String(alias || '').trim().slice(0, 24),
    avatarId: pickedId,
    avatarFallback: avatarFallback(pickedId, avatar),
    avatar: pickedId,
    avatarFrame: pickedFrame,
    createdAt,
    updatedAt: createdAt,
    handSize: 1,
    level: 1,
    paidTier: 'free',
    unlockedBonusSlots: 0,
    starterCardId: null,
    equippedCardId: null,
    ownedCards: [],
    cardRewards: [],
    petIds: [...TEAMBOOK_V1_PET_IDS],
  });
}

export function updateProfile(patch) {
  const p = getProfile();
  if (!p) return null;
  return saveProfile({ ...p, ...patch }, { touch: true });
}

export function ownedCards(profile = getProfile()) {
  if (!profile) return [];
  return normalizeProfile(profile).ownedCards;
}

export function ownedCardIds(profile = getProfile()) {
  return ownedCards(profile).map(entry => entry.cardId);
}

/* Visible only inside the secondary Collection surface during the test
   stage. These codes change the local/account profile, never Party state. */
export function applyCollectionDebugCode(value) {
  const profile = getProfile();
  if (!profile) return { ok: false, error: 'NO_PROFILE', message: 'ยังไม่มีโปรไฟล์ TeamBook' };
  const code = String(value || '').trim().toLowerCase();
  const at = now();
  if (code === 'getallitem') {
    const owned = new Set(ownedCardIds(profile));
    const added = TEAMBOOK_CARDS.filter(card => !owned.has(card.cardId)).map(card => ({
      cardId: card.cardId, acquiredAt: at, acquiredFrom: 'debug:getallitem',
    }));
    saveProfile({
      ...profile,
      ownedCards: [...profile.ownedCards, ...added],
      debugUnlockedAt: at,
    }, { touch: true });
    return { ok: true, code, count: TEAMBOOK_CARDS.length, message: `ปลดการ์ดทดสอบครบ ${TEAMBOOK_CARDS.length} ใบแล้ว` };
  }
  if (code === 'discard') {
    saveProfile({
      ...profile,
      equippedCardId: null,
      ownedCards: [],
      cardRewards: [],
      collectionResetAt: at,
      debugUnlockedAt: null,
    }, { touch: true });
    return { ok: true, code, count: 0, message: 'รีเซ็ตคอลเลกชันบนโปรไฟล์นี้แล้ว' };
  }
  return { ok: false, error: 'INVALID_DEBUG_CODE', message: 'ไม่พบรหัสทดสอบนี้' };
}

export async function syncCollectionDebugCode(value) {
  const local = applyCollectionDebugCode(value);
  if (!local.ok) return local;
  const party = allParties().find(item => partyIdentity(item.code)?.token);
  if (!party) return { ...local, serverSynced: false };
  const remote = await api(`/api/teambook/party/${encodeURIComponent(party.code)}/debug/collection`, {
    method: 'POST', code: party.code, body: { code: local.code },
  });
  if (remote.error) {
    return {
      ...local,
      serverSynced: false,
      message: `${local.message} · Server test state ยังไม่ sync`,
    };
  }
  return { ...local, serverSynced: true };
}

/* Avatar is only a profile presentation choice. Lead/NPC placement is
   derived from active parties and never locks the profile avatar itself. */
export function useCardAsAvatar(cardId) {
  const profile = getProfile();
  const wanted = String(cardId || '').toUpperCase();
  const card = cardById(wanted);
  if (!profile || !card || !ownedCardIds(profile).includes(wanted)) return null;
  return updateProfile({
    equippedCardId: wanted,
    avatarId: card.species,
    avatar: card.species,
    avatarFallback: card.fallback,
    avatarFrame: card.color,
  });
}

export function ownsPet(petId) {
  const p = getProfile();
  return !!(p && p.petIds.includes(petId));
}

export function handSizeOf(profile) {
  return validHandSize(profile?.handSize || 1);
}

export function maxActiveParties(profile) {
  return maxOwnedActiveParties(profile) + MAX_JOINED_ACTIVE_PARTIES;
}

export function maxOwnedActiveParties(profile) {
  const normalized = profile ? normalizeProfile(profile) : getProfile();
  return Math.min(7, Math.max(1, Number(normalized?.level || 1)) + Math.max(0, Number(normalized?.unlockedBonusSlots || 0)));
}

export function maxJoinedActiveParties(profile) {
  return MAX_JOINED_ACTIVE_PARTIES;
}

/* ---------- parties ---------- */

export function allParties() {
  const list = read(K_PARTIES, []);
  return Array.isArray(list) ? list : [];
}

export function getParty(code) {
  if (!code) return null;
  const want = String(code).toUpperCase();
  return allParties().find(p => p.code === want) || null;
}

function saveParties(list) { write(K_PARTIES, list); }

function tokenMap() {
  const value = read(K_TOKENS, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function saveToken(code, token, userId) {
  const map = tokenMap();
  const old = map[code] || {};
  map[code] = {
    token: token || old.token || '',
    userId: userId || old.userId || '',
  };
  write(K_TOKENS, map);
}

function removeToken(code) {
  const map = tokenMap();
  delete map[String(code || '').toUpperCase()];
  write(K_TOKENS, map);
}

function tokenFor(code) {
  const entry = tokenMap()[String(code || '').toUpperCase()];
  return typeof entry === 'string' ? entry : (entry && entry.token) || '';
}

export function partyIdentity(code) {
  const entry = tokenMap()[String(code || '').toUpperCase()];
  if (!entry) return null;
  return typeof entry === 'string' ? { token: entry, userId: '' } : entry;
}

const ACTIVE_PARTY_STATES = new Set(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

export function isActiveParty(party) {
  return !!party && ACTIVE_PARTY_STATES.has(String(party.state || 'ACTIVE').toUpperCase());
}

export function cardAvailability(cardId, { exceptPartyCode = '' } = {}) {
  const wanted = String(cardId || '').toUpperCase();
  const except = String(exceptPartyCode || '').toUpperCase();
  for (const party of allParties()) {
    if (!isActiveParty(party) || party.code === except) continue;
    const identity = partyIdentity(party.code);
    if (!identity?.userId || party.ownerId !== identity.userId) continue;
    if (String(party.leadCardId || '').toUpperCase() === wanted) {
      return { status: 'IN_PARTY', partyCode: party.code, role: 'lead' };
    }
    if (String(party.npcCardId || '').toUpperCase() === wanted) {
      return { status: 'NPC_IN_PARTY', partyCode: party.code, role: 'npc' };
    }
  }
  return { status: 'AVAILABLE', partyCode: null, role: null };
}

export function availableOwnedCards({ role = 'lead', exceptPartyCode = '', profile = getProfile() } = {}) {
  return ownedCardIds(profile)
    .map(cardById)
    .filter(Boolean)
    .filter(card => card.eligibility[role] && cardAvailability(card.cardId, { exceptPartyCode }).status === 'AVAILABLE');
}

/* Capacity is derived from canonical party membership cached on this
   device. The server repeats these guards; this copy exists to explain a
   limit before the user fills a form or submits a join code. */
export function activePartyUsage(profile = getProfile()) {
  const knownCodes = new Set(Object.keys(tokenMap()));
  let owned = 0; let joined = 0;
  for (const party of allParties()) {
    if (!knownCodes.has(party.code) || !isActiveParty(party)) continue;
    const userId = partyIdentity(party.code)?.userId;
    if (userId && party.ownerId === userId) owned += 1;
    else joined += 1;
  }
  return {
    owned,
    joined,
    total: owned + joined,
    maxOwned: maxOwnedActiveParties(profile),
    maxJoined: maxJoinedActiveParties(profile),
    maxTotal: maxActiveParties(profile),
  };
}

function limitError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function rememberParty(party) {
  if (!party || !party.code || !Array.isArray(party.members) || !Array.isArray(party.log)) return null;
  const list = allParties();
  const at = list.findIndex(item => item.code === party.code);
  if (at >= 0) list[at] = party; else list.unshift(party);
  saveParties(list);
  return party;
}

async function api(path, { method = 'GET', body, code } = {}) {
  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = tokenFor(code);
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetch(path, {
      method, headers, credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ...data, error: data.error || `HTTP_${response.status}` };
    return data;
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
}

export function importServerCardReward(value) {
  const profile = getProfile();
  const rewardId = String(value?.rewardId || '').trim();
  if (!profile || !rewardId) return null;
  const earnedAt = value.earnedAt || now();
  const resetAt = new Date(profile.collectionResetAt || 0).getTime();
  const earnedTime = new Date(earnedAt).getTime();
  if (Number.isFinite(resetAt) && Number.isFinite(earnedTime) && resetAt >= earnedTime) return null;
  const card = value.cardId ? cardById(value.cardId) : null;
  const cardId = card?.cardId || null;
  const existing = profile.cardRewards.find(item => item.rewardId === rewardId);
  const reward = {
    rewardId,
    questId: String(value.questId || `party-complete:${value.partyCode || ''}`).slice(0, 100),
    partyCode: String(value.partyCode || '').toUpperCase().slice(0, 5),
    cardId,
    complete: !!value.complete || !cardId,
    earnedAt,
    revealedAt: existing?.revealedAt || value.revealedAt || null,
    source: 'server',
  };
  const owned = new Set(ownedCardIds(profile));
  const ownedCards = cardId && !owned.has(cardId)
    ? [...profile.ownedCards, { cardId, acquiredAt: earnedAt, acquiredFrom: `party:${reward.partyCode}` }]
    : profile.ownedCards;
  const cardRewards = existing
    ? profile.cardRewards.map(item => item.rewardId === rewardId ? reward : item)
    : [...profile.cardRewards, reward];
  saveProfile({ ...profile, ownedCards, cardRewards }, { touch: true });
  return reward;
}

function rememberResponse(code, result) {
  if (!result || result.error) return result;
  if (result.myReward) importServerCardReward(result.myReward);
  const party = rememberParty(result.party);
  if (result.token || result.meUserId) saveToken(code || party?.code, result.token, result.meUserId);
  if (result.meProgression) {
    const profile = getProfile();
    if (profile) saveProfile({
      ...profile,
      level: result.meProgression.level,
      paidTier: result.meProgression.paidTier,
      bonusSlotEntitlement: result.meProgression.bonusSlotEntitlement,
      unlockedBonusSlots: result.meProgression.unlockedBonusSlots,
    }, { touch: true });
  }
  return { ...result, party };
}

export async function createParty({
  name, activity, activityId, preset, verificationMode = 'trust', durationDays, color, visibility,
  commitRule, budget, petId, coverType = 'avatar', leadCardId, npcCardId, partyAvatar,
  activityMode = 'shared', activityDescription = '', activityColor = null, successRule = '',
}) {
  const profile = getProfile();
  if (!profile) throw new Error('NO_PROFILE');
  const capacity = activePartyUsage(profile);
  if (capacity.owned >= capacity.maxOwned) throw limitError('OWNED_PARTY_LIMIT');
  if (capacity.total >= capacity.maxTotal) throw limitError('ACTIVE_PARTY_LIMIT');
  const owned = new Set(ownedCardIds(profile));
  const pickedCover = ['avatar', 'card_back', 'card'].includes(coverType) ? coverType : 'avatar';
  const lead = pickedCover === 'card' ? String(leadCardId || '').toUpperCase() : null;
  const npc = String(npcCardId || '').toUpperCase() || null;
  if (lead && (!cardById(lead)?.eligibility?.partyCover || !owned.has(lead))) throw limitError('CARD_NOT_COVER_ELIGIBLE');
  if (lead && cardAvailability(lead).status !== 'AVAILABLE') throw limitError('CARD_IN_USE');
  if (npc && (!cardById(npc) || !owned.has(npc))) throw limitError('CARD_NOT_OWNED');
  if (npc && (npc === lead || cardAvailability(npc).status !== 'AVAILABLE')) throw limitError('CARD_IN_USE');
  const result = await api('/api/teambook/party', { method: 'POST', body: {
    name, activity, activityId, preset, verificationMode, durationDays, color, visibility, commitRule,
    activityMode, activityDescription, activityColor, successRule,
    budget: MESSAGE_BUDGETS[budget] ? budget : DEFAULT_BUDGET,
    petId: petId || null,
    coverType: pickedCover,
    leadCardId: lead,
    npcCardId: npc,
    alias: profile.alias,
    /* Equipping a card carries it into the party seat. Resolved here with
       cardById rather than through card-picker, which imports this module —
       the cycle would bind late and break at module-eval time. */
    avatar: partyAvatar?.species
      || (profile.equippedCardId && cardById(profile.equippedCardId)?.cardId)
      || profile.avatarId || profile.avatarFallback,
    avatarColor: partyAvatar?.color || profile.avatarFrame || 'green',
    profileId: profile.id,
  }});
  if (result.error) {
    const error = new Error(result.error);
    error.code = result.error;
    throw error;
  }
  const saved = rememberResponse(result.party.code, result);
  return saved.party;
}

export async function joinParty(code, { alias, avatar, avatarColor }) {
  const wanted = String(code || '').toUpperCase();
  const profile = getProfile();
  const alreadyKnown = !!tokenMap()[wanted];
  if (profile && !alreadyKnown) {
    const capacity = activePartyUsage(profile);
    if (capacity.joined >= capacity.maxJoined) return { ok: false, error: 'JOINED_PARTY_LIMIT' };
    if (capacity.total >= capacity.maxTotal) return { ok: false, error: 'ACTIVE_PARTY_LIMIT' };
  }
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/join`, {
    method: 'POST', code: wanted, body: {
      alias,
      avatar: avatar || profile?.avatarId || profile?.avatarFallback,
      avatarColor: avatarColor || profile?.avatarFrame || 'green',
      profileId: profile?.id || '',
    },
  });
  return rememberResponse(wanted, result);
}

/* A relay read, deliberately called only on entry, return-to-tab, or a
   manual refresh. There is no socket, long-poll, or unread treadmill. */
export async function refreshParty(code, since = 0) {
  const wanted = String(code || '').toUpperCase();
  const cursor = Math.max(0, Number(since) || 0);
  const result = await api(
    `/api/teambook/party/${encodeURIComponent(wanted)}/feed?since=${cursor}`,
    { code: wanted },
  );
  if (result.error === 'AUTH_REQUIRED') {
    const revokedUserId = partyIdentity(wanted)?.userId;
    if (revokedUserId) {
      const list = allParties(); const index = list.findIndex(item => item.code === wanted);
      if (index >= 0) {
        list[index] = {
          ...list[index], accessRevoked: true,
          members: (list[index].members || []).filter(member => member.userId !== revokedUserId),
        };
        saveParties(list);
      }
    }
    removeToken(wanted);
    return result;
  }
  if (!result.error && cursor > 0 && result.party) {
    const cached = getParty(wanted);
    if (cached) {
      const bySeq = new Map((cached.log || []).map(post => [post.seq, post]));
      for (const post of result.party.log || []) bySeq.set(post.seq, post);
      result.party = {
        ...cached,
        ...result.party,
        log: [...bySeq.values()].sort((a, b) => a.seq - b.seq),
      };
    }
  }
  return rememberResponse(wanted, result);
}

/* ---------- the day's game state ---------- */

/* Who has done the thing the party agreed on, today. */
export function committedToday(party, when) {
  const key = dayKey(when);
  const ids = new Set();
  (party.log || []).forEach(p => {
    if (p.kind === 'commit' && !p.retracted && dayKey(p.sentAt) === key) ids.add(p.userId);
  });
  return ids;
}

export function hasCommittedToday(party, userId) {
  return committedToday(party).has(userId);
}

export function messagesUsedToday(party, userId) {
  const key = dayKey();
  return (party.log || []).filter(p =>
    p.kind === 'message' && p.userId === userId && dayKey(p.sentAt) === key
  ).length;
}

export function messagesUsedFinal(party, userId) {
  if (String(party?.state || '').toUpperCase() !== 'COMPLETED') return 0;
  const endedAt = new Date(party.endAt || party.endedAt || 0).getTime();
  if (!Number.isFinite(endedAt) || endedAt <= 0) return 0;
  return (party.log || []).filter(post =>
    post.kind === 'message' && post.userId === userId
      && new Date(post.sentAt).getTime() >= endedAt
  ).length;
}

/* Written by the server-side pet worker, never by a player. Kept here so
   the log can already render pet turns before the AI exists. */
export function appendPetTurn(code, { petId, bubbles, wakeHour }) {
  const list = allParties();
  const i = list.findIndex(p => p.code === String(code || '').toUpperCase());
  if (i < 0) return { error: 'NOT_FOUND' };

  const party = list[i];
  const lines = (Array.isArray(bubbles) ? bubbles : [bubbles])
    .map(s => String(s || '').trim())
    .filter(Boolean)
    .slice(0, PET_MAX_BUBBLES);
  if (!lines.length) return { skipped: true };   /* staying quiet is valid */

  let seq = party.log.length ? party.log[party.log.length - 1].seq : 0;
  lines.forEach(text => {
    party.log.push({
      seq: ++seq,
      userId: 'pet:' + petId,
      petId,
      kind: 'pet',
      body: text,
      sentAt: now(),
      wakeHour: typeof wakeHour === 'number' ? wakeHour : new Date().getHours(),
      reactions: {},
      retracted: false,
    });
  });
  party.updatedAt = now();
  list[i] = party;
  saveParties(list);
  return { count: lines.length };
}

export function budgetOf(party) {
  return MESSAGE_BUDGETS[party.budget] || MESSAGE_BUDGETS[DEFAULT_BUDGET];
}

export function messagesLeftToday(party, userId) {
  return Math.max(0, budgetOf(party).perDay - messagesUsedToday(party, userId));
}

export function messageAllowance(party, userId) {
  const budget = budgetOf(party);
  if (isActiveParty(party)) {
    const used = messagesUsedToday(party, userId);
    return { phase: 'daily', limit: budget.perDay, used, left: Math.max(0, budget.perDay - used), writable: true };
  }
  if (String(party?.state || '').toUpperCase() === 'COMPLETED') {
    const used = messagesUsedFinal(party, userId);
    const left = Math.max(0, budget.perDay - used);
    return { phase: left ? 'final' : 'history', limit: budget.perDay, used, left, writable: left > 0 };
  }
  return { phase: 'history', limit: budget.perDay, used: 0, left: 0, writable: false };
}

/* ---------- writing to the log ---------- */

/* Posts carry the true send time; delivery order is `seq`. A batched
   relay reads everything after a cursor in one go rather than streaming
   message by message. Once written a post is never edited — it can only
   be retracted (§16, §17). */
export async function postToParty(code, { body, kind = 'message', image = null }) {
  const wanted = String(code || '').toUpperCase();
  const path = kind === 'commit' ? 'commit' : 'message';
  const payload = kind === 'commit' ? { note: body } : { body };
  /* The picture is already a small WebP by this point — see
     image-compress.js. A Commit carries one without costing extra, and a
     Message spends the same single unit of budget it always did. */
  if (image) payload.image = { data: image.base64, width: image.width, height: image.height };
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/${path}`, {
    method: 'POST', code: wanted, body: payload,
  });
  return rememberResponse(wanted, result);
}

/* React is free and mutable — it is the acknowledgement channel that
   keeps low-value replies out of the log entirely (§13, §15). */
export async function toggleReaction(code, seq, emoji) {
  if (!REACTIONS.includes(emoji)) return { error: 'BAD_EMOJI' };
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/react`, {
    method: 'POST', code: wanted, body: { seq, emoji },
  });
  return rememberResponse(wanted, result);
}

/* Confirm belongs to one Commit. One other active member may confirm it;
   the server rejects self-confirmation and duplicate confirmation. */
export async function confirmCommit(code, seq) {
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/confirm`, {
    method: 'POST', code: wanted, body: { seq },
  });
  return rememberResponse(wanted, result);
}

/* Not an edit and not a delete: the entry stays in history, its content
   does not. This exists so a stray password or phone number can be
   pulled back without rewriting what the log says happened (§17). */
export async function retractPost(code, seq) {
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/retract`, {
    method: 'POST', code: wanted, body: { seq },
  });
  return rememberResponse(wanted, result);
}

export async function postsSince(code, seq = 0) {
  return refreshParty(code, seq);
}

/* ---------- party management + lifecycle ---------- */

export async function manageParty(code, action, patch = {}) {
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/manage`, {
    method: 'POST', code: wanted, body: { action, ...patch },
  });
  return rememberResponse(wanted, result);
}

export function renameParty(code, name) {
  return manageParty(code, 'rename', { name });
}

export function changeLeadCard(code, leadCardId) {
  const wanted = String(leadCardId || '').toUpperCase();
  if (!ownedCardIds().includes(wanted) || !cardById(wanted)?.eligibility?.partyCover) {
    return Promise.resolve({ ok: false, error: 'CARD_NOT_COVER_ELIGIBLE' });
  }
  const place = cardAvailability(wanted, { exceptPartyCode: code });
  if (place.status !== 'AVAILABLE') return Promise.resolve({ ok: false, error: 'CARD_IN_USE' });
  return manageParty(code, 'change_cover', { coverType: 'card', leadCardId: wanted });
}

export function useCardBackAsCover(code) {
  return manageParty(code, 'change_cover', { coverType: 'card_back', leadCardId: null });
}

export function changeNpcCard(code, npcCardId, petId = null) {
  const wanted = String(npcCardId || '').toUpperCase() || null;
  if (wanted && !ownedCardIds().includes(wanted)) return Promise.resolve({ ok: false, error: 'CARD_NOT_OWNED' });
  if (wanted && cardAvailability(wanted, { exceptPartyCode: code }).status !== 'AVAILABLE') {
    return Promise.resolve({ ok: false, error: 'CARD_IN_USE' });
  }
  return manageParty(code, 'change_npc', { npcCardId: wanted, petId });
}

export function kickPartyMember(code, userId) {
  return manageParty(code, 'kick', { userId });
}

export async function updatePartyIdentity(code, { alias, avatar, avatarColor }) {
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/me`, {
    method: 'POST', code: wanted, body: { alias, avatar, avatarColor },
  });
  return rememberResponse(wanted, result);
}

export async function finishParty(code, mode = 'complete') {
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/teambook/party/${encodeURIComponent(wanted)}/finish`, {
    method: 'POST', code: wanted, body: { mode: mode === 'dissolve' ? 'dissolve' : 'complete' },
  });
  return rememberResponse(wanted, result);
}

export function partyCompletionState(party, at = new Date()) {
  const startedAt = new Date(party?.startAt || party?.startedAt || party?.createdAt || at);
  const durationDays = Math.max(1, Number(party?.durationDays || 7));
  const start = startOfIctDay(startedAt);
  const fallbackEnd = new Date(start.getTime() + durationDays * 86400000);
  const scheduledEnd = new Date(party?.scheduledEndAt || fallbackEnd);
  const current = at instanceof Date ? at : new Date(at);
  const currentDay = startOfIctDay(current);
  const elapsed = Math.max(0, Math.floor((currentDay.getTime() - start.getTime()) / 86400000));
  return {
    eligible: Number.isFinite(scheduledEnd.getTime()) && current.getTime() >= scheduledEnd.getTime(),
    scheduledEndAt: scheduledEnd.toISOString(),
    day: Math.min(durationDays, elapsed + 1),
    durationDays,
    remainingMs: Math.max(0, scheduledEnd.getTime() - current.getTime()),
  };
}

/* ---------- unique local-first card rewards ---------- */

function seededHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededIndex(value, length) {
  return length ? seededHash(value) % length : 0;
}

/* A stable 0..1 from the same seed, so the rarity roll is as unrerollable
   as the card pick already was: asking twice for the same quest gives the
   same answer rather than a fresh spin. */
function seededUnit(value) {
  return seededHash(value) / 4294967296;
}

/* Roll the tier first at the published odds, then pick inside it. If that
   tier holds nothing new, walk outward to the nearest tier that does —
   a player who has finished a tier still deserves a card, and skipping
   the draw entirely would be worse than shifting it. Odds never adapt to
   past draws; there is no pity here, only exhaustion. */
function pickRewardCard(eligible, seed) {
  if (!eligible.length) return null;
  const byRarity = new Map();
  for (const card of eligible) {
    const list = byRarity.get(card.rarity) || [];
    list.push(card);
    byRarity.set(card.rarity, list);
  }
  const ladder = ['common', 'rare', 'epic', 'legendary'];
  const rolled = rollRarity(() => seededUnit(`${seed}|rarity`));
  const start = Math.max(0, ladder.indexOf(rolled));
  const order = [start];
  for (let step = 1; step < ladder.length; step += 1) {
    if (start - step >= 0) order.push(start - step);
    if (start + step < ladder.length) order.push(start + step);
  }
  for (const index of order) {
    const list = byRarity.get(ladder[index]);
    if (list && list.length) return list[seededIndex(seed, list.length)];
  }
  return eligible[seededIndex(seed, eligible.length)];
}

export function cardRewardForQuest(questId, partyCode = '') {
  const profile = getProfile();
  const wantedQuest = String(questId || 'milestone');
  const wantedParty = String(partyCode || '').toUpperCase();
  return profile?.cardRewards.find(reward =>
    reward.questId === wantedQuest && reward.partyCode === wantedParty
  ) || null;
}

/* Selection, ownership and the pending reveal are saved in one profile
   write before the reveal UI starts. Reloading can therefore only reopen
   the same card; it can never reroll the reward. */
export function prepareCardReward({ questId = 'milestone', partyCode = '' } = {}) {
  const profile = getProfile();
  if (!profile) return null;
  const normalizedQuest = String(questId || 'milestone').slice(0, 100);
  const normalizedParty = String(partyCode || '').toUpperCase().slice(0, 5);
  const existing = cardRewardForQuest(normalizedQuest, normalizedParty);
  if (existing) return existing;

  const owned = new Set(ownedCardIds(profile));
  const eligible = TEAMBOOK_CARDS.filter(card => card.eligibility.reward && !owned.has(card.cardId));
  const earnedAt = now();
  const rewardId = `reward_${uid(12)}`;
  const card = pickRewardCard(
    eligible, `${profile.id}|${normalizedQuest}|${normalizedParty}|${owned.size}`,
  );
  const reward = {
    rewardId,
    questId: normalizedQuest,
    partyCode: normalizedParty,
    cardId: card?.cardId || null,
    complete: !card,
    earnedAt,
    revealedAt: null,
  };
  saveProfile({
    ...profile,
    ownedCards: card ? [...profile.ownedCards, {
      cardId: card.cardId, acquiredAt: earnedAt, acquiredFrom: `quest:${normalizedQuest}`,
    }] : profile.ownedCards,
    cardRewards: [...profile.cardRewards, reward],
  }, { touch: true });
  return reward;
}

export const BRAND_NEW_CARD_QUEST = 'code:brandnewcard';

/* The `brandnewcard` code, typed on the Collection page. It draws exactly
   what a Quest draws — same published odds, same "yours before you open
   it" write, same reveal — so what a player sees here is the real thing
   rather than a special case.

   Each use gets its own quest id, which is what lets the code be typed
   again and land somewhere new: prepareCardReward is deliberately
   idempotent per quest, so reusing one id would just replay one card. The
   draw carries no partyCode, so opening it never waits on a server and it
   works for anyone, signed in or not. */
export function drawBrandNewCard() {
  const profile = getProfile();
  if (!profile) return null;
  const used = profile.cardRewards.filter(item =>
    String(item.questId || '').startsWith(BRAND_NEW_CARD_QUEST)
  ).length;
  return prepareCardReward({ questId: `${BRAND_NEW_CARD_QUEST}#${used + 1}` });
}

export function pendingCardReward(rewardId = '') {
  const rewards = getProfile()?.cardRewards || [];
  if (rewardId) return rewards.find(item => item.rewardId === rewardId) || null;
  return [...rewards].reverse().find(item => !item.revealedAt) || null;
}

export function markCardRewardRevealed(rewardId) {
  const profile = getProfile();
  if (!profile) return null;
  const at = now();
  const rewards = profile.cardRewards.map(item => item.rewardId === rewardId
    ? { ...item, revealedAt: item.revealedAt || at }
    : item);
  return saveProfile({ ...profile, cardRewards: rewards }, { touch: true });
}

export async function revealPartyCardReward(rewardId) {
  const reward = pendingCardReward(rewardId);
  if (!reward) return { ok: false, error: 'REWARD_NOT_FOUND' };
  if (reward.revealedAt) return { ok: true, reward };
  if (!reward.partyCode || reward.source !== 'server') {
    markCardRewardRevealed(reward.rewardId);
    return { ok: true, reward: pendingCardReward(reward.rewardId) };
  }
  const result = await api(`/api/teambook/party/${encodeURIComponent(reward.partyCode)}/reward/reveal`, {
    method: 'POST', code: reward.partyCode, body: { rewardId: reward.rewardId },
  });
  if (result.error) return result;
  const remembered = rememberResponse(reward.partyCode, result);
  return { ...remembered, reward: pendingCardReward(reward.rewardId) };
}

export function shouldOfferProgressSave(profile = getProfile()) {
  if (!profile) return false;
  const dismissedAt = new Date(profile.savePromptDismissedAt || 0).getTime();
  if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < 7 * 86400000) return false;
  return ownedCardIds(profile).length >= 1 || allParties().some(party =>
    ['COMPLETED', 'DISSOLVED'].includes(String(party.state || '').toUpperCase())
  );
}

/* ---------- calm progress surface ---------- */

export function partyProgress(party) {
  const length = Math.max(1, Number(party?.durationDays || 7));
  const start = startOfIctDay(party?.startAt || party?.createdAt || Date.now());
  const commits = new Map();
  const valid = new Map();
  for (const post of party?.log || []) {
    if (post.kind !== 'commit' || post.retracted) continue;
    const key = dayKey(post.sentAt);
    if (!commits.has(key)) commits.set(key, new Set());
    commits.get(key).add(post.userId);
    const isValid = party?.verificationMode !== 'confirm' || post.valid === true || !!post.confirmedBy;
    if (isValid) {
      if (!valid.has(key)) valid.set(key, new Set());
      valid.get(key).add(post.userId);
    }
  }
  return Array.from({ length }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    const key = dayKey(date.toISOString());
    const count = commits.get(key)?.size || 0;
    const validCount = valid.get(key)?.size || 0;
    return { day: index + 1, key, count, validCount, waitingCount: Math.max(0, count - validCount) };
  });
}

/* ---------- portable Ending Markdown ---------- */

function safeLine(value, fallback = '—') {
  const text = String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  return (text || fallback).replace(/([\\`*_[\]<>#])/g, '\\$1');
}

function isoDate(value) {
  const date = new Date(value || Date.now());
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '—';
}

function eventLine(event) {
  const data = event?.data || {};
  const companionName = value => cardById(value) ? cardNameTh(value) : (PET_BY_ID[value]?.nameTh || 'ไม่มี');
  const coverName = value => value === 'card_back' ? 'Card Back' : cardNameTh(value);
  const labels = {
    PARTY_CREATED: `เริ่มสมุดในชื่อ “${safeLine(data.name)}”`,
    MEMBER_JOINED: `${safeLine(data.alias, 'สมาชิกคนหนึ่ง')} เข้าร่วมการเดินทาง`,
    MEMBER_LEFT: `${safeLine(data.alias, 'สมาชิกคนหนึ่ง')} ออกจากการเดินทาง`,
    MEMBER_KICKED: `สมาชิกคนหนึ่งออกจากการเดินทาง`,
    PARTY_RENAMED: `เปลี่ยนชื่อสมุดจาก “${safeLine(data.from)}” เป็น “${safeLine(data.to)}”`,
    MEMBER_ALIAS_CHANGED: `เปลี่ยนชื่อในสมุดเป็น “${safeLine(data.alias)}”`,
    MEMBER_AVATAR_CHANGED: `${safeLine(data.alias, 'สมาชิกคนหนึ่ง')} เปลี่ยนตัวละครประจำสมุด`,
    LEAD_CARD_CHANGED: `เปลี่ยนปกสมุดจาก ${coverName(data.from)} เป็น ${coverName(data.to)}`,
    NPC_CHANGED: `เปลี่ยนเพื่อนร่วมทางจาก ${companionName(data.from)} เป็น ${companionName(data.to)}`,
    RULE_CHANGED: 'ปรับกติกาของสมุดระหว่างทาง',
    PARTY_COMPLETED: 'ทำการเดินทางนี้ครบและปิดสมุดอย่างสมบูรณ์',
    PARTY_DISSOLVED: 'ปิดการเดินทางก่อนกำหนด โดยเก็บสิ่งที่เกิดขึ้นไว้',
  };
  return labels[event?.type] || safeLine(event?.type, 'มีการเปลี่ยนแปลงในสมุด');
}

function bestCommitStreak(posts) {
  const byUser = new Map();
  for (const post of posts) {
    if (post.kind !== 'commit' || post.retracted) continue;
    if (!byUser.has(post.userId)) byUser.set(post.userId, new Set());
    byUser.get(post.userId).add(dayKey(post.sentAt));
  }
  let best = 0;
  for (const keys of byUser.values()) {
    const days = [...keys].sort().map(key => new Date(`${key}T00:00:00`).getTime());
    let run = 0; let previous = null;
    for (const value of days) {
      run = previous !== null && value - previous === 86400000 ? run + 1 : 1;
      best = Math.max(best, run); previous = value;
    }
  }
  return best;
}

function possibleCommitSlots(party, members, durationDays) {
  const start = startOfIctDay(party.startAt || party.createdAt || Date.now());
  const plannedEnd = new Date(start.getTime() + (durationDays - 1) * 86400000);
  const actualEnd = startOfIctDay(party.endAt || party.endedAt || plannedEnd);
  const end = actualEnd < plannedEnd ? actualEnd : plannedEnd;
  return members.reduce((total, member) => {
    const joined = startOfIctDay(member.joinedAt || start);
    const left = startOfIctDay(member.leftAt || end);
    const from = joined > start ? joined : start;
    const until = left < end ? left : end;
    return total + Math.max(0, Math.floor((until - from) / 86400000) + 1);
  }, 0);
}

function safeList(values, fallback = '—') {
  const items = (values || []).map(value => safeLine(value)).filter(Boolean);
  return items.length ? items.join(', ') : fallback;
}

function postReactionCount(post) {
  return Object.values(post?.reactions || {}).reduce(
    (total, people) => total + (Array.isArray(people) ? people.length : 0), 0,
  );
}

function shortMessage(value, max = 120) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return safeLine(text.length > max ? `${text.slice(0, max - 1)}…` : text, 'ข้อความกำลังใจหนึ่งข้อความ');
}

function fullTeamCommitDay(commits, members) {
  const byDay = new Map();
  for (const post of commits) {
    const key = dayKey(post.sentAt);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key).add(post.userId);
  }
  for (const [key, people] of [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const active = members.filter(member => {
      const joined = dayKey(member.joinedAt || key);
      const left = member.leftAt ? dayKey(member.leftAt) : null;
      return joined <= key && (!left || left >= key);
    });
    if (active.length > 1 && active.every(member => people.has(member.userId))) return key;
  }
  return '';
}

function selectTurningPoint({ events, messages, peakDay, fullCommitDay, context }) {
  const highImpactTypes = ['RULE_CHANGED', 'LEAD_CARD_CHANGED', 'NPC_CHANGED', 'MEMBER_LEFT', 'MEMBER_KICKED', 'PARTY_RENAMED'];
  const meaningfulEvent = highImpactTypes.map(type => events.find(event => event.type === type)).find(Boolean);
  if (meaningfulEvent) return `Day ${Number(meaningfulEvent.partyDay || 1)} — ${eventLine(meaningfulEvent)}`;

  const reactedMessage = [...messages]
    .filter(post => postReactionCount(post) > 0)
    .sort((a, b) => postReactionCount(b) - postReactionCount(a))[0];
  if (reactedMessage) {
    return `ข้อความ “${shortMessage(reactedMessage.body)}” กลายเป็น moment ที่เพื่อนตอบรับกัน ${postReactionCount(reactedMessage)} ครั้ง`;
  }

  const otherEvent = events.find(event => [
    'MEMBER_JOINED', 'MEMBER_ALIAS_CHANGED', 'MEMBER_AVATAR_CHANGED',
  ].includes(event.type));
  if (otherEvent) return `Day ${Number(otherEvent.partyDay || 1)} — ${eventLine(otherEvent)}`;
  if (fullCommitDay) return `วันที่ ${fullCommitDay} สมาชิกที่ยังอยู่ ลงชื่อ พร้อมกันครบสมุด`;
  if (peakDay) return `วันที่ ${peakDay[0]} สมุดขยับพร้อมกันมากที่สุด (ลงชื่อ ${peakDay[1]} ครั้ง)`;
  return context.comicGuidance.panel3;
}

/* Which party day a post fell on, counted from the book's own start rather
   than the reader's clock, so an episode window means the same thing to
   everyone in the book. */
function partyDayOf(iso, party) {
  const start = startOfIctDay(party?.startAt || party?.createdAt || Date.now());
  const at = startOfIctDay(iso || start);
  return Math.max(1, Math.round((at.getTime() - start.getTime()) / 86400000) + 1);
}

function windowFacts(party, commits, messages, events, fromDay, toDay) {
  const inWindow = day => day >= fromDay && day <= toDay;
  const dayCommits = commits.filter(post => inWindow(partyDayOf(post.sentAt, party)));
  const dayMessages = messages.filter(post => inWindow(partyDayOf(post.sentAt, party)));
  const dayEvents = events.filter(event => inWindow(Number(event.partyDay || 1)));
  const voices = dayMessages.slice(-4).map(post =>
    `  - “${safeLine(shortMessage(post.body))}”`);
  const notes = dayCommits.slice(-6).map(post =>
    `  - Day ${partyDayOf(post.sentAt, party)} · ${safeLine(shortMessage(post.body || '✓'))}`);
  return { dayCommits, dayMessages, dayEvents, voices, notes };
}

export function buildEndingMarkdown(party, { generatedAt = now() } = {}) {
  if (!party) return '';
  const members = (party.memberHistory?.length ? party.memberHistory : party.members || []);
  const lead = members.find(member => member.role === 'lead') || members[0];
  const events = Array.isArray(party.events) ? party.events : [];
  const log = Array.isArray(party.log) ? party.log : [];
  const context = activityContextForParty(party);
  const commits = log.filter(post => post.kind === 'commit' && !post.retracted
    && (party.verificationMode !== 'confirm' || post.valid === true || !!post.confirmedBy));
  const messages = log.filter(post => post.kind === 'message' && !post.retracted);
  const confirms = commits.filter(post => post.confirmedBy).length;
  const reactions = new Map();
  for (const post of log) for (const [emoji, people] of Object.entries(post.reactions || {})) {
    reactions.set(emoji, (reactions.get(emoji) || 0) + (Array.isArray(people) ? people.length : 0));
  }
  const reactionHighlights = [...reactions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([emoji, count]) => `${emoji} × ${count}`).join(', ') || '—';
  const duration = Math.max(1, Number(party.durationDays || 7));
  const possible = Math.max(1, possibleCommitSlots(party, members, duration));
  const completion = Math.min(100, Math.round((commits.length / possible) * 100));
  const pet = PET_BY_ID[party.petId];
  const leadCard = cardById(party.leadCardId);
  const npcCard = cardById(party.npcCardId);
  const companion = npcCard ? cardNameTh(npcCard) : (pet?.nameTh || 'ไม่มี');
  const endingKind = String(party.state || '').toUpperCase() === 'DISSOLVED'
    ? 'จบก่อนกำหนด (DISSOLVED)'
    : 'เดินทางครบและปิดสมุด (COMPLETED)';
  const eventLines = events.length
    ? events.map((event, index) => `${index + 1}. Day ${Number(event.partyDay || 1)} · ${isoDate(event.at)} — ${eventLine(event)}`)
    : [`1. Day 1 · ${isoDate(party.createdAt)} — เริ่มสมุดในชื่อ “${safeLine(party.name)}”`];
  const importantChanges = events
    .filter(event => ['PARTY_RENAMED', 'LEAD_CARD_CHANGED', 'NPC_CHANGED', 'RULE_CHANGED', 'MEMBER_KICKED'].includes(event.type))
    .map(event => `- Day ${Number(event.partyDay || 1)} — ${eventLine(event)}`);
  if (!importantChanges.length) importantChanges.push('- ไม่มีการเปลี่ยนแปลงสำคัญระหว่างทาง');
  const commitsByDay = new Map();
  commits.forEach(post => commitsByDay.set(dayKey(post.sentAt), (commitsByDay.get(dayKey(post.sentAt)) || 0) + 1));
  const peakDay = [...commitsByDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const togetherDay = fullTeamCommitDay(commits, members);
  const topMessage = [...messages]
    .filter(post => postReactionCount(post) > 0)
    .sort((a, b) => postReactionCount(b) - postReactionCount(a))[0];
  const endedAt = new Date(party.endAt || party.endedAt || 0).getTime();
  const finalMessage = Number.isFinite(endedAt) && endedAt > 0
    ? [...messages].reverse().find(post => new Date(post.sentAt).getTime() >= endedAt)
    : null;
  const memorableMoments = [
    peakDay ? `- วันที่ ${peakDay[0]} เป็นวันที่สมุดขยับพร้อมกันมากที่สุด (ลงชื่อ ${peakDay[1]} ครั้ง)` : '- ยังไม่มีการลงชื่อใน snapshot นี้',
    `- ภาษากำลังใจที่ใช้บ่อย: ${reactionHighlights}`,
  ];
  if (togetherDay) memorableMoments.push(`- วันที่ ${togetherDay} สมาชิกที่ยังอยู่ ลงชื่อ พร้อมกันครบสมุด`);
  if (topMessage) memorableMoments.push(`- ข้อความ ที่เพื่อนตอบรับมาก: “${shortMessage(topMessage.body)}” (${postReactionCount(topMessage)} reactions)`);
  if (finalMessage) memorableMoments.push(`- Final Message: “${shortMessage(finalMessage.body)}”`);
  const castLines = members.map(member => {
    const interval = member.leftAt ? ` · อยู่ถึง ${isoDate(member.leftAt)}` : '';
    return `- ${member.role === 'lead' ? 'Lead' : 'Member'}: ${safeLine(member.alias)} · เข้าร่วม ${isoDate(member.joinedAt)}${interval}`;
  });
  if (!castLines.length) castLines.push('- ไม่มีข้อมูลสมาชิกใน snapshot นี้');

  const storyEnd = String(party.state || '').toUpperCase() === 'DISSOLVED'
    ? 'การเดินทางหยุดก่อนกำหนด แต่ทุกครั้งที่ลงชื่อและการช่วยกันที่เกิดขึ้นยังเป็นหลักฐานของชีวิตจริง ไม่ถูกลบทิ้งหรือปลอมให้เป็นชัยชนะ'
    : `สมุดปิดฉากด้วย ${commits.length} ครั้งที่ลงชื่อ และความคืบหน้า ${completion}% ของกรอบเวลาที่ตั้งใจไว้`;
  const names = members.map(member => safeLine(member.alias)).join(', ') || 'เพื่อนในสมุด';
  const turningPoint = selectTurningPoint({
    events, messages, peakDay, fullCommitDay: togetherDay, context,
  });
  const visualCues = [...context.visualCues, ...context.objectCues];

  /* A finished book pays out in episodes of seven days plus one closing
     cover. Everything below is written from that plan, so a 3-day book and a
     28-day book get endings shaped by what they actually contain. */
  const plan = endingPlan(duration);
  const artStyle = 'warm school-notebook page, colored-pencil and crayon texture, '
    + 'cream paper, leafy-green accents, cute premium animal characters, small physical '
    + 'notebook props. A collectible memory, not an app screen. No photorealism, no dark '
    + 'mood, no UI chrome, no loot-box imagery.';

  const episodeSections = plan.episodeRanges.map(range => {
    const facts = windowFacts(party, commits, messages, events, range.fromDay, range.toDay);
    return [
      `## ตอนที่ ${range.episode} — วันที่ ${range.fromDay}–${range.toDay}`,
      '',
      `- ลงชื่อในตอนนี้: ${facts.dayCommits.length} ครั้ง`,
      `- ข้อความในตอนนี้: ${facts.dayMessages.length} ข้อความ`,
      facts.dayEvents.length
        ? `- สิ่งที่เปลี่ยนไป:\n${facts.dayEvents.map(event => `  - Day ${Number(event.partyDay || 1)} — ${eventLine(event)}`).join('\n')}`
        : '- สิ่งที่เปลี่ยนไป: ไม่มีการเปลี่ยนแปลงสำคัญในตอนนี้',
      facts.notes.length ? `- สิ่งที่ทำจริง:\n${facts.notes.join('\n')}` : '- สิ่งที่ทำจริง: ยังไม่มีการลงชื่อในตอนนี้',
      facts.voices.length ? `- เสียงของคนในสมุด:\n${facts.voices.join('\n')}` : null,
      '',
      `### Episode ${range.episode} Art Prompt`,
      '',
      `Draw four static comic panels telling only days ${range.fromDay}–${range.toDay} of “${safeLine(party.name)}”. ${artStyle}`,
      '',
      '- Speech is allowed in this picture: give the characters short spoken lines drawn '
        + 'as hand-lettered bubbles, using the real words above rather than invented dialogue.',
      `- Cast: ${names}${companion !== 'ไม่มี' ? ` และ ${safeLine(companion)}` : ''}`,
      `- Activity: ${safeLine(context.activityText)}`,
      `- Visual cues: ${safeList(visualCues)}`,
      `- Avoid: ${safeList(context.avoid)}`,
      `- End the episode on the feeling this week actually had, not on a win.`,
    ].filter(line => line !== null).join('\n');
  });

  const tail = plan.tailDays
    ? windowFacts(party, commits, messages, events, plan.tailDays.fromDay, plan.tailDays.toDay)
    : null;

  const coverDirections = [
    ['A · ภาพหมู่', `Everyone in the book together at the end of “${safeLine(party.name)}”, `
      + `doing ${safeLine(context.activityText)} side by side. The warmest of the three.`],
    ['B · ช่วงเวลาเดียว', `The single turning point of this book — ${safeLine(turningPoint)} — `
      + 'drawn as one quiet scene rather than a summary.'],
    ['C · ของที่เหลือไว้', `The objects this book leaves behind: ${safeList(context.endingMotifs)}, `
      + `${safeList(context.objectCues)}, arranged as a still life on notebook paper. No characters.`],
  ].map(([label, brief]) => `- **${label}** — ${brief}`);

  const closingCover = [
    '## ปกปิดท้าย — เจน 3 แบบ แล้วเลือก 1',
    '',
    'ปกนี้คือปกเดียวที่ใช้เป็นปกของสมุดเล่มนี้ได้ ให้ AI สร้างตามทิศทางข้างล่างทั้ง 3 แบบ '
      + 'แล้วคนในสมุดเลือกมา 1 ใบ',
    '',
    ...coverDirections,
    '',
    `ทุกแบบใช้สไตล์เดียวกัน: ${artStyle}`,
    '',
    '- **ห้ามมีตัวหนังสือในภาพปก** ไม่มีชื่อสมุด ไม่มีคำพูด ไม่มีวันที่ — ปกที่มีคำเขียนติดมา '
      + 'ใช้เป็นปกหนังสือไม่ได้ ชื่อจะถูกวางทับทีหลัง',
    `- Portrait 63:88 เท่าการ์ด เว้นพื้นที่เงียบไว้ด้านบนสำหรับวางชื่อ`,
    tail ? `- ช่วงท้ายที่ยังไม่ได้เป็นตอน (วันที่ ${plan.tailDays.fromDay}–${plan.tailDays.toDay}, `
      + `ลงชื่อ ${tail.dayCommits.length} ครั้ง) ให้เก็บอยู่ในปกใบนี้` : null,
    plan.toBeContinued
      ? `- สมุดเล่มนี้ยาว ${plan.days} วัน ซึ่งสั้นเกินกว่าจะสรุปว่าเรื่องจบแล้ว `
        + 'ให้วาดแบบ “ยังไม่จบ” — เป็นภาพเปิดค้างไว้ ให้รู้สึกว่ามีเล่มต่อไป ห้ามวาดฉากปิดจบ '
        + 'หรือฉากฉลองความสำเร็จ'
      : `- สมุดเล่มนี้เล่าจบ ${plan.episodes} ตอน ปกใบนี้คือภาพที่คนในสมุดจะจำเล่มนี้ได้`,
  ].filter(line => line !== null).join('\n');

  const sauceBody = [...episodeSections, closingCover].join('\n\n');

  return `# TeamBook · ปิดเล่ม — ${safeLine(party.name)}

> ไฟล์ความทรงจำจาก TeamBook · สร้างเมื่อ ${isoDate(generatedAt)} · ไม่มีอีเมล เบอร์โทร หรือรหัสภายใน

## สมุด

- สถานะตอนจบ: ${endingKind}
- กิจกรรม: ${safeLine(context.activityText)}
- กติกาการลงชื่อ: ${safeLine(party.commitRule)}
- ระยะเวลา: ${duration} วัน
- เริ่ม: ${isoDate(party.startAt || party.createdAt)}
- จบ: ${isoDate(party.endAt || party.endedAt || generatedAt)}
- รูปแบบสมุด: ${safeLine(party.preset, 'casual')}
- สีประจำสมุด: ${safeLine(party.color, 'green')}
- การ์ดเปิดสมุด: ${leadCard ? cardNameTh(leadCard) : safeLine(party.leadCardId)}
- เพื่อนร่วมทาง: ${safeLine(companion)}

## Cast

${castLines.join('\n')}

## Activity Preset Context

- Preset: ${safeLine(context.label)} (${safeLine(context.key)})
- Category: ${safeLine(context.category)}
- Tone: ${safeList(context.tone)}
- Story Frame: ${safeLine(context.storyFrame)}
- Success Meaning: ${safeLine(context.successMeaning)}
- Team Meaning: ${safeLine(context.teamMeaning)}
- Visual Cues: ${safeList(visualCues)}
- Ending Motifs: ${safeList(context.endingMotifs)}
- Avoid: ${safeList(context.avoid)}
${context.inferred ? `- Custom Context: infer จาก Activity “${safeLine(context.activityText)}” + ลงชื่อ Rule + ช่วง Log จริง` : ''}

## Timeline

${eventLines.join('\n')}

## Important Changes

${importantChanges.join('\n')}

## Funny / Memorable Moments

${memorableMoments.join('\n')}

## Character Notes

- ${safeLine(lead?.alias, 'เจ้าของสมุด')} เป็นคนเปิดพื้นที่และถือ การ์ดเปิดสมุดของการเดินทางนี้
- คนในสมุด: ${names}
- เพื่อนร่วมทาง: ${safeLine(companion)}${npcCard ? ` · บุคลิก “${safeLine(npcCard.personalityNameTh)}” · “${safeLine(npcCard.flavorTh)}”` : ''}
- โทนของสมุด: เบา เป็นมิตร และยึดสิ่งที่ทำจริงมากกว่าคะแนน

## Summary Stats

- Total valid commits: ${commits.length}
- Best streak: ${bestCommitStreak(commits)} วัน
- Completion rate: ${completion}%
- Confirms: ${confirms}
- Messages: ${messages.length}
- React highlights: ${reactionHighlights}

## Story Summary

“${safeLine(party.name)}” เริ่มจาก ${safeLine(context.storyFrame)} กติกาจริงคือ “${safeLine(party.commitRule)}” โดยมี ${safeLine(lead?.alias, 'เจ้าของสมุด')} สมาชิก ${names} และ ${safeLine(companion)} เป็นภาพจำของการเดินทาง

จากเรื่องในสมุด ความสำเร็จของเรื่องนี้หมายถึง ${safeLine(context.successMeaning)} และคุณค่าของทีมคือ ${safeLine(context.teamMeaning)} Turning point ที่ควรใช้เล่าเรื่องคือ ${safeLine(turningPoint)}

${storyEnd} ใช้ข้อเท็จจริงจาก Timeline, ลงชื่อ, ข้อความ, Reaction และ เห็นแล้ว ก่อน template เสมอ อย่าทำให้ประวัติดูสมบูรณ์แบบเกินสิ่งที่เกิดขึ้นจริง

${sauceBody}

---

นำไฟล์นี้ไปให้ AI ที่คุณใช้ แล้วสั่งทีละส่วน — ตอนที่ 1, 2, … แล้วค่อยปกปิดท้าย 3 แบบ
TeamBook เตรียมซอสให้จากเรื่องที่เกิดขึ้นจริง แต่ไม่สร้างหรือขายภาพสุ่มในแอป
`;
}

export function endingFileName(party) {
  const base = String(party?.name || party?.code || 'teambook-book')
    .trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'teambook-book';
  return `TeamBook-Ending-${base}.md`;
}

export function downloadEndingMarkdown(party) {
  const blob = new Blob([buildEndingMarkdown(party)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = endingFileName(party); anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function myPartyCodes() {
  const p = getProfile();
  if (!p) return [];
  const serverCodes = Object.keys(tokenMap());
  const localCodes = allParties()
    .filter(x => x.members.some(m => m.userId === p.id || m.userId === `local:${p.id}`))
    .map(x => x.code);
  return [...new Set([...serverCodes, ...localCodes])];
}
