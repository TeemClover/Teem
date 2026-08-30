import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENTS,
  ROUTINEX,
  STAGES,
  calculateEconomy,
  getRetailTier,
  makeInitialState,
  parseSavedState,
  reduceGame,
  serializeState,
} from "./game-data.js";

function move(state, event, payload) {
  return reduceGame(state, event, payload);
}

function reachCertification() {
  let state = makeInitialState();
  [
    EVENTS.START_PATH,
    EVENTS.START_SELF,
    EVENTS.GO_SELF_MEASURE,
    EVENTS.START_SELF_SCAN,
    EVENTS.SELF_SCAN_COMPLETE,
    EVENTS.CHOOSE_NEXT_ACTION,
    EVENTS.START_EXPERIENCE,
    EVENTS.EXPERIENCE_COMPLETE,
    EVENTS.OPEN_ACADEMY,
    EVENTS.START_CERTIFICATION,
  ].forEach((event) => { state = move(state, event); });
  return state;
}

test("retail tiers use the canonical monthly XV thresholds", () => {
  assert.equal(getRetailTier(0).rate, 0.2);
  assert.equal(getRetailTier(39999).label, "20%");
  assert.equal(getRetailTier(40000).label, "23%");
  assert.equal(getRetailTier(99999).label, "23%");
  assert.equal(getRetailTier(100000).label, "25%");
});

test("certification cannot be passed by choosing the sales-first answer", () => {
  let state = reachCertification();
  state = move(state, EVENTS.ANSWER_CERTIFICATION, { answer: "sell_more" });
  assert.equal(state.stage, STAGES.CERTIFICATION);
  assert.equal(state.certificationMistakes, 1);

  state = move(state, EVENTS.ANSWER_CERTIFICATION, { answer: "next_action" });
  assert.equal(state.stage, STAGES.CERTIFIED);
  assert.equal(state.rank, "xvisor");
  assert.equal(state.milestones.certified, true);
});

test("a first sale keeps product sales, XV and projected income separate", () => {
  let state = reachCertification();
  state = move(state, EVENTS.ANSWER_CERTIFICATION, { answer: "next_action" });
  state = move(state, EVENTS.START_MONTH);
  state = move(state, EVENTS.FIND_PERSON);
  state = move(state, EVENTS.TALK);
  state = move(state, EVENTS.INVITE_MEASUREMENT);
  state = move(state, EVENTS.START_MEASUREMENT);
  state = move(state, EVENTS.MEASUREMENT_COMPLETE);
  state = move(state, EVENTS.DISCUSS_PLAN);
  state = move(state, EVENTS.SELL);

  const economy = calculateEconomy(state);
  assert.equal(economy.productSales, ROUTINEX.price);
  assert.equal(economy.personalXV, ROUTINEX.xv);
  assert.equal(economy.tier.label, "20%");
  assert.equal(economy.activeRetail, 1400);
  assert.equal(economy.projectedIncome, 1400);
});

test("the complete vertical slice has no dead end and never overspends time", () => {
  let state = reachCertification();
  const path = [
    [EVENTS.ANSWER_CERTIFICATION, { answer: "next_action" }],
    [EVENTS.START_MONTH],
    [EVENTS.FIND_PERSON],
    [EVENTS.TALK],
    [EVENTS.TALK_MORE],
    [EVENTS.INVITE_MEASUREMENT],
    [EVENTS.START_MEASUREMENT],
    [EVENTS.MEASUREMENT_COMPLETE],
    [EVENTS.DISCUSS_PLAN],
    [EVENTS.SELL],
    [EVENTS.CLOSE_RECEIPT],
    [EVENTS.START_CARE],
    [EVENTS.FOLLOW_UP],
    [EVENTS.SET_NEXT_ACTION],
    [EVENTS.START_REMEASUREMENT],
    [EVENTS.REMEASUREMENT_COMPLETE],
    [EVENTS.SAVE_SUCCESS],
    [EVENTS.CONTINUE_CARE],
    [EVENTS.EXPLAIN_XVISOR],
    [EVENTS.PREPARE_CANDIDATE],
    [EVENTS.START_MEMBER],
    [EVENTS.START_WEEKLY],
    [EVENTS.WEEKLY_COMPLETE],
    [EVENTS.FINISH_SLICE],
  ];

  path.forEach(([event, payload]) => {
    const before = state.stage;
    state = move(state, event, payload);
    assert.notEqual(state.stage, before, `${event} should advance the state`);
    if (state.timeLeft != null) assert.ok(state.timeLeft >= 0);
  });

  assert.equal(state.stage, STAGES.COMPLETE);
  assert.equal(state.timeLeft, 0);
  assert.equal(state.team.length, 1);
  assert.equal(state.milestones.firstWeekly, true);
});

test("saved games reject incompatible versions", () => {
  const state = makeInitialState();
  assert.deepEqual(parseSavedState(serializeState(state)).stage, STAGES.OPENING);
  assert.equal(parseSavedState(JSON.stringify({ ...state, version: 99 })), null);
  assert.equal(parseSavedState("not-json"), null);
});
