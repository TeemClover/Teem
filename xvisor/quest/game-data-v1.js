export * from './game-data-v9.js?v=1.0-core';
import * as v9 from './game-data-v9.js?v=1.0-core';
import { addSkillXp, getSkillLevel, simulateTeamCycle } from './game-progression-v8.js?v=1.0-core';

export const GAME_VERSION = 'X-VISOR QUEST 1.0';
export const RELEASE_VERSION = '1.0';
export const V1_SAVE_VERSION = '1.0';
export const V1_SCORE_VERSION = '1.0';
export const ORGANIZATION_START_MONTH = 13;
export const ORGANIZATION_END_MONTH = 24;
export const ORGANIZATION_XIRCLE_MONTHS = Object.freeze([15, 18, 21, 24]);

export const EVENTS = Object.freeze({
  ...v9.EVENTS,
  FAST_TRACK_FULL_START: 'FAST_TRACK_FULL_START',
});

const FULL_START_XV = 9_495;
const FULL_START_BAHT = 12_480;
const ROUTINEX_XV = 7_000;

function clamp(value, min, max) {
  const number = Number(value || 0);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}

function releaseState(state) {
  return {
    ...state,
    gameVersion: GAME_VERSION,
    releaseVersion: RELEASE_VERSION,
    v1SaveVersion: V1_SAVE_VERSION,
    scoreVersion: state?.campaignScore?.scoreVersion || V1_SCORE_VERSION,
  };
}

function uniqueTeamCount(state) {
  return (state.team || []).filter((member) => member.active !== false).length;
}

function xleadCount(state) {
  return (state.team || []).filter((member) => member.active !== false && member.rank === 'xlead').length;
}

function activePersonalCustomers(state) {
  return (state.customers || []).filter((customer) => customer.activePlan !== false).length;
}

function activeOrganizationCustomers(state) {
  const teamCustomers = (state.team || []).filter((member) => member.active !== false)
    .reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  return activePersonalCustomers(state) + teamCustomers;
}

