import {
  ADS_GAMEPLAY_CONFIG,
  BREAKAWAY_INCOME_RULE,
  DIRECT_MENTORING_RULE,
  INCOME_RULE,
  ORGANIZATION_INCOME_RULE,
  PRODUCT_CONFIG,
  TUTORIAL_OFFER,
  XIRCLE_STARTER,
  getRetailTier
} from "./game-commercial-config.js";
import { createPerson } from "./game-people.js";
import { buildExam, getQuestion } from "./game-exam.js";
import { LEGACY_SAVE_VERSIONS, SAVE_KEY, SAVE_VERSION } from "./game-save.js";
import {
  SKILL_IDS,
  addSkillXp,
  evaluateXlead,
  getPlayerLevelFromSkills,
  getSkillLevel,
  makeSkills,
  makeTeamMember,
  normalizeSkills,
  simulateTeamCycle
} from "./game-progression.js";
var MAX_ENERGY = 28;
var ROUTINEX = TUTORIAL_OFFER;
var XIRCLE = XIRCLE_STARTER;
var XGEN_TGV_TARGET = 3e6;
var STAGES = Object.freeze({
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
  CONTENT_RUNNING: "content_running",
  ADS_RUNNING: "ads_running",
  XCADEMY_RUNNING: "xcademy_running",
  OPEN_HOUSE_RUNNING: "open_house_running",
  CENTER_RUNNING: "center_running",
  GOOD_LUCK_RUNNING: "good_luck_running",
  G1_CELEBRATION: "g1_celebration",
  XLEAD_MILESTONE: "xlead_milestone",
  XGEN_MILESTONE: "xgen_milestone",
  MONTH_CLOSED: "month_closed",
  SEASON_REVIEW: "season_review"
});
var EVENTS = Object.freeze({
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
  CONTACT_PROSPECT: "CONTACT_PROSPECT",
  MEET_PROSPECT: "MEET_PROSPECT",
  CONSULT_PROSPECT: "CONSULT_PROSPECT",
  BASELINE_PROSPECT: "BASELINE_PROSPECT",
  OPEN_MANAGEMENT_ROUTINE: "OPEN_MANAGEMENT_ROUTINE",
  CHOOSE_MANAGEMENT_ROUTINE: "CHOOSE_MANAGEMENT_ROUTINE",
  OFFER_PROSPECT: "OFFER_PROSPECT",
  CARE_CUSTOMER: "CARE_CUSTOMER",
  REMEASURE_CUSTOMER: "REMEASURE_CUSTOMER",
  REORDER_CUSTOMER: "REORDER_CUSTOMER",
  ASK_REFERRAL: "ASK_REFERRAL",
  FOLLOW_UP_DECISION: "FOLLOW_UP_DECISION",
  TRAIN_SKILL: "TRAIN_SKILL",
  INVITE_XVISOR: "INVITE_XVISOR",
  START_CANDIDATE_XCADEMY: "START_CANDIDATE_XCADEMY",
  REVIEW_CANDIDATE: "REVIEW_CANDIDATE",
  CERTIFY_CANDIDATE: "CERTIFY_CANDIDATE",
  RUN_XCADEMY: "RUN_XCADEMY",
  RUN_OPEN_HOUSE: "RUN_OPEN_HOUSE",
  RUN_CENTER: "RUN_CENTER",
  RUN_GOOD_LUCK: "RUN_GOOD_LUCK",
  REVIEW_TEAM_LEADERS: "REVIEW_TEAM_LEADERS",
  SCENE_COMPLETE: "SCENE_COMPLETE",
  RUN_WEEKLY: "RUN_WEEKLY",
  MENTOR_TEAM_MEMBER: "MENTOR_TEAM_MEMBER",
  RUN_MONTHLY_EVENT: "RUN_MONTHLY_EVENT",
  END_MONTH: "END_MONTH",
  START_NEXT_MONTH: "START_NEXT_MONTH"
});
var PRE_STAGES = /* @__PURE__ */ new Set([
  STAGES.OPENING,
  STAGES.PRE_DAY0_BAND,
  STAGES.PRE_DAY0_SCALE,
  STAGES.PRE_DAY0_SCANNING,
  STAGES.PRE_DAY0_SUMMARY,
  STAGES.PRE_MONTAGE,
  STAGES.PRE_DAY3_ABCD,
  STAGES.PRE_DAY7_PRACTICE,
  STAGES.PRE_DAY14_SCALE,
  STAGES.PRE_DAY14_SCANNING,
  STAGES.PRE_DAY14_REVIEW,
  STAGES.PRE_DAY21_CARE,
  STAGES.PRE_DAY28_SCALE,
  STAGES.PRE_DAY28_SCANNING,
  STAGES.PRE_DAY28_REVIEW
]);
var EXAM_STAGES = /* @__PURE__ */ new Set([
  STAGES.EXAM_TRANSIT,
  STAGES.EXAM_ACTIVE,
  STAGES.EXAM_SUMMARY,
  STAGES.EXAM_REPAIR,
  STAGES.CERTIFICATION_CEREMONY
]);
var ALLOWED = Object.freeze({
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
    EVENTS.CREATE_LEAD,
    EVENTS.CONTACT_PROSPECT,
    EVENTS.MEET_PROSPECT,
    EVENTS.CONSULT_PROSPECT,
    EVENTS.BASELINE_PROSPECT,
    EVENTS.OPEN_MANAGEMENT_ROUTINE,
    EVENTS.OFFER_PROSPECT,
    EVENTS.CARE_CUSTOMER,
    EVENTS.REMEASURE_CUSTOMER,
    EVENTS.REORDER_CUSTOMER,
    EVENTS.ASK_REFERRAL,
    EVENTS.FOLLOW_UP_DECISION,
    EVENTS.TRAIN_SKILL,
    EVENTS.INVITE_XVISOR,
    EVENTS.START_CANDIDATE_XCADEMY,
    EVENTS.REVIEW_CANDIDATE,
    EVENTS.CERTIFY_CANDIDATE,
    EVENTS.RUN_XCADEMY,
    EVENTS.RUN_OPEN_HOUSE,
    EVENTS.RUN_CENTER,
    EVENTS.RUN_GOOD_LUCK,
    EVENTS.REVIEW_TEAM_LEADERS,
    EVENTS.MENTOR_TEAM_MEMBER,
    EVENTS.END_MONTH
  ],
  [STAGES.MANAGEMENT_ROUTINE]: [EVENTS.CHOOSE_MANAGEMENT_ROUTINE],
  [STAGES.CONTENT_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.ADS_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.XCADEMY_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.OPEN_HOUSE_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.CENTER_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.GOOD_LUCK_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.G1_CELEBRATION]: [EVENTS.SCENE_COMPLETE],
  [STAGES.XLEAD_MILESTONE]: [EVENTS.SCENE_COMPLETE],
  [STAGES.XGEN_MILESTONE]: [EVENTS.SCENE_COMPLETE, EVENTS.START_NEXT_MONTH],
  [STAGES.MONTH_CLOSED]: [EVENTS.START_NEXT_MONTH],
  [STAGES.SEASON_REVIEW]: []
});
var LEAD_COST = Object.freeze({ known: 1, relationship: 1, referral: 1, content: 1, creator: 1, ads: 1, event: 0 });
var ENERGY_COSTS = Object.freeze({
  remoteContact: 1,
  followup: 1,
  referral: 1,
  content: 1,
  ads: 1,
  skill: 1,
  candidate: 1,
  offer: 1,
  reorder: 1,
  mentoring: 1,
  inPerson: 2,
  scale: 2,
  consultation: 2,
  onboarding: 2,
  xcademy: 2,
  openHouse: 2,
  center: 2,
  goodLuck: 3
});
var CUSTOMER_STATES = Object.freeze({
  SELF_DIRECTED: "SELF_DIRECTED",
  AUTO_REORDER: "AUTO_REORDER",
  NEEDS_HELP: "NEEDS_HELP",
  COOLDOWN: "COOLDOWN",
  READY_TO_BUY: "READY_TO_BUY",
  READY_TO_REFER: "READY_TO_REFER",
  READY_XVISOR: "READY_XVISOR",
  READY_CERTIFY: "READY_CERTIFY"
});
function energyAtDay(day) {
  return Math.min(MAX_ENERGY, Math.max(0, Math.floor(Number(day || 0))));
}
function makeMonthStats() {
  return {
    newPeople: 0,
    appointments: 0,
    meetings: 0,
    contentLeads: 0,
    adLeads: 0,
    referrals: 0,
    newCustomers: 0,
    sales: 0,
    reorders: 0,
    customersCared: 0,
    remeasures: 0,
    successCases: 0,
    candidates: 0,
    newXvisors: 0,
    teamActivity: 0,
    teamActions: 0,
    teamCustomers: 0,
    teamSales: 0,
    teamReorders: 0,
    teamReferrals: 0,
    teamCandidates: 0,
    teamOutput: [],
    playerActions: { attract: 0, care: 0, learn: 0, team: 0, other: 0, total: 0 },
    energyUse: { attract: 0, care: 0, learn: 0, team: 0, other: 0 },
    skillLevelsGained: 0,
    xcademySessions: 0,
    openHouseDone: false,
    autoReorders: 0,
    autoReferrals: 0,
    teamSelfUse: 0,
    downstreamXvisors: 0,
    centerDone: false,
    goodLuckDone: false,
    teamCycleDone: false,
    weeklyDone: false,
    eventDone: false
  };
}
function makeInitialState(options = {}) {
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
        gus: false,
        proteinHmb: false,
        vitaMatrix: false,
        astaMega: false,
        control: false
      }
    },
    exam: null,
    prospects: [],
    customers: [],
    team: [],
    missions: [],
    skills: makeSkills(),
    playerLevel: 1,
    marketing: { spent: 0, campaigns: 0 },
    career: { xcademies: 0, openHouses: 0, centers: 0, goodLucks: 0, totalTeamActions: 0, totalSuccessCases: 0, xleadAtMonth: null, xgenAtMonth: null },
    organization: {
      generation: 1,
      xleads: [],
      totalActivity: 0,
      tgv: 0,
      bestTGV: 0,
      previousTGV: 0,
      breakawayVolume: 0,
      mapUnlocked: false,
      xgen: false,
      endless: false
    },
    economy: {
      sets: 0,
      productSales: 0,
      personalXV: 0,
      teamProductSales: 0,
      teamXV: 0,
      receivedIncome: 0,
      totalIncome: 0,
      incomeHistory: [],
      lastTransaction: null
    },
    monthStats: makeMonthStats(),
    monthSummaries: [],
    milestones: {
      certified: false,
      firstSale: false,
      firstResult: false,
      firstG1: false,
      firstWeekly: false,
      firstTeamCustomer: false,
      firstTeamSale: false,
      firstXlead: false,
      xgen: false
    },
    lastEvent: null,
    lastMessage: null,
    updatedAt: Date.now()
  };
}
function withStage(state, stage, event, extra = {}) {
  return { ...state, ...extra, stage, lastEvent: event, updatedAt: Date.now() };
}
function spendEnergy(state, amount, category = "other") {
  const cost = Math.max(0, Number(amount || 0));
  if (state.month < 1 || state.energy < cost) return null;
  const energyUse = {
    ...state.monthStats.energyUse,
    [category]: Number(state.monthStats.energyUse?.[category] || 0) + cost
  };
  const playerActions = {
    ...state.monthStats.playerActions,
    [category]: Number(state.monthStats.playerActions?.[category] || 0) + 1,
    total: Number(state.monthStats.playerActions?.total || 0) + 1
  };
  return {
    ...state,
    energy: Math.max(0, state.energy - cost),
    monthStats: { ...state.monthStats, energyUse, playerActions }
  };
}
function updatePerson(list, id, updater) {
  return list.map((person) => person.id === id ? updater(person) : person);
}
function currentExamQuestion(state) {
  if (!state.exam) return null;
  const id = state.stage === STAGES.EXAM_REPAIR ? state.exam.repairQueue[state.exam.repairIndex] : state.exam.questions[state.exam.index];
  return getQuestion(id);
}
function currentPractice(stage) {
  return stage === STAGES.PRE_DAY7_PRACTICE ? { correct: "context", id: "day7" } : { correct: "ask_context", id: "day21" };
}
function productsForPlan(person, planId) {
  if (planId === "control") return [];
  if (planId === "all") return ["gus", "protein-hmb", "vita-matrix", "astamega"];
  return [...person.fitProducts || []];
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
    routinePlan: { id: planId, quality, products: productsForPlan(person, planId), includesControl: true }
  };
}
function addPerson(state, source, tutorial = false) {
  const normalizedSource = source === "relationship" ? "known" : source === "creator" ? "content" : source;
  const created = createPerson({
    seed: state.rngSeed,
    usedNames: state.usedNames,
    source: normalizedSource,
    index: state.nextPersonId,
    tutorial
  });
  const peopleLevel = getSkillLevel(state.skills, "people");
  const warmBonus = normalizedSource === "referral" ? 16 : normalizedSource === "content" ? 7 : normalizedSource === "ads" ? 3 : 0;
  const person = {
    ...created.person,
    trust: created.person.trust + warmBonus + Math.floor(peopleLevel / 3) * 2,
    readiness: Math.min(92, created.person.readiness + warmBonus + Math.floor(peopleLevel / 2)),
    lastContactMonth: state.month
  };
  return {
    state: {
      ...state,
      rngSeed: created.nextSeed,
      nextPersonId: state.nextPersonId + 1,
      usedNames: [...state.usedNames, person.name]
    },
    person
  };
}
function addPeople(state, source, count) {
  let next = state;
  const people = [];
  for (let index = 0; index < count; index += 1) {
    const created = addPerson(next, source, false);
    next = created.state;
    people.push(created.person);
  }
  return { state: next, people };
}
function calculateEconomy(state) {
  const personalXV = Math.max(0, Number(state.economy?.personalXV || 0));
  const productSales = Math.max(0, Number(state.economy?.productSales || state.economy?.personalSalesBaht || 0));
  const tier2 = getRetailTier(productSales);
  const activeRetail = Math.round(productSales * tier2.rate);
  const directG1 = (state.team || []).filter((member) => member.active && member.parentId === "player");
  const mentoringBreakdown = directG1.map((member) => {
    const personalSalesBaht = Math.max(0, Number(member.personalSalesBaht || member.monthlyOutput?.personalSalesBaht || 0));
    const retailTier = getRetailTier(personalSalesBaht);
    const commission = Math.round(personalSalesBaht * retailTier.rate);
    return {
      memberId: member.id,
      name: member.name,
      personalSalesBaht,
      retailTier,
      commission,
      mentorIncome: Math.round(commission * DIRECT_MENTORING_RULE.rate)
    };
  });
  const mentoringUnlocked = ["xlead", "xgen"].includes(state.rank);
  const mentoring = mentoringUnlocked ? mentoringBreakdown.reduce((sum, item) => sum + item.mentorIncome, 0) : 0;
  const teamProductSales = Math.max(0, Number(state.economy?.teamProductSales || 0));
  const teamXV = Math.max(0, Number(state.economy?.teamXV || 0));
  const tgv = Math.max(personalXV + teamXV, Number(state.organization?.tgv || 0));
  const organizationIncome = state.organization?.xgen ? Math.round(tgv * ORGANIZATION_INCOME_RULE.rate) : 0;
  const breakawayVolume = Math.max(0, Number(state.organization?.breakawayVolume || 0));
  const breakawayIncome = breakawayVolume > 0 ? Math.round(breakawayVolume * BREAKAWAY_INCOME_RULE.rate) : 0;
  const projectedIncome = activeRetail + mentoring + organizationIncome + breakawayIncome;
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome ?? state.economy?.receivedIncome ?? 0));
  const currentMonthClosed = Number(state.monthSummaries?.at?.(-1)?.month || -1) === Number(state.month || 0);
  return {
    productSales,
    personalSalesBaht: productSales,
    personalXV,
    tier: tier2,
    activeRetail,
    channel1: activeRetail,
    mentoring,
    channel2: mentoring,
    mentoringUnlocked,
    mentoringBreakdown,
    organizationIncome,
    channel3: organizationIncome,
    breakawayIncome,
    channel4: breakawayIncome,
    breakawayVolume,
    teamProductSales,
    teamXV,
    tgv,
    teamIncome: mentoring + organizationIncome + breakawayIncome,
    projectedIncome,
    monthlyIncome: projectedIncome,
    receivedIncome: totalIncome,
    totalIncome,
    lifetimeIncome: totalIncome + (currentMonthClosed ? 0 : projectedIncome),
    incomeHistory: Array.isArray(state.economy?.incomeHistory) ? state.economy.incomeHistory : [],
    status: INCOME_RULE.status
  };
}
function recordSale(state, kind, customerId) {
  const before = calculateEconomy(state);
  const firstStart = kind !== "reorder";
  const items = firstStart ? [
    { id: XIRCLE_STARTER.id, name: XIRCLE_STARTER.name, price: XIRCLE_STARTER.price, xv: XIRCLE_STARTER.xv, cycle: XIRCLE_STARTER.cycle, status: XIRCLE_STARTER.status },
    { id: TUTORIAL_OFFER.id, name: TUTORIAL_OFFER.name, price: TUTORIAL_OFFER.price, xv: TUTORIAL_OFFER.xv, cycle: TUTORIAL_OFFER.cycle, status: TUTORIAL_OFFER.status }
  ] : [{ id: TUTORIAL_OFFER.id, name: TUTORIAL_OFFER.name, price: TUTORIAL_OFFER.price, xv: TUTORIAL_OFFER.xv, cycle: TUTORIAL_OFFER.cycle, status: TUTORIAL_OFFER.status }];
  const price = items.reduce((sum, item) => sum + item.price, 0);
  const xv = items.reduce((sum, item) => sum + item.xv, 0);
  const economy = {
    ...state.economy,
    sets: state.economy.sets + 1,
    productSales: state.economy.productSales + price,
    personalXV: state.economy.personalXV + xv
  };
  const next = {
    ...state,
    economy,
    organization: { ...state.organization, tgv: Number(state.organization?.tgv || 0) + xv }
  };
  const after = calculateEconomy(next);
  const transaction = {
    id: `${state.month}-${kind}-${state.economy.sets + 1}-${customerId}`,
    kind,
    customerId,
    offerId: firstStart ? "full-start" : TUTORIAL_OFFER.id,
    items,
    price,
    xv,
    status: "SIMULATION",
    incomeBefore: before.projectedIncome,
    incomeAfter: after.projectedIncome,
    incomeDelta: after.projectedIncome - before.projectedIncome
  };
  return { ...next, economy: { ...economy, lastTransaction: transaction } };
}
function makeMission(type, targetId, label) {
  return { id: `${type}-${targetId}`, type, targetId, label, completed: false };
}
function completeMission(state, type, targetId) {
  return {
    ...state,
    missions: state.missions.map((mission) => mission.type === type && mission.targetId === targetId ? { ...mission, completed: true } : mission)
  };
}
function refreshMissions(state) {
  if (state.month < 1 || state.stage === STAGES.M1_EMPTY) return state;
  const missions = [];
  state.customers.forEach((customer) => {
    if (customer.xvisorStage === "ready") missions.push(makeMission("candidate-start", customer.id, `${customer.name} · พร้อมเรียน Xcademy`));
    else if (customer.xvisorStage === "xcademy") missions.push(makeMission("candidate-review", customer.id, `${customer.name} · Review Case เพื่อไปต่อ`));
    else if (customer.xvisorStage === "case") missions.push(makeMission("candidate-certify", customer.id, `${customer.name} · พร้อม Certification`));
    else if (customer.xvisorInterest && !customer.xvisorStage) missions.push(makeMission("xvisor", customer.id, `${customer.name} · เริ่มสนใจ X-VISOR`));
    const customerState = customer.customerState || (customer.selfDirected ? CUSTOMER_STATES.SELF_DIRECTED : CUSTOMER_STATES.NEEDS_HELP);
    const automated = [CUSTOMER_STATES.SELF_DIRECTED, CUSTOMER_STATES.AUTO_REORDER].includes(customerState);
    if (!automated && customerState === CUSTOMER_STATES.READY_TO_BUY) missions.push(makeMission("reorder", customer.id, `${customer.name} · พร้อมต่อ RoutineX เดือนใหม่`));
    else if (!automated && customer.day < 28) missions.push(makeMission("care", customer.id, `${customer.name} · ต้องการความช่วยเหลือ`));
    else if (!automated && customer.day >= 14 && !customer.measuredAgain) missions.push(makeMission("remeasure", customer.id, `${customer.name} · วัดซ้ำแล้วเปลี่ยน Next Action`));
    if (customer.referralReady && !customer.referralAsked) missions.push(makeMission("referral", customer.id, `${customer.name} · พร้อมแนะนำเพื่อน`));
  });
  state.prospects.forEach((person) => {
    if (person.journey === "new") missions.push(makeMission("contact", person.id, `${person.name} · ทักและนัดหมาย`));
    if (person.journey === "scheduled") missions.push(makeMission("meet", person.id, `${person.name} · นัดแล้ว ไปพบเพื่อฟังบริบท`));
    if (person.journey === "conversation") missions.push(makeMission("consult", person.id, `${person.name} · ฟังให้เจอสิ่งที่อยากเปลี่ยน`));
    if (person.journey === "discovery") missions.push(makeMission("baseline", person.id, `${person.name} · ขอ consent แล้วดู Baseline`));
    if (person.journey === "baseline") missions.push(makeMission("routine", person.id, `${person.name} · วาง Routine จากข้อมูล`));
    if (person.journey === "recommendation") missions.push(makeMission("offer", person.id, `${person.name} · พร้อมคุยแผน`));
    if (person.journey === "waiting" && Number(person.nextOfferMonth || 0) <= state.month && Number(person.decisionAttempts || 0) < 2) {
      missions.push(makeMission("decision", person.id, `${person.name} · พร้อมคุยให้รู้ผล`));
    }
  });
  const leadershipTen = getSkillLevel(state.skills, "leadership") >= 10;
  state.team.filter((member) => member.active && !leadershipTen && (member.autonomy < 68 || member.customers === 0)).forEach((member) => {
    missions.push(makeMission("mentor", member.id, `${member.name} · ${member.customers ? "ทบทวนเคสถัดไป" : "พร้อมฝึกลูกค้าคนแรก"}`));
  });
  const priority = { candidate: 0, xvisor: 1, remeasure: 2, care: 3, decision: 4, reorder: 5, referral: 6, meet: 7, contact: 8, baseline: 9, routine: 10, offer: 11, mentor: 12, consult: 13 };
  missions.sort((a, b) => {
    const aKey = a.type.startsWith("candidate") ? "candidate" : a.type;
    const bKey = b.type.startsWith("candidate") ? "candidate" : b.type;
    return (priority[aKey] ?? 99) - (priority[bKey] ?? 99);
  });
  return { ...state, missions };
}
function getBestNextActions(state, limit = 3) {
  if (state.energy <= 0) return [{ type: "end-month", event: EVENTS.END_MONTH, label: "🌙 จบเดือน", cost: 0, score: 1 }];
  const scores = {
    "candidate-certify": 130,
    reorder: 126,
    offer: 124,
    xvisor: 120,
    "candidate-start": 118,
    "candidate-review": 112,
    referral: 104,
    remeasure: 101,
    meet: 98,
    decision: 96,
    baseline: 92,
    routine: 90,
    consult: 88,
    contact: 74,
    care: 70,
    mentor: 68
  };
  const actions = (state.missions || []).filter((mission) => !mission.completed).map((mission) => ({
    type: mission.type,
    mission,
    targetId: mission.targetId,
    label: mission.label,
    score: scores[mission.type] || 50
  }));
  const oppEligible = state.prospects.filter((person) => !["dormant", "cooldown"].includes(person.journey)).length + state.customers.filter((person) => person.xvisorInterest && !person.xvisorStage).length;
  const trainingEligible = state.team.filter((member) => member.active).length + state.customers.filter((person) => ["ready", "xcademy", "case"].includes(person.xvisorStage)).length;
  if (Number(state.monthStats?.xcademySessions || 0) < 4 && oppEligible + trainingEligible >= 2) {
    actions.push({ type: "xcademy", event: EVENTS.RUN_XCADEMY, label: `🎓 Xcademy · ช่วย ${oppEligible + trainingEligible} คน`, cost: 2, score: 116 });
  }
  const openHouseEligible = state.prospects.filter((person) => person.journey !== "dormant").length + state.customers.filter((person) => !person.xvisorStage || person.xvisorStage !== "certified").length;
  if (!state.monthStats?.openHouseDone && openHouseEligible >= 3) {
    actions.push({ type: "open-house", event: EVENTS.RUN_OPEN_HOUSE, label: `🏠 Open House · ชวน ${openHouseEligible} คน`, cost: 2, score: 121 + Math.min(10, openHouseEligible) });
  }
  const hasHighValue = actions.some((item) => item.score >= 100);
  if (!hasHighValue) {
    const source = getPlayerLevelFromSkills(state.skills) >= 2 ? "content" : "known";
    actions.push({ type: "create-lead", event: EVENTS.CREATE_LEAD, payload: { source }, label: source === "content" ? "📣 ทำ Content เติม Pipeline" : "💬 รู้จักคนใหม่", cost: 1, score: 56 });
  }
  const skillNearLevel = SKILL_IDS.find((id) => {
    const before = getSkillLevel(state.skills, id);
    const preview = addSkillXp({ ...state, monthStats: null }, id, 2);
    return before < 10 && getSkillLevel(preview.skills, id) > before;
  });
  if (skillNearLevel) actions.push({ type: "skill", event: EVENTS.TRAIN_SKILL, payload: { skill: skillNearLevel }, label: `⭐ ฝึกอีกครั้งเพื่ออัป ${skillNearLevel}`, cost: 1, score: 94 });
  return actions.sort((a, b) => b.score - a.score).slice(0, Math.max(1, limit));
}
function evaluateCustomer(customer) {
  if (customer.followups >= 2 && customer.adherence >= 68) return "ดีขึ้น";
  if (customer.followups >= 1 && customer.adherence >= 50) return "mixed";
  if (customer.followups === 0) return "หลุด";
  return "ยังไม่ชัด";
}
function applyAutomaticCustomerCycles(state) {
  let next = state;
  let autoReorders = 0;
  let autoReferrals = 0;
  const careLevel = getSkillLevel(state.skills, "care");
  const teamPersonIds = new Set((state.team || []).map((member) => member.personId || member.id));
  const eligible = state.customers.filter((customer) => customer.activePlan && !teamPersonIds.has(customer.personId || customer.id) && customer.lastReorderMonth !== state.month && (customer.selfDirected || customer.successCase || [CUSTOMER_STATES.SELF_DIRECTED, CUSTOMER_STATES.AUTO_REORDER].includes(customer.customerState)));
  eligible.forEach((customer) => {
    next = recordSale(next, "reorder", customer.id);
    autoReorders += 1;
    next = {
      ...next,
      customers: updatePerson(next.customers, customer.id, (item) => ({
        ...item,
        selfDirected: true,
        customerState: CUSTOMER_STATES.AUTO_REORDER,
        lastReorderMonth: state.month,
        status: "✅ ซื้อ RoutineX รอบใหม่เอง"
      }))
    };
  });
  if (careLevel >= 10) {
    const advocates = next.customers.filter((customer) => customer.successCase && !customer.referralAsked).slice(0, 2);
    advocates.forEach((customer) => {
      const created = addPeople(next, "referral", 1);
      next = {
        ...created.state,
        prospects: [...created.state.prospects, ...created.people],
        customers: updatePerson(created.state.customers, customer.id, (item) => ({
          ...item,
          referralAsked: true,
          status: "แนะนำเพื่อนเองแล้ว · ใช้ Routine ต่อ"
        }))
      };
      autoReferrals += 1;
    });
  }
  return refreshMissions({
    ...next,
    monthStats: {
      ...next.monthStats,
      reorders: Number(next.monthStats.reorders || 0) + autoReorders,
      autoReorders: Number(next.monthStats.autoReorders || 0) + autoReorders,
      referrals: Number(next.monthStats.referrals || 0) + autoReferrals,
      autoReferrals: Number(next.monthStats.autoReferrals || 0) + autoReferrals,
      newPeople: Number(next.monthStats.newPeople || 0) + autoReferrals
    }
  });
}
function closeMonth(state, event) {
  const baseEconomy = calculateEconomy(state);
  const reachedXgen = Boolean(state.organization?.xgen) || baseEconomy.tgv >= XGEN_TGV_TARGET;
  const firstXgen = reachedXgen && !state.organization?.xgen;
  const rankedState = reachedXgen ? {
    ...state,
    rank: "xgen",
    organization: { ...state.organization, xgen: true, mapUnlocked: true }
  } : state;
  const economy = calculateEconomy(rankedState);
  const previous = state.monthSummaries.at(-1);
  const income = {
    channel1: economy.channel1,
    channel2: economy.channel2,
    channel3: economy.channel3,
    channel4: economy.channel4,
    total: economy.projectedIncome
  };
  const summary = {
    month: state.month,
    ...state.monthStats,
    xv: economy.personalXV,
    productSales: economy.productSales,
    teamXV: economy.teamXV,
    teamProductSales: economy.teamProductSales,
    tgv: economy.tgv,
    bestTGV: Math.max(Number(state.organization?.bestTGV || 0), economy.tgv),
    income,
    channels: income,
    projectedIncome: economy.projectedIncome,
    receivedIncome: economy.projectedIncome,
    receivedIncomeTotal: economy.receivedIncome + economy.projectedIncome,
    previousIncome: Number(previous?.projectedIncome || 0),
    customers: state.customers.length,
    team: state.team.length,
    xleads: state.team.filter((member) => member.rank === "xlead").length,
    leverage: {
      player: Number(state.monthStats.playerActions?.total || 0),
      team: Number(state.monthStats.teamActions || 0)
    },
    sources: {
      newSales: Number(state.monthStats.sales || 0),
      reorders: Number(state.monthStats.reorders || 0),
      teamSales: Number(state.monthStats.teamSales || 0)
    }
  };
  const incomeSnapshot = { month: state.month, ...income, tgv: economy.tgv };
  const totalIncome = economy.totalIncome + economy.projectedIncome;
  return withStage({
    ...rankedState,
    career: { ...state.career, xgenAtMonth: firstXgen ? state.month : state.career?.xgenAtMonth },
    organization: {
      ...rankedState.organization,
      tgv: economy.tgv,
      previousTGV: economy.tgv,
      bestTGV: Math.max(Number(state.organization?.bestTGV || 0), economy.tgv)
    },
    milestones: { ...state.milestones, xgen: reachedXgen },
    economy: {
      ...state.economy,
      receivedIncome: totalIncome,
      totalIncome,
      incomeHistory: [...state.economy?.incomeHistory || [], incomeSnapshot]
    },
    monthSummaries: [...state.monthSummaries, summary],
    sceneReport: firstXgen ? { kind: "xgen", tgv: economy.tgv, totalIncome } : state.sceneReport
  }, firstXgen ? STAGES.XGEN_MILESTONE : STAGES.MONTH_CLOSED, event);
}
function isPreseasonStage(stage) {
  return PRE_STAGES.has(stage);
}
function isExamStage(stage) {
  return EXAM_STAGES.has(stage);
}
function canDispatch(state, event) {
  return Boolean(ALLOWED[state.stage]?.includes(event));
}
function reduceGame(currentState, event, payload = {}) {
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
        [STAGES.PRE_DAY14_REVIEW]: 21
      };
      const target = payload.targetDay || targetByStage[state.stage];
      if (!target) return state;
      return withStage({
        ...state,
        preseason: { ...state.preseason, montageTarget: target, selectedPractice: null, practiceFeedback: null }
      }, STAGES.PRE_MONTAGE, event);
    }
    case EVENTS.MONTAGE_COMPLETE: {
      const day = energyAtDay(state.preseason.montageTarget);
      const knowledge = { ...state.preseason.productKnowledge };
      if (day >= 3) {
        knowledge.gus = true;
        knowledge.control = true;
      }
      if (day >= 7) knowledge.proteinHmb = true;
      if (day >= 14) knowledge.vitaMatrix = true;
      if (day >= 21) knowledge.astaMega = true;
      const nextStage = day === 3 ? STAGES.PRE_DAY3_ABCD : day === 7 ? STAGES.PRE_DAY7_PRACTICE : day === 14 ? STAGES.PRE_DAY14_SCALE : day === 21 ? STAGES.PRE_DAY21_CARE : STAGES.PRE_DAY28_SCALE;
      return withStage({
        ...state,
        energy: day,
        preseason: { ...state.preseason, day, montageTarget: null, productKnowledge: knowledge }
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
        exam: { questions: built.questions, index: 0, selected: null, feedback: null, results: {}, repairQueue: [], repairIndex: 0, mode: "first" }
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
        updatedAt: Date.now()
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
      state = spendEnergy(state, ENERGY_COSTS.remoteContact, "attract");
      if (!state) return currentState;
      const created = addPerson(state, "known", true);
      return withStage(addSkillXp({
        ...created.state,
        prospects: [created.person],
        selectedPersonId: created.person.id,
        monthStats: { ...state.monthStats, newPeople: state.monthStats.newPeople + 1 }
      }, "people", 1, "first-contact"), STAGES.M1_PERSON_MET, event);
    }
    case EVENTS.TALK: {
      state = spendEnergy(state, ENERGY_COSTS.remoteContact, "attract");
      if (!state) return currentState;
      return withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "discovery", status: "เข้าใจเป้าหมายแล้ว", trust: person.trust + 14 }))
      }, "people", 1, "discovery"), STAGES.M1_DISCOVERY, event);
    }
    case EVENTS.REQUEST_CONSENT:
      return withStage({ ...state, prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, consent: true })) }, STAGES.M1_BASELINE_INTRO, event);
    case EVENTS.START_CUSTOMER_BASELINE:
      state = spendEnergy(state, ENERGY_COSTS.scale, "care");
      return state ? withStage(state, STAGES.M1_BASELINE_SCANNING, event) : currentState;
    case EVENTS.CUSTOMER_BASELINE_COMPLETE:
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "baseline", status: "มี Baseline แล้ว", measured: true, trust: person.trust + 8 }))
      }, STAGES.M1_BASELINE, event);
    case EVENTS.OPEN_ROUTINE_BUILDER:
      return withStage(state, STAGES.M1_ROUTINE, event);
    case EVENTS.CHOOSE_ROUTINE: {
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const updated = applyRoutine(person, payload.planId);
      const next = addSkillXp({ ...state, prospects: updatePerson(state.prospects, person.id, () => updated) }, "knowledge", 1, "routine");
      if (updated.routinePlan.quality === "poor") return { ...next, lastEvent: "ROUTINE_TOO_MUCH", lastMessage: "ต้องใช้ทั้งหมดเลยเหรอ?", updatedAt: Date.now() };
      return withStage(next, STAGES.M1_RECOMMENDATION, event);
    }
    case EVENTS.MAKE_OFFER: {
      state = spendEnergy(state, ENERGY_COSTS.offer, "attract");
      if (!state) return currentState;
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person?.routinePlan || person.routinePlan.quality === "poor") return state;
      state = recordSale(state, "sale", person.id);
      return withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey: "onboarding", status: "พร้อมเริ่ม Routine", activePlan: true, trust: item.trust + 10 })),
        monthStats: { ...state.monthStats, sales: state.monthStats.sales + 1 },
        milestones: { ...state.milestones, firstSale: true }
      }, "knowledge", 1, "first-recommendation"), STAGES.M1_SALE_RECEIPT, event);
    }
    case EVENTS.CLOSE_RECEIPT:
      return withStage(state, STAGES.M1_ONBOARDING, event);
    case EVENTS.START_ONBOARDING:
      state = spendEnergy(state, ENERGY_COSTS.onboarding, "care");
      return state ? withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "day7", status: "ถึงเวลาติดตาม", day: 7, adherence: 58 }))
      }, "care", 1, "onboarding"), STAGES.M1_FOLLOWUP, event) : currentState;
    case EVENTS.FOLLOW_UP_CUSTOMER:
      state = spendEnergy(state, ENERGY_COSTS.followup, "care");
      return state ? withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "day28", status: "พร้อมวัดซ้ำ", day: 28, followups: 2, adherence: 78, trust: person.trust + 12 })),
        monthStats: { ...state.monthStats, customersCared: state.monthStats.customersCared + 1 }
      }, "care", 1, "followup"), STAGES.M1_REVIEW_SCAN, event) : currentState;
    case EVENTS.START_CUSTOMER_REVIEW:
      state = spendEnergy(state, ENERGY_COSTS.scale, "care");
      return state ? withStage(state, STAGES.M1_REVIEW_SCANNING, event) : currentState;
    case EVENTS.CUSTOMER_REVIEW_COMPLETE:
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "review", status: "เริ่มเห็นแนวโน้ม", measuredAgain: true, result: evaluateCustomer(person) }))
      }, STAGES.M1_REVIEW, event);
    case EVENTS.SAVE_SUCCESS:
      return withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "advocate", status: "ทำต่อและพร้อมบอกต่อ", successCase: true, referralReady: true })),
        monthStats: { ...state.monthStats, successCases: state.monthStats.successCases + 1 },
        career: { ...state.career, totalSuccessCases: state.career.totalSuccessCases + 1 },
        milestones: { ...state.milestones, firstResult: true }
      }, "care", 1, "success-case"), STAGES.M1_SUCCESS, event);
    case EVENTS.CONTINUE_CARE: {
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const customer = {
        ...person,
        id: `customer-${person.id}`,
        personId: person.id,
        journey: "continue",
        status: "ดูแลตัวเองได้ · รอบใหม่ซื้ออัตโนมัติ",
        selfDirected: true,
        customerState: CUSTOMER_STATES.SELF_DIRECTED,
        lastReorderMonth: 1
      };
      return withStage(refreshMissions({
        ...state,
        prospects: state.prospects.filter((item) => item.id !== person.id),
        customers: [...state.customers, customer],
        selectedPersonId: customer.id,
        monthStats: { ...state.monthStats, newCustomers: state.monthStats.newCustomers + 1 }
      }), STAGES.M1_TEAM_STARTED, event);
    }
    case EVENTS.EXPLAIN_XVISOR:
      return withStage({ ...state, prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, status: "สนใจ X-VISOR" })) }, STAGES.M1_CANDIDATE, event);
    case EVENTS.PREPARE_G1: {
      state = spendEnergy(state, ENERGY_COSTS.candidate, "team");
      if (!state) return currentState;
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const member = {
        ...makeTeamMember(person, state),
        confidence: 42,
        status: "X-VISOR ใหม่ · เริ่ม monthly engine เดือนหน้า"
      };
      const customer = {
        ...person,
        id: `customer-${person.id}`,
        personId: person.id,
        status: "ดูแลตัวเองได้ · รอบใหม่ซื้ออัตโนมัติ",
        journey: "continue",
        selfDirected: true,
        xvisorStage: "certified",
        customerState: CUSTOMER_STATES.SELF_DIRECTED,
        lastReorderMonth: 1
      };
      return withStage({
        ...state,
        prospects: state.prospects.filter((item) => item.id !== person.id),
        customers: [...state.customers, customer],
        team: [...state.team, member],
        selectedPersonId: member.id,
        milestones: { ...state.milestones, firstG1: true }
      }, STAGES.M1_G1, event);
    }
    case EVENTS.START_WEEKLY:
      state = spendEnergy(state, ENERGY_COSTS.xcademy, "team");
      return state ? withStage(state, STAGES.M1_WEEKLY_RUNNING, event) : currentState;
    case EVENTS.WEEKLY_COMPLETE:
      return withStage({
        ...state,
        team: state.team.map((member) => member.active ? { ...member, confidence: member.confidence + 12, activity: member.activity + 1, status: "รู้ว่าจะเริ่มคุยกับใครก่อน" } : member),
        monthStats: { ...state.monthStats, weeklyDone: true, xcademySessions: 1, teamActivity: state.monthStats.teamActivity + state.team.filter((member) => member.active).length },
        career: { ...state.career, xcademies: Number(state.career.xcademies || 0) + 1 },
        milestones: { ...state.milestones, firstWeekly: true }
      }, STAGES.M1_TEAM_STARTED, event);
    case EVENTS.CREATE_LEAD: {
      const source = payload.source === "relationship" ? "known" : payload.source === "creator" ? "content" : payload.source || "known";
      if (source === "company") {
        return { ...state, lastEvent: event, lastMessage: "เกมนี้ไม่มี Company Lead — โอกาสมาจากคนที่รู้จัก Referral Content หรือ Ads", updatedAt: Date.now() };
      }
      if (source === "referral") {
        return { ...state, lastEvent: event, lastMessage: "Referral ต้องมาจากลูกค้าที่มี trust/result พร้อม", updatedAt: Date.now() };
      }
      if (source === "content" && getPlayerLevelFromSkills(state.skills) < 2) {
        return { ...state, lastEvent: event, lastMessage: "เรียนให้ X-VISOR ขึ้น Lv.2 เพื่อปลดล็อก Content", updatedAt: Date.now() };
      }
      if (source === "ads" && getPlayerLevelFromSkills(state.skills) < 4) {
        return { ...state, lastEvent: event, lastMessage: "Ads เปิดเมื่อ X-VISOR Lv.4 — เรียนและฝึกจากเคสก่อน", updatedAt: Date.now() };
      }
      state = spendEnergy(state, LEAD_COST[source] ?? ENERGY_COSTS.remoteContact, "attract");
      if (!state) return currentState;
      const knowledge = getSkillLevel(state.skills, "knowledge");
      const peopleSkill = getSkillLevel(state.skills, "people");
      const count = source === "ads" ? 2 + Number(knowledge + peopleSkill >= 9) + (knowledge >= 10 ? 2 : 0) : source === "content" ? 1 + Number(knowledge + peopleSkill >= 7) + (knowledge >= 10 ? 3 : 0) : 1;
      const created = addPeople(state, source, count);
      const fastWarm = getSkillLevel(state.skills, "people") >= 10;
      const createdPeople = created.people.map((person, index) => fastWarm && (source !== "ads" || index === 0) ? { ...person, journey: "discovery", status: "พร้อมดู Baseline", trust: person.trust + 12, readiness: Math.min(98, person.readiness + 12) } : person);
      let next = {
        ...created.state,
        prospects: [...state.prospects, ...createdPeople],
        selectedPersonId: createdPeople[0].id,
        marketing: source === "ads" ? {
          spent: Number(state.marketing?.spent || 0) + ADS_GAMEPLAY_CONFIG.budgetPerCampaign,
          campaigns: Number(state.marketing?.campaigns || 0) + 1
        } : state.marketing,
        monthStats: {
          ...state.monthStats,
          newPeople: state.monthStats.newPeople + count,
          contentLeads: state.monthStats.contentLeads + (source === "content" ? count : 0),
          adLeads: state.monthStats.adLeads + (source === "ads" ? count : 0)
        },
        sceneReport: {
          kind: source,
          people: createdPeople.map((person) => person.name),
          message: source === "content" ? `มีคนทักจากคอนเทนต์ ${count} คน` : source === "ads" ? `มีคนสนใจนัดวัด ${count} คน` : `รู้จัก ${created.people[0].name} จากคนที่คุณรู้จัก`
        },
        lastEvent: event,
        lastMessage: source === "content" ? `โพสต์นี้ทำให้ ${createdPeople.map((person) => person.name).join(" และ ")} สนใจ` : source === "ads" ? `แคมเปญจำลองพาคนสนใจมา ${count} คน — ทุกคนยังต้องคุยก่อน` : `${created.people[0].name} · เพิ่งรู้จัก`,
        updatedAt: Date.now()
      };
      if (source === "content") next = addSkillXp(next, "knowledge", 1, "content");
      if (source === "ads") next = addSkillXp(next, "people", 1, "ads");
      next = refreshMissions(next);
      if (source === "content") return withStage(next, STAGES.CONTENT_RUNNING, event);
      if (source === "ads") return withStage(next, STAGES.ADS_RUNNING, event);
      return next;
    }
    case EVENTS.CONTACT_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "new") return state;
      state = spendEnergy(state, ENERGY_COSTS.remoteContact, "attract");
      if (!state) return currentState;
      const fastDiscovery = getSkillLevel(state.skills, "people") >= 4;
      let next = {
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({
          ...item,
          journey: fastDiscovery ? "discovery" : "scheduled",
          scheduled: !fastDiscovery,
          status: fastDiscovery ? "เริ่มเปิดใจ" : "นัดแล้ว",
          trust: item.trust + (fastDiscovery ? 12 : 7),
          lastContactMonth: state.month
        })),
        selectedPersonId: person.id,
        monthStats: { ...state.monthStats, appointments: state.monthStats.appointments + 1 },
        lastEvent: event,
        lastMessage: fastDiscovery ? `คุยออนไลน์กับ ${person.name} แล้วจับประเด็นได้เร็ว — พร้อมดู Baseline` : `นัด ${person.name} เรียบร้อย — ขั้นต่อไปคือไปพบกัน`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "people", 1, "remote-contact");
      return refreshMissions(next);
    }
    case EVENTS.MEET_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "scheduled") return state;
      state = spendEnergy(state, ENERGY_COSTS.inPerson, "attract");
      if (!state) return currentState;
      let next = {
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({
          ...item,
          journey: "discovery",
          scheduled: false,
          meetings: Number(item.meetings || 0) + 1,
          status: "เริ่มเปิดใจ",
          trust: item.trust + 13,
          lastContactMonth: state.month
        })),
        selectedPersonId: person.id,
        monthStats: { ...state.monthStats, meetings: state.monthStats.meetings + 1 },
        lastEvent: event,
        lastMessage: `ได้พบ ${person.name} และเข้าใจสิ่งที่อยากเปลี่ยนแล้ว`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "people", 1, "in-person-discovery");
      return refreshMissions(next);
    }
    case EVENTS.CONSULT_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person) return state;
      state = spendEnergy(state, ENERGY_COSTS.remoteContact, "attract");
      if (!state) return currentState;
      const journey = person.journey === "new" && getSkillLevel(state.skills, "people") < 4 ? "scheduled" : "discovery";
      let next = {
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey, scheduled: journey === "scheduled", status: journey === "discovery" ? "เริ่มเปิดใจ" : "นัดแล้ว", trust: item.trust + 10, lastContactMonth: state.month })),
        selectedPersonId: person.id,
        lastEvent: event,
        lastMessage: journey === "discovery" ? `เข้าใจว่า ${person.name} อยากเปลี่ยนอะไรแล้ว` : `นัด ${person.name} แล้ว — ไปพบกันเป็นขั้นถัดไป`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "people", 1, "discovery");
      return completeMission(refreshMissions(next), "consult", person.id);
    }
    case EVENTS.BASELINE_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "discovery") return state;
      state = spendEnergy(state, ENERGY_COSTS.scale, "care");
      if (!state) return currentState;
      let next = {
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey: "baseline", status: "มี Baseline แล้ว", consent: true, measured: true, trust: item.trust + 8 })),
        selectedPersonId: person.id,
        lastEvent: event,
        lastMessage: `${person.name} อนุญาตให้ดูข้อมูลสรุปแล้ว`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "knowledge", 1, "xircle-baseline");
      return refreshMissions(next);
    }
    case EVENTS.OPEN_MANAGEMENT_ROUTINE: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "baseline") return state;
      if (getSkillLevel(state.skills, "knowledge") >= 10) {
        const updated = applyRoutine(person, "fit");
        return refreshMissions({
          ...state,
          prospects: updatePerson(state.prospects, person.id, () => updated),
          selectedPersonId: person.id,
          lastEvent: event,
          lastMessage: `ความรู้ Lv.10 auto-suggest แผนที่พอดีกับ ${person.name} แล้ว`,
          updatedAt: Date.now()
        });
      }
      return withStage({ ...state, selectedPersonId: person.id }, STAGES.MANAGEMENT_ROUTINE, event);
    }
    case EVENTS.CHOOSE_MANAGEMENT_ROUTINE: {
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const updated = applyRoutine(person, payload.planId);
      let next = { ...state, prospects: updatePerson(state.prospects, person.id, () => updated) };
      if (updated.routinePlan.quality === "poor") return { ...next, lastEvent: "ROUTINE_TOO_MUCH", lastMessage: "ต้องใช้ทั้งหมดเลยเหรอ?", updatedAt: Date.now() };
      next = addSkillXp(next, "knowledge", 1, "recommendation");
      return withStage(refreshMissions({ ...next, lastMessage: `วาง Routine ให้ ${person.name} แล้ว` }), STAGES.MANAGEMENT, event);
    }
    case EVENTS.OFFER_PROSPECT: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person?.routinePlan || person.journey !== "recommendation") return state;
      state = spendEnergy(state, ENERGY_COSTS.offer, "attract");
      if (!state) return currentState;
      const skillEdge = getSkillLevel(state.skills, "knowledge") + getSkillLevel(state.skills, "people");
      const buys = person.routinePlan.quality === "fit" && person.trust + person.readiness >= 91 - skillEdge * 2;
      if (!buys) {
        const cooldown = 1 + (Number(state.rngSeed || 1) + person.id.length + state.month) % 3;
        return refreshMissions({
          ...state,
          prospects: updatePerson(state.prospects, person.id, (item) => ({
            ...item,
            journey: "waiting",
            customerState: CUSTOMER_STATES.COOLDOWN,
            status: `ยังไม่ต้องตาม · รอเดือน ${state.month + cooldown}`,
            nextOfferMonth: state.month + cooldown,
            decisionAttempts: Number(item.decisionAttempts || 0)
          })),
          lastEvent: event,
          lastMessage: `${person.name} ${person.readiness < 50 ? "ยังไม่พร้อม" : "ขอคิดก่อน"} — ความสัมพันธ์ยังอยู่`,
          updatedAt: Date.now()
        });
      }
      state = recordSale(state, "sale", person.id);
      const customer = {
        ...person,
        id: `customer-${person.id}`,
        personId: person.id,
        journey: "day0",
        status: "เริ่ม Routine",
        activePlan: true,
        customerState: CUSTOMER_STATES.NEEDS_HELP,
        day: 0,
        trust: person.trust + 8,
        lastReorderMonth: state.month
      };
      let next = {
        ...state,
        prospects: state.prospects.filter((item) => item.id !== person.id),
        customers: [...state.customers, customer],
        selectedPersonId: customer.id,
        monthStats: { ...state.monthStats, sales: state.monthStats.sales + 1, newCustomers: state.monthStats.newCustomers + 1 },
        lastEvent: event,
        lastMessage: `${person.name} พร้อมเริ่ม Routine`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "knowledge", 1, "sale");
      return refreshMissions(next);
    }
    case EVENTS.CARE_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer || customer.selfDirected || [CUSTOMER_STATES.SELF_DIRECTED, CUSTOMER_STATES.AUTO_REORDER].includes(customer.customerState) || customer.day >= 28) return state;
      state = spendEnergy(state, ENERGY_COSTS.followup, "care");
      if (!state) return currentState;
      const checkpoints = [3, 7, 14, 21, 28];
      const careLevel = getSkillLevel(state.skills, "care");
      const steps = careLevel >= 10 ? 9 : careLevel >= 8 ? 3 : careLevel >= 4 ? 2 : 1;
      let nextDay = customer.day;
      for (let index = 0; index < steps; index += 1) nextDay = checkpoints.find((day) => day > nextDay) || 28;
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item,
          day: nextDay,
          followups: item.followups + (careLevel >= 10 ? 2 : 1),
          adherence: Math.min(96, item.adherence + (careLevel >= 10 ? 60 : 7 + careLevel * 2)),
          trust: item.trust + 5 + Math.floor(careLevel / 2),
          selfDirected: false,
          customerState: nextDay >= 28 ? CUSTOMER_STATES.NEEDS_HELP : CUSTOMER_STATES.NEEDS_HELP,
          status: nextDay >= 28 ? "ถึงเวลาวัดซ้ำ" : careLevel >= 5 ? "ทำได้ดี · Next Action ชัด" : `Day ${nextDay} · ทำต่อ`,
          lastContactMonth: state.month
        })),
        monthStats: { ...state.monthStats, customersCared: state.monthStats.customersCared + 1 },
        lastEvent: event,
        lastMessage: careLevel >= 10 ? `ดูแล Lv.10 ทำให้ ${customer.name} ไปถึงจุด Review ในครั้งเดียว` : `ติดตาม ${customer.name} แล้ว และเลือก Next Action ใหม่ร่วมกัน`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "care", 1, "customer-followup");
      return completeMission(refreshMissions(next), "care", customer.id);
    }
    case EVENTS.REMEASURE_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer || customer.day < 14) return state;
      state = spendEnergy(state, ENERGY_COSTS.scale, "care");
      if (!state) return currentState;
      const result = evaluateCustomer(customer);
      const success = customer.day >= 28 && result === "ดีขึ้น";
      const newlySuccessful = success && !customer.successCase;
      const interest = success && state.month >= 2 && (customer.trust >= 68 || getSkillLevel(state.skills, "care") >= 4);
      const selfDirected = success && getSkillLevel(state.skills, "care") >= 8;
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item,
          measuredAgain: true,
          result,
          successCase: success,
          referralReady: success,
          advocacy: success ? Number(item.advocacy || 0) + 1 : Number(item.advocacy || 0),
          xvisorInterest: item.xvisorInterest || interest,
          selfDirected,
          customerState: selfDirected ? CUSTOMER_STATES.SELF_DIRECTED : success ? CUSTOMER_STATES.READY_TO_BUY : CUSTOMER_STATES.NEEDS_HELP,
          status: interest ? "เริ่มสนใจ X-VISOR" : selfDirected ? "ดูแลตัวเองได้ · รอบใหม่ซื้ออัตโนมัติ" : success ? "พร้อมต่อ RoutineX เดือนใหม่" : `ผล ${result}`
        })),
        monthStats: { ...state.monthStats, remeasures: state.monthStats.remeasures + 1, successCases: state.monthStats.successCases + (newlySuccessful ? 1 : 0) },
        career: { ...state.career, totalSuccessCases: state.career.totalSuccessCases + (newlySuccessful ? 1 : 0) },
        lastEvent: event,
        lastMessage: interest ? `${customer.name} เห็นผลจากการดูแล และเริ่มถามถึงบทบาท X-VISOR` : success ? `${customer.name} เริ่มเห็นแนวโน้มดีจากสิ่งที่ทำต่อเนื่อง` : `ผลของ ${customer.name} ยังเป็น ${result} — ต้องดูแลต่อ`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "care", 1, "result-review");
      return completeMission(refreshMissions(next), "remeasure", customer.id);
    }
    case EVENTS.REORDER_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer) return state;
      const careLevel = getSkillLevel(state.skills, "care");
      const ready = customer.followups >= (careLevel >= 4 ? 1 : 2) && customer.measuredAgain && customer.trust >= 58 && customer.result !== "หลุด";
      if (customer.day < 28 || customer.customerState !== CUSTOMER_STATES.READY_TO_BUY || !ready) return state;
      state = spendEnergy(state, ENERGY_COSTS.reorder, "care");
      if (!state) return currentState;
      state = recordSale(state, "reorder", customer.id);
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item,
          day: 0,
          measuredAgain: false,
          followups: 0,
          customerState: careLevel >= 8 ? CUSTOMER_STATES.AUTO_REORDER : CUSTOMER_STATES.NEEDS_HELP,
          selfDirected: careLevel >= 8,
          lastReorderMonth: state.month,
          status: careLevel >= 8 ? "✅ ซื้อรอบใหม่เองได้ตั้งแต่เดือนหน้า" : "เริ่ม Routine รอบต่อไป"
        })),
        monthStats: { ...state.monthStats, reorders: state.monthStats.reorders + 1 },
        lastEvent: event,
        lastMessage: `${customer.name} เลือกทำ Routine ต่อหลังเห็น Trend และได้รับการติดตาม`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "care", 1, "retention");
      return refreshMissions(next);
    }
    case EVENTS.ASK_REFERRAL: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer?.referralReady || customer.referralAsked) return state;
      state = spendEnergy(state, ENERGY_COSTS.referral, "attract");
      if (!state) return currentState;
      const careLevel = getSkillLevel(state.skills, "care");
      const count = Number(customer.advocacy || 0) >= 2 || careLevel >= 7 ? 2 : 1;
      const created = addPeople(state, "referral", count);
      let next = {
        ...created.state,
        customers: updatePerson(state.customers, customer.id, (item) => ({ ...item, referralAsked: true, status: "แนะนำเพื่อนแล้ว · ดูแลต่อ" })),
        prospects: [...state.prospects, ...created.people],
        selectedPersonId: created.people[0].id,
        monthStats: { ...state.monthStats, newPeople: state.monthStats.newPeople + count, referrals: state.monthStats.referrals + count },
        lastEvent: event,
        lastMessage: `${customer.name} แนะนำ ${created.people.map((person) => person.name).join(" และ ")} — ยังต้องเริ่มจากการฟัง`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "care", 1, "referral");
      return refreshMissions(next);
    }
    case EVENTS.FOLLOW_UP_DECISION: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "waiting" || Number(person.nextOfferMonth || 0) > state.month || Number(person.decisionAttempts || 0) >= 2) return state;
      state = spendEnergy(state, ENERGY_COSTS.followup, "attract");
      if (!state) return currentState;
      const peopleLevel = getSkillLevel(state.skills, "people");
      const attempts = Number(person.decisionAttempts || 0) + 1;
      const resolves = peopleLevel >= 10 || person.readiness + peopleLevel * 3 >= 72;
      if (!resolves) {
        const cooldown = 1 + (Number(state.rngSeed || 1) + attempts + person.id.length) % 3;
        return refreshMissions({
          ...state,
          prospects: updatePerson(state.prospects, person.id, (item) => ({
            ...item,
            journey: attempts >= 2 ? "dormant" : "waiting",
            customerState: CUSTOMER_STATES.COOLDOWN,
            decisionAttempts: attempts,
            nextOfferMonth: attempts >= 2 ? null : state.month + cooldown,
            status: attempts >= 2 ? "พักไว้ · รอ Open House หรือจังหวะใหม่" : `ยังไม่ต้องตาม · รอเดือน ${state.month + cooldown}`
          })),
          lastEvent: event,
          lastMessage: attempts >= 2 ? `${person.name} ยังไม่ใช่จังหวะ — นำออกจากงานด่วนแล้ว` : `${person.name} ขอเวลา ระบบจะเตือนอีกครั้งเมื่อถึงจังหวะ`,
          updatedAt: Date.now()
        });
      }
      let next = {
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({
          ...item,
          journey: "recommendation",
          status: "พร้อมคุยเรื่องแผน",
          trust: item.trust + 8 + Math.floor(peopleLevel / 2),
          readiness: Math.min(96, item.readiness + 12 + peopleLevel),
          nextOfferMonth: null,
          customerState: CUSTOMER_STATES.READY_TO_BUY,
          decisionAttempts: attempts,
          lastContactMonth: state.month
        })),
        selectedPersonId: person.id,
        lastEvent: event,
        lastMessage: `${person.name} กลับมาคุยต่อและพร้อมตัดสินใจจากแผนเดิม`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "people", 1, "decision-followup");
      return refreshMissions(next);
    }
    case EVENTS.TRAIN_SKILL: {
      const skill = SKILL_IDS.includes(payload.skill) ? payload.skill : null;
      if (!skill) return state;
      state = spendEnergy(state, ENERGY_COSTS.skill, "learn");
      if (!state) return currentState;
      const beforeLevel = getSkillLevel(state.skills, skill);
      let next = addSkillXp(state, skill, 2, "focused-practice");
      const afterLevel = getSkillLevel(next.skills, skill);
      const levelTenMechanic = {
        knowledge: "Auto-suggest product fit · Content คุณภาพสูง · objection ด้านข้อมูลผ่านง่าย",
        people: "Warm prospect ข้าม small talk · follow-up ที่พร้อมจบในครั้งเดียว",
        care: "ลูกค้าดีเดินเอง · ซื้อซ้ำและ Referral อัตโนมัติ",
        leadership: "G1 เปิด monthly engine เต็มกำลังและสร้างทีมรุ่นถัดไป"
      };
      return refreshMissions({
        ...next,
        lastEvent: event,
        lastMessage: afterLevel === 10 && beforeLevel < 10 ? `Lv.10 ปลดล็อก: ${levelTenMechanic[skill]}` : afterLevel > beforeLevel ? `Skill ขึ้น Lv.${afterLevel} — ${levelTenMechanic[skill].split(" · ")[0]}` : `ฝึกต่อแล้ว · ${afterLevel === 10 ? "Skill นี้เต็มแล้ว" : "เข้าใกล้ระดับถัดไป"}`,
        updatedAt: Date.now()
      });
    }
    case EVENTS.INVITE_XVISOR: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer?.xvisorInterest || customer.xvisorStage) return state;
      state = spendEnergy(state, ENERGY_COSTS.candidate, "team");
      if (!state) return currentState;
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({ ...item, xvisorStage: "ready", status: "พร้อมเรียน Xcademy" })),
        monthStats: { ...state.monthStats, candidates: state.monthStats.candidates + 1 },
        lastEvent: event,
        lastMessage: `${customer.name} เข้าใจเส้นทาง สนใจ → Xcademy → Case → Certification แล้ว`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 1, "xvisor-invitation");
      return refreshMissions(next);
    }
    case EVENTS.START_CANDIDATE_XCADEMY: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (customer?.xvisorStage !== "ready") return state;
      state = spendEnergy(state, ENERGY_COSTS.candidate, "team");
      if (!state) return currentState;
      const leadership = getSkillLevel(state.skills, "leadership");
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item,
          xvisorStage: leadership >= 10 ? "case" : "xcademy",
          candidateProgress: 1 + Number(leadership >= 6) + Number(leadership >= 10),
          candidateStartedMonth: state.month,
          status: "กำลังเรียน Xcademy"
        })),
        lastEvent: event,
        lastMessage: `${customer.name} เริ่มเรียน Xcademy และเตรียมฝึกจาก Case จริง`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 1, "xcademy-support");
      return refreshMissions(next);
    }
    case EVENTS.REVIEW_CANDIDATE: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (customer?.xvisorStage !== "xcademy") return state;
      state = spendEnergy(state, ENERGY_COSTS.candidate, "team");
      if (!state) return currentState;
      const leadership = getSkillLevel(state.skills, "leadership");
      const progress = Number(customer.candidateProgress || 0) + 1 + Number(leadership >= 5);
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item,
          candidateProgress: progress,
          xvisorStage: progress >= 2 ? "case" : "xcademy",
          status: progress >= 2 ? "พร้อมสอบ Certification" : "กำลังฝึกจาก Case"
        })),
        lastEvent: event,
        lastMessage: progress >= 2 ? `${customer.name} ผ่าน Case Review และพร้อม Certification` : `${customer.name} เห็นจุดที่ต้องฝึกต่อ`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 1, "candidate-review");
      return refreshMissions(next);
    }
    case EVENTS.CERTIFY_CANDIDATE: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (customer?.xvisorStage !== "case" || Number(customer.candidateProgress || 0) < 2) return state;
      const leadership = getSkillLevel(state.skills, "leadership");
      if (customer.candidateStartedMonth === state.month && leadership < 6 && !state.monthStats.xcademySessions) {
        return { ...state, lastEvent: event, lastMessage: `${customer.name} กำลังเตรียมสอบ — ทบทวนอีกครั้งเดือนหน้า หรือเข้า Xcademy`, updatedAt: Date.now() };
      }
      state = spendEnergy(state, ENERGY_COSTS.candidate, "team");
      if (!state) return currentState;
      const member = makeTeamMember(customer, state);
      const firstG1 = !state.milestones.firstG1;
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({ ...item, xvisorStage: "certified", status: "Certified X-VISOR · ยังดูแล Routine ต่อ" })),
        team: [...state.team, member],
        selectedPersonId: member.id,
        monthStats: { ...state.monthStats, newXvisors: state.monthStats.newXvisors + 1 },
        milestones: { ...state.milestones, firstG1: true },
        sceneReport: { kind: "g1", name: customer.name, first: firstG1 },
        lastEvent: event,
        lastMessage: firstG1 ? `${customer.name} เป็น G1 คนแรกแล้ว — เกมยังไปต่อสู่การสร้างทีมที่ทำเองได้` : `${customer.name} เป็น X-VISOR คนที่ ${state.team.length + 1} ในทีม`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 2, "new-xvisor");
      return withStage(refreshMissions(next), STAGES.G1_CELEBRATION, event);
    }
    case EVENTS.RUN_XCADEMY:
    case EVENTS.RUN_CENTER:
    case EVENTS.RUN_WEEKLY: {
      if (Number(state.monthStats.xcademySessions || 0) >= 4) return state;
      state = spendEnergy(state, ENERGY_COSTS.xcademy, "team");
      if (!state) return currentState;
      const leadership = getSkillLevel(state.skills, "leadership");
      const peopleLevel = getSkillLevel(state.skills, "people");
      const activeCount = state.team.filter((member) => member.active).length;
      const team = state.team.map((member) => member.active ? {
        ...member,
        confidence: Math.min(100, Number(member.confidence || 0) + 8 + leadership),
        autonomy: Math.min(100, Number(member.autonomy || 0) + 5 + Math.floor(leadership / 2)),
        teamSkill: Math.min(10, Number(member.teamSkill || 1) + 1 + Number(leadership >= 5) + Number(leadership >= 10)),
        xcademyVisits: Number(member.xcademyVisits || member.centerVisits || 0) + 1,
        growthMomentum: Number(member.growthMomentum || 0) + 5e-3 + leadership * 5e-4,
        status: member.customers ? "รู้ว่าจะดูแลเคสไหนต่อ" : "รู้ว่าจะโทรหาใครก่อน"
      } : member);
      const customers = state.customers.map((customer) => {
        if (customer.xvisorStage === "xcademy") {
          const progress = Number(customer.candidateProgress || 0) + 1 + Number(leadership >= 5);
          return {
            ...customer,
            candidateProgress: progress,
            xvisorStage: progress >= 2 ? "case" : "xcademy",
            customerState: progress >= 2 ? CUSTOMER_STATES.READY_CERTIFY : customer.customerState,
            status: progress >= 2 ? "พร้อมสอบ Certification" : "กำลังฝึกจาก Case"
          };
        }
        if (customer.successCase && !customer.xvisorStage && customer.trust + leadership * 3 >= 70) {
          return { ...customer, xvisorInterest: true, customerState: CUSTOMER_STATES.READY_XVISOR, status: "เริ่มสนใจ X-VISOR หลัง Xcademy OPP" };
        }
        return customer;
      });
      const prospects = state.prospects.map((person) => {
        if (["cooldown", "dormant"].includes(person.journey) && peopleLevel < 10) return person;
        const readiness = Math.min(99, Number(person.readiness || 0) + 9 + peopleLevel);
        const journey = peopleLevel >= 10 && ["new", "scheduled", "waiting", "cooldown", "dormant"].includes(person.journey) ? "discovery" : person.journey;
        return { ...person, readiness, journey, status: journey === "discovery" ? "พร้อมดู Baseline หลัง OPP" : person.status };
      });
      const candidateCount = customers.filter((customer) => customer.xvisorStage === "case" && state.customers.find((item) => item.id === customer.id)?.xvisorStage !== "case").length;
      let next = {
        ...state,
        team,
        customers,
        prospects,
        career: { ...state.career, xcademies: Number(state.career.xcademies || 0) + 1, centers: Number(state.career.centers || 0) + 1 },
        monthStats: {
          ...state.monthStats,
          xcademySessions: Number(state.monthStats.xcademySessions || 0) + 1,
          centerDone: true,
          weeklyDone: true,
          teamActivity: state.monthStats.teamActivity + activeCount
        },
        sceneReport: {
          kind: "xcademy",
          room: activeCount || candidateCount ? "Training X-VISOR" : "OPP / Intro",
          messages: [
            ...team.filter((member) => member.active).slice(0, 3).map((member) => `${member.name}: ${member.status}`),
            ...candidateCount ? [`Candidate ${candidateCount} คนพร้อมสอบ`] : []
          ]
        },
        milestones: { ...state.milestones, firstWeekly: true },
        lastEvent: event,
        lastMessage: activeCount || candidateCount ? `Xcademy ช่วย ${activeCount + candidateCount} คนพร้อมกัน` : "Xcademy OPP ทำให้คนใหม่เห็นเส้นทางชัดขึ้น",
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 2, "xcademy");
      return withStage(refreshMissions(next), STAGES.XCADEMY_RUNNING, event);
    }
    case EVENTS.RUN_OPEN_HOUSE:
    case EVENTS.RUN_GOOD_LUCK:
    case EVENTS.RUN_MONTHLY_EVENT: {
      if (state.monthStats.openHouseDone || state.monthStats.goodLuckDone || state.monthStats.eventDone) return state;
      state = spendEnergy(state, ENERGY_COSTS.openHouse, "team");
      if (!state) return currentState;
      const leadership = getSkillLevel(state.skills, "leadership");
      const peopleLevel = getSkillLevel(state.skills, "people");
      const invited = state.prospects.filter((person) => person.journey !== "dormant").length + state.customers.length;
      const attended = Math.max(1, Math.round(invited * Math.min(0.82, 0.42 + peopleLevel * 0.025 + leadership * 0.015)));
      const count = Math.max(1, Math.min(4, Math.floor(attended / 4) + Number(leadership >= 7)));
      const created = addPeople(state, "event", count);
      let readyRoutine = 0;
      let xircleAppointments = 0;
      const prospects = [...state.prospects, ...created.people].map((person, index) => {
        const attends = index < attended || person.source === "event";
        if (!attends) return person;
        const readiness = Math.min(99, Number(person.readiness || 0) + 18 + peopleLevel * 2);
        if (readiness >= 82) {
          readyRoutine += 1;
          return { ...applyRoutine(person, "fit"), readiness, customerState: CUSTOMER_STATES.READY_TO_BUY, status: "พร้อมเริ่ม Routine หลัง Open House" };
        }
        xircleAppointments += 1;
        return { ...person, readiness, journey: "discovery", customerState: null, nextOfferMonth: null, status: "พร้อมนัด Xircle" };
      });
      let readyXcademy = 0;
      const customers = state.customers.map((customer, index) => {
        if (!customer.successCase) return customer;
        const ready = !customer.xvisorStage && index % 2 === 0;
        if (ready) readyXcademy += 1;
        return {
          ...customer,
          advocacy: Number(customer.advocacy || 0) + 1,
          referralReady: true,
          xvisorInterest: true,
          xvisorStage: ready ? "ready" : customer.xvisorStage,
          customerState: CUSTOMER_STATES.READY_XVISOR,
          status: ready ? "พร้อมเข้า Xcademy" : "สนใจ X-VISOR"
        };
      });
      const interested = customers.filter((customer) => customer.xvisorInterest && !state.customers.find((item) => item.id === customer.id)?.xvisorInterest).length;
      let next = {
        ...created.state,
        prospects,
        customers,
        team: state.team.map((member) => member.active ? {
          ...member,
          confidence: Math.min(100, Number(member.confidence || 0) + 5 + Math.floor(leadership / 2)),
          openHouseVisits: Number(member.openHouseVisits || member.goodLuckVisits || 0) + 1,
          growthMomentum: Number(member.growthMomentum || 0) + 0.02,
          status: "มั่นใจขึ้นหลังฟัง Case ของคนอื่น"
        } : member),
        career: { ...state.career, openHouses: Number(state.career.openHouses || 0) + 1, goodLucks: Number(state.career.goodLucks || 0) + 1 },
        monthStats: {
          ...state.monthStats,
          openHouseDone: true,
          goodLuckDone: true,
          eventDone: true,
          newPeople: state.monthStats.newPeople + count
        },
        sceneReport: {
          kind: "open-house",
          invited,
          attended,
          readyRoutine,
          xircleAppointments,
          interested,
          readyXcademy,
          messages: [
            `ชวน ${invited} · มา ${attended}`,
            `พร้อมเริ่ม Routine ${readyRoutine} · นัด Xircle ${xircleAppointments}`,
            `สนใจ X-VISOR ${interested} · พร้อม Xcademy ${readyXcademy}`
          ]
        },
        lastEvent: event,
        lastMessage: "Open House เปลี่ยนคนทั้งกลุ่มให้มี Next Action ชัดขึ้น",
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 2, "open-house");
      return withStage(refreshMissions(next), STAGES.OPEN_HOUSE_RUNNING, event);
    }
    case EVENTS.REVIEW_TEAM_LEADERS: {
      if (!["xlead", "xgen"].includes(state.rank)) return state;
      state = spendEnergy(state, ENERGY_COSTS.mentoring, "team");
      if (!state) return currentState;
      let next = {
        ...state,
        team: state.team.map((member) => member.active ? {
          ...member,
          autonomy: Math.min(100, Number(member.autonomy || 0) + 5),
          leaderReadiness: Math.min(100, Number(member.leaderReadiness || 0) + 8),
          status: "พร้อมช่วยคนในรุ่นถัดไป"
        } : member),
        lastEvent: event,
        lastMessage: "คุณ Review ผู้นำรุ่นถัดไป แทนการลงไปทำทุกเคสเอง",
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 1, "leader-review");
      return refreshMissions(next);
    }
    case EVENTS.MENTOR_TEAM_MEMBER: {
      const member = state.team.find((item) => item.id === payload.id);
      if (!member?.active) return state;
      state = spendEnergy(state, ENERGY_COSTS.mentoring, "team");
      if (!state) return currentState;
      const leadership = getSkillLevel(state.skills, "leadership");
      let firstCustomer = false;
      let firstSale = false;
      let outputActions = 1;
      const team = updatePerson(state.team, member.id, (item) => {
        const confidence = Math.min(100, Number(item.confidence || 0) + 8 + leadership * 2);
        const autonomy = Math.min(100, Number(item.autonomy || 0) + 7 + leadership);
        const customerGain = confidence >= 58 && (item.customers === 0 || autonomy >= 60) ? 1 : 0;
        const customers = Number(item.customers || 0) + customerGain;
        const saleGain = customers > 0 && confidence >= 68 && autonomy >= 45 ? 1 : 0;
        const sales = Number(item.sales || 0) + saleGain;
        firstCustomer = customers > item.customers;
        firstSale = sales > item.sales;
        outputActions += customerGain + saleGain;
        const saleBaht = saleGain ? TUTORIAL_OFFER.price + XIRCLE_STARTER.price : 0;
        const saleXV = saleGain ? TUTORIAL_OFFER.xv + XIRCLE_STARTER.xv : 0;
        const personalSalesBaht = Number(item.personalSalesBaht || 0) + saleBaht;
        const personalXV = Number(item.personalXV || 0) + saleXV;
        const commission = Math.round(personalSalesBaht * getRetailTier(personalSalesBaht).rate);
        return {
          ...item,
          confidence,
          autonomy,
          customers,
          sales,
          xv: Number(item.xv || 0) + saleXV,
          personalSalesBaht,
          personalXV,
          commission,
          activity: Number(item.activity || 0) + outputActions,
          status: firstSale ? "ปิดการขายเองครั้งแรก" : firstCustomer ? "ดูแลลูกค้าคนแรกได้เอง" : "กำลังฝึกจากเคสจริง"
        };
      });
      let next = {
        ...state,
        team,
        economy: {
          ...state.economy,
          teamProductSales: Number(state.economy.teamProductSales || 0) + (firstSale ? TUTORIAL_OFFER.price + XIRCLE_STARTER.price : 0),
          teamXV: Number(state.economy.teamXV || 0) + (firstSale ? TUTORIAL_OFFER.xv + XIRCLE_STARTER.xv : 0)
        },
        monthStats: {
          ...state.monthStats,
          teamActivity: state.monthStats.teamActivity + outputActions,
          teamActions: state.monthStats.teamActions + outputActions,
          teamCustomers: state.monthStats.teamCustomers + Number(firstCustomer),
          teamSales: state.monthStats.teamSales + Number(firstSale)
        },
        career: { ...state.career, totalTeamActions: state.career.totalTeamActions + outputActions },
        organization: { ...state.organization, totalActivity: state.organization.totalActivity + outputActions, tgv: state.organization.tgv + (firstSale ? TUTORIAL_OFFER.xv + XIRCLE_STARTER.xv : 0) },
        milestones: { ...state.milestones, firstTeamCustomer: state.milestones.firstTeamCustomer || firstCustomer, firstTeamSale: state.milestones.firstTeamSale || firstSale },
        lastEvent: event,
        lastMessage: firstSale ? `${member.name} ปิดการขายเองครั้งแรก` : firstCustomer ? `${member.name} ดูแลลูกค้าคนแรกได้เอง` : `ช่วย ${member.name} ทบทวนเคสแล้ว`,
        updatedAt: Date.now()
      };
      next = addSkillXp(next, "leadership", 1, "field-mentor");
      return completeMission(refreshMissions(next), "mentor", member.id);
    }
    case EVENTS.SCENE_COMPLETE: {
      if (state.stage === STAGES.XGEN_MILESTONE) {
        return withStage({
          ...state,
          organization: { ...state.organization, endless: true },
          sceneReport: null,
          lastMessage: "Endless Mode เปิดแล้ว — organization รายได้ และ Best TGV ยังโตต่อได้"
        }, STAGES.MANAGEMENT, event);
      }
      let next = refreshMissions({ ...state, sceneReport: null });
      const beforeRank = next.rank;
      next = evaluateXlead(next);
      if (beforeRank !== next.rank) {
        const economy = calculateEconomy(next);
        return withStage({ ...next, sceneReport: { kind: "xlead", channel2: economy.channel2 } }, STAGES.XLEAD_MILESTONE, event);
      }
      return withStage(next, STAGES.MANAGEMENT, event);
    }
    case EVENTS.END_MONTH:
      return closeMonth(state, event);
    case EVENTS.START_NEXT_MONTH: {
      const nextMonth = state.month + 1;
      const prospects = state.prospects.map((person) => {
        if (person.journey !== "waiting") return person;
        const ready = Number(person.nextOfferMonth || 0) <= nextMonth;
        return {
          ...person,
          customerState: ready ? CUSTOMER_STATES.READY_TO_BUY : CUSTOMER_STATES.COOLDOWN,
          status: ready ? "พร้อมคุยให้รู้ผล" : `ยังไม่ต้องตาม · รอเดือน ${person.nextOfferMonth}`,
          readiness: ready ? Math.min(94, person.readiness + 5) : person.readiness
        };
      });
      let next = {
        ...state,
        phase: state.organization?.xgen ? "endless" : "management",
        month: nextMonth,
        energy: MAX_ENERGY,
        prospects,
        organization: {
          ...state.organization,
          endless: Boolean(state.organization?.xgen) || Boolean(state.organization?.endless),
          tgv: 0,
          breakawayVolume: 0
        },
        economy: {
          ...state.economy,
          sets: 0,
          productSales: 0,
          personalXV: 0,
          teamProductSales: 0,
          teamXV: 0,
          lastTransaction: null
        },
        monthStats: makeMonthStats(),
        selectedPersonId: null,
        lastMessage: `เดือน ${nextMonth} เริ่มแล้ว เลือกงานที่สร้างคุณค่ามากที่สุดก่อน`
      };
      next = applyAutomaticCustomerCycles(next);
      next = simulateTeamCycle(next);
      next = {
        ...next,
        milestones: {
          ...next.milestones,
          firstTeamCustomer: next.milestones.firstTeamCustomer || next.monthStats.teamCustomers > 0,
          firstTeamSale: next.milestones.firstTeamSale || next.monthStats.teamSales > 0
        }
      };
      next = refreshMissions(next);
      const beforeRank = next.rank;
      next = evaluateXlead(next);
      if (beforeRank !== next.rank) {
        const economy = calculateEconomy(next);
        return withStage({
          ...next,
          sceneReport: { kind: "xlead", channel2: economy.channel2 },
          lastMessage: `ปลดล็อก ② รายได้จากการพัฒนา G1 แล้ว · เดือนนี้ ฿${economy.channel2.toLocaleString("th-TH")}`
        }, STAGES.XLEAD_MILESTONE, event);
      }
      return withStage(next, STAGES.MANAGEMENT, event);
    }
    default:
      return state;
  }
}
function serializeState(state) {
  return JSON.stringify({ ...state, version: SAVE_VERSION, updatedAt: Date.now() });
}
function normalizeMonthStats(stats) {
  const base = makeMonthStats();
  return {
    ...base,
    ...stats || {},
    playerActions: { ...base.playerActions, ...stats?.playerActions || {} },
    energyUse: { ...base.energyUse, ...stats?.energyUse || {} },
    teamOutput: Array.isArray(stats?.teamOutput) ? stats.teamOutput : []
  };
}
function normalizePersonForV5(person) {
  return {
    scheduled: false,
    meetings: 0,
    lastContactMonth: 0,
    advocacy: 0,
    xvisorInterest: false,
    xvisorStage: null,
    candidateProgress: 0,
    selfDirected: false,
    customerState: null,
    decisionAttempts: 0,
    lastReorderMonth: null,
    ...person,
    source: person?.source === "relationship" ? "known" : person?.source === "creator" ? "content" : person?.source
  };
}
function migrateStateValue(value) {
  const seed = Number(value.rngSeed || 1);
  const base = makeInitialState({ seed });
  const legacy = LEGACY_SAVE_VERSIONS.includes(value.version);
  const legacyLateMonthOne = /* @__PURE__ */ new Set([
    STAGES.M1_XVISOR_INTEREST,
    STAGES.M1_CANDIDATE,
    STAGES.M1_G1,
    STAGES.M1_WEEKLY_RUNNING
  ]);
  const prospects = Array.isArray(value.prospects) ? value.prospects.map(normalizePersonForV5) : [];
  const existingCustomers = Array.isArray(value.customers) ? value.customers.map(normalizePersonForV5) : [];
  const activeTutorialPeople = legacy && legacyLateMonthOne.has(value.stage) ? prospects.filter((person) => person.activePlan).map((person) => ({
    ...person,
    id: `customer-${person.id}`,
    personId: person.id,
    journey: "continue",
    status: person.successCase ? "พร้อมต่อและแนะนำเพื่อน" : "ทำ Routine ต่อ",
    activePlan: true,
    customerState: person.successCase ? CUSTOMER_STATES.SELF_DIRECTED : CUSTOMER_STATES.NEEDS_HELP
  })) : [];
  const migratedCustomerIds = new Set(existingCustomers.map((person) => person.personId || person.id));
  const customers = [...existingCustomers, ...activeTutorialPeople.filter((person) => !migratedCustomerIds.has(person.personId))];
  const filteredProspects = activeTutorialPeople.length ? prospects.filter((person) => !activeTutorialPeople.some((customer) => customer.personId === person.id)) : prospects;
  const skillSeed = value.month >= 2 ? 3 : 0;
  const skills = normalizeSkills(value.skills || makeSkills(skillSeed));
  const state = {
    ...base,
    ...value,
    version: SAVE_VERSION,
    stage: legacyLateMonthOne.has(value.stage) ? STAGES.M1_TEAM_STARTED : value.stage === STAGES.SEASON_REVIEW ? STAGES.MANAGEMENT : value.stage,
    prospects: filteredProspects,
    customers,
    team: (Array.isArray(value.team) ? value.team : []).map((member) => ({
      personId: member.personId || String(member.id || "").replace(/^member-(?:customer-)?/, ""),
      parentId: "player",
      generation: 1,
      active: true,
      rank: "xvisor",
      confidence: 45,
      autonomy: 30,
      teamSkill: 1,
      customers: 0,
      sales: 0,
      reorders: 0,
      referrals: 0,
      candidates: 0,
      xv: 0,
      activity: 0,
      centerVisits: 0,
      goodLuckVisits: 0,
      personalSalesBaht: 0,
      personalXV: 0,
      commission: 0,
      totalIncome: 0,
      lastSelfUseMonth: null,
      xcademyVisits: 0,
      openHouseVisits: 0,
      growthMomentum: 0,
      downstreamXvisors: 0,
      leaderReadiness: 0,
      monthlyOutput: { actions: 0, selfUse: 0, newPeople: 0, followups: 0, customers: 0, sales: 0, newStarts: 0, reorders: 0, referrals: 0, candidates: 0, newXvisors: 0, personalSalesBaht: 0, personalXV: 0, commission: 0 },
      ...member
    })),
    skills,
    playerLevel: getPlayerLevelFromSkills(skills),
    marketing: { ...base.marketing, ...value.marketing || {} },
    career: { ...base.career, ...value.career || {} },
    organization: { ...base.organization, ...value.organization || {} },
    economy: {
      ...base.economy,
      ...value.economy || {},
      totalIncome: Number(value.economy?.totalIncome ?? value.economy?.receivedIncome ?? 0),
      incomeHistory: Array.isArray(value.economy?.incomeHistory) ? value.economy.incomeHistory : Array.isArray(value.monthSummaries) ? value.monthSummaries.map((summary) => ({
        month: summary.month,
        channel1: Number(summary.income?.channel1 ?? summary.projectedIncome ?? 0),
        channel2: Number(summary.income?.channel2 || 0),
        channel3: Number(summary.income?.channel3 || 0),
        channel4: Number(summary.income?.channel4 || 0),
        total: Number(summary.projectedIncome || 0),
        tgv: Number(summary.tgv || summary.xv || 0) + Number(summary.teamXV || 0)
      })) : []
    },
    monthStats: normalizeMonthStats(value.monthStats),
    milestones: { ...base.milestones, ...value.milestones || {} },
    monthSummaries: Array.isArray(value.monthSummaries) ? value.monthSummaries : []
  };
  return state.month >= 2 || state.stage === STAGES.MANAGEMENT ? refreshMissions(state) : state;
}
function parseSavedState(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.version !== SAVE_VERSION && !LEGACY_SAVE_VERSIONS.includes(value.version)) return null;
    if (!ALLOWED[value.stage]) return null;
    if (!Number.isFinite(value.energy) || value.energy < 0 || value.energy > MAX_ENERGY) return null;
    return migrateStateValue(value);
  } catch {
    return null;
  }
}
function getAllowedEvents(stage) {
  return [...ALLOWED[stage] || []];
}
function getCurrentExamQuestion(state) {
  return currentExamQuestion(state);
}
function getPlanQuality(person, planId) {
  return planQuality(person, planId);
}
function simulateCustomerOutcome(customer) {
  return evaluateCustomer(customer);
}

