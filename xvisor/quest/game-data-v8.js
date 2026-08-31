export * from './game-data.js?v7legacy';
import * as legacy from './game-data.js?v7legacy';
import {
  SKILL_IDS,
  addSkillXp,
  getSkillLevel,
} from './game-progression-v8.js';
import {
  DIRECT_MENTORING_RULE,
  INCOME_RULE,
  ORGANIZATION_INCOME_RULE,
  TUTORIAL_OFFER,
  XIRCLE_STARTER,
  getRetailTier,
} from './game-commercial-config-v8.js';

export const V8_SCORE_VERSION = 'v8-r4-12m';
export const PEOPLE_RENDER_LIMIT = 25;
export const CAMPAIGN_MONTHS = 12;
export const XIRCLE_MONTHS = Object.freeze([3, 6, 9, 12]);

export const EVENTS = Object.freeze({
  ...legacy.EVENTS,
  RUN_XIRCLE: 'RUN_XIRCLE',
  XLEAD_EXAM: 'XLEAD_EXAM',
  XGEN_EXAM: 'XGEN_EXAM',
  NEW_GAME_PLUS: 'NEW_GAME_PLUS',
});

const CUSTOM_EVENTS = new Set([EVENTS.RUN_XIRCLE, EVENTS.XLEAD_EXAM, EVENTS.XGEN_EXAM, EVENTS.NEW_GAME_PLUS]);

function originFor(person, state, fallback = 'unknown') {
  if (person?.origin?.sourceType) return person.origin;
  const source = person?.source || fallback;
  const labels = {
    known: 'คนที่คุณรู้จัก', referral: 'Referral', content: 'Content', ads: 'Ads',
    event: 'Event / Open House', team: 'ทีมพามา', tutorial: 'Month 1',
  };
  return {
    sourceType: source,
    sourceId: person?.parentId || null,
    sourceName: labels[source] || source,
    createdMonth: Number(person?.createdMonth ?? state?.month ?? 0),
    parentPersonId: person?.parentId || null,
    eventId: person?.eventId || null,
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
  const tier = getRetailTier(personalXV);
  const commission = Math.round(personalXV * tier.rate);
  return {
    ...member,
    origin: originFor(member, state, 'team'),
    personalXV,
    commission,
    monthlyOutput: member?.monthlyOutput ? { ...member.monthlyOutput, personalXV, commission } : member?.monthlyOutput,
  };
}

function normalizeCustomer(customer, state) {
  const satisfaction = satisfactionFor(customer);
  const stable = satisfaction >= 75 && customer.activePlan !== false;
  return {
    ...customer,
    origin: originFor(customer, state, customer.source || 'customer'),
    satisfaction,
    selfDirected: stable ? true : Boolean(customer.selfDirected && satisfaction >= 65),
    customerState: stable
      ? legacy.CUSTOMER_STATES.SELF_DIRECTED
      : satisfaction < 45
        ? legacy.CUSTOMER_STATES.NEEDS_HELP
        : customer.customerState,
  };
}

function uniqueOrganizationPeople(state) {
  const ids = new Set();
  for (const person of [...(state.prospects || []), ...(state.customers || []), ...(state.team || [])]) ids.add(person.personId || person.id);
  return ids.size + Math.max(0, Number(state.organization?.aggregate?.overflowPeople || 0));
}

export function calculateEconomy(state) {
  const personalXV = Math.max(0, Number(state.economy?.personalXV || 0));
  const productSales = Math.max(0, Number(state.economy?.productSales || 0));
  const tier = getRetailTier(personalXV);
  const activeRetail = Math.round(personalXV * tier.rate);
  const directG1 = (state.team || []).filter((member) => member.active && member.parentId === 'player');
  const mentoringBreakdown = directG1.map((member) => {
    const memberXV = Math.max(0, Number(member.personalXV || member.monthlyOutput?.personalXV || 0));
    const retailTier = getRetailTier(memberXV);
    const commission = Math.round(memberXV * retailTier.rate);
    return {
      memberId: member.id,
      name: member.name,
      personalXV: memberXV,
      personalSalesBaht: Number(member.personalSalesBaht || member.monthlyOutput?.personalSalesBaht || 0),
      retailTier,
      commission,
      mentorIncome: Math.round(commission * DIRECT_MENTORING_RULE.rate),
    };
  });
  const mentoringUnlocked = Boolean(state.career?.xleadCertified || state.career?.xgenCertified || ['xlead', 'xgen'].includes(state.rank));
  const mentoring = mentoringUnlocked ? mentoringBreakdown.reduce((sum, item) => sum + item.mentorIncome, 0) : 0;
  const teamXV = Math.max(0, Number(state.economy?.teamXV || 0));
  const teamProductSales = Math.max(0, Number(state.economy?.teamProductSales || 0));
  const tgv = Math.max(personalXV + teamXV, Number(state.organization?.tgv || 0));
  const organizationIncome = state.career?.xgenCertified ? Math.round(tgv * ORGANIZATION_INCOME_RULE.rate) : 0;
  const projectedIncome = activeRetail + mentoring + organizationIncome;
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome ?? state.economy?.receivedIncome ?? 0));
  const currentMonthClosed = Number(state.monthSummaries?.at?.(-1)?.month || -1) === Number(state.month || 0);
  return {
    productSales,
    personalSalesBaht: productSales,
    personalXV,
    tier,
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
    status: INCOME_RULE.status,
  };
}

