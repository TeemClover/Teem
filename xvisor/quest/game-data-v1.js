export * from './game-data-v1b-core.js?v=1.0b-core1';
import * as core from './game-data-v1b-core.js?v=1.0b-core1';

const n = (value) => Math.max(0, Number(value || 0));

function tierFromSales(salesBaht) {
  const sales = n(salesBaht);
  if (sales >= 100_000) return { id: '25', label: '25%', rate: 0.25 };
  if (sales >= 40_000) return { id: '23', label: '23%', rate: 0.23 };
  return { id: '20', label: '20%', rate: 0.20 };
}

export const getRetailTierBySalesBaht = tierFromSales;

function xgenQualified(state) {
  return Boolean(
    state?.career?.xgenQualifiedSingleMonth ||
    state?.career?.xgenQualificationRule === 'single-month' ||
    state?.career?.xgenCertified1b ||
    state?.campaignOutcome?.xgenByMonth12 ||
    state?.campaignScore?.xgenByMonth12
  );
}

function directG1Rows(state) {
  return (state?.team || [])
    .filter((member) => member.active !== false && member.parentId === 'player')
    .map((member) => {
      const personalXV = n(member.personalXV || member.monthlyOutput?.personalXV);
      const salesBaht = n(member.personalSalesBaht || member.monthlyOutput?.personalSalesBaht);
      const tier = tierFromSales(salesBaht);
      const commission = Math.round(salesBaht * tier.rate);
      return {
        id: member.id,
        name: member.name,
        personalXV,
        salesBaht,
        tier,
        commission,
        mentoring: Math.round(commission * 0.20),
      };
    });
}

function teamWithCorrectCommission(state) {
  if (!state || !Array.isArray(state.team)) return state;
  return {
    ...state,
    team: state.team.map((member) => {
      const salesBaht = n(member.personalSalesBaht || member.monthlyOutput?.personalSalesBaht);
      const tier = tierFromSales(salesBaht);
      const commission = Math.round(salesBaht * tier.rate);
      return {
        ...member,
        retailTier: tier.id,
        retailRate: tier.rate,
        commission,
        monthlyOutput: member.monthlyOutput
          ? { ...member.monthlyOutput, commission }
          : member.monthlyOutput,
      };
    }),
  };
}

function withXgenFlags(state) {
  if (!state) return state;
  const tgv = Math.round(n(state.economy?.personalXV) + n(state.economy?.teamXV));
  const hitNow = !state.organizationMode && Number(state.month || 0) <= 12 && tgv >= core.XGEN_SINGLE_MONTH_TARGET;
  const qualified = xgenQualified(state) || hitNow;
  return {
    ...state,
    rank: qualified ? 'xgen' : state.rank,
    career: {
      ...(state.career || {}),
      xgenQualified: qualified,
      xgenQualifiedSingleMonth: qualified,
      xgenQualificationRule: qualified ? 'single-month' : null,
      xgenCertified: qualified,
      xgenCertified1b: qualified,
      xgenQualifiedAtMonth: qualified
        ? Number(state.career?.xgenQualifiedAtMonth || (hitNow ? state.month : 0)) || null
        : null,
    },
    organization: {
      ...(state.organization || {}),
      xgen: qualified,
      mapUnlocked: qualified || Boolean(state.organization?.mapUnlocked),
    },
    milestones: {
      ...(state.milestones || {}),
      xgen: qualified || Boolean(state.milestones?.xgen),
    },
  };
}

export function calculateEconomy(state) {
  const raw = core.calculateEconomy(state);
  const personalXV = n(state?.economy?.personalXV);
  const personalSalesBaht = n(state?.economy?.productSales || state?.economy?.personalSalesBaht);
  const teamXV = n(state?.economy?.teamXV);
  const tgv = Math.round(personalXV + teamXV);
  const tier = tierFromSales(personalSalesBaht);
  const channel1 = Math.round(personalSalesBaht * tier.rate);
  const rows = directG1Rows(state);
  const mentoringUnlocked = Boolean(
    state?.career?.xleadCertified ||
    xgenQualified(state) ||
    ['xlead', 'xgen'].includes(state?.rank)
  );
  const channel2 = mentoringUnlocked ? rows.reduce((sum, row) => sum + row.mentoring, 0) : 0;
  const channel3 = (xgenQualified(state) || tgv >= core.XGEN_SINGLE_MONTH_TARGET)
    ? Math.round(tgv * 0.05)
    : 0;
  const projectedIncome = channel1 + channel2 + channel3;
  const totalIncome = n(state?.economy?.totalIncome ?? state?.economy?.receivedIncome);
  const closed = Boolean(state?.settlements?.[String(state?.month)]);
  return {
    ...raw,
    personalXV,
    productSales: personalSalesBaht,
    personalSalesBaht,
    teamXV,
    tgv,
    currentTGV: tgv,
    tier,
    retailTier: tier,
    retailRate: tier.rate,
    channel1,
    channel2,
    channel3,
    channel4: 0,
    directG1: rows,
    mentoringBreakdown: rows.map((row) => ({
      name: row.name,
      commission: row.commission,
      mentorIncome: row.mentoring,
    })),
    organizationIncome: channel3,
    projectedIncome,
    monthlyIncome: projectedIncome,
    teamIncome: channel2 + channel3,
    totalIncome,
    receivedIncome: totalIncome,
    lifetimeIncome: totalIncome + (closed ? 0 : projectedIncome),
  };
}

