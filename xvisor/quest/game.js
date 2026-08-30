import {
  EVENTS,
  MAX_ENERGY,
  PRODUCT_CONFIG,
  ROUTINEX,
  SAVE_KEY,
  STAGES,
  calculateEconomy,
  canDispatch,
  isExamStage,
  makeInitialState,
  parseSavedState,
  reduceGame,
  serializeState,
} from "./game-data.js";
import { commercialStatusLabel } from "./game-commercial-config.js";
import { getStageContent, TERM_HELP } from "./game-copy.js";
import { createAudio } from "./game-audio.js";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#worldCanvas");
const context = canvas.getContext("2d", { alpha: false });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const playerPalette = { skin: "#cb8f69", hair: "#263e4b", shirt: "#4db783", accent: "#f6ce5a" };
const proctorPalette = { skin: "#b9785d", hair: "#253948", shirt: "#5f8fd3", accent: "#f6ce5a" };

function loadStoredState() {
  try { return parseSavedState(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

let state = loadStoredState() || makeInitialState();
let content = getStageContent(state);
let stageTimer = null;
let montageTimer = null;
let montageVisualDay = state.preseason.day;
let activeDialogKey = null;
let lastRenderedStage = null;
let stageStartedAt = performance.now();
let effects = [];
const audio = createAudio(state.soundOn);

const iconGlyphs = Object.freeze({
  play: "▶", band: "⌁", scale: "◎", calendar: "▦", repair: "↺", submit: "✓", next: "→",
  certificate: "◇", flag: "⚑", walk: "→", talk: "···", consent: "○", plan: "↗", offer: "◉",
  care: "♥", academy: "▤", team: "↟", weekly: "◫", month: "≡", briefcase: "▣", check: "✓",
});

const productVisuals = Object.freeze({
  gus: ["G", "#65bd86"], "protein-hmb": ["P", "#ee9a5c"], "vita-matrix": ["V", "#68aee1"], astamega: ["A", "#8e78c8"],
});

function formatNumber(value) { return Math.round(Number(value || 0)).toLocaleString("th-TH"); }
function formatBaht(value) { return `฿${formatNumber(value)}`; }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function save() {
  try { localStorage.setItem(SAVE_KEY, serializeState(state)); } catch { /* in-memory play remains available */ }
}

function announce(message) {
  const live = $("#liveRegion");
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
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
  return [...state.prospects, ...state.customers, ...state.team]
    .find((person) => person.id === state.selectedPersonId)
    || state.prospects[0] || state.customers[0] || state.team[0];
}

function playForEvent(event) {
  const soundMap = {
    [EVENTS.WEAR_BAND]: "band", [EVENTS.START_SELF_SCALE]: "scale", [EVENTS.START_DAY14_SCALE]: "scale",
    [EVENTS.START_DAY28_SCALE]: "scale", [EVENTS.START_CUSTOMER_BASELINE]: "scale", [EVENTS.START_CUSTOMER_REVIEW]: "scale",
    [EVENTS.SELECT_EXAM]: "select", [EVENTS.SELECT_PRACTICE]: "select", [EVENTS.SUBMIT_EXAM]: "submit",
    [EVENTS.SUBMIT_PRACTICE]: "submit", [EVENTS.REPAIR_EXAM]: "repair", [EVENTS.REPAIR_PRACTICE]: "repair",
    [EVENTS.COMPLETE_CERTIFICATION]: "stamp", [EVENTS.CEREMONY_COMPLETE]: "certificate",
    [EVENTS.MAKE_OFFER]: "sale", [EVENTS.OFFER_PROSPECT]: "sale", [EVENTS.REORDER_CUSTOMER]: "reorder",
    [EVENTS.START_WEEKLY]: "meeting", [EVENTS.RUN_WEEKLY]: "meeting", [EVENTS.WEEKLY_COMPLETE]: "meetingDone",
    [EVENTS.RUN_MONTHLY_EVENT]: "event", [EVENTS.END_MONTH]: "monthClose", [EVENTS.START_NEXT_MONTH]: "month",
  };
  if (state.lastEvent === `${EVENTS.SUBMIT_EXAM}_CORRECT` || state.lastEvent === `${EVENTS.SUBMIT_PRACTICE}_CORRECT`) audio.play("correct");
  else if (state.lastEvent === `${EVENTS.SUBMIT_EXAM}_WRONG` || state.lastEvent === `${EVENTS.SUBMIT_PRACTICE}_WRONG`) audio.play("incorrect");
  else audio.play(soundMap[event] || "confirm");
}

function spawnEffect(kind) {
  const count = reducedMotion.matches ? 7 : kind === "coins" ? 18 : 30;
  const colors = kind === "coins" ? ["#f8cc55", "#ffeaa2", "#e89f2f"] : ["#4fc38b", "#66b9ef", "#f18e7b", "#f8cc55", "#ffffff"];
  for (let index = 0; index < count; index += 1) {
    effects.push({ x: 190 + (Math.random() - 0.5) * 70, y: kind === "coins" ? 128 : 82,
      vx: (Math.random() - 0.5) * 2.4, vy: -1.2 - Math.random() * 2.3, life: 48 + Math.random() * 42,
      size: 2 + Math.floor(Math.random() * 3), color: colors[Math.floor(Math.random() * colors.length)] });
  }
}

function dispatch(event, payload = {}) {
  audio.unlock();
  if (!canDispatch(state, event)) return;
  const previous = state;
  const previousTransaction = state.economy.lastTransaction?.id;
  const next = reduceGame(state, event, payload);
  if (next === previous) {
    toast("พลังงานไม่พอสำหรับงานนี้", "hint");
    return;
  }
  state = next;
  playForEvent(event);
  const correct = state.lastEvent?.endsWith("_CORRECT");
  const wrong = state.lastEvent?.endsWith("_WRONG");
  if (correct) toast("ผ่านหลักนี้แล้ว", "success");
  if (wrong) toast("ยังไม่ผ่าน — อ่านหลักสั้น ๆ แล้วซ่อมได้", "hint");
  if (event === EVENTS.MONTAGE_COMPLETE) audio.play("knowledge");
  if ([EVENTS.COMPLETE_CERTIFICATION, EVENTS.CEREMONY_COMPLETE, EVENTS.SAVE_SUCCESS, EVENTS.PREPARE_G1].includes(event)) spawnEffect("confetti");
  if (state.economy.lastTransaction?.id && state.economy.lastTransaction.id !== previousTransaction) {
    spawnEffect("coins");
    if (state.stage !== STAGES.M1_SALE_RECEIPT) queueMicrotask(() => showReceipt(state.economy.lastTransaction));
  }
  if (previous.stage !== state.stage) {
    activeDialogKey = null;
    stageStartedAt = performance.now();
  }
  save();
  render();
  scheduleAutomaticTransition();
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
  };
  const transition = transitions[state.stage];
  if (transition) stageTimer = window.setTimeout(() => dispatch(transition[0]), transition[1]);
}

function updateMontageHud() {
  $("#hudMonth").textContent = `DAY ${montageVisualDay} / 28`;
  $("#hudEnergy").textContent = `⚡ ${montageVisualDay} / 28`;
  $("#energyMeter").style.setProperty("--energy", `${(montageVisualDay / MAX_ENERGY) * 100}%`);
  if (!$("#waitingState").hidden) $("#waitingState").textContent = `DAY ${montageVisualDay} · ENERGY +1`;
}

function renderHud() {
  const economy = calculateEconomy(state);
  const exam = isExamStage(state.stage);
  const preseason = state.month === 0 && !exam && state.stage !== STAGES.CERTIFIED;
  const visibleEnergy = state.stage === STAGES.PRE_MONTAGE ? montageVisualDay : state.energy;
  $("#hudPhaseLabel").textContent = preseason ? "ช่วงการเรียนรู้" : exam ? "สถานที่" : "เวลาในเกม";
  $("#hudMonth").textContent = preseason ? `DAY ${state.preseason.day} / 28` : exam ? "EXAM ROOM" : state.stage === STAGES.CERTIFIED ? "CERTIFIED" : `เดือน ${state.month} / 24`;
  $("#hudEnergyLabel").innerHTML = `${preseason ? "ความพร้อม 28 วัน" : "พลังงานในเดือนนี้"} <b aria-hidden="true">?</b>`;
  $("#hudEnergy").textContent = `⚡ ${visibleEnergy} / ${MAX_ENERGY}`;
  $("#energyMeter").style.setProperty("--energy", `${(visibleEnergy / MAX_ENERGY) * 100}%`);
  const customerCount = state.customers.length + state.prospects.filter((person) => person.activePlan).length;
  $("#hudCustomers").textContent = `${customerCount} คน`;
  $("#hudXV").textContent = `${formatNumber(economy.personalXV)} XV`;
  $("#hudIncome").textContent = formatBaht(economy.projectedIncome);
  $("#hudRank").textContent = state.rank === "xvisor" ? "CERTIFIED X-VISOR" : "CANDIDATE";
  $("#teamChip").hidden = !state.milestones.firstG1;
  $("#teamChip").textContent = `ทีม ${state.team.length} X-VISOR`;
  $("#incomeButton").hidden = exam || state.month < 1;
  $("#monthButton").hidden = state.stage !== STAGES.MANAGEMENT;
  $(".status-strip").dataset.compact = exam || preseason || state.stage === STAGES.CERTIFIED ? "true" : "false";
  [$(".status-item--customers"), $("#hudXVButton"), $(".status-item--income")].forEach((element) => { element.hidden = exam || preseason || state.stage === STAGES.CERTIFIED; });
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
  receipt.innerHTML = `
    <div><span>ยอดสินค้า</span><strong>${formatBaht(transaction.price)}</strong></div>
    <div><span>XV ที่เพิ่ม</span><strong>+${formatNumber(transaction.xv)} XV</strong></div>
    <div><span>รายได้ก่อนรายการนี้</span><strong>${formatBaht(transaction.incomeBefore)}</strong></div>
    <div><span>รายได้เพิ่มจากรายการนี้</span><strong>+${formatBaht(transaction.incomeDelta)}</strong></div>
    <div class="receipt__total"><span>รายได้ประมาณเดือนนี้</span><strong>${formatBaht(transaction.incomeAfter)}</strong></div>
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
    row.textContent = mission.label;
    list.appendChild(row);
  });
  missions.appendChild(list);
  container.appendChild(missions);
  const board = document.createElement("div");
  board.className = "management-board";
  [["PROSPECTS", data.prospects.length], ["CUSTOMERS", data.customers.length], ["TEAM", data.team.length], ["ENERGY", `⚡ ${state.energy}`]].forEach(([label, value]) => {
    board.insertAdjacentHTML("beforeend", `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`);
  });
  container.appendChild(board);
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
    const summary = content.monthSummary;
    renderResultCards(details, [["คนใหม่", summary.newPeople], ["Sales / Reorders", `${summary.sales} / ${summary.reorders}`], ["ลูกค้าที่ดูแล", summary.customersCared], ["Success Cases", summary.successCases], ["Team activity", summary.teamActivity], ["XV", formatNumber(summary.xv)], ["รายได้ปิดรอบ", formatBaht(summary.receivedIncome)]], "summary-grid");
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
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${item.kind === "secondary" ? "action-button--secondary" : "action-button--primary"}`;
  button.dataset.actionIndex = String(index);
  if (item.event) button.dataset.event = item.event;
  if (item.id) button.dataset.id = item.id;
  if (item.value) button.dataset.value = item.value;
  if (item.ui) button.dataset.ui = item.ui;
  button.disabled = Boolean(item.disabled || (item.cost && state.month >= 1 && item.cost > state.energy));
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
  const waiting = { scan: "ข้อมูลกำลังขึ้นทีละค่า", montage: `DAY ${montageVisualDay} · ENERGY +1`, examTransit: "กำลังเดินเข้าห้องสอบและนั่งประจำโต๊ะ", ceremony: "กำลังรับใบรับรอง", weekly: "ทีมกำลังเลือก Next Action" };
  $("#waitingState").textContent = waiting[content.status] || "กำลังดำเนินการ…";
}

function render() {
  content = getStageContent(state);
  renderHud();
  renderGoal();
  renderDialogue();
  renderActions();
  $("#soundButton").setAttribute("aria-pressed", state.soundOn ? "true" : "false");
  $("#soundButton").textContent = state.soundOn ? "เสียง: เปิด" : "เสียง: ปิด";
  document.body.dataset.stage = state.stage;
  document.title = `${content.title || "X-VISOR QUEST"} · X-VISOR QUEST`;
  const exam = isExamStage(state.stage);
  $("#worldLabel").textContent = exam ? "XCADEMY EXAM ROOM" : state.month >= 2 ? "CLOVER MANAGEMENT HUB" : state.month === 1 ? "CLOVER NEIGHBORHOOD" : "PRE-SEASON ROOM";
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
  if (!$("#gameDialog").open) $("#gameDialog").showModal();
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
  const economy = calculateEconomy(state);
  showDialog("income", `<div class="dialog-kicker">รายได้ประมาณเดือนนี้ · ${escapeHtml(commercialStatusLabel(economy.status))}</div>
    <h2>${formatBaht(economy.projectedIncome)}</h2>
    <div class="income-sections"><section><div class="income-heading"><span>คุณขายเอง</span><b>${formatBaht(economy.activeRetail)}</b></div>
      <dl><div><dt>ยอดสินค้าในเกม</dt><dd>${state.economy.sets} รายการ · ${formatBaht(economy.productSales)}</dd></div>
      <div><dt>XV เดือนนี้</dt><dd>${formatNumber(economy.personalXV)} XV</dd></div><div><dt>ขั้นจำลอง</dt><dd>${escapeHtml(economy.tier.label)}</dd></div></dl></section>
      <section><div class="income-heading"><span>รายได้จากทีม</span><b>฿0</b></div><p>ไม่มีรายได้เพราะมีคนอยู่ใต้ทีมเฉย ๆ ต้องมาจากคุณค่าที่ทีมสร้างจริง และกติกาที่ยืนยันแล้วเท่านั้น</p></section></div>
    <div class="income-total"><span>เงินรับแล้วจากรอบที่ปิด</span><strong>${formatBaht(economy.receivedIncome)}</strong></div>
    <p class="dialog-note">Commercial numbers ปัจจุบันเป็น SIMULATION; SKU ที่ยังไม่ยืนยันเก็บเป็น TO_CONFIRM ใน config เดียว</p>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับเกม</button>`);
}

function workButton(label, event, options = {}) {
  const disabled = options.cost > state.energy || options.disabled;
  return `<button type="button" class="work-button" data-work-event="${event}"${options.source ? ` data-source="${options.source}"` : ""}${options.id ? ` data-id="${options.id}"` : ""}${disabled ? " disabled" : ""}>
    <strong>${escapeHtml(label)}</strong><span>${escapeHtml(options.detail || "")}</span>${options.cost ? `<b>⚡ ${options.cost}</b>` : ""}</button>`;
}

function showWorkMenu() {
  const eligibleReferral = state.customers.filter((customer) => customer.referralReady && !customer.referralAsked);
  const customers = state.customers.map((customer) => {
    const buttons = [];
    if (customer.day < 28) buttons.push(workButton(`ติดตาม ${customer.name}`, EVENTS.CARE_CUSTOMER, { id: customer.id, cost: 2, detail: `Day ${customer.day} → checkpoint ถัดไป` }));
    if (customer.day >= 14 && !customer.measuredAgain) buttons.push(workButton(`วัดซ้ำ ${customer.name}`, EVENTS.REMEASURE_CUSTOMER, { id: customer.id, cost: 2, detail: "ดู Trend ก่อนสรุป" }));
    if (customer.day >= 28 && customer.measuredAgain) buttons.push(workButton(`ชวน ${customer.name} ทำต่อ`, EVENTS.REORDER_CUSTOMER, { id: customer.id, cost: 1, detail: "เกิดได้เมื่อดูแลและเห็น Trend" }));
    return buttons.join("");
  }).join("");
  const referrals = eligibleReferral.map((customer) => workButton(`ขอ Referral จาก ${customer.name}`, EVENTS.ASK_REFERRAL, { id: customer.id, cost: 1, detail: "มาจาก trust + result" })).join("");
  const mentors = state.team.filter((member) => member.active).map((member) => workButton(`ช่วย ${member.name}`, EVENTS.MENTOR_TEAM_MEMBER, { id: member.id, cost: 2, detail: `${member.customers} ลูกค้า · confidence ${member.confidence}` })).join("");
  showDialog("work", `<div class="dialog-kicker">WORK MENU · MONTH ${state.month}</div><h2>เลือกงานตามคุณค่าที่อยากสร้าง</h2>
    <section class="work-section"><h3>สร้างโอกาสใหม่</h3><div class="work-grid">
      ${workButton("Relationship", EVENTS.CREATE_LEAD, { source: "relationship", cost: 2, detail: "ออกไปพบคน · ต้อง consult ต่อ" })}
      ${workButton("Creator / Content", EVENTS.CREATE_LEAD, { source: "creator", cost: 3, detail: "แชร์ความรู้จริง · ได้ interest ไม่ใช่ sale" })}
      ${workButton("Company-led Demand", EVENTS.CREATE_LEAD, { source: "company", cost: 1, detail: "Warm lead · ยังต้อง consult และ care" })}
      ${referrals || "<p class=\"work-empty\">Referral จะเปิดจากลูกค้าที่ trust/result พร้อม</p>"}</div></section>
    <section class="work-section"><h3>ดูแลลูกค้า</h3><div class="work-grid">${customers || "<p class=\"work-empty\">ยังไม่มี customer mission เพิ่ม</p>"}</div></section>
    <section class="work-section"><h3>พัฒนาทีมและระบบ</h3><div class="work-grid">${mentors}
      ${workButton("จัด Weekly", EVENTS.RUN_WEEKLY, { cost: 3, disabled: state.monthStats.weeklyDone, detail: state.monthStats.weeklyDone ? "ทำแล้วในเดือนนี้" : "ทุกคนเลือก Next Action" })}
      ${workButton("จัด Monthly Event", EVENTS.RUN_MONTHLY_EVENT, { cost: 4, disabled: state.monthStats.eventDone, detail: state.monthStats.eventDone ? "ทำแล้วในเดือนนี้" : "สร้าง lead + team confidence" })}</div></section>
    <button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="close">กลับกระดาน</button>`);
}

function showTerm(term) {
  showDialog("term", `<div class="dialog-kicker">คำที่ควรรู้</div><h2>${escapeHtml(term)}</h2><p class="term-definition">${escapeHtml(TERM_HELP[term] || "คำนี้จะเปิดเมื่อถึงช่วงที่เกี่ยวข้อง")}</p><button class="dialog-button" type="button" data-dialog-action="close">เข้าใจแล้ว</button>`);
}

function showMonthConfirmation() {
  const economy = calculateEconomy(state);
  showDialog("month", `<div class="dialog-kicker">จบเดือน ${state.month}</div><h2>ปิดรอบตอนนี้ไหม?</h2>
    <p class="dialog-note">พลังงานที่เหลือจะไม่ทบเดือนใหม่ รายได้ประมาณ ${formatBaht(economy.projectedIncome)} จะเพิ่มเข้า “เงินรับแล้ว” ในแบบจำลอง</p>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="close">ทำงานต่อ</button><button class="dialog-button" type="button" data-dialog-action="end-month">ปิดรอบ</button></div>`);
}

function showResetConfirmation() {
  showDialog("reset", `<div class="dialog-kicker">เริ่มเส้นทางใหม่</div><h2>ลบความคืบหน้ารอบนี้ไหม?</h2><p class="dialog-note">ชื่อ ตัวละคร การสอบ ลูกค้า และหลายเดือนที่บันทึกไว้จะถูกลบจากอุปกรณ์นี้</p>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="close">เล่นต่อ</button><button class="dialog-button dialog-button--danger" type="button" data-dialog-action="reset-confirm">เริ่มใหม่</button></div>`);
}

function resetGame() {
  const soundOn = state.soundOn;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  state = { ...makeInitialState(), soundOn };
  montageVisualDay = 0;
  closeDialog();
  save();
  render();
  scheduleAutomaticTransition();
  toast("เริ่ม PRE-SEASON ใหม่ที่ ⚡ 0 / 28", "success");
}

$("#actionBar").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action-index]");
  if (!button || button.disabled) return;
  if (button.dataset.ui === "work") return showWorkMenu();
  const gameEvent = button.dataset.event;
  if (!gameEvent) return;
  const payload = {};
  if (button.dataset.id) payload.id = button.dataset.id;
  if (button.dataset.value) payload.value = button.dataset.value;
  state = { ...state, tutorialSeen: { ...state.tutorialSeen, [state.stage]: true } };
  dispatch(gameEvent, payload);
});

