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
