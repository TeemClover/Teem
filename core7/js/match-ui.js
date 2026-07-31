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
import { colorIcon, cardSVG, cardBackSVG, genericCardSVG } from './art.js';
import { isLocalMember } from './store.js';

const RESULT_TEXT = {
  WIN: (c1, c2) => `${COLOR_META[c1].emoji} ${COLOR_META[c1].nameTh} ชนะ ${COLOR_META[c2].nameTh}!`,
  TIE_SAME: c => `เสมอ — ${COLOR_META[c].nameTh}ทั้งคู่`,
  TIE_GRAY: () => `⚙️ Block! เทาเสมอทุกสี`,
};

export function mountMatch(root, client, { onFinished, oppLabel = '' } = {}) {
  let view = null;
  let finished = false;
  let revealShown = 0;      // จำนวนรอบที่เล่น animation แล้ว
  const member = isLocalMember();

  root.classList.add('match-shell');
  root.innerHTML = `
    <div class="match-top">
      <div class="pl">
        <span class="avatar" id="oppAv">?</span>
        <div>
          <div class="nm" id="oppName">…</div>
          <div class="meta"><span id="oppCards"></span><span class="pips" id="oppPips"></span></div>
        </div>
        <span class="conn" id="connDot" title="สถานะการเชื่อมต่อ"></span>
      </div>
      <div class="pl" style="flex-direction:row-reverse;text-align:right">
        <span class="avatar" id="youAv">?</span>
        <div>
          <div class="nm" id="youName">…</div>
          <div class="meta" style="justify-content:flex-end"><span class="pips" id="youPips"></span><span id="youCards"></span></div>
        </div>
      </div>
    </div>
    <div class="match-stage">
      <button class="drawer-toggle" id="histBtn" aria-label="เปิดประวัติการเล่น">📜 กองหงาย</button>
      <div class="stage-cards">
        <div class="stage-slot" id="slotOpp" aria-live="polite">
          <div class="flip"><div class="face back"></div><div class="face front"></div></div>
        </div>
        <div class="stage-vs">VS<br><span id="roundNo" style="font-size:12px;color:rgb(255 255 255/.6)"></span></div>
        <div class="stage-slot" id="slotYou">
          <div class="flip"><div class="face back"></div><div class="face front"></div></div>
        </div>
      </div>
      <div class="round-result" id="roundResult" aria-live="assertive"></div>
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
    const btn = el('button', {
      class: `hand-card ${c.color.toLowerCase()}`,
      'data-iid': c.iid,
      'aria-label': `${label} สี${meta.nameTh}${mode === 'discard' ? ' — เลือกเพื่อทิ้ง' : ''}`,
      'aria-pressed': String(view.you.selected === c.iid),
      html: `<span style="display:flex">${colorIcon(c.color, 18)}</span><span>${label.slice(0, 9)}</span>`,
    });
    if (view.you.selected === c.iid && mode === 'select') btn.classList.add('sel');
    btn.addEventListener('click', async () => {
      haptic(8);
      if (mode === 'select') {
        const res = await client.send({ type: 'select_card', cardInstanceId: c.iid });
        if (res.ok) refresh();
        else if (res.error === 'ALREADY_LOCKED') toast('Lock ไปแล้ว — รอเปิดการ์ด');
      } else if (mode === 'discard') {
        const res = await client.send({ type: 'discard_card', cardInstanceId: c.iid });
        if (!res.ok) toast('ทิ้งใบนี้ไม่ได้');
        refresh();
      }
    });
    return btn;
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
      showReveal(lastRound);
    }

    /* มือ + ข้อความ */
    const handHost = $('#hand', root);
    handHost.innerHTML = '';
    const msg = $('#msg', root);
    const inHand = v.you.hand.filter(c => c.status === 'IN_HAND');

    if (v.result) { finishMatch(); return; }

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
        msg.textContent = 'เลือกการ์ดลับ 1 ใบ แล้วกด Lock';
        inHand.forEach(c => handHost.append(handTile(c, 'select')));
        lockBtn.disabled = !v.you.selected;
        lockBtn.textContent = '🔒 Lock';
      }
    }
  }

  function showReveal(round) {
    const setFace = (slot, cardId) => { $('.front', slot).innerHTML = cardFace(cardId); };
    setFace(slotYou, round.you.cardId);
    setFace(slotOpp, round.opp.cardId);
    slotYou.classList.remove('revealed'); slotOpp.classList.remove('revealed');
    const doFlip = () => {
      slotYou.classList.add('revealed');
      slotOpp.classList.add('revealed');
      haptic([10, 40, 18]);
      const rr = $('#roundResult', root);
      const cy = round.you.color, co = round.opp.color;
      if (round.result === 'TIE') {
        rr.innerHTML = (cy === co ? RESULT_TEXT.TIE_SAME(cy) : RESULT_TEXT.TIE_GRAY())
          + '<span class="sub">เสมอ — เสียคนละใบที่ลง ไม่มีใครทิ้งเพิ่ม</span>';
      } else if (round.youWon) {
        rr.innerHTML = `🎉 ${RESULT_TEXT.WIN(cy, co)}<span class="sub">คุณได้ Round Win — คู่แข่งต้องทิ้งเพิ่ม 1 ใบ</span>`;
      } else {
        rr.innerHTML = `${RESULT_TEXT.WIN(co, cy)}<span class="sub">คู่แข่งได้ Round Win — คุณต้องทิ้งเพิ่ม 1 ใบ</span>`;
      }
    };
    reducedMotion() ? doFlip() : setTimeout(doFlip, 60);
  }

  function finishMatch() {
    if (finished) return;
    finished = true;
    setTimeout(() => onFinished && onFinished(view), reducedMotion() ? 200 : 1400);
  }

  /* ── History drawer ── */
  $('#histBtn', root).addEventListener('click', () => openHistory());
  function openHistory() {
    const d = el('div', { class: 'drawer', role: 'dialog', 'aria-label': 'ประวัติการเล่น' });
    const inner = el('div', { class: 'wrap-slim' });
    inner.append(el('h2', { class: 'disp' }, '📜 กองหงาย — ทุกใบที่ใช้แล้ว'));
    if (!view.rounds.length) inner.append(el('p', {}, 'ยังไม่มีรอบที่จบ'));
    for (const r of [...view.rounds].reverse()) {
      const row = el('div', { class: 'hist-round' });
      row.append(el('b', { class: 'disp' }, `R${r.n}`));
      const chip = (c, who) => el('span', { class: 'hist-chip', html: `${colorIcon(c.color, 14)} ${who} · ${cardById(c.cardId)?.en || c.color}` });
      row.append(chip(r.you, 'คุณ'), el('span', {}, 'vs'), chip(r.opp, view.opponent.name));
      row.append(el('span', { style: 'color:rgb(227 197 126)' },
        r.result === 'TIE' ? 'เสมอ' : (r.youWon ? 'คุณชนะ' : 'คู่แข่งชนะ')));
      for (const dc of r.discards) {
        row.append(el('span', { class: 'hist-chip', style: 'opacity:.75', html: `🗑 ${dc.yours ? 'คุณ' : view.opponent.name}ทิ้ง · ${colorIcon(dc.color, 13)} ${cardById(dc.cardId)?.en || dc.color}` }));
      }
      inner.append(row);
    }
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
    const res = await client.send({ type: 'lock_choice' });
    if (!res.ok && res.error) toast('ยังเลือกการ์ดไม่ได้: ' + res.error);
    refresh();
  });

  /* ── Event จาก Authority ── */
  client.subscribe(() => refresh());
  refresh();
  return { refresh };
}