$("#sceneDetails").addEventListener("click", (event) => {
  const quizButton = event.target.closest("[data-quiz-answer]");
  if (quizButton && !quizButton.disabled) return dispatch(content.quiz.exam ? EVENTS.SELECT_EXAM : EVENTS.SELECT_PRACTICE, { answer: quizButton.dataset.quizAnswer });
  const planButton = event.target.closest("[data-plan-id]");
  if (planButton) dispatch(content.routineEvent, { planId: planButton.dataset.planId });
  const termButton = event.target.closest("[data-term]");
  if (termButton) showTerm(termButton.dataset.term);
});

$("#incomeButton").addEventListener("click", () => { audio.unlock(); audio.play("tap"); showIncome(); });
$("#monthButton").addEventListener("click", () => { audio.unlock(); audio.play("tap"); showMonthConfirmation(); });
$("#resetButton").addEventListener("click", () => { audio.unlock(); audio.play("tap"); showResetConfirmation(); });
$("#soundButton").addEventListener("click", () => {
  state = { ...state, soundOn: !state.soundOn, updatedAt: Date.now() };
  audio.setEnabled(state.soundOn); save(); render(); toast(state.soundOn ? "เปิดเสียงแล้ว" : "ปิดเสียงแล้ว");
});
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
    closeDialog();
    return dispatch(work.dataset.workEvent, payload);
  }
  const button = event.target.closest("[data-dialog-action]");
  if (!button) return;
  if (button.dataset.dialogAction === "reset-confirm") return resetGame();
  if (button.dataset.dialogAction === "end-month") { closeDialog(); return dispatch(EVENTS.END_MONTH); }
  closeDialog();
});