import {
  SKILL_IDS as SKILL_IDS2,
  addSkillXp as addSkillXp2,
  getSkillLevel as getSkillLevel2
} from "./game-progression.js";
import {
  DIRECT_MENTORING_RULE as DIRECT_MENTORING_RULE2,
  INCOME_RULE as INCOME_RULE2,
  ORGANIZATION_INCOME_RULE as ORGANIZATION_INCOME_RULE2,
  TUTORIAL_OFFER as TUTORIAL_OFFER2,
  XIRCLE_STARTER as XIRCLE_STARTER2,
  getRetailTier as getRetailTier2
} from "./game-commercial-config.js";
var V8_SCORE_VERSION = "v8-r4-12m";
var PEOPLE_RENDER_LIMIT = 25;
var CAMPAIGN_MONTHS = 12;
var XIRCLE_MONTHS = Object.freeze([3, 6, 9, 12]);
var EVENTS2 = Object.freeze({
  ...EVENTS,
  RUN_XIRCLE: "RUN_XIRCLE",
  XLEAD_EXAM: "XLEAD_EXAM",
  XGEN_EXAM: "XGEN_EXAM",
  NEW_GAME_PLUS: "NEW_GAME_PLUS"
});
var CUSTOM_EVENTS = /* @__PURE__ */ new Set([EVENTS2.RUN_XIRCLE, EVENTS2.XLEAD_EXAM, EVENTS2.XGEN_EXAM, EVENTS2.NEW_GAME_PLUS]);
function originFor(person, state, fallback = "unknown") {
  if (person?.origin?.sourceType) return person.origin;
  const source = person?.source || fallback;
  const labels = {
    known: "คนที่คุณรู้จัก",
    referral: "Referral",
    content: "Content",
    ads: "Ads",
    event: "Event / Open House",
    team: "ทีมพามา",
    tutorial: "Month 1"
  };
  return {
    sourceType: source,
    sourceId: person?.parentId || null,
    sourceName: labels[source] || source,
    createdMonth: Number(person?.createdMonth ?? state?.month ?? 0),
    parentPersonId: person?.parentId || null,
    eventId: person?.eventId || null
  };
}
function satisfactionFor(customer) {
  const current = Number(customer?.satisfaction);
  if (Number.isFinite(current)) return Math.max(0, Math.min(100, Math.round(current)));
  const trust = Math.max(0, Math.min(100, Number(customer?.trust || 50)));
  const adherence = Math.max(0, Math.min(100, Number(customer?.adherence || (customer?.successCase ? 78 : 55))));
  const care = Math.min(20, Number(customer?.followups || 0) * 6 + Number(customer?.measuredAgain) * 5 + Number(customer?.successCase) * 6);
  return Math.max(20, Math.min(98, Math.round(trust * 0.45 + adherence * 0.45 + care)));
}
function normalizeTeamMember(member, state) {
  const personalXV = Math.max(0, Number(member?.personalXV || member?.monthlyOutput?.personalXV || 0));
  const tier2 = getRetailTier2(personalXV);
  const commission = Math.round(personalXV * tier2.rate);
  return {
    ...member,
    origin: originFor(member, state, "team"),
    personalXV,
    commission,
    monthlyOutput: member?.monthlyOutput ? { ...member.monthlyOutput, personalXV, commission } : member?.monthlyOutput
  };
}
function normalizeCustomer(customer, state) {
  const satisfaction = satisfactionFor(customer);
  const stable = satisfaction >= 75 && customer.activePlan !== false;
  return {
    ...customer,
    origin: originFor(customer, state, customer.source || "customer"),
    satisfaction,
    selfDirected: stable ? true : Boolean(customer.selfDirected && satisfaction >= 65),
    customerState: stable ? CUSTOMER_STATES.SELF_DIRECTED : satisfaction < 45 ? CUSTOMER_STATES.NEEDS_HELP : customer.customerState
  };
}
function uniqueOrganizationPeople(state) {
  const ids = /* @__PURE__ */ new Set();
  for (const person of [...state.prospects || [], ...state.customers || [], ...state.team || []]) ids.add(person.personId || person.id);
  return ids.size + Math.max(0, Number(state.organization?.aggregate?.overflowPeople || 0));
}
function calculateEconomy2(state) {
  const personalXV = Math.max(0, Number(state.economy?.personalXV || 0));
  const productSales = Math.max(0, Number(state.economy?.productSales || 0));
  const tier2 = getRetailTier2(personalXV);
  const activeRetail = Math.round(personalXV * tier2.rate);
  const directG1 = (state.team || []).filter((member) => member.active && member.parentId === "player");
  const mentoringBreakdown = directG1.map((member) => {
    const memberXV = Math.max(0, Number(member.personalXV || member.monthlyOutput?.personalXV || 0));
    const retailTier = getRetailTier2(memberXV);
    const commission = Math.round(memberXV * retailTier.rate);
    return {
      memberId: member.id,
      name: member.name,
      personalXV: memberXV,
      personalSalesBaht: Number(member.personalSalesBaht || member.monthlyOutput?.personalSalesBaht || 0),
      retailTier,
      commission,
      mentorIncome: Math.round(commission * DIRECT_MENTORING_RULE2.rate)
    };
  });
  const mentoringUnlocked = Boolean(state.career?.xleadCertified || state.career?.xgenCertified || ["xlead", "xgen"].includes(state.rank));
  const mentoring = mentoringUnlocked ? mentoringBreakdown.reduce((sum, item) => sum + item.mentorIncome, 0) : 0;
  const teamXV = Math.max(0, Number(state.economy?.teamXV || 0));
  const teamProductSales = Math.max(0, Number(state.economy?.teamProductSales || 0));
  const tgv = Math.max(personalXV + teamXV, Number(state.organization?.tgv || 0));
  const organizationIncome = state.career?.xgenCertified ? Math.round(tgv * ORGANIZATION_INCOME_RULE2.rate) : 0;
  const projectedIncome = activeRetail + mentoring + organizationIncome;
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome ?? state.economy?.receivedIncome ?? 0));
  const currentMonthClosed = Number(state.monthSummaries?.at?.(-1)?.month || -1) === Number(state.month || 0);
  return {
    productSales,
    personalSalesBaht: productSales,
    personalXV,
    tier: tier2,
    activeRetail,
    channel1: activeRetail,
    mentoring,
    channel2: mentoring,
    mentoringUnlocked,
    mentoringBreakdown,
    organizationIncome,
    channel3: organizationIncome,
    breakawayIncome: 0,
    channel4: 0,
    breakawayVolume: 0,
    teamProductSales,
    teamXV,
    tgv,
    teamIncome: mentoring + organizationIncome,
    projectedIncome,
    monthlyIncome: projectedIncome,
    receivedIncome: totalIncome,
    totalIncome,
    lifetimeIncome: totalIncome + (currentMonthClosed ? 0 : projectedIncome),
    incomeHistory: Array.isArray(state.economy?.incomeHistory) ? state.economy.incomeHistory : [],
    status: INCOME_RULE2.status
  };
}
function addEventLog(state, event, payload) {
  const log = Array.isArray(state.eventLog) ? state.eventLog : [];
  return {
    ...state,
    eventLog: [...log, { month: Number(state.month || 0), event, payload: payload && typeof payload === "object" ? { ...payload } : {} }].slice(-600)
  };
}
function spend(state, amount, category = "other") {
  const cost = Math.max(0, Number(amount || 0));
  if (state.month < 1 || state.energy < cost) return null;
  const baseUse = state.monthStats?.energyUse || {};
  const baseActions = state.monthStats?.playerActions || {};
  return {
    ...state,
    energy: Math.max(0, state.energy - cost),
    monthStats: {
      ...state.monthStats,
      energyUse: { ...baseUse, [category]: Number(baseUse[category] || 0) + cost },
      playerActions: { ...baseActions, [category]: Number(baseActions[category] || 0) + 1, total: Number(baseActions.total || 0) + 1 }
    }
  };
}
function deterministicRoll(state, event, targetId = "") {
  let hash = Number(state.rngSeed || 1) + Number(state.month || 0) * 131;
  for (const char of `${event}:${targetId}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % 1e4 / 1e4;
}
function humanDecisionChance(level, attempt = 0) {
  const base = Math.min(0.97, 0.25 + Math.max(0, Math.min(9, Number(level || 1) - 1)) * 0.08);
  if (attempt >= 2) return 1;
  if (attempt === 1) return Math.min(0.99, base + 0.15);
  return base;
}
function humanDecisionFailure(state, event, payload) {
  const id = payload?.id;
  if (!id) return null;
  const peopleLevel = getSkillLevel2(state.skills, event === EVENTS2.INVITE_XVISOR ? "leadership" : "people");
  const prospect = state.prospects?.find((item) => item.id === id);
  const customer = state.customers?.find((item) => item.id === id);
  const target = prospect || customer;
  if (!target) return null;
  const attempt = Number(target.decisionAttempts || 0);
  if (deterministicRoll(state, event, id) < humanDecisionChance(peopleLevel, attempt)) return null;
  const spent = spend(state, 1, event === EVENTS2.INVITE_XVISOR ? "team" : "attract");
  if (!spent) return state;
  if (prospect) {
    const prospects = spent.prospects.map((item) => item.id !== id ? item : {
      ...item,
      decisionAttempts: attempt + 1,
      journey: attempt >= 1 ? "cooldown" : "waiting",
      nextOfferMonth: Number(state.month || 0) + (attempt >= 1 ? 2 : 1),
      lastContactMonth: state.month,
      status: attempt >= 1 ? "พักไว้ก่อน · ยังไม่ต้องตาม" : `ขอคิดก่อน · รอเดือน ${Number(state.month || 0) + 1}`
    });
    return { ...spent, prospects, lastEvent: `${event}_NO`, lastMessage: `${prospect.name} ยังไม่พร้อมตอนนี้ · เกมพักเคสให้ ไม่ต้องตามซ้ำ`, updatedAt: Date.now() };
  }
  const customers = spent.customers.map((item) => item.id !== id ? item : {
    ...item,
    decisionAttempts: attempt + 1,
    referralAsked: event === EVENTS2.ASK_REFERRAL ? true : item.referralAsked,
    xvisorInterest: event === EVENTS2.INVITE_XVISOR ? false : item.xvisorInterest,
    status: event === EVENTS2.ASK_REFERRAL ? "ยังไม่พร้อมแนะนำเพื่อนตอนนี้" : "ยังไม่สนใจ X-VISOR ตอนนี้ · ดูแล Routine ต่อ"
  });
  return { ...spent, customers, lastEvent: `${event}_NO`, lastMessage: `${customer.name} ยังไม่พร้อม · ความสัมพันธ์ยังเดินต่อโดยไม่ spam`, updatedAt: Date.now() };
}
function runXircle(state) {
  if (!XIRCLE_MONTHS.includes(Number(state.month || 0)) || state.monthStats?.xircleDone) return state;
  const spent = spend(state, Math.min(2, state.energy), "team");
  if (!spent) return state;
  const peopleLevel = getSkillLevel2(spent.skills, "people");
  const leadership = getSkillLevel2(spent.skills, "leadership");
  const prospects = [...spent.prospects || []].filter((person) => person.journey !== "dormant");
  const customers = [...spent.customers || []];
  const team = [...spent.team || []].filter((member) => member.active);
  const invited = prospects.length + customers.length + team.length;
  const attendanceRate = Math.min(0.92, 0.48 + peopleLevel * 0.025 + leadership * 0.018);
  const attended = Math.max(1, Math.round(Math.max(1, invited) * attendanceRate));
  let remaining = attended;
  const nextProspects = spent.prospects.map((person) => {
    if (remaining <= 0 || person.journey === "dormant") return person;
    remaining -= 1;
    return {
      ...person,
      readiness: Math.min(99, Number(person.readiness || 0) + 16 + peopleLevel),
      trust: Math.min(100, Number(person.trust || 0) + 10),
      journey: ["new", "scheduled", "waiting", "cooldown"].includes(person.journey) ? "discovery" : person.journey,
      status: "🏕️ The Xircle · พร้อมคุย Next Action",
      origin: originFor(person, spent),
      xircleMomentumUntil: state.month + 2
    };
  });
  const nextCustomers = spent.customers.map((customer) => {
    if (remaining <= 0) return normalizeCustomer(customer, spent);
    remaining -= 1;
    const satisfaction = Math.min(100, satisfactionFor(customer) + 14);
    return {
      ...normalizeCustomer(customer, spent),
      satisfaction,
      adherence: Math.min(100, Number(customer.adherence || 55) + 12),
      referralReady: satisfaction >= 82 ? true : customer.referralReady,
      xvisorInterest: customer.successCase && satisfaction >= 82 ? true : customer.xvisorInterest,
      status: "🏕️ The Xircle · Momentum สูงขึ้น",
      xircleMomentumUntil: state.month + 2
    };
  });
  const nextTeam = spent.team.map((member) => {
    if (remaining <= 0 || !member.active) return { ...member, origin: originFor(member, spent, "team") };
    remaining -= 1;
    return {
      ...member,
      origin: originFor(member, spent, "team"),
      confidence: Math.min(100, Number(member.confidence || 0) + 12),
      autonomy: Math.min(100, Number(member.autonomy || 0) + 8),
      teamSkill: Math.min(10, Number(member.teamSkill || 1) + 1),
      candidatePipeline: Number(member.candidatePipeline || 0) + Number(member.specialty === "builder"),
      status: "🏕️ The Xircle · ได้ Momentum ใหม่"
    };
  });
  let next = { ...spent, prospects: nextProspects, customers: nextCustomers, team: nextTeam };
  for (const id of SKILL_IDS2) next = addSkillXp2(next, id, 3, "the-xircle");
  const xircleHistory = Array.isArray(next.xircleHistory) ? next.xircleHistory : [];
  return {
    ...next,
    xircleMomentum: { sourceMonth: state.month, expiresAfterMonth: state.month + 2, strength: state.month === 12 ? 2 : 1 },
    xircleHistory: [...xircleHistory, { month: state.month, invited, attended }],
    monthStats: { ...next.monthStats, xircleDone: true },
    sceneReport: { kind: "the-xircle", invited, attended, messages: [`ชวน ${invited} · มา ${attended}`, "ทุกคนที่มาได้รับ Momentum ตามบทบาท", "⭐ คุณได้รับ THE XIRCLE BUFF"] },
    lastEvent: EVENTS2.RUN_XIRCLE,
    lastMessage: `🏕️ THE XIRCLE เดือน ${state.month} · ${attended} คนได้รับ Momentum`,
    updatedAt: Date.now()
  };
}
function certifyXlead(state) {
  if (!state.career?.xleadQualified || state.career?.xleadCertified) return state;
  return {
    ...state,
    rank: "xlead",
    career: { ...state.career, xleadCertified: true, xleadAtMonth: state.month },
    organization: { ...state.organization, mapUnlocked: true },
    milestones: { ...state.milestones, firstXlead: true },
    sceneReport: { kind: "xlead-exam", passed: true },
    lastEvent: EVENTS2.XLEAD_EXAM,
    lastMessage: "🏅 Certified XLEAD · ปลดล็อก ② รายได้จากการพัฒนา Direct G1",
    updatedAt: Date.now()
  };
}
function certifyXgen(state) {
  const economy = calculateEconomy2(state);
  const qualified2 = economy.tgv >= XGEN_TGV_TARGET || Number(state.organization?.bestTGV || 0) >= XGEN_TGV_TARGET;
  if (!qualified2 || state.career?.xgenCertified) return state;
  return {
    ...state,
    rank: "xgen",
    career: { ...state.career, xgenQualified: true, xgenCertified: true, xgenAtMonth: state.month },
    organization: { ...state.organization, xgen: true, mapUnlocked: true, endless: false },
    milestones: { ...state.milestones, xgen: true },
    sceneReport: { kind: "xgen-exam", passed: true, tgv: economy.tgv },
    lastEvent: EVENTS2.XGEN_EXAM,
    lastMessage: "🏆 Certified XGEN · ปลดล็อก ③ รายได้จากการบริหาร Organization",
    updatedAt: Date.now()
  };
}
function cleanHistoryEntry(entry) {
  return { ...entry, channel1: Number(entry.channel1 || 0), channel2: Number(entry.channel2 || 0), channel3: Number(entry.channel3 || 0), channel4: 0, total: Number(entry.channel1 || 0) + Number(entry.channel2 || 0) + Number(entry.channel3 || 0) };
}
function campaignScoreFor(state) {
  const summaries = (state.monthSummaries || []).filter((item) => Number(item.month) <= CAMPAIGN_MONTHS);
  const histories = (state.economy?.incomeHistory || []).filter((item) => Number(item.month) <= CAMPAIGN_MONTHS).map(cleanHistoryEntry);
  const totals = histories.map((item) => Number(item.total || 0));
  return {
    completedMonth: CAMPAIGN_MONTHS,
    bestTgv: Math.max(0, ...summaries.map((item) => Number(item.tgv || 0)), Number(state.organization?.bestTGV || 0)),
    totalIncome: totals.reduce((sum, value) => sum + value, 0),
    bestMonthlyIncome: Math.max(0, ...totals),
    organizationSize: uniqueOrganizationPeople(state),
    completedAt: Date.now(),
    scoreVersion: V8_SCORE_VERSION,
    runMode: state.runMode || "FIRST_RUN",
    locked: true
  };
}
function normalizeClosedMonth(before, after) {
  const oldTotal = Math.max(0, Number(before.economy?.totalIncome ?? before.economy?.receivedIncome ?? 0));
  const econ = calculateEconomy2(before);
  const total = oldTotal + econ.projectedIncome;
  const history = (after.economy?.incomeHistory || []).filter((item) => Number(item.month) !== Number(before.month));
  const entry = { month: before.month, channel1: econ.channel1, channel2: econ.channel2, channel3: econ.channel3, channel4: 0, total: econ.projectedIncome, tgv: econ.tgv };
  const summaries = [...after.monthSummaries || []];
  const index = summaries.findIndex((item) => Number(item.month) === Number(before.month));
  const summary = {
    ...index >= 0 ? summaries[index] : {},
    month: before.month,
    xv: econ.personalXV,
    productSales: econ.productSales,
    teamXV: econ.teamXV,
    teamProductSales: econ.teamProductSales,
    tgv: econ.tgv,
    bestTGV: Math.max(Number(before.organization?.bestTGV || 0), econ.tgv),
    income: { channel1: econ.channel1, channel2: econ.channel2, channel3: econ.channel3, channel4: 0, total: econ.projectedIncome },
    channels: { channel1: econ.channel1, channel2: econ.channel2, channel3: econ.channel3, channel4: 0, total: econ.projectedIncome },
    projectedIncome: econ.projectedIncome,
    receivedIncome: econ.projectedIncome,
    receivedIncomeTotal: total
  };
  if (index >= 0) summaries[index] = summary;
  else summaries.push(summary);
  return {
    ...after,
    rank: before.career?.xgenCertified ? "xgen" : before.career?.xleadCertified ? "xlead" : before.rank === "candidate" ? "candidate" : "xvisor",
    organization: { ...after.organization, xgen: Boolean(before.career?.xgenCertified), endless: false, breakawayVolume: 0, tgv: econ.tgv, previousTGV: econ.tgv, bestTGV: Math.max(Number(before.organization?.bestTGV || 0), econ.tgv) },
    milestones: { ...after.milestones, xgen: Boolean(before.career?.xgenCertified) },
    economy: { ...after.economy, totalIncome: total, receivedIncome: total, incomeHistory: [...history, entry].sort((a, b) => Number(a.month) - Number(b.month)) },
    monthSummaries: summaries,
    stage: after.stage === STAGES.XGEN_MILESTONE && !before.career?.xgenCertified ? STAGES.MONTH_CLOSED : after.stage
  };
}
function aggregateFromState(state, overflowPeople = 0) {
  const team = state.team || [];
  const activeCustomers = (state.customers || []).filter((item) => item.activePlan !== false).length + team.reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  return {
    xvisorCount: Math.max(team.length, Number(state.organization?.aggregate?.xvisorCount || 0)),
    xleadCount: Math.max(team.filter((member) => member.rank === "xlead").length, Number(state.organization?.aggregate?.xleadCount || 0)),
    activeCustomers: Math.max(activeCustomers, Number(state.organization?.aggregate?.activeCustomers || 0)),
    candidateCount: Math.max(0, team.reduce((sum, member) => sum + Math.max(0, Number(member.candidatePipeline || 0)), 0)),
    overflowPeople: Math.max(overflowPeople, Number(state.organization?.aggregate?.overflowPeople || 0))
  };
}
function simulateEndgameMonth(state) {
  const nextMonth = Number(state.month || CAMPAIGN_MONTHS) + 1;
  const previousTgv = Math.max(1, Number(state.organization?.previousTGV || state.organization?.tgv || state.campaignScore?.bestTgv || 1));
  const aggregate = aggregateFromState(state);
  const scalePenalty = Math.min(0.055, Math.log10(Math.max(1, previousTgv / 1e6)) * 0.018);
  const leaderQuality = Math.min(0.025, aggregate.xleadCount * 15e-4);
  const wave = ((Number(state.rngSeed || 1) + nextMonth * 17) % 9 - 4) * 3e-3;
  const growthRate = Math.max(-0.015, Math.min(0.095, 0.055 + leaderQuality - scalePenalty + wave));
  const tgv = Math.max(0, Math.round(previousTgv * (1 + growthRate)));
  const customerGrowth = Math.max(0, Math.round(Math.sqrt(Math.max(1, aggregate.activeCustomers)) * (0.7 + aggregate.xleadCount * 0.04)));
  const activeCustomers = Math.max(1, aggregate.activeCustomers + customerGrowth - Math.round(aggregate.activeCustomers * 0.012));
  const newXvisors = Math.max(0, Math.min(6, Math.round(Math.sqrt(Math.max(1, activeCustomers)) / 10 + aggregate.xleadCount * 0.08) - Math.floor(aggregate.xvisorCount / 90)));
  const xvisorCount = Math.max(aggregate.xvisorCount, aggregate.xvisorCount + newXvisors);
  const xleadGrowth = xvisorCount >= 12 ? Math.max(0, Math.min(2, Math.floor((xvisorCount - aggregate.xleadCount * 8) / 35))) : 0;
  const xleadCount2 = Math.max(aggregate.xleadCount, aggregate.xleadCount + xleadGrowth);
  const channel3 = state.career?.xgenCertified ? Math.round(tgv * ORGANIZATION_INCOME_RULE2.rate) : 0;
  const directMentoring = Math.max(0, Math.round(Number(state.campaignScore?.bestMonthlyIncome || 0) * 0.18));
  const personalRecurring = Math.round((state.customers || []).filter((item) => satisfactionFor(item) >= 75).length * TUTORIAL_OFFER2.xv * 0.2);
  const monthlyIncome = personalRecurring + directMentoring + channel3;
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome || 0)) + monthlyIncome;
  const entry = { month: nextMonth, channel1: personalRecurring, channel2: directMentoring, channel3, channel4: 0, total: monthlyIncome, tgv };
  const story = newXvisors ? `🌱 ทีมสร้าง X-VISOR ใหม่ ${newXvisors} คนจาก Candidate Pipeline` : xleadGrowth ? `👑 มี XLEAD ใหม่ ${xleadGrowth} คน` : `❤️ ลูกค้า active ${activeCustomers.toLocaleString("th-TH")} คน · ระบบยังเดินต่อ`;
  return {
    ...state,
    stage: STAGES.MANAGEMENT,
    phase: "organization",
    month: nextMonth,
    energy: 0,
    organizationMode: true,
    organization: { ...state.organization, endless: false, tgv, previousTGV: tgv, bestTGV: Math.max(Number(state.organization?.bestTGV || 0), tgv), aggregate: { ...aggregate, activeCustomers, xvisorCount, xleadCount: xleadCount2 } },
    economy: { ...state.economy, personalXV: 0, teamXV: tgv, productSales: 0, teamProductSales: 0, totalIncome, receivedIncome: totalIncome, incomeHistory: [...state.economy?.incomeHistory || [], entry], lastTransaction: null },
    monthStats: { ...makeMonthStats(), teamActions: Math.round(activeCustomers * 2.6), teamCycleDone: true },
    lastMessage: `🏙️ เดือน ${nextMonth} · TGV ${tgv.toLocaleString("th-TH")} XV · ${story}`,
    sceneReport: { kind: "organization", tgv, monthlyIncome, activeCustomers, xvisorCount, xleadCount: xleadCount2, story },
    updatedAt: Date.now()
  };
}
function compressState(state, originalTeamCount = null) {
  const fullTeam = Array.isArray(state.team) ? state.team : [];
  const totalCount = originalTeamCount ?? fullTeam.length;
  if (fullTeam.length <= 80 && Number(state.month || 0) <= CAMPAIGN_MONTHS) return state;
  const selected = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (member) => {
    if (!member || seen.has(member.id) || selected.length >= 60) return;
    seen.add(member.id);
    selected.push(member);
  };
  fullTeam.filter((member) => member.parentId === "player").forEach(push);
  fullTeam.filter((member) => member.rank === "xlead").forEach(push);
  fullTeam.forEach(push);
  const overflow = Math.max(0, totalCount - selected.length);
  const aggregate = aggregateFromState({ ...state, team: fullTeam }, overflow);
  return { ...state, team: selected, organization: { ...state.organization, aggregate } };
}
function normalizeState(state, previous = null) {
  let next = {
    ...state,
    v8: true,
    scoreVersion: V8_SCORE_VERSION,
    customers: (state.customers || []).map((item) => normalizeCustomer(item, state)),
    prospects: (state.prospects || []).map((item) => ({ ...item, origin: originFor(item, state, item.source || "prospect") })),
    team: (state.team || []).map((item) => normalizeTeamMember(item, state)),
    career: {
      ...state.career,
      xleadQualified: Boolean(state.career?.xleadQualified),
      xleadCertified: Boolean(state.career?.xleadCertified || state.rank === "xlead" || state.rank === "xgen"),
      xgenQualified: Boolean(state.career?.xgenQualified || Number(state.organization?.bestTGV || 0) >= XGEN_TGV_TARGET),
      xgenCertified: Boolean(state.career?.xgenCertified)
    },
    organization: { ...state.organization, breakawayVolume: 0, endless: false }
  };
  if (previous && previous.career && !previous.career.xgenCertified && state.rank === "xgen") {
    next = { ...next, rank: previous.career.xleadCertified ? "xlead" : "xvisor", organization: { ...next.organization, xgen: false }, milestones: { ...next.milestones, xgen: false } };
  }
  const econ = calculateEconomy2(next);
  next = { ...next, organization: { ...next.organization, tgv: econ.tgv, breakawayVolume: 0 }, economy: { ...next.economy, breakawayVolume: 0 } };
  if (next.month >= CAMPAIGN_MONTHS && next.monthSummaries?.some((item) => Number(item.month) === CAMPAIGN_MONTHS) && !next.campaignScore?.locked) next = { ...next, campaignComplete: true, campaignScore: campaignScoreFor(next) };
  if (Number(next.month || 0) > CAMPAIGN_MONTHS || next.organizationMode) {
    next = compressState(next);
    next = { ...next, organizationMode: true, phase: "organization", energy: 0, stage: STAGES.MANAGEMENT };
  } else if ((next.team || []).length > 80) next = compressState(next);
  return next;
}
function makeInitialState2(options = {}) {
  const base = makeInitialState(options);
  return normalizeState({ ...base, runMode: options.newGamePlus ? "NEW_GAME_PLUS" : "FIRST_RUN", eventLog: [], xircleHistory: [], xircleMomentum: null, campaignComplete: false, campaignScore: null, organizationMode: false });
}
function makeNewGamePlusState(options = {}) {
  const base = makeInitialState2({ ...options, newGamePlus: true });
  return normalizeState({ ...base, stage: STAGES.M1_EMPTY, phase: "management", month: 1, energy: MAX_ENERGY, rank: "xvisor", milestones: { ...base.milestones, certified: true }, career: { ...base.career, certificationPreviouslyPassed: true }, lastMessage: "⚡ NEW GAME+ · ข้าม PRE-SEASON และเริ่ม Month 1 แบบอิสระแล้ว" });
}
function canDispatch2(state, event) {
  if (CUSTOM_EVENTS.has(event)) return true;
  if (state.organizationMode && event === EVENTS2.END_MONTH) return true;
  return canDispatch(state, event);
}
function getBestNextActions2(state, limit = 3) {
  if (state.organizationMode) return [{ type: "organization-pass", event: EVENTS2.END_MONTH, label: "▶ ผ่านไปอีก 1 เดือน", cost: 0, score: 1e3 }];
  const actions = [];
  if (XIRCLE_MONTHS.includes(Number(state.month || 0)) && !state.monthStats?.xircleDone) {
    const eligible = (state.prospects || []).filter((p) => p.journey !== "dormant").length + (state.customers || []).length + (state.team || []).filter((m) => m.active).length;
    actions.push({ type: "the-xircle", event: EVENTS2.RUN_XIRCLE, label: `🏕️ THE XIRCLE · ชวนได้ ${eligible} คน`, cost: Math.min(2, state.energy), score: 180 });
  }
  if (state.career?.xleadQualified && !state.career?.xleadCertified) actions.push({ type: "xlead-exam", event: EVENTS2.XLEAD_EXAM, label: "🎓 เข้าสอบ XLEAD · ปลดล็อก ②", cost: 0, score: 175 });
  const economy = calculateEconomy2(state);
  if ((economy.tgv >= XGEN_TGV_TARGET || Number(state.organization?.bestTGV || 0) >= XGEN_TGV_TARGET) && !state.career?.xgenCertified) actions.push({ type: "xgen-exam", event: EVENTS2.XGEN_EXAM, label: "🎓 เข้าสอบ XGEN · ปลดล็อก ③", cost: 0, score: 190 });
  const legacyActions = getBestNextActions(state, Math.max(6, limit + 3)).map((item) => {
    if (!item.targetId) return item;
    const target = [...state.prospects || [], ...state.customers || [], ...state.team || []].find((person) => person.id === item.targetId);
    if (!target?.name || String(item.label || "").includes(target.name)) return item;
    return { ...item, label: `${item.label} · ${target.name}` };
  });
  actions.push(...legacyActions.filter((item) => item.type !== "skill" || getSkillLevel2(state.skills, item.payload?.skill) < 10));
  if (!actions.some((item) => item.event === EVENTS2.END_MONTH)) actions.push({ type: "end-month", event: EVENTS2.END_MONTH, label: "🌙 จบเดือน", cost: 0, score: 2 });
  const unique = /* @__PURE__ */ new Map();
  actions.forEach((item) => {
    const key = `${item.event || item.type}:${item.targetId || item.payload?.id || ""}`;
    if (!unique.has(key) || Number(item.score || 0) > Number(unique.get(key).score || 0)) unique.set(key, item);
  });
  return [...unique.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, Math.max(1, limit));
}
function prepareLegacyState(state, event) {
  if (event !== EVENTS2.START_NEXT_MONTH) return state;
  return {
    ...state,
    customers: (state.customers || []).map((customer) => {
      const satisfaction = satisfactionFor(customer);
      const stable = satisfaction >= 75 && customer.activePlan !== false;
      return { ...customer, satisfaction, selfDirected: stable, customerState: stable ? CUSTOMER_STATES.SELF_DIRECTED : customer.customerState };
    })
  };
}
function reduceGame2(currentState, event, payload = {}) {
  let state = normalizeState(currentState);
  if (!canDispatch2(state, event)) return state;
  if (state.organizationMode && event === EVENTS2.END_MONTH) return addEventLog(simulateEndgameMonth(state), event, payload);
  if (event === EVENTS2.RUN_XIRCLE) return addEventLog(normalizeState(runXircle(state), state), event, payload);
  if (event === EVENTS2.XLEAD_EXAM) return addEventLog(normalizeState(certifyXlead(state), state), event, payload);
  if (event === EVENTS2.XGEN_EXAM) return addEventLog(normalizeState(certifyXgen(state), state), event, payload);
  if (event === EVENTS2.NEW_GAME_PLUS) return addEventLog(makeNewGamePlusState({ seed: state.rngSeed }), event, payload);
  if ([EVENTS2.OFFER_PROSPECT, EVENTS2.FOLLOW_UP_DECISION, EVENTS2.ASK_REFERRAL, EVENTS2.INVITE_XVISOR].includes(event)) {
    const failed = humanDecisionFailure(state, event, payload);
    if (failed) return addEventLog(normalizeState(failed, state), event, payload);
  }
  if (event === EVENTS2.START_NEXT_MONTH && (state.campaignComplete || Number(state.month || 0) >= CAMPAIGN_MONTHS)) {
    const endgame = simulateEndgameMonth({ ...state, organizationMode: true, energy: 0, campaignComplete: true, campaignScore: state.campaignScore || campaignScoreFor(state) });
    return addEventLog(normalizeState(endgame, state), event, payload);
  }
  const prepared = prepareLegacyState(state, event);
  let next = reduceGame(prepared, event, payload);
  if (event === EVENTS2.END_MONTH && next !== prepared) next = normalizeClosedMonth(prepared, next);
  next = normalizeState(next, prepared);
  if (event === EVENTS2.END_MONTH && Number(prepared.month || 0) === CAMPAIGN_MONTHS) next = { ...next, campaignComplete: true, campaignScore: campaignScoreFor(next), lastMessage: "🏆 12 เดือนจบแล้ว · High Score ถูกล็อก และคุณเลือกเล่น Organization Mode ต่อได้" };
  if (event === EVENTS2.START_NEXT_MONTH && Number(next.month || 0) === 3 && !next.xircleAnnounced) next = { ...next, xircleAnnounced: true, lastMessage: "🏕️ THE XIRCLE มาแล้ว · แคมป์ 2 วัน 1 คืนในเดือน 3 · 6 · 9 · 12", sceneReport: { kind: "xircle-announcement", schedule: XIRCLE_MONTHS } };
  return addEventLog(next, event, payload);
}
function serializeState2(state) {
  return serializeState(normalizeState(state));
}
function parseSavedState2(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const originalTeamCount = Array.isArray(value.team) ? value.team.length : 0;
    if (originalTeamCount > 120) {
      value.organization = { ...value.organization || {}, aggregate: { ...value.organization?.aggregate || {}, xvisorCount: Math.max(originalTeamCount, Number(value.organization?.aggregate?.xvisorCount || 0)), overflowPeople: Math.max(0, originalTeamCount - 60) } };
      value.team = value.team.slice(0, 80);
    }
    if (Number(value.month || 0) > CAMPAIGN_MONTHS) value.energy = 0;
    const parsed = parseSavedState(JSON.stringify(value));
    if (!parsed) return null;
    let next = normalizeState(parsed);
    if (originalTeamCount > 120) next = compressState(next, originalTeamCount);
    if (Number(next.month || 0) > CAMPAIGN_MONTHS) next = { ...next, campaignComplete: true, campaignScore: next.campaignScore || campaignScoreFor(next), organizationMode: true, energy: 0, stage: STAGES.MANAGEMENT, phase: "organization" };
    return next;
  } catch {
    return null;
  }
}

var GAME_VERSION = "V9 PRE-RELEASE";
var V9_SAVE_VERSION = "v9-pre-release-1";
var V9_SCORE_VERSION = "v9-pre-release-1";
var XGEN_ROLLING_TARGET = 3e6;
var PEOPLE_RENDER_LIMIT2 = 25;
var CAMPAIGN_MONTHS2 = 12;
var EVENTS3 = Object.freeze({
  ...EVENTS2,
  ENTER_ORGANIZATION: "ENTER_ORGANIZATION"
});
var PERSON_EVENT_BY_MISSION = Object.freeze({
  contact: EVENTS3.CONTACT_PROSPECT,
  meet: EVENTS3.MEET_PROSPECT,
  consult: EVENTS3.CONSULT_PROSPECT,
  baseline: EVENTS3.BASELINE_PROSPECT,
  routine: EVENTS3.OPEN_MANAGEMENT_ROUTINE,
  offer: EVENTS3.OFFER_PROSPECT,
  decision: EVENTS3.FOLLOW_UP_DECISION,
  care: EVENTS3.CARE_CUSTOMER,
  remeasure: EVENTS3.REMEASURE_CUSTOMER,
  reorder: EVENTS3.REORDER_CUSTOMER,
  referral: EVENTS3.ASK_REFERRAL,
  xvisor: EVENTS3.INVITE_XVISOR,
  "candidate-start": EVENTS3.START_CANDIDATE_XCADEMY,
  "candidate-review": EVENTS3.REVIEW_CANDIDATE,
  "candidate-certify": EVENTS3.CERTIFY_CANDIDATE,
  mentor: EVENTS3.MENTOR_TEAM_MEMBER
});
var PERSON_EVENTS = new Set(Object.values(PERSON_EVENT_BY_MISSION));
function clampNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
function makeRunId(seed = 1) {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
  }
  return `v9-${Date.now().toString(36)}-${Number(seed || 1).toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
function peopleIn(state) {
  return [...state.prospects || [], ...state.customers || [], ...state.team || []];
}
function findPerson(state, id) {
  if (!id) return null;
  return peopleIn(state).find((person) => person.id === id || person.personId === id) || null;
}
function uniqueOrganizationPeople2(state) {
  const ids = /* @__PURE__ */ new Set();
  for (const person of peopleIn(state)) {
    const id = person.personId || person.id;
    if (id) ids.add(id);
  }
  return ids.size + Math.max(0, Number(state.organization?.aggregate?.overflowPeople || 0));
}
function cleanTgvHistory(list = []) {
  const byMonth = /* @__PURE__ */ new Map();
  for (const entry of Array.isArray(list) ? list : []) {
    const month = Number(entry?.month || 0);
    if (month < 1) continue;
    byMonth.set(month, { month, tgv: Math.max(0, Math.round(Number(entry?.tgv || 0))) });
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}
function getTgvHistory(state) {
  const existing = cleanTgvHistory(state.organization?.tgvHistory || []);
  const byMonth = new Map(existing.map((entry) => [entry.month, entry]));
  for (const summary of state.monthSummaries || []) {
    const month = Number(summary?.month || 0);
    if (month > 0 && !byMonth.has(month)) byMonth.set(month, { month, tgv: Math.max(0, Math.round(Number(summary?.tgv || 0))) });
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}
function getCurrentTGV(state) {
  return Math.max(0, Math.round(Number(state.economy?.personalXV || 0) + Number(state.economy?.teamXV || 0)));
}
function getRolling3TGV(state) {
  const month = Number(state.month || 0);
  if (month < 1) return 0;
  const history = new Map(getTgvHistory(state).map((entry) => [entry.month, Number(entry.tgv || 0)]));
  if (!state.organizationMode && !history.has(month)) history.set(month, getCurrentTGV(state));
  if (state.organizationMode) history.set(month, getCurrentTGV(state));
  let total = 0;
  for (let candidate = Math.max(1, month - 2); candidate <= month; candidate += 1) total += Number(history.get(candidate) || 0);
  return Math.max(0, Math.round(total));
}
function baseEconomyFor(state) {
  const currentTGV = getCurrentTGV(state);
  const sanitized = {
    ...state,
    organization: { ...state.organization || {}, tgv: currentTGV }
  };
  return calculateEconomy2(sanitized);
}
function calculateEconomy3(state) {
  const base = baseEconomyFor(state);
  const currentTGV = getCurrentTGV(state);
  if (state.organizationMode && state.organizationMonthIncome) {
    const parts = state.organizationMonthIncome;
    const channel12 = Math.max(0, Math.round(Number(parts.channel1 || 0)));
    const channel22 = Math.max(0, Math.round(Number(parts.channel2 || 0)));
    const channel32 = state.career?.xgenCertified ? Math.max(0, Math.round(Number(parts.channel3 || currentTGV * 0.05))) : 0;
    const projectedIncome2 = channel12 + channel22 + channel32;
    const totalIncome2 = Math.max(0, Number(state.economy?.totalIncome ?? state.economy?.receivedIncome ?? 0));
    const currentMonthClosed2 = Boolean(state.settlements?.[String(state.month)]);
    return {
      ...base,
      tgv: currentTGV,
      currentTGV,
      organizationIncome: channel32,
      channel1: channel12,
      channel2: channel22,
      channel3: channel32,
      channel4: 0,
      breakawayIncome: 0,
      breakawayVolume: 0,
      projectedIncome: projectedIncome2,
      monthlyIncome: projectedIncome2,
      teamIncome: channel22 + channel32,
      totalIncome: totalIncome2,
      receivedIncome: totalIncome2,
      lifetimeIncome: totalIncome2 + (currentMonthClosed2 ? 0 : projectedIncome2)
    };
  }
  const channel1 = Math.max(0, Math.round(Number(base.channel1 || 0)));
  const channel2 = Math.max(0, Math.round(Number(base.channel2 || 0)));
  const channel3 = state.career?.xgenCertified ? Math.round(currentTGV * 0.05) : 0;
  const projectedIncome = channel1 + channel2 + channel3;
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome ?? state.economy?.receivedIncome ?? 0));
  const currentMonthClosed = Boolean(state.settlements?.[String(state.month)]);
  return {
    ...base,
    tgv: currentTGV,
    currentTGV,
    organizationIncome: channel3,
    channel1,
    channel2,
    channel3,
    channel4: 0,
    breakawayIncome: 0,
    breakawayVolume: 0,
    projectedIncome,
    monthlyIncome: projectedIncome,
    teamIncome: channel2 + channel3,
    totalIncome,
    receivedIncome: totalIncome,
    lifetimeIncome: totalIncome + (currentMonthClosed ? 0 : projectedIncome)
  };
}
function personActionCost(event) {
  const costs = ENERGY_COSTS || {};
  const map = {
    [EVENTS3.CONTACT_PROSPECT]: costs.remoteContact ?? 1,
    [EVENTS3.MEET_PROSPECT]: costs.inPerson ?? 2,
    [EVENTS3.CONSULT_PROSPECT]: costs.consultation ?? 1,
    [EVENTS3.BASELINE_PROSPECT]: costs.scale ?? 2,
    [EVENTS3.OPEN_MANAGEMENT_ROUTINE]: 0,
    [EVENTS3.OFFER_PROSPECT]: costs.offer ?? 1,
    [EVENTS3.FOLLOW_UP_DECISION]: costs.followup ?? 1,
    [EVENTS3.CARE_CUSTOMER]: costs.followup ?? 1,
    [EVENTS3.REMEASURE_CUSTOMER]: costs.scale ?? 2,
    [EVENTS3.REORDER_CUSTOMER]: costs.reorder ?? 1,
    [EVENTS3.ASK_REFERRAL]: costs.referral ?? 1,
    [EVENTS3.INVITE_XVISOR]: costs.candidate ?? 1,
    [EVENTS3.START_CANDIDATE_XCADEMY]: costs.candidate ?? 1,
    [EVENTS3.REVIEW_CANDIDATE]: costs.candidate ?? 1,
    [EVENTS3.CERTIFY_CANDIDATE]: costs.candidate ?? 1,
    [EVENTS3.MENTOR_TEAM_MEMBER]: costs.mentoring ?? 1
  };
  return Number(map[event] ?? 0);
}
function buildPersonAction({ event, target, state, reason = "", expectedOutcome = "" } = {}) {
  if (!event || !target?.id || !target?.name || !PERSON_EVENTS.has(event)) return null;
  const name = target.name;
  const labels = {
    [EVENTS3.CONTACT_PROSPECT]: `💬 ทัก ${name}`,
    [EVENTS3.MEET_PROSPECT]: `🤝 พบ ${name}`,
    [EVENTS3.CONSULT_PROSPECT]: `💬 คุยกับ ${name}`,
    [EVENTS3.BASELINE_PROSPECT]: `⚖️ ดู Baseline กับ ${name}`,
    [EVENTS3.OPEN_MANAGEMENT_ROUTINE]: `🧩 วาง Routine ให้ ${name}`,
    [EVENTS3.OFFER_PROSPECT]: `📁 นัดคุยแฟ้ม X กับ ${name}`,
    [EVENTS3.FOLLOW_UP_DECISION]: `🔥 คุยให้รู้ผลกับ ${name}`,
    [EVENTS3.CARE_CUSTOMER]: `❤️ ดูแล ${name}`,
    [EVENTS3.REMEASURE_CUSTOMER]: `📊 วัดซ้ำกับ ${name}`,
    [EVENTS3.REORDER_CUSTOMER]: `📦 ต่อ RoutineX เดือนใหม่ · ${name}`,
    [EVENTS3.ASK_REFERRAL]: `👥 ขอ Referral จาก ${name}`,
    [EVENTS3.INVITE_XVISOR]: `✨ ชวน ${name} รู้จัก X-VISOR`,
    [EVENTS3.START_CANDIDATE_XCADEMY]: `🎓 ชวน ${name} เข้า Xcademy`,
    [EVENTS3.REVIEW_CANDIDATE]: `🌱 Review Case กับ ${name}`,
    [EVENTS3.CERTIFY_CANDIDATE]: `🏅 Certification · ${name}`,
    [EVENTS3.MENTOR_TEAM_MEMBER]: `🌱 Mentor ${name}`
  };
  const label = labels[event];
  if (!label) return null;
  return {
    event,
    targetId: target.id,
    targetName: name,
    label,
    reason: reason || target.status || "",
    expectedOutcome,
    cost: personActionCost(event),
    payload: { id: target.id },
    stateMonth: Number(state?.month || 0)
  };
}
function inferPersonKind(state, target) {
  if ((state.team || []).some((person) => person.id === target.id)) return "team";
  if ((state.customers || []).some((person) => person.id === target.id)) return "customer";
  return "prospect";
}
function getPersonContextAction(state, target, kind = null) {
  if (!target?.id || !target?.name) return null;
  const actualKind = kind || inferPersonKind(state, target);
  if (actualKind === "team") {
    if (target.active && Number(target.autonomy || 0) < 85) return buildPersonAction({ event: EVENTS3.MENTOR_TEAM_MEMBER, target, state });
    return null;
  }
  if (actualKind === "prospect") {
    const eventByJourney = {
      new: EVENTS3.CONTACT_PROSPECT,
      scheduled: EVENTS3.MEET_PROSPECT,
      conversation: EVENTS3.CONSULT_PROSPECT,
      discovery: EVENTS3.BASELINE_PROSPECT,
      baseline: EVENTS3.OPEN_MANAGEMENT_ROUTINE,
      recommendation: EVENTS3.OFFER_PROSPECT
    };
    if (target.journey === "waiting" && Number(target.nextOfferMonth || 0) <= Number(state.month || 0) && Number(target.decisionAttempts || 0) < 2) {
      return buildPersonAction({ event: EVENTS3.FOLLOW_UP_DECISION, target, state });
    }
    return buildPersonAction({ event: eventByJourney[target.journey], target, state });
  }
  if (target.xvisorStage === "ready") return buildPersonAction({ event: EVENTS3.START_CANDIDATE_XCADEMY, target, state });
  if (target.xvisorStage === "xcademy") return buildPersonAction({ event: EVENTS3.REVIEW_CANDIDATE, target, state });
  if (target.xvisorStage === "case") return buildPersonAction({ event: EVENTS3.CERTIFY_CANDIDATE, target, state });
  if (target.xvisorInterest && !target.xvisorStage) return buildPersonAction({ event: EVENTS3.INVITE_XVISOR, target, state });
  if (target.referralReady && !target.referralAsked) return buildPersonAction({ event: EVENTS3.ASK_REFERRAL, target, state });
  if (target.selfDirected || [CUSTOMER_STATES.SELF_DIRECTED, CUSTOMER_STATES.AUTO_REORDER].includes(target.customerState)) return null;
  if (target.customerState === CUSTOMER_STATES.READY_TO_BUY) return buildPersonAction({ event: EVENTS3.REORDER_CUSTOMER, target, state });
  if (Number(target.satisfaction || 0) < 55 || Number(target.day || 0) < 28) return buildPersonAction({ event: EVENTS3.CARE_CUSTOMER, target, state });
  if (!target.measuredAgain) return buildPersonAction({ event: EVENTS3.REMEASURE_CUSTOMER, target, state });
  return null;
}
function canonicalizeMissions(state) {
  if (!Array.isArray(state.missions)) return state;
  const missions = [];
  for (const mission of state.missions) {
    const event = PERSON_EVENT_BY_MISSION[mission.type];
    if (!event) {
      missions.push(mission);
      continue;
    }
    const target = findPerson(state, mission.targetId);
    const action = buildPersonAction({ event, target, state });
    if (!action) continue;
    missions.push({ ...mission, label: action.label, targetName: action.targetName, event: action.event });
  }
  return { ...state, missions };
}
function canonicalizeBestAction(state, item) {
  if (!item) return null;
  const targetId = item.targetId || item.mission?.targetId || item.payload?.id || item.id;
  const missionType = item.mission?.type || item.type;
  const event = item.event || PERSON_EVENT_BY_MISSION[missionType];
  const targetsPerson = Boolean(targetId && (PERSON_EVENTS.has(event) || PERSON_EVENT_BY_MISSION[missionType]));
  if (!targetsPerson) return item;
  const target = findPerson(state, targetId);
  const personEvent = event || PERSON_EVENT_BY_MISSION[missionType];
  const action = buildPersonAction({ event: personEvent, target, state });
  if (!action) return null;
  return {
    ...item,
    event: personEvent,
    targetId: target.id,
    targetName: target.name,
    payload: { ...item.payload || {}, id: target.id },
    label: action.label,
    cost: Number(item.cost ?? action.cost)
  };
}
function currentMonthHistoryMap(state) {
  return new Map(getTgvHistory(state).map((entry) => [entry.month, entry.tgv]));
}
function qualificationFromState(state, previous = null) {
  const rolling = getRolling3TGV(state);
  const persisted = Boolean(
    state.career?.xgenCertified || state.career?.xgenQualificationRule === "rolling3" || previous?.career?.xgenQualificationRule === "rolling3" || previous?.career?.xgenCertified
  );
  return { qualified: persisted || rolling >= XGEN_ROLLING_TARGET, rolling };
}
function normalizeV9State(input, previous = null) {
  let state = canonicalizeMissions(input);
  const currentTGV = getCurrentTGV(state);
  const history = getTgvHistory(state);
  const qualification = qualificationFromState(state, previous);
  const wasQualified = Boolean(
    previous?.career?.xgenQualificationRule === "rolling3" || previous?.career?.xgenCertified || state.career?.xgenQualificationRule === "rolling3" || state.career?.xgenCertified
  );
  const qualifiedAtMonth = state.career?.xgenQualifiedAtMonth || (qualification.qualified && !wasQualified ? Number(state.month || 0) : null);
  const career = {
    ...state.career || {},
    xgenQualified: qualification.qualified,
    xgenQualifiedAtMonth: qualifiedAtMonth,
    xgenQualificationRule: qualification.qualified ? "rolling3" : null
  };
  let sceneReport = state.sceneReport;
  let lastMessage = state.lastMessage;
  if (qualification.qualified && !wasQualified && !state.career?.xgenCertified) {
    sceneReport = { kind: "xgen-qualified", rolling3TGV: qualification.rolling, month: state.month };
    lastMessage = `🔓 XGEN Qualification พร้อมแล้ว · 3-Month TGV ${qualification.rolling.toLocaleString("th-TH")} XV`;
  }
  if (!career.xgenCertified && state.rank === "xgen") {
    state = { ...state, rank: state.career?.xleadCertified ? "xlead" : "xvisor" };
  }
  return canonicalizeMissions({
    ...state,
    gameVersion: GAME_VERSION,
    v9SaveVersion: V9_SAVE_VERSION,
    scoreVersion: V9_SCORE_VERSION,
    runId: state.runId || makeRunId(state.rngSeed),
    career,
    organization: {
      ...state.organization || {},
      tgv: currentTGV,
      currentTGV,
      rolling3TGV: qualification.rolling,
      tgvHistory: history,
      breakawayVolume: 0
    },
    economy: { ...state.economy || {}, breakawayVolume: 0 },
    sceneReport,
    lastMessage
  });
}
function settlementEntry(state) {
  const economy = calculateEconomy3(state);
  return Object.freeze({
    month: Number(state.month || 0),
    personalXV: Math.max(0, Math.round(Number(economy.personalXV || 0))),
    teamXV: Math.max(0, Math.round(Number(economy.teamXV || 0))),
    currentTGV: Math.max(0, Math.round(Number(economy.tgv || 0))),
    tgv: Math.max(0, Math.round(Number(economy.tgv || 0))),
    channel1: Math.max(0, Math.round(Number(economy.channel1 || 0))),
    channel2: Math.max(0, Math.round(Number(economy.channel2 || 0))),
    channel3: Math.max(0, Math.round(Number(economy.channel3 || 0))),
    channel4: 0,
    totalIncome: Math.max(0, Math.round(Number(economy.projectedIncome || 0))),
    total: Math.max(0, Math.round(Number(economy.projectedIncome || 0))),
    customerCount: Number(state.customers?.length || 0),
    xvisorCount: Number(state.organization?.aggregate?.xvisorCount || state.team?.length || 0),
    xleadCount: Number(state.organization?.aggregate?.xleadCount || state.team?.filter?.((member) => member.rank === "xlead").length || 0),
    settled: true
  });
}
function campaignScoreFor2(state) {
  const settlements = Object.values(state.settlements || {}).filter((entry) => Number(entry.month) >= 1 && Number(entry.month) <= CAMPAIGN_MONTHS2).sort((a, b) => Number(a.month) - Number(b.month));
  const totals = settlements.map((entry) => Number(entry.totalIncome ?? entry.total ?? 0));
  const tgvs = settlements.map((entry) => Number(entry.currentTGV ?? entry.tgv ?? 0));
  return {
    locked: true,
    completedMonth: CAMPAIGN_MONTHS2,
    bestTgv: Math.max(0, ...tgvs),
    totalIncome: totals.reduce((sum, value) => sum + value, 0),
    bestMonthlyIncome: Math.max(0, ...totals),
    organizationSize: uniqueOrganizationPeople2(state),
    completedAt: Date.now(),
    scoreVersion: V9_SCORE_VERSION,
    runMode: state.runMode || "FIRST_RUN",
    runId: state.runId
  };
}
function finalizeCampaignMonth(before, after) {
  const monthKey = String(before.month);
  if (before.settlements?.[monthKey]) return before;
  const settlement2 = settlementEntry(before);
  const tgvHistoryMap = currentMonthHistoryMap(after);
  tgvHistoryMap.set(Number(before.month), settlement2.currentTGV);
  const tgvHistory = [...tgvHistoryMap.entries()].map(([month, tgv]) => ({ month, tgv })).sort((a, b) => a.month - b.month);
  const settlements = { ...before.settlements || {}, [monthKey]: settlement2 };
  const next = normalizeV9State({
    ...after,
    settlements,
    organization: {
      ...after.organization || {},
      tgv: settlement2.currentTGV,
      currentTGV: settlement2.currentTGV,
      lastMonthTGV: settlement2.currentTGV,
      bestTGV: Math.max(Number(before.organization?.bestTGV || 0), settlement2.currentTGV),
      tgvHistory
    }
  }, before);
  if (Number(before.month) === CAMPAIGN_MONTHS2) {
    const scored = { ...next, campaignComplete: true, campaignFinalePending: true };
    return {
      ...scored,
      campaignScore: campaignScoreFor2(scored),
      lastMessage: "🏆 12 เดือนจบแล้ว · High Score ถูกล็อก รอใส่ชื่อก่อนเล่น Organization Mode ต่อ"
    };
  }
  return next;
}
function certifyXgenV9(state) {
  if (!state.career?.xgenQualified || state.career?.xgenCertified) return state;
  return normalizeV9State({
    ...state,
    rank: "xgen",
    career: {
      ...state.career || {},
      xgenQualified: true,
      xgenQualificationRule: "rolling3",
      xgenCertified: true,
      xgenAtMonth: Number(state.month || 0)
    },
    organization: { ...state.organization || {}, xgen: true, mapUnlocked: true, endless: false },
    milestones: { ...state.milestones || {}, xgen: true },
    sceneReport: { kind: "xgen-exam", passed: true, rolling3TGV: getRolling3TGV(state) },
    lastEvent: EVENTS3.XGEN_EXAM,
    lastMessage: "🏆 Certified XGEN · ปลดล็อก ③ รายได้จากการบริหาร Organization",
    updatedAt: Date.now()
  }, state);
}
function aggregateFor(state) {
  const existing = state.organization?.aggregate || {};
  const activePersonal = (state.customers || []).filter((customer) => customer.activePlan !== false).length;
  const teamCustomers = (state.team || []).reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  return {
    activeCustomers: Math.max(activePersonal + teamCustomers, Number(existing.activeCustomers || 0), 1),
    xvisorCount: Math.max(Number(existing.xvisorCount || 0), Number(state.team?.length || 0)),
    xleadCount: Math.max(Number(existing.xleadCount || 0), Number(state.team?.filter?.((member) => member.rank === "xlead").length || 0)),
    candidateCount: Math.max(0, Number(existing.candidateCount || 0)),
    overflowPeople: Math.max(0, Number(existing.overflowPeople || 0))
  };
}
function previousSettlement(state) {
  const entries = Object.values(state.settlements || {}).sort((a, b) => Number(b.month) - Number(a.month));
  return entries[0] || null;
}
function generateOrganizationMonth(state, month) {
  const aggregate = aggregateFor(state);
  const prior = previousSettlement(state);
  const previousTGV = Math.max(1, Number(state.organization?.lastMonthTGV || prior?.currentTGV || state.campaignScore?.bestTgv || 1));
  const scalePenalty = Math.min(0.05, Math.log10(Math.max(1, previousTGV / 1e6)) * 0.015);
  const leaderQuality = Math.min(0.022, aggregate.xleadCount * 14e-4);
  const wave = ((Number(state.rngSeed || 1) + month * 19) % 9 - 4) * 3e-3;
  const growthRate = Math.max(-0.012, Math.min(0.08, 0.042 + leaderQuality - scalePenalty + wave));
  const currentTGV = Math.max(0, Math.round(previousTGV * (1 + growthRate)));
  const personalActive = (state.customers || []).filter((customer) => customer.activePlan !== false).length;
  const personalXV = Math.min(currentTGV, Math.max(0, personalActive * 7e3));
  const teamXV = Math.max(0, currentTGV - personalXV);
  const customerGain = Math.max(0, Math.round(Math.sqrt(Math.max(1, aggregate.activeCustomers)) * (0.42 + aggregate.xleadCount * 0.022)));
  const churn = Math.round(aggregate.activeCustomers * 0.012);
  const activeCustomers = Math.max(1, aggregate.activeCustomers + customerGain - churn);
  const newXvisors = Math.max(0, Math.min(4, Math.round(Math.sqrt(activeCustomers) / 16 + aggregate.xleadCount * 0.05) - Math.floor(aggregate.xvisorCount / 120)));
  const xvisorCount = Math.max(aggregate.xvisorCount, aggregate.xvisorCount + newXvisors);
  const newXleads = xvisorCount >= 16 ? Math.max(0, Math.min(1, Math.floor((xvisorCount - aggregate.xleadCount * 10) / 45))) : 0;
  const xleadCount2 = Math.max(aggregate.xleadCount, aggregate.xleadCount + newXleads);
  const temp = {
    ...state,
    month,
    energy: 0,
    economy: { ...state.economy || {}, personalXV, teamXV, productSales: 0, teamProductSales: 0 },
    organization: { ...state.organization || {}, tgv: currentTGV, currentTGV }
  };
  const base = baseEconomyFor(temp);
  const previousChannel2 = Number(prior?.channel2 || 0);
  const channel1 = Math.max(0, Math.round(Number(base.channel1 || 0)));
  const channel2 = state.career?.xleadCertified ? Math.max(0, Math.round(previousChannel2 * (1 + Math.max(-0.01, growthRate * 0.65)))) : 0;
  const channel3 = state.career?.xgenCertified ? Math.round(currentTGV * 0.05) : 0;
  const story = newXleads > 0 ? `👑 มี XLEAD ใหม่ ${newXleads} คน` : newXvisors > 0 ? `🌱 Candidate Pipeline สร้าง X-VISOR ใหม่ ${newXvisors} คน` : `❤️ ลูกค้า active ${activeCustomers.toLocaleString("th-TH")} คน · ระบบยังเดินต่อ`;
  return normalizeV9State({
    ...temp,
    organizationMode: true,
    phase: "organization",
    stage: STAGES.MANAGEMENT,
    economy: { ...temp.economy || {}, personalXV, teamXV, productSales: 0, teamProductSales: 0, lastTransaction: null },
    organization: {
      ...temp.organization || {},
      tgv: currentTGV,
      currentTGV,
      aggregate: { ...aggregate, activeCustomers, xvisorCount, xleadCount: xleadCount2 }
    },
    organizationMonthIncome: { channel1, channel2, channel3 },
    monthStats: { ...makeMonthStats?.() || {}, teamActions: Math.round(activeCustomers * 2.2), teamCycleDone: true },
    sceneReport: { kind: "organization", tgv: currentTGV, activeCustomers, xvisorCount, xleadCount: xleadCount2, story },
    lastMessage: `🏙️ เดือน ${month} · TGV ${currentTGV.toLocaleString("th-TH")} XV · ${story}`,
    campaignFinalePending: false,
    updatedAt: Date.now()
  }, state);
}
function enterOrganization(state) {
  if (!state.campaignScore?.locked || !state.campaignComplete) return state;
  const base = normalizeV9State({
    ...state,
    organizationMode: true,
    phase: "organization",
    month: CAMPAIGN_MONTHS2 + 1,
    energy: 0,
    stage: STAGES.MANAGEMENT,
    economy: { ...state.economy || {}, sets: 0, personalXV: 0, teamXV: 0, productSales: 0, teamProductSales: 0, lastTransaction: null },
    organization: { ...state.organization || {}, tgv: 0, currentTGV: 0 },
    campaignFinalePending: false
  }, state);
  return generateOrganizationMonth(base, CAMPAIGN_MONTHS2 + 1);
}
function settleOrganizationMonth(state) {
  const monthKey = String(state.month);
  if (state.settlements?.[monthKey]) return generateOrganizationMonth(state, Number(state.month) + 1);
  const economy = calculateEconomy3(state);
  const settlement2 = settlementEntry(state);
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome || 0)) + settlement2.totalIncome;
  const settlements = { ...state.settlements || {}, [monthKey]: settlement2 };
  const incomeHistory = [...(state.economy?.incomeHistory || []).filter((entry) => Number(entry.month) !== Number(state.month)), {
    month: Number(state.month),
    channel1: settlement2.channel1,
    channel2: settlement2.channel2,
    channel3: settlement2.channel3,
    channel4: 0,
    total: settlement2.totalIncome,
    tgv: settlement2.currentTGV
  }].sort((a, b) => Number(a.month) - Number(b.month));
  const historyMap = currentMonthHistoryMap(state);
  historyMap.set(Number(state.month), settlement2.currentTGV);
  const settledState = normalizeV9State({
    ...state,
    settlements,
    economy: { ...state.economy || {}, totalIncome, receivedIncome: totalIncome, incomeHistory },
    organization: {
      ...state.organization || {},
      lastMonthTGV: settlement2.currentTGV,
      bestTGV: Math.max(Number(state.organization?.bestTGV || 0), settlement2.currentTGV),
      tgvHistory: [...historyMap.entries()].map(([month, tgv]) => ({ month, tgv })).sort((a, b) => a.month - b.month)
    }
  }, state);
  return generateOrganizationMonth(settledState, Number(state.month) + 1);
}
function makeInitialState3(options = {}) {
  const base = makeInitialState2(options);
  return normalizeV9State({
    ...base,
    runId: makeRunId(options.seed || base.rngSeed),
    settlements: {},
    campaignComplete: false,
    campaignFinalePending: false,
    campaignScore: null,
    organizationMode: false,
    v9SaveVersion: V9_SAVE_VERSION
  });
}
function makeNewGamePlusState2(options = {}) {
  const base = makeNewGamePlusState(options);
  return normalizeV9State({
    ...base,
    runId: makeRunId(options.seed || base.rngSeed),
    settlements: {},
    campaignComplete: false,
    campaignFinalePending: false,
    campaignScore: null,
    organizationMode: false,
    v9SaveVersion: V9_SAVE_VERSION
  });
}
function canDispatch3(state, event) {
  if (event === EVENTS3.ENTER_ORGANIZATION) return Boolean(state.campaignComplete && state.campaignScore?.locked && !state.organizationMode);
  if (event === EVENTS3.XGEN_EXAM) return Boolean(state.career?.xgenQualified && !state.career?.xgenCertified);
  if (state.organizationMode) return event === EVENTS3.END_MONTH;
  if (event === EVENTS3.END_MONTH && state.settlements?.[String(state.month)]) return false;
  if (event === EVENTS3.START_NEXT_MONTH && Number(state.month) >= CAMPAIGN_MONTHS2) return false;
  return canDispatch2(state, event);
}
function getBestNextActions3(state, limit = 3) {
  const normalized = normalizeV9State(state);
  if (normalized.organizationMode) return [{ type: "organization-pass", event: EVENTS3.END_MONTH, label: "▶ ผ่านไปอีก 1 เดือน", cost: 0, score: 1e3 }];
  const source = getBestNextActions2({
    ...normalized,
    organization: { ...normalized.organization || {}, tgv: getCurrentTGV(normalized) }
  }, Math.max(8, limit + 4));
  const actions = [];
  for (const item of source) {
    if (item.type === "xgen-exam" || item.event === EVENTS3.XGEN_EXAM) continue;
    const canonical = canonicalizeBestAction(normalized, item);
    if (canonical) actions.push(canonical);
  }
  if (normalized.career?.xgenQualified && !normalized.career?.xgenCertified) {
    actions.unshift({ type: "xgen-exam", event: EVENTS3.XGEN_EXAM, label: "🎓 เข้าสอบ XGEN · ปลดล็อก ③", cost: 0, score: 195 });
  }
  const unique = /* @__PURE__ */ new Map();
  for (const action of actions) {
    const key = `${action.event || action.type}:${action.targetId || action.payload?.id || ""}`;
    if (!unique.has(key) || Number(action.score || 0) > Number(unique.get(key).score || 0)) unique.set(key, action);
  }
  return [...unique.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, Math.max(1, limit));
}
function reduceGame3(currentState, event, payload = {}) {
  let state = normalizeV9State(currentState);
  if (!canDispatch3(state, event)) return state;
  if (event === EVENTS3.ENTER_ORGANIZATION) return enterOrganization(state);
  if (state.organizationMode && event === EVENTS3.END_MONTH) return settleOrganizationMonth(state);
  if (event === EVENTS3.XGEN_EXAM) return certifyXgenV9(state);
  const prepared = {
    ...state,
    organization: { ...state.organization || {}, tgv: getCurrentTGV(state), currentTGV: getCurrentTGV(state), breakawayVolume: 0 }
  };
  const next = reduceGame2(prepared, event, payload);
  if (next === prepared) return state;
  if (event === EVENTS3.END_MONTH) return finalizeCampaignMonth(prepared, next);
  const normalized = normalizeV9State(next, state);
  if (event === EVENTS3.START_NEXT_MONTH) {
    return normalizeV9State({
      ...normalized,
      organization: { ...normalized.organization || {}, tgv: getCurrentTGV(normalized), currentTGV: getCurrentTGV(normalized) }
    }, state);
  }
  return normalized;
}
function serializeState3(state) {
  const normalized = normalizeV9State(state);
  return JSON.stringify({ ...normalized, v9SaveVersion: V9_SAVE_VERSION, updatedAt: Date.now() });
}
function parseSavedState3(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.v9SaveVersion !== V9_SAVE_VERSION) return null;
    const parsed = parseSavedState2(JSON.stringify(value));
    if (!parsed) return null;
    return normalizeV9State(parsed);
  } catch {
    return null;
  }
}
function debugV9Snapshot(state) {
  const normalized = normalizeV9State(state);
  return {
    gameVersion: GAME_VERSION,
    saveVersion: V9_SAVE_VERSION,
    runId: normalized.runId,
    month: normalized.month,
    organizationMode: Boolean(normalized.organizationMode),
    scoreLocked: Boolean(normalized.campaignScore?.locked),
    xgenQualified: Boolean(normalized.career?.xgenQualified),
    xgenCertified: Boolean(normalized.career?.xgenCertified),
    currentTGV: getCurrentTGV(normalized),
    rolling3TGV: getRolling3TGV(normalized)
  };
}