function settlementFor(state, existing = {}) {
  const economy = calculateEconomy(state);
  return {
    ...existing,
    month: Number(state.month || existing.month || 0),
    personalXV: Math.round(economy.personalXV),
    personalSalesBaht: Math.round(economy.personalSalesBaht),
    teamXV: Math.round(economy.teamXV),
    currentTGV: Math.round(economy.tgv),
    tgv: Math.round(economy.tgv),
    retailRate: economy.retailRate,
    retailTier: economy.tier.id,
    channel1: Math.round(economy.channel1),
    channel2: Math.round(economy.channel2),
    channel3: Math.round(economy.channel3),
    channel4: 0,
    totalIncome: Math.round(economy.projectedIncome),
    total: Math.round(economy.projectedIncome),
    scoreVersion: core.V1_SCORE_VERSION,
    settled: true,
  };
}

function scoreFromSettlements(state, settlements) {
  const rows = Object.values(settlements || {})
    .filter((entry) => Number(entry.month) >= 1 && Number(entry.month) <= 12);
  const tgvs = rows.map((entry) => n(entry.currentTGV || entry.tgv));
  const totals = rows.map((entry) => n(entry.totalIncome ?? entry.total));
  return {
    ...(state.campaignScore || {}),
    locked: true,
    completedMonth: 12,
    bestTgv: Math.max(0, ...tgvs),
    totalIncome: totals.reduce((sum, value) => sum + value, 0),
    bestMonthlyIncome: Math.max(0, ...totals),
    scoreVersion: core.V1_SCORE_VERSION,
    xgenByMonth12: Boolean(state.career?.xgenQualifiedSingleMonth || state.campaignOutcome?.xgenByMonth12),
  };
}

function patchTransaction(before, after) {
  const transaction = after?.economy?.lastTransaction;
  if (!transaction) return after;
  const beforeEconomy = calculateEconomy(before);
  const afterEconomy = calculateEconomy(after);
  const saleBaht = n(transaction.price);
  const saleChannel1 = Math.round(saleBaht * afterEconomy.retailRate);
  const tierTrueUp = Math.max(
    0,
    Math.round(beforeEconomy.personalSalesBaht * (afterEconomy.retailRate - beforeEconomy.retailRate)),
  );
  const channel2Delta = Math.max(0, afterEconomy.channel2 - beforeEconomy.channel2);
  const channel3Delta = Math.max(0, afterEconomy.channel3 - beforeEconomy.channel3);
  const incomeDelta = afterEconomy.projectedIncome - beforeEconomy.projectedIncome;
  return {
    ...after,
    economy: {
      ...(after.economy || {}),
      lastTransaction: {
        ...transaction,
        incomeBefore: beforeEconomy.projectedIncome,
        incomeAfter: afterEconomy.projectedIncome,
        incomeDelta,
        salesBahtBefore: beforeEconomy.personalSalesBaht,
        salesBahtAfter: afterEconomy.personalSalesBaht,
        tierBefore: beforeEconomy.tier,
        tierAfter: afterEconomy.tier,
        incomeBreakdown: {
          saleChannel1,
          tierTrueUp,
          channel2Delta,
          channel3Delta,
          total: incomeDelta,
        },
      },
    },
  };
}

function patchCampaignClose(before, after) {
  const month = Number(before.month || 0);
  if (month < 1 || month > 12) return after;
  const settledState = withXgenFlags(teamWithCorrectCommission(before));
  const existing = after.settlements?.[String(month)] || {};
  const settlement = settlementFor(settledState, existing);
  const settlements = { ...(after.settlements || {}), [String(month)]: settlement };
  const received = n(before.economy?.totalIncome ?? before.economy?.receivedIncome) + settlement.totalIncome;
  const incomeHistory = [
    ...(after.economy?.incomeHistory || []).filter((entry) => Number(entry.month) !== month),
    {
      month,
      channel1: settlement.channel1,
      channel2: settlement.channel2,
      channel3: settlement.channel3,
      channel4: 0,
      total: settlement.totalIncome,
      tgv: settlement.currentTGV,
    },
  ].sort((a, b) => Number(a.month) - Number(b.month));
  const monthSummaries = (after.monthSummaries || []).map((summary) => Number(summary.month) === month
    ? {
        ...summary,
        tgv: settlement.currentTGV,
        projectedIncome: settlement.totalIncome,
        receivedIncomeTotal: received,
        channel1: settlement.channel1,
        channel2: settlement.channel2,
        channel3: settlement.channel3,
      }
    : summary);
  let next = {
    ...after,
    settlements,
    monthSummaries,
    economy: {
      ...(after.economy || {}),
      totalIncome: received,
      receivedIncome: received,
      incomeHistory,
    },
  };
  next = withXgenFlags(next);
  if (month === 12 && next.campaignScore?.locked) {
    const xgenByMonth12 = Boolean(settlement.currentTGV >= core.XGEN_SINGLE_MONTH_TARGET || next.career?.xgenQualifiedSingleMonth);
    next = {
      ...next,
      campaignOutcome: { ...(next.campaignOutcome || {}), xgenByMonth12 },
      campaignScore: {
        ...scoreFromSettlements(next, settlements),
        xgenByMonth12,
      },
    };
  }
  return next;
}