$("#gameDialog").addEventListener("cancel", () => { activeDialogKey = null; });

function fill(color) { context.fillStyle = color; }
function rect(x, y, width, height, color) { fill(color); context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height)); }

function drawRoom(theme = "office") {
  const colors = theme === "exam" ? ["#dce9ee", "#aebfca"] : theme === "management" ? ["#e5f2ea", "#b8a57f"] : theme === "pre" ? ["#f5ead6", "#c9a578"] : ["#f8efda", "#c9a578"];
  rect(0, 0, 384, 138, colors[0]); rect(0, 138, 384, 78, colors[1]);
  for (let y = 140; y < 216; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < 384; x += 32) rect(x, y, 16, 16, theme === "exam" ? "#bdccd4" : "#d5b284");
  rect(0, 132, 384, 6, "#24445b");
  if (theme !== "exam") {
    rect(24, 23, 72, 56, "#24445b"); rect(29, 28, 62, 46, "#82cbed"); rect(58, 28, 4, 46, "#f8efda"); rect(29, 49, 62, 4, "#f8efda");
  }
}

function drawTable(x, y, width = 92) { rect(x, y, width, 9, "#24445b"); rect(x + 4, y - 5, width - 8, 7, "#d58b58"); rect(x + 9, y + 9, 7, 31, "#24445b"); rect(x + width - 16, y + 9, 7, 31, "#24445b"); }
function drawChair(x, y, color = "#5f82a2") { rect(x, y, 24, 7, "#24445b"); rect(x + 3, y + 3, 18, 18, color); rect(x + 2, y + 21, 5, 17, "#24445b"); rect(x + 17, y + 21, 5, 17, "#24445b"); }
function drawScale(x, footY, active = false) { rect(x, footY - 8, 34, 7, "#24445b"); rect(x + 3, footY - 13, 28, 9, active ? "#77d6c2" : "#e4eff0"); rect(x + 12, footY - 10, 10, 2, "#24445b"); }
function drawBand(x, y, active = false) { rect(x, y, 13, 5, "#24445b"); rect(x + 4, y - 2, 5, 9, active ? "#71ddc5" : "#66a8cb"); }
function drawProduct(x, y, id = "gus") { const [glyph, color] = productVisuals[id] || ["R", "#67bd83"]; rect(x, y, 22, 31, "#24445b"); rect(x + 3, y + 3, 16, 25, "#eff8e8"); rect(x + 3, y + 3, 16, 7, color); fill("#24445b"); context.font = "bold 8px monospace"; context.fillText(glyph, x + 8, y + 22); }
function drawCertificate(x, y) { rect(x, y, 40, 29, "#24445b"); rect(x + 3, y + 3, 34, 23, "#fff7d8"); rect(x + 9, y + 9, 22, 3, "#67bd83"); rect(x + 14, y + 17, 12, 2, "#e4b947"); }
function drawDataPanel(x, y, improved = false) { rect(x, y, 90, 70, "#24445b"); rect(x + 4, y + 4, 82, 62, "#f7fbf6"); [26, improved ? 60 : 38, improved ? 66 : 32].forEach((width, index) => { rect(x + 12, y + 14 + index * 16, 64, 7, "#dce7e5"); rect(x + 12, y + 14 + index * 16, width, 7, improved ? "#62bd83" : "#e7a65a"); }); }
function drawClock(x, y) { rect(x, y, 34, 34, "#24445b"); rect(x + 4, y + 4, 26, 26, "#fff9e8"); rect(x + 16, y + 8, 3, 10, "#24445b"); rect(x + 17, y + 16, 8, 3, "#24445b"); }
function drawDoor(x, open = false) { rect(x, 46, 48, 92, "#24445b"); rect(x + 5, 51, open ? 12 : 38, 81, "#6c8ca1"); if (!open) rect(x + 34, 91, 4, 4, "#f5ce5c"); }
function drawRoundTable(x, y) { rect(x + 12, y, 72, 8, "#24445b"); rect(x + 4, y + 8, 88, 18, "#24445b"); rect(x + 9, y + 4, 78, 17, "#d58b58"); rect(x + 44, y + 25, 8, 30, "#24445b"); }

