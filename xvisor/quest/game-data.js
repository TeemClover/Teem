import {
  INCOME_RULE,
  PRODUCT_CONFIG,
  TUTORIAL_OFFER,
  getRetailTier,
} from "./game-commercial-config.js";
import { createPerson } from "./game-people.js";
import { buildExam, getQuestion } from "./game-exam.js";

export const SAVE_KEY = "xvisorQuestContinueV4";
export const SAVE_VERSION = 4;
export const MAX_ENERGY = 28;
export const ROUTINEX = TUTORIAL_OFFER;
export { PRODUCT_CONFIG, getRetailTier };

export const STAGES = Object.freeze({
  OPENING: "opening",
  PRE_DAY0_BAND: "pre_day0_band",
  PRE_DAY0_SCALE: "pre_day0_scale",
  PRE_DAY0_SCANNING: "pre_day0_scanning",
  PRE_DAY0_SUMMARY: "pre_day0_summary",
  PRE_MONTAGE: "pre_montage",
  PRE_DAY3_ABCD: "pre_day3_abcd",
  PRE_DAY7_PRACTICE: "pre_day7_practice",
  PRE_DAY14_SCALE: "pre_day14_scale",
  PRE_DAY14_SCANNING: "pre_day14_scanning",
  PRE_DAY14_REVIEW: "pre_day14_review",
  PRE_DAY21_CARE: "pre_day21_care",
  PRE_DAY28_SCALE: "pre_day28_scale",
  PRE_DAY28_SCANNING: "pre_day28_scanning",
  PRE_DAY28_REVIEW: "pre_day28_review",
  EXAM_TRANSIT: "exam_transit",
  EXAM_ACTIVE: "exam_active",
  EXAM_SUMMARY: "exam_summary",
  EXAM_REPAIR: "exam_repair",
  CERTIFICATION_CEREMONY: "certification_ceremony",
  CERTIFIED: "certified",
  M1_EMPTY: "m1_empty",
  M1_PERSON_MET: "m1_person_met",
  M1_DISCOVERY: "m1_discovery",
  M1_BASELINE_INTRO: "m1_baseline_intro",
  M1_BASELINE_SCANNING: "m1_baseline_scanning",
  M1_BASELINE: "m1_baseline",
  M1_ROUTINE: "m1_routine",
  M1_RECOMMENDATION: "m1_recommendation",
  M1_SALE_RECEIPT: "m1_sale_receipt",
  M1_ONBOARDING: "m1_onboarding",
  M1_FOLLOWUP: "m1_followup",
  M1_REVIEW_SCAN: "m1_review_scan",
  M1_REVIEW_SCANNING: "m1_review_scanning",
  M1_REVIEW: "m1_review",
  M1_SUCCESS: "m1_success",
  M1_XVISOR_INTEREST: "m1_xvisor_interest",
  M1_CANDIDATE: "m1_candidate",
  M1_G1: "m1_g1",
  M1_WEEKLY_RUNNING: "m1_weekly_running",
  M1_TEAM_STARTED: "m1_team_started",
  MANAGEMENT: "management",
  MANAGEMENT_ROUTINE: "management_routine",
  MONTH_CLOSED: "month_closed",
  SEASON_REVIEW: "season_review",
});

export const EVENTS = Object.freeze({
  START_PATH: "START_PATH",
  WEAR_BAND: "WEAR_BAND",
  START_SELF_SCALE: "START_SELF_SCALE",
  SELF_SCAN_COMPLETE: "SELF_SCAN_COMPLETE",
  START_MONTAGE: "START_MONTAGE",
  MONTAGE_COMPLETE: "MONTAGE_COMPLETE",
  SELECT_PRACTICE: "SELECT_PRACTICE",
  SUBMIT_PRACTICE: "SUBMIT_PRACTICE",
  REPAIR_PRACTICE: "REPAIR_PRACTICE",
  CONTINUE_PRACTICE: "CONTINUE_PRACTICE",
  START_DAY14_SCALE: "START_DAY14_SCALE",
  DAY14_SCAN_COMPLETE: "DAY14_SCAN_COMPLETE",
  START_DAY28_SCALE: "START_DAY28_SCALE",
  DAY28_SCAN_COMPLETE: "DAY28_SCAN_COMPLETE",
  GO_EXAM: "GO_EXAM",
  EXAM_TRANSIT_COMPLETE: "EXAM_TRANSIT_COMPLETE",
  SELECT_EXAM: "SELECT_EXAM",
  SUBMIT_EXAM: "SUBMIT_EXAM",
  NEXT_EXAM: "NEXT_EXAM",
  START_REPAIRS: "START_REPAIRS",
  REPAIR_EXAM: "REPAIR_EXAM",
  COMPLETE_CERTIFICATION: "COMPLETE_CERTIFICATION",
  CEREMONY_COMPLETE: "CEREMONY_COMPLETE",
  START_MONTH_1: "START_MONTH_1",
  FIND_PERSON: "FIND_PERSON",
  TALK: "TALK",
  REQUEST_CONSENT: "REQUEST_CONSENT",
  START_CUSTOMER_BASELINE: "START_CUSTOMER_BASELINE",
  CUSTOMER_BASELINE_COMPLETE: "CUSTOMER_BASELINE_COMPLETE",
  OPEN_ROUTINE_BUILDER: "OPEN_ROUTINE_BUILDER",
  CHOOSE_ROUTINE: "CHOOSE_ROUTINE",
  MAKE_OFFER: "MAKE_OFFER",
  CLOSE_RECEIPT: "CLOSE_RECEIPT",
  START_ONBOARDING: "START_ONBOARDING",
  FOLLOW_UP_CUSTOMER: "FOLLOW_UP_CUSTOMER",
  START_CUSTOMER_REVIEW: "START_CUSTOMER_REVIEW",
  CUSTOMER_REVIEW_COMPLETE: "CUSTOMER_REVIEW_COMPLETE",
  SAVE_SUCCESS: "SAVE_SUCCESS",
  CONTINUE_CARE: "CONTINUE_CARE",
  EXPLAIN_XVISOR: "EXPLAIN_XVISOR",
  PREPARE_G1: "PREPARE_G1",
  START_WEEKLY: "START_WEEKLY",
  WEEKLY_COMPLETE: "WEEKLY_COMPLETE",
  CREATE_LEAD: "CREATE_LEAD",
  CONSULT_PROSPECT: "CONSULT_PROSPECT",
  BASELINE_PROSPECT: "BASELINE_PROSPECT",
  OPEN_MANAGEMENT_ROUTINE: "OPEN_MANAGEMENT_ROUTINE",
  CHOOSE_MANAGEMENT_ROUTINE: "CHOOSE_MANAGEMENT_ROUTINE",
  OFFER_PROSPECT: "OFFER_PROSPECT",
  CARE_CUSTOMER: "CARE_CUSTOMER",
  REMEASURE_CUSTOMER: "REMEASURE_CUSTOMER",
  REORDER_CUSTOMER: "REORDER_CUSTOMER",
  ASK_REFERRAL: "ASK_REFERRAL",
  RUN_WEEKLY: "RUN_WEEKLY",
  MENTOR_TEAM_MEMBER: "MENTOR_TEAM_MEMBER",
  RUN_MONTHLY_EVENT: "RUN_MONTHLY_EVENT",
  END_MONTH: "END_MONTH",
  START_NEXT_MONTH: "START_NEXT_MONTH",
});

