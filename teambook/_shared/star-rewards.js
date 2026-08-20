import {
  importServerCardReward, markCardRewardRevealed, partyIdentity, pendingCardReward, refreshParty,
} from './store.js';

function authHeaders(code, hasBody = false) {
  const headers = { accept: 'application/json' };
  if (hasBody) headers['content-type'] = 'application/json';
  const token = partyIdentity(code)?.token;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function call(code, body) {
  try {
    const response = await fetch('/api/teambook-stars', {
      method: 'POST', credentials: 'same-origin', headers: authHeaders(code, true),
      body: JSON.stringify({ code, ...body }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? data : { ...data, error: data.error || `HTTP_${response.status}` };
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
}

function importRewards(code, rewards = []) {
  return rewards.map(item => importServerCardReward({
    rewardId: item.rewardId,
    questId: `party-stars:${code}:${item.milestone}`,
    partyCode: code,
    cardId: item.cardId,
    complete: item.complete,
    earnedAt: item.earnedAt,
    revealedAt: item.revealedAt,
  })).filter(Boolean);
}

export async function syncPartyStarRewards(code) {
  const wanted = String(code || '').trim();
  if (!/^\d{5}$/.test(wanted)) return { ok: false, error: 'INVALID_CODE' };
  const result = await call(wanted, { action: 'sync' });
  if (!result.error) importRewards(wanted, result.myRewards || []);
  return result;
}

export async function revealStarReward(rewardOrId) {
  const reward = typeof rewardOrId === 'string' ? pendingCardReward(rewardOrId) : rewardOrId;
  if (!reward?.rewardId || !/^party-stars:/.test(String(reward.questId || ''))) {
    return { ok: false, error: 'NOT_STAR_REWARD' };
  }
  const code = reward.partyCode;
  const result = await call(code, { action: 'reveal', rewardId: reward.rewardId });
  if (result.error) return result;
  markCardRewardRevealed(reward.rewardId);
  await refreshParty(code).catch(() => null);
  return { ...result, reward: pendingCardReward(reward.rewardId) };
}
