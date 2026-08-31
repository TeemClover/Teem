import {
  ADS_GAMEPLAY_CONFIG,
  INCOME_RULE,
  PRODUCT_CONFIG,
  TUTORIAL_OFFER,
  getRetailTier,
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
  simulateTeamCycle,
} from "./game-progression.js";

export { SAVE_KEY, SAVE_VERSION };
export const MAX_ENERGY = 28;
export const ROUTINEX = TUTORIAL_OFFER;
export { PRODUCT_CONFIG, SKILL_IDS, getRetailTier };

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
  CONTENT_RUNNING: "content_running",
  ADS_RUNNING: "ads_running",
  CENTER_RUNNING: "center_running",
  GOOD_LUCK_RUNNING: "good_luck_running",
  G1_CELEBRATION: "g1_celebration",
  XLEAD_MILESTONE: "xlead_milestone",
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
  RUN_CENTER: "RUN_CENTER",
  RUN_GOOD_LUCK: "RUN_GOOD_LUCK",
  REVIEW_TEAM_LEADERS: "REVIEW_TEAM_LEADERS",
  SCENE_COMPLETE: "SCENE_COMPLETE",
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
    EVENTS.CREATE_LEAD, EVENTS.CONTACT_PROSPECT, EVENTS.MEET_PROSPECT,
    EVENTS.CONSULT_PROSPECT, EVENTS.BASELINE_PROSPECT,
    EVENTS.OPEN_MANAGEMENT_ROUTINE, EVENTS.OFFER_PROSPECT, EVENTS.CARE_CUSTOMER,
    EVENTS.REMEASURE_CUSTOMER, EVENTS.REORDER_CUSTOMER, EVENTS.ASK_REFERRAL,
    EVENTS.FOLLOW_UP_DECISION, EVENTS.TRAIN_SKILL, EVENTS.INVITE_XVISOR,
    EVENTS.START_CANDIDATE_XCADEMY, EVENTS.REVIEW_CANDIDATE, EVENTS.CERTIFY_CANDIDATE,
    EVENTS.RUN_CENTER, EVENTS.RUN_GOOD_LUCK, EVENTS.REVIEW_TEAM_LEADERS,
    EVENTS.MENTOR_TEAM_MEMBER,
    EVENTS.END_MONTH,
  ],
  [STAGES.MANAGEMENT_ROUTINE]: [EVENTS.CHOOSE_MANAGEMENT_ROUTINE],
  [STAGES.CONTENT_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.ADS_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.CENTER_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.GOOD_LUCK_RUNNING]: [EVENTS.SCENE_COMPLETE],
  [STAGES.G1_CELEBRATION]: [EVENTS.SCENE_COMPLETE],
  [STAGES.XLEAD_MILESTONE]: [EVENTS.SCENE_COMPLETE],
  [STAGES.MONTH_CLOSED]: [EVENTS.START_NEXT_MONTH],
  [STAGES.SEASON_REVIEW]: [],
});

const LEAD_COST = Object.freeze({ known: 1, relationship: 1, referral: 1, content: 1, creator: 1, ads: 1, event: 0 });

export const ENERGY_COSTS = Object.freeze({
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
  center: 2,
  goodLuck: 3,
});

export function energyAtDay(day) {
  return Math.min(MAX_ENERGY, Math.max(0, Math.floor(Number(day || 0))));
}

