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
var context = canvas.getContext("2d", { alpha: false });
var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
var playerPalette = { skin: "#e0aa80", hair: "#1f3541", shirt: "#4db783", accent: "#f6ce5a" };
var proctorPalette = { skin: "#c98f6c", hair: "#203541", shirt: "#5f8fd3", accent: "#f6ce5a" };
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
var effects = [];
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
var productVisuals = Object.freeze({
  gus: ["#65bd86", "#2f7359"],
  "protein-hmb": ["#ee9a5c", "#b85f43"],
  "vita-matrix": ["#68aee1", "#356f9a"],
  astamega: ["#8e78c8", "#5c4d91"]
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
function spawnEffect(kind) {
  const count = reducedMotion.matches ? 7 : kind === "coins" ? 18 : 30;
  const colors = kind === "coins" ? ["#f8cc55", "#ffeaa2", "#e89f2f"] : ["#4fc38b", "#66b9ef", "#f18e7b", "#f8cc55", "#ffffff"];
  for (let index = 0; index < count; index += 1) {
    effects.push({
      x: 190 + (Math.random() - 0.5) * 70,
      y: kind === "coins" ? 128 : 82,
      vx: (Math.random() - 0.5) * 2.4,
      vy: -1.2 - Math.random() * 2.3,
      life: 48 + Math.random() * 42,
      size: 2 + Math.floor(Math.random() * 3),
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}
function dispatch(event, payload = {}) {
  audio.unlock();
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
    audio.play("income");
    if (state.stage !== STAGES.M1_SALE_RECEIPT) queueMicrotask(() => showReceipt(state.economy.lastTransaction));
  }
  const reportChanged = Number(previous.lastOrganizationReport?.month || 0) !== Number(state.lastOrganizationReport?.month || 0);
  const sceneReportChanged = previous.sceneReport?.kind !== state.sceneReport?.kind;
  if (previous.stage !== state.stage || reportChanged || sceneReportChanged) {
    activeDialogKey = null;
    stageStartedAt = performance.now();
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
  const economy = calculateEconomy(state);
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
  $("#hudXV").textContent = organizationVisible ? `${formatNumber(economy.tgv)} / ${formatNumber(XGEN_TGV_TARGET)}` : `${formatNumber(economy.personalXV)} XV`;
  $(".status-item--income span").textContent = "รายได้เดือนนี้ · สะสม";
  $("#hudIncome").textContent = `${formatBaht(economy.projectedIncome)} · Σ${formatBaht(economy.lifetimeIncome)}`;
  const skillSnapshot = getSkillSnapshot(state);
  const rankLabel = state.rank === "xgen" ? "XGEN" : state.rank === "xlead" ? "XLEAD" : "X-VISOR";
  $("#hudRank").textContent = state.rank === "candidate" ? "CANDIDATE" : `⭐ ${rankLabel} Lv.${skillSnapshot.playerLevel}`;
  $("#teamChip").hidden = !state.milestones.firstG1;
  $("#teamChip").textContent = `ทีม ${state.team.length} X-VISOR · ${state.organization.xleads?.length || 0} XLEAD`;
  $("#peopleButton").hidden = state.month < 1;
  $("#peopleCount").textContent = String(uniquePeopleCount());
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
    <div><span>รายได้เพิ่มจากรายการนี้</span><strong>+${formatBaht(transaction.incomeDelta)}</strong></div>
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
    const teamOutput = document.createElement("section");
    teamOutput.className = "team-output";
    teamOutput.innerHTML = `<div class="panel-heading"><strong>ทีมทำเองในเดือนนี้</strong><span>${data.stats.teamActions} งาน</span></div>`;
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
function worldLabelForState(scene) {
  const month = Number(state.month || 0);
  if (state.runComplete) return "2 YEARS LATER · ORGANIZATION";
  if (state.runMode === "NEW_GAME_PLUS" && month === 1) return "NEW GAME+ · MONTH 1";
  if (state.organizationMode) {
    if (month >= 21) return "ORGANIZATION YEAR · FULL SCALE";
    if (month >= 17) return "ORGANIZATION YEAR · BRANCH NETWORK";
    return "ORGANIZATION YEAR · TEAM NETWORK";
  }
  if (scene.startsWith("exam") || scene === "ceremony") return "XCADEMY EXAM ROOM";
  if ([STAGES.OPEN_HOUSE_RUNNING, STAGES.GOOD_LUCK_RUNNING].includes(state.stage)) return "OPEN HOUSE";
  if ([STAGES.XCADEMY_RUNNING, STAGES.CENTER_RUNNING].includes(state.stage)) return "XCADEMY";
  if (scene === "the-xircle") return "THE XIRCLE · POWER-UP EVENT";
  if (state.campaignScore?.locked) return "MONTH 12 · REVELATION";
  if (state.rank === "xgen") return "XGEN ORGANIZATION";
  if (month >= 11) return "MONTH 11–12 · LIVING OPERATION";
  if (month >= 9) return "MONTH 9–10 · GROWTH HUB";
  if (month >= 7) return "MONTH 7–8 · TEAM ZONE";
  if (month >= 5) return "MONTH 5–6 · EARLY TEAM";
  if (month >= 3) return "MONTH 3–4 · FIRST CUSTOMERS";
  if (month >= 1) return "MONTH 1–2 · HUMBLE START";
  return "PRE-SEASON ROOM";
}
var lastWorldEventKey = "";
function organizationVisualMode(stageAge) {
  const report = state.lastOrganizationReport;
  let cursor = 0;
  if (report?.trip) {
    if (stageAge < 2050) return { kind: "travel", report };
    cursor += 2050;
  }
  if (report?.activities?.xircle) {
    if (stageAge < cursor + 2150) return { kind: "xircle", report };
    cursor += 2150;
  }
  if (state.runComplete) return { kind: "finale", report };
  return { kind: "organization", report };
}
function eventCardForScene(scene, stageAge, organizationMode) {
  const report = organizationMode?.report;
  if (!organizationMode && state.runMode === "NEW_GAME_PLUS" && state.month === 1 && stageAge < 2200) return { kicker: "NEW GAME+ · MONTH 1", title: "BEAT YOUR BEST", detail: "Certified แล้ว · เปิด Management เต็มรูปแบบ", tone: "finale" };
  if (organizationMode?.kind === "travel") return {
    kicker: `RECOGNITION TRIP ${report.trip.number}`,
    title: report.trip.destination,
    detail: report.trip.landmark,
    tone: "travel",
    label: `TRAVEL REWARD · ${report.trip.destination.toUpperCase()}`
  };
  if (organizationMode?.kind === "xircle") return {
    kicker: `MONTH ${report.month} · SPECIAL EVENT`,
    title: "THE XIRCLE",
    detail: `RESET · RECONNECT · RISE · ทีมกลับมา ${formatNumber(report.comebackMembers)} คน`,
    tone: "xircle",
    label: "THE XIRCLE · TEAM CAMP"
  };
  if (organizationMode?.kind === "finale") return {
    kicker: "MONTH 24 · TRUE ENDING",
    title: "2 YEARS LATER",
    detail: `${formatNumber(state.twoYearSummary?.xvisorCount)} X-VISOR · ${formatNumber(state.twoYearSummary?.activeCustomers)} ACTIVE CUSTOMERS`,
    tone: "finale",
    label: "MONTH 24 · ORGANIZATION FINALE"
  };
  if (organizationMode?.kind === "organization" && report && stageAge < 2450) {
    if (stageAge < 650) return { kicker: `MONTH ${report.month} · AUTO PLAN`, title: "XCADEMY ×4", detail: "ทีมเรียนรู้และ Review Case ร่วมกัน", tone: "academy" };
    if (stageAge < 1300) return { kicker: `MONTH ${report.month} · AUTO PLAN`, title: "OPEN HOUSE ×1", detail: `คนใหม่เข้าระบบ ${formatNumber(report.newPeople)} คน`, tone: "open-house" };
    return { kicker: `MONTH ${report.month} · RESULT`, title: `${formatNumber(report.tgv)} XV`, detail: `รายได้ ${formatBaht(report.income)} · ทีมสุทธิ ${report.netXvisors > 0 ? "+" : ""}${formatNumber(report.netXvisors)}`, tone: "result" };
  }
  const cards = {
    pre_montage: { kicker: "28-DAY ROUTINEX", title: `DAY ${String(montageVisualDay).padStart(2, "0")}`, detail: `ความพร้อมเพิ่มเป็น ⚡ ${montageVisualDay} / 28`, tone: "day" },
    xcademy_running: { kicker: "TEAM LEARNING", title: "XCADEMY", detail: "เรียนรู้จาก Case จริงด้วยกัน", tone: "academy" },
    center_running: { kicker: "TEAM LEARNING", title: "XCADEMY", detail: "เรียนรู้จาก Case จริงด้วยกัน", tone: "academy" },
    open_house_running: { kicker: "PIPELINE EVENT", title: "OPEN HOUSE", detail: "คนใหม่เข้ามาเห็นบทบาทและเส้นทาง", tone: "open-house" },
    goodluck_running: { kicker: "PIPELINE EVENT", title: "OPEN HOUSE", detail: "คนใหม่เข้ามาเห็นบทบาทและเส้นทาง", tone: "open-house" },
    "the-xircle": { kicker: "SPECIAL EVENT", title: "THE XIRCLE", detail: "RESET · RECONNECT · RISE", tone: "xircle" },
    xlead: { kicker: "ROLE MILESTONE", title: "CERTIFIED XLEAD", detail: "ปลดล็อกรายได้จากการพัฒนา Direct G1", tone: "result" },
    xgen: { kicker: "ROLE MILESTONE", title: "CERTIFIED XGEN", detail: "พร้อมบริหาร Organization", tone: "result" },
    season_review: { kicker: "MONTH 12 · REVELATION", title: "จากคนเดียว สู่ระบบที่เดินได้", detail: "High Score ถูกล็อกแล้ว", tone: "finale" },
    first_g1: { kicker: "TEAM MILESTONE", title: "NEW X-VISOR", detail: "ทีมเริ่มจากคนแรก และเกมยังเดินต่อ", tone: "result" }
  };
  const card = cards[scene];
  if (!card || stageAge > 2700 && !["season_review"].includes(scene)) return null;
  return card;
}
function renderWorldEventCard(scene, stageAge, organizationMode) {
  const card = eventCardForScene(scene, stageAge, organizationMode);
  const root = $("#worldEventCard");
  const label = organizationMode?.kind === "organization" ? worldLabelForState(scene) : card?.label || worldLabelForState(scene);
  if ($("#worldLabel").textContent !== label) $("#worldLabel").textContent = label;
  const key = card ? `${card.tone}:${card.kicker}:${card.title}:${card.detail}` : "hidden";
  if (key === lastWorldEventKey) return;
  lastWorldEventKey = key;
  root.hidden = !card;
  root.dataset.tone = card?.tone || "";
  if (!card) return;
  $("#worldEventKicker").textContent = card.kicker;
  $("#worldEventTitle").textContent = card.title;
  $("#worldEventDetail").textContent = card.detail;
}
function render() {
  content = getStageContent(state);
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
  $("#worldLabel").textContent = worldLabelForState(content.scene || "opening");
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
  const mentoringRows = economy.mentoringBreakdown.slice(0, 6).map((item) => `<li><span>${escapeHtml(item.name)} · คอม ${formatBaht(item.commission)}</span><b>${formatBaht(item.mentorIncome)}</b></li>`).join("");
  const history = [...economy.incomeHistory].reverse().slice(0, 12).map((item) => `<tr><th>เดือน ${item.month}</th><td>${formatBaht(item.channel1)}</td><td>${formatBaht(item.channel2)}</td><td>${formatBaht(item.channel3)}</td><td><b>${formatBaht(item.total)}</b></td></tr>`).join("");
  showDialog("income", `<div class="dialog-kicker">REVENUE STACK · ${escapeHtml(commercialStatusLabel(economy.status))}</div>
    <h2>เดือนนี้ ${formatBaht(economy.projectedIncome)} · รวม ${formatBaht(economy.lifetimeIncome)}</h2>
    <div class="income-sections">
      <section><div class="income-heading"><span>① ขายและดูแลลูกค้า</span><b>${formatBaht(economy.channel1)}</b></div><p>ยอดขาย ${formatBaht(economy.personalSalesBaht)} × ${escapeHtml(economy.tier.label)} · XV แยกเป็น ${formatNumber(economy.personalXV)}</p></section>
      <section><div class="income-heading"><span>② พัฒนา G1 ${economy.mentoringUnlocked ? "" : "· เปิดเมื่อ XLEAD"}</span><b>${economy.mentoringUnlocked ? formatBaht(economy.channel2) : "🔒"}</b></div><p>20% ของ commission ที่ G1 แต่ละคนได้ คิดแยก tier รายคน</p>${economy.mentoringUnlocked ? `<ul class="income-breakdown">${mentoringRows || "<li><span>G1 ยังไม่มียอดเดือนนี้</span><b>฿0</b></li>"}</ul>` : ""}</section>
      <section><div class="income-heading"><span>③ บริหารองค์กร ${state.organization.xgen ? "" : "· เปิดที่ XGEN"}</span><b>${state.organization.xgen ? formatBaht(economy.channel3) : "🔒"}</b></div><p>5% ของ TGV · แบบจำลองจากโครงสร้างแผนปัจจุบัน</p></section>
    </div>
    <div class="income-total"><span>รายได้รวมจากเดือนที่ปิดแล้ว</span><strong>${formatBaht(economy.totalIncome)}</strong></div>
    <section class="income-history"><h3>ย้อนหลังรายเดือน</h3>${history ? `<div class="table-scroll"><table><thead><tr><th>เดือน</th><th>①</th><th>②</th><th>③</th><th>รวม</th></tr></thead><tbody>${history}</tbody></table></div>` : "<p>ปิดเดือนแรกเพื่อเริ่มเก็บ history</p>"}</section>
    <p class="dialog-note">ตัวเลขเชิงพาณิชย์ทั้งหมดอ่านจาก config ของเกมและแสดงสถานะจำลอง/TO_CONFIRM ไม่ใช่การรับประกันรายได้จริง</p>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับเกม</button>`, { kind: "wide" });
}
function workButton(label, event, options = {}) {
  const disabled = options.cost > state.energy || options.disabled;
  return `<button type="button" class="work-button" data-work-event="${event}"${options.source ? ` data-source="${options.source}"` : ""}${options.id ? ` data-id="${options.id}"` : ""}${options.skill ? ` data-skill="${options.skill}"` : ""}${disabled ? " disabled" : ""}>
    <strong>${escapeHtml(label)}</strong><span>${escapeHtml(options.detail || "")}</span>${options.cost ? `<b>⚡ ${options.cost}</b>` : ""}</button>`;
}
function actionForPerson(person, kind) {
  if (kind === "team") return person.active && person.autonomy < 85 ? { label: `Review เคสกับ ${person.name}`, event: EVENTS.MENTOR_TEAM_MEMBER, cost: 1 } : null;
  if (kind === "conversation") {
    const byJourney = {
      new: { label: `ทัก ${person.name}`, event: EVENTS.CONTACT_PROSPECT, cost: 1 },
      scheduled: { label: `ไปพบ ${person.name}`, event: EVENTS.MEET_PROSPECT, cost: 2 },
      conversation: { label: `คุยกับ ${person.name}`, event: EVENTS.CONSULT_PROSPECT, cost: 1 },
      discovery: { label: `วัด Baseline กับ ${person.name}`, event: EVENTS.BASELINE_PROSPECT, cost: 2 },
      baseline: { label: `วาง Routine ให้ ${person.name}`, event: EVENTS.OPEN_MANAGEMENT_ROUTINE, cost: 0 },
      recommendation: { label: `คุยแผนกับ ${person.name}`, event: EVENTS.OFFER_PROSPECT, cost: 1 },
      waiting: Number(person.nextOfferMonth || 0) <= state.month && Number(person.decisionAttempts || 0) < 2 ? { label: `คุยให้รู้ผลกับ ${person.name}`, event: EVENTS.FOLLOW_UP_DECISION, cost: 1 } : null
    };
    return byJourney[person.journey] || null;
  }
  if (person.xvisorStage === "ready") return { label: `ชวน ${person.name} เรียน Xcademy`, event: EVENTS.START_CANDIDATE_XCADEMY, cost: 1 };
  if (person.xvisorStage === "xcademy") return { label: `Review Case กับ ${person.name}`, event: EVENTS.REVIEW_CANDIDATE, cost: 1 };
  if (person.xvisorStage === "case") return { label: `ติดตาม Certification ของ ${person.name}`, event: EVENTS.CERTIFY_CANDIDATE, cost: 1 };
  if (person.xvisorInterest && !person.xvisorStage) return { label: `ชวน ${person.name} รู้จัก X-VISOR`, event: EVENTS.INVITE_XVISOR, cost: 1 };
  if (person.referralReady && !person.referralAsked) return { label: `ขอให้ ${person.name} แนะนำเพื่อน`, event: EVENTS.ASK_REFERRAL, cost: 1 };
  if (person.selfDirected || [CUSTOMER_STATES.SELF_DIRECTED, CUSTOMER_STATES.AUTO_REORDER].includes(person.customerState)) return null;
  if (person.customerState === CUSTOMER_STATES.READY_TO_BUY) return { label: `📦 ต่อ RoutineX เดือนใหม่`, event: EVENTS.REORDER_CUSTOMER, cost: 1 };
  if (person.day < 28) return { label: `ช่วย ${person.name} ที่จุดติดขัด`, event: EVENTS.CARE_CUSTOMER, cost: 1 };
  if (!person.measuredAgain) return { label: `ไปวัดซ้ำกับ ${person.name}`, event: EVENTS.REMEASURE_CUSTOMER, cost: 2 };
  return null;
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
    ...state.team.map((person) => ({ person, kind: "team" }))
  ];
}
function showPeople(tab = "all", query = "", focusId = null) {
  const tabs = [
    ["all", "ทั้งหมด"],
    ["conversation", "กำลังคุย"],
    ["customer", "ลูกค้า"],
    ["followup", "รอติดตาม"],
    ["xvisor", "สนใจ X-VISOR"],
    ["team", "ทีม"]
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
    if (tab === "followup") return kind === "conversation" && person.journey === "waiting" || kind === "customer" && (person.day < 28 || !person.measuredAgain);
    return true;
  });
  if (tab === "all" && !focusId) {
    const priority = { conversation: 1, customer: 2, team: 3 };
    const unique = /* @__PURE__ */ new Map();
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
      const mentorShare = person.parentId === "player" && ["xlead", "xgen"].includes(state.rank) ? Math.round(Number(person.commission || 0) * 0.2) : 0;
      return `<article class="people-card people-card--team"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>${person.rank === "xlead" ? "XLEAD" : "Certified X-VISOR"} · G${person.generation || 1}</span></div><b>${person.active ? "กำลังทำงาน" : "พักอยู่"}</b></div>
        <dl><div><dt>💰 รายได้เดือนนี้</dt><dd>${formatBaht(person.commission)}</dd></div><div><dt>📦 ยอดส่วนตัว</dt><dd>${formatBaht(person.personalSalesBaht)}</dd></div><div><dt>XV</dt><dd>${formatNumber(person.personalXV)}</dd></div><div><dt>ลูกค้า</dt><dd>${person.customers}</dd></div><div><dt>ทีมย่อย</dt><dd>${person.downstreamXvisors || 0}</dd></div><div><dt>ทำเองได้</dt><dd>${human.autonomy}</dd></div></dl>
        ${mentorShare ? `<p><b>จาก ${escapeHtml(person.name)} คุณได้ 20% ของคอมเขา = ${formatBaht(mentorShare)}</b></p>` : ""}
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
    <div class="people-grid">${cards || '<p class="work-empty">ยังไม่มีคนในกลุ่มนี้</p>'}</div>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="work">🧭 เปิดแผนงาน</button><button class="dialog-button" type="button" data-dialog-action="close">กลับกระดาน</button></div>`, { kind: "wide" });
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
function fill(color) {
  context.fillStyle = color;
}
function rect(x, y, width, height, color) {
  fill(color);
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}
function drawRoom(theme = "office") {
  const colors = theme === "exam" ? ["#dce9ee", "#aebfca"] : theme === "management" ? ["#e5f2ea", "#b8a57f"] : theme === "pre" ? ["#f5ead6", "#c9a578"] : ["#f8efda", "#c9a578"];
  rect(0, 0, 384, 138, colors[0]);
  rect(0, 138, 384, 78, colors[1]);
  for (let y = 140; y < 216; y += 16) for (let x = y / 16 % 2 ? 0 : 16; x < 384; x += 32) rect(x, y, 16, 16, theme === "exam" ? "#bdccd4" : "#d5b284");
  rect(0, 132, 384, 6, "#24445b");
  if (theme !== "exam") {
    rect(24, 23, 72, 56, "#24445b");
    rect(29, 28, 62, 46, "#82cbed");
    rect(58, 28, 4, 46, "#f8efda");
    rect(29, 49, 62, 4, "#f8efda");
  }
}
function drawTable(x, y, width = 92) {
  rect(x, y, width, 9, "#24445b");
  rect(x + 4, y - 5, width - 8, 7, "#d58b58");
  rect(x + 9, y + 9, 7, 31, "#24445b");
  rect(x + width - 16, y + 9, 7, 31, "#24445b");
}
function drawChair(x, y, color = "#5f82a2") {
  rect(x, y, 24, 7, "#24445b");
  rect(x + 3, y + 3, 18, 18, color);
  rect(x + 2, y + 21, 5, 17, "#24445b");
  rect(x + 17, y + 21, 5, 17, "#24445b");
}
function drawScale(x, footY, active = false) {
  rect(x, footY - 8, 34, 7, "#24445b");
  rect(x + 3, footY - 13, 28, 9, active ? "#77d6c2" : "#e4eff0");
  rect(x + 12, footY - 10, 10, 2, "#24445b");
}
function drawBand(x, y, active = false) {
  rect(x, y, 13, 5, "#24445b");
  rect(x + 4, y - 2, 5, 9, active ? "#71ddc5" : "#66a8cb");
}
function drawProduct(x, y, id = "gus") {
  const [color, accent] = productVisuals[id] || ["#67bd83", "#2f7359"];
  rect(x, y, 22, 31, "#24445b");
  rect(x + 3, y + 3, 16, 25, "#eff8e8");
  rect(x + 3, y + 3, 16, 7, color);
  if (id === "gus") {
    rect(x + 7, y + 14, 8, 9, accent);
    rect(x + 10, y + 12, 5, 3, accent);
  } else if (id === "protein-hmb") {
    rect(x + 6, y + 14, 10, 3, accent);
    rect(x + 8, y + 17, 6, 7, accent);
  } else if (id === "vita-matrix") {
    rect(x + 6, y + 14, 10, 2, accent);
    rect(x + 6, y + 19, 10, 2, accent);
    rect(x + 6, y + 24, 10, 2, accent);
  } else {
    rect(x + 7, y + 14, 8, 8, accent);
    rect(x + 9, y + 12, 4, 12, accent);
  }
}
function drawCertificate(x, y) {
  rect(x, y, 40, 29, "#24445b");
  rect(x + 3, y + 3, 34, 23, "#fff7d8");
  rect(x + 9, y + 9, 22, 3, "#67bd83");
  rect(x + 14, y + 17, 12, 2, "#e4b947");
}
function drawDataPanel(x, y, improved = false) {
  rect(x, y, 90, 70, "#24445b");
  rect(x + 4, y + 4, 82, 62, "#f7fbf6");
  [26, improved ? 60 : 38, improved ? 66 : 32].forEach((width, index) => {
    rect(x + 12, y + 14 + index * 16, 64, 7, "#dce7e5");
    rect(x + 12, y + 14 + index * 16, width, 7, improved ? "#62bd83" : "#e7a65a");
  });
}
function drawClock(x, y) {
  rect(x, y, 34, 34, "#24445b");
  rect(x + 4, y + 4, 26, 26, "#fff9e8");
  rect(x + 16, y + 8, 3, 10, "#24445b");
  rect(x + 17, y + 16, 8, 3, "#24445b");
}
function drawDoor(x, open = false) {
  rect(x, 46, 48, 92, "#24445b");
  rect(x + 5, 51, open ? 12 : 38, 81, "#6c8ca1");
  if (!open) rect(x + 34, 91, 4, 4, "#f5ce5c");
}
function drawRoundTable(x, y) {
  rect(x + 12, y, 72, 8, "#24445b");
  rect(x + 4, y + 8, 88, 18, "#24445b");
  rect(x + 9, y + 4, 78, 17, "#d58b58");
  rect(x + 44, y + 25, 8, 30, "#24445b");
}
function drawLaptop(x, y, active = false) {
  rect(x, y, 43, 28, "#24445b");
  rect(x + 4, y + 4, 35, 20, active ? "#73dcc8" : "#d9f2ef");
  rect(x - 5, y + 28, 53, 5, "#24445b");
}
function drawNotification(x, y, color = "#f6ce5a") {
  rect(x, y, 30, 18, "#24445b");
  rect(x + 3, y + 3, 24, 12, "#fffdf2");
  rect(x + 7, y + 6, 7, 6, color);
  rect(x + 17, y + 7, 7, 3, "#5f7885");
}
function drawWhiteboard(x, y) {
  rect(x, y, 106, 65, "#24445b");
  rect(x + 5, y + 5, 96, 55, "#fffdf2");
  rect(x + 14, y + 16, 29, 5, "#63bd84");
  rect(x + 14, y + 30, 70, 4, "#6a8ca0");
  rect(x + 14, y + 42, 54, 4, "#e49d57");
}
function drawPlant(x, y, grown = false) {
  rect(x + 7, y + 18, 16, 15, "#a86643");
  rect(x + 4, y + 14, 22, 5, "#24445b");
  rect(x + 12, y + 2, 5, 15, "#357a55");
  rect(x + (grown ? 0 : 5), y + 2, 12, 8, "#4fbd83");
  rect(x + 16, y - (grown ? 4 : 0), 12, 9, "#75cf96");
}
function drawShelf(x, y, full = false) {
  rect(x, y, 66, 6, "#24445b");
  rect(x + 4, y + 5, 5, 35, "#24445b");
  rect(x + 57, y + 5, 5, 35, "#24445b");
  ["gus", "protein-hmb", ...full ? ["vita-matrix", "astamega"] : []].forEach((id, index) => drawProduct(x + 9 + index * 13, y - 23, id));
}
function worldGrowthPhase() {
  const month = Number(state.month || 0);
  if (state.organizationMode) return month >= 21 ? 9 : month >= 17 ? 8 : 7;
  if (month >= 11) return 6;
  if (month >= 9) return 5;
  if (month >= 7) return 4;
  if (month >= 5) return 3;
  if (month >= 3) return 2;
  return month >= 1 ? 1 : 0;
}
function drawOfficeGrowth(scene) {
  const phase = worldGrowthPhase();
  if (!phase || ["the-xircle", "management_org", "season_review", "open_house_running", "goodluck_running", "xcademy_running", "center_running"].includes(scene)) return;
  if (phase >= 1) {
    rect(111, 30, 47, 35, "#24445b");
    rect(115, 34, 39, 27, "#fff8df");
    rect(121, 40, 18, 3, "#e49d57");
    rect(121, 48, 27, 3, "#6a8ca0");
  }
  if (phase >= 2) {
    drawScale(113, 133);
    drawChair(164, 94, "#73a9c3");
  }
  if (phase >= 3) {
    drawShelf(286, 99, phase >= 5);
    drawPlant(335, 99, phase >= 5);
  }
  if (phase >= 4) {
    rect(170, 30, 83, 25, "#24445b");
    rect(175, 35, 73, 15, "#f6ce5a");
    [0, 1, 2, 3].forEach((index) => {
      rect(182 + index * 15, 39, 8, 7, ["#65bd86", "#68aee1", "#ef8f75", "#8e78c8"][index]);
      rect(184 + index * 15, 37, 4, 2, "#24445b");
    });
  }
  if (phase >= 5) {
    rect(262, 25, 96, 52, "#24445b");
    rect(267, 30, 86, 42, "#e8f5ef");
    [[276, 58, 20], [304, 47, 35], [336, 36, 48]].forEach(([x, y, height], index) => rect(x, y, 12, height, ["#65bd86", "#68aee1", "#f1be47"][index]));
  }
  if (phase >= 6) {
    rect(0, 128, 384, 4, "#f1be47");
  }
}
var roleMarkers = Object.freeze({
  sales: { color: "#ef8f75" },
  care: { color: "#62bd83" },
  builder: { color: "#68aee1" },
  balanced: { color: "#8e78c8" }
});
function drawRoleMarker(x, footY, member = {}) {
  const role = member.rank === "xlead" ? { color: "#f1be47" } : roleMarkers[member.specialty] || roleMarkers.balanced;
  rect(x + 5, footY + 1, 25, member.rank === "xlead" ? 5 : 4, "#24445b");
  rect(x + 8, footY + 2, 19, member.rank === "xlead" ? 3 : 2, role.color);
  if (member.rank === "xlead") {
    rect(x + 12, footY - 1, 3, 3, role.color);
    rect(x + 20, footY - 1, 3, 3, role.color);
  }
}
function drawTeamCharacter(member, x, footY = 176, options = {}) {
  drawRoleMarker(x, footY, member);
  drawCharacterAtFeet(x, footY, member?.appearance || proctorPalette, { idle: true, band: true, ...options });
}
function drawXircleMark(x, y, scale = 1) {
  const unit = 6 * scale;
  rect(x + unit, y, unit, unit, "#f1be47");
  rect(x, y + unit, unit, unit, "#65bd86");
  rect(x + unit * 2, y + unit, unit, unit, "#68aee1");
  rect(x + unit, y + unit * 2, unit, unit, "#ef8f75");
  rect(x + unit, y + unit, unit, unit, "#fff8df");
}
function drawXircleScene(time, npc) {
  rect(0, 0, 384, 76, "#20384f");
  rect(0, 76, 384, 58, "#315b72");
  rect(0, 134, 384, 82, "#456f55");
  rect(298, 24, 22, 22, "#fff1b8");
  rect(303, 24, 17, 17, "#20384f");
  [[22, 29], [61, 18], [104, 37], [347, 26], [274, 54]].forEach(([x, y]) => rect(x, y, 3, 3, "#f8df8b"));
  for (let x = 0; x < 384; x += 38) {
    rect(x + 13, 93, 7, 43, "#273f38");
    rect(x, 77 + x % 3 * 5, 34, 27, "#2f6047");
  }
  rect(22, 54, 5, 101, "#24445b");
  rect(357, 54, 5, 101, "#24445b");
  for (let index = 0; index < 12; index += 1) rect(31 + index * 28, 59 + Math.abs(5 - index) * 2, 5, 5, index % 3 === 0 ? "#ef8f75" : index % 2 ? "#f1be47" : "#68aee1");
  rect(139, 76, 106, 55, "#17384f");
  rect(145, 82, 94, 43, "#2f7359");
  drawXircleMark(178, 87, 2);
  const pulse = !reducedMotion.matches && Math.floor(time / 360) % 2 ? 2 : 0;
  rect(176, 181, 35, 6, "#6f4f35");
  rect(184, 167 - pulse, 20, 16 + pulse, "#ef8f75");
  rect(189, 158 - pulse, 10, 14, "#f1be47");
  drawCharacterAtFeet(35, 198, playerPalette, { pose: "celebrate", band: true, direction: "right" });
  const members = (state.team || []).filter((member) => member.active !== false).slice(0, 5);
  const positions = [92, 238, 279, 322, 348];
  (members.length ? members : [{ appearance: npc, specialty: "balanced" }]).forEach((member, index) => drawTeamCharacter(member, positions[index], 198, { direction: index ? "left" : "right", pose: index < 2 ? "celebrate" : "idle" }));
}
function drawOrganizationScene(time, npc, stageAge) {
  const phase = worldGrowthPhase();
  rect(0, 0, 384, 137, phase >= 9 ? "#dcefe8" : "#e8f3ed");
  rect(0, 137, 384, 79, "#b69b72");
  for (let x = 0; x < 384; x += 32) rect(x + (x / 32 % 2 ? 16 : 0), 139, 16, 77, "#c8ad83");
  rect(150, 18, 220, 84, "#17384f");
  rect(156, 24, 208, 72, "#a9d8e7");
  for (let x = 160; x < 362; x += 23) {
    const height = 20 + x / 23 % 5 * 9;
    rect(x, 96 - height, 16, height, "#52758a");
    rect(x + 4, 87 - height, 3, 3, "#f4d36d");
  }
  rect(17, 24, 118, 77, "#24445b");
  rect(22, 29, 108, 67, "#f8fbf5");
  [[31, 73, 52, 52], [52, 52, 85, 69], [85, 69, 114, 42]].forEach(([x1, y1, x2, y2]) => {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    rect(minX, minY, Math.abs(x2 - x1) + 3, 3, "#77b997");
    rect(x1, y1, 7, 7, "#f1be47");
    rect(x2, y2, 7, 7, "#68aee1");
  });
  rect(0, 130, 384, 7, phase >= 9 ? "#f1be47" : "#4f9a78");
  drawCharacterAtFeet(18, 196, playerPalette, { direction: "right", pose: state.runComplete ? "celebrate" : "talk", band: true });
  const aggregate = state.organization?.aggregate || {};
  const total = Math.max(Number(aggregate.xvisorCount || 0), Number(state.team?.length || 0));
  const visibleTarget = phase >= 9 ? 7 : phase >= 8 ? 6 : 4;
  const visible = Math.max(2, Math.min(visibleTarget, total || 2));
  const positions = [70, 112, 154, 210, 252, 294, 336];
  for (let index = 0; index < visible; index += 1) {
    const member = state.team?.[index] || { appearance: index % 2 ? npc : proctorPalette, specialty: ["sales", "care", "builder", "balanced"][index % 4] };
    drawTeamCharacter(member, positions[index], 196, { direction: index < 3 ? "right" : "left", walk: !reducedMotion.matches && stageAge < 620 ? time / 110 + index : 0 });
  }
  const blocks = Math.min(12, Math.max(2, Math.ceil(Math.log2(Math.max(2, total))) + 2));
  for (let index = 0; index < blocks; index += 1) rect(24 + index * 8, 109, 5, 5 + index % 3 * 3, ["#65bd86", "#68aee1", "#f1be47"][index % 3]);
}
function drawTravelScene(destination, time, npc) {
  rect(0, 0, 384, 144, "#8fd0e3");
  rect(0, 144, 384, 72, "#d9c18e");
  rect(18, 24, 34, 34, "#fff2b0");
  if (destination === "Tokyo") {
    for (let x = 0; x < 384; x += 32) rect(x, 99 + x % 4 * 5, 26, 47, "#526d82");
    rect(187, 43, 8, 102, "#d85d52");
    rect(167, 86, 48, 7, "#eff5ef");
    rect(174, 111, 34, 6, "#eff5ef");
    rect(190, 31, 3, 18, "#d85d52");
  } else if (destination === "Seoul") {
    rect(0, 111, 384, 35, "#5a8864");
    rect(184, 48, 8, 82, "#e7edf0");
    rect(174, 45, 28, 13, "#4d6a80");
    rect(187, 27, 3, 22, "#4d6a80");
  } else if (destination === "Shanghai") {
    rect(183, 43, 9, 103, "#8c7fc1");
    rect(169, 64, 38, 16, "#ef8f75");
    rect(174, 100, 28, 13, "#ef8f75");
    rect(187, 25, 3, 22, "#8c7fc1");
    for (let x = 16; x < 370; x += 37) rect(x, 100 + x % 3 * 8, 27, 46, "#56788c");
  } else if (destination === "Taipei") {
    for (let tier = 0; tier < 6; tier += 1) rect(174 + tier * 2, 43 + tier * 16, 36 - tier * 4, 15, "#4f8c87");
    rect(190, 29, 3, 16, "#355b62");
  } else if (destination === "Paris") {
    rect(188, 42, 7, 105, "#5d6268");
    rect(151, 139, 81, 8, "#5d6268");
    rect(160, 112, 64, 7, "#5d6268");
    rect(171, 81, 42, 6, "#5d6268");
    for (let row = 0; row < 5; row += 1) {
      rect(161 + row * 6, 112 - row * 15, 6, 30, "#5d6268");
      rect(217 - row * 6, 112 - row * 15, 6, 30, "#5d6268");
    }
  } else if (destination === "Dubai") {
    rect(0, 129, 384, 24, "#d8b56f");
    for (let tier = 0; tier < 8; tier += 1) rect(181 + tier, 31 + tier * 14, 24 - tier * 2, 14, "#5d7f91");
    rect(192, 17, 2, 18, "#5d7f91");
  } else if (destination === "Santorini") {
    rect(0, 119, 384, 31, "#3f95bd");
    [42, 101, 165, 229, 295].forEach((x, index) => {
      rect(x, 86 - index % 2 * 12, 49, 59, "#fffdf1");
      rect(x + 13, 76 - index % 2 * 12, 23, 13, "#3e83b2");
      rect(x + 20, 108, 10, 37, "#4d89b2");
    });
  } else if (destination === "London") {
    rect(167, 54, 47, 92, "#aa8355");
    rect(175, 64, 31, 31, "#f2e6c7");
    rect(185, 71, 12, 12, "#5b6d77");
    rect(178, 43, 25, 13, "#665a54");
    rect(188, 26, 5, 20, "#665a54");
    rect(56, 119, 70, 28, "#c84f49");
    rect(64, 125, 54, 10, "#dce9ee");
  } else {
    rect(0, 117, 384, 99, "#3f92b8");
    rect(92, 91, 203, 48, "#f5f4eb");
    rect(126, 62, 131, 32, "#f5f4eb");
    rect(151, 47, 76, 18, "#f5f4eb");
    rect(111, 136, 169, 7, "#24445b");
  }
  rect(0, 145, 384, 7, "#24445b");
  const wave = !reducedMotion.matches && Math.floor(time / 420) % 2 ? "celebrate" : "idle";
  drawCharacterAtFeet(35, 202, playerPalette, { pose: wave, band: true, direction: "right" });
  const companions = (state.team || []).filter((member) => member.active !== false).slice(0, 3);
  (companions.length ? companions : [{ appearance: npc }, { appearance: proctorPalette }]).forEach((member, index) => drawCharacterAtFeet(282 + index * 34, 202, member.appearance || npc, { pose: index === 0 ? wave : "idle", band: true, direction: "left" }));
}
function drawMonth12Scene(npc) {
  rect(0, 0, 384, 132, "#17384f");
  rect(0, 132, 384, 84, "#b79562");
  rect(18, 18, 348, 93, "#24445b");
  rect(24, 24, 336, 81, "#9bd2df");
  for (let x = 28; x < 356; x += 30) rect(x, 67 + x % 4 * 6, 22, 38, "#4e7184");
  rect(0, 126, 384, 7, "#f1be47");
  drawXircleMark(180, 49, 2);
  drawCharacterAtFeet(27, 196, playerPalette, { pose: "celebrate", band: true, direction: "right" });
  const members = (state.team || []).slice(0, 7);
  const positions = [82, 124, 166, 222, 264, 306, 344];
  (members.length ? members : [{ appearance: npc, specialty: "balanced" }]).forEach((member, index) => drawTeamCharacter(member, positions[index], 196, { direction: index < 3 ? "right" : "left", pose: index % 3 === 0 ? "celebrate" : "idle" }));
}
function drawFinaleScene(npc) {
  rect(0, 0, 384, 76, "#e7b56e");
  rect(0, 76, 384, 58, "#9bd4df");
  rect(0, 134, 384, 82, "#6d936d");
  rect(143, 33, 98, 105, "#24445b");
  rect(151, 41, 82, 97, "#e7f1e7");
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 3; col += 1) rect(160 + col * 23, 52 + row * 18, 12, 9, (row + col) % 2 ? "#f1be47" : "#68aee1");
  drawXircleMark(177, 113, 1);
  rect(0, 132, 384, 7, "#f1be47");
  drawCharacterAtFeet(176, 198, playerPalette, { pose: "celebrate", band: true });
  const members = (state.team || []).filter((member) => member.active !== false).slice(0, 8);
  const positions = [18, 57, 96, 135, 220, 259, 298, 337];
  (members.length ? members : [{ appearance: npc, specialty: "balanced" }]).forEach((member, index) => drawTeamCharacter(member, positions[index], 198, { direction: index < 4 ? "right" : "left", pose: index % 4 === 0 ? "celebrate" : "idle" }));
}
function drawCharacterAtFeet(x, footY, palette = playerPalette, options = {}) {
  const walk = options.walk || 0;
  const step = walk ? Math.sin(walk) : 0;
  const jump = options.jump || 0;
  const actualFoot = footY - jump;
  const top = actualFoot - 60;
  const breath = options.idle && !reducedMotion.matches ? Math.floor(performance.now() / 650) % 2 : 0;
  const direction = options.direction === "left" ? -1 : 1;
  const eyeX = direction === 1 ? 19 : 10;
  if (jump) rect(x + 6, footY + 1, 23, 3, "#8f795f");
  rect(x + 7, top + breath, 18, 4, palette.hair);
  rect(x + 4, top + 4 + breath, 24, 16, palette.hair);
  rect(x + 7, top + 6 + breath, 18, 17, palette.skin);
  rect(x + eyeX, top + 12 + breath, 3, 3, "#24445b");
  rect(x + (direction === 1 ? 18 : 9), top + 18 + breath, 6, 2, "#a95751");
  rect(x + 5, top + 23, 22, 19, "#24445b");
  rect(x + 8, top + 24, 16, 16, palette.shirt);
  rect(x + 14, top + 25, 4, 12, palette.accent);
  const armLift = options.pose === "celebrate" ? -9 : options.pose === "talk" ? -3 : 1;
  rect(x + 1, top + 26 + armLift, 6, 14, palette.skin);
  rect(x + 25, top + 26 + armLift, 6, 14, palette.skin);
  const leftX = x + 8 + (step > 0.25 ? -2 : 0);
  const rightX = x + 18 + (step < -0.25 ? 2 : 0);
  rect(leftX, top + 42, 7, actualFoot - (top + 42) - 4, "#24445b");
  rect(rightX, top + 42, 7, actualFoot - (top + 42) - 4, "#24445b");
  rect(leftX - 2, actualFoot - 5, 10, 5, "#eff4eb");
  rect(rightX - 1, actualFoot - 5, 10, 5, "#eff4eb");
  if (options.band) drawBand(direction === 1 ? x + 27 : x - 5, top + 35, options.bandActive);
}
function drawSittingCharacter(x, seatY, palette = playerPalette, direction = "right") {
  const top = seatY - 47;
  const eyeX = direction === "right" ? 19 : 10;
  rect(x + 7, top, 18, 4, palette.hair);
  rect(x + 4, top + 4, 24, 16, palette.hair);
  rect(x + 7, top + 6, 18, 17, palette.skin);
  rect(x + eyeX, top + 12, 3, 3, "#24445b");
  rect(x + 5, top + 23, 22, 18, "#24445b");
  rect(x + 8, top + 24, 16, 15, palette.shirt);
  rect(x + 1, top + 28, 6, 13, palette.skin);
  rect(x + 25, top + 28, 6, 13, palette.skin);
  rect(x + 8, top + 41, 20, 7, "#24445b");
  rect(x + 22, top + 47, 7, 13, "#24445b");
  rect(x + 21, top + 57, 11, 4, "#eff4eb");
}
function drawScene(time) {
  context.imageSmoothingEnabled = false;
  const scene = content.scene || "opening";
  const exam = scene.startsWith("exam") || scene === "ceremony";
  const management = scene.startsWith("management") || ["team_started", "month_closed", "season_review", "content_running", "ads_running", "xcademy_running", "open_house_running", "center_running", "goodluck_running", "the-xircle", "xlead", "xgen"].includes(scene);
  drawRoom(exam ? "exam" : management ? "management" : state.month === 0 ? "pre" : "office");
  if (!exam) drawOfficeGrowth(scene);
  const person = selectedPerson();
  const npc = person?.appearance || { skin: "#dfaa83", hair: "#263844", shirt: "#ef8078", accent: "#fff2d4" };
  const idle = { idle: true, band: state.preseason.day > 0 || state.month >= 1, bandActive: scene === "pre_montage" };
  const stageAge = time - stageStartedAt;
  const organizationMode = state.organizationMode ? organizationVisualMode(stageAge) : null;
  if (organizationMode?.kind === "travel") {
    drawTravelScene(organizationMode.report.trip.destination, time, npc);
  } else if (organizationMode?.kind === "xircle") {
    drawXircleScene(time, npc);
  } else if (organizationMode?.kind === "finale") {
    drawFinaleScene(npc);
  } else if (scene === "the-xircle") {
    drawXircleScene(time, npc);
  } else if (scene === "management_org") {
    drawOrganizationScene(time, npc, stageAge);
  } else if (scene === "season_review") {
    drawMonth12Scene(npc);
  } else if (exam) {
    drawDoor(16, scene === "exam_transit");
    drawClock(326, 26);
    drawTable(142, 150, 106);
    drawChair(110, 121, "#708ba1");
    drawChair(254, 121, "#8d779d");
    drawCharacterAtFeet(286, 176, proctorPalette, { direction: "left", idle: true });
    rect(178, 118, 28, 18, "#24445b");
    rect(181, 121, 22, 12, "#d9f2ef");
    if (scene === "exam_transit") {
      const progress = reducedMotion.matches ? 1 : Math.min(1, stageAge / 1700);
      const x = 34 + Math.min(150, progress * 190);
      if (progress < 0.72) drawCharacterAtFeet(x, 176, playerPalette, { walk: time / 90, direction: "right", band: true });
      else drawSittingCharacter(167, 159, playerPalette, "right");
    } else if (scene === "ceremony") {
      const jump = stageAge > 1200 && stageAge < 1570 && !reducedMotion.matches ? Math.sin((stageAge - 1200) / 370 * Math.PI) * 9 : 0;
      drawCharacterAtFeet(166, 176, playerPalette, { pose: "celebrate", jump, band: true });
      drawCertificate(215, 91);
    } else drawSittingCharacter(167, 159, playerPalette, "right");
  } else if (["pre_scale", "pre_scanning", "pre_day14_scale", "pre_day14_scanning", "pre_day14_review", "pre_day28_scale", "pre_day28_scanning", "pre_day28_review"].includes(scene)) {
    drawScale(178, 177, scene.includes("scanning") || scene.includes("review"));
    drawCharacterAtFeet(179, 164, playerPalette, { ...idle, idle: !scene.includes("scanning") });
    drawDataPanel(268, 63, scene.includes("review") || scene.includes("day28"));
    if (scene.includes("scanning")) rect(165, 105 + time / 16 % 56, 62, 3, "#73e3d2");
  } else if (["pre_band", "pre_summary", "pre_abcd", "practice_data", "practice_care", "pre_montage"].includes(scene)) {
    drawTable(232, 154, 92);
    drawCharacterAtFeet(116, 176, playerPalette, { ...idle, band: scene !== "pre_band" || stageAge > 400, bandActive: scene === "pre_montage" });
    if (scene === "pre_band") drawBand(271, 116, true);
    if (scene === "pre_montage") {
      rect(249, 72, 59, 56, "#24445b");
      rect(254, 78, 49, 45, "#fff8df");
      rect(254, 78, 49, 9, "#ef8078");
      for (let index = 0; index < 28; index += 1) rect(258 + index % 7 * 6, 91 + Math.floor(index / 7) * 7, 4, 4, index < montageVisualDay ? "#4fbd83" : "#d7dfd9");
    } else if (scene === "pre_abcd") ["gus", "protein-hmb", "vita-matrix", "astamega"].forEach((id, index) => drawProduct(231 + index * 24, 117, id));
    else if (scene.startsWith("practice")) {
      drawSittingCharacter(254, 159, npc, "left");
      rect(180, 113, 34, 25, "#24445b");
      rect(183, 116, 28, 19, "#d9f2ef");
    }
  } else if (scene === "opening") {
    drawScale(74, 177);
    drawTable(249, 154, 82);
    drawProduct(276, 118, "gus");
    drawCharacterAtFeet(176, 176, playerPalette, { idle: true });
  } else if (["empty_office", "person_arrives", "consultation", "recommendation", "onboarding", "followup", "interest", "candidate", "sale"].includes(scene)) {
    drawTable(139, 154, 108);
    drawChair(106, 121, "#73a9c3");
    drawChair(257, 121, "#d6a275");
    drawCharacterAtFeet(72, 176, playerPalette, { ...idle, direction: "right", pose: scene === "followup" ? "talk" : "idle" });
    if (scene !== "empty_office") {
      const x = scene === "person_arrives" && !reducedMotion.matches ? 330 - Math.min(52, stageAge / 18) : 277;
      drawCharacterAtFeet(x, 176, npc, { idle: scene !== "person_arrives", direction: "left", walk: scene === "person_arrives" ? time / 90 : 0, band: scene !== "person_arrives" });
    }
    if (["recommendation", "onboarding", "sale"].includes(scene)) {
      const products = person?.routinePlan?.products || [];
      (products.length ? products : ["control"]).forEach((id, index) => {
        if (id !== "control") drawProduct(167 + index * 24, 116, id);
      });
    }
  } else if (["customer_scale", "customer_scanning", "customer_result", "review_scale", "review_scanning", "review_result"].includes(scene)) {
    drawCharacterAtFeet(70, 176, playerPalette, { ...idle, direction: "right" });
    drawScale(222, 177, scene.includes("scanning") || scene.includes("result"));
    drawCharacterAtFeet(223, 164, npc, { direction: "left", band: true });
    drawDataPanel(284, 63, scene.includes("review"));
    if (scene.includes("scanning")) rect(210, 105 + time / 16 % 56, 62, 3, "#73e3d2");
  } else if (scene === "routine_builder") {
    drawTable(130, 154, 130);
    drawSittingCharacter(74, 159, playerPalette, "right");
    drawSittingCharacter(278, 159, npc, "left");
    ["gus", "protein-hmb", "vita-matrix", "astamega"].forEach((id, index) => drawProduct(139 + index * 27, 117, id));
  } else if (scene === "content_running") {
    drawTable(203, 154, 111);
    drawChair(162, 121, "#73a9c3");
    drawSittingCharacter(171, 159, playerPalette, "right");
    drawLaptop(229, 112, true);
    const visible = reducedMotion.matches ? 3 : Math.min(3, Math.floor(stageAge / 420));
    for (let index = 0; index < visible; index += 1) drawNotification(84 + index * 38, 58 + index % 2 * 27, ["#f6ce5a", "#62bd83", "#6cb4df"][index]);
  } else if (scene === "ads_running") {
    drawTable(195, 154, 119);
    drawSittingCharacter(154, 159, playerPalette, "right");
    drawLaptop(224, 112, true);
    rect(58, 50, 91, 68, "#24445b");
    rect(63, 55, 81, 58, "#fffdf2");
    rect(72, 65, 63, 8, "#dbe8e5");
    rect(72, 65, Math.min(63, stageAge / 25), 8, "#62bd83");
    [0, 1, 2].slice(0, reducedMotion.matches ? 3 : Math.floor(stageAge / 520)).forEach((index) => drawNotification(66 + index * 33, 82 + index % 2 * 20, "#6cb4df"));
  } else if (["xcademy_running", "center_running"].includes(scene)) {
    drawWhiteboard(139, 31);
    drawRoundTable(143, 137);
    drawCharacterAtFeet(49, 176, playerPalette, { direction: "right", pose: "talk", band: true });
    const participants = state.team.filter((member) => member.active).slice(0, 3);
    participants.forEach((member, index) => {
      const progress = reducedMotion.matches ? 1 : Math.min(1, stageAge / (750 + index * 180));
      drawTeamCharacter(member, 244 + index * 38 + (1 - progress) * 55, 176, { direction: "left", walk: progress < 1 ? time / 90 : 0 });
    });
    if (!participants.length) drawCharacterAtFeet(284, 176, npc, { direction: "left", idle: true, band: true });
  } else if (["open_house_running", "goodluck_running"].includes(scene)) {
    rect(112, 112, 160, 9, "#24445b");
    rect(122, 78, 140, 34, "#4f9a78");
    rect(154, 49, 76, 24, "#24445b");
    rect(159, 54, 66, 14, "#f6ce5a");
    drawCharacterAtFeet(178, 112, proctorPalette, { pose: "talk", band: true });
    const crowd = [playerPalette, npc, ...state.team.slice(0, 3).map((member) => member.appearance || npc)].slice(0, 5);
    crowd.forEach((palette, index) => drawCharacterAtFeet(43 + index * 67, 176, palette, { direction: index < 2 ? "right" : "left", idle: true, band: true }));
    if (!reducedMotion.matches && Math.floor(stageAge / 420) % 2) drawNotification(304, 46, "#ef8078");
  } else if (["success", "first_g1"].includes(scene)) {
    const jump = scene === "first_g1" && stageAge > 420 && stageAge < 850 && !reducedMotion.matches ? Math.sin((stageAge - 420) / 430 * Math.PI) * 7 : 0;
    drawTable(72, 154, 86);
    drawTable(226, 154, 86);
    drawCharacterAtFeet(98, 176, playerPalette, { pose: "celebrate", jump });
    drawCharacterAtFeet(250, 176, npc, { pose: "celebrate", jump, band: true });
    drawCertificate(173, 70);
  } else if (["weekly", "team_started", "management", "management_team", "month_closed", "season_review"].includes(scene)) {
    const phase = worldGrowthPhase();
    if (phase <= 1) {
      drawTable(226, 154, 92);
      drawLaptop(247, 116, true);
      drawCharacterAtFeet(112, 176, playerPalette, { direction: "right", idle: true, band: true });
    } else if (phase === 2) {
      drawTable(139, 154, 108);
      drawChair(106, 121, "#73a9c3");
      drawChair(257, 121, "#d6a275");
      drawCharacterAtFeet(65, 176, playerPalette, { direction: "right", pose: "talk", band: true });
      drawCharacterAtFeet(284, 176, npc, { direction: "left", idle: true, band: true });
      drawScale(20, 177);
    } else {
      drawRoundTable(142, 132);
      drawCharacterAtFeet(55, 176, playerPalette, { direction: "right", pose: "talk", band: true });
      const teamPositions = [208, 244, 280, 316, 348];
      state.team.slice(0, phase >= 4 ? 5 : 3).forEach((member, index) => drawTeamCharacter(member, teamPositions[index], 176, { direction: "left" }));
      if (state.team.length === 0) drawCharacterAtFeet(281, 176, npc, { direction: "left", idle: true });
      drawDataPanel(274, 40, state.monthStats.weeklyDone);
      if (state.customers.length >= 3) {
        drawChair(12, 119, "#73a9c3");
        drawTable(15, 154, 55);
      }
      if (state.team.length >= 1) {
        rect(215, 53, 38, 28, "#24445b");
        rect(219, 57, 30, 20, "#d9f2ef");
      }
    }
  } else if (["xlead", "xgen"].includes(scene)) {
    drawWhiteboard(138, 29);
    drawCharacterAtFeet(55, 176, playerPalette, { pose: "celebrate", band: true });
    state.team.slice(0, 4).forEach((member, index) => drawTeamCharacter(member, 190 + index * 43, 176, { direction: "left" }));
    rect(50, 42, 65, 25, "#24445b");
    rect(55, 47, 55, 15, "#f6ce5a");
  } else if (scene === "certified") {
    const jump = stageAge > 420 && stageAge < 850 && !reducedMotion.matches ? Math.sin((stageAge - 420) / 430 * Math.PI) * 7 : 0;
    drawCharacterAtFeet(176, 176, playerPalette, { pose: "celebrate", jump, band: true });
    drawCertificate(174, 72);
  }
  renderWorldEventCard(scene, stageAge, organizationMode);
  effects = effects.filter((particle) => particle.life > 0);
  effects.forEach((particle) => {
    rect(particle.x, particle.y, particle.size, particle.size, particle.color);
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.06;
    particle.life -= 1;
  });
  requestAnimationFrame(drawScene);
}
document.addEventListener("visibilitychange", () => {
  audio.setSuspended(document.hidden);
  if (!document.hidden) scheduleAutomaticTransition();
});
reducedMotion.addEventListener?.("change", scheduleAutomaticTransition);
render();
scheduleAutomaticTransition();
requestAnimationFrame(drawScene);

import {
  CUSTOMER_STATES as CUSTOMER_STATES2,
  EVENTS as EVENTS2,
  PEOPLE_RENDER_LIMIT,
  SAVE_KEY as SAVE_KEY2,
  V9_SCORE_VERSION,
  buildPersonAction,
  calculateEconomy as calculateEconomy2,
  findPerson,
  getPersonContextAction,
  getRolling3TGV,
  getTgvHistory,
  parseSavedState as parseSavedState2
} from "./game-data.js";
import { getSkillSnapshot as getSkillSnapshot2 } from "./game-progression.js";
var PROFILE_KEY = "mc_xvisor_certified";
var SCORE_SENT_PREFIX = "mc_xvisor_1_score_sent:";
var $2 = (selector, root = document) => root.querySelector(selector);
var dialog = $2("#gameDialog");
var dialogContent = $2("#dialogContent");
var peopleTab = "priority";
var peopleQuery = "";
var peoplePage = 0;
var peopleFocusId = null;
var cloudSyncAttempted = false;
var patchQueued = false;
var PERSON_EVENTS = /* @__PURE__ */ new Set([
  EVENTS2.CONTACT_PROSPECT,
  EVENTS2.MEET_PROSPECT,
  EVENTS2.CONSULT_PROSPECT,
  EVENTS2.BASELINE_PROSPECT,
  EVENTS2.OPEN_MANAGEMENT_ROUTINE,
  EVENTS2.OFFER_PROSPECT,
  EVENTS2.FOLLOW_UP_DECISION,
  EVENTS2.CARE_CUSTOMER,
  EVENTS2.REMEASURE_CUSTOMER,
  EVENTS2.REORDER_CUSTOMER,
  EVENTS2.ASK_REFERRAL,
  EVENTS2.INVITE_XVISOR,
  EVENTS2.START_CANDIDATE_XCADEMY,
  EVENTS2.REVIEW_CANDIDATE,
  EVENTS2.CERTIFY_CANDIDATE,
  EVENTS2.MENTOR_TEAM_MEMBER
]);
function escapeHtml2(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function fmt(value) {
  return Math.round(Number(value || 0)).toLocaleString("th-TH");
}
function baht(value) {
  return `฿${fmt(value)}`;
}
function stateNow() {
  try {
    return parseSavedState2(localStorage.getItem(SAVE_KEY2));
  } catch {
    return null;
  }
}
function profileCertified() {
  try {
    return localStorage.getItem(PROFILE_KEY) === "1";
  } catch {
    return false;
  }
}
function scoreSentKey(runId) {
  return `${SCORE_SENT_PREFIX}${runId || "unknown"}`;
}
function submittedName(runId) {
  try {
    return localStorage.getItem(scoreSentKey(runId)) || "";
  } catch {
    return "";
  }
}
function hardClose() {
  if (dialog?.open) dialog.close();
  if (dialogContent) dialogContent.innerHTML = "";
  if (dialog) {
    delete dialog.dataset.peopleTab;
    delete dialog.dataset.v9Dialog;
  }
  peopleFocusId = null;
  document.body.style.removeProperty("overflow");
  requestAnimationFrame(() => $2("#actionBar button, #peopleButton, #monthButton")?.focus?.());
}
function showDialog2(html, kind = "wide", key = "v9") {
  if (!dialog || !dialogContent) return;
  dialogContent.innerHTML = html;
  dialog.dataset.kind = kind;
  dialog.dataset.v9Dialog = key;
  document.body.style.overflow = "hidden";
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector("button, input")?.focus?.());
}
function originLabel(person) {
  const origin = person.origin || {};
  if (origin.sourceName) return origin.sourceName;
  const source = origin.sourceType || person.source;
  return { known: "คนที่คุณรู้จัก", referral: "Referral", content: "Content", ads: "Ads", event: "Open House / Event", team: "ทีมพามา", tutorial: "Month 1" }[source] || "Journey ในเกม";
}
function peopleRows(state2) {
  const rows = [
    ...(state2.prospects || []).map((person) => ({ person, kind: "prospect" })),
    ...(state2.customers || []).map((person) => ({ person, kind: "customer" })),
    ...(state2.team || []).map((person) => ({ person, kind: "team" }))
  ];
  const priority = { prospect: 1, customer: 2, team: 3 };
  const unique = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = row.person.personId || row.person.id;
    if (!unique.has(key) || priority[row.kind] > priority[unique.get(key).kind]) unique.set(key, row);
  }
  return [...unique.values()];
}
function categoryFor(row) {
  const { person, kind } = row;
  if (kind === "team") {
    if (person.rank === "xlead" || Number(person.leaderReadiness || 0) >= 65) return "grow";
    if (Number(person.autonomy || 0) < 55) return "priority";
    return "stable";
  }
  if (kind === "customer") {
    const sat = Number(person.satisfaction || 0);
    if (sat < 55 || person.customerState === CUSTOMER_STATES2.NEEDS_HELP) return "priority";
    if (person.xvisorInterest || person.xvisorStage || person.referralReady) return "opportunity";
    if (sat >= 75 || person.selfDirected) return "stable";
    return "priority";
  }
  if (["recommendation", "waiting", "discovery", "baseline"].includes(person.journey)) return "opportunity";
  return ["new", "scheduled", "conversation"].includes(person.journey) ? "grow" : "stable";
}
function actionButton(action, person) {
  if (!action) return "";
  const state2 = stateNow();
  const disabled = Number(action.cost || 0) > Number(state2?.energy || 0) && !state2?.organizationMode;
  return `<button class="work-button" type="button" data-work-event="${escapeHtml2(action.event)}" data-id="${escapeHtml2(person.id)}"${disabled ? " disabled" : ""}><strong>${escapeHtml2(action.label)}</strong><span>${escapeHtml2(action.reason || person.status || "")}</span>${action.cost ? `<b>⚡ ${action.cost}</b>` : ""}</button>`;
}
function rowCard(row, state2) {
  const { person, kind } = row;
  const action = getPersonContextAction(state2, person, kind);
  const actionHtml = actionButton(action, person);
  if (kind === "team") {
    return `<article class="people-card people-card--team"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>${escapeHtml2(person.rank === "xlead" ? "XLEAD" : "Certified X-VISOR")} · ${escapeHtml2(person.specialtyLabel || "⚖️ สมดุล")}</span></div><b>${person.active ? "กำลังทำงาน" : "พักอยู่"}</b></div><dl><div><dt>Personal XV</dt><dd>${fmt(person.personalXV)}</dd></div><div><dt>ลูกค้า</dt><dd>${fmt(person.customers)}</dd></div><div><dt>ทีมย่อย</dt><dd>${fmt(person.downstreamXvisors)}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml || "<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>"}</article>`;
  }
  if (kind === "customer") {
    return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>ลูกค้า · ❤️ ${fmt(person.satisfaction)}%</span></div><b>${escapeHtml2(person.status || "")}</b></div><dl><div><dt>ความพอใจ</dt><dd>${fmt(person.satisfaction)}%</dd></div><div><dt>Routine</dt><dd>${person.selfDirected ? "เดินเองได้" : "กำลังดูแล"}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml || "<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>"}</article>`;
  }
  return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>${escapeHtml2(person.journey || "Prospect")}</span></div><b>${escapeHtml2(person.status || "")}</b></div><dl><div><dt>เปิดใจ</dt><dd>${fmt(person.readiness)}%</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml}</article>`;
}
function renderPeople(focusId = peopleFocusId) {
  const state2 = stateNow();
  if (!state2) return;
  if (state2.organizationMode) return renderOrganization();
  peopleFocusId = focusId || null;
  const rows = peopleRows(state2);
  const query = peopleQuery.trim().toLocaleLowerCase("th");
  const filtered = rows.filter((row) => {
    if (peopleFocusId && row.person.id !== peopleFocusId && row.person.personId !== peopleFocusId) return false;
    if (query && !String(row.person.name || "").toLocaleLowerCase("th").includes(query)) return false;
    return peopleFocusId || peopleTab === "all" || categoryFor(row) === peopleTab;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PEOPLE_RENDER_LIMIT));
  peoplePage = Math.max(0, Math.min(peoplePage, pages - 1));
  const visible = filtered.slice(peoplePage * PEOPLE_RENDER_LIMIT, (peoplePage + 1) * PEOPLE_RENDER_LIMIT);
  const aggregate = state2.organization?.aggregate;
  showDialog2(`<div class="dialog-kicker">👥 คนของคุณ · ${fmt(rows.length)}${aggregate?.overflowPeople ? ` + ${fmt(aggregate.overflowPeople)} ใน Organization` : ""}</div><h2>${peopleFocusId ? "รายละเอียดและ Next Action" : "ดูเฉพาะคนที่มีเหตุผลให้ดูตอนนี้"}</h2><p class="dialog-note">หน้าจอนี้ render สูงสุด ${PEOPLE_RENDER_LIMIT} คนต่อครั้ง ไม่ว่าทีมจะใหญ่แค่ไหน</p>
    ${peopleFocusId ? `<button class="people-back" type="button" data-v9-clear-focus>← กลับไปรายชื่อ</button>` : `<div class="people-tabs" role="tablist">${[["priority", "🔴 ต้องช่วย"], ["opportunity", "💰 โอกาสดี"], ["grow", "✨ มีแววโต"], ["stable", "✅ เดินเองได้"], ["all", "ทั้งหมด"]].map(([id, label]) => `<button type="button" data-v9-people-tab="${id}" aria-selected="${peopleTab === id}">${label}</button>`).join("")}</div><label class="people-search">ค้นหาชื่อ <input type="search" data-v9-people-search value="${escapeHtml2(peopleQuery)}" placeholder="เช่น เมย์"></label>`}
    <div class="people-grid">${visible.map((row) => rowCard(row, state2)).join("") || '<p class="work-empty">ไม่มีคนในกลุ่มนี้</p>'}</div>
    <div class="dialog-actions">${peopleFocusId ? "" : `<button class="dialog-button dialog-button--secondary" type="button" data-v9-page="prev" ${peoplePage <= 0 ? "disabled" : ""}>← ก่อนหน้า</button><span>${peoplePage + 1} / ${pages}</span><button class="dialog-button dialog-button--secondary" type="button" data-v9-page="next" ${peoplePage >= pages - 1 ? "disabled" : ""}>ถัดไป →</button>`}<button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button></div>`, "wide", "people");
}
function renderOrganization() {
  const state2 = stateNow();
  if (!state2) return;
  const economy = calculateEconomy2(state2);
  const agg = state2.organization?.aggregate || {};
  const leaders = (state2.team || []).filter((member) => member.parentId === "player" || member.rank === "xlead").slice(0, 12);
  showDialog2(`<div class="dialog-kicker">🏙️ ORGANIZATION MODE · MONTH ${state2.month}</div><h2>${fmt(economy.tgv)} XV · ${baht(economy.projectedIncome)}</h2><p class="dialog-note">หลัง Month 12 ระบบเก็บรายคนเฉพาะ Direct G1 / XLEAD / คนสำคัญ ส่วนองค์กรลึกเป็น aggregate</p>
    <div class="income-sections"><section><div class="income-heading"><span>❤️ Active Customers</span><b>${fmt(agg.activeCustomers)}</b></div></section><section><div class="income-heading"><span>🌱 X-VISOR</span><b>${fmt(agg.xvisorCount)}</b></div></section><section><div class="income-heading"><span>👑 XLEAD</span><b>${fmt(agg.xleadCount)}</b></div></section><section><div class="income-heading"><span>ทีมทำงานเอง</span><b>${fmt(state2.monthStats?.teamActions)}</b></div><p>เป็นสถิติ aggregate ไม่ใช่ task objects</p></section></div>
    <section class="work-section"><h3>ผู้นำที่ยังเก็บเป็นรายคน</h3><div class="people-grid">${leaders.map((member) => rowCard({ person: member, kind: "team" }, state2)).join("") || "<p>ยังไม่มีผู้นำที่ต้อง drill-down</p>"}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`, "wide", "organization");
}
function renderIncome() {
  const state2 = stateNow();
  if (!state2) return;
  const economy = calculateEconomy2(state2);
  const report = state2.organizationMode ? state2.lastOrganizationReport : null;
  const shownIncome = report ? Number(report.income || 0) : Number(economy.projectedIncome || 0);
  const shownLifetime = report ? Number(report.totalIncome || state2.economy?.totalIncome || 0) : Number(economy.lifetimeIncome || 0);
  const shownChannel1 = report ? Number(report.incomeBreakdown?.channel1 || 0) : Number(economy.channel1 || 0);
  const shownChannel2 = report ? Number(report.incomeBreakdown?.channel2 || 0) : Number(economy.channel2 || 0);
  const shownChannel3 = report ? Number(report.incomeBreakdown?.channel3 || 0) : Number(economy.channel3 || 0);
  const top = (economy.mentoringBreakdown || []).slice().sort((a, b) => b.mentorIncome - a.mentorIncome).slice(0, 5);
  const history = [...economy.incomeHistory || []].reverse().slice(0, 12);
  const historyCards = history.map((item) => `<details class="income-history-card"><summary><span>เดือน ${item.month}</span><span>${fmt(item.tgv)} XV</span><b>${baht(item.total)}</b></summary><div><span>① ลูกค้า <b>${baht(item.channel1)}</b></span><span>② พัฒนา G1 <b>${baht(item.channel2)}</b></span><span>③ Organization <b>${baht(item.channel3)}</b></span></div></details>`).join("");
  showDialog2(`<div class="dialog-kicker">REVENUE STACK · 1.0</div><h2>${report ? `เดือน ${report.month}` : "เดือนนี้"} ${baht(shownIncome)}</h2>
    <div class="revenue-hero"><div><span>💰 ${report ? "รายได้เดือนล่าสุด" : "รายได้เดือนนี้"}</span><strong>${baht(shownIncome)}</strong></div><div><span>∑ รายได้สะสม</span><strong>${baht(shownLifetime)}</strong></div></div>
    <div class="income-sections">
      <section><div class="income-heading"><span>① ขายและดูแลลูกค้า</span><b>${baht(shownChannel1)}</b></div><p>${report ? `ยอดขายบาท ${baht(report.personalSalesBaht)} · XV ${fmt(report.personalXV)} แยกเป็น Volume` : `ยอดขาย ${baht(economy.personalSalesBaht)} × ${escapeHtml2(economy.tier?.label || "tier ปัจจุบัน")} · XV ${fmt(economy.personalXV)} ใช้เป็น Volume แยกจากยอดบาท`}</p></section>
      <section><div class="income-heading"><span>② พัฒนา Direct G1 ${economy.mentoringUnlocked ? "" : "· รอ Certified XLEAD"}</span><b>${economy.mentoringUnlocked ? baht(shownChannel2) : "🔒"}</b></div><p>20% ของ commission G1 แต่ละคน</p>${!report && economy.mentoringUnlocked ? `<ul class="income-breakdown">${top.map((item) => `<li><span>${escapeHtml2(item.name)} · ${fmt(item.personalXV)} XV · คอม ${baht(item.commission)}</span><b>${baht(item.mentorIncome)}</b></li>`).join("") || "<li><span>G1 ยังไม่มียอดเดือนนี้</span><b>฿0</b></li>"}</ul>` : ""}</section>
      <section><div class="income-heading"><span>③ บริหาร Organization ${state2.career?.xgenCertified ? "" : "· รอ Certified XGEN"}</span><b>${state2.career?.xgenCertified ? baht(shownChannel3) : "🔒"}</b></div><p>5% ของ TGV <b>เดือนนั้นเท่านั้น</b> · ปิดเดือนแล้วไม่จ่ายยอดเดิมซ้ำ</p></section>
    </div>
    <section class="income-history"><h3>ย้อนหลังรายเดือน</h3>${history.length ? `<div class="income-history-cards">${historyCards}</div><div class="table-scroll income-history-table"><table><thead><tr><th>เดือน</th><th>TGV</th><th>①</th><th>②</th><th>③</th><th>รวม</th></tr></thead><tbody>${history.map((item) => `<tr><th>${item.month}</th><td>${fmt(item.tgv)} XV</td><td>${baht(item.channel1)}</td><td>${baht(item.channel2)}</td><td>${baht(item.channel3)}</td><td><b>${baht(item.total)}</b></td></tr>`).join("")}</tbody></table></div>` : "<p>ปิดเดือนแรกเพื่อเริ่มเก็บประวัติรายได้</p>"}</section>
    <p class="dialog-note">ตัวเลขเชิงพาณิชย์อ่านจาก config ของเกมและมีสถานะจำลอง / TO_CONFIRM ไม่ใช่การรับประกันรายได้จริง</p>
    <button class="dialog-button" type="button" data-v9-close>กลับเกม</button>`, "wide", "income");
}
function renderTgvHelp() {
  const state2 = stateNow();
  if (!state2) return;
  const history = getTgvHistory(state2);
  const last = history.at(-1);
  const best = history.reduce((max, entry) => Math.max(max, Number(entry.tgv || 0)), 0);
  showDialog2(`<div class="dialog-kicker">🏙️ TGV</div><h2>ยอด XV ของคุณและทีมในเดือนนี้</h2><p class="term-definition">TGV เริ่มใหม่ทุกเดือน เดือนที่ปิดไปแล้วจะเก็บไว้เป็นสถิติและจะไม่ถูกนำมาจ่ายซ้ำ</p><div class="summary-grid"><div><span>เดือนนี้</span><strong>${fmt(calculateEconomy2(state2).tgv)} XV</strong></div><div><span>เดือนที่แล้ว</span><strong>${fmt(last?.tgv)} XV</strong></div><div><span>Best TGV</span><strong>${fmt(best)} XV</strong></div>${state2.career?.xgenQualified ? `<div><span>3-Month TGV</span><strong>${fmt(getRolling3TGV(state2))} XV</strong></div>` : ""}</div><button class="dialog-button" type="button" data-v9-close>เข้าใจแล้ว</button>`, "wide", "tgv");
}
function renderMonthConfirm() {
  const state2 = stateNow();
  if (!state2) return;
  if (state2.organizationMode) {
    hardClose();
    dispatch(EVENTS2.END_MONTH);
    return;
  }
  const economy = calculateEconomy2(state2);
  showDialog2(`<div class="dialog-kicker">🌙 จบเดือน ${state2.month}</div><h2>จบเดือน ${state2.month} ตอนนี้ไหม?</h2><div class="summary-grid"><div><span>🏙️ TGV เดือนนี้</span><strong>${fmt(economy.tgv)} XV</strong></div><div><span>💰 คาดว่าจะได้รับ</span><strong>${baht(economy.projectedIncome)}</strong></div></div><p class="dialog-note">⚡ พลังงานที่เหลือ ${fmt(state2.energy)} จะไม่ทบไปเดือนหน้า</p><div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v9-close>← กลับกระดาน</button><button class="dialog-button" type="button" data-v9-end-month>🌙 จบเดือน</button></div>`, "wide", "month");
}
function finaleHtml(state2, status = "") {
  const score = state2.campaignScore || {};
  const sent = submittedName(state2.runId);
  const name = sent || "";
  return `<div class="dialog-kicker">🏆 MONTH 12 · REVELATION</div><h2>12 เดือนแรกจบแล้ว</h2><p class="v9-revelation">คุณเริ่มจากคนเดียว → ลูกค้าเริ่มเดิน Routine เอง → X-VISOR เริ่มดูแลลูกค้าของตัวเอง → XLEAD เริ่มพัฒนาคน → Organization เริ่มเดินโดยไม่ต้องรอคุณทุกเรื่อง</p><blockquote class="v9-quote">คุณไม่ได้หยุดทำธุรกิจ แต่ธุรกิจไม่ต้องรอคุณทำทุกอย่างด้วยตัวเองอีกแล้ว</blockquote>
    <div class="v9-score-grid"><div><span>🏆 Best TGV</span><strong>${fmt(score.bestTgv)} XV</strong></div><div><span>💰 รายได้รวม 12 เดือน</span><strong>${baht(score.totalIncome)}</strong></div><div><span>💎 สูงสุด / เดือน</span><strong>${baht(score.bestMonthlyIncome)}</strong></div><div><span>🏙️ Organization</span><strong>${fmt(score.organizationSize)} คน</strong></div></div>
    <label class="v9-score-name">ชื่อบน Scoreboard <input type="text" maxlength="28" data-v9-score-name value="${escapeHtml2(name)}" placeholder="ชื่อเล่น"></label>
    <p class="dialog-note" data-v9-score-status>${sent ? `✅ ส่ง High Score แล้วในชื่อ ${escapeHtml2(sent)}` : escapeHtml2(status || "ใส่ชื่อเล่นแล้วส่งคะแนนได้เลย · ไม่ต้องสมัครสมาชิก")}</p>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v9-new-run>↺ เล่นใหม่</button><button class="dialog-button" type="button" data-v9-submit-score>${sent ? "ส่งชื่ออีกครั้ง" : "🏆 ส่ง High Score"}</button><button class="dialog-button" type="button" data-v9-enter-org>▶ เล่นต่อใน Organization Mode</button></div>`;
}
function showFinale(status = "") {
  const state2 = stateNow();
  if (!state2?.campaignScore?.locked || state2.organizationMode) return;
  showDialog2(finaleHtml(state2, status), "wide", "finale");
}
async function submitScore() {
  const state2 = stateNow();
  if (!state2?.campaignScore?.locked) return;
  const input = $2("[data-v9-score-name]", dialog);
  const name = String(input?.value || "").trim().slice(0, 28);
  if (!name) return showFinale("กรอกชื่อเล่นก่อนส่ง High Score");
  const status = $2("[data-v9-score-status]", dialog);
  if (status) status.textContent = "กำลังส่ง High Score…";
  try {
    const response = await fetch("/api/xvisor-scores", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: name,
        runId: state2.runId,
        scoreVersion: V9_SCORE_VERSION,
        runMode: state2.campaignScore.runMode,
        completedAt: state2.campaignScore.completedAt,
        bestTgv: state2.campaignScore.bestTgv,
        totalIncome: state2.campaignScore.totalIncome,
        bestMonthlyIncome: state2.campaignScore.bestMonthlyIncome,
        organizationSize: state2.campaignScore.organizationSize
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "SUBMIT_FAILED");
    try {
      localStorage.setItem(scoreSentKey(state2.runId), name);
    } catch {
    }
    showFinale(`✅ ส่ง High Score แล้วในชื่อ ${name}`);
  } catch {
    showFinale("บันทึกคะแนนไว้ในเครื่องแล้ว แต่ส่งขึ้น Scoreboard ไม่สำเร็จ · กดลองส่งอีกครั้งได้");
  }
}
function patchPersonActions(state2) {
  const missions = state2?.missions || [];
  for (const button of document.querySelectorAll("#actionBar button[data-event], #gameDialog [data-work-event]")) {
    const event = button.dataset.event || button.dataset.workEvent;
    if (!PERSON_EVENTS.has(event)) continue;
    let id = button.dataset.id;
    const visibleLabel = button.querySelector("strong")?.textContent?.trim() || "";
    if (!id) {
      const mission = missions.find((item) => item.event === event && (!visibleLabel || item.label === visibleLabel || visibleLabel.includes(item.targetName || "")));
      id = mission?.targetId || "";
      if (id) button.dataset.id = id;
    }
    const target = findPerson(state2, id);
    const action = buildPersonAction({ event, target, state: state2 });
    if (!action) {
      button.disabled = true;
      button.hidden = true;
      continue;
    }
    const strong = button.querySelector("strong");
    if (strong && strong.textContent !== action.label) strong.textContent = action.label;
  }
}
function patchMonthSummaryCopy() {
  const root = $2("#sceneDetails");
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = node.nodeValue.replace(/\s*\/\s*3,000,000/g, "").replace(/\s*\/\s*3000000/g, "");
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}
function patchMaxSkillButtons(state2) {
  if (!state2) return;
  const snapshot = getSkillSnapshot2(state2);
  for (const button of document.querySelectorAll(`#gameDialog [data-work-event="${EVENTS2.TRAIN_SKILL}"][data-skill]`)) {
    if (snapshot.skills?.[button.dataset.skill]?.level >= 10) button.remove();
  }
}
function patchHud() {
  const state2 = stateNow();
  if (!state2) return;
  const economy = calculateEconomy2(state2);
  const organizationVisible = state2.organizationMode || state2.milestones?.firstG1 || Number(state2.team?.length || 0) > 0;
  const volumeLabel = $2("#hudVolumeLabel");
  const volume = $2("#hudXV");
  if (organizationVisible) {
    if (volumeLabel) volumeLabel.innerHTML = '🏙️ TGV เดือนนี้ <b aria-hidden="true">?</b>';
    if (volume) volume.textContent = `${fmt(economy.tgv)} XV`;
  }
  if (state2.organizationMode) {
    const energy = $2("#hudEnergyButton");
    if (energy) energy.hidden = true;
    const monthButton = $2("#monthButton");
    if (monthButton) {
      monthButton.hidden = false;
      monthButton.textContent = "ผ่านไปอีก 1 เดือน";
    }
    const people = $2("#peopleButton");
    if (people) {
      people.hidden = false;
      const count = state2.organization?.aggregate?.xvisorCount || state2.team?.length || 0;
      people.innerHTML = `Organization <b>${fmt(count)}</b>`;
    }
  }
  patchPersonActions(state2);
  patchMonthSummaryCopy();
  patchMaxSkillButtons(state2);
  if (state2.campaignComplete && state2.campaignScore?.locked && !state2.organizationMode && !dialog?.open) {
    showFinale();
  }
}
function queuePatch() {
  if (patchQueued) return;
  patchQueued = true;
  requestAnimationFrame(() => {
    patchQueued = false;
    patchHud();
  });
}
async function syncCertifiedToCloud() {
  if (cloudSyncAttempted || !profileCertified()) return;
  cloudSyncAttempted = true;
  try {
    const response = await fetch("/api/progress", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = await response.json();
    const progress = { ...payload.progress || {}, [PROFILE_KEY]: "1" };
    await fetch("/api/progress", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }) });
  } catch {
  }
}
function persistCertification() {
  const state2 = stateNow();
  if (!state2?.milestones?.certified) return;
  try {
    localStorage.setItem(PROFILE_KEY, "1");
  } catch {
  }
  syncCertifiedToCloud();
}
document.addEventListener("click", (event) => {
  const close = event.target.closest("[data-v9-close]");
  if (close) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose();
    return;
  }
  const finale = event.target.closest('[data-ui="v9-finale"]');
  if (finale) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showFinale();
    return;
  }
  const peopleTrigger = event.target.closest('#peopleButton, [data-open-people], [data-dialog-action="people"]');
  if (peopleTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage = 0;
    peopleFocusId = null;
    renderPeople();
    return;
  }
  const personTrigger = event.target.closest("#sceneDetails [data-person-id]");
  if (personTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage = 0;
    renderPeople(personTrigger.dataset.personId);
    return;
  }
  const incomeTrigger = event.target.closest("#incomeButton");
  if (incomeTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderIncome();
    return;
  }
  const tgvTrigger = event.target.closest("#hudXVButton");
  if (tgvTrigger) {
    const state2 = stateNow();
    if (state2 && (state2.organizationMode || state2.milestones?.firstG1 || state2.team?.length)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderTgvHelp();
      return;
    }
  }
  const monthTrigger = event.target.closest("#monthButton");
  if (monthTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderMonthConfirm();
    return;
  }
  const orgPass = event.target.closest('#actionBar button[data-event="END_MONTH"]');
  if (orgPass && stateNow()?.organizationMode) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatch(EVENTS2.END_MONTH);
    return;
  }
  const work = event.target.closest("#gameDialog [data-work-event]");
  if (work && !work.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload = {};
    if (work.dataset.id) payload.id = work.dataset.id;
    if (work.dataset.source) payload.source = work.dataset.source;
    if (work.dataset.skill) payload.skill = work.dataset.skill;
    const gameEvent = work.dataset.workEvent;
    hardClose();
    dispatch(gameEvent, payload);
    return;
  }
  const endMonth = event.target.closest("[data-v9-end-month]");
  if (endMonth) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose();
    dispatch(EVENTS2.END_MONTH);
    return;
  }
  const tab = event.target.closest("[data-v9-people-tab]");
  if (tab) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peopleTab = tab.dataset.v9PeopleTab;
    peoplePage = 0;
    peopleFocusId = null;
    renderPeople();
    return;
  }
  const clearFocus = event.target.closest("[data-v9-clear-focus]");
  if (clearFocus) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peopleFocusId = null;
    peoplePage = 0;
    renderPeople();
    return;
  }
  const page = event.target.closest("[data-v9-page]");
  if (page && !page.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage += page.dataset.v9Page === "next" ? 1 : -1;
    renderPeople();
    return;
  }
  const submit = event.target.closest("[data-v9-submit-score]");
  if (submit) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore();
    return;
  }
  const enter = event.target.closest("[data-v9-enter-org]");
  if (enter) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose();
    dispatch(EVENTS2.ENTER_ORGANIZATION);
    return;
  }
  const newRun = event.target.closest("[data-v9-new-run]");
  if (newRun) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY2);
    } catch {
    }
    location.reload();
  }
}, true);
document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-v9-people-search]");
  if (!input) return;
  event.stopImmediatePropagation();
  peopleQuery = input.value;
  peoplePage = 0;
  const position = input.selectionStart;
  renderPeople();
  requestAnimationFrame(() => {
    const next = $2("[data-v9-people-search]");
    if (next) {
      next.focus();
      next.setSelectionRange(position, position);
    }
  });
}, true);
dialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  hardClose();
}, true);
var observer = new MutationObserver(() => {
  persistCertification();
  queuePatch();
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "data-stage"] });
persistCertification();
queuePatch();

