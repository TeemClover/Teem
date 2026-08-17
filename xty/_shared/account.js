import {
  XTY_PROFILE_KEY, getProfile, handSizeOf, normalizeProfile, refreshParty, saveProfile,
} from './store.js';
import { XTY_V1_PET_IDS } from './pets.js';

const XTY_TOKENS_KEY = 'mc_xty_tokens';

async function request(path, options = {}) {
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? data : { ...data, error: data.error || `HTTP_${response.status}` };
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
}

export async function getSession() {
  const result = await request('/api/auth/session');
  return result.error ? null : (result.user || null);
}

export async function isAuthenticated() {
  return !!(await getSession());
}

export function startLineLogin(returnTo = '/xty/') {
  const target = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/xty/';
  location.href = `/api/auth/oauth/line/start?return=${encodeURIComponent(target)}`;
}

export function requestEmailOtp(email) {
  return request('/api/auth/otp/request', {
    method: 'POST', body: JSON.stringify({ email: String(email || '').trim().toLowerCase() }),
  });
}

export async function bindXtyIdentity(profileId = getProfile()?.id) {
  if (!profileId) return { ok: false, error: 'NO_PROFILE' };
  return request('/api/xty/bind', {
    method: 'POST', body: JSON.stringify({ profileId }),
  });
}

export async function verifyEmailOtp({ requestId, otp, name } = {}) {
  const verified = await request('/api/auth/otp/verify', {
    method: 'POST', body: JSON.stringify({ requestId, otp, name }),
  });
  if (verified.error) return verified;
  const bound = await bindXtyIdentity();
  if (bound.error) return bound;
  const synced = await syncXtyProfile();
  return synced.error ? synced : { ...verified, profile: synced.profile };
}

function parseProfile(value) {
  if (value && typeof value === 'object') return normalizeProfile(value);
  try { return normalizeProfile(JSON.parse(value)); }
  catch { return null; }
}

function time(value) {
  const n = new Date(value || 0).getTime();
  return Number.isFinite(n) ? n : 0;
}

function earlier(a, b) {
  if (!a) return b || new Date().toISOString();
  if (!b) return a;
  return time(a) <= time(b) ? a : b;
}

function later(a, b) {
  if (!a) return b || new Date().toISOString();
  if (!b) return a;
  return time(a) >= time(b) ? a : b;
}

function unionById(local = [], cloud = [], key) {
  const merged = new Map();
  for (const item of [...cloud, ...local]) {
    if (!item || !item[key]) continue;
    const old = merged.get(item[key]);
    if (!old) { merged.set(item[key], item); continue; }
    const combined = { ...old, ...item };
    if (old.acquiredAt || item.acquiredAt) combined.acquiredAt = earlier(old.acquiredAt, item.acquiredAt);
    if (old.earnedAt || item.earnedAt) combined.earnedAt = earlier(old.earnedAt, item.earnedAt);
    if ('revealedAt' in old || 'revealedAt' in item) combined.revealedAt = old.revealedAt || item.revealedAt || null;
    merged.set(item[key], combined);
  }
  return [...merged.values()];
}

/* Merge is intentionally narrow. Alias/avatar follow the latest explicit
   profile edit, pets form a union, and client balances are never added. */
