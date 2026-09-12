export const CLAIM_ENDPOINT = 'https://www.myclover.com/api/course-review';
export const COURSE_QUEST = 'course:thedent-2026-09-12:feedback';
export const JOIN_PATH = '/join/?c=52113';

export class ClaimError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function persistedReward(profile, reward) {
  return !!profile?.cardRewards?.some(item => item.rewardId === reward.rewardId
    && item.cardId === reward.cardId && item.questId === COURSE_QUEST)
    && !!profile?.ownedCards?.some(item => (typeof item === 'string' ? item : item.cardId) === reward.cardId);
}

export function courseRevealPath(reward) {
  return `/reveal/?r=${encodeURIComponent(reward.rewardId)}&course=thedent`;
}

export function courseContinuation(reward, params) {
  return reward?.questId === COURSE_QUEST && params.get('course') === 'thedent' ? JOIN_PATH : null;
}

export async function claimAndPersist({ token, profileId, fetchImpl = fetch, getStoredProfile, importReward, cardById }) {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token || '')
    || !/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(profileId || '')) throw new ClaimError('INVALID_RECEIPT');
  if (getStoredProfile()?.id !== profileId) throw new ClaimError('PROFILE_CHANGED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response; let data;
  try {
    response = await fetchImpl(CLAIM_ENDPOINT, {
      method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ action: 'claim', token, profileId }), signal: controller.signal,
    });
    data = await response.json();
  } catch { throw new ClaimError('NETWORK'); }
  finally { clearTimeout(timer); }
  if (!response.ok || !data?.ok) throw new ClaimError(data?.code || data?.error || 'UNAVAILABLE');
  const reward = data.reward;
  if (!reward || !/^course_[A-Za-z0-9_-]{8,100}$/.test(reward.rewardId || '')
    || reward.questId !== COURSE_QUEST || !Number.isFinite(Date.parse(reward.earnedAt || ''))
    || !cardById(reward.cardId)?.eligibility?.reward) throw new ClaimError('INVALID_REWARD');
  // The user may have changed profiles in another tab while the request ran.
  if (getStoredProfile()?.id !== profileId) throw new ClaimError('PROFILE_CHANGED');
  // Course feedback is not a room completion; importing no partyCode avoids a room write on reveal.
  const saved = importReward({
    rewardId: reward.rewardId, cardId: reward.cardId, questId: reward.questId,
    earnedAt: reward.earnedAt, partyCode: '',
  });
  const stored = getStoredProfile();
  if (!saved || stored?.id !== profileId || !persistedReward(stored, reward)) throw new ClaimError('STORAGE_FAILED');
  return reward;
}