function deterministicRoll(state, id, salt = 0) {
  let hash = (Number(state.rngSeed || 1) + Number(state.month || 0) * 131 + salt * 977) >>> 0;
  for (const char of String(id || 'x')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return (hash % 10000) / 10000;
}

function fastTrackEligible(state, person) {
  if (!person || state.organizationMode || state.runComplete) return false;
  if (person.journey !== 'recommendation' || !person.routinePlan) return false;
  return getSkillLevel(state.skills, 'people') >= 7 && getSkillLevel(state.skills, 'knowledge') >= 6;
}

export function getFastTrackChance(state, person) {
  if (!fastTrackEligible(state, person)) return 0;
  const people = getSkillLevel(state.skills, 'people');
  const knowledge = getSkillLevel(state.skills, 'knowledge');
  const normal = Math.min(0.97, 0.25 + Math.max(0, Math.min(9, people - 1)) * 0.08);
  const fitBonus = person.routinePlan?.quality === 'fit' ? 0.08 : 0;
  const knowledgeEdge = Math.max(0, knowledge - 6) * 0.01;
  return clamp(normal - 0.20 + fitBonus + knowledgeEdge, 0.15, 0.82);
}

function runFastTrack(state, payload = {}) {
  const person = (state.prospects || []).find((item) => item.id === payload.id);
  if (!fastTrackEligible(state, person) || Number(state.energy || 0) < 1) return state;

  const chance = getFastTrackChance(state, person);
  const attempt = Number(person.decisionAttempts || 0);
  const protectedChance = attempt >= 2 ? 1 : attempt === 1 ? Math.min(0.97, chance + 0.15) : chance;
  const success = deterministicRoll(state, person.id, attempt + 71) < protectedChance;
  const spent = { ...state, energy: Math.max(0, Number(state.energy || 0) - 1) };

  if (!success) {
    const prospects = spent.prospects.map((item) => item.id !== person.id ? item : {
      ...item,
      decisionAttempts: attempt + 1,
      journey: 'waiting',
      nextOfferMonth: Number(state.month || 0) + 1,
      status: `Full Start ยังไม่ใช่จังหวะ · รอเดือน ${Number(state.month || 0) + 1}`,
      lastContactMonth: state.month,
    });
    return releaseState(v9.refreshMissions({
      ...spent,
      prospects,
      lastEvent: `${EVENTS.FAST_TRACK_FULL_START}_NO`,
      lastMessage: `${person.name} ยังไม่พร้อม Full Start · ทางลัดเสี่ยงกว่า แต่ความสัมพันธ์ยังอยู่`,
      updatedAt: Date.now(),
    }));
  }

  const customer = {
    ...person,
    id: `customer-${person.id}`,
    personId: person.personId || person.id,
    journey: 'day28',
    status: '⚡ Full Start · พร้อมเข้า Xcademy',
    activePlan: true,
    customerState: v9.CUSTOMER_STATES.READY_XVISOR,
    day: 28,
    followups: Math.max(1, Number(person.followups || 0)),
    adherence: Math.max(82, Number(person.adherence || 0)),
    satisfaction: Math.max(84, Number(person.satisfaction || 0)),
    result: 'เห็นผลและพร้อมเรียนรู้ต่อ',
    successCase: true,
    referralReady: true,
    xvisorInterest: true,
    xvisorStage: 'ready',
    candidateProgress: 0,
    selfDirected: true,
    lastReorderMonth: state.month,
    decisionAttempts: attempt,
  };

  const monthStats = spent.monthStats || v9.makeMonthStats();
  let next = {
    ...spent,
    prospects: spent.prospects.filter((item) => item.id !== person.id),
    customers: [...(spent.customers || []), customer],
    selectedPersonId: customer.id,
    economy: {
      ...(spent.economy || {}),
      personalXV: Number(spent.economy?.personalXV || 0) + FULL_START_XV,
      productSales: Number(spent.economy?.productSales || 0) + FULL_START_BAHT,
      sets: Number(spent.economy?.sets || 0) + 1,
      lastTransaction: null,
    },
    monthStats: {
      ...monthStats,
      sales: Number(monthStats.sales || 0) + 1,
      newCustomers: Number(monthStats.newCustomers || 0) + 1,
      successCases: Number(monthStats.successCases || 0) + 1,
      playerActions: {
        ...(monthStats.playerActions || {}),
        attract: Number(monthStats.playerActions?.attract || 0) + 1,
        total: Number(monthStats.playerActions?.total || 0) + 1,
      },
      energyUse: {
        ...(monthStats.energyUse || {}),
        attract: Number(monthStats.energyUse?.attract || 0) + 1,
      },
    },
    lastEvent: EVENTS.FAST_TRACK_FULL_START,
    lastMessage: `✅ ${person.name} เริ่ม Full Start แล้ว · ⚡ ข้ามขั้นตอนและพร้อมชวนเข้า Xcademy`,
    updatedAt: Date.now(),
  };
  next = addSkillXp(next, 'people', 1, 'fast-track-full-start');
  next = addSkillXp(next, 'knowledge', 1, 'fast-track-full-start');
  return releaseState(v9.refreshMissions(next));
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
    churnedCustomersThisMonth: Number(previous?.churnedCustomersThisMonth || 0),
    referralsThisMonth: Number(previous?.referralsThisMonth || 0),
    candidatesThisMonth: Number(previous?.candidatesThisMonth || 0),
    newXvisorsThisMonth: Number(previous?.newXvisorsThisMonth || 0),
    newXleadsThisMonth: Number(previous?.newXleadsThisMonth || 0),
  };
}

