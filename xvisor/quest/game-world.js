import { STAGES } from "./game-data.js";
import { createSceneArt } from "./game-art.js";
import { getOrganizationScene } from "./game-presentation.js";
import { ACTION_SCENE_MAP, getActionMoment } from "./game-action-scenes.js";
import { getPersonAppearance } from "./game-people.js";

const rosterPersonKey = person => String(person?.personId || person?.id || "");
const rosterHash = value => {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
};
/** Visual styling groups only: never infer a person's gender from their name. */
export function getSceneRosterStyle(person) {
  const appearance = getPersonAppearance(person);
  return appearance.clothing === "dress" || ["long", "wavy", "half-up", "ponytail", "bob", "bun"].includes(appearance.hairStyle) ? "flowing" : "cropped";
}
/** Rotate existing people using saved gameplay progress, never render time.
 * Returned records and their appearances remain untouched. A selected person
 * stays in the cast; other places balance silhouettes and fresh faces. */
export function selectSceneRoster(state, { pool = state.team || [], limit = 5, scene = "management", targetId = state.selectedPersonId, excludeIds = [] } = {}) {
  const count = Math.max(0, Math.floor(Number(limit) || 0));
  if (!count) return [];
  const excluded = new Set(excludeIds.filter(Boolean).map(String));
  const targetKeys = new Set(targetId == null ? [] : [String(targetId)]);
  for (const person of [...state.customers || [], ...state.prospects || [], ...state.team || [], ...pool]) {
    if (targetKeys.has(String(person.id))) targetKeys.add(rosterPersonKey(person));
    if (excluded.has(String(person.id))) excluded.add(rosterPersonKey(person));
  }
  const unique = new Map();
  for (const person of pool) {
    const id = rosterPersonKey(person);
    if (!id || person.active === false || ["teem", "ako"].includes(person.appearance?.characterId) || excluded.has(id) || excluded.has(String(person.id))) continue;
    const previous = unique.get(id);
    if (!previous || person.id === targetId) unique.set(id, person);
  }
  const salt = `${state.runId || state.rngSeed || 0}:${Number(state.month) || 0}:${scene}`;
  const ordered = [...unique.values()].sort((a, b) => rosterHash(`${salt}:${rosterPersonKey(a)}`) - rosterHash(`${salt}:${rosterPersonKey(b)}`) || (rosterPersonKey(a) < rosterPersonKey(b) ? -1 : 1));
  if (!ordered.length) return [];
  const actions = Math.max(0, Number(state.monthStats?.playerActions?.total) || 0);
  const logged = (state.eventLog || []).filter(entry => Number(entry.month) === Number(state.month) && ["vignette", "primary"].includes(ACTION_SCENE_MAP[entry.event]?.presentation)).length;
  const target = ordered.find(person => targetKeys.has(String(person.id)) || targetKeys.has(rosterPersonKey(person)));
  const rotating = ordered.filter(person => person !== target);
  const offset = rotating.length ? (Math.max(actions, logged) + Math.max(0, Number(state.month) || 0)) % rotating.length : 0;
  const remaining = [...rotating.slice(offset), ...rotating.slice(0, offset)];
  const selected = target ? [target] : [];
  // Reserve one rotating guest before balancing the rest. Otherwise a person
  // who resembles the selected target could lose every diversity tie forever.
  if (selected.length < count && remaining.length) selected.push(remaining.shift());
  const appearance = new Map(ordered.map(person => [person, getPersonAppearance(person)]));
  while (selected.length < count && remaining.length) {
    const styles = selected.map(getSceneRosterStyle);
    const heads = new Set(selected.map(person => appearance.get(person).hairStyle));
    const clothes = new Set(selected.map(person => appearance.get(person).clothing));
    const glasses = new Set(selected.map(person => appearance.get(person).glasses));
    const score = person => {
      const look = appearance.get(person);
      return -styles.filter(style => style === getSceneRosterStyle(person)).length * 100
        + Number(!heads.has(look.hairStyle)) * 20 + Number(!clothes.has(look.clothing)) * 5 + Number(!glasses.has(look.glasses)) * 2;
    };
    let best = 0;
    for (let index = 1; index < remaining.length; index++) if (score(remaining[index]) > score(remaining[best])) best = index;
    selected.push(...remaining.splice(best, 1));
  }
  return selected;
}

