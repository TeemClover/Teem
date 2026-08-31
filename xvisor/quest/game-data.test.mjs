import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CUSTOMER_STATES,
  ENERGY_COSTS,
  EVENTS,
  MAX_ENERGY,
  ROUTINEX,
  SAVE_KEY,
  SAVE_VERSION,
  STAGES,
  XIRCLE,
  XGEN_TGV_TARGET,
  applyAutomaticCustomerCycles,
  calculateEconomy,
  energyAtDay,
  getBestNextActions,
  getCurrentExamQuestion,
  makeInitialState,
  makeMonthStats,
  parseSavedState,
  recordSale,
  reduceGame,
  serializeState,
} from "./game-data.js";
import {
  BREAKAWAY_INCOME_RULE,
  DIRECT_MENTORING_RULE,
  ORGANIZATION_INCOME_RULE,
  getRetailTier,
} from "./game-commercial-config.js";
import { EXAM_DOMAINS, questionDomains } from "./game-exam.js";
import { APPEARANCES, NAME_POOL } from "./game-people.js";
import {
  addSkillXp,
  getSkillLevel,
  makeTeamMember,
  simulateTeamCycle,
} from "./game-progression.js";
import { getStageContent } from "./game-copy.js";

const move = (state, event, payload) => reduceGame(state, event, payload);
const file = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const transientStages = new Set([
  STAGES.CONTENT_RUNNING, STAGES.ADS_RUNNING, STAGES.XCADEMY_RUNNING,
  STAGES.OPEN_HOUSE_RUNNING, STAGES.CENTER_RUNNING, STAGES.GOOD_LUCK_RUNNING,
  STAGES.G1_CELEBRATION, STAGES.XLEAD_MILESTONE,
]);

function settle(state) {
  let next = state;
  let guard = 0;
  while (transientStages.has(next.stage) && guard < 6) {
    next = move(next, EVENTS.SCENE_COMPLETE);
    guard += 1;
  }
  return next;
}

function reachDay28(seed = 128) {
  let state = makeInitialState({ seed });
  for (const event of [EVENTS.START_PATH, EVENTS.WEAR_BAND, EVENTS.START_SELF_SCALE, EVENTS.SELF_SCAN_COMPLETE, EVENTS.START_MONTAGE, EVENTS.MONTAGE_COMPLETE, EVENTS.START_MONTAGE, EVENTS.MONTAGE_COMPLETE]) state = move(state, event);
  state = move(state, EVENTS.SELECT_PRACTICE, { answer: "context" });
  for (const event of [EVENTS.SUBMIT_PRACTICE, EVENTS.CONTINUE_PRACTICE, EVENTS.MONTAGE_COMPLETE, EVENTS.START_DAY14_SCALE, EVENTS.DAY14_SCAN_COMPLETE, EVENTS.START_MONTAGE, EVENTS.MONTAGE_COMPLETE]) state = move(state, event);
  state = move(state, EVENTS.SELECT_PRACTICE, { answer: "ask_context" });
  for (const event of [EVENTS.SUBMIT_PRACTICE, EVENTS.CONTINUE_PRACTICE, EVENTS.MONTAGE_COMPLETE, EVENTS.START_DAY28_SCALE, EVENTS.DAY28_SCAN_COMPLETE]) state = move(state, event);
  return state;
}

function reachExam(seed = 128) {
  return move(move(reachDay28(seed), EVENTS.GO_EXAM), EVENTS.EXAM_TRANSIT_COMPLETE);
}

function answerExam(state, correct = true) {
  const question = getCurrentExamQuestion(state);
  const answer = correct ? question.correct : question.choices.find(([id]) => id !== question.correct)[0];
  return move(move(state, EVENTS.SELECT_EXAM, { answer }), EVENTS.SUBMIT_EXAM);
}

