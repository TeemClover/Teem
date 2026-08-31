import {
  DIRECT_MENTORING_RULE,
  TUTORIAL_OFFER,
} from "./game-commercial-config.js";

export const SKILL_IDS = Object.freeze(["knowledge", "people", "care", "leadership"]);

export const SKILL_DEFINITIONS = Object.freeze({
  knowledge: Object.freeze({
    icon: "📚",
    name: "ความรู้",
    practice: "เรียน Xcademy",
    benefits: Object.freeze([
      "อธิบาย Xircle, RoutineX และขอบเขตได้ชัดขึ้น",
      "วางคำแนะนำตามบริบทได้แม่นขึ้น",
      "ลดโอกาสเสนอแผนที่เยอะเกินไป",
      "คอนเทนต์ความรู้สร้างความสนใจได้ดีขึ้น",
      "Recommendation ใช้ข้อมูลน้อยรอบลง",
    ]),
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
      "Content และ Ads ได้คนที่ตรงขึ้น",
    ]),
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
      "ลูกค้าบางคนเดินต่อเองได้หลังติดตาม",
    ]),
  }),
  leadership: Object.freeze({
    icon: "🌱",
    name: "พาทีม",
    practice: "ฝึก Mentor",
    benefits: Object.freeze([
      "Candidate เดินเส้นทาง Xcademy ชัดขึ้น",
      "X-VISOR ใหม่มั่นใจและทำเองได้เร็วขึ้น",
      "Center ช่วยหลายคนได้มากขึ้น",
      "ทีมสร้างลูกค้าและ Sale แบบ recurring",
      "ปลดล็อกเส้นทาง XLEAD และผู้นำรุ่นถัดไป",
    ]),
  }),
});

const SKILL_THRESHOLDS = Object.freeze([0, 3, 7, 12, 18, 25, 33, 42, 52, 63]);
const PLAYER_THRESHOLDS = Object.freeze([0, 4, 9, 15, 22, 30, 39, 49, 60, 72]);

export const PLAYER_UNLOCKS = Object.freeze({
  content: 2,
  referral: 3,
  ads: 4,
  strongerCenter: 5,
  candidateCoaching: 6,
  strongerGoodLuck: 7,
  teamAutonomy: 8,
});

export function makeSkills(seedXp = 0) {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, { xp: Math.max(0, Number(seedXp || 0)) }]));
}

export function normalizeSkills(skills) {
  const normalized = makeSkills();
  SKILL_IDS.forEach((id) => {
    normalized[id] = { xp: Math.max(0, Number(skills?.[id]?.xp || 0)) };
  });
  return normalized;
}

export function levelForXp(xp) {
  const amount = Math.max(0, Number(xp || 0));
  let level = 1;
  SKILL_THRESHOLDS.forEach((threshold, index) => {
    if (amount >= threshold) level = index + 1;
  });
  return Math.min(10, level);
}

export function getSkillLevel(skills, id) {
  return levelForXp(skills?.[id]?.xp || 0);
}

export function getPlayerLevelFromSkills(skills) {
  const totalXp = SKILL_IDS.reduce((sum, id) => sum + Math.max(0, Number(skills?.[id]?.xp || 0)), 0);
  let level = 1;
  PLAYER_THRESHOLDS.forEach((threshold, index) => {
    if (totalXp >= threshold) level = index + 1;
  });
  return Math.min(10, level);
}

export function getSkillSnapshot(state) {
  const skills = normalizeSkills(state?.skills);
  return {
    playerLevel: getPlayerLevelFromSkills(skills),
    skills: Object.fromEntries(SKILL_IDS.map((id) => [id, {
      ...skills[id],
      level: getSkillLevel(skills, id),
      definition: SKILL_DEFINITIONS[id],
      nextXp: SKILL_THRESHOLDS[Math.min(9, getSkillLevel(skills, id))] ?? null,
    }])),
  };
}

export function getSkillBenefit(id, level) {
  const definition = SKILL_DEFINITIONS[id] || SKILL_DEFINITIONS.knowledge;
  const index = Math.min(definition.benefits.length - 1, Math.max(0, Math.floor((Number(level || 1) - 1) / 2)));
  return definition.benefits[index];
}

