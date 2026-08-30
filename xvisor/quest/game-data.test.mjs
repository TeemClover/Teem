import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENTS,
  MAX_ENERGY,
  PRODUCT_CONFIG,
  ROUTINEX,
  STAGES,
  calculateEconomy,
  energyAtDay,
  getCurrentExamQuestion,
  getPlanQuality,
  getRetailTier,
  makeInitialState,
  parseSavedState,
  reduceGame,
  serializeState,
  simulateCustomerOutcome,
} from "./game-data.js";
import { COMMERCIAL_STATUS, canRenderOfficialCommercialValue } from "./game-commercial-config.js";
import { EXAM_DOMAINS, questionDomains } from "./game-exam.js";
import { APPEARANCES, NAME_POOL, createPerson } from "./game-people.js";
import { getStageContent } from "./game-copy.js";

const move = (state, event, payload) => reduceGame(state, event, payload);

function reachDay28() {
  let state = makeInitialState({ seed: 128 });
  state = move(state, EVENTS.START_PATH);
  state = move(state, EVENTS.WEAR_BAND);
  state = move(state, EVENTS.START_SELF_SCALE);
  state = move(state, EVENTS.SELF_SCAN_COMPLETE);
  state = move(state, EVENTS.START_MONTAGE);
  state = move(state, EVENTS.MONTAGE_COMPLETE);
  state = move(state, EVENTS.START_MONTAGE);
  state = move(state, EVENTS.MONTAGE_COMPLETE);
  state = move(state, EVENTS.SELECT_PRACTICE, { answer: "context" });
  state = move(state, EVENTS.SUBMIT_PRACTICE);
  state = move(state, EVENTS.CONTINUE_PRACTICE);
  state = move(state, EVENTS.MONTAGE_COMPLETE);
  state = move(state, EVENTS.START_DAY14_SCALE);
  state = move(state, EVENTS.DAY14_SCAN_COMPLETE);
  state = move(state, EVENTS.START_MONTAGE);
  state = move(state, EVENTS.MONTAGE_COMPLETE);
  state = move(state, EVENTS.SELECT_PRACTICE, { answer: "ask_context" });
  state = move(state, EVENTS.SUBMIT_PRACTICE);
  state = move(state, EVENTS.CONTINUE_PRACTICE);
  state = move(state, EVENTS.MONTAGE_COMPLETE);
  state = move(state, EVENTS.START_DAY28_SCALE);
  state = move(state, EVENTS.DAY28_SCAN_COMPLETE);
  return state;
}

function reachExam() {
  let state = reachDay28();
  state = move(state, EVENTS.GO_EXAM);
  return move(state, EVENTS.EXAM_TRANSIT_COMPLETE);
}

function answerExam(state, correct = true) {
  const question = getCurrentExamQuestion(state);
  const answer = correct ? question.correct : question.choices.find(([id]) => id !== question.correct)[0];
  state = move(state, EVENTS.SELECT_EXAM, { answer });
  state = move(state, EVENTS.SUBMIT_EXAM);
  return state;
}

function certify() {
  let state = reachExam();
  for (let index = 0; index < 5; index += 1) {
    state = answerExam(state, true);
    state = move(state, EVENTS.NEXT_EXAM);
  }
  state = move(state, EVENTS.COMPLETE_CERTIFICATION);
  return move(state, EVENTS.CEREMONY_COMPLETE);
}

function startMonth1() {
  return move(certify(), EVENTS.START_MONTH_1);
}

function reachTeamStarted(planId = "fit") {
  let state = startMonth1();
  state = move(state, EVENTS.FIND_PERSON);
  state = move(state, EVENTS.TALK);
  state = move(state, EVENTS.REQUEST_CONSENT);
  state = move(state, EVENTS.START_CUSTOMER_BASELINE);
  state = move(state, EVENTS.CUSTOMER_BASELINE_COMPLETE);
  state = move(state, EVENTS.OPEN_ROUTINE_BUILDER);
  state = move(state, EVENTS.CHOOSE_ROUTINE, { planId });
  state = move(state, EVENTS.MAKE_OFFER);
  state = move(state, EVENTS.CLOSE_RECEIPT);
  state = move(state, EVENTS.START_ONBOARDING);
  state = move(state, EVENTS.FOLLOW_UP_CUSTOMER);
  state = move(state, EVENTS.START_CUSTOMER_REVIEW);
  state = move(state, EVENTS.CUSTOMER_REVIEW_COMPLETE);
  state = move(state, EVENTS.SAVE_SUCCESS);
  state = move(state, EVENTS.CONTINUE_CARE);
  state = move(state, EVENTS.EXPLAIN_XVISOR);
  state = move(state, EVENTS.PREPARE_G1);
  state = move(state, EVENTS.START_WEEKLY);
  return move(state, EVENTS.WEEKLY_COMPLETE);
}

