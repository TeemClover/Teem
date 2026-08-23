/* TeamBook V1.3 — Public-first patch.

   Product contract:
   - one person is already a complete Book; occupancy is 1–5, never a gate
   - Home order is Create -> Active -> Public -> Finished
   - Public is visible by default, but a user may hide it; hidden means no
     Home Lobby request at all until they explicitly open it again
   - onboarding stores the only required field (alias) first, with a random
     animal/frame fallback, then lets the person choose character and colour
   - /new opens with shared + public + 3 days + Seen-required defaults
   - Public Seen is anonymous and never participates in the witness's card or
     First Seen reward system. */

import {
  allParties, createProfile, getParty, getProfile, hasProfile, isActiveParty,
  myPartyCodes, partyIdentity, updateProfile,
} from './store.js';
import { TEAMBOOK_AVATARS, AVATAR_FRAMES, avatarById } from './avatars.js';
import { cardById } from './cards.js';
import { cardMarkup } from './card-ui.js';
import { bookActivityLine } from './book-mode.js';

const HOME_PUBLIC_HIDDEN_KEY = 'teambook_public_home_hidden_v13';
const PUBLIC_WITNESS_KEY = 'teambook_public_witness_v13';
const V13_ONBOARDING_KEY = 'teambook_onboarding_v13_alias_saved';
const PUBLIC_LIST_PATH = '/api/teambook/public';

let homeLobbyPromise = null;
let homeLobbyData = null;
let homeSyncQueued = false;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}
function homePublicHidden() {
  return storageGet(HOME_PUBLIC_HIDDEN_KEY) === '1';
}

function isHomePublicRequest(input) {
  if (location.pathname !== '/') return false;
  try {
    const raw = typeof input === 'string' ? input : input?.url;
    const url = new URL(raw || '', location.origin);
    return url.origin === location.origin
      && url.pathname === PUBLIC_LIST_PATH
      && !url.searchParams.get('cursor');
  } catch { return false; }
}

/* This wrapper exists only on Home. Hidden means exactly what the user asked:
   no Lobby network request. Visible callers share one response so the legacy
   Home loader and V1.3 loader cannot double-fetch the same data. */
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function v13Fetch(input, init) {
    if (!isHomePublicRequest(input)) return nativeFetch(input, init);
    if (homePublicHidden()) {
      return Promise.resolve(new Response(JSON.stringify({
        ok: true, parties: [], nextCursor: null, hiddenByUser: true,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    }
    if (!homeLobbyPromise) {
      homeLobbyPromise = nativeFetch(input, init)
        .then(response => response.clone())
        .catch(error => {
          homeLobbyPromise = null;
          throw error;
        });
    }
    return homeLobbyPromise.then(response => response.clone());
  };
}

function randomIndex(length) {
  if (length <= 1) return 0;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % length;
  } catch { return Math.floor(Math.random() * length); }
}

function randomProfileLook() {
  const avatar = TEAMBOOK_AVATARS[randomIndex(TEAMBOOK_AVATARS.length)] || TEAMBOOK_AVATARS[0];
  const frames = Object.values(AVATAR_FRAMES);
  const frame = frames[randomIndex(frames.length)] || frames[0];
  return {
    avatarId: avatar?.id || 'orange_cat',
    avatarFrame: frame?.id || 'green',
  };
}

function replaceCanonCopy(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,input')) return;
    if (node.nodeValue?.includes('2–5')) {
      node.nodeValue = node.nodeValue.replaceAll('2–5', '1–5');
    }
  });
}