/** Purely visual: never writes saves, awards XP or changes the simulation. */
export function createWorldRenderer(canvas, getSnapshot) {
  const $ = (selector) => document.querySelector(selector);
  const renderScale = 4;
  canvas.width = 384 * renderScale;
  canvas.height = 216 * renderScale;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return { invalidate() {}, spawnEffect() {}, playAction() {}, destroy() {} };
  context.scale(renderScale, renderScale);
  const art = createSceneArt(context);
  const backgrounds = new Map();
  function background(key, paint) {
    if (!backgrounds.has(key)) {
      const layer = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(canvas.width, canvas.height) : document.createElement("canvas");
      layer.width = canvas.width; layer.height = canvas.height;
      const brush = layer.getContext("2d", { alpha: false });
      if (!brush) { paint(art); return; }
      brush.scale(renderScale, renderScale);
      paint(createSceneArt(brush));
      if (backgrounds.size >= 8) backgrounds.delete(backgrounds.keys().next().value);
      backgrounds.set(key, layer);
    }
    context.drawImage(backgrounds.get(key), 0, 0, 384, 216);
  }
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const playerPalette = { skin: "#e0aa80", hair: "#1f3541", shirt: "#4db783", accent: "#f6ce5a" };
  const proctorPalette = { skin: "#c98f6c", hair: "#203541", shirt: "#5f8fd3", accent: "#f6ce5a", hairStyle: "short", clothing: "shirt", glasses: "round" };
  const productVisuals = Object.freeze({gus:["#65bd86","#2f7359"],"protein-hmb":["#ee9a5c","#b85f43"],"vita-matrix":["#68aee1","#356f9a"],astamega:["#8e78c8","#5c4d91"]});
  const formatNumber = (value) => Math.round(Number(value || 0)).toLocaleString("th-TH");
  const formatBaht = (value) => `฿${formatNumber(value)}`;
  let state, content, montageVisualDay, stageStartedAt, person;
  let effects = [];
  let frameId = 0;
  let previousFrame = 0;
  let visualTime = 0;
  let destroyed = false;
  let actionMoment = null;
  let rosterIds = [];
  function selectedPerson() { return person; }
  function sceneRoster(options) {
    const cast = selectSceneRoster(state, options);
    rosterIds.push(...cast.map(member => member.id || member.personId));
    return cast;
  }
  function personAppearance(subject) {
    // Vignettes carry a compact copy. Resolve the full record so a promoted
    // teammate retains the same personId and portrait as their customer days.
    const actual = subject?.id && [...state.customers || [], ...state.prospects || [], ...state.team || []].find(item => item.id === subject.id);
    return getPersonAppearance(actual || subject);
  }
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
  if (scene === "live-studio") return "LIVE STUDIO · CUSTOMER CONVERSATIONS";
  if (state.campaignScore?.locked) return "MONTH 12 · REVELATION";
  if (state.rank === "xgen") return "XGEN ORGANIZATION";
  if (month >= 1) {
    const places = ["PRE-SEASON ROOM", "HUMBLE START", "FIRST CUSTOMERS", "CUSTOMER CARE", "TEAM STUDIO", "GROWTH HUB", "LIVING OPERATION"];
    return `MONTH ${month} · ${places[Math.min(6, worldGrowthPhase())]}`;
  }
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
    "live-studio": { kicker: "LIVE STUDIO", title: "LIVE คุยแฟ้ม X", detail: `กำลังพูดคุยกับ ${state.pendingLive?.targetIds?.length || 0} คนที่พร้อมฟัง · รอดูผลหลังจบ Live`, tone: "academy" },
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
function renderWorldEventCard(scene, stageAge, organizationMode, moment = null) {
  const card = moment ? { kicker: moment.person?.name || "ลงมือทำ", title: moment.title, detail: moment.detail, tone: moment.outcome === "paused" ? "action-paused" : "action" } : eventCardForScene(scene, stageAge, organizationMode);
  const root = $("#worldEventCard");
  if (moment) root.dataset.actionEvent = moment.event;
  else delete root.dataset.actionEvent;
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
function playAction(previous, next, event, payload = {}) {
  if (destroyed) return null;
  const moment = getActionMoment(previous, next, event, payload);
  if (document.hidden) { actionMoment = null; return null; }
  if (moment.presentation === "vignette") {
    // A newer action replaces this visual immediately. There is no queue or
    // gameplay lock, and this descriptor is never included in the save.
    actionMoment = { ...moment, startedAt: performance.now(), runId: next.runId, stage: next.stage };
  } else if (["primary", "automatic"].includes(moment.presentation) || actionMoment && actionMoment.stage !== next.stage) {
    actionMoment = null;
  }
  invalidate();
  return moment;
}
function spawnEffect(kind) {
  if (destroyed || reducedMotion.matches || document.hidden) return;
  const count = kind === "coins" ? 18 : 30;
  effects = effects.slice(-60);
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
  invalidate();
}
function fill(color) {
  context.fillStyle = color;
}
function rect(x, y, width, height, color) {
  art.rounded(x, y, width, height, Math.min(1.8, Math.abs(width) * .15, Math.abs(height) * .15), color);
}
function drawRoom(theme = "office") {
  background(`room:${theme}`, layer => layer.room(theme));
}
function drawTable(x, y, width = 92) {
  art.shadow(x+width/2,y+37,width*.64,7);
  art.line(x+13,y+3,x+9,y+38,"#675c43",4.8);
  art.line(x+width-13,y+3,x+width-9,y+38,"#675c43",4.8);
  art.line(x+12,y+5,x+8,y+36,"#b29769",1.2);
  art.line(x+width-14,y+5,x+width-10,y+36,"#b29769",1.2);
  art.rounded(x,y-3,width,10,3,"#aa8156","#765b3e",.6);
  art.rounded(x-2,y-7,width+4,9,3,"#d2ad77","#806a47",.8);
  art.line(x+8,y-4,x+width-9,y-4,"#f8e4ba",.8);
  for(let i=0;i<5;i++){const xx=x+7+i*(width-17)/5;art.line(xx,y-1+i%2,xx+10,y-1+i%2,"#986d422f",.6);}
  art.line(x+4,y+4,x+width-4,y+4,"#7757383a",.7);
}
function drawChair(x,y,color="#779e9a") {
  art.shadow(x+12,y+39,19,4);
  art.line(x+5,y+20,x+3,y+38,"#6f7964",2.3);art.line(x+21,y+20,x+23,y+38,"#6f7964",2.3);
  art.rounded(x,y-2,25,24,7,color,"#456e5f",.8);
  art.rounded(x+3,y+1,19,15,5,"#ffffff19");
  art.rounded(x-2,y+19,29,7,3,color,"#456e5f",.8);
}
function drawScale(x,footY,active=false) {
  art.shadow(x+17,footY+1,23,4);
  if(active)art.glow(x+17,footY-9,23,"#77ddc343");
  art.rounded(x,footY-11,35,11,4,"#6e9388");
  art.rounded(x,footY-14,35,11,4,active?"#bfecda":"#edf2e3","#668f81",.8);
  art.rounded(x+11,footY-12,13,5,1.5,"#315c55");
  art.line(x+14,footY-10,x+20,footY-10,"#b8edcc",.9);
  for(const xx of [x+5,x+27])art.rounded(xx,footY-8,3,3,1,"#b6c7b8");
}
function drawProduct(x,y,id="gus") {
  const [color,accent]=productVisuals[id]||["#67bd83","#2f7359"];
  art.shadow(x+10,y+31,14,2.5);
  art.rounded(x+1,y+1,20,30,3,"#f8f3df","#72967c",.7);
  art.rounded(x,y,22,5,2,color);
  art.rounded(x+3,y+9,16,15,2,color);
  art.ellipse(x+11,y+15,4,4,"#fff9df");
  art.line(x+9,y+16,x+12,y+12,accent,1.2);
  art.line(x+6,y+21,x+16,y+21,"#fff8df",.8);
  art.line(x+6,y+27,x+16,y+27,"#8b9c7e",.8);
  art.line(x+4,y+5,x+4,y+25,"#ffffff80",.8);
}
function drawCertificate(x,y) {
  art.rounded(x,y,40,29,2,"#a98b60","#6e775b",.7);
  art.rounded(x+3,y+3,34,23,1,"#fff9df");
  art.line(x+9,y+10,x+31,y+10,"#8aa17b",1.3);
  art.line(x+11,y+14,x+29,y+14,"#b8b491",.7);
  art.line(x+11,y+17,x+24,y+17,"#b8b491",.7);
  art.ellipse(x+28,y+22,3,3,"#d9b765");
}
function drawDataPanel(x,y,improved=false) {
  art.rounded(x+1,y+2,90,70,5,"#456e652e");
  art.rounded(x,y,90,70,5,"#6c8f82");
  art.rounded(x+3,y+3,84,64,3,"#f7f8e9");
  art.rounded(x+10,y+10,27,4,1,"#9fb69c");
  [26,improved?60:38,improved?66:32].forEach((width,index)=>{
    art.rounded(x+11,y+23+index*12,67,5,2,"#e0e8d9");
    art.rounded(x+11,y+23+index*12,width,5,2,improved?"#6faf8a":"#d6b175");
  });
}
function drawClock(x,y) {
  art.ellipse(x+17,y+17,17,17,"#6b8a76");art.ellipse(x+17,y+17,14.5,14.5,"#fff4d8");
  for(let i=0;i<12;i++){const a=i*Math.PI/6;art.line(x+17+Math.sin(a)*11,y+17-Math.cos(a)*11,x+17+Math.sin(a)*12.5,y+17-Math.cos(a)*12.5,"#9eaa89",.7);}
  art.line(x+17,y+17,x+17,y+8,"#496b5d",1.7);art.line(x+17,y+17,x+24,y+20,"#496b5d",1.7);
  art.ellipse(x+17,y+17,1.5,1.5,"#d4b06e");
}
function drawDoor(x,open=false) {
  art.rounded(x,45,48,94,5,"#496b5d");art.rounded(x+4,49,40,89,3,"#d4d8ba");
  art.rounded(x+7,52,open?12:34,86,2,open?"#557369":"#90a898");
  if(!open){art.rounded(x+12,59,24,30,2,"#d5e2ca");art.line(x+29,100,x+35,100,"#eee0b0",2);}
}
function drawRoundTable(x,y) {
  art.shadow(x+48,y+51,55,7);
  art.rounded(x+43,y+15,10,31,3,"#648074");
  art.ellipse(x+48,y+47,23,5,"#729083");
  art.ellipse(x+48,y+15,48,16,"#a67f5c");
  art.ellipse(x+48,y+10,48,16,"#dfbf91");
  art.ellipse(x+48,y+8,44,12,"#e9d0a8");
  art.line(x+26,y+7,x+66,y+7,"#f9e6be6b",.7);
}
function drawLaptop(x,y,active=false) {
  art.rounded(x,y,43,28,3,"#4c756c");
  art.rounded(x+3,y+3,37,22,1.5,active?"#bedcce":"#d9e5d4");
  art.ellipse(x+21,y+1.5,.6,.6,"#c4d3bb");
  art.rounded(x+6,y+6,30,3,1,"#ffffff70");
  if(active) {
    art.rounded(x+7,y+12,9,10,1.5,"#74aa92");
    art.line(x+20,y+13,x+33,y+13,"#507e6e",1.5);art.line(x+20,y+18,x+30,y+18,"#83a893",1.2);
  }
  art.polygon([[x,y+27],[x+43,y+27],[x+48,y+32],[x-5,y+32]],"#87a599");
  art.rounded(x-5,y+31,53,2,1,"#5c7e71");
  art.rounded(x+16,y+28,12,2,1,"#b6cab4");
}
function drawNotification(x,y,color="#e7c482") {
  art.rounded(x+1,y+2,30,19,3,"#355b4730");
  art.rounded(x,y,30,19,3,"#fff8e6","#94b196",.7);
  art.ellipse(x+8,y+9,4,4,color);
  art.line(x+15,y+7,x+25,y+7,"#709582",1.2);art.line(x+15,y+11,x+22,y+11,"#acbca0",1);
}
function drawWhiteboard(x,y) {
  art.rounded(x,y,106,65,5,"#6a8979");art.rounded(x+3,y+3,100,59,3,"#fff9e7");
  art.rounded(x+11,y+12,35,4,1,"#79a68a");
  for(let i=0;i<3;i++){art.ellipse(x+15,y+27+i*11,2,2,["#d4b471","#96b2a1","#cca292"][i]);art.line(x+24,y+27+i*11,x+72-i*10,y+27+i*11,"#a2b598",1.3);}
  art.line(x+75,y+48,x+83,y+35,"#94b58e",1.7);art.line(x+83,y+35,x+92,y+40,"#94b58e",1.7);
  art.rounded(x+11,y+61,84,4,1,"#aeb79b");
}
function worldGrowthPhase() {
  const month=Number(state.month||0);
  if(state.organizationMode)return month>=21?9:month>=17?8:7;
  if(!month)return 0;
  const customers=(state.customers||[]).filter(customer=>customer.activePlan!==false);
  const regular=customers.filter(customer=>customer.selfDirected||customer.successCase||customer.lastReorderMonth);
  const team=(state.team||[]).filter(member=>member.active!==false);
  if(team.length>=5||customers.length>=15)return 6;
  if(team.length>=3||customers.length>=8)return 5;
  if(team.length)return 4;
  if(regular.length||customers.length>=3)return 3;
  return customers.length?2:1;
}
function drawOfficeGrowth(scene) {
  const phase=worldGrowthPhase();
  if(!phase||["the-xircle","management_org","season_review","open_house_running","goodluck_running","xcademy_running","center_running"].includes(scene))return;
  drawCertificate(119,48);
  const customers=(state.customers||[]).filter(customer=>customer.activePlan!==false);
  const regular=customers.filter(customer=>customer.selfDirected||customer.successCase||customer.lastReorderMonth);
  if(customers.length) {
    art.rounded(178,42,61,42,4,"#c9b58e");art.rounded(181,45,55,36,2,"#fbf1d8");
    const count=Math.min(5,customers.length);
    for(let i=0;i<count;i++) {
      const xx=187+i*9;
      const appearance=personAppearance(customers[i]);
      art.ellipse(xx+3,57,3.3,3.7,appearance.skin);
      art.rounded(xx,62,6,6,2,appearance.shirt);
      if(i<regular.length)art.ellipse(xx+5,69,1.5,1.5,"#d7b15e");
    }
    art.line(187,75,226,75,"#a1b68d",1);
  }
  if(phase>=3) {
    art.rounded(282,107,48,29,3,"#89a18a");art.rounded(280,105,52,4,2,"#e5d0a7");
    art.line(305,111,305,134,"#6c8971",.8);
    art.ellipse(300,120,1,1,"#ead8a9");art.ellipse(311,120,1,1,"#ead8a9");
    for(let i=0;i<Math.min(4,regular.length);i++)art.rounded(285+i*9,94,6,11,1.3,["#86ad90","#d3b07a","#7ba7ac","#b19abe"][i]);
  }
  if(phase>=5)art.line(0,133,384,133,"#d8bc7e",2);
}
var roleMarkers = Object.freeze({
  sales: { color: "#ef8f75" },
  care: { color: "#62bd83" },
  builder: { color: "#68aee1" },
  balanced: { color: "#8e78c8" }
});
function drawRoleMarker(x,footY,member={}) {
  const role=member.rank==="xlead"?{color:"#d3b46d"}:roleMarkers[member.specialty]||roleMarkers.balanced;
  context.save();context.globalAlpha=.5;art.ellipse(x+16,footY+1,17,3,role.color);context.restore();
}
function drawTeamCharacter(member, x, footY = 176, options = {}) {
  drawRoleMarker(x, footY, member);
  drawCharacterAtFeet(x, footY, personAppearance(member), { idle: true, band: true, ...options });
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
  art.ellipse(193,184,23,5,"#7d8c6b");
  art.line(180,184,205,179,"#966b4b",4);art.line(180,179,205,184,"#b1875e",4);
  context.beginPath();context.moveTo(182,179);context.bezierCurveTo(176,167,189,169,190,151-pulse);context.bezierCurveTo(205,162,211,173,201,181);context.closePath();context.fillStyle="#e4a36a";context.fill();
  context.beginPath();context.moveTo(188,179);context.quadraticCurveTo(185,169,195,163-pulse);context.quadraticCurveTo(204,176,198,181);context.closePath();context.fillStyle="#ffe2a1";context.fill();
  drawCharacterAtFeet(35, 198, playerPalette, { pose: "celebrate", band: true, direction: "right" });
  const members = sceneRoster({ scene: "the-xircle", limit: 5 });
  const positions = [89, 228, 264, 300, 336];
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
  const members = sceneRoster({ scene: "organization", limit: visible });
  const positions = [70, 112, 154, 210, 252, 294, 336];
  for (let index = 0; index < visible; index += 1) {
    const member = members[index] || { id: `organization-visitor-${index}`, specialty: ["sales", "care", "builder", "balanced"][index % 4] };
    drawTeamCharacter(member, positions[index], 196, { direction: index < 3 ? "right" : "left", walk: !reducedMotion.matches && stageAge < 620 ? time / 110 + index : 0 });
  }
  const blocks = Math.min(12, Math.max(2, Math.ceil(Math.log2(Math.max(2, total))) + 2));
  for (let index = 0; index < blocks; index += 1) rect(24 + index * 8, 109, 5, 5 + index % 3 * 3, ["#65bd86", "#68aee1", "#f1be47"][index % 3]);
}
function drawTravelScene(destination, time, npc) {
  background(`travel:${destination}`, layer => layer.travel(destination));
  const wave = !reducedMotion.matches && Math.floor(time / 420) % 2 ? "celebrate" : "idle";
  drawCharacterAtFeet(35, 202, playerPalette, { pose: wave, band: true, direction: "right" });
  const companions = sceneRoster({ scene: `travel:${destination}`, limit: 3 });
  (companions.length ? companions : [{ appearance: npc }, { id: "travel-companion" }]).forEach((member, index) => drawCharacterAtFeet(264 + index * 36, 202, personAppearance(member), { pose: index === 0 ? wave : "idle", band: true, direction: "left" }));
}
function drawMonth12Scene(npc) {
  background("month12", layer => layer.organization(9));
  drawXircleMark(182, 68, 1.4);
  drawCharacterAtFeet(27, 196, playerPalette, { pose: "celebrate", band: true, direction: "right" });
  const members = sceneRoster({ scene: "month12", limit: 7 });
  const positions = [78, 120, 162, 210, 252, 294, 336];
  (members.length ? members : [{ appearance: npc, specialty: "balanced" }]).forEach((member, index) => drawTeamCharacter(member, positions[index], 196, { direction: index < 3 ? "right" : "left", pose: index % 3 === 0 ? "celebrate" : "idle" }));
}
function drawFinaleScene(npc) {
  background("finale", layer => layer.finale());
  drawCharacterAtFeet(176, 198, playerPalette, { pose: "celebrate", band: true });
  const members = sceneRoster({ scene: "finale", limit: 8 });
  const positions = [18, 57, 96, 135, 220, 259, 298, 337];
  (members.length ? members : [{ appearance: npc, specialty: "balanced" }]).forEach((member, index) => drawTeamCharacter(member, positions[index], 198, { direction: index < 4 ? "right" : "left", pose: index % 4 === 0 ? "celebrate" : "idle" }));
}
function playerWearsBand() {
  return ![STAGES.OPENING, STAGES.PRE_DAY0_BAND].includes(state.stage);
}
function drawCharacterAtFeet(x,footY,palette=playerPalette,options={}) {
  // Guides speak through conversation portraits; they never occupy the world.
  if(!palette||["teem","ako"].includes(palette.characterId))return;
  art.character(x,footY,palette,{
    ...options,
    player:palette===playerPalette,
    band:options.band ?? (palette===playerPalette && playerWearsBand()),
    walk:reducedMotion.matches?0:options.walk||0,
    jump:reducedMotion.matches?0:options.jump||0,
    breath:options.idle&&!reducedMotion.matches?Math.sin(visualTime/780+x)*.45:0,
    blink:!reducedMotion.matches&&(visualTime+x*13)%4300>4140
  });
}
function drawSittingCharacter(x,seatY,palette=playerPalette,direction="right",options={}) {
  if(!palette||["teem","ako"].includes(palette.characterId))return;
  art.character(x,seatY+25,palette,{
    seated:true,direction,player:palette===playerPalette,
    band:playerWearsBand(),
    blink:!reducedMotion.matches&&(visualTime+x*13)%4300>4140,
    ...options
  });
}

function drawPaper(x, y, { check = false, color = "#86ae99", lines = 3 } = {}) {
  art.rounded(x+1,y+2,29,23,2,"#385e4930");
  art.rounded(x,y,29,23,2,"#fff5d9","#8fa68a",.6);
  art.rounded(x+4,y+4,13,2,1,color);
  for(let i=0;i<lines;i++)art.line(x+4,y+9+i*4,x+21-i%2*4,y+9+i*4,"#a7b899",.8);
  if(check) { art.line(x+20,y+17,x+23,y+20,"#4c9470",1.5);art.line(x+23,y+20,x+28,y+13,"#4c9470",1.5); }
}
function drawConversationBubble(x, y, listening = false) {
  art.rounded(x,y,29,16,6,listening?"#f5e8cd":"#e4f1df","#8aab8d",.6);
  art.polygon([[x+8,y+13],[x+7,y+20],[x+15,y+14]],listening?"#f5e8cd":"#e4f1df");
  for(let i=0;i<3;i++)art.ellipse(x+8+i*6,y+8,1.3,1.3,listening?"#bd9870":"#699a7b");
}
function drawCalendar(x, y, month) {
  art.rounded(x,y,45,40,4,"#f8f0d6","#7b9b7a",.8);
  art.rounded(x,y,45,10,3,"#88ad92");
  art.line(x+9,y-2,x+9,y+4,"#657e65",2);art.line(x+36,y-2,x+36,y+4,"#657e65",2);
  context.fillStyle="#496e5b";context.font="bold 12px sans-serif";context.textAlign="center";
  context.fillText(String(month || 1),x+22.5,y+27);context.textAlign="start";
  art.line(x+12,y+33,x+33,y+33,"#c4c9a5",.9);
}
function drawPackage(x, y) {
  art.rounded(x,y,32,24,3,"#d6b184","#9a8b65",.7);
  art.polygon([[x,y],[x+7,y-6],[x+34,y-6],[x+32,y]],"#ead0a6");
  art.polygon([[x+32,y],[x+34,y-6],[x+34,y+17],[x+32,y+24]],"#bd9973");
  art.rounded(x+13,y,6,22,0,"#f3dfb7");
  art.rounded(x+3,y+7,7,6,1,"#eff0cd");
}
function drawActionScene(moment, progress) {
  const { group, variant, outcome } = moment;
  const paused = outcome === "paused";
  const npc = moment.person ? personAppearance(moment.person) : null;
  const band = Boolean(moment.person?.band);
  const arrival = reducedMotion.matches ? 1 : Math.min(1, progress / .42);
  const gesture = reducedMotion.matches ? 0 : Math.sin(progress * Math.PI * 3) * 1.6;
  const phase = reducedMotion.matches ? 1 : progress;
  const seatedPair = (playerPose = "write", npcPose = "listen") => {
    drawSittingCharacter(98,167,playerPalette,"right",{pose:playerPose,gesture});
    drawSittingCharacter(255,167,npc,"left",{pose:npcPose,band,notebook:npcPose==="read"});
  };
  const paperOnDesk = (checked = false) => drawPaper(163,151,{check:checked&&!paused});
  drawLocation(moment.location);
  if(state.month>0&&moment.location==="office")drawOfficeGrowth(`action_${group}`);
  if(group==="welcome") {
    if(moment.location==="office")drawDoor(301,true);
    drawTable(62,160,99);drawLaptop(80,122,true);
    drawCharacterAtFeet(161,190,playerPalette,{pose:phase<.45?"welcome":"talk",direction:"right",band:true,gesture});
    drawCharacterAtFeet(236+(1-arrival)*64,190,npc,{direction:"left",pose:arrival===1?"welcome":"idle",walk:arrival<1?visualTime/70:0,band});
    if(phase>.35)drawConversationBubble(233,91);
  } else if(group==="message"||group==="followup") {
    drawTable(70,166,100);drawLaptop(104,127,true);
    drawSittingCharacter(51,170,playerPalette,"right",{pose:"phone"});
    drawCharacterAtFeet(260,193,npc,{pose:paused?"listen":"phone",direction:"left",band});
    const xx=145+arrival*53;
    drawNotification(xx,100,paused?"#ccb181":"#87b9a0");
    art.line(153,126,230,126,"#bdd0ad",1.2);
    if(group==="followup")drawCalendar(191,138,moment.month);
    if(group==="message"&&phase>.55)drawConversationBubble(248,89);
  } else if(group==="meeting"||group==="consent") {
    drawTable(132,164,127);seatedPair(group==="consent"?"present":"write","talk");
    paperOnDesk(group==="consent");
    if(group==="meeting") {
      drawConversationBubble(135,99,phase<.45);
      if(phase>.45)drawConversationBubble(233,98);
      art.ellipse(216,156,6,2.2,"#b49a75");art.rounded(211,148,10,8,2,"#f3edd4");
    } else {
      drawLaptop(204,126,true);
      art.rounded(215,134,18,8,2,paused?"#d4bf9a":"#a4c8aa");
    }
  } else if(group==="measurement") {
    drawDataPanel(274,87,false);
    drawScale(219,191,phase>.3);
    drawCharacterAtFeet(220,178,npc,{direction:"left",band});
    drawCharacterAtFeet(122,190,playerPalette,{direction:"right",pose:"read",band:true});
    if(!reducedMotion.matches)art.line(211,123+phase*51,260,123+phase*51,"#80cdb56b",1.7);
    if(variant==="review") { drawPaper(77,147,{color:"#cca982"});drawPaper(87,158,{color:"#91b89e"}); }
    else drawPaper(285,143,{color:"#8cafaa"});
  } else if(group==="routine"||group==="offer") {
    drawTable(130,164,130);seatedPair(group==="routine"?"write":"present",paused?"listen":"talk");
    const products=moment.products;
    products.forEach((id,index)=>drawProduct(188+index*24,125,id));
    paperOnDesk(group==="routine"||variant==="accepted");
    if(group==="routine") {
      drawCalendar(45,94,moment.month);
      art.line(158,165,176+(phase*12),165,"#799f82",1.2);
    } else if(paused)drawConversationBubble(234,101,true);
    else if(variant==="accepted")drawPaper(217,156,{check:true});
  } else if(group==="onboarding"||group==="band") {
    drawTable(75,166,92);
    moment.products.slice(0,2).forEach((id,index)=>drawProduct(97+index*24,129,id));
    drawCharacterAtFeet(174,191,playerPalette,{pose:"present",direction:"right",band:true,gesture});
    drawCharacterAtFeet(259,191,npc,{pose:paused?"listen":"band",direction:"left",band:band||!paused,bandActive:!paused});
    drawCalendar(221,74,moment.month);
    drawPaper(112,156,{color:"#dfb379"});
  } else if(group==="care"&&variant==="rest") {
    drawSittingCharacter(145,169,playerPalette,"right",{pose:"listen"});
    drawTable(207,166,50);
    art.ellipse(228,162,7,2,"#bb9e76");art.rounded(223,151,10,11,3,"#ead5ab");
  } else if(group==="care") {
    drawTable(135,164,123);seatedPair("listen","read");
    drawPaper(163,148,{color:"#87b39a"});
    drawCalendar(205,116,moment.month);
    drawConversationBubble(239,96,paused);
    if(phase>.4)art.line(173,163,188,163,"#87ac8e",1.4);
  } else if(group==="delivery") {
    drawTable(145,166,96);
    drawCharacterAtFeet(106,192,playerPalette,{direction:"right",pose:"handoff",band:true,gesture});
    drawCharacterAtFeet(247,192,npc,{direction:"left",pose:"present",band});
    drawPackage(170+arrival*17,134);
    drawPaper(219,151,{check:!paused});
    if(variant==="reorder")drawCalendar(84,83,moment.month);
  } else if(group==="referral") {
    drawRoundTable(139,147);
    drawCharacterAtFeet(63,192,playerPalette,{pose:"listen",direction:"right",band:true});
    if(moment.companion)drawCharacterAtFeet(160,192,personAppearance(moment.companion),{pose:"present",direction:"right",band:Boolean(moment.companion.band),gesture});
    drawCharacterAtFeet(261+(1-arrival)*55,192,npc,{direction:"left",pose:arrival===1?"welcome":"idle",walk:arrival<1?visualTime/75:0,band});
    drawConversationBubble(183,94);
  } else if(group==="invitation") {
    drawWhiteboard(147,60);
    for(let i=0;i<3;i++){art.ellipse(173+i*29,105,5,5,["#deb878","#9fbaa0","#80a894"][i]);if(i<2)art.line(181+i*29,105,194+i*29,105,"#84a187",1.3);}
    drawCharacterAtFeet(96,192,playerPalette,{pose:"present",direction:"right",band:true,gesture});
    drawCharacterAtFeet(276,192,npc,{pose:"read",direction:"left",band});
    if(phase>.4)drawConversationBubble(241,101,true);
  } else if(group==="study") {
    drawTable(140,166,111);
    drawSittingCharacter(106,170,playerPalette,"right",{pose:variant==="answer"?"write":"read",gesture});
    drawPaper(165,153,{check:variant==="answer"&&!paused});
    if(variant==="people"||variant==="candidate") {
      drawSittingCharacter(252,170,npc,"left",{pose:"read",band});
      drawConversationBubble(222,92,phase<.5);
    } else {
      drawLaptop(202,129,true);
      const academyWall = moment.location === "academy";
      if(variant==="care")drawDataPanel(academyWall?139:43,academyWall?39:62,false);
      else if(variant==="leadership")drawWhiteboard(academyWall?139:37,academyWall?39:61);
      else for(let i=0;i<3;i++)art.rounded(54+i*10,122-i*3,8,34+i*3,1,["#819e91","#d2b185","#9cafa6"][i]);
    }
  } else if(group==="mentoring"||group==="review"||group==="organization"||group==="camp") {
    drawWhiteboard(144,52);drawTable(134,168,122);
    drawSittingCharacter(99,172,playerPalette,"right",{pose:"present",gesture});
    drawSittingCharacter(257,172,npc,"left",{pose:paused?"listen":"write",band});
    drawPaper(164,155,{color:group==="review"?"#c7ad7e":"#80aa94"});
    drawLaptop(207,130,true);
    if(variant==="leaders"||group==="organization")sceneRoster({scene:`action:${group}`,limit:2,excludeIds:[moment.person?.id,moment.companion?.id],targetId:null}).forEach((member,index)=>drawTeamCharacter(member,29+index*41,183,{pose:"listen",direction:"right"}));
    if(group==="mentoring"&&phase>.48)drawConversationBubble(232,103,paused);
  } else if(group==="certification") {
    drawTable(144,164,112);
    drawSittingCharacter(258,168,npc,"left",{pose:"write",band});
    drawCharacterAtFeet(174,192,playerPalette,{pose:paused?"read":"present",direction:"right",band:true});
    if(paused)drawPaper(234,151,{color:"#c5aa7f"});else drawCertificate(199,118);
  } else if(group==="month") {
    drawTable(166,168,128);drawLaptop(237,130,true);
    drawSittingCharacter(130,172,playerPalette,"right",{pose:"write",gesture});
    drawCalendar(83,89,moment.month);
    drawPaper(191,155,{check:variant==="close"});
    drawPaper(201,160,{color:variant==="open"?"#85af98":"#cab17e"});
    if(variant==="open")art.line(99,123,119,123,"#83aa8c",1.2);
  } else if(group==="live")drawLiveScene(phase*1000);
}
function drawLocation(location) {
  if(["kitchen","community","garden","studio"].includes(location))background(`location:${location}`,layer=>layer[location]());
  else drawRoom(location==="academy"?"academy":"management");
}
function drawLiveScene(age) {
  drawLocation("studio");
  drawTable(159,163,94);
  const target=(state.prospects||[]).find(person=>state.pendingLive?.targetIds?.includes(person.id));
  (target?.routinePlan?.products||[]).filter(id=>typeof id==="string"&&id!=="control").slice(0,2).forEach((id,index)=>drawProduct(187+index*25,126,id));
  drawCharacterAtFeet(140,187,playerPalette,{pose:"present",direction:"right",band:true,gesture:reducedMotion.matches?0:Math.sin(age/100)});
  art.line(56,153,46,190,"#354c44",2);art.line(56,153,70,190,"#354c44",2);
  art.rounded(44,137,25,17,3,"#344b43","#acb895",.8);
  art.rounded(68,141,7,10,2,"#4f6759");art.ellipse(47,140,1,1,"#dba480");
  drawTable(276,164,78);
  drawLaptop(292,122,true);
  const count=Math.min(3,state.pendingLive?.targetIds?.length||0);
  for(let i=0;i<count;i++) {
    if(reducedMotion.matches||age>120+i*150)drawConversationBubble(274+i%2*36,93+i*20,i%2===0);
  }
}
function drawScene(time) {
  snapshot();
  rosterIds = [];
  visualTime = time;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const scene = content.scene || "opening";
  const exam = scene.startsWith("exam") || scene === "ceremony";
  const management = scene.startsWith("management") || ["team_started", "month_closed", "season_review", "content_running", "ads_running", "xcademy_running", "open_house_running", "center_running", "goodluck_running", "the-xircle", "xlead", "xgen"].includes(scene);

  const person = selectedPerson();
  const npc = personAppearance(person);
  const idle = { idle: true, band: playerWearsBand(), bandActive: scene === "pre_montage" };
  const stageAge = time - stageStartedAt;
  const organizationMode = state.organizationMode ? organizationVisualMode(stageAge) : null;
  if(actionMoment && (time-actionMoment.startedAt>=actionMoment.duration || actionMoment.runId!==state.runId || actionMoment.stage!==state.stage))actionMoment=null;
  const moment = actionMoment;
  if(moment) { canvas.dataset.actionEvent=moment.event;canvas.dataset.actionGroup=moment.group;canvas.dataset.actionLocation=moment.location; }
  else { delete canvas.dataset.actionEvent;delete canvas.dataset.actionGroup;delete canvas.dataset.actionLocation; }
  if (!organizationMode && !["the-xircle", "management_org", "season_review"].includes(scene)) {
    drawRoom(exam ? "exam" : ["xcademy_running", "center_running"].includes(scene) ? "academy" : ["open_house_running", "goodluck_running"].includes(scene) ? "forum" : management ? "management" : state.month === 0 ? "pre" : "office");
    if (!exam) drawOfficeGrowth(scene);
  }
  const sceneDescription = moment ? `${moment.title}${moment.person?.name?`กับ ${moment.person.name}`:""} · ${moment.detail}` : scene==="live-studio" ? "คุณกำลัง LIVE คุยแฟ้ม X กับคนที่พร้อมในสตูดิโอ" : organizationMode?.kind === "travel" ? `ทีมรับรางวัลท่องเที่ยวที่ ${organizationMode.report.trip.destination}` : scene === "the-xircle" || organizationMode?.kind === "xircle" ? "ทีมร่วมแคมป์ The Xircle ใต้แสงดาว" : exam ? "ห้องสอบ Xcademy" : "ฉากสำนักงานและทีม X-VISOR";
  if (canvas.getAttribute("aria-label") !== sceneDescription) canvas.setAttribute("aria-label", sceneDescription);
  if (moment) {
    drawActionScene(moment,reducedMotion.matches?1:Math.max(0,Math.min(1,(time-moment.startedAt)/moment.duration)));
  } else if (organizationMode?.kind === "travel") {
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
    drawCharacterAtFeet(286,176,proctorPalette,{direction:"left"});
    rect(178, 118, 28, 18, "#4f7565");
    rect(181, 121, 22, 12, "#d9f2ef");
    if (scene === "exam_transit") {
      const progress = reducedMotion.matches ? 1 : Math.min(1, stageAge / 650);
      const x = 34 + Math.min(150, progress * 190);
      if (progress < 0.72) drawCharacterAtFeet(x, 176, playerPalette, { walk: time / 90, direction: "right", band: true });
      else drawSittingCharacter(167, 159, playerPalette, "right");
    } else if (scene === "ceremony") {
      const jump = stageAge > 360 && stageAge < 740 && !reducedMotion.matches ? Math.sin((stageAge - 360) / 380 * Math.PI) * 9 : 0;
      drawCharacterAtFeet(166, 176, playerPalette, { pose: "celebrate", jump, band: true });
      drawCertificate(215, 91);
    } else drawSittingCharacter(167, 159, playerPalette, "right");
  } else if (["pre_scale", "pre_scanning", "pre_day14_scale", "pre_day14_scanning", "pre_day14_review", "pre_day28_scale", "pre_day28_scanning", "pre_day28_review"].includes(scene)) {
    drawScale(178, 177, scene.includes("scanning") || scene.includes("review"));
    drawCharacterAtFeet(179, 164, playerPalette, { ...idle, idle: !scene.includes("scanning") });
    drawDataPanel(268, 63, scene.includes("review") || scene.includes("day28"));
    if (scene.includes("scanning")) rect(165, (reducedMotion.matches ? 132 : 105 + time / 16 % 56), 62, 3, "#73e3d2");
  } else if (["pre_band", "pre_summary", "pre_abcd", "practice_data", "practice_care", "pre_montage"].includes(scene)) {
    drawTable(232, 154, 92);
    drawCharacterAtFeet(116, 176, playerPalette, { ...idle, band: true, pose: scene === "pre_band" ? "band" : "idle", bandActive: ["pre_band", "pre_montage"].includes(scene) });

    if (scene === "pre_montage") {
      rect(249, 72, 59, 56, "#4f7565");
      rect(254, 78, 49, 45, "#fff8df");
      rect(254, 78, 49, 9, "#ef8078");
      for (let index = 0; index < 28; index += 1) rect(258 + index % 7 * 6, 91 + Math.floor(index / 7) * 7, 4, 4, index < montageVisualDay ? "#4fbd83" : "#d7dfd9");
    } else if (scene === "pre_abcd") ["gus", "protein-hmb", "vita-matrix", "astamega"].forEach((id, index) => drawProduct(231 + index * 24, 117, id));
    else if (scene.startsWith("practice")) {
      if(scene==="practice_care")drawSittingCharacter(254,159,npc,"left");
      rect(180, 113, 34, 25, "#4f7565");
      rect(183, 116, 28, 19, "#d9f2ef");
    }
  } else if (scene === "opening") {
    drawScale(74, 177);
    drawTable(249, 154, 82);
    drawProduct(276, 118, "gus");
    drawCharacterAtFeet(176,184,playerPalette,{idle:true,direction:"right",pose:"listen"});
  } else if (["empty_office", "person_arrives", "consultation", "recommendation", "onboarding", "followup", "interest", "candidate", "sale"].includes(scene)) {
    drawTable(139, 154, 108);
    const arriving=["empty_office","person_arrives"].includes(scene);
    if(arriving) {
      drawCharacterAtFeet(72,176,playerPalette,{...idle,direction:"right"});
      if(scene==="person_arrives") {
        const x=reducedMotion.matches?277:330-Math.min(52,stageAge/18);
        drawCharacterAtFeet(x,176,npc,{direction:"left",walk:reducedMotion.matches?0:time/90});
      }
    } else {
      drawSittingCharacter(108,159,playerPalette,"right");
      drawSittingCharacter(245,159,npc,"left");
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
    if (scene.includes("scanning")) rect(210, (reducedMotion.matches ? 132 : 105 + time / 16 % 56), 62, 3, "#73e3d2");
  } else if (scene === "routine_builder") {
    drawTable(130, 154, 130);
    drawSittingCharacter(99, 159, playerPalette, "right");
    drawSittingCharacter(256, 159, npc, "left");
    ["gus", "protein-hmb", "vita-matrix", "astamega"].forEach((id, index) => drawProduct(139 + index * 27, 117, id));
  } else if (scene === "live-studio") {
    drawLiveScene(stageAge);
  } else if (scene === "content_running") {
    drawLocation("studio");
    drawTable(203, 154, 111);
    drawSittingCharacter(171, 159, playerPalette, "right");
    drawLaptop(229, 112, true);
    const visible = reducedMotion.matches ? 3 : Math.min(3, Math.floor(stageAge / 220));
    for (let index = 0; index < visible; index += 1) drawNotification(84 + index * 38, 58 + index % 2 * 27, ["#f6ce5a", "#62bd83", "#6cb4df"][index]);
  } else if (scene === "ads_running") {
    drawLocation("studio");
    drawTable(195, 154, 119);
    drawSittingCharacter(154, 159, playerPalette, "right");
    drawLaptop(224, 112, true);
    rect(58, 50, 91, 68, "#4f7565");
    rect(63, 55, 81, 58, "#fffdf2");
    rect(72, 65, 63, 8, "#dbe8e5");
    rect(72, 65, (reducedMotion.matches ? 63 : Math.min(63, stageAge / 10)), 8, "#62bd83");
    [0, 1, 2].slice(0, reducedMotion.matches ? 3 : Math.floor(stageAge / 240)).forEach((index) => drawNotification(66 + index * 33, 82 + index % 2 * 20, "#6cb4df"));
  } else if (["xcademy_running", "center_running"].includes(scene)) {
    drawWhiteboard(139, 31);
    drawRoundTable(143, 137);
    drawCharacterAtFeet(49, 176, playerPalette, { direction: "right", pose: "talk", band: true });
    const participants = sceneRoster({ scene, limit: 3 });
    participants.forEach((member, index) => {
      const progress = reducedMotion.matches ? 1 : Math.min(1, stageAge / (520 + index * 120));
      drawTeamCharacter(member, 244 + index * 38 + (1 - progress) * 55, 176, { direction: "left", walk: progress < 1 ? time / 90 : 0 });
    });
    if (!participants.length) drawCharacterAtFeet(284, 176, npc, { direction: "left", idle: true, band: true });
  } else if (["open_house_running", "goodluck_running"].includes(scene)) {
    // A solid riser reaches the floor, with a broad top and two visible steps.
    // Speakers stand on that top; no table legs sit beneath them.
    art.shadow(188,155,153,10);
    art.polygon([[59,122],[311,122],[327,136],[43,136]],"#d4b383");
    art.rounded(43,136,284,20,1,"#95754f","#6e6146",.8);
    for(let x=51;x<322;x+=26)art.line(x,140,x,154,"#b48f602f",.8);
    art.line(46,137,324,137,"#f0d29d",1.5);
    art.rounded(158,155,62,7,1,"#b69769","#806b4a",.6);
    art.rounded(151,162,76,6,1,"#ccb080","#806b4a",.6);
    art.rounded(146,17,92,17,6,"#f4e6bb");
    context.fillStyle="#426b57";context.font="bold 8px sans-serif";context.textAlign="center";context.fillText("OPEN HOUSE",192,29);context.textAlign="start";
    drawCharacterAtFeet(178,134,playerPalette,{pose:"present",direction:"right",band:true});
    art.rounded(260,109,23,24,2,"#846a4c");
    art.polygon([[252,105],[286,105],[290,111],[254,111]],"#c6a576");
    art.rounded(255,131,34,4,1,"#735f44");
    art.line(279,105,279,97,"#4c5748",1);art.ellipse(278,96,2,1.6,"#4c5748");
    const attendees=sceneRoster({scene,pool:[...state.customers||[],...state.prospects||[],...state.team||[]],limit:4});
    const crowd=attendees.length?attendees.map(personAppearance):[npc,getPersonAppearance({id:"open-house-visitor"})];
    const seats=[38,104,248,314];
    crowd.forEach((palette,index)=>drawSittingCharacter(seats[index],177,palette,index<2?"right":"left",{pose:"listen",band:Boolean(attendees[index]?.day!==undefined||attendees[index]?.xvisorStage)}));
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
      // Wall displays sit behind the taller illustrated figures.
      drawDataPanel(274, 40, state.monthStats.weeklyDone);
      drawRoundTable(142, 132);
      drawCharacterAtFeet(55, 176, playerPalette, { direction: "right", pose: "talk", band: true });
      const teamPositions = [190, 226, 262, 298, 334];
      sceneRoster({scene,limit:phase>=4?5:3}).forEach((member,index)=>drawTeamCharacter(member,teamPositions[index],176,{direction:"left"}));
      if (state.team.length === 0) drawCharacterAtFeet(281, 176, npc, { direction: "left", idle: true });
      if (state.customers.length >= 3) {
        drawChair(12, 119, "#73a9c3");
        drawTable(15, 154, 55);
      }
      if (state.team.length >= 1) {
        rect(215, 53, 38, 28, "#4f7565");
        rect(219, 57, 30, 20, "#d9f2ef");
      }
    }
  } else if (["xlead", "xgen"].includes(scene)) {
    drawWhiteboard(138, 29);
    drawCharacterAtFeet(55, 176, playerPalette, { pose: "celebrate", band: true });
    sceneRoster({scene,limit:4}).forEach((member,index)=>drawTeamCharacter(member,190+index*43,176,{direction:"left"}));
    rect(50, 42, 65, 25, "#4f7565");
    rect(55, 47, 55, 15, "#f6ce5a");
  } else if (scene === "certified") {
    const jump = stageAge > 420 && stageAge < 850 && !reducedMotion.matches ? Math.sin((stageAge - 420) / 430 * Math.PI) * 7 : 0;
    drawCharacterAtFeet(176, 176, playerPalette, { pose: "celebrate", jump, band: true });
    drawCertificate(174, 72);
  }
  canvas.dataset.rosterIds = JSON.stringify([...new Set(rosterIds)]);
  renderWorldEventCard(scene, stageAge, organizationMode, moment);
  const dt = Math.min(3, (time - previousFrame) / (1000 / 60)) || 1;
  effects = effects.filter((particle) => particle.life > 0);
  effects.forEach((particle) => {
    context.globalAlpha = Math.min(1, particle.life / 18);
    rect(particle.x, particle.y, particle.size, particle.size, particle.color);
    context.globalAlpha = 1;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 0.06 * dt;
    particle.life -= dt;
  });
}

  function frame(time) {
    frameId = 0;
    if (destroyed || document.hidden) return;
    if (time - previousFrame >= (reducedMotion.matches ? 200 : 1000 / 30)) {
      drawScene(time);
      previousFrame = time;
    }
    if (!reducedMotion.matches || effects.length || actionMoment || time - stageStartedAt < 3300) frameId = requestAnimationFrame(frame);
  }
  function invalidate() {
    if (destroyed || document.hidden) return;
    previousFrame = 0;
    if (!frameId) frameId = requestAnimationFrame(frame);
  }
  function onVisibilityChange() {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      effects = [];
      actionMoment = null;
    } else invalidate();
  }
  function onMotionChange() {
    if (reducedMotion.matches) effects = [];
    invalidate();
  }
  function destroy() {
    destroyed = true;
    cancelAnimationFrame(frameId);
    frameId = 0;
    effects = [];
    actionMoment = null;
    backgrounds.clear();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.removeEventListener?.("change", onMotionChange);
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener?.("change", onMotionChange);
  snapshot();
  return { invalidate, spawnEffect, playAction, destroy };
}