function certify(seed = 128) {
  let state = reachExam(seed);
  for (let index = 0; index < 5; index += 1) state = move(answerExam(state, true), EVENTS.NEXT_EXAM);
  return move(move(state, EVENTS.COMPLETE_CERTIFICATION), EVENTS.CEREMONY_COMPLETE);
}

function finishMonth1(seed = 128) {
  let state = move(certify(seed), EVENTS.START_MONTH_1);
  for (const event of [EVENTS.FIND_PERSON, EVENTS.TALK, EVENTS.REQUEST_CONSENT, EVENTS.START_CUSTOMER_BASELINE, EVENTS.CUSTOMER_BASELINE_COMPLETE, EVENTS.OPEN_ROUTINE_BUILDER]) state = move(state, event);
  state = move(state, EVENTS.CHOOSE_ROUTINE, { planId: "fit" });
  for (const event of [EVENTS.MAKE_OFFER, EVENTS.CLOSE_RECEIPT, EVENTS.START_ONBOARDING, EVENTS.FOLLOW_UP_CUSTOMER, EVENTS.START_CUSTOMER_REVIEW, EVENTS.CUSTOMER_REVIEW_COMPLETE, EVENTS.SAVE_SUCCESS, EVENTS.CONTINUE_CARE]) state = move(state, event);
  return state;
}

function makeManagement(seed = 1) {
  const state = makeInitialState({ seed });
  return {
    ...state,
    stage: STAGES.MANAGEMENT,
    phase: "management",
    month: 1,
    energy: MAX_ENERGY,
    rank: "xvisor",
    monthStats: makeMonthStats(),
    career: { ...state.career, totalSuccessCases: 2 },
    milestones: { ...state.milestones, certified: true },
  };
}

function memberFor(state, id, parentId = "player", generation = 1) {
  return makeTeamMember({
    id: `customer-${id}`,
    personId: `person-${id}`,
    name: `สมาชิก ${id}`,
    appearance: APPEARANCES[Number(id) % APPEARANCES.length],
  }, state, { id: `member-${id}`, parentId, generation });
}

function selfDirectedCustomer(id, month = 0) {
  return {
    id: `customer-${id}`,
    personId: `customer-person-${id}`,
    name: `ลูกค้า ${id}`,
    activePlan: true,
    successCase: true,
    selfDirected: true,
    customerState: CUSTOMER_STATES.SELF_DIRECTED,
    lastReorderMonth: month,
    day: 28,
    measuredAgain: true,
    followups: 2,
    adherence: 82,
    trust: 76,
    result: "ดีขึ้น",
    referralReady: true,
    referralAsked: true,
    xvisorInterest: true,
    xvisorStage: null,
  };
}

test("PRE-SEASON remains 0→28 and the five-question Exam still repairs only mistakes", () => {
  const day28 = reachDay28();
  assert.equal(makeInitialState({ seed: 1 }).energy, 0);
  for (let day = 0; day <= 28; day += 1) assert.equal(energyAtDay(day), day);
  assert.equal(day28.energy, 28);
  assert.deepEqual(day28.preseason.productKnowledge, { gus: true, proteinHmb: true, vitaMatrix: true, astaMega: true, control: true });
  let state = reachExam();
  assert.equal(state.exam.questions.length, 5);
  assert.deepEqual(new Set(questionDomains(state.exam.questions)), new Set(EXAM_DOMAINS));
  const hiddenQuestion = getCurrentExamQuestion(state);
  assert.equal(JSON.stringify(getStageContent(state)).includes(`"correct":"${hiddenQuestion.correct}"`), false);
  state = move(answerExam(state, false), EVENTS.NEXT_EXAM);
  for (let index = 1; index < 5; index += 1) state = move(answerExam(state, true), EVENTS.NEXT_EXAM);
  assert.equal(state.exam.repairQueue.length, 1);
  state = move(state, EVENTS.START_REPAIRS);
  state = move(answerExam(state, true), EVENTS.NEXT_EXAM);
  state = move(move(state, EVENTS.COMPLETE_CERTIFICATION), EVENTS.CEREMONY_COMPLETE);
  assert.equal(state.rank, "xvisor");
  assert.equal(state.energy, 28);
});