function genericWelcomeCopy() {
  if (location.pathname !== '/' || new URLSearchParams(location.search).get('c')) return;
  const title = document.getElementById('firstWelcomeTitle');
  const kicker = document.getElementById('firstWelcomeKicker');
  const lede = document.getElementById('firstWelcomeLede');
  const button = document.getElementById('enterRoom');
  const read = document.getElementById('welcomeRead');
  const note = document.querySelector('.first-welcome-note');
  if (kicker) kicker.textContent = 'ยินดีต้อนรับสู่ TeamBook';
  if (title) title.textContent = 'สมุดที่รอคุณได้';
  if (lede) {
    lede.textContent = 'เริ่มคนเดียวได้ ไม่ต้องใช้ชื่อจริง และไม่ต้องพร้อมทุกวัน · วางเรื่องของคุณไว้ แล้วค่อยกลับมาเมื่อมีอะไรเกิดขึ้น';
  }
  if (button) button.textContent = 'เริ่มจากชื่อที่อยากให้เรียก';
  if (read) {
    read.textContent = 'อ่านเรื่องของ TeamBook ก่อน →';
    read.href = '/read/';
  }
  if (note) note.textContent = 'ชื่อ ตัวละคร และสี เปลี่ยนทีหลังได้ทั้งหมด';
}

function onboardingReadHref() {
  const code = new URLSearchParams(location.search).get('c');
  return /^\d{5}$/.test(code || '') ? `/read/?c=${encodeURIComponent(code)}` : '/read/';
}

function onboardingExitHref() {
  const params = new URLSearchParams(location.search);
  const code = params.get('c');
  if (/^\d{5}$/.test(code || '')) return `/join/?c=${encodeURIComponent(code)}`;
  if (params.get('open') === '1') return '/new/?quick=1';
  return '/';
}

