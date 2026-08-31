export * from './game-data-v8.js?v=8r4';
import * as v8 from './game-data-v8.js?v=8r4';

export const GAME_VERSION = 'V9 PRE-RELEASE';
export const V9_SAVE_VERSION = 'v9-pre-release-1';
export const V9_SCORE_VERSION = 'v9-pre-release-1';
export const XGEN_ROLLING_TARGET = 3_000_000;
export const PEOPLE_RENDER_LIMIT = 25;
export const CAMPAIGN_MONTHS = 12;

export const EVENTS = Object.freeze({
  ...v8.EVENTS,
  ENTER_ORGANIZATION: 'ENTER_ORGANIZATION',
});

const PERSON_EVENT_BY_MISSION = Object.freeze({
  contact: EVENTS.CONTACT_PROSPECT,
  meet: EVENTS.MEET_PROSPECT,
  consult: EVENTS.CONSULT_PROSPECT,
  baseline: EVENTS.BASELINE_PROSPECT,
  routine: EVENTS.OPEN_MANAGEMENT_ROUTINE,
  offer: EVENTS.OFFER_PROSPECT,
  decision: EVENTS.FOLLOW_UP_DECISION,
  care: EVENTS.CARE_CUSTOMER,
  remeasure: EVENTS.REMEASURE_CUSTOMER,
  reorder: EVENTS.REORDER_CUSTOMER,
  referral: EVENTS.ASK_REFERRAL,
  xvisor: EVENTS.INVITE_XVISOR,
  'candidate-start': EVENTS.START_CANDIDATE_XCADEMY,
  'candidate-review': EVENTS.REVIEW_CANDIDATE,
  'candidate-certify': EVENTS.CERTIFY_CANDIDATE,
  mentor: EVENTS.MENTOR_TEAM_MEMBER,
});

const PERSON_EVENTS = new Set(Object.values(PERSON_EVENT_BY_MISSION));

function clampNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function makeRunId(seed = 1) {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* deterministic fallback below */ }
  return `v9-${Date.now().toString(36)}-${Number(seed || 1).toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function peopleIn(state) {
  return [...(state.prospects || []), ...(state.customers || []), ...(state.team || [])];
}

export function findPerson(state, id) {
  if (!id) return null;
  return peopleIn(state).find((person) => person.id === id || person.personId === id) || null;
}

function uniqueOrganizationPeople(state) {
  const ids = new Set();
  for (const person of peopleIn(state)) {
    const id = person.personId || person.id;
    if (id) ids.add(id);
  }
  return ids.size + Math.max(0, Number(state.organization?.aggregate?.overflowPeople || 0));
}

function cleanTgvHistory(list = []) {
  const byMonth = new Map();
  for (const entry of Array.isArray(list) ? list : []) {
    const month = Number(entry?.month || 0);
    if (month < 1) continue;
    byMonth.set(month, { month, tgv: Math.max(0, Math.round(Number(entry?.tgv || 0))) });
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}

export function getTgvHistory(state) {
  const existing = cleanTgvHistory(state.organization?.tgvHistory || []);
  const byMonth = new Map(existing.map((entry) => [entry.month, entry]));
  for (const summary of state.monthSummaries || []) {
    const month = Number(summary?.month || 0);
    if (month > 0 && !byMonth.has(month)) byMonth.set(month, { month, tgv: Math.max(0, Math.round(Number(summary?.tgv || 0))) });
  }
  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}

export function getCurrentTGV(state) {
  return Math.max(0, Math.round(Number(state.economy?.personalXV || 0) + Number(state.economy?.teamXV || 0)));
}

export function getRolling3TGV(state) {
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
    organization: { ...(state.organization || {}), tgv: currentTGV },
  };
  return v8.calculateEconomy(sanitized);
}

export function calculateEconomy(state) {
  const base = baseEconomyFor(state);
  const currentTGV = getCurrentTGV(state);
  if (state.organizationMode && state.organizationMonthIncome) {
    const parts = state.organizationMonthIncome;
    const channel1 = Math.max(0, Math.round(Number(parts.channel1 || 0)));
    const channel2 = Math.max(0, Math.round(Number(parts.channel2 || 0)));
    const channel3 = state.career?.xgenCertified ? Math.max(0, Math.round(Number(parts.channel3 || currentTGV * 0.05))) : 0;
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
      lifetimeIncome: totalIncome + (currentMonthClosed ? 0 : projectedIncome),
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
    lifetimeIncome: totalIncome + (currentMonthClosed ? 0 : projectedIncome),
  };
}

function personActionCost(event) {
  const costs = v8.ENERGY_COSTS || {};
  const map = {
    [EVENTS.CONTACT_PROSPECT]: costs.remoteContact ?? 1,
    [EVENTS.MEET_PROSPECT]: costs.inPerson ?? 2,
    [EVENTS.CONSULT_PROSPECT]: costs.consultation ?? 1,
    [EVENTS.BASELINE_PROSPECT]: costs.scale ?? 2,
    [EVENTS.OPEN_MANAGEMENT_ROUTINE]: 0,
    [EVENTS.OFFER_PROSPECT]: costs.offer ?? 1,
    [EVENTS.FOLLOW_UP_DECISION]: costs.followup ?? 1,
    [EVENTS.CARE_CUSTOMER]: costs.followup ?? 1,
    [EVENTS.REMEASURE_CUSTOMER]: costs.scale ?? 2,
    [EVENTS.REORDER_CUSTOMER]: costs.reorder ?? 1,
    [EVENTS.ASK_REFERRAL]: costs.referral ?? 1,
    [EVENTS.INVITE_XVISOR]: costs.candidate ?? 1,
    [EVENTS.START_CANDIDATE_XCADEMY]: costs.candidate ?? 1,
    [EVENTS.REVIEW_CANDIDATE]: costs.candidate ?? 1,
    [EVENTS.CERTIFY_CANDIDATE]: costs.candidate ?? 1,
    [EVENTS.MENTOR_TEAM_MEMBER]: costs.mentoring ?? 1,
  };
  return Number(map[event] ?? 0);
}

export function buildPersonAction({ event, target, state, reason = '', expectedOutcome = '' } = {}) {
  if (!event || !target?.id || !target?.name || !PERSON_EVENTS.has(event)) return null;
  const name = target.name;
  const labels = {
    [EVENTS.CONTACT_PROSPECT]: `💬 ทัก ${name}`,
    [EVENTS.MEET_PROSPECT]: `🤝 พบ ${name}`,
    [EVENTS.CONSULT_PROSPECT]: `💬 คุยกับ ${name}`,
    [EVENTS.BASELINE_PROSPECT]: `⚖️ ดู Baseline กับ ${name}`,
    [EVENTS.OPEN_MANAGEMENT_ROUTINE]: `🧩 วาง Routine ให้ ${name}`,
    [EVENTS.OFFER_PROSPECT]: `📁 นัดคุยแฟ้ม X กับ ${name}`,
    [EVENTS.FOLLOW_UP_DECISION]: `🔥 คุยให้รู้ผลกับ ${name}`,
    [EVENTS.CARE_CUSTOMER]: `❤️ ดูแล ${name}`,
    [EVENTS.REMEASURE_CUSTOMER]: `📊 วัดซ้ำกับ ${name}`,
    [EVENTS.REORDER_CUSTOMER]: `📦 ต่อ RoutineX เดือนใหม่ · ${name}`,
    [EVENTS.ASK_REFERRAL]: `👥 ขอ Referral จาก ${name}`,
    [EVENTS.INVITE_XVISOR]: `✨ ชวน ${name} รู้จัก X-VISOR`,
    [EVENTS.START_CANDIDATE_XCADEMY]: `🎓 ชวน ${name} เข้า Xcademy`,
    [EVENTS.REVIEW_CANDIDATE]: `🌱 Review Case กับ ${name}`,
    [EVENTS.CERTIFY_CANDIDATE]: `🏅 Certification · ${name}`,
    [EVENTS.MENTOR_TEAM_MEMBER]: `🌱 Mentor ${name}`,
  };
  const label = labels[event];
  if (!label) return null;
  return {
    event,
    targetId: target.id,
    targetName: name,
    label,
    reason: reason || target.status || '',
    expectedOutcome,
    cost: personActionCost(event),
    payload: { id: target.id },
    stateMonth: Number(state?.month || 0),
  };
}

function inferPersonKind(state, target) {
  if ((state.team || []).some((person) => person.id === target.id)) return 'team';
  if ((state.customers || []).some((person) => person.id === target.id)) return 'customer';
  return 'prospect';
}

export function getPersonContextAction(state, target, kind = null) {
  if (!target?.id || !target?.name) return null;
  const actualKind = kind || inferPersonKind(state, target);
  if (actualKind === 'team') {
    if (target.active && Number(target.autonomy || 0) < 85) return buildPersonAction({ event: EVENTS.MENTOR_TEAM_MEMBER, target, state });
    return null;
  }
  if (actualKind === 'prospect') {
    const eventByJourney = {
      new: EVENTS.CONTACT_PROSPECT,
      scheduled: EVENTS.MEET_PROSPECT,
      conversation: EVENTS.CONSULT_PROSPECT,
      discovery: EVENTS.BASELINE_PROSPECT,
      baseline: EVENTS.OPEN_MANAGEMENT_ROUTINE,
      recommendation: EVENTS.OFFER_PROSPECT,
    };
    if (target.journey === 'waiting' && Number(target.nextOfferMonth || 0) <= Number(state.month || 0) && Number(target.decisionAttempts || 0) < 2) {
      return buildPersonAction({ event: EVENTS.FOLLOW_UP_DECISION, target, state });
    }
    return buildPersonAction({ event: eventByJourney[target.journey], target, state });
  }
  if (target.xvisorStage === 'ready') return buildPersonAction({ event: EVENTS.START_CANDIDATE_XCADEMY, target, state });
  if (target.xvisorStage === 'xcademy') return buildPersonAction({ event: EVENTS.REVIEW_CANDIDATE, target, state });
  if (target.xvisorStage === 'case') return buildPersonAction({ event: EVENTS.CERTIFY_CANDIDATE, target, state });
  if (target.xvisorInterest && !target.xvisorStage) return buildPersonAction({ event: EVENTS.INVITE_XVISOR, target, state });
  if (target.referralReady && !target.referralAsked) return buildPersonAction({ event: EVENTS.ASK_REFERRAL, target, state });
  if (target.selfDirected || [v8.CUSTOMER_STATES.SELF_DIRECTED, v8.CUSTOMER_STATES.AUTO_REORDER].includes(target.customerState)) return null;
  if (target.customerState === v8.CUSTOMER_STATES.READY_TO_BUY) return buildPersonAction({ event: EVENTS.REORDER_CUSTOMER, target, state });
  if (Number(target.satisfaction || 0) < 55 || Number(target.day || 0) < 28) return buildPersonAction({ event: EVENTS.CARE_CUSTOMER, target, state });
  if (!target.measuredAgain) return buildPersonAction({ event: EVENTS.REMEASURE_CUSTOMER, target, state });
  return null;
}

function canonicalizeMissions(state) {
  if (!Array.isArray(state.missions)) return state;
  const missions = [];
  for (const mission of state.missions) {
    const event = PERSON_EVENT_BY_MISSION[mission.type];
    if (!event) { missions.push(mission); continue; }
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
    payload: { ...(item.payload || {}), id: target.id },
    label: action.label,
    cost: Number(item.cost ?? action.cost),
  };
}

function currentMonthHistoryMap(state) {
  return new Map(getTgvHistory(state).map((entry) => [entry.month, entry.tgv]));
}

function qualificationFromState(state, previous = null) {
  const rolling = getRolling3TGV(state);
  const persisted = Boolean(
    state.career?.xgenCertified ||
    state.career?.xgenQualificationRule === 'rolling3' ||
    previous?.career?.xgenQualificationRule === 'rolling3' ||
    previous?.career?.xgenCertified
  );
  return { qualified: persisted || rolling >= XGEN_ROLLING_TARGET, rolling };
}

function normalizeV9State(input, previous = null) {
  let state = canonicalizeMissions(input);
  const currentTGV = getCurrentTGV(state);
  const history = getTgvHistory(state);
  const qualification = qualificationFromState(state, previous);
  const wasQualified = Boolean(
    previous?.career?.xgenQualificationRule === 'rolling3' ||
    previous?.career?.xgenCertified ||
    state.career?.xgenQualificationRule === 'rolling3' ||
    state.career?.xgenCertified
  );
  const qualifiedAtMonth = state.career?.xgenQualifiedAtMonth || (qualification.qualified && !wasQualified ? Number(state.month || 0) : null);
  const career = {
    ...(state.career || {}),
    xgenQualified: qualification.qualified,
    xgenQualifiedAtMonth: qualifiedAtMonth,
    xgenQualificationRule: qualification.qualified ? 'rolling3' : null,
  };
  let sceneReport = state.sceneReport;
  let lastMessage = state.lastMessage;
  if (qualification.qualified && !wasQualified && !state.career?.xgenCertified) {
    sceneReport = { kind: 'xgen-qualified', rolling3TGV: qualification.rolling, month: state.month };
    lastMessage = `🔓 XGEN Qualification พร้อมแล้ว · 3-Month TGV ${qualification.rolling.toLocaleString('th-TH')} XV`;
  }
  if (!career.xgenCertified && state.rank === 'xgen') {
    state = { ...state, rank: state.career?.xleadCertified ? 'xlead' : 'xvisor' };
  }
  return canonicalizeMissions({
    ...state,
    gameVersion: GAME_VERSION,
    v9SaveVersion: V9_SAVE_VERSION,
    scoreVersion: V9_SCORE_VERSION,
    runId: state.runId || makeRunId(state.rngSeed),
    career,
    organization: {
      ...(state.organization || {}),
      tgv: currentTGV,
      currentTGV,
      rolling3TGV: qualification.rolling,
      tgvHistory: history,
      breakawayVolume: 0,
    },
    economy: { ...(state.economy || {}), breakawayVolume: 0 },
    sceneReport,
    lastMessage,
  });
}

function settlementEntry(state) {
  const economy = calculateEconomy(state);
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
    xleadCount: Number(state.organization?.aggregate?.xleadCount || state.team?.filter?.((member) => member.rank === 'xlead').length || 0),
    settled: true,
  });
}

function campaignScoreFor(state) {
  const settlements = Object.values(state.settlements || {})
    .filter((entry) => Number(entry.month) >= 1 && Number(entry.month) <= CAMPAIGN_MONTHS)
    .sort((a, b) => Number(a.month) - Number(b.month));
  const totals = settlements.map((entry) => Number(entry.totalIncome ?? entry.total ?? 0));
  const tgvs = settlements.map((entry) => Number(entry.currentTGV ?? entry.tgv ?? 0));
  return {
    locked: true,
    completedMonth: CAMPAIGN_MONTHS,
    bestTgv: Math.max(0, ...tgvs),
    totalIncome: totals.reduce((sum, value) => sum + value, 0),
    bestMonthlyIncome: Math.max(0, ...totals),
    organizationSize: uniqueOrganizationPeople(state),
    completedAt: Date.now(),
    scoreVersion: V9_SCORE_VERSION,
    runMode: state.runMode || 'FIRST_RUN',
    runId: state.runId,
  };
}

function finalizeCampaignMonth(before, after) {
  const monthKey = String(before.month);
  if (before.settlements?.[monthKey]) return before;
  const settlement = settlementEntry(before);
  const tgvHistoryMap = currentMonthHistoryMap(after);
  tgvHistoryMap.set(Number(before.month), settlement.currentTGV);
  const tgvHistory = [...tgvHistoryMap.entries()].map(([month, tgv]) => ({ month, tgv })).sort((a, b) => a.month - b.month);
  const settlements = { ...(before.settlements || {}), [monthKey]: settlement };
  const next = normalizeV9State({
    ...after,
    settlements,
    organization: {
      ...(after.organization || {}),
      tgv: settlement.currentTGV,
      currentTGV: settlement.currentTGV,
      lastMonthTGV: settlement.currentTGV,
      bestTGV: Math.max(Number(before.organization?.bestTGV || 0), settlement.currentTGV),
      tgvHistory,
    },
  }, before);
  if (Number(before.month) === CAMPAIGN_MONTHS) {
    const scored = { ...next, campaignComplete: true, campaignFinalePending: true };
    return {
      ...scored,
      campaignScore: campaignScoreFor(scored),
      lastMessage: '🏆 12 เดือนจบแล้ว · High Score ถูกล็อก รอใส่ชื่อก่อนเล่น Organization Mode ต่อ',
    };
  }
  return next;
}

function certifyXgenV9(state) {
  if (!state.career?.xgenQualified || state.career?.xgenCertified) return state;
  return normalizeV9State({
    ...state,
    rank: 'xgen',
    career: {
      ...(state.career || {}),
      xgenQualified: true,
      xgenQualificationRule: 'rolling3',
      xgenCertified: true,
      xgenAtMonth: Number(state.month || 0),
    },
    organization: { ...(state.organization || {}), xgen: true, mapUnlocked: true, endless: false },
    milestones: { ...(state.milestones || {}), xgen: true },
    sceneReport: { kind: 'xgen-exam', passed: true, rolling3TGV: getRolling3TGV(state) },
    lastEvent: EVENTS.XGEN_EXAM,
    lastMessage: '🏆 Certified XGEN · ปลดล็อก ③ รายได้จากการบริหาร Organization',
    updatedAt: Date.now(),
  }, state);
}

function aggregateFor(state) {
  const existing = state.organization?.aggregate || {};
  const activePersonal = (state.customers || []).filter((customer) => customer.activePlan !== false).length;
  const teamCustomers = (state.team || []).reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  return {
    activeCustomers: Math.max(activePersonal + teamCustomers, Number(existing.activeCustomers || 0), 1),
    xvisorCount: Math.max(Number(existing.xvisorCount || 0), Number(state.team?.length || 0)),
    xleadCount: Math.max(Number(existing.xleadCount || 0), Number(state.team?.filter?.((member) => member.rank === 'xlead').length || 0)),
    candidateCount: Math.max(0, Number(existing.candidateCount || 0)),
    overflowPeople: Math.max(0, Number(existing.overflowPeople || 0)),
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
  const scalePenalty = Math.min(0.05, Math.log10(Math.max(1, previousTGV / 1_000_000)) * 0.015);
  const leaderQuality = Math.min(0.022, aggregate.xleadCount * 0.0014);
  const wave = (((Number(state.rngSeed || 1) + month * 19) % 9) - 4) * 0.003;
  const growthRate = Math.max(-0.012, Math.min(0.08, 0.042 + leaderQuality - scalePenalty + wave));
  const currentTGV = Math.max(0, Math.round(previousTGV * (1 + growthRate)));
  const personalActive = (state.customers || []).filter((customer) => customer.activePlan !== false).length;
  const personalXV = Math.min(currentTGV, Math.max(0, personalActive * 7_000));
  const teamXV = Math.max(0, currentTGV - personalXV);
  const customerGain = Math.max(0, Math.round(Math.sqrt(Math.max(1, aggregate.activeCustomers)) * (0.42 + aggregate.xleadCount * 0.022)));
  const churn = Math.round(aggregate.activeCustomers * 0.012);
  const activeCustomers = Math.max(1, aggregate.activeCustomers + customerGain - churn);
  const newXvisors = Math.max(0, Math.min(4, Math.round(Math.sqrt(activeCustomers) / 16 + aggregate.xleadCount * 0.05) - Math.floor(aggregate.xvisorCount / 120)));
  const xvisorCount = Math.max(aggregate.xvisorCount, aggregate.xvisorCount + newXvisors);
  const newXleads = xvisorCount >= 16 ? Math.max(0, Math.min(1, Math.floor((xvisorCount - aggregate.xleadCount * 10) / 45))) : 0;
  const xleadCount = Math.max(aggregate.xleadCount, aggregate.xleadCount + newXleads);
  const temp = {
    ...state,
    month,
    energy: 0,
    economy: { ...(state.economy || {}), personalXV, teamXV, productSales: 0, teamProductSales: 0 },
    organization: { ...(state.organization || {}), tgv: currentTGV, currentTGV },
  };
  const base = baseEconomyFor(temp);
  const previousChannel2 = Number(prior?.channel2 || 0);
  const channel1 = Math.max(0, Math.round(Number(base.channel1 || 0)));
  const channel2 = state.career?.xleadCertified ? Math.max(0, Math.round(previousChannel2 * (1 + Math.max(-0.01, growthRate * 0.65)))) : 0;
  const channel3 = state.career?.xgenCertified ? Math.round(currentTGV * 0.05) : 0;
  const story = newXleads > 0
    ? `👑 มี XLEAD ใหม่ ${newXleads} คน`
    : newXvisors > 0
      ? `🌱 Candidate Pipeline สร้าง X-VISOR ใหม่ ${newXvisors} คน`
      : `❤️ ลูกค้า active ${activeCustomers.toLocaleString('th-TH')} คน · ระบบยังเดินต่อ`;
  return normalizeV9State({
    ...temp,
    organizationMode: true,
    phase: 'organization',
    stage: v8.STAGES.MANAGEMENT,
    economy: { ...(temp.economy || {}), personalXV, teamXV, productSales: 0, teamProductSales: 0, lastTransaction: null },
    organization: {
      ...(temp.organization || {}),
      tgv: currentTGV,
      currentTGV,
      aggregate: { ...aggregate, activeCustomers, xvisorCount, xleadCount },
    },
    organizationMonthIncome: { channel1, channel2, channel3 },
    monthStats: { ...(v8.makeMonthStats?.() || {}), teamActions: Math.round(activeCustomers * 2.2), teamCycleDone: true },
    sceneReport: { kind: 'organization', tgv: currentTGV, activeCustomers, xvisorCount, xleadCount, story },
    lastMessage: `🏙️ เดือน ${month} · TGV ${currentTGV.toLocaleString('th-TH')} XV · ${story}`,
    campaignFinalePending: false,
    updatedAt: Date.now(),
  }, state);
}

function enterOrganization(state) {
  if (!state.campaignScore?.locked || !state.campaignComplete) return state;
  const base = normalizeV9State({
    ...state,
    organizationMode: true,
    phase: 'organization',
    month: CAMPAIGN_MONTHS + 1,
    energy: 0,
    stage: v8.STAGES.MANAGEMENT,
    economy: { ...(state.economy || {}), sets: 0, personalXV: 0, teamXV: 0, productSales: 0, teamProductSales: 0, lastTransaction: null },
    organization: { ...(state.organization || {}), tgv: 0, currentTGV: 0 },
    campaignFinalePending: false,
  }, state);
  return generateOrganizationMonth(base, CAMPAIGN_MONTHS + 1);
}

function settleOrganizationMonth(state) {
  const monthKey = String(state.month);
  if (state.settlements?.[monthKey]) return generateOrganizationMonth(state, Number(state.month) + 1);
  const economy = calculateEconomy(state);
  const settlement = settlementEntry(state);
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome || 0)) + settlement.totalIncome;
  const settlements = { ...(state.settlements || {}), [monthKey]: settlement };
  const incomeHistory = [...(state.economy?.incomeHistory || []).filter((entry) => Number(entry.month) !== Number(state.month)), {
    month: Number(state.month),
    channel1: settlement.channel1,
    channel2: settlement.channel2,
    channel3: settlement.channel3,
    channel4: 0,
    total: settlement.totalIncome,
    tgv: settlement.currentTGV,
  }].sort((a, b) => Number(a.month) - Number(b.month));
  const historyMap = currentMonthHistoryMap(state);
  historyMap.set(Number(state.month), settlement.currentTGV);
  const settledState = normalizeV9State({
    ...state,
    settlements,
    economy: { ...(state.economy || {}), totalIncome, receivedIncome: totalIncome, incomeHistory },
    organization: {
      ...(state.organization || {}),
      lastMonthTGV: settlement.currentTGV,
      bestTGV: Math.max(Number(state.organization?.bestTGV || 0), settlement.currentTGV),
      tgvHistory: [...historyMap.entries()].map(([month, tgv]) => ({ month, tgv })).sort((a, b) => a.month - b.month),
    },
  }, state);
  return generateOrganizationMonth(settledState, Number(state.month) + 1);
}

export function makeInitialState(options = {}) {
  const base = v8.makeInitialState(options);
  return normalizeV9State({
    ...base,
    runId: makeRunId(options.seed || base.rngSeed),
    settlements: {},
    campaignComplete: false,
    campaignFinalePending: false,
    campaignScore: null,
    organizationMode: false,
    v9SaveVersion: V9_SAVE_VERSION,
  });
}

export function makeNewGamePlusState(options = {}) {
  const base = v8.makeNewGamePlusState(options);
  return normalizeV9State({
    ...base,
    runId: makeRunId(options.seed || base.rngSeed),
    settlements: {},
    campaignComplete: false,
    campaignFinalePending: false,
    campaignScore: null,
    organizationMode: false,
    v9SaveVersion: V9_SAVE_VERSION,
  });
}

export function canDispatch(state, event) {
  if (event === EVENTS.ENTER_ORGANIZATION) return Boolean(state.campaignComplete && state.campaignScore?.locked && !state.organizationMode);
  if (event === EVENTS.XGEN_EXAM) return Boolean(state.career?.xgenQualified && !state.career?.xgenCertified);
  if (state.organizationMode) return event === EVENTS.END_MONTH;
  if (event === EVENTS.END_MONTH && state.settlements?.[String(state.month)]) return false;
  if (event === EVENTS.START_NEXT_MONTH && Number(state.month) >= CAMPAIGN_MONTHS) return false;
  return v8.canDispatch(state, event);
}

export function getBestNextActions(state, limit = 3) {
  const normalized = normalizeV9State(state);
  if (normalized.organizationMode) return [{ type: 'organization-pass', event: EVENTS.END_MONTH, label: '▶ ผ่านไปอีก 1 เดือน', cost: 0, score: 1000 }];
  const source = v8.getBestNextActions({
    ...normalized,
    organization: { ...(normalized.organization || {}), tgv: getCurrentTGV(normalized) },
  }, Math.max(8, limit + 4));
  const actions = [];
  for (const item of source) {
    if (item.type === 'xgen-exam' || item.event === EVENTS.XGEN_EXAM) continue;
    const canonical = canonicalizeBestAction(normalized, item);
    if (canonical) actions.push(canonical);
  }
  if (normalized.career?.xgenQualified && !normalized.career?.xgenCertified) {
    actions.unshift({ type: 'xgen-exam', event: EVENTS.XGEN_EXAM, label: '🎓 เข้าสอบ XGEN · ปลดล็อก ③', cost: 0, score: 195 });
  }
  const unique = new Map();
  for (const action of actions) {
    const key = `${action.event || action.type}:${action.targetId || action.payload?.id || ''}`;
    if (!unique.has(key) || Number(action.score || 0) > Number(unique.get(key).score || 0)) unique.set(key, action);
  }
  return [...unique.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, Math.max(1, limit));
}

export function reduceGame(currentState, event, payload = {}) {
  let state = normalizeV9State(currentState);
  if (!canDispatch(state, event)) return state;
  if (event === EVENTS.ENTER_ORGANIZATION) return enterOrganization(state);
  if (state.organizationMode && event === EVENTS.END_MONTH) return settleOrganizationMonth(state);
  if (event === EVENTS.XGEN_EXAM) return certifyXgenV9(state);
  const prepared = {
    ...state,
    organization: { ...(state.organization || {}), tgv: getCurrentTGV(state), currentTGV: getCurrentTGV(state), breakawayVolume: 0 },
  };
  const next = v8.reduceGame(prepared, event, payload);
  if (next === prepared) return state;
  if (event === EVENTS.END_MONTH) return finalizeCampaignMonth(prepared, next);
  const normalized = normalizeV9State(next, state);
  if (event === EVENTS.START_NEXT_MONTH) {
    return normalizeV9State({
      ...normalized,
      organization: { ...(normalized.organization || {}), tgv: getCurrentTGV(normalized), currentTGV: getCurrentTGV(normalized) },
    }, state);
  }
  return normalized;
}

export function serializeState(state) {
  const normalized = normalizeV9State(state);
  return JSON.stringify({ ...normalized, v9SaveVersion: V9_SAVE_VERSION, updatedAt: Date.now() });
}

export function parseSavedState(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.v9SaveVersion !== V9_SAVE_VERSION) return null;
    const parsed = v8.parseSavedState(JSON.stringify(value));
    if (!parsed) return null;
    return normalizeV9State(parsed);
  } catch {
    return null;
  }
}

export function debugV9Snapshot(state) {
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
    rolling3TGV: getRolling3TGV(normalized),
  };
}