function addEventLog(state, event, payload) {
  const log = Array.isArray(state.eventLog) ? state.eventLog : [];
  return {
    ...state,
    eventLog: [...log, { month: Number(state.month || 0), event, payload: payload && typeof payload === 'object' ? { ...payload } : {} }].slice(-600),
  };
}

function spend(state, amount, category = 'other') {
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
      playerActions: { ...baseActions, [category]: Number(baseActions[category] || 0) + 1, total: Number(baseActions.total || 0) + 1 },
    },
  };
}

function deterministicRoll(state, event, targetId = '') {
  let hash = Number(state.rngSeed || 1) + Number(state.month || 0) * 131;
  for (const char of `${event}:${targetId}`) hash = (Math.imul(hash ^ char.charCodeAt(0), 16777619)) >>> 0;
  return (hash % 10000) / 10000;
}

export function humanDecisionChance(level, attempt = 0) {
  const base = Math.min(0.97, 0.25 + Math.max(0, Math.min(9, Number(level || 1) - 1)) * 0.08);
  if (attempt >= 2) return 1;
  if (attempt === 1) return Math.min(0.99, base + 0.15);
  return base;
}

function humanDecisionFailure(state, event, payload) {
  const id = payload?.id;
  if (!id) return null;
  const peopleLevel = getSkillLevel(state.skills, event === EVENTS.INVITE_XVISOR ? 'leadership' : 'people');
  const prospect = state.prospects?.find((item) => item.id === id);
  const customer = state.customers?.find((item) => item.id === id);
  const target = prospect || customer;
  if (!target) return null;
  const attempt = Number(target.decisionAttempts || 0);
  if (deterministicRoll(state, event, id) < humanDecisionChance(peopleLevel, attempt)) return null;
  const spent = spend(state, 1, event === EVENTS.INVITE_XVISOR ? 'team' : 'attract');
  if (!spent) return state;
  if (prospect) {
    const prospects = spent.prospects.map((item) => item.id !== id ? item : {
      ...item,
      decisionAttempts: attempt + 1,
      journey: attempt >= 1 ? 'cooldown' : 'waiting',
      nextOfferMonth: Number(state.month || 0) + (attempt >= 1 ? 2 : 1),
      lastContactMonth: state.month,
      status: attempt >= 1 ? 'พักไว้ก่อน · ยังไม่ต้องตาม' : `ขอคิดก่อน · รอเดือน ${Number(state.month || 0) + 1}`,
    });
    return { ...spent, prospects, lastEvent: `${event}_NO`, lastMessage: `${prospect.name} ยังไม่พร้อมตอนนี้ · เกมพักเคสให้ ไม่ต้องตามซ้ำ`, updatedAt: Date.now() };
  }
  const customers = spent.customers.map((item) => item.id !== id ? item : {
    ...item,
    decisionAttempts: attempt + 1,
    referralAsked: event === EVENTS.ASK_REFERRAL ? true : item.referralAsked,
    xvisorInterest: event === EVENTS.INVITE_XVISOR ? false : item.xvisorInterest,
    status: event === EVENTS.ASK_REFERRAL ? 'ยังไม่พร้อมแนะนำเพื่อนตอนนี้' : 'ยังไม่สนใจ X-VISOR ตอนนี้ · ดูแล Routine ต่อ',
  });
  return { ...spent, customers, lastEvent: `${event}_NO`, lastMessage: `${customer.name} ยังไม่พร้อม · ความสัมพันธ์ยังเดินต่อโดยไม่ spam`, updatedAt: Date.now() };
}

