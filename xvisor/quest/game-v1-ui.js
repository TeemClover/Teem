import { dispatchForDebug } from './game.js?v=1';
import {
  EVENTS,
  SAVE_KEY,
  V1_SCORE_VERSION,
  parseSavedState,
} from './game-data-v1.js?v=1';

const $ = (selector, root = document) => root.querySelector(selector);
const SCORE_SENT_PREFIX = 'mc_xvisor_1_score_sent:';
let patchQueued = false;

function fmt(value) {
  return Math.round(Number(value || 0)).toLocaleString('th-TH');
}

function baht(value) {
  return `฿${fmt(value)}`;
}

function stateNow() {
  try { return parseSavedState(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

function queuePatch() {
  if (patchQueued) return;
  patchQueued = true;
  requestAnimationFrame(() => {
    patchQueued = false;
    patchReleaseUi();
  });
}

function patchVersionLabels() {
  const app = $('#gameApp');
  if (app) app.dataset.gameVersion = '1.0';
  const chip = $('.rank-chip[aria-label="เวอร์ชันเกม"]');
  if (chip) chip.textContent = '1.0';
  const worldVersion = $('.world-frame__label b');
  if (worldVersion) worldVersion.textContent = '1.0';
  const footerVersion = $('.game-footer > span:last-child');
  if (footerVersion) footerVersion.textContent = '1.0 · บันทึกอัตโนมัติบนอุปกรณ์นี้';
}

function patchScoreFinale(state) {
  if (!state?.campaignScore?.locked || state.organizationMode) return;
  const dialog = $('#gameDialog');
  if (!dialog?.open) return;
  const submit = dialog.querySelector('[data-v9-submit-score]');
  if (submit) {
    submit.removeAttribute('data-v9-submit-score');
    submit.setAttribute('data-v1-submit-score', '');
  }
  const kicker = dialog.querySelector('.dialog-kicker');
  if (kicker?.textContent?.includes('MONTH 12')) kicker.textContent = '🏆 MONTH 12 · X-VISOR QUEST 1.0';
}

function organizationReportHtml(report) {
  if (!report) return '<p>กด <b>ผ่านไปอีก 1 เดือน</b> แล้วระบบจะรันงานประจำองค์กรให้ครบในครั้งเดียว</p>';
  const xircle = report.activities?.xircle ? '<span>🏕️ The Xircle ×1</span>' : '';
  return `<div class="v1-org-report">
    <div class="v1-org-rhythm"><span>🎓 Xcademy ×4</span><span>🏠 Open House ×1</span>${xircle}</div>
    <div class="v1-org-grid">
      <div><span>🆕 ลูกค้าใหม่</span><strong>${fmt(report.newCustomers)}</strong></div>
      <div><span>📦 RoutineX Repeat</span><strong>${fmt(report.repeatCustomers)}</strong></div>
      <div><span>👥 Referral</span><strong>${fmt(report.referrals)}</strong></div>
      <div><span>🎓 Candidate ใหม่</span><strong>${fmt(report.candidates)}</strong></div>
      <div><span>🌱 X-VISOR ใหม่</span><strong>+${fmt(report.newXvisors)}</strong></div>
      <div><span>👑 XLEAD ใหม่</span><strong>+${fmt(report.newXleads)}</strong></div>
    </div>
    <p><b>🏙️ TGV เดือน ${report.month}</b> ${fmt(report.tgv)} XV · <b>💰 รายได้</b> ${baht(report.income)}</p>
  </div>`;
}

function patchOrganizationDialog(state) {
  const dialog = $('#gameDialog');
  const content = $('#dialogContent');
  if (!dialog?.open || !content || dialog.dataset.v9Dialog !== 'organization') return;
  const report = state.lastOrganizationReport;
  const agg = state.organization?.aggregate || {};
  const leaders = (state.team || [])
    .filter((member) => member.active !== false)
    .sort((a, b) => Number(b.personalXV || 0) - Number(a.personalXV || 0))
    .slice(0, 8);
  content.innerHTML = `<div class="dialog-kicker">🏙️ ORGANIZATION YEAR · MONTH ${state.month}</div>
    <h2>${state.runComplete ? '🏁 2 ปีผ่านไปแล้ว' : 'ระบบที่สร้างไว้กำลังเดินต่อ'}</h2>
    ${organizationReportHtml(report)}
    <div class="v1-org-grid v1-org-grid--totals">
      <div><span>❤️ Active Customers</span><strong>${fmt(agg.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR ทั้งองค์กร</span><strong>${fmt(agg.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(agg.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt(agg.organizationSize ?? agg.xvisorCount)}</strong></div>
    </div>
    <section class="work-section"><h3>ผู้นำเด่นเดือนล่าสุด</h3><div class="income-breakdown">${leaders.map((member) => `<div class="v1-leader"><span>${member.name} · ${member.rank === 'xlead' ? 'XLEAD' : 'X-VISOR'}</span><b>${fmt(member.personalXV)} XV</b></div>`).join('') || '<p>ยังไม่มีทีม</p>'}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`;
}

function patchOrganizationBoard(state) {
  if (!state.organizationMode) return;
  const report = state.lastOrganizationReport;
  const agg = state.organization?.aggregate || {};
  const monthButton = $('#monthButton');
  if (monthButton) monthButton.hidden = true;
  const energy = $('#hudEnergyButton');
  if (energy) energy.hidden = true;
  const teamChip = $('#teamChip');
  if (teamChip) {
    teamChip.hidden = false;
    teamChip.textContent = `ทีม ${fmt(agg.xvisorCount)} X-VISOR · ${fmt(agg.xleadCount)} XLEAD`;
  }
  const customers = $('#hudCustomers');
  if (customers) customers.textContent = `${fmt(agg.activeCustomers)} คน`;
  const people = $('#peopleButton');
  if (people) people.innerHTML = `Organization <b>${fmt(agg.xvisorCount)}</b>`;
  const incomeLabel = $('.status-item--income span');
  if (incomeLabel) incomeLabel.textContent = 'รายได้สะสม';
  const goalEyebrow = $('#goalEyebrow');
  const goalTitle = $('#goalTitle');
  const goalReason = $('#goalReason');
  if (goalEyebrow) goalEyebrow.textContent = state.runComplete ? 'จบเส้นทาง 24 เดือน' : 'YEAR 2 · ORGANIZATION';
  if (goalTitle) goalTitle.textContent = state.runComplete ? '🏁 2 ปีผ่านไปแล้ว' : `Organization Year · เดือน ${state.month}`;
  if (goalReason) goalReason.textContent = state.runComplete
    ? 'รอบหน้า คุณไม่ต้องเริ่มจากการเรียนรู้แล้ว — คุณเริ่มจากประสบการณ์'
    : 'กดครั้งเดียว ระบบจะทำ Xcademy ×4, Open House ×1 และ The Xircle ตามรอบ แล้วสรุปผลงานทั้งเดือน';
  const speaker = $('#dialogueSpeaker');
  const dialogue = $('#dialogueText');
  const details = $('#sceneDetails');
  if (speaker) speaker.textContent = state.runComplete ? '24-MONTH FINALE' : 'ORGANIZATION REPORT';
  if (dialogue) dialogue.textContent = state.runComplete
    ? 'ปีแรกคุณสร้างระบบ ปีที่สองระบบเริ่มเดินต่อ ถึงเวลาลองเริ่มใหม่พร้อมประสบการณ์ทั้งหมด'
    : report ? `เดือน ${report.month} ผ่านไปแล้ว · ทีมสร้างลูกค้าใหม่ ${fmt(report.newCustomers)} · X-VISOR +${fmt(report.newXvisors)} · XLEAD +${fmt(report.newXleads)}` : 'จากนี้คุณไม่ต้องขายหรือตามใครทีละคนแล้ว';
  if (details) details.innerHTML = organizationReportHtml(report);

  const actionBar = $('#actionBar');
  if (!actionBar) return;
  if (state.runComplete) {
    const summary = state.twoYearSummary || {};
    if (details) details.innerHTML = `<div class="v1-finale-grid">
      <div><span>🏙️ Month 24 TGV</span><strong>${fmt(summary.month24TGV)} XV</strong></div>
      <div><span>💰 Month 24 Income</span><strong>${baht(summary.month24Income)}</strong></div>
      <div><span>❤️ Active Customers</span><strong>${fmt(summary.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR</span><strong>${fmt(summary.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(summary.xleadCount)}</strong></div>
      <div><span>💰 รายได้สะสม 2 ปี</span><strong>${baht(summary.totalIncome)}</strong></div>
    </div>`;
    actionBar.innerHTML = '<button class="action-button action-button--primary" type="button" data-v1-new-game-plus><span class="action-button__icon">⚡</span><span class="action-button__copy"><strong>NEW GAME+</strong><small>เริ่ม Month 1 ทันที · เปิด Management เต็มรูปแบบ</small></span></button>';
  } else {
    actionBar.innerHTML = '<button class="action-button action-button--primary" type="button" data-v1-org-pass><span class="action-button__icon">▶</span><span class="action-button__copy"><strong>ผ่านไปอีก 1 เดือน</strong><small>Xcademy ×4 · Open House ×1 · The Xircle ตามรอบ · สรุปครั้งเดียว</small></span></button>';
  }
}

function patchNewGamePlusIntro(state) {
  if (state.runMode !== 'NEW_GAME_PLUS' || state.month !== 1 || state.organizationMode) return;
  const previous = state.previousRunScore;
  const goalEyebrow = $('#goalEyebrow');
  if (goalEyebrow) goalEyebrow.textContent = '⚡ NEW GAME+';
  if (previous && $('#sceneDetails')) {
    $('#sceneDetails').innerHTML = `<div class="v1-ng-score"><b>รอบก่อน</b> · Best TGV ${fmt(previous.bestTgv)} XV · รายได้รวม ${baht(previous.totalIncome)} · Organization ${fmt(previous.organizationSize)}</div>`;
  }
}

function patchReleaseUi() {
  patchVersionLabels();
  const state = stateNow();
  if (!state) return;
  patchScoreFinale(state);
  if (state.organizationMode) {
    patchOrganizationBoard(state);
    patchOrganizationDialog(state);
  } else {
    patchNewGamePlusIntro(state);
  }
}

async function submitScoreV1() {
  const state = stateNow();
  const score = state?.campaignScore;
  if (!score?.locked) return;
  const input = $('[data-v9-score-name]');
  const status = $('[data-v9-score-status]');
  const displayName = String(input?.value || '').trim().slice(0, 28);
  if (!displayName) {
    if (status) status.textContent = 'ใส่ชื่อเล่นก่อนส่ง High Score';
    input?.focus();
    return;
  }
  if (status) status.textContent = 'กำลังส่ง High Score…';
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
    if (status) status.textContent = `✅ ส่ง High Score แล้วในชื่อ ${displayName}`;
    const button = $('[data-v1-submit-score]');
    if (button) button.textContent = 'ส่งชื่ออีกครั้ง';
  } catch {
    if (status) status.textContent = 'บันทึกคะแนนในเครื่องแล้ว แต่ส่ง Scoreboard ไม่สำเร็จ · ลองส่งอีกครั้งได้';
  }
}

document.addEventListener('click', (event) => {
  const submit = event.target.closest('[data-v1-submit-score]');
  if (submit) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScoreV1();
    return;
  }
  const pass = event.target.closest('[data-v1-org-pass]');
  if (pass) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatchForDebug(EVENTS.END_MONTH);
    return;
  }
  const ng = event.target.closest('[data-v1-new-game-plus]');
  if (ng) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatchForDebug(EVENTS.NEW_GAME_PLUS);
  }
}, true);

