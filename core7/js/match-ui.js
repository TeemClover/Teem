/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — Match Screen Controller
   ใช้ร่วมกันทั้งโหมด Bot / Room — คุยกับ "client" interface เท่านั้น

   client = {
     playerId,
     send(action)        → Promise<{ok, error?}>   // select_card / lock_choice / discard_card / forfeit
     getView()           → Promise<view>            // viewFor(playerId) จากฝั่ง Authority
     subscribe(cb(ev))   → unsubscribe
     connectionState?()  → 'on' | 'off'
   }
   UI ไม่เคยคำนวณผลเกมเอง — แสดงตาม view ที่ Authority ส่งมาเท่านั้น
   ═══════════════════════════════════════════════════════════════ */
import { $, el, toast, haptic, reducedMotion } from './ui.js';
import { COLOR_META, cardById } from './cards.js';
import { COLORS } from './rules.js';
import { t } from './i18n.js';
import { cardSVG, cardBackSVG, genericCardSVG, cardArtHref } from './art.js';
import { isLocalMember } from './store.js';
import { playSfx } from './audio.js';

/* เกมนี้เล่นซ้ำเยอะ ข้อความเลยต้องสั้นที่สุด — ใช้อีโมจิสีแทนชื่อสีเสมอ
   คนเล่นจำสีได้เองตั้งแต่รอบสองอยู่แล้ว

   อีโมจิซ้ายคือใบของเราเสมอ ตรงกับการ์ดฝั่งซ้ายบนโต๊ะและในประวัติ
   แพ้ก็ยังอยู่ซ้าย แค่กลับเครื่องหมายเป็น < แทน — ของเดิมสลับฝั่ง
   ให้ผู้ชนะอยู่ซ้ายตลอด อ่านแล้วงงว่าอีโมจิไหนคือใบเรา */
const emo = color => COLOR_META[color].emoji;
/* ชื่อสีสำหรับ screen reader — บนหน้าจอใช้อีโมจิอยู่แล้ว ตรงนี้จึงมีไว้
   ให้คนที่ฟังอย่างเดียวรู้ว่าใบไหนสีอะไร */
const colorName = color => t(COLOR_META[color].nameTh, COLOR_META[color].nameEn);
const RESULT_TEXT = {
  WIN: (you, opp) => `${emo(you)} &gt; ${emo(opp)}`,
  LOSE: (you, opp) => `${emo(you)} &lt; ${emo(opp)}`,
  TIE_SAME: (you, opp) => `${emo(you)} = ${emo(opp)}`,
  TIE_SILVER: (you, opp) => `${emo(you)} = ${emo(opp)} · BLOCK`,
};

