export * from './game-data-v9.js?v=1.0-core';
import * as v9 from './game-data-v9.js?v=1.0-core';
import { addSkillXp, getSkillLevel, makeTeamMember } from './game-progression-v8.js?v=1.0-core';
import { createPerson } from './game-people.js';
import { getRetailTier } from './game-commercial-config-v8.js?v=1.0-core';

export const GAME_VERSION = 'X-VISOR QUEST 1.0';
export const RELEASE_VERSION = '1.0';
export const V1_SAVE_VERSION = '1.0';
export const V1_SCORE_VERSION = '1.0';
export const ORGANIZATION_START_MONTH = 13;
export const ORGANIZATION_END_MONTH = 24;
export const ORGANIZATION_XIRCLE_MONTHS = Object.freeze([15, 18, 21, 24]);
export const TRAVEL_DESTINATIONS = Object.freeze([
  'Tokyo', 'Seoul', 'Shanghai', 'Taipei', 'Paris', 'Dubai', 'Santorini', 'London', 'Cruise',
]);

export const EVENTS = Object.freeze({
  ...v9.EVENTS,
  FAST_TRACK_FULL_START: 'FAST_TRACK_FULL_START',
});

const FULL_START_XV = 9_495;
const FULL_START_BAHT = 12_480;
const ROUTINEX_XV = 7_000;
const ROUTINEX_BAHT = 7_490;

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

function successCaseCount(state) {
  const customers = (state.customers || []).filter((customer) => customer.successCase || customer.result === 'ดีขึ้น').length;
  return Math.max(customers, Number(state.career?.totalSuccessCases || 0));
}

export function canOfferFullSetFastLane(state, person) {
  if (!person || state.organizationMode || state.runComplete) return false;
  const people = getSkillLevel(state.skills, 'people');
  const knowledge = getSkillLevel(state.skills, 'knowledge');
  const momentum = Number(state.monthStats?.successCases || 0) + Number(state.monthStats?.sales || 0);
  return people >= 6
    && knowledge >= 6
    && successCaseCount(state) >= 2
    && Number(person.trust || 0) >= 58
    && Number(person.readiness || 0) >= 62
    && (momentum >= 1 || Number(state.month || 0) >= 4);
}

function fastTrackEligible(state, person) {
  if (!person || state.organizationMode || state.runComplete) return false;
  if (person.journey !== 'recommendation' || !person.routinePlan) return false;
  if (person.routinePlan.id !== 'all' || !person.routinePlan.fastLane) return false;
  return canOfferFullSetFastLane(state, person);
}

export function getFastTrackChance(state, person) {
  if (!fastTrackEligible(state, person)) return 0;
  const people = getSkillLevel(state.skills, 'people');
  const knowledge = getSkillLevel(state.skills, 'knowledge');
  const capability = (people - 6) * 0.055 + (knowledge - 6) * 0.045;
  const trust = Math.max(0, Number(person.trust || 0) - 58) * 0.006;
  const readiness = Math.max(0, Number(person.readiness || 0) - 62) * 0.005;
  const proof = Math.min(0.14, successCaseCount(state) * 0.025);
  return clamp(0.34 + capability + trust + readiness + proof, 0.28, 0.86);
}

function runFullSetRoutineChoice(state, event, payload = {}) {
  if (payload.planId !== 'all') return null;
  const person = (state.prospects || []).find((item) => item.id === state.selectedPersonId);
  if (!person || !canOfferFullSetFastLane(state, person)) {
    return releaseState(v9.reduceGame(state, event, payload));
  }
  const based = v9.reduceGame(state, event, { ...payload, planId: 'fit' });
  const prospects = (based.prospects || []).map((item) => item.id !== person.id ? item : {
    ...item,
    journey: 'recommendation',
    status: '⚡ ครบชุดเหมาะกับจังหวะนี้ · พร้อมคุยทางลัดเข้า Xcademy',
    trust: Math.min(100, Number(item.trust || 0) + 5),
    routinePlan: {
      id: 'all',
      quality: 'fit',
      products: ['gus', 'protein-hmb', 'vita-matrix', 'astamega'],
      includesControl: true,
      fastLane: true,
    },
  });
  return releaseState(v9.refreshMissions({
    ...based,
    prospects,
    selectedPersonId: person.id,
    lastEvent: event,
    lastMessage: `⚡ ${person.name} เหมาะกับครบชุด · เปิดทางลัด Full Start → Xcademy → สอบ X-VISOR`,
    updatedAt: Date.now(),
  }));
}

