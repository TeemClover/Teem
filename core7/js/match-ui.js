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
import { cardSVG, cardBackSVG, genericCardSVG, cardArtHref } from './art.js';
import { isLocalMember } from './store.js';
import { playSfx } from './audio.js';

const RESULT_TEXT = {
  WIN: (c1, c2) => `${COLOR_META[c1].emoji} ${COLOR_META[c1].nameTh} ชนะ ${COLOR_META[c2].nameTh}!`,
  TIE_SAME: c => `เสมอ — ${COLOR_META[c].nameTh}ทั้งคู่`,
  TIE_GRAY: () => `⚙️ Block! เทาเสมอทุกสี`,
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
        <span class="conn" id="connDot" title="สถานะการเชื่อมต่อ"></span>
      </div>
    </div>
    <div class="public-counts" aria-label="จำนวนไพ่ที่เปิดเผยแล้ว">
      <div class="public-count-side you" id="youPublicCounts"></div>
      <div class="public-count-side opp" id="oppPublicCounts"></div>
    </div>
    <div class="match-board">
      <div class="match-stage">
        <button class="drawer-toggle" id="histBtn" aria-label="เปิด Discard" aria-expanded="false">🗑️ Discard</button>
        <div class="rule-line" aria-label="แดงชนะเขียว เขียวชนะฟ้า ฟ้าชนะแดง เทาเป็นบล็อก"><span>🔴 &gt; 🟢 &gt; 💧 &gt; 🔴</span><span>⚙️ = BLOCK</span></div>
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
      <aside class="history-rail" aria-label="Discard ทุกใบที่ออกแล้ว">
        <h2 class="disp">🗑️ Discard</h2>
        <div id="historyRail"></div>
      </aside>
    </div>
    <div class="match-hand">
      <p class="match-msg" id="msg"></p>
      <div class="hand-row" id="hand" role="group" aria-label="มือของคุณ"></div>
      <div class="match-actions">
        <button class="btn btn-gold" id="lockBtn" disabled>🔒 Lock</button>
      </div>
    </div>`;

  const slotOpp = $('#slotOpp', root), slotYou = $('#slotYou', root);
  const lockBtn = $('#lockBtn', root);

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
      'aria-label': `${label} สี${meta.nameTh}${mode === 'discard' ? ' — เลือกเพื่อทิ้ง' : ''}`,
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

    const resetDrag = () => {
      pointerId = null;
      btn.classList.remove('dragging');
      btn.style.removeProperty('--fling-x');
      btn.style.removeProperty('--fling-y');
    };

    if (mode === 'select' || mode === 'discard') {
      btn.addEventListener('pointerdown', event => {
        if (committing || event.button > 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        btn.setPointerCapture?.(pointerId);
      });
      btn.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerId) return;
        const dy = Math.min(0, event.clientY - startY);
        if (dy > -6) return;
        event.preventDefault();
        btn.classList.add('dragging');
        btn.style.setProperty('--fling-x', `${(event.clientX - startX) * .35}px`);
        btn.style.setProperty('--fling-y', `${Math.max(-120, dy)}px`);
      });
      btn.addEventListener('pointerup', async event => {
        if (event.pointerId !== pointerId || committing) return;
        const fling = event.clientY - startY <= -58;
        if (!fling) { resetDrag(); return; }
        suppressClick = true;
        committing = true;
        btn.classList.remove('dragging');
        btn.classList.add('fling-out');
        haptic([8, 25, 14]);
        playSfx('fling');
        let res;
        if (mode === 'select') {
          res = await client.send({ type: 'select_card', cardInstanceId: c.iid });
          if (res.ok) res = await client.send({ type: 'lock_choice' });
        } else {
          res = await client.send({ type: 'discard_card', cardInstanceId: c.iid });
        }
        if (!res?.ok) {
          btn.classList.remove('fling-out');
          toast(mode === 'discard' ? 'ทิ้งใบนี้ไม่ได้' : 'ลงการ์ดไม่ได้');
          playSfx('error');
        }
        resetDrag();
        committing = false;
        setTimeout(() => { suppressClick = false; }, 0);
        refresh();
      });
      btn.addEventListener('pointercancel', resetDrag);
    }

    btn.addEventListener('click', async event => {
      if (suppressClick) { event.preventDefault(); return; }
      haptic(8);
      playSfx('select');
      if (mode === 'select') {
        const res = await client.send({ type: 'select_card', cardInstanceId: c.iid });
        if (res.ok) refresh();
        else if (res.error === 'ALREADY_LOCKED') toast('Lock ไปแล้ว — รอเปิดการ์ด');
      } else if (mode === 'discard') {
        const res = await client.send({ type: 'discard_card', cardInstanceId: c.iid });
        if (!res.ok) toast('ทิ้งใบนี้ไม่ได้');
        else playSfx('discard');
        refresh();
      }
    });
    return btn;
  }

  function publicColorCounts(side) {
    const counts = { RED: 0, BLUE: 0, GREEN: 0, GRAY: 0 };
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
    for (const color of ['RED', 'BLUE', 'GREEN', 'GRAY']) {
      host.append(el('span', { title: `${COLOR_META[color].nameTh}ออกแล้ว ${counts[color]} ใบ` },
        `${COLOR_META[color].emoji}${counts[color]}`));
    }
  }

  async function refresh() {
    view = await client.getView();
    if (!view) return;
    render();
  }

  function render() {
    const v = view;
    $('#oppName', root).textContent = v.opponent.name + (oppLabel ? ` ${oppLabel}` : '');
    $('#oppAv', root).textContent = (v.opponent.name || '?')[0].toUpperCase();
    $('#youName', root).textContent = v.you.name + ' (คุณ)';
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
    const handHost = $('#hand', root);
    handHost.innerHTML = '';
    const msg = $('#msg', root);
    const inHand = v.you.hand.filter(c => c.status === 'IN_HAND');

    if (v.result) {
      msg.textContent = 'จบ Round แล้ว — กำลังสรุปผล Match…';
      lockBtn.disabled = true;
      lockBtn.textContent = 'ผล Match…';
      scheduleFinish(inReveal);
      return;
    }

    if (v.discardRequired) {
      msg.innerHTML = '<b style="color:#fca5a5">แพ้รอบนี้ — เลือกทิ้งจากมือเพิ่ม 1 ใบ (หงายหน้า)</b>';
      inHand.forEach(c => handHost.append(handTile(c, 'discard')));
      lockBtn.disabled = true;
      lockBtn.textContent = 'เลือกใบที่จะทิ้ง…';
      return;
    }
    if (v.waitingOpponentDiscard) {
      msg.textContent = 'ชนะรอบนี้! รอคู่แข่งเลือกทิ้งเพิ่ม…';
      inHand.forEach(c => { const t = handTile(c, 'none'); t.disabled = true; handHost.append(t); });
      lockBtn.disabled = true;
      lockBtn.textContent = '🔒 Lock';
      return;
    }
    if (v.phase === 'ROUND_SELECT') {
      if (v.you.locked) {
        msg.textContent = v.opponent.locked ? 'เปิดการ์ด…' : 'Lock แล้ว — รอคู่แข่งเลือก…';
        inHand.forEach(c => {
          const t = handTile(c, 'none');
          t.disabled = true;
          if (v.you.selected === c.iid) t.classList.add('sel');
          handHost.append(t);
        });
        lockBtn.disabled = true;
        lockBtn.textContent = '⏳ รอคู่แข่ง…';
      } else {
        msg.textContent = 'แตะเพื่อเลือกแล้ว Lock หรือปัดการ์ดขึ้นเพื่อเล่นทันที';
        inHand.forEach(c => handHost.append(handTile(c, 'select')));
        lockBtn.disabled = !v.you.selected;
        lockBtn.textContent = '🔒 Lock';
      }
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
      if (round.result === 'TIE') {
        rr.innerHTML = '<span class="rr-word draw anim-pop">DRAW</span>'
          + (cy === co ? RESULT_TEXT.TIE_SAME(cy) : RESULT_TEXT.TIE_GRAY())
          + '<span class="sub">เสมอ — เสียคนละใบที่ลง ไม่มีใครทิ้งเพิ่ม</span>';
      } else if (round.youWon) {
        rr.innerHTML = '<span class="rr-word win anim-pop">WIN</span>'
          + `🎉 ${RESULT_TEXT.WIN(cy, co)}<span class="sub">คุณได้ Round Win${currentView.waitingOpponentDiscard ? ' — คู่แข่งต้องทิ้งเพิ่ม 1 ใบ' : ''}</span>`;
      } else {
        rr.innerHTML = '<span class="rr-word lose anim-pop">LOSE</span>'
          + `${RESULT_TEXT.WIN(co, cy)}<span class="sub">คู่แข่งได้ Round Win${currentView.discardRequired ? ' — คุณต้องทิ้งเพิ่ม 1 ใบ' : ''}</span>`;
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
    const sub = r.draw ? '🤝 เสมอ — เกิดได้ยากมาก'
      : (r.youWon ? '🏆 ชนะ Match นี้' : 'จบ Match นี้แล้ว');
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
  const wideDiscard = () => window.matchMedia('(min-width: 960px) and (min-height: 600px)').matches;
  function setDiscardRail(open) {
    root.classList.toggle('discard-open', open);
    histBtn.setAttribute('aria-expanded', String(open));
    histBtn.setAttribute('aria-label', open ? 'ซ่อน Discard' : 'เปิด Discard');
    histBtn.textContent = open ? '✕ Hide Discard' : '🗑️ Discard';
  }
  histBtn.addEventListener('click', () => {
    if (wideDiscard()) setDiscardRail(!root.classList.contains('discard-open'));
    else openHistory();
  });
  window.addEventListener('resize', () => {
    if (!wideDiscard()) setDiscardRail(false);
  });

  function historyChip(c, { discard = false } = {}) {
    const meta = COLOR_META[c.color];
    const card = cardById(c.cardId);
    const name = card && !card.generic ? card.en : meta.nameEn.toUpperCase();
    return el('span', {
      class: 'hchip' + (discard ? ' discard' : ''),
      style: `background:${meta.hex}`,
      'aria-label': `${discard ? 'ทิ้ง ' : ''}${name} สี${meta.nameTh}`,
    }, `${discard ? '🗑 ' : ''}${meta.emoji} ${name}`);
  }

  function buildHistoryTable() {
    if (!view.rounds.length) return el('p', { class: 'history-empty' }, 'ยังไม่มีรอบที่จบ');
    const table = el('div', { class: 'hist2' });
    table.append(el('div', { class: 'hhead' },
      el('span', {}, `${view.you.name} (คุณ)`),
      el('span', {}, view.opponent.name)));
    for (const r of view.rounds) {
      const resCls = r.result === 'TIE' ? 'tie' : (r.youWon ? 'win' : 'lose');
      const resTxt = r.result === 'TIE' ? 'เสมอ' : (r.youWon ? 'คุณชนะ' : 'แพ้');
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
    inner.append(el('h2', { class: 'disp' }, '🗑️ Discard — ไพ่ที่ออกแล้ว'));
    inner.append(buildHistoryTable());
    const closeBtn = el('button', { class: 'btn btn-gold', style: 'margin-top:18px' }, 'ปิด');
    const ffBtn = el('button', { class: 'btn btn-ghost', style: 'margin-top:18px;margin-left:10px' }, '🏳️ ยอมแพ้');
    closeBtn.addEventListener('click', () => d.remove());
    ffBtn.addEventListener('click', async () => {
      if (confirm('ยอมแพ้ Match นี้?')) { await client.send({ type: 'forfeit' }); d.remove(); refresh(); }
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
    if (!res.ok && res.error) toast('ยังเลือกการ์ดไม่ได้: ' + res.error);
    refresh();
  });

  /* ── Event จาก Authority ── */
  client.subscribe(() => refresh());
  refresh();
  return { refresh };
}