function drawCharacterAtFeet(x, footY, palette = playerPalette, options = {}) {
  const walk = options.walk || 0;
  const step = walk ? Math.sin(walk) : 0;
  const jump = options.jump || 0;
  const actualFoot = footY - jump;
  const top = actualFoot - 60;
  const breath = options.idle && !reducedMotion.matches ? (Math.floor(performance.now() / 650) % 2) : 0;
  const direction = options.direction === "left" ? -1 : 1;
  const eyeX = direction === 1 ? 19 : 10;
  if (jump) rect(x + 6, footY + 1, 23, 3, "#8f795f");
  rect(x + 7, top + breath, 18, 4, palette.hair); rect(x + 4, top + 4 + breath, 24, 16, palette.hair);
  rect(x + 7, top + 6 + breath, 18, 17, palette.skin); rect(x + eyeX, top + 12 + breath, 3, 3, "#24445b"); rect(x + (direction === 1 ? 18 : 9), top + 18 + breath, 6, 2, "#a95751");
  rect(x + 5, top + 23, 22, 19, "#24445b"); rect(x + 8, top + 24, 16, 16, palette.shirt); rect(x + 14, top + 25, 4, 12, palette.accent);
  const armLift = options.pose === "celebrate" ? -9 : options.pose === "talk" ? -3 : 1;
  rect(x + 1, top + 26 + armLift, 6, 14, palette.skin); rect(x + 25, top + 26 + armLift, 6, 14, palette.skin);
  const leftX = x + 8 + (step > 0.25 ? -2 : 0); const rightX = x + 18 + (step < -0.25 ? 2 : 0);
  rect(leftX, top + 42, 7, actualFoot - (top + 42) - 4, "#24445b"); rect(rightX, top + 42, 7, actualFoot - (top + 42) - 4, "#24445b");
  rect(leftX - 2, actualFoot - 5, 10, 5, "#eff4eb"); rect(rightX - 1, actualFoot - 5, 10, 5, "#eff4eb");
  if (options.band) drawBand(direction === 1 ? x + 27 : x - 5, top + 35, options.bandActive);
}

