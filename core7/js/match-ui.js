/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Physical Table Flow

   This file intentionally wraps the proven Match UI instead of rewriting the
   game screen. Engine / server / drag-sort / discard / result behavior stays
   in match-ui-legacy.js. This layer owns only the physical rhythm of cards on
   the centre table:

   RESULT HOLD → FIRST LOCK → SECOND LOCK → REVEAL → RESULT HOLD

   A locked card is visible as a face-down card. The previous result stays on
   the table until somebody commits the next card. Both new cards flip together.
   DOM for the real card faces is only changed when a new round is revealed,
   which also prevents the stage-card flash seen during frequent online polls.
   ═══════════════════════════════════════════════════════════════ */
import { mountMatch as mountLegacyMatch } from './match-ui-legacy.js';
import { reducedMotion } from './ui.js';
import { cardById } from './cards.js';
import { cardSVG, cardBackSVG, genericCardSVG } from './art.js';

let styleInstalled = false;

function installPhysicalTableStyles() {
  if (styleInstalled || typeof document === 'undefined') return;
  styleInstalled = true;
  const style = document.createElement('style');
  style.id = 'c7-physical-table-flow';
  style.textContent = `
    .physical-table-flow .stage-slot{
      opacity:0;
      will-change:transform,opacity;
      transition:opacity .18s ease;
      transform-origin:center center;
    }
    .physical-table-flow .stage-slot.pf-visible{opacity:1}

    /* Legacy reveal still writes the public card faces and result copy, but
       only pf-faceup is allowed to control the physical flip. This prevents
       polling / legacy class churn from flashing the cards. */
    .physical-table-flow .stage-slot.revealed .flip,
    .physical-table-flow .stage-slot.pf-facedown .flip{
      transform:rotateY(0deg)!important;
    }
    .physical-table-flow .stage-slot.pf-faceup .flip{
      transform:rotateY(180deg)!important;
    }
    .physical-table-flow .stage-slot .flip{
      transition:transform .42s cubic-bezier(.2,.72,.2,1)!important;
      will-change:transform;
    }
    .physical-table-flow .stage-slot .face{
      -webkit-backface-visibility:hidden;
      backface-visibility:hidden;
      transform:translateZ(0);
    }

    /* Result never disappears on a timer. It leaves only when the next card
       is committed, then comes back after the simultaneous reveal. */
    .physical-table-flow .round-result{
      opacity:0;
      transform:translateY(4px);
      transition:opacity .2s ease,transform .2s ease;
    }
    .physical-table-flow .round-result.pf-result-visible{
      opacity:1;
      transform:translateY(0);
    }
    .physical-table-flow .round-discard{
      transition:opacity .18s ease;
    }
    .physical-table-flow.pf-between-rounds .round-discard{opacity:0}

    /* Moving card used only during the commitment animation. It is a detached
       visual copy, so the real hand DOM can keep its stable no-flicker cache. */
    .pf-card-ghost{
      position:fixed;
      z-index:240;
      pointer-events:none;
      perspective:900px;
      transform-origin:center center;
      filter:drop-shadow(0 14px 18px rgb(0 0 0 / .34));
      contain:layout paint style;
    }
    .pf-card-ghost-inner{
      position:absolute;
      inset:0;
      transform-style:preserve-3d;
      will-change:transform;
    }
    .pf-card-ghost-face{
      position:absolute;
      inset:0;
      overflow:hidden;
      border-radius:9px;
      -webkit-backface-visibility:hidden;
      backface-visibility:hidden;
    }
    .pf-card-ghost-face.back{transform:rotateY(180deg)}
    .pf-card-ghost-face svg{display:block;width:100%;height:100%}

    @media (prefers-reduced-motion: reduce){
      .physical-table-flow .stage-slot,
      .physical-table-flow .stage-slot .flip,
      .physical-table-flow .round-result{transition:none!important}
      .pf-card-ghost{display:none!important}
    }
  `;
  document.head.append(style);
}

function faceSVG(cardId) {
  const card = cardById(cardId);
  if (!card) return '';
  return card.generic
    ? genericCardSVG(card.color, { width: 150 })
    : cardSVG(cardId, { width: 150, showNumber: false });
}