function reachMonth2() {
  let state = reachTeamStarted();
  state = move(state, EVENTS.END_MONTH);
  return move(state, EVENTS.START_NEXT_MONTH);
}

test("1. New Game starts at energy 0 / 28", () => {
  const state = makeInitialState({ seed: 1 });
  assert.equal(state.energy, 0);
  assert.equal(MAX_ENERGY, 28);
  assert.equal(state.month, 0);
});

test("2. Day N maps exactly to Energy N", () => {
  for (let day = 0; day <= 28; day += 1) assert.equal(energyAtDay(day), day);
});

test("3. Day 28 reaches energy 28", () => {
  const state = reachDay28();
  assert.equal(state.preseason.day, 28);
  assert.equal(state.energy, 28);
  assert.equal(state.stage, STAGES.PRE_DAY28_REVIEW);
});

test("4. Month 1 remains locked before certification", () => {
  const state = makeInitialState({ seed: 1 });
  assert.strictEqual(move(state, EVENTS.START_MONTH_1), state);
  assert.equal(state.month, 0);
});

test("5. Exam contains one question from each of five domains", () => {
  const state = reachExam();
  assert.equal(state.exam.questions.length, 5);
  assert.deepEqual(new Set(questionDomains(state.exam.questions)), new Set(EXAM_DOMAINS));
});

test("6. Correct answer is not exposed by copy before submit", () => {
  const state = reachExam();
  const question = getCurrentExamQuestion(state);
  const content = getStageContent(state);
  assert.equal(content.quiz.feedback, null);
  assert.equal(Object.hasOwn(content.quiz, "correct"), false);
  assert.equal(JSON.stringify(content).includes(`\"correct\":\"${question.correct}\"`), false);
});

test("7. A wrong exam answer can be repaired", () => {
  let state = reachExam();
  state = answerExam(state, false);
  state = move(state, EVENTS.NEXT_EXAM);
  for (let index = 1; index < 5; index += 1) {
    state = answerExam(state, true);
    state = move(state, EVENTS.NEXT_EXAM);
  }
  assert.equal(state.exam.repairQueue.length, 1);
  state = move(state, EVENTS.START_REPAIRS);
  state = answerExam(state, true);
  state = move(state, EVENTS.NEXT_EXAM);
  assert.equal(Object.values(state.exam.results).every(Boolean), true);
});

test("8. Certification requires all 5 / 5", () => {
  let state = reachExam();
  state = answerExam(state, false);
  state = move(state, EVENTS.NEXT_EXAM);
  for (let index = 1; index < 5; index += 1) {
    state = answerExam(state, true);
    state = move(state, EVENTS.NEXT_EXAM);
  }
  const blocked = move(state, EVENTS.COMPLETE_CERTIFICATION);
  assert.equal(blocked.stage, STAGES.EXAM_SUMMARY);
  assert.equal(state.milestones.certified, false);
});

test("9. Exam uses a dedicated room scene", () => {
  const content = getStageContent(reachExam());
  assert.equal(content.scene, "exam_active");
  assert.match(content.speaker, /Exam Room/);
});

test("10. Certified Month 1 starts with 28 energy and zero customers", () => {
  const state = startMonth1();
  assert.equal(state.energy, 28);
  assert.equal(state.month, 1);
  assert.equal(state.customers.length, 0);
  assert.equal(state.prospects.length, 0);
});

test("11. Month 1 can advance into Month 2 management", () => {
  const state = reachMonth2();
  assert.equal(state.month, 2);
  assert.equal(state.stage, STAGES.MANAGEMENT);
  assert.equal(state.phase, "management");
});

test("12. First G1 is not an ending", () => {
  const state = reachTeamStarted();
  assert.equal(state.milestones.firstG1, true);
  assert.equal(state.stage, STAGES.M1_TEAM_STARTED);
  assert.notEqual(state.stage, STAGES.SEASON_REVIEW);
});

test("13. Every new month resets energy to 28", () => {
  let state = reachMonth2();
  state = { ...state, energy: 3 };
  state = move(state, EVENTS.END_MONTH);
  state = move(state, EVENTS.START_NEXT_MONTH);
  assert.equal(state.month, 3);
  assert.equal(state.energy, 28);
});

test("14. Energy cannot become negative", () => {
  let state = reachMonth2();
  state = { ...state, energy: 0 };
  const next = move(state, EVENTS.CREATE_LEAD, { source: "creator" });
  assert.equal(next.energy, 0);
  assert.equal(next.prospects.length, state.prospects.length);
});