function installStyle() {
  if (document.getElementById('tb-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-v13-style';
  style.textContent = `
    .v13-onboarding{max-width:680px;margin:0 auto;padding:8px 0 28px}
    .v13-onboarding-card{padding:clamp(20px,5vw,30px);border:1px solid var(--xty-border);border-radius:24px;background:rgba(255,254,248,.92);box-shadow:var(--shadow)}
    .v13-onboarding-step{display:grid;gap:16px}.v13-onboarding-step[hidden]{display:none}
    .v13-step-count{font-size:11px;font-weight:900;letter-spacing:.12em;color:var(--xty-muted)}
    .v13-onboarding h1{margin:0;font-size:clamp(28px,8vw,42px);line-height:1.28}
    .v13-onboarding .v13-note{margin:0;color:var(--xty-muted);font-size:14px;line-height:1.7}
    .v13-onboarding input{font-size:18px;min-height:54px}
    .v13-onboarding .card-grid{margin-top:2px}
    .v13-onboarding .v13-read{display:inline-block;text-align:center;color:var(--xty-muted);font-size:13px;text-decoration:underline;text-underline-offset:4px}
    .v13-onboarding .v13-avatar{cursor:pointer}
    .v13-onboarding .v13-avatar img{width:100%;aspect-ratio:1;object-fit:contain}
    .v13-onboarding .v13-colors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .v13-onboarding .v13-color{display:flex;align-items:center;gap:10px;min-height:54px;padding:12px;border:1px solid var(--xty-border);border-radius:15px;background:var(--xty-paper);font-weight:800;cursor:pointer}
    .v13-onboarding .v13-color i{width:24px;height:24px;border-radius:50%;background:var(--v13-swatch);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
    .v13-create-book{margin:18px 0 22px;padding:18px;border:1px solid rgba(41,136,87,.25);border-radius:22px;background:linear-gradient(145deg,rgba(241,250,240,.96),rgba(255,252,239,.95));box-shadow:0 12px 36px rgba(41,136,87,.10)}
    .v13-create-book h2{margin:0 0 5px;font-size:clamp(22px,6vw,29px)}
    .v13-create-book p{margin:0;color:var(--xty-muted);font-size:14px;line-height:1.6}
    .v13-create-book .btn{width:100%;margin-top:13px;min-height:56px;font-size:17px}
    .v13-create-defaults{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}
    .v13-create-defaults span{padding:5px 8px;border:1px solid rgba(41,136,87,.18);border-radius:999px;background:rgba(255,255,255,.65);font-size:10px;font-weight:800;color:var(--xty-muted)}
    .v13-create-book.is-nudged .btn{animation:v13-create-nudge 2.3s ease-in-out 3}
    @keyframes v13-create-nudge{0%,100%{transform:translateY(0);box-shadow:var(--shadow)}45%{transform:translateY(-3px);box-shadow:0 14px 30px rgba(41,136,87,.24)}65%{transform:translateY(0)}}
    #publicDiscovery.v13-public-home{margin:20px 0 14px;padding:20px 0;border-top:1px dashed var(--xty-border);border-bottom:1px dashed var(--xty-border)}
    .v13-public-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
    .v13-public-head .btn{margin:0;flex:none}
    .v13-public-collapsed{margin:14px 0;padding:13px 14px;border:1px dashed var(--xty-border);border-radius:16px;background:rgba(255,255,255,.5)}
    .v13-public-collapsed button{border:0;background:transparent;color:var(--xty-primary);font:800 13px/1.4 var(--thai),var(--sans);cursor:pointer}
    .v13-public-label{color:var(--xty-primary)}
    #homeActions>a[href^="/new/"][data-v13-duplicate-create],#publicBookButton{display:none!important}
    .v13-public-seen-panel{margin-top:14px}
    .v13-witness-list{display:grid;gap:10px;margin-top:12px}
    .v13-witness-row{padding:13px;border:1px solid var(--xty-border);border-radius:15px;background:rgba(255,255,255,.65)}
    .v13-witness-row b{display:block;margin-bottom:4px}
    .v13-witness-row p{margin:0;color:var(--xty-muted);font-size:13px;line-height:1.55;white-space:pre-wrap}
    .v13-witness-row .btn{margin-top:10px}
    .v13-witness-row.is-seen{border-color:rgba(85,181,106,.42);background:rgba(85,181,106,.08)}
    .v13-public-seen-event{margin:7px 0;padding:9px 11px;border-left:3px solid rgba(80,121,170,.38);border-radius:0 10px 10px 0;background:rgba(80,121,170,.06);color:var(--xty-muted);font-size:12px;line-height:1.55}
    #seats.v13-solo-book .open{opacity:.58}
    #seats.v13-solo-book .open .al{font-size:10px}
  `;
  document.head.appendChild(style);
}

function mountStepOnboarding() {
  if (location.pathname !== '/' || hasProfile()) return;
  const host = document.getElementById('identityStep');
  if (!host || host.hidden || host.dataset.v13Onboarding === '1') return;
  host.dataset.v13Onboarding = '1';
  installStyle();
  host.innerHTML = `
    <div class="v13-onboarding">
      <div class="v13-onboarding-card">
        <section class="v13-onboarding-step" data-v13-step="name">
          <span class="v13-step-count">เริ่มต้น · 1 / 3</span>
          <p class="kicker">ยินดีต้อนรับ</p>
          <h1>อยากให้เราเรียกคุณว่าอะไร?</h1>
          <p class="v13-note">ไม่จำเป็นต้องเป็นชื่อจริง · ใช้ชื่อที่สบายใจได้ และเปลี่ยนทีหลังได้ตลอด</p>
          <div class="field" style="margin:0"><input id="v13Alias" maxlength="24" autocomplete="nickname" placeholder="เช่น กล้วยทอด"></div>
          <button class="btn gold" id="v13SaveName" type="button" disabled>ใช้ชื่อนี้</button>
          <a class="v13-read" href="${onboardingReadHref()}">อยากรู้จัก TeamBook ก่อน? อ่านต่อ →</a>
        </section>
        <section class="v13-onboarding-step" data-v13-step="avatar" hidden>
          <span class="v13-step-count">ตัวละคร · 2 / 3</span>
          <p class="kicker">เลือกตัวแทนของคุณ</p>
          <h1>วันนี้อยากเป็นตัวไหน?</h1>
          <p class="v13-note">ตัวละครนี้ไม่ใช่ตัวตนจริงของคุณ · เล่มอื่นจะเปลี่ยนอีกก็ได้</p>
          <div class="card-grid" id="v13AvatarPick" role="radiogroup" aria-label="เลือกตัวละคร"></div>
          <a class="v13-read" href="${onboardingReadHref()}">อ่านเรื่องของ TeamBook ต่อ →</a>
        </section>
        <section class="v13-onboarding-step" data-v13-step="color" hidden>
          <span class="v13-step-count">สี · 3 / 3</span>
          <p class="kicker">อีกอย่างเดียว</p>
          <h1>เลือกสีที่ชอบ</h1>
          <p class="v13-note">เลือกด้วยความรู้สึกได้เลย · เปลี่ยนทีหลังได้เหมือนกัน</p>
          <div class="v13-colors" id="v13ColorPick" role="radiogroup" aria-label="เลือกสี"></div>
          <a class="v13-read" href="${onboardingReadHref()}">อ่านเรื่องของ TeamBook ต่อ →</a>
        </section>
      </div>
    </div>`;

  const show = name => {
    host.querySelectorAll('[data-v13-step]').forEach(step => {
      step.hidden = step.dataset.v13Step !== name;
    });
    requestAnimationFrame(() => {
      host.querySelector(`[data-v13-step="${name}"] input, [data-v13-step="${name}"] button`)?.focus();
    });
  };

  const alias = document.getElementById('v13Alias');
  const saveName = document.getElementById('v13SaveName');
  alias.addEventListener('input', () => {
    saveName.disabled = alias.value.trim().length < 1;
  });
  alias.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !saveName.disabled) {
      event.preventDefault();
      saveName.click();
    }
  });
  saveName.addEventListener('click', () => {
    const name = alias.value.trim();
    if (!name) return;
    const look = randomProfileLook();
    createProfile({ alias: name, ...look });
    storageSet(V13_ONBOARDING_KEY, '1');
    show('avatar');
  });

  const avatarPick = document.getElementById('v13AvatarPick');
  TEAMBOOK_AVATARS.forEach(avatar => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pc avatar-card v13-avatar';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', avatar.nameTh);
    button.innerHTML = `<span class="glyph"><img src="${avatar.art}" alt="" width="128" height="128"></span>`;
    button.addEventListener('click', () => {
      updateProfile({ avatarId: avatar.id, avatar: avatar.id });
      show('color');
    });
    avatarPick.appendChild(button);
  });

  const colorPick = document.getElementById('v13ColorPick');
  Object.values(AVATAR_FRAMES).forEach(frame => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v13-color';
    button.style.setProperty('--v13-swatch', frame.hex);
    button.innerHTML = `<i aria-hidden="true"></i><span>${esc(frame.labelTh)}</span>`;
    button.addEventListener('click', () => {
      updateProfile({ avatarFrame: frame.id });
      location.href = onboardingExitHref();
    });
    colorPick.appendChild(button);
  });
}