const style = document.createElement('style');
style.textContent = `
  .v1-org-rhythm{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.v1-org-rhythm span{padding:6px 9px;border:1px solid #bdd0c8;border-radius:999px;background:#f1f7f2;font-weight:800}
  .v1-org-grid,.v1-finale-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.v1-org-grid>div,.v1-finale-grid>div{padding:10px;border:1px solid #c9d7d1;border-radius:10px;background:#fff}.v1-org-grid span,.v1-finale-grid span{display:block;font-size:12px;color:#60777f}.v1-org-grid strong,.v1-finale-grid strong{font-size:18px}.v1-leader{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #dfe7e3}.v1-ng-score{margin-top:8px;padding:9px;border-radius:9px;background:#eef7f0}
  @media(max-width:700px){.v1-org-grid,.v1-finale-grid{grid-template-columns:1fr 1fr}.income-history .table-scroll{overflow:visible}.income-history table{min-width:0!important;width:100%}.income-history th:nth-child(3),.income-history th:nth-child(4),.income-history th:nth-child(5),.income-history td:nth-child(3),.income-history td:nth-child(4),.income-history td:nth-child(5){display:none}}
`;
document.head.appendChild(style);

const observer = new MutationObserver(queuePatch);
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-stage', 'open'] });
queuePatch();
console.info('[X-VISOR QUEST 1.0]', { saveVersion: '1.0', scoreVersion: V1_SCORE_VERSION });
