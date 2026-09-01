import {
  DIRECT_MENTORING_RULE,
  TUTORIAL_OFFER,
  XIRCLE_STARTER,
  getRetailTier
} from "./game-commercial-config.js";
import { createPerson } from "./game-people.js";
var SKILL_IDS = Object.freeze(["knowledge", "people", "care", "leadership"]);
var SKILL_DEFINITIONS = Object.freeze({
  knowledge: Object.freeze({
    icon: "📚",
    name: "ความรู้",
    practice: "เรียน Xcademy",
    benefits: Object.freeze([
      "อธิบาย Xircle, RoutineX และขอบเขตได้ชัดขึ้น",
      "วางคำแนะนำตามบริบทได้แม่นขึ้น",
      "ลดโอกาสเสนอแผนที่เยอะเกินไป",
      "คอนเทนต์ความรู้สร้างความสนใจได้ดีขึ้น",
      "Recommendation ใช้ข้อมูลน้อยรอบลง"
    ])
  }),
  people: Object.freeze({
    icon: "💬",
    name: "คุยกับคน",
    practice: "ฝึก Case สนทนา",
    benefits: Object.freeze([
      "คนเปิดใจและนัดหมายได้ง่ายขึ้น",
      "Discovery จับประเด็นได้เร็วขึ้น",
      "บางเคสคุยออนไลน์แล้วไปต่อได้เลย",
      "คนที่ขอคิดก่อนกลับมาพร้อมเร็วขึ้น",
      "Content และ Ads ได้คนที่ตรงขึ้น"
    ])
  }),
  care: Object.freeze({
    icon: "❤️",
    name: "ดูแล",
    practice: "Review ลูกค้า",
    benefits: Object.freeze([
      "Follow-up ทำให้ Next Action ชัดขึ้น",
      "ลูกค้าทำต่อเนื่องและไว้ใจมากขึ้น",
      "หนึ่งครั้งดูแลได้ไกลกว่าหนึ่ง checkpoint",
      "Repeat และ Referral เปิดได้ง่ายขึ้น",
      "ลูกค้าบางคนเดินต่อเองได้หลังติดตาม"
    ])
  }),
  leadership: Object.freeze({
    icon: "🌱",
    name: "พาทีม",
    practice: "ฝึก Mentor",
    benefits: Object.freeze([
      "Candidate เดินเส้นทาง Xcademy ชัดขึ้น",
      "X-VISOR ใหม่มั่นใจและทำเองได้เร็วขึ้น",
      "Xcademy ช่วยหลายคนได้มากขึ้น",
      "ทีมสร้างลูกค้าและ Sale แบบ recurring",
      "ปลดล็อกเส้นทาง XLEAD และผู้นำรุ่นถัดไป"
    ])
  })
});
var SKILL_THRESHOLDS = Object.freeze([0, 3, 7, 12, 18, 25, 33, 42, 52, 63]);
var PLAYER_THRESHOLDS = Object.freeze([0, 4, 9, 15, 22, 30, 39, 49, 60, 72]);
var PLAYER_UNLOCKS = Object.freeze({
  content: 2,
  referral: 3,
  ads: 4,
  strongerXcademy: 5,
  candidateCoaching: 6,
  strongerGoodLuck: 7,
  teamAutonomy: 8
});
function makeSkills(seedXp = 0) {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, { xp: Math.max(0, Number(seedXp || 0)) }]));
}
function normalizeSkills(skills) {
  const normalized = makeSkills();
  SKILL_IDS.forEach((id) => {
    normalized[id] = { xp: Math.max(0, Number(skills?.[id]?.xp || 0)) };
  });
  return normalized;
}
function levelForXp(xp) {
  const amount = Math.max(0, Number(xp || 0));
  let level = 1;
  SKILL_THRESHOLDS.forEach((threshold, index) => {
    if (amount >= threshold) level = index + 1;
  });
  return Math.min(10, level);
}
function getSkillLevel(skills, id) {
  return levelForXp(skills?.[id]?.xp || 0);
}
function getPlayerLevelFromSkills(skills) {
  const totalXp = SKILL_IDS.reduce((sum, id) => sum + Math.max(0, Number(skills?.[id]?.xp || 0)), 0);
  let level = 1;
  PLAYER_THRESHOLDS.forEach((threshold, index) => {
    if (totalXp >= threshold) level = index + 1;
  });
  return Math.min(10, level);
}
function getSkillSnapshot(state) {
  const skills = normalizeSkills(state?.skills);
  return {
    playerLevel: getPlayerLevelFromSkills(skills),
    skills: Object.fromEntries(SKILL_IDS.map((id) => [id, {
      ...skills[id],
      level: getSkillLevel(skills, id),
      definition: SKILL_DEFINITIONS[id],
      nextXp: SKILL_THRESHOLDS[Math.min(9, getSkillLevel(skills, id))] ?? null
    }]))
  };
}
function getSkillBenefit(id, level) {
  const definition = SKILL_DEFINITIONS[id] || SKILL_DEFINITIONS.knowledge;
  const index = Math.min(definition.benefits.length - 1, Math.max(0, Math.floor((Number(level || 1) - 1) / 2)));
  return definition.benefits[index];
}
function hasPlayerUnlock(state, unlock) {
  return getPlayerLevelFromSkills(state?.skills) >= (PLAYER_UNLOCKS[unlock] || 1);
}
function addSkillXp(state, id, amount, source = "practice") {
  if (!SKILL_IDS.includes(id)) return state;
  const skills = normalizeSkills(state.skills);
  const before = getSkillLevel(skills, id);
  const xp = Math.max(0, Number(amount || 0));
  skills[id] = { xp: skills[id].xp + xp };
  const after = getSkillLevel(skills, id);
  const gained = Math.max(0, after - before);
  const monthStats = state.monthStats ? { ...state.monthStats, skillLevelsGained: Number(state.monthStats.skillLevelsGained || 0) + gained } : state.monthStats;
  return {
    ...state,
    skills,
    playerLevel: getPlayerLevelFromSkills(skills),
    monthStats,
    lastSkillGain: gained ? { id, level: after, source, benefit: getSkillBenefit(id, after) } : null
  };
}
function makeTeamOutput() {
  return {
    actions: 0,
    selfUse: 0,
    newPeople: 0,
    followups: 0,
    customers: 0,
    sales: 0,
    newStarts: 0,
    reorders: 0,
    referrals: 0,
    candidates: 0,
    newXvisors: 0,
    personalSalesBaht: 0,
    personalXV: 0,
    commission: 0
  };
}
function makeTeamMember(customer, state, options = {}) {
  const leadership = getSkillLevel(state.skills, "leadership");
  const generation = Math.max(1, Number(options.generation || 1));
  return {
    id: options.id || `member-${customer.id}`,
    personId: customer.personId || customer.id,
    parentId: options.parentId || "player",
    generation,
    name: customer.name,
    appearance: customer.appearance,
    active: true,
    certifiedMonth: state.month,
    rank: "xvisor",
    confidence: Math.min(100, 46 + leadership * 3),
    autonomy: Math.min(100, 28 + leadership * 4),
    teamSkill: 1,
    customers: 0,
    sales: 0,
    reorders: 0,
    referrals: 0,
    candidates: 0,
    xv: 0,
    personalSalesBaht: 0,
    personalXV: 0,
    commission: 0,
    totalIncome: 0,
    lastSelfUseMonth: null,
    activity: 0,
    xcademyVisits: 0,
    openHouseVisits: 0,
    downstreamXvisors: 0,
    leaderReadiness: 0,
    growthMomentum: 0,
    monthlyOutput: makeTeamOutput(),
    status: "Certified X-VISOR · กำลังเริ่มจากคนแรก"
  };
}
function deterministicBump(state, member, salt = 0) {
  const nameCode = [...String(member.name || "X")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (Number(state.rngSeed || 1) + state.month * 31 + nameCode + salt) % 7;
}
function simulateTeamCycle(state) {
  if (state.month < 2 || state.monthStats?.teamCycleDone) return state;
  const leadership = getSkillLevel(state.skills, "leadership");
  const playerLevel = getPlayerLevelFromSkills(state.skills);
  const leadershipTen = leadership >= 10;
  const reports = [];
  let teamProductSales = 0;
  let teamXV = 0;
  let teamActions = 0;
  let teamCustomers = 0;
  let teamSales = 0;
  let teamReorders = 0;
  let teamReferrals = 0;
  let teamCandidates = 0;
  let nextSeed = Number(state.rngSeed || 1);
  let nextPersonId = Number(state.nextPersonId || 1);
  let usedNames = [...state.usedNames || []];
  const birthPlans = [];
  const activeCount = (state.team || []).filter((member) => member.active).length;
  const globalBirthLimit = Math.max(12, Math.ceil(activeCount * (leadershipTen ? 1.2 : 0.72)));
  let plannedBirths = 0;
  let team = (state.team || []).map((member) => {
    if (!member.active) return { ...member, monthlyOutput: makeTeamOutput() };
    const age = Math.max(0, state.month - Number(member.certifiedMonth || state.month));
    const score = Number(member.confidence || 0) + Number(member.autonomy || 0) + Number(member.teamSkill || 1) * 8 + leadership * (leadershipTen ? 15 : 7) + Math.min(8, Number(member.xcademyVisits || member.centerVisits || 0)) * 4 + Math.min(4, Number(member.openHouseVisits || member.goodLuckVisits || 0)) * 3 + Math.min(40, age * 4) + (["xlead", "xgen"].includes(state.rank) ? 18 : 0) + (playerLevel >= PLAYER_UNLOCKS.teamAutonomy ? 10 : 0) + deterministicBump(state, member);
    const engine = leadershipTen ? 2.15 : 1;
    const actions = Math.max(2, Math.min(28, Math.floor(score / 45 * engine)));
    const newPeople = Math.max(1, Math.min(8, Math.floor((score - 45) / (leadershipTen ? 35 : 58))));
    const customerGain = Math.max(0, Math.min(5, Math.floor((score - 80) / (leadershipTen ? 42 : 72))));
    const previousCustomers = Math.max(0, Number(member.customers || 0));
    const availableCustomers = previousCustomers + customerGain;
    const followups = availableCustomers ? Math.min(8, Math.max(1, Math.ceil(customerGain / 2))) : 0;
    const newStarts = customerGain;
    const repeatRate = leadershipTen ? 0.82 : Math.min(0.68, 0.24 + Number(member.teamSkill || 1) * 0.04 + leadership * 0.025);
    const reorders = Math.min(12, Math.floor(previousCustomers * repeatRate));
    const sales = newStarts + reorders;
    const referrals = availableCustomers >= 2 ? Math.min(5, Math.floor((availableCustomers + leadership) / (leadershipTen ? 4 : 8))) : 0;
    const candidateRate = 0.1 + leadership * 0.025 + Number(member.teamSkill || 1) * 0.012 + Math.min(4, Number(member.xcademyVisits || member.centerVisits || 0)) * 0.015 + Math.min(2, Number(member.openHouseVisits || member.goodLuckVisits || 0)) * 0.01 + (member.rank === "xlead" ? 0.08 : 0) + (leadershipTen ? 0.05 : 0);
    const momentum = Number(member.growthMomentum || 0) + candidateRate;
    let newXvisors = Math.max(0, Math.floor(momentum));
    newXvisors = Math.min(leadershipTen ? 4 : 2, newXvisors, Math.max(0, globalBirthLimit - plannedBirths));
    plannedBirths += newXvisors;
    if (newXvisors) birthPlans.push({ parent: member, count: newXvisors });
    const candidates = Math.max(newXvisors, Math.floor(candidateRate));
    const selfUse = 1;
    const personalSalesBaht = selfUse * TUTORIAL_OFFER.price + reorders * TUTORIAL_OFFER.price + newStarts * (TUTORIAL_OFFER.price + XIRCLE_STARTER.price);
    const personalXV = selfUse * TUTORIAL_OFFER.xv + reorders * TUTORIAL_OFFER.xv + newStarts * (TUTORIAL_OFFER.xv + XIRCLE_STARTER.xv);
    const tier = getRetailTier(personalSalesBaht);
    const commission = Math.round(personalSalesBaht * tier.rate);
    const output = {
      actions,
      selfUse,
      newPeople,
      followups,
      customers: customerGain,
      sales,
      newStarts,
      reorders,
      referrals,
      candidates,
      newXvisors,
      personalSalesBaht,
      personalXV,
      commission
    };
    teamProductSales += personalSalesBaht;
    teamXV += personalXV;
    teamActions += actions;
    teamCustomers += customerGain;
    teamSales += sales;
    teamReorders += reorders;
    teamReferrals += referrals;
    teamCandidates += candidates;
    reports.push({ memberId: member.id, name: member.name, ...output });
    const autonomy = Math.min(100, Number(member.autonomy || 0) + (leadershipTen ? 12 : 3 + Math.floor(leadership / 3)));
    const confidence = Math.min(100, Number(member.confidence || 0) + (leadershipTen ? 8 : 2));
    const teamSkill = Math.min(10, Number(member.teamSkill || 1) + (actions >= 4 ? 1 : 0) + Number(leadershipTen));
    return {
      ...member,
      autonomy,
      confidence,
      teamSkill,
      customers: availableCustomers,
      sales: Number(member.sales || 0) + sales,
      reorders: Number(member.reorders || 0) + reorders,
      referrals: Number(member.referrals || 0) + referrals,
      candidates: Number(member.candidates || 0) + candidates,
      xv: Number(member.xv || 0) + personalXV,
      personalSalesBaht,
      personalXV,
      commission,
      totalIncome: Number(member.totalIncome || 0) + commission,
      lastSelfUseMonth: state.month,
      activity: Number(member.activity || 0) + actions,
      leaderReadiness: Math.min(100, Number(member.leaderReadiness || 0) + candidates * 10 + Math.max(1, Math.floor(actions / 3))),
      growthMomentum: Math.max(0, momentum - newXvisors),
      monthlyOutput: output,
      status: newXvisors ? `สร้าง X-VISOR รุ่นถัดไป ${newXvisors} คน` : sales ? `สร้างยอด ${sales} รอบ และดูแลต่อเอง` : customerGain ? "ดูแลลูกค้าคนใหม่ได้เอง" : "ต่อ RoutineX ของตัวเองและทำงานตามระบบ"
    };
  });
  const newborns = [];
  birthPlans.forEach(({ parent, count }) => {
    for (let index = 0; index < count; index += 1) {
      const created = createPerson({ seed: nextSeed, usedNames, source: "team", index: nextPersonId });
      nextSeed = created.nextSeed;
      nextPersonId += 1;
      usedNames = [...usedNames, created.person.name];
      const child = makeTeamMember(created.person, state, {
        id: `member-auto-${state.month}-${parent.id}-${index}-${nextPersonId}`,
        parentId: parent.id,
        generation: Number(parent.generation || 1) + 1
      });
      newborns.push({ ...child, confidence: Math.max(child.confidence, 52), status: `${parent.name} พัฒนาเป็น X-VISOR` });
    }
  });
  team = [...team, ...newborns];
  const directChildren = /* @__PURE__ */ new Map();
  team.forEach((member) => {
    if (member.parentId && member.parentId !== "player") directChildren.set(member.parentId, (directChildren.get(member.parentId) || 0) + 1);
  });
  team = team.map((member) => {
    const downstreamXvisors = directChildren.get(member.id) || 0;
    const becomesXlead = member.rank === "xlead" || downstreamXvisors >= 3 && (Number(member.teamSkill || 1) >= 5 || Number(member.leaderReadiness || 0) >= 58);
    return { ...member, downstreamXvisors, rank: becomesXlead ? "xlead" : "xvisor" };
  });
  const xleads = team.filter((member) => member.rank === "xlead").map((member) => member.id);
  const memberById = new Map(team.map((member) => [member.id, member]));
  const xleadSet = new Set(xleads);
  const belongsToBreakaway = (member) => {
    let cursor = member;
    let guard = 0;
    while (cursor && guard < 50) {
      if (xleadSet.has(cursor.id)) return true;
      cursor = memberById.get(cursor.parentId);
      guard += 1;
    }
    return false;
  };
  const breakawayVolume = team.filter(belongsToBreakaway).reduce((sum, member) => sum + Number(member.personalXV || 0), 0);
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
      teamXV: Number(state.economy?.teamXV || 0) + teamXV
    },
    monthStats: {
      ...state.monthStats,
      teamCycleDone: true,
      teamActivity: Number(state.monthStats.teamActivity || 0) + teamActions,
      teamActions: Number(state.monthStats.teamActions || 0) + teamActions,
      teamCustomers: Number(state.monthStats.teamCustomers || 0) + teamCustomers,
      teamSales: Number(state.monthStats.teamSales || 0) + teamSales,
      teamReorders: Number(state.monthStats.teamReorders || 0) + teamReorders,
      teamReferrals: Number(state.monthStats.teamReferrals || 0) + teamReferrals,
      teamCandidates: Number(state.monthStats.teamCandidates || 0) + teamCandidates,
      teamSelfUse: Number(state.monthStats.teamSelfUse || 0) + activeCount,
      downstreamXvisors: Number(state.monthStats.downstreamXvisors || 0) + newborns.length,
      teamOutput: reports
    },
    career: {
      ...state.career,
      totalTeamActions: Number(state.career?.totalTeamActions || 0) + teamActions
    },
    organization: {
      ...state.organization,
      totalActivity: Number(state.organization?.totalActivity || 0) + teamActions,
      tgv: monthlyTgv,
      xleads,
      breakawayVolume,
      generation: Math.max(1, ...team.map((member) => Number(member.generation || 1)))
    }
  };
}
function getXleadProgress(state) {
  const activeXvisors = (state.team || []).filter((member) => member.active).length;
  const criteria = [
    { id: "results", label: "Success Case", current: Number(state.career?.totalSuccessCases || 0), target: 2 },
    { id: "xvisors", label: "Active X-VISOR", current: activeXvisors, target: 3 },
    { id: "xcademy", label: "Xcademy sessions", current: Number(state.career?.xcademies || state.career?.centers || 0), target: 2 },
    { id: "activity", label: "Team activity", current: Number(state.career?.totalTeamActions || 0), target: 12 },
    { id: "leadership", label: "พาทีม", current: getSkillLevel(state.skills, "leadership"), target: 4 }
  ];
  return {
    criteria,
    complete: criteria.every((item) => item.current >= item.target),
    note: "เกณฑ์จำลองเพื่อการเล่นเกม ไม่ใช่เกณฑ์คุณสมบัติ XLEAD อย่างเป็นทางการ"
  };
}
function evaluateXlead(state) {
  if (["xlead", "xgen"].includes(state.rank)) return state;
  const progress = getXleadProgress(state);
  if (!progress.complete) return state;
  return {
    ...state,
    rank: "xlead",
    career: { ...state.career, xleadAtMonth: state.month },
    organization: { ...state.organization, mapUnlocked: true },
    milestones: { ...state.milestones, firstXlead: true },
    lastMessage: "คุณก้าวสู่ XLEAD ในเกม เพราะทีมเริ่มสร้างผลลัพธ์และพัฒนาคนต่อได้"
  };
}
function directMentoringAvailable() {
  return DIRECT_MENTORING_RULE.status !== "TO_CONFIRM" && Number.isFinite(DIRECT_MENTORING_RULE.rate);
}