export function hasPlayerUnlock(state, unlock) {
  return getPlayerLevelFromSkills(state?.skills) >= (PLAYER_UNLOCKS[unlock] || 1);
}

export function addSkillXp(state, id, amount, source = "practice") {
  if (!SKILL_IDS.includes(id)) return state;
  const skills = normalizeSkills(state.skills);
  const before = getSkillLevel(skills, id);
  const xp = Math.max(0, Number(amount || 0));
  skills[id] = { xp: skills[id].xp + xp };
  const after = getSkillLevel(skills, id);
  const gained = Math.max(0, after - before);
  const monthStats = state.monthStats
    ? { ...state.monthStats, skillLevelsGained: Number(state.monthStats.skillLevelsGained || 0) + gained }
    : state.monthStats;
  return {
    ...state,
    skills,
    playerLevel: getPlayerLevelFromSkills(skills),
    monthStats,
    lastSkillGain: gained ? { id, level: after, source, benefit: getSkillBenefit(id, after) } : null,
  };
}

export function makeTeamOutput() {
  return {
    actions: 0,
    newPeople: 0,
    followups: 0,
    customers: 0,
    sales: 0,
    reorders: 0,
    referrals: 0,
    candidates: 0,
  };
}

export function makeTeamMember(customer, state) {
  const leadership = getSkillLevel(state.skills, "leadership");
  return {
    id: `member-${customer.id}`,
    personId: customer.personId || customer.id,
    parentId: "player",
    generation: 1,
    name: customer.name,
    appearance: customer.appearance,
    active: true,
    certifiedMonth: state.month,
    confidence: Math.min(100, 46 + leadership * 3),
    autonomy: Math.min(100, 28 + leadership * 4),
    teamSkill: 1,
    customers: 0,
    sales: 0,
    reorders: 0,
    referrals: 0,
    candidates: 0,
    xv: 0,
    activity: 0,
    centerVisits: 0,
    goodLuckVisits: 0,
    downstreamXvisors: 0,
    leaderReadiness: 0,
    monthlyOutput: makeTeamOutput(),
    status: "Certified X-VISOR · กำลังเริ่มจากคนแรก",
  };
}

function deterministicBump(state, member, salt = 0) {
  const nameCode = [...String(member.name || "X")].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (Number(state.rngSeed || 1) + state.month * 31 + nameCode + salt) % 7;
}

