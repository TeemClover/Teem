import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, makeInitialState, reduceGame, parseSavedState, serializeState } from '../../xvisor/quest/game-data.js';
import { getMonthlyHistory, getMonthComparison } from '../../xvisor/quest/game-presentation.js';
import { monthGrowthHtml } from '../../xvisor/quest/game-panels.js';

const settlement = (month, total = month * 100) => ({ month, settled: true, currentTGV: month * 1000, totalIncome: total, channel1: total, channel2: 0, channel3: 0 });

test('all 24 completed months remain available and posted zero wins over stale summaries', () => {
  const state = {
    month: 24,
    settlements: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, settlement(i + 1)])),
    monthSummaries: [{ month: 24, projectedIncome: 999999, income: { channel1: 999999 } }],
    organizationReports: [{ month: 24, income: 999999, incomeBreakdown: { channel1: 999999 } }],
    economy: { incomeHistory: [{ month: 24, total: 999999, channel1: 999999 }] },
  };
  state.settlements[24] = settlement(24, 0);
  const before = JSON.stringify(state);
  const history = getMonthlyHistory(state);
  assert.deepEqual(history.map(row => row.month), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.equal(history[23].total, 0);
  assert.equal(history[23].channel1, 0);
  assert.equal(history[23].tgv, 24000);
  assert.equal(JSON.stringify(state), before);
});

test('legacy income and summary records merge without making up customer counts', () => {
  const history = getMonthlyHistory({
    month: 14, customers: Array.from({ length: 99 }), team: Array.from({ length: 88 }),
    monthSummaries: [{ month: 1, projectedIncome: 250, reorders: 3, team: 2, tgv: 3000 }],
    economy: { incomeHistory: [{ month: 1, channel1: 200, channel2: 50, channel3: 0, total: 250 }, { month: 2, total: 0 }] },
    lastOrganizationReport: { month: 13, income: 100, totalIncome: 50000, repeatCustomers: 7, activeCustomers: 12, xvisorCount: 5, incomeBreakdown: { channel1: 100, channel2: 0, channel3: 0 } },
  });
  assert.deepEqual(history.map(row => row.month), [1, 2, 13]);
  assert.equal(history[0].channel2, 50);
  assert.equal(history[0].repeatCustomers, null, 'three reorder transactions do not establish three unique people');
  assert.equal(history[0].repeatTransactions, 3);
  assert.equal(history[0].activeCustomers, null, 'current customer count must never fill the past');
  assert.equal(history[1].channel1, null);
  assert.equal(history[1].teamCount, null);
  assert.equal(history[2].total, 100, 'report.totalIncome is cumulative, not monthly income');
  assert.equal(history[2].repeatCustomers, 7);
});

test('malformed, future, and unposted records do not become completed months', () => {
  const rows = getMonthlyHistory({ month: 3, settlements: {
    1: { totalIncome: 0, channel1: 0, channel2: 0, channel3: 0 },
    2: { month: 2, settled: false, totalIncome: 500 },
    4: settlement(4), 25: settlement(25), invalid: { month: 1.5, totalIncome: 123 },
  } });
  assert.deepEqual(rows.map(row => row.month), [1]);
  assert.equal(rows[0].total, 0);
  assert.equal(rows[0].tgv, null);
});

test('month comparisons retain declines, exact zero, and arbitrary comparison months', () => {
  const state = { month: 4, settlements: { 1: settlement(1, 1000), 2: settlement(2, 500), 3: settlement(3, 0), 4: settlement(4, 250) } };
  const decline = getMonthComparison(state, 2).metrics.find(metric => metric.key === 'total');
  assert.equal(decline.delta, -500);
  assert.equal(decline.percent, -50);
  assert.equal(decline.trend, 'down');
  const fromZero = getMonthComparison(state, 4).metrics[0];
  assert.equal(fromZero.delta, 250);
  assert.equal(fromZero.percent, null, 'division by zero must not display Infinity or invented 100%');
  assert.equal(getMonthComparison(state, 4, 1).metrics[0].delta, -750);
  assert.equal(getMonthComparison(state, 2, 2).metrics[0].trend, 'flat');
  assert.equal(getMonthComparison(state, 1).metrics[0].delta, null);
});

test('a missing preceding month never becomes a zero baseline or a different month', () => {
  const state = { month: 4, settlements: { 1: settlement(1), 4: settlement(4) } };
  const comparison = getMonthComparison(state, 4);
  assert.equal(comparison.previous, null);
  assert.equal(comparison.metrics[0].delta, null);
  assert.equal(getMonthComparison(state, 4, 1).metrics[0].delta, 300);
});

test('personal-to-organization counts are labeled as a scope change, not fabricated growth', () => {
  const state = { month: 13, settlements: {
    12: { ...settlement(12), growth: { activeCustomers: 10, repeatCustomers: 5, teamCount: 2, customerScope: 'personal', teamScope: 'direct' } },
    13: { ...settlement(13), growth: { activeCustomers: 200, repeatCustomers: 70, teamCount: 30, customerScope: 'organization', teamScope: 'organization' } },
  } };
  const metrics = getMonthComparison(state, 13).metrics;
  for (const key of ['activeCustomers', 'repeatCustomers', 'teamCount']) {
    const metric = metrics.find(item => item.key === key);
    assert.equal(metric.scopeChanged, true);
    assert.equal(metric.delta, null);
  }
  assert.equal(metrics.find(item => item.key === 'total').delta, 100, 'same-unit money remains comparable');
  assert.match(monthGrowthHtml(state, 13), /ขอบเขตเปลี่ยน/);
});

test('historical organization reports survive a complete Year 2 and save reload with posted economics', () => {
  const initial = makeInitialState({ seed: 83 });
  const ready = { ...initial, month: 12, phase: 'management', stage: 'month_closed', rank: 'xlead',
    campaignComplete: true, campaignOutcome: { xgenByMonth12: false }, career: { ...initial.career, xleadCertified: true },
    campaignScore: { locked: true, completedMonth: 12, runId: initial.runId, bestTgv: 1250000, totalIncome: 420000, bestMonthlyIncome: 110000, organizationSize: 2 },
    settlements: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, settlement(i + 1)])),
  };
  let state = reduceGame(ready, EVENTS.ENTER_ORGANIZATION);
  while (!state.runComplete) state = reduceGame(state, EVENTS.END_MONTH);
  const restored = parseSavedState(serializeState(state));
  const history = getMonthlyHistory(restored);
  assert.equal(history.length, 24);
  assert.equal(restored.organizationReports.length, 12);
  for (const row of history.filter(item => item.year === 2)) {
    const report = restored.organizationReports.find(item => item.month === row.month);
    assert.equal(row.total, restored.settlements[row.month].totalIncome);
    assert.equal(row.repeatCustomers, report.repeatCustomers);
    assert.equal(row.activeCustomers, report.activeCustomers);
    assert.equal(row.teamCount, report.xvisorCount);
    assert.equal(row.channel3, 0, 'XLEAD path must not gain Organization income in the viewer');
  }
  const html = monthGrowthHtml(restored, 13);
  assert.match(html, /MONTH 13/);
  assert.match(html, /ปิดยอดแล้ว/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
