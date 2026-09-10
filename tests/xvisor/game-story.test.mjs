import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, STAGES, makeInitialState, reduceGame, getRoutineChoices, getActiveEncounter } from '../../xvisor/quest/game-data.js';
import { normalizeNpcIdentities } from '../../xvisor/quest/game-people.js';
import { getStageContent } from '../../xvisor/quest/game-copy.js';
import { getStoryBeat } from '../../xvisor/quest/game-story.js';
import { ENCOUNTER_COPY, getEncounterCopy } from '../../xvisor/quest/game-narrative-data.js';

const management = (month = 2, seed = 17) => {
  const base = makeInitialState({ seed });
  return { ...base, month, stage: STAGES.MANAGEMENT, rank: 'xvisor',
    phase: 'management', energy: 28, encounters: { ...base.encounters, seed } };
};

function tutorialRoutine() {
  let state = makeInitialState({ seed: 17 });
  state = { ...state, stage: STAGES.CERTIFIED, rank: 'xvisor', milestones: { ...state.milestones, certified: true } };
  for (const event of [EVENTS.START_MONTH_1, EVENTS.FIND_PERSON, EVENTS.TALK, EVENTS.REQUEST_CONSENT,
    EVENTS.START_CUSTOMER_BASELINE, EVENTS.CUSTOMER_BASELINE_COMPLETE, EVENTS.OPEN_ROUTINE_BUILDER]) {
    state = reduceGame(state, event);
  }
  return state;
}

test('opening introduces Teem and the path to caring for the first customer', () => {
  const state = makeInitialState({ seed: 17 });
  const content = getStageContent(state);
  const story = getStoryBeat(state, content);
  assert.match(content.title, /ดูแลคนแรก/);
  assert.match(content.reason, /X-VISOR.*24 เดือน/);
  assert.equal(story.speaker, 'ทีม');
  assert.equal(story.portrait, 'teem');
  assert.match(story.line, /ผมทีม/);
  assert.match(story.tip, /เริ่มจากดูแลตัวเอง/);
  assert.match(story.tip, /ไปพบคนแรกด้วยกัน/);
  assert.equal(content.actions.length, 1);
  assert.equal(content.actions[0].event, EVENTS.START_PATH);
  assert.notEqual(content.title, story.line);
});

test('Teem and Ako have stable roles and keep customer dialogue intact', () => {
  const state = management();
  for (const stage of [STAGES.PRE_DAY3_ABCD, STAGES.PRE_DAY14_REVIEW, STAGES.M1_REVIEW_SCAN]) {
    const story = getStoryBeat({ ...state, stage });
    assert.equal(story.speaker, 'เอโกะ');
    assert.equal(story.portrait, 'ako');
  }
  const customer = { id: 'p1', name: 'ฟ้า', quote: 'อยากเริ่มง่าย ๆ แต่วันทำงานยุ่งมาก' };
  const content = { speaker: customer.name, dialogue: `“${customer.quote}”`, scene: 'consultation' };
  const story = getStoryBeat({ ...state, stage: STAGES.M1_DISCOVERY, prospects: [customer], selectedPersonId: customer.id }, content);
  assert.equal(story.portrait, 'customer');
  assert.equal(story.speaker, customer.name);
  assert.equal(story.line, content.dialogue);
  assert.equal(story.tip, '');
});

