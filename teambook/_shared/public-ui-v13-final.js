/* TeamBook V1.3 — FINAL Public UI owner.

   This module replaces the old stack of public-home-access + public-status +
   ui-copy-fit compatibility observers. The older inline Home renderer may still
   prepare data, but people only see this final presentation.

   Canon:
   - Public is open by default on every new Home document.
   - Home Public cards are rendered once from the V1.3 status API.
   - occupancy pill is immediately followed by verification mode.
   - full books say "เต็มแล้ว · N/5"; open books say "เปิดอยู่ · N/5".
   - mode copy is only "เชื่อใจกัน" or "ต้องมีคนเห็น".
   - Public Detail metadata/status is owned here too.
   - mobile 5-person strip fits all 5 cards in one viewport.
*/

import { avatarById } from './avatars.js';
import { cardById } from './cards.js';
import { cardMarkup } from './card-ui.js';

const HIDDEN_KEY = 'teambook_public_home_hidden_v13';
const LIST_API = '/api/teambook-public-list-v13';
const DETAIL_API = '/api/teambook-public-detail-v13';
let homeData = null;
let homePromise = null;
let listObserver = null;
let homeRenderBusy = false;
let detailReady = false;
let copyQueued = false;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

function modeCopy(mode) {
  return mode === 'confirm' ? 'ต้องมีคนเห็น' : 'เชื่อใจกัน';
}

function statusCopy(status) {
  if (status === 'green') return { label: 'วันนี้ผ่านแล้ว', cls: 'green' };
  if (status === 'yellow') return { label: 'รอเห็นแล้ว', cls: 'yellow' };
  return { label: 'วันนี้ยังเงียบ', cls: 'gray' };
}

function full(party) {
  return Number(party?.memberCount || 0) >= Number(party?.maxMembers || 5);
}