function openRoutineWithFastLaneChoice(state, payload = {}) {
  const person = (state.prospects || []).find((item) => item.id === payload.id);
  if (!canOfferFullSetFastLane(state, person)) return null;
  return releaseState({
    ...state,
    selectedPersonId: person.id,
    stage: v9.STAGES.MANAGEMENT_ROUTINE,
    lastEvent: EVENTS.OPEN_MANAGEMENT_ROUTINE,
    lastMessage: `⚡ ${person.name} พร้อมพอให้เลือกได้ทั้ง เริ่มจาก C / ดู ABCD / ครบชุด`,
    updatedAt: Date.now(),
  });
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
    fullSetFastLane: true,
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
    lastMessage: `✅ ${person.name} เริ่มครบชุดแล้ว · ⚡ ขั้นถัดไป Xcademy แล้วเข้าสอบ X-VISOR`,
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
    pausedCustomersThisMonth: Number(previous?.pausedCustomersThisMonth || 0),
    stoppedCustomersThisMonth: Number(previous?.stoppedCustomersThisMonth || 0),
    comebackCustomersThisMonth: Number(previous?.comebackCustomersThisMonth || 0),
    churnedCustomersThisMonth: Number(previous?.churnedCustomersThisMonth || 0),
    netCustomersThisMonth: Number(previous?.netCustomersThisMonth || 0),
    referralsThisMonth: Number(previous?.referralsThisMonth || 0),
    candidatesThisMonth: Number(previous?.candidatesThisMonth || 0),
    newXvisorsThisMonth: Number(previous?.newXvisorsThisMonth || 0),
    slowedMembersThisMonth: Number(previous?.slowedMembersThisMonth || 0),
    pausedMembersThisMonth: Number(previous?.pausedMembersThisMonth || 0),
    quitMembersThisMonth: Number(previous?.quitMembersThisMonth || 0),
    comebackMembersThisMonth: Number(previous?.comebackMembersThisMonth || 0),
    netXvisorsThisMonth: Number(previous?.netXvisorsThisMonth || 0),
    newXleadsThisMonth: Number(previous?.newXleadsThisMonth || 0),
    netXleadsThisMonth: Number(previous?.netXleadsThisMonth || 0),
    cultureScore: Number(previous?.cultureScore || state.organization?.cultureScore || 58),
  };
}

function stochasticCount(state, key, expected, salt = 0) {
  const safe = Math.max(0, Number(expected || 0));
  const whole = Math.floor(safe);
  return whole + Number(deterministicRoll(state, key, salt) < safe - whole);
}

function teamStatus(member) {
  if (member.organizationStatus) return member.organizationStatus;
  return member.active === false ? 'paused' : 'active';
}

function simulatePersonalCustomerCycle(state, month, eventEffect) {
  const metrics = { repeat: 0, paused: 0, stopped: 0, comeback: 0 };
  const customers = (state.customers || []).map((customer, index) => {
    const key = customer.personId || customer.id || `personal-${index}`;
    const status = customer.organizationCustomerState || (customer.activePlan === false ? 'paused' : 'active');
    const roll = deterministicRoll(state, key, 300 + month + index);
    if (status === 'active') {
      const care = clamp(Number(customer.satisfaction || customer.adherence || 70) / 100, 0.35, 1);
      const stopChance = clamp(0.035 - care * 0.014 - eventEffect.retention * 0.35, 0.008, 0.05);
      const pauseChance = clamp(0.105 - care * 0.045 - eventEffect.retention, 0.025, 0.14);
      if (roll < stopChance) {
        metrics.stopped += 1;
        return { ...customer, activePlan: false, organizationCustomerState: 'stopped', status: 'หยุด Routine ใน Year 2', stoppedMonth: month };
      }
      if (roll < stopChance + pauseChance) {
        metrics.paused += 1;
        return { ...customer, activePlan: false, organizationCustomerState: 'paused', status: 'พัก Routine ชั่วคราว', pausedMonth: month };
      }
      metrics.repeat += 1;
      return { ...customer, activePlan: true, organizationCustomerState: 'active', lastReorderMonth: month, status: 'ใช้ Routine ต่อเนื่อง' };
    }
    const comebackChance = status === 'paused'
      ? 0.14 + eventEffect.comeback
      : 0.025 + eventEffect.comeback * 0.35;
    if (roll < comebackChance) {
      metrics.comeback += 1;
      metrics.repeat += 1;
      return { ...customer, activePlan: true, organizationCustomerState: 'active', lastReorderMonth: month, status: 'กลับมาใช้ Routine อีกครั้ง', comebackMonth: month };
    }
    return { ...customer, activePlan: false, organizationCustomerState: status };
  });
  return { customers, metrics };
}

function organizationEventEffect(state, month) {
  const xcircle = ORGANIZATION_XIRCLE_MONTHS.includes(Number(month));
  const carry = !xcircle && Number(state.xircleMomentum?.expiresAfterMonth || 0) >= Number(month);
  return {
    xcircle,
    carry,
    retention: xcircle ? 0.07 : carry ? 0.028 : 0,
    referral: xcircle ? 0.10 : carry ? 0.035 : 0,
    comeback: xcircle ? 0.34 : carry ? 0.12 : 0,
    certification: xcircle ? 0.18 : carry ? 0.06 : 0,
  };
}