function myActiveOwnedCount() {
  const mine = new Set(myPartyCodes());
  return allParties().filter(party => {
    if (!mine.has(party.code) || !isActiveParty(party)) return false;
    return party.ownerId === partyIdentity(party.code)?.userId;
  }).length;
}

function ensureCreateHero() {
  let node = document.getElementById('v13CreateBook');
  if (node) return node;
  const mainParty = document.getElementById('mainParty');
  if (!mainParty) return null;
  node = document.createElement('section');
  node.id = 'v13CreateBook';
  node.className = 'v13-create-book';
  node.innerHTML = `
    <p class="kicker">เปิดเรื่องของคุณ</p>
    <h2>มีอะไรที่อยากลองทำอยู่ไหม?</h2>
    <p>เปิดสมุดคนเดียวได้เลย · ถ้ามีใครอยากเข้ามาเขียนด้วย ค่อยเจอกันในเล่ม</p>
    <div class="v13-create-defaults" aria-label="ค่าเริ่มต้นของสมุดใหม่">
      <span>ทำเรื่องเดียวกัน</span><span>สาธารณะ</span><span>3 วัน</span><span>ต้องมีคนเห็นแล้ว</span>
    </div>
    <a class="btn gold" href="/new/?quick=1">+ เปิดสมุดใหม่</a>`;
  if (myActiveOwnedCount() === 0) node.classList.add('is-nudged');
  mainParty.insertAdjacentElement('beforebegin', node);
  return node;
}

function homePublicCover(party) {
  const card = cardById(party.coverValue);
  if (card) return cardMarkup(card);
  if (party.coverType === 'card_back') {
    return '<div class="animal-card card-back"><span class="back-mark">TB</span><small>TEAMBOOK</small></div>';
  }
  let snapshot = {
    species: party.lead?.avatar || 'orange_cat',
    color: party.lead?.avatarColor || 'green',
  };
  try { snapshot = { ...snapshot, ...JSON.parse(party.coverValue || '{}') }; } catch {}
  const avatar = avatarById(snapshot.species || 'orange_cat');
  return `<div class="avatar-cover" data-color="${esc(snapshot.color || 'green')}"><img src="${avatar.art}" alt=""></div>`;
}

