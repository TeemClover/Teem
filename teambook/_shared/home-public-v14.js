/* TeamBook 1.4 — SINGLE OWNER for Public discovery on Home.

   Public discovery is one lane with two placements:
   - a profile with no active books sees Public first;
   - a profile with active books sees owned, joined, then Public, then closed.

   The legacy inline Public renderer remains quarantined. This module owns the
   visible Public list, its hide/show state, and its Starter-cover treatment.
*/

import { avatarById } from './avatars.js';
import { cardById } from './cards.js';
import { cardMarkup } from './card-ui.js';
import { allParties, myPartyCodes, isActiveParty } from './store.js';

const HIDDEN_KEY = 'teambook_public_home_hidden_v13';
const LIST_API = '/api/teambook-public-list-v13';
let dataPromise = null;
let renderedSignature = '';
let placementQueued = false;

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[ch]));

function isHidden() {
  try { return localStorage.getItem(HIDDEN_KEY) === '1'; }
  catch { return false; }
}

function setHidden(hidden) {
  try {
    if (hidden) localStorage.setItem(HIDDEN_KEY, '1');
    else localStorage.removeItem(HIDDEN_KEY);
  } catch {}
}

function modeCopy(mode) {
  return mode === 'confirm' ? 'ต้องมีคนเห็น' : 'เชื่อใจกัน';
}

function statusCopy(status) {
  if (status === 'green') return { label: 'วันนี้ผ่านแล้ว', cls: 'green' };
  if (status === 'yellow') return { label: 'รอเห็นแล้ว', cls: 'yellow' };
  return { label: 'วันนี้ยังเงียบ', cls: 'gray' };
}

function isFull(party) {
  return Number(party?.memberCount || 0) >= Number(party?.maxMembers || 5);
}

function hasActiveBook() {
  const mine = new Set(myPartyCodes());
  return allParties().some(party => mine.has(party?.code) && isActiveParty(party));
}

