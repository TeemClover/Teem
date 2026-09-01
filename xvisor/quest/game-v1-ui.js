import { dispatchForUi } from './game.js';
import {
  EVENTS,
  SAVE_KEY,
  V1_SCORE_VERSION,
  parseSavedState,
} from './game-data-v1.js?v=1.0';

const $ = (selector, root = document) => root.querySelector(selector);
const SCORE_SENT_PREFIX = 'mc_xvisor_1_score_sent:';
let patchQueued = false;

function fmt(value) { return Math.round(Number(value || 0)).toLocaleString('th-TH'); }
function baht(value) { return `฿${fmt(value)}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

function stateNow() {
  try { return parseSavedState(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

function setText(node, value) {
  if (node && node.textContent !== String(value)) node.textContent = String(value);
}

function setHtml(node, value) {
  if (node && node.innerHTML !== value) node.innerHTML = value;
}

function setHidden(node, hidden) {
  if (node && node.hidden !== Boolean(hidden)) node.hidden = Boolean(hidden);
}

function queuePatch() {
  if (patchQueued) return;
  patchQueued = true;
  requestAnimationFrame(() => {
    patchQueued = false;
    patchReleaseUi();
  });
}

function claimVersionLabels() {
  const app = $('#gameApp');
  if (app?.dataset.gameVersion !== '1.0') app.dataset.gameVersion = '1.0';
  const chip = $('.rank-chip[aria-label="เวอร์ชันเกม"], .rank-chip[data-release-version="1.0"]');
  if (chip) chip.dataset.releaseVersion = '1.0';
  setText(chip, '1.0');
  setText($('.world-frame__label b, .v1-world-version'), '1.0');

  setText($('.game-footer > span:last-child'), '1.0 · บันทึกอัตโนมัติบนอุปกรณ์นี้');
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
  if (kicker?.textContent?.includes('MONTH 12')) setText(kicker, '🏆 MONTH 12 · X-VISOR QUEST 1.0');
  const quote = dialog.querySelector('.v9-quote');
  if (quote && !dialog.querySelector('.v1-revelation-story')) {
    quote.insertAdjacentHTML('afterend', `<div class="v1-revelation-story" aria-label="เส้นทาง 12 เดือน">
      <span><b>01</b> คนเดียว</span><i>→</i><span><b>02</b> ลูกค้า</span><i>→</i><span><b>03</b> ทีม</span><i>→</i><span><b>04</b> Organization</span>
    </div>`);
  }
}

function organizationReportHtml(report) {
  if (!report) return '<p>กด <b>ผ่านไปอีก 1 เดือน</b> แล้วระบบจะรันงานประจำองค์กรให้ครบในครั้งเดียว</p>';
  const xircle = report.activities?.xircle ? '<span>🏕️ The Xircle ×1</span>' : '';
  return `<div class="v1-org-report">
    <div class="v1-report-headline"><div><span>🏙️ TGV · MONTH ${report.month}</span><strong>${fmt(report.tgv)} XV</strong></div><div><span>💰 รายได้เดือนนี้</span><strong>${baht(report.income)}</strong></div></div>
    <div class="v1-org-grid">
      <div><span>🆕 ลูกค้าใหม่</span><strong>${fmt(report.newCustomers)}</strong></div>
      <div><span>📦 RoutineX Repeat</span><strong>${fmt(report.repeatCustomers)}</strong></div>
      <div><span>👥 Referral</span><strong>${fmt(report.referrals)}</strong></div>
      <div><span>🎓 Candidate ใหม่</span><strong>${fmt(report.candidates)}</strong></div>
      <div><span>🌱 X-VISOR ใหม่</span><strong>+${fmt(report.newXvisors)}</strong></div>
      <div><span>👑 XLEAD ใหม่</span><strong>+${fmt(report.newXleads)}</strong></div>
    </div>
    <p class="v1-story-note">${report.newXleads ? `👑 ทีมสร้างผู้นำใหม่ ${fmt(report.newXleads)} คน` : report.newXvisors ? `🌱 ทีมสร้าง X-VISOR ใหม่ ${fmt(report.newXvisors)} คน` : report.newCustomers ? `❤️ ทีมสร้างลูกค้าใหม่ ${fmt(report.newCustomers)} คน` : '🌱 ระบบยังเดินต่อจากทีมที่คุณสร้างไว้'}</p>
    <details class="v1-rhythm-details"><summary>สิ่งที่ระบบทำให้เดือนนี้</summary><div class="v1-org-rhythm"><span>🎓 Xcademy ×4</span><span>🏠 Open House ×1</span>${xircle}</div></details>
  </div>`;
}

function roleLabel(member) {
  if (member.rank === 'xlead') return '👑 XLEAD';
  return member.specialtyLabel || ({ sales: '💰 ขายเก่ง', care: '❤️ ดูแลเก่ง', builder: '🌱 สร้างทีมเก่ง', balanced: '⚖️ สมดุล' })[member.specialty] || '⚖️ สมดุล';
}

function twoYearFinaleHtml(state) {
  return `<div class="dialog-kicker">🏁 MONTH 24 · TRUE ENDING</div>
    <h2>2 ปีต่อมา — ระบบเดินได้ไกลกว่าคนเดียว</h2>
    ${finaleDetails(state)}
    <p class="dialog-note">NEW GAME+ จะข้าม PRE-SEASON เริ่ม Month 1 ทันที และเปิด Management เต็มรูปแบบเพื่อทำลายสถิติเดิม</p>
    <button class="dialog-button" type="button" data-v9-close>กลับไปกด ⚡ NEW GAME+</button>`;
}

function organizationDialogHtml(state) {
  if (state.runComplete) return twoYearFinaleHtml(state);
  const report = state.lastOrganizationReport;
  const agg = state.organization?.aggregate || {};
  const leaders = (state.team || []).filter((member) => member.active !== false)
    .sort((a, b) => Number(b.personalXV || 0) - Number(a.personalXV || 0)).slice(0, 8);
  return `<div class="dialog-kicker">🏙️ ORGANIZATION YEAR · MONTH ${state.month}</div>
    <h2>ระบบที่สร้างไว้กำลังเดินต่อ</h2>
    ${organizationReportHtml(report)}
    <div class="v1-org-grid v1-org-grid--totals">
      <div><span>❤️ Active Customers</span><strong>${fmt(agg.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR ทั้งองค์กร</span><strong>${fmt(agg.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(agg.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt(agg.organizationSize ?? agg.xvisorCount)}</strong></div>
    </div>
    <section class="work-section"><h3>คนที่กำลังสร้างผลลัพธ์</h3><div class="income-breakdown">${leaders.map((member) => `<div class="v1-leader"><span><b>${escapeHtml(member.name)}</b><small>${escapeHtml(roleLabel(member))}</small></span><b>${fmt(member.personalXV)} XV</b></div>`).join('') || '<p>ยังไม่มีทีม</p>'}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`;
}

function patchOrganizationDialog(state) {
  const dialog = $('#gameDialog');
  const content = $('#dialogContent');
  if (!dialog?.open || !content || dialog.dataset.v9Dialog !== 'organization') return;
  const key = `${state.month}:${state.lastOrganizationReport?.month || 0}:${state.runComplete ? 1 : 0}`;
  if (dialog.dataset.v1OrganizationKey === key) return;
  dialog.dataset.v1OrganizationKey = key;
  setHtml(content, organizationDialogHtml(state));
}

function finaleDetails(state) {
  const summary = state.twoYearSummary || {};
  return `<div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt(summary.activeCustomers)} ลูกค้า · ${fmt(summary.xvisorCount)} X-VISOR · ${fmt(summary.xleadCount)} XLEAD</strong></div></div>
  <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
    <div><span>🏙️ Month 24 TGV</span><strong>${fmt(summary.month24TGV)} XV</strong></div>
    <div><span>💰 Month 24 Income</span><strong>${baht(summary.month24Income)}</strong></div>
    <div><span>❤️ Active Customers</span><strong>${fmt(summary.activeCustomers)}</strong></div>
    <div><span>🌱 X-VISOR</span><strong>${fmt(summary.xvisorCount)}</strong></div>
    <div><span>👑 XLEAD</span><strong>${fmt(summary.xleadCount)}</strong></div>
    <div><span>💰 รายได้สะสม 2 ปี</span><strong>${baht(summary.totalIncome)}</strong></div>
  </div><blockquote class="v1-ending-quote">คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง</blockquote>`;
}

function patchOrganizationBoard(state) {
  if (!state.organizationMode) return;
  const report = state.lastOrganizationReport;
  const agg = state.organization?.aggregate || {};

  // Year 2 has exactly one gameplay button. Remove the legacy header trigger entirely.
  // NEW GAME+ reloads the page, so Campaign gets a fresh header button again.
  $('#monthButton')?.remove();
  setHidden($('#hudEnergyButton'), true);

  const teamChip = $('#teamChip');
  setHidden(teamChip, false);
  setText(teamChip, `ทีม ${fmt(agg.xvisorCount)} X-VISOR · ${fmt(agg.xleadCount)} XLEAD`);
  setText($('#hudCustomers'), `${fmt(agg.activeCustomers)} คน`);
  setText($('#hudVolumeLabel'), report ? `🏙️ TGV ล่าสุด · M${report.month}` : '🏙️ TGV เดือนนี้');
  setText($('#hudXV'), `${fmt(report?.tgv)} XV`);
  setText($('.status-item--income span'), 'รายได้ล่าสุด · สะสม');
  setText($('#hudIncome'), `${baht(report?.income)} · Σ${baht(state.economy?.totalIncome)}`);

  const people = $('#peopleButton');
  if (people) {
    setHidden(people, false);
    setHtml(people, `Organization <b>${fmt(agg.xvisorCount)}</b>`);
  }
  setText($('#goalEyebrow'), state.runComplete ? 'จบเส้นทาง 24 เดือน' : 'YEAR 2 · ORGANIZATION');
  setText($('#goalTitle'), state.runComplete ? '🏁 2 ปีผ่านไปแล้ว' : `Organization Year · เดือน ${state.month}`);
  setText($('#goalReason'), state.runComplete
    ? 'รอบหน้า คุณไม่ต้องเริ่มจากการเรียนรู้แล้ว — คุณเริ่มจากประสบการณ์'
    : 'กดครั้งเดียว ระบบจะทำ Xcademy ×4, Open House ×1 และ The Xircle ตามรอบ แล้วสรุปผลงานทั้งเดือน');
  setText($('#dialogueSpeaker'), state.runComplete ? '24-MONTH FINALE' : 'ORGANIZATION REPORT');
  setText($('#dialogueText'), state.runComplete
    ? 'ปีแรกคุณสร้างระบบ ปีที่สองระบบเริ่มเดินต่อ ถึงเวลาลองเริ่มใหม่พร้อมประสบการณ์ทั้งหมด'
    : report ? `เดือน ${report.month} ผ่านไปแล้ว · ทีมสร้างลูกค้าใหม่ ${fmt(report.newCustomers)} · X-VISOR +${fmt(report.newXvisors)} · XLEAD +${fmt(report.newXleads)}` : 'จากนี้คุณไม่ต้องขายหรือตามใครทีละคนแล้ว');

  const details = $('#sceneDetails');
  setHtml(details, state.runComplete ? finaleDetails(state) : organizationReportHtml(report));
  setText($('.action-dock__heading span'), state.runComplete ? 'เล่นให้ดีกว่าเดิม' : 'เดินระบบองค์กร');
  setText($('.action-dock__heading small'), state.runComplete ? 'เริ่มรอบใหม่ทันที' : 'หนึ่งปุ่ม · หนึ่งเดือน');

  const actionBar = $('#actionBar');
  if (!actionBar) return;
  const mode = state.runComplete ? 'complete' : `month-${state.month}`;
  if (actionBar.dataset.v1Mode === mode && actionBar.querySelector(state.runComplete ? '[data-v1-new-game-plus]' : '[data-v1-org-pass]')) return;
  actionBar.dataset.v1Mode = mode;
  setHtml(actionBar, state.runComplete
    ? '<button class="action-button action-button--primary" type="button" data-v1-new-game-plus><span class="action-button__icon">⚡</span><span class="action-button__copy"><strong>⚡ NEW GAME+</strong><small>ข้าม PRE-SEASON · เริ่ม Month 1 · ทำลายสถิติเดิม</small></span></button>'
    : '<button class="action-button action-button--primary" type="button" data-v1-org-pass><span class="action-button__icon" aria-hidden="true">▶</span><span class="action-button__copy"><strong>ผ่านไปอีก 1 เดือน</strong><small>Xcademy ×4 · Open House ×1 · The Xircle ตามรอบ · สรุปครั้งเดียว</small></span></button>');
}

function patchNewGamePlusIntro(state) {
  if (state.runMode !== 'NEW_GAME_PLUS' || state.month !== 1 || state.organizationMode) return;
  setText($('#goalEyebrow'), '⚡ NEW GAME+');
  setText($('#goalTitle'), 'เริ่ม Month 1 ทันที — ทำลายสถิติเดิม');
  setText($('#goalReason'), 'ข้าม PRE-SEASON · Certified X-VISOR แล้ว · เปิด Management เต็มรูปแบบ');
  const previous = state.previousRunScore;
  if (previous) setHtml($('#sceneDetails'), `<div class="v1-ng-score"><span>สถิติที่ต้องชนะ</span><strong>Best TGV ${fmt(previous.bestTgv)} XV</strong><small>รายได้รวม ${baht(previous.totalIncome)} · Organization ${fmt(previous.organizationSize)}</small></div><div class="v1-ng-promises"><span>✓ Certified แล้ว</span><span>✓ เริ่ม Month 1</span><span>✓ อิสระเต็มรูปแบบ</span></div>`);
}

function patchReleaseUi() {
  claimVersionLabels();
  const state = stateNow();
  if (!state) return;
  document.body.dataset.releaseMoment = state.runComplete ? 'month24' : state.campaignScore?.locked && !state.organizationMode ? 'month12' : state.runMode === 'NEW_GAME_PLUS' && state.month === 1 ? 'new-game-plus' : 'play';
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
    setText(status, 'ใส่ชื่อเล่นก่อนส่ง High Score');
    input?.focus();
    return;
  }
  setText(status, 'กำลังส่ง High Score…');
  try {
    const response = await fetch('/api/xvisor-scores', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
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
    setText(status, `✅ ส่ง High Score แล้วในชื่อ ${displayName}`);
    setText($('[data-v1-submit-score]'), 'ส่งชื่ออีกครั้ง');
  } catch {
    setText(status, 'บันทึกคะแนนในเครื่องแล้ว แต่ส่ง Scoreboard ไม่สำเร็จ · ลองส่งอีกครั้งได้');
  }
}

document.addEventListener('click', (event) => {
  const submit = event.target.closest('[data-v1-submit-score]');
  if (submit) {
    event.preventDefault(); event.stopImmediatePropagation(); submitScoreV1(); return;
  }
  const pass = event.target.closest('[data-v1-org-pass]');
  if (pass) {
    event.preventDefault(); event.stopImmediatePropagation();
    document.body.classList.add('is-month-passing');
    dispatchForUi(EVENTS.END_MONTH);
    window.setTimeout(() => document.body.classList.remove('is-month-passing'), 720);
    return;
  }
  const ng = event.target.closest('[data-v1-new-game-plus]');
  if (ng) {
    event.preventDefault(); event.stopImmediatePropagation();
    document.body.classList.add('is-ng-transition');
    dispatchForUi(EVENTS.NEW_GAME_PLUS);
    window.setTimeout(() => location.reload(), 520);
  }
}, true);

const observer = new MutationObserver(queuePatch);
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-stage', 'open'] });
queuePatch();