export function mergeXtyProfile(localValue, cloudValue) {
  const local = parseProfile(localValue);
  const cloud = parseProfile(cloudValue);
  if (!local) return cloud;
  if (!cloud) return local;

  const newest = time(local.updatedAt) >= time(cloud.updatedAt) ? local : cloud;
  const older = newest === local ? cloud : local;
  const collectionResetAt = !local.collectionResetAt ? (cloud.collectionResetAt || null)
    : (!cloud.collectionResetAt ? local.collectionResetAt
      : (time(local.collectionResetAt) >= time(cloud.collectionResetAt) ? local.collectionResetAt : cloud.collectionResetAt));
  const resetTime = time(collectionResetAt);
  const mergedOwnedCards = unionById(local.ownedCards, cloud.ownedCards, 'cardId')
    .filter(item => !resetTime || time(item.acquiredAt) > resetTime);
  const mergedCardRewards = unionById(local.cardRewards, cloud.cardRewards, 'rewardId')
    .filter(item => !resetTime || time(item.earnedAt) > resetTime);
  return normalizeProfile({
    ...older,
    ...newest,
    /* Once a profile exists in cloud its id is the durable account-side
       XTY identity and must survive a second-device merge. */
    id: cloud.id || local.id,
    alias: newest.alias,
    avatarId: newest.avatarId,
    avatarFallback: newest.avatarFallback,
    avatarFrame: newest.avatarFrame || older.avatarFrame || 'green',
    handSize: Math.max(handSizeOf(local), handSizeOf(cloud)),
    level: Math.max(Number(local.level || 1), Number(cloud.level || 1)),
    paidTier: cloud.paidTier || local.paidTier || 'free',
    bonusSlotEntitlement: Math.max(Number(local.bonusSlotEntitlement || 0), Number(cloud.bonusSlotEntitlement || 0)),
    unlockedBonusSlots: Math.max(Number(local.unlockedBonusSlots || 0), Number(cloud.unlockedBonusSlots || 0)),
    petIds: [...new Set([
      ...(local.petIds || []),
      ...(cloud.petIds || []),
      ...XTY_V1_PET_IDS,
    ])],
    /* Card ownership is append-only during a conservative local/cloud
       merge, except after the explicit Collection test reset tombstone. */
    ownedCards: mergedOwnedCards,
    cardRewards: mergedCardRewards,
    equippedCardId: mergedOwnedCards.some(item => item.cardId === newest.equippedCardId)
      ? newest.equippedCardId
      : (mergedOwnedCards.some(item => item.cardId === older.equippedCardId) ? older.equippedCardId : null),
    collectionResetAt,
    debugUnlockedAt: !local.debugUnlockedAt ? (cloud.debugUnlockedAt || null)
      : (!cloud.debugUnlockedAt ? local.debugUnlockedAt
        : (time(local.debugUnlockedAt) >= time(cloud.debugUnlockedAt) ? local.debugUnlockedAt : cloud.debugUnlockedAt)),
    createdAt: earlier(local.createdAt, cloud.createdAt),
    updatedAt: later(local.updatedAt, cloud.updatedAt),
    lifetimeCommitCount: Math.max(
      Number(local.lifetimeCommitCount || 0),
      Number(cloud.lifetimeCommitCount || 0),
    ),
    /* latest profile wins; never sum two client balances */
    pointsBalance: newest.pointsBalance ?? older.pointsBalance ?? 0,
  });
}

export async function loadCloudProgress() {
  const result = await request('/api/progress');
  if (result.error) return result;
  const progress = result.progress && typeof result.progress === 'object' ? result.progress : {};
  return {
    ...result,
    profile: parseProfile(progress[XTY_PROFILE_KEY]),
  };
}

export async function saveCloudProgress(profile = getProfile()) {
  const normalized = normalizeProfile(profile);
  if (!normalized) return { ok: false, error: 'NO_PROFILE' };
  return request('/api/progress', {
    method: 'PUT',
    body: JSON.stringify({ progress: { [XTY_PROFILE_KEY]: JSON.stringify(normalized) } }),
  });
}

