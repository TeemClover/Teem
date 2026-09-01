import { dispatchForUi } from './game.js';
import { EVENTS, SAVE_KEY, V1_SCORE_VERSION, parseSavedState } from './game-data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const fmt = (value) => Math.round(Number(value || 0)).toLocaleString('th-TH');
const baht = (value) => `฿${fmt(value)}`;
const esc = (value = '') => String(value).replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SCORE_SENT_PREFIX = 'mc_xvisor_1b_score_sent:';
let dismissedRun = null;
let queued = false;

function stateNow() {
  try { return parseSavedState(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

function scoreName(state) {
  try { return localStorage.getItem(`${SCORE_SENT_PREFIX}${state?.runId || ''}`) || ''; } catch { return ''; }
}

function hardClose() {
  const dialog = $('#gameDialog');
  if (dialog?.open) dialog.close();
  if (dialog) {
    delete dialog.dataset.v1bCampaignGate;
    delete dialog.dataset.v1bFinale;
  }
  document.body.style.removeProperty('overflow');
}

function show(html, kind, key) {
  const dialog = $('#gameDialog');
  const content = $('#dialogContent');
  if (!dialog || !content) return;
  content.innerHTML = html;
  dialog.dataset.kind = kind;
  if (key === 'campaign') {
    dialog.dataset.v1bCampaignGate = '1';
    delete dialog.dataset.v1bFinale;
  } else {
    dialog.dataset.v1bFinale = key;
    delete dialog.dataset.v1bCampaignGate;
  }
  document.body.style.overflow = 'hidden';
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector('input,button')?.focus?.());
}

function campaignScoreDetails(state) {
  const score = state.campaignScore || {};
  const path = state.campaignOutcome?.xgenByMonth12 || score.xgenByMonth12 ? 'XGEN' : 'XLEAD';
  return `<div class="dialog-kicker">🏆 MONTH 12 · CAMPAIGN COMPLETE · 1.0b</div>
    <h2>12 เดือนแรกจบแล้ว — บันทึกชื่อคุณก่อน</h2>
    <p class="dialog-note">High Score ใช้ผล Month 1–12 เท่านั้น ปีที่ 2 จะไม่แก้คะแนนก้อนนี้</p>
    <div class="v1-finale-grid" aria-label="High Score 12 เดือน">
      <div><span>🏆 Best TGV</span><strong>${fmt(score.bestTgv)} XV</strong></div>
      <div><span>💰 รายได้รวม 12 เดือน</span><strong>${baht(score.totalIncome)}</strong></div>
      <div><span>💎 สูงสุด / เดือน</span><strong>${baht(score.bestMonthlyIncome)}</strong></div>
      <div><span>🏙️ Organization</span><strong>${fmt(score.organizationSize)} คน</strong></div>
    </div>
    <blockquote class="v1-ending-quote">${path === 'XGEN' ? '⭐ คุณผ่าน XGEN ภายใน 12 เดือน — ปีที่ 2 จะเปิด XGEN Path และ Recognition Trip' : '👑 คุณจบปีแรกใน XLEAD Path — ปีที่ 2 จะทำให้เห็นความต่างของระบบที่สร้างไว้'}</blockquote>`;
}

function campaignGateHtml(state, status = '') {
  const sent = scoreName(state);
  if (sent) {
    return `${campaignScoreDetails(state)}
      <div class="v1-score-lock-success"><strong>✅ High Score บันทึกแล้ว</strong><span>ชื่อบนตาราง: ${esc(sent)}</span></div>
      <h3>ทีนี้ดูสิ่งที่คุณสร้างไว้เดินต่อเอง</h3>
      <p class="dialog-note">จาก Month 13 เป็นต้นไป คุณไม่ต้องขายหรือตามรายคนแล้ว กดเดือนละครั้งเพื่อดูระบบเดินต่อจน Month 24</p>
      <div class="dialog-actions v1-finale-actions"><button class="dialog-button" type="button" data-v1b-enter-org>▶ ดูสิ่งที่คุณสร้างโตเอง 1 เดือน</button></div>`;
  }
  return `${campaignScoreDetails(state)}
    <div class="v1-score-required">
      <strong>ขั้นสุดท้ายของปีแรก</strong>
      <p>ใส่ชื่ออะไรก็ได้เพื่อขึ้น High Score ก่อน แล้วเกมจะเปิด Year 2 ให้ทันที</p>
      <label class="v9-score-name">ชื่อบน High Score <input type="text" maxlength="28" autocomplete="nickname" data-v1b-score-name placeholder="เช่น Teem / Ako / แมวขาว"></label>
      <p class="dialog-note" data-v1b-score-status>${esc(status || 'ยังไปต่อไม่ได้จนกว่าจะบันทึกชื่อ High Score')}</p>
      <button class="dialog-button" type="button" data-v1b-submit-score>🏆 บันทึกชื่อขึ้น High Score</button>
    </div>`;
}

function openCampaignGate(state, status = '') {
  if (!state?.campaignScore?.locked || state.organizationMode) return;
  show(campaignGateHtml(state, status), 'wide', 'campaign');
}

function finaleDetails(state) {
  const summary = state.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  const path = summary.year2Path || state.year2Path || 'xlead';
  return `<div class="dialog-kicker">🏁 MONTH 24 · TRUE ENDING · 1.0b</div>
    <h2>2 ปีผ่านไปแล้ว — นี่คือสิ่งที่ระบบของคุณสร้าง</h2>
    <div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt(summary.activeCustomers)} ลูกค้า · ${fmt(summary.xvisorCount)} X-VISOR · ${fmt(summary.xleadCount)} XLEAD</strong></div></div>
    <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
      <div><span>🏙️ Month 24 TGV</span><strong>${fmt(summary.month24TGV)} XV</strong></div>
      <div><span>🏆 Best TGV</span><strong>${fmt(summary.bestTGV)} XV</strong></div>
      <div><span>💎 Best Month Income</span><strong>${baht(summary.bestMonthIncome)}</strong></div>
      <div><span>💰 รายได้สะสม 24 เดือน</span><strong>${baht(summary.total24Income ?? summary.totalIncome)}</strong></div>
      <div><span>❤️ Active Customers</span><strong>${fmt(summary.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR</span><strong>${fmt(summary.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(summary.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt(summary.organizationSize)}</strong></div>
    </div>
    <div class="v1-trip-stamps">${path === 'xgen' ? trips.map((trip) => `<span>✈️ ${esc(trip.destination)}<small>M${fmt(trip.month)}</small></span>`).join('') : '<span class="is-empty">XLEAD Path · รอบนี้ยังไม่ผ่าน XGEN ก่อนจบ Month 12 จึงไม่มี Recognition Trip</span>'}</div>
    <blockquote class="v1-ending-quote">${path === 'xgen' ? 'คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง' : 'คุณสร้างทีมได้แล้ว — NEW GAME+ รอบหน้า ลองแตะ 3,000,000 XV ในเดือนเดียวก่อนจบ Month 12'}</blockquote>`;
}

function finaleHtml(state) {
  const sent = scoreName(state);
  return `${finaleDetails(state)}
    <div class="v1-score-lock-success"><strong>🏆 High Score ปีแรก</strong><span>${sent ? `บันทึกในชื่อ ${esc(sent)}` : 'คะแนน Month 12 ถูกล็อกไว้ในรอบนี้'}</span></div>
    <div class="dialog-actions v1-finale-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v1b-new-run>↺ เล่นใหม่</button><button class="dialog-button" type="button" data-v1b-new-game-plus>⚡ NEW GAME+</button></div>
    <button class="dialog-button dialog-button--ghost" type="button" data-v1b-close-finale>กลับไปดูฉากจบ</button>`;
}

function openFinale(state) {
  if (!state?.runComplete) return;
  show(finaleHtml(state), 'wide', state.runId || 'complete');
}

function patchLegacyScoreButtons() {
  document.querySelectorAll('[data-v1-submit-score],[data-v9-submit-score]').forEach((button) => {
    button.removeAttribute('data-v1-submit-score');
    button.removeAttribute('data-v9-submit-score');
    button.setAttribute('data-v1b-submit-score', '');
  });
}

function patchReceiptCopy() {
  document.querySelectorAll('.receipt-1b__row span').forEach((node) => {
    if (node.textContent === '① จาก XV รายการนี้') node.textContent = '① จาก XV รายการนี้';
  });
  document.querySelectorAll('.receipt-1b small').forEach((node) => {
    node.textContent = node.textContent.replace('① คิดจากยอดขายบาท และปรับย้อนหลังให้ทั้งเดือนเมื่อขึ้น Tier', '① Tier ดูจากยอดขายบาท · รายได้คิดจาก Personal XV · ขึ้น Tier แล้วปรับย้อนหลังทั้งเดือน');
  });
}

function patch() {
  patchLegacyScoreButtons();
  patchReceiptCopy();
  const state = stateNow();
  if (!state) return;

  if (state.campaignScore?.locked && !state.organizationMode) {
    const dialog = $('#gameDialog');
    if (!dialog?.open || !dialog.dataset.v1bCampaignGate) openCampaignGate(state);
    const actionBar = $('#actionBar');
    if (actionBar) actionBar.innerHTML = scoreName(state)
      ? '<button class="action-button action-button--primary" type="button" data-v1b-enter-org><span class="action-button__icon">▶</span><span class="action-button__copy"><strong>ดูสิ่งที่คุณสร้างโตเอง 1 เดือน</strong><small>Year 2 · กดเดือนละครั้งจน Month 24</small></span></button>'
      : '<button class="action-button action-button--primary" type="button" data-v1b-open-campaign-gate><span class="action-button__icon">🏆</span><span class="action-button__copy"><strong>ใส่ชื่อ High Score ก่อน</strong><small>บันทึกปีแรก แล้วค่อยเปิด Year 2</small></span></button>';
    return;
  }

  if (!state.runComplete) return;
  const actionBar = $('#actionBar');
  if (actionBar && !actionBar.querySelector('[data-v1b-open-finale]')) {
    actionBar.innerHTML = '<button class="action-button action-button--primary" type="button" data-v1b-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>จบจริง · NEW GAME+</small></span></button>';
  }
  const dialog = $('#gameDialog');
  if (dialog?.open && dialog.dataset.v1bFinale !== state.runId) openFinale(state);
  else if (!dialog?.open && dismissedRun !== state.runId) openFinale(state);
}

async function submitScore() {
  const state = stateNow();
  const score = state?.campaignScore;
  if (!score?.locked) return;
  const input = $('[data-v1b-score-name], [data-v9-score-name]');
  const status = $('[data-v1b-score-status], [data-v9-score-status]');
  const displayName = String(input?.value || '').trim().slice(0, 28);
  if (!displayName) {
    if (status) status.textContent = 'ใส่ชื่ออะไรก็ได้ก่อน แล้วค่อยไป Year 2';
    input?.focus();
    return;
  }
  if (status) status.textContent = 'กำลังบันทึก High Score 1.0b…';
  try {
    const response = await fetch('/api/xvisor-scores', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        runId: score.runId || state.runId,
        scoreVersion: V1_SCORE_VERSION,
        runMode: state.runMode || 'FIRST_RUN',
        bestTgv: score.bestTgv,
        totalIncome: score.totalIncome,
        bestMonthlyIncome: score.bestMonthlyIncome,
        organizationSize: score.organizationSize,
        completedAt: score.completedAt,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'SUBMIT_FAILED');
    try { localStorage.setItem(`${SCORE_SENT_PREFIX}${state.runId}`, displayName); } catch {}
    openCampaignGate(state, `✅ บันทึก High Score แล้วในชื่อ ${displayName}`);
  } catch {
    if (status) status.textContent = 'ส่ง High Score ไม่สำเร็จ · ต้องส่งสำเร็จก่อนจึงจะเปิด Year 2';
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-v1b-submit-score],[data-v9-submit-score],[data-v1-submit-score]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore();
    return;
  }
  if (event.target.closest('[data-v1b-open-campaign-gate]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCampaignGate(stateNow());
    return;
  }
  if (event.target.closest('[data-v1b-enter-org],[data-v9-enter-org]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = stateNow();
    if (!state?.campaignScore?.locked) return;
    if (!scoreName(state)) {
      openCampaignGate(state, 'ใส่ชื่อ High Score ให้สำเร็จก่อน แล้วปุ่ม Year 2 จะเปิด');
      return;
    }
    hardClose();
    dispatchForUi(EVENTS.ENTER_ORGANIZATION);
    return;
  }
  if (event.target.closest('[data-v1b-open-finale]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = stateNow();
    if (state?.runComplete) { dismissedRun = null; openFinale(state); }
    return;
  }
  if (event.target.closest('[data-v1b-close-finale]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = stateNow();
    dismissedRun = state?.runId || 'dismissed';
    hardClose();
    return;
  }
  if (event.target.closest('[data-v1b-new-run]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    location.reload();
    return;
  }
  if (event.target.closest('[data-v1b-new-game-plus]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatchForUi(EVENTS.NEW_GAME_PLUS);
    window.setTimeout(() => location.reload(), 260);
  }
}, true);

document.addEventListener('cancel', (event) => {
  const state = stateNow();
  if (event.target?.id === 'gameDialog' && state?.campaignScore?.locked && !state.organizationMode) {
    event.preventDefault();
    openCampaignGate(state);
  }
}, true);

function queuePatch() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; patch(); });
}

new MutationObserver(queuePatch).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
addEventListener('pageshow', queuePatch);
queuePatch();
