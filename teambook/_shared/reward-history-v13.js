/* TeamBook card reveal history.
   Reward posts use one compact memory strip in private and public Books.
   The full card belongs in Reveal/Collection; chat keeps only a small
   thumbnail and a rarity-coloured edge so the timeline stays readable. */

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
    #log .post.reward,
    .tb-public-reward-memory{--tb-reward-accent:#8b8178}
    #log .post.reward[data-rarity="rare"],
    .tb-public-reward-memory[data-rarity="rare"]{--tb-reward-accent:var(--xty-blue,#5b8dff)}
    #log .post.reward[data-rarity="epic"],
    .tb-public-reward-memory[data-rarity="epic"]{--tb-reward-accent:#8a5bd6}
    #log .post.reward[data-rarity="legendary"],
    .tb-public-reward-memory[data-rarity="legendary"]{--tb-reward-accent:#e08127}

    #log .post.reward{display:flex!important;border:0!important;background:transparent!important}
    .reward-log-card,.tb-public-reward-memory{
      display:grid;grid-template-columns:56px minmax(0,1fr);gap:10px;align-items:center;
      width:100%;min-height:92px;margin-top:3px;padding:8px 11px 8px 8px;
      border:1px solid var(--xty-border);border-inline-start:5px solid var(--tb-reward-accent);
      border-radius:13px;background:rgba(255,254,248,.82);white-space:normal;
    }
    .reward-log-thumb,.tb-public-reward-card{
      width:56px;aspect-ratio:var(--xty-card-aspect);overflow:hidden;border-radius:8px;background:var(--xty-paper)
    }
    .reward-log-thumb>.animal-card,.reward-log-thumb>img,.reward-log-thumb>svg,
    .tb-public-reward-card>.animal-card,.tb-public-reward-card>img,.tb-public-reward-card>svg{
      display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;
      height:100%!important;max-height:100%!important;aspect-ratio:var(--xty-card-aspect)!important;
      margin:0!important;object-fit:cover!important;transform:none!important;border-radius:8px!important;
      box-shadow:none!important;
    }
    .reward-log-thumb .card-art,.tb-public-reward-card .card-art{
      display:block!important;width:100%!important;height:100%!important;max-width:100%!important;
      margin:0!important;object-fit:cover!important;object-position:center!important;border-radius:8px!important;
    }
    .reward-log-copy,.tb-public-reward-copy{min-width:0}
    .reward-log-copy b,.tb-public-reward-copy b{display:block;font-size:13px;line-height:1.35}
    .reward-log-copy small,.tb-public-reward-copy small{
      display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:4px;
      color:var(--xty-muted);font-size:11px;line-height:1.4
    }
    .reward-rarity-label{
      display:inline-flex;padding:3px 6px;color:#fff;font:800 8px/1 var(--sans);letter-spacing:.1em;
      border-radius:999px;background:var(--tb-reward-accent)
    }
    .tb-public-reward-pending{border-inline-start-style:dashed}
    .tb-public-reward-pending .tb-public-reward-card img{width:100%;height:100%;object-fit:cover}
    @media(max-width:480px){
      .reward-log-card,.tb-public-reward-memory{grid-template-columns:52px minmax(0,1fr);min-height:86px;padding:7px 9px 7px 7px}
      .reward-log-thumb,.tb-public-reward-card{width:52px}
    }
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
  return `<div class="tb-public-reward-memory" data-rarity="${esc(card.rarity || 'common')}">`
    + `<div class="tb-public-reward-card">${cardMarkup(card)}</div>`
    + `<div class="tb-public-reward-copy"><b>${esc(alias)} เปิดการ์ด</b>`
    + `<small>${esc(cardNameTh(card))}<span class="reward-rarity-label">${esc(rarity)}</span></small></div>`
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
