import { createWorldRenderer } from "./game-world.js";
import { mountPanels } from "./game-panels.js";
import { normalizeAction } from "./game-actions.js";
import { getEconomyView, signedBaht } from "./game-presentation.js";
import {
  CUSTOMER_STATES,
  EVENTS,
  ENERGY_COSTS,
  MAX_ENERGY,
  PRODUCT_CONFIG,
  SAVE_KEY,
  STAGES,
  XGEN_TGV_TARGET,
  calculateEconomy,
  canDispatch,
  isExamStage,
  makeInitialState,
  parseSavedState,
  reduceGame,
  serializeState
} from "./game-data.js";
import { ADS_GAMEPLAY_CONFIG, commercialStatusLabel } from "./game-commercial-config.js";
import {
  PLAYER_UNLOCKS,
  SKILL_DEFINITIONS,
  SKILL_IDS,
  getSkillBenefit,
  getSkillSnapshot,
  getXleadProgress
} from "./game-progression.js";
import { getStageContent, TERM_HELP } from "./game-copy.js";
import { createAudio } from "./game-audio.js";
var $ = (selector) => document.querySelector(selector);
var canvas = $("#worldCanvas");
var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function loadStoredState() {
  try {
    return parseSavedState(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}
var state = loadStoredState() || makeInitialState();
var content = getStageContent(state);
var stageTimer = null;
var montageTimer = null;
var montageVisualDay = state.preseason.day;
var activeDialogKey = null;
var lastRenderedStage = null;
var stageStartedAt = performance.now();
var audio = createAudio(state.soundOn);
state = { ...state, soundOn: audio.isEnabled() };
var iconGlyphs = Object.freeze({
  play: "▶",
  band: "⌁",
  scale: "◎",
  calendar: "▦",
  repair: "↺",
  submit: "✓",
  next: "→",
  certificate: "◇",
  flag: "⚑",
  walk: "→",
  talk: "···",
  consent: "○",
  plan: "↗",
  offer: "◉",
  care: "♥",
  academy: "▤",
  team: "↟",
  weekly: "◫",
  month: "≡",
  briefcase: "▣",
  check: "✓",
  content: "✎",
  ads: "◎",
  people: "●",
  skill: "★"
});
function formatNumber(value) {
  return Math.round(Number(value || 0)).toLocaleString("th-TH");
}
function formatBaht(value) {
  return `฿${formatNumber(value)}`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, serializeState(state));
  } catch {
  }
}
function announce(message) {
  const live = $("#liveRegion");
  live.textContent = "";
  requestAnimationFrame(() => {
    live.textContent = message;
  });
}
function toast(message, tone = "normal") {
  const item = document.createElement("div");
  item.className = `toast toast--${tone}`;
  item.textContent = message;
  $("#toastRegion").appendChild(item);
  requestAnimationFrame(() => item.classList.add("is-visible"));
  window.setTimeout(() => {
    item.classList.remove("is-visible");
    window.setTimeout(() => item.remove(), 220);
  }, reducedMotion.matches ? 700 : 1900);
  announce(message);
}
function selectedPerson() {
  return [...state.prospects, ...state.customers, ...state.team].find((person) => person.id === state.selectedPersonId) || state.prospects[0] || state.customers[0] || state.team[0];
}
function uniquePeopleCount() {
  return (/* @__PURE__ */ new Set([
    ...state.prospects.map((person) => person.personId || person.id),
    ...state.customers.map((person) => person.personId || person.id),
    ...state.team.map((person) => person.personId || person.id)
  ])).size;
}
function playForEvent(event, payload = {}) {
  const soundMap = {
    [EVENTS.WEAR_BAND]: "band",
    [EVENTS.START_SELF_SCALE]: "scale",
    [EVENTS.START_DAY14_SCALE]: "scale",
    [EVENTS.START_DAY28_SCALE]: "scale",
    [EVENTS.START_CUSTOMER_BASELINE]: "scale",
    [EVENTS.START_CUSTOMER_REVIEW]: "scale",
    [EVENTS.SELECT_EXAM]: "select",
    [EVENTS.SELECT_PRACTICE]: "select",
    [EVENTS.SUBMIT_EXAM]: "submit",
    [EVENTS.SUBMIT_PRACTICE]: "submit",
    [EVENTS.REPAIR_EXAM]: "repair",
    [EVENTS.REPAIR_PRACTICE]: "repair",
    [EVENTS.COMPLETE_CERTIFICATION]: "stamp",
    [EVENTS.CEREMONY_COMPLETE]: "certificate",
    [EVENTS.MAKE_OFFER]: "sale",
    [EVENTS.OFFER_PROSPECT]: "sale",
    [EVENTS.REORDER_CUSTOMER]: "reorder",
    [EVENTS.START_WEEKLY]: "meeting",
    [EVENTS.RUN_WEEKLY]: "meeting",
    [EVENTS.WEEKLY_COMPLETE]: "meetingDone",
    [EVENTS.RUN_MONTHLY_EVENT]: "event",
    [EVENTS.END_MONTH]: "monthClose",
    [EVENTS.START_NEXT_MONTH]: "month",
    [EVENTS.RUN_XCADEMY]: "meeting",
    [EVENTS.RUN_OPEN_HOUSE]: "event",
    [EVENTS.RUN_CENTER]: "meeting",
    [EVENTS.RUN_GOOD_LUCK]: "event",
    [EVENTS.TRAIN_SKILL]: "knowledge",
    [EVENTS.RUN_XIRCLE]: "xircle",
    [EVENTS.XLEAD_EXAM]: "promotion",
    [EVENTS.XGEN_EXAM]: "promotion",
    [EVENTS.ENTER_ORGANIZATION]: "score",
    [EVENTS.NEW_GAME_PLUS]: "newGame",
    [EVENTS.CREATE_LEAD]: payload?.source === "content" || payload?.source === "ads" ? "notify" : "confirm",
    [EVENTS.CERTIFY_CANDIDATE]: "certificate",
    [EVENTS.SCENE_COMPLETE]: "meetingDone"
  };
  if (state.lastEvent === `${EVENTS.SUBMIT_EXAM}_CORRECT` || state.lastEvent === `${EVENTS.SUBMIT_PRACTICE}_CORRECT`) audio.play("correct");
  else if (state.lastEvent === `${EVENTS.SUBMIT_EXAM}_WRONG` || state.lastEvent === `${EVENTS.SUBMIT_PRACTICE}_WRONG`) audio.play("incorrect");
  else audio.play(soundMap[event] || "confirm");
}
function spawnEffect(kind) { world.spawnEffect(kind); }
function dispatch(event, payload = {}) {
  try {
    audio.unlock();
  } catch {
  }
  if (!canDispatch(state, event)) {
    audio.play("warning");
    return;
  }
  const previous = state;
  const previousSkills = getSkillSnapshot(previous);
  const previousTransaction = state.economy.lastTransaction?.id;
  const next = reduceGame(state, event, payload);
  if (next === previous) {
    toast("พลังงานไม่พอสำหรับงานนี้", "hint");
    return;
  }
  state = next;
  const reportChanged = Number(previous.lastOrganizationReport?.month || 0) !== Number(state.lastOrganizationReport?.month || 0);
  const sceneReportChanged = previous.sceneReport?.kind !== state.sceneReport?.kind;
  if (previous.stage !== state.stage || reportChanged || sceneReportChanged) {
    activeDialogKey = null;
    stageStartedAt = performance.now();
  }
  // Commit gameplay before optional audio and visual effects. Mobile Safari can
  // interrupt AudioContext (for example while screen recording); that must never
  // leave a reduced state in memory without saving or rendering it.
  save();
  render();
  scheduleAutomaticTransition();
  try {
    playForEvent(event, payload);
  } catch {
  }
  const correct = state.lastEvent?.endsWith("_CORRECT");
  const wrong = state.lastEvent?.endsWith("_WRONG");
  if (correct) toast("ผ่านหลักนี้แล้ว", "success");
  if (wrong) toast("ยังไม่ผ่าน — อ่านหลักสั้น ๆ แล้วซ่อมได้", "hint");
  if (event === EVENTS.MONTAGE_COMPLETE) audio.play("knowledge");
  if ([EVENTS.COMPLETE_CERTIFICATION, EVENTS.CEREMONY_COMPLETE, EVENTS.SAVE_SUCCESS, EVENTS.PREPARE_G1, EVENTS.CERTIFY_CANDIDATE].includes(event)) spawnEffect("confetti");
  const nextSkills = getSkillSnapshot(state);
  SKILL_IDS.forEach((id) => {
    if (nextSkills.skills[id].level > previousSkills.skills[id].level) {
      audio.play("level");
      toast(`${SKILL_DEFINITIONS[id].icon} ${SKILL_DEFINITIONS[id].name} Lv.${nextSkills.skills[id].level} · ${getSkillBenefit(id, nextSkills.skills[id].level)}`, "success");
    }
  });
  if (nextSkills.playerLevel > previousSkills.playerLevel) toast(`⭐ X-VISOR Lv.${nextSkills.playerLevel} · ปลดล็อกวิธีสร้างผลที่คุ้มขึ้น`, "success");
  if (state.month === previous.month && [EVENTS.MAKE_OFFER, EVENTS.OFFER_PROSPECT, EVENTS.REORDER_CUSTOMER].includes(event) && state.economy.lastTransaction?.id && state.economy.lastTransaction.id !== previousTransaction) {
    spawnEffect("coins");
    audio.play("income");
    if (state.stage !== STAGES.M1_SALE_RECEIPT) queueMicrotask(() => showReceipt(state.economy.lastTransaction));
  }
  if (!previous.campaignScore?.locked && state.campaignScore?.locked) {
    audio.play("score");
    spawnEffect("confetti");
  }
  if (!previous.runComplete && state.runComplete) {
    audio.play("ending");
    spawnEffect("confetti");
  } else if (reportChanged && state.lastOrganizationReport) {
    const report = state.lastOrganizationReport;
    window.setTimeout(() => audio.play(report.trip ? "trip" : report.activities?.xircle ? "xircleDone" : report.newXleads || report.newXvisors ? "promotion" : "income"), 130);
  }
}
function clearAutomation() {
  window.clearTimeout(stageTimer);
  window.clearInterval(montageTimer);
  stageTimer = null;
  montageTimer = null;
}
function scheduleAutomaticTransition() {
  clearAutomation();
  if (state.stage === STAGES.PRE_MONTAGE) {
    const start = state.energy;
    const target = state.preseason.montageTarget || start;
    montageVisualDay = start;
    const steps = Math.max(1, target - start);
    const interval = reducedMotion.matches ? 24 : Math.max(65, Math.floor(1750 / steps));
    montageTimer = window.setInterval(() => {
      montageVisualDay = Math.min(target, montageVisualDay + 1);
      updateMontageHud();
      audio.play(montageVisualDay === target ? "knowledge" : "calendar");
      if (montageVisualDay >= target) {
        window.clearInterval(montageTimer);
        montageTimer = null;
        stageTimer = window.setTimeout(() => dispatch(EVENTS.MONTAGE_COMPLETE), reducedMotion.matches ? 40 : 230);
      }
    }, interval);
    return;
  }
  const short = reducedMotion.matches ? 120 : 1450;
  const transitions = {
    [STAGES.PRE_DAY0_SCANNING]: [EVENTS.SELF_SCAN_COMPLETE, short],
    [STAGES.PRE_DAY14_SCANNING]: [EVENTS.DAY14_SCAN_COMPLETE, short],
    [STAGES.PRE_DAY28_SCANNING]: [EVENTS.DAY28_SCAN_COMPLETE, short],
    [STAGES.EXAM_TRANSIT]: [EVENTS.EXAM_TRANSIT_COMPLETE, reducedMotion.matches ? 140 : 2050],
    [STAGES.CERTIFICATION_CEREMONY]: [EVENTS.CEREMONY_COMPLETE, reducedMotion.matches ? 170 : 2300],
    [STAGES.M1_BASELINE_SCANNING]: [EVENTS.CUSTOMER_BASELINE_COMPLETE, short],
    [STAGES.M1_REVIEW_SCANNING]: [EVENTS.CUSTOMER_REVIEW_COMPLETE, short],
    [STAGES.M1_WEEKLY_RUNNING]: [EVENTS.WEEKLY_COMPLETE, reducedMotion.matches ? 160 : 2100],
    [STAGES.CONTENT_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 180 : 2100],
    [STAGES.ADS_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 180 : 2300],
    [STAGES.XCADEMY_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 200 : 2600],
    [STAGES.OPEN_HOUSE_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 220 : 2900],
    [STAGES.CENTER_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 200 : 2600],
    [STAGES.GOOD_LUCK_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 220 : 2900],
    [STAGES.G1_CELEBRATION]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 200 : 2350],
    [STAGES.XLEAD_MILESTONE]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 220 : 2700]
  };
  const transition = transitions[state.stage];
  if (transition) stageTimer = window.setTimeout(() => dispatch(transition[0]), transition[1]);
}
function updateMontageHud() {
  $("#hudMonth").textContent = `DAY ${montageVisualDay} / 28`;
  $("#hudEnergy").textContent = `⚡ ${montageVisualDay} / 28`;
  $("#energyMeter").style.setProperty("--energy", `${montageVisualDay / MAX_ENERGY * 100}%`);
  if (!$("#waitingState").hidden) $("#waitingState").textContent = `DAY ${montageVisualDay} · ENERGY +1`;
}
function renderHud() {
  const economy = getEconomyView(state);
  const exam = isExamStage(state.stage);
  const preseason = state.month === 0 && !exam && state.stage !== STAGES.CERTIFIED;
  const visibleEnergy = state.stage === STAGES.PRE_MONTAGE ? montageVisualDay : state.energy;
  $("#hudPhaseLabel").textContent = preseason ? "ช่วงการเรียนรู้" : exam ? "สถานที่" : "เวลาในเกม";
  $("#hudMonth").textContent = preseason ? `DAY ${state.preseason.day} / 28` : exam ? "EXAM ROOM" : state.stage === STAGES.CERTIFIED ? "CERTIFIED" : `เดือน ${state.month}`;
  $("#hudEnergyLabel").innerHTML = `${preseason ? "ความพร้อม 28 วัน" : "พลังงานในเดือนนี้"} <b aria-hidden="true">?</b>`;
  $("#hudEnergy").textContent = `⚡ ${visibleEnergy} / ${MAX_ENERGY}`;
  $("#energyMeter").style.setProperty("--energy", `${visibleEnergy / MAX_ENERGY * 100}%`);
  const customerCount = state.customers.length + state.prospects.filter((person) => person.activePlan).length;
  $("#hudCustomers").textContent = `${customerCount} คน`;
  const organizationVisible = state.organizationMode || state.milestones.firstG1 || state.team.length > 0;
  $("#hudVolumeLabel").innerHTML = `${organizationVisible ? "🏙️ TGV เดือนนี้" : "XV เดือนนี้"} <b aria-hidden="true">?</b>`;
  $("#hudXV").textContent = `${formatNumber(organizationVisible ? economy.tgv : economy.personalXV)} XV`;
  $(".status-item--income span").textContent = "รายได้เดือนนี้ · สะสม";
  $("#hudIncome").textContent = `${formatBaht(economy.projectedIncome)} · Σ${formatBaht(economy.lifetimeIncome)}`;
  const skillSnapshot = getSkillSnapshot(state);
  const rankLabel = state.rank === "xgen" ? "XGEN" : state.rank === "xlead" ? "XLEAD" : "X-VISOR";
  $("#hudRank").textContent = state.rank === "candidate" ? "CANDIDATE" : `⭐ ${rankLabel} Lv.${skillSnapshot.playerLevel}`;
  $("#teamChip").hidden = !state.milestones.firstG1;
  $("#teamChip").textContent = `ทีม ${state.team.length} X-VISOR · ${state.organization.xleads?.length || 0} XLEAD`;
  $("#peopleButton").hidden = state.month < 1;
  $("#peopleButton").innerHTML = `คนของคุณ <b id="peopleCount">${uniquePeopleCount()}</b>`;
  $("#hudEnergyButton").hidden = Boolean(state.organizationMode);
  $("#monthButton").textContent = "จบเดือน";
  $("#skillButton").disabled = state.rank === "candidate";
  $("#incomeButton").hidden = exam || state.month < 1;
  $("#monthButton").hidden = state.stage !== STAGES.MANAGEMENT;
  $(".status-strip").dataset.compact = exam || preseason || state.stage === STAGES.CERTIFIED ? "true" : "false";
  [$(".status-item--customers"), $("#hudXVButton"), $(".status-item--income")].forEach((element) => {
    element.hidden = exam || preseason || state.stage === STAGES.CERTIFIED;
  });
}
function renderGoal() {
  $("#goalEyebrow").textContent = content.eyebrow || "เป้าหมายของคุณ";
  $("#goalTitle").textContent = content.title || "เลือกสิ่งที่ควรทำต่อ";
  $("#goalReason").textContent = content.reason || "";
  $("#goalProgress").style.width = `${content.progress || 0}%`;
  $("#goalCard").dataset.complete = content.progress === 100 ? "true" : "false";
}
function renderResultCards(container, rows, className = "result-grid") {
  const grid = document.createElement("div");
  grid.className = className;
  rows.forEach(([label, value, tone = "neutral"]) => {
    grid.insertAdjacentHTML("beforeend", `<div class="result-card result-card--${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`);
  });
  container.appendChild(grid);
}
function renderQuiz(container, quiz) {
  const group = document.createElement("div");
  group.className = `quiz-grid${quiz.feedback === "wrong" ? " is-wrong" : ""}`;
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "ตัวเลือกคำตอบ");
  quiz.choices.forEach(([id, label], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-choice";
    button.dataset.quizAnswer = id;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", quiz.selected === id ? "true" : "false");
    if (quiz.selected === id) button.classList.add("is-selected");
    if (quiz.feedback && quiz.selected === id) button.classList.add(quiz.feedback === "correct" ? "is-correct" : "is-wrong");
    button.disabled = Boolean(quiz.feedback);
    button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(label)}</strong>`;
    group.appendChild(button);
  });
  container.appendChild(group);
  if (quiz.feedback) {
    const feedback = document.createElement("div");
    feedback.className = `answer-feedback answer-feedback--${quiz.feedback}`;
    feedback.innerHTML = `<strong>${quiz.feedback === "correct" ? "ผ่านหลักนี้" : "ข้อนี้ยังไม่ผ่าน"}</strong><p>${escapeHtml(quiz.repair)}</p>`;
    container.appendChild(feedback);
  }
}
function renderRoutineBuilder(container) {
  const abc = document.createElement("div");
  abc.className = "abcd-mini";
  [["A", "G.U.S.+"], ["B", "Protein HMB+"], ["C", "พฤติกรรม · ไม่มีขาย"], ["D", "Vita Matrix + AstaMega+"]].forEach(([letter, label]) => {
    abc.insertAdjacentHTML("beforeend", `<div class="abcd-mini__item abcd-mini__item--${letter.toLowerCase()}"><b>${letter}</b><span>${escapeHtml(label)}</span></div>`);
  });
  container.appendChild(abc);
  const choices = document.createElement("div");
  choices.className = "routine-choices";
  content.routineBuilder.choices.forEach(([id, label, detail]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.planId = id;
    button.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span>`;
    choices.appendChild(button);
  });
  container.appendChild(choices);
}
function productName(id) {
  return Object.values(PRODUCT_CONFIG).find((item) => item.id === id)?.name || id;
}
function renderReceipt(container, transaction) {
  if (!transaction) return;
  const receipt = document.createElement("div");
  receipt.className = "receipt receipt--inline";
  const itemRows = (transaction.items || []).map((item) => `<div><span>${escapeHtml(item.name)}${item.cycle === "monthly" ? " · รายเดือน" : " · ครั้งแรกครั้งเดียว"}</span><strong>${formatBaht(item.price)} · ${formatNumber(item.xv)} XV</strong></div>`).join("");
  receipt.innerHTML = `
    ${itemRows}
    <div class="receipt__total"><span>ยอดรวม</span><strong>${formatBaht(transaction.price)} · ${formatNumber(transaction.xv)} XV</strong></div>
    <div><span>รายได้ก่อนรายการนี้</span><strong>${formatBaht(transaction.incomeBefore)}</strong></div>
    <div><span>รายได้เพิ่มจากรายการนี้</span><strong>${signedBaht(transaction.incomeDelta)}</strong></div>
    <div><span>① รายได้เดือนนี้หลังรายการ</span><strong>${formatBaht(transaction.incomeAfter)}</strong></div>
    <small>${escapeHtml(commercialStatusLabel(transaction.status))} · ไม่ใช่การรับประกันรายได้จริง</small>`;
  container.appendChild(receipt);
}
function renderManagement(container, data) {
  const missions = document.createElement("section");
  missions.className = "xos-panel";
  missions.innerHTML = `<div class="panel-heading"><strong>วันนี้ควรดูใครก่อน</strong><button type="button" class="term-link" data-term="XOS">XOS คืออะไร?</button></div>`;
  const list = document.createElement("ol");
  if (!data.missions.length) list.innerHTML = "<li>ยังไม่มีงานเร่งด่วน — สร้างโอกาสใหม่หรือจบเดือนเมื่อพร้อม</li>";
  data.missions.slice(0, 4).forEach((mission) => {
    const row = document.createElement("li");
    row.innerHTML = `<button type="button" data-person-id="${escapeHtml(mission.targetId)}"><span>${escapeHtml(mission.label)}</span><b>ดู →</b></button>`;
    list.appendChild(row);
  });
  missions.appendChild(list);
  const allPeople = document.createElement("button");
  allPeople.type = "button";
  allPeople.className = "xos-all-button";
  allPeople.dataset.openPeople = "all";
  allPeople.textContent = `ดูคนทั้งหมด ${data.peopleCount} คน →`;
  missions.appendChild(allPeople);
  container.appendChild(missions);
  const board = document.createElement("div");
  board.className = "management-board";
  [["🏙️ TGV", formatNumber(data.economy.tgv)], ["ลูกค้า", data.customers.length], ["🌱 ทีม", data.team.length], ["พลังงาน", `⚡ ${state.energy}`]].forEach(([label, value]) => {
    board.insertAdjacentHTML("beforeend", `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`);
  });
  container.appendChild(board);
  const tools = document.createElement("div");
  tools.className = "management-tools";
  tools.innerHTML = `<button type="button" data-open-work="true">🧭 เปิดแผนงาน</button><button type="button" data-open-skills="true">⭐ Skill · Lv.${data.skills.playerLevel}</button>`;
  container.appendChild(tools);
  if (data.stats.teamOutput?.length) {
    const teamOutput = document.createElement("details");
    teamOutput.className = "team-output";
    teamOutput.innerHTML = `<summary class="panel-heading"><strong>ทีมทำเองในเดือนนี้</strong><span>${data.stats.teamActions} งาน · ดูรายละเอียด</span></summary>`;
    data.stats.teamOutput.slice(0, 4).forEach((member) => {
      const outcomes = [
        member.selfUse ? "ต่อ RoutineX เอง" : "",
        member.newPeople ? `คนใหม่ ${member.newPeople}` : "",
        member.followups ? `ติดตาม ${member.followups}` : "",
        member.customers ? `ลูกค้าใหม่ ${member.customers}` : "",
        member.newStarts ? `ลูกค้าเริ่มใหม่ ${member.newStarts}` : "",
        member.reorders ? `Repeat ${member.reorders}` : "",
        member.newXvisors ? `X-VISOR ใหม่ ${member.newXvisors}` : "",
        member.referrals ? `Referral ${member.referrals}` : ""
      ].filter(Boolean).join(" · ") || "ลงมือทำ Next Action";
      teamOutput.insertAdjacentHTML("beforeend", `<div><strong>${escapeHtml(member.name)}</strong><span>${escapeHtml(outcomes)}</span></div>`);
    });
    container.appendChild(teamOutput);
  }
  if (state.energy === 0) {
    const energy = data.stats.energyUse;
    const created = data.stats;
    const empty = document.createElement("section");
    empty.className = "energy-empty-summary";
    empty.innerHTML = `<strong>พลังงานเดือนนี้หมดแล้ว</strong>
      <p>ใช้กับ: หาคน ${energy.attract} · ดูแล ${energy.care} · เรียน ${energy.learn} · ทีม ${energy.team} · อื่น ๆ ${energy.other}</p>
      <p>สร้าง: ลูกค้าใหม่ ${created.newCustomers} · Sale ${created.sales + created.reorders} · Referral ${created.referrals} · Skill +${created.skillLevelsGained} · X-VISOR ใหม่ ${created.newXvisors}</p>`;
    container.appendChild(empty);
  }
}
function renderMonthSummary(container, summary) {
  const economy = getEconomyView(state);
  const previousSettlement = state.settlements?.[String(state.month - 1)];
  summary = { ...summary, projectedIncome: economy.projectedIncome, receivedIncomeTotal: economy.lifetimeIncome, tgv: economy.tgv, previousIncome: previousSettlement?.totalIncome ?? previousSettlement?.total ?? summary.previousIncome };
  const previous = Number(summary.previousIncome || 0);
  const delta = Number(summary.projectedIncome || 0) - previous;
  const comparison = previous > 0 ? `${delta >= 0 ? "↑" : "↓"} ${formatBaht(Math.abs(delta))} จากเดือนก่อน` : "เดือนแรกที่มีข้อมูลเปรียบเทียบ";
  const priorBestIncome = Math.max(0, ...state.monthSummaries.slice(0, -1).map((item) => Number(item.projectedIncome || 0)));
  const incomeRecord = Number(summary.projectedIncome || 0) > priorBestIncome;
  const tgvBefore = Number(state.monthSummaries.at(-2)?.tgv || 0);
  const tgvGrowth = tgvBefore ? Math.round((Number(summary.tgv || 0) - tgvBefore) / tgvBefore * 100) : null;
  const sections = [
    ["💰 เงิน", [["เดือนนี้", formatBaht(summary.projectedIncome)], ["รวม", formatBaht(summary.receivedIncomeTotal)], ["สถานะ", incomeRecord ? "NEW RECORD" : comparison]]],
    ["🏙️ TGV", [["เดือนนี้", `${formatNumber(summary.tgv)} / ${formatNumber(XGEN_TGV_TARGET)}`], ["เทียบเดือนก่อน", tgvGrowth == null ? "เดือนแรก" : `${tgvGrowth >= 0 ? "↑" : "↓"} ${Math.abs(tgvGrowth)}%`]]],
    ["👥 ลูกค้า", [["ใหม่", summary.newCustomers], ["ต่อ Routine", summary.reorders], ["ซื้อเอง", summary.autoReorders || 0]]],
    ["🌱 ทีม", [["X-VISOR", summary.team], ["XLEAD", summary.xleads || 0], ["ทีมทำเอง", `${summary.leverage?.team || 0} งาน`]]],
    ["⭐ ไฮไลต์", [["Candidate ใหม่", summary.candidates + summary.teamCandidates], ["ทีมสร้างรุ่นถัดไป", summary.downstreamXvisors || 0], ["Open House", summary.openHouseDone ? "เกิด batch impact" : "ไว้เดือนหน้า"]]]
  ];
  const wrap = document.createElement("div");
  wrap.className = "month-summary-sections";
  sections.forEach(([title, rows]) => {
    const section = document.createElement("section");
    section.innerHTML = `<h3>${title}</h3>`;
    renderResultCards(section, rows, "summary-grid");
    wrap.appendChild(section);
  });
  container.appendChild(wrap);
}
function renderDialogue() {
  $("#dialogueSpeaker").textContent = content.speaker || "";
  $("#dialogueText").textContent = content.dialogue || "";
  const details = $("#sceneDetails");
  details.innerHTML = "";
  if (content.resultCards) renderResultCards(details, content.resultCards);
  if (content.facts) renderResultCards(details, content.facts, "fact-grid");
  if (content.recap) renderResultCards(details, content.recap, "recap-grid");
  if (content.quiz) renderQuiz(details, content.quiz);
  if (content.routineBuilder) renderRoutineBuilder(details);
  if (content.selectedProducts) {
    const row = document.createElement("div");
    row.className = "selected-products";
    row.innerHTML = `<span>บนโต๊ะตามแผนนี้</span><strong>${content.selectedProducts.length ? content.selectedProducts.map(productName).join(" · ") : "C · Control ก่อน · ไม่มีสินค้า"}</strong>`;
    details.appendChild(row);
  }
  if (content.receipt) renderReceipt(details, content.receipt);
  if (content.management) renderManagement(details, content.management);
  if (content.monthSummary) {
    renderMonthSummary(details, content.monthSummary);
  }
  if (content.deepLinks) {
    const nav = document.createElement("nav");
    nav.className = "knowledge-links";
    nav.setAttribute("aria-label", "อ่านต่อ");
    content.deepLinks.forEach(([label, href]) => nav.insertAdjacentHTML("beforeend", `<a href="${href}">${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`));
    details.appendChild(nav);
  }
  const milestone = $("#milestoneBadge");
  milestone.hidden = !content.milestone;
  milestone.textContent = content.milestone || "";
}
function buildActionButton(item, index) {
  item = normalizeAction(item);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${item.kind === "secondary" ? "action-button--secondary" : "action-button--primary"}`;
  button.dataset.actionIndex = String(index);
  if (item.event) button.dataset.event = item.event;
  if (item.id) button.dataset.id = item.id;
  if (item.source) button.dataset.source = item.source;
  if (item.skill) button.dataset.skill = item.skill;
  if (item.value) button.dataset.value = item.value;
  if (item.ui) button.dataset.ui = item.ui;
  button.disabled = Boolean(item.disabled || item.cost && state.month >= 1 && item.cost > state.energy);
  button.innerHTML = `<span class="action-button__icon" aria-hidden="true">${iconGlyphs[item.icon] || "→"}</span>
    <span class="action-button__copy"><strong>${escapeHtml(item.label)}</strong>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}</span>
    ${item.cost ? `<span class="action-button__cost">⚡ ${item.cost}</span>` : ""}`;
  return button;
}
function renderActions() {
  const actionBar = $("#actionBar");
  actionBar.innerHTML = "";
  const actions = content.actions || [];
  actions.slice(0, 3).forEach((item, index) => actionBar.appendChild(buildActionButton(item, index)));
  const primary = actionBar.querySelector(".action-button--primary:not(:disabled)");
  if (primary && !state.tutorialSeen?.[state.stage]) primary.classList.add("is-guided");
  $("#actionDock").dataset.empty = actions.length ? "false" : "true";
  $("#waitingState").hidden = actions.length > 0 || !content.status;
  const waiting = {
    scan: "ข้อมูลกำลังขึ้นทีละค่า",
    montage: `DAY ${montageVisualDay} · ENERGY +1`,
    examTransit: "กำลังเดินเข้าห้องสอบและนั่งประจำโต๊ะ",
    ceremony: "กำลังรับใบรับรอง",
    weekly: "ทีมกำลังเลือก Next Action",
    content: "กำลังโพสต์และรอ notification",
    ads: "Campaign กำลังสร้าง Interest",
    xcademy: "Xcademy กำลังช่วยหลายคนพร้อมกัน",
    openhouse: "Open House กำลังสรุป batch impact",
    g1: "ต้อนรับ X-VISOR คนใหม่",
    xlead: "กำลังเปิดช่อง ② และ Organization Map",
    xgen: "พร้อมนำ Organization แล้ว"
  };
  $("#waitingState").textContent = waiting[content.status] || "กำลังดำเนินการ…";
}
function renderAudioControls() {
  const prefs = audio.getPrefs();
  const soundButton = $("#soundButton");
  if (soundButton) {
    soundButton.setAttribute("aria-pressed", String(!prefs.muted));
    soundButton.textContent = prefs.muted ? "🔇 ปิด" : "🔊 เปิด";
  }
  const musicButton = $("[data-audio-toggle=music]");
  if (musicButton) {
    musicButton.setAttribute("aria-pressed", String(prefs.musicEnabled));
    musicButton.textContent = `♫ BGM: ${prefs.musicEnabled ? "เปิด" : "ปิด"}`;
  }
  const sfxButton = $("[data-audio-toggle=sfx]");
  if (sfxButton) {
    sfxButton.setAttribute("aria-pressed", String(prefs.sfxEnabled));
    sfxButton.textContent = `✦ SFX: ${prefs.sfxEnabled ? "เปิด" : "ปิด"}`;
  }
}
function render() {
  content = getStageContent(state);
  const management = Boolean(content.management || state.organizationMode);
  $("#gameApp").dataset.management = String(management);
  const controls = $(".game-layout__controls");
  const dock = $("#actionDock");
  if (management && controls.firstElementChild !== dock) controls.prepend(dock);
  if (!management && controls.lastElementChild !== dock) controls.append(dock);
  renderHud();
  renderGoal();
  renderDialogue();
  renderActions();
  renderAudioControls();
  audio.setMode(state.organizationMode ? "organization" : state.month === 0 ? "pre" : "campaign");
  document.body.dataset.stage = state.stage;
  document.body.dataset.organization = state.organizationMode ? "true" : "false";
  document.body.dataset.runMode = state.runMode || "FIRST_RUN";
  document.title = `${content.title || "X-VISOR QUEST"} · X-VISOR QUEST`;
  panels?.sync();
  world?.invalidate();
  if (lastRenderedStage !== state.stage) {
    $("#worldFrame").classList.remove("is-changing");
    void $("#worldFrame").offsetWidth;
    $("#worldFrame").classList.add("is-changing");
    lastRenderedStage = state.stage;
  }
}
function showDialog(key, html, options = {}) {
  activeDialogKey = key;
  $("#dialogContent").innerHTML = html;
  $("#gameDialog").dataset.kind = options.kind || "normal";
  delete $("#gameDialog").dataset.v9Dialog;
  delete $("#gameDialog").dataset.v1OrganizationKey;
  if (!$("#gameDialog").open) $("#gameDialog").showModal();
  requestPanelSync();
  requestAnimationFrame(() => $("#gameDialog").querySelector("button")?.focus());
}
function closeDialog() {
  if ($("#gameDialog").open) $("#gameDialog").close();
  activeDialogKey = null;
}
function showReceipt(transaction) {
  showDialog("receipt", `<div class="dialog-kicker">SALE RECEIPT · ${escapeHtml(commercialStatusLabel(transaction.status))}</div>
    <h2>XV และรายได้เป็นคนละตัวเลข</h2><div id="dialogReceipt"></div>
    <p class="dialog-note">ตัวเลขนี้เป็นแบบจำลองในเกม ไม่ใช่ราคา ขั้นคุณสมบัติ หรือการรับประกันรายได้จริง</p>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับไปดูแลงานต่อ</button>`, { kind: "celebrate" });
  renderReceipt($("#dialogReceipt"), transaction);
}
function showIncome() {
  return panels.showIncome();
}
function workButton(label, event, options = {}) {
  const disabled = options.cost > state.energy || options.disabled;
  return `<button type="button" class="work-button" data-work-event="${event}"${options.source ? ` data-source="${options.source}"` : ""}${options.id ? ` data-id="${options.id}"` : ""}${options.skill ? ` data-skill="${options.skill}"` : ""}${disabled ? " disabled" : ""}>
    <strong>${escapeHtml(label)}</strong><span>${escapeHtml(options.detail || "")}</span>${options.cost ? `<b>⚡ ${options.cost}</b>` : ""}</button>`;
}
function showPeople(tab = "all", query = "", focusId = null) {
  return panels.showPeople(tab, query, focusId);
}
function showSkills() {
  const snapshot = getSkillSnapshot(state);
  const progress = getXleadProgress(state);
  const cards = SKILL_IDS.map((id) => {
    const skill = snapshot.skills[id];
    const willLevel = skill.nextXp != null && skill.xp + 2 >= skill.nextXp;
    return `<article class="skill-card"><div><span>${skill.definition.icon}</span><h3>${skill.definition.name} Lv.${skill.level}</h3></div>
      <p>${escapeHtml(getSkillBenefit(id, skill.level))}</p>
      <div class="skill-meter"><i style="--skill-progress:${skill.nextXp == null ? 100 : Math.min(100, skill.xp / skill.nextXp * 100)}%"></i></div>
      <small><b>ถ้าเรียนอีก 1 ครั้ง:</b> ${willLevel ? `ขึ้น Lv.${Math.min(10, skill.level + 1)} · ` : "สะสมประสบการณ์ · "}${escapeHtml(getSkillBenefit(id, Math.min(10, skill.level + 1)))}</small>
      ${workButton(skill.definition.practice, EVENTS.TRAIN_SKILL, { skill: id, cost: 1, detail: "+2 XP · งานเดิมคุ้มขึ้น" })}</article>`;
  }).join("");
  const xlead = progress.criteria.map((item) => `<li class="${item.current >= item.target ? "is-done" : ""}"><span>${escapeHtml(item.label)}</span><b>${item.current} / ${item.target}</b></li>`).join("");
  showDialog("skills", `<div class="dialog-kicker">⭐ ${state.rank === "xgen" ? "XGEN" : state.rank === "xlead" ? "XLEAD" : "X-VISOR"} Lv.${snapshot.playerLevel}</div><h2>ความเก่งของคุณ</h2><p class="dialog-note">ลงทุน 1 ⚡ เพื่อเปลี่ยนวิธีเล่น เมื่อถึง Lv.10 ลูกค้าและทีมจะทำงานปกติเอง คุณดูเฉพาะเรื่องสำคัญ</p>
    <div class="skill-grid">${cards}</div>
    <section class="xlead-progress"><h3>เส้นทาง XLEAD ในเกม</h3><ul>${xlead}</ul><small>${escapeHtml(progress.note)}</small></section>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับเกม</button>`, { kind: "wide" });
}
function showWorkMenu() {
  const skills = getSkillSnapshot(state);
  const contentLocked = skills.playerLevel < PLAYER_UNLOCKS.content;
  const adsLocked = skills.playerLevel < PLAYER_UNLOCKS.ads;
  const mentors = state.team.filter((member) => member.active && member.autonomy < 85).slice(0, 8).map((member) => workButton(`Review เคสกับ ${member.name}`, EVENTS.MENTOR_TEAM_MEMBER, { id: member.id, cost: 1, detail: `${member.customers} ลูกค้า · ${member.autonomy >= 70 ? "ใกล้ทำเองเต็มที่" : member.autonomy >= 45 ? "เริ่มทำเองได้" : "ยังต้องซ้อมด้วยกัน"}` })).join("");
  const training = SKILL_IDS.map((id) => workButton(`${SKILL_DEFINITIONS[id].icon} ${SKILL_DEFINITIONS[id].practice}`, EVENTS.TRAIN_SKILL, { skill: id, cost: 1, detail: `${SKILL_DEFINITIONS[id].name} Lv.${skills.skills[id].level} · ${getSkillBenefit(id, Math.min(10, skills.skills[id].level + 1))}` })).join("");
  showDialog("work", `<div class="dialog-kicker">แผนเติบโต · เดือน ${state.month}</div><h2>ลงทุนเวลาให้ผลเดือนต่อไปทวีคูณ</h2>
    <section class="work-section"><h3>สร้างโอกาสใหม่</h3><div class="work-grid">
      ${workButton("ทำความรู้จักคนใหม่", EVENTS.CREATE_LEAD, { source: "known", cost: 1, detail: "ได้ 1 คน · ต้องทักและคุยก่อน Sale" })}
      ${workButton("ทำคอนเทนต์", EVENTS.CREATE_LEAD, { source: "content", cost: 1, disabled: contentLocked, detail: contentLocked ? "เปิดที่ X-VISOR Lv.2" : "Journey / ความรู้ / Routine · สร้าง Interest" })}
      ${workButton("ยิง Ads จำลอง", EVENTS.CREATE_LEAD, { source: "ads", cost: 1, disabled: adsLocked, detail: adsLocked ? "เปิดที่ X-VISOR Lv.4" : `Budget จำลอง ${formatBaht(ADS_GAMEPLAY_CONFIG.budgetPerCampaign)} แยกจากรายได้` })}</div></section>
    <section class="work-section"><h3>ฝึกให้ 1 ⚡ คุ้มขึ้น</h3><div class="work-grid">${training}</div></section>
    <section class="work-section"><h3>🎓 Batch และทีม</h3><div class="work-grid">${mentors}
      ${workButton(`Xcademy · ครั้ง ${Number(state.monthStats.xcademySessions || 0) + 1}/4`, EVENTS.RUN_XCADEMY, { cost: 2, disabled: Number(state.monthStats.xcademySessions || 0) >= 4, detail: Number(state.monthStats.xcademySessions || 0) >= 4 ? "ครบ 4 ครั้งเดือนนี้" : "OPP + Training · เลือกคนที่เหมาะสมอัตโนมัติ" })}
      ${workButton("🏠 Open House", EVENTS.RUN_OPEN_HOUSE, { cost: 2, disabled: state.monthStats.openHouseDone, detail: state.monthStats.openHouseDone ? "ทำแล้วในเดือนนี้" : "ชวนทุกคนที่เหมาะสม · batch impact" })}
      ${["xlead", "xgen"].includes(state.rank) ? workButton("Review ผู้นำรุ่นถัดไป", EVENTS.REVIEW_TEAM_LEADERS, { cost: 1, detail: "เพิ่มความพร้อมให้ทีมทำเอง" }) : ""}</div></section>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="people">เปิดคนของคุณ</button><button class="dialog-button" type="button" data-dialog-action="close">กลับกระดาน</button></div>`, { kind: "wide" });
}
function showTerm(term) {
  showDialog("term", `<div class="dialog-kicker">คำที่ควรรู้</div><h2>${escapeHtml(term)}</h2><p class="term-definition">${escapeHtml(TERM_HELP[term] || "คำนี้จะเปิดเมื่อถึงช่วงที่เกี่ยวข้อง")}</p><button class="dialog-button" type="button" data-dialog-action="close">เข้าใจแล้ว</button>`);
}
function showMonthConfirmation() {
  return panels.showMonthConfirmation();
}
function showResetConfirmation() {
  showDialog("reset", `<div class="dialog-kicker">เริ่มเส้นทางใหม่</div><h2>ลบความคืบหน้ารอบนี้ไหม?</h2><p class="dialog-note">ชื่อ ตัวละคร การสอบ ลูกค้า และหลายเดือนที่บันทึกไว้จะถูกลบจากอุปกรณ์นี้</p>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="close">เล่นต่อ</button><button class="dialog-button dialog-button--danger" type="button" data-dialog-action="reset-confirm">เริ่มใหม่</button></div>`);
}
function resetGame() {
  const soundOn = state.soundOn;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
  }
  state = { ...makeInitialState(), soundOn };
  montageVisualDay = 0;
  closeDialog();
  save();
  render();
  scheduleAutomaticTransition();
  toast("เริ่ม PRE-SEASON ใหม่ที่ ⚡ 0 / 28", "success");
}
$("#actionBar").addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const button = target?.closest("button[data-action-index]");
  if (!button || button.disabled) return;
  if (button.dataset.ui === "work") return showWorkMenu();
  if (button.dataset.ui === "people") return showPeople();
  if (button.dataset.ui === "skills") return showSkills();
  const gameEvent = button.dataset.event;
  if (!gameEvent) return;
  const payload = {};
  if (button.dataset.id) payload.id = button.dataset.id;
  if (button.dataset.value) payload.value = button.dataset.value;
  if (button.dataset.source) payload.source = button.dataset.source;
  if (button.dataset.skill) payload.skill = button.dataset.skill;
  state = { ...state, tutorialSeen: { ...state.tutorialSeen, [state.stage]: true } };
  if (gameEvent === EVENTS.END_MONTH) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  dispatch(gameEvent, payload);
});
$("#sceneDetails").addEventListener("click", (event) => {
  const quizButton = event.target.closest("[data-quiz-answer]");
  if (quizButton && !quizButton.disabled) return dispatch(content.quiz.exam ? EVENTS.SELECT_EXAM : EVENTS.SELECT_PRACTICE, { answer: quizButton.dataset.quizAnswer });
  const planButton = event.target.closest("[data-plan-id]");
  if (planButton) dispatch(content.routineEvent, { planId: planButton.dataset.planId });
  const termButton = event.target.closest("[data-term]");
  if (termButton) showTerm(termButton.dataset.term);
  const personButton = event.target.closest("[data-person-id]");
  if (personButton) showPeople("all", "", personButton.dataset.personId);
  if (event.target.closest("[data-open-people]")) showPeople();
  if (event.target.closest("[data-open-work]")) showWorkMenu();
  if (event.target.closest("[data-open-skills]")) showSkills();
});
$("#incomeButton").addEventListener("click", () => {
  audio.unlock();
  audio.play("tap");
  showIncome();
});
$("#monthButton").addEventListener("click", () => {
  audio.unlock();
  audio.play("tap");
  showMonthConfirmation();
});
$("#peopleButton").addEventListener("click", () => {
  audio.unlock();
  audio.play("tap");
  showPeople();
});
$("#skillButton").addEventListener("click", () => {
  if (state.rank !== "candidate") {
    audio.unlock();
    audio.play("tap");
    showSkills();
  }
});
$("#resetButton").addEventListener("click", () => {
  audio.unlock();
  audio.play("tap");
  showResetConfirmation();
});
$("#soundButton").addEventListener("click", () => {
  const nextEnabled = !audio.isEnabled();
  audio.setMuted(!nextEnabled);
  state = { ...state, soundOn: nextEnabled, updatedAt: Date.now() };
  save();
  renderAudioControls();
  toast(nextEnabled ? "เปิดเสียงแล้ว" : "ปิดเสียงแล้ว");
});
$("#audioSettingsButton")?.addEventListener("click", (event) => {
  event.stopPropagation();
  audio.unlock();
  const menu = $("#audioMenu");
  const open = Boolean(menu?.hidden);
  if (menu) menu.hidden = !open;
  $("#audioSettingsButton")?.setAttribute("aria-expanded", String(open));
  audio.play("page");
});
$("#audioMenu")?.addEventListener("click", (event) => {
  event.stopPropagation();
  const button = event.target.closest("[data-audio-toggle]");
  if (!button) return;
  const prefs = audio.getPrefs();
  if (button.dataset.audioToggle === "music") audio.setMusicEnabled(!prefs.musicEnabled);
  if (button.dataset.audioToggle === "sfx") audio.setSfxEnabled(!prefs.sfxEnabled);
  renderAudioControls();
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".audio-control")) return;
  const menu = $("#audioMenu");
  if (menu) menu.hidden = true;
  $("#audioSettingsButton")?.setAttribute("aria-expanded", "false");
});
document.addEventListener("pointerdown", () => audio.unlock(), { once: true, capture: true });
$("#hudXVButton").addEventListener("click", () => showTerm("XV"));
$("#hudEnergyButton").addEventListener("click", () => showTerm("ENERGY"));
$("#gameDialog").addEventListener("click", (event) => {
  const termButton = event.target.closest("[data-term]");
  if (termButton) return showTerm(termButton.dataset.term);
  const work = event.target.closest("[data-work-event]");
  if (work && !work.disabled) {
    const payload = {};
    if (work.dataset.id) payload.id = work.dataset.id;
    if (work.dataset.source) payload.source = work.dataset.source;
    if (work.dataset.skill) payload.skill = work.dataset.skill;
    closeDialog();
    return dispatch(work.dataset.workEvent, payload);
  }
  const peopleTab2 = event.target.closest("[data-people-tab]");
  if (peopleTab2) return showPeople(peopleTab2.dataset.peopleTab);
  const selectPersonButton = event.target.closest("[data-select-person]");
  if (selectPersonButton) {
    state = { ...state, selectedPersonId: selectPersonButton.dataset.selectPerson, updatedAt: Date.now() };
    save();
    closeDialog();
    render();
    return;
  }
  const button = event.target.closest("[data-dialog-action]");
  if (!button) return;
  if (button.dataset.dialogAction === "reset-confirm") return resetGame();
  if (button.dataset.dialogAction === "end-month") {
    closeDialog();
    return dispatch(EVENTS.END_MONTH);
  }
  if (button.dataset.dialogAction === "people") return showPeople();
  if (button.dataset.dialogAction === "work") return showWorkMenu();
  closeDialog();
});
$("#gameDialog").addEventListener("input", (event) => {
  const search = event.target.closest("[data-people-search]");
  if (!search) return;
  const query = search.value;
  const tab = $("#gameDialog").dataset.peopleTab || "all";
  showPeople(tab, query);
  requestAnimationFrame(() => {
    const input = $("#gameDialog [data-people-search]");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
});
$("#gameDialog").addEventListener("cancel", () => {
  activeDialogKey = null;
});

let panels = null;
let world = null;
let panelSyncPending = false;
function requestPanelSync() {
  if (panelSyncPending) return;
  panelSyncPending = true;
  queueMicrotask(() => { panelSyncPending = false; panels?.sync(); });
}
world = createWorldRenderer(canvas, () => ({state, content, montageVisualDay, stageStartedAt, person: selectedPerson()}));
panels = mountPanels({getState: () => state, dispatch, requestSync: requestPanelSync});
document.addEventListener("visibilitychange", () => {
  audio.setSuspended(document.hidden);
  if (document.hidden) clearAutomation();
  else scheduleAutomaticTransition();
});
reducedMotion.addEventListener?.("change", scheduleAutomaticTransition);
render();
scheduleAutomaticTransition();
world.invalidate();
