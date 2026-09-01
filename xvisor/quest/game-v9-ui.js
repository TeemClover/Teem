import { dispatchForUi } from './game.js';
import {
  CUSTOMER_STATES,
  EVENTS,
  PEOPLE_RENDER_LIMIT,
  SAVE_KEY,
  V9_SCORE_VERSION,
  buildPersonAction,
  calculateEconomy,
  findPerson,
  getPersonContextAction,
  getRolling3TGV,
  getTgvHistory,
  parseSavedState,
} from './game-data-v9.js?v=1.0-core';
import { getSkillSnapshot } from './game-progression-v8.js?v=1.0-core';

const PROFILE_KEY = 'mc_xvisor_certified';
const SCORE_SENT_PREFIX = 'mc_xvisor_1_score_sent:';
const $ = (selector, root = document) => root.querySelector(selector);
const dialog = $('#gameDialog');
const dialogContent = $('#dialogContent');
let peopleTab = 'priority';
let peopleQuery = '';
let peoplePage = 0;
let peopleFocusId = null;
let cloudSyncAttempted = false;
let patchQueued = false;

const PERSON_EVENTS = new Set([
  EVENTS.CONTACT_PROSPECT, EVENTS.MEET_PROSPECT, EVENTS.CONSULT_PROSPECT,
  EVENTS.BASELINE_PROSPECT, EVENTS.OPEN_MANAGEMENT_ROUTINE, EVENTS.OFFER_PROSPECT,
  EVENTS.FOLLOW_UP_DECISION, EVENTS.CARE_CUSTOMER, EVENTS.REMEASURE_CUSTOMER,
  EVENTS.REORDER_CUSTOMER, EVENTS.ASK_REFERRAL, EVENTS.INVITE_XVISOR,
  EVENTS.START_CANDIDATE_XCADEMY, EVENTS.REVIEW_CANDIDATE, EVENTS.CERTIFY_CANDIDATE,
  EVENTS.MENTOR_TEAM_MEMBER,
]);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
function fmt(value) { return Math.round(Number(value || 0)).toLocaleString('th-TH'); }
function baht(value) { return `฿${fmt(value)}`; }