test("pixel direction, random identity, routing and the v7 asset cache key remain intact", () => {
  const source = file("./game.js");
  const quest = file("./index.html");
  const vercel = JSON.parse(file("../../vercel.json"));
  assert.match(source.slice(source.indexOf("function drawCharacterAtFeet"), source.indexOf("function drawSittingCharacter")), /actualFoot = footY - jump/);
  assert.doesNotMatch(source, /176\s*-\s*\(index\s*%\s*2\)/);
  assert.match(quest, /game\.js\?v=7/);
  assert.ok(vercel.redirects.some((rule) => rule.source === "/xvisor" && rule.destination === "/xvisor/"));
  assert.ok(NAME_POOL.length >= 24 && APPEARANCES.length >= 12);
  assert.equal(SAVE_KEY, "xvisorQuestContinueV4");
  assert.equal(SAVE_VERSION, 6);
});

test("the polished Month 1 slice leads into recurring Month 2 and First G1 never ends the game", () => {
  let state = finishMonth1(222);
  assert.equal(state.stage, STAGES.M1_TEAM_STARTED);
  assert.equal(state.economy.lastTransaction.price, 12480);
  assert.equal(state.customers.length, 1);
  state = move(move(state, EVENTS.END_MONTH), EVENTS.START_NEXT_MONTH);
  assert.equal(state.month, 2);
  assert.equal(state.energy, 28);
  assert.equal(state.monthStats.autoReorders, 1);
  assert.equal(state.economy.lastTransaction.price, ROUTINEX.price);
  state = settle(move(state, EVENTS.RUN_OPEN_HOUSE));
  const customer = state.customers[0];
  assert.equal(customer.xvisorStage, "ready");
  state = move(state, EVENTS.START_CANDIDATE_XCADEMY, { id: customer.id });
  state = settle(move(state, EVENTS.RUN_XCADEMY));
  state = move(state, EVENTS.CERTIFY_CANDIDATE, { id: customer.id });
  assert.equal(state.stage, STAGES.G1_CELEBRATION);
  assert.equal(state.team.length, 1);
  state = settle(state);
  assert.equal(state.stage, STAGES.MANAGEMENT);
  assert.notEqual(state.stage, STAGES.SEASON_REVIEW);
});

test("1–8 economy: Full Start is 12,480/9,495, repeat is RoutineX only, and Channel 1 uses baht", () => {
  assert.deepEqual([ROUTINEX.price, ROUTINEX.xv, ROUTINEX.cycle], [7490, 7000, "monthly"]);
  assert.deepEqual([XIRCLE.price, XIRCLE.xv, XIRCLE.cycle], [4990, 2495, "first_customer_only"]);
  let state = makeManagement();
  state = recordSale(state, "sale", "new-1");
  assert.deepEqual([state.economy.lastTransaction.price, state.economy.lastTransaction.xv], [12480, 9495]);
  assert.equal(state.economy.lastTransaction.items.length, 2);
  assert.equal(calculateEconomy(state).channel1, 2496);
  state = recordSale(state, "reorder", "new-1");
  assert.deepEqual([state.economy.lastTransaction.price, state.economy.lastTransaction.xv], [7490, 7000]);
  assert.deepEqual(state.economy.lastTransaction.items.map((item) => item.id), [ROUTINEX.id]);
  const empty = makeManagement();
  const routineOnly = calculateEconomy({ ...empty, economy: { ...empty.economy, productSales: 7490, personalXV: 7000 } });
  assert.equal(routineOnly.channel1, 1498);
  assert.equal(getRetailTier(40000).rate, 0.23);
  assert.equal(getRetailTier(100000).rate, 0.25);
});