function publicFull(party) {
  const count = Number(party.memberCount || 0);
  const max = Number(party.maxMembers || 5);
  return count >= max;
}

function renderHomeLobby(parties) {
  const list = document.getElementById('homePublicList');
  if (!list || homePublicHidden()) return;
  const shown = [...(parties || [])]
    .sort((a, b) => Number(publicFull(a)) - Number(publicFull(b)))
    .slice(0, 8);
  list.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement('div');
    empty.className = 'empty v13-public-render';
    empty.innerHTML = 'ยังไม่มีสมุดสาธารณะตรงนี้<br><span style="font-size:13px">เปิดสมุดของคุณคนเดียวเป็นเล่มแรกได้เลย</span>';
    list.appendChild(empty);
    return;
  }
  shown.forEach((party, index) => {
    const article = document.createElement('article');
    article.className = `card public-party home-public-party v13-public-render${publicFull(party) ? ' home-public-full' : ''}`;
    const status = publicFull(party)
      ? `${party.memberCount}/${party.maxMembers} · กำลังเขียน`
      : `เปิดอยู่ · ${party.memberCount}/${party.maxMembers}`;
    article.innerHTML = `${homePublicCover(party)}<div>`
      + `<div class="home-public-status"><span class="status-pill">${esc(status)}</span>${index === 0 ? '<span class="status-pill v13-public-label">PUBLIC</span>' : ''}</div>`
      + `<h2>${esc(party.name)}</h2>`
      + `<p>${esc(bookActivityLine(party, 'มีบางอย่างกำลังเกิดขึ้นในเล่มนี้'))}</p>`
      + `<a class="btn ghost sm" href="/public/p/?c=${encodeURIComponent(party.code)}">เปิดดู</a>`
      + '</div>';
    list.appendChild(article);
  });
}

async function loadHomeLobby(force = false) {
  if (location.pathname !== '/' || homePublicHidden()) return;
  if (force) {
    homeLobbyPromise = null;
    homeLobbyData = null;
  }
  if (homeLobbyData && !force) {
    renderHomeLobby(homeLobbyData);
    return;
  }
  const list = document.getElementById('homePublicList');
  if (list && !list.querySelector('.v13-public-render')) {
    list.innerHTML = '<div class="empty">กำลังเปิดสมุดสาธารณะ…</div>';
  }
  try {
    const response = await fetch(PUBLIC_LIST_PATH, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    });
    const data = await response.json();
    if (!response.ok || data.hiddenByUser) return;
    homeLobbyData = data.parties || [];
    renderHomeLobby(homeLobbyData);
  } catch {
    if (list) {
      list.innerHTML = '<div class="empty v13-public-render">ยังเปิดสมุดสาธารณะไม่สำเร็จ · ลองอีกครั้งภายหลัง</div>';
    }
  }
}

function ensurePublicControls(section) {
  if (!section || section.querySelector('.v13-public-head')) return;
  const kicker = section.querySelector(':scope > .kicker');
  const title = section.querySelector('#publicDiscoveryTitle');
  const lede = section.querySelector(':scope > .lede');
  if (!title) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'v13-public-head';
  const copy = document.createElement('div');
  if (kicker) copy.appendChild(kicker);
  copy.appendChild(title);
  if (lede) copy.appendChild(lede);
  const hide = document.createElement('button');
  hide.type = 'button';
  hide.className = 'btn ghost sm';
  hide.textContent = 'ซ่อน';
  hide.addEventListener('click', () => {
    storageSet(HOME_PUBLIC_HIDDEN_KEY, '1');
    section.hidden = true;
    const collapsed = document.getElementById('v13PublicCollapsed');
    if (collapsed) collapsed.hidden = false;
  });
  wrapper.append(copy, hide);
  section.insertBefore(wrapper, section.firstChild);
}

