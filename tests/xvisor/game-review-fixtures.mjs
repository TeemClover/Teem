/** QA ONLY: illustrative saved states, never production forecasts or player saves.
 * Imported only by the isolated preview and browser regression harness.
 */
import {
  EVENTS, STAGES, CUSTOMER_STATES, V1_SCORE_VERSION, canDispatch,
  makeInitialState, makeMonthStats, reduceGame, refreshMissions,
} from '../../xvisor/quest/game-data.js';

const QA_TIME = Date.UTC(2026, 8, 1, 12);
const NAMES = ['เมย์', 'ต้น', 'ภัทร', 'แพรว', 'ฟ้า', 'บีม', 'นนท์', 'ดาว'];
const SKILLS = { knowledge: { xp: 33 }, people: { xp: 33 }, care: { xp: 33 }, leadership: { xp: 33 } };
// The existing renderer's palette hash selects its long-hair silhouette (1).
const LONG_HAIR_APPEARANCE = { skin: '#e9ba91', hair: '#433d3d', shirt: '#ef8078', accent: '#fff2d4', hairStyle: 'long' };

function qaCopy(state, scenario) {
  return JSON.parse(JSON.stringify({
    ...state,
    qaFixture: { scenario, kind: 'QA_ONLY', seed: 17, note: 'ข้อมูลตัวอย่างสำหรับตรวจหน้าจอ ไม่ใช่ผลคาดการณ์หรือคะแนนผู้เล่นจริง' },
  }, (key, value) => ['updatedAt', 'createdAt', 'completedAt', 'startedAt'].includes(key) && typeof value === 'number' ? QA_TIME : value));
}

function sampleTeam(month) {
  return Array.from({ length: Math.min(8, month) }, (_, index) => {
    const reorders = Math.max(1, month * 4 - 2 - index % 3);
    const newStarts = Math.max(1, Math.floor(month / 2) - 1) + index % 2;
    const personalXV = (reorders + 1) * 7000 + newStarts * 9495;
    const personalSalesBaht = (reorders + 1) * 7490 + newStarts * 12480;
    return {
      id: `qa-team-${index}`, personId: `qa-team-${index}`, name: NAMES[index], parentId: 'player',
      active: true, rank: month >= 7 && index % 3 === 0 ? 'xlead' : 'xvisor',
      autonomy: 68 + index * 2, confidence: 78 + index, activity: 8, teamSkill: 5,
      specialty: ['care', 'sales', 'builder', 'balanced'][index % 4],
      customers: reorders + newStarts, candidatePipeline: 2 + index % 3, downstreamXvisors: index % 3,
      personalXV, personalSalesBaht, growthMomentum: 0.03, centerVisits: 4, xcademyVisits: 4,
      monthlyOutput: { actions: 8, selfUse: 1, customers: newStarts, newStarts, reorders, personalXV, personalSalesBaht },
      status: 'QA · ตัวอย่างทีมที่ดูแลลูกค้าและทบทวนเคสต่อเนื่อง',
      appearance: { skin: index % 2 ? '#d49a74' : '#e9ba91', hair: index % 2 ? '#433d3d' : '#2c4948', shirt: ['#7bb5a0', '#c98170', '#719db3', '#cda968'][index % 4], accent: '#edd7a7' },
    };
  });
}

