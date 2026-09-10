// Public 1.1 runtime: retain the 1.0b simulation, save and score contracts.
import * as base from "./game-engine.js";
import { isActionAvailable } from "./game-actions.js";
import { SKILL_DEFINITIONS, SKILL_IDS, getPlayerLevelFromSkills, getSkillLevel } from "./game-progression.js";

export * from "./game-engine.js";

const XGEN_EXAM_POLICY = "manual-xgen-exam-20260901";
const XGEN_TARGET = Number(base.XGEN_TGV_TARGET || 3_000_000);
const NEW_GAME_PLUS = "NEW_GAME_PLUS";
const NEW_GAME_PLUS_FREE = "NEW_GAME_PLUS_FREE";

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currentTgv(state) {
  try {
    return Math.max(0, Math.round(Number(base.getCurrentTGV(state) || 0)));
  } catch {
    return Math.max(0, Math.round(number(state?.economy?.personalXV) + number(state?.economy?.teamXV)));
  }
}

function rawMeta(raw) {
  try {
    const parsed = JSON.parse(raw || "null");
    return {
      hasPolicy: parsed?.career?.xgenExamPolicy === XGEN_EXAM_POLICY,
      examPassed: parsed?.career?.xgenExamPassed === true
    };
  } catch {
    return { hasPolicy: false, examPassed: false };
  }
}

function hasPolicy(state) {
  return state?.career?.xgenExamPolicy === XGEN_EXAM_POLICY;
}

function isExamPassed(state) {
  return state?.career?.xgenExamPassed === true;
}

function isQualified(state) {
  return Boolean(
    state?.career?.xgenQualifiedSingleMonth ||
    state?.career?.xgenQualificationRule === "single-month" ||
    state?.campaignOutcome?.xgenByMonth12 ||
    state?.campaignScore?.xgenByMonth12 ||
    isExamPassed(state)
  );
}

function allTutorialStagesSeen(existing = {}) {
  const seen = { ...existing };
  for (const stage of Object.values(base.STAGES || {})) seen[stage] = true;
  return seen;
}

function normalizeNewGamePlusMode(state) {
  if (!state || ![NEW_GAME_PLUS, NEW_GAME_PLUS_FREE].includes(state.runMode)) return state;
  // Read the old Month 1 alias, but persist one canonical mode now that the
  // presentation no longer overwrites Management and its Routine Builder.
  const monthOne = !state.organizationMode && !state.runComplete && Number(state.month) === 1;
  return {
    ...state,
    runMode: NEW_GAME_PLUS,
    newGamePlus: true,
    phase: monthOne && state.phase === "preseason" ? "management" : state.phase,
    stage: monthOne && state.stage === base.STAGES.CERTIFIED ? base.STAGES.MANAGEMENT : state.stage,
    tutorialSeen: allTutorialStagesSeen(state.tutorialSeen)
  };
}

function toBaseState(state) {
  if (state?.runMode !== NEW_GAME_PLUS_FREE) return state;
  return { ...state, runMode: NEW_GAME_PLUS };
}

