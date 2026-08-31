import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ENERGY_COSTS, EVENTS, MAX_ENERGY, PRODUCT_CONFIG, ROUTINEX, SAVE_KEY, SAVE_VERSION, STAGES,
  calculateEconomy, canDispatch, energyAtDay, getCurrentExamQuestion, getPlanQuality,
  makeInitialState, parseSavedState, reduceGame, serializeState, simulateCustomerOutcome,
} from "./game-data.js";
import {
  COMMERCIAL_STATUS, DIRECT_MENTORING_RULE, canRenderOfficialCommercialValue,
} from "./game-commercial-config.js";
import { EXAM_DOMAINS, questionDomains } from "./game-exam.js";
import { APPEARANCES, NAME_POOL, createPerson } from "./game-people.js";
import {
  PLAYER_UNLOCKS, SKILL_IDS, addSkillXp, getPlayerLevelFromSkills, getXleadProgress,
  makeTeamMember, simulateTeamCycle,
} from "./game-progression.js";
import { getStageContent } from "./game-copy.js";

const move = (state, event, payload) => reduceGame(state, event, payload);
const file = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const specialStages = new Set([
  STAGES.CONTENT_RUNNING, STAGES.ADS_RUNNING, STAGES.CENTER_RUNNING,
  STAGES.GOOD_LUCK_RUNNING, STAGES.G1_CELEBRATION, STAGES.XLEAD_MILESTONE,
]);

function finishScene(state) {
  return specialStages.has(state.stage) ? move(state, EVENTS.SCENE_COMPLETE) : state;
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
  for (let index = 0; index < 5; index += 1) {
    state = answerExam(state, true);
    state = move(state, EVENTS.NEXT_EXAM);
  }
  return move(move(state, EVENTS.COMPLETE_CERTIFICATION), EVENTS.CEREMONY_COMPLETE);
}

function startMonth1(seed = 128) {
  return move(certify(seed), EVENTS.START_MONTH_1);
}

function finishMonth1(seed = 128) {
  let state = startMonth1(seed);
  for (const event of [EVENTS.FIND_PERSON, EVENTS.TALK, EVENTS.REQUEST_CONSENT, EVENTS.START_CUSTOMER_BASELINE, EVENTS.CUSTOMER_BASELINE_COMPLETE, EVENTS.OPEN_ROUTINE_BUILDER]) state = move(state, event);
  state = move(state, EVENTS.CHOOSE_ROUTINE, { planId: "fit" });
  for (const event of [EVENTS.MAKE_OFFER, EVENTS.CLOSE_RECEIPT, EVENTS.START_ONBOARDING, EVENTS.FOLLOW_UP_CUSTOMER, EVENTS.START_CUSTOMER_REVIEW, EVENTS.CUSTOMER_REVIEW_COMPLETE, EVENTS.SAVE_SUCCESS, EVENTS.CONTINUE_CARE]) state = move(state, event);
  return state;
}

function reachMonth2(seed = 128) {
  return move(move(finishMonth1(seed), EVENTS.END_MONTH), EVENTS.START_NEXT_MONTH);
}

function createCustomer(state, source = "known") {
  const beforeIds = new Set(state.customers.map((person) => person.id));
  state = finishScene(move(state, EVENTS.CREATE_LEAD, { source }));
  const person = state.prospects.at(-1);
  if (!person) return { state, customer: null };
  state = move(state, EVENTS.CONTACT_PROSPECT, { id: person.id });
  let current = state.prospects.find((item) => item.id === person.id);
  if (current?.journey === "scheduled") state = move(state, EVENTS.MEET_PROSPECT, { id: person.id });
  current = state.prospects.find((item) => item.id === person.id);
  if (current?.journey === "conversation") state = move(state, EVENTS.CONSULT_PROSPECT, { id: person.id });
  state = move(state, EVENTS.BASELINE_PROSPECT, { id: person.id });
  state = move(state, EVENTS.OPEN_MANAGEMENT_ROUTINE, { id: person.id });
  state = move(state, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: "fit" });
  state = move(state, EVENTS.OFFER_PROSPECT, { id: person.id });
  if (state.prospects.find((item) => item.id === person.id)?.journey === "waiting") {
    state = move(state, EVENTS.FOLLOW_UP_DECISION, { id: person.id });
    state = move(state, EVENTS.OFFER_PROSPECT, { id: person.id });
  }
  return { state, customer: state.customers.find((item) => !beforeIds.has(item.id)) || null };
}