export function makeMonthStats() {
  return {
    newPeople: 0, appointments: 0, meetings: 0, contentLeads: 0, adLeads: 0, referrals: 0,
    newCustomers: 0, sales: 0, reorders: 0, customersCared: 0, remeasures: 0,
    successCases: 0, candidates: 0, newXvisors: 0,
    teamActivity: 0, teamActions: 0, teamCustomers: 0, teamSales: 0,
    teamReorders: 0, teamReferrals: 0, teamCandidates: 0, teamOutput: [],
    playerActions: { attract: 0, care: 0, learn: 0, team: 0, other: 0, total: 0 },
    energyUse: { attract: 0, care: 0, learn: 0, team: 0, other: 0 },
    skillLevelsGained: 0,
    centerDone: false, goodLuckDone: false, teamCycleDone: false,
    weeklyDone: false, eventDone: false,
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
    skills: makeSkills(),
    playerLevel: 1,
    marketing: { spent: 0, campaigns: 0 },
    career: { centers: 0, goodLucks: 0, totalTeamActions: 0, totalSuccessCases: 0, xleadAtMonth: null },
    organization: { generation: 1, xleads: [], totalActivity: 0, tgv: 0, mapUnlocked: false },
    economy: {
      sets: 0, productSales: 0, personalXV: 0,
      teamProductSales: 0, teamXV: 0,
      receivedIncome: 0, lastTransaction: null,
    },
    monthStats: makeMonthStats(),
    monthSummaries: [],
    milestones: {
      certified: false, firstSale: false, firstResult: false, firstG1: false,
      firstWeekly: false, firstTeamCustomer: false, firstTeamSale: false,
      firstXlead: false,
    },
    lastEvent: null,
    lastMessage: null,
    updatedAt: Date.now(),
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
    [category]: Number(state.monthStats.energyUse?.[category] || 0) + cost,
  };
  const playerActions = {
    ...state.monthStats.playerActions,
    [category]: Number(state.monthStats.playerActions?.[category] || 0) + 1,
    total: Number(state.monthStats.playerActions?.total || 0) + 1,
  };
  return {
    ...state,
    energy: Math.max(0, state.energy - cost),
    monthStats: { ...state.monthStats, energyUse, playerActions },
  };
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
  const normalizedSource = source === "relationship" ? "known" : source === "creator" ? "content" : source;
  const created = createPerson({
    seed: state.rngSeed,
    usedNames: state.usedNames,
    source: normalizedSource,
    index: state.nextPersonId,
    tutorial,
  });
  const peopleLevel = getSkillLevel(state.skills, "people");
  const warmBonus = normalizedSource === "referral" ? 16 : normalizedSource === "content" ? 7 : normalizedSource === "ads" ? 3 : 0;
  const person = {
    ...created.person,
    trust: created.person.trust + warmBonus + Math.floor(peopleLevel / 3) * 2,
    readiness: Math.min(92, created.person.readiness + warmBonus + Math.floor(peopleLevel / 2)),
    lastContactMonth: state.month,
  };
  return {
    state: {
      ...state,
      rngSeed: created.nextSeed,
      nextPersonId: state.nextPersonId + 1,
      usedNames: [...state.usedNames, person.name],
    },
    person,
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

export function calculateEconomy(state) {
  const personalXV = Math.max(0, Number(state.economy?.personalXV || 0));
  const productSales = Math.max(0, Number(state.economy?.productSales || 0));
  const tier = getRetailTier(personalXV);
  const activeRetail = Math.round(personalXV * tier.rate);
  return {
    productSales, personalXV, tier, activeRetail, mentoring: 0,
    teamProductSales: Math.max(0, Number(state.economy?.teamProductSales || 0)),
    teamXV: Math.max(0, Number(state.economy?.teamXV || 0)),
    teamIncome: 0,
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
  if (state.month < 1 || state.stage === STAGES.M1_EMPTY) return state;
  const missions = [];
  state.customers.forEach((customer) => {
    if (customer.xvisorStage === "ready") missions.push(makeMission("candidate-start", customer.id, `${customer.name} · พร้อมเรียน Xcademy`));
    else if (customer.xvisorStage === "xcademy") missions.push(makeMission("candidate-review", customer.id, `${customer.name} · Review Case เพื่อไปต่อ`));
    else if (customer.xvisorStage === "case") missions.push(makeMission("candidate-certify", customer.id, `${customer.name} · พร้อม Certification`));
    else if (customer.xvisorInterest && !customer.xvisorStage) missions.push(makeMission("xvisor", customer.id, `${customer.name} · เริ่มสนใจ X-VISOR`));
    if (customer.day < 28 && !customer.selfDirected) missions.push(makeMission("care", customer.id, `${customer.name} · ถึงเวลาติดตาม`));
    else if (!customer.measuredAgain) missions.push(makeMission("remeasure", customer.id, `${customer.name} · ถึงเวลาวัดซ้ำ`));
    else missions.push(makeMission("reorder", customer.id, `${customer.name} · พร้อมคุยเรื่องรอบต่อไป`));
    if (customer.referralReady && !customer.referralAsked) missions.push(makeMission("referral", customer.id, `${customer.name} · พร้อมแนะนำเพื่อน`));
  });
  state.prospects.forEach((person) => {
    if (person.journey === "new") missions.push(makeMission("contact", person.id, `${person.name} · ทักและนัดหมาย`));
    if (person.journey === "scheduled") missions.push(makeMission("meet", person.id, `${person.name} · นัดแล้ว ไปพบเพื่อฟังบริบท`));
    if (person.journey === "conversation") missions.push(makeMission("consult", person.id, `${person.name} · ฟังให้เจอสิ่งที่อยากเปลี่ยน`));
    if (person.journey === "discovery") missions.push(makeMission("baseline", person.id, `${person.name} · ขอ consent แล้วดู Baseline`));
    if (person.journey === "baseline") missions.push(makeMission("routine", person.id, `${person.name} · วาง Routine จากข้อมูล`));
    if (person.journey === "recommendation") missions.push(makeMission("offer", person.id, `${person.name} · พร้อมคุยแผน`));
    if (person.journey === "waiting") missions.push(makeMission("decision", person.id, `${person.name} · ขอคิดก่อน ติดตามได้แล้ว`));
  });
  state.team.filter((member) => member.active && (member.autonomy < 75 || member.customers === 0)).forEach((member) => {
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

function evaluateCustomer(customer) {
  if (customer.followups >= 2 && customer.adherence >= 68) return "ดีขึ้น";
  if (customer.followups >= 1 && customer.adherence >= 50) return "mixed";
  if (customer.followups === 0) return "หลุด";
  return "ยังไม่ชัด";
}

function closeMonth(state, event) {
  const economy = calculateEconomy(state);
  const previous = state.monthSummaries.at(-1);
  const summary = {
    month: state.month,
    ...state.monthStats,
    xv: economy.personalXV,
    productSales: economy.productSales,
    teamXV: economy.teamXV,
    teamProductSales: economy.teamProductSales,
    projectedIncome: economy.projectedIncome,
    receivedIncome: economy.projectedIncome,
    receivedIncomeTotal: economy.receivedIncome + economy.projectedIncome,
    previousIncome: Number(previous?.projectedIncome || 0),
    customers: state.customers.length,
    team: state.team.length,
    leverage: {
      player: Number(state.monthStats.playerActions?.total || 0),
      team: Number(state.monthStats.teamActions || 0),
    },
    sources: {
      newSales: Number(state.monthStats.sales || 0),
      reorders: Number(state.monthStats.reorders || 0),
      teamSales: Number(state.monthStats.teamSales || 0),
    },
  };
  return withStage({
    ...state,
    economy: { ...state.economy, receivedIncome: economy.receivedIncome + economy.projectedIncome },
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
      state = spendEnergy(state, ENERGY_COSTS.remoteContact, "attract");
      if (!state) return currentState;
      const created = addPerson(state, "known", true);
      return withStage(addSkillXp({
        ...created.state,
        prospects: [created.person],
        selectedPersonId: created.person.id,
        monthStats: { ...state.monthStats, newPeople: state.monthStats.newPeople + 1 },
      }, "people", 1, "first-contact"), STAGES.M1_PERSON_MET, event);
    }
    case EVENTS.TALK: {
      state = spendEnergy(state, ENERGY_COSTS.remoteContact, "attract");
      if (!state) return currentState;
      return withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "discovery", status: "เข้าใจเป้าหมายแล้ว", trust: person.trust + 14 })),
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
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "baseline", status: "มี Baseline แล้ว", measured: true, trust: person.trust + 8 })),
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
        milestones: { ...state.milestones, firstSale: true },
      }, "knowledge", 1, "first-recommendation"), STAGES.M1_SALE_RECEIPT, event);
    }
    case EVENTS.CLOSE_RECEIPT:
      return withStage(state, STAGES.M1_ONBOARDING, event);
    case EVENTS.START_ONBOARDING:
      state = spendEnergy(state, ENERGY_COSTS.onboarding, "care");
      return state ? withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "day7", status: "ถึงเวลาติดตาม", day: 7, adherence: 58 })),
      }, "care", 1, "onboarding"), STAGES.M1_FOLLOWUP, event) : currentState;
    case EVENTS.FOLLOW_UP_CUSTOMER:
      state = spendEnergy(state, ENERGY_COSTS.followup, "care");
      return state ? withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "day28", status: "พร้อมวัดซ้ำ", day: 28, followups: 2, adherence: 78, trust: person.trust + 12 })),
        monthStats: { ...state.monthStats, customersCared: state.monthStats.customersCared + 1 },
      }, "care", 1, "followup"), STAGES.M1_REVIEW_SCAN, event) : currentState;
    case EVENTS.START_CUSTOMER_REVIEW:
      state = spendEnergy(state, ENERGY_COSTS.scale, "care");
      return state ? withStage(state, STAGES.M1_REVIEW_SCANNING, event) : currentState;
    case EVENTS.CUSTOMER_REVIEW_COMPLETE:
      return withStage({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "review", status: "เริ่มเห็นแนวโน้ม", measuredAgain: true, result: evaluateCustomer(person) })),
      }, STAGES.M1_REVIEW, event);
    case EVENTS.SAVE_SUCCESS:
      return withStage(addSkillXp({
        ...state,
        prospects: updatePerson(state.prospects, state.selectedPersonId, (person) => ({ ...person, journey: "advocate", status: "ทำต่อและพร้อมบอกต่อ", successCase: true, referralReady: true })),
        monthStats: { ...state.monthStats, successCases: state.monthStats.successCases + 1 },
        career: { ...state.career, totalSuccessCases: state.career.totalSuccessCases + 1 },
        milestones: { ...state.milestones, firstResult: true },
      }, "care", 1, "success-case"), STAGES.M1_SUCCESS, event);
    case EVENTS.CONTINUE_CARE: {
      const person = state.prospects.find((item) => item.id === state.selectedPersonId);
      if (!person) return state;
      const customer = { ...person, id: `customer-${person.id}`, personId: person.id, journey: "continue", status: "พร้อมต่อและแนะนำเพื่อน" };
      return withStage(refreshMissions({
        ...state,
        prospects: state.prospects.filter((item) => item.id !== person.id),
        customers: [...state.customers, customer],
        selectedPersonId: customer.id,
        monthStats: { ...state.monthStats, newCustomers: state.monthStats.newCustomers + 1 },
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
      state = spendEnergy(state, ENERGY_COSTS.center, "team");
      return state ? withStage(state, STAGES.M1_WEEKLY_RUNNING, event) : currentState;
    case EVENTS.WEEKLY_COMPLETE:
      return withStage({
        ...state,
        team: state.team.map((member) => member.active ? { ...member, confidence: member.confidence + 12, activity: member.activity + 1, status: "รู้ว่าจะเริ่มคุยกับใครก่อน" } : member),
        monthStats: { ...state.monthStats, weeklyDone: true, teamActivity: state.monthStats.teamActivity + state.team.filter((member) => member.active).length },
        milestones: { ...state.milestones, firstWeekly: true },
      }, STAGES.M1_TEAM_STARTED, event);
    case EVENTS.CREATE_LEAD: {
      const source = payload.source === "relationship" ? "known" : payload.source === "creator" ? "content" : (payload.source || "known");
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
      const count = source === "ads"
        ? 2 + Number(knowledge + peopleSkill >= 9)
        : source === "content"
          ? 1 + Number(knowledge + peopleSkill >= 7)
          : 1;
      const created = addPeople(state, source, count);
      let next = {
        ...created.state,
        prospects: [...state.prospects, ...created.people],
        selectedPersonId: created.people[0].id,
        marketing: source === "ads" ? {
          spent: Number(state.marketing?.spent || 0) + ADS_GAMEPLAY_CONFIG.budgetPerCampaign,
          campaigns: Number(state.marketing?.campaigns || 0) + 1,
        } : state.marketing,
        monthStats: {
          ...state.monthStats,
          newPeople: state.monthStats.newPeople + count,
          contentLeads: state.monthStats.contentLeads + (source === "content" ? count : 0),
          adLeads: state.monthStats.adLeads + (source === "ads" ? count : 0),
        },
        sceneReport: {
          kind: source,
          people: created.people.map((person) => person.name),
          message: source === "content"
            ? `มีคนทักจากคอนเทนต์ ${count} คน`
            : source === "ads"
              ? `มีคนสนใจนัดวัด ${count} คน`
              : `รู้จัก ${created.people[0].name} จากคนที่คุณรู้จัก`,
        },
        lastEvent: event,
        lastMessage: source === "content"
          ? `โพสต์นี้ทำให้ ${created.people.map((person) => person.name).join(" และ ")} สนใจ`
          : source === "ads"
            ? `แคมเปญจำลองพาคนสนใจมา ${count} คน — ทุกคนยังต้องคุยก่อน`
            : `${created.people[0].name} · เพิ่งรู้จัก`,
        updatedAt: Date.now(),
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
          lastContactMonth: state.month,
        })),
        selectedPersonId: person.id,
        monthStats: { ...state.monthStats, appointments: state.monthStats.appointments + 1 },
        lastEvent: event,
        lastMessage: fastDiscovery
          ? `คุยออนไลน์กับ ${person.name} แล้วจับประเด็นได้เร็ว — พร้อมดู Baseline`
          : `นัด ${person.name} เรียบร้อย — ขั้นต่อไปคือไปพบกัน`,
        updatedAt: Date.now(),
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
          ...item, journey: "discovery", scheduled: false, meetings: Number(item.meetings || 0) + 1,
          status: "เริ่มเปิดใจ", trust: item.trust + 13, lastContactMonth: state.month,
        })),
        selectedPersonId: person.id,
        monthStats: { ...state.monthStats, meetings: state.monthStats.meetings + 1 },
        lastEvent: event,
        lastMessage: `ได้พบ ${person.name} และเข้าใจสิ่งที่อยากเปลี่ยนแล้ว`,
        updatedAt: Date.now(),
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
        updatedAt: Date.now(),
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
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "knowledge", 1, "xircle-baseline");
      return refreshMissions(next);
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
      const buys = person.routinePlan.quality === "fit" && (person.trust + person.readiness >= 91 - skillEdge * 2);
      if (!buys) {
        return refreshMissions({
          ...state,
          prospects: updatePerson(state.prospects, person.id, (item) => ({ ...item, journey: "waiting", status: item.readiness < 42 ? "ยังไม่พร้อม" : "ขอคิดก่อน", nextOfferMonth: state.month + 1 })),
          lastEvent: event,
          lastMessage: `${person.name} ${person.readiness < 50 ? "ยังไม่พร้อม" : "ขอคิดก่อน"} — ความสัมพันธ์ยังอยู่`,
          updatedAt: Date.now(),
        });
      }
      state = recordSale(state, "sale", person.id);
      const customer = { ...person, id: `customer-${person.id}`, personId: person.id, journey: "day0", status: "เริ่ม Routine", activePlan: true, day: 0, trust: person.trust + 8 };
      let next = {
        ...state,
        prospects: state.prospects.filter((item) => item.id !== person.id),
        customers: [...state.customers, customer],
        selectedPersonId: customer.id,
        monthStats: { ...state.monthStats, sales: state.monthStats.sales + 1, newCustomers: state.monthStats.newCustomers + 1 },
        lastEvent: event,
        lastMessage: `${person.name} พร้อมเริ่ม Routine`,
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "knowledge", 1, "sale");
      return refreshMissions(next);
    }
    case EVENTS.CARE_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer) return state;
      state = spendEnergy(state, ENERGY_COSTS.followup, "care");
      if (!state) return currentState;
      const checkpoints = [3, 7, 14, 21, 28];
      const careLevel = getSkillLevel(state.skills, "care");
      const steps = careLevel >= 8 ? 3 : careLevel >= 4 ? 2 : 1;
      let nextDay = customer.day;
      for (let index = 0; index < steps; index += 1) nextDay = checkpoints.find((day) => day > nextDay) || 28;
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item, day: nextDay, followups: item.followups + 1,
          adherence: Math.min(96, item.adherence + 7 + careLevel * 2), trust: item.trust + 5 + Math.floor(careLevel / 2),
          selfDirected: careLevel >= 8,
          status: nextDay >= 28 ? "ถึงเวลาวัดซ้ำ" : careLevel >= 5 ? "ทำได้ดี · Next Action ชัด" : `Day ${nextDay} · ทำต่อ`,
          lastContactMonth: state.month,
        })),
        monthStats: { ...state.monthStats, customersCared: state.monthStats.customersCared + 1 },
        lastEvent: event,
        lastMessage: careLevel >= 8
          ? `${customer.name} เห็น Next Action ชัดและเริ่มเดินต่อเองได้`
          : `ติดตาม ${customer.name} แล้ว และเลือก Next Action ใหม่ร่วมกัน`,
        updatedAt: Date.now(),
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
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({
          ...item, measuredAgain: true, result, successCase: success,
          referralReady: success, advocacy: success ? Number(item.advocacy || 0) + 1 : Number(item.advocacy || 0),
          xvisorInterest: item.xvisorInterest || interest,
          status: interest ? "เริ่มสนใจ X-VISOR" : success ? "พร้อมต่อและแนะนำเพื่อน" : `ผล ${result}`,
        })),
        monthStats: { ...state.monthStats, remeasures: state.monthStats.remeasures + 1, successCases: state.monthStats.successCases + (newlySuccessful ? 1 : 0) },
        career: { ...state.career, totalSuccessCases: state.career.totalSuccessCases + (newlySuccessful ? 1 : 0) },
        lastEvent: event,
        lastMessage: interest
          ? `${customer.name} เห็นผลจากการดูแล และเริ่มถามถึงบทบาท X-VISOR`
          : success ? `${customer.name} เริ่มเห็นแนวโน้มดีจากสิ่งที่ทำต่อเนื่อง` : `ผลของ ${customer.name} ยังเป็น ${result} — ต้องดูแลต่อ`,
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "care", 1, "result-review");
      return completeMission(refreshMissions(next), "remeasure", customer.id);
    }
    case EVENTS.REORDER_CUSTOMER: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (!customer || customer.day < 28) return state;
      state = spendEnergy(state, ENERGY_COSTS.reorder, "care");
      if (!state) return currentState;
      const careLevel = getSkillLevel(state.skills, "care");
      const ready = customer.followups >= (careLevel >= 4 ? 1 : 2) && customer.measuredAgain && customer.trust >= 58 && customer.result !== "หลุด";
      if (!ready) return { ...state, lastEvent: event, lastMessage: `${customer.name} ยังไม่พร้อมซื้อซ้ำ — ดูแลต่อก่อน`, updatedAt: Date.now() };
      state = recordSale(state, "reorder", customer.id);
      let next = {
        ...state,
        customers: updatePerson(state.customers, customer.id, (item) => ({ ...item, day: 0, measuredAgain: false, followups: 0, status: "เริ่ม Routine รอบต่อไป" })),
        monthStats: { ...state.monthStats, reorders: state.monthStats.reorders + 1 },
        lastEvent: event,
        lastMessage: `${customer.name} เลือกทำ Routine ต่อหลังเห็น Trend และได้รับการติดตาม`,
        updatedAt: Date.now(),
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
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "care", 1, "referral");
      return refreshMissions(next);
    }
    case EVENTS.FOLLOW_UP_DECISION: {
      const person = state.prospects.find((item) => item.id === payload.id);
      if (!person || person.journey !== "waiting") return state;
      state = spendEnergy(state, ENERGY_COSTS.followup, "attract");
      if (!state) return currentState;
      const peopleLevel = getSkillLevel(state.skills, "people");
      let next = {
        ...state,
        prospects: updatePerson(state.prospects, person.id, (item) => ({
          ...item,
          journey: "recommendation",
          status: "พร้อมคุยเรื่องแผน",
          trust: item.trust + 8 + Math.floor(peopleLevel / 2),
          readiness: Math.min(96, item.readiness + 12 + peopleLevel),
          nextOfferMonth: null,
          lastContactMonth: state.month,
        })),
        selectedPersonId: person.id,
        lastEvent: event,
        lastMessage: `${person.name} กลับมาคุยต่อและพร้อมตัดสินใจจากแผนเดิม`,
        updatedAt: Date.now(),
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
      return refreshMissions({
        ...next,
        lastEvent: event,
        lastMessage: afterLevel > beforeLevel
          ? `Skill ขึ้น Lv.${afterLevel} — งานเดิม 1 ⚡ สร้างผลได้มากขึ้น`
          : `ฝึกต่อแล้ว · ${afterLevel === 10 ? "Skill นี้เต็มแล้ว" : "เข้าใกล้ระดับถัดไป"}`,
        updatedAt: Date.now(),
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
        updatedAt: Date.now(),
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
          ...item, xvisorStage: "xcademy", candidateProgress: 1 + Number(leadership >= 6),
          candidateStartedMonth: state.month, status: "กำลังเรียน Xcademy",
        })),
        lastEvent: event,
        lastMessage: `${customer.name} เริ่มเรียน Xcademy และเตรียมฝึกจาก Case จริง`,
        updatedAt: Date.now(),
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
          ...item, candidateProgress: progress, xvisorStage: progress >= 2 ? "case" : "xcademy",
          status: progress >= 2 ? "พร้อมสอบ Certification" : "กำลังฝึกจาก Case",
        })),
        lastEvent: event,
        lastMessage: progress >= 2 ? `${customer.name} ผ่าน Case Review และพร้อม Certification` : `${customer.name} เห็นจุดที่ต้องฝึกต่อ`,
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "leadership", 1, "candidate-review");
      return refreshMissions(next);
    }
    case EVENTS.CERTIFY_CANDIDATE: {
      const customer = state.customers.find((item) => item.id === payload.id);
      if (customer?.xvisorStage !== "case" || Number(customer.candidateProgress || 0) < 2) return state;
      const leadership = getSkillLevel(state.skills, "leadership");
      if (customer.candidateStartedMonth === state.month && leadership < 6 && !state.monthStats.centerDone) {
        return { ...state, lastEvent: event, lastMessage: `${customer.name} กำลังเตรียมสอบ — ทบทวนอีกครั้งเดือนหน้า หรือพาเข้า Center`, updatedAt: Date.now() };
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
        lastMessage: firstG1
          ? `${customer.name} เป็น G1 คนแรกแล้ว — เกมยังไปต่อสู่การสร้างทีมที่ทำเองได้`
          : `${customer.name} เป็น X-VISOR คนที่ ${state.team.length + 1} ในทีม`,
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "leadership", 2, "new-xvisor");
      return withStage(refreshMissions(next), STAGES.G1_CELEBRATION, event);
    }
    case EVENTS.RUN_CENTER:
    case EVENTS.RUN_WEEKLY: {
      if (state.monthStats.centerDone || state.monthStats.weeklyDone) return state;
      state = spendEnergy(state, ENERGY_COSTS.center, "team");
      if (!state) return currentState;
      const leadership = getSkillLevel(state.skills, "leadership");
      const activeCount = state.team.filter((member) => member.active).length;
      const team = state.team.map((member) => member.active ? {
        ...member,
        confidence: Math.min(100, Number(member.confidence || 0) + 7 + leadership),
        autonomy: Math.min(100, Number(member.autonomy || 0) + 4 + Math.floor(leadership / 2)),
        teamSkill: Math.min(10, Number(member.teamSkill || 1) + 1 + Number(leadership >= 5)),
        centerVisits: Number(member.centerVisits || 0) + 1,
        status: member.customers ? "รู้ว่าจะดูแลเคสไหนต่อ" : "รู้ว่าจะโทรหาใครก่อน",
      } : member);
      const customers = state.customers.map((customer) => {
        if (customer.xvisorStage !== "xcademy") return customer;
        const progress = Number(customer.candidateProgress || 0) + 1 + Number(leadership >= 5);
        return { ...customer, candidateProgress: progress, xvisorStage: progress >= 2 ? "case" : "xcademy", status: progress >= 2 ? "พร้อมสอบ Certification" : "กำลังฝึกจาก Case" };
      });
      const candidateCount = customers.filter((customer) => customer.xvisorStage === "case" && state.customers.find((item) => item.id === customer.id)?.xvisorStage !== "case").length;
      let next = {
        ...state,
        team,
        customers,
        career: { ...state.career, centers: state.career.centers + 1 },
        monthStats: {
          ...state.monthStats,
          centerDone: true, weeklyDone: true,
          teamActivity: state.monthStats.teamActivity + activeCount,
        },
        sceneReport: {
          kind: "center",
          messages: [
            ...team.filter((member) => member.active).slice(0, 3).map((member) => `${member.name}: ${member.status}`),
            ...(candidateCount ? [`Candidate ${candidateCount} คนพร้อมสอบ`] : []),
          ],
        },
        milestones: { ...state.milestones, firstWeekly: true },
        lastEvent: event,
        lastMessage: activeCount || candidateCount
          ? `Center ช่วย ${activeCount + candidateCount} คนให้ Next Action ชัดขึ้น`
          : "คุณทบทวน Case ที่ Center และฝึกการพาทีม",
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "leadership", 2, "center");
      return withStage(refreshMissions(next), STAGES.CENTER_RUNNING, event);
    }
    case EVENTS.RUN_GOOD_LUCK:
    case EVENTS.RUN_MONTHLY_EVENT: {
      if (state.monthStats.goodLuckDone || state.monthStats.eventDone) return state;
      state = spendEnergy(state, ENERGY_COSTS.goodLuck, "team");
      if (!state) return currentState;
      const leadership = getSkillLevel(state.skills, "leadership");
      const count = 1 + Number(leadership >= 7);
      const created = addPeople(state, "event", count);
      const customers = state.customers.map((customer) => customer.successCase ? {
        ...customer,
        advocacy: Number(customer.advocacy || 0) + 1,
        referralReady: true,
        xvisorInterest: customer.xvisorInterest || (customer.trust >= 65),
        status: customer.trust >= 65 ? "เริ่มสนใจ X-VISOR" : "พร้อมแนะนำเพื่อน",
      } : customer);
      const interested = customers.filter((customer) => customer.xvisorInterest && !state.customers.find((item) => item.id === customer.id)?.xvisorInterest).length;
      let next = {
        ...created.state,
        prospects: [...state.prospects, ...created.people],
        customers,
        team: state.team.map((member) => member.active ? {
          ...member,
          confidence: Math.min(100, Number(member.confidence || 0) + 5 + Math.floor(leadership / 2)),
          goodLuckVisits: Number(member.goodLuckVisits || 0) + 1,
          status: "มั่นใจขึ้นหลังฟัง Case ของคนอื่น",
        } : member),
        career: { ...state.career, goodLucks: state.career.goodLucks + 1 },
        monthStats: {
          ...state.monthStats,
          goodLuckDone: true, eventDone: true,
          newPeople: state.monthStats.newPeople + count,
        },
        sceneReport: {
          kind: "goodluck",
          messages: [
            `มีคนสนใจรู้จัก Xircle ${count} คน`,
            ...(interested ? [`ลูกค้า ${interested} คนถามเรื่อง X-VISOR`] : ["ลูกค้าเริ่มอยากชวนเพื่อนมารู้จัก Community"]),
            ...(state.team.length ? ["ทีมมั่นใจขึ้นหลังฟัง Case ของคนอื่น"] : []),
          ],
        },
        lastEvent: event,
        lastMessage: `Good Luck สร้างความสนใจและความเป็นส่วนหนึ่ง — ยังไม่มี Sale อัตโนมัติ`,
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "leadership", 2, "good-luck");
      return withStage(refreshMissions(next), STAGES.GOOD_LUCK_RUNNING, event);
    }
    case EVENTS.REVIEW_TEAM_LEADERS: {
      if (state.rank !== "xlead") return state;
      state = spendEnergy(state, ENERGY_COSTS.mentoring, "team");
      if (!state) return currentState;
      let next = {
        ...state,
        team: state.team.map((member) => member.active ? {
          ...member,
          autonomy: Math.min(100, Number(member.autonomy || 0) + 5),
          leaderReadiness: Math.min(100, Number(member.leaderReadiness || 0) + 8),
          status: "พร้อมช่วยคนในรุ่นถัดไป",
        } : member),
        lastEvent: event,
        lastMessage: "คุณ Review ผู้นำรุ่นถัดไป แทนการลงไปทำทุกเคสเอง",
        updatedAt: Date.now(),
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
        return {
          ...item, confidence, autonomy, customers, sales,
          xv: Number(item.xv || 0) + saleGain * TUTORIAL_OFFER.xv,
          activity: Number(item.activity || 0) + outputActions,
          status: firstSale ? "ปิดการขายเองครั้งแรก" : firstCustomer ? "ดูแลลูกค้าคนแรกได้เอง" : "กำลังฝึกจากเคสจริง",
        };
      });
      let next = {
        ...state,
        team,
        economy: {
          ...state.economy,
          teamProductSales: Number(state.economy.teamProductSales || 0) + (firstSale ? TUTORIAL_OFFER.price : 0),
          teamXV: Number(state.economy.teamXV || 0) + (firstSale ? TUTORIAL_OFFER.xv : 0),
        },
        monthStats: {
          ...state.monthStats,
          teamActivity: state.monthStats.teamActivity + outputActions,
          teamActions: state.monthStats.teamActions + outputActions,
          teamCustomers: state.monthStats.teamCustomers + Number(firstCustomer),
          teamSales: state.monthStats.teamSales + Number(firstSale),
        },
        career: { ...state.career, totalTeamActions: state.career.totalTeamActions + outputActions },
        organization: { ...state.organization, totalActivity: state.organization.totalActivity + outputActions, tgv: state.organization.tgv + (firstSale ? TUTORIAL_OFFER.xv : 0) },
        milestones: { ...state.milestones, firstTeamCustomer: state.milestones.firstTeamCustomer || firstCustomer, firstTeamSale: state.milestones.firstTeamSale || firstSale },
        lastEvent: event,
        lastMessage: firstSale ? `${member.name} ปิดการขายเองครั้งแรก` : firstCustomer ? `${member.name} ดูแลลูกค้าคนแรกได้เอง` : `ช่วย ${member.name} ทบทวนเคสแล้ว`,
        updatedAt: Date.now(),
      };
      next = addSkillXp(next, "leadership", 1, "field-mentor");
      return completeMission(refreshMissions(next), "mentor", member.id);
    }
    case EVENTS.SCENE_COMPLETE: {
      let next = refreshMissions({ ...state, sceneReport: null });
      const beforeRank = next.rank;
      next = evaluateXlead(next);
      if (beforeRank !== next.rank) return withStage(next, STAGES.XLEAD_MILESTONE, event);
      return withStage(next, STAGES.MANAGEMENT, event);
    }
    case EVENTS.END_MONTH:
      return closeMonth(state, event);
    case EVENTS.START_NEXT_MONTH: {
      if (state.month >= 24) return withStage(state, STAGES.SEASON_REVIEW, event, { phase: "season-review" });
      const nextMonth = state.month + 1;
      const prospects = state.prospects.map((person) => person.journey === "waiting"
        ? { ...person, status: "ขอคิดก่อน · ติดตามได้", readiness: Math.min(94, person.readiness + 5) }
        : person);
      let next = {
        ...state,
        phase: "management",
        month: nextMonth,
        energy: MAX_ENERGY,
        prospects,
        economy: {
          ...state.economy,
          sets: 0, productSales: 0, personalXV: 0,
          teamProductSales: 0, teamXV: 0,
          lastTransaction: null,
        },
        monthStats: makeMonthStats(),
        selectedPersonId: null,
        lastMessage: `เดือน ${nextMonth} เริ่มแล้ว เลือกงานที่สร้างคุณค่ามากที่สุดก่อน`,
      };
      next = simulateTeamCycle(next);
      next = {
        ...next,
        milestones: {
          ...next.milestones,
          firstTeamCustomer: next.milestones.firstTeamCustomer || next.monthStats.teamCustomers > 0,
          firstTeamSale: next.milestones.firstTeamSale || next.monthStats.teamSales > 0,
        },
      };
      next = refreshMissions(next);
      const beforeRank = next.rank;
      next = evaluateXlead(next);
      return withStage(next, beforeRank !== next.rank ? STAGES.XLEAD_MILESTONE : STAGES.MANAGEMENT, event);
    }
    default:
      return state;
  }
}

