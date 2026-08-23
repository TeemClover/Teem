/* TeamBook V1.3 — card reveal history.
   Reward posts stay visible in the Book/Public history, but this module does
   not own chat height or scroll position. The page is the primary scroll
   surface; avoiding a second scroll/observer layer keeps iOS stable. */

import { cardById, cardNameTh, TEAMBOOK_RARITY_META } from './cards.js';
import { cardMarkup } from './card-ui.js';

let publicParty = null;
let publicPromise = null;
let queued = false;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
}

function installStyle() {
  if (document.getElementById('tb-reward-history-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-reward-history-v13-style';
  style.textContent = `
    #log .post.reward{display:flex!important}
    .tb-public-reward-memory{display:grid;grid-template-columns:70px minmax(0,1fr);gap:10px;align-items:center;margin-top:3px;padding:8px;border:1px solid var(--xty-border);border-radius:13px;background:rgba(255,254,248,.78)}
    .tb-public-reward-card{width:70px;aspect-ratio:var(--xty-card-aspect);overflow:hidden;border-radius:9px;background:var(--xty-paper)}
    .tb-public-reward-card>.animal-card,.tb-public-reward-card>img,.tb-public-reward-card>svg{width:100%!important;height:100%!important;object-fit:cover!important;margin:0!important}
    .tb-public-reward-copy{min-width:0}.tb-public-reward-copy b{display:block;font-size:12.5px;line-height:1.4}.tb-public-reward-copy small{display:block;margin-top:4px;color:var(--xty-muted);font-size:10.5px;line-height:1.45}
    .tb-public-reward-pending .tb-public-reward-card img{width:100%;height:100%;object-fit:cover}
  `;
  document.head.appendChild(style);
}

function publicCode() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return '';
  const value = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(value) ? value : '';
}

async function loadPublicParty() {
  const code = publicCode();
  if (!code) return null;
  if (publicParty?.code === code) return publicParty;
  if (!publicPromise) {
    publicPromise = fetch(`/api/teambook-party-finish?op=public-preview-v2&code=${encodeURIComponent(code)}`, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.party) throw new Error(data.error || 'PUBLIC_PREVIEW_FAILED');
      publicParty = data.party;
      return publicParty;
    }).catch(error => {
      publicPromise = null;
      throw error;
    });
  }
  return publicPromise;
}

function rewardMemory(post) {
  const card = cardById(post?.body || '');
  const alias = post?.alias || 'สมาชิก';
  if (!card) {
    return `<div class="tb-public-reward-memory tb-public-reward-pending">`
      + `<div class="tb-public-reward-card"><img src="/assets/card-back.webp" alt="การ์ดที่ยังไม่เปิด"></div>`
      + `<div class="tb-public-reward-copy"><b>${esc(alias)} เจอการ์ด</b><small>รอเจ้าของการ์ดเปิดเอง</small></div>`
      + `</div>`;
  }
  const rarity = (TEAMBOOK_RARITY_META[card.rarity] || TEAMBOOK_RARITY_META.common).label;
  return `<div class="tb-public-reward-memory">`
    + `<div class="tb-public-reward-card">${cardMarkup(card)}</div>`
    + `<div class="tb-public-reward-copy"><b>${esc(alias)} เปิดการ์ด</b>`
    + `<small>${esc(cardNameTh(card))} · ${esc(rarity)}</small></div>`
    + `</div>`;
}

async function decoratePublicRewards() {
  const code = publicCode();
  if (!code) return;
  const view = document.getElementById('view');
  if (!view || view.hidden) return;
  let party;
  try { party = await loadPublicParty(); } catch { return; }
  const posts = (party.log || []).filter(post => post.kind === 'reward' && !post.retracted);
  const rows = [...document.querySelectorAll('#log .public-entry.reward')];
  if (!rows.length || !posts.length) return;
  rows.forEach((row, index) => {
    const post = posts[index];
    if (!post) return;
    const text = row.querySelector('.text');
    if (!text) return;
    const key = `${post.seq || index}:${post.body || 'pending'}`;
    if (text.dataset.tbRewardHistory === key) return;
    text.dataset.tbRewardHistory = key;
    text.innerHTML = rewardMemory(post);
  });
}

function schedulePublic() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    decoratePublicRewards();
  });
}

function install() {
  installStyle();
  if (!publicCode()) return;
  const log = document.getElementById('log');
  if (log) new MutationObserver(schedulePublic).observe(log, { childList: true, subtree: true });
  addEventListener('pageshow', schedulePublic);
  schedulePublic();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
