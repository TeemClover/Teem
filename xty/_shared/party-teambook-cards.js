import {
  confirmCommit, dayKey, getParty, isActiveParty, partyIdentity,
} from './store.js';
import { PET_BY_ID } from './pets.js';
import { cardById } from './cards.js';

const code = new URLSearchParams(location.search).get('c');
let scheduled = false;
let seeing = false;

if (/^\d{5}$/.test(code || '')) install();

function install() {
  injectStyle();
  document.addEventListener('click', interceptProfileOrSeen, true);
  document.addEventListener('keydown', interceptKeyboard, true);
  const view = document.getElementById('view');
  if (view) {
    new MutationObserver(schedule).observe(view, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'role', 'tabindex'],
    });
  }
  schedule();
}

function injectStyle() {
  if (document.getElementById('teambook-person-card-style')) return;
  const style = document.createElement('style');
  style.id = 'teambook-person-card-style';
  style.textContent = `
    /* XTY card grammar: every human seat is one 63×88 card template.
       Starter art may stay a square portrait; Collection art may fill the
       card. The information layer never moves: name top-centre, daily state
       bottom-centre. */
    #seats.tb-card-grid{margin-top:32px}
    #seats>.tb-person-seat,
    #seats>.tb-companion-seat{
      position:relative!important;
      width:100%!important;
      min-width:0!important;
      aspect-ratio:var(--xty-card-aspect)!important;
      overflow:visible!important;
      border-radius:14px!important;
    }
    #seats>.tb-person-seat.xty-profile-click,
    #seats>.tb-companion-seat.xty-profile-click{cursor:default!important}
    #seats>.tb-person-seat.tb-can-seen{cursor:pointer!important}
    #seats>.tb-person-seat.tb-can-seen:hover{transform:translateY(-1px)}

    /* Legacy seat labels are intentionally hidden. Role is a property of
       the Book interface, not printed on the character card. */
    #seats>.tb-person-seat>.slot-label,
    #seats>.tb-person-seat>.al,
    #seats>.tb-person-seat>.rl,
    #seats>.tb-person-seat>.commit-state,
    #seats>.tb-person-seat>.seat-card-name,
    #seats>.tb-person-seat .xty-seat-name,
    #seats>.tb-person-seat .xty-seat-state,
    #seats>.tb-person-seat .xty-collection-seat__top,
    #seats>.tb-person-seat .xty-collection-seat__bottom,
    #seats>.tb-person-seat .role-badge,
    #seats>.tb-person-seat .card-copy,
    #seats>.tb-companion-seat>.slot-label,
    #seats>.tb-companion-seat>.al,
    #seats>.tb-companion-seat>.rl,
    #seats>.tb-companion-seat>.commit-state,
    #seats>.tb-companion-seat>.seat-card-name,
    #seats>.tb-companion-seat .xty-seat-name,
    #seats>.tb-companion-seat .xty-seat-state,
    #seats>.tb-companion-seat .xty-collection-seat__top,
    #seats>.tb-companion-seat .xty-collection-seat__bottom,
    #seats>.tb-companion-seat .role-badge,
    #seats>.tb-companion-seat .card-copy{display:none!important}

    /* Starter portrait: keep the source square instead of pretending it is
       full-art. It sits in the same card shell as every Collection skin. */
    #seats>.tb-person-seat.seat{
      display:block!important;
      padding:0!important;
      text-align:center!important;
      background:var(--xty-surface)!important;
      border:1px solid var(--xty-border)!important;
    }
    #seats>.tb-person-seat.seat.lead{border:1px solid var(--xty-border)!important}
    #seats>.tb-person-seat.seat>.av{
      position:absolute!important;
      left:50%!important;top:50%!important;
      width:68%!important;height:auto!important;aspect-ratio:1!important;
      transform:translate(-50%,-50%)!important;
      display:grid!important;place-items:center!important;
    }
    #seats>.tb-person-seat.seat>.av img{
      width:100%!important;height:100%!important;
      object-fit:contain!important;border-radius:12px!important;
    }
    #seats>.tb-person-seat.seat>.av.is-card{
      width:100%!important;height:100%!important;aspect-ratio:auto!important;
    }
    #seats>.tb-person-seat.seat>.av.is-card img{
      object-fit:cover!important;border-radius:13px!important;
    }

    /* Full-art wrappers continue to clip their own artwork, while the outer
       slot can let the owner label sit outside the card. */
    #seats>.tb-person-seat>.animal-card,
    #seats>.tb-person-seat>.xty-image-seat,
    #seats>.tb-person-seat>.xty-core7-seat,
    #seats>.tb-person-seat>.xty-back-seat,
    #seats>.tb-person-seat>.xty-collection-seat__card,
    #seats>.tb-person-seat>.xty-collection-seat__svg,
    #seats>.tb-companion-seat>.animal-card,
    #seats>.tb-companion-seat>.xty-collection-seat__card,
    #seats>.tb-companion-seat>.xty-collection-seat__svg{
      border-radius:14px!important;overflow:hidden!important;
    }

    .tb-card-name{
      position:absolute;left:9px;right:9px;top:8px;z-index:30;
      display:block;min-width:0;padding:4px 7px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      color:var(--xty-ink);font-size:clamp(10px,2.7vw,13px);font-weight:900;line-height:1.15;
      text-align:center;border-radius:999px;background:rgba(255,254,248,.9);
      box-shadow:0 1px 0 rgba(62,51,44,.08);
      pointer-events:none;
      backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
    }
    .tb-owner-label{
      position:absolute;left:50%;top:-23px;z-index:40;transform:translateX(-50%);
      max-width:calc(100% - 4px);padding:3px 8px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      color:var(--xty-primary);font:900 8px/1.2 var(--thai),var(--sans);
      letter-spacing:.05em;border-radius:999px;background:var(--xty-surface);
      border:1px solid rgba(41,136,87,.32);pointer-events:none;
    }
    .tb-daily-state{
      position:absolute;left:50%;bottom:10px;z-index:35;transform:translateX(-50%);
      width:22px;height:22px;padding:0;border:3px solid #B8B0A7;border-radius:50%;
      background:rgba(255,254,248,.94);box-shadow:0 1px 0 rgba(62,51,44,.14);
      appearance:none;-webkit-appearance:none;
    }
    .tb-daily-state--waiting{
      border-color:#E2B63F;background:#FFF0A9;
      box-shadow:0 0 0 3px rgba(226,182,63,.14),0 1px 0 rgba(62,51,44,.12);
    }
    .tb-daily-state--seen{
      border-color:#3FA665;background:#55B56A;
      box-shadow:0 0 0 3px rgba(85,181,106,.12),0 1px 0 rgba(62,51,44,.12);
    }
    button.tb-daily-state{cursor:pointer}
    button.tb-daily-state:hover{transform:translateX(-50%) scale(1.08)}
    button.tb-daily-state:disabled{cursor:wait;opacity:.65}

    /* Companion uses the same card skeleton, but never participates in
       Signature/Seen. Its semantic slot simply says เพื่อนร่วมทาง. */
    #seats>.tb-companion-seat.seat{
      display:block!important;padding:0!important;
      background:var(--xty-surface)!important;border:1px solid var(--xty-border)!important;
    }
    #seats>.tb-companion-seat.seat>.av{
      position:absolute!important;left:50%!important;top:50%!important;
      width:86%!important;height:72%!important;transform:translate(-50%,-50%)!important;
      display:grid!important;place-items:center!important;
    }
    #seats>.tb-companion-seat.seat>.av img{
      width:100%!important;height:100%!important;object-fit:contain!important;
    }
    .tb-companion-label{
      position:absolute;left:50%;bottom:9px;z-index:35;transform:translateX(-50%);
      max-width:calc(100% - 16px);padding:4px 8px;
      color:var(--xty-primary);font:900 clamp(8px,2.2vw,10px)/1 var(--thai),var(--sans);
      text-align:center;white-space:nowrap;border-radius:999px;background:rgba(255,254,248,.92);
      pointer-events:none;
    }

    /* The overview dots speak the same three-state language as the cards. */
    .dots i.tb-unsigned{border-color:rgba(62,51,44,.28)!important;background:transparent!important}
    .dots i.tb-waiting{border-color:#E2B63F!important;background:#FFF0A9!important}
    .dots i.tb-seen{border-color:#3FA665!important;background:#55B56A!important}
    .progress-day.waiting:not(.done){color:var(--xty-ink);border-color:#E2B63F;background:#FFF0A9}

    /* Profile navigation is deferred. The log remains readable text only. */
    #log .who.xty-profile-click{text-decoration:none!important;cursor:default!important}

    @media(max-width:480px){
      .tb-owner-label{top:-21px;font-size:7px}
      .tb-card-name{left:6px;right:6px;top:6px;padding:3px 5px}
      .tb-daily-state{width:20px;height:20px;bottom:8px}
      .tb-companion-label{bottom:7px;padding:3px 6px}
    }
  `;
  document.head.appendChild(style);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    sync();
  });
}

