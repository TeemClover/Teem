import {
  SAVE_KEY,
  STAGES,
  EVENTS,
  ROUTINEX,
  calculateEconomy,
  canDispatch,
  makeInitialState,
  parseSavedState,
  reduceGame,
  serializeState,
} from "./game-data.js";
import { getStageContent, TERM_HELP } from "./game-copy.js";
import { createAudio } from "./game-audio.js";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#worldCanvas");
const context = canvas.getContext("2d", { alpha: false });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function loadStoredState() {
  try {
    return parseSavedState(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

let state = loadStoredState() || makeInitialState();
let content = getStageContent(state);
let stageTimer = null;
let activeDialogKey = null;
let lastRenderedStage = null;
let effects = [];
let montageDay = 1;
const audio = createAudio(state.soundOn);

const iconGlyphs = Object.freeze({
  play: "▶",
  box: "▣",
  scale: "◎",
  scan: "⌁",
  check: "✓",
  calendar: "▦",
  book: "▤",
  certificate: "◇",
  flag: "⚑",
  walk: "→",
  talk: "···",
  plan: "↗",
  later: "…",
  heart: "♥",
  message: "□",
  star: "★",
  path: "⇢",
  mentor: "↟",
  meeting: "◫",
  summary: "≡",
  coin: "◉",
  reset: "↺",
});

function formatNumber(value) {
  return Math.round(Number(value || 0)).toLocaleString("th-TH");
}

function formatBaht(value) {
  return `฿${formatNumber(value)}`;
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, serializeState(state));
  } catch {
    // The game remains playable when device storage is unavailable.
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
  const region = $("#toastRegion");
  const item = document.createElement("div");
  item.className = `toast toast--${tone}`;
  item.textContent = message;
  region.appendChild(item);
  requestAnimationFrame(() => item.classList.add("is-visible"));
  window.setTimeout(() => {
    item.classList.remove("is-visible");
    window.setTimeout(() => item.remove(), 220);
  }, reducedMotion.matches ? 900 : 2200);
  announce(message);
}

function playForEvent(event, nextState) {
  if (event === EVENTS.START_SELF_SCAN || event === EVENTS.START_MEASUREMENT || event === EVENTS.START_REMEASUREMENT) {
    audio.play("xircle");
  } else if (event === EVENTS.SELF_SCAN_COMPLETE || event === EVENTS.MEASUREMENT_COMPLETE || event === EVENTS.REMEASUREMENT_COMPLETE) {
    audio.play("xircleDone");
  } else if (event === EVENTS.SELL) {
    audio.play("sale");
  } else if (event === EVENTS.ANSWER_CERTIFICATION && nextState.stage === STAGES.CERTIFIED) {
    audio.play("level");
  } else if (event === EVENTS.START_WEEKLY) {
    audio.play("meeting");
  } else if (event === EVENTS.WEEKLY_COMPLETE) {
    audio.play("meetingDone");
  } else if (event === EVENTS.START_MONTH) {
    audio.play("month");
  } else if (event === EVENTS.SAVE_SUCCESS || event === EVENTS.PREPARE_CANDIDATE) {
    audio.play("level");
  } else if (event === EVENTS.DEFER_OFFER) {
    audio.play("cancel");
  } else {
    audio.play("confirm");
  }
}

function spawnEffect(kind) {
  const count = reducedMotion.matches ? 6 : kind === "coins" ? 18 : 28;
  const colors = kind === "coins"
    ? ["#f8cc55", "#ffeaa2", "#e89f2f"]
    : ["#4fc38b", "#66b9ef", "#f18e7b", "#f8cc55", "#ffffff"];

  for (let index = 0; index < count; index += 1) {
    effects.push({
      x: 190 + (Math.random() - 0.5) * 70,
      y: kind === "coins" ? 128 : 86,
      vx: (Math.random() - 0.5) * (kind === "coins" ? 1.6 : 2.6),
      vy: -1.2 - Math.random() * 2.4,
      life: 55 + Math.random() * 40,
      size: 2 + Math.floor(Math.random() * 3),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function dispatch(event, payload = {}) {
  audio.unlock();
  if (!canDispatch(state, event)) return;

  const previous = state;
  const next = reduceGame(state, event, payload);
  if (next === state) return;

  state = next;
  playForEvent(event, state);

  if (event === EVENTS.ANSWER_CERTIFICATION && state.stage === STAGES.CERTIFICATION) {
    toast("ลองคิดจากสิ่งที่จะช่วยให้ลูกค้ากลับมาทำต่อได้", "hint");
  }
  if (event === EVENTS.DEFER_OFFER) {
    toast("ไม่เป็นไร ความสัมพันธ์ยังอยู่ คุณกลับมาเสนอเมื่อพร้อมได้", "hint");
  }
  if (event === EVENTS.SELL) {
    spawnEffect("coins");
    toast("ขายสำเร็จ +7,000 XV", "success");
  }
  if ([EVENTS.ANSWER_CERTIFICATION, EVENTS.SAVE_SUCCESS, EVENTS.PREPARE_CANDIDATE, EVENTS.WEEKLY_COMPLETE].includes(event)
      && state.stage !== STAGES.CERTIFICATION) {
    spawnEffect("confetti");
  }

  if (previous.stage !== state.stage) activeDialogKey = null;
  save();
  render();
  scheduleAutomaticTransition();
}

function scheduleAutomaticTransition() {
  window.clearTimeout(stageTimer);
  stageTimer = null;
  const delay = reducedMotion.matches ? 120 : 1650;

  const automatic = {
    [STAGES.SELF_SCANNING]: [EVENTS.SELF_SCAN_COMPLETE, delay],
    [STAGES.EXPERIENCE_RUNNING]: [EVENTS.EXPERIENCE_COMPLETE, reducedMotion.matches ? 180 : 2400],
    [STAGES.MEASURING]: [EVENTS.MEASUREMENT_COMPLETE, reducedMotion.matches ? 160 : 2200],
    [STAGES.REMEASURING]: [EVENTS.REMEASUREMENT_COMPLETE, reducedMotion.matches ? 160 : 2100],
    [STAGES.WEEKLY_RUNNING]: [EVENTS.WEEKLY_COMPLETE, reducedMotion.matches ? 180 : 2400],
  };

  const transition = automatic[state.stage];
  if (!transition) return;
  stageTimer = window.setTimeout(() => dispatch(transition[0]), transition[1]);
}

function renderHud() {
  const economy = calculateEconomy(state);
  const isPreseason = state.month === 0;
  $("#hudMonth").textContent = isPreseason ? "ก่อนเริ่ม" : `เดือน ${state.month} / 24`;
  $("#hudTime").textContent = state.timeLeft == null ? "—" : `${state.timeLeft} ช่วง`;
  $("#hudXV").textContent = `${formatNumber(economy.personalXV)} XV`;
  $("#hudIncome").textContent = formatBaht(economy.projectedIncome);
  $("#hudRank").textContent = state.rank === "candidate" ? "CANDIDATE" : state.rank.toUpperCase();
  $("#incomeButton").hidden = !state.milestones.firstSale;

  const timeMeter = $("#timeMeter");
  timeMeter.innerHTML = "";
  if (state.timeLeft != null) {
    for (let index = 0; index < 12; index += 1) {
      const pip = document.createElement("i");
      pip.className = index < state.timeLeft ? "is-on" : "";
      timeMeter.appendChild(pip);
    }
  }

  $("#teamChip").hidden = !state.milestones.firstG1;
  if (state.milestones.firstG1) {
    $("#teamChip").textContent = `ทีม ${state.team.length} X-VISOR`;
  }
}

function renderGoal() {
  $("#goalEyebrow").textContent = content.eyebrow;
  $("#goalTitle").textContent = content.title;
  $("#goalReason").textContent = content.reason;
  $("#goalProgress").style.width = `${content.progress}%`;
  $("#goalCard").dataset.complete = content.progress === 100 ? "true" : "false";
}

function renderDialogue() {
  $("#dialogueSpeaker").textContent = content.speaker || "";
  $("#dialogueText").textContent = content.dialogue || "";

  const details = $("#sceneDetails");
  details.innerHTML = "";

  if (content.resultCards) {
    const grid = document.createElement("div");
    grid.className = "result-grid";
    content.resultCards.forEach(([label, value, tone]) => {
      grid.insertAdjacentHTML("beforeend", `<div class="result-card result-card--${tone}"><span>${label}</span><strong>${value}</strong></div>`);
    });
    details.appendChild(grid);
  }

  if (content.comparison) {
    const grid = document.createElement("div");
    grid.className = "comparison-grid";
    content.comparison.forEach(([label, before, now]) => {
      grid.insertAdjacentHTML("beforeend", `<div class="comparison-row"><span>${label}</span><small>${before}</small><b aria-hidden="true">→</b><strong>${now}</strong></div>`);
    });
    details.appendChild(grid);
  }

  if (content.meetingResults) {
    const list = document.createElement("ul");
    list.className = "meeting-results";
    content.meetingResults.forEach((item) => {
      const row = document.createElement("li");
      row.textContent = item;
      list.appendChild(row);
    });
    details.appendChild(list);
  }

  if (content.future) {
    const future = document.createElement("div");
    future.className = "future-card";
    future.innerHTML = `<span>อีกก้าวหนึ่ง</span><p>${content.future}</p>`;
    details.appendChild(future);
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
  if (item.value) button.dataset.value = item.value;
  if (item.ui) button.dataset.ui = item.ui;
  const outOfTime = item.cost && state.timeLeft != null && item.cost > state.timeLeft;
  button.disabled = Boolean(outOfTime);

  const glyph = iconGlyphs[item.icon] || "→";
  button.innerHTML = `
    <span class="action-button__icon" aria-hidden="true">${glyph}</span>
    <span class="action-button__copy"><strong>${item.label}</strong>${item.detail ? `<small>${item.detail}</small>` : ""}</span>
    ${item.cost ? `<span class="action-button__cost">${item.cost} ช่วง</span>` : ""}
  `;
  return button;
}

function renderActions() {
  const actionBar = $("#actionBar");
  actionBar.innerHTML = "";
  const actions = content.choices || content.actions || [];

  actions.slice(0, 3).forEach((item, index) => {
    actionBar.appendChild(buildActionButton(item, index));
  });

  const primary = actionBar.querySelector(".action-button--primary:not(:disabled)");
  if (primary && !state.tutorialSeen?.[state.stage]) {
    primary.classList.add("is-guided");
  }

  $("#actionDock").dataset.empty = actions.length ? "false" : "true";
  $("#waitingState").hidden = actions.length > 0 || !content.status;
  if (content.status === "scan") $("#waitingState").textContent = "ข้อมูลกำลังขึ้นทีละค่า";
  if (content.status === "montage") $("#waitingState").textContent = `วันที่ ${montageDay} / 28`;
  if (content.status === "meeting") $("#waitingState").textContent = "ทีมกำลังตั้ง Next Action";
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
  document.title = content.title ? `${content.title} · X-VISOR QUEST` : "X-VISOR QUEST";

  if (lastRenderedStage !== state.stage) {
    $("#worldFrame").classList.remove("is-changing");
    void $("#worldFrame").offsetWidth;
    $("#worldFrame").classList.add("is-changing");
    lastRenderedStage = state.stage;
  }

  if (state.stage === STAGES.SALE_RECEIPT && activeDialogKey !== "receipt") {
    queueMicrotask(showReceipt);
  }
}

function showDialog(key, html, options = {}) {
  const dialog = $("#gameDialog");
  activeDialogKey = key;
  $("#dialogContent").innerHTML = html;
  dialog.dataset.kind = options.kind || "normal";
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector("button")?.focus());
}

function closeDialog() {
  const dialog = $("#gameDialog");
  if (dialog.open) dialog.close();
  activeDialogKey = null;
}

function showReceipt() {
  const economy = calculateEconomy(state);
  showDialog("receipt", `
    <div class="dialog-kicker">ขาย RoutineX สำเร็จ</div>
    <h2>ยอดขาย XV และรายได้<br>เป็นคนละตัวเลข</h2>
    <div class="receipt" aria-label="ใบสรุปการขาย">
      <div><span>ยอดสินค้า</span><strong>${formatBaht(ROUTINEX.price)}</strong></div>
      <div><span>XV ที่เพิ่ม</span><strong>+${formatNumber(ROUTINEX.xv)} XV</strong></div>
      <div><span>ขั้นรายได้ของคุณ</span><strong>${economy.tier.label}</strong></div>
      <div><span>รายได้ประมาณที่เพิ่ม</span><strong>+${formatBaht(economy.activeRetail)}</strong></div>
      <div class="receipt__total"><span>รายได้ประมาณเดือนนี้</span><strong>${formatBaht(economy.projectedIncome)}</strong></div>
    </div>
    <p class="dialog-note">ลูกค้าจ่ายค่าสินค้าเป็นเงินบาท ส่วน XV ใช้คำนวณขั้นรายได้ของคุณ</p>
    <button class="dialog-button" type="button" data-dialog-action="receipt-close">เริ่มดูแลต่อ</button>
  `, { kind: "celebrate" });
}

function showIncome() {
  const economy = calculateEconomy(state);
  showDialog("income", `
    <div class="dialog-kicker">รายได้ของคุณเดือนนี้</div>
    <h2>${formatBaht(economy.projectedIncome)}</h2>
    <div class="income-sections">
      <section>
        <div class="income-heading"><span>คุณขายเอง</span><b>${formatBaht(economy.activeRetail)}</b></div>
        <dl>
          <div><dt>ยอดสินค้า</dt><dd>${state.economy.sets} เซต · ${formatBaht(economy.productSales)}</dd></div>
          <div><dt><button class="term-link" type="button" data-term="XV">XV เดือนนี้</button></dt><dd>${formatNumber(economy.personalXV)} XV</dd></div>
          <div><dt>Active Retail</dt><dd>${economy.tier.label}</dd></div>
        </dl>
      </section>
      <section class="income-locked">
        <div class="income-heading"><span>ทีม G1</span><b>ยังไม่เปิด</b></div>
        <p>Direct Mentoring จะเปิดเมื่อคุณเป็น XLEAD และ X-VISOR G1 ที่คุณพัฒนามียอดจากการดูแลลูกค้าจริง</p>
      </section>
      <section class="income-locked">
        <div class="income-heading"><span>Organization</span><b>ยังไม่เปิด</b></div>
        <p>ช่วงนี้ยังไม่ต้องไล่ยอดทีม เป้าหมายใกล้ที่สุดคือช่วยมิ้นท์ดูแลลูกค้าคนแรกให้ได้</p>
      </section>
    </div>
    <div class="income-total"><span>เงินที่รับแล้ว</span><strong>${formatBaht(economy.receivedIncome)}</strong></div>
    <p class="dialog-note">ตัวเลขในเกมเป็นแบบจำลองเพื่อช่วยให้เห็นโครงสร้างรายได้ ไม่ใช่การรับประกันรายได้จริง</p>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับเกม</button>
  `);
}

function showTerm(term) {
  showDialog("term", `
    <div class="dialog-kicker">คำที่ควรรู้</div>
    <h2>${term}</h2>
    <p class="term-definition">${TERM_HELP[term] || "คำนี้จะเปิดเมื่อถึงช่วงที่เกี่ยวข้อง"}</p>
    <button class="dialog-button" type="button" data-dialog-action="close">เข้าใจแล้ว</button>
  `);
}

function showResetConfirmation() {
  showDialog("reset", `
    <div class="dialog-kicker">เริ่มเส้นทางใหม่</div>
    <h2>ลบความคืบหน้ารอบนี้ไหม?</h2>
    <p class="dialog-note">เกมจะกลับไปเริ่มก่อนเป็น X-VISOR และไม่สามารถย้อนกลับมาจุดเดิมได้</p>
    <div class="dialog-actions">
      <button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="close">เล่นต่อ</button>
      <button class="dialog-button dialog-button--danger" type="button" data-dialog-action="reset-confirm">เริ่มใหม่</button>
    </div>
  `);
}

function resetGame() {
  const soundOn = state.soundOn;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Continue with an in-memory reset when device storage is unavailable.
  }
  state = { ...makeInitialState(), soundOn };
  activeDialogKey = null;
  closeDialog();
  save();
  effects = [];
  render();
  scheduleAutomaticTransition();
  toast("เริ่มเส้นทางใหม่แล้ว", "success");
}

function handleActionClick(button) {
  const ui = button.dataset.ui;
  if (ui === "income") return showIncome();
  if (ui === "reset") return showResetConfirmation();
  const event = button.dataset.event;
  if (!event) return;
  const payload = button.dataset.value ? { answer: button.dataset.value } : {};
  state = {
    ...state,
    tutorialSeen: { ...state.tutorialSeen, [state.stage]: true },
  };
  dispatch(event, payload);
}

$("#actionBar").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action-index]");
  if (!button || button.disabled) return;
  handleActionClick(button);
});

$("#incomeButton").addEventListener("click", () => {
  audio.unlock();
  audio.play("tap");
  showIncome();
});

$("#resetButton").addEventListener("click", () => {
  audio.unlock();
  audio.play("tap");
  showResetConfirmation();
});

$("#soundButton").addEventListener("click", () => {
  state = { ...state, soundOn: !state.soundOn, updatedAt: Date.now() };
  audio.setEnabled(state.soundOn);
  save();
  render();
  toast(state.soundOn ? "เปิดเสียงแล้ว" : "ปิดเสียงแล้ว");
});

$("#hudXVButton").addEventListener("click", () => showTerm("XV"));

$("#gameDialog").addEventListener("click", (event) => {
  if (event.target === $("#gameDialog")) return;
  const termButton = event.target.closest("[data-term]");
  if (termButton) return showTerm(termButton.dataset.term);
  const button = event.target.closest("[data-dialog-action]");
  if (!button) return;
  const actionName = button.dataset.dialogAction;
  if (actionName === "receipt-close") {
    closeDialog();
    dispatch(EVENTS.CLOSE_RECEIPT);
  } else if (actionName === "reset-confirm") {
    resetGame();
  } else {
    closeDialog();
  }
});

$("#gameDialog").addEventListener("cancel", (event) => {
  if (activeDialogKey === "receipt") {
    event.preventDefault();
    closeDialog();
    dispatch(EVENTS.CLOSE_RECEIPT);
  } else {
    activeDialogKey = null;
  }
});

function fill(color) {
  context.fillStyle = color;
}

function rect(x, y, width, height, color) {
  fill(color);
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawRoom(theme = "office") {
  const wall = theme === "academy" ? "#dff1ec" : theme === "meeting" ? "#e4edf8" : "#f8efda";
  rect(0, 0, 384, 138, wall);
  rect(0, 138, 384, 78, "#c9a578");
  for (let y = 140; y < 216; y += 16) {
    for (let x = (y / 16) % 2 ? 0 : 16; x < 384; x += 32) {
      rect(x, y, 16, 16, "#d7b486");
    }
  }
  rect(0, 132, 384, 6, "#24445b");
  rect(24, 23, 72, 56, "#24445b");
  rect(29, 28, 62, 46, "#82cbed");
  rect(58, 28, 4, 46, "#f8efda");
  rect(29, 49, 62, 4, "#f8efda");
  rect(36, 56, 14, 18, "#77b45a");
  rect(69, 58, 18, 16, "#5ca052");
  drawPlant(338, 112);
  if (theme === "academy") drawShelf(258, 44);
  if (theme === "meeting") {
    rect(250, 36, 88, 56, "#24445b");
    rect(255, 41, 78, 46, "#f7fbf6");
    rect(268, 52, 48, 4, "#64b98a");
    rect(268, 64, 38, 4, "#66b9ef");
  }
}

function drawPlant(x, y) {
  rect(x - 8, y + 10, 18, 17, "#c87952");
  rect(x - 10, y + 7, 22, 5, "#9b573d");
  rect(x, y - 20, 4, 29, "#477f4a");
  rect(x - 10, y - 18, 12, 7, "#62a95d");
  rect(x + 2, y - 10, 13, 7, "#77bd66");
  rect(x - 13, y - 3, 13, 7, "#4f9854");
}

function drawShelf(x, y) {
  rect(x, y, 72, 72, "#24445b");
  rect(x + 5, y + 5, 62, 62, "#b77d51");
  rect(x + 5, y + 29, 62, 4, "#24445b");
  rect(x + 15, y + 11, 6, 18, "#ef7f72");
  rect(x + 22, y + 8, 7, 21, "#69b8e7");
  rect(x + 31, y + 13, 8, 16, "#f2c553");
  rect(x + 12, y + 39, 8, 24, "#70b77b");
  rect(x + 22, y + 44, 7, 19, "#e2945a");
  rect(x + 32, y + 37, 8, 26, "#8875c9");
}

function drawTable(x, y, width = 92) {
  rect(x, y, width, 10, "#24445b");
  rect(x + 4, y - 5, width - 8, 8, "#d58b58");
  rect(x + 9, y + 10, 7, 33, "#24445b");
  rect(x + width - 16, y + 10, 7, 33, "#24445b");
}

function drawRoundTable(x, y) {
  rect(x + 12, y, 72, 8, "#24445b");
  rect(x + 4, y + 8, 88, 18, "#24445b");
  rect(x + 9, y + 4, 78, 17, "#d58b58");
  rect(x + 44, y + 25, 8, 30, "#24445b");
}

function drawChair(x, y, color = "#5f82a2") {
  rect(x, y, 24, 7, "#24445b");
  rect(x + 3, y + 3, 18, 18, color);
  rect(x + 2, y + 21, 5, 17, "#24445b");
  rect(x + 17, y + 21, 5, 17, "#24445b");
}

function drawScale(x, y, active = false) {
  rect(x, y, 34, 7, "#24445b");
  rect(x + 3, y - 5, 28, 9, active ? "#77d6c2" : "#e4eff0");
  rect(x + 12, y - 2, 10, 2, "#24445b");
  rect(x + 15, y + 7, 4, 12, "#24445b");
  rect(x + 7, y + 17, 20, 4, "#24445b");
}

function drawProduct(x, y) {
  rect(x, y, 26, 34, "#24445b");
  rect(x + 3, y + 3, 20, 28, "#eff8e8");
  rect(x + 3, y + 3, 20, 8, "#67bd83");
  rect(x + 8, y + 15, 10, 3, "#f0bf4d");
  rect(x + 7, y + 21, 12, 2, "#6b8796");
}

function drawCertificate(x, y) {
  rect(x, y, 38, 28, "#24445b");
  rect(x + 3, y + 3, 32, 22, "#fff7d8");
  rect(x + 9, y + 9, 20, 3, "#67bd83");
  rect(x + 13, y + 16, 12, 2, "#e4b947");
}

function drawPhone(x, y, active = false) {
  rect(x, y, 13, 21, "#24445b");
  rect(x + 2, y + 3, 9, 14, active ? "#73d6bd" : "#87badd");
  rect(x + 5, y + 18, 3, 1, "#f8efda");
}

function drawCharacter(x, y, palette, options = {}) {
  const bob = options.bob || 0;
  const direction = options.direction === "left" ? -1 : 1;
  const skin = palette.skin || "#d99a72";
  const hair = palette.hair || "#3f3540";
  const shirt = palette.shirt || "#58b782";
  const accent = palette.accent || "#f2c553";
  x = Math.round(x);
  y = Math.round(y + bob);

  rect(x + 7, y, 18, 4, hair);
  rect(x + 4, y + 4, 24, 16, hair);
  rect(x + 7, y + 6, 18, 17, skin);
  rect(x + (direction === 1 ? 19 : 10), y + 12, 3, 3, "#24445b");
  rect(x + (direction === 1 ? 18 : 9), y + 18, 6, 2, "#a95751");
  rect(x + 5, y + 23, 22, 19, "#24445b");
  rect(x + 8, y + 24, 16, 16, shirt);
  rect(x + 14, y + 25, 4, 12, accent);
  const armOffset = options.pose === "talk" ? -4 : options.pose === "celebrate" ? -10 : 1;
  rect(x + 1, y + 26 + armOffset, 6, 14, skin);
  rect(x + 25, y + 26 + armOffset, 6, 14, skin);
  if (options.pose === "celebrate") {
    rect(x + 1, y + 18, 6, 10, skin);
    rect(x + 25, y + 18, 6, 10, skin);
  }
  const step = options.walk ? Math.round(Math.sin(options.walk) * 2) : 0;
  rect(x + 8, y + 42, 7, 16 + step, "#24445b");
  rect(x + 18, y + 42, 7, 16 - step, "#24445b");
  rect(x + 6, y + 55 + step, 10, 5, "#eff4eb");
  rect(x + 17, y + 55 - step, 10, 5, "#eff4eb");
}

function drawSpeech(x, y, width, accent = "#ffffff") {
  rect(x, y, width, 32, "#24445b");
  rect(x + 3, y + 3, width - 6, 26, accent);
  rect(x + 12, y + 32, 8, 5, "#24445b");
  rect(x + 15, y + 29, 5, 6, accent);
  rect(x + 11, y + 11, width - 22, 3, "#6d8795");
  rect(x + 11, y + 18, Math.max(18, width - 38), 3, "#8ba0a9");
}

function drawDataPanel(x, y, improved = false) {
  rect(x, y, 90, 72, "#24445b");
  rect(x + 4, y + 4, 82, 64, "#f7fbf6");
  const bars = improved ? [54, 63, 70] : [26, 38, 32];
  bars.forEach((width, index) => {
    rect(x + 12, y + 14 + index * 16, 64, 7, "#dce7e5");
    rect(x + 12, y + 14 + index * 16, width, 7, improved ? "#62bd83" : "#e7a65a");
  });
}

function drawScene(time) {
  context.imageSmoothingEnabled = false;
  const t = time / 200;
  const bob = reducedMotion.matches ? 0 : Math.round(Math.sin(t) * 1);
  const player = { skin: "#cb8f69", hair: "#263e4b", shirt: "#4db783", accent: "#f6ce5a" };
  const mint = { skin: "#e0a17a", hair: "#513943", shirt: "#ef8078", accent: "#fff2d4" };
  const blue = { skin: "#b9785d", hair: "#253948", shirt: "#5fa9d7", accent: "#f6ce5a" };
  const yellow = { skin: "#e0ab78", hair: "#6e4d35", shirt: "#e4b94e", accent: "#ffffff" };
  const scene = content.scene;
  const meetingScene = scene?.startsWith("weekly");
  const academyScene = scene?.includes("academy") || scene === "certification" || scene === "candidate";
  drawRoom(meetingScene ? "meeting" : academyScene ? "academy" : "office");

  if (scene === "opening") {
    drawScale(82, 159, false);
    drawTable(245, 153, 84);
    drawProduct(275, 116);
    drawCharacter(174, 111, player, { bob, pose: "celebrate" });
    drawSpeech(132, 46, 120, "#fff8df");
  } else if (["home", "home_product"].includes(scene)) {
    drawTable(210, 153, 96);
    drawChair(237, 121, "#5f82a2");
    if (scene === "home_product") drawProduct(270, 114);
    drawCharacter(148, 112, player, { bob, direction: "right" });
  } else if (["self_measure", "self_scanning", "self_result"].includes(scene)) {
    drawScale(178, 168, scene !== "self_measure");
    drawCharacter(179, 104, player, { bob: 0 });
    drawDataPanel(260, 72, scene === "self_result");
    if (scene === "self_scanning") {
      const scanY = 104 + ((time / 18) % 58);
      rect(165, scanY, 62, 3, "#73e3d2");
    }
  } else if (["routine", "routine_running"].includes(scene)) {
    drawTable(228, 153, 94);
    drawCharacter(120, 112, player, { bob });
    rect(242, 76, 62, 58, "#24445b");
    rect(247, 82, 52, 47, "#fff8df");
    rect(247, 82, 52, 10, "#ef8078");
    const day = scene === "routine_running" ? montageDay : 1;
    const filled = Math.max(1, Math.ceil(day / 4));
    for (let index = 0; index < 7; index += 1) {
      rect(253 + index * 6, 101, 4, 4, index < filled ? "#58b982" : "#cfdcd8");
      rect(253 + index * 6, 110, 4, 4, index < filled - 2 ? "#58b982" : "#cfdcd8");
    }
  } else if (["academy", "academy_lesson", "certification"].includes(scene)) {
    drawTable(128, 153, 130);
    drawCharacter(78, 111, player, { bob, direction: "right" });
    drawCharacter(279, 111, blue, { bob: -bob, direction: "left", pose: "talk" });
    if (scene === "certification") drawCertificate(174, 114);
    else drawProduct(180, 116);
  } else if (scene === "certified") {
    drawCharacter(176, 110, player, { bob, pose: "celebrate" });
    drawCertificate(174, 76);
  } else if (scene === "empty_office") {
    drawTable(145, 153, 98);
    drawChair(114, 121, "#73a9c3");
    drawChair(252, 121, "#d6a275");
    drawCharacter(74, 112, player, { bob, direction: "right" });
  } else if (scene === "mint_arrives") {
    drawTable(136, 153, 105);
    drawCharacter(70, 112, player, { bob, direction: "right" });
    const arrival = reducedMotion.matches ? 270 : 340 - Math.min(70, ((time / 16) % 160));
    drawCharacter(arrival, 112, mint, { bob: -bob, direction: "left", walk: t });
  } else if (["consultation", "offer", "care_start", "followup", "interest"].includes(scene)) {
    drawTable(139, 153, 108);
    drawChair(105, 121, "#73a9c3");
    drawChair(258, 121, "#d6a275");
    drawCharacter(74, 112, player, { bob, direction: "right", pose: scene === "followup" ? "talk" : "idle" });
    drawCharacter(277, 112, mint, { bob: -bob, direction: "left", pose: scene === "interest" ? "talk" : "idle" });
    if (scene === "offer" || scene === "care_start") drawProduct(180, 114);
    if (scene === "interest") drawSpeech(242, 57, 94, "#fff6e4");
  } else if (["customer_measure", "customer_scanning", "customer_result", "remeasured"].includes(scene)) {
    drawCharacter(82, 112, player, { bob, direction: "right" });
    drawScale(232, 168, scene !== "customer_measure");
    drawCharacter(233, 104, mint, { direction: "left" });
    drawDataPanel(282, 72, scene === "remeasured");
    if (scene === "customer_scanning") {
      const scanY = 103 + ((time / 18) % 59);
      rect(218, scanY, 64, 3, "#73e3d2");
    }
    if (scene === "remeasured") {
      rect(326, 52, 4, 18, "#58b982");
      rect(319, 52, 18, 4, "#58b982");
      rect(319, 48, 4, 8, "#58b982");
    }
  } else if (scene === "sale") {
    drawTable(142, 153, 104);
    drawCharacter(72, 112, player, { bob, direction: "right", pose: "celebrate" });
    drawCharacter(278, 112, mint, { bob: -bob, direction: "left", pose: "celebrate" });
    drawProduct(181, 113);
  } else if (scene === "followup_due") {
    drawTable(158, 153, 110);
    drawCharacter(104, 112, player, { bob, direction: "right" });
    drawPhone(204, 119, Math.floor(time / 350) % 2 === 0);
  } else if (scene === "success") {
    drawCharacter(112, 112, player, { bob, pose: "celebrate", direction: "right" });
    drawCharacter(240, 112, mint, { bob: -bob, pose: "celebrate", direction: "left" });
    drawSpeech(146, 54, 94, "#effbe9");
  } else if (scene === "candidate") {
    drawTable(128, 153, 132);
    drawCharacter(78, 111, player, { bob, direction: "right", pose: "talk" });
    drawCharacter(279, 111, mint, { bob: -bob, direction: "left" });
    drawCertificate(176, 114);
  } else if (scene === "first_g1") {
    drawTable(82, 153, 86);
    drawTable(224, 153, 86);
    drawCharacter(106, 108, player, { bob, pose: "celebrate" });
    drawCharacter(248, 108, mint, { bob: -bob, pose: "celebrate" });
    drawCertificate(173, 72);
  } else if (meetingScene) {
    drawRoundTable(144, 135);
    drawCharacter(64, 111, player, { bob, direction: "right", pose: "talk" });
    drawCharacter(274, 111, mint, { bob: -bob, direction: "left" });
    drawCharacter(128, 70, blue, { bob, direction: "right" });
    drawCharacter(220, 70, yellow, { bob: -bob, direction: "left" });
    if (scene === "weekly_done") drawSpeech(145, 49, 94, "#effbe9");
  } else if (scene === "complete") {
    drawTable(77, 153, 88);
    drawTable(221, 153, 88);
    drawCharacter(100, 110, player, { bob, direction: "right" });
    drawCharacter(245, 110, mint, { bob: -bob, direction: "left" });
    rect(173, 86, 38, 38, "#24445b");
    rect(177, 90, 30, 30, "#effbe9");
    rect(188, 94, 8, 22, "#58b982");
    rect(181, 101, 22, 8, "#58b982");
  }

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

function updateMontage() {
  if (state.stage !== STAGES.EXPERIENCE_RUNNING) return;
  montageDay = montageDay >= 28 ? 28 : montageDay + 1;
  $("#waitingState").textContent = `วันที่ ${montageDay} / 28`;
  window.setTimeout(updateMontage, reducedMotion.matches ? 25 : 72);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleAutomaticTransition();
});

reducedMotion.addEventListener?.("change", () => scheduleAutomaticTransition());

render();
scheduleAutomaticTransition();
requestAnimationFrame(drawScene);
if (state.stage === STAGES.EXPERIENCE_RUNNING) updateMontage();

const originalDispatch = dispatch;
window.addEventListener("xvisor:montage", updateMontage);

// Keep the day counter moving when the 28-day montage is entered after initial load.
$("#actionBar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-event]");
  if (button?.dataset.event === EVENTS.START_EXPERIENCE) {
    montageDay = 1;
    window.setTimeout(updateMontage, 80);
  }
});

export { originalDispatch as dispatchForDebug };