test('actual stage copy exposes the same mentor identity and short fallback as its story beat', () => {
  const akoStages = [STAGES.PRE_DAY3_ABCD, STAGES.PRE_DAY14_SCALE, STAGES.PRE_DAY14_REVIEW, STAGES.PRE_DAY28_SCALE, STAGES.M1_REVIEW_SCAN];
  const teemStages = [STAGES.OPENING, STAGES.PRE_DAY0_BAND, STAGES.PRE_DAY0_SCALE, STAGES.PRE_DAY0_SCANNING,
    STAGES.PRE_DAY0_SUMMARY, STAGES.PRE_MONTAGE, STAGES.PRE_DAY14_SCANNING, STAGES.PRE_DAY28_SCANNING,
    STAGES.PRE_DAY28_REVIEW, STAGES.EXAM_TRANSIT, STAGES.EXAM_SUMMARY, STAGES.CERTIFICATION_CEREMONY,
    STAGES.CERTIFIED, STAGES.M1_EMPTY, STAGES.M1_BASELINE_INTRO, STAGES.M1_BASELINE_SCANNING,
    STAGES.M1_BASELINE, STAGES.M1_RECOMMENDATION, STAGES.M1_SALE_RECEIPT, STAGES.M1_REVIEW_SCANNING,
    STAGES.M1_CANDIDATE, STAGES.M1_WEEKLY_RUNNING, STAGES.M1_TEAM_STARTED, STAGES.MANAGEMENT,
    STAGES.CONTENT_RUNNING, STAGES.ADS_RUNNING, STAGES.XCADEMY_RUNNING, STAGES.OPEN_HOUSE_RUNNING,
    STAGES.CENTER_RUNNING, STAGES.GOOD_LUCK_RUNNING, STAGES.XIRCLE_RUNNING, STAGES.LIVE_RUNNING,
    STAGES.XLEAD_MILESTONE, STAGES.MONTH_CLOSED, STAGES.SEASON_REVIEW];
  for (const stage of [...akoStages, ...teemStages]) {
    const state = { ...management(3), stage };
    const content = getStageContent(state);
    const beat = getStoryBeat(state, content);
    const portrait = akoStages.includes(stage) ? 'ako' : 'teem';
    assert.equal(content.portrait, portrait, `${stage} fallback portrait`);
    assert.equal(content.speaker, portrait === 'ako' ? 'เอโกะ' : 'ทีม', `${stage} fallback speaker`);
    assert.equal(content.speaker, beat.speaker, `${stage} visible speaker`);
    assert.equal(content.portrait, beat.portrait, `${stage} visible portrait`);
    assert.equal(content.dialogue, beat.line, `${stage} short fallback`);
    assert.ok(content.dialogue.length > 0 && content.dialogue.length <= 180, `${stage} should stay brief`);
  }
});

test('actual practice and exam copy distinguishes Ako, customer and teacher without changing questions', () => {
  const initial = makeInitialState({ seed: 17 });
  for (const [stage, speaker, portrait] of [
    [STAGES.PRE_DAY7_PRACTICE, 'เอโกะ', 'ako'],
    [STAGES.PRE_DAY21_CARE, 'ลูกค้า', 'customer'],
  ]) {
    const state = { ...initial, stage };
    const content = getStageContent(state);
    assert.equal(content.speaker, speaker);
    assert.equal(content.portrait, portrait);
    assert.equal(getStoryBeat(state, content), null);
    assert.ok(content.quiz.choices.length > 1);
    assert.match(content.dialogue, /อย่างไร/);
  }
  let exam = reduceGame({ ...initial, stage: STAGES.PRE_DAY28_REVIEW }, EVENTS.GO_EXAM);
  exam = reduceGame(exam, EVENTS.EXAM_TRANSIT_COMPLETE);
  for (const stage of [STAGES.EXAM_ACTIVE, STAGES.EXAM_REPAIR]) {
    const state = { ...exam, stage, exam: { ...exam.exam, repairQueue: [exam.exam.questions[0]], repairIndex: 0 } };
    const content = getStageContent(state);
    assert.equal(content.speaker, 'ห้องสอบ Xcademy');
    assert.equal(content.portrait, 'teacher');
    assert.equal(content.quiz.exam, true);
    assert.equal(getStoryBeat(state, content), null);
  }
  const namedLikeMentor = { ...management(1), stage: STAGES.M1_DISCOVERY,
    prospects: [{ id: 'same-name', name: 'ทีม', need: 'เริ่มทีละอย่าง' }], selectedPersonId: 'same-name' };
  assert.equal(getStageContent(namedLikeMentor).portrait, 'customer', 'a customer name must not select a mentor portrait');
});