test("9–14 Channel 2 is 20% of each direct G1 commission and self-use creates sales, XV and mentor income", () => {
  let state = makeManagement(9);
  const sales = [39999, 40000, 100000];
  state = {
    ...state,
    rank: "xlead",
    team: sales.map((amount, index) => ({ ...memberFor(state, index + 1), personalSalesBaht: amount, personalXV: amount })),
  };
  const economy = calculateEconomy(state);
  assert.deepEqual(economy.mentoringBreakdown.map((item) => item.retailTier.rate), [0.2, 0.23, 0.25]);
  const expected = sales.reduce((sum, amount) => sum + Math.round(Math.round(amount * getRetailTier(amount).rate) * DIRECT_MENTORING_RULE.rate), 0);
  assert.equal(economy.channel2, expected);
  assert.notEqual(economy.channel2, Math.round(sales.reduce((sum, amount) => sum + amount, 0) * 0.05));
  let selfUse = makeManagement(10);
  selfUse = { ...selfUse, month: 2, rank: "xlead", team: [memberFor(selfUse, 1)], monthStats: makeMonthStats() };
  selfUse = simulateTeamCycle(selfUse);
  assert.equal(selfUse.team[0].lastSelfUseMonth, 2);
  assert.ok(selfUse.team[0].personalSalesBaht >= ROUTINEX.price);
  assert.ok(selfUse.team[0].personalXV >= ROUTINEX.xv);
  assert.ok(calculateEconomy(selfUse).channel2 >= 300);
});

test("15–16 income history snapshots channels 1–4 and lifetime total equals closed months", () => {
  let state = makeManagement(15);
  state = recordSale(state, "sale", "a");
  state = move(state, EVENTS.END_MONTH);
  assert.equal(state.economy.incomeHistory.length, 1);
  assert.deepEqual(Object.keys(state.economy.incomeHistory[0]).sort(), ["channel1", "channel2", "channel3", "channel4", "month", "tgv", "total"].sort());
  state = move(state, EVENTS.START_NEXT_MONTH);
  state = recordSale(state, "reorder", "a");
  state = move(state, EVENTS.END_MONTH);
  assert.equal(state.economy.incomeHistory.length, 2);
  assert.equal(state.economy.totalIncome, state.economy.incomeHistory.reduce((sum, item) => sum + item.total, 0));
});

test("17–20 team has no cap, supports downstream, and Leadership Lv.10 is a step-change", () => {
  let state = makeManagement(20);
  state = { ...state, month: 5, team: Array.from({ length: 12 }, (_, index) => memberFor(state, index + 1)), monthStats: makeMonthStats() };
  const cycled = simulateTeamCycle(state);
  assert.ok(cycled.team.length >= 12);
  assert.equal(new Set(cycled.team.map((member) => member.id)).size, cycled.team.length);
  const parent = { ...memberFor(state, 99), growthMomentum: 1.2, teamSkill: 8, autonomy: 90, confidence: 90 };
  const downstream = simulateTeamCycle({ ...state, team: [parent], monthStats: makeMonthStats(), skills: { ...state.skills, leadership: { xp: 63 } } });
  assert.ok(downstream.team.some((member) => member.parentId === parent.id && member.generation === 2));
  const low = simulateTeamCycle({ ...state, team: [memberFor(state, 77)], monthStats: makeMonthStats(), skills: { ...state.skills, leadership: { xp: 0 } } });
  const high = simulateTeamCycle({ ...state, team: [memberFor(state, 77)], monthStats: makeMonthStats(), skills: { ...state.skills, leadership: { xp: 63 } } });
  assert.ok(high.monthStats.teamActions >= low.monthStats.teamActions * 2);
  assert.ok(high.team[0].growthMomentum > low.team[0].growthMomentum);
});

