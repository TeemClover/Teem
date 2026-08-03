/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Browser Collection Progress

   Schema v2 resets the old CORE7 progression once per browser.
   Every player starts with the four Generic cards. Completing a
   Match can unlock one random FIRST HAND card without duplicates.
   ═══════════════════════════════════════════════════════════════ */

import { FIRST_HAND, GENERIC_CARDS, cardById } from './cards.js';

export const COLLECTION_SCHEMA = 2;
export const STARTER_CARD_IDS = Object.freeze(GENERIC_CARDS.map(card => card.id));
export const TOTAL_COLLECTION_CARDS = STARTER_CARD_IDS.length + FIRST_HAND.length;
export const SELECT_MODE_UNLOCK_COUNT = 8;

const KEY_SCHEMA = 'c7:collection_schema';
const KEY_COLLECTION = 'c7:collection';
const KEY_COUNT = 'c7:collection_count';
const KEY_REWARDED_MATCHES = 'c7:rewarded_matches';
const KEY_HAND_MODE = 'c7:hand_mode';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

function removeKey(key) {
  try { localStorage.removeItem(key); } catch { /* private mode */ }
}

function validCardIds(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !cardById(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function syncPublicCount(ids) {
  /* Hall currently reads these public keys. Keep them mirrored until
     every surface imports this module directly. */
  writeJSON('mc_core7_collection', ids);
  writeJSON('mc_core7_collection_count', ids.length);
}

function resetLegacyCore7Progress() {
  /* Keep identity, preferences and an active Match snapshot so a deploy
     never throws someone out of a game already in progress. Everything
     that represents old progression starts again. */
  const preserved = key => (
    key === 'c7:guest'
    || key === 'c7:settings'
    || key === 'c7:cur_bot'
    || key.startsWith('c7:match_')
  );

  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('c7:') && !preserved(key)) keys.push(key);
    }
    keys.forEach(removeKey);
  } catch { /* private mode */ }

  removeKey('mc_core7_collection');
  removeKey('mc_core7_collection_count');
}

export function ensureCollection() {
  const schema = Number(readJSON(KEY_SCHEMA, 0));
  if (schema !== COLLECTION_SCHEMA) {
    resetLegacyCore7Progress();
    const starters = [...STARTER_CARD_IDS];
    writeJSON(KEY_SCHEMA, COLLECTION_SCHEMA);
    writeJSON(KEY_COLLECTION, starters);
    writeJSON(KEY_COUNT, starters.length);
    writeJSON(KEY_REWARDED_MATCHES, []);
    writeJSON(KEY_HAND_MODE, 'quick');
    syncPublicCount(starters);
    return starters;
  }

  const existing = validCardIds(readJSON(KEY_COLLECTION, []));
  const ids = [...STARTER_CARD_IDS];
  for (const id of existing) if (!ids.includes(id)) ids.push(id);
  writeJSON(KEY_COLLECTION, ids);
  writeJSON(KEY_COUNT, ids.length);
  syncPublicCount(ids);
  return ids;
}

export function getCollectionIds() {
  return [...ensureCollection()];
}

export function getCollectionCards() {
  return getCollectionIds().map(cardById).filter(Boolean);
}

export function getCollectionCount() {
  return getCollectionIds().length;
}

export function getUnlockedFirstHandIds() {
  const owned = new Set(getCollectionIds());
  return FIRST_HAND.filter(card => owned.has(card.id)).map(card => card.id);
}

export function ownsCard(cardId) {
  return getCollectionIds().includes(cardId);
}

export function canUseSelectMode() {
  return getCollectionCount() >= SELECT_MODE_UNLOCK_COUNT;
}

export function getHandMode() {
  const mode = readJSON(KEY_HAND_MODE, 'quick');
  if (mode === 'select' && canUseSelectMode()) return 'select';
  return 'quick';
}

export function setHandMode(mode) {
  const next = mode === 'select' && canUseSelectMode() ? 'select' : 'quick';
  writeJSON(KEY_HAND_MODE, next);
  return next;
}

function randomIndex(length) {
  if (length <= 1) return 0;
  try {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % length;
  } catch {
    return Math.floor(Math.random() * length);
  }
}

export function unlockRandomCard(matchId) {
  const ids = getCollectionIds();
  const rewardKey = String(matchId || '').trim();
  if (!rewardKey) return { card: null, isNew: false, count: ids.length, complete: ids.length >= TOTAL_COLLECTION_CARDS };

  const rewarded = new Set(readJSON(KEY_REWARDED_MATCHES, []));
  if (rewarded.has(rewardKey)) {
    return { card: null, isNew: false, count: ids.length, complete: ids.length >= TOTAL_COLLECTION_CARDS };
  }

  /* Mark the Match before drawing so reloads or double callbacks cannot
     grant two cards for the same completed Match. */
  rewarded.add(rewardKey);
  writeJSON(KEY_REWARDED_MATCHES, [...rewarded].slice(-200));

  const owned = new Set(ids);
  const available = FIRST_HAND.filter(card => !owned.has(card.id));
  if (!available.length) {
    return { card: null, isNew: false, count: ids.length, complete: true };
  }

  const card = available[randomIndex(available.length)];
  ids.push(card.id);
  writeJSON(KEY_COLLECTION, ids);
  writeJSON(KEY_COUNT, ids.length);
  syncPublicCount(ids);

  return {
    card,
    isNew: true,
    count: ids.length,
    complete: ids.length >= TOTAL_COLLECTION_CARDS,
    selectModeJustUnlocked: ids.length === SELECT_MODE_UNLOCK_COUNT,
  };
}

export function resetCollectionForTesting() {
  resetLegacyCore7Progress();
  return ensureCollection();
}
