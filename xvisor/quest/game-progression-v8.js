export * from './game-progression.js?v7legacy';
import * as legacy from './game-progression.js?v7legacy';
import { createPerson } from './game-people.js';
import { TUTORIAL_OFFER, XIRCLE_STARTER, getRetailTier } from './game-commercial-config-v8.js';

const SPECIALTIES = Object.freeze([
  { id: 'sales', label: '💰 ขายเก่ง' },
  { id: 'care', label: '❤️ ดูแลเก่ง' },
  { id: 'builder', label: '🌱 สร้างทีมเก่ง' },
  { id: 'balanced', label: '⚖️ สมดุล' },
]);

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value || 'X')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function specialtyFor(member) {
  const existing = SPECIALTIES.find((item) => item.id === member?.specialty);
  return existing || SPECIALTIES[hashText(member?.personId || member?.id || member?.name) % SPECIALTIES.length];
}

export function makeTeamMember(customer, state, options = {}) {
  const base = legacy.makeTeamMember(customer, state, options);
  const specialty = specialtyFor(base);
  return {
    ...base,
    specialty: specialty.id,
    specialtyLabel: specialty.label,
    candidatePipeline: Number(base.candidatePipeline || 0),
    origin: base.origin || customer.origin || {
      sourceType: customer.source || 'customer',
      sourceName: customer.source || 'Customer Journey',
      createdMonth: Number(state.month || 0),
      parentPersonId: customer.personId || customer.id,
      eventId: 'CERTIFY_CANDIDATE',
    },
  };
}

function makeOutput() {
  return {
    actions: 0, selfUse: 0, newPeople: 0, followups: 0, customers: 0,
    sales: 0, newStarts: 0, reorders: 0, referrals: 0, candidates: 0,
    newXvisors: 0, personalSalesBaht: 0, personalXV: 0, commission: 0,
  };
}

function deterministicNoise(state, member, salt = 0) {
  return (hashText(member.id || member.name) + Number(state.month || 0) * 97 + Number(state.rngSeed || 1) + salt) % 100;
}