import { addSkillXp as addSkillXp3, getSkillLevel as getSkillLevel3, makeTeamMember as makeTeamMember2 } from "./game-progression.js";
import { createPerson as createPerson2 } from "./game-people.js";
import { getRetailTier as getRetailTier3 } from "./game-commercial-config.js";
var GAME_VERSION2 = "X-VISOR QUEST 1.0";
var RELEASE_VERSION = "1.0";
var V1_SAVE_VERSION = "1.0";
var V1_SCORE_VERSION = "1.0";
var ORGANIZATION_START_MONTH = 13;
var ORGANIZATION_END_MONTH = 24;
var ORGANIZATION_XIRCLE_MONTHS = Object.freeze([15, 18, 21, 24]);
var TRAVEL_DESTINATIONS = Object.freeze([
  "Tokyo",
  "Seoul",
  "Shanghai",
  "Taipei",
  "Paris",
  "Dubai",
  "Santorini",
  "London",
  "Cruise"
]);
var EVENTS4 = Object.freeze({
  ...EVENTS3,
  FAST_TRACK_FULL_START: "FAST_TRACK_FULL_START"
});
var FULL_START_XV = 9495;
var FULL_START_BAHT = 12480;
var ROUTINEX_XV = 7e3;
var ROUTINEX_BAHT = 7490;
function clamp(value, min, max) {
  const number = Number(value || 0);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}
