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
  try { return localStorage.getItem(`${SCORE_SENT_PREFIX}${state.runId}`) || ''; } catch { return ''; }
}

function finaleDetails(state) {
  const summary = state.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  const path = summary.year2Path || state.year2Path || 'xlead';
  return `<div class="dialog-kicker">🏁 MONTH 24 · TRUE ENDING · 1.0b</div>
    <h2>2 ปีต่อมา — ระบบเดินได้ไกลกว่าคนเดียว</h2>
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
    <blockquote class="v1-ending-quote">${path === 'xgen' ? 'คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง' : 'คุณสร้างทีมได้แล้ว — รอบหน้า ลองแตะ 3,000,000 XV ในเดือนเดียวก่อนจบ Month 12 เพื่อเปิด XGEN Path'}</blockquote>`;
}

function finaleHtml(state) {
  const sent = scoreName(state);
  return `${finaleDetails(state)}
    <label class="v9-score-name">ชื่อบน Scoreboard <input type="text" maxlength="28" data-v1b-score-name value="${esc(sent)}" placeholder="ชื่อเล่น"></label>
    <p class="dialog-note" data-v1b-score-status>${sent ? `✅ ส่ง High Score 1.0b แล้วในชื่อ ${esc(sent)}` : 'Scoreboard 1.0b ใช้คะแนน Month 1–12 ที่ล็อกไว้ของรอบนี้'}</p>
    <div class="dialog-actions v1-finale-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v1b-new-run>↺ เล่นใหม่</button><button class="dialog-button dialog-button--secondary" type="button" data-v1b-submit-score>🏆 ส่งชื่อขึ้น Scoreboard</button><button class="dialog-button" type="button" data-v1b-new-game-plus>⚡ เล่น NEW GAME+</button></div>
    <button class="dialog-button dialog-button--ghost" type="button" data-v1b-close-finale>กลับไปดูฉากจบ</button>`;
}

function openFinale(state) {
  const dialog = $('#gameDialog');
  const content = $('#dialogContent');
  if (!dialog || !content || !state?.runComplete) return;
  content.innerHTML = finaleHtml(state);
  dialog.dataset.kind = 'wide';
  dialog.dataset.v1bFinale = state.runId || 'complete';
  document.body.style.overflow = 'hidden';
  if (!dialog.open) dialog.showModal();
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
    if (node.textContent === '① จาก XV รายการนี้') node.textContent = '① จากยอดขายรายการนี้';
  });
  document.querySelectorAll('.receipt-1b small').forEach((node) => {
    node.textContent = node.textContent
      .replace('① คิดจาก Personal XV และปรับย้อนหลังเมื่อขึ้น Tier', '① คิดจากยอดขายบาท และปรับย้อนหลังให้ทั้งเดือนเมื่อขึ้น Tier');
  });
}

function patch() {
  patchLegacyScoreButtons();
  patchReceiptCopy();
  const state = stateNow();
  if (!state) return;
  if (!state.runComplete) return;
  const actionBar = $('#actionBar');
  if (actionBar && !actionBar.querySelector('[data-v1b-open-finale]')) {
    actionBar.innerHTML = '<button class="action-button action-button--primary" type="button" data-v1b-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>Scoreboard · NEW GAME+ · เล่นใหม่</small></span></button>';
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
    if (status) status.textContent = 'ใส่ชื่อเล่นก่อนส่ง High Score';
    input?.focus();
    return;
  }
  if (status) status.textContent = 'กำลังส่ง High Score 1.0b…';
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
    if (status) status.textContent = `✅ ส่ง High Score 1.0b แล้วในชื่อ ${displayName}`;
  } catch {
    if (status) status.textContent = 'คะแนนอยู่ในเครื่องแล้ว แต่ส่ง Scoreboard ไม่สำเร็จ · กดลองอีกครั้งได้';
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-v1b-submit-score]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore();
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
    const dialog = $('#gameDialog');
    if (dialog?.open) dialog.close();
    document.body.style.removeProperty('overflow');
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

function queuePatch() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; patch(); });
}

new MutationObserver(queuePatch).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
addEventListener('pageshow', queuePatch);
queuePatch();