function membersInSeatOrder(party) {
  const owner = party.members.find(member => member.role === 'lead') || null;
  const others = party.members.filter(member => member.role !== 'lead');
  return [owner, others[0] || null, others[1] || null, others[2] || null, others[3] || null];
}

function todayCommit(party, userId) {
  const today = dayKey();
  const log = Array.isArray(party.log) ? party.log : [];
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const post = log[i];
    if (post?.kind !== 'commit' || post.retracted || post.userId !== userId) continue;
    if (dayKey(post.sentAt) === today) return post;
  }
  return null;
}

function dailyState(party, member) {
  const commit = todayCommit(party, member.userId);
  if (!commit) return { id: 'unsigned', commit: null, label: 'วันนี้ยังไม่ลงชื่อ' };
  if (commit.confirmedBy) return { id: 'seen', commit, label: 'มีคนเห็นแล้ว' };
  return { id: 'waiting', commit, label: 'ลงชื่อแล้ว · รอเพื่อนกด เห็นแล้ว' };
}

function currentUserId() {
  return partyIdentity(code)?.userId || '';
}

function canSee(party, member, state) {
  return !!(
    state.id === 'waiting'
    && state.commit
    && member.userId !== currentUserId()
    && isActiveParty(party)
  );
}

function ensureTextOverlay(node, className, text) {
  let el = node.querySelector(`:scope > .${className}`);
  if (!el) {
    el = document.createElement('span');
    el.className = className;
    node.appendChild(el);
  }
  if (el.textContent !== text) el.textContent = text;
  return el;
}