function manualizeXgen(state, options = {}) {
  if (!state) return state;

  const career0 = state.career || {};
  const month = Number(state.month || 0);
  const tgv = currentTgv(state);
  const hitNow = !state.organizationMode && month >= 1 && month <= 12 && tgv >= XGEN_TARGET;
  const policyWasPresent = options.hasPolicy ?? hasPolicy(state);
  const preserveLegacyCertification = Boolean(options.preserveLegacyCertification && !policyWasPresent);
  const passed = policyWasPresent
    ? Boolean(options.examPassed ?? career0.xgenExamPassed)
    : preserveLegacyCertification
      ? Boolean(career0.xgenCertified || career0.xgenCertified1b || state.rank === "xgen" || state.organizationMode)
      : false;

  const qualified = Boolean(
    career0.xgenQualifiedSingleMonth ||
    career0.xgenQualificationRule === "single-month" ||
    state.campaignOutcome?.xgenByMonth12 ||
    state.campaignScore?.xgenByMonth12 ||
    hitNow ||
    passed
  );

  const qualifiedAtMonth = qualified
    ? Number(career0.xgenQualifiedAtMonth || (hitNow ? month : 0)) || null
    : null;

  const career = {
    ...career0,
    xgenExamPolicy: XGEN_EXAM_POLICY,
    xgenExamPassed: passed,
    xgenQualified: qualified,
    xgenQualifiedSingleMonth: qualified,
    xgenQualificationRule: qualified ? "single-month" : null,
    xgenQualifiedAtMonth: qualifiedAtMonth,
    xgenCertified: passed,
    xgenCertified1b: passed
  };

  let rank = state.rank;
  if (passed) rank = "xgen";
  else if (rank === "xgen") rank = career.xleadCertified ? "xlead" : "xvisor";

  const autoXgenScene = ["xgen-qualified", "xgen-qualified-1b", "xgen-exam"].includes(state.sceneReport?.kind);
  const autoXgenMilestone = !passed && state.stage === base.STAGES.XGEN_MILESTONE;
  const sceneReport = !passed && autoXgenScene
    ? qualified
      ? { kind: "xgen-exam-ready", month, tgv, target: XGEN_TARGET }
      : null
    : state.sceneReport;

  let lastMessage = state.lastMessage;
  if (!passed && qualified && (
    autoXgenScene ||
    /XGEN Qualified|Certified XGEN|เปิดอัตโนมัติ|Organization 5% เริ่ม/.test(String(lastMessage || ""))
  )) {
    lastMessage = `🎓 ถึงเกณฑ์ XGEN แล้ว · TGV เดือนนี้ ${tgv.toLocaleString("th-TH")} XV · กดสอบ XGEN เพื่อปลดล็อก ③ Organization`;
  }

  return normalizeNewGamePlusMode({
    ...state,
    stage: autoXgenMilestone ? base.STAGES.MANAGEMENT : state.stage,
    phase: autoXgenMilestone ? "management" : state.phase,
    rank,
    career,
    organization: { ...(state.organization || {}), xgen: passed },
    milestones: { ...(state.milestones || {}), xgen: passed },
    sceneReport,
    lastMessage
  });
}

function pendingExam(state) {
  return Boolean(
    !state?.organizationMode &&
    Number(state?.month || 0) >= 1 &&
    Number(state?.month || 0) <= 12 &&
    isQualified(state) &&
    !isExamPassed(state)
  );
}

function certifyXgen(state) {
  const before = manualizeXgen(state, { hasPolicy: true, examPassed: isExamPassed(state) });
  if (!isQualified(before) || isExamPassed(before) || before.organizationMode) return before;

  const tgv = currentTgv(before);
  return normalizeNewGamePlusMode({
    ...before,
    stage: base.STAGES.MANAGEMENT,
    phase: "management",
    rank: "xgen",
    career: {
      ...(before.career || {}),
      xgenExamPolicy: XGEN_EXAM_POLICY,
      xgenExamPassed: true,
      xgenQualified: true,
      xgenQualifiedSingleMonth: true,
      xgenQualificationRule: "single-month",
      xgenQualifiedAtMonth: Number(before.career?.xgenQualifiedAtMonth || before.month || 0) || null,
      xgenCertified: true,
      xgenCertified1b: true,
      xgenAtMonth: Number(before.month || 0)
    },
    organization: { ...(before.organization || {}), xgen: true, mapUnlocked: true },
    milestones: { ...(before.milestones || {}), xgen: true },
    sceneReport: { kind: "xgen-exam", passed: true, month: Number(before.month || 0), tgv, target: XGEN_TARGET },
    lastEvent: base.EVENTS.XGEN_EXAM,
    lastMessage: `🏆 Certified XGEN · TGV ${tgv.toLocaleString("th-TH")} XV · ปลดล็อก ③ Organization 5% ในเดือนนี้`,
    updatedAt: Date.now()
  });
}

export function makeInitialState(options = {}) {
  return manualizeXgen(base.makeInitialState(options), { hasPolicy: true, examPassed: false });
}

export function parseSavedState(raw) {
  const meta = rawMeta(raw);
  const parsed = base.parseSavedState(raw);
  if (!parsed) return parsed;
  return manualizeXgen(parsed, {
    hasPolicy: meta.hasPolicy,
    examPassed: meta.examPassed,
    preserveLegacyCertification: !meta.hasPolicy
  });
}

export function serializeState(state) {
  const clean = manualizeXgen(state, { hasPolicy: true, examPassed: isExamPassed(state) });
  const serialized = base.serializeState(toBaseState(clean));
  try {
    const parsed = JSON.parse(serialized);
    return JSON.stringify(manualizeXgen(parsed, { hasPolicy: true, examPassed: isExamPassed(clean) }));
  } catch {
    return serialized;
  }
}