test('quiz questions remain primary and story lookup cannot reveal an answer or mutate content', () => {
  const content = { dialogue: 'คุณจะเริ่มคุยอย่างไร?', quiz: { selected: null, choices: [['a', 'ลองถาม']] } };
  const before = structuredClone(content);
  for (const stage of [STAGES.PRE_DAY7_PRACTICE, STAGES.PRE_DAY21_CARE, STAGES.EXAM_ACTIVE, STAGES.EXAM_REPAIR]) {
    assert.equal(getStoryBeat({ stage }, content), null);
  }
  assert.deepEqual(content, before);
});

test('Month 2 explains extra choices even if the team has already done work', () => {
  const state = management();
  state.monthStats.teamActions = 3;
  const story = getStoryBeat(state, getStageContent(state));
  assert.equal(story.key, 'month2-choices');
  assert.match(story.tip, /สามปุ่มคือคำแนะนำ/);
  assert.match(story.tip, /งานทั้งหมด.*ผู้คน/);
});

test('a fresh reorder teaches recurring income, while a loaded old receipt is not a fresh result', () => {
  const before = management(3);
  const after = { ...before, economy: { ...before.economy, lastTransaction: { id: '3-reorder-p1', kind: 'reorder', customerId: 'p1' } } };
  const story = getStoryBeat(after, {}, { previousState: before, event: EVENTS.REORDER_CUSTOMER });
  assert.equal(story.key, 'repeat:3-reorder-p1');
  assert.match(story.line, /ลูกค้าคนเดิม/);
  assert.doesNotMatch(story.line, /ครั้งแรก|แน่นอน|รับประกัน/);
  assert.equal(getStoryBeat(after).key, 'management:3');
  assert.equal(getStoryBeat(after, {}, { previousState: after, event: EVENTS.REORDER_CUSTOMER }).key, 'management:3');
  assert.equal(getStoryBeat(after, {}, { previousState: before, event: EVENTS.CARE_CUSTOMER }).key, 'management:3');
});

test('growth beats distinguish qualification, certification and a completed run', () => {
  const state = management(8);
  const qualified = { ...state, career: { ...state.career, xgenQualifiedSingleMonth: true, xgenExamPassed: false } };
  const ready = getStoryBeat(qualified);
  assert.equal(ready.key, 'xgen-ready');
  assert.match(ready.line, /สอบให้ผ่าน/);
  const certified = getStoryBeat({ ...qualified, career: { ...qualified.career, xgenExamPassed: true }, sceneReport: { kind: 'xgen-exam' } });
  assert.equal(certified.key, 'xgen-certified');
  assert.match(certified.tip, /5%/);
  const xlead = getStoryBeat({ ...state, stage: STAGES.XLEAD_MILESTONE });
  assert.match(xlead.tip, /20%.*ค่าตอบแทน/);
  assert.match(xlead.tip, /ไม่ใช่ 20% ของยอดขาย/);
  assert.equal(getStoryBeat({ ...state, month: 24, organizationMode: true }).key, 'year2:24');
  const finale = getStoryBeat({ ...state, month: 24, runComplete: true });
  assert.equal(finale.key, 'month24');
  assert.match(finale.tip, /แต่ละรอบเติบโตต่างกัน/);
});

test('Month 1 care-only route never invents a purchase or a teammate in its copy', () => {
  let state = reduceGame(tutorialRoutine(), EVENTS.CHOOSE_ROUTINE, { planId: 'control' });
  assert.equal(state.stage, STAGES.M1_ONBOARDING);
  assert.match(getStageContent(state).reason, /พฤติกรรมเดียว/);
  for (const event of [EVENTS.START_ONBOARDING, EVENTS.FOLLOW_UP_CUSTOMER, EVENTS.START_CUSTOMER_REVIEW,
    EVENTS.CUSTOMER_REVIEW_COMPLETE, EVENTS.SAVE_SUCCESS, EVENTS.CONTINUE_CARE]) {
    const content = getStageContent(state);
    assert.doesNotMatch(`${content.title} ${content.reason}`, /หลังซื้อ|ซื้อแล้ว|ร่วมทีมแล้ว/);
    state = reduceGame(state, event);
  }
  assert.equal(state.stage, STAGES.M1_TEAM_STARTED);
  assert.equal(state.team.length, 0);
  const content = getStageContent(state);
  const story = getStoryBeat(state, content);
  assert.doesNotMatch(content.title, /ร่วมทีม/);
  assert.doesNotMatch(story.line, /มีคนร่วมทางแล้ว/);
  assert.equal(state.economy.lastTransaction, null);
});

