export const SAVE_KEY = "xvisorQuestRebootV1";
export const SAVE_VERSION = 1;

export const ROUTINEX = Object.freeze({
  name: "RoutineX Set",
  price: 7490,
  xv: 7000,
});

export const STAGES = Object.freeze({
  OPENING: "opening",
  SELF_INTRO: "self_intro",
  SELF_USED: "self_used",
  SELF_MEASURE_INTRO: "self_measure_intro",
  SELF_SCANNING: "self_scanning",
  SELF_RESULT: "self_result",
  EXPERIENCE_INTRO: "experience_intro",
  EXPERIENCE_RUNNING: "experience_running",
  ACADEMY_INTRO: "academy_intro",
  ACADEMY: "academy",
  CERTIFICATION: "certification",
  CERTIFIED: "certified",
  MONTH_EMPTY: "month_empty",
  PERSON_MET: "person_met",
  TALKED: "talked",
  TALKED_READY: "talked_ready",
  MEASUREMENT_INTRO: "measurement_intro",
  MEASURING: "measuring",
  MEASURED: "measured",
  OFFER_READY: "offer_ready",
  SALE_RECEIPT: "sale_receipt",
  CARE_START: "care_start",
  FOLLOWUP_DUE: "followup_due",
  FOLLOWUP_RESULT: "followup_result",
  REMEASURE_READY: "remeasure_ready",
  REMEASURING: "remeasuring",
  REMEASURED: "remeasured",
  SUCCESS_CASE: "success_case",
  XVISOR_INTEREST: "xvisor_interest",
  CANDIDATE: "candidate",
  FIRST_G1: "first_g1",
  WEEKLY_INVITE: "weekly_invite",
  WEEKLY_RUNNING: "weekly_running",
  WEEKLY_RESULT: "weekly_result",
  COMPLETE: "complete",
});

export const EVENTS = Object.freeze({
  START_PATH: "START_PATH",
  START_SELF: "START_SELF",
  GO_SELF_MEASURE: "GO_SELF_MEASURE",
  START_SELF_SCAN: "START_SELF_SCAN",
  SELF_SCAN_COMPLETE: "SELF_SCAN_COMPLETE",
  CHOOSE_NEXT_ACTION: "CHOOSE_NEXT_ACTION",
  START_EXPERIENCE: "START_EXPERIENCE",
  EXPERIENCE_COMPLETE: "EXPERIENCE_COMPLETE",
  OPEN_ACADEMY: "OPEN_ACADEMY",
  START_CERTIFICATION: "START_CERTIFICATION",
  ANSWER_CERTIFICATION: "ANSWER_CERTIFICATION",
  START_MONTH: "START_MONTH",
  FIND_PERSON: "FIND_PERSON",
  TALK: "TALK",
  TALK_MORE: "TALK_MORE",
  INVITE_MEASUREMENT: "INVITE_MEASUREMENT",
  START_MEASUREMENT: "START_MEASUREMENT",
  MEASUREMENT_COMPLETE: "MEASUREMENT_COMPLETE",
  DISCUSS_PLAN: "DISCUSS_PLAN",
  DEFER_OFFER: "DEFER_OFFER",
  SELL: "SELL",
  CLOSE_RECEIPT: "CLOSE_RECEIPT",
  START_CARE: "START_CARE",
  FOLLOW_UP: "FOLLOW_UP",
  SET_NEXT_ACTION: "SET_NEXT_ACTION",
  START_REMEASUREMENT: "START_REMEASUREMENT",
  REMEASUREMENT_COMPLETE: "REMEASUREMENT_COMPLETE",
  SAVE_SUCCESS: "SAVE_SUCCESS",
  CONTINUE_CARE: "CONTINUE_CARE",
  EXPLAIN_XVISOR: "EXPLAIN_XVISOR",
  PREPARE_CANDIDATE: "PREPARE_CANDIDATE",
  START_MEMBER: "START_MEMBER",
  START_WEEKLY: "START_WEEKLY",
  WEEKLY_COMPLETE: "WEEKLY_COMPLETE",
  FINISH_SLICE: "FINISH_SLICE",
});