function readRecoveryTokens() {
  try {
    const parsed = JSON.parse(localStorage.getItem(XTY_TOKENS_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function seedAccountPartyCodes(codes, meUserId) {
  if (typeof localStorage === 'undefined') return;
  const map = readRecoveryTokens();
  for (const raw of codes || []) {
    const code = String(raw || '').toUpperCase();
    if (!/^\d{5}$/.test(code)) continue;
    const old = map[code];
    map[code] = {
      token: typeof old === 'string' ? old : (old?.token || ''),
      userId: meUserId || (typeof old === 'object' ? old?.userId : '') || '',
    };
  }
  try { localStorage.setItem(XTY_TOKENS_KEY, JSON.stringify(map)); } catch {}
}

/* Restore the list of currently active parties from the durable myClover
   account. Party content itself is still canonical on the XTY server; the
   browser only rebuilds its local display cache. This works for LINE,
   Google, email OTP, or any other provider that creates the same account
   session cookie. */
export async function resyncXtyParties() {
  const user = await getSession();
  if (!user) return { ok: false, error: 'AUTH_REQUIRED', restored: 0, failed: 0 };

  const profile = getProfile();
  if (profile?.id) await bindXtyIdentity(profile.id);

  const mine = await request('/api/xty-mine');
  if (mine.error) return { ...mine, restored: 0, failed: 0 };

  const codes = [...new Set((mine.codes || []).map(code => String(code || '').toUpperCase()).filter(code => /^\d{5}$/.test(code)))];
  seedAccountPartyCodes(codes, mine.meUserId || '');

  let restored = 0; let failed = 0;
  await Promise.all(codes.map(async code => {
    const result = await refreshParty(code);
    if (result?.error) failed += 1;
    else restored += 1;
  }));

  return { ok: failed === 0, restored, failed, total: codes.length, meUserId: mine.meUserId || '' };
}

export async function syncXtyProfile({ recoverParties = true } = {}) {
  const user = await getSession();
  if (!user) return { ok: true, authenticated: false, profile: getProfile(), user: null };

  /* Bind the local XTY identity to the account on every authenticated
     sync, not just after an email OTP. A party created before signing in
     is filed under `local:<profileId>`, and the server counts that id
     against the account's party limit but will not accept it as proof of
     membership — so an unbound party blocks party creation while being
     impossible to open or dissolve. */
  const localId = getProfile()?.id;
  if (localId) await bindXtyIdentity(localId);

  const cloud = await loadCloudProgress();
  if (cloud.error) return { ...cloud, authenticated: true, profile: getProfile(), user };

  const merged = mergeXtyProfile(getProfile(), cloud.profile);
  if (!merged) return { ok: true, authenticated: true, profile: null, user };
  const profile = saveProfile(merged);

  /* A fresh browser can start with no local profile at all. In that case
     the cloud profile id becomes available only after the merge above, so
     bind it once more here before asking the server which parties belong
     to the account. */
  if (profile?.id && profile.id !== localId) await bindXtyIdentity(profile.id);

  const saved = await saveCloudProgress(profile);
  let recovery = null;
  if (recoverParties) recovery = await resyncXtyParties();

  return saved.error
    ? { ...saved, authenticated: true, profile, user, recovery }
    : { ok: true, authenticated: true, profile, user, recovery };
}

/* Invite onboarding polish.
   The home page owns the actual join state; this only keeps the UI aligned
   with an invite URL without changing the party API or membership rules. */
(function installInviteOnboardingUi() {
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  const start = document.getElementById('startButton');
  const back = document.getElementById('backWelcome');
  const quickCode = document.getElementById('quickCode');
  const quickJoin = document.getElementById('quickJoin');
  if (!start || !back || !quickCode || !quickJoin) return;

  const fromUrl = new URLSearchParams(location.search).get('c');
  const inviteCode = /^\d{5}$/.test(fromUrl || '') ? fromUrl : '';
  if (inviteCode) start.textContent = 'เข้าตี้';

  start.addEventListener('click', event => {
    const code = /^\d{5}$/.test(quickCode.value || '') ? quickCode.value : inviteCode;
    if (!code) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    quickCode.value = code;
    quickJoin.disabled = false;
    quickJoin.click();
  }, true);

  back.addEventListener('click', event => {
    const code = /^\d{5}$/.test(quickCode.value || '') ? quickCode.value : inviteCode;
    if (!code) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const welcome = document.getElementById('welcomeStep');
    const identity = document.getElementById('identityStep');
    const create = document.getElementById('createProfile');
    const error = document.getElementById('inviteJoinError');
    if (identity) identity.hidden = true;
    if (welcome) welcome.hidden = false;
    quickCode.value = code;
    quickJoin.disabled = false;
    start.textContent = 'เข้าตี้';
    if (create) create.textContent = 'สร้างตัวแล้วเข้าตี้';
    if (error) error.hidden = true;
  }, true);
})();