export function calculateEconomy(state) {
  const clean = manualizeXgen(state, { hasPolicy: true, examPassed: isExamPassed(state) });
  const economy = base.calculateEconomy(toBaseState(clean));
  if (isExamPassed(clean)) return economy;

  const channel3 = Math.max(0, number(economy.channel3 || economy.organizationIncome));
  if (!channel3) return { ...economy, channel3: 0, organizationIncome: 0 };

  const projectedIncome = Math.max(0, number(economy.projectedIncome) - channel3);
  const monthlyIncome = Math.max(0, number(economy.monthlyIncome || economy.projectedIncome) - channel3);
  const teamIncome = Math.max(0, number(economy.teamIncome) - channel3);
  const totalIncome = Math.max(0, number(economy.totalIncome ?? economy.receivedIncome));
  const closed = Boolean(clean.settlements?.[String(clean.month)]);

  return {
    ...economy,
    organizationIncome: 0,
    channel3: 0,
    projectedIncome,
    monthlyIncome,
    teamIncome,
    lifetimeIncome: totalIncome + (closed ? 0 : projectedIncome)
  };
}

export function canDispatch(state, event) {
  const clean = manualizeXgen(state, { hasPolicy: true, examPassed: isExamPassed(state) });
  if ([base.STAGES.XIRCLE_RUNNING, base.STAGES.LIVE_RUNNING].includes(clean.stage)) return base.canDispatch(toBaseState(clean), event);
  if (event === base.EVENTS.XGEN_EXAM) return pendingExam(clean);
  if (event === base.EVENTS.END_MONTH && pendingExam(clean) && clean.stage === base.STAGES.MANAGEMENT) return true;
  return base.canDispatch(toBaseState(clean), event);
}

/** Current-month renewal decisions only; older saves keep their original care view. */
export function getCustomerRenewalView(state, customer) {
  const month = Number(state?.month || 0);
  if (!customer || customer.careOnly || month < 1 || Number(customer.renewalMonth) !== month
    || !["automatic", "pending", "paused"].includes(customer.renewalStatus)) return null;
  const status = customer.renewalStatus;
  const followedUp = Number(customer.lastRenewalFollowUpMonth) === month;
  const eligibility = base.getRenewalFollowupEligibility(state, customer);
  if (status === "automatic") return {
    status, month, available: false, followedUp,
    label: "ซื้อซ้ำแล้วเดือนนี้", detail: "ไม่ต้องตามซื้อซ้ำในเดือนนี้"
  };
  return {
    status, month, available: eligibility.available, followedUp,
    label: followedUp ? "ติดตามแล้ว · ขอพักต่อ" : status === "paused" ? "ขอพักรอบนี้" : "ยังไม่ซื้อซ้ำ",
    detail: followedUp
      ? `เดือนนี้คุยแล้ว เขายังขอพัก ค่อยกลับมาคุยใหม่เดือน ${month + 1}`
      : eligibility.reason || (status === "paused" ? "ฟังเหตุผลที่ขอพัก แล้วให้เขาเลือกว่าจะเริ่มอีกครั้งไหม" : "ฟังสิ่งที่ยังติดอยู่ ก่อนคุยเรื่องซื้อซ้ำ")
  };
}

function explainRenewalAction(state, action, customer) {
  if (!action || ![base.EVENTS.CARE_CUSTOMER, base.EVENTS.REORDER_CUSTOMER].includes(action.event)) return action;
  const renewal = getCustomerRenewalView(state, customer);
  if (action.event === base.EVENTS.CARE_CUSTOMER) return renewal?.available ? {
    ...action, label: `❤️ ช่วย ${customer.name} ดูสิ่งที่ติดขัด`,
    reason: "ฟังอุปสรรคและช่วยดูแล ก่อนคุยแฟ้ม X เรื่องซื้อซ้ำ"
  } : action;
  return {
    ...action, label: `📁 คุยแฟ้ม X กับ ${customer?.name || action.targetName || "ลูกค้า"}`,
    reason: renewal?.detail || action.reason || "ทบทวนสิ่งที่ทำต่อได้ แล้วให้เขาเลือกว่าจะซื้อซ้ำไหม",
    expectedOutcome: "เขาอาจเลือกซื้อซ้ำหรือขอพักต่อ"
  };
}

export function buildPersonAction(options = {}) {
  return explainRenewalAction(options.state, base.buildPersonAction(options), options.target);
}

