/* TeamBook 1.5 — single Home Public owner.

   Capacity contract:
   - Public list API supplies both memberCount and maxMembers.
   - maxMembers already includes the historical 5-person fallback for old books.
   - this renderer never invents N/5 and never patches capacity after paint.
   - one fetch -> one canonical render. Legacy Home Public DOM stays hidden.
*/

import { avatarById } from './avatars.js';
import { cardById } from './cards.js';
import { cardMarkup } from './card-ui.js';
import { bookCapacity } from './book-capacity-v15.js';
import { allParties, myPartyCodes, isActiveParty } from './store.js';

const HIDDEN_KEY = 'teambook_public_home_hidden_v13';
const LIST_API = '/api/teambook-public-list-v13';
let dataPromise = null;
let renderedSignature = '';
let placementQueued = false;

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[ch]));

function myBooks() {
  const mine = new Set(myPartyCodes());
  return allParties().filter(party => mine.has(party?.code));
}

function hasActiveBook() {
  return myBooks().some(isActiveParty);
}

function hasAnyBook() {
  return myBooks().length > 0;
}

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

function installStyle() {
  if (document.getElementById('tb-home-public-v15-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-public-v15-style';
  style.textContent = `
    /* Old inline Home Public renderer is retired, not raced. */
    #publicDiscovery,#homePublicList{display:none!important}

    .v13-create-book{margin:18px 0 4px;padding:18px;border:1px solid rgba(41,136,87,.25);border-radius:22px;background:linear-gradient(145deg,rgba(241,250,240,.96),rgba(255,252,239,.95));box-shadow:0 12px 36px rgba(41,136,87,.10)}
    .v13-create-book h2{margin:0 0 5px;font-size:clamp(22px,6vw,29px)}
    .v13-create-book p{margin:0;color:var(--xty-muted);font-size:14px;line-height:1.6}
    .v13-create-book .btn{width:100%;margin-top:13px;min-height:56px;font-size:17px}
    .v13-create-defaults{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}
    .v13-create-defaults span{padding:5px 8px;border:1px solid rgba(41,136,87,.18);border-radius:999px;background:rgba(255,255,255,.65);font-size:10px;font-weight:800;color:var(--xty-muted)}
    .v13-first-book-note{margin-top:13px!important;padding-top:11px;border-top:1px dashed rgba(41,136,87,.2);font-size:12.5px!important}

    #tb15PublicDiscovery{margin:22px 0 4px;padding:20px 0 4px;border-top:1px dashed var(--xty-border)}
    #allPartiesSection>#tb15PublicDiscovery{margin-top:18px}
    .tb15-public-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .tb15-public-head .btn{flex:none;width:auto;min-height:42px;padding:0 16px;font-size:13px}
    #tb15PublicDiscovery .title{margin:0;font-size:clamp(25px,7vw,34px);line-height:1.22}
    #tb15PublicDiscovery .lede{margin-top:9px;font-size:15px;line-height:1.7}
    #tb15HomePublicList{display:grid;gap:12px;margin-top:18px}
    .tb15-public-party{display:grid;grid-template-columns:minmax(132px,150px) minmax(0,1fr);gap:16px;align-items:center;padding:16px}
    .tb15-public-party .animal-card,.tb15-public-party .avatar-cover{width:100%;max-width:150px;margin:0}
    .tb15-public-party h2{margin:7px 0 4px;font-size:18px;line-height:1.35}
    .tb15-public-status{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
    .tb15-public-owner{margin:3px 0 0;color:var(--xty-muted);font-size:12px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tb15-public-state{display:flex;align-items:center;gap:7px;margin:7px 0 2px;font-size:12px;font-weight:800}
    .tb15-public-dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.045)}
    .tb15-public-dot.green{background:#55b56a}.tb15-public-dot.yellow{background:#e9b949}.tb15-public-dot.gray{background:#a7a7a7}
    .tb15-public-meta{display:flex;gap:6px;margin:7px 0 9px}.tb15-public-meta span{padding:4px 7px;border:1px solid var(--xty-border);border-radius:999px;background:rgba(255,255,255,.62);font-size:10px;font-weight:750;color:var(--xty-muted)}
    .tb15-public-footer{display:flex;justify-content:flex-end;margin-top:12px}
    .tb15-public-collapsed{margin:16px 0;padding:13px 14px;border:1px dashed var(--xty-border);border-radius:16px;background:rgba(255,255,255,.52)}
    .tb15-public-collapsed button{border:0;background:transparent;color:var(--xty-primary);font-weight:850;cursor:pointer}

    .tb15-starter-cover{position:relative;overflow:hidden!important;padding:0!important;gap:0!important;border:3px solid var(--xty-green)!important;background:#FFF7D8!important;box-shadow:3px 4px 0 rgba(62,51,44,.10)!important}
    .tb15-starter-cover[data-color="red"]{border-color:var(--xty-red)!important;box-shadow:3px 4px 0 rgba(228,91,91,.12)!important}
    .tb15-starter-cover[data-color="green"]{border-color:var(--xty-green)!important}
    .tb15-starter-cover[data-color="blue"]{border-color:var(--xty-blue)!important;box-shadow:3px 4px 0 rgba(91,141,255,.12)!important}
    .tb15-starter-cover[data-color="silver"]{border-color:var(--xty-silver)!important;box-shadow:3px 4px 0 rgba(152,160,168,.14)!important}
    .tb15-starter-cover>img{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;border-radius:0!important;transform:none!important}
    .tb15-starter-cover>small{position:absolute;left:50%;bottom:8px;z-index:2;transform:translateX(-50%);padding:3px 10px;color:var(--xty-muted)!important;font:800 7.5px/1.1 var(--sans)!important;letter-spacing:.14em;white-space:nowrap;border:1px solid rgba(62,51,44,.08);border-radius:999px;background:rgba(255,254,248,.95);box-shadow:0 1px 3px rgba(62,51,44,.08)}

    @media(max-width:520px){
      .tb15-public-party{grid-template-columns:116px minmax(0,1fr);gap:14px;padding:14px}
      .tb15-public-party .animal-card,.tb15-public-party .avatar-cover{max-width:116px}
    }
    @media(max-width:370px){
      .tb15-public-party{grid-template-columns:106px minmax(0,1fr);gap:11px;padding:12px}
      .tb15-public-party .animal-card,.tb15-public-party .avatar-cover{max-width:106px}
    }
  `;
  document.head.appendChild(style);
}

function ensureCreateHero() {
  let node = document.getElementById('v13CreateBook');
  if (hasActiveBook()) {
    node?.remove();
    return null;
  }
  const main = document.getElementById('mainParty');
  if (!main) return null;
  if (!node) {
    node = document.createElement('section');
    node.id = 'v13CreateBook';
    node.className = 'v13-create-book';
  }
  const first = !hasAnyBook();
  node.innerHTML = first ? `
    <p class="kicker">สมุดเล่มแรกของคุณ</p>
    <h2>เปิดสมุดเล่มใหม่</h2>
    <p>เริ่มจากเรื่องหนึ่งที่อยากทำ แล้วค่อยชวนเพื่อนเข้ามาเขียนในเล่มเดียวกันได้</p>
    <div class="v13-create-defaults" aria-label="ค่าเริ่มต้นของสมุดเล่มแรก">
      <span>ทำเรื่องเดียวกัน</span><span>สาธารณะ</span><span>3 วัน</span><span>ต้องมีคนเห็น</span>
    </div>
    <p class="v13-first-book-note">สมุดเล่มแรกคือจุดเริ่มต้นของเรื่องของคุณ · เปิดก่อน แล้วค่อยเลือกว่าจะเขียนกับใคร</p>
    <a class="btn gold" href="/new/?quick=1">+ เปิดสมุดเล่มใหม่</a>` : `
    <p class="kicker">เปิดเรื่องต่อไป</p>
    <h2>เปิดสมุดเล่มใหม่</h2>
    <p>เล่มเดิมจบแล้วก็เริ่มเรื่องใหม่ได้ เมื่อพร้อมค่อยชวนเพื่อนเข้ามาเขียนด้วยกัน</p>
    <a class="btn gold" href="/new/?quick=1">+ เปิดสมุดเล่มใหม่</a>`;
  if (node.nextElementSibling !== main) main.insertAdjacentElement('beforebegin', node);
  return node;
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
  return `<div class="avatar-cover tb15-starter-cover" data-color="${esc(snapshot.color || 'green')}" aria-label="Starter · ${esc(avatar.nameTh)}"><img src="${esc(avatar.art)}" alt="" loading="lazy" decoding="async"><small>STARTER</small></div>`;
}

function canonicalParties(parties) {
  const result = [];
  for (const party of parties || []) {
    const capacity = bookCapacity(party);
    if (!capacity) {
      console.warn('TeamBook skipped Public book without canonical capacity', party?.code);
      continue;
    }
    result.push({ ...party, __capacity: capacity });
  }
  return result;
}

function signature(parties) {
  return parties.map(p => [
    p.code,p.name,p.__capacity.memberCount,p.__capacity.memberLimit,
    p.verificationMode,p.status,p.updateCount,p.ownerAlias,p.activity,
    p.coverType,p.coverValue,
  ].join(':')).join('|');
}

function render(parties) {
  const list = document.getElementById('tb15HomePublicList');
  if (!list) return;
  const canonical = canonicalParties(parties);
  const shown = canonical
    .sort((a, b) => Number(a.__capacity.full) - Number(b.__capacity.full))
    .slice(0, 8);
  const nextSignature = signature(shown);
  if (renderedSignature === nextSignature && list.childElementCount) return;
  renderedSignature = nextSignature;

  if (!shown.length) {
    list.innerHTML = '<div class="empty">ยังไม่มีสมุดสาธารณะตรงนี้</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  shown.forEach(party => {
    const capacity = party.__capacity;
    const occupancy = capacity.full
      ? `เต็มแล้ว · ${capacity.memberCount}/${capacity.memberLimit}`
      : `เปิดอยู่ · ${capacity.memberCount}/${capacity.memberLimit}`;
    const state = statusCopy(party.status);
    const article = document.createElement('article');
    article.className = 'card tb15-public-party';
    article.innerHTML = `${coverMarkup(party)}<div>`
      + `<div class="tb15-public-status"><span class="status-pill">${esc(occupancy)}</span><span class="status-pill">${esc(modeCopy(party.verificationMode))}</span></div>`
      + `<h2>${esc(party.name || 'สมุดสาธารณะ')}</h2>`
      + `<p class="tb15-public-owner">เจ้าของ ${esc(party.ownerAlias || party.lead?.alias || 'เจ้าของสมุด')} · ${esc(party.activity || 'ยังไม่ระบุกิจกรรม')}</p>`
      + `<div class="tb15-public-state"><span class="tb15-public-dot ${state.cls}" aria-hidden="true"></span><span>${esc(state.label)}</span></div>`
      + `<div class="tb15-public-meta"><span>${Number(party.updateCount || 0)} อัปเดต</span></div>`
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
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'PUBLIC_LIST_FAILED');
      return Array.isArray(data.parties) ? data.parties : [];
    }).catch(error => {
      dataPromise = null;
      throw error;
    });
  }
  return dataPromise;
}