export function mountMatch(root, client, { onFinished, oppLabel = '' } = {}) {
  let view = null;
  let finished = false;
  let finishTimer = null;
  let revealShown = 0;      // จำนวนรอบที่เล่น animation แล้ว
  const member = isLocalMember();

  root.classList.add('match-shell');
  /* ฝั่งผู้เล่นอยู่ซ้ายเสมอ — คู่แข่งอยู่ขวาเสมอ (ทั้งแถบบนและโต๊ะกลาง) */
  root.innerHTML = `
    <div class="match-top">
      <div class="pl">
        <span class="avatar" id="youAv">?</span>
        <div>
          <div class="nm" id="youName">…</div>
          <div class="meta"><span id="youCards"></span><span class="pips" id="youPips"></span></div>
        </div>
      </div>
      <div class="pl" style="flex-direction:row-reverse;text-align:right">
        <span class="avatar" id="oppAv">?</span>
        <div>
          <div class="nm" id="oppName">…</div>
          <div class="meta" style="justify-content:flex-end"><span class="pips" id="oppPips"></span><span id="oppCards"></span></div>
        </div>
        <span class="conn" id="connDot"></span>
      </div>
    </div>
    <div class="public-counts" id="publicCounts">
      <div class="public-count-side you" id="youPublicCounts"></div>
      <div class="public-count-side opp" id="oppPublicCounts"></div>
    </div>
    <div class="match-board">
      <div class="match-stage">
        <button class="rules-toggle" id="rulesBtn" aria-expanded="false">📖 Rules</button>
        <button class="drawer-toggle" id="histBtn" aria-expanded="false">🗑️ Discard</button>
        <div class="match-rules-popover" id="rulesPopover" hidden role="dialog">
          <div class="match-rules-head"><b class="disp">CORE7 Rules</b><button type="button" id="rulesClose">✕</button></div>
          <img id="rulesImg" src="/core7/assets/core7-rule.webp" alt="">
          <p>🔴 &gt; 🟢 &gt; 🔵 &gt; 🔴 · ⚙️ = BLOCK<br><span id="rulesLine2"></span></p>
          <a href="/core7/rules/" target="_blank" rel="noopener" id="rulesFull"></a>
        </div>
        <div class="rule-line" id="ruleLine"><span>🔴 &gt; 🟢 &gt; 🔵 &gt; 🔴</span><span>⚙️ = BLOCK</span></div>
        <div class="stage-cards">
          <div class="stage-slot" id="slotYou">
            <div class="flip"><div class="face back"></div><div class="face front"></div></div>
          </div>
          <div class="stage-vs">VS<br><span id="roundNo" style="font-size:12px;color:rgb(255 255 255/.6)"></span></div>
          <div class="stage-slot" id="slotOpp" aria-live="polite">
            <div class="flip"><div class="face back"></div><div class="face front"></div></div>
          </div>
        </div>
        <div class="round-result" id="roundResult" aria-live="assertive"></div>
        <div class="round-discard" id="roundDiscard" aria-live="polite"></div>
      </div>
      <aside class="history-rail" id="historyAside">
        <h2 class="disp">🗑️ Discard</h2>
        <div id="historyRail"></div>
      </aside>
    </div>
    <div class="match-hand">
      <p class="match-msg" id="msg"></p>
      <div class="hand-row" id="hand" role="group"></div>
      <div class="match-actions">
        <button class="btn btn-gold" id="lockBtn" disabled>🔒 Lock</button>
      </div>
    </div>`;

  const slotOpp = $('#slotOpp', root), slotYou = $('#slotYou', root);
  const lockBtn = $('#lockBtn', root);

  /* โครงหน้าจอถูกสร้างครั้งเดียวตอน mount ถ้าฝัง t() ไว้ใน template ตรง ๆ
     คนที่สลับภาษากลางแมตช์จะเห็นข้อความเก่าค้าง (โดยเฉพาะ aria-label กับ
     title ที่ MutationObserver ของ i18n ไม่แตะให้) เลยแยกมาเซ็ตทีหลัง
     แล้วเรียกซ้ำทุกครั้งที่ภาษาเปลี่ยน */
  function localizeShell() {
    const attr = (sel, name, value) => { const n = $(sel, root); if (n) n.setAttribute(name, value); };
    const text = (sel, value) => { const n = $(sel, root); if (n) n.textContent = value; };
    attr('#connDot', 'title', t('สถานะการเชื่อมต่อ', 'Connection status'));
    attr('#publicCounts', 'aria-label', t('จำนวนไพ่ที่เปิดเผยแล้ว', 'Cards revealed so far'));
    attr('#rulesBtn', 'aria-label', t('เปิด Rules', 'Open rules'));
    attr('#histBtn', 'aria-label', t('เปิด Discard', 'Open discard pile'));
    attr('#rulesPopover', 'aria-label', t('กติกา CORE7', 'CORE7 rules'));
    attr('#rulesClose', 'aria-label', t('ปิด Rules', 'Close rules'));
    attr('#rulesImg', 'alt', t(
      'แดงชนะเขียว เขียวชนะฟ้า ฟ้าชนะแดง เงินเป็น Block ผู้แพ้ทิ้งเพิ่มหนึ่งใบ ชนะสามรอบ และ Final Silver',
      'Red beats green, green beats blue, blue beats red, silver blocks. The loser discards one more. First to three round wins, plus the Final Silver rule.'));
    text('#rulesLine2', t('ผู้แพ้ทิ้งเพิ่ม 1 ใบ · ชนะครบ 3 รอบ', 'Loser discards 1 more · first to 3 rounds'));
    text('#rulesFull', t('อ่านกติกาเต็ม TH / EN ↗', 'Read the full rules TH / EN ↗'));
    attr('#ruleLine', 'aria-label', t(
      'แดงชนะเขียว เขียวชนะฟ้า ฟ้าชนะแดง เงินเป็นบล็อก',
      'Red beats green, green beats blue, blue beats red, silver blocks'));
    attr('#historyAside', 'aria-label', t('Discard ทุกใบที่ออกแล้ว', 'Every card already played or discarded'));
    attr('#hand', 'aria-label', t('มือของคุณ', 'Your hand'));
  }
  localizeShell();
  /* หน้านี้อยู่จนจบแมตช์แล้วเปลี่ยนหน้า ไม่ต้องถอด listener */
  window.addEventListener('core7:lang', () => {
    localizeShell();
    if (!view) return;
    handSig = null;   // ชื่อการ์ดกับ aria-label ในมืออยู่ในปุ่ม ต้องวาดใหม่ทั้งแถว
    render();
  });

  /* หลังการ์ดในช่อง reveal */
  $('.back', slotOpp).innerHTML = cardBackSVG({ width: 150 });
  $('.back', slotYou).innerHTML = cardBackSVG({ width: 150 });

  function pips(n, host) {
    host.innerHTML = '';
    for (let i = 0; i < 3; i++) host.append(el('i', { class: i < n ? 'on' : '' }));
  }

  function cardFace(cardId) {
    const card = cardById(cardId);
    if (!card) return '';
    return (member && !card.generic)
      ? cardSVG(cardId, { width: 150, showNumber: false })
      : genericCardSVG(card.color, { width: 150 });
  }

  function handTile(c, mode) {
    const meta = COLOR_META[c.color];
    const card = cardById(c.cardId);
    const label = card.generic ? meta.nameEn.toUpperCase() : card.en;
    const artHref = cardArtHref(c.cardId);
    const btn = el('button', {
      class: `hand-card ${c.color.toLowerCase()}`,
      'data-iid': c.iid,
      'aria-label': `${label} ${colorName(c.color)}${mode === 'discard' ? t(' — เลือกเพื่อทิ้ง', ' — pick to discard') : ''}`,
      'aria-pressed': String(view.you.selected === c.iid),
      style: `--hand-color:${meta.hex};--hand-art:url("${artHref}")`,
      html: `<span class="hand-card-name">${label}</span>`,
    });
    if (view.you.selected === c.iid && mode === 'select') btn.classList.add('sel');
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let suppressClick = false;
    let committing = false;
    /* ล็อกทิศทางครั้งเดียวต่อการลาก — ขึ้น = โยนลง, ข้าง = สลับตำแหน่งในมือ
       ถ้าไม่ล็อก นิ้วที่เอียงนิดเดียวจะสลับไปมาระหว่างสองท่า */
    let axis = null;
    let escapeDy = -48;   // ลากขึ้นเท่านี้ = พ้นขอบแถวมือ ถือว่าเลือกแล้ว
    let maxUp = -180;     // แต่ลากต่อได้ถึงกลางจอ
    let sortFrom = -1;
    let sortTo = -1;
    let sortStep = 0;

    const siblings = () => [...(btn.parentElement?.children || [])];

    const clearSortPreview = () => {
      for (const node of siblings()) node.style.removeProperty('--slide');
    };

    const resetDrag = () => {
      pointerId = null;
      axis = null;
      btn.classList.remove('dragging', 'sorting', 'will-play');
      btn.style.removeProperty('--fling-x');
      btn.style.removeProperty('--fling-y');
      clearSortPreview();
    };

    /* เลือก + Lock + ลงในจังหวะเดียว ใช้ร่วมกันระหว่างโยนกับ double click */
    async function commitPlay(viaFling) {
      if (committing) return;
      suppressClick = true;
      committing = true;
      btn.classList.remove('dragging');
      btn.classList.add('fling-out');
      haptic([8, 25, 14]);
      playSfx(viaFling ? 'fling' : 'select');
      let res;
      if (mode === 'select') {
        res = await client.send({ type: 'select_card', cardInstanceId: c.iid });
        if (res.ok) res = await client.send({ type: 'lock_choice' });
      } else {
        res = await client.send({ type: 'discard_card', cardInstanceId: c.iid });
      }
      if (!res?.ok) {
        btn.classList.remove('fling-out');
        toast(mode === 'discard' ? t('ทิ้งใบนี้ไม่ได้', 'Cannot discard this one') : t('ลงการ์ดไม่ได้', 'Cannot play that card'));
        playSfx('error');
      }
      resetDrag();
      committing = false;
      setTimeout(() => { suppressClick = false; }, 0);
      refresh();
    }

    if (mode === 'select' || mode === 'discard') {
      btn.addEventListener('pointerdown', event => {
        if (committing || event.button > 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        axis = null;
        const rect = btn.getBoundingClientRect();
        const row = btn.parentElement?.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        /* "พ้นขอบ" วัดจากกึ่งกลางใบขึ้นไปพ้นขอบบนของแถวมือ ไม่ใช่ขอบบนของใบ
           ไม่งั้นขยับ 2px ก็ติดแล้ว — คุมช่วงไว้ไม่ให้ไวหรือหนืดเกินไป */
        escapeDy = Math.max(-96, Math.min(-32, (row ? row.top : rect.top) - midY));
        /* ลากได้ไกลถึงกลางจอ ให้รู้สึกว่าโยนได้จริง ไม่ใช่ติดเพดาน 120px */
        maxUp = Math.min(escapeDy, window.innerHeight / 2 - midY);
        const list = siblings();
        sortFrom = list.indexOf(btn);
        sortTo = sortFrom;
        sortStep = list.length > 1
          ? list[1].getBoundingClientRect().left - list[0].getBoundingClientRect().left
          : 0;
        btn.setPointerCapture?.(pointerId);
      });

      btn.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (!axis) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          /* ขึ้นชนะเสมอเมื่อก้ำกึ่ง — โยนลงคือท่าหลัก การเรียงมือเป็นของแถม */
          axis = (Math.abs(dx) > Math.abs(dy) * 1.3 && dy > -24) ? 'sort' : 'fling';
          btn.classList.add(axis === 'sort' ? 'sorting' : 'dragging');
        }
        event.preventDefault();

        if (axis === 'fling') {
          btn.style.setProperty('--fling-x', `${dx * .5}px`);
          btn.style.setProperty('--fling-y', `${Math.max(maxUp, Math.min(0, dy))}px`);
          btn.classList.toggle('will-play', dy <= escapeDy);
          return;
        }

        /* สลับตำแหน่ง — ขยับเฉพาะภาพ ยังไม่แตะ DOM จนกว่าจะปล่อยนิ้ว
           ถ้าย้าย DOM ระหว่างลาก pointer capture จะหลุดในบางเบราว์เซอร์ */
        btn.style.setProperty('--fling-x', `${dx}px`);
        btn.style.setProperty('--fling-y', '0px');
        const list = siblings();
        let target = sortFrom;
        if (sortStep) target = Math.round(sortFrom + dx / sortStep);
        target = Math.max(0, Math.min(list.length - 1, target));
        if (target === sortTo) return;
        sortTo = target;
        haptic(6);
        for (const [i, node] of list.entries()) {
          if (node === btn) continue;
          let shift = 0;
          if (sortTo > sortFrom && i > sortFrom && i <= sortTo) shift = -sortStep;
          else if (sortTo < sortFrom && i >= sortTo && i < sortFrom) shift = sortStep;
          node.style.setProperty('--slide', `${shift}px`);
        }
      });

      btn.addEventListener('pointerup', async event => {
        if (event.pointerId !== pointerId || committing) return;
        if (axis === 'sort') {
          const moved = sortTo !== sortFrom;
          if (moved) {
            suppressClick = true;
            setTimeout(() => { suppressClick = false; }, 0);
            playSfx('cardSwap');
            moveHandCard(c.iid, sortTo);
          }
          resetDrag();
          if (moved) paintHandNow();
          return;
        }
        if (event.clientY - startY > escapeDy) { resetDrag(); return; }
        await commitPlay(true);
      });
      btn.addEventListener('pointercancel', resetDrag);
      btn.addEventListener('lostpointercapture', () => { if (axis) resetDrag(); });
    }

    btn.addEventListener('click', async event => {
      if (suppressClick) { event.preventDefault(); return; }
      if (mode === 'select') {
        /* คลิก/แตะสองทีเร็ว ๆ = เลือก + Lock + ลง ทางลัดแทนการโยน
           คลิกเดียวยังเป็นแค่เลือกเหมือนเดิม ไม่เปลี่ยนนิสัยเดิมของใคร */
        const now = Date.now();
        const double = lastTapIid === c.iid && now - lastTapAt < 380;
        lastTapIid = c.iid;
        lastTapAt = now;
        if (double) { lastTapIid = null; await commitPlay(false); return; }
      }
      haptic(8);
      playSfx('select');
      if (mode === 'select') {
        const res = await client.send({ type: 'select_card', cardInstanceId: c.iid });
        if (res.ok) refresh();
        else if (res.error === 'ALREADY_LOCKED') toast(t('Lock ไปแล้ว — รอเปิดการ์ด', 'Already locked — wait for the reveal'));
      } else if (mode === 'discard') {
        const res = await client.send({ type: 'discard_card', cardInstanceId: c.iid });
        if (!res.ok) toast(t('ทิ้งใบนี้ไม่ได้', 'Cannot discard this one'));
        else playSfx('discard');
        refresh();
      }
    });
    return btn;
  }

  function publicColorCounts(side) {
    const counts = { RED: 0, GREEN: 0, BLUE: 0, SILVER: 0 };
    for (const round of view.rounds) {
      const played = round[side];
      if (played?.color) counts[played.color] += 1;
      for (const discarded of round.discards) {
        const belongs = side === 'you' ? discarded.yours : !discarded.yours;
        if (belongs) counts[discarded.color] += 1;
      }
    }
    return counts;
  }

  function renderPublicCounts(host, label, counts) {
    host.innerHTML = '';
    host.append(el('b', { class: 'public-count-label' }, label));
    for (const color of COLORS) {
      host.append(el('span', { title: t(`${COLOR_META[color].nameTh}ออกแล้ว ${counts[color]} ใบ`, `${COLOR_META[color].nameEn}: ${counts[color]} shown`) },
        `${COLOR_META[color].emoji}${counts[color]}`));
    }
  }

  async function refresh() {
    view = await client.getView();
    if (!view) return;
    loadHandOrder();
    render();
  }

  function render() {
    const v = view;
    $('#oppName', root).textContent = v.opponent.name + (oppLabel ? ` ${oppLabel}` : '');
    $('#oppAv', root).textContent = (v.opponent.name || '?')[0].toUpperCase();
    $('#youName', root).textContent = `${v.you.name} ${t('(คุณ)', '(you)')}`;
    $('#youAv', root).textContent = (v.you.name || '?')[0].toUpperCase();
    const youCount = v.you.hand.filter(c => c.status === 'IN_HAND').length;
    $('#oppCards', root).textContent = `🂠 ${v.opponent.handCount}`;
    $('#youCards', root).textContent = `🂠 ${youCount}`;
    renderPublicCounts($('#youPublicCounts', root), 'OUT', publicColorCounts('you'));
    renderPublicCounts($('#oppPublicCounts', root), 'OUT', publicColorCounts('opp'));
    pips(v.opponent.roundWins, $('#oppPips', root));
    pips(v.you.roundWins, $('#youPips', root));
    $('#roundNo', root).textContent = `ROUND ${v.roundNumber}`;
    if (client.connectionState) {
      $('#connDot', root).className = 'conn' + (client.connectionState() === 'on' ? '' : ' off');
    }

    /* Reveal animation ของรอบล่าสุด */
    const lastRound = v.rounds[v.rounds.length - 1];
    const inReveal = v.rounds.length > revealShown && lastRound;
    if (inReveal) {
      revealShown = v.rounds.length;
      showReveal(lastRound, v);
    }
    renderLatestDiscard(lastRound);
    renderHistory($('#historyRail', root));

    /* มือ + ข้อความ */
    const msg = $('#msg', root);
    const inHand = v.you.hand.filter(c => c.status === 'IN_HAND');

    if (v.result) {
      paintHand([], 'none');
      msg.textContent = t('สรุปผล…', 'Wrapping up…');
      lockBtn.disabled = true;
      lockBtn.textContent = t('สรุปผล…', 'Wrapping up…');
      scheduleFinish(inReveal);
      return;
    }

    if (v.discardRequired) {
      msg.innerHTML = `<b style="color:#fca5a5">${t('เลือกทิ้งเพิ่ม 1 ใบ', 'Discard one more')}</b>`;
      paintHand(inHand, 'discard');
      lockBtn.disabled = true;
      lockBtn.textContent = t('เลือกใบที่ทิ้ง', 'Pick one');
      return;
    }
    if (v.waitingOpponentDiscard) {
      msg.textContent = t('รอคู่แข่งทิ้ง…', 'Waiting for their discard…');
      paintHand(inHand, 'none', { disabled: true });
      lockBtn.disabled = true;
      lockBtn.textContent = '🔒 Lock';
      return;
    }
    if (v.phase === 'ROUND_SELECT') {
      if (v.you.locked) {
        msg.textContent = v.opponent.locked ? t('เปิดการ์ด…', 'Revealing…') : t('รอคู่แข่ง…', 'Waiting…');
        paintHand(inHand, 'none', { disabled: true, markSelected: true });
        lockBtn.disabled = true;
        lockBtn.textContent = t('⏳ รอคู่แข่ง', '⏳ Waiting');
      } else {
        msg.textContent = t('แตะเลือก แล้ว Lock · ปัดขึ้นหรือแตะสองที = ลงเลย · ลากข้าง = จัดมือ',
          'Tap to pick, then Lock · flick up or double-tap to play · drag sideways to reorder');
        paintHand(inHand, 'select');
        lockBtn.disabled = !v.you.selected;
        lockBtn.textContent = '🔒 Lock';
      }
    }
  }

  /* ── ลำดับไพ่ในมือที่ผู้เล่นจัดเอง ──
     Authority เป็นเจ้าของว่ามีใบอะไรบ้าง แต่ "เรียงยังไง" เป็นเรื่องของ
     สายตาคนถือ ไม่ใช่ข้อมูลเกม จึงเก็บฝั่ง client อย่างเดียว ไม่ส่งขึ้น
     server และไม่กระทบกติกาใด ๆ

     เก็บใน sessionStorage แยกตาม matchId — refresh กลางเกมแล้วมือยังเรียง
     เหมือนเดิม แต่จบแมตช์แล้วไม่ค้างไปแมตช์หน้า */
  let handOrder = [];
  let orderLoaded = false;
  const orderKey = () => `c7:hand_order:${view?.matchId || 'x'}`;

  function loadHandOrder() {
    if (orderLoaded || !view?.matchId) return;
    orderLoaded = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(orderKey()) || '[]');
      if (Array.isArray(saved)) handOrder = saved.filter(id => typeof id === 'string');
    } catch { /* private mode */ }
  }

  function saveHandOrder() {
    try { sessionStorage.setItem(orderKey(), JSON.stringify(handOrder)); } catch { /* private mode */ }
  }

  /* ใบที่ยังไม่เคยถูกจัด (เพิ่งเข้าเกมมา) ต่อท้ายตามลำดับเดิมของ Authority
     Array.sort เสถียรอยู่แล้ว ใบที่ rank เท่ากันจึงไม่สลับกันเอง */
  function orderHand(cards) {
    if (!handOrder.length) return cards;
    const rank = new Map(handOrder.map((iid, i) => [iid, i]));
    return [...cards].sort((a, b) =>
      (rank.get(a.iid) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.iid) ?? Number.MAX_SAFE_INTEGER));
  }

  function moveHandCard(iid, toIndex) {
    const inHand = orderHand(lastPaint?.cards || []).map(c => c.iid);
    const from = inHand.indexOf(iid);
    if (from < 0 || toIndex === from) return;
    const next = [...inHand];
    next.splice(from, 1);
    next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, iid);
    /* ใบที่ออกจากมือไปแล้วต่อท้ายไว้ ไม่ต้องลบ — ไม่มีใครวาดมันอยู่ดี
       และถ้าลบทิ้ง ลำดับจะเพี้ยนเมื่อ view ย้อนกลับมาระหว่าง reconnect */
    handOrder = [...next, ...handOrder.filter(id => !next.includes(id))];
    saveHandOrder();
  }

  function paintHandNow() {
    if (!lastPaint) return;
    handSig = null;
    paintHand(lastPaint.cards, lastPaint.mode, lastPaint.opts);
  }

  /* จับดับเบิลแท็ปเองแทน event dblclick — ทุกครั้งที่เลือกไพ่ view เปลี่ยน
     แล้ว paintHand สร้างปุ่มใหม่ คลิกที่สองจึงลงบน node คนละตัว dblclick
     ไม่มีวันยิง ส่วน iid อยู่ข้ามการวาดใหม่ได้ */
  let lastTapIid = null;
  let lastTapAt = 0;

  /* เดิมล้าง #hand แล้วสร้างการ์ดใหม่ทุกครั้งที่ view เปลี่ยน
     เกมออนไลน์ poll ทุก 900ms ไพ่ในมือจึงถูกสร้างใหม่วินาทีละครั้ง
     background-image ของแต่ละใบถูกเซ็ตใหม่ทุกรอบ เห็นเป็นกะพริบบนมือถือ
     ตอนนี้เทียบลายเซ็นก่อน ถ้ามือหน้าตาเหมือนเดิมก็ไม่แตะ DOM เลย
     ผลพลอยได้: การลากไพ่ไม่ถูกตัดกลางคันเวลามี update เข้ามาพอดี */
  let handSig = null;
  let lastPaint = null;
  function paintHand(cards, mode, { disabled = false, markSelected = false } = {}) {
    const selected = view.you.selected || '';
    const ordered = orderHand(cards);
    const sig = [mode, disabled, markSelected, selected, ordered.map(c => c.iid).join(',')].join('|');
    lastPaint = { cards, mode, opts: { disabled, markSelected } };
    if (sig === handSig) return;
    handSig = sig;
    const handHost = $('#hand', root);
    handHost.innerHTML = '';
    for (const c of ordered) {
      const tile = handTile(c, mode);
      if (disabled) tile.disabled = true;
      if (markSelected && selected === c.iid) tile.classList.add('sel');
      handHost.append(tile);
    }
  }

  function showReveal(round, currentView) {
    const setFace = (slot, cardId) => { $('.front', slot).innerHTML = cardFace(cardId); };
    setFace(slotYou, round.you.cardId);
    setFace(slotOpp, round.opp.cardId);
    slotYou.classList.remove('revealed'); slotOpp.classList.remove('revealed');
    const doFlip = () => {
      slotYou.classList.add('revealed');
      slotOpp.classList.add('revealed');
      haptic([10, 40, 18]);
      playSfx(round.result === 'TIE' ? 'draw' : (round.youWon ? 'win' : 'lose'));
      /* คำผลรอบ WIN / LOSE / DRAW กลางจอ — เด่นแต่ไม่เท่าตอนจบเกม */
      const rr = $('#roundResult', root);
      const cy = round.you.color, co = round.opp.color;
      /* คำสั้นที่สุด — ไม่มีคะแนนให้รายงาน เพราะ MATCH ไม่ได้นับคะแนน
         บอกแค่สีไหนชนะสีไหน กับใครต้องทิ้งเพิ่ม */
      const drop = t(' · ทิ้งเพิ่ม 1', ' · discard 1');
      if (round.result === 'TIE') {
        rr.innerHTML = '<span class="rr-word draw anim-pop">DRAW</span>'
          + (cy === co ? RESULT_TEXT.TIE_SAME(cy, co) : RESULT_TEXT.TIE_SILVER(cy, co));
      } else if (round.youWon) {
        rr.innerHTML = '<span class="rr-word win anim-pop">WIN</span>'
          + `${RESULT_TEXT.WIN(cy, co)}${currentView.waitingOpponentDiscard ? `<span class="sub">${t('คู่แข่ง', 'Opponent')}${drop}</span>` : ''}`;
      } else {
        rr.innerHTML = '<span class="rr-word lose anim-pop">LOSE</span>'
          + `${RESULT_TEXT.LOSE(cy, co)}${currentView.discardRequired ? `<span class="sub">${t('คุณ', 'You')}${drop}</span>` : ''}`;
      }
    };
    reducedMotion() ? doFlip() : setTimeout(doFlip, 60);
  }

  function renderLatestDiscard(round) {
    const host = $('#roundDiscard', root);
    host.innerHTML = '';
    if (!round?.discards?.length) return;
    const label = round.discards[0].yours ? 'YOU DISCARDED' : `${view.opponent.name} DISCARDED`;
    host.append(el('b', {}, label), ...round.discards.map(card => historyChip(card, { discard: true })));
  }

  function scheduleFinish(justRevealed) {
    if (finished || finishTimer) return;
    /* ให้ผู้เล่นเห็นการพลิกไพ่ ผล Round และใบทิ้ง ก่อนประกาศผล Match */
    const wait = reducedMotion() ? 1100 : (justRevealed ? 2800 : 1800);
    finishTimer = setTimeout(() => {
      finishTimer = null;
      finishMatch();
    }, wait);
  }

  function finishMatch() {
    if (finished) return;
    finished = true;
    /* ผลใหญ่กลางจอก่อนไปหน้าสรุป */
    const r = view.result;
    const word = r.draw ? 'DRAW' : (r.youWon ? 'YOU WIN' : 'YOU LOSE');
    const resultClass = r.draw ? 'draw' : (r.youWon ? 'win' : 'lose');
    const sub = r.draw ? t('🤝 เสมอ — เกิดได้ยากมาก', '🤝 A draw — extremely rare')
      : (r.youWon ? t('🏆 ชนะ Match นี้', '🏆 You won this match') : t('จบ Match นี้แล้ว', 'This match is over'));
    const overlay = el('div', {
      class: `end-overlay ${resultClass}`, role: 'alert',
    },
      el('b', { class: 'disp anim-pop' }, word),
      el('span', {}, sub));
    const lastRound = view.rounds[view.rounds.length - 1];
    if (lastRound?.discards?.length) {
      const discardedBy = lastRound.discards[0].yours ? 'YOU DISCARDED' : `${view.opponent.name} DISCARDED`;
      overlay.append(el('div', { class: 'end-discard' },
        el('small', {}, discardedBy),
        ...lastRound.discards.map(card => historyChip(card, { discard: true }))));
    }
    root.append(overlay);
    haptic(r.youWon ? [20, 60, 20, 60, 40] : 30);
    playSfx(r.draw ? 'draw' : (r.youWon ? 'win' : 'lose'));
    setTimeout(() => onFinished && onFinished(view), reducedMotion() ? 700 : 2000);
  }

  /* ── Discard — จอกว้างเปิดเป็น rail; จอแคบเปิดเป็น drawer ── */
  const histBtn = $('#histBtn', root);
  const rulesBtn = $('#rulesBtn', root);
  const rulesPopover = $('#rulesPopover', root);
  function setRulesOpen(open) {
    rulesPopover.hidden = !open;
    rulesBtn.setAttribute('aria-expanded', String(open));
    rulesBtn.setAttribute('aria-label', open ? t('ซ่อน Rules', 'Hide rules') : t('เปิด Rules', 'Open rules'));
    rulesBtn.textContent = open ? '✕ Hide Rules' : '📖 Rules';
  }
  rulesBtn.addEventListener('click', () => setRulesOpen(rulesPopover.hidden));
  $('#rulesClose', root).addEventListener('click', () => setRulesOpen(false));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !rulesPopover.hidden) setRulesOpen(false);
  });
  const wideDiscard = () => window.matchMedia('(min-width: 960px) and (min-height: 600px)').matches;
  function setDiscardRail(open) {
    root.classList.toggle('discard-open', open);
    histBtn.setAttribute('aria-expanded', String(open));
    histBtn.setAttribute('aria-label', open ? t('ซ่อน Discard', 'Hide discard pile') : t('เปิด Discard', 'Open discard pile'));
    histBtn.textContent = open ? '✕ Hide Discard' : '🗑️ Discard';
  }
  histBtn.addEventListener('click', () => {
    if (wideDiscard()) setDiscardRail(!root.classList.contains('discard-open'));
    else openHistory();
  });
  window.addEventListener('resize', () => {
    if (!wideDiscard()) setDiscardRail(false);
  });

  /* ไพ่ที่ออกจากมือแล้วโชว์ภาพจริง ไม่ใช่เม็ดสีเปล่า ๆ — asset โหลดลงเครื่องไปแล้ว
     ตั้งแต่ตอนเล่น ใบที่ถูกทิ้งบอกด้วยขอบเส้นประ ไม่ต้องมีอีโมจิถังขยะนำหน้า */
  function historyChip(c, { discard = false } = {}) {
    const meta = COLOR_META[c.color];
    const card = cardById(c.cardId);
    const name = card && !card.generic ? card.en : meta.nameEn.toUpperCase();
    const art = cardArtHref(c.cardId);
    const chip = el('span', {
      class: 'hchip' + (discard ? ' discard' : ''),
      style: `background:${meta.hex}`,
      'aria-label': `${discard ? t('ทิ้ง ', 'discarded ') : ''}${name} ${colorName(c.color)}`,
    });
    if (art) chip.append(el('i', { class: 'hchip-art', style: `background-image:url("${art}")` }));
    chip.append(el('span', { class: 'hchip-name' }, `${meta.emoji} ${name}`));
    return chip;
  }

  function buildHistoryTable() {
    if (!view.rounds.length) return el('p', { class: 'history-empty' }, t('ยังไม่มีรอบที่จบ', 'No finished rounds yet'));
    const table = el('div', { class: 'hist2' });
    table.append(el('div', { class: 'hhead' },
      el('span', {}, `${view.you.name} ${t('(คุณ)', '(you)')}`),
      el('span', {}, view.opponent.name)));
    for (const r of view.rounds) {
      const resCls = r.result === 'TIE' ? 'tie' : (r.youWon ? 'win' : 'lose');
      const resTxt = r.result === 'TIE' ? t('เสมอ', 'Draw') : (r.youWon ? t('คุณชนะ', 'You won') : t('แพ้', 'Lost'));
      table.append(el('div', { class: 'hround' },
        el('span', { class: `rpill ${resCls}` }, `R${r.n} · ${resTxt}`)));
      table.append(el('div', { class: 'hcells' },
        el('div', { class: 'hc l' }, historyChip(r.you)),
        el('div', { class: 'hc r' }, historyChip(r.opp))));
      if (r.discards.length) {
        const l = el('div', { class: 'hc l' });
        const rt = el('div', { class: 'hc r' });
        for (const dc of r.discards) (dc.yours ? l : rt).append(historyChip(dc, { discard: true }));
        table.append(el('div', { class: 'hcells discard-row' }, l, rt));
      }
    }
    return table;
  }

  function renderHistory(host) {
    host.innerHTML = '';
    host.append(buildHistoryTable());
  }

  function openHistory() {
    const d = el('div', { class: 'drawer', role: 'dialog', 'aria-label': 'Discard' });
    const inner = el('div', { class: 'wrap-slim' });
    inner.append(el('h2', { class: 'disp' }, t('🗑️ Discard — ไพ่ที่ออกแล้ว', '🗑️ Discard — cards already out')));
    inner.append(buildHistoryTable());
    const closeBtn = el('button', { class: 'btn btn-gold', style: 'margin-top:18px' }, t('ปิด', 'Close'));
    const ffBtn = el('button', { class: 'btn btn-ghost', style: 'margin-top:18px;margin-left:10px' }, t('🏳️ ยอมแพ้', '🏳️ Forfeit'));
    closeBtn.addEventListener('click', () => d.remove());
    ffBtn.addEventListener('click', async () => {
      if (confirm(t('ยอมแพ้ Match นี้?', 'Forfeit this match?'))) { await client.send({ type: 'forfeit' }); d.remove(); refresh(); }
    });
    inner.append(closeBtn, ffBtn);
    d.append(inner);
    document.body.append(d);
  }

  /* ── Lock ── */
  lockBtn.addEventListener('click', async () => {
    haptic(15);
    playSfx('lock');
    const res = await client.send({ type: 'lock_choice' });
    if (!res.ok && res.error) toast(t('ยังเลือกการ์ดไม่ได้: ', 'Cannot lock yet: ') + res.error);
    refresh();
  });

  /* ── Event จาก Authority ── */
  client.subscribe(() => refresh());
  refresh();
  return { refresh };
}