function runXircle(state) {
  if (!XIRCLE_MONTHS.includes(Number(state.month || 0)) || state.monthStats?.xircleDone) return state;
  const spent = spend(state, Math.min(2, state.energy), 'team');
  if (!spent) return state;
  const peopleLevel = getSkillLevel(spent.skills, 'people');
  const leadership = getSkillLevel(spent.skills, 'leadership');
  const prospects = [...(spent.prospects || [])].filter((person) => person.journey !== 'dormant');
  const customers = [...(spent.customers || [])];
  const team = [...(spent.team || [])].filter((member) => member.active);
  const invited = prospects.length + customers.length + team.length;
  const attendanceRate = Math.min(0.92, 0.48 + peopleLevel * 0.025 + leadership * 0.018);
  const attended = Math.max(1, Math.round(Math.max(1, invited) * attendanceRate));
  let remaining = attended;
  const nextProspects = spent.prospects.map((person) => {
    if (remaining <= 0 || person.journey === 'dormant') return person;
    remaining -= 1;
    return {
      ...person,
      readiness: Math.min(99, Number(person.readiness || 0) + 16 + peopleLevel),
      trust: Math.min(100, Number(person.trust || 0) + 10),
      journey: ['new', 'scheduled', 'waiting', 'cooldown'].includes(person.journey) ? 'discovery' : person.journey,
      status: '🏕️ The Xircle · พร้อมคุย Next Action',
      origin: originFor(person, spent),
      xircleMomentumUntil: state.month + 2,
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
      status: '🏕️ The Xircle · Momentum สูงขึ้น',
      xircleMomentumUntil: state.month + 2,
    };
  });
  const nextTeam = spent.team.map((member) => {
    if (remaining <= 0 || !member.active) return { ...member, origin: originFor(member, spent, 'team') };
    remaining -= 1;
    return {
      ...member,
      origin: originFor(member, spent, 'team'),
      confidence: Math.min(100, Number(member.confidence || 0) + 12),
      autonomy: Math.min(100, Number(member.autonomy || 0) + 8),
      teamSkill: Math.min(10, Number(member.teamSkill || 1) + 1),
      candidatePipeline: Number(member.candidatePipeline || 0) + Number(member.specialty === 'builder'),
      status: '🏕️ The Xircle · ได้ Momentum ใหม่',
    };
  });
  let next = { ...spent, prospects: nextProspects, customers: nextCustomers, team: nextTeam };
  for (const id of SKILL_IDS) next = addSkillXp(next, id, 3, 'the-xircle');
  const xircleHistory = Array.isArray(next.xircleHistory) ? next.xircleHistory : [];
  return {
    ...next,
    xircleMomentum: { sourceMonth: state.month, expiresAfterMonth: state.month + 2, strength: state.month === 12 ? 2 : 1 },
    xircleHistory: [...xircleHistory, { month: state.month, invited, attended }],
    monthStats: { ...next.monthStats, xircleDone: true },
    sceneReport: { kind: 'the-xircle', invited, attended, messages: [`ชวน ${invited} · มา ${attended}`, 'ทุกคนที่มาได้รับ Momentum ตามบทบาท', '⭐ คุณได้รับ THE XIRCLE BUFF'] },
    lastEvent: EVENTS.RUN_XIRCLE,
    lastMessage: `🏕️ THE XIRCLE เดือน ${state.month} · ${attended} คนได้รับ Momentum`,
    updatedAt: Date.now(),
  };
}