function sampleMonth(previous, month) {
  const team = sampleTeam(month);
  const customers = Array.from({ length: month * 2 }, (_, index) => ({
    id: `qa-customer-${index}`, personId: `qa-customer-${index}`, name: `${NAMES[index % 8]} ${Math.floor(index / 8) + 1}`,
    activePlan: true, selfDirected: index < month * 2 - 3, successCase: index < month * 2 - 3,
    customerState: index < month * 2 - 3 ? CUSTOMER_STATES.SELF_DIRECTED : CUSTOMER_STATES.NEEDS_HELP,
    day: index < month * 2 - 3 ? 28 : 7, satisfaction: 80, trust: 76, adherence: 80,
    followups: 2, measuredAgain: true, result: 'ดีขึ้น', referralAsked: true, referralReady: true,
    status: 'QA · ลูกค้าตัวอย่าง', source: 'known', lastReorderMonth: month,
  }));
  const reorders = Math.max(0, customers.length - 3);
  const newSales = Math.min(3, customers.length);
  const personalXV = reorders * 7000 + newSales * 9495;
  const personalSalesBaht = reorders * 7490 + newSales * 12480;
  const xlead = month >= 4;
  return refreshMissions({
    ...previous, month, stage: STAGES.MANAGEMENT, phase: 'management', energy: 28,
    rank: previous.career?.xgenExamPassed ? 'xgen' : xlead ? 'xlead' : 'xvisor',
    campaignComplete: false, campaignFinalePending: false, campaignScore: null,
    customers, prospects: [], team, skills: structuredClone(SKILLS), selectedPersonId: null,
    organization: { ...previous.organization, xleads: team.filter(member => member.rank === "xlead").map(member => member.id) },
    monthStats: { ...makeMonthStats(), sales: newSales, newCustomers: newSales, reorders,
      reorderedCustomerIds: customers.slice(0, reorders).map(customer => customer.personId), reorderTrackingComplete: true,
      teamActions: team.length * 8, xcademySessions: 4, openHouseDone: true },
    milestones: { ...previous.milestones, certified: true, firstG1: true },
    career: { ...previous.career, xleadQualified: xlead, xleadCertified: xlead, totalSuccessCases: reorders },
    economy: { ...previous.economy, personalXV, productSales: personalSalesBaht,
      teamXV: team.reduce((sum, member) => sum + member.personalXV, 0),
      teamProductSales: team.reduce((sum, member) => sum + member.personalSalesBaht, 0), lastTransaction: null },
    sceneReport: null, lastMessage: 'QA · ข้อมูลตัวอย่างเพื่อทดสอบกราฟและหน้าจอ ไม่ใช่ผลคาดการณ์รายได้',
  });
}

function tutorialMonth2(first) {
  let state = { ...first, stage: STAGES.CERTIFIED, rank: 'xvisor', milestones: { ...first.milestones, certified: true } };
  const events = [EVENTS.START_MONTH_1, EVENTS.FIND_PERSON, EVENTS.TALK, EVENTS.REQUEST_CONSENT,
    EVENTS.START_CUSTOMER_BASELINE, EVENTS.CUSTOMER_BASELINE_COMPLETE, EVENTS.OPEN_ROUTINE_BUILDER,
    EVENTS.CHOOSE_ROUTINE, EVENTS.MAKE_OFFER, EVENTS.CLOSE_RECEIPT, EVENTS.START_ONBOARDING,
    EVENTS.FOLLOW_UP_CUSTOMER, EVENTS.START_CUSTOMER_REVIEW, EVENTS.CUSTOMER_REVIEW_COMPLETE,
    EVENTS.SAVE_SUCCESS, EVENTS.CONTINUE_CARE, EVENTS.END_MONTH, EVENTS.START_NEXT_MONTH];
  for (const event of events) state = reduceGame(state, event, event === EVENTS.CHOOSE_ROUTINE ? { planId: 'fit' } : {});
  const id = state.customers[0].id;
  state = reduceGame(reduceGame(state, EVENTS.RUN_XCADEMY), EVENTS.SCENE_COMPLETE);
  // Select a deterministic accepted-invitation branch for this QA scene; each
  // candidate branch performs one real invitation, rather than repeated spam.
  for (let seed = 1; seed <= 32; seed += 1) {
    const branch = reduceGame({ ...state, rngSeed: seed }, EVENTS.INVITE_XVISOR, { id });
    if (branch.customers[0].xvisorStage === 'ready') { state = branch; break; }
  }
  for (const event of [EVENTS.START_CANDIDATE_XCADEMY, EVENTS.REVIEW_CANDIDATE, EVENTS.CERTIFY_CANDIDATE, EVENTS.SCENE_COMPLETE]) {
    state = reduceGame(state, event, { id });
  }
  return state;
}

function showDestination(state, destination) {
  const activeTravel = { ...state.activeTravel, destination, title: `QA · Recognition Trip · ${destination}` };
  return { ...state, activeTravel,
    organization: { ...state.organization, trips: state.organization.trips.map(trip => Number(trip.month) === Number(state.month) ? activeTravel : trip) },
    sceneReport: { ...state.sceneReport, trip: activeTravel },
  };
}