function patchYear2Close(before, after) {
  const month = Number(before.month || 0);
  if (!before.organizationMode || month < 13 || month > 24) return after;
  const report = after.lastOrganizationReport || {};
  const personalXV = n(report.personalXV ?? after.settlements?.[String(month)]?.personalXV);
  const personalSalesBaht = n(report.personalSalesBaht ?? after.settlements?.[String(month)]?.personalSalesBaht);
  const teamXV = n(report.teamXV ?? after.settlements?.[String(month)]?.teamXV);
  const tgv = Math.round(n(report.tgv || personalXV + teamXV));
  const tier = tierFromSales(personalSalesBaht);
  const channel1 = Math.round(personalSalesBaht * tier.rate);
  const rows = directG1Rows(after);
  const channel2 = (before.career?.xleadCertified || ['xlead', 'xgen'].includes(before.rank))
    ? rows.reduce((sum, row) => sum + row.mentoring, 0)
    : 0;
  const channel3 = before.year2Path === 'xgen' ? Math.round(tgv * 0.05) : 0;
  const total = channel1 + channel2 + channel3;
  const existing = after.settlements?.[String(month)] || {};
  const settlement = {
    ...existing,
    month,
    personalXV,
    personalSalesBaht,
    teamXV,
    currentTGV: tgv,
    tgv,
    retailRate: tier.rate,
    retailTier: tier.id,
    channel1,
    channel2,
    channel3,
    channel4: 0,
    totalIncome: total,
    total,
    scoreVersion: core.V1_SCORE_VERSION,
    settled: true,
  };
  const received = n(before.economy?.totalIncome ?? before.economy?.receivedIncome) + total;
  const incomeHistory = [
    ...(after.economy?.incomeHistory || []).filter((entry) => Number(entry.month) !== month),
    { month, channel1, channel2, channel3, channel4: 0, total, tgv },
  ].sort((a, b) => Number(a.month) - Number(b.month));
  const fixedTrip = before.year2Path === 'xgen' && core.TRAVEL_MONTHS.includes(month)
    ? (after.organization?.trips || []).find((trip) => Number(trip.month) === month) || null
    : null;
  let next = {
    ...after,
    settlements: { ...(after.settlements || {}), [String(month)]: settlement },
    economy: {
      ...(after.economy || {}),
      totalIncome: received,
      receivedIncome: received,
      incomeHistory,
    },
    lastOrganizationReport: {
      ...report,
      month,
      tgv,
      personalXV,
      personalSalesBaht,
      teamXV,
      income: total,
      totalIncome: received,
      incomeBreakdown: { channel1, channel2, channel3 },
      year2Path: before.year2Path,
      trip: fixedTrip,
    },
  };
  if (next.runComplete && next.twoYearSummary) {
    const all = Object.values(next.settlements || {})
      .filter((entry) => Number(entry.month) >= 1 && Number(entry.month) <= 24);
    next = {
      ...next,
      twoYearSummary: {
        ...next.twoYearSummary,
        month24TGV: tgv,
        year2EndTGV: tgv,
        month24Income: total,
        total24Income: received,
        totalIncome: received,
        bestTGV: Math.max(0, ...all.map((entry) => n(entry.currentTGV || entry.tgv))),
        bestMonthIncome: Math.max(0, ...all.map((entry) => n(entry.totalIncome || entry.total))),
        year2Path: before.year2Path,
        trips: before.year2Path === 'xgen'
          ? (next.organization?.trips || []).filter((trip) => core.TRAVEL_MONTHS.includes(Number(trip.month)))
          : [],
      },
    };
  }
  return next;
}

function normalize(state) {
  return withXgenFlags(teamWithCorrectCommission(state));
}

export function makeInitialState(options = {}) {
  return normalize(core.makeInitialState(options));
}

export function makeNewGamePlusState(options = {}) {
  return normalize(core.makeNewGamePlusState(options));
}

export function reduceGame(currentState, event, payload = {}) {
  const before = normalize(currentState);
  let after = normalize(core.reduceGame(before, event, payload));
  if (event === core.EVENTS.END_MONTH && !before.organizationMode && Number(before.month || 0) <= 12) {
    after = patchCampaignClose(before, after);
  }
  if (event === core.EVENTS.END_MONTH && before.organizationMode) {
    after = patchYear2Close(before, after);
  }
  after = patchTransaction(before, after);
  return normalize(after);
}

export function serializeState(state) {
  return core.serializeState(normalize(state));
}

export function parseSavedState(raw) {
  return normalize(core.parseSavedState(raw));
}