function certifyXlead(state) {
  if (!state.career?.xleadQualified || state.career?.xleadCertified) return state;
  return {
    ...state,
    rank: 'xlead',
    career: { ...state.career, xleadCertified: true, xleadAtMonth: state.month },
    organization: { ...state.organization, mapUnlocked: true },
    milestones: { ...state.milestones, firstXlead: true },
    sceneReport: { kind: 'xlead-exam', passed: true },
    lastEvent: EVENTS.XLEAD_EXAM,
    lastMessage: '🏅 Certified XLEAD · ปลดล็อก ② รายได้จากการพัฒนา Direct G1',
    updatedAt: Date.now(),
  };
}

function certifyXgen(state) {
  const economy = calculateEconomy(state);
  const qualified = economy.tgv >= legacy.XGEN_TGV_TARGET || Number(state.organization?.bestTGV || 0) >= legacy.XGEN_TGV_TARGET;
  if (!qualified || state.career?.xgenCertified) return state;
  return {
    ...state,
    rank: 'xgen',
    career: { ...state.career, xgenQualified: true, xgenCertified: true, xgenAtMonth: state.month },
    organization: { ...state.organization, xgen: true, mapUnlocked: true, endless: false },
    milestones: { ...state.milestones, xgen: true },
    sceneReport: { kind: 'xgen-exam', passed: true, tgv: economy.tgv },
    lastEvent: EVENTS.XGEN_EXAM,
    lastMessage: '🏆 Certified XGEN · ปลดล็อก ③ รายได้จากการบริหาร Organization',
    updatedAt: Date.now(),
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
    runMode: state.runMode || 'FIRST_RUN',
    locked: true,
  };
}

function normalizeClosedMonth(before, after) {
  const oldTotal = Math.max(0, Number(before.economy?.totalIncome ?? before.economy?.receivedIncome ?? 0));
  const econ = calculateEconomy(before);
  const total = oldTotal + econ.projectedIncome;
  const history = (after.economy?.incomeHistory || []).filter((item) => Number(item.month) !== Number(before.month));
  const entry = { month: before.month, channel1: econ.channel1, channel2: econ.channel2, channel3: econ.channel3, channel4: 0, total: econ.projectedIncome, tgv: econ.tgv };
  const summaries = [...(after.monthSummaries || [])];
  const index = summaries.findIndex((item) => Number(item.month) === Number(before.month));
  const summary = {
    ...(index >= 0 ? summaries[index] : {}),
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
    receivedIncomeTotal: total,
  };
  if (index >= 0) summaries[index] = summary; else summaries.push(summary);
  return {
    ...after,
    rank: before.career?.xgenCertified ? 'xgen' : before.career?.xleadCertified ? 'xlead' : before.rank === 'candidate' ? 'candidate' : 'xvisor',
    organization: { ...after.organization, xgen: Boolean(before.career?.xgenCertified), endless: false, breakawayVolume: 0, tgv: econ.tgv, previousTGV: econ.tgv, bestTGV: Math.max(Number(before.organization?.bestTGV || 0), econ.tgv) },
    milestones: { ...after.milestones, xgen: Boolean(before.career?.xgenCertified) },
    economy: { ...after.economy, totalIncome: total, receivedIncome: total, incomeHistory: [...history, entry].sort((a, b) => Number(a.month) - Number(b.month)) },
    monthSummaries: summaries,
    stage: after.stage === legacy.STAGES.XGEN_MILESTONE && !before.career?.xgenCertified ? legacy.STAGES.MONTH_CLOSED : after.stage,
  };
}