function createOrganizationMembers(state, month, plans) {
  let nextSeed = Number(state.rngSeed || 1);
  let nextPersonId = Number(state.nextPersonId || 1);
  let usedNames = [...(state.usedNames || [])];
  const members = [];
  for (const [index, plan] of plans.entries()) {
    const created = createPerson({ seed: nextSeed, usedNames, source: 'team', index: nextPersonId });
    nextSeed = created.nextSeed;
    nextPersonId += 1;
    usedNames = [...usedNames, created.person.name];
    const member = makeTeamMember({
      ...created.person,
      origin: {
        sourceType: 'organization-candidate-pipeline',
        sourceId: plan.parentId,
        sourceName: `ทีมของ ${plan.parentName}`,
        createdMonth: month,
        parentPersonId: plan.parentId,
        eventId: `ORG_CERTIFICATION_M${month}`,
      },
    }, state, {
      id: `member-org-${month}-${nextPersonId}-${index}`,
      parentId: plan.parentId,
      generation: plan.generation,
    });
    members.push({
      ...member,
      active: true,
      organizationStatus: 'active',
      certifiedMonth: month,
      confidence: Math.max(48, Number(member.confidence || 0)),
      autonomy: Math.max(38, Number(member.autonomy || 0)),
      teamSkill: Math.max(2, Number(member.teamSkill || 0)),
      customers: 0,
      pausedCustomers: 0,
      candidatePipeline: 0,
      status: `ผ่าน Xcademy ×4 และสอบเป็น X-VISOR ในเดือน ${month}`,
    });
  }
  return { members, nextSeed, nextPersonId, usedNames };
}