test('routine copy passes actual availability and costs through, preserving action IDs', () => {
  const state = tutorialRoutine();
  const content = getStageContent(state);
  const expected = getRoutineChoices(state);
  const before = JSON.stringify(state);
  assert.equal(content.routineEvent, EVENTS.CHOOSE_ROUTINE);
  assert.deepEqual(content.actions, []);
  assert.deepEqual(content.routineBuilder.choices.map(({ label, detail, ...choice }) => choice), expected);
  for (const choice of content.routineBuilder.choices) assert.ok(choice.label && choice.detail);
  getStoryBeat(state, content);
  assert.equal(JSON.stringify(state), before);
});

test('seeded story variants stay fixed through rerenders and RNG changes, and vary across runs', () => {
  const lines = new Set();
  for (let seed = 1; seed <= 20; seed += 1) {
    const state = { ...management(1, seed), stage: STAGES.OPENING };
    const before = JSON.stringify(state);
    const first = getStoryBeat(state);
    assert.deepEqual(getStoryBeat(state), first);
    assert.deepEqual(getStoryBeat({ ...state, rngSeed: 999, updatedAt: 123 }), first);
    assert.equal(JSON.stringify(state), before);
    lines.add(first.line);
  }
  assert.ok(lines.size > 1, 'different run seeds should have narrative variation');
});

test('monthly line banks do not repeat within their run and never move the finale before Month 24', () => {
  for (const teamActions of [0, 1]) {
    const lines = [];
    for (let month = 3; month <= 12; month += 1) {
      const state = management(month);
      state.monthStats.teamActions = teamActions;
      lines.push(getStoryBeat(state).line);
    }
    assert.equal(new Set(lines).size, lines.length);
  }
  const year2 = Array.from({ length: 12 }, (_, i) => getStoryBeat({ ...management(i + 13), organizationMode: true }));
  assert.equal(new Set(year2.map(beat => beat.line)).size, 12);
  for (const beat of year2) assert.doesNotMatch(beat.line, /ครบ 24 เดือน|รอบสุดท้าย|ใกล้ครบ/);
});

test('encounter copy exposes only engine-provided choices and correctly names the two narrators', () => {
  const keys = ['content-question', 'followup-reset', 'baseline-pattern', 'team-rehearsal', 'small-win', 'quiet-week', 'live-recap', 'consent-check'];
  assert.deepEqual(Object.keys(ENCOUNTER_COPY), keys);
  for (const key of keys) {
    const definition = ENCOUNTER_COPY[key];
    const active = { id: `run:4:${key}`, key, month: 4, choices: [...definition.choices.map(({ id }) => ({ id, effectKey: `engine:${id}` })), { id: 'skip', effectKey: 'skip' }] };
    const before = JSON.stringify(active);
    const copy = getEncounterCopy(active, management(4));
    assert.equal(copy.portrait, key === 'followup-reset' ? 'ako' : 'teem');
    assert.equal(copy.speaker, key === 'followup-reset' ? 'เอโกะ' : 'ทีม');
    assert.deepEqual(copy.choices.map(({ id }) => id), active.choices.map(({ id }) => id));
    assert.deepEqual(copy.choices.map(({ effectKey }) => effectKey), active.choices.map(({ effectKey }) => effectKey));
    assert.equal(copy.choices.at(-1).result, '');
    assert.match(copy.choices.at(-1).detail, /ไม่ใช้พลังงาน/);
    assert.equal(JSON.stringify(active), before);
    assert.deepEqual(getEncounterCopy(active, management(4)), copy);
  }
  assert.equal(getEncounterCopy({ key: 'future-event', choices: [] }, management()), null);
  const consent = getEncounterCopy({ key: 'consent-check', choices: [{ id: 'listen' }] }, management());
  assert.match(consent.choices[0].detail, /ยังไม่ถือว่าอนุญาต/);
});