function placementAnchor() {
  const main = document.getElementById('mainParty');
  const all = document.getElementById('allPartiesSection');
  const closed = document.getElementById('closedPartyGroup');
  if (hasActiveBook() && all) return { parent: all, before: closed || null };
  return {
    parent: main?.parentElement || document.getElementById('home'),
    before: document.getElementById('homeActions') || all || null,
  };
}

function place(node) {
  if (!node) return;
  const { parent, before } = placementAnchor();
  if (!parent) return;
  if (node.parentElement !== parent || node.nextElementSibling !== before) parent.insertBefore(node, before);
}

function schedulePlacement() {
  if (placementQueued) return;
  placementQueued = true;
  requestAnimationFrame(() => {
    placementQueued = false;
    ensureCreateHero();
    place(document.getElementById('tb15PublicDiscovery') || document.getElementById('tb15PublicCollapsed'));
  });
}

function makeVisibleSection() {
  let section = document.getElementById('tb15PublicDiscovery');
  if (section) {
    place(section);
    return section;
  }
  section = document.createElement('section');
  section.id = 'tb15PublicDiscovery';
  section.innerHTML = `
    <div class="tb15-public-head"><div><p class="kicker">สมุดสาธารณะ</p><h2 class="title">ตอนนี้มีใครทำอะไรอยู่บ้าง</h2></div><button class="btn ghost sm" type="button" id="tb15HidePublic">ซ่อน</button></div>
    <p class="lede">เริ่มจากการเห็นก่อนก็ได้ ดูสมุดที่กำลังมีชีวิตอยู่ แล้วค่อยเลือกว่าจะเข้าไปอยู่ในเล่มไหน</p>
    <div id="tb15HomePublicList"><div class="empty">กำลังเปิดสมุดสาธารณะ…</div></div>
    <div class="tb15-public-footer"><a class="about-link" href="/public/">เปิด Lobby ทั้งหมด ›</a></div>`;
  place(section);
  section.querySelector('#tb15HidePublic')?.addEventListener('click', () => {
    setHidden(true);
    section.remove();
    renderCollapsed();
  });
  return section;
}

function renderCollapsed() {
  let node = document.getElementById('tb15PublicCollapsed');
  if (!node) {
    node = document.createElement('div');
    node.id = 'tb15PublicCollapsed';
    node.className = 'tb15-public-collapsed';
    node.innerHTML = '<button type="button">แสดงสมุดสาธารณะ</button>';
    node.querySelector('button')?.addEventListener('click', async () => {
      setHidden(false);
      dataPromise = null;
      node.remove();
      const section = makeVisibleSection();
      try { render(await load()); }
      catch {
        const list = document.getElementById('tb15HomePublicList');
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
  ensureCreateHero();

  if (isHidden()) {
    renderCollapsed();
    watchPlacement();
    return;
  }

  const section = makeVisibleSection();
  try { render(await load()); }
  catch {
    const list = document.getElementById('tb15HomePublicList');
    if (list) list.innerHTML = '<div class="empty">ยังเปิดสมุดสาธารณะไม่สำเร็จ · ลองอีกครั้งภายหลัง</div>';
  }
  place(section);
  watchPlacement();
}

install();