function aggregateFromState(state, overflowPeople = 0) {
  const team = state.team || [];
  const activeCustomers = (state.customers || []).filter((item) => item.activePlan !== false).length + team.reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  return {
    xvisorCount: Math.max(team.length, Number(state.organization?.aggregate?.xvisorCount || 0)),
    xleadCount: Math.max(team.filter((member) => member.rank === 'xlead').length, Number(state.organization?.aggregate?.xleadCount || 0)),
    activeCustomers: Math.max(activeCustomers, Number(state.organization?.aggregate?.activeCustomers || 0)),
    candidateCount: Math.max(0, team.reduce((sum, member) => sum + Math.max(0, Number(member.candidatePipeline || 0)), 0)),
    overflowPeople: Math.max(overflowPeople, Number(state.organization?.aggregate?.overflowPeople || 0)),
  };
}

function simulateEndgameMonth(state) {
  const nextMonth = Number(state.month || CAMPAIGN_MONTHS) + 1;
  const previousTgv = Math.max(1, Number(state.organization?.previousTGV || state.organization?.tgv || state.campaignScore?.bestTgv || 1));
  const aggregate = aggregateFromState(state);
  const scalePenalty = Math.min(0.055, Math.log10(Math.max(1, previousTgv / 1000000)) * 0.018);
  const leaderQuality = Math.min(0.025, aggregate.xleadCount * 0.0015);
  const wave = (((Number(state.rngSeed || 1) + nextMonth * 17) % 9) - 4) * 0.003;
  const growthRate = Math.max(-0.015, Math.min(0.095, 0.055 + leaderQuality - scalePenalty + wave));
  const tgv = Math.max(0, Math.round(previousTgv * (1 + growthRate)));
  const customerGrowth = Math.max(0, Math.round(Math.sqrt(Math.max(1, aggregate.activeCustomers)) * (0.7 + aggregate.xleadCount * 0.04)));
  const activeCustomers = Math.max(1, aggregate.activeCustomers + customerGrowth - Math.round(aggregate.activeCustomers * 0.012));
  const newXvisors = Math.max(0, Math.min(6, Math.round(Math.sqrt(Math.max(1, activeCustomers)) / 10 + aggregate.xleadCount * 0.08) - Math.floor(aggregate.xvisorCount / 90)));
  const xvisorCount = Math.max(aggregate.xvisorCount, aggregate.xvisorCount + newXvisors);
  const xleadGrowth = xvisorCount >= 12 ? Math.max(0, Math.min(2, Math.floor((xvisorCount - aggregate.xleadCount * 8) / 35))) : 0;
  const xleadCount = Math.max(aggregate.xleadCount, aggregate.xleadCount + xleadGrowth);
  const channel3 = state.career?.xgenCertified ? Math.round(tgv * ORGANIZATION_INCOME_RULE.rate) : 0;
  const directMentoring = Math.max(0, Math.round(Number(state.campaignScore?.bestMonthlyIncome || 0) * 0.18));
  const personalRecurring = Math.round((state.customers || []).filter((item) => satisfactionFor(item) >= 75).length * TUTORIAL_OFFER.xv * 0.20);
  const monthlyIncome = personalRecurring + directMentoring + channel3;
  const totalIncome = Math.max(0, Number(state.economy?.totalIncome || 0)) + monthlyIncome;
  const entry = { month: nextMonth, channel1: personalRecurring, channel2: directMentoring, channel3, channel4: 0, total: monthlyIncome, tgv };
  const story = newXvisors ? `🌱 ทีมสร้าง X-VISOR ใหม่ ${newXvisors} คนจาก Candidate Pipeline` : xleadGrowth ? `👑 มี XLEAD ใหม่ ${xleadGrowth} คน` : `❤️ ลูกค้า active ${activeCustomers.toLocaleString('th-TH')} คน · ระบบยังเดินต่อ`;
  return {
    ...state,
    stage: legacy.STAGES.MANAGEMENT,
    phase: 'organization',
    month: nextMonth,
    energy: 0,
    organizationMode: true,
    organization: { ...state.organization, endless: false, tgv, previousTGV: tgv, bestTGV: Math.max(Number(state.organization?.bestTGV || 0), tgv), aggregate: { ...aggregate, activeCustomers, xvisorCount, xleadCount } },
    economy: { ...state.economy, personalXV: 0, teamXV: tgv, productSales: 0, teamProductSales: 0, totalIncome, receivedIncome: totalIncome, incomeHistory: [...(state.economy?.incomeHistory || []), entry], lastTransaction: null },
    monthStats: { ...legacy.makeMonthStats(), teamActions: Math.round(activeCustomers * 2.6), teamCycleDone: true },
    lastMessage: `🏙️ เดือน ${nextMonth} · TGV ${tgv.toLocaleString('th-TH')} XV · ${story}`,
    sceneReport: { kind: 'organization', tgv, monthlyIncome, activeCustomers, xvisorCount, xleadCount, story },
    updatedAt: Date.now(),
  };
}

