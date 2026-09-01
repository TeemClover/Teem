import * as base from "./game-data.js?base=canonical4";

export * from "./game-data.js?base=canonical4";

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
  if (!state) return state;
  const month = Number(state.month || 0);
  const inPlayableYearOne = !state.organizationMode && !state.runComplete && month >= 1 && month <= 12;

  // Month 1 of NEW GAME+ must behave like a normal free Management month.
  // We temporarily use an internal run-mode alias so the legacy UI does not
  // paint the NEW GAME+ intro card over #sceneDetails (which was deleting the
  // Routine Builder and Management menu). The canonical runMode is restored
  // automatically at Month 2, so scoreboard/API semantics remain unchanged.
  if (state.runMode === NEW_GAME_PLUS && inPlayableYearOne && month === 1) {
    return {
      ...state,
      runMode: NEW_GAME_PLUS_FREE,
      newGamePlus: true,
      phase: state.phase === "preseason" ? "management" : state.phase,
      stage: state.stage === base.STAGES.CERTIFIED ? base.STAGES.MANAGEMENT : state.stage,
      energy: Math.max(0, Number(state.energy || 0)),
      tutorialSeen: allTutorialStagesSeen(state.tutorialSeen),
      lastMessage: state.lastMessage || "⚡ NEW GAME+ · Month 1 · เปิด Management อิสระเต็มรูปแบบ"
    };
  }

  if (state.runMode === NEW_GAME_PLUS_FREE && (month >= 2 || state.organizationMode || state.runComplete)) {
    return {
      ...state,
      runMode: NEW_GAME_PLUS,
      newGamePlus: true,
      tutorialSeen: allTutorialStagesSeen(state.tutorialSeen)
    };
  }

  if (state.runMode === NEW_GAME_PLUS_FREE) {
    return {
      ...state,
      newGamePlus: true,
      tutorialSeen: allTutorialStagesSeen(state.tutorialSeen)
    };
  }

  return state;
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
    const restoredMode = clean.runMode === NEW_GAME_PLUS_FREE && Number(clean.month || 0) === 1
      ? { ...parsed, runMode: NEW_GAME_PLUS_FREE, newGamePlus: true, tutorialSeen: allTutorialStagesSeen(parsed.tutorialSeen) }
      : parsed;
    return JSON.stringify(manualizeXgen(restoredMode, { hasPolicy: true, examPassed: isExamPassed(clean) }));
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
  if (event === base.EVENTS.XGEN_EXAM) return pendingExam(clean);
  if (event === base.EVENTS.END_MONTH && pendingExam(clean) && clean.stage === base.STAGES.MANAGEMENT) return true;
  return base.canDispatch(toBaseState(clean), event);
}

export function getBestNextActions(state, limit = 3) {
  const clean = manualizeXgen(state, { hasPolicy: true, examPassed: isExamPassed(state) });
  const requested = Math.max(8, Number(limit || 3) + 5);
  let actions = base.getBestNextActions(toBaseState(clean), requested).filter((item) => item?.event !== base.EVENTS.XGEN_EXAM && item?.type !== "xgen-exam");

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
    const key = `${item?.event || item?.type}:${item?.targetId || item?.payload?.id || ""}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()].slice(0, Math.max(1, Number(limit || 3)));
}

export function reduceGame(currentState, event, payload = {}) {
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
