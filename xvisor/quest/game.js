import {
  EVENTS,
  ENERGY_COSTS,
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
import { ADS_GAMEPLAY_CONFIG, commercialStatusLabel } from "./game-commercial-config.js";
import {
  PLAYER_UNLOCKS,
  SKILL_DEFINITIONS,
  SKILL_IDS,
  directMentoringAvailable,
  getSkillBenefit,
  getSkillSnapshot,
  getXleadProgress,
} from "./game-progression.js";
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
  content: "✎", ads: "◎", people: "●", skill: "★",
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

function uniquePeopleCount() {
  return new Set([
    ...state.prospects.map((person) => person.personId || person.id),
    ...state.customers.map((person) => person.personId || person.id),
    ...state.team.map((person) => person.personId || person.id),
  ]).size;
}

function playForEvent(event, payload = {}) {
  const soundMap = {
    [EVENTS.WEAR_BAND]: "band", [EVENTS.START_SELF_SCALE]: "scale", [EVENTS.START_DAY14_SCALE]: "scale",
    [EVENTS.START_DAY28_SCALE]: "scale", [EVENTS.START_CUSTOMER_BASELINE]: "scale", [EVENTS.START_CUSTOMER_REVIEW]: "scale",
    [EVENTS.SELECT_EXAM]: "select", [EVENTS.SELECT_PRACTICE]: "select", [EVENTS.SUBMIT_EXAM]: "submit",
    [EVENTS.SUBMIT_PRACTICE]: "submit", [EVENTS.REPAIR_EXAM]: "repair", [EVENTS.REPAIR_PRACTICE]: "repair",
    [EVENTS.COMPLETE_CERTIFICATION]: "stamp", [EVENTS.CEREMONY_COMPLETE]: "certificate",
    [EVENTS.MAKE_OFFER]: "sale", [EVENTS.OFFER_PROSPECT]: "sale", [EVENTS.REORDER_CUSTOMER]: "reorder",
    [EVENTS.START_WEEKLY]: "meeting", [EVENTS.RUN_WEEKLY]: "meeting", [EVENTS.WEEKLY_COMPLETE]: "meetingDone",
    [EVENTS.RUN_MONTHLY_EVENT]: "event", [EVENTS.END_MONTH]: "monthClose", [EVENTS.START_NEXT_MONTH]: "month",
    [EVENTS.RUN_CENTER]: "meeting", [EVENTS.RUN_GOOD_LUCK]: "event", [EVENTS.TRAIN_SKILL]: "knowledge",
    [EVENTS.CREATE_LEAD]: payload?.source === "content" || payload?.source === "ads" ? "notify" : "confirm",
    [EVENTS.CERTIFY_CANDIDATE]: "certificate", [EVENTS.SCENE_COMPLETE]: "meetingDone",
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
  const previousSkills = getSkillSnapshot(previous);
  const previousTransaction = state.economy.lastTransaction?.id;
  const next = reduceGame(state, event, payload);
  if (next === previous) {
    toast("พลังงานไม่พอสำหรับงานนี้", "hint");
    return;
  }
  state = next;
  playForEvent(event, payload);
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
    [STAGES.CONTENT_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 180 : 2100],
    [STAGES.ADS_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 180 : 2300],
    [STAGES.CENTER_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 200 : 2600],
    [STAGES.GOOD_LUCK_RUNNING]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 220 : 2900],
    [STAGES.G1_CELEBRATION]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 200 : 2350],
    [STAGES.XLEAD_MILESTONE]: [EVENTS.SCENE_COMPLETE, reducedMotion.matches ? 220 : 2700],
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
  const skillSnapshot = getSkillSnapshot(state);
  $("#hudRank").textContent = state.rank === "candidate" ? "CANDIDATE" : `⭐ ${state.rank === "xlead" ? "XLEAD" : "X-VISOR"} Lv.${skillSnapshot.playerLevel}`;
  $("#teamChip").hidden = !state.milestones.firstG1;
  $("#teamChip").textContent = `ทีม ${state.team.length} X-VISOR`;
  $("#peopleButton").hidden = state.month < 1;
  $("#peopleCount").textContent = String(uniquePeopleCount());
  $("#skillButton").disabled = state.rank === "candidate";
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
  [["กำลังคุย", data.prospects.length], ["ลูกค้า", data.customers.length], ["ทีม", data.team.length], ["พลังงาน", `⚡ ${state.energy}`]].forEach(([label, value]) => {
    board.insertAdjacentHTML("beforeend", `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`);
  });
  container.appendChild(board);
  const tools = document.createElement("div");
  tools.className = "management-tools";
  tools.innerHTML = `<button type="button" data-open-work="true">เติบโตและพาทีม</button><button type="button" data-open-skills="true">ความเก่งของคุณ · Lv.${data.skills.playerLevel}</button>`;
  container.appendChild(tools);
  if (data.stats.teamOutput?.length) {
    const teamOutput = document.createElement("section");
    teamOutput.className = "team-output";
    teamOutput.innerHTML = `<div class="panel-heading"><strong>ทีมทำเองในเดือนนี้</strong><span>${data.stats.teamActions} งาน</span></div>`;
    data.stats.teamOutput.slice(0, 4).forEach((member) => {
      const outcomes = [
        member.newPeople ? `คนใหม่ ${member.newPeople}` : "",
        member.followups ? `ติดตาม ${member.followups}` : "",
        member.customers ? `ลูกค้าใหม่ ${member.customers}` : "",
        member.sales ? `Sale ${member.sales}` : "",
        member.reorders ? `ทำต่อ ${member.reorders}` : "",
        member.referrals ? `Referral ${member.referrals}` : "",
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
  const previous = Number(summary.previousIncome || 0);
  const delta = Number(summary.projectedIncome || 0) - previous;
  const comparison = previous > 0 ? `${delta >= 0 ? "↑" : "↓"} ${formatBaht(Math.abs(delta))} จากเดือนก่อน` : "เดือนแรกที่มีข้อมูลเปรียบเทียบ";
  const sections = [
    ["คน", [["คนใหม่", summary.newPeople], ["นัดหมาย", summary.appointments], ["ลูกค้าใหม่", summary.newCustomers], ["Referral", summary.referrals]]],
    ["ผลลัพธ์", [["ติดตาม", summary.customersCared], ["วัดซ้ำ", summary.remeasures], ["Success Case", summary.successCases], ["ทำต่อ", summary.reorders]]],
    ["ทีม", [["Candidate", summary.candidates], ["X-VISOR ใหม่", summary.newXvisors], ["ลูกค้าจากทีม", summary.teamCustomers], ["Sale จากทีม", summary.teamSales]]],
    ["รายได้", [["ยอดสินค้า", formatBaht(summary.productSales)], ["XV", formatNumber(summary.xv)], ["ประมาณเดือนนี้", formatBaht(summary.projectedIncome)], ["เงินรับแล้วรวม", formatBaht(summary.receivedIncomeTotal)]]],
    ["แรงทวีคูณ", [["คุณทำเอง", `${summary.leverage?.player || 0} งาน`], ["ทีมทำเอง", `${summary.leverage?.team || 0} งาน`], ["ที่มา", `Sale ${summary.sources?.newSales || 0} · ทำต่อ ${summary.sources?.reorders || 0} · Team ${summary.sources?.teamSales || 0}`], ["เทียบเดือนก่อน", comparison]]],
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
  const waiting = {
    scan: "ข้อมูลกำลังขึ้นทีละค่า", montage: `DAY ${montageVisualDay} · ENERGY +1`,
    examTransit: "กำลังเดินเข้าห้องสอบและนั่งประจำโต๊ะ", ceremony: "กำลังรับใบรับรอง",
    weekly: "ทีมกำลังเลือก Next Action", content: "กำลังโพสต์และรอ notification",
    ads: "Campaign กำลังสร้าง Interest", center: "ทีมกำลัง Review Case",
    goodluck: "Community กำลังแลกเปลี่ยน Case", g1: "ต้อนรับ X-VISOR คนใหม่",
    xlead: "กำลังเปิด Team Zone และ Organization Map",
  };
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
  $("#worldLabel").textContent = exam
    ? "XCADEMY EXAM ROOM"
    : state.stage === STAGES.GOOD_LUCK_RUNNING ? "GOOD LUCK COMMUNITY"
      : state.stage === STAGES.CENTER_RUNNING ? "CLOVER CENTER"
        : state.rank === "xlead" ? "XLEAD TEAM ZONE"
          : state.month >= 2 ? "CLOVER MANAGEMENT HUB" : state.month === 1 ? "CLOVER NEIGHBORHOOD" : "PRE-SEASON ROOM";
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
  const previous = Number(state.monthSummaries.at(-1)?.projectedIncome || 0);
  const delta = economy.projectedIncome - previous;
  const comparison = previous > 0 ? `${delta >= 0 ? "↑" : "↓"} ${formatBaht(Math.abs(delta))}` : "ยังไม่มีเดือนก่อน";
  showDialog("income", `<div class="dialog-kicker">รายได้ประมาณเดือนนี้ · ${escapeHtml(commercialStatusLabel(economy.status))}</div>
    <h2>${formatBaht(economy.projectedIncome)}</h2>
    <div class="income-sections"><section><div class="income-heading"><span>คุณขายเอง</span><b>${formatBaht(economy.activeRetail)}</b></div>
      <dl><div><dt>ยอดสินค้าในเกม</dt><dd>${state.economy.sets} รายการ · ${formatBaht(economy.productSales)}</dd></div>
      <div><dt>XV เดือนนี้</dt><dd>${formatNumber(economy.personalXV)} XV</dd></div><div><dt>ขั้นจำลอง</dt><dd>${escapeHtml(economy.tier.label)}</dd></div></dl></section>
      <section><div class="income-heading"><span>ผลลัพธ์จากทีม</span><b>${state.monthStats.teamSales} Sale</b></div><p>ยอดสินค้าทีม ${formatBaht(economy.teamProductSales)} · ${formatNumber(economy.teamXV)} XV</p><p>รายได้จากทีมยังเป็น ฿0 จนกว่ากติกาเชิงพาณิชย์จะยืนยันใน config</p></section></div>
    <div class="income-source-grid"><div><span>Sale ใหม่</span><b>${state.monthStats.sales}</b></div><div><span>ทำต่อ</span><b>${state.monthStats.reorders}</b></div><div><span>Sale จากทีม</span><b>${state.monthStats.teamSales}</b></div><div><span>เทียบเดือนก่อน</span><b>${comparison}</b></div></div>
    <div class="income-total"><span>เงินรับแล้วจากรอบที่ปิด</span><strong>${formatBaht(economy.receivedIncome)}</strong></div>
    ${directMentoringAvailable() ? `<p class="dialog-note">Direct Mentoring เปิดตามกติกาที่ได้รับการยืนยันแล้ว</p>` : ""}
    <p class="dialog-note">Commercial numbers ปัจจุบันเป็น TO_CONFIRM; SKU, rate และ effective date เก็บใน config เดียว ไม่ใช่การรับประกันรายได้</p>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับเกม</button>`);
}

function workButton(label, event, options = {}) {
  const disabled = options.cost > state.energy || options.disabled;
  return `<button type="button" class="work-button" data-work-event="${event}"${options.source ? ` data-source="${options.source}"` : ""}${options.id ? ` data-id="${options.id}"` : ""}${options.skill ? ` data-skill="${options.skill}"` : ""}${disabled ? " disabled" : ""}>
    <strong>${escapeHtml(label)}</strong><span>${escapeHtml(options.detail || "")}</span>${options.cost ? `<b>⚡ ${options.cost}</b>` : ""}</button>`;
}

function actionForPerson(person, kind) {
  if (kind === "team") return person.active ? { label: `Review เคสกับ ${person.name}`, event: EVENTS.MENTOR_TEAM_MEMBER, cost: 1 } : null;
  if (kind === "conversation") {
    const byJourney = {
      new: { label: `ทัก ${person.name}`, event: EVENTS.CONTACT_PROSPECT, cost: 1 },
      scheduled: { label: `ไปพบ ${person.name}`, event: EVENTS.MEET_PROSPECT, cost: 2 },
      conversation: { label: `คุยกับ ${person.name}`, event: EVENTS.CONSULT_PROSPECT, cost: 1 },
      discovery: { label: `วัด Baseline กับ ${person.name}`, event: EVENTS.BASELINE_PROSPECT, cost: 2 },
      baseline: { label: `วาง Routine ให้ ${person.name}`, event: EVENTS.OPEN_MANAGEMENT_ROUTINE, cost: 0 },
      recommendation: { label: `คุยแผนกับ ${person.name}`, event: EVENTS.OFFER_PROSPECT, cost: 1 },
      waiting: { label: `ติดตาม ${person.name}`, event: EVENTS.FOLLOW_UP_DECISION, cost: 1 },
    };
    return byJourney[person.journey] || null;
  }
  if (person.xvisorStage === "ready") return { label: `ชวน ${person.name} เรียน Xcademy`, event: EVENTS.START_CANDIDATE_XCADEMY, cost: 1 };
  if (person.xvisorStage === "xcademy") return { label: `Review Case กับ ${person.name}`, event: EVENTS.REVIEW_CANDIDATE, cost: 1 };
  if (person.xvisorStage === "case") return { label: `ติดตาม Certification ของ ${person.name}`, event: EVENTS.CERTIFY_CANDIDATE, cost: 1 };
  if (person.xvisorInterest && !person.xvisorStage) return { label: `ชวน ${person.name} รู้จัก X-VISOR`, event: EVENTS.INVITE_XVISOR, cost: 1 };
  if (person.day < 28 && !person.selfDirected) return { label: `ติดตาม ${person.name}`, event: EVENTS.CARE_CUSTOMER, cost: 1 };
  if (!person.measuredAgain) return { label: `ไปวัดซ้ำกับ ${person.name}`, event: EVENTS.REMEASURE_CUSTOMER, cost: 2 };
  if (person.referralReady && !person.referralAsked) return { label: `ขอให้ ${person.name} แนะนำเพื่อน`, event: EVENTS.ASK_REFERRAL, cost: 1 };
  return { label: `ชวน ${person.name} ทำต่อ`, event: EVENTS.REORDER_CUSTOMER, cost: 1 };
}

function trustLabel(value) {
  if (Number(value || 0) >= 76) return "ดีมาก";
  if (Number(value || 0) >= 56) return "ดี";
  return "กำลังสร้าง";
}

function teamHumanStatus(member) {
  const confidence = member.confidence >= 76 ? "ดีมาก" : member.confidence >= 56 ? "ดี" : "กำลังสร้าง";
  const autonomy = member.autonomy >= 76 ? "ทำเองได้คล่อง" : member.autonomy >= 51 ? "เริ่มทำเองได้" : "ยังต้องซ้อมด้วยกัน";
  return { confidence, autonomy };
}

function allPeopleRows() {
  return [
    ...state.prospects.map((person) => ({ person, kind: "conversation" })),
    ...state.customers.map((person) => ({ person, kind: "customer" })),
    ...state.team.map((person) => ({ person, kind: "team" })),
  ];
}

function showPeople(tab = "all", query = "", focusId = null) {
  const tabs = [
    ["all", "ทั้งหมด"], ["conversation", "กำลังคุย"], ["customer", "ลูกค้า"],
    ["followup", "รอติดตาม"], ["xvisor", "สนใจ X-VISOR"], ["team", "ทีม"],
  ];
  const normalized = query.trim().toLocaleLowerCase("th");
  let rows = allPeopleRows().filter(({ person, kind }) => {
    if (focusId && person.id !== focusId) return false;
    if (normalized && !person.name.toLocaleLowerCase("th").includes(normalized)) return false;
    if (tab === "all") return true;
    if (tab === "conversation") return kind === "conversation";
    if (tab === "customer") return kind === "customer";
    if (tab === "team") return kind === "team";
    if (tab === "xvisor") return kind === "customer" && (person.xvisorInterest || person.xvisorStage);
    if (tab === "followup") return (kind === "conversation" && person.journey === "waiting") || (kind === "customer" && (person.day < 28 || !person.measuredAgain));
    return true;
  });
  if (tab === "all" && !focusId) {
    const priority = { conversation: 1, customer: 2, team: 3 };
    const unique = new Map();
    rows.forEach((row) => {
      const key = row.person.personId || row.person.id;
      if (!unique.has(key) || priority[row.kind] > priority[unique.get(key).kind]) unique.set(key, row);
    });
    rows = [...unique.values()];
  }
  const cards = rows.map(({ person, kind }) => {
    const next = actionForPerson(person, kind);
    const monthGap = Math.max(0, state.month - Number(person.lastContactMonth || state.month));
    const latest = monthGap === 0 ? "เดือนนี้" : `${monthGap} เดือนก่อน`;
    if (kind === "team") {
      const human = teamHumanStatus(person);
      const output = person.monthlyOutput || {};
      return `<article class="people-card people-card--team"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>Certified X-VISOR</span></div><b>${person.active ? "กำลังทำงาน" : "พักอยู่"}</b></div>
        <dl><div><dt>ลูกค้า</dt><dd>${person.customers}</dd></div><div><dt>Sale เดือนนี้</dt><dd>${output.sales || 0}</dd></div><div><dt>ความมั่นใจ</dt><dd>${human.confidence}</dd></div><div><dt>ทำเองได้</dt><dd>${human.autonomy}</dd></div></dl>
        <p><b>ล่าสุด:</b> ${escapeHtml(person.status)}<br><b>ต่อไป:</b> ${person.customers ? "ดูแลเคสถัดไป" : "หาลูกค้าคนแรก"}</p>
        ${next ? workButton(next.label, next.event, { id: person.id, cost: next.cost, detail: "ช่วยให้เขาทำเองได้มากขึ้น" }) : ""}</article>`;
    }
    const role = kind === "customer" ? `ลูกค้า · Day ${person.day}` : person.journey === "scheduled" ? "กำลังคุย · นัดแล้ว" : "กำลังคุย";
    const trend = person.result === "ดีขึ้น" ? "เริ่มดีขึ้น" : person.day >= 14 ? "กำลังเห็นแนวโน้ม" : "กำลังเก็บข้อมูล";
    return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>${escapeHtml(role)}</span></div><b>${escapeHtml(person.status)}</b></div>
      <dl><div><dt>ความไว้ใจ</dt><dd>${trustLabel(person.trust)}</dd></div><div><dt>แนวโน้ม</dt><dd>${trend}</dd></div><div><dt>ล่าสุด</dt><dd>${latest}</dd></div><div><dt>ที่มา</dt><dd>${person.source === "known" ? "คนที่คุณรู้จัก" : person.source === "referral" ? "เพื่อนแนะนำ" : person.source === "content" ? "Content" : person.source === "ads" ? "Ads" : "Community"}</dd></div></dl>
      <p><b>แนะนำ:</b> ${escapeHtml(next?.label || "ดูแลความสัมพันธ์ต่อ")}</p>
      ${next ? workButton(next.label, next.event, { id: person.id, cost: next.cost, detail: person.status }) : `<button class="work-button" type="button" data-select-person="${escapeHtml(person.id)}"><strong>เลือก ${escapeHtml(person.name)}</strong><span>ดูสถานะบนกระดาน</span></button>`}</article>`;
  }).join("");
  showDialog("people", `<div class="dialog-kicker">คนของคุณ · ${uniquePeopleCount()} คน</div><h2>${focusId ? "รายละเอียดและ Next Action" : "รู้ว่าใครอยู่ตรงไหน และควรทำอะไรต่อ"}</h2>
    ${focusId ? `<button class="people-back" type="button" data-people-tab="all">← ดูคนทั้งหมด</button>` : `<div class="people-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" data-people-tab="${id}" aria-selected="${tab === id}">${label}</button>`).join("")}</div>
      ${uniquePeopleCount() > 7 ? `<label class="people-search">ค้นหาชื่อ <input type="search" data-people-search value="${escapeHtml(query)}" placeholder="เช่น นนท์"></label>` : ""}`}
    <div class="people-grid">${cards || "<p class=\"work-empty\">ยังไม่มีคนในกลุ่มนี้</p>"}</div>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="work">เติบโตและพาทีม</button><button class="dialog-button" type="button" data-dialog-action="close">กลับกระดาน</button></div>`, { kind: "wide" });
  $("#gameDialog").dataset.peopleTab = tab;
}

function showSkills() {
  const snapshot = getSkillSnapshot(state);
  const progress = getXleadProgress(state);
  const cards = SKILL_IDS.map((id) => {
    const skill = snapshot.skills[id];
    const willLevel = skill.nextXp != null && skill.xp + 2 >= skill.nextXp;
    return `<article class="skill-card"><div><span>${skill.definition.icon}</span><h3>${skill.definition.name} Lv.${skill.level}</h3></div>
      <p>${escapeHtml(getSkillBenefit(id, skill.level))}</p>
      <div class="skill-meter"><i style="--skill-progress:${skill.nextXp == null ? 100 : Math.min(100, (skill.xp / skill.nextXp) * 100)}%"></i></div>
      <small><b>ถ้าเรียนอีก 1 ครั้ง:</b> ${willLevel ? `ขึ้น Lv.${Math.min(10, skill.level + 1)} · ` : "สะสมประสบการณ์ · "}${escapeHtml(getSkillBenefit(id, Math.min(10, skill.level + 1)))}</small>
      ${workButton(skill.definition.practice, EVENTS.TRAIN_SKILL, { skill: id, cost: 1, detail: "+2 XP · งานเดิมคุ้มขึ้น" })}</article>`;
  }).join("");
  const xlead = progress.criteria.map((item) => `<li class="${item.current >= item.target ? "is-done" : ""}"><span>${escapeHtml(item.label)}</span><b>${item.current} / ${item.target}</b></li>`).join("");
  showDialog("skills", `<div class="dialog-kicker">⭐ ${state.rank === "xlead" ? "XLEAD" : "X-VISOR"} Lv.${snapshot.playerLevel}</div><h2>ความเก่งของคุณ</h2><p class="dialog-note">ลงทุน 1 ⚡ วันนี้ เพื่อให้งานเดิมสร้างผลมากขึ้นในเดือนต่อไป ทุก action ยังมี floor อย่างน้อย 1 ⚡</p>
    <div class="skill-grid">${cards}</div>
    <section class="xlead-progress"><h3>เส้นทาง XLEAD ในเกม</h3><ul>${xlead}</ul><small>${escapeHtml(progress.note)}</small></section>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับเกม</button>`, { kind: "wide" });
}

function showWorkMenu() {
  const skills = getSkillSnapshot(state);
  const contentLocked = skills.playerLevel < PLAYER_UNLOCKS.content;
  const adsLocked = skills.playerLevel < PLAYER_UNLOCKS.ads;
  const mentors = state.team.filter((member) => member.active).map((member) => workButton(`Review เคสกับ ${member.name}`, EVENTS.MENTOR_TEAM_MEMBER, { id: member.id, cost: 1, detail: `${member.customers} ลูกค้า · ${member.autonomy >= 70 ? "ทำเองได้คล่อง" : member.autonomy >= 45 ? "เริ่มทำเองได้" : "ยังต้องซ้อมด้วยกัน"}` })).join("");
  const training = SKILL_IDS.map((id) => workButton(`${SKILL_DEFINITIONS[id].icon} ${SKILL_DEFINITIONS[id].practice}`, EVENTS.TRAIN_SKILL, { skill: id, cost: 1, detail: `${SKILL_DEFINITIONS[id].name} Lv.${skills.skills[id].level} · ${getSkillBenefit(id, Math.min(10, skills.skills[id].level + 1))}` })).join("");
  showDialog("work", `<div class="dialog-kicker">แผนเติบโต · เดือน ${state.month}</div><h2>ลงทุนเวลาให้ผลเดือนต่อไปทวีคูณ</h2>
    <section class="work-section"><h3>สร้างโอกาสใหม่</h3><div class="work-grid">
      ${workButton("ทำความรู้จักคนใหม่", EVENTS.CREATE_LEAD, { source: "known", cost: 1, detail: "ได้ 1 คน · ต้องทักและคุยก่อน Sale" })}
      ${workButton("ทำคอนเทนต์", EVENTS.CREATE_LEAD, { source: "content", cost: 1, disabled: contentLocked, detail: contentLocked ? "เปิดที่ X-VISOR Lv.2" : "Journey / ความรู้ / Routine · สร้าง Interest" })}
      ${workButton("ยิง Ads จำลอง", EVENTS.CREATE_LEAD, { source: "ads", cost: 1, disabled: adsLocked, detail: adsLocked ? "เปิดที่ X-VISOR Lv.4" : `Budget จำลอง ${formatBaht(ADS_GAMEPLAY_CONFIG.budgetPerCampaign)} แยกจากรายได้` })}</div></section>
    <section class="work-section"><h3>ฝึกให้ 1 ⚡ คุ้มขึ้น</h3><div class="work-grid">${training}</div></section>
    <section class="work-section"><h3>พาทีมและ Community</h3><div class="work-grid">${mentors}
      ${workButton("พาทีมเข้า Center", EVENTS.RUN_CENTER, { cost: 2, disabled: state.monthStats.centerDone, detail: state.monthStats.centerDone ? "ทำแล้วในเดือนนี้" : "Case Review · ช่วยหลายคนพร้อมกัน" })}
      ${workButton("พาทีมเข้า Good Luck", EVENTS.RUN_GOOD_LUCK, { cost: 3, disabled: state.monthStats.goodLuckDone, detail: state.monthStats.goodLuckDone ? "ทำแล้วในเดือนนี้" : "Community · Referral · X-VISOR Interest" })}
      ${state.rank === "xlead" ? workButton("Review ผู้นำรุ่นถัดไป", EVENTS.REVIEW_TEAM_LEADERS, { cost: 1, detail: "เพิ่มความพร้อมให้ทีมทำเอง" }) : ""}</div></section>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="people">เปิดคนของคุณ</button><button class="dialog-button" type="button" data-dialog-action="close">กลับกระดาน</button></div>`, { kind: "wide" });
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
  if (button.dataset.ui === "people") return showPeople();
  if (button.dataset.ui === "skills") return showSkills();
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
  const personButton = event.target.closest("[data-person-id]");
  if (personButton) showPeople("all", "", personButton.dataset.personId);
  if (event.target.closest("[data-open-people]")) showPeople();
  if (event.target.closest("[data-open-work]")) showWorkMenu();
  if (event.target.closest("[data-open-skills]")) showSkills();
});

$("#incomeButton").addEventListener("click", () => { audio.unlock(); audio.play("tap"); showIncome(); });
$("#monthButton").addEventListener("click", () => { audio.unlock(); audio.play("tap"); showMonthConfirmation(); });
$("#peopleButton").addEventListener("click", () => { audio.unlock(); audio.play("tap"); showPeople(); });
$("#skillButton").addEventListener("click", () => { if (state.rank !== "candidate") { audio.unlock(); audio.play("tap"); showSkills(); } });
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
    if (work.dataset.skill) payload.skill = work.dataset.skill;
    closeDialog();
    return dispatch(work.dataset.workEvent, payload);
  }
  const peopleTab = event.target.closest("[data-people-tab]");
  if (peopleTab) return showPeople(peopleTab.dataset.peopleTab);
  const selectPersonButton = event.target.closest("[data-select-person]");
  if (selectPersonButton) {
    state = { ...state, selectedPersonId: selectPersonButton.dataset.selectPerson, updatedAt: Date.now() };
    save(); closeDialog(); render(); return;
  }
  const button = event.target.closest("[data-dialog-action]");
  if (!button) return;
  if (button.dataset.dialogAction === "reset-confirm") return resetGame();
  if (button.dataset.dialogAction === "end-month") { closeDialog(); return dispatch(EVENTS.END_MONTH); }
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
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  });
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
function drawLaptop(x, y, active = false) { rect(x, y, 43, 28, "#24445b"); rect(x + 4, y + 4, 35, 20, active ? "#73dcc8" : "#d9f2ef"); rect(x - 5, y + 28, 53, 5, "#24445b"); }
function drawNotification(x, y, color = "#f6ce5a") { rect(x, y, 30, 18, "#24445b"); rect(x + 3, y + 3, 24, 12, "#fffdf2"); rect(x + 7, y + 6, 7, 6, color); rect(x + 17, y + 7, 7, 3, "#5f7885"); }
function drawWhiteboard(x, y) { rect(x, y, 106, 65, "#24445b"); rect(x + 5, y + 5, 96, 55, "#fffdf2"); rect(x + 14, y + 16, 29, 5, "#63bd84"); rect(x + 14, y + 30, 70, 4, "#6a8ca0"); rect(x + 14, y + 42, 54, 4, "#e49d57"); }

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
  const management = scene.startsWith("management") || ["team_started", "month_closed", "season_review", "content_running", "ads_running", "center_running", "goodluck_running", "xlead"].includes(scene);
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
  } else if (scene === "content_running") {
    drawTable(203, 154, 111); drawChair(162, 121, "#73a9c3"); drawSittingCharacter(171, 159, playerPalette, "right"); drawLaptop(229, 112, true);
    const visible = reducedMotion.matches ? 3 : Math.min(3, Math.floor(stageAge / 420));
    for (let index = 0; index < visible; index += 1) drawNotification(84 + index * 38, 58 + (index % 2) * 27, ["#f6ce5a", "#62bd83", "#6cb4df"][index]);
  } else if (scene === "ads_running") {
    drawTable(195, 154, 119); drawSittingCharacter(154, 159, playerPalette, "right"); drawLaptop(224, 112, true);
    rect(58, 50, 91, 68, "#24445b"); rect(63, 55, 81, 58, "#fffdf2"); rect(72, 65, 63, 8, "#dbe8e5"); rect(72, 65, Math.min(63, stageAge / 25), 8, "#62bd83");
    [0, 1, 2].slice(0, reducedMotion.matches ? 3 : Math.floor(stageAge / 520)).forEach((index) => drawNotification(66 + index * 33, 82 + (index % 2) * 20, "#6cb4df"));
  } else if (scene === "center_running") {
    drawWhiteboard(139, 31); drawRoundTable(143, 137); drawCharacterAtFeet(49, 176, playerPalette, { direction: "right", pose: "talk", band: true });
    const participants = state.team.filter((member) => member.active).slice(0, 3);
    participants.forEach((member, index) => {
      const progress = reducedMotion.matches ? 1 : Math.min(1, stageAge / (750 + index * 180));
      drawCharacterAtFeet(276 + index * 34 + (1 - progress) * 55, 176, member.appearance || npc, { direction: "left", walk: progress < 1 ? time / 90 : 0, band: true });
    });
    if (!participants.length) drawCharacterAtFeet(284, 176, npc, { direction: "left", idle: true, band: true });
  } else if (scene === "goodluck_running") {
    rect(112, 112, 160, 9, "#24445b"); rect(122, 78, 140, 34, "#4f9a78"); rect(154, 49, 76, 24, "#24445b"); rect(159, 54, 66, 14, "#f6ce5a");
    drawCharacterAtFeet(178, 112, proctorPalette, { pose: "talk", band: true });
    const crowd = [playerPalette, npc, ...state.team.slice(0, 3).map((member) => member.appearance || npc)].slice(0, 5);
    crowd.forEach((palette, index) => drawCharacterAtFeet(43 + index * 67, 176, palette, { direction: index < 2 ? "right" : "left", idle: true, band: true }));
    if (!reducedMotion.matches && Math.floor(stageAge / 420) % 2) drawNotification(304, 46, "#ef8078");
  } else if (["success", "first_g1"].includes(scene)) {
    const jump = scene === "first_g1" && stageAge > 420 && stageAge < 850 && !reducedMotion.matches ? Math.sin(((stageAge - 420) / 430) * Math.PI) * 7 : 0;
    drawTable(72, 154, 86); drawTable(226, 154, 86); drawCharacterAtFeet(98, 176, playerPalette, { pose: "celebrate", jump }); drawCharacterAtFeet(250, 176, npc, { pose: "celebrate", jump, band: true }); drawCertificate(173, 70);
  } else if (["weekly", "team_started", "management", "management_team", "month_closed", "season_review"].includes(scene)) {
    drawRoundTable(142, 132); drawCharacterAtFeet(55, 176, playerPalette, { direction: "right", pose: "talk", band: true });
    state.team.slice(0, 3).forEach((member, index) => drawCharacterAtFeet(260 + index * 36, 176, member.appearance || npc, { direction: "left", idle: true, band: true }));
    if (state.team.length === 0) drawCharacterAtFeet(281, 176, npc, { direction: "left", idle: true });
    drawDataPanel(274, 40, state.monthStats.weeklyDone);
    if (state.customers.length >= 3) { drawChair(12, 119, "#73a9c3"); drawTable(15, 154, 55); }
    if (state.team.length >= 1) { rect(215, 53, 38, 28, "#24445b"); rect(219, 57, 30, 20, "#d9f2ef"); }
    if (state.rank === "xlead") { rect(105, 27, 76, 27, "#24445b"); rect(110, 32, 66, 17, "#f6ce5a"); fill("#24445b"); context.font = "bold 8px monospace"; context.fillText("TEAM ZONE", 119, 43); }
  } else if (scene === "xlead") {
    drawWhiteboard(138, 29); drawCharacterAtFeet(55, 176, playerPalette, { pose: "celebrate", band: true });
    state.team.slice(0, 4).forEach((member, index) => drawCharacterAtFeet(210 + index * 40, 176, member.appearance || npc, { direction: "left", idle: true, band: true }));
    rect(50, 42, 65, 25, "#24445b"); rect(55, 47, 55, 15, "#f6ce5a");
  } else if (scene === "certified") {
    const jump = stageAge > 420 && stageAge < 850 && !reducedMotion.matches ? Math.sin(((stageAge - 420) / 430) * Math.PI) * 7 : 0;
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
