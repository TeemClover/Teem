/* ═══════════════════════════════════════════════════════════════
   XTY — local-first data layer

   Everything is kept on the device today. Keys are namespaced `mc_xty_*`
   deliberately: the existing account sync (assets/account.js) only
   harvests keys prefixed `mc_`, `mc-` or `c7:`, so a player who later
   signs in keeps their profile and parties without any extra wiring.

   Every read/write for parties goes through this module so the storage
   backend can be swapped for the server (D1) without touching any page.
   ═══════════════════════════════════════════════════════════════ */

import { STARTER_PET_IDS } from './pets.js';

const K_PROFILE = 'mc_xty_profile';
const K_PARTIES = 'mc_xty_parties';

export const PARTY_MIN = 2;
export const PARTY_MAX = 5;
export const MAX_PROFILE_WORDS = 7;

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

export function getProfile() {
  return read(K_PROFILE, null);
}

export function hasProfile() {
  const p = getProfile();
  return !!(p && p.alias);
}

/* Creating a profile grants the four Starter pets immediately, while
   Profile Word slots deliberately start empty at 0/7 (Pet Blueprint §15). */
export function createProfile({ alias, avatar }) {
  const profile = {
    id: uid(),
    alias: String(alias || '').trim().slice(0, 24),
    avatar: avatar || '🍀',
    createdAt: now(),
    updatedAt: now(),
    /* TODO(config): level/XP and the slot-unlock cadence are explicitly
       undecided (Pivot Blueprint §10, §52) — do not invent a formula. */
    level: 1,
    xp: 0,
    maxProfileCardSlots: 0,
    profileCardIds: [],
    petIds: [...STARTER_PET_IDS],
  };
  write(K_PROFILE, profile);
  return profile;
}

export function updateProfile(patch) {
  const p = getProfile();
  if (!p) return null;
  const next = { ...p, ...patch, updatedAt: now() };
  if (next.profileCardIds.length > next.maxProfileCardSlots) {
    next.profileCardIds = next.profileCardIds.slice(0, next.maxProfileCardSlots);
  }
  if (next.maxProfileCardSlots > MAX_PROFILE_WORDS) {
    next.maxProfileCardSlots = MAX_PROFILE_WORDS;
  }
  write(K_PROFILE, next);
  return next;
}

export function ownsPet(petId) {
  const p = getProfile();
  return !!(p && p.petIds.includes(petId));
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

export function createParty({ name, activity, petId }) {
  const profile = getProfile();
  if (!profile) throw new Error('NO_PROFILE');

  const party = {
    id: uid(),
    code: inviteCode(),
    name: String(name || '').trim().slice(0, 40),
    /* Activity is free text on purpose: XTY must never be hard-coded to
       one domain (Pivot Blueprint §15, §51). */
    activity: String(activity || '').trim().slice(0, 60),
    petId: petId || null,   /* no pet is simply an empty seat */
    createdAt: now(),
    updatedAt: now(),
    members: [{
      userId: profile.id,
      alias: profile.alias,
      avatar: profile.avatar,
      role: 'lead',
      joinedAt: now(),
    }],
    log: [],
  };

  const list = allParties();
  list.unshift(party);
  saveParties(list);
  return party;
}

export function joinParty(code, { alias, avatar }) {
  const list = allParties();
  const i = list.findIndex(p => p.code === String(code || '').toUpperCase());
  if (i < 0) return { error: 'NOT_FOUND' };

  const party = list[i];
  const profile = getProfile();
  const userId = profile ? profile.id : uid();

  if (party.members.some(m => m.userId === userId)) return { party };
  if (party.members.length >= PARTY_MAX) return { error: 'FULL' };

  party.members.push({
    userId,
    alias: String(alias || (profile && profile.alias) || '').trim().slice(0, 24),
    avatar: avatar || (profile && profile.avatar) || '🍀',
    role: 'member',
    joinedAt: now(),
  });
  party.updatedAt = now();
  list[i] = party;
  saveParties(list);
  return { party };
}

/* Posts carry the true send time; delivery order is `seq`. A batched
   relay reads everything after a cursor in one go rather than streaming
   message by message. */
export function postToParty(code, { body, kind = 'message' }) {
  const list = allParties();
  const i = list.findIndex(p => p.code === String(code || '').toUpperCase());
  if (i < 0) return { error: 'NOT_FOUND' };

  const profile = getProfile();
  const party = list[i];
  const text = String(body || '').trim().slice(0, 2000);
  if (!text && kind === 'message') return { error: 'EMPTY' };

  const post = {
    seq: (party.log.length ? party.log[party.log.length - 1].seq : 0) + 1,
    userId: profile ? profile.id : 'anon',
    alias: profile ? profile.alias : 'ใครบางคน',
    avatar: profile ? profile.avatar : '🍀',
    kind,                 /* 'message' | 'checkin' */
    body: text,
    sentAt: now(),
  };
  party.log.push(post);
  party.updatedAt = now();
  list[i] = party;
  saveParties(list);
  return { post, party };
}

export function postsSince(code, seq = 0) {
  const party = getParty(code);
  if (!party) return { posts: [], head: 0 };
  const posts = party.log.filter(p => p.seq > seq);
  return { posts, head: party.log.length ? party.log[party.log.length - 1].seq : 0 };
}

export function myPartyCodes() {
  const p = getProfile();
  if (!p) return [];
  return allParties()
    .filter(x => x.members.some(m => m.userId === p.id))
    .map(x => x.code);
}