function ensurePublicCollapsed(container) {
  let node = document.getElementById('v13PublicCollapsed');
  if (node) return node;
  node = document.createElement('div');
  node.id = 'v13PublicCollapsed';
  node.className = 'v13-public-collapsed';
  node.innerHTML = '<button type="button">☀️ เปิดสมุดสาธารณะอีกครั้ง</button>';
  node.querySelector('button').addEventListener('click', async () => {
    storageRemove(HOME_PUBLIC_HIDDEN_KEY);
    homeLobbyPromise = null;
    homeLobbyData = null;
    node.hidden = true;
    const section = document.getElementById('publicDiscovery');
    if (section) section.hidden = false;
    await loadHomeLobby(true);
    scheduleHomeSync();
  });
  container.appendChild(node);
  return node;
}

function placePublicLane(all, joined, section, collapsed, closed) {
  if (!all || !section || !collapsed) return;
  if (closed?.parentNode === all) {
    /* Stable desired DOM: ...active groups -> collapsed placeholder -> Public
       -> Finished. Only move a node when it is actually out of place; otherwise
       the Home MutationObserver would create a remove/insert feedback loop. */
    if (section.parentNode !== all || section.nextElementSibling !== closed) {
      all.insertBefore(section, closed);
    }
    if (collapsed.parentNode !== all || collapsed.nextElementSibling !== section) {
      all.insertBefore(collapsed, section);
    }
    return;
  }
  if (joined?.parentNode === all) {
    if (collapsed.parentNode !== all || joined.nextElementSibling !== collapsed) {
      joined.insertAdjacentElement('afterend', collapsed);
    }
    if (section.parentNode !== all || collapsed.nextElementSibling !== section) {
      collapsed.insertAdjacentElement('afterend', section);
    }
  }
}

function syncHomeLayout() {
  if (location.pathname !== '/') return;
  const home = document.getElementById('home');
  if (!home || home.hidden) return;
  installStyle();
  replaceCanonCopy(home);
  ensureCreateHero();

  const actions = document.getElementById('homeActions');
  actions?.querySelectorAll('a[href^="/new/"]').forEach(link => {
    link.dataset.v13DuplicateCreate = '1';
  });
  const publicButton = document.getElementById('publicBookButton');
  if (publicButton) publicButton.hidden = true;

  const section = document.getElementById('publicDiscovery');
  const all = document.getElementById('allPartiesSection');
  const joined = document.getElementById('joinedPartyGroup');
  const closed = document.getElementById('closedPartyGroup');
  const collapsed = all ? ensurePublicCollapsed(all) : null;
  if (section) {
    section.classList.add('v13-public-home');
    ensurePublicControls(section);
  }
  placePublicLane(all, joined, section, collapsed, closed);

  const hidden = homePublicHidden();
  if (section && section.hidden !== hidden) section.hidden = hidden;
  if (collapsed && collapsed.hidden === hidden) collapsed.hidden = !hidden;
  if (all?.hidden) all.hidden = false;

  if (!hidden) {
    const hasV13Render = !!document.querySelector('#homePublicList > .v13-public-render');
    if (homeLobbyData && !hasV13Render) renderHomeLobby(homeLobbyData);
    else if (!homeLobbyData) loadHomeLobby();
  }
}

function scheduleHomeSync() {
  if (homeSyncQueued) return;
  homeSyncQueued = true;
  requestAnimationFrame(() => {
    homeSyncQueued = false;
    syncHomeLayout();
  });
}

function installHome() {
  installStyle();
  genericWelcomeCopy();
  replaceCanonCopy(document.body);
  const observer = new MutationObserver(() => {
    if (!hasProfile()) mountStepOnboarding();
    scheduleHomeSync();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
  mountStepOnboarding();
  scheduleHomeSync();
  addEventListener('pageshow', scheduleHomeSync);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleHomeSync();
  });
}

function clickChoice(containerId, matcher) {
  const box = document.getElementById(containerId);
  if (!box) return false;
  const button = [...box.querySelectorAll('button')]
    .find(node => matcher(String(node.textContent || '')));
  if (!button || button.disabled) return false;
  if (button.getAttribute('aria-checked') !== 'true') button.click();
  return true;
}