function installStyle() {
  if (document.getElementById('tb-public-ui-final-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-public-ui-final-style';
  style.textContent = `
    /* The final owner hides intermediate Home Public DOM until canonical cards
       are ready. MutationObserver callbacks run before the next paint, so old
       inline/V1.3 renderers cannot visibly flash different layouts. */
    #homePublicList[data-public-final-ready="0"]{position:relative;min-height:86px}
    #homePublicList[data-public-final-ready="0"]>*{visibility:hidden!important}
    #homePublicList[data-public-final-ready="0"]::after{
      content:'กำลังเปิดสมุดสาธารณะ…';position:absolute;inset:18px 0 auto;
      color:var(--xty-muted);font-size:13px;text-align:center
    }
    #homePublicList[data-public-final-ready="1"]>*{visibility:visible}
    #publicBookButton{display:flex!important}
    .tb-public-final-mode{font-weight:800}
    .tb-public-meta{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 9px}
    .tb-public-meta span{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid var(--xty-border);border-radius:999px;background:rgba(255,255,255,.62);font-size:10px;font-weight:750;color:var(--xty-muted)}
    .tb-status-dot{width:9px;height:9px;padding:0!important;border:0!important;border-radius:50%!important;box-shadow:0 0 0 2px rgba(0,0,0,.045)}
    .tb-status-dot.green{background:#55b56a!important}.tb-status-dot.yellow{background:#e9b949!important}.tb-status-dot.gray{background:#a7a7a7!important}
    .tb-public-status-line{display:flex;align-items:center;gap:7px;margin:7px 0 2px;font-size:12px;font-weight:800}
    .tb-public-owner-activity{margin:2px 0 0;color:var(--xty-muted);font-size:12px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tb-public-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:13px}
    .tb-public-detail-item{padding:10px 11px;border:1px solid var(--xty-border);border-radius:13px;background:rgba(255,255,255,.55)}
    .tb-public-detail-item small{display:block;color:var(--xty-muted);font-size:9px;font-weight:800;letter-spacing:.05em;margin-bottom:2px}.tb-public-detail-item b{font-size:12px}
    .tb-member-status-list{display:grid;gap:7px;margin-top:10px}.tb-member-status{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,.52);font-size:11px}
    .tb-member-status .left{display:flex;align-items:center;gap:7px;min-width:0}.tb-member-status b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tb-member-status em{font-style:normal;color:var(--xty-muted);font-size:10px}

    /* Public Detail Starter cover is 100% width/height inside a clipped parent.
       Border must participate in that size or the lower/right edge gets clipped. */
    #cover .avatar-cover{box-sizing:border-box!important}

    @media(max-width:560px){
      #members.preview-members:has(.preview-member:nth-child(5)){
        display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;
        gap:4px!important;width:100%!important;overflow:visible!important;padding-inline:0!important
      }
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member{width:auto!important;min-width:0!important}
      #members.preview-members:has(.preview-member:nth-child(5)) .tb-public-member-visual{width:min(100%,50px)!important;max-width:50px!important}
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member b{font-size:10px!important;line-height:1.25!important}
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px!important;line-height:1.25!important}

      /* Give Safari enough scroll tail to expose the lower card border above the
         sticky join/full CTA instead of visually shaving the last few pixels. */
      body:has(#view:not([hidden])) main.wrap{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
      .join-zone{bottom:max(14px,env(safe-area-inset-bottom))!important;box-sizing:border-box!important}
    }
  `;
  document.head.appendChild(style);
}

function openPublicByDefault() {
  if (location.pathname !== '/') return;
  try { localStorage.removeItem(HIDDEN_KEY); } catch {}
}

function hiddenThisVisit() {
  try { return localStorage.getItem(HIDDEN_KEY) === '1'; }
  catch { return false; }
}

function coverMarkup(party) {
  const card = cardById(party?.coverValue);
  if (card) return cardMarkup(card);
  if (party?.coverType === 'card_back') {
    return '<div class="animal-card card-back"><span class="back-mark">TB</span><small>TEAMBOOK</small></div>';
  }
  let snapshot = {
    species: party?.lead?.avatar || 'orange_cat',
    color: party?.lead?.avatarColor || 'green',
  };
  try { snapshot = { ...snapshot, ...JSON.parse(party?.coverValue || '{}') }; } catch {}
  const avatar = avatarById(snapshot.species || 'orange_cat');
  return `<div class="avatar-cover" data-color="${esc(snapshot.color || 'green')}"><img src="${esc(avatar.art)}" alt=""></div>`;
}

function renderHomeCards(parties) {
  const list = document.getElementById('homePublicList');
  if (!list || hiddenThisVisit()) return;
  const shown = [...(parties || [])]
    .sort((a, b) => Number(full(a)) - Number(full(b)))
    .slice(0, 8);

  homeRenderBusy = true;
  listObserver?.disconnect();
  list.dataset.publicFinalReady = '0';

  if (!shown.length) {
    list.innerHTML = '<div class="empty v13-public-render tb-public-final-render">ยังไม่มีสมุดสาธารณะตรงนี้<br><span style="font-size:13px">เปิดสมุดของคุณคนเดียวเป็นเล่มแรกได้เลย</span></div>';
  } else {
    const fragment = document.createDocumentFragment();
    shown.forEach(party => {
      const count = Number(party.memberCount || 0);
      const max = Number(party.maxMembers || 5);
      const occupancy = full(party) ? `เต็มแล้ว · ${count}/${max}` : `เปิดอยู่ · ${count}/${max}`;
      const state = statusCopy(party.status);
      const article = document.createElement('article');
      article.className = `card public-party home-public-party v13-public-render tb-public-final-render${full(party) ? ' home-public-full' : ''}`;
      article.innerHTML = `${coverMarkup(party)}<div>`
        + `<div class="home-public-status"><span class="status-pill">${esc(occupancy)}</span><span class="status-pill tb-public-final-mode">${esc(modeCopy(party.verificationMode))}</span></div>`
        + `<h2>${esc(party.name)}</h2>`
        + `<p class="tb-public-owner-activity">เจ้าของ ${esc(party.ownerAlias || party.lead?.alias || 'เจ้าของสมุด')} · ${esc(party.activity || 'ยังไม่ระบุกิจกรรม')}</p>`
        + `<div class="tb-public-status-line"><span class="tb-status-dot ${state.cls}" aria-hidden="true"></span><span>${esc(state.label)}</span></div>`
        + `<div class="tb-public-meta"><span>${Number(party.updateCount || 0)} อัปเดต</span></div>`
        + `<a class="btn ghost sm" href="/public/p/?c=${encodeURIComponent(party.code)}">เปิดดู</a>`
        + '</div>';
      fragment.appendChild(article);
    });
    list.replaceChildren(fragment);
  }

  list.dataset.publicFinalReady = '1';
  homeRenderBusy = false;
  observeHomeList(list);
}

function observeHomeList(list) {
  if (!list) return;
  if (!listObserver) {
    listObserver = new MutationObserver(() => {
      if (homeRenderBusy || !homeData || hiddenThisVisit()) return;
      /* Any old renderer replacing children is corrected inside the same
         microtask checkpoint, before the browser paints it. */
      renderHomeCards(homeData);
    });
  }
  listObserver.observe(list, { childList: true, subtree: false });
}

async function loadHomeData() {
  if (homeData) return homeData;
  if (!homePromise) {
    homePromise = fetch(LIST_API, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'PUBLIC_LIST_FAILED');
      homeData = data.parties || [];
      return homeData;
    }).catch(error => {
      homePromise = null;
      throw error;
    });
  }
  return homePromise;
}