import {
  EVENTS as EVENTS3,
  SAVE_KEY as SAVE_KEY3,
  V1_SCORE_VERSION,
  parseSavedState as parseSavedState3
} from "./game-data.js";
var $3 = (selector, root = document) => root.querySelector(selector);
var SCORE_SENT_PREFIX2 = "mc_xvisor_1_score_sent:";
var patchQueued2 = false;
var month24DismissedRun = null;
function fmt2(value) {
  return Math.round(Number(value || 0)).toLocaleString("th-TH");
}
function baht2(value) {
  return `฿${fmt2(value)}`;
}
function signed(value) {
  const number = Math.round(Number(value || 0));
  return `${number > 0 ? "+" : ""}${fmt2(number)}`;
}
function escapeHtml3(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function stateNow2() {
  try {
    return parseSavedState3(localStorage.getItem(SAVE_KEY3));
  } catch {
    return null;
  }
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
function queuePatch2() {
  if (patchQueued2) return;
  patchQueued2 = true;
  requestAnimationFrame(() => {
    patchQueued2 = false;
    patchReleaseUi();
  });
}
function claimVersionLabels() {
  const app = $3("#gameApp");
  if (app?.dataset.gameVersion !== "1.0b") app.dataset.gameVersion = "1.0b";
  const chip = $3('.rank-chip[aria-label="เวอร์ชันเกม"], .rank-chip[data-release-version="1.0b"]');
  if (chip) chip.dataset.releaseVersion = "1.0b";
  setText(chip, "1.0b");
  setText($3(".world-frame__label b, .v1-world-version"), "1.0b");
  setText($3(".game-footer > span:last-child"), "1.0b · RELEASE 1 SEP 2026");
}
function patchScoreFinale(state2) {
  if (!state2?.campaignScore?.locked || state2.organizationMode) return;
  const dialog2 = $3("#gameDialog");
  if (!dialog2?.open) return;
  const submit = dialog2.querySelector("[data-v9-submit-score]");
  if (submit) {
    submit.removeAttribute("data-v9-submit-score");
    submit.setAttribute("data-v1-submit-score", "");
  }
  const kicker = dialog2.querySelector(".dialog-kicker");
  if (kicker?.textContent?.includes("MONTH 12")) setText(kicker, "🏆 MONTH 12 · X-VISOR QUEST 1.0b");
  const quote = dialog2.querySelector(".v9-quote");
  if (quote && !dialog2.querySelector(".v1-revelation-story")) {
    quote.insertAdjacentHTML("afterend", `<div class="v1-revelation-story" aria-label="เส้นทาง 12 เดือน">
      <span><b>01</b> คนเดียว</span><i>→</i><span><b>02</b> ลูกค้า</span><i>→</i><span><b>03</b> ทีม</span><i>→</i><span><b>04</b> Organization</span>
    </div>`);
  }
}
function organizationReportHtml(report) {
  if (!report) return "<p>กด <b>ผ่านไปอีก 1 เดือน</b> แล้วระบบจะรันงานประจำองค์กรให้ครบในครั้งเดียว</p>";
  const xircle = report.activities?.xircle ? '<span class="is-xircle">🏕️ The Xircle ×1</span>' : "";
  const trend = report.tgvDeltaPct == null ? "เดือนแรกของ Year 2" : `${report.tgvDeltaPct > 0 ? "▲" : report.tgvDeltaPct < 0 ? "▼" : "•"} ${Math.abs(report.tgvDeltaPct)}% จากเดือนก่อน`;
  const xircleBonus = report.xircleBonus ? `<section class="v1-xircle-bonus"><div><span>THE XIRCLE</span><strong>RESET · RECONNECT · RISE</strong></div><ul><li>❤️ Retention ${escapeHtml3(report.xircleBonus.retention)}</li><li>👥 Referral ${escapeHtml3(report.xircleBonus.referral)}</li><li>🔄 Member comeback ${signed(report.xircleBonus.comeback)}</li><li>🎓 ${escapeHtml3(report.xircleBonus.certification)}</li></ul></section>` : "";
  const trip = report.trip ? `<section class="v1-travel-reward"><span>✈️ RECOGNITION TRIP ${fmt2(report.trip.number)}</span><strong>${escapeHtml3(report.trip.destination)}</strong><small>${escapeHtml3(report.trip.landmark)}</small></section>` : "";
  return `<div class="v1-org-report">
    <section class="v1-auto-plan"><div><span>เดือนนี้ทีมเดินให้คุณ</span><strong>กิจกรรม → คน → ลูกค้า → XV → TGV → รายได้</strong></div><div class="v1-org-rhythm"><span>🎓 Xcademy ×4</span><span>🏠 Open House ×1</span>${xircle}</div></section>
    <div class="v1-report-headline"><div><span>🏙️ TGV · MONTH ${report.month}</span><strong>${fmt2(report.tgv)} XV</strong><small>${trend}</small></div><div><span>💰 รายได้เดือนนี้</span><strong>${baht2(report.income)}</strong><small>สะสม ${baht2(report.totalIncome)}</small></div></div>
    <section class="v1-flow-section"><h3>ลูกค้า</h3><div class="v1-flow-grid v1-flow-grid--customers"><div><span>คนใหม่</span><b>${fmt2(report.newPeople)}</b></div><div><span>ลูกค้าใหม่</span><b>+${fmt2(report.newCustomers)}</b></div><div><span>ใช้ต่อ</span><b>${fmt2(report.repeatCustomers)}</b></div><div class="is-warning"><span>พัก</span><b>−${fmt2(report.pausedCustomers)}</b></div><div class="is-loss"><span>หยุด</span><b>−${fmt2(report.stoppedCustomers)}</b></div><div class="is-comeback"><span>กลับมา</span><b>+${fmt2(report.comebackCustomers)}</b></div><div class="is-net"><span>สุทธิ</span><b>${signed(report.netCustomers)}</b></div></div></section>
    <section class="v1-flow-section"><h3>ทีมสร้างทีม</h3><div class="v1-flow-grid v1-flow-grid--team"><div><span>X-VISOR ใหม่</span><b>+${fmt2(report.newXvisors)}</b></div><div class="is-warning"><span>ช้าลง</span><b>${fmt2(report.slowedMembers)}</b></div><div class="is-warning"><span>พักงาน</span><b>−${fmt2(report.pausedMembers)}</b></div><div class="is-loss"><span>หยุดทำ</span><b>−${fmt2(report.quitMembers)}</b></div><div class="is-comeback"><span>กลับมา active</span><b>+${fmt2(report.comebackMembers)}</b></div><div class="is-net"><span>ทีมสุทธิ</span><b>${signed(report.netXvisors)}</b></div><div><span>XLEAD ใหม่</span><b>+${fmt2(report.newXleads)}</b></div></div></section>
    ${xircleBonus}${trip}
    <details class="v1-rhythm-details"><summary>ดูที่มาของรายได้เดือนนี้</summary><div class="v1-income-mini"><span>① ลูกค้า <b>${baht2(report.incomeBreakdown?.channel1)}</b></span><span>② Direct G1 <b>${baht2(report.incomeBreakdown?.channel2)}</b></span><span>③ Organization <b>${baht2(report.incomeBreakdown?.channel3)}</b></span></div></details>
  </div>`;
}
function roleLabel(member) {
  if (member.rank === "xlead") return "👑 XLEAD";
  return member.specialtyLabel || { sales: "💰 ขายเก่ง", care: "❤️ ดูแลเก่ง", builder: "🌱 สร้างทีมเก่ง", balanced: "⚖️ สมดุล" }[member.specialty] || "⚖️ สมดุล";
}
function memberStatusLabel(member) {
  return { active: "🟢 Active", slow: "🟡 Slow", paused: "💤 Paused", inactive: "⚪ Inactive" }[member.organizationStatus] || (member.active === false ? "💤 Paused" : "🟢 Active");
}
function twoYearFinaleHtml(state2) {
  const sent = (() => {
    try {
      return localStorage.getItem(`${SCORE_SENT_PREFIX2}${state2.runId}`) || "";
    } catch {
      return "";
    }
  })();
  return `<div class="dialog-kicker">🏁 MONTH 24 · TRUE ENDING</div>
    <h2>2 ปีต่อมา — ระบบเดินได้ไกลกว่าคนเดียว</h2>
    ${finaleDetails(state2)}
    <label class="v9-score-name">ชื่อบน Scoreboard <input type="text" maxlength="28" data-v9-score-name value="${escapeHtml3(sent)}" placeholder="ชื่อเล่น"></label>
    <p class="dialog-note" data-v9-score-status>${sent ? `✅ ส่ง High Score แล้วในชื่อ ${escapeHtml3(sent)}` : "Scoreboard ใช้คะแนน Month 1–12 ที่ล็อกไว้แล้ว · ไม่แก้หรือรีเซ็ต High Score เดิม"}</p>
    <div class="dialog-actions v1-finale-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v1-new-run>↺ เล่นใหม่</button><button class="dialog-button dialog-button--secondary" type="button" data-v1-submit-score>🏆 ส่งชื่อขึ้น Scoreboard</button><button class="dialog-button" type="button" data-v1-new-game-plus>⚡ เล่น NEW GAME+</button></div>
    <button class="dialog-button dialog-button--ghost" type="button" data-v1-close-finale>กลับไปดูฉากจบ</button>`;
}
function organizationDialogHtml(state2) {
  if (state2.runComplete) return twoYearFinaleHtml(state2);
  const report = state2.lastOrganizationReport;
  const agg = state2.organization?.aggregate || {};
  const leaders = (state2.team || []).filter((member) => member.active !== false).sort((a, b) => Number(b.personalXV || 0) - Number(a.personalXV || 0)).slice(0, 8);
  return `<div class="dialog-kicker">🏙️ ORGANIZATION YEAR · MONTH ${state2.month}</div>
    <h2>ระบบที่สร้างไว้กำลังเดินต่อ</h2>
    ${organizationReportHtml(report)}
    <div class="v1-org-grid v1-org-grid--totals">
      <div><span>❤️ Active Customers</span><strong>${fmt2(agg.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR ทั้งองค์กร</span><strong>${fmt2(agg.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt2(agg.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt2(agg.organizationSize ?? agg.xvisorCount)}</strong></div>
    </div>
    <section class="work-section"><h3>คนที่กำลังสร้างผลลัพธ์</h3><div class="income-breakdown">${leaders.map((member) => `<div class="v1-leader"><span><b>${escapeHtml3(member.name)}</b><small>${escapeHtml3(roleLabel(member))} · ${escapeHtml3(memberStatusLabel(member))}</small></span><b>${fmt2(member.personalXV)} XV</b></div>`).join("") || "<p>ยังไม่มีทีม</p>"}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`;
}
function patchOrganizationDialog(state2) {
  const dialog2 = $3("#gameDialog");
  const content2 = $3("#dialogContent");
  if (!dialog2?.open || !content2 || dialog2.dataset.v9Dialog !== "organization") return;
  const key = `${state2.month}:${state2.lastOrganizationReport?.month || 0}:${state2.runComplete ? 1 : 0}`;
  if (dialog2.dataset.v1OrganizationKey === key) return;
  dialog2.dataset.v1OrganizationKey = key;
  setHtml(content2, organizationDialogHtml(state2));
}
function openMonth24Finale(state2) {
  const dialog2 = $3("#gameDialog");
  const content2 = $3("#dialogContent");
  if (!dialog2 || !content2 || !state2?.runComplete) return;
  setHtml(content2, twoYearFinaleHtml(state2));
  dialog2.dataset.kind = "wide";
  dialog2.dataset.v9Dialog = "organization";
  dialog2.dataset.v1OrganizationKey = `${state2.runId}:month24`;
  document.body.style.overflow = "hidden";
  if (!dialog2.open) dialog2.showModal();
  requestAnimationFrame(() => dialog2.querySelector("input, button")?.focus?.());
}
function ensureMonth24Dialog(state2) {
  const dialog2 = $3("#gameDialog");
  if (!state2?.runComplete || dialog2?.open || month24DismissedRun === state2.runId) return;
  openMonth24Finale(state2);
}
function finaleDetails(state2) {
  const summary = state2.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  return `<div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt2(summary.activeCustomers)} ลูกค้า · ${fmt2(summary.xvisorCount)} X-VISOR · ${fmt2(summary.xleadCount)} XLEAD</strong></div></div>
  <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
    <div><span>🏙️ Month 24 TGV</span><strong>${fmt2(summary.month24TGV)} XV</strong></div>
    <div><span>🏆 Best TGV</span><strong>${fmt2(summary.bestTGV)} XV</strong></div>
    <div><span>💎 Best Month Income</span><strong>${baht2(summary.bestMonthIncome)}</strong></div>
    <div><span>💰 รายได้สะสม 24 เดือน</span><strong>${baht2(summary.total24Income ?? summary.totalIncome)}</strong></div>
    <div><span>❤️ Active Customers</span><strong>${fmt2(summary.activeCustomers)}</strong></div>
    <div><span>🌱 X-VISOR</span><strong>${fmt2(summary.xvisorCount)}</strong></div>
    <div><span>👑 XLEAD</span><strong>${fmt2(summary.xleadCount)}</strong></div>
    <div><span>🏙️ Organization Size</span><strong>${fmt2(summary.organizationSize)}</strong></div>
  </div><div class="v1-trip-stamps" aria-label="ทริปที่ได้รับ">${trips.map((trip) => `<span>✈️ ${escapeHtml3(trip.destination)}<small>M${fmt2(trip.month)}</small></span>`).join("") || '<span class="is-empty">ทริปคือรางวัลจากผลงานที่ถึงเงื่อนไข</span>'}</div><blockquote class="v1-ending-quote">คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง</blockquote>`;
}
function patchOrganizationBoard(state2) {
  if (!state2.organizationMode) return;
  const report = state2.lastOrganizationReport;
  const agg = state2.organization?.aggregate || {};
  $3("#monthButton")?.remove();
  setHidden($3("#hudEnergyButton"), true);
  const teamChip = $3("#teamChip");
  setHidden(teamChip, false);
  setText(teamChip, `ทีม ${fmt2(agg.xvisorCount)} X-VISOR · ${fmt2(agg.xleadCount)} XLEAD`);
  setText($3("#hudCustomers"), `${fmt2(agg.activeCustomers)} คน`);
  setText($3("#hudVolumeLabel"), report ? `🏙️ TGV ล่าสุด · M${report.month}` : "🏙️ TGV เดือนนี้");
  setText($3("#hudXV"), `${fmt2(report?.tgv)} XV`);
  setText($3(".status-item--income span"), "รายได้ล่าสุด · สะสม");
  setText($3("#hudIncome"), `${baht2(report?.income)} · Σ${baht2(state2.economy?.totalIncome)}`);
  const people = $3("#peopleButton");
  if (people) {
    setHidden(people, false);
    setHtml(people, `Organization <b>${fmt2(agg.xvisorCount)}</b>`);
  }
  setText($3("#goalEyebrow"), state2.runComplete ? "จบเส้นทาง 24 เดือน" : "YEAR 2 · ORGANIZATION");
  setText($3("#goalTitle"), state2.runComplete ? "🏁 2 ปีผ่านไปแล้ว" : `Organization Year · เดือน ${state2.month}`);
  setText($3("#goalReason"), state2.runComplete ? "ดู Best TGV รายได้ 24 เดือน ขนาดองค์กร และทริปที่ทีมปลดล็อกได้ แล้วเลือกเส้นทางถัดไป" : "ปุ่มเดียวรัน Xcademy ×4, Open House ×1 และ The Xircle ตามรอบ · ลูกค้าและทีมมีทั้งโต พัก หยุด และกลับมา");
  setText($3("#dialogueSpeaker"), state2.runComplete ? "24-MONTH FINALE" : "ORGANIZATION REPORT");
  setText($3("#dialogueText"), state2.runComplete ? "ปีแรกคุณสร้างระบบ ปีที่สองระบบเผชิญทั้งแรงส่งและแรงเสียดทาน — และยังเดินมาถึงเส้นชัย" : report ? `เดือน ${report.month} · ลูกค้าสุทธิ ${signed(report.netCustomers)} · ทีมสุทธิ ${signed(report.netXvisors)} · รายได้ ${baht2(report.income)}` : "จากนี้ Organization จะดูแลลูกค้า สร้าง Candidate และพัฒนาคนต่อโดยไม่รอคุณทำทุกเรื่อง");
  const details = $3("#sceneDetails");
  setHtml(details, state2.runComplete ? finaleDetails(state2) : organizationReportHtml(report));
  setText($3(".action-dock__heading span"), state2.runComplete ? "เล่นให้ดีกว่าเดิม" : "เดินระบบองค์กร");
  setText($3(".action-dock__heading small"), state2.runComplete ? "เริ่มรอบใหม่ทันที" : "หนึ่งปุ่ม · หนึ่งเดือน");
  const actionBar = $3("#actionBar");
  if (!actionBar) return;
  const mode = state2.runComplete ? "complete" : `month-${state2.month}`;
  if (actionBar.dataset.v1Mode === mode && actionBar.querySelector(state2.runComplete ? "[data-v1-open-finale]" : "[data-v1-org-pass]")) return;
  actionBar.dataset.v1Mode = mode;
  setHtml(actionBar, state2.runComplete ? '<button class="action-button action-button--primary" type="button" data-v1-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>Scoreboard · NEW GAME+ · เล่นใหม่</small></span></button>' : '<button class="action-button action-button--primary" type="button" data-v1-org-pass><span class="action-button__icon" aria-hidden="true">▶</span><span class="action-button__copy"><strong>▶ ผ่านไปอีก 1 เดือน</strong><small>Xcademy ×4 · Open House ×1 · The Xircle ตามรอบ · สรุปครั้งเดียว</small></span></button>');
}
function patchNewGamePlusIntro(state2) {
  if (state2.runMode !== "NEW_GAME_PLUS" || state2.month !== 1 || state2.organizationMode) return;
  setText($3("#goalEyebrow"), "⚡ NEW GAME+");
  setText($3("#goalTitle"), "เริ่ม Month 1 ทันที — ทำลายสถิติเดิม");
  setText($3("#goalReason"), "ข้าม PRE-SEASON · Certified X-VISOR แล้ว · เปิด Management เต็มรูปแบบ");
  const previous = state2.previousRunScore;
  if (previous) setHtml($3("#sceneDetails"), `<div class="v1-ng-score"><span>สถิติที่ต้องชนะ</span><strong>Best TGV ${fmt2(previous.bestTgv)} XV</strong><small>รายได้รวม ${baht2(previous.totalIncome)} · Organization ${fmt2(previous.organizationSize)}</small></div><div class="v1-ng-promises"><span>✓ Certified แล้ว</span><span>✓ เริ่ม Month 1</span><span>✓ อิสระเต็มรูปแบบ</span></div>`);
}
function patchReleaseUi() {
  claimVersionLabels();
  const state2 = stateNow2();
  if (!state2) return;
  document.body.dataset.releaseMoment = state2.runComplete ? "month24" : state2.campaignScore?.locked && !state2.organizationMode ? "month12" : state2.runMode === "NEW_GAME_PLUS" && state2.month === 1 ? "new-game-plus" : "play";
  patchScoreFinale(state2);
  if (state2.organizationMode) {
    patchOrganizationBoard(state2);
    patchOrganizationDialog(state2);
    ensureMonth24Dialog(state2);
  } else {
    patchNewGamePlusIntro(state2);
  }
}
async function submitScoreV1() {
  const state2 = stateNow2();
  const score = state2?.campaignScore;
  if (!score?.locked) return;
  const input = $3("[data-v9-score-name]");
  const status = $3("[data-v9-score-status]");
  const displayName = String(input?.value || "").trim().slice(0, 28);
  if (!displayName) {
    setText(status, "ใส่ชื่อเล่นก่อนส่ง High Score");
    input?.focus();
    return;
  }
  setText(status, "กำลังส่ง High Score…");
  try {
    const response = await fetch("/api/xvisor-scores", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        runId: score.runId || state2.runId,
        scoreVersion: V1_SCORE_VERSION,
        runMode: state2.runMode || "FIRST_RUN",
        bestTgv: score.bestTgv,
        totalIncome: score.totalIncome,
        bestMonthlyIncome: score.bestMonthlyIncome,
        organizationSize: score.organizationSize,
        completedAt: score.completedAt
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "SUBMIT_FAILED");
    try {
      localStorage.setItem(`${SCORE_SENT_PREFIX2}${state2.runId}`, displayName);
    } catch {
    }
    setText(status, `✅ ส่ง High Score แล้วในชื่อ ${displayName}`);
    setText($3("[data-v1-submit-score]"), "ส่งชื่ออีกครั้ง");
  } catch {
    setText(status, "บันทึกคะแนนในเครื่องแล้ว แต่ส่ง Scoreboard ไม่สำเร็จ · ลองส่งอีกครั้งได้");
  }
}
document.addEventListener("click", (event) => {
  const submit = event.target.closest("[data-v1-submit-score]");
  if (submit) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScoreV1();
    return;
  }
  const pass = event.target.closest("[data-v1-org-pass]");
  if (pass) {
    event.preventDefault();
    event.stopImmediatePropagation();
    document.body.classList.add("is-month-passing");
    dispatch(EVENTS3.END_MONTH);
    window.setTimeout(() => document.body.classList.remove("is-month-passing"), 720);
    return;
  }
  const openFinale2 = event.target.closest("[data-v1-open-finale]");
  if (openFinale2) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow2();
    if (state2?.runComplete) {
      month24DismissedRun = null;
      openMonth24Finale(state2);
    }
    return;
  }
  const closeFinale = event.target.closest("[data-v1-close-finale]");
  if (closeFinale) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow2();
    month24DismissedRun = state2?.runId || "dismissed";
    const dialog2 = $3("#gameDialog");
    if (dialog2?.open) dialog2.close();
    document.body.style.removeProperty("overflow");
    return;
  }
  const newRun = event.target.closest("[data-v1-new-run]");
  if (newRun) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY3);
    } catch {
    }
    location.reload();
    return;
  }
  const ng = event.target.closest("[data-v1-new-game-plus]");
  if (ng) {
    event.preventDefault();
    event.stopImmediatePropagation();
    document.body.classList.add("is-ng-transition");
    dispatch(EVENTS3.NEW_GAME_PLUS);
    window.setTimeout(() => location.reload(), 520);
  }
}, true);
$3("#gameDialog")?.addEventListener("cancel", () => {
  const state2 = stateNow2();
  if (state2?.runComplete) month24DismissedRun = state2.runId || "dismissed";
}, true);
var observer2 = new MutationObserver(queuePatch2);
observer2.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "data-stage", "open"] });
queuePatch2();