function applyOrganizationRhythm(state, month) {
  const leadership = getSkillLevel(state.skills, 'leadership');
  const xcircle = ORGANIZATION_XIRCLE_MONTHS.includes(Number(month));
  const sessions = 4;
  const team = (state.team || []).map((member, index) => {
    if (member.active === false) return member;
    const xcademyConfidence = sessions * (8 + leadership);
    const xcademyAutonomy = sessions * (5 + Math.floor(leadership / 2));
    const xcademySkill = sessions * (1 + Number(leadership >= 5) + Number(leadership >= 10));
    const openHouseConfidence = 5 + Math.floor(leadership / 2);
    const builder = member.specialty === 'builder';
    const balanced = member.specialty === 'balanced';
    const openHousePipeline = builder ? 2 : balanced ? 1 : Number(deterministicRoll(state, member.id, month + index) > 0.72);
    return {
      ...member,
      confidence: Math.min(100, Number(member.confidence || 45) + xcademyConfidence + openHouseConfidence + (xcircle ? 12 : 0)),
      autonomy: Math.min(100, Number(member.autonomy || 30) + xcademyAutonomy + (xcircle ? 8 : 0)),
      teamSkill: Math.min(10, Number(member.teamSkill || 1) + xcademySkill + (xcircle ? 1 : 0)),
      xcademyVisits: Number(member.xcademyVisits || member.centerVisits || 0) + sessions,
      openHouseVisits: Number(member.openHouseVisits || member.goodLuckVisits || 0) + 1,
      candidatePipeline: Math.max(0, Number(member.candidatePipeline || 0) + openHousePipeline + (xcircle && builder ? 1 : 0)),
      leaderReadiness: Math.min(100, Number(member.leaderReadiness || 0) + 2 + leadership + (xcircle ? 5 : 0)),
      status: xcircle ? '🏕️ The Xircle · พร้อมพาทีมเดินต่อ' : '🎓 Xcademy ×4 · 🏠 Open House · ระบบพร้อมเดินต่อ',
    };
  });
  const priorMomentum = state.xircleMomentum;
  const momentumActive = priorMomentum && Number(priorMomentum.expiresAfterMonth || 0) >= Number(month);
  return {
    ...state,
    team,
    xircleMomentum: xcircle
      ? { sourceMonth: month, expiresAfterMonth: month + 2, strength: month === 24 ? 2 : 1 }
      : momentumActive ? priorMomentum : null,
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
    settled: true,
  };
}

function enterOrganizationV1(state) {
  if (!state.campaignComplete || !state.campaignScore?.locked) return state;
  return releaseState({
    ...state,
    organizationMode: true,
    runComplete: false,
    phase: 'organization',
    month: ORGANIZATION_START_MONTH,
    energy: 0,
    stage: v9.STAGES.MANAGEMENT,
    economy: {
      ...(state.economy || {}),
      personalXV: 0,
      teamXV: 0,
      productSales: 0,
      teamProductSales: 0,
      lastTransaction: null,
    },
    organization: {
      ...(state.organization || {}),
      tgv: 0,
      currentTGV: 0,
      aggregate: organizationAggregate(state),
      endless: false,
    },
    organizationMonthIncome: null,
    lastOrganizationReport: null,
    lastMessage: '🏙️ Organization Year เริ่มแล้ว · จากนี้กดเดือนละครั้ง ระบบจะทำ Xcademy / Open House / The Xircle ตามรอบให้เอง',
    updatedAt: Date.now(),
  });
}