const PRE_STAGES = new Set([
  STAGES.OPENING, STAGES.PRE_DAY0_BAND, STAGES.PRE_DAY0_SCALE,
  STAGES.PRE_DAY0_SCANNING, STAGES.PRE_DAY0_SUMMARY, STAGES.PRE_MONTAGE,
  STAGES.PRE_DAY3_ABCD, STAGES.PRE_DAY7_PRACTICE, STAGES.PRE_DAY14_SCALE,
  STAGES.PRE_DAY14_SCANNING, STAGES.PRE_DAY14_REVIEW, STAGES.PRE_DAY21_CARE,
  STAGES.PRE_DAY28_SCALE, STAGES.PRE_DAY28_SCANNING, STAGES.PRE_DAY28_REVIEW,
]);

const EXAM_STAGES = new Set([
  STAGES.EXAM_TRANSIT, STAGES.EXAM_ACTIVE, STAGES.EXAM_SUMMARY,
  STAGES.EXAM_REPAIR, STAGES.CERTIFICATION_CEREMONY,
]);

const ALLOWED = Object.freeze({
  [STAGES.OPENING]: [EVENTS.START_PATH],
  [STAGES.PRE_DAY0_BAND]: [EVENTS.WEAR_BAND],
  [STAGES.PRE_DAY0_SCALE]: [EVENTS.START_SELF_SCALE],
  [STAGES.PRE_DAY0_SCANNING]: [EVENTS.SELF_SCAN_COMPLETE],
  [STAGES.PRE_DAY0_SUMMARY]: [EVENTS.START_MONTAGE],
  [STAGES.PRE_MONTAGE]: [EVENTS.MONTAGE_COMPLETE],
  [STAGES.PRE_DAY3_ABCD]: [EVENTS.START_MONTAGE],
  [STAGES.PRE_DAY7_PRACTICE]: [EVENTS.SELECT_PRACTICE, EVENTS.SUBMIT_PRACTICE, EVENTS.REPAIR_PRACTICE, EVENTS.CONTINUE_PRACTICE],
  [STAGES.PRE_DAY14_SCALE]: [EVENTS.START_DAY14_SCALE],
  [STAGES.PRE_DAY14_SCANNING]: [EVENTS.DAY14_SCAN_COMPLETE],
  [STAGES.PRE_DAY14_REVIEW]: [EVENTS.START_MONTAGE],
  [STAGES.PRE_DAY21_CARE]: [EVENTS.SELECT_PRACTICE, EVENTS.SUBMIT_PRACTICE, EVENTS.REPAIR_PRACTICE, EVENTS.CONTINUE_PRACTICE],
  [STAGES.PRE_DAY28_SCALE]: [EVENTS.START_DAY28_SCALE],
  [STAGES.PRE_DAY28_SCANNING]: [EVENTS.DAY28_SCAN_COMPLETE],
  [STAGES.PRE_DAY28_REVIEW]: [EVENTS.GO_EXAM],
  [STAGES.EXAM_TRANSIT]: [EVENTS.EXAM_TRANSIT_COMPLETE],
  [STAGES.EXAM_ACTIVE]: [EVENTS.SELECT_EXAM, EVENTS.SUBMIT_EXAM, EVENTS.NEXT_EXAM],
  [STAGES.EXAM_SUMMARY]: [EVENTS.START_REPAIRS, EVENTS.COMPLETE_CERTIFICATION],
  [STAGES.EXAM_REPAIR]: [EVENTS.SELECT_EXAM, EVENTS.SUBMIT_EXAM, EVENTS.NEXT_EXAM, EVENTS.REPAIR_EXAM],
  [STAGES.CERTIFICATION_CEREMONY]: [EVENTS.CEREMONY_COMPLETE],
  [STAGES.CERTIFIED]: [EVENTS.START_MONTH_1],
  [STAGES.M1_EMPTY]: [EVENTS.FIND_PERSON],
  [STAGES.M1_PERSON_MET]: [EVENTS.TALK],
  [STAGES.M1_DISCOVERY]: [EVENTS.REQUEST_CONSENT],
  [STAGES.M1_BASELINE_INTRO]: [EVENTS.START_CUSTOMER_BASELINE],
  [STAGES.M1_BASELINE_SCANNING]: [EVENTS.CUSTOMER_BASELINE_COMPLETE],
  [STAGES.M1_BASELINE]: [EVENTS.OPEN_ROUTINE_BUILDER],
  [STAGES.M1_ROUTINE]: [EVENTS.CHOOSE_ROUTINE],
  [STAGES.M1_RECOMMENDATION]: [EVENTS.MAKE_OFFER],
  [STAGES.M1_SALE_RECEIPT]: [EVENTS.CLOSE_RECEIPT],
  [STAGES.M1_ONBOARDING]: [EVENTS.START_ONBOARDING],
  [STAGES.M1_FOLLOWUP]: [EVENTS.FOLLOW_UP_CUSTOMER],
  [STAGES.M1_REVIEW_SCAN]: [EVENTS.START_CUSTOMER_REVIEW],
  [STAGES.M1_REVIEW_SCANNING]: [EVENTS.CUSTOMER_REVIEW_COMPLETE],
  [STAGES.M1_REVIEW]: [EVENTS.SAVE_SUCCESS],
  [STAGES.M1_SUCCESS]: [EVENTS.CONTINUE_CARE],
  [STAGES.M1_XVISOR_INTEREST]: [EVENTS.EXPLAIN_XVISOR],
  [STAGES.M1_CANDIDATE]: [EVENTS.PREPARE_G1],
  [STAGES.M1_G1]: [EVENTS.START_WEEKLY],
  [STAGES.M1_WEEKLY_RUNNING]: [EVENTS.WEEKLY_COMPLETE],
  [STAGES.M1_TEAM_STARTED]: [EVENTS.END_MONTH],
  [STAGES.MANAGEMENT]: [
    EVENTS.CREATE_LEAD, EVENTS.CONSULT_PROSPECT, EVENTS.BASELINE_PROSPECT,
    EVENTS.OPEN_MANAGEMENT_ROUTINE, EVENTS.OFFER_PROSPECT, EVENTS.CARE_CUSTOMER,
    EVENTS.REMEASURE_CUSTOMER, EVENTS.REORDER_CUSTOMER, EVENTS.ASK_REFERRAL,
    EVENTS.RUN_WEEKLY, EVENTS.MENTOR_TEAM_MEMBER, EVENTS.RUN_MONTHLY_EVENT,
    EVENTS.END_MONTH,
  ],
  [STAGES.MANAGEMENT_ROUTINE]: [EVENTS.CHOOSE_MANAGEMENT_ROUTINE],
  [STAGES.MONTH_CLOSED]: [EVENTS.START_NEXT_MONTH],
  [STAGES.SEASON_REVIEW]: [],
});