function installNewDefaults() {
  if (!/^\/new\/?$/.test(location.pathname)) return;
  installStyle();
  replaceCanonCopy(document.body);
  const title = document.querySelector('.create-page > .title');
  const lede = document.querySelector('.create-page > .lede');
  if (title) title.textContent = 'เปิดสมุดของคุณ';
  if (lede) lede.textContent = 'เริ่มคนเดียวได้ · ชวนคนอื่นเข้ามาทีหลังก็ได้';

  let tries = 0;
  const apply = () => {
    const mode = clickChoice('modePick', text => text.includes('ทำเรื่องเดียวกัน'));
    const verify = clickChoice('verificationPick', text => text.includes('ต้อง') && text.includes('เห็นแล้ว'));
    const visibility = clickChoice('visibilityPick', text => text.includes('สาธารณะ'));
    const duration = clickChoice('durationPick', text => text.includes('3') && text.includes('วัน'));
    if (mode && verify && visibility && duration) return;
    if (tries++ < 80) setTimeout(apply, 60);
  };
  setTimeout(apply, 0);
}

function witnessToken() {
  let value = storageGet(PUBLIC_WITNESS_KEY);
  if (value?.length >= 12) return value;
  try {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    value = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    value = `${Date.now()}-${Math.random()}-${Math.random()}`;
  }
  storageSet(PUBLIC_WITNESS_KEY, value);
  return value;
}

async function loadPublicPending(code) {
  const response = await fetch(`/api/teambook-public-seen?code=${encodeURIComponent(code)}`, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'PUBLIC_SEEN_LOAD_FAILED');
  return data.pending || [];
}

function installPublicSeenPanel() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;
  installStyle();
  let tries = 0;
  const mount = async () => {
    const joinZone = document.querySelector('.join-zone');
    const view = document.getElementById('view');
    if (!joinZone || !view || view.hidden) {
      if (tries++ < 80) setTimeout(mount, 80);
      return;
    }
    if (document.getElementById('v13PublicSeenPanel')) return;
    let pending = [];
    try { pending = await loadPublicPending(code); } catch { return; }
    if (!pending.length) return;

    const panel = document.createElement('section');
    panel.className = 'card v13-public-seen-panel';
    panel.id = 'v13PublicSeenPanel';
    panel.innerHTML = `
      <span class="label">เห็นจากข้างนอกสมุด</span>
      <h2 style="margin:7px 0 5px;font-size:20px">มีร่องรอยที่ยังรอใครบางคนเห็น</h2>
      <p class="whisper" style="margin:0">ไม่ต้องเข้าร่วมสมุดก็ได้ · ถ้าอยากให้เขารู้ว่ามีคนผ่านมาเห็น กด “เห็นแล้ว” ได้เลย</p>
      <div class="v13-witness-list"></div>`;
    const list = panel.querySelector('.v13-witness-list');
    pending.forEach(item => {
      const row = document.createElement('div');
      row.className = 'v13-witness-row';
      row.innerHTML = `<b>${esc(item.alias)}${item.activityLabel ? ` · ${esc(item.activityLabel)}` : ''}</b>`
        + `<p>${esc(item.note)}</p>`
        + '<button class="btn ghost sm" type="button">◎ เห็นแล้ว</button>';
      const button = row.querySelector('button');
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'กำลังส่งรอยว่าเห็นแล้ว…';
        try {
          const response = await fetch('/api/teambook-public-seen', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              code,
              seq: item.seq,
              witnessToken: witnessToken(),
              profileId: getProfile()?.id || '',
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            if (data.error === 'ALREADY_CONFIRMED') {
              row.classList.add('is-seen');
              button.textContent = 'มีคนเห็นแล้ว ✓';
              return;
            }
            if (data.error === 'CANNOT_CONFIRM_SELF') {
              button.textContent = 'เป็นรอยของคุณเอง';
              return;
            }
            if (data.error === 'CONFIRM_WINDOW_CLOSED') {
              button.textContent = 'รอยนี้วางไว้นานแล้ว';
              return;
            }
            throw new Error(data.error || 'PUBLIC_SEEN_FAILED');
          }
          row.classList.add('is-seen');
          button.textContent = 'เห็นแล้ว ✓';
          const note = document.createElement('p');
          note.className = 'whisper';
          note.style.marginTop = '7px';
          note.textContent = 'รอยนี้ถูกส่งกลับเข้าไปในสมุดแล้ว';
          row.appendChild(note);
        } catch {
          button.disabled = false;
          button.textContent = 'ลองกด เห็นแล้ว อีกครั้ง';
        }
      });
      list.appendChild(row);
    });
    joinZone.insertAdjacentElement('beforebegin', panel);
  };
  setTimeout(mount, 0);
}