test("21–23 cooldown resolves or exits priority, and no-op follow-up never costs Energy", () => {
  let state = makeManagement(23);
  const person = { id: "p-cool", name: "พักก่อน", journey: "waiting", readiness: 25, trust: 30, nextOfferMonth: 4, decisionAttempts: 0, status: "ยังไม่ต้องตาม" };
  state = { ...state, month: 2, prospects: [person], missions: [] };
  const before = state.energy;
  let next = move(state, EVENTS.FOLLOW_UP_DECISION, { id: person.id });
  assert.equal(next.energy, before);
  assert.equal(getBestNextActions(next).some((item) => item.type === "decision"), false);
  state = { ...state, month: 4 };
  next = move(state, EVENTS.FOLLOW_UP_DECISION, { id: person.id });
  assert.equal(next.energy, before - 1);
  const afterFirst = next.prospects[0];
  assert.ok(["waiting", "dormant"].includes(afterFirst.journey));
  const cooldownEnergy = next.energy;
  next = move(next, EVENTS.FOLLOW_UP_DECISION, { id: person.id });
  assert.equal(next.energy, cooldownEnergy);
});

test("24–27 self-directed customers leave micro-management, auto-repeat costs 0, and Quick 3 picks value", () => {
  let state = makeManagement(27);
  const automatic = selfDirectedCustomer("auto", 1);
  const ready = { ...selfDirectedCustomer("ready", 1), selfDirected: false, customerState: CUSTOMER_STATES.READY_TO_BUY, referralReady: false };
  const hot = { id: "hot", name: "พร้อมซื้อ", journey: "recommendation", routinePlan: { quality: "fit", products: [] }, readiness: 90, trust: 80 };
  state = { ...state, month: 2, customers: [automatic, ready], prospects: [hot] };
  const refreshed = parseSavedState(serializeState(state));
  assert.equal(refreshed.missions.some((mission) => mission.targetId === automatic.id && ["care", "reorder"].includes(mission.type)), false);
  const energy = refreshed.energy;
  const repeated = applyAutomaticCustomerCycles(refreshed);
  assert.equal(repeated.energy, energy);
  assert.equal(repeated.economy.lastTransaction.items.length, 1);
  assert.equal(repeated.economy.lastTransaction.items[0].id, ROUTINEX.id);
  const quick = getBestNextActions(repeated);
  assert.ok(quick.some((item) => ["offer", "reorder"].includes(item.type)));
  assert.equal(quick.some((item) => item.type === "create-lead"), false);
});

test("Xcademy is 4×/month, Open House is 1×/month, both cost 2 and batch-impact eligible people", () => {
  let state = makeManagement(30);
  state = { ...state, team: [memberFor(state, 1), memberFor(state, 2)], prospects: [{ id: "p1", name: "อิง", journey: "new", readiness: 60, trust: 40 }], customers: [selfDirectedCustomer("c", 1)] };
  for (let index = 0; index < 4; index += 1) {
    const energy = state.energy;
    state = move(state, EVENTS.RUN_XCADEMY);
    assert.equal(energy - state.energy, 2);
    assert.equal(state.stage, STAGES.XCADEMY_RUNNING);
    state = settle(state);
  }
  const afterFour = state.energy;
  state = move(state, EVENTS.RUN_XCADEMY);
  assert.equal(state.energy, afterFour);
  state = move(state, EVENTS.RUN_OPEN_HOUSE);
  assert.equal(afterFour - state.energy, 2);
  assert.equal(state.stage, STAGES.OPEN_HOUSE_RUNNING);
  assert.ok(state.sceneReport.attended >= 1);
  state = settle(state);
  const afterHouse = state.energy;
  state = move(state, EVENTS.RUN_OPEN_HOUSE);
  assert.equal(state.energy, afterHouse);
});

test("28 forbidden legacy labels are absent from player UI and receipt renders both SKUs", () => {
  const ui = `${file("./game.js")}\n${file("./game-copy.js")}\n${file("./index.html")}`;
  for (const phrase of ["ชวนทำต่อ", "เติบโตและพาทีม", "Good Luck", "Center"]) assert.equal(ui.includes(phrase), false, phrase);
  assert.match(ui, /transaction\.items/);
  assert.match(ui, /Xcademy · ครั้ง/);
  assert.match(ui, /Open House/);
});