function stateNow() {
  try { return parseSavedState(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

function profileCertified() {
  try { return localStorage.getItem(PROFILE_KEY) === '1'; } catch { return false; }
}

function scoreSentKey(runId) { return `${SCORE_SENT_PREFIX}${runId || 'unknown'}`; }
function submittedName(runId) {
  try { return localStorage.getItem(scoreSentKey(runId)) || ''; } catch { return ''; }
}

function hardClose() {
  if (dialog?.open) dialog.close();
  if (dialogContent) dialogContent.innerHTML = '';
  if (dialog) {
    delete dialog.dataset.peopleTab;
    delete dialog.dataset.v9Dialog;
  }
  peopleFocusId = null;
  document.body.style.removeProperty('overflow');
  requestAnimationFrame(() => $('#actionBar button, #peopleButton, #monthButton')?.focus?.());
}

function showDialog(html, kind = 'wide', key = 'v9') {
  if (!dialog || !dialogContent) return;
  dialogContent.innerHTML = html;
  dialog.dataset.kind = kind;
  dialog.dataset.v9Dialog = key;
  document.body.style.overflow = 'hidden';
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector('button, input')?.focus?.());
}

function originLabel(person) {
  const origin = person.origin || {};
  if (origin.sourceName) return origin.sourceName;
  const source = origin.sourceType || person.source;
  return ({ known: 'คนที่คุณรู้จัก', referral: 'Referral', content: 'Content', ads: 'Ads', event: 'Open House / Event', team: 'ทีมพามา', tutorial: 'Month 1' })[source] || 'Journey ในเกม';
}

function peopleRows(state) {
  const rows = [
    ...(state.prospects || []).map((person) => ({ person, kind: 'prospect' })),
    ...(state.customers || []).map((person) => ({ person, kind: 'customer' })),
    ...(state.team || []).map((person) => ({ person, kind: 'team' })),
  ];
  const priority = { prospect: 1, customer: 2, team: 3 };
  const unique = new Map();
  for (const row of rows) {
    const key = row.person.personId || row.person.id;
    if (!unique.has(key) || priority[row.kind] > priority[unique.get(key).kind]) unique.set(key, row);
  }
  return [...unique.values()];
}

function categoryFor(row) {
  const { person, kind } = row;
  if (kind === 'team') {
    if (person.rank === 'xlead' || Number(person.leaderReadiness || 0) >= 65) return 'grow';
    if (Number(person.autonomy || 0) < 55) return 'priority';
    return 'stable';
  }
  if (kind === 'customer') {
    const sat = Number(person.satisfaction || 0);
    if (sat < 55 || person.customerState === CUSTOMER_STATES.NEEDS_HELP) return 'priority';
    if (person.xvisorInterest || person.xvisorStage || person.referralReady) return 'opportunity';
    if (sat >= 75 || person.selfDirected) return 'stable';
    return 'priority';
  }
  if (['recommendation', 'waiting', 'discovery', 'baseline'].includes(person.journey)) return 'opportunity';
  return ['new', 'scheduled', 'conversation'].includes(person.journey) ? 'grow' : 'stable';
}

function actionButton(action, person) {
  if (!action) return '';
  const state = stateNow();
  const disabled = Number(action.cost || 0) > Number(state?.energy || 0) && !state?.organizationMode;
  return `<button class="work-button" type="button" data-work-event="${escapeHtml(action.event)}" data-id="${escapeHtml(person.id)}"${disabled ? ' disabled' : ''}><strong>${escapeHtml(action.label)}</strong><span>${escapeHtml(action.reason || person.status || '')}</span>${action.cost ? `<b>⚡ ${action.cost}</b>` : ''}</button>`;
}

function rowCard(row, state) {
  const { person, kind } = row;
  const action = getPersonContextAction(state, person, kind);
  const actionHtml = actionButton(action, person);
  if (kind === 'team') {
    return `<article class="people-card people-card--team"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>${escapeHtml(person.rank === 'xlead' ? 'XLEAD' : 'Certified X-VISOR')} · ${escapeHtml(person.specialtyLabel || '⚖️ สมดุล')}</span></div><b>${person.active ? 'กำลังทำงาน' : 'พักอยู่'}</b></div><dl><div><dt>Personal XV</dt><dd>${fmt(person.personalXV)}</dd></div><div><dt>ลูกค้า</dt><dd>${fmt(person.customers)}</dd></div><div><dt>ทีมย่อย</dt><dd>${fmt(person.downstreamXvisors)}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml(originLabel(person))}</dd></div></dl>${actionHtml || '<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>'}</article>`;
  }
  if (kind === 'customer') {
    return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>ลูกค้า · ❤️ ${fmt(person.satisfaction)}%</span></div><b>${escapeHtml(person.status || '')}</b></div><dl><div><dt>ความพอใจ</dt><dd>${fmt(person.satisfaction)}%</dd></div><div><dt>Routine</dt><dd>${person.selfDirected ? 'เดินเองได้' : 'กำลังดูแล'}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml(originLabel(person))}</dd></div></dl>${actionHtml || '<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>'}</article>`;
  }
  return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>${escapeHtml(person.journey || 'Prospect')}</span></div><b>${escapeHtml(person.status || '')}</b></div><dl><div><dt>เปิดใจ</dt><dd>${fmt(person.readiness)}%</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml(originLabel(person))}</dd></div></dl>${actionHtml}</article>`;
}

function renderPeople(focusId = peopleFocusId) {
  const state = stateNow();
  if (!state) return;
  if (state.organizationMode) return renderOrganization();
  peopleFocusId = focusId || null;
  const rows = peopleRows(state);
  const query = peopleQuery.trim().toLocaleLowerCase('th');
  const filtered = rows.filter((row) => {
    if (peopleFocusId && row.person.id !== peopleFocusId && row.person.personId !== peopleFocusId) return false;
    if (query && !String(row.person.name || '').toLocaleLowerCase('th').includes(query)) return false;
    return peopleFocusId || peopleTab === 'all' || categoryFor(row) === peopleTab;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PEOPLE_RENDER_LIMIT));
  peoplePage = Math.max(0, Math.min(peoplePage, pages - 1));
  const visible = filtered.slice(peoplePage * PEOPLE_RENDER_LIMIT, (peoplePage + 1) * PEOPLE_RENDER_LIMIT);
  const aggregate = state.organization?.aggregate;
  showDialog(`<div class="dialog-kicker">👥 คนของคุณ · ${fmt(rows.length)}${aggregate?.overflowPeople ? ` + ${fmt(aggregate.overflowPeople)} ใน Organization` : ''}</div><h2>${peopleFocusId ? 'รายละเอียดและ Next Action' : 'ดูเฉพาะคนที่มีเหตุผลให้ดูตอนนี้'}</h2><p class="dialog-note">หน้าจอนี้ render สูงสุด ${PEOPLE_RENDER_LIMIT} คนต่อครั้ง ไม่ว่าทีมจะใหญ่แค่ไหน</p>
    ${peopleFocusId ? `<button class="people-back" type="button" data-v9-clear-focus>← กลับไปรายชื่อ</button>` : `<div class="people-tabs" role="tablist">${[['priority','🔴 ต้องช่วย'],['opportunity','💰 โอกาสดี'],['grow','✨ มีแววโต'],['stable','✅ เดินเองได้'],['all','ทั้งหมด']].map(([id,label]) => `<button type="button" data-v9-people-tab="${id}" aria-selected="${peopleTab === id}">${label}</button>`).join('')}</div><label class="people-search">ค้นหาชื่อ <input type="search" data-v9-people-search value="${escapeHtml(peopleQuery)}" placeholder="เช่น เมย์"></label>`}
    <div class="people-grid">${visible.map((row) => rowCard(row, state)).join('') || '<p class="work-empty">ไม่มีคนในกลุ่มนี้</p>'}</div>
    <div class="dialog-actions">${peopleFocusId ? '' : `<button class="dialog-button dialog-button--secondary" type="button" data-v9-page="prev" ${peoplePage <= 0 ? 'disabled' : ''}>← ก่อนหน้า</button><span>${peoplePage + 1} / ${pages}</span><button class="dialog-button dialog-button--secondary" type="button" data-v9-page="next" ${peoplePage >= pages - 1 ? 'disabled' : ''}>ถัดไป →</button>`}<button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button></div>`, 'wide', 'people');
}

function renderOrganization() {
  const state = stateNow();
  if (!state) return;
  const economy = calculateEconomy(state);
  const agg = state.organization?.aggregate || {};
  const leaders = (state.team || []).filter((member) => member.parentId === 'player' || member.rank === 'xlead').slice(0, 12);
  showDialog(`<div class="dialog-kicker">🏙️ ORGANIZATION MODE · MONTH ${state.month}</div><h2>${fmt(economy.tgv)} XV · ${baht(economy.projectedIncome)}</h2><p class="dialog-note">หลัง Month 12 ระบบเก็บรายคนเฉพาะ Direct G1 / XLEAD / คนสำคัญ ส่วนองค์กรลึกเป็น aggregate</p>
    <div class="income-sections"><section><div class="income-heading"><span>❤️ Active Customers</span><b>${fmt(agg.activeCustomers)}</b></div></section><section><div class="income-heading"><span>🌱 X-VISOR</span><b>${fmt(agg.xvisorCount)}</b></div></section><section><div class="income-heading"><span>👑 XLEAD</span><b>${fmt(agg.xleadCount)}</b></div></section><section><div class="income-heading"><span>ทีมทำงานเอง</span><b>${fmt(state.monthStats?.teamActions)}</b></div><p>เป็นสถิติ aggregate ไม่ใช่ task objects</p></section></div>
    <section class="work-section"><h3>ผู้นำที่ยังเก็บเป็นรายคน</h3><div class="people-grid">${leaders.map((member) => rowCard({ person: member, kind: 'team' }, state)).join('') || '<p>ยังไม่มีผู้นำที่ต้อง drill-down</p>'}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`, 'wide', 'organization');
}

function renderIncome() {
  const state = stateNow();
  if (!state) return;
  const economy = calculateEconomy(state);
  const top = (economy.mentoringBreakdown || []).slice().sort((a, b) => b.mentorIncome - a.mentorIncome).slice(0, 5);
  const history = [...(economy.incomeHistory || [])].reverse().slice(0, 12);
  const historyCards = history.map((item) => `<details class="income-history-card"><summary><span>เดือน ${item.month}</span><span>${fmt(item.tgv)} XV</span><b>${baht(item.total)}</b></summary><div><span>① ลูกค้า <b>${baht(item.channel1)}</b></span><span>② พัฒนา G1 <b>${baht(item.channel2)}</b></span><span>③ Organization <b>${baht(item.channel3)}</b></span></div></details>`).join('');
  showDialog(`<div class="dialog-kicker">REVENUE STACK · 1.0</div><h2>เดือนนี้ ${baht(economy.projectedIncome)}</h2>
    <div class="revenue-hero"><div><span>💰 รายได้เดือนนี้</span><strong>${baht(economy.projectedIncome)}</strong></div><div><span>∑ รายได้สะสม</span><strong>${baht(economy.lifetimeIncome)}</strong></div></div>
    <div class="income-sections">
      <section><div class="income-heading"><span>① ขายและดูแลลูกค้า</span><b>${baht(economy.channel1)}</b></div><p>ยอดขาย ${baht(economy.personalSalesBaht)} × ${escapeHtml(economy.tier?.label || 'tier ปัจจุบัน')} · XV ${fmt(economy.personalXV)} ใช้เป็น Volume แยกจากยอดบาท</p></section>
      <section><div class="income-heading"><span>② พัฒนา Direct G1 ${economy.mentoringUnlocked ? '' : '· รอ Certified XLEAD'}</span><b>${economy.mentoringUnlocked ? baht(economy.channel2) : '🔒'}</b></div><p>20% ของ commission G1 แต่ละคน</p>${economy.mentoringUnlocked ? `<ul class="income-breakdown">${top.map((item) => `<li><span>${escapeHtml(item.name)} · ${fmt(item.personalXV)} XV · คอม ${baht(item.commission)}</span><b>${baht(item.mentorIncome)}</b></li>`).join('') || '<li><span>G1 ยังไม่มียอดเดือนนี้</span><b>฿0</b></li>'}</ul>` : ''}</section>
      <section><div class="income-heading"><span>③ บริหาร Organization ${state.career?.xgenCertified ? '' : '· รอ Certified XGEN'}</span><b>${state.career?.xgenCertified ? baht(economy.channel3) : '🔒'}</b></div><p>5% ของ TGV <b>เดือนปัจจุบันเท่านั้น</b> · ปิดเดือนแล้วไม่จ่ายยอดเดิมซ้ำ</p></section>
    </div>
    <section class="income-history"><h3>ย้อนหลังรายเดือน</h3>${history.length ? `<div class="income-history-cards">${historyCards}</div><div class="table-scroll income-history-table"><table><thead><tr><th>เดือน</th><th>TGV</th><th>①</th><th>②</th><th>③</th><th>รวม</th></tr></thead><tbody>${history.map((item) => `<tr><th>${item.month}</th><td>${fmt(item.tgv)} XV</td><td>${baht(item.channel1)}</td><td>${baht(item.channel2)}</td><td>${baht(item.channel3)}</td><td><b>${baht(item.total)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p>ปิดเดือนแรกเพื่อเริ่มเก็บประวัติรายได้</p>'}</section>
    <p class="dialog-note">ตัวเลขเชิงพาณิชย์อ่านจาก config ของเกมและมีสถานะจำลอง / TO_CONFIRM ไม่ใช่การรับประกันรายได้จริง</p>
    <button class="dialog-button" type="button" data-v9-close>กลับเกม</button>`, 'wide', 'income');
}

function renderTgvHelp() {
  const state = stateNow();
  if (!state) return;
  const history = getTgvHistory(state);
  const last = history.at(-1);
  const best = history.reduce((max, entry) => Math.max(max, Number(entry.tgv || 0)), 0);
  showDialog(`<div class="dialog-kicker">🏙️ TGV</div><h2>ยอด XV ของคุณและทีมในเดือนนี้</h2><p class="term-definition">TGV เริ่มใหม่ทุกเดือน เดือนที่ปิดไปแล้วจะเก็บไว้เป็นสถิติและจะไม่ถูกนำมาจ่ายซ้ำ</p><div class="summary-grid"><div><span>เดือนนี้</span><strong>${fmt(calculateEconomy(state).tgv)} XV</strong></div><div><span>เดือนที่แล้ว</span><strong>${fmt(last?.tgv)} XV</strong></div><div><span>Best TGV</span><strong>${fmt(best)} XV</strong></div>${state.career?.xgenQualified ? `<div><span>3-Month TGV</span><strong>${fmt(getRolling3TGV(state))} XV</strong></div>` : ''}</div><button class="dialog-button" type="button" data-v9-close>เข้าใจแล้ว</button>`, 'wide', 'tgv');
}

function renderMonthConfirm() {
  const state = stateNow();
  if (!state) return;
  if (state.organizationMode) {
    hardClose();
    dispatchForUi(EVENTS.END_MONTH);
    return;
  }
  const economy = calculateEconomy(state);
  showDialog(`<div class="dialog-kicker">🌙 จบเดือน ${state.month}</div><h2>จบเดือน ${state.month} ตอนนี้ไหม?</h2><div class="summary-grid"><div><span>🏙️ TGV เดือนนี้</span><strong>${fmt(economy.tgv)} XV</strong></div><div><span>💰 คาดว่าจะได้รับ</span><strong>${baht(economy.projectedIncome)}</strong></div></div><p class="dialog-note">⚡ พลังงานที่เหลือ ${fmt(state.energy)} จะไม่ทบไปเดือนหน้า</p><div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v9-close>← กลับกระดาน</button><button class="dialog-button" type="button" data-v9-end-month>🌙 จบเดือน</button></div>`, 'wide', 'month');
}

function finaleHtml(state, status = '') {
  const score = state.campaignScore || {};
  const sent = submittedName(state.runId);
  const name = sent || '';
  return `<div class="dialog-kicker">🏆 MONTH 12 · REVELATION</div><h2>12 เดือนแรกจบแล้ว</h2><p class="v9-revelation">คุณเริ่มจากคนเดียว → ลูกค้าเริ่มเดิน Routine เอง → X-VISOR เริ่มดูแลลูกค้าของตัวเอง → XLEAD เริ่มพัฒนาคน → Organization เริ่มเดินโดยไม่ต้องรอคุณทุกเรื่อง</p><blockquote class="v9-quote">คุณไม่ได้หยุดทำธุรกิจ แต่ธุรกิจไม่ต้องรอคุณทำทุกอย่างด้วยตัวเองอีกแล้ว</blockquote>
    <div class="v9-score-grid"><div><span>🏆 Best TGV</span><strong>${fmt(score.bestTgv)} XV</strong></div><div><span>💰 รายได้รวม 12 เดือน</span><strong>${baht(score.totalIncome)}</strong></div><div><span>💎 สูงสุด / เดือน</span><strong>${baht(score.bestMonthlyIncome)}</strong></div><div><span>🏙️ Organization</span><strong>${fmt(score.organizationSize)} คน</strong></div></div>
    <label class="v9-score-name">ชื่อบน Scoreboard <input type="text" maxlength="28" data-v9-score-name value="${escapeHtml(name)}" placeholder="ชื่อเล่น"></label>
    <p class="dialog-note" data-v9-score-status>${sent ? `✅ ส่ง High Score แล้วในชื่อ ${escapeHtml(sent)}` : escapeHtml(status || 'ใส่ชื่อเล่นแล้วส่งคะแนนได้เลย · ไม่ต้องสมัครสมาชิก')}</p>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v9-new-run>↺ เล่นใหม่</button><button class="dialog-button" type="button" data-v9-submit-score>${sent ? 'ส่งชื่ออีกครั้ง' : '🏆 ส่ง High Score'}</button><button class="dialog-button" type="button" data-v9-enter-org>▶ เล่นต่อใน Organization Mode</button></div>`;
}

function showFinale(status = '') {
  const state = stateNow();
  if (!state?.campaignScore?.locked || state.organizationMode) return;
  showDialog(finaleHtml(state, status), 'wide', 'finale');
}

async function submitScore() {
  const state = stateNow();
  if (!state?.campaignScore?.locked) return;
  const input = $('[data-v9-score-name]', dialog);
  const name = String(input?.value || '').trim().slice(0, 28);
  if (!name) return showFinale('กรอกชื่อเล่นก่อนส่ง High Score');
  const status = $('[data-v9-score-status]', dialog);
  if (status) status.textContent = 'กำลังส่ง High Score…';
  try {
    const response = await fetch('/api/xvisor-scores', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: name,
        runId: state.runId,
        scoreVersion: V9_SCORE_VERSION,
        runMode: state.campaignScore.runMode,
        completedAt: state.campaignScore.completedAt,
        bestTgv: state.campaignScore.bestTgv,
        totalIncome: state.campaignScore.totalIncome,
        bestMonthlyIncome: state.campaignScore.bestMonthlyIncome,
        organizationSize: state.campaignScore.organizationSize,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'SUBMIT_FAILED');
    try { localStorage.setItem(scoreSentKey(state.runId), name); } catch { /* local retry remains possible */ }
    showFinale(`✅ ส่ง High Score แล้วในชื่อ ${name}`);
  } catch {
    showFinale('บันทึกคะแนนไว้ในเครื่องแล้ว แต่ส่งขึ้น Scoreboard ไม่สำเร็จ · กดลองส่งอีกครั้งได้');
  }
}

function patchPersonActions(state) {
  const missions = state?.missions || [];
  for (const button of document.querySelectorAll('#actionBar button[data-event], #gameDialog [data-work-event]')) {
    const event = button.dataset.event || button.dataset.workEvent;
    if (!PERSON_EVENTS.has(event)) continue;
    let id = button.dataset.id;
    const visibleLabel = button.querySelector('strong')?.textContent?.trim() || '';
    if (!id) {
      const mission = missions.find((item) => item.event === event && (!visibleLabel || item.label === visibleLabel || visibleLabel.includes(item.targetName || '')));
      id = mission?.targetId || '';
      if (id) button.dataset.id = id;
    }
    const target = findPerson(state, id);
    const action = buildPersonAction({ event, target, state });
    if (!action) {
      button.disabled = true;
      button.hidden = true;
      continue;
    }
    const strong = button.querySelector('strong');
    if (strong && strong.textContent !== action.label) strong.textContent = action.label;
  }
}

function patchMonthSummaryCopy() {
  const root = $('#sceneDetails');
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = node.nodeValue.replace(/\s*\/\s*3,000,000/g, '').replace(/\s*\/\s*3000000/g, '');
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

function patchMaxSkillButtons(state) {
  if (!state) return;
  const snapshot = getSkillSnapshot(state);
  for (const button of document.querySelectorAll(`#gameDialog [data-work-event="${EVENTS.TRAIN_SKILL}"][data-skill]`)) {
    if (snapshot.skills?.[button.dataset.skill]?.level >= 10) button.remove();
  }
}

function patchHud() {
  const state = stateNow();
  if (!state) return;
  const economy = calculateEconomy(state);
  const organizationVisible = state.organizationMode || state.milestones?.firstG1 || Number(state.team?.length || 0) > 0;
  const volumeLabel = $('#hudVolumeLabel');
  const volume = $('#hudXV');
  if (organizationVisible) {
    if (volumeLabel) volumeLabel.innerHTML = '🏙️ TGV เดือนนี้ <b aria-hidden="true">?</b>';
    if (volume) volume.textContent = `${fmt(economy.tgv)} XV`;
  }
  if (state.organizationMode) {
    const energy = $('#hudEnergyButton');
    if (energy) energy.hidden = true;
    const monthButton = $('#monthButton');
    if (monthButton) { monthButton.hidden = false; monthButton.textContent = 'ผ่านไปอีก 1 เดือน'; }
    const people = $('#peopleButton');
    if (people) {
      people.hidden = false;
      const count = state.organization?.aggregate?.xvisorCount || state.team?.length || 0;
      people.innerHTML = `Organization <b>${fmt(count)}</b>`;
    }
  }
  patchPersonActions(state);
  patchMonthSummaryCopy();
  patchMaxSkillButtons(state);
  if (state.campaignComplete && state.campaignScore?.locked && !state.organizationMode && !dialog?.open) {
    showFinale();
  }
}

function queuePatch() {
  if (patchQueued) return;
  patchQueued = true;
  requestAnimationFrame(() => { patchQueued = false; patchHud(); });
}

async function syncCertifiedToCloud() {
  if (cloudSyncAttempted || !profileCertified()) return;
  cloudSyncAttempted = true;
  try {
    const response = await fetch('/api/progress', { credentials: 'same-origin' });
    if (!response.ok) return;
    const payload = await response.json();
    const progress = { ...(payload.progress || {}), [PROFILE_KEY]: '1' };
    await fetch('/api/progress', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress }) });
  } catch { /* guest/local play remains supported */ }
}

function persistCertification() {
  const state = stateNow();
  if (!state?.milestones?.certified) return;
  try { localStorage.setItem(PROFILE_KEY, '1'); } catch { /* ignore */ }
  syncCertifiedToCloud();
}

// Capture before the base renderer so release-specific surfaces stay consistent.
document.addEventListener('click', (event) => {
  const close = event.target.closest('[data-v9-close]');
  if (close) { event.preventDefault(); event.stopImmediatePropagation(); hardClose(); return; }

  const finale = event.target.closest('[data-ui="v9-finale"]');
  if (finale) { event.preventDefault(); event.stopImmediatePropagation(); showFinale(); return; }

  const peopleTrigger = event.target.closest('#peopleButton, [data-open-people], [data-dialog-action="people"]');
  if (peopleTrigger) { event.preventDefault(); event.stopImmediatePropagation(); peoplePage = 0; peopleFocusId = null; renderPeople(); return; }

  const personTrigger = event.target.closest('#sceneDetails [data-person-id]');
  if (personTrigger) { event.preventDefault(); event.stopImmediatePropagation(); peoplePage = 0; renderPeople(personTrigger.dataset.personId); return; }

  const incomeTrigger = event.target.closest('#incomeButton');
  if (incomeTrigger) { event.preventDefault(); event.stopImmediatePropagation(); renderIncome(); return; }

  const tgvTrigger = event.target.closest('#hudXVButton');
  if (tgvTrigger) {
    const state = stateNow();
    if (state && (state.organizationMode || state.milestones?.firstG1 || state.team?.length)) {
      event.preventDefault(); event.stopImmediatePropagation(); renderTgvHelp(); return;
    }
  }

  const monthTrigger = event.target.closest('#monthButton');
  if (monthTrigger) { event.preventDefault(); event.stopImmediatePropagation(); renderMonthConfirm(); return; }

  const orgPass = event.target.closest('#actionBar button[data-event="END_MONTH"]');
  if (orgPass && stateNow()?.organizationMode) { event.preventDefault(); event.stopImmediatePropagation(); dispatchForUi(EVENTS.END_MONTH); return; }

  const work = event.target.closest('#gameDialog [data-work-event]');
  if (work && !work.disabled) {
    event.preventDefault(); event.stopImmediatePropagation();
    const payload = {};
    if (work.dataset.id) payload.id = work.dataset.id;
    if (work.dataset.source) payload.source = work.dataset.source;
    if (work.dataset.skill) payload.skill = work.dataset.skill;
    const gameEvent = work.dataset.workEvent;
    hardClose();
    dispatchForUi(gameEvent, payload);
    return;
  }

  const endMonth = event.target.closest('[data-v9-end-month]');
  if (endMonth) { event.preventDefault(); event.stopImmediatePropagation(); hardClose(); dispatchForUi(EVENTS.END_MONTH); return; }

  const tab = event.target.closest('[data-v9-people-tab]');
  if (tab) { event.preventDefault(); event.stopImmediatePropagation(); peopleTab = tab.dataset.v9PeopleTab; peoplePage = 0; peopleFocusId = null; renderPeople(); return; }

  const clearFocus = event.target.closest('[data-v9-clear-focus]');
  if (clearFocus) { event.preventDefault(); event.stopImmediatePropagation(); peopleFocusId = null; peoplePage = 0; renderPeople(); return; }

  const page = event.target.closest('[data-v9-page]');
  if (page && !page.disabled) { event.preventDefault(); event.stopImmediatePropagation(); peoplePage += page.dataset.v9Page === 'next' ? 1 : -1; renderPeople(); return; }

  const submit = event.target.closest('[data-v9-submit-score]');
  if (submit) { event.preventDefault(); event.stopImmediatePropagation(); submitScore(); return; }

  const enter = event.target.closest('[data-v9-enter-org]');
  if (enter) { event.preventDefault(); event.stopImmediatePropagation(); hardClose(); dispatchForUi(EVENTS.ENTER_ORGANIZATION); return; }

  const newRun = event.target.closest('[data-v9-new-run]');
  if (newRun) {
    event.preventDefault(); event.stopImmediatePropagation();
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    location.reload();
  }
}, true);

document.addEventListener('input', (event) => {
  const input = event.target.closest('[data-v9-people-search]');
  if (!input) return;
  event.stopImmediatePropagation();
  peopleQuery = input.value;
  peoplePage = 0;
  const position = input.selectionStart;
  renderPeople();
  requestAnimationFrame(() => {
    const next = $('[data-v9-people-search]');
    if (next) { next.focus(); next.setSelectionRange(position, position); }
  });
}, true);

dialog?.addEventListener('cancel', (event) => { event.preventDefault(); hardClose(); }, true);

const observer = new MutationObserver(() => {
  persistCertification();
  queuePatch();
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-stage'] });

persistCertification();
queuePatch();
