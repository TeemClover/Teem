/* TeamBook 1.4 — SINGLE OWNER for Public discovery on Home.

   This replaces every visible Home Public renderer from V1/V1.3.
   The old inline Home module is still part of index.html for the rest of the
   local-first Home boot, but language.js blocks its legacy /api/teambook/public
   request. This module alone fetches and paints the Public lane people see.

   Contract:
   - visible by default unless this profile explicitly hid it
   - hidden = zero Public-list request on Home
   - “หาสมุดสาธารณะ” remains available for everyone
   - one fetch, one render, no MutationObserver repairing another renderer
*/

import { avatarById } from './avatars.js';
import { cardById } from './cards.js';
import { cardMarkup } from './card-ui.js';

const HIDDEN_KEY = 'teambook_public_home_hidden_v13';
const LIST_API = '/api/teambook-public-list-v13';
let dataPromise = null;
let renderedSignature = '';

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

function installStyle() {
  if (document.getElementById('tb-home-public-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-public-v14-style';
  style.textContent = `
    /* Legacy Public DOM may still be touched by the inline Home boot, but it is
       permanently quarantined and never painted. */
    #publicDiscovery.tb14-legacy-public,#homePublicList.tb14-legacy-public-list{display:none!important}

    #tb14PublicDiscovery{margin:22px 0 4px;padding:20px 0 4px;border-top:1px dashed var(--xty-border)}
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
    @media(max-width:520px){.tb14-public-party{grid-template-columns:88px minmax(0,1fr);gap:12px;padding:13px}.tb14-public-party .animal-card,.tb14-public-party .avatar-cover{max-width:88px}}
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
  return `<div class="avatar-cover" data-color="${esc(snapshot.color || 'green')}"><img src="${esc(avatar.art)}" alt="" loading="lazy" decoding="async"></div>`;
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

function ensureCreateHero() {
  if (document.getElementById('v13CreateBook')) return;
  const mainParty = document.getElementById('mainParty');
  if (!mainParty) return;
  const node = document.createElement('section');
  node.id = 'v13CreateBook';
  node.className = 'v13-create-book';
  node.innerHTML = `
    <p class="kicker">เปิดเรื่องของคุณ</p>
    <h2>มีอะไรที่อยากลองทำอยู่ไหม?</h2>
    <p>เปิดสมุดคนเดียวได้เลย · ถ้ามีใครอยากเข้ามาเขียนด้วย ค่อยเจอกันในเล่ม</p>
    <div class="v13-create-defaults" aria-label="ค่าเริ่มต้นของสมุดใหม่">
      <span>ทำเรื่องเดียวกัน</span><span>สาธารณะ</span><span>3 วัน</span><span>ต้องมีคนเห็น</span>
    </div>
    <a class="btn gold" href="/new/?quick=1">+ เปิดสมุดใหม่</a>`;
  mainParty.insertAdjacentElement('beforebegin', node);
}

function makeVisibleSection() {
  let section = document.getElementById('tb14PublicDiscovery');
  if (section) return section;

  /* Quarantine the legacy targets. They remain only so the old inline Home
     boot can finish safely; they are not visible and their API is blocked by
     language.js. */
  document.getElementById('publicDiscovery')?.classList.add('tb14-legacy-public');
  document.getElementById('homePublicList')?.classList.add('tb14-legacy-public-list');

  section = document.createElement('section');
  section.id = 'tb14PublicDiscovery';
  section.innerHTML = `
    <div class="tb14-public-head"><div><p class="kicker">สมุดสาธารณะ</p><h2 class="title">ตอนนี้มีใครทำอะไรอยู่บ้าง</h2></div><button class="btn ghost sm" type="button" id="tb14HidePublic">ซ่อน</button></div>
    <p class="lede">เริ่มจากการเห็นก่อนก็ได้ ดูสมุดที่กำลังมีชีวิตอยู่ แล้วค่อยเลือกว่าจะเข้าไปอยู่ในเล่มไหน</p>
    <div id="tb14HomePublicList"><div class="empty">กำลังเปิดสมุดสาธารณะ…</div></div>
    <div class="tb14-public-footer"><a class="about-link" href="/public/">เปิด Lobby ทั้งหมด ›</a></div>`;

  const mainParty = document.getElementById('mainParty');
  if (mainParty) mainParty.insertAdjacentElement('afterend', section);
  else document.getElementById('home')?.prepend(section);

  section.querySelector('#tb14HidePublic')?.addEventListener('click', () => {
    setHidden(true);
    section.remove();
    renderCollapsed();
  });
  return section;
}

function renderCollapsed() {
  if (document.getElementById('tb14PublicCollapsed')) return;
  const mainParty = document.getElementById('mainParty');
  if (!mainParty) return;
  const node = document.createElement('div');
  node.id = 'tb14PublicCollapsed';
  node.className = 'tb14-public-collapsed';
  node.innerHTML = '<button type="button">แสดงสมุดสาธารณะ</button>';
  mainParty.insertAdjacentElement('afterend', node);
  node.querySelector('button')?.addEventListener('click', async () => {
    setHidden(false);
    dataPromise = null;
    node.remove();
    const section = makeVisibleSection();
    section.hidden = false;
    try { render(await load()); }
    catch { document.getElementById('tb14HomePublicList').innerHTML = '<div class="empty">ยังเปิดสมุดสาธารณะไม่สำเร็จ · ลองอีกครั้งภายหลัง</div>'; }
  });
}

async function install() {
  if (location.pathname !== '/') return;
  installStyle();
  ensureCreateHero();

  const publicButton = document.getElementById('publicBookButton');
  if (publicButton) {
    publicButton.hidden = false;
    publicButton.textContent = 'หาสมุดสาธารณะ';
    publicButton.href = '/public/';
  }

  if (isHidden()) {
    document.getElementById('publicDiscovery')?.classList.add('tb14-legacy-public');
    document.getElementById('homePublicList')?.classList.add('tb14-legacy-public-list');
    renderCollapsed();
    return;
  }

  makeVisibleSection();
  try { render(await load()); }
  catch {
    const list = document.getElementById('tb14HomePublicList');
    if (list) list.innerHTML = '<div class="empty">ยังเปิดสมุดสาธารณะไม่สำเร็จ · ลองอีกครั้งภายหลัง</div>';
  }
}

/* Home is a deferred module page. Running once here is enough; no DOM repair
   observer is needed because the V1.4 lane uses its own container. */
install();