function releaseState(state) {
  return {
    ...state,
    gameVersion: GAME_VERSION2,
    releaseVersion: RELEASE_VERSION,
    v1SaveVersion: V1_SAVE_VERSION,
    scoreVersion: state?.campaignScore?.scoreVersion || V1_SCORE_VERSION
  };
}
function uniqueTeamCount(state) {
  return (state.team || []).filter((member) => member.active !== false).length;
}
function xleadCount(state) {
  return (state.team || []).filter((member) => member.active !== false && member.rank === "xlead").length;
}
function activePersonalCustomers(state) {
  return (state.customers || []).filter((customer) => customer.activePlan !== false).length;
}
function activeOrganizationCustomers(state) {
  const teamCustomers = (state.team || []).filter((member) => member.active !== false).reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  return activePersonalCustomers(state) + teamCustomers;
}
function deterministicRoll2(state, id, salt = 0) {
  let hash = Number(state.rngSeed || 1) + Number(state.month || 0) * 131 + salt * 977 >>> 0;
  for (const char of String(id || "x")) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % 1e4 / 1e4;
}
function successCaseCount(state) {
  const customers = (state.customers || []).filter((customer) => customer.successCase || customer.result === "ดีขึ้น").length;
  return Math.max(customers, Number(state.career?.totalSuccessCases || 0));
}
function canOfferFullSetFastLane(state, person) {
  if (!person || state.organizationMode || state.runComplete) return false;
  const people = getSkillLevel3(state.skills, "people");
  const knowledge = getSkillLevel3(state.skills, "knowledge");
  const momentum = Number(state.monthStats?.successCases || 0) + Number(state.monthStats?.sales || 0);
  return people >= 6 && knowledge >= 6 && successCaseCount(state) >= 2 && Number(person.trust || 0) >= 58 && Number(person.readiness || 0) >= 62 && (momentum >= 1 || Number(state.month || 0) >= 4);
}
function fastTrackEligible(state, person) {
  if (!person || state.organizationMode || state.runComplete) return false;
  if (person.journey !== "recommendation" || !person.routinePlan) return false;
  if (person.routinePlan.id !== "all" || !person.routinePlan.fastLane) return false;
  return canOfferFullSetFastLane(state, person);
}
function getFastTrackChance(state, person) {
  if (!fastTrackEligible(state, person)) return 0;
  const people = getSkillLevel3(state.skills, "people");
  const knowledge = getSkillLevel3(state.skills, "knowledge");
  const capability = (people - 6) * 0.055 + (knowledge - 6) * 0.045;
  const trust = Math.max(0, Number(person.trust || 0) - 58) * 6e-3;
  const readiness = Math.max(0, Number(person.readiness || 0) - 62) * 5e-3;
  const proof = Math.min(0.14, successCaseCount(state) * 0.025);
  return clamp(0.34 + capability + trust + readiness + proof, 0.28, 0.86);
}
function runFullSetRoutineChoice(state, event, payload = {}) {
  if (payload.planId !== "all") return null;
  const person = (state.prospects || []).find((item) => item.id === state.selectedPersonId);
  if (!person || !canOfferFullSetFastLane(state, person)) {
    return releaseState(reduceGame3(state, event, payload));
  }
  const based = reduceGame3(state, event, { ...payload, planId: "fit" });
  const prospects = (based.prospects || []).map((item) => item.id !== person.id ? item : {
    ...item,
    journey: "recommendation",
    status: "⚡ ครบชุดเหมาะกับจังหวะนี้ · พร้อมคุยทางลัดเข้า Xcademy",
    trust: Math.min(100, Number(item.trust || 0) + 5),
    routinePlan: {
      id: "all",
      quality: "fit",
      products: ["gus", "protein-hmb", "vita-matrix", "astamega"],
      includesControl: true,
      fastLane: true
    }
  });
  return releaseState(refreshMissions({
    ...based,
    prospects,
    selectedPersonId: person.id,
    lastEvent: event,
    lastMessage: `⚡ ${person.name} เหมาะกับครบชุด · เปิดทางลัด Full Start → Xcademy → สอบ X-VISOR`,
    updatedAt: Date.now()
  }));
}
function openRoutineWithFastLaneChoice(state, payload = {}) {
  const person = (state.prospects || []).find((item) => item.id === payload.id);
  if (!canOfferFullSetFastLane(state, person)) return null;
  return releaseState({
    ...state,
    selectedPersonId: person.id,
    stage: STAGES.MANAGEMENT_ROUTINE,
    lastEvent: EVENTS4.OPEN_MANAGEMENT_ROUTINE,
    lastMessage: `⚡ ${person.name} พร้อมพอให้เลือกได้ทั้ง เริ่มจาก C / ดู ABCD / ครบชุด`,
    updatedAt: Date.now()
  });
}
function runFastTrack(state, payload = {}) {
  const person = (state.prospects || []).find((item) => item.id === payload.id);
  if (!fastTrackEligible(state, person) || Number(state.energy || 0) < 1) return state;
  const chance = getFastTrackChance(state, person);
  const attempt = Number(person.decisionAttempts || 0);
  const protectedChance = attempt >= 2 ? 1 : attempt === 1 ? Math.min(0.97, chance + 0.15) : chance;
  const success = deterministicRoll2(state, person.id, attempt + 71) < protectedChance;
  const spent = { ...state, energy: Math.max(0, Number(state.energy || 0) - 1) };
  if (!success) {
    const prospects = spent.prospects.map((item) => item.id !== person.id ? item : {
      ...item,
      decisionAttempts: attempt + 1,
      journey: "waiting",
      nextOfferMonth: Number(state.month || 0) + 1,
      status: `Full Start ยังไม่ใช่จังหวะ · รอเดือน ${Number(state.month || 0) + 1}`,
      lastContactMonth: state.month
    });
    return releaseState(refreshMissions({
      ...spent,
      prospects,
      lastEvent: `${EVENTS4.FAST_TRACK_FULL_START}_NO`,
      lastMessage: `${person.name} ยังไม่พร้อม Full Start · ทางลัดเสี่ยงกว่า แต่ความสัมพันธ์ยังอยู่`,
      updatedAt: Date.now()
    }));
  }
  const customer = {
    ...person,
    id: `customer-${person.id}`,
    personId: person.personId || person.id,
    journey: "day28",
    status: "⚡ Full Start · พร้อมเข้า Xcademy",
    activePlan: true,
    customerState: CUSTOMER_STATES.READY_XVISOR,
    day: 28,
    followups: Math.max(1, Number(person.followups || 0)),
    adherence: Math.max(82, Number(person.adherence || 0)),
    satisfaction: Math.max(84, Number(person.satisfaction || 0)),
    result: "เห็นผลและพร้อมเรียนรู้ต่อ",
    successCase: true,
    referralReady: true,
    xvisorInterest: true,
    xvisorStage: "ready",
    candidateProgress: 0,
    selfDirected: true,
    lastReorderMonth: state.month,
    decisionAttempts: attempt,
    fullSetFastLane: true
  };
  const monthStats = spent.monthStats || makeMonthStats();
  let next = {
    ...spent,
    prospects: spent.prospects.filter((item) => item.id !== person.id),
    customers: [...spent.customers || [], customer],
    selectedPersonId: customer.id,
    economy: {
      ...spent.economy || {},
      personalXV: Number(spent.economy?.personalXV || 0) + FULL_START_XV,
      productSales: Number(spent.economy?.productSales || 0) + FULL_START_BAHT,
      sets: Number(spent.economy?.sets || 0) + 1,
      lastTransaction: null
    },
    monthStats: {
      ...monthStats,
      sales: Number(monthStats.sales || 0) + 1,
      newCustomers: Number(monthStats.newCustomers || 0) + 1,
      successCases: Number(monthStats.successCases || 0) + 1,
      playerActions: {
        ...monthStats.playerActions || {},
        attract: Number(monthStats.playerActions?.attract || 0) + 1,
        total: Number(monthStats.playerActions?.total || 0) + 1
      },
      energyUse: {
        ...monthStats.energyUse || {},
        attract: Number(monthStats.energyUse?.attract || 0) + 1
      }
    },
    lastEvent: EVENTS4.FAST_TRACK_FULL_START,
    lastMessage: `✅ ${person.name} เริ่มครบชุดแล้ว · ⚡ ขั้นถัดไป Xcademy แล้วเข้าสอบ X-VISOR`,
    updatedAt: Date.now()
  };
  next = addSkillXp3(next, "people", 1, "fast-track-full-start");
  next = addSkillXp3(next, "knowledge", 1, "fast-track-full-start");
  return releaseState(refreshMissions(next));
}
function organizationAggregate(state, previous = null) {
  const xvisors = uniqueTeamCount(state);
  const xleads = xleadCount(state);
  const customers = activeOrganizationCustomers(state);
  const candidates = (state.team || []).reduce((sum, member) => sum + Math.max(0, Number(member.candidatePipeline || 0)), 0);
  return {
    activeCustomers: customers,
    xvisorCount: xvisors,
    xleadCount: xleads,
    candidateCount: candidates,
    organizationSize: xvisors,
    overflowPeople: 0,
    newCustomersThisMonth: Number(previous?.newCustomersThisMonth || 0),
    repeatCustomersThisMonth: Number(previous?.repeatCustomersThisMonth || 0),
    pausedCustomersThisMonth: Number(previous?.pausedCustomersThisMonth || 0),
    stoppedCustomersThisMonth: Number(previous?.stoppedCustomersThisMonth || 0),
    comebackCustomersThisMonth: Number(previous?.comebackCustomersThisMonth || 0),
    churnedCustomersThisMonth: Number(previous?.churnedCustomersThisMonth || 0),
    netCustomersThisMonth: Number(previous?.netCustomersThisMonth || 0),
    referralsThisMonth: Number(previous?.referralsThisMonth || 0),
    candidatesThisMonth: Number(previous?.candidatesThisMonth || 0),
    newXvisorsThisMonth: Number(previous?.newXvisorsThisMonth || 0),
    slowedMembersThisMonth: Number(previous?.slowedMembersThisMonth || 0),
    pausedMembersThisMonth: Number(previous?.pausedMembersThisMonth || 0),
    quitMembersThisMonth: Number(previous?.quitMembersThisMonth || 0),
    comebackMembersThisMonth: Number(previous?.comebackMembersThisMonth || 0),
    netXvisorsThisMonth: Number(previous?.netXvisorsThisMonth || 0),
    newXleadsThisMonth: Number(previous?.newXleadsThisMonth || 0),
    netXleadsThisMonth: Number(previous?.netXleadsThisMonth || 0),
    cultureScore: Number(previous?.cultureScore || state.organization?.cultureScore || 58)
  };
}
function stochasticCount(state, key, expected, salt = 0) {
  const safe = Math.max(0, Number(expected || 0));
  const whole = Math.floor(safe);
  return whole + Number(deterministicRoll2(state, key, salt) < safe - whole);
}
function teamStatus(member) {
  if (member.organizationStatus) return member.organizationStatus;
  return member.active === false ? "paused" : "active";
}
function simulatePersonalCustomerCycle(state, month, eventEffect) {
  const metrics = { repeat: 0, paused: 0, stopped: 0, comeback: 0 };
  const customers = (state.customers || []).map((customer, index) => {
    const key = customer.personId || customer.id || `personal-${index}`;
    const status = customer.organizationCustomerState || (customer.activePlan === false ? "paused" : "active");
    const roll = deterministicRoll2(state, key, 300 + month + index);
    if (status === "active") {
      const care = clamp(Number(customer.satisfaction || customer.adherence || 70) / 100, 0.35, 1);
      const stopChance = clamp(0.035 - care * 0.014 - eventEffect.retention * 0.35, 8e-3, 0.05);
      const pauseChance = clamp(0.105 - care * 0.045 - eventEffect.retention, 0.025, 0.14);
      if (roll < stopChance) {
        metrics.stopped += 1;
        return { ...customer, activePlan: false, organizationCustomerState: "stopped", status: "หยุด Routine ใน Year 2", stoppedMonth: month };
      }
      if (roll < stopChance + pauseChance) {
        metrics.paused += 1;
        return { ...customer, activePlan: false, organizationCustomerState: "paused", status: "พัก Routine ชั่วคราว", pausedMonth: month };
      }
      metrics.repeat += 1;
      return { ...customer, activePlan: true, organizationCustomerState: "active", lastReorderMonth: month, status: "ใช้ Routine ต่อเนื่อง" };
    }
    const comebackChance = status === "paused" ? 0.14 + eventEffect.comeback : 0.025 + eventEffect.comeback * 0.35;
    if (roll < comebackChance) {
      metrics.comeback += 1;
      metrics.repeat += 1;
      return { ...customer, activePlan: true, organizationCustomerState: "active", lastReorderMonth: month, status: "กลับมาใช้ Routine อีกครั้ง", comebackMonth: month };
    }
    return { ...customer, activePlan: false, organizationCustomerState: status };
  });
  return { customers, metrics };
}
function organizationEventEffect(state, month) {
  const xcircle = ORGANIZATION_XIRCLE_MONTHS.includes(Number(month));
  const carry = !xcircle && Number(state.xircleMomentum?.expiresAfterMonth || 0) >= Number(month);
  return {
    xcircle,
    carry,
    retention: xcircle ? 0.07 : carry ? 0.028 : 0,
    referral: xcircle ? 0.1 : carry ? 0.035 : 0,
    comeback: xcircle ? 0.34 : carry ? 0.12 : 0,
    certification: xcircle ? 0.18 : carry ? 0.06 : 0
  };
}
function createOrganizationMembers(state, month, plans) {
  let nextSeed = Number(state.rngSeed || 1);
  let nextPersonId = Number(state.nextPersonId || 1);
  let usedNames = [...state.usedNames || []];
  const members = [];
  for (const [index, plan] of plans.entries()) {
    const created = createPerson2({ seed: nextSeed, usedNames, source: "team", index: nextPersonId });
    nextSeed = created.nextSeed;
    nextPersonId += 1;
    usedNames = [...usedNames, created.person.name];
    const member = makeTeamMember2({
      ...created.person,
      origin: {
        sourceType: "organization-candidate-pipeline",
        sourceId: plan.parentId,
        sourceName: `ทีมของ ${plan.parentName}`,
        createdMonth: month,
        parentPersonId: plan.parentId,
        eventId: `ORG_CERTIFICATION_M${month}`
      }
    }, state, {
      id: `member-org-${month}-${nextPersonId}-${index}`,
      parentId: plan.parentId,
      generation: plan.generation
    });
    members.push({
      ...member,
      active: true,
      organizationStatus: "active",
      certifiedMonth: month,
      confidence: Math.max(48, Number(member.confidence || 0)),
      autonomy: Math.max(38, Number(member.autonomy || 0)),
      teamSkill: Math.max(2, Number(member.teamSkill || 0)),
      customers: 0,
      pausedCustomers: 0,
      candidatePipeline: 0,
      status: `ผ่าน Xcademy ×4 และสอบเป็น X-VISOR ในเดือน ${month}`
    });
  }
  return { members, nextSeed, nextPersonId, usedNames };
}
function simulateOrganizationOperations(state, month) {
  const leadership = getSkillLevel3(state.skills, "leadership");
  const effect = organizationEventEffect(state, month);
  const priorCulture = clamp(Number(state.organization?.cultureScore || 58), 35, 92);
  const activeBefore = uniqueTeamCount(state);
  const xleadsBefore = xleadCount(state);
  const openHousePeople = stochasticCount(
    state,
    `open-house-${month}`,
    2.4 + Math.sqrt(Math.max(1, activeBefore)) * 1.1 + xleadsBefore * 0.55 + (effect.xcircle ? 2.2 : 0),
    401
  );
  const personal = simulatePersonalCustomerCycle(state, month, effect);
  const metrics = {
    newPeople: openHousePeople,
    newCustomers: 0,
    repeatCustomers: personal.metrics.repeat,
    pausedCustomers: personal.metrics.paused,
    stoppedCustomers: personal.metrics.stopped,
    comebackCustomers: personal.metrics.comeback,
    referrals: 0,
    candidates: 0,
    slowedMembers: 0,
    pausedMembers: 0,
    quitMembers: 0,
    comebackMembers: 0
  };
  let teamXV = 0;
  let teamProductSales = 0;
  let teamActions = 0;
  const activeDivisor = Math.max(1, activeBefore);
  let team = (state.team || []).map((original, index) => {
    const key = original.id || original.personId || `member-${index}`;
    const previousStatus = teamStatus(original);
    const leader = original.rank === "xlead";
    const transitionRoll = deterministicRoll2(state, key, 500 + month + index);
    let status = previousStatus;
    if (previousStatus === "paused" || previousStatus === "inactive") {
      const chance = (previousStatus === "paused" ? 0.16 : 0.035) + effect.comeback * (previousStatus === "paused" ? 1 : 0.35) + (leader ? 0.04 : 0) + leadership * 4e-3;
      if (transitionRoll < chance) {
        status = "active";
        metrics.comebackMembers += 1;
      }
    } else {
      const strain = previousStatus === "slow" ? 0.055 : 0;
      const quitChance = clamp((leader ? 6e-3 : 0.018) + strain * 0.25 - effect.retention * 0.18 - leadership * 7e-4, 2e-3, 0.04);
      const pauseChance = clamp((leader ? 0.032 : 0.072) + strain - effect.retention * 0.52 - priorCulture * 28e-5, 0.012, 0.13);
      const slowChance = clamp((leader ? 0.07 : 0.14) + Math.max(0, 58 - priorCulture) * 2e-3, 0.05, 0.2);
      if (transitionRoll < quitChance) {
        status = "inactive";
        metrics.quitMembers += 1;
      } else if (transitionRoll < quitChance + pauseChance) {
        status = "paused";
        metrics.pausedMembers += 1;
      } else if (transitionRoll < quitChance + pauseChance + slowChance) {
        status = "slow";
        metrics.slowedMembers += 1;
      } else {
        status = "active";
      }
    }
    const active = status === "active" || status === "slow";
    const previousCustomers = Math.max(0, Number(original.customers || 0));
    const previousPaused = Math.max(0, Number(original.pausedCustomers || 0));
    if (!active) {
      const recoverable = stochasticCount(state, `${key}-handoff`, previousCustomers * (status === "paused" ? 0.58 : 0.22), 601 + month);
      metrics.pausedCustomers += recoverable;
      metrics.stoppedCustomers += Math.max(0, previousCustomers - recoverable);
      return {
        ...original,
        active: false,
        organizationStatus: status,
        customers: 0,
        pausedCustomers: previousPaused + recoverable,
        personalXV: 0,
        personalSalesBaht: 0,
        commission: 0,
        monthlyOutput: { actions: 0, selfUse: 0, newPeople: 0, customers: 0, newStarts: 0, reorders: 0, referrals: 0, candidates: 0, personalSalesBaht: 0, personalXV: 0, commission: 0 },
        status: status === "paused" ? "พักงานชั่วคราว · ยังมีโอกาสกลับมา" : "หยุดทำในช่วงนี้",
        pausedMonth: month
      };
    }
    const activityFactor = status === "slow" ? 0.58 : 1;
    const careBonus = original.specialty === "care" ? 0.075 : original.specialty === "balanced" ? 0.03 : 0;
    const salesBonus = original.specialty === "sales" ? 0.24 : original.specialty === "balanced" ? 0.1 : 0;
    const builderBonus = original.specialty === "builder" ? 0.4 : original.specialty === "balanced" ? 0.16 : 0;
    const teamSkill = clamp(Number(original.teamSkill || 1), 1, 10);
    const confidence = clamp(Number(original.confidence || 45), 20, 100);
    const retentionRate = clamp(0.68 + careBonus + teamSkill * 0.014 + priorCulture * 65e-5 + effect.retention, 0.62, 0.94);
    const continued = stochasticCount(state, `${key}-retain`, previousCustomers * retentionRate * activityFactor, 620 + month);
    const lost = Math.max(0, previousCustomers - continued);
    const pausedFromLoss = stochasticCount(state, `${key}-pause-customer`, lost * (effect.xcircle ? 0.78 : 0.62), 640 + month);
    const stoppedFromLoss = Math.max(0, lost - pausedFromLoss);
    const recovered = stochasticCount(state, `${key}-customer-comeback`, previousPaused * (0.11 + effect.comeback * 0.72), 660 + month);
    const scaleDamping = 1 / (1 + Math.max(0, activeBefore - 8) / 70);
    const openHouseShare = openHousePeople / activeDivisor;
    const startExpected = (0.18 + teamSkill * 0.052 + confidence * 3e-3 + salesBonus + openHouseShare * 0.12 + (effect.xcircle ? 0.16 : 0)) * activityFactor * scaleDamping;
    const newStarts = stochasticCount(state, `${key}-new-start`, startExpected, 680 + month);
    const repeat = continued + recovered;
    const referrals = stochasticCount(state, `${key}-referral`, (repeat + newStarts) * (0.035 + careBonus * 0.35 + effect.referral), 700 + month);
    const candidateExpected = referrals * 0.45 + newStarts * 0.16 + builderBonus + openHouseShare * 0.07 + (effect.xcircle ? 0.18 : 0);
    const candidateGain = stochasticCount(state, `${key}-candidate`, candidateExpected, 720 + month);
    const selfUse = status === "slow" ? Number(deterministicRoll2(state, key, 740 + month) > 0.18) : 1;
    const personalXV2 = selfUse * ROUTINEX_XV + repeat * ROUTINEX_XV + newStarts * FULL_START_XV;
    const personalSalesBaht2 = selfUse * ROUTINEX_BAHT + repeat * ROUTINEX_BAHT + newStarts * FULL_START_BAHT;
    const tier2 = getRetailTier3(personalSalesBaht2);
    const commission = Math.round(personalSalesBaht2 * Number(tier2.rate || 0));
    const actions = Math.max(1, Math.round((newStarts + referrals + Math.sqrt(Math.max(0, repeat))) * activityFactor));
    metrics.newCustomers += newStarts;
    metrics.repeatCustomers += repeat;
    metrics.pausedCustomers += pausedFromLoss;
    metrics.stoppedCustomers += stoppedFromLoss;
    metrics.comebackCustomers += recovered;
    metrics.referrals += referrals;
    metrics.candidates += candidateGain;
    teamXV += personalXV2;
    teamProductSales += personalSalesBaht2;
    teamActions += actions;
    return {
      ...original,
      active: true,
      organizationStatus: status,
      confidence: Math.min(100, confidence + (effect.xcircle ? 7 : 2) + leadership * 0.25),
      autonomy: Math.min(100, Number(original.autonomy || 30) + (effect.xcircle ? 5 : 1) + leadership * 0.18),
      teamSkill: Math.min(10, teamSkill + Number((month + index + leadership) % 4 === 0)),
      customers: continued + recovered + newStarts,
      pausedCustomers: Math.max(0, previousPaused - recovered) + pausedFromLoss,
      stoppedCustomers: Number(original.stoppedCustomers || 0) + stoppedFromLoss,
      candidatePipeline: Math.max(0, Number(original.candidatePipeline || 0) + candidateGain),
      referrals: Number(original.referrals || 0) + referrals,
      personalXV: personalXV2,
      personalSalesBaht: personalSalesBaht2,
      commission,
      totalIncome: Number(original.totalIncome || 0) + commission,
      lastSelfUseMonth: selfUse ? month : original.lastSelfUseMonth,
      xcademyVisits: Number(original.xcademyVisits || original.centerVisits || 0) + 4,
      openHouseVisits: Number(original.openHouseVisits || original.goodLuckVisits || 0) + 1,
      leaderReadiness: Math.min(100, Number(original.leaderReadiness || 0) + candidateGain * 4 + leadership * 0.5 + (effect.xcircle ? 6 : 1)),
      monthlyOutput: { actions, selfUse, newPeople: newStarts + referrals, customers: newStarts, newStarts, reorders: repeat, referrals, candidates: candidateGain, personalSalesBaht: personalSalesBaht2, personalXV: personalXV2, commission },
      status: status === "slow" ? `เดือนช้าลง · ${newStarts} ลูกค้าใหม่ · ${repeat} ใช้ต่อ` : effect.xcircle ? `🏕️ The Xircle เติมพลัง · ${recovered} ลูกค้ากลับมา` : `${newStarts} ลูกค้าใหม่ · ${repeat} ใช้ต่อ · Pipeline ${Math.max(0, Number(original.candidatePipeline || 0) + candidateGain)}`
    };
  });
  const certificationCapacity = Math.max(1, Math.min(6, 1 + xleadsBefore + Math.floor(activeBefore / 15)));
  const plans = [];
  team = team.map((member, index) => {
    if (!member.active || plans.length >= certificationCapacity || Number(member.candidatePipeline || 0) < 4) return member;
    const chance = clamp(0.42 + leadership * 0.025 + Number(member.teamSkill || 1) * 0.02 + effect.certification, 0.42, 0.9);
    if (deterministicRoll2(state, member.id, 800 + month + index) >= chance) return member;
    plans.push({ parentId: member.id, parentName: member.name, generation: Number(member.generation || 1) + 1 });
    return { ...member, candidatePipeline: Math.max(0, Number(member.candidatePipeline || 0) - 4) };
  });
  const created = createOrganizationMembers(state, month, plans);
  team = [...team, ...created.members];
  let promoted = 0;
  const promotionCapacity = effect.xcircle ? 2 : 1;
  team = team.map((member, index) => {
    if (promoted >= promotionCapacity || !member.active || member.rank === "xlead") return member;
    const age = Math.max(0, month - Number(member.certifiedMonth || month));
    const ready = Number(member.leaderReadiness || 0) + Number(member.teamSkill || 1) * 5 + Number(member.candidatePipeline || 0) * 4;
    if (age < 2 || ready < 68) return member;
    const chance = clamp(0.12 + leadership * 0.018 + effect.certification * 0.65, 0.12, 0.58);
    if (deterministicRoll2(state, member.id, 900 + month + index) >= chance) return member;
    promoted += 1;
    return { ...member, rank: "xlead", status: `👑 เติบโตเป็น XLEAD ในเดือน ${month}` };
  });
  const directChildren = /* @__PURE__ */ new Map();
  team.forEach((member) => {
    if (member.parentId && member.parentId !== "player") directChildren.set(member.parentId, (directChildren.get(member.parentId) || 0) + 1);
  });
  team = team.map((member) => ({ ...member, downstreamXvisors: directChildren.get(member.id) || 0 }));
  const activeAfter = team.filter((member) => member.active !== false).length;
  const activeCustomers = personal.customers.filter((customer) => customer.activePlan !== false).length + team.filter((member) => member.active !== false).reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  const cultureScore = clamp(
    priorCulture + 1.5 + leadership * 0.15 + (effect.xcircle ? 8 : 0) - metrics.pausedMembers * 0.8 - metrics.quitMembers * 1.8,
    38,
    94
  );
  const personalXV = personal.metrics.repeat * ROUTINEX_XV;
  const personalSalesBaht = personal.metrics.repeat * ROUTINEX_BAHT;
  return {
    state: {
      ...state,
      customers: personal.customers,
      team,
      rngSeed: created.nextSeed,
      nextPersonId: created.nextPersonId,
      usedNames: created.usedNames,
      economy: {
        ...state.economy || {},
        personalXV,
        teamXV,
        productSales: personalSalesBaht,
        teamProductSales,
        lastTransaction: null
      },
      monthStats: {
        ...makeMonthStats?.() || {},
        xcademySessions: 4,
        openHouseDone: true,
        xircleDone: effect.xcircle,
        teamCycleDone: true,
        teamActions,
        teamCustomers: metrics.newCustomers,
        teamReorders: Math.max(0, metrics.repeatCustomers - personal.metrics.repeat),
        teamReferrals: metrics.referrals,
        teamCandidates: metrics.candidates,
        downstreamXvisors: created.members.length
      },
      organization: {
        ...state.organization || {},
        cultureScore,
        xleads: team.filter((member) => member.active !== false && member.rank === "xlead").map((member) => member.id)
      },
      xircleMomentum: effect.xcircle ? { sourceMonth: month, expiresAfterMonth: month + 1, strength: month === 24 ? 2 : 1 } : effect.carry ? state.xircleMomentum : null
    },
    metrics: {
      ...metrics,
      activeCustomers,
      xvisorCount: activeAfter,
      xleadCount: team.filter((member) => member.active !== false && member.rank === "xlead").length,
      newXvisors: created.members.length,
      newXleads: promoted,
      netCustomers: activeCustomers - activeOrganizationCustomers(state),
      netXvisors: activeAfter - activeBefore,
      netXleads: team.filter((member) => member.active !== false && member.rank === "xlead").length - xleadsBefore,
      cultureScore,
      eventEffect: effect
    }
  };
}
function makeSettlement(state, economy) {
  return {
    month: Number(state.month || 0),
    personalXV: Math.max(0, Math.round(Number(economy.personalXV || 0))),
    teamXV: Math.max(0, Math.round(Number(economy.teamXV || 0))),
    currentTGV: Math.max(0, Math.round(Number(economy.tgv || 0))),
    tgv: Math.max(0, Math.round(Number(economy.tgv || 0))),
    channel1: Math.max(0, Math.round(Number(economy.channel1 || 0))),
    channel2: Math.max(0, Math.round(Number(economy.channel2 || 0))),
    channel3: Math.max(0, Math.round(Number(economy.channel3 || 0))),
    channel4: 0,
    totalIncome: Math.max(0, Math.round(Number(economy.projectedIncome || 0))),
    total: Math.max(0, Math.round(Number(economy.projectedIncome || 0))),
    customerCount: activeOrganizationCustomers(state),
    xvisorCount: uniqueTeamCount(state),
    xleadCount: xleadCount(state),
    settled: true
  };
}
function calculateOrganizationIncomeParts(state) {
  const personalSalesBaht = Math.max(0, Number(state.economy?.productSales || 0));
  const retailTier = getRetailTier3(personalSalesBaht);
  const channel1 = Math.round(personalSalesBaht * Number(retailTier.rate || 0));
  const directG1 = (state.team || []).filter((member) => member.active !== false && member.parentId === "player");
  const directG1Commission = directG1.reduce((sum, member) => {
    const salesBaht = Math.max(0, Number(member.personalSalesBaht || member.monthlyOutput?.personalSalesBaht || 0));
    const tier2 = getRetailTier3(salesBaht);
    return sum + Math.round(salesBaht * Number(tier2.rate || 0));
  }, 0);
  const mentoringUnlocked = Boolean(state.career?.xleadCertified || state.career?.xgenCertified || ["xlead", "xgen"].includes(state.rank));
  const channel2 = mentoringUnlocked ? Math.round(directG1Commission * 0.2) : 0;
  const tgv = Math.max(0, Number(state.economy?.personalXV || 0) + Number(state.economy?.teamXV || 0));
  const channel3 = state.career?.xgenCertified ? Math.round(tgv * 0.05) : 0;
  return { channel1, channel2, channel3 };
}
var TRAVEL_LANDMARKS = Object.freeze({
  Tokyo: "Tokyo Tower และแสงเมืองญี่ปุ่น",
  Seoul: "N Seoul Tower เหนือเนินเมือง",
  Shanghai: "Oriental Pearl Tower ริมแม่น้ำ",
  Taipei: "Taipei 101 เหนือเส้นขอบฟ้า",
  Paris: "Eiffel Tower ยามเย็น",
  Dubai: "Burj Khalifa กลางทะเลทราย",
  Santorini: "บ้านขาวโดมฟ้าริมทะเล",
  London: "Big Ben และรถบัสแดง",
  Cruise: "เรือสำราญกลางทะเลพระอาทิตย์ตก"
});
function maybeUnlockTravel(state, month, settlement2, metrics) {
  const trips = Array.isArray(state.organization?.trips) ? [...state.organization.trips] : [];
  if (trips.length >= 2 || month < 16) return { trips, trip: null };
  const tripNumber = trips.length + 1;
  const inWindow = tripNumber === 1 ? month <= 21 : month >= 21 && month <= 24;
  if (!inWindow) return { trips, trip: null };
  const campaignBest = Math.max(1, Number(state.campaignScore?.bestTgv || 0));
  const finalWindowMonth = tripNumber === 1 ? month >= 19 : month >= 24;
  const easing = finalWindowMonth ? 0.84 : 1;
  const requiredTgv = Math.round(Math.max(tripNumber === 1 ? 7e4 : 12e4, campaignBest * (tripNumber === 1 ? 0.72 : 0.96)) * easing);
  const requiredCustomers = tripNumber === 1 ? 5 : 10;
  const requiredXvisors = tripNumber === 1 ? 2 : 4;
  const strongEnough = settlement2.currentTGV >= requiredTgv && metrics.activeCustomers >= requiredCustomers && metrics.xvisorCount >= requiredXvisors && metrics.cultureScore >= (tripNumber === 1 ? 52 : 56);
  if (!strongEnough) return { trips, trip: null };
  const used = new Set(trips.map((item) => item.destination));
  const available = TRAVEL_DESTINATIONS.filter((destination2) => !used.has(destination2));
  const pick = Math.min(available.length - 1, Math.floor(deterministicRoll2(state, `travel-${tripNumber}`, month + 1100) * available.length));
  const destination = available[Math.max(0, pick)];
  const trip = {
    id: `travel-${tripNumber}-${month}-${String(destination).toLowerCase()}`,
    number: tripNumber,
    month,
    destination,
    landmark: TRAVEL_LANDMARKS[destination],
    title: `Recognition Trip ${tripNumber} · ${destination}`,
    tgv: settlement2.currentTGV,
    organizationSize: metrics.xvisorCount
  };
  return { trips: [...trips, trip], trip };
}
function enterOrganizationV1(state) {
  if (!state.campaignComplete || !state.campaignScore?.locked) return state;
  const team = (state.team || []).map((member) => ({
    ...member,
    active: member.active !== false,
    organizationStatus: teamStatus(member),
    pausedCustomers: Math.max(0, Number(member.pausedCustomers || 0))
  }));
  const prepared = { ...state, team };
  return releaseState({
    ...prepared,
    organizationMode: true,
    runComplete: false,
    phase: "organization",
    month: ORGANIZATION_START_MONTH,
    energy: 0,
    stage: STAGES.MANAGEMENT,
    economy: {
      ...state.economy || {},
      personalXV: 0,
      teamXV: 0,
      productSales: 0,
      teamProductSales: 0,
      lastTransaction: null
    },
    organization: {
      ...state.organization || {},
      tgv: 0,
      currentTGV: 0,
      cultureScore: clamp(Number(state.organization?.cultureScore || 58) + getSkillLevel3(state.skills, "leadership"), 45, 78),
      trips: Array.isArray(state.organization?.trips) ? state.organization.trips : [],
      aggregate: organizationAggregate(prepared),
      endless: false
    },
    organizationMonthIncome: null,
    lastOrganizationReport: null,
    lastMessage: "🏙️ Organization Year เริ่มแล้ว · จากนี้กดเดือนละครั้ง ระบบจะทำ Xcademy / Open House / The Xircle ตามรอบให้เอง",
    updatedAt: Date.now()
  });
}
function runOrganizationMonth(state) {
  const month = Number(state.month || ORGANIZATION_START_MONTH);
  if (state.runComplete || month < ORGANIZATION_START_MONTH || month > ORGANIZATION_END_MONTH) return state;
  if (state.settlements?.[String(month)]) {
    if (month >= ORGANIZATION_END_MONTH) return { ...state, runComplete: true };
    return releaseState({
      ...state,
      month: month + 1,
      organizationMonthIncome: null,
      economy: { ...state.economy || {}, personalXV: 0, teamXV: 0, productSales: 0, teamProductSales: 0 },
      organization: { ...state.organization || {}, tgv: 0, currentTGV: 0 }
    });
  }
  const result = simulateOrganizationOperations(state, month);
  let simulated = {
    ...result.state,
    organizationMode: true,
    runComplete: false,
    phase: "organization",
    month,
    energy: 0,
    stage: STAGES.MANAGEMENT,
    campaignFinalePending: false
  };
  const incomeParts = calculateOrganizationIncomeParts(simulated);
  simulated = {
    ...simulated,
    organizationMonthIncome: incomeParts,
    organization: {
      ...simulated.organization || {},
      tgv: Math.max(0, Number(simulated.economy?.personalXV || 0) + Number(simulated.economy?.teamXV || 0)),
      currentTGV: Math.max(0, Number(simulated.economy?.personalXV || 0) + Number(simulated.economy?.teamXV || 0))
    }
  };
  const economy = calculateEconomy3(simulated);
  const settlement2 = makeSettlement(simulated, economy);
  const metrics = result.metrics;
  const travel = maybeUnlockTravel(simulated, month, settlement2, metrics);
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome || 0)) + settlement2.totalIncome;
  const settlements = { ...state.settlements || {}, [String(month)]: settlement2 };
  const incomeHistory = [...(state.economy?.incomeHistory || []).filter((entry) => Number(entry.month) !== month), {
    month,
    channel1: settlement2.channel1,
    channel2: settlement2.channel2,
    channel3: settlement2.channel3,
    channel4: 0,
    total: settlement2.totalIncome,
    tgv: settlement2.currentTGV
  }].sort((a, b) => Number(a.month) - Number(b.month));
  const historyMap = new Map(getTgvHistory(state).map((entry) => [Number(entry.month), Number(entry.tgv)]));
  historyMap.set(month, settlement2.currentTGV);
  const previousSettlement2 = state.settlements?.[String(month - 1)] || null;
  const previousTgv = Number(previousSettlement2?.currentTGV || previousSettlement2?.tgv || (month === 13 ? state.campaignScore?.bestTgv : 0) || 0);
  const tgvDeltaPct = previousTgv > 0 ? Math.round((settlement2.currentTGV - previousTgv) / previousTgv * 1e3) / 10 : null;
  const churnedCustomers = metrics.pausedCustomers + metrics.stoppedCustomers;
  const report = {
    month,
    activities: { xcademy: 4, openHouse: 1, xircle: metrics.eventEffect.xcircle ? 1 : 0 },
    newPeople: metrics.newPeople,
    activeCustomers: metrics.activeCustomers,
    newCustomers: metrics.newCustomers,
    repeatCustomers: metrics.repeatCustomers,
    pausedCustomers: metrics.pausedCustomers,
    stoppedCustomers: metrics.stoppedCustomers,
    comebackCustomers: metrics.comebackCustomers,
    churnedCustomers,
    netCustomers: metrics.netCustomers,
    referrals: metrics.referrals,
    candidates: metrics.candidates,
    xvisorCount: metrics.xvisorCount,
    newXvisors: metrics.newXvisors,
    slowedMembers: metrics.slowedMembers,
    pausedMembers: metrics.pausedMembers,
    quitMembers: metrics.quitMembers,
    comebackMembers: metrics.comebackMembers,
    netXvisors: metrics.netXvisors,
    xleadCount: metrics.xleadCount,
    newXleads: metrics.newXleads,
    netXleads: metrics.netXleads,
    cultureScore: metrics.cultureScore,
    tgv: settlement2.currentTGV,
    personalSalesBaht: Math.max(0, Number(simulated.economy?.productSales || 0)),
    personalXV: settlement2.personalXV,
    teamXV: settlement2.teamXV,
    previousTgv,
    tgvDeltaPct,
    income: settlement2.totalIncome,
    totalIncome,
    incomeBreakdown: { ...incomeParts },
    xircleBonus: metrics.eventEffect.xcircle ? {
      retention: "ดีขึ้นทั้งเดือนและส่งแรงต่อเดือนหน้า",
      referral: "เพิ่มโอกาส Referral",
      comeback: metrics.comebackMembers,
      certification: "เพิ่มความพร้อม Candidate และโอกาสสอบผ่าน"
    } : null,
    trip: travel.trip
  };
  const aggregate = {
    activeCustomers: metrics.activeCustomers,
    newCustomersThisMonth: metrics.newCustomers,
    repeatCustomersThisMonth: metrics.repeatCustomers,
    pausedCustomersThisMonth: metrics.pausedCustomers,
    stoppedCustomersThisMonth: metrics.stoppedCustomers,
    comebackCustomersThisMonth: metrics.comebackCustomers,
    churnedCustomersThisMonth: churnedCustomers,
    netCustomersThisMonth: metrics.netCustomers,
    referralsThisMonth: metrics.referrals,
    candidatesThisMonth: metrics.candidates,
    xvisorCount: metrics.xvisorCount,
    newXvisorsThisMonth: metrics.newXvisors,
    slowedMembersThisMonth: metrics.slowedMembers,
    pausedMembersThisMonth: metrics.pausedMembers,
    quitMembersThisMonth: metrics.quitMembers,
    comebackMembersThisMonth: metrics.comebackMembers,
    netXvisorsThisMonth: metrics.netXvisors,
    xleadCount: metrics.xleadCount,
    newXleadsThisMonth: metrics.newXleads,
    netXleadsThisMonth: metrics.netXleads,
    candidateCount: (simulated.team || []).reduce((sum, member) => sum + Math.max(0, Number(member.candidatePipeline || 0)), 0),
    organizationSize: metrics.xvisorCount,
    overflowPeople: 0,
    cultureScore: metrics.cultureScore
  };
  const story = travel.trip ? `✈️ ปลดล็อก ${travel.trip.title}` : metrics.eventEffect.xcircle ? `🏕️ The Xircle ดึงทีมกลับมา ${metrics.comebackMembers} · ลูกค้ากลับมา ${metrics.comebackCustomers}` : metrics.newXleads > 0 ? `👑 มี XLEAD ใหม่ ${metrics.newXleads} คน` : metrics.netXvisors < 0 || metrics.netCustomers < 0 ? `🌦️ เดือนผันผวน · ลูกค้าสุทธิ ${metrics.netCustomers >= 0 ? "+" : ""}${metrics.netCustomers} · ทีมสุทธิ ${metrics.netXvisors >= 0 ? "+" : ""}${metrics.netXvisors}` : metrics.newXvisors > 0 ? `🌱 ทีมพัฒนา X-VISOR ใหม่ ${metrics.newXvisors} คน` : `❤️ ลูกค้าสุทธิ ${metrics.netCustomers >= 0 ? "+" : ""}${metrics.netCustomers} · ระบบเดินต่อโดยทีม`;
  const common = {
    ...simulated,
    settlements,
    economy: {
      ...simulated.economy || {},
      totalIncome,
      receivedIncome: totalIncome,
      incomeHistory,
      lastTransaction: null
    },
    organization: {
      ...simulated.organization || {},
      tgv: settlement2.currentTGV,
      currentTGV: settlement2.currentTGV,
      lastMonthTGV: settlement2.currentTGV,
      bestTGV: Math.max(Number(state.organization?.bestTGV || 0), settlement2.currentTGV),
      tgvHistory: [...historyMap.entries()].map(([m, tgv]) => ({ month: m, tgv })).sort((a, b) => a.month - b.month),
      aggregate,
      trips: travel.trips,
      endless: false
    },
    organizationMonthIncome: { channel1: settlement2.channel1, channel2: settlement2.channel2, channel3: settlement2.channel3 },
    lastOrganizationReport: report,
    sceneReport: { kind: "organization", ...report, story },
    lastMessage: `🏙️ เดือน ${month} · TGV ${settlement2.currentTGV.toLocaleString("th-TH")} XV · ${story}`,
    updatedAt: Date.now()
  };
  if (month >= ORGANIZATION_END_MONTH) {
    const allSettlements = Object.values(settlements).filter((entry) => Number(entry.month || 0) >= 1 && Number(entry.month || 0) <= ORGANIZATION_END_MONTH);
    const bestTGV = allSettlements.reduce((best, entry) => Math.max(best, Number(entry.currentTGV || entry.tgv || 0)), 0);
    const bestMonthIncome = allSettlements.reduce((best, entry) => Math.max(best, Number(entry.totalIncome || entry.total || 0)), 0);
    return releaseState({
      ...common,
      month: ORGANIZATION_END_MONTH,
      runComplete: true,
      phase: "complete",
      energy: 0,
      twoYearSummary: {
        completedAt: Date.now(),
        year2StartTGV: Number(settlements["12"]?.currentTGV || settlements["12"]?.tgv || state.campaignScore?.bestTgv || 0),
        year2EndTGV: settlement2.currentTGV,
        month24TGV: settlement2.currentTGV,
        month24Income: settlement2.totalIncome,
        bestTGV,
        bestMonthIncome,
        total24Income: totalIncome,
        totalIncome,
        activeCustomers: metrics.activeCustomers,
        xvisorCount: metrics.xvisorCount,
        xleadCount: metrics.xleadCount,
        organizationSize: metrics.xvisorCount,
        trips: travel.trips,
        options: ["scoreboard", "new-game-plus", "new-run"],
        campaignScore: state.campaignScore
      },
      lastMessage: "🏁 Month 24 จบสมบูรณ์ · เลือกส่ง Scoreboard, เล่น NEW GAME+ หรือเริ่มเกมใหม่"
    });
  }
  return releaseState({
    ...common,
    month: month + 1,
    energy: 0,
    organizationMonthIncome: null,
    economy: {
      ...common.economy,
      personalXV: 0,
      teamXV: 0,
      productSales: 0,
      teamProductSales: 0
    },
    organization: { ...common.organization, tgv: 0, currentTGV: 0 }
  });
}
function calculateEconomy4(state) {
  return calculateEconomy3(state);
}
function makeInitialState4(options = {}) {
  return releaseState({
    ...makeInitialState3(options),
    releaseVersion: RELEASE_VERSION,
    v1SaveVersion: V1_SAVE_VERSION,
    runComplete: false,
    twoYearSummary: null,
    lastOrganizationReport: null
  });
}
function makeNewGamePlusState3(options = {}) {
  const previousScore = options.previousScore || null;
  const base = makeInitialState3({ seed: options.seed });
  return releaseState(refreshMissions({
    ...base,
    runMode: "NEW_GAME_PLUS",
    phase: "management",
    stage: STAGES.MANAGEMENT,
    month: 1,
    energy: MAX_ENERGY,
    rank: "xvisor",
    prospects: [],
    customers: [],
    team: [],
    missions: [],
    settlements: {},
    campaignComplete: false,
    campaignFinalePending: false,
    campaignScore: null,
    organizationMode: false,
    runComplete: false,
    twoYearSummary: null,
    lastOrganizationReport: null,
    organization: {
      ...base.organization || {},
      tgv: 0,
      currentTGV: 0,
      lastMonthTGV: 0,
      bestTGV: 0,
      tgvHistory: [],
      xleads: [],
      cultureScore: 58,
      trips: [],
      aggregate: { activeCustomers: 0, xvisorCount: 0, xleadCount: 0, candidateCount: 0, organizationSize: 0, overflowPeople: 0, cultureScore: 58 }
    },
    economy: {
      ...base.economy || {},
      personalXV: 0,
      teamXV: 0,
      productSales: 0,
      teamProductSales: 0,
      totalIncome: 0,
      receivedIncome: 0,
      incomeHistory: [],
      lastTransaction: null
    },
    milestones: { ...base.milestones || {}, certified: true },
    career: {
      ...base.career || {},
      certificationPreviouslyPassed: true,
      xleadQualified: false,
      xleadCertified: false,
      xgenQualified: false,
      xgenCertified: false,
      xgenQualificationRule: null
    },
    previousRunScore: previousScore,
    lastMessage: "⚡ NEW GAME+ · Month 1 เปิดอิสระเต็มรูปแบบแล้ว ลองทำ High Score ให้ดีกว่าเดิม",
    updatedAt: Date.now()
  }));
}
function canDispatch4(state, event) {
  if (state?.runComplete) return event === EVENTS4.NEW_GAME_PLUS;
  if (event === EVENTS4.NEW_GAME_PLUS) return false;
  if (event === EVENTS4.FAST_TRACK_FULL_START) {
    const id = state?.selectedPersonId || null;
    return Boolean((state?.prospects || []).some((person) => person.id === id && fastTrackEligible(state, person))) || Boolean((state?.prospects || []).some((person) => fastTrackEligible(state, person)));
  }
  if (event === EVENTS4.ENTER_ORGANIZATION) return Boolean(state?.campaignComplete && state?.campaignScore?.locked && !state?.organizationMode);
  if (state?.organizationMode) return event === EVENTS4.END_MONTH && Number(state.month || 0) <= ORGANIZATION_END_MONTH;
  return canDispatch3(state, event);
}
function getBestNextActions4(state, limit = 3) {
  const current = releaseState(state);
  if (current.runComplete) {
    return [{ type: "new-game-plus", event: EVENTS4.NEW_GAME_PLUS, label: "⚡ NEW GAME+", cost: 0, score: 5e3 }];
  }
  if (current.organizationMode) {
    return [{ type: "organization-pass", event: EVENTS4.END_MONTH, label: "▶ ผ่านไปอีก 1 เดือน", cost: 0, score: 1e3 }];
  }
  const actions = [...getBestNextActions3(current, Math.max(8, limit + 4))];
  for (const person of current.prospects || []) {
    if (!fastTrackEligible(current, person)) continue;
    const chance = getFastTrackChance(current, person);
    actions.push({
      type: "fast-track-full-start",
      event: EVENTS4.FAST_TRACK_FULL_START,
      targetId: person.id,
      targetName: person.name,
      payload: { id: person.id },
      label: `⚡ ครบชุด → Xcademy · ${person.name}`,
      reason: `โอกาสประมาณ ${Math.round(chance * 100)}% · ทางลัดสู่การสอบ X-VISOR แต่ต้องดูจังหวะ`,
      cost: 1,
      score: 112 + Math.round(chance * 40)
    });
  }
  const unique = /* @__PURE__ */ new Map();
  for (const action of actions) {
    const key = `${action.event || action.type}:${action.targetId || action.payload?.id || ""}`;
    if (!unique.has(key) || Number(action.score || 0) > Number(unique.get(key).score || 0)) unique.set(key, action);
  }
  return [...unique.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, Math.max(1, limit));
}
function reduceGame4(currentState, event, payload = {}) {
  const state = releaseState(currentState);
  if (!canDispatch4(state, event)) return state;
  if (event === EVENTS4.NEW_GAME_PLUS) {
    return makeNewGamePlusState3({ seed: Number(state.rngSeed || 1) + 101, previousScore: state.campaignScore || state.twoYearSummary?.campaignScore || null });
  }
  if (event === EVENTS4.FAST_TRACK_FULL_START) return runFastTrack(state, payload);
  if (event === EVENTS4.ENTER_ORGANIZATION) return enterOrganizationV1(state);
  if (state.organizationMode && event === EVENTS4.END_MONTH) return runOrganizationMonth(state);
  if (event === EVENTS4.OPEN_MANAGEMENT_ROUTINE) {
    const opened = openRoutineWithFastLaneChoice(state, payload);
    if (opened) return opened;
  }
  if ([EVENTS4.CHOOSE_ROUTINE, EVENTS4.CHOOSE_MANAGEMENT_ROUTINE].includes(event)) {
    const fullSet = runFullSetRoutineChoice(state, event, payload);
    if (fullSet) return fullSet;
  }
  return releaseState(reduceGame3(state, event, payload));
}
function serializeState4(state) {
  const raw = serializeState3({ ...state, v9SaveVersion: V9_SAVE_VERSION });
  const value = JSON.parse(raw);
  return JSON.stringify({
    ...value,
    gameVersion: GAME_VERSION2,
    releaseVersion: RELEASE_VERSION,
    v1SaveVersion: V1_SAVE_VERSION,
    v9SaveVersion: V9_SAVE_VERSION,
    updatedAt: Date.now()
  });
}
function parseSavedState4(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.releaseVersion !== RELEASE_VERSION || value.v1SaveVersion !== V1_SAVE_VERSION) return null;
    const parsed = parseSavedState3(raw);
    if (!parsed) return null;
    const organization = {
      ...parsed.organization || {},
      ...value.organization || {},
      cultureScore: clamp(Number(value.organization?.cultureScore || parsed.organization?.cultureScore || 58), 35, 94),
      trips: Array.isArray(value.organization?.trips) ? value.organization.trips.slice(0, 2) : [],
      endless: false
    };
    const team = (Array.isArray(value.team) ? value.team : parsed.team || []).map((member) => ({
      ...member,
      organizationStatus: member.organizationStatus || (member.active === false ? "paused" : "active"),
      pausedCustomers: Math.max(0, Number(member.pausedCustomers || 0))
    }));
    return releaseState({ ...parsed, ...value, organization, team });
  } catch {
    return null;
  }
}