export function simulateTeamCycle(state) {
  if (state.month < 2 || state.monthStats?.teamCycleDone) return state;
  const leadership = getSkillLevel(state.skills, "leadership");
  const playerLevel = getPlayerLevelFromSkills(state.skills);
  const reports = [];
  let teamProductSales = 0;
  let teamXV = 0;
  let teamActions = 0;
  let teamCustomers = 0;
  let teamSales = 0;
  let teamReorders = 0;
  let teamReferrals = 0;
  let teamCandidates = 0;

  const team = (state.team || []).map((member) => {
    if (!member.active) return { ...member, monthlyOutput: makeTeamOutput() };
    const score = Number(member.confidence || 0)
      + Number(member.autonomy || 0)
      + Number(member.teamSkill || 1) * 8
      + leadership * 6
      + Number(member.centerVisits || 0) * 3
      + Number(member.goodLuckVisits || 0) * 2
      + (state.rank === "xlead" ? 18 : 0)
      + (playerLevel >= PLAYER_UNLOCKS.teamAutonomy ? 10 : 0)
      + deterministicBump(state, member);
    const actions = Math.max(1, Math.min(9, Math.floor(score / 42)));
    const newPeople = score >= 72 ? 1 + (score >= 170 ? 1 : 0) : 0;
    const customerGain = score >= 88 ? 1 : 0;
    const availableCustomers = Number(member.customers || 0) + customerGain;
    const followups = availableCustomers ? Math.max(1, Math.min(4, Math.floor(actions / 2))) : 0;
    const sales = availableCustomers > 0 && score >= 102 ? 1 + (score >= 205 ? 1 : 0) : 0;
    const reorders = availableCustomers >= 2 && score >= 124 && state.month % 2 === 0 ? 1 : 0;
    const referrals = availableCustomers >= 2 && score >= 134 ? 1 : 0;
    const candidates = availableCustomers >= 3 && score >= 158 && state.month % 2 === 1 ? 1 : 0;
    const output = { actions, newPeople, followups, customers: customerGain, sales, reorders, referrals, candidates };
    const transactions = sales + reorders;
    teamProductSales += transactions * TUTORIAL_OFFER.price;
    teamXV += transactions * TUTORIAL_OFFER.xv;
    teamActions += actions;
    teamCustomers += customerGain;
    teamSales += sales;
    teamReorders += reorders;
    teamReferrals += referrals;
    teamCandidates += candidates;
    reports.push({ memberId: member.id, name: member.name, ...output });
    const autonomy = Math.min(100, Number(member.autonomy || 0) + 3 + Math.floor(leadership / 3));
    const confidence = Math.min(100, Number(member.confidence || 0) + 2);
    const teamSkill = Math.min(10, Number(member.teamSkill || 1) + (actions >= 4 ? 1 : 0));
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
      xv: Number(member.xv || 0) + transactions * TUTORIAL_OFFER.xv,
      activity: Number(member.activity || 0) + actions,
      leaderReadiness: Math.min(100, Number(member.leaderReadiness || 0) + candidates * 8 + Math.max(1, Math.floor(actions / 3))),
      monthlyOutput: output,
      status: sales
        ? `สร้าง Sale ${sales} และดูแลต่อเอง`
        : customerGain
          ? "ดูแลลูกค้าคนใหม่ได้เอง"
          : "ลงมือทำตาม Next Action ของตัวเอง",
    };
  });

  return {
    ...state,
    team,
    economy: {
      ...state.economy,
      teamProductSales: Number(state.economy?.teamProductSales || 0) + teamProductSales,
      teamXV: Number(state.economy?.teamXV || 0) + teamXV,
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
      teamOutput: reports,
    },
    career: {
      ...state.career,
      totalTeamActions: Number(state.career?.totalTeamActions || 0) + teamActions,
    },
    organization: {
      ...state.organization,
      totalActivity: Number(state.organization?.totalActivity || 0) + teamActions,
      tgv: Number(state.organization?.tgv || 0) + teamXV,
    },
  };
}

export function getXleadProgress(state) {
  const activeXvisors = (state.team || []).filter((member) => member.active).length;
  const criteria = [
    { id: "results", label: "Success Case", current: Number(state.career?.totalSuccessCases || 0), target: 2 },
    { id: "xvisors", label: "Active X-VISOR", current: activeXvisors, target: 3 },
    { id: "center", label: "Center participation", current: Number(state.career?.centers || 0), target: 2 },
    { id: "activity", label: "Team activity", current: Number(state.career?.totalTeamActions || 0), target: 12 },
    { id: "leadership", label: "พาทีม", current: getSkillLevel(state.skills, "leadership"), target: 4 },
  ];
  return {
    criteria,
    complete: criteria.every((item) => item.current >= item.target),
    note: "เกณฑ์จำลองเพื่อการเล่นเกม ไม่ใช่เกณฑ์คุณสมบัติ XLEAD อย่างเป็นทางการ",
  };
}

export function evaluateXlead(state) {
  if (state.rank === "xlead") return state;
  const progress = getXleadProgress(state);
  if (!progress.complete) return state;
  return {
    ...state,
    rank: "xlead",
    career: { ...state.career, xleadAtMonth: state.month },
    organization: { ...state.organization, mapUnlocked: true },
    milestones: { ...state.milestones, firstXlead: true },
    lastMessage: "คุณก้าวสู่ XLEAD ในเกม เพราะทีมเริ่มสร้างผลลัพธ์และพัฒนาคนต่อได้",
  };
}

export function directMentoringAvailable() {
  return DIRECT_MENTORING_RULE.status === "CONFIRMED" && Number.isFinite(DIRECT_MENTORING_RULE.rate);
}
