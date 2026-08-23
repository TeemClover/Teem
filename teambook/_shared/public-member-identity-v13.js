/* TeamBook V1.3 public member identity
   Public Detail must show the identity a member is CURRENTLY using in this
   specific Book. A profile/default Starter is not canonical here: the same
   person may equip a different Collection card in every Book.

   teambook_book_members.avatar is the per-book source of truth. When it is a
   card id, render that card's current art. Only fall back to Starter art when
   the member is actually using a Starter species in this Book.

   Visual grammar:
   - the large Public cover identifies the Book owner by alias in the top strip
   - every member identity uses the same 63:88 silhouette, including Starters
   - Starter art fills the card frame instead of shrinking into a square tile */

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
    /* Public cover follows the same meaning as the owner card inside a Book:
       the top strip says WHO owns the Book. The old Starter species label is
       presentation noise here and is hidden. */
    #cover{position:relative!important}
    #cover .avatar-cover{padding:0!important;gap:0!important;overflow:hidden!important}
    #cover .avatar-cover>img{width:100%!important;height:100%!important;aspect-ratio:auto!important;object-fit:cover!important;border-radius:inherit!important}
    #cover .avatar-cover>b,#cover .avatar-cover>small{display:none!important}
    #cover>.tb-public-cover-owner{
      position:absolute;left:7px;right:7px;top:7px;z-index:60;
      display:block;min-width:0;padding:4px 7px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      color:var(--xty-ink);font:900 10px/1.15 var(--thai),var(--sans);
      text-align:center;border-radius:999px;background:rgba(255,254,248,.92);
      box-shadow:0 1px 0 rgba(62,51,44,.08);
      pointer-events:none;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)
    }

    /* One member row = one card silhouette. Collection cards already have
       full art; Starter portraits are promoted into the same 63:88 shell. */
    #members .preview-member{width:76px}
    #members .tb-public-member-visual{
      position:relative;display:grid;place-items:center;
      width:56px!important;aspect-ratio:var(--xty-card-aspect,63/88)!important;
      height:auto!important;margin:0 auto 6px;background:#fff;overflow:hidden;
      border-radius:10px
    }
    #members .tb-public-member-visual.is-starter{
      border:2px solid var(--xty-green);
      box-shadow:0 2px 6px rgba(62,51,44,.10)
    }
    #members .tb-public-member-visual.is-starter[data-color="red"]{border-color:var(--xty-red)}
    #members .tb-public-member-visual.is-starter[data-color="green"]{border-color:var(--xty-green)}
    #members .tb-public-member-visual.is-starter[data-color="blue"]{border-color:var(--xty-blue)}
    #members .tb-public-member-visual.is-starter[data-color="silver"]{border-color:var(--xty-silver)}
    #members .tb-public-member-visual.is-card{
      border:0;box-shadow:0 2px 6px rgba(62,51,44,.14)
    }
    #members .tb-public-member-visual img{
      display:block;width:100%!important;height:100%!important;margin:0!important;
      border:0!important;border-radius:inherit!important;background:transparent!important;
      object-fit:cover!important;object-position:center!important
    }

    /* The compact daily-status rows use the same ratio too, so identity does
       not jump between square Starter and vertical Collection card. */
    .tb-member-status .tb-book-member-visual{
      flex:none;display:grid;place-items:center;overflow:hidden;background:#fff;
      width:28px!important;aspect-ratio:var(--xty-card-aspect,63/88)!important;
      height:auto!important;border-radius:6px
    }
    .tb-member-status .tb-book-member-visual.is-starter{border:1px solid var(--xty-green)}
    .tb-member-status .tb-book-member-visual.is-starter[data-color="red"]{border-color:var(--xty-red)}
    .tb-member-status .tb-book-member-visual.is-starter[data-color="green"]{border-color:var(--xty-green)}
    .tb-member-status .tb-book-member-visual.is-starter[data-color="blue"]{border-color:var(--xty-blue)}
    .tb-member-status .tb-book-member-visual.is-starter[data-color="silver"]{border-color:var(--xty-silver)}
    .tb-member-status .tb-book-member-visual.is-card{border:0;box-shadow:0 1px 3px rgba(62,51,44,.12)}
    .tb-member-status .tb-book-member-visual img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}
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
  const frame = document.createElement('span');
  frame.className = `${className} is-${visual.kind}`;
  frame.dataset.color = ['red', 'green', 'blue', 'silver'].includes(member?.avatarColor)
    ? member.avatarColor : 'green';
  frame.title = visual.label;
  const art = document.createElement('img');
  art.src = visual.src;
  art.alt = '';
  art.loading = 'eager';
  art.decoding = 'async';
  frame.appendChild(art);
  return frame;
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

function renderCoverOwner(party) {
  const cover = document.getElementById('cover');
  if (!cover) return;
  const owner = (party?.members || []).find(member => member.role === 'lead') || party?.members?.[0];
  if (!owner) return;
  let label = cover.querySelector(':scope > .tb-public-cover-owner');
  if (!label) {
    label = document.createElement('span');
    label.className = 'tb-public-cover-owner';
    cover.appendChild(label);
  }
  const alias = owner.alias || 'เจ้าของสมุด';
  if (label.textContent !== alias) label.textContent = alias;
}

function renderMemberStrip(party) {
  const host = document.getElementById('members');
  if (!host) return;
  const members = orderedMembers(party);
  const signature = members
    .map(member => `${member.userId}:${member.alias}:${member.avatar}:${member.avatarColor}:${member.role}`)
    .join('|');
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
  renderCoverOwner(party);
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