export function getPersonContextAction(state, target, kind = null) {
  return explainRenewalAction(state, base.getPersonContextAction(state, target, kind), target);
}

const QUICK_ACTION_CONTEXT = new Map([
  [base.EVENTS.CONTACT_PROSPECT, ["people", "ต่อบทสนทนา", "นัดหมายจากความสนใจ แล้วฟังสิ่งที่เขาอยากเปลี่ยน"]],
  [base.EVENTS.MEET_PROSPECT, ["people", "ต่อบทสนทนา", "ทำความเข้าใจบริบทก่อนวางแผนให้คนนี้"]],
  [base.EVENTS.CONSULT_PROSPECT, ["people", "ต่อบทสนทนา", "ฟังให้ชัดว่าเขาต้องการความช่วยเหลือเรื่องอะไร"]],
  [base.EVENTS.BASELINE_PROSPECT, ["people", "ต่อบทสนทนา", "ขออนุญาตดูข้อมูลตั้งต้น เพื่อวางแผนให้เหมาะกับเขา"]],
  [base.EVENTS.OPEN_MANAGEMENT_ROUTINE, ["people", "วางแผน", "เลือก Routine จากบริบทที่ฟังมา โดยยังไม่ใช้พลังงาน"]],
  [base.EVENTS.OFFER_PROSPECT, ["people", "คุยแฟ้ม X", "ทบทวนแผนที่วางร่วมกัน แล้วให้เขาตัดสินใจเมื่อพร้อม"]],
  [base.EVENTS.FOLLOW_UP_DECISION, ["people", "ต่อบทสนทนา", "ครบเวลาที่ขอคิดแล้ว กลับไปฟังข้อสงสัยและความพร้อม"]],
  [base.EVENTS.FAST_TRACK_FULL_START, ["people", "คุยแฟ้ม X", "เมื่อเริ่มครบชุดแล้ว ยังต้องดูแลให้เกิดผลลัพธ์จริง"]],
  [base.EVENTS.CARE_CUSTOMER, ["care", "ดูแลลูกค้า", "พาลูกค้าไปจุดติดตามถัดไป เพิ่มความต่อเนื่องและความไว้ใจ"]],
  [base.EVENTS.REMEASURE_CUSTOMER, ["care", "ดูแลลูกค้า", "ทบทวนผลลัพธ์ก่อนตัดสินใจดูแลต่อหรือต่อ RoutineX"]],
  [base.EVENTS.REORDER_CUSTOMER, ["care", "ติดตามลูกค้าเดิม", "ฟังความพร้อม แล้วคุยแฟ้ม X เรื่องซื้อซ้ำ เขายังเลือกขอพักได้"]],
  [base.EVENTS.ASK_REFERRAL, ["growth", "สร้างโอกาส", "ให้ลูกค้าที่พร้อมช่วยแนะนำเพื่อนจากความไว้ใจ"]],
  [base.EVENTS.INVITE_XVISOR, ["team", "พัฒนาทีม", "เล่าเส้นทางให้ลูกค้าที่สนใจ ก่อนเริ่มเรียนและฝึกจริง"]],
  [base.EVENTS.START_CANDIDATE_XCADEMY, ["team", "พัฒนาทีม", "เริ่มเรียน Xcademy เพื่อเตรียมฝึกดูแลเคสจริง"]],
  [base.EVENTS.REVIEW_CANDIDATE, ["team", "พัฒนาทีม", "ทบทวนเคสจริง เพื่อเตรียมความพร้อมก่อน Certification"]],
  [base.EVENTS.CERTIFY_CANDIDATE, ["team", "พัฒนาทีม", "เคสพร้อมแล้ว ช่วยให้เขาผ่าน Certification และเริ่มเป็น G1"]],
  [base.EVENTS.MENTOR_TEAM_MEMBER, ["team", "พัฒนาทีม", "ช่วยทีมเรียนรู้จากเคส เพื่อค่อย ๆ ทำงานต่อได้ด้วยตัวเอง"]],
  [base.EVENTS.RUN_XCADEMY, ["team", "พัฒนาทีม", "ช่วยคนใหม่ Candidate และทีมเรียนรู้พร้อมกัน · สูงสุด 4 ครั้งต่อเดือน"]],
  [base.EVENTS.RUN_OPEN_HOUSE, ["growth", "สร้างโอกาส", "เปิดพื้นที่ฟังเคสจริง เพิ่มความพร้อมให้หลายคน · เดือนละครั้ง"]],
  [base.EVENTS.RUN_XIRCLE, ["event", "กิจกรรมพิเศษ", "กิจกรรมประจำรอบ ช่วยเพิ่มความพร้อมและแรงส่งให้คนในทีม"]],
  [base.EVENTS.RUN_LIVE, ["growth", "ไลฟ์คุยแฟ้ม X", "คุยกับคนที่พร้อมได้สูงสุด 3 คน แต่ละคนเลือกเองว่าจะเริ่มแผนหรือขอเวลา"]],
  [base.EVENTS.XLEAD_EXAM, ["milestone", "เลื่อนขั้น", "ผ่านเกณฑ์แล้ว สอบเพื่อปลดล็อกรายได้จากการพัฒนา G1"]],
  [base.EVENTS.XGEN_EXAM, ["milestone", "เลื่อนขั้น", "ถึงเกณฑ์ TGV แล้ว สอบเพื่อปลดล็อก ③ Organization ในเดือนนี้"]]
]);