async function installHomeFinal() {
  if (location.pathname !== '/') return;
  installStyle();
  openPublicByDefault();

  const button = document.getElementById('publicBookButton');
  if (button) {
    button.hidden = false;
    button.textContent = 'หาสมุดสาธารณะ';
    button.href = '/public/';
  }

  const section = document.getElementById('publicDiscovery');
  const list = document.getElementById('homePublicList');
  const title = document.getElementById('publicDiscoveryTitle');
  if (title) title.textContent = 'ตอนนี้มีใครทำอะไรอยู่บ้าง';
  if (section && !hiddenThisVisit()) section.hidden = false;
  if (list) list.dataset.publicFinalReady = '0';

  try {
    const data = await loadHomeData();
    if (!hiddenThisVisit()) {
      if (section) section.hidden = false;
      renderHomeCards(data);
    }
  } catch {
    if (list) {
      list.innerHTML = '<div class="empty v13-public-render tb-public-final-render">ยังเปิดสมุดสาธารณะไม่สำเร็จ · ลองอีกครั้งภายหลัง</div>';
      list.dataset.publicFinalReady = '1';
    }
  }
}

async function loadDetail(code) {
  const response = await fetch(`${DETAIL_API}?code=${encodeURIComponent(code)}`, {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'PUBLIC_DETAIL_FAILED');
  return data.detail;
}

function renderDetail(detail) {
  const hero = document.querySelector('.preview-hero > div:last-child');
  const oldMeta = document.getElementById('meta');
  const members = document.getElementById('members');
  if (!hero || !oldMeta || !members) return false;

  document.querySelector('.preview-hero .kicker')?.remove();
  hero.querySelectorAll(':scope > .tb-public-status-line, :scope > .tb-public-detail-grid').forEach(node => node.remove());
  document.getElementById('tbPublicMemberStatuses')?.remove();
  oldMeta.innerHTML = '';

  const state = statusCopy(detail.status);
  oldMeta.insertAdjacentHTML('beforebegin', `<div class="tb-public-status-line"><span class="tb-status-dot ${state.cls}" aria-hidden="true"></span><span>${esc(state.label)}${detail.hasYesterdayPending ? ' · มีเหลืองค้างจากเมื่อวาน' : ''}</span></div>`);
  oldMeta.insertAdjacentHTML('afterend', `<div class="tb-public-detail-grid">
    <div class="tb-public-detail-item"><small>โหมด</small><b>${esc(modeCopy(detail.verificationMode))}</b></div>
    <div class="tb-public-detail-item"><small>เจ้าของสมุด</small><b>${esc(detail.ownerAlias)}</b></div>
    <div class="tb-public-detail-item"><small>คนในสมุด</small><b>${detail.memberCount}/${detail.maxMembers} คน</b></div>
    <div class="tb-public-detail-item"><small>อัปเดตทั้งหมด</small><b>${detail.updateCount} อัปเดต</b></div>
  </div>`);

  const statusList = document.createElement('div');
  statusList.id = 'tbPublicMemberStatuses';
  statusList.className = 'tb-member-status-list';
  statusList.innerHTML = (detail.memberStatuses || []).map(member => {
    const s = statusCopy(member.status);
    return `<div class="tb-member-status"><span class="left"><span class="tb-status-dot ${s.cls}"></span><b>${esc(member.alias)}</b></span><em>${esc(s.label)}</em></div>`;
  }).join('');
  members.insertAdjacentElement('afterend', statusList);
  detailReady = true;
  return true;
}

async function installDetailFinal() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return;
  installStyle();
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;

  let detail;
  try { detail = await loadDetail(code); } catch { return; }

  const tryRender = () => {
    if (detailReady) return;
    const view = document.getElementById('view');
    if (!view || view.hidden) return;
    renderDetail(detail);
  };
  tryRender();
  if (!detailReady) {
    const observer = new MutationObserver(() => {
      tryRender();
      if (detailReady) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
}

const OLD_MODE = new Set(['ต้อง เห็นแล้ว', 'ต้องเห็นแล้ว', 'ต้องมีคนเห็นแล้ว']);
function normalizeVisibleCopy() {
  document.querySelectorAll('#verificationPick .preset-choice b, #verificationLine, .v13-create-defaults span').forEach(node => {
    const text = String(node.textContent || '').trim();
    if (OLD_MODE.has(text)) node.textContent = 'ต้องมีคนเห็น';
  });
}

function scheduleCopy() {
  if (copyQueued) return;
  copyQueued = true;
  queueMicrotask(() => {
    copyQueued = false;
    normalizeVisibleCopy();
  });
}

function installCopyGuard() {
  normalizeVisibleCopy();
  const targets = [
    document.getElementById('verificationPick'),
    document.getElementById('verificationLine')?.parentElement,
    document.getElementById('v13CreateBook'),
  ].filter(Boolean);
  targets.forEach(target => new MutationObserver(scheduleCopy).observe(target, { childList: true, subtree: true, characterData: true }));
}

function boot() {
  installStyle();
  if (location.pathname === '/') installHomeFinal();
  if (/^\/public\/p\/?$/.test(location.pathname)) installDetailFinal();
  installCopyGuard();
}

/* Clear the old persisted hide preference as soon as this module evaluates,
   before DOMContentLoaded Home renderers decide whether Public exists. */
openPublicByDefault();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
