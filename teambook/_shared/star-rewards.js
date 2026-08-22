import {
  importServerCardReward, markCardRewardRevealed, partyIdentity, pendingCardReward, refreshParty,
} from './store.js';

const FIRST_STAR_SAVE_PROMPT_KEY = 'teambook_first_star_save_prompt_seen_v1';

if (typeof window !== 'undefined' && /^\/reveal\/?$/.test(window.location.pathname)) {
  installRevealSavePromptGate();
}

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

function firstStarPromptKey(code) {
  const userId = partyIdentity(code)?.userId || 'local';
  return `${FIRST_STAR_SAVE_PROMPT_KEY}:${userId}`;
}

function firstStarPromptSeen(code) {
  try { return localStorage.getItem(firstStarPromptKey(code)) === '1'; } catch { return false; }
}

function rememberFirstStarPrompt(code) {
  try { localStorage.setItem(firstStarPromptKey(code), '1'); } catch {}
}

function installRevealSavePromptGate() {
  const install = () => {
    const prompt = document.getElementById('savePrompt');
    if (!prompt || prompt.dataset.milestoneGate === '1') return;
    prompt.dataset.milestoneGate = '1';
    /* Save Progress used to appear after every kind of card. From now on it
       belongs to the first 3-star payoff: earn value first, then ask the
       player to protect the notebook and collection. */
    const observer = new MutationObserver(() => {
      if (!prompt.hidden && prompt.dataset.milestoneSave !== '1') prompt.hidden = true;
    });
    observer.observe(prompt, { attributes: true, attributeFilter: ['hidden'] });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    queueMicrotask(install);
  }
}

async function offerFirstStarSavePrompt(code) {
  if (firstStarPromptSeen(code)) return;
  const prompt = document.getElementById('savePrompt');
  if (!prompt) return;

  try {
    const { getSession } = await import('./account.js');
    const session = await getSession();
    if (session) {
      rememberFirstStarPrompt(code);
      return;
    }
  } catch {
    /* If session lookup is unavailable, the profile page still verifies the
       account before saving. The prompt itself is safe to show. */
  }

  prompt.dataset.milestoneSave = '1';
  const label = prompt.querySelector('.label');
  const title = prompt.querySelector('h2');
  const copy = prompt.querySelector('.whisper');
  const button = prompt.querySelector('#saveProgress');
  if (label) label.textContent = 'รักษาสมุดและการ์ด · แนะนำ';
  if (title) title.textContent = 'การ์ดใบแรกจาก 3 ดาวมาแล้ว';
  if (copy) copy.textContent = 'ตอนนี้สมุดและการ์ดยังผูกกับเครื่องนี้เป็นหลัก ผูกอีเมลไว้ เพื่อรักษาความทรงจำและคอลเลกชันเวลาย้ายเครื่อง';
  if (button) button.textContent = 'ผูกอีเมล · เก็บความคืบหน้า';
  prompt.hidden = false;
  rememberFirstStarPrompt(code);
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
  const milestone = Number(String(reward.questId || '').split(':').pop()) || 0;
  const result = await call(code, { action: 'reveal', rewardId: reward.rewardId });
  if (result.error) return result;
  markCardRewardRevealed(reward.rewardId);
  if (milestone === 1) void offerFirstStarSavePrompt(code);
  /* The reveal write is already durable. Rebuilding the whole room snapshot is
     useful for the next screen, but making the card-opening tap wait for that
     second network/database round trip makes the physical flip feel sticky on
     mobile. Refresh in the background instead. */
  void refreshParty(code).catch(() => null);
  return { ...result, reward: pendingCardReward(reward.rewardId) };
}
