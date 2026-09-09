import { calculateEconomy } from "./game-data.js";

/** Closed months always display their posted settlement, not a new projection. */
export function getEconomyView(state) {
  const economy = calculateEconomy(state);
  const settlement = state.settlements?.[String(state.month)];
  if (!settlement) return economy;
  const total = Number(settlement.totalIncome ?? settlement.total ?? 0);
  return {
    ...economy,
    tgv: Number(settlement.currentTGV ?? settlement.tgv ?? economy.tgv),
    personalXV: Number(settlement.personalXV ?? economy.personalXV),
    projectedIncome: total,
    channel1: Number(settlement.channel1 ?? 0),
    channel2: Number(settlement.channel2 ?? 0),
    channel3: Number(settlement.channel3 ?? 0),
    lifetimeIncome: Object.values(state.settlements).filter(item => item.month <= state.month).reduce((sum, item) => sum + Number(item.totalIncome ?? item.total ?? 0), 0),
  };
}

/** A reward belongs to the active month, even before its monthly report exists. */
export function getOrganizationScene(state, age = 0) {
  const report = state.lastOrganizationReport;
  if (state.runComplete) return { kind: "finale", report };
  const trip = state.activeTravel || (report?.month === state.month ? report.trip : null);
  if (trip) return { kind: "travel", report: { ...report, trip } };
  if (report?.activities?.xircle && age < 3000) return { kind: "xircle", report };
  return { kind: "organization", report };
}

export function signedBaht(value) {
  const amount = Number(value || 0);
  return `${amount < 0 ? "−" : "+"}฿${Math.round(Math.abs(amount)).toLocaleString("th-TH")}`;
}

const finite = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};
const rows = value => Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];

/** Read posted history only. Missing old-save metrics stay null; live counts never fill past months. */
export function getMonthlyHistory(state = {}) {
  const byMonth = new Map();
  const add = (value, kind, monthHint) => {
    if (!value || (kind === "settlement" && value.settled === false)) return;
    const month = finite(value.month, monthHint);
    if (!Number.isInteger(month) || month < 1 || month > Math.min(24, finite(state.month) ?? 24)) return;
    const record = byMonth.get(month) || { month };
    record[kind] = value;
    byMonth.set(month, record);
  };
  rows(state.economy?.incomeHistory).forEach(value => add(value, "legacy"));
  rows(state.monthSummaries).forEach(value => add(value, "summary"));
  rows(state.organizationReports).forEach(value => add(value, "report"));
  rows(state.organization?.reports).forEach(value => add(value, "report"));
  add(state.lastOrganizationReport, "report");
  Object.entries(state.settlements || {}).forEach(([month, value]) => add(value, "settlement", month));
  return [...byMonth.values()].sort((a, b) => a.month - b.month).map(record => {
    const { month, settlement: paid = {}, summary = {}, report = {}, legacy = {} } = record;
    const growth = paid.growth || summary.growth || report.growth || {};
    const channel = key => finite(paid[key], report.incomeBreakdown?.[key], summary.income?.[key], summary.channels?.[key], legacy[key]);
    const channel1 = channel("channel1"), channel2 = channel("channel2"), channel3 = channel("channel3");
    const total = finite(paid.totalIncome, paid.total, report.income, summary.receivedIncome, summary.projectedIncome, summary.income?.total, legacy.total, [channel1, channel2, channel3].every(value => value !== null) ? channel1 + channel2 + channel3 : null);
    return {
      month, year: month > 12 ? 2 : 1, posted: Boolean(record.settlement),
      channel1, channel2, channel3, total,
      tgv: finite(paid.currentTGV, paid.tgv, report.tgv, summary.tgv, legacy.tgv),
      personalXV: finite(paid.personalXV, report.personalXV, summary.xv),
      teamXV: finite(paid.teamXV, report.teamXV, summary.teamXV),
      activeCustomers: finite(growth.activeCustomers, paid.activeCustomers, report.activeCustomers, summary.activeCustomers),
      repeatCustomers: finite(growth.repeatCustomers, paid.repeatCustomers, report.repeatCustomers, summary.repeatCustomers),
      repeatTransactions: finite(growth.repeatTransactions, summary.reorders),
      teamCount: finite(growth.teamCount, paid.teamCount, report.xvisorCount, summary.team),
      xleadCount: finite(growth.xleadCount, paid.xleadCount, report.xleadCount, summary.xleads),
      customerScope: growth.customerScope || (month > 12 ? "organization" : "personal"),
      teamScope: growth.teamScope || (month > 12 ? "organization" : "legacy-team"),
      newCustomers: finite(growth.newCustomers, report.newCustomers, summary.newCustomers),
      netCustomers: finite(report.netCustomers),
      newXvisors: finite(growth.newXvisors, report.newXvisors, summary.newXvisors),
      netXvisors: finite(report.netXvisors),
      reorders: finite(summary.reorders),
      teamActions: finite(growth.teamActions, summary.leverage?.team, summary.teamActions),
      report: record.report || null,
    };
  });
}

export const GROWTH_METRICS = [
  { key: "total", label: "รายได้รวม", unit: "baht" },
  { key: "tgv", label: "TGV", unit: "XV" },
  { key: "repeatCustomers", label: "ลูกค้าใช้ต่อ", unit: "คน", scope: "customerScope" },
  { key: "activeCustomers", label: "ลูกค้าที่ใช้อยู่", unit: "คน", scope: "customerScope" },
  { key: "teamCount", label: "X-VISOR ในทีม", unit: "คน", scope: "teamScope" },
  { key: "channel1", label: "① ขายและดูแลลูกค้า", unit: "baht" },
  { key: "channel2", label: "② พัฒนา Direct G1", unit: "baht" },
  { key: "channel3", label: "③ บริหาร Organization", unit: "baht" },
];

/** An absent preceding month is not a zero month. Zero baselines have an absolute delta only. */
export function getMonthComparison(state, month, compareMonth = Number(month) - 1) {
  const history = getMonthlyHistory(state);
  const current = history.find(entry => entry.month === Number(month)) || null;
  const previous = history.find(entry => entry.month === Number(compareMonth)) || null;
  const metrics = GROWTH_METRICS.map(metric => {
    const value = current?.[metric.key] ?? null, baseline = previous?.[metric.key] ?? null;
    const scopeChanged = Boolean(current && previous && metric.scope && current[metric.scope] !== previous[metric.scope]);
    const delta = value === null || baseline === null || scopeChanged ? null : value - baseline;
    return { ...metric, value, baseline, delta, scopeChanged, percent: delta !== null && baseline !== 0 ? delta / Math.abs(baseline) * 100 : null, trend: delta === null ? "unknown" : delta > 0 ? "up" : delta < 0 ? "down" : "flat" };
  });
  return { current, previous, month: Number(month), compareMonth: Number(compareMonth), metrics };
}
