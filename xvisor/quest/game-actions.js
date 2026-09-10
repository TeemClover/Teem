import { EVENTS, CUSTOMER_STATES, XIRCLE_MONTHS, getFastTrackChance, getLiveReadiness, getRenewalFollowupEligibility, isPersonalRenewalCustomer, reorderedThisMonth, resolveRenewalPerson } from "./game-engine.js";
import { SKILL_IDS, getPlayerLevelFromSkills, getSkillLevel } from "./game-progression.js";

/** Adapt recommendations to the same payload used by the work menu. */
export function normalizeAction(item) {
  return { ...item, ...item.payload, id: item.id ?? item.payload?.id ?? item.targetId };
}

/** Check the same prerequisites as the reducer before offering an action. */
export function isActionAvailable(state, item) {
  const action = normalizeAction(item);
  if (!action.event || Number(action.cost || 0) > Number(state.energy || 0)) return false;
  const prospect = state.prospects?.find(person => person.id === action.id);
  const customer = state.customers?.find(person => person.id === action.id);
  const team = state.team?.find(person => person.id === action.id);
  const renewalPerson = [EVENTS.CARE_CUSTOMER, EVENTS.REORDER_CUSTOMER].includes(action.event) ? resolveRenewalPerson(state, action.id) : customer;
  const currentRenewal = renewalPerson && Number(renewalPerson.renewalMonth) === Number(state.month)
    && ["automatic", "pending", "paused"].includes(renewalPerson.renewalStatus);
  switch (action.event) {
    case EVENTS.CONTACT_PROSPECT: return prospect?.journey === "new";
    case EVENTS.MEET_PROSPECT: return prospect?.journey === "scheduled";
    case EVENTS.CONSULT_PROSPECT: return prospect?.journey === "conversation";
    case EVENTS.BASELINE_PROSPECT: return prospect?.journey === "discovery";
    case EVENTS.OPEN_MANAGEMENT_ROUTINE: return prospect?.journey === "baseline";
    case EVENTS.OFFER_PROSPECT: return prospect?.journey === "recommendation" || prospect?.journey === "baseline" && Boolean(prospect.routinePlan);
    case EVENTS.FOLLOW_UP_DECISION:
      return prospect?.journey === "waiting" && Number(prospect.nextOfferMonth || 0) <= state.month && Number(prospect.decisionAttempts || 0) < 2;
    case EVENTS.CARE_CUSTOMER:
      if (currentRenewal) return getRenewalFollowupEligibility(state, renewalPerson).available;
      return Boolean(customer && !customer.selfDirected && ![CUSTOMER_STATES.SELF_DIRECTED, CUSTOMER_STATES.AUTO_REORDER].includes(customer.customerState) && customer.day < 28);
    case EVENTS.REMEASURE_CUSTOMER: return Boolean(customer && customer.day >= 14 && !customer.measuredAgain);
    case EVENTS.REORDER_CUSTOMER:
      if (currentRenewal) return getRenewalFollowupEligibility(state, renewalPerson).available;
      return Boolean(isPersonalRenewalCustomer(state, renewalPerson) && !reorderedThisMonth(state, renewalPerson) && renewalPerson.day >= 28 && renewalPerson.customerState === CUSTOMER_STATES.READY_TO_BUY && renewalPerson.measuredAgain && renewalPerson.trust >= 58 && renewalPerson.result !== "หลุด" && renewalPerson.followups >= (getSkillLevel(state.skills, "care") >= 4 ? 1 : 2));
    case EVENTS.ASK_REFERRAL: return Boolean(customer?.referralReady && !customer.referralAsked);
    case EVENTS.INVITE_XVISOR: return Boolean(customer?.xvisorInterest && !customer.xvisorStage);
    case EVENTS.START_CANDIDATE_XCADEMY: return customer?.xvisorStage === "ready";
    case EVENTS.REVIEW_CANDIDATE: return customer?.xvisorStage === "xcademy";
    case EVENTS.CERTIFY_CANDIDATE:
      return customer?.xvisorStage === "case" && customer.candidateProgress >= 2 && (customer.candidateStartedMonth !== state.month || getSkillLevel(state.skills, "leadership") >= 6 || state.monthStats?.xcademySessions > 0);
    case EVENTS.MENTOR_TEAM_MEMBER: return Boolean(team?.active);
    case EVENTS.TRAIN_SKILL: return SKILL_IDS.includes(action.skill) && getSkillLevel(state.skills, action.skill) < 10;
    case EVENTS.CREATE_LEAD: {
      const source = action.source || "known";
      const level = getPlayerLevelFromSkills(state.skills);
      return ["known", "relationship"].includes(source) || (["content", "creator"].includes(source) && level >= 2) || (source === "ads" && level >= 4);
    }
    case EVENTS.RUN_XCADEMY:
    case EVENTS.RUN_CENTER:
    case EVENTS.RUN_WEEKLY: return Number(state.monthStats?.xcademySessions || 0) < 4;
    case EVENTS.RUN_OPEN_HOUSE:
    case EVENTS.RUN_GOOD_LUCK:
    case EVENTS.RUN_MONTHLY_EVENT: return !state.monthStats?.openHouseDone && !state.monthStats?.goodLuckDone && !state.monthStats?.eventDone;
    case EVENTS.RUN_XIRCLE: return XIRCLE_MONTHS.includes(Number(state.month)) && !state.monthStats?.xircleDone;
    case EVENTS.RUN_LIVE: return getLiveReadiness(state).available;
    case EVENTS.FAST_TRACK_FULL_START: return Boolean(prospect && getFastTrackChance(state, prospect) > 0);
    default: return true;
  }
}
