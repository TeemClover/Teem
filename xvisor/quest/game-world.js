import { STAGES } from "./game-data.js";
import { createSceneArt } from "./game-art.js";
import { getOrganizationScene } from "./game-presentation.js";

/** Purely visual: never writes saves, awards XP or changes the simulation. */
export function createWorldRenderer(canvas, getSnapshot) {
  const $ = (selector) => document.querySelector(selector);
  canvas.width = 768;
  canvas.height = 432;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return { invalidate() {}, spawnEffect() {} };
  context.scale(2, 2);
  const art = createSceneArt(context);
  const backgrounds = new Map();
  function background(key, paint) {
    if (!backgrounds.has(key)) {
      const layer = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(768, 432) : document.createElement("canvas");
      layer.width = 768; layer.height = 432;
      const brush = layer.getContext("2d", { alpha: false });
      brush.scale(2, 2);
      paint(createSceneArt(brush));
      if (backgrounds.size >= 8) backgrounds.delete(backgrounds.keys().next().value);
      backgrounds.set(key, layer);
    }
    context.drawImage(backgrounds.get(key), 0, 0, 384, 216);
  }
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const playerPalette = { skin: "#e0aa80", hair: "#1f3541", shirt: "#4db783", accent: "#f6ce5a" };
  const proctorPalette = { skin: "#c98f6c", hair: "#203541", shirt: "#5f8fd3", accent: "#f6ce5a" };
  const productVisuals = Object.freeze({gus:["#65bd86","#2f7359"],"protein-hmb":["#ee9a5c","#b85f43"],"vita-matrix":["#68aee1","#356f9a"],astamega:["#8e78c8","#5c4d91"]});
  const formatNumber = (value) => Math.round(Number(value || 0)).toLocaleString("th-TH");
  const formatBaht = (value) => `฿${formatNumber(value)}`;
  let state, content, montageVisualDay, stageStartedAt, person;
  let effects = [];
  let frameId = 0;
  let previousFrame = 0;
  let visualTime = 0;
  function selectedPerson() { return person; }
  function snapshot() { ({state, content, montageVisualDay, stageStartedAt, person} = getSnapshot()); }
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
function organizationVisualMode(stageAge) { return getOrganizationScene(state, stageAge); }
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
function fill(color) {
  context.fillStyle = color;
}
function rect(x, y, width, height, color) {
  fill(color);
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}
function drawRoom(theme = "office") { background(`room:${theme}`, layer => layer.room(theme)); }
function drawTable(x, y, width = 92) {
  art.shadow(x + width / 2, y + 39, width / 2, 5);
  rect(x, y, width, 9, "#24445b");
  rect(x + 4, y - 5, width - 8, 7, "#cba172");
  rect(x + 5, y - 5, width - 10, 2, "#e9c798");
  rect(x + 10, y - 1, width - 25, 1, "#b58a62");
  rect(x + 9, y + 9, 7, 31, "#24445b");
  rect(x + width - 16, y + 9, 7, 31, "#24445b");
}
function drawChair(x, y, color = "#5f82a2") {
  art.shadow(x + 12, y + 39, 16, 3);
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
  rect(x + 2, y, 7, 3, "#28474b");
  rect(x + 4, y - 1, 3, 5, active ? "#83e0c1" : "#7ac1c7");
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
  drawCertificate(117, 49);
  if (phase >= 3) {
    rect(181, 51, 53, 31, "#4a6a5d");
    rect(184, 54, 47, 25, "#efdfb4");
    ["#bc8563", "#71947f", "#7199a7"].forEach((color, i) => rect(190 + i * 12, 68 - i * 4, 7, 7 + i * 4, color));
  }
  if (phase >= 5 && !scene.includes("management")) {
    rect(282, 105, 49, 30, "#617c66");
    rect(280, 103, 53, 3, "#e0ca9d");
    rect(305, 108, 1, 24, "#456352");
    rect(299, 114, 2, 2, "#dfc897"); rect(311, 114, 2, 2, "#dfc897");
  }
  if (phase >= 6) rect(0, 132, 384, 2, "#d9b86f");
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
  background("camp", layer => layer.camp());
  drawXircleMark(184, 102, .8);
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
  background(`organization:${phase}`, layer => layer.organization(phase));
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
  background(`travel:${destination}`, layer => layer.travel(destination));
  const wave = !reducedMotion.matches && Math.floor(time / 420) % 2 ? "celebrate" : "idle";
  drawCharacterAtFeet(35, 202, playerPalette, { pose: wave, band: true, direction: "right" });
  const companions = (state.team || []).filter((member) => member.active !== false).slice(0, 3);
  (companions.length ? companions : [{ appearance: npc }, { appearance: proctorPalette }]).forEach((member, index) => drawCharacterAtFeet(282 + index * 34, 202, member.appearance || npc, { pose: index === 0 ? wave : "idle", band: true, direction: "left" }));
}
function drawMonth12Scene(npc) {
  background("month12", layer => layer.organization(9));
  drawXircleMark(182, 68, 1.4);
  drawCharacterAtFeet(27, 196, playerPalette, { pose: "celebrate", band: true, direction: "right" });
  const members = (state.team || []).slice(0, 7);
  const positions = [82, 124, 166, 222, 264, 306, 344];
  (members.length ? members : [{ appearance: npc, specialty: "balanced" }]).forEach((member, index) => drawTeamCharacter(member, positions[index], 196, { direction: index < 3 ? "right" : "left", pose: index % 3 === 0 ? "celebrate" : "idle" }));
}
function drawFinaleScene(npc) {
  background("finale", layer => layer.finale());
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
  const breath = options.idle && !reducedMotion.matches ? Math.floor(visualTime / 800) % 2 : 0;
  const direction = options.direction === "left" ? -1 : 1;
  const eyeX = direction === 1 ? 19 : 10;
  art.shadow(x + 16, footY + 1, 15 - Math.min(4, jump / 3), 3);
  rect(x + 7, top + breath, 18, 4, palette.hair);
  rect(x + 4, top + 4 + breath, 24, 16, palette.hair);
  rect(x + 7, top + 6 + breath, 18, 17, palette.skin);
  rect(x + 7, top + 6 + breath, 4, 14, "#a5634326");
  rect(x + 11, top + 3 + breath, 15, 5, palette.hair);
  rect(x + 6, top + 6 + breath, 4, 7, palette.hair);
  rect(x + eyeX, top + 12 + breath, 3, 3, "#24445b");
  rect(x + (direction === 1 ? 18 : 9), top + 18 + breath, 6, 2, "#a95751");
  rect(x + 5, top + 23, 22, 19, "#24445b");
  rect(x + 8, top + 24, 16, 16, palette.shirt);
  rect(x + 8, top + 24, 3, 15, "#ffffff25");
  rect(x + 21, top + 25, 3, 15, "#173c442a");
  rect(x + 12, top + 24, 8, 3, "#eef0d4");
  rect(x + 15, top + 27, 2, 8, palette.accent);
  rect(x + 19, top + 31, 3, 3, palette.accent);
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
  snapshot();
  visualTime = time;
  context.imageSmoothingEnabled = false;
  const scene = content.scene || "opening";
  const exam = scene.startsWith("exam") || scene === "ceremony";
  const management = scene.startsWith("management") || ["team_started", "month_closed", "season_review", "content_running", "ads_running", "xcademy_running", "open_house_running", "center_running", "goodluck_running", "the-xircle", "xlead", "xgen"].includes(scene);

  const person = selectedPerson();
  const npc = person?.appearance || { skin: "#dfaa83", hair: "#263844", shirt: "#ef8078", accent: "#fff2d4" };
  const idle = { idle: true, band: state.preseason.day > 0 || state.month >= 1, bandActive: scene === "pre_montage" };
  const stageAge = time - stageStartedAt;
  const organizationMode = state.organizationMode ? organizationVisualMode(stageAge) : null;
  if (!organizationMode && !["the-xircle", "management_org", "season_review"].includes(scene)) {
    drawRoom(exam ? "exam" : management ? "management" : state.month === 0 ? "pre" : "office");
    if (!exam) drawOfficeGrowth(scene);
  }
  const sceneDescription = organizationMode?.kind === "travel" ? `ทีมรับรางวัลท่องเที่ยวที่ ${organizationMode.report.trip.destination}` : scene === "the-xircle" || organizationMode?.kind === "xircle" ? "ทีมร่วมแคมป์ The Xircle ใต้แสงดาว" : exam ? "ห้องสอบ Xcademy" : "ฉากสำนักงานและทีม X-VISOR";
  if (canvas.getAttribute("aria-label") !== sceneDescription) canvas.setAttribute("aria-label", sceneDescription);
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
  const dt = Math.min(3, (time - previousFrame) / (1000 / 60)) || 1;
  effects = effects.filter((particle) => particle.life > 0);
  effects.forEach((particle) => {
    rect(particle.x, particle.y, particle.size, particle.size, particle.color);
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 0.06 * dt;
    particle.life -= dt;
  });
}

  function frame(time) {
    frameId = 0;
    if (document.hidden) return;
    if (time - previousFrame >= (reducedMotion.matches ? 200 : 1000 / 30)) {
      drawScene(time);
      previousFrame = time;
    }
    if (!reducedMotion.matches || effects.length || time - stageStartedAt < 3300) frameId = requestAnimationFrame(frame);
  }
  function invalidate() {
    if (document.hidden) return;
    previousFrame = 0;
    if (!frameId) frameId = requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; }
    else invalidate();
  });
  reducedMotion.addEventListener("change", invalidate);
  snapshot();
  return { invalidate, spawnEffect };
}
