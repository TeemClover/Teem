// X-VISOR QUEST 1.0b public release boundary.
// Core rules live in game-data-v1b-core.js; this file removes legacy V8/V9 XGEN behavior
// that can still leak through the inherited action/state machine.
export * from './game-data-v1b-core.js?v=1.0b-release1';
import * as core from './game-data-v1b-core.js?v=1.0b-release1';

const XGEN_TARGET = 3_000_000;
const XGEN_GOAL_VISIBLE_AT = 1_500_000;

function n(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function currentTgv(state) {
  return Math.round(n(state?.economy?.personalXV) + n(state?.economy?.teamXV));
}

function hasRealSingleMonthQualification(state) {
  return Boolean(
    state?.career?.xgenQualifiedSingleMonth ||
    state?.career?.xgenQualificationRule === 'single-month' ||
    state?.career?.xgenCertified1b ||
    state?.campaignOutcome?.xgenByMonth12 ||
    state?.campaignScore?.xgenByMonth12
  );
}

function sanitizeXgen(state) {
  if (!state) return state;
  const month = Number(state.month || 0);
  const tgv = currentTgv(state);
  const hitNow = !state.organizationMode && month >= 1 && month <= 12 && tgv >= XGEN_TARGET;
  const qualified = hasRealSingleMonthQualification(state) || hitNow;
  const career = {
    ...(state.career || {}),
    xgenQualified: qualified,
    xgenQualifiedSingleMonth: qualified,
    xgenQualificationRule: qualified ? 'single-month' : null,
    xgenCertified: qualified,
    xgenCertified1b: qualified,
    xgenQualifiedAtMonth: qualified
      ? Number(state.career?.xgenQualifiedAtMonth || (hitNow ? month : 0)) || null
      : null,
  };
  let rank = state.rank;
  if (qualified) rank = 'xgen';
  else if (rank === 'xgen') rank = career.xleadCertified ? 'xlead' : 'xvisor';

  const ghostScene = !qualified && ['xgen-qualified', 'xgen-qualified-1b', 'xgen-exam'].includes(state.sceneReport?.kind);
  const ghostMessage = !qualified && /XGEN|3,000,000/.test(String(state.lastMessage || ''));

  return {
    ...state,
    rank,
    career,
    organization: { ...(state.organization || {}), xgen: qualified },
    milestones: { ...(state.milestones || {}), xgen: qualified },
    sceneReport: ghostScene ? null : state.sceneReport,
    lastMessage: ghostMessage
      ? (tgv >= XGEN_GOAL_VISIBLE_AT
          ? `🏙️ XGEN เป้าหมาย · TGV เดือนนี้ ${tgv.toLocaleString('th-TH')} / ${XGEN_TARGET.toLocaleString('th-TH')} XV · ยังไม่ Qualified`
          : null)
      : state.lastMessage,
  };
}

function endMonthAction() {
  return { type: 'end-month', event: core.EVENTS.END_MONTH, label: '🌙 จบเดือน', cost: 0, score: 1 };
}

function canCloseCampaignMonth(state) {
  const month = Number(state?.month || 0);
  return !state?.organizationMode && !state?.runComplete && month >= 1 && month <= 12
    && state?.stage === core.STAGES.MANAGEMENT
    && !state?.settlements?.[String(month)];
}

export function calculateEconomy(state) {
  return core.calculateEconomy(sanitizeXgen(state));
}

export function makeInitialState(options = {}) {
  return sanitizeXgen(core.makeInitialState(options));
}

export function makeNewGamePlusState(options = {}) {
  return sanitizeXgen(core.makeNewGamePlusState(options));
}

export function canDispatch(state, event) {
  const clean = sanitizeXgen(state);
  // 1.0b has one XGEN trigger only. There is no separate exam gate.
  if (event === core.EVENTS.XGEN_EXAM) return false;
  if (event === core.EVENTS.END_MONTH && canCloseCampaignMonth(clean)) return true;
  return core.canDispatch(clean, event);
}

export function getBestNextActions(state, limit = 3) {
  const clean = sanitizeXgen(state);
  const requested = Math.max(8, Number(limit || 3) + 5);
  let actions = core.getBestNextActions(clean, requested)
    .filter((action) => action?.event !== core.EVENTS.XGEN_EXAM && action?.type !== 'xgen-exam');

  const canClose = canCloseCampaignMonth(clean);
  const hasEnd = actions.some((action) => action?.event === core.EVENTS.END_MONTH);
  if (canClose && Number(clean.energy || 0) <= 0) {
    actions = [endMonthAction(), ...actions.filter((action) => action?.event !== core.EVENTS.END_MONTH)];
  } else if (canClose && !hasEnd && actions.length < requested) {
    actions.push(endMonthAction());
  }

  return actions.slice(0, Math.max(1, Number(limit || 3)));
}

export function reduceGame(currentState, event, payload = {}) {
  const before = sanitizeXgen(currentState);
  if (event === core.EVENTS.XGEN_EXAM) {
    return {
      ...before,
      lastMessage: currentTgv(before) >= XGEN_TARGET
        ? '🏆 XGEN เปิดอัตโนมัติแล้วจาก TGV 3,000,000 XV ภายในเดือนเดียว · ไม่ต้องสอบซ้ำ'
        : `🏙️ XGEN ต้องแตะ ${XGEN_TARGET.toLocaleString('th-TH')} XV ภายในเดือนเดียวก่อน`,
    };
  }

  const wasQualified = hasRealSingleMonthQualification(before);
  let after = sanitizeXgen(core.reduceGame(before, event, payload));
  const nowQualified = hasRealSingleMonthQualification(after);
  if (!wasQualified && nowQualified) {
    const tgv = currentTgv(after);
    after = {
      ...after,
      sceneReport: { kind: 'xgen-qualified-1b', month: Number(after.month || 0), tgv, target: XGEN_TARGET },
      lastMessage: `🏆 XGEN Qualified · TGV เดือนนี้ ${tgv.toLocaleString('th-TH')} XV · ③ Organization 5% เริ่มในเดือนนี้ทันที`,
    };
  }
  return after;
}

export function serializeState(state) {
  return core.serializeState(sanitizeXgen(state));
}

export function parseSavedState(raw) {
  return sanitizeXgen(core.parseSavedState(raw));
}