function copyRect(rect) {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function physicalController(root, client) {
  let attached = false;
  let lastView = null;
  let initialized = false;
  let shownRounds = 0;
  let firstLocker = null;
  let holdingResult = false;
  let pendingSelectedIid = null;
  let pendingLaunch = null;
  let lastViewSig = '';
  let queue = Promise.resolve();
  const visualLocked = { you: false, opp: false };
  const entryPromise = { you: null, opp: null };

  const sideSlot = side => root.querySelector(side === 'you' ? '#slotYou' : '#slotOpp');
  const opposite = side => side === 'you' ? 'opp' : 'you';
  const resultNode = () => root.querySelector('#roundResult');

  function setFace(slot, cardId) {
    if (!slot || !cardId || slot.dataset.pfFaceId === cardId) return;
    const front = slot.querySelector('.front');
    if (!front) return;
    front.innerHTML = faceSVG(cardId);
    slot.dataset.pfFaceId = cardId;
  }

  function slotBack(side) {
    const slot = sideSlot(side);
    if (!slot) return;
    slot.classList.remove('pf-faceup');
    slot.classList.add('pf-visible', 'pf-facedown');
  }

  function slotFaceUp(side, cardId) {
    const slot = sideSlot(side);
    if (!slot) return;
    setFace(slot, cardId);
    slot.classList.remove('pf-facedown');
    slot.classList.add('pf-visible', 'pf-faceup');
  }

  function hideSlot(side) {
    const slot = sideSlot(side);
    if (!slot) return;
    slot.classList.remove('pf-visible', 'pf-facedown', 'pf-faceup');
  }

  function hideResult() {
    holdingResult = false;
    resultNode()?.classList.remove('pf-result-visible');
    root.classList.add('pf-between-rounds');
  }

  function showResult() {
    holdingResult = true;
    resultNode()?.classList.add('pf-result-visible');
    root.classList.remove('pf-between-rounds');
  }

  function cardForIid(iid) {
    return lastView?.you?.hand?.find(card => card.iid === iid) || null;
  }

  function selectedHandRect(iid) {
    if (!iid) return null;
    let node = null;
    try { node = root.querySelector(`.hand-card[data-iid="${CSS.escape(iid)}"]`); }
    catch { node = root.querySelector(`.hand-card[data-iid="${iid}"]`); }
    return node ? copyRect(node.getBoundingClientRect()) : null;
  }

  function rememberLocalSelection(iid) {
    pendingSelectedIid = iid || null;
    const card = cardForIid(iid);
    pendingLaunch = {
      iid,
      cardId: card?.cardId || null,
      rect: selectedHandRect(iid),
    };
  }

  function sourceRect(side, target) {
    if (side === 'you') {
      const remembered = pendingLaunch?.rect;
      if (remembered?.width > 2 && remembered?.height > 2) return remembered;
      const live = selectedHandRect(pendingSelectedIid || lastView?.you?.selected);
      if (live) return live;
      const hand = root.querySelector('#hand')?.getBoundingClientRect();
      if (hand) return {
        left: hand.left + hand.width / 2 - 29,
        top: hand.top + Math.max(0, hand.height / 2 - 40),
        width: 58,
        height: 81,
      };
    }

    /* Opponent card has no public identity before reveal. Bring a card back
       down from the opponent's side of the table, like a real hand entering
       from above. */
    const av = root.querySelector('#oppAv')?.getBoundingClientRect();
    if (av) return {
      left: av.left + av.width / 2 - 29,
      top: Math.max(6, av.bottom + 2),
      width: 58,
      height: 81,
    };
    return {
      left: target.left + target.width / 2 - 29,
      top: Math.max(6, target.top - 150),
      width: 58,
      height: 81,
    };
  }

  async function animateOut(side) {
    const slot = sideSlot(side);
    if (!slot || !slot.classList.contains('pf-visible')) return;
    if (reducedMotion() || !slot.animate) { hideSlot(side); return; }
    const direction = side === 'you' ? -1 : 1;
    const animation = slot.animate([
      { transform:'translate3d(0,0,0) rotate(0deg)', opacity:1 },
      { transform:`translate3d(${direction * 150}%, 8px, 0) rotate(${direction * 9}deg)`, opacity:0 },
    ], {
      duration:260,
      easing:'cubic-bezier(.3,.75,.25,1)',
      fill:'forwards',
    });
    try { await animation.finished; } catch { /* navigation / cancel */ }
    hideSlot(side);
    animation.cancel();
  }

  function makeGhost(side, cardId, from, to) {
    const ghost = document.createElement('div');
    ghost.className = 'pf-card-ghost';
    ghost.style.left = `${from.left}px`;
    ghost.style.top = `${from.top}px`;
    ghost.style.width = `${Math.max(1, from.width)}px`;
    ghost.style.height = `${Math.max(1, from.height)}px`;

    const inner = document.createElement('div');
    inner.className = 'pf-card-ghost-inner';
    const front = document.createElement('div');
    front.className = 'pf-card-ghost-face front';
    const back = document.createElement('div');
    back.className = 'pf-card-ghost-face back';
    front.innerHTML = side === 'you' && cardId ? faceSVG(cardId) : cardBackSVG({ width: 150 });
    back.innerHTML = cardBackSVG({ width: 150 });
    inner.append(front, back);
    ghost.append(inner);
    document.body.append(ghost);

    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const sx = to.width / Math.max(1, from.width);
    const sy = to.height / Math.max(1, from.height);
    return { ghost, inner, dx, dy, sx, sy };
  }

  async function animateIncoming(side, knownCardId = null) {
    if (!attached) return;
    const slot = sideSlot(side);
    if (!slot) return;
    if (visualLocked[side] && slot.classList.contains('pf-facedown')) return;

    visualLocked[side] = true;
    const cardId = knownCardId || (side === 'you'
      ? (pendingLaunch?.cardId || cardForIid(pendingSelectedIid || lastView?.you?.selected)?.cardId)
      : null);
    const target = copyRect(slot.getBoundingClientRect());
    if (!target?.width || !target?.height) { slotBack(side); return; }

    if (reducedMotion()) { slotBack(side); return; }
    const from = sourceRect(side, target);
    const { ghost, inner, dx, dy, sx, sy } = makeGhost(side, cardId, from, target);

    /* Opponent arrives already face-down. Our own card visibly turns over while
       travelling from the hand to the left play area. */
    if (side === 'opp') inner.style.transform = 'rotateY(180deg)';
    const move = ghost.animate([
      { transform:'translate3d(0,0,0) scale(1,1)', opacity:.92 },
      { transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`, opacity:1 },
    ], {
      duration:side === 'you' ? 340 : 320,
      easing:'cubic-bezier(.18,.76,.22,1)',
      fill:'forwards',
    });
    let turn = null;
    if (side === 'you') {
      turn = inner.animate([
        { transform:'rotateY(0deg)', offset:0 },
        { transform:'rotateY(18deg)', offset:.18 },
        { transform:'rotateY(180deg)', offset:1 },
      ], {
        duration:300,
        easing:'cubic-bezier(.22,.7,.18,1)',
        fill:'forwards',
      });
    }

    try { await move.finished; } catch { /* navigation / cancel */ }
    slotBack(side);
    ghost.remove();
    try { turn?.cancel(); } catch { /* ok */ }
    pendingLaunch = side === 'you' ? null : pendingLaunch;
  }

  function startLockVisual(side, knownCardId = null) {
    if (!attached || visualLocked[side]) return entryPromise[side] || Promise.resolve();

    /* The first committed card is the signal that the previous trick is over.
       The card on the opposite side physically leaves the table while the new
       face-down card enters. The old card on the committing side is naturally
       covered by the incoming card. */
    const isFirst = !firstLocker;
    if (isFirst) {
      firstLocker = side;
      if (holdingResult || shownRounds > 0) hideResult();
      void animateOut(opposite(side));
    }

    entryPromise[side] = animateIncoming(side, knownCardId)
      .catch(() => { slotBack(side); })
      .finally(() => { entryPromise[side] = null; });
    return entryPromise[side];
  }

  async function revealRound(round) {
    if (!round) return;
    hideResult();

    /* A server can resolve immediately when the second player locks. If that
       happens before the polling view ever contains `locked:true`, manufacture
       the missing face-down arrival first. No hidden information is exposed:
       the face remains down until both slots are ready. */
    const pYou = visualLocked.you
      ? (entryPromise.you || Promise.resolve())
      : startLockVisual('you', round.you?.cardId);
    const pOpp = visualLocked.opp
      ? (entryPromise.opp || Promise.resolve())
      : startLockVisual('opp', round.opp?.cardId);
    await Promise.allSettled([pYou, pOpp]);

    const youSlot = sideSlot('you');
    const oppSlot = sideSlot('opp');
    setFace(youSlot, round.you?.cardId);
    setFace(oppSlot, round.opp?.cardId);
    slotBack('you');
    slotBack('opp');

    if (!reducedMotion()) await new Promise(resolve => setTimeout(resolve, 90));
    slotFaceUp('you', round.you?.cardId);
    slotFaceUp('opp', round.opp?.cardId);

    /* Legacy result copy is written 60ms after the round enters the view. Wait
       for the physical flip as well, then reveal that copy and keep it there. */
    await new Promise(resolve => setTimeout(resolve, reducedMotion() ? 0 : 430));
    showResult();

    visualLocked.you = false;
    visualLocked.opp = false;
    firstLocker = null;
    pendingSelectedIid = null;
    pendingLaunch = null;
  }

  function showExistingRound(round) {
    if (!round) {
      hideSlot('you');
      hideSlot('opp');
      hideResult();
      root.classList.remove('pf-between-rounds');
      return;
    }
    slotFaceUp('you', round.you?.cardId);
    slotFaceUp('opp', round.opp?.cardId);
    window.setTimeout(showResult, reducedMotion() ? 0 : 90);
  }

  async function syncView(v) {
    if (!attached || !v) return;
    lastView = v;

    if (!initialized) {
      initialized = true;
      shownRounds = v.rounds?.length || 0;
      showExistingRound(v.rounds?.[shownRounds - 1]);
      /* Reconnect can land after one side already locked. Rebuild the same
         public state without requiring a fresh event. */
      if (v.phase === 'ROUND_SELECT') {
        if (v.you?.locked) startLockVisual('you');
        if (v.opponent?.locked) startLockVisual('opp');
      }
      return;
    }

    const roundCount = v.rounds?.length || 0;
    if (roundCount > shownRounds) {
      shownRounds = roundCount;
      await revealRound(v.rounds[roundCount - 1]);
      return;
    }

    /* Online polling can miss the tiny moment between lock and reveal. When it
       does not, use the public locked flags as a second source of truth. */
    if (v.phase === 'ROUND_SELECT') {
      if (v.you?.locked && !visualLocked.you) startLockVisual('you');
      if (v.opponent?.locked && !visualLocked.opp) startLockVisual('opp');
    }
  }

  function enqueueView(v) {
    lastView = v;
    if (!attached || !v) return;
    const sig = [
      v.matchId,
      v.rounds?.length || 0,
      v.roundNumber,
      v.phase,
      !!v.you?.locked,
      !!v.opponent?.locked,
      v.you?.selected || '',
      !!v.discardRequired,
      !!v.waitingOpponentDiscard,
      !!v.result,
    ].join('|');
    if (sig === lastViewSig) return;
    lastViewSig = sig;
    queue = queue.then(() => syncView(v)).catch(() => {});
  }

  function onEvent(ev) {
    if (!attached || !ev || !lastView) return;
    if (ev.event_type === 'round.selection_locked') {
      const side = ev.payload?.seat === lastView.seat ? 'you' : 'opp';
      startLockVisual(side);
    }
  }

  function beforeSend(action) {
    if (!action) return;
    if (action.type === 'select_card') rememberLocalSelection(action.cardInstanceId);
    if (action.type === 'lock_choice') {
      const iid = pendingSelectedIid || lastView?.you?.selected;
      if (iid && (!pendingLaunch || pendingLaunch.iid !== iid)) rememberLocalSelection(iid);
    }
  }

  function attach() {
    attached = true;
    root.classList.add('physical-table-flow');
    /* Existing slots contain their card-back SVG already. Hide them until a
       player actually locks something; an empty table should look empty. */
    hideSlot('you');
    hideSlot('opp');
    resultNode()?.classList.remove('pf-result-visible');
    if (lastView) enqueueView(lastView);
  }

  return { enqueueView, onEvent, beforeSend, attach };
}

export function mountMatch(root, client, options = {}) {
  installPhysicalTableStyles();
  const physical = physicalController(root, client);

  /* Observe the same authoritative client the legacy UI uses. Nothing here
     calculates game outcomes. We only react to public view / event state. */
  const originalGetView = client.getView.bind(client);
  client.getView = async (...args) => {
    const view = await originalGetView(...args);
    physical.enqueueView(view);
    return view;
  };

  const originalSubscribe = client.subscribe.bind(client);
  client.subscribe = fn => originalSubscribe(ev => {
    physical.onEvent(ev);
    fn(ev);
  });

  const originalSend = client.send.bind(client);
  client.send = async action => {
    physical.beforeSend(action);
    return originalSend(action);
  };

  const api = mountLegacyMatch(root, client, options);
  physical.attach();
  return api;
}
