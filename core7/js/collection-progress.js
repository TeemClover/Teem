/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Browser Collection Progress

   Schema v3 resets CORE7 progression once more for every browser.
   Generic cards are Quick-play tools only. They are not part of the
   FIRST HAND collection and never count toward SELECT unlock.
   ═══════════════════════════════════════════════════════════════ */

/* ต้องเป็น import แรก — โมดูลนี้แปลงคีย์ GRAY เก่าใน localStorage ให้เป็น
   SILVER และต้องเสร็จก่อน ensureCollection() อ่านรายการการ์ดที่ปลดล็อกไว้
   ไม่งั้นจะเห็น id เก่าเป็นการ์ดที่ไม่มีอยู่ แล้วโยนทิ้งหมด */
import './migrate-silver.js';
import { FIRST_HAND, GENERIC_CARDS, cardById } from './cards.js';
import { reportCardUnlock } from './analytics.js';

export const COLLECTION_SCHEMA = 3;
export const STARTER_CARD_IDS = Object.freeze(GENERIC_CARDS.map(card => card.id));
export const TOTAL_COLLECTION_CARDS = FIRST_HAND.length; // FIRST HAND only: 28
export const TOTAL_PLAYABLE_CARDS = STARTER_CARD_IDS.length + FIRST_HAND.length; // 32
export const SELECT_MODE_UNLOCK_COUNT = 7; // 7 FIRST HAND cards, not 4 Generic cards

const FIRST_HAND_IDS = new Set(FIRST_HAND.map(card => card.id));
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

function validFirstHandIds(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !FIRST_HAND_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function syncPublicCount(firstHandIds) {
  /* Hall still presents total playable ownership as x/32. Keep that
     legacy surface accurate while FIRST HAND pages use x/28. */
  const playableIds = [...STARTER_CARD_IDS, ...firstHandIds];
  writeJSON('mc_core7_collection', playableIds);
  writeJSON('mc_core7_collection_count', playableIds.length);
  writeJSON('mc_core7_first_hand_count', firstHandIds.length);
}

function resetLegacyCore7Progress() {
  /* Keep identity, settings and an active Match snapshot so a deploy
     never throws someone out of a game already in progress. Everything
     that represents old progression starts again. */
  const preserved = key => (
    key === 'c7:guest'
    || key === 'c7:settings'
    || key === 'c7:cur_bot'
    /* ภาษาเป็นการตั้งค่า ไม่ใช่ความคืบหน้า — ล้างทิ้งแล้วคนที่เลือก EN ไว้
       จะเด้งกลับไทยเงียบ ๆ (i18n ย้ายค่านี้ไป mc_lang ให้ครั้งเดียว
       แต่ต้องรอดจากการล้างตรงนี้ก่อน) */
    || key === 'c7:lang'
    /* บัญชี "ยิงเข้าสถิติไปแล้ว" ไม่ใช่ความคืบหน้าของเกม มันคือบันทึกว่าเคย
       ส่งอะไรออกไปแล้วบ้าง ล้างทิ้งเมื่อไหร่ทุกขั้นของ Journey กับ Achievement
       จะถูกยิงซ้ำอีกรอบทั้งชุด แล้ว "กี่ครั้ง" กับ "กี่เครื่อง" จะเพี้ยนกันคนละโลก
       การล้างนี้รันครั้งแรกที่ทุกคนเข้าเกม ซึ่งอยู่กลางทางของ funnel พอดี */
    || key.startsWith('c7:analytics:')
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
  removeKey('mc_core7_first_hand_count');
}

export function ensureCollection() {
  const schema = Number(readJSON(KEY_SCHEMA, 0));
  if (schema !== COLLECTION_SCHEMA) {
    resetLegacyCore7Progress();
    const firstHandIds = [];
    writeJSON(KEY_SCHEMA, COLLECTION_SCHEMA);
    writeJSON(KEY_COLLECTION, firstHandIds);
    writeJSON(KEY_COUNT, 0);
    writeJSON(KEY_REWARDED_MATCHES, []);
    writeJSON(KEY_HAND_MODE, 'quick');
    syncPublicCount(firstHandIds);
    return firstHandIds;
  }

  const firstHandIds = validFirstHandIds(readJSON(KEY_COLLECTION, []));
  writeJSON(KEY_COLLECTION, firstHandIds);
  writeJSON(KEY_COUNT, firstHandIds.length);
  syncPublicCount(firstHandIds);
  return firstHandIds;
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

export function getTotalOwnedCount() {
  return STARTER_CARD_IDS.length + getCollectionCount();
}

export function getUnlockedFirstHandIds() {
  return getCollectionIds();
}

export function ownsCard(cardId) {
  return FIRST_HAND_IDS.has(cardId) && getCollectionIds().includes(cardId);
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
  const firstHandIds = getCollectionIds();
  const rewardKey = String(matchId || '').trim();
  if (!rewardKey) {
    return {
      card: null,
      isNew: false,
      count: firstHandIds.length,
      totalOwnedCount: STARTER_CARD_IDS.length + firstHandIds.length,
      complete: firstHandIds.length >= TOTAL_COLLECTION_CARDS,
    };
  }

  const rewarded = new Set(readJSON(KEY_REWARDED_MATCHES, []));
  if (rewarded.has(rewardKey)) {
    return {
      card: null,
      isNew: false,
      count: firstHandIds.length,
      totalOwnedCount: STARTER_CARD_IDS.length + firstHandIds.length,
      complete: firstHandIds.length >= TOTAL_COLLECTION_CARDS,
    };
  }

  /* Mark the Match before drawing so refreshes, double callbacks and SET
     transitions cannot grant two cards for the same completed Match. */
  rewarded.add(rewardKey);
  writeJSON(KEY_REWARDED_MATCHES, [...rewarded].slice(-1000));

  const owned = new Set(firstHandIds);
  const available = FIRST_HAND.filter(card => !owned.has(card.id));
  if (!available.length) {
    return {
      card: null,
      isNew: false,
      count: firstHandIds.length,
      totalOwnedCount: TOTAL_PLAYABLE_CARDS,
      complete: true,
    };
  }

  const card = available[randomIndex(available.length)];
  firstHandIds.push(card.id);
  writeJSON(KEY_COLLECTION, firstHandIds);
  writeJSON(KEY_COUNT, firstHandIds.length);
  syncPublicCount(firstHandIds);

  /* บอก Stat ว่ามีการ์ดใบใหม่ถูกเปิด — ยิงทิ้งไม่รอผล และห้าม throw
     ออกมาเด็ดขาด ไม่งั้นเน็ตล่มทีเดียวรางวัลไม่ขึ้นทั้งหน้า */
  try { reportCardUnlock({ cardId: card.id, matchId: rewardKey }); } catch { /* offline */ }

  return {
    card,
    isNew: true,
    count: firstHandIds.length,
    totalOwnedCount: STARTER_CARD_IDS.length + firstHandIds.length,
    complete: firstHandIds.length >= TOTAL_COLLECTION_CARDS,
    selectModeJustUnlocked: firstHandIds.length === SELECT_MODE_UNLOCK_COUNT,
  };
}

export function resetCollectionForTesting() {
  resetLegacyCore7Progress();
  return ensureCollection();
}

/* Every CORE7 page imports store.js, which imports this module. On every
   Match result—including each Match inside a SET—mount the reward popup. */
if (typeof window !== 'undefined' && /\/core7\/result\/?$/.test(location.pathname)) {
  import('./collection-reward-ui.js').catch(() => {});
}