test("15. Random character name and appearance survive save/load", () => {
  let state = startMonth1();
  state = move(state, EVENTS.FIND_PERSON);
  const restored = parseSavedState(serializeState(state));
  assert.equal(restored.prospects[0].name, state.prospects[0].name);
  assert.deepEqual(restored.prospects[0].appearance, state.prospects[0].appearance);
});

test("16. Scale copy explicitly separates Scale from Habit Score and Sleep", () => {
  let state = reachDay28();
  state = { ...state, stage: STAGES.PRE_DAY14_SCANNING };
  assert.match(getStageContent(state).reason, /ไม่ได้สร้าง Habit Score/);
  assert.match(getStageContent(state).reason, /ไม่ได้วัด Sleep/);
});

test("17. Band copy never claims to measure food directly", () => {
  let state = makeInitialState({ seed: 1 });
  state = move(state, EVENTS.START_PATH);
  assert.match(getStageContent(state).dialogue, /ไม่ได้วัดอาหารโดยตรง/);
});

test("18. C · Control has no product and is not for sale", () => {
  assert.equal(PRODUCT_CONFIG.control.status, COMMERCIAL_STATUS.NOT_FOR_SALE);
  assert.equal(PRODUCT_CONFIG.control.price, null);
  assert.equal(PRODUCT_CONFIG.control.xv, null);
});

test("19. Tutorial recommendation can finish with C · Control only", () => {
  let state = startMonth1();
  state = move(state, EVENTS.FIND_PERSON);
  state = move(state, EVENTS.TALK);
  state = move(state, EVENTS.REQUEST_CONSENT);
  state = move(state, EVENTS.START_CUSTOMER_BASELINE);
  state = move(state, EVENTS.CUSTOMER_BASELINE_COMPLETE);
  state = move(state, EVENTS.OPEN_ROUTINE_BUILDER);
  state = move(state, EVENTS.CHOOSE_ROUTINE, { planId: "control" });
  assert.deepEqual(state.prospects[0].routinePlan.products, []);
  state = move(state, EVENTS.MAKE_OFFER);
  assert.equal(state.stage, STAGES.M1_SALE_RECEIPT);
});

test("20. Selecting every product is not a dominant strategy", () => {
  const person = createPerson({ seed: 2, tutorial: true }).person;
  assert.equal(getPlanQuality(person, "all"), "poor");
});

test("21. Four products unlock through lived checkpoints", () => {
  const state = reachDay28();
  const knowledge = state.preseason.productKnowledge;
  assert.equal(knowledge.gus, true);
  assert.equal(knowledge.proteinHmb, true);
  assert.equal(knowledge.vitaMatrix, true);
  assert.equal(knowledge.astaMega, true);
  assert.equal(knowledge.control, true);
});

test("22. Product knowledge state survives save/load", () => {
  const state = reachDay28();
  assert.deepEqual(parseSavedState(serializeState(state)).preseason.productKnowledge, state.preseason.productKnowledge);
});

test("23. TO_CONFIRM commercial values cannot render as official", () => {
  assert.equal(ROUTINEX.status, COMMERCIAL_STATUS.TO_CONFIRM);
  assert.equal(canRenderOfficialCommercialValue(ROUTINEX), false);
  Object.values(PRODUCT_CONFIG).filter((item) => item.id !== "control").forEach((item) => {
    assert.equal(item.status, COMMERCIAL_STATUS.TO_CONFIRM);
    assert.equal(canRenderOfficialCommercialValue(item), false);
  });
});

test("24. Sale receipt income delta is transaction-specific", () => {
  let state = reachTeamStarted();
  const transaction = state.economy.lastTransaction;
  assert.equal(transaction.incomeDelta, transaction.incomeAfter - transaction.incomeBefore);
  assert.equal(transaction.xv, ROUTINEX.xv);
  assert.equal(calculateEconomy(state).projectedIncome, transaction.incomeAfter);
});

test("25. End month moves projected income into received income", () => {
  const before = reachTeamStarted();
  const projected = calculateEconomy(before).projectedIncome;
  const closed = move(before, EVENTS.END_MONTH);
  assert.equal(calculateEconomy(closed).receivedIncome, projected);
  assert.equal(closed.monthSummaries.at(-1).receivedIncome, projected);
});

test("26. Reaching customer Day 28 does not auto-create success", () => {
  assert.notEqual(simulateCustomerOutcome({ day: 28, followups: 0, adherence: 90 }), "ดีขึ้น");
});