const LEAD_COST = Object.freeze({ relationship: 2, referral: 1, creator: 3, company: 1, event: 0 });

export function energyAtDay(day) {
  return Math.min(MAX_ENERGY, Math.max(0, Math.floor(Number(day || 0))));
}

function makeMonthStats() {
  return {
    newPeople: 0, sales: 0, reorders: 0, customersCared: 0,
    successCases: 0, teamActivity: 0, weeklyDone: false, eventDone: false,
  };
}

export function makeInitialState(options = {}) {
  const seed = Number(options.seed ?? Date.now()) >>> 0 || 1;
  return {
    version: SAVE_VERSION,
    stage: STAGES.OPENING,
    phase: "preseason",
    month: 0,
    energy: 0,
    rank: "candidate",
    soundOn: true,
    rngSeed: seed,
    nextPersonId: 1,
    usedNames: [],
    selectedPersonId: null,
    tutorialSeen: {},
    preseason: {
      day: 0,
      montageTarget: null,
      selectedPractice: null,
      practiceFeedback: null,
      productKnowledge: {
        gus: false, proteinHmb: false, vitaMatrix: false,
        astaMega: false, control: false,
      },
    },
    exam: null,
    prospects: [],
    customers: [],
    team: [],
    missions: [],
    economy: { sets: 0, productSales: 0, personalXV: 0, receivedIncome: 0, lastTransaction: null },
    monthStats: makeMonthStats(),
    monthSummaries: [],
    milestones: {
      certified: false, firstSale: false, firstResult: false, firstG1: false,
      firstWeekly: false, firstTeamCustomer: false, firstTeamSale: false,
    },
    lastEvent: null,
    lastMessage: null,
    updatedAt: Date.now(),
  };
}

function withStage(state, stage, event, extra = {}) {
  return { ...state, ...extra, stage, lastEvent: event, updatedAt: Date.now() };
}

function spendEnergy(state, amount) {
  const cost = Math.max(0, Number(amount || 0));
  if (state.month < 1 || state.energy < cost) return null;
  return { ...state, energy: Math.max(0, state.energy - cost) };
}

function updatePerson(list, id, updater) {
  return list.map((person) => person.id === id ? updater(person) : person);
}

function currentExamQuestion(state) {
  if (!state.exam) return null;
  const id = state.stage === STAGES.EXAM_REPAIR
    ? state.exam.repairQueue[state.exam.repairIndex]
    : state.exam.questions[state.exam.index];
  return getQuestion(id);
}

function currentPractice(stage) {
  return stage === STAGES.PRE_DAY7_PRACTICE
    ? { correct: "context", id: "day7" }
    : { correct: "ask_context", id: "day21" };
}

function productsForPlan(person, planId) {
  if (planId === "control") return [];
  if (planId === "all") return ["gus", "protein-hmb", "vita-matrix", "astamega"];
  return [...(person.fitProducts || [])];
}

function planQuality(person, planId) {
  if (planId === "all") return "poor";
  if (planId === "control") return (person.fitProducts || []).length === 0 ? "fit" : "neutral";
  return "fit";
}

function applyRoutine(person, planId) {
  const quality = planQuality(person, planId);
  return {
    ...person,
    journey: quality === "poor" ? person.journey : "recommendation",
    status: quality === "poor" ? "แผนยังเยอะเกินไป" : "พร้อมคุยเรื่องแผน",
    trust: Math.max(0, person.trust + (quality === "fit" ? 10 : quality === "poor" ? -12 : 2)),
    routinePlan: { id: planId, quality, products: productsForPlan(person, planId), includesControl: true },
  };
}

function addPerson(state, source, tutorial = false) {
  const created = createPerson({
    seed: state.rngSeed,
    usedNames: state.usedNames,
    source,
    index: state.nextPersonId,
    tutorial,
  });
  return {
    state: {
      ...state,
      rngSeed: created.nextSeed,
      nextPersonId: state.nextPersonId + 1,
      usedNames: [...state.usedNames, created.person.name],
    },
    person: created.person,
  };
}

export function calculateEconomy(state) {
  const personalXV = Math.max(0, Number(state.economy?.personalXV || 0));
  const productSales = Math.max(0, Number(state.economy?.productSales || 0));
  const tier = getRetailTier(personalXV);
  const activeRetail = Math.round(personalXV * tier.rate);
  return {
    productSales, personalXV, tier, activeRetail, mentoring: 0,
    projectedIncome: activeRetail,
    receivedIncome: Math.max(0, Number(state.economy?.receivedIncome || 0)),
    status: INCOME_RULE.status,
  };
}