function careToResult(state, customerId) {
  let customer = state.customers.find((item) => item.id === customerId);
  let guard = 0;
  while (customer && customer.day < 28 && state.energy >= 1 && guard < 8) {
    state = move(state, EVENTS.CARE_CUSTOMER, { id: customerId });
    customer = state.customers.find((item) => item.id === customerId);
    guard += 1;
  }
  if (customer?.day >= 14 && !customer.measuredAgain && state.energy >= 2) state = move(state, EVENTS.REMEASURE_CUSTOMER, { id: customerId });
  return state;
}

const nextMonth = (state) => move(move(state, EVENTS.END_MONTH), EVENTS.START_NEXT_MONTH);
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test("1–5 routing keeps landing and quest separate, with the current resume key", () => {
  const vercel = JSON.parse(file("../../vercel.json"));
  assert.ok(vercel.redirects.some((rule) => rule.source === "/xvisor" && rule.destination === "/xvisor/"));
  assert.equal(vercel.rewrites.some((rule) => ["/xvisor", "/xvisor/"].includes(rule.source) && rule.destination.includes("quest")), false);
  const landing = file("../index.html");
  const quest = file("./index.html");
  assert.match(landing, /href="\/xvisor\/quest\/"/);
  assert.match(landing, /import \{ hasQuestSave \} from "\/xvisor\/quest\/game-save\.js"/);
  assert.doesNotMatch(landing, /xvisorQuestRebootV1/);
  assert.match(quest, /game\.js\?v=5/);
  assert.equal(SAVE_KEY, "xvisorQuestContinueV4");
  assert.equal(SAVE_VERSION, 5);
});