function runOrganizationMonth(state) {
  const month = Number(state.month || ORGANIZATION_START_MONTH);
  if (state.runComplete || month < ORGANIZATION_START_MONTH || month > ORGANIZATION_END_MONTH) return state;
  if (state.settlements?.[String(month)]) {
    if (month >= ORGANIZATION_END_MONTH) return { ...state, runComplete: true };
    return releaseState({ ...state, month: month + 1, economy: { ...(state.economy || {}), personalXV: 0, teamXV: 0 } });
  }

  const beforeXvisors = uniqueTeamCount(state);
  const beforeXleads = xleadCount(state);
  const beforeCustomers = activeOrganizationCustomers(state);
  const personalRepeat = activePersonalCustomers(state);
  const xcircleDone = ORGANIZATION_XIRCLE_MONTHS.includes(month);
  const rhythm = applyOrganizationRhythm(state, month);
  const prepared = {
    ...rhythm,
    organizationMode: false,
    runComplete: false,
    month,
    energy: 0,
    stage: v9.STAGES.MANAGEMENT,
    monthStats: {
      ...(v9.makeMonthStats?.() || {}),
      xcademySessions: 4,
      openHouseDone: true,
      xircleDone: xcircleDone,
      teamCycleDone: false,
    },
    economy: {
      ...(state.economy || {}),
      personalXV: personalRepeat * ROUTINEX_XV,
      teamXV: 0,
      productSales: personalRepeat * Number(v9.TUTORIAL_OFFER?.price || 7_490),
      teamProductSales: 0,
      lastTransaction: null,
    },
  };

  const simulatedRaw = simulateTeamCycle(prepared);
  const simulated = {
    ...simulatedRaw,
    organizationMode: true,
    phase: 'organization',
    energy: 0,
  };
  const economy = v9.calculateEconomy(simulated);
  const settlement = makeSettlement(simulated, economy);
  const afterXvisors = uniqueTeamCount(simulated);
  const afterXleads = xleadCount(simulated);
  const afterCustomers = activeOrganizationCustomers(simulated);
  const stats = simulated.monthStats || {};
  const newXvisors = Math.max(0, afterXvisors - beforeXvisors);
  const newXleads = Math.max(0, afterXleads - beforeXleads);
  const newCustomers = Math.max(0, Number(stats.teamCustomers || 0));
  const repeats = personalRepeat + Math.max(0, Number(stats.teamReorders || 0));
  const referrals = Math.max(0, Number(stats.teamReferrals || 0));
  const candidates = Math.max(0, Number(stats.teamCandidates || 0));
  const churn = Math.max(0, beforeCustomers + newCustomers - afterCustomers);
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome || 0)) + settlement.totalIncome;
  const settlements = { ...(state.settlements || {}), [String(month)]: settlement };
  const incomeHistory = [...(state.economy?.incomeHistory || []).filter((entry) => Number(entry.month) !== month), {
    month,
    channel1: settlement.channel1,
    channel2: settlement.channel2,
    channel3: settlement.channel3,
    channel4: 0,
    total: settlement.totalIncome,
    tgv: settlement.currentTGV,
  }].sort((a, b) => Number(a.month) - Number(b.month));
  const historyMap = new Map(v9.getTgvHistory(state).map((entry) => [Number(entry.month), Number(entry.tgv)]));
  historyMap.set(month, settlement.currentTGV);
  const report = {
    month,
    activities: { xcademy: 4, openHouse: 1, xircle: xcircleDone ? 1 : 0 },
    activeCustomers: afterCustomers,
    newCustomers,
    repeatCustomers: repeats,
    churnedCustomers: churn,
    referrals,
    candidates,
    xvisorCount: afterXvisors,
    newXvisors,
    xleadCount: afterXleads,
    newXleads,
    tgv: settlement.currentTGV,
    income: settlement.totalIncome,
    totalIncome,
  };
  const aggregate = {
    activeCustomers: afterCustomers,
    newCustomersThisMonth: newCustomers,
    repeatCustomersThisMonth: repeats,
    churnedCustomersThisMonth: churn,
    referralsThisMonth: referrals,
    candidatesThisMonth: candidates,
    xvisorCount: afterXvisors,
    newXvisorsThisMonth: newXvisors,
    xleadCount: afterXleads,
    newXleadsThisMonth: newXleads,
    candidateCount: (simulated.team || []).reduce((sum, member) => sum + Math.max(0, Number(member.candidatePipeline || 0)), 0),
    organizationSize: afterXvisors,
    overflowPeople: 0,
  };
  const story = newXleads > 0
    ? `👑 มี XLEAD ใหม่ ${newXleads} คน`
    : newXvisors > 0
      ? `🌱 ทีมพัฒนา X-VISOR ใหม่ ${newXvisors} คน`
      : newCustomers > 0
        ? `❤️ ทีมสร้างลูกค้าใหม่ ${newCustomers} คน`
        : '🌱 ระบบยังเดินต่อจากทีมที่สร้างไว้';
  const common = {
    ...simulated,
    settlements,
    economy: {
      ...(simulated.economy || {}),
      totalIncome,
      receivedIncome: totalIncome,
      incomeHistory,
      lastTransaction: null,
    },
    organization: {
      ...(simulated.organization || {}),
      tgv: settlement.currentTGV,
      currentTGV: settlement.currentTGV,
      lastMonthTGV: settlement.currentTGV,
      bestTGV: Math.max(Number(state.organization?.bestTGV || 0), settlement.currentTGV),
      tgvHistory: [...historyMap.entries()].map(([m, tgv]) => ({ month: m, tgv })).sort((a, b) => a.month - b.month),
      aggregate,
      endless: false,
    },
    organizationMonthIncome: { channel1: settlement.channel1, channel2: settlement.channel2, channel3: settlement.channel3 },
    lastOrganizationReport: report,
    sceneReport: { kind: 'organization', ...report, story },
    lastMessage: `🏙️ เดือน ${month} · TGV ${settlement.currentTGV.toLocaleString('th-TH')} XV · ${story}`,
    updatedAt: Date.now(),
  };

  if (month >= ORGANIZATION_END_MONTH) {
    return releaseState({
      ...common,
      month: ORGANIZATION_END_MONTH,
      runComplete: true,
      phase: 'complete',
      energy: 0,
      twoYearSummary: {
        completedAt: Date.now(),
        month24TGV: settlement.currentTGV,
        month24Income: settlement.totalIncome,
        totalIncome,
        activeCustomers: afterCustomers,
        xvisorCount: afterXvisors,
        xleadCount: afterXleads,
        organizationSize: afterXvisors,
        campaignScore: state.campaignScore,
      },
      lastMessage: '🏁 2 ปีผ่านไปแล้ว · รอบหน้าเริ่ม Month 1 ได้ทันทีด้วย NEW GAME+',
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
      teamProductSales: 0,
    },
    organization: { ...common.organization, tgv: 0, currentTGV: 0 },
  });
}

