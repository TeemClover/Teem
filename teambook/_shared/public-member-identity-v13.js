/* TeamBook V1.3 public member identity
   Public Detail must show the identity a member is CURRENTLY using in this
   specific Book. A profile/default Starter is not canonical here: the same
   person may equip a different Collection card in every Book.

   teambook_book_members.avatar is the per-book source of truth. When it is a
   card id, render that card's current art. Only fall back to Starter art when
   the member is actually using a Starter species in this Book. */

import { avatarById } from './avatars.js';
import { cardById, cardDescriptorTh } from './cards.js';

const PREVIEW_API = '/api/teambook-party-finish?op=public-preview-v2&code=';
let partyPromise = null;
let partyCache = null;
let queued = false;

function onPublicDetail() {
  return /^\/public\/p\/?$/.test(location.pathname);
}

function code() {
  const value = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(value) ? value : '';
}

function installStyle() {
  if (document.getElementById('tb-public-member-identity-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-public-member-identity-style';
  style.textContent = `
    #members .preview-member{width:76px}
    #members .tb-public-member-visual{display:grid;place-items:center;margin:0 auto 5px;background:#fff;overflow:hidden}
    #members .tb-public-member-visual.is-starter{width:54px;height:54px;border:2px solid var(--xty-border);border-radius:14px}
    #members .tb-public-member-visual.is-card{width:54px;aspect-ratio:var(--xty-card-aspect,63/88);border-radius:9px;box-shadow:0 2px 6px rgba(62,51,44,.12)}
    #members .tb-public-member-visual img{display:block;width:100%!important;height:100%!important;margin:0!important;border:0!important;border-radius:inherit!important;background:transparent!important}
    #members .tb-public-member-visual.is-starter img{object-fit:contain!important}
    #members .tb-public-member-visual.is-card img{object-fit:cover!important}
    .tb-member-status .tb-book-member-visual{flex:none;display:grid;place-items:center;overflow:hidden;background:#fff}
    .tb-member-status .tb-book-member-visual.is-starter{width:30px;height:30px;border:1px solid var(--xty-border);border-radius:9px}
    .tb-member-status .tb-book-member-visual.is-card{width:25px;aspect-ratio:var(--xty-card-aspect,63/88);border-radius:5px;box-shadow:0 1px 3px rgba(62,51,44,.12)}
    .tb-member-status .tb-book-member-visual img{display:block;width:100%;height:100%;object-fit:cover}
    .tb-member-status .tb-book-member-visual.is-starter img{object-fit:contain}
  `;
  document.head.appendChild(style);
}

function identityVisual(member) {
  const raw = String(member?.avatar || 'orange_cat');
  const card = cardById(raw);
  if (card) {
    return {
      kind: 'card',
      src: card.imageFull || card.art || card.image || '',
      label: cardDescriptorTh(card) || 'การ์ด TeamBook',
    };
  }
  const avatar = avatarById(raw || 'orange_cat');
  return {
    kind: 'starter',
    src: avatar.art,
    label: avatar.nameTh || member?.alias || 'ตัวละคร TeamBook',
  };
}

function visualMarkup(member, className = 'tb-public-member-visual') {
  const visual = identityVisual(member);
  const img = document.createElement('span');
  img.className = `${className} is-${visual.kind}`;
  img.title = visual.label;
  const art = document.createElement('img');
  art.src = visual.src;
  art.alt = '';
  art.loading = 'eager';
  art.decoding = 'async';
  img.appendChild(art);
  return img;
}

async function loadParty({ force = false } = {}) {
  const partyCode = code();
  if (!partyCode) return null;
  if (force) {
    partyCache = null;
    partyPromise = null;
  }
  if (partyCache) return partyCache;
  if (!partyPromise) {
    partyPromise = fetch(`${PREVIEW_API}${encodeURIComponent(partyCode)}`, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.party) throw new Error(data.error || 'PUBLIC_PREVIEW_FAILED');
      partyCache = data.party;
      return partyCache;
    }).catch(error => {
      partyPromise = null;
      throw error;
    });
  }
  return partyPromise;
}

function orderedMembers(party) {
  const members = Array.isArray(party?.members) ? party.members : [];
  const owner = members.find(member => member.role === 'lead') || null;
  return owner ? [owner, ...members.filter(member => member !== owner)] : members;
}

function renderMemberStrip(party) {
  const host = document.getElementById('members');
  if (!host) return;
  const members = orderedMembers(party);
  const signature = members.map(member => `${member.userId}:${member.avatar}:${member.avatarColor}:${member.role}`).join('|');
  if (host.dataset.tbBookIdentitySignature === signature) return;

  const fragment = document.createDocumentFragment();
  members.forEach(member => {
    const node = document.createElement('div');
    node.className = 'preview-member';
    node.dataset.tbUserId = member.userId || '';
    node.appendChild(visualMarkup(member));
    const name = document.createElement('b');
    name.textContent = member.alias || 'คนในสมุด';
    node.appendChild(name);
    const role = document.createElement('small');
    role.textContent = member.role === 'lead' ? 'เจ้าของสมุด' : 'สมาชิก';
    node.appendChild(role);
    fragment.appendChild(node);
  });
  host.replaceChildren(fragment);
  host.dataset.tbBookIdentitySignature = signature;
}

function decorateStatusRows(party) {
  const rows = [...document.querySelectorAll('#tbPublicMemberStatuses .tb-member-status')];
  if (!rows.length) return;
  /* v13 detail status rows and public-preview members are both returned in
     joined_at order. Keep that stable server order here; the top member strip
     is free to put the current owner first for scanning. */
  const members = Array.isArray(party?.members) ? party.members : [];
  rows.forEach((row, index) => {
    const member = members[index];
    const left = row.querySelector('.left');
    if (!member || !left) return;
    const signature = `${member.userId}:${member.avatar}:${member.avatarColor}`;
    if (row.dataset.tbBookIdentitySignature === signature) return;
    left.querySelector('.tb-book-member-visual')?.remove();
    left.prepend(visualMarkup(member, 'tb-book-member-visual'));
    row.dataset.tbBookIdentitySignature = signature;
  });
}

async function sync() {
  if (!onPublicDetail()) return;
  const view = document.getElementById('view');
  if (!view || view.hidden) return;
  let party;
  try { party = await loadParty(); } catch { return; }
  renderMemberStrip(party);
  decorateStatusRows(party);
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    sync();
  });
}

function refresh() {
  loadParty({ force: true }).catch(() => {}).finally(schedule);
}

function install() {
  if (!onPublicDetail()) return;
  installStyle();
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
  addEventListener('pageshow', refresh);
  addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