function compressState(state, originalTeamCount = null) {
  const fullTeam = Array.isArray(state.team) ? state.team : [];
  const totalCount = originalTeamCount ?? fullTeam.length;
  if (fullTeam.length <= 80 && Number(state.month || 0) <= CAMPAIGN_MONTHS) return state;
  const selected = [];
  const seen = new Set();
  const push = (member) => { if (!member || seen.has(member.id) || selected.length >= 60) return; seen.add(member.id); selected.push(member); };
  fullTeam.filter((member) => member.parentId === 'player').forEach(push);
  fullTeam.filter((member) => member.rank === 'xlead').forEach(push);
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
    prospects: (state.prospects || []).map((item) => ({ ...item, origin: originFor(item, state, item.source || 'prospect') })),
    team: (state.team || []).map((item) => normalizeTeamMember(item, state)),
    career: {
      ...state.career,
      xleadQualified: Boolean(state.career?.xleadQualified),
      xleadCertified: Boolean(state.career?.xleadCertified || state.rank === 'xlead' || state.rank === 'xgen'),
      xgenQualified: Boolean(state.career?.xgenQualified || Number(state.organization?.bestTGV || 0) >= legacy.XGEN_TGV_TARGET),
      xgenCertified: Boolean(state.career?.xgenCertified),
    },
    organization: { ...state.organization, breakawayVolume: 0, endless: false },
  };
  if (previous && previous.career && !previous.career.xgenCertified && state.rank === 'xgen') {
    next = { ...next, rank: previous.career.xleadCertified ? 'xlead' : 'xvisor', organization: { ...next.organization, xgen: false }, milestones: { ...next.milestones, xgen: false } };
  }
  const econ = calculateEconomy(next);
  next = { ...next, organization: { ...next.organization, tgv: econ.tgv, breakawayVolume: 0 }, economy: { ...next.economy, breakawayVolume: 0 } };
  if (next.month >= CAMPAIGN_MONTHS && next.monthSummaries?.some((item) => Number(item.month) === CAMPAIGN_MONTHS) && !next.campaignScore?.locked) next = { ...next, campaignComplete: true, campaignScore: campaignScoreFor(next) };
  if (Number(next.month || 0) > CAMPAIGN_MONTHS || next.organizationMode) {
    next = compressState(next);
    next = { ...next, organizationMode: true, phase: 'organization', energy: 0, stage: legacy.STAGES.MANAGEMENT };
  } else if ((next.team || []).length > 80) next = compressState(next);
  return next;
}

export function makeInitialState(options = {}) {
  const base = legacy.makeInitialState(options);
  return normalizeState({ ...base, runMode: options.newGamePlus ? 'NEW_GAME_PLUS' : 'FIRST_RUN', eventLog: [], xircleHistory: [], xircleMomentum: null, campaignComplete: false, campaignScore: null, organizationMode: false });
}