export function calculateEconomy(state) {
  return v9.calculateEconomy(state);
}

export function makeInitialState(options = {}) {
  return releaseState({
    ...v9.makeInitialState(options),
    releaseVersion: RELEASE_VERSION,
    v1SaveVersion: V1_SAVE_VERSION,
    runComplete: false,
    twoYearSummary: null,
    lastOrganizationReport: null,
  });
}

export function makeNewGamePlusState(options = {}) {
  const previousScore = options.previousScore || null;
  const base = v9.makeInitialState({ seed: options.seed });
  return releaseState(v9.refreshMissions({
    ...base,
    runMode: 'NEW_GAME_PLUS',
    phase: 'management',
    stage: v9.STAGES.MANAGEMENT,
    month: 1,
    energy: v9.MAX_ENERGY,
    rank: 'xvisor',
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
      ...(base.organization || {}),
      tgv: 0,
      currentTGV: 0,
      lastMonthTGV: 0,
      bestTGV: 0,
      tgvHistory: [],
      xleads: [],
      aggregate: { activeCustomers: 0, xvisorCount: 0, xleadCount: 0, candidateCount: 0, organizationSize: 0, overflowPeople: 0 },
    },
    economy: {
      ...(base.economy || {}),
      personalXV: 0,
      teamXV: 0,
      productSales: 0,
      teamProductSales: 0,
      totalIncome: 0,
      receivedIncome: 0,
      incomeHistory: [],
      lastTransaction: null,
    },
    milestones: { ...(base.milestones || {}), certified: true },
    career: {
      ...(base.career || {}),
      certificationPreviouslyPassed: true,
      xleadQualified: false,
      xleadCertified: false,
      xgenQualified: false,
      xgenCertified: false,
      xgenQualificationRule: null,
    },
    previousRunScore: previousScore,
    lastMessage: '⚡ NEW GAME+ · Month 1 เปิดอิสระเต็มรูปแบบแล้ว ลองทำ High Score ให้ดีกว่าเดิม',
    updatedAt: Date.now(),
  }));
}