test('an engine encounter always offers a skip action and explains whose story it is', () => {
  const state = management(4);
  state.customers = [{ id: 'c1', name: 'ฟ้า', trust: 20, adherence: 30, day: 0 }];
  state.encounters.pending = { id: '17:4:followup-reset', key: 'followup-reset', month: 4, targetId: 'c1', targetKind: 'customer' };
  const active = getActiveEncounter(state);
  assert.ok(active);
  const copy = getEncounterCopy(active, state);
  assert.deepEqual(copy.choices.map(item => item.id), ['simplify', 'check-in', 'skip']);
  assert.match(copy.line, /ฟ้า/);
  const after = reduceGame(state, EVENTS.RESOLVE_ENCOUNTER, { encounterId: active.id, choiceId: 'skip' });
  assert.equal(after.encounters.pending, null);
  assert.equal(after.energy, state.energy);
  assert.deepEqual(after.customers, normalizeNpcIdentities(state).customers);
});

test('resolved encounters show the chosen result with its original narrator only after application', () => {
  const before = management(4);
  before.customers = [{ id: 'c1', name: 'ฟ้า', trust: 20, adherence: 30, day: 0 }];
  before.encounters.pending = { id: '17:4:followup-reset', key: 'followup-reset', month: 4, targetId: 'c1', targetKind: 'customer' };
  before.encounters.resolved = [];
  const payload = { encounterId: before.encounters.pending.id, choiceId: 'check-in' };
  const after = reduceGame(before, EVENTS.RESOLVE_ENCOUNTER, payload);
  assert.equal(after.customers[0].trust, 24);
  const context = { previousState: before, event: EVENTS.RESOLVE_ENCOUNTER, payload };
  const beat = getStoryBeat(after, {}, context);
  assert.equal(beat.key, 'encounter-result:17:4:followup-reset');
  assert.equal(beat.speaker, 'เอโกะ');
  assert.equal(beat.portrait, 'ako');
  assert.match(beat.line, /อยากให้ช่วยตรงไหน/);
  assert.match(beat.tip, /ความไว้ใจ/);
  assert.doesNotMatch(getStoryBeat(before, {}, context).key, /^encounter-result:/);
  assert.doesNotMatch(getStoryBeat(after).key, /^encounter-result:/);
  assert.doesNotMatch(getStoryBeat(after, {}, { ...context, payload: { ...payload, choiceId: 'simplify' } }).key, /^encounter-result:/);
});

test('Live has a playable scene and its result reports only recorded outcomes, not a stale report', () => {
  const before = { ...management(6), stage: STAGES.LIVE_RUNNING };
  const content = getStageContent(before);
  assert.equal(content.scene, 'live-studio');
  assert.equal(content.status, 'live');
  assert.deepEqual(content.actions, []);
  assert.equal(getStoryBeat(before, content).key, 'live-running');
  const report = { id: 'live-17-6', month: 6, attempted: 3, sales: 1, declinedIds: ['p2', 'p3'] };
  const after = { ...before, stage: STAGES.MANAGEMENT, liveReport: report, sceneReport: { kind: 'live', ...report } };
  const context = { previousState: before, event: EVENTS.SCENE_COMPLETE };
  const result = getStoryBeat(after, {}, context);
  assert.equal(result.key, 'live-result:live-17-6');
  assert.match(result.line, /3 คน.*1 คน.*2 คนขอเวลา/);
  assert.match(result.tip, /ดูแลต่อจากวันแรก/);
  assert.equal(getStoryBeat(after).key, result.key);
  assert.doesNotMatch(getStoryBeat(after, {}, { previousState: after, event: EVENTS.TRAIN_SKILL }).key, /^live-result:/);
  assert.doesNotMatch(getStoryBeat({ ...after, month: 7 }).key, /^live-result:/);
  const noSales = getStoryBeat({ ...after, liveReport: { ...report, sales: 0, declinedIds: ['p1', 'p2', 'p3'] } }, {}, context);
  assert.match(noSales.line, /0 คนเลือกเริ่ม/);
  assert.match(noSales.tip, /ยังไม่มียอดขาย/);
  assert.doesNotMatch(getStoryBeat({ ...after, liveReport: { id: 'unknown', month: 6 } }).key, /^live-result:/);
});