function explainQuickAction(item) {
  const context = QUICK_ACTION_CONTEXT.get(item.event);
  return {
    ...item,
    category: item.category || context?.[0] || item.type || "work",
    categoryLabel: item.categoryLabel || context?.[1] || "ลงมือทำ",
    reason: item.reason || context?.[2] || "เลือกสิ่งที่เหมาะกับเป้าหมายเดือนนี้"
  };
}

function quickActionKey(item) {
  // Leads from different sources and practice for different skills are distinct choices.
  return [item.event || item.type, item.targetId || item.payload?.id || item.id || "", item.payload?.source || item.source || "", item.payload?.skill || item.skill || ""].join(":");
}

function managementAlternatives(state) {
  const actions = [{ type: "create-lead", event: base.EVENTS.CREATE_LEAD, payload: { source: "known" }, label: "💬 รู้จักคนใหม่", cost: 1, score: 56, category: "growth", categoryLabel: "สร้างโอกาส", reason: "เริ่มจากคนที่คุณรู้จัก แล้วค่อยฟังความต้องการของเขา" }];
  if (getPlayerLevelFromSkills(state.skills) >= 2) {
    actions.push({ type: "create-lead", event: base.EVENTS.CREATE_LEAD, payload: { source: "content" }, label: "📣 ทำคอนเทนต์ชวนคนมาคุย", cost: 1, score: 58, category: "growth", categoryLabel: "สร้างโอกาส", reason: "แบ่งปันความรู้เพื่อเริ่มบทสนทนาใหม่ คนที่ทักมายังต้องได้รับการดูแล" });
  }
  const live = base.getLiveReadiness(state);
  if (live.available) actions.push({ type: "live", event: base.EVENTS.RUN_LIVE, label: `📹 ไลฟ์คุยแฟ้ม X · คุยได้ ${Math.min(live.capacity, live.eligibleCount)} คน`, cost: live.cost, score: 140 + Math.min(live.capacity, live.eligibleCount) * 5, category: "growth", categoryLabel: "ไลฟ์คุยแฟ้ม X", reason: live.reason });
  for (const skill of SKILL_IDS) {
    const definition = SKILL_DEFINITIONS[skill];
    const level = getSkillLevel(state.skills, skill);
    actions.push({ type: "skill", event: base.EVENTS.TRAIN_SKILL, payload: { skill }, label: `${definition.icon} ฝึก${definition.name}`, cost: 1, score: 45 - level, category: "learn", categoryLabel: "ลงทุนทักษะ", reason: `เพิ่ม 2 XP ให้${definition.name} · ${definition.benefits[0]}` });
  }
  return actions;
}