test("27. Inactive team members do not generate Weekly activity", () => {
  let state = reachMonth2();
  state = { ...state, team: state.team.map((member) => ({ ...member, active: false })) };
  const beforeActivity = state.monthStats.teamActivity;
  state = move(state, EVENTS.RUN_WEEKLY);
  assert.equal(state.monthStats.teamActivity, beforeActivity);
  assert.equal(state.team[0].activity, 1);
});

test("28. Company-led demand still requires consult and care", () => {
  let state = reachMonth2();
  state = move(state, EVENTS.CREATE_LEAD, { source: "company" });
  const lead = state.prospects.at(-1);
  assert.equal(lead.source, "company");
  assert.equal(lead.journey, "new");
  assert.equal(lead.activePlan, false);
  assert.equal(state.customers.some((customer) => customer.name === lead.name), false);
});

test("29. XOS creates a mission but does not perform it automatically", () => {
  let state = reachMonth2();
  state = move(state, EVENTS.CREATE_LEAD, { source: "relationship" });
  const lead = state.prospects.at(-1);
  assert.equal(state.missions.some((mission) => mission.type === "consult" && mission.targetId === lead.id), true);
  assert.equal(lead.journey, "new");
});

test("30. Save/load supports multiple months", () => {
  let state = reachMonth2();
  state = move(state, EVENTS.END_MONTH);
  state = move(state, EVENTS.START_NEXT_MONTH);
  const restored = parseSavedState(serializeState(state));
  assert.equal(restored.month, 3);
  assert.equal(restored.stage, STAGES.MANAGEMENT);
  assert.equal(restored.monthSummaries.length, 2);
});

test("31. Referral cannot be minted without a trusted customer", () => {
  const state = reachMonth2();
  const count = state.prospects.length;
  const next = move(state, EVENTS.CREATE_LEAD, { source: "referral" });
  assert.equal(next.prospects.length, count);
  assert.match(next.lastMessage, /ต้องมาจากลูกค้า/);
});

test("32. Repeat purchase requires care, remeasurement, trend and trust", () => {
  let state = reachMonth2();
  const id = state.customers[0].id;
  state = { ...state, customers: state.customers.map((customer) => ({ ...customer, day: 28, followups: 0, measuredAgain: true, trust: 80, result: "ดีขึ้น" })) };
  state = move(state, EVENTS.REORDER_CUSTOMER, { id });
  assert.notEqual(state.economy.lastTransaction?.kind, "reorder");
  state = { ...state, customers: state.customers.map((customer) => ({ ...customer, followups: 2 })) };
  state = move(state, EVENTS.REORDER_CUSTOMER, { id });
  assert.equal(state.economy.lastTransaction.kind, "reorder");
});

test("33. Post-tutorial offer can fail without ending the relationship", () => {
  let state = reachMonth2();
  const weak = createPerson({ seed: 4, index: 99 }).person;
  const prospect = { ...weak, id: "weak", journey: "recommendation", trust: 1, readiness: 1, routinePlan: { id: "fit", quality: "fit", products: weak.fitProducts } };
  state = { ...state, prospects: [prospect] };
  state = move(state, EVENTS.OFFER_PROSPECT, { id: "weak" });
  assert.equal(state.prospects[0].journey, "waiting");
  assert.equal(state.prospects[0].status, "ยังไม่พร้อม");
});

test("34. Random pools meet V4 variety minimums without duplicate names", () => {
  assert.ok(NAME_POOL.length >= 30);
  assert.ok(APPEARANCES.length >= 12);
  let seed = 9;
  const usedNames = [];
  for (let index = 1; index <= NAME_POOL.length; index += 1) {
    const created = createPerson({ seed, usedNames, index });
    seed = created.nextSeed;
    assert.equal(usedNames.includes(created.person.name), false);
    usedNames.push(created.person.name);
  }
});

test("35. Product system has four contextual SKUs plus non-sale Control", () => {
  const saleProducts = Object.values(PRODUCT_CONFIG).filter((item) => item.status !== COMMERCIAL_STATUS.NOT_FOR_SALE);
  assert.equal(saleProducts.length, 4);
  assert.deepEqual(new Set(saleProducts.map((item) => item.abcd[0])), new Set(["A", "B", "D"]));
});

test("36. Player-facing action dock never receives more than three actions", () => {
  const states = [makeInitialState({ seed: 1 }), reachDay28(), reachExam(), startMonth1(), reachTeamStarted(), reachMonth2()];
  states.forEach((state) => assert.ok((getStageContent(state).actions || []).length <= 3));
});

test("37. Retail calculation remains centralized in commercial config", () => {
  assert.equal(getRetailTier(0).rate, 0.2);
  assert.equal(getRetailTier(40000).label, "23%");
  assert.equal(getRetailTier(100000).label, "25%");
});