export function makeNewGamePlusState(options = {}) {
  const base = makeInitialState({ ...options, newGamePlus: true });
  return normalizeState({ ...base, stage: legacy.STAGES.M1_EMPTY, phase: 'management', month: 1, energy: legacy.MAX_ENERGY, rank: 'xvisor', milestones: { ...base.milestones, certified: true }, career: { ...base.career, certificationPreviouslyPassed: true }, lastMessage: '⚡ NEW GAME+ · ข้าม PRE-SEASON และเริ่ม Month 1 แบบอิสระแล้ว' });
}

export function canDispatch(state, event) {
  if (CUSTOM_EVENTS.has(event)) return true;
  if (state.organizationMode && event === EVENTS.END_MONTH) return true;
  return legacy.canDispatch(state, event);
}

export function getBestNextActions(state, limit = 3) {
  if (state.organizationMode) return [{ type: 'organization-pass', event: EVENTS.END_MONTH, label: '▶ ผ่านไปอีก 1 เดือน', cost: 0, score: 1000 }];
  const actions = [];
  if (XIRCLE_MONTHS.includes(Number(state.month || 0)) && !state.monthStats?.xircleDone) {
    const eligible = (state.prospects || []).filter((p) => p.journey !== 'dormant').length + (state.customers || []).length + (state.team || []).filter((m) => m.active).length;
    actions.push({ type: 'the-xircle', event: EVENTS.RUN_XIRCLE, label: `🏕️ THE XIRCLE · ชวนได้ ${eligible} คน`, cost: Math.min(2, state.energy), score: 180 });
  }
  if (state.career?.xleadQualified && !state.career?.xleadCertified) actions.push({ type: 'xlead-exam', event: EVENTS.XLEAD_EXAM, label: '🎓 เข้าสอบ XLEAD · ปลดล็อก ②', cost: 0, score: 175 });
  const economy = calculateEconomy(state);
  if ((economy.tgv >= legacy.XGEN_TGV_TARGET || Number(state.organization?.bestTGV || 0) >= legacy.XGEN_TGV_TARGET) && !state.career?.xgenCertified) actions.push({ type: 'xgen-exam', event: EVENTS.XGEN_EXAM, label: '🎓 เข้าสอบ XGEN · ปลดล็อก ③', cost: 0, score: 190 });
  const legacyActions = legacy.getBestNextActions(state, Math.max(6, limit + 3)).map((item) => {
    if (!item.targetId) return item;
    const target = [...(state.prospects || []), ...(state.customers || []), ...(state.team || [])].find((person) => person.id === item.targetId);
    if (!target?.name || String(item.label || '').includes(target.name)) return item;
    return { ...item, label: `${item.label} · ${target.name}` };
  });
  actions.push(...legacyActions.filter((item) => item.type !== 'skill' || getSkillLevel(state.skills, item.payload?.skill) < 10));
  if (!actions.some((item) => item.event === EVENTS.END_MONTH)) actions.push({ type: 'end-month', event: EVENTS.END_MONTH, label: '🌙 จบเดือน', cost: 0, score: 2 });
  const unique = new Map();
  actions.forEach((item) => { const key = `${item.event || item.type}:${item.targetId || item.payload?.id || ''}`; if (!unique.has(key) || Number(item.score || 0) > Number(unique.get(key).score || 0)) unique.set(key, item); });
  return [...unique.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, Math.max(1, limit));
}

function prepareLegacyState(state, event) {
  if (event !== EVENTS.START_NEXT_MONTH) return state;
  return {
    ...state,
    customers: (state.customers || []).map((customer) => {
      const satisfaction = satisfactionFor(customer);
      const stable = satisfaction >= 75 && customer.activePlan !== false;
      return { ...customer, satisfaction, selfDirected: stable, customerState: stable ? legacy.CUSTOMER_STATES.SELF_DIRECTED : customer.customerState };
    }),
  };
}