export function getBestNextActions(state, limit = 3) {
  const clean = manualizeXgen(state, { hasPolicy: true, examPassed: isExamPassed(state) });
  if ([base.STAGES.XIRCLE_RUNNING, base.STAGES.LIVE_RUNNING].includes(clean.stage)) return [];
  const count = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit) || 3)) : 3;
  const management = clean.stage === base.STAGES.MANAGEMENT && !clean.organizationMode && !clean.runComplete && !clean.campaignComplete;
  // Read all current missions before filtering. A stale or unaffordable high-ranked
  // mission must not hide a useful action farther down the list.
  const current = management ? base.refreshMissions(toBaseState(clean)) : toBaseState(clean);
  const requested = Math.max(8, count + 5, (current.missions?.length || 0) + (current.prospects?.length || 0) + 16);
  let actions = base.getBestNextActions(current, requested).filter((item) => item?.event !== base.EVENTS.XGEN_EXAM && item?.type !== "xgen-exam");
  const alternatives = management ? managementAlternatives(clean) : [];
  if (management) {
    actions.push(...alternatives);
    // The older selector stops at zero energy, although opening a Routine is free.
    for (const person of clean.prospects || []) {
      if (person.journey !== "baseline") continue;
      const action = base.getPersonContextAction(clean, person, "prospect");
      if (action) actions.push({ ...action, type: "routine", score: 90 });
    }
  }
  actions = actions.filter((item) => isActionAvailable(clean, item) && (!management || canDispatch(clean, item.event)))
    .map(item => explainRenewalAction(clean, item, clean.customers?.find(person => person.id === (item.targetId || item.payload?.id || item.id))));

  if (pendingExam(clean) && clean.stage === base.STAGES.MANAGEMENT) {
    actions.unshift({
      type: "xgen-exam",
      event: base.EVENTS.XGEN_EXAM,
      label: "🎓 สอบ XGEN · ปลดล็อก ③ Organization",
      cost: 0,
      score: 10_000
    });
  }

  const unique = new Map();
  for (const item of actions) {
    const key = quickActionKey(item);
    const existing = unique.get(key);
    if (!existing || Number(item.score || 0) > Number(existing.score || 0)) unique.set(key, item);
  }
  let ranked = [...unique.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  if (!management) return ranked.slice(0, count).map(explainQuickAction);

  const useful = ranked.filter((item) => item.event !== base.EVENTS.END_MONTH);
  // Ending early remains available from the month menu. Quick choices should
  // spend attention on playable work, including free actions and pending exams.
  if (useful.length) ranked = useful;
  const explained = ranked.map((item) => {
    const alternative = alternatives.find((candidate) => quickActionKey(candidate) === quickActionKey(item));
    const merged = { ...alternative, ...item };
    if (item.event === base.EVENTS.TRAIN_SKILL && alternative) {
      merged.label = Number(item.score || 0) >= 90 ? `${alternative.label} · อัประดับ` : alternative.label;
    }
    return explainQuickAction(merged);
  });
  const selected = [];
  const categories = new Set();
  for (const item of explained) {
    if (categories.has(item.category)) continue;
    selected.push(item);
    categories.add(item.category);
    if (selected.length === count) return selected;
  }
  for (const item of explained) {
    if (selected.includes(item)) continue;
    selected.push(item);
    if (selected.length === count) break;
  }
  return selected;
}

export function reduceGame(currentState, event, payload = {}) {
  if (([base.STAGES.XIRCLE_RUNNING, base.STAGES.LIVE_RUNNING].includes(currentState.stage) || [base.EVENTS.RUN_XIRCLE, base.EVENTS.RUN_LIVE].includes(event)) && !canDispatch(currentState, event)) return currentState;
  const before = manualizeXgen(currentState, { hasPolicy: true, examPassed: isExamPassed(currentState) });

  if (event === base.EVENTS.XGEN_EXAM) return certifyXgen(before);

  if (event === base.EVENTS.END_MONTH && pendingExam(before) && before.stage === base.STAGES.MANAGEMENT) {
    return {
      ...before,
      lastMessage: "🎓 TGV ถึง 3,000,000 XV แล้ว · สอบ XGEN ก่อนจบเดือนเพื่อปลดล็อก ③ Organization ในเดือนนี้"
    };
  }

  const wasQualified = isQualified(before);
  const afterBase = base.reduceGame(toBaseState(before), event, payload);
  const resetExam = event === base.EVENTS.NEW_GAME_PLUS;
  let after = manualizeXgen(afterBase, {
    hasPolicy: true,
    examPassed: resetExam ? false : isExamPassed(before) || afterBase?.career?.xgenExamPassed === true
  });

  if (!wasQualified && isQualified(after) && !isExamPassed(after)) {
    const tgv = currentTgv(after);
    after = {
      ...after,
      sceneReport: { kind: "xgen-exam-ready", month: Number(after.month || 0), tgv, target: XGEN_TARGET },
      lastMessage: `🎓 ถึงเกณฑ์ XGEN แล้ว · TGV เดือนนี้ ${tgv.toLocaleString("th-TH")} XV · ปุ่มสอบ XGEN พร้อมแล้ว`
    };
  }

  return normalizeNewGamePlusMode(after);
}