function recordSale(state, kind, customerId) {
  const before = calculateEconomy(state);
  const economy = {
    ...state.economy,
    sets: state.economy.sets + 1,
    productSales: state.economy.productSales + TUTORIAL_OFFER.price,
    personalXV: state.economy.personalXV + TUTORIAL_OFFER.xv,
  };
  const next = { ...state, economy };
  const after = calculateEconomy(next);
  const transaction = {
    id: `${state.month}-${kind}-${state.economy.sets + 1}-${customerId}`,
    kind,
    customerId,
    offerId: TUTORIAL_OFFER.id,
    price: TUTORIAL_OFFER.price,
    xv: TUTORIAL_OFFER.xv,
    status: TUTORIAL_OFFER.status,
    incomeBefore: before.projectedIncome,
    incomeAfter: after.projectedIncome,
    incomeDelta: after.projectedIncome - before.projectedIncome,
  };
  return { ...next, economy: { ...economy, lastTransaction: transaction } };
}

function makeMission(type, targetId, label) {
  return { id: `${type}-${targetId}`, type, targetId, label, completed: false };
}

function completeMission(state, type, targetId) {
  return {
    ...state,
    missions: state.missions.map((mission) => (
      mission.type === type && mission.targetId === targetId
        ? { ...mission, completed: true }
        : mission
    )),
  };
}

export function refreshMissions(state) {
  if (state.month < 2) return state;
  const missions = [];
  state.customers.forEach((customer) => {
    if (customer.day < 28) missions.push(makeMission("care", customer.id, `${customer.name} · ถึงเวลาติดตาม`));
    else if (!customer.measuredAgain) missions.push(makeMission("remeasure", customer.id, `${customer.name} · ถึงเวลาวัดซ้ำ`));
    else missions.push(makeMission("reorder", customer.id, `${customer.name} · ทบทวนว่าจะทำรอบต่อไปไหม`));
    if (customer.referralReady && !customer.referralAsked) missions.push(makeMission("referral", customer.id, `${customer.name} · พร้อมแนะนำคนที่อยากเริ่ม`));
  });
  state.prospects.forEach((person) => {
    if (["new", "conversation"].includes(person.journey)) missions.push(makeMission("consult", person.id, `${person.name} · เริ่มจากฟังบริบท`));
    if (person.journey === "discovery") missions.push(makeMission("baseline", person.id, `${person.name} · ขอ consent แล้วดู Baseline`));
    if (person.journey === "baseline") missions.push(makeMission("routine", person.id, `${person.name} · วาง Routine จากข้อมูล`));
    if (person.journey === "recommendation") missions.push(makeMission("offer", person.id, `${person.name} · คุยแผนที่เหมาะสม`));
  });
  state.team.filter((member) => member.active && member.customers === 0).forEach((member) => {
    missions.push(makeMission("mentor", member.id, `${member.name} · ยังไม่มีลูกค้าคนแรก`));
  });
  return { ...state, missions: missions.slice(0, 6) };
}

function evaluateCustomer(customer) {
  if (customer.followups >= 2 && customer.adherence >= 68) return "ดีขึ้น";
  if (customer.followups >= 1 && customer.adherence >= 50) return "mixed";
  if (customer.followups === 0) return "หลุด";
  return "ยังไม่ชัด";
}

function closeMonth(state, event) {
  const economy = calculateEconomy(state);
  const summary = {
    month: state.month,
    ...state.monthStats,
    xv: economy.personalXV,
    projectedIncome: economy.projectedIncome,
    receivedIncome: economy.projectedIncome,
    customers: state.customers.length,
    team: state.team.length,
  };
  return withStage({
    ...state,
    economy: { ...state.economy, receivedIncome: state.economy.receivedIncome + economy.projectedIncome },
    monthSummaries: [...state.monthSummaries, summary],
  }, STAGES.MONTH_CLOSED, event);
}

export function isPreseasonStage(stage) {
  return PRE_STAGES.has(stage);
}

export function isExamStage(stage) {
  return EXAM_STAGES.has(stage);
}

export function canDispatch(state, event) {
  return Boolean(ALLOWED[state.stage]?.includes(event));
}