export function simulateTeamCycle(state) {
  if (state.month < 2 || state.monthStats?.teamCycleDone || state.organizationMode) return state;

  const leadership = legacy.getSkillLevel(state.skills, 'leadership');
  const active = (state.team || []).filter((member) => member.active);
  const reports = [];
  const birthPlans = [];
  const xircleBoost = Number(state.xircleMomentum?.strength || 0);
  let birthBudget = Math.max(1, Math.min(8,
    1 + Math.floor(Number(state.month || 0) / 3) + Math.floor(leadership / 3) + Math.min(2, xircleBoost)
  ));
  let teamXV = 0;
  let teamProductSales = 0;
  let teamActions = 0;
  let teamCustomers = 0;
  let teamSales = 0;
  let teamReorders = 0;
  let teamReferrals = 0;
  let teamCandidates = 0;

  let team = (state.team || []).map((original) => {
    if (!original.active) return { ...original, monthlyOutput: makeOutput() };
    const specialty = specialtyFor(original);
    const age = Math.max(0, Number(state.month || 0) - Number(original.certifiedMonth || state.month));
    const confidence = Math.min(100, Number(original.confidence || 45) + 2 + Math.floor(leadership / 3));
    const autonomy = Math.min(100, Number(original.autonomy || 30) + 2 + Math.floor(leadership / 4));
    const teamSkill = Math.min(10, Number(original.teamSkill || 1) + Number(age > 0 && (age + hashText(original.id)) % 3 === 0));
    const noise = deterministicNoise(state, original);

    const salesTalent = specialty.id === 'sales' ? 2 : specialty.id === 'balanced' ? 1 : 0;
    const careTalent = specialty.id === 'care' ? 0.10 : specialty.id === 'balanced' ? 0.04 : 0;
    const builderTalent = specialty.id === 'builder' ? 2 : specialty.id === 'balanced' ? 1 : 0;
    const capacityScore = confidence + autonomy + teamSkill * 7 + leadership * 4 + Math.min(30, age * 3) + xircleBoost * 5;
    const newStarts = Math.max(0, Math.floor((capacityScore - 105) / 55)) + salesTalent + Number(noise > 82 && capacityScore > 115);
    const previousCustomers = Math.max(0, Number(original.customers || 0));
    const retention = Math.min(0.90, 0.48 + careTalent + teamSkill * 0.025 + leadership * 0.012 + xircleBoost * 0.015);
    const reorders = Math.floor(previousCustomers * retention);
    const customers = previousCustomers + newStarts;
    const referrals = Math.max(0, Math.floor((reorders + newStarts + (specialty.id === 'care' ? 2 : 0)) / 8));
    const newPeople = Math.max(1, newStarts + referrals + builderTalent);
    const candidateGain = Math.max(0,
      Math.floor((newPeople + referrals + builderTalent + Math.floor(teamSkill / 3) + xircleBoost) / 5)
    );
    let candidatePipeline = Math.max(0, Number(original.candidatePipeline || 0)) + candidateGain;
    let newXvisors = 0;
    if (birthBudget > 0 && candidatePipeline >= 3 && teamSkill >= 3 && age >= 1) {
      newXvisors = 1;
      birthBudget -= 1;
      candidatePipeline -= 3;
      birthPlans.push({ parentId: original.id, parentName: original.name, generation: Number(original.generation || 1) + 1 });
    }

    const selfUse = 1;
    const personalXV = selfUse * TUTORIAL_OFFER.xv
      + reorders * TUTORIAL_OFFER.xv
      + newStarts * (TUTORIAL_OFFER.xv + XIRCLE_STARTER.xv);
    const personalSalesBaht = selfUse * TUTORIAL_OFFER.price
      + reorders * TUTORIAL_OFFER.price
      + newStarts * (TUTORIAL_OFFER.price + XIRCLE_STARTER.price);
    const tier = getRetailTier(personalXV);
    const commission = Math.round(personalXV * tier.rate);
    const actions = Math.max(1, Math.round(newPeople + newStarts + Math.sqrt(Math.max(0, reorders))));
    const output = {
      actions, selfUse, newPeople, followups: Math.min(customers, Math.ceil(newStarts / 2)),
      customers: newStarts, sales: newStarts + reorders, newStarts, reorders, referrals,
      candidates: candidateGain, newXvisors, personalSalesBaht, personalXV, commission,
    };

    teamXV += personalXV;
    teamProductSales += personalSalesBaht;
    teamActions += actions;
    teamCustomers += newStarts;
    teamSales += newStarts + reorders;
    teamReorders += reorders;
    teamReferrals += referrals;
    teamCandidates += candidateGain;
    reports.push({ memberId: original.id, name: original.name, specialty: specialty.id, ...output });

    return {
      ...original,
      specialty: specialty.id,
      specialtyLabel: specialty.label,
      confidence,
      autonomy,
      teamSkill,
      customers,
      sales: Number(original.sales || 0) + newStarts + reorders,
      reorders: Number(original.reorders || 0) + reorders,
      referrals: Number(original.referrals || 0) + referrals,
      candidates: Number(original.candidates || 0) + candidateGain,
      candidatePipeline,
      xv: Number(original.xv || 0) + personalXV,
      personalSalesBaht,
      personalXV,
      commission,
      totalIncome: Number(original.totalIncome || 0) + commission,
      lastSelfUseMonth: state.month,
      activity: Number(original.activity || 0) + actions,
      leaderReadiness: Math.min(100, Number(original.leaderReadiness || 0) + candidateGain * 6 + Math.floor(actions / 3)),
      growthMomentum: 0,
      monthlyOutput: output,
      status: newXvisors
        ? `พา Candidate ผ่านเส้นทางจนเป็น X-VISOR ใหม่ 1 คน`
        : specialty.id === 'builder'
          ? `สร้าง Pipeline ${candidatePipeline}/3 · ${newStarts} ลูกค้าใหม่`
          : `${specialty.label} · ${newStarts} ลูกค้าใหม่ · ${reorders} ต่อ RoutineX`,
    };
  });

  let nextSeed = Number(state.rngSeed || 1);
  let nextPersonId = Number(state.nextPersonId || 1);
  let usedNames = [...(state.usedNames || [])];
  const newborns = [];
  for (const plan of birthPlans) {
    const created = createPerson({ seed: nextSeed, usedNames, source: 'team', index: nextPersonId });
    nextSeed = created.nextSeed;
    nextPersonId += 1;
    usedNames = [...usedNames, created.person.name];
    const child = makeTeamMember({
      ...created.person,
      origin: {
        sourceType: 'team-candidate-pipeline',
        sourceId: plan.parentId,
        sourceName: `ทีมของ ${plan.parentName}`,
        createdMonth: state.month,
        parentPersonId: plan.parentId,
        eventId: `TEAM_CERTIFICATION_M${state.month}`,
      },
    }, state, {
      id: `member-v8-${state.month}-${plan.parentId}-${nextPersonId}`,
      parentId: plan.parentId,
      generation: plan.generation,
    });
    newborns.push({ ...child, confidence: Math.max(50, child.confidence), status: `${plan.parentName} พัฒนาผ่าน Candidate Pipeline` });
  }
  team = [...team, ...newborns];

  const directChildren = new Map();
  team.forEach((member) => {
    if (member.parentId && member.parentId !== 'player') directChildren.set(member.parentId, (directChildren.get(member.parentId) || 0) + 1);
  });
  team = team.map((member) => {
    const downstreamXvisors = directChildren.get(member.id) || 0;
    const becomesXlead = member.rank === 'xlead'
      || (downstreamXvisors >= 3 && (Number(member.teamSkill || 1) >= 5 || Number(member.leaderReadiness || 0) >= 65));
    return { ...member, downstreamXvisors, rank: becomesXlead ? 'xlead' : 'xvisor' };
  });
  const xleads = team.filter((member) => member.rank === 'xlead').map((member) => member.id);
  const monthlyTgv = Math.max(0, Number(state.economy?.personalXV || 0)) + teamXV;

  return {
    ...state,
    team,
    rngSeed: nextSeed,
    nextPersonId,
    usedNames,
    economy: {
      ...state.economy,
      teamProductSales: Number(state.economy?.teamProductSales || 0) + teamProductSales,
      teamXV: Number(state.economy?.teamXV || 0) + teamXV,
    },
    monthStats: {
      ...state.monthStats,
      teamCycleDone: true,
      teamActivity: Number(state.monthStats?.teamActivity || 0) + teamActions,
      teamActions: Number(state.monthStats?.teamActions || 0) + teamActions,
      teamCustomers: Number(state.monthStats?.teamCustomers || 0) + teamCustomers,
      teamSales: Number(state.monthStats?.teamSales || 0) + teamSales,
      teamReorders: Number(state.monthStats?.teamReorders || 0) + teamReorders,
      teamReferrals: Number(state.monthStats?.teamReferrals || 0) + teamReferrals,
      teamCandidates: Number(state.monthStats?.teamCandidates || 0) + teamCandidates,
      teamSelfUse: Number(state.monthStats?.teamSelfUse || 0) + active.length,
      downstreamXvisors: Number(state.monthStats?.downstreamXvisors || 0) + newborns.length,
      teamOutput: reports.slice(0, 50),
    },
    career: {
      ...state.career,
      totalTeamActions: Number(state.career?.totalTeamActions || 0) + teamActions,
    },
    organization: {
      ...state.organization,
      totalActivity: Number(state.organization?.totalActivity || 0) + teamActions,
      tgv: monthlyTgv,
      xleads,
      breakawayVolume: 0,
      generation: Math.max(1, ...team.map((member) => Number(member.generation || 1))),
    },
  };
}

export function evaluateXlead(state) {
  if (state.career?.xleadCertified || ['xlead', 'xgen'].includes(state.rank)) return state;
  const progress = legacy.getXleadProgress(state);
  if (!progress.complete || state.career?.xleadQualified) return state;
  return {
    ...state,
    career: { ...state.career, xleadQualified: true },
    lastMessage: '🔓 XLEAD Qualification พร้อมแล้ว · เข้าสอบเพื่อปลดล็อก ② รายได้จากการพัฒนา G1',
  };
}