function simulateOrganizationOperations(state, month) {
  const leadership = getSkillLevel(state.skills, 'leadership');
  const effect = organizationEventEffect(state, month);
  const priorCulture = clamp(Number(state.organization?.cultureScore || 58), 35, 92);
  const activeBefore = uniqueTeamCount(state);
  const xleadsBefore = xleadCount(state);
  const openHousePeople = stochasticCount(
    state,
    `open-house-${month}`,
    2.4 + Math.sqrt(Math.max(1, activeBefore)) * 1.1 + xleadsBefore * 0.55 + (effect.xcircle ? 2.2 : 0),
    401,
  );
  const personal = simulatePersonalCustomerCycle(state, month, effect);
  const metrics = {
    newPeople: openHousePeople,
    newCustomers: 0,
    repeatCustomers: personal.metrics.repeat,
    pausedCustomers: personal.metrics.paused,
    stoppedCustomers: personal.metrics.stopped,
    comebackCustomers: personal.metrics.comeback,
    referrals: 0,
    candidates: 0,
    slowedMembers: 0,
    pausedMembers: 0,
    quitMembers: 0,
    comebackMembers: 0,
  };
  let teamXV = 0;
  let teamProductSales = 0;
  let teamActions = 0;
  const activeDivisor = Math.max(1, activeBefore);
  let team = (state.team || []).map((original, index) => {
    const key = original.id || original.personId || `member-${index}`;
    const previousStatus = teamStatus(original);
    const leader = original.rank === 'xlead';
    const transitionRoll = deterministicRoll(state, key, 500 + month + index);
    let status = previousStatus;
    if (previousStatus === 'paused' || previousStatus === 'inactive') {
      const chance = (previousStatus === 'paused' ? 0.16 : 0.035)
        + effect.comeback * (previousStatus === 'paused' ? 1 : 0.35)
        + (leader ? 0.04 : 0)
        + leadership * 0.004;
      if (transitionRoll < chance) {
        status = 'active';
        metrics.comebackMembers += 1;
      }
    } else {
      const strain = previousStatus === 'slow' ? 0.055 : 0;
      const quitChance = clamp((leader ? 0.006 : 0.018) + strain * 0.25 - effect.retention * 0.18 - leadership * 0.0007, 0.002, 0.04);
      const pauseChance = clamp((leader ? 0.032 : 0.072) + strain - effect.retention * 0.52 - priorCulture * 0.00028, 0.012, 0.13);
      const slowChance = clamp((leader ? 0.07 : 0.14) + Math.max(0, 58 - priorCulture) * 0.002, 0.05, 0.2);
      if (transitionRoll < quitChance) {
        status = 'inactive';
        metrics.quitMembers += 1;
      } else if (transitionRoll < quitChance + pauseChance) {
        status = 'paused';
        metrics.pausedMembers += 1;
      } else if (transitionRoll < quitChance + pauseChance + slowChance) {
        status = 'slow';
        metrics.slowedMembers += 1;
      } else {
        status = 'active';
      }
    }

    const active = status === 'active' || status === 'slow';
    const previousCustomers = Math.max(0, Number(original.customers || 0));
    const previousPaused = Math.max(0, Number(original.pausedCustomers || 0));
    if (!active) {
      const recoverable = stochasticCount(state, `${key}-handoff`, previousCustomers * (status === 'paused' ? 0.58 : 0.22), 601 + month);
      metrics.pausedCustomers += recoverable;
      metrics.stoppedCustomers += Math.max(0, previousCustomers - recoverable);
      return {
        ...original,
        active: false,
        organizationStatus: status,
        customers: 0,
        pausedCustomers: previousPaused + recoverable,
        personalXV: 0,
        personalSalesBaht: 0,
        commission: 0,
        monthlyOutput: { actions: 0, selfUse: 0, newPeople: 0, customers: 0, newStarts: 0, reorders: 0, referrals: 0, candidates: 0, personalSalesBaht: 0, personalXV: 0, commission: 0 },
        status: status === 'paused' ? 'พักงานชั่วคราว · ยังมีโอกาสกลับมา' : 'หยุดทำในช่วงนี้',
        pausedMonth: month,
      };
    }

    const activityFactor = status === 'slow' ? 0.58 : 1;
    const careBonus = original.specialty === 'care' ? 0.075 : original.specialty === 'balanced' ? 0.03 : 0;
    const salesBonus = original.specialty === 'sales' ? 0.24 : original.specialty === 'balanced' ? 0.1 : 0;
    const builderBonus = original.specialty === 'builder' ? 0.4 : original.specialty === 'balanced' ? 0.16 : 0;
    const teamSkill = clamp(Number(original.teamSkill || 1), 1, 10);
    const confidence = clamp(Number(original.confidence || 45), 20, 100);
    const retentionRate = clamp(0.68 + careBonus + teamSkill * 0.014 + priorCulture * 0.00065 + effect.retention, 0.62, 0.94);
    const continued = stochasticCount(state, `${key}-retain`, previousCustomers * retentionRate * activityFactor, 620 + month);
    const lost = Math.max(0, previousCustomers - continued);
    const pausedFromLoss = stochasticCount(state, `${key}-pause-customer`, lost * (effect.xcircle ? 0.78 : 0.62), 640 + month);
    const stoppedFromLoss = Math.max(0, lost - pausedFromLoss);
    const recovered = stochasticCount(state, `${key}-customer-comeback`, previousPaused * (0.11 + effect.comeback * 0.72), 660 + month);
    const scaleDamping = 1 / (1 + Math.max(0, activeBefore - 8) / 70);
    const openHouseShare = openHousePeople / activeDivisor;
    const startExpected = (0.18 + teamSkill * 0.052 + confidence * 0.003 + salesBonus + openHouseShare * 0.12 + (effect.xcircle ? 0.16 : 0)) * activityFactor * scaleDamping;
    const newStarts = stochasticCount(state, `${key}-new-start`, startExpected, 680 + month);
    const repeat = continued + recovered;
    const referrals = stochasticCount(state, `${key}-referral`, (repeat + newStarts) * (0.035 + careBonus * 0.35 + effect.referral), 700 + month);
    const candidateExpected = referrals * 0.45 + newStarts * 0.16 + builderBonus + openHouseShare * 0.07 + (effect.xcircle ? 0.18 : 0);
    const candidateGain = stochasticCount(state, `${key}-candidate`, candidateExpected, 720 + month);
    const selfUse = status === 'slow' ? Number(deterministicRoll(state, key, 740 + month) > 0.18) : 1;
    const personalXV = selfUse * ROUTINEX_XV + repeat * ROUTINEX_XV + newStarts * FULL_START_XV;
    const personalSalesBaht = selfUse * ROUTINEX_BAHT + repeat * ROUTINEX_BAHT + newStarts * FULL_START_BAHT;
    const tier = getRetailTier(personalSalesBaht);
    const commission = Math.round(personalSalesBaht * Number(tier.rate || 0));
    const actions = Math.max(1, Math.round((newStarts + referrals + Math.sqrt(Math.max(0, repeat))) * activityFactor));
    metrics.newCustomers += newStarts;
    metrics.repeatCustomers += repeat;
    metrics.pausedCustomers += pausedFromLoss;
    metrics.stoppedCustomers += stoppedFromLoss;
    metrics.comebackCustomers += recovered;
    metrics.referrals += referrals;
    metrics.candidates += candidateGain;
    teamXV += personalXV;
    teamProductSales += personalSalesBaht;
    teamActions += actions;
    return {
      ...original,
      active: true,
      organizationStatus: status,
      confidence: Math.min(100, confidence + (effect.xcircle ? 7 : 2) + leadership * 0.25),
      autonomy: Math.min(100, Number(original.autonomy || 30) + (effect.xcircle ? 5 : 1) + leadership * 0.18),
      teamSkill: Math.min(10, teamSkill + Number((month + index + leadership) % 4 === 0)),
      customers: continued + recovered + newStarts,
      pausedCustomers: Math.max(0, previousPaused - recovered) + pausedFromLoss,
      stoppedCustomers: Number(original.stoppedCustomers || 0) + stoppedFromLoss,
      candidatePipeline: Math.max(0, Number(original.candidatePipeline || 0) + candidateGain),
      referrals: Number(original.referrals || 0) + referrals,
      personalXV,
      personalSalesBaht,
      commission,
      totalIncome: Number(original.totalIncome || 0) + commission,
      lastSelfUseMonth: selfUse ? month : original.lastSelfUseMonth,
      xcademyVisits: Number(original.xcademyVisits || original.centerVisits || 0) + 4,
      openHouseVisits: Number(original.openHouseVisits || original.goodLuckVisits || 0) + 1,
      leaderReadiness: Math.min(100, Number(original.leaderReadiness || 0) + candidateGain * 4 + leadership * 0.5 + (effect.xcircle ? 6 : 1)),
      monthlyOutput: { actions, selfUse, newPeople: newStarts + referrals, customers: newStarts, newStarts, reorders: repeat, referrals, candidates: candidateGain, personalSalesBaht, personalXV, commission },
      status: status === 'slow'
        ? `เดือนช้าลง · ${newStarts} ลูกค้าใหม่ · ${repeat} ใช้ต่อ`
        : effect.xcircle
          ? `🏕️ The Xircle เติมพลัง · ${recovered} ลูกค้ากลับมา`
          : `${newStarts} ลูกค้าใหม่ · ${repeat} ใช้ต่อ · Pipeline ${Math.max(0, Number(original.candidatePipeline || 0) + candidateGain)}`,
    };
  });

  const certificationCapacity = Math.max(1, Math.min(6, 1 + xleadsBefore + Math.floor(activeBefore / 15)));
  const plans = [];
  team = team.map((member, index) => {
    if (!member.active || plans.length >= certificationCapacity || Number(member.candidatePipeline || 0) < 4) return member;
    const chance = clamp(0.42 + leadership * 0.025 + Number(member.teamSkill || 1) * 0.02 + effect.certification, 0.42, 0.9);
    if (deterministicRoll(state, member.id, 800 + month + index) >= chance) return member;
    plans.push({ parentId: member.id, parentName: member.name, generation: Number(member.generation || 1) + 1 });
    return { ...member, candidatePipeline: Math.max(0, Number(member.candidatePipeline || 0) - 4) };
  });
  const created = createOrganizationMembers(state, month, plans);
  team = [...team, ...created.members];

  let promoted = 0;
  const promotionCapacity = effect.xcircle ? 2 : 1;
  team = team.map((member, index) => {
    if (promoted >= promotionCapacity || !member.active || member.rank === 'xlead') return member;
    const age = Math.max(0, month - Number(member.certifiedMonth || month));
    const ready = Number(member.leaderReadiness || 0) + Number(member.teamSkill || 1) * 5 + Number(member.candidatePipeline || 0) * 4;
    if (age < 2 || ready < 68) return member;
    const chance = clamp(0.12 + leadership * 0.018 + effect.certification * 0.65, 0.12, 0.58);
    if (deterministicRoll(state, member.id, 900 + month + index) >= chance) return member;
    promoted += 1;
    return { ...member, rank: 'xlead', status: `👑 เติบโตเป็น XLEAD ในเดือน ${month}` };
  });

  const directChildren = new Map();
  team.forEach((member) => {
    if (member.parentId && member.parentId !== 'player') directChildren.set(member.parentId, (directChildren.get(member.parentId) || 0) + 1);
  });
  team = team.map((member) => ({ ...member, downstreamXvisors: directChildren.get(member.id) || 0 }));
  const activeAfter = team.filter((member) => member.active !== false).length;
  const activeCustomers = personal.customers.filter((customer) => customer.activePlan !== false).length
    + team.filter((member) => member.active !== false).reduce((sum, member) => sum + Math.max(0, Number(member.customers || 0)), 0);
  const cultureScore = clamp(
    priorCulture + 1.5 + leadership * 0.15 + (effect.xcircle ? 8 : 0) - metrics.pausedMembers * 0.8 - metrics.quitMembers * 1.8,
    38,
    94,
  );
  const personalXV = personal.metrics.repeat * ROUTINEX_XV;
  const personalSalesBaht = personal.metrics.repeat * ROUTINEX_BAHT;
  return {
    state: {
      ...state,
      customers: personal.customers,
      team,
      rngSeed: created.nextSeed,
      nextPersonId: created.nextPersonId,
      usedNames: created.usedNames,
      economy: {
        ...(state.economy || {}),
        personalXV,
        teamXV,
        productSales: personalSalesBaht,
        teamProductSales,
        lastTransaction: null,
      },
      monthStats: {
        ...(v9.makeMonthStats?.() || {}),
        xcademySessions: 4,
        openHouseDone: true,
        xircleDone: effect.xcircle,
        teamCycleDone: true,
        teamActions,
        teamCustomers: metrics.newCustomers,
        teamReorders: Math.max(0, metrics.repeatCustomers - personal.metrics.repeat),
        teamReferrals: metrics.referrals,
        teamCandidates: metrics.candidates,
        downstreamXvisors: created.members.length,
      },
      organization: {
        ...(state.organization || {}),
        cultureScore,
        xleads: team.filter((member) => member.active !== false && member.rank === 'xlead').map((member) => member.id),
      },
      xircleMomentum: effect.xcircle
        ? { sourceMonth: month, expiresAfterMonth: month + 1, strength: month === 24 ? 2 : 1 }
        : effect.carry ? state.xircleMomentum : null,
    },
    metrics: {
      ...metrics,
      activeCustomers,
      xvisorCount: activeAfter,
      xleadCount: team.filter((member) => member.active !== false && member.rank === 'xlead').length,
      newXvisors: created.members.length,
      newXleads: promoted,
      netCustomers: activeCustomers - activeOrganizationCustomers(state),
      netXvisors: activeAfter - activeBefore,
      netXleads: team.filter((member) => member.active !== false && member.rank === 'xlead').length - xleadsBefore,
      cultureScore,
      eventEffect: effect,
    },
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

function calculateOrganizationIncomeParts(state) {
  const personalSalesBaht = Math.max(0, Number(state.economy?.productSales || 0));
  const retailTier = getRetailTier(personalSalesBaht);
  const channel1 = Math.round(personalSalesBaht * Number(retailTier.rate || 0));
  const directG1 = (state.team || []).filter((member) => member.active !== false && member.parentId === 'player');
  const directG1Commission = directG1.reduce((sum, member) => {
    const salesBaht = Math.max(0, Number(member.personalSalesBaht || member.monthlyOutput?.personalSalesBaht || 0));
    const tier = getRetailTier(salesBaht);
    return sum + Math.round(salesBaht * Number(tier.rate || 0));
  }, 0);
  const mentoringUnlocked = Boolean(state.career?.xleadCertified || state.career?.xgenCertified || ['xlead', 'xgen'].includes(state.rank));
  const channel2 = mentoringUnlocked ? Math.round(directG1Commission * 0.20) : 0;
  const tgv = Math.max(0, Number(state.economy?.personalXV || 0) + Number(state.economy?.teamXV || 0));
  const channel3 = state.career?.xgenCertified ? Math.round(tgv * 0.05) : 0;
  return { channel1, channel2, channel3 };
}

const TRAVEL_LANDMARKS = Object.freeze({
  Tokyo: 'Tokyo Tower และแสงเมืองญี่ปุ่น',
  Seoul: 'N Seoul Tower เหนือเนินเมือง',
  Shanghai: 'Oriental Pearl Tower ริมแม่น้ำ',
  Taipei: 'Taipei 101 เหนือเส้นขอบฟ้า',
  Paris: 'Eiffel Tower ยามเย็น',
  Dubai: 'Burj Khalifa กลางทะเลทราย',
  Santorini: 'บ้านขาวโดมฟ้าริมทะเล',
  London: 'Big Ben และรถบัสแดง',
  Cruise: 'เรือสำราญกลางทะเลพระอาทิตย์ตก',
});

function maybeUnlockTravel(state, month, settlement, metrics) {
  const trips = Array.isArray(state.organization?.trips) ? [...state.organization.trips] : [];
  if (trips.length >= 2 || month < 16) return { trips, trip: null };
  const tripNumber = trips.length + 1;
  const inWindow = tripNumber === 1 ? month <= 21 : month >= 21 && month <= 24;
  if (!inWindow) return { trips, trip: null };

  const campaignBest = Math.max(1, Number(state.campaignScore?.bestTgv || 0));
  const finalWindowMonth = tripNumber === 1 ? month >= 19 : month >= 24;
  const easing = finalWindowMonth ? 0.84 : 1;
  const requiredTgv = Math.round(Math.max(tripNumber === 1 ? 70_000 : 120_000, campaignBest * (tripNumber === 1 ? 0.72 : 0.96)) * easing);
  const requiredCustomers = tripNumber === 1 ? 5 : 10;
  const requiredXvisors = tripNumber === 1 ? 2 : 4;
  const strongEnough = settlement.currentTGV >= requiredTgv
    && metrics.activeCustomers >= requiredCustomers
    && metrics.xvisorCount >= requiredXvisors
    && metrics.cultureScore >= (tripNumber === 1 ? 52 : 56);
  if (!strongEnough) return { trips, trip: null };

  const used = new Set(trips.map((item) => item.destination));
  const available = TRAVEL_DESTINATIONS.filter((destination) => !used.has(destination));
  const pick = Math.min(available.length - 1, Math.floor(deterministicRoll(state, `travel-${tripNumber}`, month + 1_100) * available.length));
  const destination = available[Math.max(0, pick)];
  const trip = {
    id: `travel-${tripNumber}-${month}-${String(destination).toLowerCase()}`,
    number: tripNumber,
    month,
    destination,
    landmark: TRAVEL_LANDMARKS[destination],
    title: `Recognition Trip ${tripNumber} · ${destination}`,
    tgv: settlement.currentTGV,
    organizationSize: metrics.xvisorCount,
  };
  return { trips: [...trips, trip], trip };
}

function enterOrganizationV1(state) {
  if (!state.campaignComplete || !state.campaignScore?.locked) return state;
  const team = (state.team || []).map((member) => ({
    ...member,
    active: member.active !== false,
    organizationStatus: teamStatus(member),
    pausedCustomers: Math.max(0, Number(member.pausedCustomers || 0)),
  }));
  const prepared = { ...state, team };
  return releaseState({
    ...prepared,
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
      cultureScore: clamp(Number(state.organization?.cultureScore || 58) + getSkillLevel(state.skills, 'leadership'), 45, 78),
      trips: Array.isArray(state.organization?.trips) ? state.organization.trips : [],
      aggregate: organizationAggregate(prepared),
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
    return releaseState({
      ...state,
      month: month + 1,
      organizationMonthIncome: null,
      economy: { ...(state.economy || {}), personalXV: 0, teamXV: 0, productSales: 0, teamProductSales: 0 },
      organization: { ...(state.organization || {}), tgv: 0, currentTGV: 0 },
    });
  }

  const result = simulateOrganizationOperations(state, month);
  let simulated = {
    ...result.state,
    organizationMode: true,
    runComplete: false,
    phase: 'organization',
    month,
    energy: 0,
    stage: v9.STAGES.MANAGEMENT,
    campaignFinalePending: false,
  };
  const incomeParts = calculateOrganizationIncomeParts(simulated);
  simulated = {
    ...simulated,
    organizationMonthIncome: incomeParts,
    organization: {
      ...(simulated.organization || {}),
      tgv: Math.max(0, Number(simulated.economy?.personalXV || 0) + Number(simulated.economy?.teamXV || 0)),
      currentTGV: Math.max(0, Number(simulated.economy?.personalXV || 0) + Number(simulated.economy?.teamXV || 0)),
    },
  };
  const economy = v9.calculateEconomy(simulated);
  const settlement = makeSettlement(simulated, economy);
  const metrics = result.metrics;
  const travel = maybeUnlockTravel(simulated, month, settlement, metrics);
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
  const previousSettlement = state.settlements?.[String(month - 1)] || null;
  const previousTgv = Number(previousSettlement?.currentTGV || previousSettlement?.tgv || (month === 13 ? state.campaignScore?.bestTgv : 0) || 0);
  const tgvDeltaPct = previousTgv > 0 ? Math.round(((settlement.currentTGV - previousTgv) / previousTgv) * 1_000) / 10 : null;
  const churnedCustomers = metrics.pausedCustomers + metrics.stoppedCustomers;
  const report = {
    month,
    activities: { xcademy: 4, openHouse: 1, xircle: metrics.eventEffect.xcircle ? 1 : 0 },
    newPeople: metrics.newPeople,
    activeCustomers: metrics.activeCustomers,
    newCustomers: metrics.newCustomers,
    repeatCustomers: metrics.repeatCustomers,
    pausedCustomers: metrics.pausedCustomers,
    stoppedCustomers: metrics.stoppedCustomers,
    comebackCustomers: metrics.comebackCustomers,
    churnedCustomers,
    netCustomers: metrics.netCustomers,
    referrals: metrics.referrals,
    candidates: metrics.candidates,
    xvisorCount: metrics.xvisorCount,
    newXvisors: metrics.newXvisors,
    slowedMembers: metrics.slowedMembers,
    pausedMembers: metrics.pausedMembers,
    quitMembers: metrics.quitMembers,
    comebackMembers: metrics.comebackMembers,
    netXvisors: metrics.netXvisors,
    xleadCount: metrics.xleadCount,
    newXleads: metrics.newXleads,
    netXleads: metrics.netXleads,
    cultureScore: metrics.cultureScore,
    tgv: settlement.currentTGV,
    personalSalesBaht: Math.max(0, Number(simulated.economy?.productSales || 0)),
    personalXV: settlement.personalXV,
    teamXV: settlement.teamXV,
    previousTgv,
    tgvDeltaPct,
    income: settlement.totalIncome,
    totalIncome,
    incomeBreakdown: { ...incomeParts },
    xircleBonus: metrics.eventEffect.xcircle ? {
      retention: 'ดีขึ้นทั้งเดือนและส่งแรงต่อเดือนหน้า',
      referral: 'เพิ่มโอกาส Referral',
      comeback: metrics.comebackMembers,
      certification: 'เพิ่มความพร้อม Candidate และโอกาสสอบผ่าน',
    } : null,
    trip: travel.trip,
  };
  const aggregate = {
    activeCustomers: metrics.activeCustomers,
    newCustomersThisMonth: metrics.newCustomers,
    repeatCustomersThisMonth: metrics.repeatCustomers,
    pausedCustomersThisMonth: metrics.pausedCustomers,
    stoppedCustomersThisMonth: metrics.stoppedCustomers,
    comebackCustomersThisMonth: metrics.comebackCustomers,
    churnedCustomersThisMonth: churnedCustomers,
    netCustomersThisMonth: metrics.netCustomers,
    referralsThisMonth: metrics.referrals,
    candidatesThisMonth: metrics.candidates,
    xvisorCount: metrics.xvisorCount,
    newXvisorsThisMonth: metrics.newXvisors,
    slowedMembersThisMonth: metrics.slowedMembers,
    pausedMembersThisMonth: metrics.pausedMembers,
    quitMembersThisMonth: metrics.quitMembers,
    comebackMembersThisMonth: metrics.comebackMembers,
    netXvisorsThisMonth: metrics.netXvisors,
    xleadCount: metrics.xleadCount,
    newXleadsThisMonth: metrics.newXleads,
    netXleadsThisMonth: metrics.netXleads,
    candidateCount: (simulated.team || []).reduce((sum, member) => sum + Math.max(0, Number(member.candidatePipeline || 0)), 0),
    organizationSize: metrics.xvisorCount,
    overflowPeople: 0,
    cultureScore: metrics.cultureScore,
  };
  const story = travel.trip
    ? `✈️ ปลดล็อก ${travel.trip.title}`
    : metrics.eventEffect.xcircle
      ? `🏕️ The Xircle ดึงทีมกลับมา ${metrics.comebackMembers} · ลูกค้ากลับมา ${metrics.comebackCustomers}`
      : metrics.newXleads > 0
        ? `👑 มี XLEAD ใหม่ ${metrics.newXleads} คน`
        : metrics.netXvisors < 0 || metrics.netCustomers < 0
          ? `🌦️ เดือนผันผวน · ลูกค้าสุทธิ ${metrics.netCustomers >= 0 ? '+' : ''}${metrics.netCustomers} · ทีมสุทธิ ${metrics.netXvisors >= 0 ? '+' : ''}${metrics.netXvisors}`
          : metrics.newXvisors > 0
            ? `🌱 ทีมพัฒนา X-VISOR ใหม่ ${metrics.newXvisors} คน`
            : `❤️ ลูกค้าสุทธิ ${metrics.netCustomers >= 0 ? '+' : ''}${metrics.netCustomers} · ระบบเดินต่อโดยทีม`;
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
      trips: travel.trips,
      endless: false,
    },
    organizationMonthIncome: { channel1: settlement.channel1, channel2: settlement.channel2, channel3: settlement.channel3 },
    lastOrganizationReport: report,
    sceneReport: { kind: 'organization', ...report, story },
    lastMessage: `🏙️ เดือน ${month} · TGV ${settlement.currentTGV.toLocaleString('th-TH')} XV · ${story}`,
    updatedAt: Date.now(),
  };

  if (month >= ORGANIZATION_END_MONTH) {
    const allSettlements = Object.values(settlements).filter((entry) => Number(entry.month || 0) >= 1 && Number(entry.month || 0) <= ORGANIZATION_END_MONTH);
    const bestTGV = allSettlements.reduce((best, entry) => Math.max(best, Number(entry.currentTGV || entry.tgv || 0)), 0);
    const bestMonthIncome = allSettlements.reduce((best, entry) => Math.max(best, Number(entry.totalIncome || entry.total || 0)), 0);
    return releaseState({
      ...common,
      month: ORGANIZATION_END_MONTH,
      runComplete: true,
      phase: 'complete',
      energy: 0,
      twoYearSummary: {
        completedAt: Date.now(),
        year2StartTGV: Number(settlements['12']?.currentTGV || settlements['12']?.tgv || state.campaignScore?.bestTgv || 0),
        year2EndTGV: settlement.currentTGV,
        month24TGV: settlement.currentTGV,
        month24Income: settlement.totalIncome,
        bestTGV,
        bestMonthIncome,
        total24Income: totalIncome,
        totalIncome,
        activeCustomers: metrics.activeCustomers,
        xvisorCount: metrics.xvisorCount,
        xleadCount: metrics.xleadCount,
        organizationSize: metrics.xvisorCount,
        trips: travel.trips,
        options: ['scoreboard', 'new-game-plus', 'new-run'],
        campaignScore: state.campaignScore,
      },
      lastMessage: '🏁 Month 24 จบสมบูรณ์ · เลือกส่ง Scoreboard, เล่น NEW GAME+ หรือเริ่มเกมใหม่',
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
      cultureScore: 58,
      trips: [],
      aggregate: { activeCustomers: 0, xvisorCount: 0, xleadCount: 0, candidateCount: 0, organizationSize: 0, overflowPeople: 0, cultureScore: 58 },
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
      label: `⚡ ครบชุด → Xcademy · ${person.name}`,
      reason: `โอกาสประมาณ ${Math.round(chance * 100)}% · ทางลัดสู่การสอบ X-VISOR แต่ต้องดูจังหวะ`,
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
  if (event === EVENTS.OPEN_MANAGEMENT_ROUTINE) {
    const opened = openRoutineWithFastLaneChoice(state, payload);
    if (opened) return opened;
  }
  if ([EVENTS.CHOOSE_ROUTINE, EVENTS.CHOOSE_MANAGEMENT_ROUTINE].includes(event)) {
    const fullSet = runFullSetRoutineChoice(state, event, payload);
    if (fullSet) return fullSet;
  }
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
    if (!parsed) return null;
    const organization = {
      ...(parsed.organization || {}),
      ...(value.organization || {}),
      cultureScore: clamp(Number(value.organization?.cultureScore || parsed.organization?.cultureScore || 58), 35, 94),
      trips: Array.isArray(value.organization?.trips) ? value.organization.trips.slice(0, 2) : [],
      endless: false,
    };
    const team = (Array.isArray(value.team) ? value.team : parsed.team || []).map((member) => ({
      ...member,
      organizationStatus: member.organizationStatus || (member.active === false ? 'paused' : 'active'),
      pausedCustomers: Math.max(0, Number(member.pausedCustomers || 0)),
    }));
    return releaseState({ ...parsed, ...value, organization, team });
  } catch {
    return null;
  }
}