const ALLOWED = Object.freeze({
  [STAGES.OPENING]: [EVENTS.START_PATH],
  [STAGES.SELF_INTRO]: [EVENTS.START_SELF],
  [STAGES.SELF_USED]: [EVENTS.GO_SELF_MEASURE],
  [STAGES.SELF_MEASURE_INTRO]: [EVENTS.START_SELF_SCAN],
  [STAGES.SELF_SCANNING]: [EVENTS.SELF_SCAN_COMPLETE],
  [STAGES.SELF_RESULT]: [EVENTS.CHOOSE_NEXT_ACTION],
  [STAGES.EXPERIENCE_INTRO]: [EVENTS.START_EXPERIENCE],
  [STAGES.EXPERIENCE_RUNNING]: [EVENTS.EXPERIENCE_COMPLETE],
  [STAGES.ACADEMY_INTRO]: [EVENTS.OPEN_ACADEMY],
  [STAGES.ACADEMY]: [EVENTS.START_CERTIFICATION],
  [STAGES.CERTIFICATION]: [EVENTS.ANSWER_CERTIFICATION],
  [STAGES.CERTIFIED]: [EVENTS.START_MONTH],
  [STAGES.MONTH_EMPTY]: [EVENTS.FIND_PERSON],
  [STAGES.PERSON_MET]: [EVENTS.TALK],
  [STAGES.TALKED]: [EVENTS.TALK_MORE, EVENTS.INVITE_MEASUREMENT],
  [STAGES.TALKED_READY]: [EVENTS.INVITE_MEASUREMENT],
  [STAGES.MEASUREMENT_INTRO]: [EVENTS.START_MEASUREMENT],
  [STAGES.MEASURING]: [EVENTS.MEASUREMENT_COMPLETE],
  [STAGES.MEASURED]: [EVENTS.DISCUSS_PLAN],
  [STAGES.OFFER_READY]: [EVENTS.SELL, EVENTS.DEFER_OFFER],
  [STAGES.SALE_RECEIPT]: [EVENTS.CLOSE_RECEIPT],
  [STAGES.CARE_START]: [EVENTS.START_CARE],
  [STAGES.FOLLOWUP_DUE]: [EVENTS.FOLLOW_UP],
  [STAGES.FOLLOWUP_RESULT]: [EVENTS.SET_NEXT_ACTION],
  [STAGES.REMEASURE_READY]: [EVENTS.START_REMEASUREMENT],
  [STAGES.REMEASURING]: [EVENTS.REMEASUREMENT_COMPLETE],
  [STAGES.REMEASURED]: [EVENTS.SAVE_SUCCESS],
  [STAGES.SUCCESS_CASE]: [EVENTS.CONTINUE_CARE],
  [STAGES.XVISOR_INTEREST]: [EVENTS.EXPLAIN_XVISOR],
  [STAGES.CANDIDATE]: [EVENTS.PREPARE_CANDIDATE],
  [STAGES.FIRST_G1]: [EVENTS.START_MEMBER],
  [STAGES.WEEKLY_INVITE]: [EVENTS.START_WEEKLY],
  [STAGES.WEEKLY_RUNNING]: [EVENTS.WEEKLY_COMPLETE],
  [STAGES.WEEKLY_RESULT]: [EVENTS.FINISH_SLICE],
  [STAGES.COMPLETE]: [],
});

export function getRetailTier(xv) {
  if (xv >= 100000) return { rate: 0.25, label: "25%", next: null };
  if (xv >= 40000) return { rate: 0.23, label: "23%", next: 100000 };
  return { rate: 0.2, label: "20%", next: 40000 };
}

export function calculateEconomy(state) {
  const personalXV = Number(state.economy?.personalXV || 0);
  const productSales = Number(state.economy?.productSales || 0);
  const tier = getRetailTier(personalXV);
  const activeRetail = Math.round(personalXV * tier.rate);
  const mentoring = state.rank === "xlead"
    ? (state.team || []).reduce((sum, member) => {
        if (!member.active || !member.xv) return sum;
        return sum + Math.round(member.xv * getRetailTier(member.xv).rate * 0.2);
      }, 0)
    : 0;

  return {
    productSales,
    personalXV,
    tier,
    activeRetail,
    mentoring,
    projectedIncome: activeRetail + mentoring,
    receivedIncome: Number(state.economy?.receivedIncome || 0),
  };
}

