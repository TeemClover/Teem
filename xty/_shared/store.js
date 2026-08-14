/* ═══════════════════════════════════════════════════════════════
   XTY — server-backed data layer with a local display cache

   The player's lightweight profile and party credentials stay on the
   device; canonical party membership and the shared log live on the
   server. A local party snapshot keeps the last readable state offline.
   ═══════════════════════════════════════════════════════════════ */

import { XTY_V1_PET_IDS } from './pets.js';
import { AVATAR_BY_ID, avatarFallback } from './avatars.js';

const K_PROFILE = 'mc_xty_profile';
const K_PARTIES = 'mc_xty_parties';
const K_TOKENS = 'mc_xty_tokens';

export const XTY_PROFILE_KEY = K_PROFILE;

export const PARTY_MIN = 2;
export const PARTY_MAX = 5;
/* Kept for legacy data compatibility only. XTY V1 never renders /7. */
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

export const REACTIONS = Object.freeze(['❤️', '🔥', '👏', '😂', '🫡', '💪', '👀', '🍀']);

/* The pet wakes four times a day, reads what happened since it last
   spoke, and may say nothing at all. Fixed slots rather than replies
   keep it from becoming a chatbot that answers every message
   (Party Game Blueprint §20, §21). */
export const PET_WAKE_HOURS = Object.freeze([0, 6, 12, 18]);
export const PET_MAX_BUBBLES = 3;

/* TODO(config): reset time and time-zone behaviour are open decisions
   (§40). Local midnight is the placeholder, not a locked rule. */
export function dayKey(iso) {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/* Invite codes are read aloud and typed by hand, so keep them short and
   drop the character pairs people confuse. */
export function inviteCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint32Array(6);
  (crypto || window.crypto).getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 6; i++) s += a[buf[i] % a.length];
  return s.slice(0, 3) + '-' + s.slice(3);
}

/* ---------- profile ---------- */

const LEGACY_AVATAR_IDS = Object.freeze({
  '🍀': 'clover', '☀️': 'sun', '🌻': 'sun', '☁️': 'cloud',
  '🔥': 'flame', '🌊': 'wave', '⛰️': 'mountain', '🍜': 'ramen',
  '🎲': 'dice', '🎧': 'headphones', '📕': 'book', '📚': 'book',
  '👟': 'sneaker', '📷': 'camera',
});

function profileAvatarId(value) {
  if (AVATAR_BY_ID[value?.avatarId]) return value.avatarId;
  if (AVATAR_BY_ID[value?.avatar]) return value.avatar;
  return LEGACY_AVATAR_IDS[value?.avatar] || 'clover';
}

function validHandSize(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(1, n) : 1;
}