export function reduceGame(currentState, event, payload = {}) {
  if (!canDispatch(currentState, event)) return currentState;
  let state = { ...currentState, lastMessage: null };

  switch (event) {
    case EVENTS.START_PATH:
      return withStage(state, STAGES.PRE_DAY0_BAND, event, { phase: "preseason", energy: 0 });
    case EVENTS.WEAR_BAND:
      return withStage(state, STAGES.PRE_DAY0_SCALE, event);
    case EVENTS.START_SELF_SCALE:
      return withStage(state, STAGES.PRE_DAY0_SCANNING, event);
    case EVENTS.SELF_SCAN_COMPLETE:
      return withStage(state, STAGES.PRE_DAY0_SUMMARY, event);
    case EVENTS.START_MONTAGE: {
      const targetByStage = {
        [STAGES.PRE_DAY0_SUMMARY]: 3,
        [STAGES.PRE_DAY3_ABCD]: 7,
        [STAGES.PRE_DAY14_REVIEW]: 21,
      };
      const target = payload.targetDay || targetByStage[state.stage];
      if (!target) return state;
      return withStage({
        ...state,
        preseason: { ...state.preseason, montageTarget: target, selectedPractice: null, practiceFeedback: null },
      }, STAGES.PRE_MONTAGE, event);
    }
    case EVENTS.MONTAGE_COMPLETE: {
      const day = energyAtDay(state.preseason.montageTarget);
      const knowledge = { ...state.preseason.productKnowledge };
      if (day >= 3) { knowledge.gus = true; knowledge.control = true; }
      if (day >= 7) knowledge.proteinHmb = true;
      if (day >= 14) knowledge.vitaMatrix = true;
      if (day >= 21) knowledge.astaMega = true;
      const nextStage = day === 3
        ? STAGES.PRE_DAY3_ABCD
        : day === 7
          ? STAGES.PRE_DAY7_PRACTICE
          : day === 14
            ? STAGES.PRE_DAY14_SCALE
            : day === 21
              ? STAGES.PRE_DAY21_CARE
              : STAGES.PRE_DAY28_SCALE;
      return withStage({
        ...state,
        energy: day,
        preseason: { ...state.preseason, day, montageTarget: null, productKnowledge: knowledge },
      }, nextStage, event);
    }
    case EVENTS.SELECT_PRACTICE:
      return { ...state, preseason: { ...state.preseason, selectedPractice: payload.answer, practiceFeedback: null }, lastEvent: event, updatedAt: Date.now() };
    case EVENTS.SUBMIT_PRACTICE: {
      if (!state.preseason.selectedPractice) return state;
      const correct = state.preseason.selectedPractice === currentPractice(state.stage).correct;
      return { ...state, preseason: { ...state.preseason, practiceFeedback: correct ? "correct" : "wrong" }, lastEvent: correct ? `${event}_CORRECT` : `${event}_WRONG`, updatedAt: Date.now() };
    }
    case EVENTS.REPAIR_PRACTICE:
      return { ...state, preseason: { ...state.preseason, selectedPractice: null, practiceFeedback: null }, lastEvent: event, updatedAt: Date.now() };
    case EVENTS.CONTINUE_PRACTICE: {
      if (state.preseason.practiceFeedback !== "correct") return state;
      const targetDay = state.stage === STAGES.PRE_DAY7_PRACTICE ? 14 : 28;
      return withStage({ ...state, preseason: { ...state.preseason, montageTarget: targetDay, selectedPractice: null, practiceFeedback: null } }, STAGES.PRE_MONTAGE, event);
    }
    case EVENTS.START_DAY14_SCALE:
      return withStage(state, STAGES.PRE_DAY14_SCANNING, event);
    case EVENTS.DAY14_SCAN_COMPLETE:
      return withStage(state, STAGES.PRE_DAY14_REVIEW, event);
    case EVENTS.START_DAY28_SCALE:
      return withStage(state, STAGES.PRE_DAY28_SCANNING, event);
    case EVENTS.DAY28_SCAN_COMPLETE:
      return withStage(state, STAGES.PRE_DAY28_REVIEW, event);
    case EVENTS.GO_EXAM: {
      const built = buildExam(state.rngSeed);
      return withStage({
        ...state,
        rngSeed: built.nextSeed,
        exam: { questions: built.questions, index: 0, selected: null, feedback: null, results: {}, repairQueue: [], repairIndex: 0, mode: "first" },
      }, STAGES.EXAM_TRANSIT, event, { phase: "certification" });
    }
    case EVENTS.EXAM_TRANSIT_COMPLETE:
      return withStage(state, STAGES.EXAM_ACTIVE, event);
    case EVENTS.SELECT_EXAM:
      if (state.exam.feedback) return state;
      return { ...state, exam: { ...state.exam, selected: payload.answer }, lastEvent: event, updatedAt: Date.now() };
    case EVENTS.SUBMIT_EXAM: {
      if (!state.exam.selected || state.exam.feedback) return state;
      const question = currentExamQuestion(state);
      const correct = state.exam.selected === question.correct;
      return {
        ...state,
        exam: { ...state.exam, feedback: correct ? "correct" : "wrong", results: { ...state.exam.results, [question.id]: correct } },
        lastEvent: correct ? `${event}_CORRECT` : `${event}_WRONG`,
        updatedAt: Date.now(),
      };
    }
    case EVENTS.NEXT_EXAM: {
      if (!state.exam.feedback) return state;
      if (state.stage === STAGES.EXAM_REPAIR) {
        if (state.exam.feedback !== "correct") return state;
        const nextRepair = state.exam.repairIndex + 1;
        if (nextRepair >= state.exam.repairQueue.length) {
          return withStage({ ...state, exam: { ...state.exam, selected: null, feedback: null, repairIndex: nextRepair } }, STAGES.EXAM_SUMMARY, event);
        }
        return { ...state, exam: { ...state.exam, repairIndex: nextRepair, selected: null, feedback: null }, lastEvent: event, updatedAt: Date.now() };
      }
      const nextIndex = state.exam.index + 1;
      if (nextIndex >= state.exam.questions.length) {
        const repairQueue = state.exam.questions.filter((id) => state.exam.results[id] !== true);
        return withStage({ ...state, exam: { ...state.exam, selected: null, feedback: null, repairQueue, repairIndex: 0 } }, STAGES.EXAM_SUMMARY, event);
      }
      return { ...state, exam: { ...state.exam, index: nextIndex, selected: null, feedback: null }, lastEvent: event, updatedAt: Date.now() };
    }
    case EVENTS.START_REPAIRS:
      if (!state.exam.repairQueue.length) return state;
      return withStage({ ...state, exam: { ...state.exam, mode: "repair", repairIndex: 0, selected: null, feedback: null } }, STAGES.EXAM_REPAIR, event);
    case EVENTS.REPAIR_EXAM:
      return { ...state, exam: { ...state.exam, selected: null, feedback: null }, lastEvent: event, updatedAt: Date.now() };
    case EVENTS.COMPLETE_CERTIFICATION: {
      const passed = state.exam.questions.every((id) => state.exam.results[id] === true);
      if (!passed) return state;
      return withStage(state, STAGES.CERTIFICATION_CEREMONY, event);
    }
    case EVENTS.CEREMONY_COMPLETE:
      return withStage({ ...state, rank: "xvisor", energy: MAX_ENERGY, milestones: { ...state.milestones, certified: true } }, STAGES.CERTIFIED, event);
    case EVENTS.START_MONTH_1:
      if (!state.milestones.certified) return state;
      return withStage({ ...state, phase: "month1", month: 1, energy: MAX_ENERGY, customers: [], prospects: [], missions: [], monthStats: makeMonthStats() }, STAGES.M1_EMPTY, event);
    case EVENTS.FIND_PERSON: {
      state = spendEnergy(state, 2);
      if (!state) return currentState;
      const created = addPerson(state, "relationship", true);
      return withStage({
        ...created.state,
        prospects: [created.person],
        selectedPersonId: created.person.id,
        monthStats: { ...state.monthStats, newPeople: state.monthStats.newPeople + 1 },
      }, STAGES.M1_PERSON_MET, event);
    }
    case EVENTS.TALK: {
      state = spendEnergy(state, 2);
      if (!state) return currentState;
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "discovery", status: "เข้าใจเป้าหมายแล้ว", trust: person.trust + 14 })),
      }, STAGES.M1_DISCOVERY, event);
    }
    case EVENTS.REQUEST_CONSENT:
      return withStage({ ...state, prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, consent: true })) }, STAGES.M1_BASELINE_INTRO, event);
    case EVENTS.START_CUSTOMER_BASELINE:
      state = spendEnergy(state, 3);
      return state ? withStage(state, STAGES.M1_BASELINE_SCANNING, event) : currentState;
    case EVENTS.CUSTOMER_BASELINE_COMPLETE:
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "baseline", status: "มี Baseline แล้ว", measured: true, trust: person.trust + 8 })),
      }, STAGES.M1_BASELINE, event);
    case EVENTS.OPEN_ROUTINE_BUILDER:
      return withStage(state, STAGES.M1_ROUTINE, event);
    case EVENTS.CHOOSE_ROUTINE: {
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const updated = applyRoutine(person, payload.planId);
      const next = { ...state, prospects: updatePerson(state.prospects, person.id, () => updated) };
      if (updated.routinePlan.quality === "poor") return { ...next, lastEvent: "ROUTINE_TOO_MUCH", lastMessage: "ต้องใช้ทั้งหมดเลยเหรอ?", updatedAt: Date.now() };
      return withStage(next, STAGES.M1_RECOMMENDATION, event);
    }
    case EVENTS.MAKE_OFFER: {
      state = spendEnergy(state, 1);
      if (!state) return currentState;
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person?.routinePlan || person.routinePlan.quality === "poor") return state;
      state = recordSale(state, "sale", person.id);
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey: "onboarding", status: "พร้อมเริ่ม Routine", activePlan: true, trust: item.trust + 10 })),
        monthStats: { ...state.monthStats, sales: state.monthStats.sales + 1 },
        milestones: { ...state.milestones, firstSale: true },
      }, STAGES.M1_SALE_RECEIPT, event);
    }
    case EVENTS.CLOSE_RECEIPT:
      return withStage(state, STAGES.M1_ONBOARDING, event);
    case EVENTS.START_ONBOARDING:
      state = spendEnergy(state, 1);
      return state ? withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "day7", status: "ถึงเวลาติดตาม", day: 7, adherence: 58 })),
      }, STAGES.M1_FOLLOWUP, event) : currentState;
    case EVENTS.FOLLOW_UP_CUSTOMER:
      state = spendEnergy(state, 2);
      return state ? withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "day28", status: "พร้อมวัดซ้ำ", day: 28, followups: 2, adherence: 78, trust: person.trust + 12 })),
        monthStats: { ...state.monthStats, customersCared: state.monthStats.customersCared + 1 },
      }, STAGES.M1_REVIEW_SCAN, event) : currentState;
    case EVENTS.START_CUSTOMER_REVIEW:
      state = spendEnergy(state, 3);
      return state ? withStage(state, STAGES.M1_REVIEW_SCANNING, event) : currentState;
    case EVENTS.CUSTOMER_REVIEW_COMPLETE:
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "review", status: "เริ่มเห็นแนวโน้ม", measuredAgain: true, result: evaluateCustomer(person) })),
      }, STAGES.M1_REVIEW, event);
    case EVENTS.SAVE_SUCCESS:
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "advocate", status: "ทำต่อและพร้อมบอกต่อ", successCase: true, referralReady: true })),
        monthStats: { ...state.monthStats, successCases: state.monthStats.successCases + 1 },
        milestones: { ...state.milestones, firstResult: true },
      }, STAGES.M1_SUCCESS, event);
    case EVENTS.CONTINUE_CARE:
      return withStage(state, STAGES.M1_XVISOR_INTEREST, event);
    case EVENTS.EXPLAIN_XVISOR:
      return withStage({ ...state, prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, status: "สนใจ X-VISOR" })) }, STAGES.M1_CANDIDATE, event);
    case EVENTS.PREPARE_G1: {
      state = spendEnergy(state, 3);
      if (!state) return currentState;
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const member = {
        id: `member-${person.id}`, name: person.name, appearance: person.appearance,
        active: true, confidence: 42, customers: 0, sales: 0, xv: 0, activity: 0,
        status: "X-VISOR ใหม่ · ลูกค้า 0",
      };
      const customer = { ...person, id: `customer-${person.id}`, status: "ทำ Routine ต่อ", journey: "continue" };
      return withStage({
        ...state,
        prospects: state.prospects.filter((item) => item.id !== person.id),
        customers: [...state.customers, customer],
        team: [...state.team, member],
        selectedPersonId: member.id,
        milestones: { ...state.milestones, firstG1: true },
      }, STAGES.M1_G1, event);
    }
    case EVENTS.START_WEEKLY:
      state = spendEnergy(state, 3);
      return state ? withStage(state, STAGES.M1_WEEKLY_RUNNING, event) : currentState;
    case EVENTS.WEEKLY_COMPLETE:
      return withStage({
        ...state,
        team: state.team.map((member) => member.active ? { ...member, confidence: member.confidence + 12, activity: member.activity + 1, status: "รู้ว่าจะเริ่มคุยกับใครก่อน" } : member),
        monthStats: { ...state.monthStats, weeklyDone: true, teamActivity: state.monthStats.teamActivity + state.team.filter((member) => member.active).length },
        milestones: { ...state.milestones, firstWeekly: true },
      }, STAGES.M1_TEAM_STARTED, event);
    case EVENTS.CREATE_LEAD: {
      const source = payload.source || "relationship";
      if (source === "referral") {
        return { ...state, lastEvent: event, lastMessage: "Referral ต้องมาจากลูกค้าที่มี trust/result พร้อม", updatedAt: Date.now() };
      }
      state = spendEnergy(state, LEAD_COST[source] ?? 2);
      if (!state) return currentState;
      const created = addPerson(state, source, false);
      return refreshMissions({
        ...created.state,
        prospects: [...state.prospects, created.person],
        selectedPersonId: created.person.id,
        monthStats: { ...state.monthStats, newPeople: state.monthStats.newPeople + 1 },
        lastEvent: event,
        lastMessage: `รู้จัก ${created.person.name} จาก ${source}`,
        updatedAt: Date.now(),
      });
    }
    case EVENTS.CONSULT_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person) return state;
      state = spendEnergy(state, 2);
      if (!state) return currentState;
      const journey = person.journey === "new" ? "conversation" : "discovery";
      state = {
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey, status: journey === "discovery" ? "เข้าใจเป้าหมายแล้ว" : "กำลังคุย", trust: item.trust + 10 })),
        selectedPersonId: person.id,
        lastEvent: event,
        lastMessage: journey === "discovery" ? `เข้าใจว่า ${person.name} อยากเปลี่ยนอะไรแล้ว` : `ได้ฟัง ${person.name} มากขึ้น`,
        updatedAt: Date.now(),
      };
      return completeMission(refreshMissions(state), "consult", person.id);
    }
    case EVENTS.BASELINE_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "discovery") return state;
      state = spendEnergy(state, 2);
      if (!state) return currentState;
      return refreshMissions({
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey: "baseline", status: "มี Baseline แล้ว", consent: true, measured: true, trust: item.trust + 8 })),
        selectedPersonId: person.id,
        lastEvent: event,
        lastMessage: `${person.name} อนุญาตให้ดูข้อมูลสรุปแล้ว`,
        updatedAt: Date.now(),
      });
    }
    case EVENTS.OPEN_MANAGEMENT_ROUTINE: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "baseline") return state;
      return withStage({ ...state, selectedPersonId: person.id }, STAGES.MANAGEMENT_ROUTINE, event);
    }
    case EVENTS.CHOOSE_MANAGEMENT_ROUTINE: {
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const updated = applyRoutine(person, payload.planId);
      const next = { ...state, prospects: updatePerson(state.prospects, person.id, () => updated) };
      if (updated.routinePlan.quality === "poor") return { ...next, lastEvent: "ROUTINE_TOO_MUCH", lastMessage: "ต้องใช้ทั้งหมดเลยเหรอ?", updatedAt: Date.now() };
      return withStage(refreshMissions({ ...next, lastMessage: `วาง Routine ให้ ${person.name} แล้ว` }), STAGES.MANAGEMENT, event);
    }
    case EVENTS.OFFER_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person?.routinePlan || person.journey !== "recommendation") return state;
      state = spendEnergy(state, 1);
      if (!state) return currentState;
      const buys = person.routinePlan.quality === "fit" && (person.trust + person.readiness >= 102);
      if (!buys) {
        return refreshMissions({
          ...state,
          prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey: "waiting", status: item.readiness < 50 ? "ยังไม่พร้อม" : "ขอคิดก่อน", nextOfferMonth: state.month + 1 })),
          lastEvent: event,
          lastMessage: `${person.name} ${person.readiness < 50 ? "ยังไม่พร้อม" : "ขอคิดก่อน"} — ความสัมพันธ์ยังอยู่`,
          updatedAt: Date.now(),
        });
      }
      state = recordSale(state, "sale", person.id);
      const customer = { ...person, id: `customer-${person.id}`, journey: "day0", status: "เริ่ม Routine", activePlan: true, day: 0, trust: person.trust + 8 };
      return refreshMissions({
        ...state,
        prospects: state.prospects.filter((item) => item.id !== person.id),
        customers: [...state.customers, customer],
        selectedPersonId: customer.id,
        monthStats: { ...state.monthStats, sales: state.monthStats.sales + 1 },
        lastEvent: event,
        lastMessage: `${person.name} พร้อมเริ่ม Routine`,
        updatedAt: Date.now(),
      });
    }
    case EVENTS.CARE_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer) return state;
      state = spendEnergy(state, 2);
      if (!state) return currentState;
      const checkpoints = [3, 7, 14, 21, 28];
      const nextDay = checkpoints.find((day) => day > customer.day) || 28;
      state = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item, day: nextDay, followups: item.followups + 1,
          adherence: Math.min(92, item.adherence + 9), trust: item.trust + 6,
          status: nextDay >= 28 ? "ครบ 28 วัน · ควรวัดซ้ำ" : `Day ${nextDay} · ทำต่อ`,
        })),
        monthStats: { ...state.monthStats, customersCared: state.monthStats.customersCared + 1 },
        lastEvent: event,
        lastMessage: `ติดตาม ${customer.name} แล้ว และเลือก Next Action ใหม่ร่วมกัน`,
        updatedAt: Date.now(),
      };
      return completeMission(refreshMissions(state), "care", customer.id);
    }
    case EVENTS.REMEASURE_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer || customer.day < 14) return state;
      state = spendEnergy(state, 2);
      if (!state) return currentState;
      const result = evaluateCustomer(customer);
      const success = customer.day >= 28 && result === "ดีขึ้น";
      state = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({ ...item, measuredAgain: true, result, successCase: success, referralReady: success, status: success ? "เห็นแนวโน้มดี · ทำต่อ" : `ผล ${result}` })),
        monthStats: { ...state.monthStats, successCases: state.monthStats.successCases + (success && !customer.successCase ? 1 : 0) },
        lastEvent: event,
        lastMessage: success ? `${customer.name} เริ่มเห็นแนวโน้มดีจากสิ่งที่ทำต่อเนื่อง` : `ผลของ ${customer.name} ยังเป็น ${result} — ต้องดูแลต่อ`,
        updatedAt: Date.now(),
      };
      return completeMission(refreshMissions(state), "remeasure", customer.id);
    }
    case EVENTS.REORDER_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer || customer.day < 28) return state;
      state = spendEnergy(state, 1);
      if (!state) return currentState;
      const ready = customer.followups >= 2 && customer.measuredAgain && customer.trust >= 65 && customer.result !== "หลุด";
      if (!ready) return { ...state, lastEvent: event, lastMessage: `${customer.name} ยังไม่พร้อมซื้อซ้ำ — ดูแลต่อก่อน`, updatedAt: Date.now() };
      state = recordSale(state, "reorder", customer.id);
      return refreshMissions({
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({ ...item, day: 0, measuredAgain: false, followups: 0, status: "เริ่มรอบต่อไป" })),
        monthStats: { ...state.monthStats, reorders: state.monthStats.reorders + 1 },
        lastEvent: event,
        lastMessage: `${customer.name} เลือกทำ Routine ต่อหลังเห็น Trend และได้รับการติดตาม`,
        updatedAt: Date.now(),
      });
    }
    case EVENTS.ASK_REFERRAL: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer?.referralReady || customer.referralAsked) return state;
      state = spendEnergy(state, 1);
      if (!state) return currentState;
      const created = addPerson(state, "referral", false);
      return refreshMissions({
        ...created.state,
        customers: updatePerson(state.customers, customer.id, (item) => ({ ...item, referralAsked: true })),
        prospects: [...state.prospects, created.person],
        selectedPersonId: created.person.id,
        monthStats: { ...state.monthStats, newPeople: state.monthStats.newPeople + 1 },
        lastEvent: event,
        lastMessage: `${customer.name} แนะนำ ${created.person.name} ให้รู้จัก — ยังต้องเริ่มจากการฟัง`,
        updatedAt: Date.now(),
      });
    }
    case EVENTS.RUN_WEEKLY: {
      if (state.monthStats.weeklyDone) return state;
      state = spendEnergy(state, 3);
      if (!state) return currentState;
      const activeCount = state.team.filter((member) => member.active).length;
      return refreshMissions({
        ...state,
        team: state.team.map((member) => member.active ? { ...member, confidence: Math.min(100, member.confidence + 8), activity: member.activity + 1, status: "รู้ว่าจะทำอะไรต่อ" } : member),
        monthStats: { ...state.monthStats, weeklyDone: true, teamActivity: state.monthStats.teamActivity + activeCount },
        lastEvent: event,
        lastMessage: activeCount ? "Weekly จบแล้ว ทีมแต่ละคนมี Next Action" : "ยังไม่มีสมาชิกที่ active ใน Weekly รอบนี้",
        updatedAt: Date.now(),
      });
    }
    case EVENTS.MENTOR_TEAM_MEMBER: {
      const member = state.team.find((item) => item.id === payload.id);
      if (!member?.active) return state;
      state = spendEnergy(state, 2);
      if (!state) return currentState;
      let firstCustomer = false;
      let firstSale = false;
      const team = updatePerson(state.team, member.id, (item) => {
        const confidence = Math.min(100, item.confidence + 12);
        const customers = item.customers === 0 && confidence >= 60 ? 1 : item.customers;
        const sales = item.sales === 0 && confidence >= 78 && customers > 0 ? 1 : item.sales;
        firstCustomer = customers > item.customers;
        firstSale = sales > item.sales;
        return {
          ...item, confidence, customers, sales,
          xv: item.xv + (firstSale ? TUTORIAL_OFFER.xv : 0),
          activity: item.activity + 1,
          status: firstSale ? "ปิดการขายเองครั้งแรก" : firstCustomer ? "ดูแลลูกค้าคนแรกได้เอง" : "กำลังฝึกจากเคสจริง",
        };
      });
      state = {
        ...state,
        team,
        monthStats: { ...state.monthStats, teamActivity: state.monthStats.teamActivity + 1 },
        milestones: { ...state.milestones, firstTeamCustomer: state.milestones.firstTeamCustomer || firstCustomer, firstTeamSale: state.milestones.firstTeamSale || firstSale },
        lastEvent: event,
        lastMessage: firstSale ? `${member.name} ปิดการขายเองครั้งแรก` : firstCustomer ? `${member.name} ดูแลลูกค้าคนแรกได้เอง` : `ช่วย ${member.name} ทบทวนเคสแล้ว`,
        updatedAt: Date.now(),
      };
      return completeMission(refreshMissions(state), "mentor", member.id);
    }
    case EVENTS.RUN_MONTHLY_EVENT: {
      if (state.monthStats.eventDone) return state;
      state = spendEnergy(state, 4);
      if (!state) return currentState;
      const created = addPerson(state, "event", false);
      return refreshMissions({
        ...created.state,
        prospects: [...state.prospects, created.person],
        team: state.team.map((member) => member.active ? { ...member, confidence: Math.min(100, member.confidence + 4) } : member),
        monthStats: { ...state.monthStats, eventDone: true, newPeople: state.monthStats.newPeople + 1 },
        lastEvent: event,
        lastMessage: `Monthly Event ทำให้รู้จัก ${created.person.name} — ยังต้อง consult ก่อนเสมอ`,
        updatedAt: Date.now(),
      });
    }
    case EVENTS.END_MONTH:
      return closeMonth(state, event);
    case EVENTS.START_NEXT_MONTH: {
      if (state.month >= 24) return withStage(state, STAGES.SEASON_REVIEW, event, { phase: "season-review" });
      const nextMonth = state.month + 1;
      const prospects = state.prospects.map((person) => person.journey === "waiting" && person.nextOfferMonth <= nextMonth
        ? { ...person, journey: "discovery", status: "พร้อมคุยต่อ", readiness: Math.min(90, person.readiness + 6) }
        : person);
      let next = {
        ...state,
        phase: "management",
        month: nextMonth,
        energy: MAX_ENERGY,
        prospects,
        economy: { ...state.economy, sets: 0, productSales: 0, personalXV: 0, lastTransaction: null },
        monthStats: makeMonthStats(),
        selectedPersonId: null,
        lastMessage: `เดือน ${nextMonth} เริ่มแล้ว เลือกงานที่สร้างคุณค่ามากที่สุดก่อน`,
      };
      next = refreshMissions(next);
      return withStage(next, STAGES.MANAGEMENT, event);
    }
    default:
      return state;
  }
}

export function serializeState(state) {
  return JSON.stringify({ ...state, version: SAVE_VERSION, updatedAt: Date.now() });
}

export function parseSavedState(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.version !== SAVE_VERSION || !ALLOWED[value.stage]) return null;
    if (!Number.isFinite(value.energy) || value.energy < 0 || value.energy > MAX_ENERGY) return null;
    return value;
  } catch {
    return null;
  }
}

export function getAllowedEvents(stage) {
  return [...(ALLOWED[stage] || [])];
}

export function getCurrentExamQuestion(state) {
  return currentExamQuestion(state);
}

export function getPlanQuality(person, planId) {
  return planQuality(person, planId);
}

export function simulateCustomerOutcome(customer) {
  return evaluateCustomer(customer);
}