var GAME_VERSION3 = "X-VISOR QUEST 1.0b";
var RELEASE_VERSION2 = "1.0b";
var V1_SAVE_VERSION2 = "1.0b";
var V1_SCORE_VERSION2 = "1.0b";
var XGEN_SINGLE_MONTH_TARGET = 3e6;
var ORGANIZATION_START_MONTH2 = 13, ORGANIZATION_END_MONTH2 = 24;
var ORGANIZATION_XIRCLE_MONTHS2 = Object.freeze([15, 18, 21, 24]);
var TRAVEL_MONTHS = Object.freeze([16, 22]);
var TRAVEL_DESTINATIONS2 = Object.freeze(["Tokyo", "Seoul", "Shanghai", "Taipei", "Paris", "Dubai", "Santorini", "London", "Cruise"]);
var EVENTS5 = EVENTS4;
var FULL_START_XV2 = 9495, FULL_START_BAHT2 = 12480, ROUTINEX_XV2 = 7e3, ROUTINEX_BAHT2 = 7490;
var n = (v) => Math.max(0, Number(v || 0));
function tier(sales) {
  sales = n(sales);
  return sales >= 1e5 ? { id: "25", label: "25%", rate: 0.25 } : sales >= 4e4 ? { id: "23", label: "23%", rate: 0.23 } : { id: "20", label: "20%", rate: 0.2 };
}
var getRetailTierBySalesBaht = tier;
function getCurrentTGV2(s) {
  return Math.round(n(s?.economy?.personalXV) + n(s?.economy?.teamXV));
}
function g1Rows(s) {
  return (s.team || []).filter((m) => m.active !== false && m.parentId === "player").map((m) => {
    const personalXV = n(m.personalXV || m.monthlyOutput?.personalXV), salesBaht = n(m.personalSalesBaht || m.monthlyOutput?.personalSalesBaht), t = tier(salesBaht), commission = Math.round(personalXV * t.rate);
    return { id: m.id, name: m.name, personalXV, salesBaht, tier: t, commission, mentoring: Math.round(commission * 0.2) };
  });
}
function qualified(s) {
  return !!(s?.career?.xgenQualificationRule === "single-month" || s?.career?.xgenQualifiedSingleMonth || s?.campaignOutcome?.xgenByMonth12 || s?.career?.xgenCertified1b);
}
function xgenEffective(s) {
  return qualified(s) || getCurrentTGV2(s) >= XGEN_SINGLE_MONTH_TARGET;
}
function calculateEconomy5(s) {
  const raw = calculateEconomy4(s), personalXV = n(s?.economy?.personalXV), personalSalesBaht = n(s?.economy?.productSales || s?.economy?.personalSalesBaht), teamXV = n(s?.economy?.teamXV), tgv = Math.round(personalXV + teamXV), t = tier(personalSalesBaht), channel1 = Math.round(personalXV * t.rate), rows = g1Rows(s), mentoringUnlocked = !!(s?.career?.xleadCertified || qualified(s) || ["xlead", "xgen"].includes(s?.rank)), channel2 = mentoringUnlocked ? rows.reduce((a, r) => a + r.mentoring, 0) : 0, channel3 = xgenEffective(s) ? Math.round(tgv * 0.05) : 0, projectedIncome = channel1 + channel2 + channel3, totalIncome = n(s?.economy?.totalIncome ?? s?.economy?.receivedIncome), closed = !!s?.settlements?.[String(s?.month)];
  return { ...raw, personalXV, productSales: personalSalesBaht, personalSalesBaht, teamXV, tgv, currentTGV: tgv, tier, retailTier: t, retailRate: t.rate, channel1, channel2, channel3, channel4: 0, directG1: rows, mentoringBreakdown: rows.map((r) => ({ name: r.name, commission: r.commission, mentorIncome: r.mentoring })), organizationIncome: channel3, projectedIncome, monthlyIncome: projectedIncome, teamIncome: channel2 + channel3, totalIncome, receivedIncome: totalIncome, lifetimeIncome: totalIncome + (closed ? 0 : projectedIncome) };
}
function normalizeTeam(s) {
  if (!s || !Array.isArray(s.team)) return s;
  return { ...s, team: s.team.map((m) => {
    const xv = n(m.personalXV || m.monthlyOutput?.personalXV), baht = n(m.personalSalesBaht || m.monthlyOutput?.personalSalesBaht), t = tier(baht), commission = Math.round(xv * t.rate);
    return { ...m, retailTier: t.id, retailRate: t.rate, commission, monthlyOutput: m.monthlyOutput ? { ...m.monthlyOutput, commission } : m.monthlyOutput };
  }) };
}
function normalizeXgen(s, prev = null) {
  if (!s) return s;
  const inherited = qualified(prev || s), hit = getCurrentTGV2(s) >= XGEN_SINGLE_MONTH_TARGET && !s.organizationMode && Number(s.month || 0) <= 12, q = inherited || hit, first = Number(prev?.career?.xgenQualifiedAtMonth || s?.career?.xgenQualifiedAtMonth || (hit ? s.month : 0)) || null, career = { ...s.career || {}, xgenQualified: q, xgenQualifiedSingleMonth: q, xgenQualificationRule: q ? "single-month" : null, xgenQualifiedAtMonth: q ? first : null, xgenCertified1b: q, xgenCertified: q };
  let rank = s.rank;
  if (q) rank = "xgen";
  else if (rank === "xgen") rank = career.xleadCertified ? "xlead" : "xvisor";
  const just = hit && !qualified(prev);
  return { ...s, gameVersion: GAME_VERSION3, releaseVersion: RELEASE_VERSION2, v1SaveVersion: V1_SAVE_VERSION2, scoreVersion: V1_SCORE_VERSION2, rank, career, sceneReport: just ? { kind: "xgen-qualified-1b", month: Number(s.month || 0), tgv: getCurrentTGV2(s), target: XGEN_SINGLE_MONTH_TARGET } : s.sceneReport, lastMessage: just ? `🏆 XGEN Qualified · TGV เดือนนี้ ${getCurrentTGV2(s).toLocaleString("th-TH")} XV · ③ 5% เริ่มในเดือนนี้ทันที` : s.lastMessage };
}
function settlement(s) {
  const e = calculateEconomy5(s);
  return { month: Number(s.month || 0), personalXV: Math.round(e.personalXV), personalSalesBaht: Math.round(e.personalSalesBaht), teamXV: Math.round(e.teamXV), currentTGV: Math.round(e.tgv), tgv: Math.round(e.tgv), retailRate: e.retailRate, retailTier: e.tier.id, channel1: Math.round(e.channel1), channel2: Math.round(e.channel2), channel3: Math.round(e.channel3), channel4: 0, totalIncome: Math.round(e.projectedIncome), total: Math.round(e.projectedIncome), scoreVersion: V1_SCORE_VERSION2, settled: true };
}
function scoreFrom(s, settlements) {
  const rows = Object.values(settlements || {}).filter((r) => Number(r.month) >= 1 && Number(r.month) <= 12), tgvs = rows.map((r) => n(r.currentTGV || r.tgv)), income = rows.map((r) => n(r.totalIncome ?? r.total)), ids = /* @__PURE__ */ new Set();
  for (const p of [...s.prospects || [], ...s.customers || [], ...s.team || []]) if (p?.personId || p?.id) ids.add(p.personId || p.id);
  return { locked: true, completedMonth: 12, bestTgv: Math.max(0, ...tgvs), totalIncome: income.reduce((a, b) => a + b, 0), bestMonthlyIncome: Math.max(0, ...income), organizationSize: ids.size, completedAt: Date.now(), scoreVersion: V1_SCORE_VERSION2, runMode: s.runMode || "FIRST_RUN", runId: s.runId, xgenByMonth12: !!s.career?.xgenQualifiedSingleMonth };
}
function patchCampaignClose(before, after) {
  const month = Number(before.month || 0);
  if (month < 1 || month > 12) return after;
  const qualifiedState = normalizeXgen(before, before), set = settlement(qualifiedState), sets = { ...after.settlements || {}, [String(month)]: set }, previous = n(before.economy?.totalIncome ?? before.economy?.receivedIncome), totalIncome = previous + set.totalIncome, history = [...(after.economy?.incomeHistory || []).filter((r) => Number(r.month) !== month), { month, channel1: set.channel1, channel2: set.channel2, channel3: set.channel3, channel4: 0, total: set.totalIncome, tgv: set.currentTGV }].sort((a, b) => a.month - b.month);
  let next = normalizeXgen({ ...after, settlements: sets, economy: { ...after.economy || {}, totalIncome, receivedIncome: totalIncome, incomeHistory: history }, organization: { ...after.organization || {}, lastMonthTGV: set.currentTGV, bestTGV: Math.max(n(after.organization?.bestTGV), set.currentTGV) } }, before);
  if (month === 12) {
    const xgenByMonth12 = !!(qualifiedState.career?.xgenQualifiedSingleMonth || set.currentTGV >= XGEN_SINGLE_MONTH_TARGET);
    next = { ...next, campaignOutcome: { ...next.campaignOutcome || {}, xgenByMonth12 }, campaignScore: { ...scoreFrom(next, sets), xgenByMonth12 } };
  }
  return next;
}
function pickIndex(s, salt, size) {
  if (size <= 1) return 0;
  let x = (Number(s.rngSeed || 1) ^ salt * 2654435761) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return Math.abs(x >>> 0) % size;
}
function fixedTravel(s) {
  if (!s?.organizationMode || s?.year2Path !== "xgen") return { ...s, activeTravel: null, organization: { ...s.organization || {}, trips: [] } };
  const month = Number(s.month || 0), existing = Array.isArray(s.organization?.trips) ? s.organization.trips.filter((t) => TRAVEL_MONTHS.includes(Number(t.month))) : [];
  if (!TRAVEL_MONTHS.includes(month)) return { ...s, activeTravel: null, organization: { ...s.organization || {}, trips: existing } };
  let trip = existing.find((t) => Number(t.month) === month);
  if (!trip) {
    const used = new Set(existing.map((t) => t.destination)), available = TRAVEL_DESTINATIONS2.filter((d) => !used.has(d)), destination = available[pickIndex(s, month + existing.length * 17, available.length)] || TRAVEL_DESTINATIONS2[0];
    trip = { id: `trip-${month}-${destination.toLowerCase()}`, number: month === 16 ? 1 : 2, month, destination, title: `Recognition Trip ${month === 16 ? 1 : 2} · ${destination}`, earnedBy: "xgen-by-month12" };
  }
  const trips = [...existing.filter((t) => Number(t.month) !== month), trip].sort((a, b) => a.month - b.month);
  return { ...s, activeTravel: trip, organization: { ...s.organization || {}, trips }, sceneReport: { kind: "travel-1b", month, trip }, lastMessage: `✈️ ยินดีด้วย! ผลงานของทีมพาคุณผ่านทริป ${trip.destination} · ฉากนี้จะอยู่จนกดผ่านเดือน` };
}
function year2(s) {
  if (!s?.organizationMode) return s;
  const hit = !!(s.campaignOutcome?.xgenByMonth12 || s.campaignScore?.xgenByMonth12), path = hit ? "xgen" : "xlead";
  let next = { ...s, year2Path: path, campaignOutcome: { ...s.campaignOutcome || {}, xgenByMonth12: hit } };
  if (hit) next = { ...next, rank: "xgen", career: { ...next.career || {}, xgenQualified: true, xgenQualifiedSingleMonth: true, xgenCertified: true, xgenCertified1b: true, xgenQualificationRule: "single-month" }, organization: { ...next.organization || {}, cultureScore: Math.max(62, n(next.organization?.cultureScore) || 62) } };
  else next = { ...next, rank: next.career?.xleadCertified ? "xlead" : "xvisor", career: { ...next.career || {}, xgenQualified: false, xgenQualifiedSingleMonth: false, xgenCertified: false, xgenCertified1b: false, xgenQualificationRule: null }, organization: { ...next.organization || {}, cultureScore: Math.min(58, n(next.organization?.cultureScore) || 52), trips: [] }, activeTravel: null };
  return fixedTravel(next);
}
function recalcYear2(before, after) {
  const m = Number(before.month || 0);
  if (!before.organizationMode || m < 13 || m > 24) return after;
  const report = after.lastOrganizationReport || {}, personalXV = n(report.personalXV ?? after.settlements?.[String(m)]?.personalXV), sales = n(report.personalSalesBaht ?? after.settlements?.[String(m)]?.personalSalesBaht), teamXV = n(report.teamXV ?? after.settlements?.[String(m)]?.teamXV), tgv = Math.round(n(report.tgv || personalXV + teamXV)), t = tier(sales), channel1 = Math.round(personalXV * t.rate), rows = g1Rows(after), channel2 = before.career?.xleadCertified || ["xlead", "xgen"].includes(before.rank) ? rows.reduce((a, r) => a + r.mentoring, 0) : 0, channel3 = before.year2Path === "xgen" ? Math.round(tgv * 0.05) : 0, total = channel1 + channel2 + channel3, set = { ...after.settlements?.[String(m)] || {}, month: m, personalXV, personalSalesBaht: sales, teamXV, currentTGV: tgv, tgv, retailRate: t.rate, retailTier: t.id, channel1, channel2, channel3, channel4: 0, totalIncome: total, total, scoreVersion: V1_SCORE_VERSION2, settled: true }, received = n(before.economy?.totalIncome ?? before.economy?.receivedIncome) + total, history = [...(after.economy?.incomeHistory || []).filter((r) => Number(r.month) !== m), { month: m, channel1, channel2, channel3, channel4: 0, total, tgv }].sort((a, b) => a.month - b.month), fixedReport = { ...report, month: m, tgv, income: total, totalIncome: received, personalXV, personalSalesBaht: sales, teamXV, incomeBreakdown: { channel1, channel2, channel3 }, year2Path: before.year2Path };
  let next = { ...after, settlements: { ...after.settlements || {}, [String(m)]: set }, economy: { ...after.economy || {}, totalIncome: received, receivedIncome: received, incomeHistory: history }, lastOrganizationReport: fixedReport };
  if (after.twoYearSummary && m === 24) {
    const all = Object.values(next.settlements || {}).filter((r) => Number(r.month) >= 1 && Number(r.month) <= 24);
    next = { ...next, twoYearSummary: { ...after.twoYearSummary, month24TGV: tgv, year2EndTGV: tgv, month24Income: total, total24Income: received, totalIncome: received, bestTGV: Math.max(0, ...all.map((r) => n(r.currentTGV || r.tgv))), bestMonthIncome: Math.max(0, ...all.map((r) => n(r.totalIncome || r.total))), year2Path: before.year2Path, trips: before.year2Path === "xgen" ? (next.organization?.trips || []).filter((t2) => TRAVEL_MONTHS.includes(Number(t2.month))) : [] } };
  }
  return year2(next);
}
function correctFast(before, after, event) {
  if (event !== EVENTS5.FAST_TRACK_FULL_START) return after;
  const old = new Set((before.customers || []).map((c) => c.personId || c.id));
  let found = null;
  const customers = (after.customers || []).map((c) => {
    if (old.has(c.personId || c.id) || !c.fullSetFastLane) return c;
    found = c;
    return { ...c, journey: "day0", status: "⚡ Full Start · Day 0 · เริ่มดูแลผลลัพธ์จริง", activePlan: true, customerState: CUSTOMER_STATES.NEEDS_HELP, day: 0, followups: 0, adherence: 0, satisfaction: 50, result: null, successCase: false, referralReady: false, xvisorInterest: false, xvisorStage: null, candidateProgress: 0, selfDirected: false, measuredAgain: false };
  });
  if (!found) return after;
  return { ...after, customers, monthStats: { ...after.monthStats || {}, successCases: Math.max(0, n(after.monthStats?.successCases) - 1) }, economy: { ...after.economy || {}, lastTransaction: { id: `tx-fast-${after.month}-${found.personId || found.id}-${Date.now()}`, status: "SIMULATION", price: FULL_START_BAHT2, xv: FULL_START_XV2, items: [{ id: "xircle-starter", name: "Xircle Band + Scale", price: 4990, xv: 2495, cycle: "first" }, { id: "routinex", name: "RoutineX", price: ROUTINEX_BAHT2, xv: ROUTINEX_XV2, cycle: "monthly" }] } }, lastMessage: `✅ ${found.name} เริ่มครบชุดแล้ว · Day 0 · ต้องดูแลให้เกิดผลลัพธ์จริงก่อนเร่งเส้นทาง X-VISOR` };
}
function patchTx(before, after) {
  const tx = after?.economy?.lastTransaction;
  if (!tx) return after;
  const b = calculateEconomy5(before), a = calculateEconomy5(after), saleXV = n(tx.xv), sale = Math.round(saleXV * a.retailRate), oldXV = n(b.personalXV), trueUp = Math.max(0, Math.round(oldXV * (a.retailRate - b.retailRate))), d3 = Math.max(0, a.channel3 - b.channel3), d2 = Math.max(0, a.channel2 - b.channel2), delta = a.projectedIncome - b.projectedIncome;
  return { ...after, economy: { ...after.economy || {}, lastTransaction: { ...tx, incomeBefore: b.projectedIncome, incomeAfter: a.projectedIncome, incomeDelta: delta, salesBahtBefore: b.personalSalesBaht, salesBahtAfter: a.personalSalesBaht, tierBefore: b.tier, tierAfter: a.tier, incomeBreakdown: { saleChannel1: sale, tierTrueUp: trueUp, channel2Delta: d2, channel3Delta: d3, total: delta } } } };
}
function release(s) {
  return s ? { ...s, gameVersion: GAME_VERSION3, releaseVersion: RELEASE_VERSION2, v1SaveVersion: V1_SAVE_VERSION2, scoreVersion: V1_SCORE_VERSION2, campaignScore: s.campaignScore ? { ...s.campaignScore, scoreVersion: V1_SCORE_VERSION2 } : s.campaignScore } : s;
}
var canOfferFullSetFastLane2 = (s, p) => canOfferFullSetFastLane(s, p), getFastTrackChance2 = (s, p) => getFastTrackChance(s, p);
function makeInitialState5(o = {}) {
  return release(normalizeXgen({ ...makeInitialState4(o), campaignOutcome: { xgenByMonth12: false }, year2Path: null, activeTravel: null }));
}
function makeNewGamePlusState4(o = {}) {
  const s = makeNewGamePlusState3(o);
  return release({ ...s, runMode: "NEW_GAME_PLUS", month: 1, phase: "management", stage: STAGES.MANAGEMENT, rank: "xvisor", energy: MAX_ENERGY, prospects: [], customers: [], team: [], missions: [], campaignOutcome: { xgenByMonth12: false }, year2Path: null, activeTravel: null, career: { ...s.career || {}, certificationPreviouslyPassed: true, xleadQualified: false, xleadCertified: false, xgenQualified: false, xgenQualifiedSingleMonth: false, xgenCertified: false, xgenCertified1b: false, xgenQualificationRule: null }, economy: { ...s.economy || {}, personalXV: 0, teamXV: 0, productSales: 0, teamProductSales: 0, totalIncome: 0, receivedIncome: 0, incomeHistory: [], lastTransaction: null }, settlements: {}, lastMessage: "⚡ NEW GAME+ · Month 1 · ไม่มีลูกค้าตั้งต้น แต่เปิด Management เต็มรูปแบบทันที" });
}
function getBestNextActions5(s, limit = 3) {
  if (s?.runComplete) return [{ type: "new-game-plus", event: EVENTS5.NEW_GAME_PLUS, label: "⚡ NEW GAME+", cost: 0, score: 5e3 }];
  if (s?.organizationMode) return [{ type: "organization-pass", event: EVENTS5.END_MONTH, label: "▶ ผ่านไปอีก 1 เดือน", cost: 0, score: 1e3 }];
  const actions = getBestNextActions4(s, Math.max(limit, 3)) || [];
  if (s?.runMode === "NEW_GAME_PLUS" && Number(s.month || 0) === 1 && !(s.prospects?.length || s.customers?.length || s.team?.length)) {
    const useful = actions.filter((a) => a?.event);
    if (useful.length) return useful.slice(0, limit);
    return [{ type: "lead", event: EVENTS5.CREATE_LEAD, source: "known", payload: { source: "known" }, label: "💬 รู้จักคนใหม่", cost: 1, score: 300 }, { type: "content", event: EVENTS5.CREATE_LEAD, source: "content", payload: { source: "content" }, label: "📣 ทำ Content เติม Pipeline", cost: 1, score: 250 }, { type: "end-month", event: EVENTS5.END_MONTH, label: "🌙 จบเดือน", cost: 0, score: 20 }].slice(0, limit);
  }
  return actions.slice(0, Math.max(1, limit));
}
function canDispatch5(s, e) {
  if (e === EVENTS5.XGEN_EXAM && !qualified(s) && getCurrentTGV2(s) < XGEN_SINGLE_MONTH_TARGET) return false;
  return canDispatch4(s, e);
}
function reduceGame5(current, event, payload = {}) {
  let before = release(normalizeXgen(current, current));
  if (event === EVENTS5.NEW_GAME_PLUS) return makeNewGamePlusState4({ seed: Number(before.rngSeed || 1) + 101, previousScore: before.campaignScore || before.twoYearSummary?.campaignScore || null });
  if (before.organizationMode) before = year2(before);
  let after = normalizeTeam(reduceGame4(before, event, payload));
  after = correctFast(before, after, event);
  after = patchTx(before, after);
  if (!before.organizationMode && event === EVENTS5.END_MONTH && Number(before.month || 0) <= 12) after = patchCampaignClose(before, after);
  else after = normalizeXgen(after, before);
  if (event === EVENTS5.ENTER_ORGANIZATION || after.organizationMode) after = year2(after);
  if (before.organizationMode && event === EVENTS5.END_MONTH) {
    after = recalcYear2(before, after);
    after = fixedTravel(after);
  }
  if (after.runComplete && after.twoYearSummary) {
    const path = before.year2Path || after.year2Path || (after.campaignOutcome?.xgenByMonth12 ? "xgen" : "xlead");
    after = { ...after, year2Path: path, twoYearSummary: { ...after.twoYearSummary, year2Path: path, trips: path === "xgen" ? (after.organization?.trips || []).filter((t) => TRAVEL_MONTHS.includes(Number(t.month))) : [] } };
  }
  return release(after);
}
function serializeState5(s) {
  return JSON.stringify({ ...release(s), updatedAt: Date.now() });
}
function parseSavedState5(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw), compat = JSON.stringify({ ...value, releaseVersion: "1.0", v1SaveVersion: "1.0" }), old = parseSavedState4(compat);
    if (!old) return null;
    let merged = { ...old, ...value, organization: { ...old.organization || {}, ...value.organization || {} }, economy: { ...old.economy || {}, ...value.economy || {} }, career: { ...old.career || {}, ...value.career || {} }, campaignOutcome: value.campaignOutcome || old.campaignOutcome || { xgenByMonth12: false } };
    const rows = Object.values(merged.settlements || {}).filter((r) => Number(r.month) <= 12), hit = rows.some((r) => n(r.currentTGV || r.tgv) >= XGEN_SINGLE_MONTH_TARGET);
    merged = { ...merged, career: { ...merged.career || {}, xgenQualified: hit, xgenQualifiedSingleMonth: hit, xgenCertified: hit, xgenCertified1b: hit, xgenQualificationRule: hit ? "single-month" : null }, campaignOutcome: { ...merged.campaignOutcome || {}, xgenByMonth12: !!(merged.campaignComplete ? hit : merged.campaignOutcome?.xgenByMonth12) } };
    if (merged.organizationMode) merged = year2(merged);
    return release(merged);
  } catch {
    return null;
  }
}