function clearLegacyProfileInteraction(node) {
  node.classList.remove('xty-profile-click');
  node.onclick = null;
  node.onkeydown = null;
}

function syncSeatInteraction(node, actionable, alias) {
  clearLegacyProfileInteraction(node);
  if (actionable) {
    node.classList.add('tb-can-seen');
    if (node.tabIndex !== 0) node.tabIndex = 0;
    if (node.getAttribute('role') !== 'button') node.setAttribute('role', 'button');
    const aria = `กดการ์ดเพื่อ เห็นแล้ว ให้ ${alias}`;
    if (node.getAttribute('aria-label') !== aria) node.setAttribute('aria-label', aria);
    return;
  }
  node.classList.remove('tb-can-seen');
  if (node.hasAttribute('tabindex')) node.removeAttribute('tabindex');
  if (node.hasAttribute('role')) node.removeAttribute('role');
  if (node.hasAttribute('aria-label')) node.removeAttribute('aria-label');
}

function syncStateElement(node, member, state, actionable) {
  const wantedTag = actionable ? 'BUTTON' : 'SPAN';
  let stateEl = node.querySelector(':scope > .tb-daily-state');
  if (!stateEl || stateEl.tagName !== wantedTag) {
    const next = document.createElement(actionable ? 'button' : 'span');
    if (stateEl) stateEl.replaceWith(next);
    else node.appendChild(next);
    stateEl = next;
  }

  const wantedClass = `tb-daily-state tb-daily-state--${state.id}`;
  if (stateEl.className !== wantedClass) stateEl.className = wantedClass;
  const aria = actionable ? `เห็นแล้ว · ${member.alias}` : `${member.alias} · ${state.label}`;
  const title = actionable ? `กดเพื่อบอก ${member.alias} ว่า เห็นแล้ว` : state.label;
  if (stateEl.getAttribute('aria-label') !== aria) stateEl.setAttribute('aria-label', aria);
  if (stateEl.title !== title) stateEl.title = title;
  if (actionable) stateEl.type = 'button';
}

function syncHumanSeat(node, member, index, party) {
  node.classList.add('tb-person-seat');
  node.classList.remove('tb-companion-seat');
  node.dataset.tbUserId = member.userId;

  ensureTextOverlay(node, 'tb-card-name', member.alias || 'ไม่ระบุชื่อ');
  if (member.role === 'lead') ensureTextOverlay(node, 'tb-owner-label', 'เจ้าของสมุด');
  else node.querySelector(':scope > .tb-owner-label')?.remove();

  const state = dailyState(party, member);
  node.dataset.tbState = state.id;
  node.dataset.tbCommitSeq = state.commit?.seq ? String(state.commit.seq) : '';

  const actionable = canSee(party, member, state);
  syncStateElement(node, member, state, actionable);
  syncSeatInteraction(node, actionable, member.alias || 'เพื่อน');

  /* Slot number is no longer part of identity. Keep index only in data for
     debugging/layout continuity, never as visible MEMBER 2 / MEMBER 3 UI. */
  node.dataset.tbSlot = String(index + 1);
}

