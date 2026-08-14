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

export function createParty({ name, activity, commitRule, budget, petId }) {
  const profile = getProfile();
  if (!profile) throw new Error('NO_PROFILE');

  const party = {
    id: uid(),
    code: inviteCode(),
    name: String(name || '').trim().slice(0, 40),
    /* Activity is free text on purpose: XTY must never be hard-coded to
       one domain (Pivot Blueprint §15, §51). */
    activity: String(activity || '').trim().slice(0, 60),
    /* The lead decides what counts as a Commit — that rule is the game
       (Party Game Blueprint §7). */
    commitRule: String(commitRule || '').trim().slice(0, 120),
    budget: MESSAGE_BUDGETS[budget] ? budget : DEFAULT_BUDGET,
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
export function postToParty(code, { body, kind = 'message' }) {
  const list = allParties();
  const i = list.findIndex(p => p.code === String(code || '').toUpperCase());
  if (i < 0) return { error: 'NOT_FOUND' };

  const profile = getProfile();
  const party = list[i];
  const userId = profile ? profile.id : 'anon';
  const text = String(body || '').trim().slice(0, 2000);

  if (kind === 'message') {
    if (!text) return { error: 'EMPTY' };
    if (messagesLeftToday(party, userId) <= 0) return { error: 'NO_BUDGET' };
  }
  if (kind === 'commit' && hasCommittedToday(party, userId)) {
    return { error: 'ALREADY_COMMITTED' };
  }

  const post = {
    seq: (party.log.length ? party.log[party.log.length - 1].seq : 0) + 1,
    userId,
    alias: profile ? profile.alias : 'ใครบางคน',
    avatar: profile ? profile.avatar : '🍀',
    kind,                 /* 'commit' | 'message' */
    body: text,
    sentAt: now(),
    reactions: {},        /* emoji -> [userId] */
    retracted: false,
  };
  party.log.push(post);
  party.updatedAt = now();
  list[i] = party;
  saveParties(list);
  return { post, party };
}

/* React is free and mutable — it is the acknowledgement channel that
   keeps low-value replies out of the log entirely (§13, §15). */
export function toggleReaction(code, seq, emoji) {
  if (!REACTIONS.includes(emoji)) return { error: 'BAD_EMOJI' };
  const list = allParties();
  const i = list.findIndex(p => p.code === String(code || '').toUpperCase());
  if (i < 0) return { error: 'NOT_FOUND' };

  const profile = getProfile();
  const userId = profile ? profile.id : 'anon';
  const party = list[i];
  const post = party.log.find(p => p.seq === seq);
  if (!post) return { error: 'NO_POST' };

  post.reactions = post.reactions || {};
  const who = post.reactions[emoji] || [];
  const at = who.indexOf(userId);
  if (at >= 0) who.splice(at, 1); else who.push(userId);
  if (who.length) post.reactions[emoji] = who; else delete post.reactions[emoji];

  party.updatedAt = now();
  list[i] = party;
  saveParties(list);
  return { post };
}

/* Not an edit and not a delete: the entry stays in history, its content
   does not. This exists so a stray password or phone number can be
   pulled back without rewriting what the log says happened (§17). */
export function retractPost(code, seq) {
  const list = allParties();
  const i = list.findIndex(p => p.code === String(code || '').toUpperCase());
  if (i < 0) return { error: 'NOT_FOUND' };

  const profile = getProfile();
  const userId = profile ? profile.id : 'anon';
  const party = list[i];
  const post = party.log.find(p => p.seq === seq);
  if (!post) return { error: 'NO_POST' };
  if (post.userId !== userId) return { error: 'NOT_YOURS' };

  post.retracted = true;
  post.body = '';
  party.updatedAt = now();
  list[i] = party;
  saveParties(list);
  return { post };
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