test("29–33 TGV is monthly, includes player and every generation, and counts repeats/Xircle/self-use correctly", () => {
  let state = makeManagement(33);
  state = recordSale(state, "sale", "player-new");
  const playerXV = state.economy.personalXV;
  const g1 = { ...memberFor(state, 1), growthMomentum: 1.1, teamSkill: 8, confidence: 90, autonomy: 90 };
  state = { ...state, month: 2, rank: "xlead", team: [g1], monthStats: makeMonthStats() };
  state = simulateTeamCycle(state);
  assert.equal(calculateEconomy(state).tgv, playerXV + state.economy.teamXV);
  assert.ok(state.team.some((member) => member.generation === 2));
  assert.ok(state.team[0].personalXV >= ROUTINEX.xv);
  const first = recordSale(makeManagement(34), "sale", "a");
  const repeat = recordSale(first, "reorder", "a");
  assert.equal(first.economy.lastTransaction.xv, ROUTINEX.xv + XIRCLE.xv);
  assert.equal(repeat.economy.lastTransaction.xv, ROUTINEX.xv);
  const oldTgv = calculateEconomy(state).tgv;
  state = move(state, EVENTS.END_MONTH);
  state = move(state, EVENTS.START_NEXT_MONTH);
  assert.notEqual(state.organization.tgv, oldTgv + state.economy.teamXV);
  assert.equal(state.organization.previousTGV, oldTgv);
});

test("34–38 3M TGV triggers XGEN without reset; Best TGV, Endless and income keep going", () => {
  let state = makeManagement(38);
  state = {
    ...state,
    month: 12,
    rank: "xlead",
    organization: { ...state.organization, tgv: XGEN_TGV_TARGET },
    economy: { ...state.economy, teamXV: XGEN_TGV_TARGET },
    team: [memberFor(state, 1)],
  };
  const teamId = state.team[0].id;
  state = move(state, EVENTS.END_MONTH);
  assert.equal(state.rank, "xgen");
  assert.equal(state.stage, STAGES.XGEN_MILESTONE);
  assert.equal(state.organization.bestTGV, XGEN_TGV_TARGET);
  assert.equal(state.team[0].id, teamId);
  const firstTotal = state.economy.totalIncome;
  assert.equal(state.economy.incomeHistory[0].channel3, Math.round(XGEN_TGV_TARGET * ORGANIZATION_INCOME_RULE.rate));
  state = move(state, EVENTS.START_NEXT_MONTH);
  assert.equal(state.organization.endless, true);
  assert.equal(state.month, 13);
  assert.equal(state.organization.bestTGV, XGEN_TGV_TARGET);
  state = recordSale(state, "sale", "endless-sale");
  state = move(settle(state), EVENTS.END_MONTH);
  assert.ok(state.economy.totalIncome > firstTotal);
  assert.equal(state.organization.xgen, true);
  assert.equal(BREAKAWAY_INCOME_RULE.rate, 0.0175);
});

test("v5 saves migrate in place to v6 economy, customer state and endless organization schema", () => {
  const state = makeManagement(50);
  const legacy = { ...state, version: 5 };
  delete legacy.economy.totalIncome;
  delete legacy.economy.incomeHistory;
  delete legacy.organization.bestTGV;
  const restored = parseSavedState(JSON.stringify(legacy));
  assert.equal(restored.version, 6);
  assert.ok(Array.isArray(restored.economy.incomeHistory));
  assert.equal(restored.economy.totalIncome, restored.economy.receivedIncome);
  assert.equal(restored.organization.bestTGV, 0);
});