var XGEN_TARGET = 3e6;
var XGEN_GOAL_VISIBLE_AT = 15e5;
function n2(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
function currentTgv(state) {
  return Math.round(n2(state?.economy?.personalXV) + n2(state?.economy?.teamXV));
}
function hasRealSingleMonthQualification(state) {
  return Boolean(
    state?.career?.xgenQualifiedSingleMonth || state?.career?.xgenQualificationRule === "single-month" || state?.career?.xgenCertified1b || state?.campaignOutcome?.xgenByMonth12 || state?.campaignScore?.xgenByMonth12
  );
}
function sanitizeXgen(state) {
  if (!state) return state;
  const month = Number(state.month || 0);
  const tgv = currentTgv(state);
  const hitNow = !state.organizationMode && month >= 1 && month <= 12 && tgv >= XGEN_TARGET;
  const qualified2 = hasRealSingleMonthQualification(state) || hitNow;
  const career = {
    ...state.career || {},
    xgenQualified: qualified2,
    xgenQualifiedSingleMonth: qualified2,
    xgenQualificationRule: qualified2 ? "single-month" : null,
    xgenCertified: qualified2,
    xgenCertified1b: qualified2,
    xgenQualifiedAtMonth: qualified2 ? Number(state.career?.xgenQualifiedAtMonth || (hitNow ? month : 0)) || null : null
  };
  let rank = state.rank;
  if (qualified2) rank = "xgen";
  else if (rank === "xgen") rank = career.xleadCertified ? "xlead" : "xvisor";
  const ghostScene = !qualified2 && ["xgen-qualified", "xgen-qualified-1b", "xgen-exam"].includes(state.sceneReport?.kind);
  const ghostMessage = !qualified2 && /XGEN|3,000,000/.test(String(state.lastMessage || ""));
  const ghostMilestone = !qualified2 && state.stage === STAGES.XGEN_MILESTONE;
  const recoveredStage = ghostMilestone ? state.settlements?.[String(month)] ? STAGES.MONTH_CLOSED : STAGES.MANAGEMENT : state.stage;
  return {
    ...state,
    stage: recoveredStage,
    phase: ghostMilestone ? "management" : state.phase,
    rank,
    career,
    organization: { ...state.organization || {}, xgen: qualified2 },
    milestones: { ...state.milestones || {}, xgen: qualified2 },
    sceneReport: ghostScene ? null : state.sceneReport,
    lastMessage: ghostMessage ? tgv >= XGEN_GOAL_VISIBLE_AT ? `🏙️ XGEN เป้าหมาย · TGV เดือนนี้ ${tgv.toLocaleString("th-TH")} / ${XGEN_TARGET.toLocaleString("th-TH")} XV · ยังไม่ Qualified` : null : state.lastMessage
  };
}
function endMonthAction() {
  return { type: "end-month", event: EVENTS5.END_MONTH, label: "🌙 จบเดือน", cost: 0, score: 1 };
}
function canCloseCampaignMonth(state) {
  const month = Number(state?.month || 0);
  return !state?.organizationMode && !state?.runComplete && month >= 1 && month <= 12 && state?.stage === STAGES.MANAGEMENT && !state?.settlements?.[String(month)];
}
function calculateEconomy6(state) {
  return calculateEconomy5(sanitizeXgen(state));
}
function makeInitialState6(options = {}) {
  return sanitizeXgen(makeInitialState5(options));
}
function makeNewGamePlusState5(options = {}) {
  return sanitizeXgen(makeNewGamePlusState4(options));
}
function canDispatch6(state, event) {
  const clean = sanitizeXgen(state);
  if (event === EVENTS5.XGEN_EXAM) return false;
  if (event === EVENTS5.END_MONTH && canCloseCampaignMonth(clean)) return true;
  return canDispatch5(clean, event);
}
function getBestNextActions6(state, limit = 3) {
  const clean = sanitizeXgen(state);
  if (clean.stage === STAGES.MONTH_CLOSED && Number(clean.month || 0) < CAMPAIGN_MONTHS2) {
    return [{ type: "start-next-month", event: EVENTS5.START_NEXT_MONTH, label: `▶ เริ่มเดือน ${Number(clean.month || 0) + 1}`, cost: 0, score: 1e3 }];
  }
  const requested = Math.max(8, Number(limit || 3) + 5);
  let actions = getBestNextActions5(clean, requested).filter((action) => action?.event !== EVENTS5.XGEN_EXAM && action?.type !== "xgen-exam");
  const canClose = canCloseCampaignMonth(clean);
  const hasEnd = actions.some((action) => action?.event === EVENTS5.END_MONTH);
  if (canClose && Number(clean.energy || 0) <= 0) {
    actions = [endMonthAction(), ...actions.filter((action) => action?.event !== EVENTS5.END_MONTH)];
  } else if (canClose && !hasEnd && actions.length < requested) {
    actions.push(endMonthAction());
  }
  return actions.slice(0, Math.max(1, Number(limit || 3)));
}
function reduceGame6(currentState, event, payload = {}) {
  const before = sanitizeXgen(currentState);
  if (event === EVENTS5.XGEN_EXAM) {
    return {
      ...before,
      lastMessage: currentTgv(before) >= XGEN_TARGET ? "🏆 XGEN เปิดอัตโนมัติแล้วจาก TGV 3,000,000 XV ภายในเดือนเดียว · ไม่ต้องสอบซ้ำ" : `🏙️ XGEN ต้องแตะ ${XGEN_TARGET.toLocaleString("th-TH")} XV ภายในเดือนเดียวก่อน`
    };
  }
  const wasQualified = hasRealSingleMonthQualification(before);
  let after = sanitizeXgen(reduceGame5(before, event, payload));
  const nowQualified = hasRealSingleMonthQualification(after);
  if (!wasQualified && nowQualified) {
    const tgv = currentTgv(after);
    after = {
      ...after,
      sceneReport: { kind: "xgen-qualified-1b", month: Number(after.month || 0), tgv, target: XGEN_TARGET },
      lastMessage: `🏆 XGEN Qualified · TGV เดือนนี้ ${tgv.toLocaleString("th-TH")} XV · ③ Organization 5% เริ่มในเดือนนี้ทันที`
    };
  }
  return after;
}
function serializeState6(state) {
  return serializeState5(sanitizeXgen(state));
}
function parseSavedState6(raw) {
  return sanitizeXgen(parseSavedState5(raw));
}
export {
  CAMPAIGN_MONTHS2 as CAMPAIGN_MONTHS,
  CUSTOMER_STATES,
  ENERGY_COSTS,
  EVENTS5 as EVENTS,
  GAME_VERSION3 as GAME_VERSION,
  MAX_ENERGY,
  ORGANIZATION_END_MONTH2 as ORGANIZATION_END_MONTH,
  ORGANIZATION_START_MONTH2 as ORGANIZATION_START_MONTH,
  ORGANIZATION_XIRCLE_MONTHS2 as ORGANIZATION_XIRCLE_MONTHS,
  PEOPLE_RENDER_LIMIT2 as PEOPLE_RENDER_LIMIT,
  PRODUCT_CONFIG,
  RELEASE_VERSION2 as RELEASE_VERSION,
  ROUTINEX,
  SAVE_KEY,
  SAVE_VERSION,
  SKILL_IDS,
  STAGES,
  TRAVEL_DESTINATIONS2 as TRAVEL_DESTINATIONS,
  TRAVEL_MONTHS,
  V1_SAVE_VERSION2 as V1_SAVE_VERSION,
  V1_SCORE_VERSION2 as V1_SCORE_VERSION,
  V8_SCORE_VERSION,
  V9_SAVE_VERSION,
  V9_SCORE_VERSION,
  XGEN_ROLLING_TARGET,
  XGEN_SINGLE_MONTH_TARGET,
  XGEN_TGV_TARGET,
  XIRCLE,
  XIRCLE_MONTHS,
  applyAutomaticCustomerCycles,
  buildPersonAction,
  calculateEconomy6 as calculateEconomy,
  canDispatch6 as canDispatch,
  canOfferFullSetFastLane2 as canOfferFullSetFastLane,
  debugV9Snapshot,
  energyAtDay,
  findPerson,
  getAllowedEvents,
  getBestNextActions6 as getBestNextActions,
  getCurrentExamQuestion,
  getCurrentTGV2 as getCurrentTGV,
  getFastTrackChance2 as getFastTrackChance,
  getPersonContextAction,
  getPlanQuality,
  getRetailTier,
  getRetailTierBySalesBaht,
  getRolling3TGV,
  getTgvHistory,
  humanDecisionChance,
  isExamStage,
  isPreseasonStage,
  makeInitialState6 as makeInitialState,
  makeMonthStats,
  makeNewGamePlusState5 as makeNewGamePlusState,
  parseSavedState6 as parseSavedState,
  recordSale,
  reduceGame6 as reduceGame,
  refreshMissions,
  serializeState6 as serializeState,
  simulateCustomerOutcome
};