import { createPerson as createPerson2 } from "./game-people.js";
import { TUTORIAL_OFFER as TUTORIAL_OFFER2, XIRCLE_STARTER as XIRCLE_STARTER2, getRetailTier as getRetailTier2 } from "./game-commercial-config.js";
var SPECIALTIES = Object.freeze([
  { id: "sales", label: "💰 ขายเก่ง" },
  { id: "care", label: "❤️ ดูแลเก่ง" },
  { id: "builder", label: "🌱 สร้างทีมเก่ง" },
  { id: "balanced", label: "⚖️ สมดุล" }
]);
function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value || "X")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}
function specialtyFor(member) {
  const existing = SPECIALTIES.find((item) => item.id === member?.specialty);
  return existing || SPECIALTIES[hashText(member?.personId || member?.id || member?.name) % SPECIALTIES.length];
}
function makeTeamMember2(customer, state, options = {}) {
  const base = makeTeamMember(customer, state, options);
  const specialty = specialtyFor(base);
  return {
    ...base,
    specialty: specialty.id,
    specialtyLabel: specialty.label,
    candidatePipeline: Number(base.candidatePipeline || 0),
    origin: base.origin || customer.origin || {
      sourceType: customer.source || "customer",
      sourceName: customer.source || "Customer Journey",
      createdMonth: Number(state.month || 0),
      parentPersonId: customer.personId || customer.id,
      eventId: "CERTIFY_CANDIDATE"
    }
  };
}
function makeOutput() {
  return {
    actions: 0,
    selfUse: 0,
    newPeople: 0,
    followups: 0,
    customers: 0,
    sales: 0,
    newStarts: 0,
    reorders: 0,
    referrals: 0,
    candidates: 0,
    newXvisors: 0,
    personalSalesBaht: 0,
    personalXV: 0,
    commission: 0
  };
}
function deterministicNoise(state, member, salt = 0) {
  return (hashText(member.id || member.name) + Number(state.month || 0) * 97 + Number(state.rngSeed || 1) + salt) % 100;
}
function simulateTeamCycle2(state) {
  if (state.month < 2 || state.monthStats?.teamCycleDone || state.organizationMode) return state;
  const leadership = getSkillLevel(state.skills, "leadership");
  const active = (state.team || []).filter((member) => member.active);
  const reports = [];
  const birthPlans = [];
  const xircleBoost = Number(state.xircleMomentum?.strength || 0);
  let birthBudget = Math.max(1, Math.min(
    8,
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
    const salesTalent = specialty.id === "sales" ? 2 : specialty.id === "balanced" ? 1 : 0;
    const careTalent = specialty.id === "care" ? 0.1 : specialty.id === "balanced" ? 0.04 : 0;
    const builderTalent = specialty.id === "builder" ? 2 : specialty.id === "balanced" ? 1 : 0;
    const capacityScore = confidence + autonomy + teamSkill * 7 + leadership * 4 + Math.min(30, age * 3) + xircleBoost * 5;
    const newStarts = Math.max(0, Math.floor((capacityScore - 105) / 55)) + salesTalent + Number(noise > 82 && capacityScore > 115);
    const previousCustomers = Math.max(0, Number(original.customers || 0));
    const retention = Math.min(0.9, 0.48 + careTalent + teamSkill * 0.025 + leadership * 0.012 + xircleBoost * 0.015);
    const reorders = Math.floor(previousCustomers * retention);
    const customers = previousCustomers + newStarts;
    const referrals = Math.max(0, Math.floor((reorders + newStarts + (specialty.id === "care" ? 2 : 0)) / 8));
    const newPeople = Math.max(1, newStarts + referrals + builderTalent);
    const candidateGain = Math.max(
      0,
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
    const personalXV = selfUse * TUTORIAL_OFFER2.xv + reorders * TUTORIAL_OFFER2.xv + newStarts * (TUTORIAL_OFFER2.xv + XIRCLE_STARTER2.xv);
    const personalSalesBaht = selfUse * TUTORIAL_OFFER2.price + reorders * TUTORIAL_OFFER2.price + newStarts * (TUTORIAL_OFFER2.price + XIRCLE_STARTER2.price);
    const tier = getRetailTier2(personalXV);
    const commission = Math.round(personalXV * tier.rate);
    const actions = Math.max(1, Math.round(newPeople + newStarts + Math.sqrt(Math.max(0, reorders))));
    const output = {
      actions,
      selfUse,
      newPeople,
      followups: Math.min(customers, Math.ceil(newStarts / 2)),
      customers: newStarts,
      sales: newStarts + reorders,
      newStarts,
      reorders,
      referrals,
      candidates: candidateGain,
      newXvisors,
      personalSalesBaht,
      personalXV,
      commission
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
      status: newXvisors ? `พา Candidate ผ่านเส้นทางจนเป็น X-VISOR ใหม่ 1 คน` : specialty.id === "builder" ? `สร้าง Pipeline ${candidatePipeline}/3 · ${newStarts} ลูกค้าใหม่` : `${specialty.label} · ${newStarts} ลูกค้าใหม่ · ${reorders} ต่อ RoutineX`
    };
  });
  let nextSeed = Number(state.rngSeed || 1);
  let nextPersonId = Number(state.nextPersonId || 1);
  let usedNames = [...state.usedNames || []];
  const newborns = [];
  for (const plan of birthPlans) {
    const created = createPerson2({ seed: nextSeed, usedNames, source: "team", index: nextPersonId });
    nextSeed = created.nextSeed;
    nextPersonId += 1;
    usedNames = [...usedNames, created.person.name];
    const child = makeTeamMember2({
      ...created.person,
      origin: {
        sourceType: "team-candidate-pipeline",
        sourceId: plan.parentId,
        sourceName: `ทีมของ ${plan.parentName}`,
        createdMonth: state.month,
        parentPersonId: plan.parentId,
        eventId: `TEAM_CERTIFICATION_M${state.month}`
      }
    }, state, {
      id: `member-v8-${state.month}-${plan.parentId}-${nextPersonId}`,
      parentId: plan.parentId,
      generation: plan.generation
    });
    newborns.push({ ...child, confidence: Math.max(50, child.confidence), status: `${plan.parentName} พัฒนาผ่าน Candidate Pipeline` });
  }
  team = [...team, ...newborns];
  const directChildren = /* @__PURE__ */ new Map();
  team.forEach((member) => {
    if (member.parentId && member.parentId !== "player") directChildren.set(member.parentId, (directChildren.get(member.parentId) || 0) + 1);
  });
  team = team.map((member) => {
    const downstreamXvisors = directChildren.get(member.id) || 0;
    const becomesXlead = member.rank === "xlead" || downstreamXvisors >= 3 && (Number(member.teamSkill || 1) >= 5 || Number(member.leaderReadiness || 0) >= 65);
    return { ...member, downstreamXvisors, rank: becomesXlead ? "xlead" : "xvisor" };
  });
  const xleads = team.filter((member) => member.rank === "xlead").map((member) => member.id);
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
      teamXV: Number(state.economy?.teamXV || 0) + teamXV
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
      teamOutput: reports.slice(0, 50)
    },
    career: {
      ...state.career,
      totalTeamActions: Number(state.career?.totalTeamActions || 0) + teamActions
    },
    organization: {
      ...state.organization,
      totalActivity: Number(state.organization?.totalActivity || 0) + teamActions,
      tgv: monthlyTgv,
      xleads,
      breakawayVolume: 0,
      generation: Math.max(1, ...team.map((member) => Number(member.generation || 1)))
    }
  };
}
function evaluateXlead2(state) {
  if (state.career?.xleadCertified || ["xlead", "xgen"].includes(state.rank)) return state;
  const progress = getXleadProgress(state);
  if (!progress.complete || state.career?.xleadQualified) return state;
  return {
    ...state,
    career: { ...state.career, xleadQualified: true },
    lastMessage: "🔓 XLEAD Qualification พร้อมแล้ว · เข้าสอบเพื่อปลดล็อก ② รายได้จากการพัฒนา G1"
  };
}
export {
  PLAYER_UNLOCKS,
  SKILL_DEFINITIONS,
  SKILL_IDS,
  addSkillXp,
  directMentoringAvailable,
  evaluateXlead2 as evaluateXlead,
  getPlayerLevelFromSkills,
  getSkillBenefit,
  getSkillLevel,
  getSkillSnapshot,
  getXleadProgress,
  hasPlayerUnlock,
  levelForXp,
  makeSkills,
  makeTeamMember2 as makeTeamMember,
  makeTeamOutput,
  normalizeSkills,
  simulateTeamCycle2 as simulateTeamCycle
};