export function serializeState(state) {
  return JSON.stringify({ ...state, version: SAVE_VERSION, updatedAt: Date.now() });
}

function normalizeMonthStats(stats) {
  const base = makeMonthStats();
  return {
    ...base,
    ...(stats || {}),
    playerActions: { ...base.playerActions, ...(stats?.playerActions || {}) },
    energyUse: { ...base.energyUse, ...(stats?.energyUse || {}) },
    teamOutput: Array.isArray(stats?.teamOutput) ? stats.teamOutput : [],
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
    ...person,
    source: person?.source === "relationship" ? "known" : person?.source === "creator" ? "content" : person?.source,
  };
}

function migrateStateValue(value) {
  const seed = Number(value.rngSeed || 1);
  const base = makeInitialState({ seed });
  const legacy = LEGACY_SAVE_VERSIONS.includes(value.version);
  const legacyLateMonthOne = new Set([
    STAGES.M1_XVISOR_INTEREST, STAGES.M1_CANDIDATE,
    STAGES.M1_G1, STAGES.M1_WEEKLY_RUNNING,
  ]);
  const prospects = Array.isArray(value.prospects) ? value.prospects.map(normalizePersonForV5) : [];
  const existingCustomers = Array.isArray(value.customers) ? value.customers.map(normalizePersonForV5) : [];
  const activeTutorialPeople = legacy && legacyLateMonthOne.has(value.stage)
    ? prospects.filter((person) => person.activePlan).map((person) => ({
      ...person,
      id: `customer-${person.id}`,
      personId: person.id,
      journey: "continue",
      status: person.successCase ? "พร้อมต่อและแนะนำเพื่อน" : "ทำ Routine ต่อ",
    }))
    : [];
  const migratedCustomerIds = new Set(existingCustomers.map((person) => person.personId || person.id));
  const customers = [...existingCustomers, ...activeTutorialPeople.filter((person) => !migratedCustomerIds.has(person.personId))];
  const filteredProspects = activeTutorialPeople.length
    ? prospects.filter((person) => !activeTutorialPeople.some((customer) => customer.personId === person.id))
    : prospects;
  const skillSeed = value.month >= 2 ? 3 : 0;
  const skills = normalizeSkills(value.skills || makeSkills(skillSeed));
  const state = {
    ...base,
    ...value,
    version: SAVE_VERSION,
    stage: legacyLateMonthOne.has(value.stage) ? STAGES.M1_TEAM_STARTED : value.stage,
    prospects: filteredProspects,
    customers,
    team: (Array.isArray(value.team) ? value.team : []).map((member) => ({
      personId: member.personId || String(member.id || "").replace(/^member-(?:customer-)?/, ""),
      parentId: "player", generation: 1, active: true,
      confidence: 45, autonomy: 30, teamSkill: 1,
      customers: 0, sales: 0, reorders: 0, referrals: 0, candidates: 0,
      xv: 0, activity: 0, centerVisits: 0, goodLuckVisits: 0,
      downstreamXvisors: 0, leaderReadiness: 0,
      monthlyOutput: { actions: 0, newPeople: 0, followups: 0, customers: 0, sales: 0, reorders: 0, referrals: 0, candidates: 0 },
      ...member,
    })),
    skills,
    playerLevel: getPlayerLevelFromSkills(skills),
    marketing: { ...base.marketing, ...(value.marketing || {}) },
    career: { ...base.career, ...(value.career || {}) },
    organization: { ...base.organization, ...(value.organization || {}) },
    economy: { ...base.economy, ...(value.economy || {}) },
    monthStats: normalizeMonthStats(value.monthStats),
    milestones: { ...base.milestones, ...(value.milestones || {}) },
    monthSummaries: Array.isArray(value.monthSummaries) ? value.monthSummaries : [],
  };
  return state.month >= 2 || state.stage === STAGES.MANAGEMENT ? refreshMissions(state) : state;
}

export function parseSavedState(raw) {
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