function longHairedProspect(state) {
  const id = state.selectedPersonId || state.prospects[0]?.id;
  return {
    ...state,
    selectedPersonId: id,
    prospects: state.prospects.map(person => person.id === id ? {
      ...person, name: 'เมย์', appearance: { ...LONG_HAIR_APPEARANCE },
      quote: 'อยากเริ่มจากกิจวัตรเล็ก ๆ ที่ทำได้ต่อเนื่อง',
    } : person),
  };
}

function seatingScenes(first, month2Empty, management, exam) {
  let routine = longHairedProspect(reduceGame(month2Empty, EVENTS.CREATE_LEAD, { source: 'known' }));
  const id = routine.selectedPersonId;
  for (const event of [EVENTS.CONTACT_PROSPECT, EVENTS.MEET_PROSPECT, EVENTS.BASELINE_PROSPECT, EVENTS.OPEN_MANAGEMENT_ROUTINE]) {
    routine = reduceGame(routine, event, { id });
  }
  let consultation = { ...first, stage: STAGES.CERTIFIED, rank: 'xvisor', milestones: { ...first.milestones, certified: true } };
  for (const event of [EVENTS.START_MONTH_1, EVENTS.FIND_PERSON]) consultation = reduceGame(consultation, event);
  consultation = reduceGame(longHairedProspect(consultation), EVENTS.TALK);
  const classroomBase = { ...management, team: management.team.map((member, index) => index === 0 ? { ...member, appearance: { ...LONG_HAIR_APPEARANCE } } : member) };
  const classroomRunning = reduceGame(classroomBase, EVENTS.RUN_XCADEMY);
  return { seatedRoutine: routine, consultation, seatedConsultation: consultation, classroom: exam, seatedClassroom: exam, classroomRunning };
}

export function makeReviewFixtures() {
  const first = { ...makeInitialState({ seed: 17 }), runId: 'qa-review-1-1-seed17', updatedAt: QA_TIME };
  const month2Empty = { ...first, month: 2, phase: 'management', stage: STAGES.MANAGEMENT, rank: 'xvisor', energy: 28, milestones: { ...first.milestones, certified: true } };
  const month2 = tutorialMonth2(first);
  const band = reduceGame(first, EVENTS.START_PATH);
  const bandWorn = reduceGame(band, EVENTS.WEAR_BAND);
  const exam = reduceGame(reduceGame({ ...first, stage: STAGES.PRE_DAY28_REVIEW }, EVENTS.GO_EXAM), EVENTS.EXAM_TRANSIT_COMPLETE);
  let campaign = first;
  let management;
  for (let month = 1; month <= 12; month += 1) {
    campaign = sampleMonth(campaign, month);
    if (month === 8) management = { ...campaign, skills: { ...campaign.skills, knowledge: { xp: 1 } }, monthStats: { ...campaign.monthStats, xcademySessions: 1, openHouseDone: false } };
    if (canDispatch(campaign, EVENTS.XGEN_EXAM)) campaign = reduceGame(campaign, EVENTS.XGEN_EXAM);
    campaign = reduceGame(campaign, EVENTS.END_MONTH);
  }
  // Score values come from the 12 posted QA settlements, not independent totals.
  campaign.campaignScore = { ...campaign.campaignScore, scoreVersion: V1_SCORE_VERSION, runId: first.runId };
  let current = reduceGame(campaign, EVENTS.ENTER_ORGANIZATION);
  let year2, tokyo, dubai;
  while (!current.runComplete) {
    if (current.month === 16) tokyo = showDestination(current, 'Tokyo');
    if (current.month === 17) year2 = current;
    if (current.month === 22) dubai = showDestination(current, 'Dubai');
    current = reduceGame(current, EVENTS.END_MONTH);
  }
  const campReady = { ...month2, month: 3, energy: 28, monthStats: makeMonthStats(), sceneReport: null };
  const campRunning = reduceGame(campReady, EVENTS.RUN_XIRCLE);
  const camp = reduceGame(campRunning, EVENTS.SCENE_COMPLETE);
  const monthClosed = reduceGame(management, EVENTS.END_MONTH);
  const fixtures = { monthClosed, opening: first, band, bandWorn, month2Empty, month2, management, exam, campReady, campRunning, camp, year2, tokyo, dubai, score: campaign, finale: current, ...seatingScenes(first, month2Empty, management, exam) };
  return Object.fromEntries(Object.entries(fixtures).map(([scenario, state]) => [scenario, qaCopy(state, scenario)]));
}