export function makeInitialState() {
  return {
    version: SAVE_VERSION,
    stage: STAGES.OPENING,
    month: 0,
    timeLeft: null,
    rank: "candidate",
    soundOn: true,
    certificationMistakes: 0,
    tutorialSeen: {},
    customer: null,
    team: [],
    economy: {
      sets: 0,
      productSales: 0,
      personalXV: 0,
      receivedIncome: 0,
    },
    milestones: {
      certified: false,
      firstSale: false,
      firstResult: false,
      firstG1: false,
      firstWeekly: false,
    },
    lastEvent: null,
    updatedAt: Date.now(),
  };
}

function spendTime(state, amount) {
  if (state.timeLeft == null) return state;
  return { ...state, timeLeft: Math.max(0, state.timeLeft - amount) };
}

function withStage(state, stage, event) {
  return { ...state, stage, lastEvent: event, updatedAt: Date.now() };
}

export function canDispatch(state, event) {
  return Boolean(ALLOWED[state.stage]?.includes(event));
}

export function reduceGame(currentState, event, payload = {}) {
  if (!canDispatch(currentState, event)) return currentState;
  let state = { ...currentState };

  switch (event) {
    case EVENTS.START_PATH:
      return withStage(state, STAGES.SELF_INTRO, event);
    case EVENTS.START_SELF:
      return withStage(state, STAGES.SELF_USED, event);
    case EVENTS.GO_SELF_MEASURE:
      return withStage(state, STAGES.SELF_MEASURE_INTRO, event);
    case EVENTS.START_SELF_SCAN:
      return withStage(state, STAGES.SELF_SCANNING, event);
    case EVENTS.SELF_SCAN_COMPLETE:
      return withStage(state, STAGES.SELF_RESULT, event);
    case EVENTS.CHOOSE_NEXT_ACTION:
      return withStage(state, STAGES.EXPERIENCE_INTRO, event);
    case EVENTS.START_EXPERIENCE:
      return withStage(state, STAGES.EXPERIENCE_RUNNING, event);
    case EVENTS.EXPERIENCE_COMPLETE:
      return withStage(state, STAGES.ACADEMY_INTRO, event);
    case EVENTS.OPEN_ACADEMY:
      return withStage(state, STAGES.ACADEMY, event);
    case EVENTS.START_CERTIFICATION:
      return withStage(state, STAGES.CERTIFICATION, event);
    case EVENTS.ANSWER_CERTIFICATION:
      if (payload.answer !== "next_action") {
        return {
          ...state,
          certificationMistakes: state.certificationMistakes + 1,
          lastEvent: "CERTIFICATION_RETRY",
          updatedAt: Date.now(),
        };
      }
      return withStage({
        ...state,
        rank: "xvisor",
        milestones: { ...state.milestones, certified: true },
      }, STAGES.CERTIFIED, event);
    case EVENTS.START_MONTH:
      return withStage({ ...state, month: 1, timeLeft: 12 }, STAGES.MONTH_EMPTY, event);
    case EVENTS.FIND_PERSON:
      state = spendTime(state, 1);
      return withStage({
        ...state,
        customer: {
          id: "mint",
          name: "มิ้นท์",
          status: "เพิ่งรู้จัก",
          concern: "ช่วงบ่ายมักไม่มีแรง",
          trust: 28,
          adherence: 0,
          outcome: 0,
          measured: false,
          activePlan: false,
        },
      }, STAGES.PERSON_MET, event);
    case EVENTS.TALK:
      state = spendTime(state, 1);
      return withStage({
        ...state,
        customer: { ...state.customer, trust: state.customer.trust + 12, status: "กำลังทำความรู้จัก" },
      }, STAGES.TALKED, event);
    case EVENTS.TALK_MORE:
      state = spendTime(state, 1);
      return withStage({
        ...state,
        customer: { ...state.customer, trust: state.customer.trust + 8 },
      }, STAGES.TALKED_READY, event);
    case EVENTS.INVITE_MEASUREMENT:
      return withStage(state, STAGES.MEASUREMENT_INTRO, event);
    case EVENTS.START_MEASUREMENT:
      state = spendTime(state, 2);
      return withStage(state, STAGES.MEASURING, event);
    case EVENTS.MEASUREMENT_COMPLETE:
      return withStage({
        ...state,
        customer: { ...state.customer, measured: true, status: "วัดครั้งแรกแล้ว", trust: state.customer.trust + 8 },
      }, STAGES.MEASURED, event);
    case EVENTS.DISCUSS_PLAN:
      return withStage(state, STAGES.OFFER_READY, event);
    case EVENTS.DEFER_OFFER:
      return { ...state, lastEvent: EVENTS.DEFER_OFFER, updatedAt: Date.now() };
    case EVENTS.SELL: {
      state = spendTime(state, 1);
      const economy = {
        ...state.economy,
        sets: state.economy.sets + 1,
        productSales: state.economy.productSales + ROUTINEX.price,
        personalXV: state.economy.personalXV + ROUTINEX.xv,
      };
      return withStage({
        ...state,
        economy,
        customer: {
          ...state.customer,
          status: "เริ่มแผน 28 วัน",
          activePlan: true,
          trust: state.customer.trust + 12,
          adherence: 55,
        },
        milestones: { ...state.milestones, firstSale: true },
      }, STAGES.SALE_RECEIPT, event);
    }
    case EVENTS.CLOSE_RECEIPT:
      return withStage(state, STAGES.CARE_START, event);
    case EVENTS.START_CARE:
      return withStage(state, STAGES.FOLLOWUP_DUE, event);
    case EVENTS.FOLLOW_UP:
      state = spendTime(state, 1);
      return withStage({
        ...state,
        customer: {
          ...state.customer,
          status: "กำลังทำต่อ",
          trust: state.customer.trust + 10,
          adherence: 76,
        },
      }, STAGES.FOLLOWUP_RESULT, event);
    case EVENTS.SET_NEXT_ACTION:
      return withStage(state, STAGES.REMEASURE_READY, event);
    case EVENTS.START_REMEASUREMENT:
      state = spendTime(state, 2);
      return withStage(state, STAGES.REMEASURING, event);
    case EVENTS.REMEASUREMENT_COMPLETE:
      return withStage({
        ...state,
        customer: {
          ...state.customer,
          status: "เริ่มเห็นผล",
          trust: state.customer.trust + 14,
          adherence: 84,
          outcome: 72,
        },
      }, STAGES.REMEASURED, event);
    case EVENTS.SAVE_SUCCESS:
      return withStage({
        ...state,
        milestones: { ...state.milestones, firstResult: true },
      }, STAGES.SUCCESS_CASE, event);
    case EVENTS.CONTINUE_CARE:
      return withStage(state, STAGES.XVISOR_INTEREST, event);
    case EVENTS.EXPLAIN_XVISOR:
      return withStage({
        ...state,
        customer: { ...state.customer, status: "สนใจ X-VISOR" },
      }, STAGES.CANDIDATE, event);
    case EVENTS.PREPARE_CANDIDATE: {
      state = spendTime(state, 1);
      const member = {
        id: "mint",
        name: "มิ้นท์",
        status: "X-VISOR ใหม่",
        active: true,
        xv: 0,
        customers: 0,
        confidence: 42,
      };
      return withStage({
        ...state,
        customer: null,
        team: [member],
        milestones: { ...state.milestones, firstG1: true },
      }, STAGES.FIRST_G1, event);
    }
    case EVENTS.START_MEMBER:
      return withStage(state, STAGES.WEEKLY_INVITE, event);
    case EVENTS.START_WEEKLY:
      state = spendTime(state, 2);
      return withStage(state, STAGES.WEEKLY_RUNNING, event);
    case EVENTS.WEEKLY_COMPLETE:
      return withStage({
        ...state,
        team: state.team.map((member) => ({
          ...member,
          status: "พร้อมเริ่มคนแรก",
          confidence: 61,
        })),
        milestones: { ...state.milestones, firstWeekly: true },
      }, STAGES.WEEKLY_RESULT, event);
    case EVENTS.FINISH_SLICE:
      return withStage(state, STAGES.COMPLETE, event);
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
    return value;
  } catch {
    return null;
  }
}
