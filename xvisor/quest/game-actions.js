import { EVENTS, CUSTOMER_STATES } from "./game-engine.js";
import { getSkillLevel } from "./game-progression.js";

/** Adapt recommendations to the same payload used by the work menu. */
export function normalizeAction(item) {
  return { ...item, ...item.payload, id: item.id ?? item.payload?.id ?? item.targetId };
}

/** Hide stale recommendations without changing their ranking or simulation rules. */
export function isActionAvailable(state, item) {
  const action = normalizeAction(item);
  const prospect = state.prospects?.find(person => person.id === action.id);
  const customer = state.customers?.find(person => person.id === action.id);
  const team = state.team?.find(person => person.id === action.id);
  switch (action.event) {
    case EVENTS.CONTACT_PROSPECT: return prospect?.journey === "new";
    case EVENTS.MEET_PROSPECT: return prospect?.journey === "scheduled";
    case EVENTS.CONSULT_PROSPECT: return Boolean(prospect);
    case EVENTS.BASELINE_PROSPECT: return prospect?.journey === "discovery";
    case EVENTS.OPEN_MANAGEMENT_ROUTINE: return prospect?.journey === "baseline";
    case EVENTS.OFFER_PROSPECT: return prospect?.journey === "recommendation" && Boolean(prospect.routinePlan);
    case EVENTS.FOLLOW_UP_DECISION:
      return prospect?.journey === "waiting" && Number(prospect.nextOfferMonth || 0) <= state.month && Number(prospect.decisionAttempts || 0) < 2;
    case EVENTS.CARE_CUSTOMER: return Boolean(customer);
    case EVENTS.REMEASURE_CUSTOMER: return Boolean(customer && customer.day >= 14 && !customer.measuredAgain);
    case EVENTS.REORDER_CUSTOMER:
      return Boolean(customer && customer.day >= 28 && customer.customerState === CUSTOMER_STATES.READY_TO_BUY && customer.measuredAgain && customer.trust >= 58 && customer.result !== "หลุด" && customer.followups >= (getSkillLevel(state.skills, "care") >= 4 ? 1 : 2));
    case EVENTS.ASK_REFERRAL: return Boolean(customer?.referralReady && !customer.referralAsked);
    case EVENTS.INVITE_XVISOR: return Boolean(customer?.xvisorInterest && !customer.xvisorStage);
    case EVENTS.START_CANDIDATE_XCADEMY: return customer?.xvisorStage === "ready";
    case EVENTS.REVIEW_CANDIDATE: return customer?.xvisorStage === "xcademy";
    case EVENTS.CERTIFY_CANDIDATE:
      return customer?.xvisorStage === "case" && customer.candidateProgress >= 2 && (customer.candidateStartedMonth !== state.month || getSkillLevel(state.skills, "leadership") >= 6 || state.monthStats?.xcademySessions > 0);
    case EVENTS.MENTOR_TEAM_MEMBER: return Boolean(team?.active);
    case EVENTS.TRAIN_SKILL: return Boolean(action.skill && getSkillLevel(state.skills, action.skill) < 10);
    default: return true;
  }
}