import { EVENTS as EVENTS4, SAVE_KEY as SAVE_KEY4, V1_SCORE_VERSION as V1_SCORE_VERSION2, parseSavedState as parseSavedState4 } from "./game-data.js";
var $4 = (selector, root = document) => root.querySelector(selector);
var fmt3 = (value) => Math.round(Number(value || 0)).toLocaleString("th-TH");
var baht3 = (value) => `฿${fmt3(value)}`;
var esc = (value = "") => String(value).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var SCORE_SENT_PREFIX3 = "mc_xvisor_1b_score_sent:";
var dismissedRun = null;
var queued = false;
function stateNow3() {
  try {
    return parseSavedState4(localStorage.getItem(SAVE_KEY4));
  } catch {
    return null;
  }
}
function scoreName(state2) {
  try {
    return localStorage.getItem(`${SCORE_SENT_PREFIX3}${state2?.runId || ""}`) || "";
  } catch {
    return "";
  }
}
function hardClose2() {
  const dialog2 = $4("#gameDialog");
  if (dialog2?.open) dialog2.close();
  if (dialog2) {
    delete dialog2.dataset.v1bCampaignGate;
    delete dialog2.dataset.v1bFinale;
  }
  document.body.style.removeProperty("overflow");
}
function show(html, kind, key) {
  const dialog2 = $4("#gameDialog");
  const content2 = $4("#dialogContent");
  if (!dialog2 || !content2) return;
  content2.innerHTML = html;
  dialog2.dataset.kind = kind;
  if (key === "campaign") {
    dialog2.dataset.v1bCampaignGate = "1";
    delete dialog2.dataset.v1bFinale;
  } else {
    dialog2.dataset.v1bFinale = key;
    delete dialog2.dataset.v1bCampaignGate;
  }
  document.body.style.overflow = "hidden";
  if (!dialog2.open) dialog2.showModal();
  requestAnimationFrame(() => dialog2.querySelector("input,button")?.focus?.());
}
function campaignScoreDetails(state2) {
  const score = state2.campaignScore || {};
  const path = state2.campaignOutcome?.xgenByMonth12 || score.xgenByMonth12 ? "XGEN" : "XLEAD";
  return `<div class="dialog-kicker">🏆 MONTH 12 · CAMPAIGN COMPLETE · 1.0b</div>
    <h2>12 เดือนแรกจบแล้ว — บันทึกชื่อคุณก่อน</h2>
    <p class="dialog-note">High Score ใช้ผล Month 1–12 เท่านั้น ปีที่ 2 จะไม่แก้คะแนนก้อนนี้</p>
    <div class="v1-finale-grid" aria-label="High Score 12 เดือน">
      <div><span>🏆 Best TGV</span><strong>${fmt3(score.bestTgv)} XV</strong></div>
      <div><span>💰 รายได้รวม 12 เดือน</span><strong>${baht3(score.totalIncome)}</strong></div>
      <div><span>💎 สูงสุด / เดือน</span><strong>${baht3(score.bestMonthlyIncome)}</strong></div>
      <div><span>🏙️ Organization</span><strong>${fmt3(score.organizationSize)} คน</strong></div>
    </div>
    <blockquote class="v1-ending-quote">${path === "XGEN" ? "⭐ คุณผ่าน XGEN ภายใน 12 เดือน — ปีที่ 2 จะเปิด XGEN Path และ Recognition Trip" : "👑 คุณจบปีแรกใน XLEAD Path — ปีที่ 2 จะทำให้เห็นความต่างของระบบที่สร้างไว้"}</blockquote>`;
}
function campaignGateHtml(state2, status = "") {
  const sent = scoreName(state2);
  if (sent) {
    return `${campaignScoreDetails(state2)}
      <div class="v1-score-lock-success"><strong>✅ High Score บันทึกแล้ว</strong><span>ชื่อบนตาราง: ${esc(sent)}</span></div>
      <h3>ทีนี้ดูสิ่งที่คุณสร้างไว้เดินต่อเอง</h3>
      <p class="dialog-note">จาก Month 13 เป็นต้นไป คุณไม่ต้องขายหรือตามรายคนแล้ว กดเดือนละครั้งเพื่อดูระบบเดินต่อจน Month 24</p>
      <div class="dialog-actions v1-finale-actions"><button class="dialog-button" type="button" data-v1b-enter-org>▶ ดูสิ่งที่คุณสร้างโตเอง 1 เดือน</button></div>`;
  }
  return `${campaignScoreDetails(state2)}
    <div class="v1-score-required">
      <strong>ขั้นสุดท้ายของปีแรก</strong>
      <p>ใส่ชื่ออะไรก็ได้เพื่อขึ้น High Score ก่อน แล้วเกมจะเปิด Year 2 ให้ทันที</p>
      <label class="v9-score-name">ชื่อบน High Score <input type="text" maxlength="28" autocomplete="nickname" data-v1b-score-name placeholder="เช่น Teem / Ako / แมวขาว"></label>
      <p class="dialog-note" data-v1b-score-status>${esc(status || "ยังไปต่อไม่ได้จนกว่าจะบันทึกชื่อ High Score")}</p>
      <button class="dialog-button" type="button" data-v1b-submit-score>🏆 บันทึกชื่อขึ้น High Score</button>
    </div>`;
}
function openCampaignGate(state2, status = "") {
  if (!state2?.campaignScore?.locked || state2.organizationMode) return;
  show(campaignGateHtml(state2, status), "wide", "campaign");
}
function finaleDetails2(state2) {
  const summary = state2.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  const path = summary.year2Path || state2.year2Path || "xlead";
  return `<div class="dialog-kicker">🏁 MONTH 24 · TRUE ENDING · 1.0b</div>
    <h2>2 ปีผ่านไปแล้ว — นี่คือสิ่งที่ระบบของคุณสร้าง</h2>
    <div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt3(summary.activeCustomers)} ลูกค้า · ${fmt3(summary.xvisorCount)} X-VISOR · ${fmt3(summary.xleadCount)} XLEAD</strong></div></div>
    <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
      <div><span>🏙️ Month 24 TGV</span><strong>${fmt3(summary.month24TGV)} XV</strong></div>
      <div><span>🏆 Best TGV</span><strong>${fmt3(summary.bestTGV)} XV</strong></div>
      <div><span>💎 Best Month Income</span><strong>${baht3(summary.bestMonthIncome)}</strong></div>
      <div><span>💰 รายได้สะสม 24 เดือน</span><strong>${baht3(summary.total24Income ?? summary.totalIncome)}</strong></div>
      <div><span>❤️ Active Customers</span><strong>${fmt3(summary.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR</span><strong>${fmt3(summary.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt3(summary.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt3(summary.organizationSize)}</strong></div>
    </div>
    <div class="v1-trip-stamps">${path === "xgen" ? trips.map((trip) => `<span>✈️ ${esc(trip.destination)}<small>M${fmt3(trip.month)}</small></span>`).join("") : '<span class="is-empty">XLEAD Path · รอบนี้ยังไม่ผ่าน XGEN ก่อนจบ Month 12 จึงไม่มี Recognition Trip</span>'}</div>
    <blockquote class="v1-ending-quote">${path === "xgen" ? "คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง" : "คุณสร้างทีมได้แล้ว — NEW GAME+ รอบหน้า ลองแตะ 3,000,000 XV ในเดือนเดียวก่อนจบ Month 12"}</blockquote>`;
}
function finaleHtml2(state2) {
  const sent = scoreName(state2);
  return `${finaleDetails2(state2)}
    <div class="v1-score-lock-success"><strong>🏆 High Score ปีแรก</strong><span>${sent ? `บันทึกในชื่อ ${esc(sent)}` : "คะแนน Month 12 ถูกล็อกไว้ในรอบนี้"}</span></div>
    <div class="dialog-actions v1-finale-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v1b-new-run>↺ เล่นใหม่</button><button class="dialog-button" type="button" data-v1b-new-game-plus>⚡ NEW GAME+</button></div>
    <button class="dialog-button dialog-button--ghost" type="button" data-v1b-close-finale>กลับไปดูฉากจบ</button>`;
}
function openFinale(state2) {
  if (!state2?.runComplete) return;
  show(finaleHtml2(state2), "wide", state2.runId || "complete");
}
function patchLegacyScoreButtons() {
  document.querySelectorAll("[data-v1-submit-score],[data-v9-submit-score]").forEach((button) => {
    button.removeAttribute("data-v1-submit-score");
    button.removeAttribute("data-v9-submit-score");
    button.setAttribute("data-v1b-submit-score", "");
  });
}
function patchReceiptCopy() {
  document.querySelectorAll(".receipt-1b__row span").forEach((node) => {
    if (node.textContent === "① จาก XV รายการนี้") node.textContent = "① จาก XV รายการนี้";
  });
  document.querySelectorAll(".receipt-1b small").forEach((node) => {
    node.textContent = node.textContent.replace("① คิดจากยอดขายบาท และปรับย้อนหลังให้ทั้งเดือนเมื่อขึ้น Tier", "① Tier ดูจากยอดขายบาท · รายได้คิดจาก Personal XV · ขึ้น Tier แล้วปรับย้อนหลังทั้งเดือน");
  });
}
function patch() {
  patchLegacyScoreButtons();
  patchReceiptCopy();
  const state2 = stateNow3();
  if (!state2) return;
  if (state2.campaignScore?.locked && !state2.organizationMode) {
    const dialog3 = $4("#gameDialog");
    if (!dialog3?.open || !dialog3.dataset.v1bCampaignGate) openCampaignGate(state2);
    const actionBar2 = $4("#actionBar");
    if (actionBar2) actionBar2.innerHTML = scoreName(state2) ? '<button class="action-button action-button--primary" type="button" data-v1b-enter-org><span class="action-button__icon">▶</span><span class="action-button__copy"><strong>ดูสิ่งที่คุณสร้างโตเอง 1 เดือน</strong><small>Year 2 · กดเดือนละครั้งจน Month 24</small></span></button>' : '<button class="action-button action-button--primary" type="button" data-v1b-open-campaign-gate><span class="action-button__icon">🏆</span><span class="action-button__copy"><strong>ใส่ชื่อ High Score ก่อน</strong><small>บันทึกปีแรก แล้วค่อยเปิด Year 2</small></span></button>';
    return;
  }
  if (!state2.runComplete) return;
  const actionBar = $4("#actionBar");
  if (actionBar && !actionBar.querySelector("[data-v1b-open-finale]")) {
    actionBar.innerHTML = '<button class="action-button action-button--primary" type="button" data-v1b-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>จบจริง · NEW GAME+</small></span></button>';
  }
  const dialog2 = $4("#gameDialog");
  if (dialog2?.open && dialog2.dataset.v1bFinale !== state2.runId) openFinale(state2);
  else if (!dialog2?.open && dismissedRun !== state2.runId) openFinale(state2);
}
async function submitScore2() {
  const state2 = stateNow3();
  const score = state2?.campaignScore;
  if (!score?.locked) return;
  const input = $4("[data-v1b-score-name], [data-v9-score-name]");
  const status = $4("[data-v1b-score-status], [data-v9-score-status]");
  const displayName = String(input?.value || "").trim().slice(0, 28);
  if (!displayName) {
    if (status) status.textContent = "ใส่ชื่ออะไรก็ได้ก่อน แล้วค่อยไป Year 2";
    input?.focus();
    return;
  }
  if (status) status.textContent = "กำลังบันทึก High Score 1.0b…";
  try {
    const response = await fetch("/api/xvisor-scores", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        runId: score.runId || state2.runId,
        scoreVersion: V1_SCORE_VERSION2,
        runMode: state2.runMode || "FIRST_RUN",
        bestTgv: score.bestTgv,
        totalIncome: score.totalIncome,
        bestMonthlyIncome: score.bestMonthlyIncome,
        organizationSize: score.organizationSize,
        completedAt: score.completedAt
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "SUBMIT_FAILED");
    try {
      localStorage.setItem(`${SCORE_SENT_PREFIX3}${state2.runId}`, displayName);
    } catch {
    }
    openCampaignGate(state2, `✅ บันทึก High Score แล้วในชื่อ ${displayName}`);
  } catch {
    if (status) status.textContent = "ส่ง High Score ไม่สำเร็จ · ต้องส่งสำเร็จก่อนจึงจะเปิด Year 2";
  }
}
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-v1b-submit-score],[data-v9-submit-score],[data-v1-submit-score]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore2();
    return;
  }
  if (event.target.closest("[data-v1b-open-campaign-gate]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCampaignGate(stateNow3());
    return;
  }
  if (event.target.closest("[data-v1b-enter-org],[data-v9-enter-org]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow3();
    if (!state2?.campaignScore?.locked) return;
    if (!scoreName(state2)) {
      openCampaignGate(state2, "ใส่ชื่อ High Score ให้สำเร็จก่อน แล้วปุ่ม Year 2 จะเปิด");
      return;
    }
    hardClose2();
    dispatch(EVENTS4.ENTER_ORGANIZATION);
    return;
  }
  if (event.target.closest("[data-v1b-open-finale]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow3();
    if (state2?.runComplete) {
      dismissedRun = null;
      openFinale(state2);
    }
    return;
  }
  if (event.target.closest("[data-v1b-close-finale]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow3();
    dismissedRun = state2?.runId || "dismissed";
    hardClose2();
    return;
  }
  if (event.target.closest("[data-v1b-new-run]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY4);
    } catch {
    }
    location.reload();
    return;
  }
  if (event.target.closest("[data-v1b-new-game-plus]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatch(EVENTS4.NEW_GAME_PLUS);
    window.setTimeout(() => location.reload(), 260);
  }
}, true);
document.addEventListener("cancel", (event) => {
  const state2 = stateNow3();
  if (event.target?.id === "gameDialog" && state2?.campaignScore?.locked && !state2.organizationMode) {
    event.preventDefault();
    openCampaignGate(state2);
  }
}, true);
function queuePatch3() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    patch();
  });
}
new MutationObserver(queuePatch3).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "hidden"] });
addEventListener("pageshow", queuePatch3);
queuePatch3();