function drawSittingCharacter(x, seatY, palette = playerPalette, direction = "right") {
  const top = seatY - 47; const eyeX = direction === "right" ? 19 : 10;
  rect(x + 7, top, 18, 4, palette.hair); rect(x + 4, top + 4, 24, 16, palette.hair); rect(x + 7, top + 6, 18, 17, palette.skin); rect(x + eyeX, top + 12, 3, 3, "#24445b");
  rect(x + 5, top + 23, 22, 18, "#24445b"); rect(x + 8, top + 24, 16, 15, palette.shirt); rect(x + 1, top + 28, 6, 13, palette.skin); rect(x + 25, top + 28, 6, 13, palette.skin);
  rect(x + 8, top + 41, 20, 7, "#24445b"); rect(x + 22, top + 47, 7, 13, "#24445b"); rect(x + 21, top + 57, 11, 4, "#eff4eb");
}

function drawScene(time) {
  context.imageSmoothingEnabled = false;
  const scene = content.scene || "opening";
  const exam = scene.startsWith("exam") || scene === "ceremony";
  const management = scene.startsWith("management") || ["team_started", "month_closed", "season_review"].includes(scene);
  drawRoom(exam ? "exam" : management ? "management" : state.month === 0 ? "pre" : "office");
  const person = selectedPerson();
  const npc = person?.appearance || { skin: "#e0a17a", hair: "#513943", shirt: "#ef8078", accent: "#fff2d4" };
  const idle = { idle: true, band: state.preseason.day > 0 || state.month >= 1, bandActive: scene === "pre_montage" };
  const stageAge = time - stageStartedAt;

  if (exam) {
    drawDoor(16, scene === "exam_transit"); drawClock(326, 26); drawTable(142, 150, 106); drawChair(110, 121, "#708ba1"); drawChair(254, 121, "#8d779d");
    drawCharacterAtFeet(286, 176, proctorPalette, { direction: "left", idle: true });
    rect(178, 118, 28, 18, "#24445b"); rect(181, 121, 22, 12, "#d9f2ef");
    if (scene === "exam_transit") {
      const progress = reducedMotion.matches ? 1 : Math.min(1, stageAge / 1700);
      const x = 34 + Math.min(150, progress * 190);
      if (progress < 0.72) drawCharacterAtFeet(x, 176, playerPalette, { walk: time / 90, direction: "right", band: true });
      else drawSittingCharacter(167, 159, playerPalette, "right");
    } else if (scene === "ceremony") {
      const jump = stageAge > 1200 && stageAge < 1570 && !reducedMotion.matches ? Math.sin(((stageAge - 1200) / 370) * Math.PI) * 9 : 0;
      drawCharacterAtFeet(166, 176, playerPalette, { pose: "celebrate", jump, band: true }); drawCertificate(215, 91);
    } else drawSittingCharacter(167, 159, playerPalette, "right");
  } else if (["pre_scale", "pre_scanning", "pre_day14_scale", "pre_day14_scanning", "pre_day14_review", "pre_day28_scale", "pre_day28_scanning", "pre_day28_review"].includes(scene)) {
    drawScale(178, 177, scene.includes("scanning") || scene.includes("review")); drawCharacterAtFeet(179, 164, playerPalette, { ...idle, idle: !scene.includes("scanning") }); drawDataPanel(268, 63, scene.includes("review") || scene.includes("day28"));
    if (scene.includes("scanning")) rect(165, 105 + ((time / 16) % 56), 62, 3, "#73e3d2");
  } else if (["pre_band", "pre_summary", "pre_abcd", "practice_data", "practice_care", "pre_montage"].includes(scene)) {
    drawTable(232, 154, 92); drawCharacterAtFeet(116, 176, playerPalette, { ...idle, band: scene !== "pre_band" || stageAge > 400, bandActive: scene === "pre_montage" });
    if (scene === "pre_band") drawBand(271, 116, true);
    if (scene === "pre_montage") {
      rect(249, 72, 59, 56, "#24445b"); rect(254, 78, 49, 45, "#fff8df"); rect(254, 78, 49, 9, "#ef8078");
      fill("#24445b"); context.font = "bold 14px monospace"; context.fillText(String(montageVisualDay).padStart(2, "0"), 269, 110);
    } else if (scene === "pre_abcd") ["gus", "protein-hmb", "vita-matrix", "astamega"].forEach((id, index) => drawProduct(231 + index * 24, 117, id));
    else if (scene.startsWith("practice")) { drawSittingCharacter(254, 159, npc, "left"); rect(180, 113, 34, 25, "#24445b"); rect(183, 116, 28, 19, "#d9f2ef"); }
  } else if (scene === "opening") {
    drawScale(74, 177); drawTable(249, 154, 82); drawProduct(276, 118, "gus"); drawCharacterAtFeet(176, 176, playerPalette, { idle: true });
  } else if (["empty_office", "person_arrives", "consultation", "recommendation", "onboarding", "followup", "interest", "candidate", "sale"].includes(scene)) {
    drawTable(139, 154, 108); drawChair(106, 121, "#73a9c3"); drawChair(257, 121, "#d6a275");
    drawCharacterAtFeet(72, 176, playerPalette, { ...idle, direction: "right", pose: scene === "followup" ? "talk" : "idle" });
    if (scene !== "empty_office") {
      const x = scene === "person_arrives" && !reducedMotion.matches ? 330 - Math.min(52, stageAge / 18) : 277;
      drawCharacterAtFeet(x, 176, npc, { idle: scene !== "person_arrives", direction: "left", walk: scene === "person_arrives" ? time / 90 : 0, band: scene !== "person_arrives" });
    }
    if (["recommendation", "onboarding", "sale"].includes(scene)) {
      const products = person?.routinePlan?.products || [];
      (products.length ? products : ["control"]).forEach((id, index) => { if (id !== "control") drawProduct(167 + index * 24, 116, id); });
    }
  } else if (["customer_scale", "customer_scanning", "customer_result", "review_scale", "review_scanning", "review_result"].includes(scene)) {
    drawCharacterAtFeet(70, 176, playerPalette, { ...idle, direction: "right" }); drawScale(222, 177, scene.includes("scanning") || scene.includes("result")); drawCharacterAtFeet(223, 164, npc, { direction: "left", band: true }); drawDataPanel(284, 63, scene.includes("review"));
    if (scene.includes("scanning")) rect(210, 105 + ((time / 16) % 56), 62, 3, "#73e3d2");
  } else if (scene === "routine_builder") {
    drawTable(130, 154, 130); drawSittingCharacter(74, 159, playerPalette, "right"); drawSittingCharacter(278, 159, npc, "left");
    ["gus", "protein-hmb", "vita-matrix", "astamega"].forEach((id, index) => drawProduct(139 + index * 27, 117, id));
  } else if (["success", "first_g1"].includes(scene)) {
    const jump = scene === "first_g1" && !reducedMotion.matches ? Math.max(0, Math.sin((time / 600) % Math.PI) * 5) : 0;
    drawTable(72, 154, 86); drawTable(226, 154, 86); drawCharacterAtFeet(98, 176, playerPalette, { pose: "celebrate", jump }); drawCharacterAtFeet(250, 176, npc, { pose: "celebrate", jump, band: true }); drawCertificate(173, 70);
  } else if (["weekly", "team_started", "management", "management_team", "month_closed", "season_review"].includes(scene)) {
    drawRoundTable(142, 132); drawCharacterAtFeet(55, 176, playerPalette, { direction: "right", pose: "talk", band: true });
    state.team.slice(0, 3).forEach((member, index) => drawCharacterAtFeet(260 + index * 36, 176 - (index % 2) * 52, member.appearance || npc, { direction: "left", idle: true, band: true }));
    if (state.team.length === 0) drawCharacterAtFeet(281, 176, npc, { direction: "left", idle: true });
    drawDataPanel(274, 40, state.monthStats.weeklyDone);
  } else if (scene === "certified") {
    const jump = !reducedMotion.matches ? Math.max(0, Math.sin((stageAge / 700) % Math.PI) * 5) : 0;
    drawCharacterAtFeet(176, 176, playerPalette, { pose: "celebrate", jump, band: true }); drawCertificate(174, 72);
  }

  effects = effects.filter((particle) => particle.life > 0);
  effects.forEach((particle) => { rect(particle.x, particle.y, particle.size, particle.size, particle.color); particle.x += particle.vx; particle.y += particle.vy; particle.vy += 0.06; particle.life -= 1; });
  requestAnimationFrame(drawScene);
}

document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleAutomaticTransition(); });
reducedMotion.addEventListener?.("change", scheduleAutomaticTransition);
render();
scheduleAutomaticTransition();
requestAnimationFrame(drawScene);

export { dispatch as dispatchForDebug };