function installStyle() {
  if (document.getElementById('tb-home-public-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-public-v14-style';
  style.textContent = `
    #publicDiscovery.tb14-legacy-public,#homePublicList.tb14-legacy-public-list{display:none!important}

    #tb14PublicDiscovery{margin:22px 0 4px;padding:20px 0 4px;border-top:1px dashed var(--xty-border)}
    #allPartiesSection>#tb14PublicDiscovery{margin-top:18px}
    .tb14-public-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .tb14-public-head .btn{flex:none;width:auto;min-height:42px;padding:0 16px;font-size:13px}
    #tb14PublicDiscovery .title{margin:0;font-size:clamp(25px,7vw,34px);line-height:1.22}
    #tb14PublicDiscovery .lede{margin-top:9px;font-size:15px;line-height:1.7}
    #tb14HomePublicList{display:grid;gap:12px;margin-top:18px}
    .tb14-public-party{display:grid;grid-template-columns:minmax(92px,120px) minmax(0,1fr);gap:15px;align-items:center}
    .tb14-public-party .animal-card,.tb14-public-party .avatar-cover{width:100%;max-width:120px;margin:0}
    .tb14-public-party h2{margin:7px 0 4px;font-size:18px;line-height:1.35}
    .tb14-public-status{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
    .tb14-public-owner{margin:3px 0 0;color:var(--xty-muted);font-size:12px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tb14-public-state{display:flex;align-items:center;gap:7px;margin:7px 0 2px;font-size:12px;font-weight:800}
    .tb14-public-dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.045)}
    .tb14-public-dot.green{background:#55b56a}.tb14-public-dot.yellow{background:#e9b949}.tb14-public-dot.gray{background:#a7a7a7}
    .tb14-public-meta{display:flex;gap:6px;margin:7px 0 9px}.tb14-public-meta span{padding:4px 7px;border:1px solid var(--xty-border);border-radius:999px;background:rgba(255,255,255,.62);font-size:10px;font-weight:750;color:var(--xty-muted)}
    .tb14-public-footer{display:flex;justify-content:flex-end;margin-top:12px}
    .tb14-public-collapsed{margin:16px 0;padding:13px 14px;border:1px dashed var(--xty-border);border-radius:16px;background:rgba(255,255,255,.52)}
    .tb14-public-collapsed button{border:0;background:transparent;color:var(--xty-primary);font-weight:850;cursor:pointer}
    #publicBookButton{display:flex!important}

    /* Starter cover on Public cards is the same visual language as the large
       Home book cards: art fills the card and STARTER sits on the lower edge. */
    .tb14-starter-cover{overflow:hidden!important;padding:0!important;gap:0!important;background:#FFF7D8!important}
    .tb14-starter-cover>img{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;transform:scale(1.08);transform-origin:center}
    .tb14-starter-cover>small{position:absolute;left:50%;bottom:7px;z-index:2;transform:translateX(-50%);padding:3px 9px;color:var(--xty-muted)!important;font:800 7.5px/1.1 var(--sans)!important;letter-spacing:.14em;white-space:nowrap;border:1px solid rgba(62,51,44,.08);border-radius:999px;background:rgba(255,254,248,.94);box-shadow:0 1px 3px rgba(62,51,44,.08)}

    /* Safari can let child backgrounds visually shave the parent stroke at the
       lower rounded corners. Paint the group outline above its children. */
    .party-group{position:relative}
    .party-group::after{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;border:1px solid var(--xty-border);border-radius:inherit}

    @media(max-width:520px){
      .tb14-public-party{grid-template-columns:88px minmax(0,1fr);gap:12px;padding:13px}
      .tb14-public-party .animal-card,.tb14-public-party .avatar-cover{max-width:88px}
    }
  `;
  document.head.appendChild(style);
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
  return `<div class="avatar-cover tb14-starter-cover" data-color="${esc(snapshot.color || 'green')}" aria-label="Starter · ${esc(avatar.nameTh)}"><img src="${esc(avatar.art)}" alt="" loading="lazy" decoding="async"><small>STARTER</small></div>`;
}

function signature(parties) {
  return (parties || []).map(p => [
    p.code,p.name,p.memberCount,p.maxMembers,p.verificationMode,p.status,
    p.updateCount,p.ownerAlias,p.activity,p.coverType,p.coverValue,
  ].join(':')).join('|');
}

function render(parties) {
  const list = document.getElementById('tb14HomePublicList');
  if (!list) return;
  const shown = [...(parties || [])]
    .sort((a, b) => Number(isFull(a)) - Number(isFull(b)))
    .slice(0, 8);
  const nextSignature = signature(shown);
  if (renderedSignature === nextSignature && list.childElementCount) return;
  renderedSignature = nextSignature;

  if (!shown.length) {
    list.innerHTML = '<div class="empty">ยังไม่มีสมุดสาธารณะตรงนี้<br><span style="font-size:13px">เปิดสมุดของคุณคนเดียวเป็นเล่มแรกได้เลย</span></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  shown.forEach(party => {
    const count = Number(party.memberCount || 0);
    const max = Number(party.maxMembers || 5);
    const occupancy = isFull(party) ? `เต็มแล้ว · ${count}/${max}` : `เปิดอยู่ · ${count}/${max}`;
    const state = statusCopy(party.status);
    const article = document.createElement('article');
    article.className = 'card tb14-public-party';
    article.innerHTML = `${coverMarkup(party)}<div>`
      + `<div class="tb14-public-status"><span class="status-pill">${esc(occupancy)}</span><span class="status-pill">${esc(modeCopy(party.verificationMode))}</span></div>`
      + `<h2>${esc(party.name || 'สมุดสาธารณะ')}</h2>`
      + `<p class="tb14-public-owner">เจ้าของ ${esc(party.ownerAlias || party.lead?.alias || 'เจ้าของสมุด')} · ${esc(party.activity || 'ยังไม่ระบุกิจกรรม')}</p>`
      + `<div class="tb14-public-state"><span class="tb14-public-dot ${state.cls}" aria-hidden="true"></span><span>${esc(state.label)}</span></div>`
      + `<div class="tb14-public-meta"><span>${Number(party.updateCount || 0)} อัปเดต</span></div>`
      + `<a class="btn ghost sm" href="/public/p/?c=${encodeURIComponent(party.code)}">เปิดดู</a>`
      + '</div>';
    fragment.appendChild(article);
  });
  list.replaceChildren(fragment);
}

async function load() {
  if (isHidden()) return [];
  if (!dataPromise) {
    dataPromise = fetch(LIST_API, {
      headers: { accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store',
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'PUBLIC_LIST_FAILED');
      return data.parties || [];
    }).catch(error => {
      dataPromise = null;
      throw error;
    });
  }
  return dataPromise;
}

function placementAnchor() {
  const all = document.getElementById('allPartiesSection');
  const closed = document.getElementById('closedPartyGroup');
  if (hasActiveBook() && all) {
    return { parent: all, before: closed || null };
  }
  return { parent: all?.parentElement || document.getElementById('home'), before: all || null };
}

function place(node) {
  if (!node) return;
  const { parent, before } = placementAnchor();
  if (!parent) return;
  if (node.parentElement !== parent || node.nextElementSibling !== before) {
    parent.insertBefore(node, before);
  }
}

function schedulePlacement() {
  if (placementQueued) return;
  placementQueued = true;
  requestAnimationFrame(() => {
    placementQueued = false;
    place(document.getElementById('tb14PublicDiscovery') || document.getElementById('tb14PublicCollapsed'));
  });
}

function makeVisibleSection() {
  let section = document.getElementById('tb14PublicDiscovery');
  if (section) {
    place(section);
    return section;
  }

  document.getElementById('publicDiscovery')?.classList.add('tb14-legacy-public');
  document.getElementById('homePublicList')?.classList.add('tb14-legacy-public-list');

  section = document.createElement('section');
  section.id = 'tb14PublicDiscovery';
  section.innerHTML = `
    <div class="tb14-public-head"><div><p class="kicker">สมุดสาธารณะ</p><h2 class="title">ตอนนี้มีใครทำอะไรอยู่บ้าง</h2></div><button class="btn ghost sm" type="button" id="tb14HidePublic">ซ่อน</button></div>
    <p class="lede">เริ่มจากการเห็นก่อนก็ได้ ดูสมุดที่กำลังมีชีวิตอยู่ แล้วค่อยเลือกว่าจะเข้าไปอยู่ในเล่มไหน</p>
    <div id="tb14HomePublicList"><div class="empty">กำลังเปิดสมุดสาธารณะ…</div></div>
    <div class="tb14-public-footer"><a class="about-link" href="/public/">เปิด Lobby ทั้งหมด ›</a></div>`;

  place(section);
  section.querySelector('#tb14HidePublic')?.addEventListener('click', () => {
    setHidden(true);
    section.remove();
    renderCollapsed();
  });
  return section;
}

function renderCollapsed() {
  let node = document.getElementById('tb14PublicCollapsed');
  if (!node) {
    node = document.createElement('div');
    node.id = 'tb14PublicCollapsed';
    node.className = 'tb14-public-collapsed';
    node.innerHTML = '<button type="button">แสดงสมุดสาธารณะ</button>';
    node.querySelector('button')?.addEventListener('click', async () => {
      setHidden(false);
      dataPromise = null;
      node.remove();
      const section = makeVisibleSection();
      section.hidden = false;
      try { render(await load()); }
      catch {
        const list = document.getElementById('tb14HomePublicList');
        if (list) list.innerHTML = '<div class="empty">ยังเปิดสมุดสาธารณะไม่สำเร็จ · ลองอีกครั้งภายหลัง</div>';
      }
    });
  }
  place(node);
}

function watchPlacement() {
  const home = document.getElementById('home');
  if (!home) return;
  const observer = new MutationObserver(schedulePlacement);
  observer.observe(home, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
  addEventListener('pageshow', schedulePlacement);
  addEventListener('storage', schedulePlacement);
}

async function install() {
  if (location.pathname !== '/') return;
  installStyle();

  const publicButton = document.getElementById('publicBookButton');
  if (publicButton) {
    publicButton.hidden = false;
    publicButton.textContent = 'หาสมุดสาธารณะ';
    publicButton.href = '/public/';
  }

  document.getElementById('publicDiscovery')?.classList.add('tb14-legacy-public');
  document.getElementById('homePublicList')?.classList.add('tb14-legacy-public-list');
  watchPlacement();

  if (isHidden()) {
    renderCollapsed();
    return;
  }

  makeVisibleSection();
  try { render(await load()); }
  catch {
    const list = document.getElementById('tb14HomePublicList');
    if (list) list.innerHTML = '<div class="empty">ยังเปิดสมุดสาธารณะไม่สำเร็จ · ลองอีกครั้งภายหลัง</div>';
  }
  schedulePlacement();
}

install();
