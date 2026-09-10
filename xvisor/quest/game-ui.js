import { createWorldRenderer } from "./game-world.js";
import { mountPanels, focusDialogStart, monthGrowthHtml } from "./game-panels.js";
import { normalizeAction, isActionAvailable } from "./game-actions.js";
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
  getActiveEncounter,
  getLiveReadiness,
  getRenewalFollowupEligibility,
  getRecurringBaseSummary,
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
import { getStoryBeat, getTransactionQuantityLabel } from "./game-story.js";
import { paintStoryPortrait } from "./game-portrait.js";
import { createActionPeek } from "./game-action-peek.js";
import { getEncounterCopy } from "./game-narrative-data.js";
var $ = (selector) => document.querySelector(selector);
var canvas = $("#worldCanvas");
var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
var actionPeek = createActionPeek(canvas, reducedMotion);
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
var actionReadyAt = 0;
var choiceGuideExpanded = false;
var storyContext = {};
var lastStoryKey = "";
var monthOpeningExpanded = state.lastEvent === EVENTS.START_NEXT_MONTH;
var displayedRoutineSale = null;
const CHOICE_GUIDE_KEY = "quickChoicesV2";
const ROUTINE_SALE_EVENTS = new Set([EVENTS.MAKE_OFFER, EVENTS.OFFER_PROSPECT, EVENTS.CHOOSE_ROUTINE, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, EVENTS.FAST_TRACK_FULL_START, EVENTS.REORDER_CUSTOMER]);
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
function toast(message, tone = "normal", duration = null) {
  const item = document.createElement("div");
  item.className = `toast toast--${tone}`;
  item.textContent = message;
  $("#toastRegion").appendChild(item);
  requestAnimationFrame(() => item.classList.add("is-visible"));
  window.setTimeout(() => {
    item.classList.remove("is-visible");
    window.setTimeout(() => item.remove(), 220);
  }, duration ?? (reducedMotion.matches ? 700 : 1900));
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
    [EVENTS.MAKE_OFFER]: "plan",
    [EVENTS.OFFER_PROSPECT]: "plan",
    [EVENTS.CHOOSE_ROUTINE]: "plan",
    [EVENTS.CHOOSE_MANAGEMENT_ROUTINE]: "plan",
    [EVENTS.CONTACT_PROSPECT]: "talk",
    [EVENTS.MEET_PROSPECT]: "talk",
    [EVENTS.CONSULT_PROSPECT]: "talk",
    [EVENTS.REQUEST_CONSENT]: "talk",
    [EVENTS.CARE_CUSTOMER]: "care",
    [EVENTS.FOLLOW_UP_CUSTOMER]: "care",
    [EVENTS.CONTINUE_CARE]: "care",
    [EVENTS.MENTOR_TEAM_MEMBER]: "team",
    [EVENTS.ASK_REFERRAL]: "team",
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
    [EVENTS.RUN_LIVE]: "notify",
    [EVENTS.RESOLVE_ENCOUNTER]: "care",
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
    toast("ตอนนี้ยังทำงานนี้ไม่ได้ ลองดูทางเลือกอื่นนะ", "hint");
    return;
  }
  state = next;
  if (state.month !== previous.month) monthOpeningExpanded = true;
  else if (![EVENTS.SELECT_EXAM, EVENTS.SELECT_PRACTICE].includes(event)) monthOpeningExpanded = false;
  if (state.month >= 3 && state.month !== previous.month) choiceGuideExpanded = false;
  storyContext = { previousState: previous, event, payload };
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
  try {
    const moment = world?.playAction?.(previous, state, event, payload);
    if (event === EVENTS.START_NEXT_MONTH && state.monthOpeningReport) actionPeek.stop();
    else actionPeek.show(moment);
  } catch { /* Optional scenery cannot interrupt a saved action. */ }
  render();
  scheduleAutomaticTransition();
  try {
    if (event === EVENTS.SCENE_COMPLETE && previous.stage === STAGES.XIRCLE_RUNNING) audio.play("xircleDone");
    else playForEvent(event, payload);
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
  if (state.month === previous.month && state.economy.lastTransaction?.id && state.economy.lastTransaction.id !== previousTransaction) {
    spawnEffect("coins");
    audio.play("income");
    const sale = getRoutineSaleResult(state, previous);
    if (sale) toast(`${sale.person?.name || "ลูกค้า"} ${sale.repeat ? "กลับมาต่อ" : "เริ่ม"} RoutineX แล้ว · ${sale.incomeLabel}`, "success", 3000);
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
    const interval = reducedMotion.matches ? 18 : Math.max(35, Math.floor(950 / steps));
    montageTimer = window.setInterval(() => {
      montageVisualDay = Math.min(target, montageVisualDay + 1);
      updateMontageHud();
      audio.play(montageVisualDay === target ? "knowledge" : "calendar");
      if (montageVisualDay >= target) {
        window.clearInterval(montageTimer);
        montageTimer = null;
        stageTimer = window.setTimeout(() => dispatch(EVENTS.MONTAGE_COMPLETE), reducedMotion.matches ? 40 : 120);
      }
    }, interval);
    return;
  }
  const short = reducedMotion.matches ? 180 : 850;
  const transitions = {
    [STAGES.PRE_DAY0_SCANNING]: [EVENTS.SELF_SCAN_COMPLETE, short],
    [STAGES.PRE_DAY14_SCANNING]: [EVENTS.DAY14_SCAN_COMPLETE, short],
    [STAGES.PRE_DAY28_SCANNING]: [EVENTS.DAY28_SCAN_COMPLETE, short],
    [STAGES.EXAM_TRANSIT]: [EVENTS.EXAM_TRANSIT_COMPLETE, reducedMotion.matches ? 200 : 900],
    [STAGES.CERTIFICATION_CEREMONY]: [EVENTS.CEREMONY_COMPLETE, reducedMotion.matches ? 300 : 1200],
    [STAGES.M1_BASELINE_SCANNING]: [EVENTS.CUSTOMER_BASELINE_COMPLETE, short],
    [STAGES.M1_REVIEW_SCANNING]: [EVENTS.CUSTOMER_REVIEW_COMPLETE, short],
    [STAGES.M1_WEEKLY_RUNNING]: [EVENTS.WEEKLY_COMPLETE, reducedMotion.matches ? 300 : 950],
    [STAGES.CONTENT_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 250 : 850],
    [STAGES.LIVE_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 350 : 1200],
    [STAGES.ADS_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 250 : 950],
    [STAGES.XCADEMY_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 300 : 1000],
    [STAGES.OPEN_HOUSE_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 300 : 1100],
    [STAGES.CENTER_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 300 : 1000],
    [STAGES.GOOD_LUCK_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 300 : 1100],
    [STAGES.XIRCLE_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 350 : 1100],
    [STAGES.G1_CELEBRATION]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 300 : 1100],
    [STAGES.XLEAD_MILESTONE]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 300 : 1200]
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
  $("#hudPhaseLabel").textContent = preseason ? "ช่วงการเรียนรู้" : exam ? "สถานที่" : "ช่วงเวลา";
  $("#hudMonth").textContent = preseason ? `DAY ${state.preseason.day} / 28` : exam ? "EXAM ROOM" : state.stage === STAGES.CERTIFIED ? "CERTIFIED" : `เดือน ${state.month}`;
  $("#hudEnergyLabel").innerHTML = `${preseason ? "ความพร้อม 28 วัน" : "พลังงานในเดือนนี้"} <b aria-hidden="true">?</b>`;
  $("#hudEnergy").textContent = `⚡ ${visibleEnergy} / ${MAX_ENERGY}`;
  $("#energyMeter").style.setProperty("--energy", `${visibleEnergy / MAX_ENERGY * 100}%`);
  const showCustomerBase = state.month >= 2 && !state.organizationMode;
  const customerCount = showCustomerBase ? getRecurringBaseSummary(state).total : state.customers.length + state.prospects.filter((person) => person.activePlan).length;
  $(".status-item--customers span").textContent = showCustomerBase ? "ฐานสะสม" : "ลูกค้า";
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
  $("#historyButton").hidden = state.month < 1;
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
  const choices = document.createElement("div");
  choices.className = "routine-choices";
  content.routineBuilder.choices.forEach((raw) => {
    const choice = Array.isArray(raw) ? { id: raw[0], label: raw[1], detail: raw[2], ...raw[3] } : raw;
    const { id, label, detail } = choice;
    const available = choice.available !== false;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.planId = id;
    button.disabled = !available;
    button.dataset.available = String(available);
    button.innerHTML = `<span class="routine-choice__top"><b aria-hidden="true">${{ control: "🌱", fit: "🧩", all: "✦" }[id] || "→"}</b><strong>${escapeHtml(label)}</strong><small>${choice.cost ? `⚡ ${choice.cost}` : "ไม่ใช้พลังงาน"}</small></span>
      <span>${escapeHtml(detail || "")}</span>
      ${!available && choice.reason ? `<span class="routine-choice__reason">${escapeHtml(choice.reason)}</span>` : ""}
      ${choice.nextStep ? `<small class="routine-choice__next">${escapeHtml(choice.nextStep)}</small>` : ""}`;
    choices.appendChild(button);
  });
  container.appendChild(choices);
  const help = document.createElement("details");
  help.className = "routine-product-help";
  help.innerHTML = '<summary>ดูตัวช่วยในแผน</summary><p>พฤติกรรมเป็นจุดเริ่มต้น สินค้าเลือกตามสิ่งที่คนนี้ต้องการ</p>';
  const person = selectedPerson();
  const products = person?.fitProducts || content.routineBuilder.fitProducts || [];
  const list = document.createElement("p");
  list.textContent = products.length ? products.map(productName).join(" · ") : "คนนี้เริ่มจากสิ่งที่ทำเองได้ก่อน";
  help.appendChild(list);
  container.appendChild(help);
}
function productName(id) {
  return Object.values(PRODUCT_CONFIG).find((item) => item.id === id)?.name || id;
}
function renderReceipt(container, transaction) {
  if (!transaction) return;
  const receipt = document.createElement("div");
  receipt.className = "receipt receipt--inline";
  const quantityLabel = getTransactionQuantityLabel(transaction);
  const itemRows = (transaction.items || []).map((item) => `<div><span>${escapeHtml(item.name)}${getTransactionQuantityLabel(item) ? ` · ${escapeHtml(getTransactionQuantityLabel(item))}` : ""}${item.cycle === "monthly" ? " · รายเดือน" : " · ครั้งแรกครั้งเดียว"}</span><strong>${formatBaht(item.price)} · ${formatNumber(item.xv)} XV${getTransactionQuantityLabel(item) ? " / ชุด" : ""}</strong></div>`).join("");
  receipt.innerHTML = `
    ${quantityLabel ? `<div data-receipt-quantity><span>เริ่มด้วยกัน</span><strong>${escapeHtml(quantityLabel)}</strong></div>` : ""}
    ${itemRows}
    <div class="receipt__total"><span>ยอดรวม</span><strong>${formatBaht(transaction.price)} · ${formatNumber(transaction.xv)} XV</strong></div>
    <div><span>รายได้ก่อนรายการนี้</span><strong>${formatBaht(transaction.incomeBefore)}</strong></div>
    <div><span>รายได้เพิ่มจากรายการนี้</span><strong>${signedBaht(transaction.incomeDelta)}</strong></div>
    <div><span>① รายได้เดือนนี้หลังรายการ</span><strong>${formatBaht(transaction.incomeAfter)}</strong></div>
    ${quantityLabel ? '<small>รอบถัดไปติดตามแผนของเจ้าตัว 1 ชุด</small>' : ""}
    <small>${escapeHtml(commercialStatusLabel(transaction.status))} · ไม่ใช่การรับประกันรายได้จริง</small>`;
  container.appendChild(receipt);
}
function getRoutineSaleResult(current, previous = null) {
  const transaction = current.economy?.lastTransaction;
  if (!transaction?.id || !(transaction.items || []).some(item => String(item.id).startsWith("routinex"))) return null;
  // Live has its own group result; a retained Live receipt must never become a
  // second personal-sale celebration, including after a reload.
  if ((current.liveReport?.transactions || []).some(item => item.id === transaction.id)) return null;
  if (previous) {
    if (current.month !== previous.month || transaction.id === previous.economy?.lastTransaction?.id) return null;
  } else if (current.stage !== STAGES.M1_SALE_RECEIPT && !ROUTINE_SALE_EVENTS.has(current.lastEvent)) return null;
  const allPeople = [...current.customers, ...current.prospects, ...current.team];
  const targetId = transaction.customerId || current.selectedPersonId;
  const person = allPeople.find(item => item.id === targetId || item.personId === targetId);
  const income = Number(transaction.incomeDelta);
  const incomeKnown = transaction.incomeDelta != null && Number.isFinite(income);
  return {
    transaction, person, repeat: transaction.kind === "reorder", quantityLabel: getTransactionQuantityLabel(transaction),
    incomeLabel: incomeKnown ? `รายได้เพิ่ม ${signedBaht(income)}` : "บันทึกรายการแล้ว",
    income: incomeKnown ? signedBaht(income) : "—"
  };
}
function renderBriefResults() {
  let stack = $("#briefResults");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "briefResults";
    stack.className = "brief-results";
    stack.addEventListener("click", event => {
      if (event.target.closest("[data-open-receipt]") && displayedRoutineSale) return showReceipt(displayedRoutineSale.transaction);
      const customer = event.target.closest("[data-month-follow-up]");
      if (customer) return showPeople("all", "", customer.dataset.monthFollowUp);
      if (event.target.closest("[data-month-people]")) return showPeople("all");
    });
    stack.addEventListener("toggle", event => {
      if (event.target.matches(".month-opening-card")) monthOpeningExpanded = event.target.open;
    }, true);
  }
  // Keep the result next to the available actions at every viewport width.
  $("#actionDock").before(stack);
  stack.replaceChildren();
  displayedRoutineSale = getRoutineSaleResult(state, storyContext.previousState);
  if (displayedRoutineSale) {
    const sale = displayedRoutineSale;
    const result = document.createElement("section");
    result.className = "routine-sale-result";
    result.dataset.transactionId = sale.transaction.id;
    if (sale.quantityLabel) result.dataset.quantity = String(sale.transaction.quantity);
    result.setAttribute("aria-label", "ผลขาย RoutineX");
    result.innerHTML = `<canvas class="routine-sale-result__portrait" width="192" height="192" aria-hidden="true"></canvas><div class="routine-sale-result__copy"><span>${sale.repeat ? "กลับมาต่อด้วยกัน" : "เริ่มแผนด้วยกันแล้ว"} <b aria-hidden="true">✓</b></span><strong>${escapeHtml(sale.person?.name || "ลูกค้า")} ${sale.repeat ? "กลับมาต่อ" : "เริ่ม"} RoutineX${sale.quantityLabel ? ` · ${escapeHtml(sale.quantityLabel)}` : ""}</strong></div><div class="routine-sale-result__income"><small>รายได้เพิ่ม</small><strong>${escapeHtml(sale.income)}</strong></div><button type="button" data-open-receipt>ดูใบสรุป <span aria-hidden="true">→</span></button>`;
    stack.appendChild(result);
    paintStoryPortrait(result.querySelector("canvas"), { portrait: "customer" }, sale.person);
  }
  const report = Number(state.monthOpeningReport?.month) === state.month ? state.monthOpeningReport : null;
  const base = getRecurringBaseSummary(state);
  if (content.management && (report || base.total > 0)) {
    const automaticCustomerIds = [...new Set(report?.automaticCustomerIds || [])];
    const automaticMemberIds = [...new Set(report?.automaticDirectMemberIds || [])];
    const automaticIds = [...new Set([...automaticCustomerIds, ...automaticMemberIds])];
    const pausedIds = [...new Set(report?.pausedCustomerIds || [])];
    const followUpIds = [...new Set(report?.followUpCustomerIds || [])].filter(id => !automaticIds.includes(id) && !pausedIds.includes(id));
    const people = [...state.customers, ...state.team, ...state.prospects];
    const findCustomer = id => people.find(person => person.id === id || person.personId === id);
    const candidates = [...followUpIds, ...pausedIds].map(findCustomer).filter(Boolean);
    const followUp = candidates.find(person => getRenewalFollowupEligibility(state, person).available);
    const waitingForEnergy = !followUp && Number(state.energy) < 1 && candidates.some(person => Number(person.lastRenewalFollowUpMonth) !== state.month && Number(person.lastReorderMonth) !== state.month);
    const nextStep = followUp ? `XOS · ${followUp.name} ${pausedIds.some(id => id === followUp.id || id === followUp.personId) ? "ขอพัก ลองฟังสิ่งที่ติดขัด" : "ยังรอตัดสินใจ ลองคุยแฟ้ม X ต่อ"}`
      : waitingForEnergy ? "เก็บคนที่ยังรอไว้คุยเดือนหน้า เมื่อมีพลังงานรอบใหม่"
      : candidates.length ? "คุยรอบนี้ครบแล้ว ดูแลคนที่ต่อแผน และให้เวลาคนที่ขอพัก"
      : "ความสัมพันธ์ที่ดูแลไว้ เป็นจุดเริ่มของรอบต่อไป";
    const card = document.createElement("details");
    card.className = "month-opening-card";
    card.dataset.month = String(state.month);
    card.dataset.renewed = String(automaticIds.length);
    card.dataset.customerBase = String(base.total);
    card.open = monthOpeningExpanded;
    const incomeDelta = Number(report?.incomeDelta);
    const incomeLabel = report?.incomeDelta != null && Number.isFinite(incomeDelta) ? signedBaht(incomeDelta) : "—";
    const openingLine = report
      ? automaticIds.length ? `ต่อเอง ${formatNumber(automaticIds.length)} คน · รายได้เพิ่ม ${incomeLabel}` : base.total > 0 ? "ฐานเดิมยังอยู่ · ดูแลกันต่อได้" : "เริ่มสร้างฐานจากคนแรก"
      : `ลูกค้า ${formatNumber(base.customerCount)} · X-VISOR สายตรง ${formatNumber(base.directMemberCount)}`;
    const baseCopy = base.total > 0 ? "คนที่เคยซื้อยังอยู่ในฐานของคุณ แม้บางคนจะขอพัก" : "เริ่มจากคนแรก แล้วค่อยดูแลให้กลับมาต่อกัน";
    const openingHtml = report ? `<div class="month-opening-card__opening"><p><strong>รายการเมื่อเริ่มเดือน ${formatNumber(report.month)}</strong> · ${automaticIds.length ? `รายได้เพิ่ม ${escapeHtml(incomeLabel)}` : "ยังไม่มีรายการต่อเอง"}</p><div class="month-opening-card__counts"><span>ลูกค้าต่อเอง <b>${formatNumber(automaticCustomerIds.length)}</b></span><span>X-VISOR ต่อเอง <b>${formatNumber(automaticMemberIds.length)}</b></span><span>รอคุย <b>${formatNumber(followUpIds.length)}</b></span><span>ขอพัก <b>${formatNumber(pausedIds.length)}</b></span></div></div>` : "";
    card.innerHTML = `<summary><span><strong>ฐานที่สร้างมา ${formatNumber(base.total)} คน · เดือน ${formatNumber(state.month)}</strong><small>${escapeHtml(openingLine)}</small></span><span class="month-opening-card__chevron" aria-hidden="true">⌄</span></summary><div class="month-opening-card__body"><div class="customer-base-metrics" aria-label="ฐานสะสมของคุณ"><div><span>ลูกค้าสะสม</span><strong>${formatNumber(base.customerCount)}</strong></div><div><span>X-VISOR สายตรง</span><strong>${formatNumber(base.directMemberCount)}</strong></div><div><span>สัมพันธ์ดี</span><strong>${formatNumber(base.loyalCount)}</strong></div></div><p class="month-opening-card__context">${baseCopy}</p>${openingHtml}<p class="month-opening-card__sales">เดือนนี้ซื้อแล้ว <b>${formatNumber(base.purchasedThisMonth)} คน</b> · ยอดส่วนตัว <b>${formatBaht(base.personalSalesBaht)}</b><small>ลูกค้า + ยอดใช้เองของ X-VISOR สายตรง · ${formatNumber(base.personalXV)} XV × ${formatNumber(base.rate * 100)}%</small></p><p class="month-opening-card__next">${escapeHtml(nextStep)}</p><div class="month-opening-card__actions">${followUp ? `<button type="button" data-month-follow-up="${escapeHtml(followUp.id)}">คุยแฟ้ม X กับ ${escapeHtml(followUp.name)} <span aria-hidden="true">→</span></button>` : ""}<button type="button" data-month-people>ดูคนของคุณ</button></div></div>`;
    stack.appendChild(card);
  }
  stack.hidden = !stack.childElementCount;
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
  container.insertAdjacentHTML("beforeend", monthGrowthHtml(state, state.month));
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
  const wrap = document.createElement("details");
  wrap.className = "month-summary-sections month-summary-more";
  wrap.innerHTML = '<summary>ดูรายละเอียดกิจกรรมและผลลัพธ์เดือนนี้</summary>';
  sections.forEach(([title, rows]) => {
    const section = document.createElement("section");
    section.innerHTML = `<h3>${title}</h3>`;
    renderResultCards(section, rows, "summary-grid");
    wrap.appendChild(section);
  });
  container.appendChild(wrap);
}
function renderDialogue() {
  const beat = getStoryBeat(state, content, storyContext);
  const encounter = content.management ? getActiveEncounter(state) : null;
  const encounterCopy = encounter ? getEncounterCopy(encounter, state) : null;
  const actor = encounterCopy ? { ...encounterCopy, key: encounter.id } : beat || { speaker: content.speaker || "ทีม", line: content.dialogue || "", portrait: content.portrait || (content.speaker === "เอโกะ" ? "ako" : content.quiz && content.speaker !== "ทีม" ? "teacher" : "teem"), key: `${state.stage}:${content.dialogue || ""}` };
  const card = $("#storyCard");
  card.hidden = !actor.line;
  card.dataset.speaker = actor.portrait;
  card.dataset.mood = actor.mood || "warm";
  card.dataset.storyKey = actor.key;
  $("#dialogueSpeaker").textContent = actor.speaker;
  $("#dialogueText").textContent = actor.line;
  $("#storyTip").textContent = actor.tip || "";
  $("#storyTip").hidden = !actor.tip;
  paintStoryPortrait($("#storyPortrait"), actor, selectedPerson());
  let choices = card.querySelector(".story-choices");
  if (!choices) { choices = document.createElement("div"); choices.className = "story-choices"; card.querySelector(".story-card__body").appendChild(choices); }
  choices.replaceChildren();
  choices.hidden = !encounterCopy;
  if (encounterCopy) {
    card.dataset.encounterId = encounter.id;
    for (const choice of encounterCopy.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.encounterChoice = choice.id;
      button.dataset.encounterId = encounter.id;
      button.className = choice.id === "skip" ? "story-choice story-choice--skip" : "story-choice";
      button.innerHTML = `<strong>${escapeHtml(choice.label)}</strong>${choice.id !== "skip" ? `<small>${escapeHtml(choice.detail)}</small>` : ""}`;
      choices.appendChild(button);
    }
  } else delete card.dataset.encounterId;
  if (actor.key !== lastStoryKey) {
    lastStoryKey = actor.key;
    card.classList.remove("is-speaking");
    void card.offsetWidth;
    card.classList.add("is-speaking");
  }
  const details = $("#sceneDetails");
  const managementOpen = Boolean(details.querySelector('[data-management-detail]')?.open);
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
  const liveReport = state.lastEvent === EVENTS.RUN_LIVE && Number(state.liveReport?.month) === state.month ? state.liveReport : null;
  if (liveReport) {
    const liveSummary = document.createElement("section");
    liveSummary.className = "live-result";
    const people = [...state.customers, ...state.prospects];
    const peopleName = id => people.find(person => person.id === id)?.name || "คนที่ร่วม Live";
    liveSummary.innerHTML = `<div class="live-result__heading"><strong>Live ครั้งนี้</strong><span>คุย ${liveReport.attempted} คน · เริ่มแผน ${liveReport.sales} คน</span></div><p>รายได้เพิ่ม ${signedBaht(liveReport.transactions.reduce((sum, item) => sum + Number(item.incomeDelta || 0), 0))}</p><details><summary>ดูผลรายคน</summary>${liveReport.attemptedIds.map(id => {
      const sold = !liveReport.declinedIds.includes(id);
      const index = liveReport.attemptedIds.filter(item => !liveReport.declinedIds.includes(item)).indexOf(id);
      const quantityLabel = getTransactionQuantityLabel(liveReport.transactions[index]);
      return `<div class="live-result__person"><span>${escapeHtml(peopleName(id))}</span>${sold ? `<button type="button" data-live-receipt="${index}">เริ่ม${quantityLabel ? ` ${escapeHtml(quantityLabel)}` : "แผน"} · ดูใบสรุป →</button>` : "<small>ขอเวลา · คุยต่อเดือนหน้า</small>"}</div>`;
    }).join("")}</details>`;
    details.appendChild(liveSummary);
  }
  if (content.management) {
    const more = document.createElement("details");
    more.dataset.managementDetail = "true";
    more.className = "scene-more";
    more.open = managementOpen;
    more.innerHTML = '<summary>ดูลูกค้า ทีม และงานที่ค้าง</summary>';
    const body = document.createElement("div");
    renderManagement(body, content.management);
    more.appendChild(body);
    details.appendChild(more);
  }
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
  $("#scenePanel").hidden = !details.childElementCount;
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
    <span class="action-button__copy">${item.categoryLabel ? `<span class="action-button__category">${escapeHtml(item.categoryLabel)}</span>` : ""}<strong>${escapeHtml(item.label)}</strong>${item.detail || item.reason ? `<small>${escapeHtml(item.detail || item.reason)}</small>` : ""}</span>
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
    live: "ตอบคำถามพร้อมกัน · แต่ละคนเลือกเมื่อพร้อม",
    ads: "Campaign กำลังสร้าง Interest",
    xcademy: "Xcademy กำลังช่วยหลายคนพร้อมกัน",
    openhouse: "Open House กำลังสรุป batch impact",
    g1: "ต้อนรับ X-VISOR คนใหม่",
    xlead: "กำลังเปิดช่อง ② และ Organization Map",
    xgen: "พร้อมนำ Organization แล้ว",
    xircle: "ร่วม The Xircle · เติมพลังและเชื่อมทีมอีกครั้ง"
  };
  $("#waitingState").textContent = waiting[content.status] || "กำลังดำเนินการ…";
  renderChoiceGuide();
}
function acknowledgeChoiceGuide() {
  state = { ...state, tutorialSeen: { ...state.tutorialSeen, [CHOICE_GUIDE_KEY]: true } };
  choiceGuideExpanded = false;
  save();
  renderChoiceGuide();
}
function renderChoiceGuide() {
  const dock = $("#actionDock");
  const management = Boolean(content.management && !state.organizationMode);
  dock.dataset.management = String(management);
  let guide = $("#choiceGuide");
  let toolbar = $("#choiceToolbar");
  let feedback = $("#choiceFeedback");
  if (!guide) {
    guide = document.createElement("section");
    guide.id = "choiceGuide";
    guide.className = "choice-guide";
    guide.setAttribute("aria-labelledby", "choiceGuideTitle");
    guide.innerHTML = `<strong id="choiceGuideTitle">จากนี้ คุณเลือกเส้นทางเองได้แล้ว</strong>
      <div class="choice-guide__steps"><p><b>01 · เลือกงาน</b> 3 ใบด้านล่างเป็นงานแนะนำ และจะเปลี่ยนตามสถานการณ์</p><p><b>02 · ลองทางอื่น</b> เปิด “ทางเลือกทั้งหมด” เพื่อหาคน ฝึกทักษะ หรือพัฒนาทีมได้อีก</p><p><b>03 · วางแผนเดือนนี้</b> แต่ละงานใช้ ⚡ เมื่อพร้อมค่อยจบเดือน พลังงานที่เหลือไม่ทบเดือนหน้า</p></div>
      <div class="choice-guide__actions"><button type="button" class="dialog-button" data-choice-work>ลองดูทางเลือกทั้งหมด →</button><button type="button" class="dialog-button dialog-button--secondary" data-choice-dismiss>ซ่อนคำแนะนำ · เรียกกลับมาได้</button></div>`;
    dock.insertBefore(guide, $("#actionBar"));
    feedback = document.createElement("p");
    feedback.id = "choiceFeedback";
    feedback.className = "choice-feedback";
    feedback.setAttribute("role", "status");
    dock.insertBefore(feedback, $("#actionBar"));
    toolbar = document.createElement("div");
    toolbar.id = "choiceToolbar";
    toolbar.className = "choice-toolbar";
    toolbar.innerHTML = `<button type="button" class="choice-toolbar__more" data-choice-work>🧭 ทางเลือกทั้งหมด <span aria-hidden="true">→</span></button><button type="button" data-choice-help aria-controls="choiceGuide" aria-expanded="false">วิธีเลือกงาน</button>`;
    dock.appendChild(toolbar);
  }
  guide.hidden = !management || !choiceGuideExpanded && (Boolean(state.tutorialSeen?.[CHOICE_GUIDE_KEY]) || state.month >= 3);
  const spoken = $("#dialogueText").textContent;
  feedback.hidden = !management || !state.lastMessage || spoken === state.lastMessage || Boolean(displayedRoutineSale);
  feedback.textContent = state.lastMessage || "";
  toolbar.hidden = !management;
  toolbar.querySelector("[data-choice-help]").setAttribute("aria-expanded", String(!guide.hidden));
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
  $(".action-dock__heading span").textContent = content.management ? "งานแนะนำตอนนี้" : "ทำอะไรต่อ";
  $(".action-dock__heading small").textContent = content.management ? `เลือกได้มากกว่า 3 ทาง · ⚡ ${state.energy} เหลือ` : "เลือกสิ่งที่คุ้มที่สุด";
  const storyCard = $("#storyCard");
  if (controls.firstElementChild !== storyCard) controls.prepend(storyCard);
  if (management && storyCard.nextElementSibling !== dock) storyCard.after(dock);
  if (!management && controls.lastElementChild !== dock) controls.append(dock);
  renderHud();
  renderGoal();
  renderDialogue();
  renderBriefResults();
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
  focusDialogStart($("#gameDialog"));
}
function closeDialog() {
  if ($("#gameDialog").open) $("#gameDialog").close();
  document.body.style.removeProperty("overflow");
  activeDialogKey = null;
}
function showReceipt(transaction) {
  showDialog("receipt", `<div class="dialog-kicker">SALE RECEIPT · ${escapeHtml(commercialStatusLabel(transaction.status))}</div>
    <h2>XV และรายได้เป็นคนละตัวเลข</h2><div id="dialogReceipt"></div>
    <p class="dialog-note">ตัวเลขนี้ใช้ประกอบการเรียนรู้ ไม่ใช่ราคา ขั้นคุณสมบัติ หรือการรับประกันรายได้จริง</p>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับไปดูแลงานต่อ</button>`, { kind: "celebrate" });
  renderReceipt($("#dialogReceipt"), transaction);
}
function showIncome() {
  return panels.showIncome();
}
function workButton(label, event, options = {}) {
  const disabled = options.disabled || !canDispatch(state, event) || !isActionAvailable(state, { event, ...options });
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
  showDialog("skills", `<div class="dialog-kicker">⭐ ${state.rank === "xgen" ? "XGEN" : state.rank === "xlead" ? "XLEAD" : "X-VISOR"} Lv.${snapshot.playerLevel}</div><h2>ความเก่งของคุณ</h2><p class="dialog-note">ลงทุน 1 ⚡ เพื่อพัฒนาวิธีทำงาน เมื่อถึง Lv.10 ลูกค้าและทีมจะทำงานปกติเอง คุณดูเฉพาะเรื่องสำคัญ</p>
    <div class="skill-grid">${cards}</div>
    <section class="xlead-progress"><h3>เส้นทาง XLEAD</h3><ul>${xlead}</ul><small>${escapeHtml(progress.note)}</small></section>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับไปทำงาน</button>`, { kind: "wide" });
}
function showWorkMenu() {
  if (!content.management || state.organizationMode) return;
  const skills = getSkillSnapshot(state);
  const contentLocked = skills.playerLevel < PLAYER_UNLOCKS.content;
  const adsLocked = skills.playerLevel < PLAYER_UNLOCKS.ads;
  const live = getLiveReadiness(state);
  const mentors = state.team.filter((member) => member.active && member.autonomy < 85).slice(0, 8).map((member) => workButton(`Review เคสกับ ${member.name}`, EVENTS.MENTOR_TEAM_MEMBER, { id: member.id, cost: 1, detail: `${member.customers} ลูกค้า · ${member.autonomy >= 70 ? "ใกล้ทำเองเต็มที่" : member.autonomy >= 45 ? "เริ่มทำเองได้" : "ยังต้องซ้อมด้วยกัน"}` })).join("");
  const training = SKILL_IDS.map((id) => workButton(`${SKILL_DEFINITIONS[id].icon} ${SKILL_DEFINITIONS[id].practice}`, EVENTS.TRAIN_SKILL, { skill: id, cost: 1, detail: `${SKILL_DEFINITIONS[id].name} Lv.${skills.skills[id].level} · ${getSkillBenefit(id, Math.min(10, skills.skills[id].level + 1))}` })).join("");
  showDialog("work", `<div class="dialog-kicker">ทางเลือกทั้งหมด · เดือน ${state.month} · ⚡ ${state.energy} เหลือ</div><h2>เดือนนี้อยากสร้างอะไรเพิ่ม?</h2><p class="dialog-note">งานแนะนำเป็นเพียงจุดเริ่มต้น เลือกทำงานเหล่านี้สลับกันได้ แล้วกลับมาดูผลบนกระดาน</p>
    <section class="work-section"><h3>สร้างโอกาสใหม่</h3><div class="work-grid">
      ${workButton("ทำความรู้จักคนใหม่", EVENTS.CREATE_LEAD, { source: "known", cost: 1, detail: "ได้ 1 คน · ต้องทักและคุยก่อน Sale" })}
      ${workButton("ทำคอนเทนต์", EVENTS.CREATE_LEAD, { source: "content", cost: 1, disabled: contentLocked, detail: contentLocked ? "เปิดที่ X-VISOR Lv.2" : "เล่าเรื่องให้คนสนใจ แล้วชวนมาคุย" })}
      ${workButton("เปิด Live · คุยพร้อมกัน", EVENTS.RUN_LIVE, { cost: live.cost, disabled: !live.available, detail: live.available ? `มีคนพร้อม ${live.eligibleCount} คน · คุยได้ครั้งละ ${live.capacity} คน` : live.reason })}
      ${workButton("ทำโฆษณา", EVENTS.CREATE_LEAD, { source: "ads", cost: 1, disabled: adsLocked, detail: adsLocked ? "เปิดที่ X-VISOR Lv.4" : `งบแคมเปญ ${formatBaht(ADS_GAMEPLAY_CONFIG.budgetPerCampaign)} แยกจากรายได้` })}</div></section>
    <section class="work-section"><h3>ฝึกให้ 1 ⚡ คุ้มขึ้น</h3><div class="work-grid">${training}</div></section>
    <section class="work-section"><h3>🎓 Batch และทีม</h3><div class="work-grid">${mentors}
      ${workButton(`Xcademy · ครั้ง ${Number(state.monthStats.xcademySessions || 0) + 1}/4`, EVENTS.RUN_XCADEMY, { cost: 2, disabled: Number(state.monthStats.xcademySessions || 0) >= 4, detail: Number(state.monthStats.xcademySessions || 0) >= 4 ? "ครบ 4 ครั้งเดือนนี้" : "OPP + Training · เลือกคนที่เหมาะสมอัตโนมัติ" })}
      ${workButton("🏠 Open House", EVENTS.RUN_OPEN_HOUSE, { cost: 2, disabled: state.monthStats.openHouseDone, detail: state.monthStats.openHouseDone ? "ทำแล้วในเดือนนี้" : "ชวนทุกคนที่เหมาะสม · batch impact" })}
      ${workButton("🌙 The Xircle · เติมพลังทีม", EVENTS.RUN_XIRCLE, { cost: 2, detail: state.monthStats.xircleDone ? "ร่วมแล้วในเดือนนี้" : canDispatch(state, EVENTS.RUN_XIRCLE) ? "เชื่อมทีม เติม Momentum และกลับมาดูแลคนต่อ" : "เปิดในเดือน 3, 6, 9 และ 12" })}
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
  storyContext = {};
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
  if (performance.now() < actionReadyAt) return;
  const payload = {};
  if (button.dataset.id) payload.id = button.dataset.id;
  if (button.dataset.value) payload.value = button.dataset.value;
  if (button.dataset.source) payload.source = button.dataset.source;
  if (button.dataset.skill) payload.skill = button.dataset.skill;
  state = { ...state, tutorialSeen: { ...state.tutorialSeen, [state.stage]: true } };
  if (gameEvent === EVENTS.END_MONTH) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return showMonthConfirmation();
  }
  actionReadyAt = performance.now() + 350;
  dispatch(gameEvent, payload);
});
$("#actionDock").addEventListener("click", (event) => {
  if (event.target.closest("[data-choice-work]")) {
    acknowledgeChoiceGuide();
    return showWorkMenu();
  }
  if (event.target.closest("[data-choice-dismiss]")) {
    acknowledgeChoiceGuide();
    $("#actionBar button:not(:disabled)")?.focus();
  }
  if (event.target.closest("[data-choice-help]")) {
    choiceGuideExpanded = $("#choiceGuide").hidden;
    renderChoiceGuide();
  }
});
$("#sceneDetails").addEventListener("click", (event) => {
  const liveReceipt = event.target.closest("[data-live-receipt]");
  if (liveReceipt) return showReceipt(state.liveReport.transactions[Number(liveReceipt.dataset.liveReceipt)]);
  if (event.target.closest("[data-open-receipt]")) return showReceipt(state.economy.lastTransaction);
  const quizButton = event.target.closest("[data-quiz-answer]");
  if (quizButton && !quizButton.disabled) return dispatch(content.quiz.exam ? EVENTS.SELECT_EXAM : EVENTS.SELECT_PRACTICE, { answer: quizButton.dataset.quizAnswer });
  const planButton = event.target.closest("[data-plan-id]");
  if (planButton && !planButton.disabled && performance.now() >= actionReadyAt) {
    actionReadyAt = performance.now() + 350;
    dispatch(content.routineEvent, { planId: planButton.dataset.planId });
  }
  const termButton = event.target.closest("[data-term]");
  if (termButton) showTerm(termButton.dataset.term);
  const personButton = event.target.closest("[data-person-id]");
  if (personButton) showPeople("all", "", personButton.dataset.personId);
  if (event.target.closest("[data-open-people]")) showPeople();
  if (event.target.closest("[data-open-work]")) showWorkMenu();
  if (event.target.closest("[data-open-skills]")) showSkills();
});
$("#storyCard").addEventListener("click", event => {
  const choice = event.target.closest("[data-encounter-choice]");
  if (!choice || choice.disabled || performance.now() < actionReadyAt) return;
  actionReadyAt = performance.now() + 350;
  dispatch(EVENTS.RESOLVE_ENCOUNTER, { choiceId: choice.dataset.encounterChoice, encounterId: choice.dataset.encounterId });
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
$("#gameDialog").addEventListener("close", () => {
  document.body.style.removeProperty("overflow");
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