export function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const avatarId = profileAvatarId(value);
  const fallback = typeof value.avatarFallback === 'string' && value.avatarFallback
    ? value.avatarFallback
    : (typeof value.avatar === 'string' && !AVATAR_BY_ID[value.avatar] ? value.avatar : avatarFallback(avatarId));
  const currentPets = Array.isArray(value.petIds) ? value.petIds.filter(id => typeof id === 'string') : [];
  const createdAt = value.createdAt || now();
  return {
    ...value,
    version: 2,
    id: String(value.id || uid()),
    alias: String(value.alias || '').trim().slice(0, 24),
    avatarId,
    avatarFallback: fallback,
    /* Keep a compact legacy field while party rows migrate from emoji to
       canonical avatar ids. New writes store the id here. */
    avatar: avatarId,
    handSize: validHandSize(value.handSize || value.maxProfileCardSlots || 0),
    equippedCardId: typeof value.equippedCardId === 'string' ? value.equippedCardId : null,
    petIds: [...new Set([...currentPets, ...XTY_V1_PET_IDS])],
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

/* Every XTY V1 player starts with one Hand card and all eight friendly
   V1 pets. Unlock thresholds are intentionally not invented here. */
export function createProfile({ alias, avatarId, avatar }) {
  const pickedId = AVATAR_BY_ID[avatarId] ? avatarId
    : (AVATAR_BY_ID[avatar] ? avatar : (LEGACY_AVATAR_IDS[avatar] || 'clover'));
  return saveProfile({
    id: uid(),
    alias: String(alias || '').trim().slice(0, 24),
    avatarId: pickedId,
    avatarFallback: avatarFallback(pickedId, avatar),
    avatar: pickedId,
    createdAt: now(),
    updatedAt: now(),
    handSize: 1,
    equippedCardId: null,
    petIds: [...XTY_V1_PET_IDS],
  });
}

export function updateProfile(patch) {
  const p = getProfile();
  if (!p) return null;
  return saveProfile({ ...p, ...patch }, { touch: true });
}

export function ownsPet(petId) {
  const p = getProfile();
  return !!(p && p.petIds.includes(petId));
}

export function handSizeOf(profile) {
  return validHandSize(profile?.handSize || 1);
}

export function maxActiveParties(profile) {
  return handSizeOf(profile) + 1;
}

export function maxOwnedActiveParties(profile) {
  return handSizeOf(profile);
}

export function maxJoinedActiveParties(profile) {
  return handSizeOf(profile);
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

function rememberResponse(code, result) {
  if (!result || result.error) return result;
  const party = rememberParty(result.party);
  if (result.token || result.meUserId) saveToken(code || party?.code, result.token, result.meUserId);
  return { ...result, party };
}

export async function createParty({ name, activity, commitRule, budget, petId }) {
  const profile = getProfile();
  if (!profile) throw new Error('NO_PROFILE');
  const capacity = activePartyUsage(profile);
  if (capacity.owned >= capacity.maxOwned) throw limitError('OWNED_PARTY_LIMIT');
  if (capacity.total >= capacity.maxTotal) throw limitError('ACTIVE_PARTY_LIMIT');
  const result = await api('/api/xty/party', { method: 'POST', body: {
    name, activity, commitRule,
    budget: MESSAGE_BUDGETS[budget] ? budget : DEFAULT_BUDGET,
    petId: petId || null,
    alias: profile.alias,
    avatar: profile.avatarId || profile.avatarFallback,
    profileId: profile.id,
    handSize: handSizeOf(profile),
  }});
  if (result.error) {
    const error = new Error(result.error);
    error.code = result.error;
    throw error;
  }
  const saved = rememberResponse(result.party.code, result);
  return saved.party;
}

export async function joinParty(code, { alias, avatar }) {
  const wanted = String(code || '').toUpperCase();
  const profile = getProfile();
  const alreadyKnown = !!tokenMap()[wanted];
  if (profile && !alreadyKnown) {
    const capacity = activePartyUsage(profile);
    if (capacity.joined >= capacity.maxJoined) return { ok: false, error: 'JOINED_PARTY_LIMIT' };
    if (capacity.total >= capacity.maxTotal) return { ok: false, error: 'ACTIVE_PARTY_LIMIT' };
  }
  const result = await api(`/api/xty/party/${encodeURIComponent(wanted)}/join`, {
    method: 'POST', code: wanted, body: {
      alias,
      avatar: profile?.avatarId || avatar || profile?.avatarFallback,
      profileId: profile?.id || '',
      handSize: handSizeOf(profile),
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
    `/api/xty/party/${encodeURIComponent(wanted)}/feed?since=${cursor}`,
    { code: wanted },
  );
  if (result.error === 'AUTH_REQUIRED') return result;
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

/* ---------- writing to the log ---------- */

/* Posts carry the true send time; delivery order is `seq`. A batched
   relay reads everything after a cursor in one go rather than streaming
   message by message. Once written a post is never edited — it can only
   be retracted (§16, §17). */
export async function postToParty(code, { body, kind = 'message' }) {
  const wanted = String(code || '').toUpperCase();
  const path = kind === 'commit' ? 'commit' : 'message';
  const payload = kind === 'commit' ? { note: body } : { body };
  const result = await api(`/api/xty/party/${encodeURIComponent(wanted)}/${path}`, {
    method: 'POST', code: wanted, body: payload,
  });
  return rememberResponse(wanted, result);
}

/* React is free and mutable — it is the acknowledgement channel that
   keeps low-value replies out of the log entirely (§13, §15). */
export async function toggleReaction(code, seq, emoji) {
  if (!REACTIONS.includes(emoji)) return { error: 'BAD_EMOJI' };
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/xty/party/${encodeURIComponent(wanted)}/react`, {
    method: 'POST', code: wanted, body: { seq, emoji },
  });
  return rememberResponse(wanted, result);
}

/* Not an edit and not a delete: the entry stays in history, its content
   does not. This exists so a stray password or phone number can be
   pulled back without rewriting what the log says happened (§17). */
export async function retractPost(code, seq) {
  const wanted = String(code || '').toUpperCase();
  const result = await api(`/api/xty/party/${encodeURIComponent(wanted)}/retract`, {
    method: 'POST', code: wanted, body: { seq },
  });
  return rememberResponse(wanted, result);
}

export async function postsSince(code, seq = 0) {
  return refreshParty(code, seq);
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