test("6–10 pixel motion keeps feet grounded and celebration jumps one-shot", () => {
  const source = file("./game.js");
  assert.doesNotMatch(source, /176\s*-\s*\(index\s*%\s*2\)/);
  assert.match(source, /scene === "first_g1" && stageAge > 420 && stageAge < 850/);
  assert.match(source, /stageAge > 420 && stageAge < 850[^\n]+Math\.sin/);
  assert.doesNotMatch(source, /first_g1[^\n]+Math\.sin\(\(time/);
  assert.match(source, /state\.team\.slice\(0, 3\)[^\n]+176, member\.appearance/);
  assert.match(source, /progress < 1 \? time \/ 90 : 0/);
  const body = source.slice(source.indexOf("function drawCharacterAtFeet"), source.indexOf("function drawSittingCharacter"));
  assert.match(body, /actualFoot = footY - jump/);
  assert.doesNotMatch(body, /actualFoot = footY[^\n]+breath/);
});

test("PRE-SEASON remains 0→28 with product knowledge and separated Band/Scale", () => {
  const state = reachDay28();
  assert.equal(makeInitialState({ seed: 1 }).energy, 0);
  for (let day = 0; day <= 28; day += 1) assert.equal(energyAtDay(day), day);
  assert.equal(state.energy, 28);
  assert.deepEqual(state.preseason.productKnowledge, { gus: true, proteinHmb: true, vitaMatrix: true, astaMega: true, control: true });
  const copy = file("./game-copy.js");
  assert.match(copy, /Band = สิ่งที่คุณทำ · Scale = สิ่งที่ร่างกายตอบ/);
  assert.match(copy, /ไม่ได้วัดอาหารโดยตรง/);
  assert.match(copy, /Scale ไม่ได้สร้าง Habit Score และไม่ได้วัด Sleep โดยตรง/);
});

test("Exam Room has five domains, hides answers, repairs mistakes, then certifies", () => {
  let state = reachExam();
  assert.equal(state.exam.questions.length, 5);
  assert.deepEqual(new Set(questionDomains(state.exam.questions)), new Set(EXAM_DOMAINS));
  const question = getCurrentExamQuestion(state);
  assert.equal(JSON.stringify(getStageContent(state)).includes(`\"correct\":\"${question.correct}\"`), false);
  state = answerExam(state, false);
  state = move(state, EVENTS.NEXT_EXAM);
  for (let index = 1; index < 5; index += 1) {
    state = answerExam(state, true);
    state = move(state, EVENTS.NEXT_EXAM);
  }
  assert.equal(state.exam.repairQueue.length, 1);
  assert.equal(move(state, EVENTS.COMPLETE_CERTIFICATION).stage, STAGES.EXAM_SUMMARY);
  state = move(state, EVENTS.START_REPAIRS);
  state = move(answerExam(state, true), EVENTS.NEXT_EXAM);
  state = move(move(state, EVENTS.COMPLETE_CERTIFICATION), EVENTS.CEREMONY_COMPLETE);
  assert.equal(state.rank, "xvisor");
  assert.equal(state.energy, 28);
});

test("11–17 energy costs match V5 and zero energy always offers month close", () => {
  assert.equal(ENERGY_COSTS.remoteContact, 1);
  assert.equal(ENERGY_COSTS.followup, 1);
  assert.equal(ENERGY_COSTS.inPerson, 2);
  assert.equal(ENERGY_COSTS.scale, 2);
  assert.equal(ENERGY_COSTS.center, 2);
  assert.equal(ENERGY_COSTS.goodLuck, 3);
  assert.ok(Object.entries(ENERGY_COSTS).every(([id, cost]) => cost <= 2 || id === "goodLuck"));
  let state = move(reachMonth2(), EVENTS.CREATE_LEAD, { source: "known" });
  const person = state.prospects.at(-1);
  const contacted = move(state, EVENTS.CONTACT_PROSPECT, { id: person.id });
  assert.equal(state.energy - contacted.energy, 1);
  const met = move(contacted, EVENTS.MEET_PROSPECT, { id: person.id });
  assert.equal(contacted.energy - met.energy, 2);
  state = { ...met, energy: 0 };
  assert.equal(move(state, EVENTS.CREATE_LEAD, { source: "known" }).energy, 0);
  assert.ok(getStageContent(state).actions.some((item) => item.event === EVENTS.END_MONTH));
});

test("18–23 People UX exposes all people, tabs/search, names, status and Thai XOS", () => {
  const source = file("./game.js");
  const copy = file("./game-copy.js");
  assert.match(source, /ทั้งหมด.*กำลังคุย.*ลูกค้า.*รอติดตาม.*สนใจ X-VISOR.*ทีม/s);
  assert.match(source, /data-people-search/);
  assert.match(source, /ความไว้ใจ/);
  assert.match(source, /<b>แนะนำ:<\/b>/);
  assert.match(source, /data\.missions\.slice\(0, 4\)/);
  assert.match(source, /ดูคนทั้งหมด \$\{data\.peopleCount\} คน/);
  assert.doesNotMatch(source, /\[\["PROSPECTS"/);
  assert.doesNotMatch(source, /\[\["CUSTOMERS"/);
  assert.doesNotMatch(source, /\[\["ENERGY"/);
  assert.doesNotMatch(source, /Relationship|Company-led Demand/);
  assert.ok(getStageContent(reachMonth2()).management.missions.every((mission) => mission.label.includes("·")));
});

test("24–28 four skills save, level, affect gameplay, and unlock player tools", () => {
  let state = reachMonth2();
  assert.deepEqual(Object.keys(state.skills), [...SKILL_IDS]);
  assert.deepEqual(parseSavedState(serializeState(state)).skills, state.skills);
  const customer = { ...state.customers[0], day: 0, measuredAgain: false, followups: 0, selfDirected: false };
  const low = move({ ...state, customers: [customer], energy: 28 }, EVENTS.CARE_CUSTOMER, { id: customer.id });
  const skilled = addSkillXp(state, "care", 42);
  const high = move({ ...skilled, customers: [customer], energy: 28 }, EVENTS.CARE_CUSTOMER, { id: customer.id });
  assert.ok(high.customers[0].day > low.customers[0].day);
  assert.equal(high.customers[0].selfDirected, true);
  let peopleSkilled = addSkillXp(state, "people", 12);
  peopleSkilled = move({ ...peopleSkilled, energy: 28 }, EVENTS.CREATE_LEAD, { source: "known" });
  const lead = peopleSkilled.prospects.at(-1);
  peopleSkilled = move(peopleSkilled, EVENTS.CONTACT_PROSPECT, { id: lead.id });
  assert.equal(peopleSkilled.prospects.find((item) => item.id === lead.id).journey, "discovery");
  assert.ok(getPlayerLevelFromSkills(addSkillXp(state, "knowledge", 20).skills) > getPlayerLevelFromSkills(state.skills));
  assert.equal(PLAYER_UNLOCKS.content, 2);
  assert.equal(PLAYER_UNLOCKS.ads, 4);
});

test("29–34 lead sources exclude Company and all require conversation before Sale", () => {
  let state = reachMonth2(212);
  const count = state.prospects.length;
  state = move(state, EVENTS.CREATE_LEAD, { source: "company" });
  assert.equal(state.prospects.length, count);
  assert.match(state.lastMessage, /ไม่มี Company Lead/);
  state = move(state, EVENTS.CREATE_LEAD, { source: "known" });
  assert.equal(state.prospects.at(-1).source, "known");
  assert.equal(state.prospects.at(-1).journey, "new");
  const referrer = { ...state.customers[0], referralReady: true, referralAsked: false, advocacy: 2 };
  state = move({ ...state, customers: [referrer], energy: 28 }, EVENTS.ASK_REFERRAL, { id: referrer.id });
  assert.equal(state.prospects.filter((person) => person.source === "referral").length, 2);
  state = addSkillXp(state, "knowledge", 20);
  state = move({ ...state, energy: 28 }, EVENTS.CREATE_LEAD, { source: "content" });
  assert.equal(state.stage, STAGES.CONTENT_RUNNING);
  assert.ok(state.prospects.some((person) => person.source === "content" && person.journey === "new"));
  state = addSkillXp(finishScene(state), "people", 20);
  state = move({ ...state, energy: 28 }, EVENTS.CREATE_LEAD, { source: "ads" });
  assert.equal(state.stage, STAGES.ADS_RUNNING);
  assert.ok(state.prospects.filter((person) => person.source === "ads").length >= 2);
  assert.equal(state.customers.some((person) => ["content", "ads"].includes(person.source)), false);
});

test("35–40 Customer→Interest→Xcademy→Case→Certification supports G1 #2 and never ends", () => {
  let state = reachMonth2(303);
  const original = state.customers[0];
  state = move(state, EVENTS.REORDER_CUSTOMER, { id: original.id });
  state = careToResult(state, original.id);
  let customer = state.customers.find((item) => item.id === original.id);
  assert.equal(customer.xvisorInterest, true);
  state = move(state, EVENTS.INVITE_XVISOR, { id: customer.id });
  assert.equal(state.customers.find((item) => item.id === customer.id).xvisorStage, "ready");
  state = move(state, EVENTS.START_CANDIDATE_XCADEMY, { id: customer.id });
  assert.equal(state.customers.find((item) => item.id === customer.id).xvisorStage, "xcademy");
  state = nextMonth(state);
  state = move(state, EVENTS.REVIEW_CANDIDATE, { id: customer.id });
  assert.equal(state.customers.find((item) => item.id === customer.id).xvisorStage, "case");
  state = move(state, EVENTS.CERTIFY_CANDIDATE, { id: customer.id });
  assert.equal(state.stage, STAGES.G1_CELEBRATION);
  assert.equal(state.team.length, 1);
  state = finishScene(state);
  assert.equal(state.stage, STAGES.MANAGEMENT);
  assert.notEqual(state.stage, STAGES.SEASON_REVIEW);
  const second = { ...state.customers[0], id: "customer-second", personId: "person-second", name: "คนที่สอง", xvisorInterest: true, xvisorStage: "case", candidateProgress: 2, candidateStartedMonth: state.month - 1 };
  state = move({ ...state, customers: [...state.customers, second], energy: 28 }, EVENTS.CERTIFY_CANDIDATE, { id: second.id });
  assert.equal(state.team.length, 2);
  assert.equal(state.sceneReport.first, false);
});

test("41–49 team output recurs, grows customers/Sales/Reorders/Referrals, respects inactive and leadership", () => {
  let base = reachMonth2(404);
  const customer = { ...base.customers[0], id: "customer-team", personId: "person-team", name: "พลอย" };
  const member = { ...makeTeamMember(customer, base), confidence: 92, autonomy: 88, teamSkill: 7, customers: 3, activity: 8, centerVisits: 2, goodLuckVisits: 2 };
  base = { ...base, month: 4, team: [member], energy: 28, monthStats: { ...base.monthStats, teamCycleDone: false } };
  const first = simulateTeamCycle(base);
  assert.ok(first.monthStats.teamActions > 0);
  assert.ok(first.team[0].customers >= member.customers);
  assert.ok(first.monthStats.teamSales > 0);
  let recurring = { ...first, month: 5, monthStats: { ...first.monthStats, teamCycleDone: false, teamActions: 0, teamSales: 0, teamReorders: 0, teamReferrals: 0, teamOutput: [] } };
  recurring = simulateTeamCycle(recurring);
  assert.ok(recurring.team[0].activity > first.team[0].activity);
  assert.ok(recurring.team[0].sales > first.team[0].sales);
  recurring = simulateTeamCycle({ ...recurring, month: 6, monthStats: { ...recurring.monthStats, teamCycleDone: false, teamActions: 0, teamSales: 0, teamReorders: 0, teamReferrals: 0, teamOutput: [] } });
  assert.ok(recurring.monthStats.teamReorders > 0);
  assert.ok(recurring.monthStats.teamReferrals > 0);
  const inactive = simulateTeamCycle({ ...base, team: [{ ...member, active: false }] });
  assert.equal(inactive.monthStats.teamActions, 0);
  assert.equal(inactive.team[0].monthlyOutput.actions, 0);
  const low = simulateTeamCycle({ ...base, skills: { ...base.skills, leadership: { xp: 0 } } });
  const high = simulateTeamCycle({ ...base, skills: { ...base.skills, leadership: { xp: 63 } } });
  assert.ok(high.monthStats.teamActions >= low.monthStats.teamActions);
  const pair = { ...base, team: [member, { ...member, id: "member-2", personId: "person-2", name: "โอม" }], monthStats: { ...base.monthStats, centerDone: false, weeklyDone: false } };
  const centered = move(pair, EVENTS.RUN_CENTER);
  assert.equal(centered.stage, STAGES.CENTER_RUNNING);
  assert.ok(centered.team.every((item, index) => item.confidence > pair.team[index].confidence));
  const closed = move(finishScene(centered), EVENTS.END_MONTH);
  assert.equal(closed.monthSummaries.at(-1).leverage.player > 0, true);
  assert.equal(closed.monthSummaries.at(-1).leverage.team >= 0, true);
});

test("Center and Good Luck use V5 costs, multi-person scenes, and Good Luck never mints a Sale", () => {
  let state = reachMonth2(505);
  const a = makeTeamMember({ ...state.customers[0], name: "แพร" }, state);
  const b = { ...a, id: "member-b", personId: "person-b", name: "โอม" };
  state = { ...state, team: [a, b], energy: 28 };
  const centered = move(state, EVENTS.RUN_CENTER);
  assert.equal(state.energy - centered.energy, 2);
  assert.equal(getStageContent(centered).scene, "center_running");
  state = finishScene(centered);
  const salesBefore = state.monthStats.sales + state.monthStats.teamSales;
  const lucky = move(state, EVENTS.RUN_GOOD_LUCK);
  assert.equal(state.energy - lucky.energy, 3);
  assert.equal(getStageContent(lucky).scene, "goodluck_running");
  assert.equal(lucky.monthStats.sales + lucky.monthStats.teamSales, salesBefore);
  assert.ok(lucky.team.every((item, index) => item.confidence > state.team[index].confidence));
});

test("XLEAD has real game criteria and downstream-ready organization data", () => {
  let state = reachMonth2(606);
  state = {
    ...state,
    team: [0, 1, 2].map((index) => ({ ...makeTeamMember({ ...state.customers[0], id: `c-${index}`, personId: `p-${index}`, name: `สมาชิก ${index + 1}` }, state), id: `m-${index}`, personId: `p-${index}` })),
    career: { ...state.career, totalSuccessCases: 2, centers: 2, totalTeamActions: 12 },
    skills: { ...state.skills, leadership: { xp: 12 } },
  };
  const progress = getXleadProgress(state);
  assert.equal(progress.complete, true);
  assert.match(progress.note, /ไม่ใช่เกณฑ์.*อย่างเป็นทางการ/);
  assert.deepEqual(Object.keys(state.organization).sort(), ["generation", "mapUnlocked", "tgv", "totalActivity", "xleads"].sort());
  assert.ok(state.team.every((member) => Object.hasOwn(member, "downstreamXvisors") && Object.hasOwn(member, "leaderReadiness")));
  assert.equal(DIRECT_MENTORING_RULE.status, COMMERCIAL_STATUS.TO_CONFIRM);
});

test("income keeps Sale, XV, projected, received and transaction delta separate", () => {
  const state = finishMonth1(707);
  const transaction = state.economy.lastTransaction;
  assert.equal(transaction.incomeDelta, transaction.incomeAfter - transaction.incomeBefore);
  assert.equal(transaction.xv, ROUTINEX.xv);
  assert.notEqual(transaction.price, transaction.xv);
  const economy = calculateEconomy(state);
  assert.equal(economy.projectedIncome, transaction.incomeAfter);
  const closed = move(state, EVENTS.END_MONTH);
  assert.equal(calculateEconomy(closed).receivedIncome, economy.projectedIncome);
  assert.equal(closed.monthSummaries.at(-1).sources.newSales, 1);
  assert.equal(canRenderOfficialCommercialValue(ROUTINEX), false);
  assert.equal(PRODUCT_CONFIG.control.status, COMMERCIAL_STATUS.NOT_FOR_SALE);
  assert.equal(getPlanQuality({ fitProducts: [] }, "all"), "poor");
});

test("V4 saves migrate in place to V5 skills, team and management schema", () => {
  const v4 = { ...reachMonth2(808), version: 4 };
  delete v4.skills;
  delete v4.career;
  delete v4.organization;
  const restored = parseSavedState(JSON.stringify(v4));
  assert.equal(restored.version, 5);
  assert.deepEqual(Object.keys(restored.skills), [...SKILL_IDS]);
  assert.ok(restored.career && restored.organization && restored.monthStats.energyUse);
});

function runStrategy(seed, strategy) {
  let state = reachMonth2(seed);
  const outcome = { firstCustomer: 1, repeat: null, referral: null, interest: null, firstG1: null };
  const train = { beginner: ["knowledge"], learner: ["knowledge", "people", "care", "leadership"], "sales-heavy": [], "care-heavy": ["care", "care"], "team-builder": ["leadership", "leadership"] }[strategy];
  for (let month = 2; month <= 6; month += 1) {
    for (const skill of train) if (state.energy > 0) state = move(state, EVENTS.TRAIN_SKILL, { skill });
    for (const customer of [...state.customers]) {
      let current = state.customers.find((item) => item.id === customer.id);
      if (current?.referralReady && !current.referralAsked && state.energy >= 1) {
        state = move(state, EVENTS.ASK_REFERRAL, { id: current.id });
        outcome.referral ??= month;
      }
      current = state.customers.find((item) => item.id === customer.id);
      if (current?.day >= 28 && current.measuredAgain && state.energy >= 1) {
        const before = state.monthStats.reorders;
        state = move(state, EVENTS.REORDER_CUSTOMER, { id: current.id });
        if (state.monthStats.reorders > before) outcome.repeat ??= month;
      }
      if (state.energy >= 3) state = careToResult(state, customer.id);
      current = state.customers.find((item) => item.id === customer.id);
      if (current?.xvisorInterest) outcome.interest ??= month;
      if (current?.xvisorInterest && !current.xvisorStage && state.energy >= 2) {
        state = move(state, EVENTS.INVITE_XVISOR, { id: current.id });
        state = move(state, EVENTS.START_CANDIDATE_XCADEMY, { id: current.id });
      } else if (current?.xvisorStage === "xcademy" && current.candidateStartedMonth < month && state.energy >= 2) {
        state = move(state, EVENTS.REVIEW_CANDIDATE, { id: current.id });
        state = move(state, EVENTS.CERTIFY_CANDIDATE, { id: current.id });
        if (state.stage === STAGES.G1_CELEBRATION) { outcome.firstG1 ??= month; state = finishScene(state); }
      } else if (current?.xvisorStage === "case" && current.candidateStartedMonth < month && state.energy >= 1) {
        state = move(state, EVENTS.CERTIFY_CANDIDATE, { id: current.id });
        if (state.stage === STAGES.G1_CELEBRATION) { outcome.firstG1 ??= month; state = finishScene(state); }
      }
    }
    const target = strategy === "sales-heavy" ? month + 1 : month;
    while (state.customers.length < target && state.energy >= 7) {
      const created = createCustomer(state);
      state = created.state;
      if (!created.customer) break;
      if (state.energy >= 3 && strategy !== "sales-heavy") state = careToResult(state, created.customer.id);
    }
    if (month >= 3 && state.energy >= 2 && !state.monthStats.centerDone) state = finishScene(move(state, EVENTS.RUN_CENTER));
    if (month >= 4 && state.energy >= 3 && !state.monthStats.goodLuckDone) state = finishScene(move(state, EVENTS.RUN_GOOD_LUCK));
    if (month < 6) state = nextMonth(state);
  }
  const score = state.customers.length + state.team.length * 3 + state.career.totalSuccessCases * 2 + Math.floor(state.career.totalTeamActions / 3);
  return { ...outcome, team: state.team.length, customers: state.customers.length, score };
}

test("pacing simulation: 500 runs across five strategies reaches the V5 growth window", () => {
  const strategies = ["beginner", "learner", "sales-heavy", "care-heavy", "team-builder"];
  const results = Object.fromEntries(strategies.map((strategy) => [strategy, []]));
  for (const strategy of strategies) for (let seed = 1; seed <= 100; seed += 1) results[strategy].push(runStrategy(seed * 7919, strategy));
  const all = strategies.flatMap((strategy) => results[strategy]);
  assert.equal(all.length, 500);
  assert.equal(median(all.map((result) => result.firstCustomer)), 1);
  assert.ok(median(all.map((result) => result.repeat || 99)) <= 3);
  assert.ok(median(all.map((result) => result.referral || 99)) <= 3);
  assert.ok(median(all.map((result) => result.interest || 99)) <= 3);
  assert.ok([3, 4].includes(median(all.map((result) => result.firstG1 || 99))));
  assert.ok(median(all.map((result) => result.team)) >= 2);
  assert.ok(median(all.map((result) => result.team)) <= 4);
  const salesScore = median(results["sales-heavy"].map((result) => result.score));
  for (const strategy of ["learner", "care-heavy", "team-builder"]) assert.ok(median(results[strategy].map((result) => result.score)) >= salesScore * 0.7, `${strategy} should remain competitive`);
});

test("customer outcomes, random identity and product context remain honest", () => {
  assert.notEqual(simulateCustomerOutcome({ day: 28, followups: 0, adherence: 90 }), "ดีขึ้น");
  assert.ok(NAME_POOL.length >= 24 && APPEARANCES.length >= 12);
  const usedNames = [];
  let seed = 77;
  for (let index = 1; index <= 20; index += 1) {
    const created = createPerson({ seed, usedNames, index });
    assert.equal(usedNames.includes(created.person.name), false);
    usedNames.push(created.person.name);
    seed = created.nextSeed;
  }
  assert.equal(Object.keys(PRODUCT_CONFIG).length, 5);
  assert.equal(PRODUCT_CONFIG.control.price, null);
  assert.equal(canDispatch(reachMonth2(), EVENTS.RUN_WEEKLY), false);
  assert.equal(MAX_ENERGY, 28);
});