export function reduceGame(currentState, event, payload = {}) {
  let state = normalizeState(currentState);
  if (!canDispatch(state, event)) return state;
  if (state.organizationMode && event === EVENTS.END_MONTH) return addEventLog(simulateEndgameMonth(state), event, payload);
  if (event === EVENTS.RUN_XIRCLE) return addEventLog(normalizeState(runXircle(state), state), event, payload);
  if (event === EVENTS.XLEAD_EXAM) return addEventLog(normalizeState(certifyXlead(state), state), event, payload);
  if (event === EVENTS.XGEN_EXAM) return addEventLog(normalizeState(certifyXgen(state), state), event, payload);
  if (event === EVENTS.NEW_GAME_PLUS) return addEventLog(makeNewGamePlusState({ seed: state.rngSeed }), event, payload);
  if ([EVENTS.OFFER_PROSPECT, EVENTS.FOLLOW_UP_DECISION, EVENTS.ASK_REFERRAL, EVENTS.INVITE_XVISOR].includes(event)) {
    const failed = humanDecisionFailure(state, event, payload);
    if (failed) return addEventLog(normalizeState(failed, state), event, payload);
  }
  if (event === EVENTS.START_NEXT_MONTH && (state.campaignComplete || Number(state.month || 0) >= CAMPAIGN_MONTHS)) {
    const endgame = simulateEndgameMonth({ ...state, organizationMode: true, energy: 0, campaignComplete: true, campaignScore: state.campaignScore || campaignScoreFor(state) });
    return addEventLog(normalizeState(endgame, state), event, payload);
  }
  const prepared = prepareLegacyState(state, event);
  let next = legacy.reduceGame(prepared, event, payload);
  if (event === EVENTS.END_MONTH && next !== prepared) next = normalizeClosedMonth(prepared, next);
  next = normalizeState(next, prepared);
  if (event === EVENTS.END_MONTH && Number(prepared.month || 0) === CAMPAIGN_MONTHS) next = { ...next, campaignComplete: true, campaignScore: campaignScoreFor(next), lastMessage: '🏆 12 เดือนจบแล้ว · High Score ถูกล็อก และคุณเลือกเล่น Organization Mode ต่อได้' };
  if (event === EVENTS.START_NEXT_MONTH && Number(next.month || 0) === 3 && !next.xircleAnnounced) next = { ...next, xircleAnnounced: true, lastMessage: '🏕️ THE XIRCLE มาแล้ว · แคมป์ 2 วัน 1 คืนในเดือน 3 · 6 · 9 · 12', sceneReport: { kind: 'xircle-announcement', schedule: XIRCLE_MONTHS } };
  return addEventLog(next, event, payload);
}

export function serializeState(state) {
  return legacy.serializeState(normalizeState(state));
}

export function parseSavedState(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const originalTeamCount = Array.isArray(value.team) ? value.team.length : 0;
    if (originalTeamCount > 120) {
      value.organization = { ...(value.organization || {}), aggregate: { ...(value.organization?.aggregate || {}), xvisorCount: Math.max(originalTeamCount, Number(value.organization?.aggregate?.xvisorCount || 0)), overflowPeople: Math.max(0, originalTeamCount - 60) } };
      value.team = value.team.slice(0, 80);
    }
    if (Number(value.month || 0) > CAMPAIGN_MONTHS) value.energy = 0;
    const parsed = legacy.parseSavedState(JSON.stringify(value));
    if (!parsed) return null;
    let next = normalizeState(parsed);
    if (originalTeamCount > 120) next = compressState(next, originalTeamCount);
    if (Number(next.month || 0) > CAMPAIGN_MONTHS) next = { ...next, campaignComplete: true, campaignScore: next.campaignScore || campaignScoreFor(next), organizationMode: true, energy: 0, stage: legacy.STAGES.MANAGEMENT, phase: 'organization' };
    return next;
  } catch {
    return null;
  }
}
