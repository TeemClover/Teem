import { getParty } from './store.js';
import { PET_BY_ID } from './pets.js';
import { resolveMemberAvatar } from './card-picker.js';
import { cardById, cardNameTh } from './cards.js';
import { cardMarkup } from './card-ui.js';

const code = new URLSearchParams(location.search).get('c');
let scheduled = false;
let syncing = false;

if (code && /^\d{5}$/.test(code)) install();

function install() {
  injectStyle();
  const seats = document.getElementById('seats');
  if (!seats) return;
  new MutationObserver(schedule).observe(seats, { childList: true, subtree: true });
  schedule();
}

function injectStyle() {
  if (document.getElementById('xty-pet-seat-v2-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-pet-seat-v2-style';
  style.textContent = `
    /* Six literal 63×88 card spaces. A Book cover is NOT a person's
       character identity. Human seats always render member.avatar only. */
    #seats.party-table > *{
      width:100%;
      min-width:0;
      aspect-ratio:var(--xty-card-aspect)!important;
    }

    /* Collection skin: the card artwork itself fills the human card slot. */
    #seats .xty-full-card-seat{
      position:relative;
      display:block;
      overflow:hidden;
      border:0!important;
      border-radius:14px;
      background:transparent;
      box-shadow:none!important;
    }
    #seats .xty-full-card-seat > .animal-card{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      margin:0!important;
      border-radius:14px!important;
    }
    #seats .xty-full-card-seat > .animal-card .card-art{
      width:100%!important;
      height:100%!important;
      object-fit:cover!important;
    }

    /* Starter human: source art is intentionally a square portrait inside
       the same 63×88 card shell. Do not stretch it into fake full-art. */
    #seats .xty-starter-member-seat{
      position:relative;
      display:block;
      overflow:hidden;
      padding:0!important;
      border:1px solid var(--xty-border)!important;
      border-radius:14px;
      background:var(--xty-surface)!important;
      box-shadow:none!important;
    }
    #seats .xty-starter-member-seat .av{
      position:absolute;
      left:50%;top:50%;
      width:68%;height:auto;
      aspect-ratio:1;
      display:grid;place-items:center;
      transform:translate(-50%,-50%);
    }
    #seats .xty-starter-member-seat .av img{
      width:100%;height:100%;
      object-fit:contain;
      border-radius:12px;
    }

    /* Starter companion can use the full body because it has no Signature
       state. It still occupies the same card template as the other seats. */
    .xty-pet-companion-seat{
      position:relative;
      overflow:hidden;
      padding:0!important;
      border:1px solid var(--xty-border)!important;
      border-radius:14px;
      background:var(--xty-surface)!important;
      box-shadow:3px 4px 0 rgba(62,51,44,.08);
    }
    .xty-pet-companion-seat .av{
      position:absolute;
      left:50%;top:50%;
      width:86%;height:72%;
      display:grid;place-items:center;
      transform:translate(-50%,-50%);
    }
    .xty-pet-companion-seat .av img{
      width:100%;height:100%;
      object-fit:contain;
      filter:drop-shadow(0 3px 0 rgba(62,51,44,.08));
    }

    /* Owner and member names intentionally share this exact plate. The blur
       does the readability work, so the paper can stay very transparent and
       let more of the card illustration show through. */
    #seats .tb-card-name{
      background:linear-gradient(90deg,
        rgba(255,254,248,.06) 0%,
        rgba(255,254,248,.22) 20%,
        rgba(255,254,248,.22) 80%,
        rgba(255,254,248,.06) 100%)!important;
      border:1px solid rgba(255,255,255,.26)!important;
      box-shadow:0 1px 0 rgba(62,51,44,.05),0 2px 8px rgba(255,254,248,.06)!important;
      text-shadow:
        0 1px 1px rgba(255,255,255,.90),
        1px 0 2px rgba(255,255,255,.68),
        -1px 0 2px rgba(255,255,255,.68)!important;
      backdrop-filter:blur(6px) saturate(.92)!important;
      -webkit-backdrop-filter:blur(6px) saturate(.92)!important;
    }

    /* The owner role badge is separate from the person's name plate. Keep it
       subtle so it does not compete with the artwork. */
    #seats .tb-owner-label{
      background:rgba(255,254,248,.22)!important;
      border-color:rgba(41,136,87,.24)!important;
      box-shadow:0 1px 0 rgba(62,51,44,.04),0 2px 7px rgba(255,254,248,.05)!important;
      text-shadow:0 1px 1px rgba(255,255,255,.84)!important;
      backdrop-filter:blur(6px) saturate(.92)!important;
      -webkit-backdrop-filter:blur(6px) saturate(.92)!important;
    }

    /* Companion role pill stays shadow-free, but gets a denser paper layer
       than the name plates so the green label remains readable over busy art. */
    #seats .tb-companion-label{
      background:rgba(255,254,248,.58)!important;
      border:1px solid rgba(255,255,255,.44)!important;
      box-shadow:none!important;
      text-shadow:none!important;
      backdrop-filter:blur(6px) saturate(.92)!important;
      -webkit-backdrop-filter:blur(6px) saturate(.92)!important;
    }
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[c]));
}

function schedule() {
  if (scheduled || syncing) return;
  scheduled = true;
  queueMicrotask(sync);
}

function fullCardSeat(card, signature) {
  const tile = document.createElement('div');
  tile.className = 'seat-card-wrap xty-full-card-seat';
  tile.dataset.characterSeat = signature;
  tile.innerHTML = cardMarkup(card);
  return tile;
}

function starterMemberSeat(member, resolved) {
  const tile = document.createElement('div');
  tile.className = 'seat xty-card xty-starter-member-seat';
  tile.dataset.characterSeat = `starter|${member.userId}|${member.avatar}|${member.avatarColor || ''}`;
  const art = resolved?.speciesArt || '';
  tile.innerHTML = `<div class="av member-avatar" data-color="${esc(member.avatarColor || 'green')}">`
    + (art ? `<img src="${esc(art)}" alt="" loading="eager" decoding="async">` : esc(member.avatar || '🍀'))
    + '</div>';
  return tile;
}

function memberCharacter(member) {
  const resolved = resolveMemberAvatar(member?.avatar);
  if (!resolved) return { resolved: null, card: null };
  const card = resolved.cardId ? cardById(resolved.cardId) : null;
  return { resolved, card };
}

function syncHumanSeat(seats, member, index) {
  const current = seats.children[index];
  if (!member || !current) return;
  const { resolved, card } = memberCharacter(member);

  /* Critical TeamBook rule: p.coverType / p.leadCardId never participate in
     this decision. The owner is still a person and therefore shows the
     owner's selected character exactly like everyone else. */
  if (card) {
    const signature = `card|${member.userId}|${card.cardId}`;
    if (current.dataset?.characterSeat === signature) return;
    current.replaceWith(fullCardSeat(card, signature));
    return;
  }

  const signature = `starter|${member.userId}|${member.avatar}|${member.avatarColor || ''}`;
  if (current.dataset?.characterSeat === signature) return;
  current.replaceWith(starterMemberSeat(member, resolved));
}

function sync() {
  scheduled = false;
  if (syncing) return;
  const party = getParty(code);
  const seats = document.getElementById('seats');
  if (!party || !seats) return;

  const owner = party.members.find(member => member.role === 'lead') || null;
  const others = party.members.filter(member => member.role !== 'lead');
  const slots = [owner, others[0] || null, others[1] || null, others[2] || null, others[3] || null];

  syncing = true;
  try {
    slots.forEach((member, index) => {
      if (member) syncHumanSeat(seats, member, index);
    });

    /* Companion Collection skin: full-art. No Signature state. */
    const npc = cardById(party.npcCardId);
    const currentPet = seats.children[5];
    if (npc && currentPet) {
      const signature = `companion-card|${npc.cardId}`;
      if (currentPet.dataset?.characterSeat !== signature) {
        currentPet.replaceWith(fullCardSeat(npc, signature));
      }
      return;
    }

    /* Built-in Starter companion: full-body portrait. */
    const pet = party.petId ? PET_BY_ID[party.petId] : null;
    if (!pet || !currentPet) return;
    const signature = `companion-starter|${party.petId}`;
    if (currentPet.dataset?.characterSeat === signature) return;

    const tile = document.createElement('div');
    tile.className = 'seat xty-card pet-card xty-pet-companion-seat';
    tile.dataset.characterSeat = signature;
    tile.innerHTML = `<div class="av">${pet.art
      ? `<img src="${esc(pet.art)}" alt="" width="256" height="256" loading="eager" decoding="async">`
      : esc(pet.emoji || '🐾')}</div>`;
    currentPet.replaceWith(tile);
  } finally {
    syncing = false;
  }
}