function hasEventRow(log, key) {
  return [...log.querySelectorAll('[data-v13-public-event]')]
    .some(node => node.dataset.v13PublicEvent === key);
}

function decoratePartyPublicSeen() {
  if (!/^\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;
  const party = getParty(code);
  const log = document.getElementById('log');
  if (!party || !log) return;

  const commits = (party.log || [])
    .filter(post => post.kind === 'commit' && !post.retracted);
  const nodes = [...log.querySelectorAll('.post.commit')];
  commits.forEach((post, index) => {
    if (!String(post.confirmedBy || '').startsWith('public:')) return;
    const mark = nodes[index]?.querySelector('.confirmed-mark');
    if (mark) mark.textContent = '◎ ใครบางคนนอกสมุดเห็นแล้ว';
  });

  const publicEvents = (party.events || [])
    .filter(event => event.type === 'PUBLIC_SEEN');
  publicEvents.forEach((event, index) => {
    const key = String(event.id || event.createdAt || event.at || `${event.data?.seq || ''}:${index}`);
    if (hasEventRow(log, key)) return;
    const row = document.createElement('div');
    row.className = 'v13-public-seen-event';
    row.dataset.v13PublicEvent = key;
    row.textContent = event.data?.message
      || `👀 มีใครบางคนนอกสมุดเห็นสิ่งที่ ${event.data?.alias || 'ใครบางคน'} ทำแล้ว`;
    log.appendChild(row);
  });

  const myId = partyIdentity(code)?.userId;
  const myPublicSeen = (party.log || []).some(post =>
    post.kind === 'commit'
      && post.userId === myId
      && String(post.confirmedBy || '').startsWith('public:'));
  if (myPublicSeen) {
    const title = document.querySelector('.tb-seen-welcome #tbSeenWelcomeTitle');
    if (title) title.textContent = 'ใครบางคนนอกสมุด มองเห็นสิ่งที่คุณทำแล้ว';
  }

  const seats = document.getElementById('seats');
  if (seats) {
    const solo = (party.members || []).length === 1;
    seats.classList.toggle('v13-solo-book', solo);
    if (solo) {
      const hint = document.getElementById('seatHint');
      if (hint) {
        hint.textContent = 'สมุดเล่มนี้สมบูรณ์แล้วด้วยคนเดียว · ถ้ามีใครอยากเข้ามาเขียนด้วย ค่อยเปิดที่ว่างให้เขา';
      }
      [...seats.querySelectorAll('.open .al')].forEach(node => {
        if (node.textContent === 'ที่ว่าง') node.textContent = 'ที่ว่างเผื่อใครผ่านมา';
      });
    }
  }
}

let partyDecorQueued = false;
function schedulePartyDecor() {
  if (partyDecorQueued) return;
  partyDecorQueued = true;
  requestAnimationFrame(() => {
    partyDecorQueued = false;
    decoratePartyPublicSeen();
  });
}

function installPartyDecoration() {
  if (!/^\/p\/?$/.test(location.pathname)) return;
  installStyle();
  const observer = new MutationObserver(schedulePartyDecor);
  observer.observe(document.body, { childList: true, subtree: true });
  [300, 900, 1800, 3200].forEach(delay => setTimeout(decoratePartyPublicSeen, delay));
}

function boot() {
  replaceCanonCopy(document.body);
  if (location.pathname === '/') installHome();
  if (/^\/new\/?$/.test(location.pathname)) installNewDefaults();
  if (/^\/public\/p\/?$/.test(location.pathname)) installPublicSeenPanel();
  if (/^\/p\/?$/.test(location.pathname)) installPartyDecoration();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