function runGoodStrategy(seed) {
  let state = makeManagement(seed);
  state = { ...state, team: [memberFor(state, seed % 17)], milestones: { ...state.milestones, firstG1: true } };
  const checkpoints = {};
  let winMonth = null;
  for (let month = 1; month <= 24; month += 1) {
    if (month <= 3) {
      const customer = selfDirectedCustomer(`${seed}-${month}`, month);
      state = recordSale(state, "sale", customer.id);
      state = { ...state, customers: [...state.customers, customer], monthStats: { ...state.monthStats, newCustomers: state.monthStats.newCustomers + 1, sales: state.monthStats.sales + 1 } };
    }
    for (let index = 0; index < 2 && state.energy >= 1; index += 1) state = move(state, EVENTS.TRAIN_SKILL, { skill: "leadership" });
    for (let index = 0; index < 4 && state.energy >= 2; index += 1) state = settle(move(state, EVENTS.RUN_XCADEMY));
    if (state.energy >= 2) state = settle(move(state, EVENTS.RUN_OPEN_HOUSE));
    const economy = calculateEconomy(state);
    checkpoints[month] = {
      customers: state.customers.length,
      repeats: state.monthStats.reorders,
      income: economy.projectedIncome,
      team: state.team.length,
      xlead: ["xlead", "xgen"].includes(state.rank),
      channel2: economy.channel2,
      tgv: economy.tgv,
      teamActions: state.monthStats.teamActions,
      playerActions: state.monthStats.playerActions.total,
    };
    state = move(state, EVENTS.END_MONTH);
    if (state.stage === STAGES.XGEN_MILESTONE) {
      winMonth = month;
      break;
    }
    state = settle(move(state, EVENTS.START_NEXT_MONTH));
  }
  return { checkpoints, winMonth };
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test("pacing simulation: 500 seeds hit V7 Month 3/6/9/12 and 3M windows without follow-up grind", () => {
  const runs = Array.from({ length: 500 }, (_, index) => runGoodStrategy((index + 1) * 7919));
  assert.equal(runs.length, 500);
  assert.ok(median(runs.map((run) => run.checkpoints[3].customers)) >= 3);
  assert.ok(median(runs.map((run) => run.checkpoints[3].customers)) <= 6);
  assert.ok(median(runs.map((run) => run.checkpoints[3].repeats)) >= 1);
  assert.ok(median(runs.map((run) => run.checkpoints[3].income)) > median(runs.map((run) => run.checkpoints[1].income)));
  assert.ok(median(runs.map((run) => run.checkpoints[6].team)) >= 3);
  assert.ok(median(runs.map((run) => run.checkpoints[6].team)) <= 8);
  assert.ok(median(runs.map((run) => run.checkpoints[6].income)) >= 10000);
  assert.ok(median(runs.map((run) => run.checkpoints[9].team)) >= 12);
  assert.ok(median(runs.map((run) => run.checkpoints[9].team)) <= 20);
  assert.equal(runs.filter((run) => run.checkpoints[9].xlead && run.checkpoints[9].channel2 > 0).length, 500);
  assert.ok(median(runs.map((run) => run.checkpoints[12].teamActions)) > median(runs.map((run) => run.checkpoints[12].playerActions)));
  assert.ok(median(runs.map((run) => run.checkpoints[12].tgv)) > median(runs.map((run) => run.checkpoints[9].tgv)) * 2);
  const wins = runs.map((run) => run.winMonth || 99);
  assert.ok(median(wins) >= 12);
  assert.ok(median(wins) <= 24);
});

test("commercial source rates and Energy semantics are centralized", () => {
  assert.equal(DIRECT_MENTORING_RULE.rate, 0.2);
  assert.equal(ORGANIZATION_INCOME_RULE.rate, 0.05);
  assert.equal(BREAKAWAY_INCOME_RULE.rate, 0.0175);
  assert.equal(ENERGY_COSTS.xcademy, 2);
  assert.equal(ENERGY_COSTS.openHouse, 2);
  assert.equal(MAX_ENERGY, 28);
  assert.equal(getSkillLevel(addSkillXp(makeManagement(), "leadership", 63).skills, "leadership"), 10);
});