function companionName(party) {
  const npc = party.npcCardId ? cardById(party.npcCardId) : null;
  if (npc) return npc.personalityNameTh || npc.nameTh || 'เพื่อนร่วมทาง';
  const pet = party.petId ? PET_BY_ID[party.petId] : null;
  return pet?.nameTh || 'เพื่อนร่วมทาง';
}

function syncCompanion(node, party) {
  node.classList.add('tb-companion-seat');
  node.classList.remove('tb-person-seat');
  clearLegacyProfileInteraction(node);
  node.classList.remove('tb-can-seen');
  if (node.hasAttribute('role')) node.removeAttribute('role');
  if (node.hasAttribute('tabindex')) node.removeAttribute('tabindex');
  node.removeAttribute('data-tb-user-id');
  node.removeAttribute('data-tb-state');
  node.removeAttribute('data-tb-commit-seq');
  node.querySelector(':scope > .tb-daily-state')?.remove();
  node.querySelector(':scope > .tb-owner-label')?.remove();
  ensureTextOverlay(node, 'tb-card-name', companionName(party));
  ensureTextOverlay(node, 'tb-companion-label', 'เพื่อนร่วมทาง');
}

function syncOverviewDots(party) {
  const dots = document.querySelectorAll('#dots > i');
  membersInSeatOrder(party).filter(Boolean).forEach((member, index) => {
    const dot = dots[index];
    if (!dot) return;
    const state = dailyState(party, member).id;
    if (dot.dataset.tbState === state) return;
    dot.dataset.tbState = state;
    dot.classList.remove('on', 'tb-unsigned', 'tb-waiting', 'tb-seen');
    dot.classList.add(`tb-${state}`);
  });
}

function disableDeferredProfiles() {
  document.querySelectorAll('#log .who.xty-profile-click').forEach(node => {
    node.classList.remove('xty-profile-click');
    node.onclick = null;
  });
}

function sync() {
  const party = getParty(code);
  const seats = document.getElementById('seats');
  if (!party || !seats) return;
  seats.classList.add('tb-card-grid');

  const members = membersInSeatOrder(party);
  members.forEach((member, index) => {
    const node = seats.children[index];
    if (!member || !node) return;
    syncHumanSeat(node, member, index, party);
  });

  const companion = seats.children[5];
  if (companion) syncCompanion(companion, party);
  syncOverviewDots(party);
  disableDeferredProfiles();
}

function humanSeatFromEvent(event) {
  const target = event.target instanceof Element ? event.target : null;
  return target?.closest('#seats > .tb-person-seat') || null;
}

async function triggerSeen(seat) {
  if (seeing || !seat?.classList.contains('tb-can-seen')) return;
  const seq = Number(seat.dataset.tbCommitSeq || 0);
  if (!seq) return;
  seeing = true;
  seat.querySelector('button.tb-daily-state')?.setAttribute('disabled', '');
  try {
    const result = await confirmCommit(code, seq);
    if (result?.error === 'ALREADY_CONFIRMED') {
      // Another friend got there first. The refreshed response still paints green.
    } else if (result?.error) {
      seat.title = result.error === 'CONFIRM_WINDOW_CLOSED'
        ? 'ช่วงกดเห็นแล้วของวันนี้จบแล้ว'
        : 'ยังบันทึก เห็นแล้ว ไม่สำเร็จ';
    }
  } finally {
    seeing = false;
    sync();
  }
}

function interceptProfileOrSeen(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const seat = humanSeatFromEvent(event);
  if (seat) {
    /* Card click is reserved for Seen. Profile navigation is deliberately
       deferred until that flow is stable. */
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (seat.classList.contains('tb-can-seen')) triggerSeen(seat);
    return;
  }

  const who = target.closest('#log .who');
  if (who) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}

function interceptKeyboard(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const seat = humanSeatFromEvent(event);
  if (!seat) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (seat.classList.contains('tb-can-seen')) triggerSeen(seat);
}