export function canDispatch(state, event) {
  if (state?.runComplete) return event === EVENTS.NEW_GAME_PLUS;
  if (event === EVENTS.NEW_GAME_PLUS) return false;
  if (event === EVENTS.FAST_TRACK_FULL_START) {
    const id = state?.selectedPersonId || null;
    return Boolean((state?.prospects || []).some((person) => person.id === id && fastTrackEligible(state, person))) ||
      Boolean((state?.prospects || []).some((person) => fastTrackEligible(state, person)));
  }
  if (event === EVENTS.ENTER_ORGANIZATION) return Boolean(state?.campaignComplete && state?.campaignScore?.locked && !state?.organizationMode);
  if (state?.organizationMode) return event === EVENTS.END_MONTH && Number(state.month || 0) <= ORGANIZATION_END_MONTH;
  return v9.canDispatch(state, event);
}

export function getBestNextActions(state, limit = 3) {
  const current = releaseState(state);
  if (current.runComplete) {
    return [{ type: 'new-game-plus', event: EVENTS.NEW_GAME_PLUS, label: '⚡ NEW GAME+', cost: 0, score: 5000 }];
  }
  if (current.organizationMode) {
    return [{ type: 'organization-pass', event: EVENTS.END_MONTH, label: '▶ ผ่านไปอีก 1 เดือน', cost: 0, score: 1000 }];
  }
  const actions = [...v9.getBestNextActions(current, Math.max(8, limit + 4))];
  for (const person of current.prospects || []) {
    if (!fastTrackEligible(current, person)) continue;
    const chance = getFastTrackChance(current, person);
    actions.push({
      type: 'fast-track-full-start',
      event: EVENTS.FAST_TRACK_FULL_START,
      targetId: person.id,
      targetName: person.name,
      payload: { id: person.id },
      label: `⚡ เสนอ Full Start เลย · ${person.name}`,
      reason: `โอกาสประมาณ ${Math.round(chance * 100)}% · เสี่ยงกว่าแต่ประหยัด Energy`,
      cost: 1,
      score: 112 + Math.round(chance * 40),
    });
  }
  const unique = new Map();
  for (const action of actions) {
    const key = `${action.event || action.type}:${action.targetId || action.payload?.id || ''}`;
    if (!unique.has(key) || Number(action.score || 0) > Number(unique.get(key).score || 0)) unique.set(key, action);
  }
  return [...unique.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, Math.max(1, limit));
}

export function reduceGame(currentState, event, payload = {}) {
  const state = releaseState(currentState);
  if (!canDispatch(state, event)) return state;
  if (event === EVENTS.NEW_GAME_PLUS) {
    return makeNewGamePlusState({ seed: Number(state.rngSeed || 1) + 101, previousScore: state.campaignScore || state.twoYearSummary?.campaignScore || null });
  }
  if (event === EVENTS.FAST_TRACK_FULL_START) return runFastTrack(state, payload);
  if (event === EVENTS.ENTER_ORGANIZATION) return enterOrganizationV1(state);
  if (state.organizationMode && event === EVENTS.END_MONTH) return runOrganizationMonth(state);
  return releaseState(v9.reduceGame(state, event, payload));
}

export function serializeState(state) {
  const raw = v9.serializeState({ ...state, v9SaveVersion: v9.V9_SAVE_VERSION });
  const value = JSON.parse(raw);
  return JSON.stringify({
    ...value,
    gameVersion: GAME_VERSION,
    releaseVersion: RELEASE_VERSION,
    v1SaveVersion: V1_SAVE_VERSION,
    v9SaveVersion: v9.V9_SAVE_VERSION,
    updatedAt: Date.now(),
  });
}

export function parseSavedState(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.releaseVersion !== RELEASE_VERSION || value.v1SaveVersion !== V1_SAVE_VERSION) return null;
    const parsed = v9.parseSavedState(raw);
    return parsed ? releaseState({ ...parsed, ...value }) : null;
  } catch {
    return null;
  }
}
