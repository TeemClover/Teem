/** Income layout QA in an isolated browser context; external API requests are blocked. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SAVE_KEY, STAGES, makeInitialState, serializeState } from '../../xvisor/quest/game-data.js';
import { makeReviewFixtures } from './game-review-fixtures.mjs';
import { getMonthlyHistory, getMonthComparison } from '../../xvisor/quest/game-presentation.js';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4186';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-income-layout-proof';
await mkdir(output, { recursive: true });
const report = { checks: [], screenshots: [], errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Isolated income QA: API writes disabled' }) }));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
const fixtures = makeReviewFixtures();
const money = value => value === null ? 'ไม่เคยบันทึก' : `฿${Math.round(value).toLocaleString('th-TH')}`;
const channels = ['channel1', 'channel2', 'channel3'];
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };

async function load(state) {
  await page.goto(`${base}/xvisor/quest/`);
  await page.evaluate(({ key, state }) => {
    localStorage.clear();
    localStorage.setItem(key, state);
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
  }, { key: SAVE_KEY, state: serializeState(state) });
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
  if (state.campaignScore?.locked || state.runComplete) await page.locator('[data-open-income-history]').first().click();
  else await page.locator('#historyButton').click();
  await page.locator('#gameDialog[data-v9-dialog="income"]').waitFor();
  await page.locator('#gameDialog').evaluate(async dialog => { await Promise.all(dialog.getAnimations().map(animation => animation.finished.catch(() => {}))); });
}
async function capture(name, target = null) {
  if (target) await target.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
  report.screenshots.push(`${name}.png`);
}
async function compareExact(state, selectedMonth, compareMonth) {
  await page.locator('[data-history-select="month"]').selectOption(String(selectedMonth));
  await page.locator('[data-history-select="compare"]').selectOption(String(compareMonth));
  const expected = getMonthComparison(state, selectedMonth, compareMonth);
  for (const channel of channels) {
    const card = page.locator(`[data-channel-summary="${channel}"]`);
    const metric = expected.metrics.find(item => item.key === channel);
    assert.equal(await card.locator(':scope > strong').textContent(), money(metric.value));
    assert.equal(await card.locator('.growth-baseline').textContent(), `เดือน ${compareMonth}: ${money(metric.baseline)}`);
    const delta = await card.locator('.income-channel-card__comparison > small').textContent();
    if (metric.delta === null) assert.match(delta, /ไม่มีข้อมูล/);
    else if (metric.delta === 0) assert.equal(delta, 'เท่าเดิม');
    else {
      assert.ok(delta.includes(money(Math.abs(metric.delta))), `${channel} must show its exact absolute change`);
      assert.match(delta, metric.delta > 0 ? /↑ \+/ : /↓ −/);
    }
  }
  const extra = expected.current.channel2 === null || expected.current.channel3 === null ? null : expected.current.channel2 + expected.current.channel3;
  assert.equal(await page.locator('.income-role-insight > strong').textContent(), money(extra));
  assert.match(await page.locator('.income-role-insight').textContent(), /② \+ ③/);
}
async function assertUnexpandedRows(state, width) {
  const history = getMonthlyHistory(state);
  assert.equal(await page.locator('.income-history-card').count(), history.length);
  assert.equal(await page.locator('.income-history-card[open]').count(), 0);
  for (const item of history) {
    const row = page.locator(`.income-history-card[data-month="${item.month}"] > summary`);
    for (const channel of channels) {
      const amount = row.locator(`[data-history-channel="${channel}"] > b`);
      assert.equal(await amount.isVisible(), true, `Month ${item.month} ${channel} must be visible without expansion at ${width}px`);
      assert.equal(await amount.textContent(), money(item[channel]));
    }
    assert.equal(await row.locator('.income-history-row__total > b').textContent(), money(item.total));
  }
  const geometry = await page.locator('.income-history-card > summary').first().evaluate(row => {
    const bounds = element => { const rect = element.getBoundingClientRect(); return { top: rect.top, left: rect.left, right: rect.right }; };
    return { month: bounds(row.querySelector('.income-history-row__month')), total: bounds(row.querySelector('.income-history-row__total')), channels: [...row.querySelectorAll('[data-history-channel]')].map(bounds) };
  });
  assert.ok(Math.max(...geometry.channels.map(rect => rect.top)) - Math.min(...geometry.channels.map(rect => rect.top)) < 3, 'the three monthly channels share one horizontal row');
  if (width >= 641) assert.ok(geometry.channels.every(rect => Math.abs(rect.top - geometry.total.top) < 5), 'desktop totals align with all three channels');
  else assert.ok(geometry.channels.every(rect => rect.top > geometry.month.top + 5), 'mobile channels occupy a clear second row');
}
async function assertFits() {
  const leaks = await page.locator('#gameDialog').evaluate(dialog => {
    const rect = dialog.getBoundingClientRect();
    const problems = rect.left < -1 || rect.right > innerWidth + 1 || rect.height > innerHeight + 1 ? ['dialog viewport'] : [];
    for (const element of dialog.querySelectorAll('.income-comparison,.income-channel-card,.income-role-insight,.income-history-card > summary')) {
      const box = element.getBoundingClientRect();
      if (box.width && (box.left < rect.left - 1 || box.right > rect.right + 1 || element.scrollWidth > element.clientWidth + 2)) problems.push(element.className);
    }
    return problems;
  });
  assert.deepEqual(leaks, [], 'income content must fit rather than clip overflow');
}

try {
  for (const [width, height] of [[1440, 1000], [844, 390], [390, 844], [320, 720]]) {
    await page.setViewportSize({ width, height });
    await load(fixtures.finale);
    assert.equal(await page.locator('section.income-comparison').isVisible(), true);
    assert.equal(await page.locator('.income-comparison [data-channel-summary]').count(), 3);
    for (const channel of channels) assert.equal(await page.locator(`[data-channel-summary="${channel}"]`).isVisible(), true);
    assert.equal(await page.locator('.income-trend').evaluate(details => details.open), false);
    assert.equal(await page.locator('.income-growth-more').evaluate(details => details.open), false);
    assert.match(await page.locator('[data-channel-summary="channel1"]').textContent(), /20–25%/);
    assert.match(await page.locator('[data-channel-summary="channel2"]').textContent(), /20%.*Direct G1/);
    assert.match(await page.locator('[data-channel-summary="channel3"]').textContent(), /5%[\s\S]*XGEN/);
    if (width >= 641) {
      const rects = await page.locator('[data-channel-summary]').evaluateAll(elements => elements.map(element => { const rect = element.getBoundingClientRect(); return { top: rect.top, left: rect.left, right: rect.right }; }));
      assert.ok(Math.max(...rects.map(rect => rect.top)) - Math.min(...rects.map(rect => rect.top)) < 3, 'all three channel cards are horizontal on desktop and landscape');
      assert.ok(rects[0].right <= rects[1].left && rects[1].right <= rects[2].left);
    }
    await compareExact(fixtures.finale, 12, 3);
    await assertUnexpandedRows(fixtures.finale, width);
    await assertFits();
    await capture(`income-${width}-channels`, page.locator('.income-comparison'));
    if (width === 1440) {
      await capture('income-desktop-month12-channels', page.locator('.income-history-card[data-month="12"]'));
      await capture('income-desktop-month4-channels', page.locator('.income-history-card[data-month="4"]'));
    }
    await compareExact(fixtures.finale, 1, 24);
    await assertFits();
    check(`All three channels are visible before expansion, exact and aligned at ${width}×${height}; arbitrary comparison and ②+③ remain correct`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await load(fixtures.management);
  await compareExact(fixtures.management, 4, 1);
  await assertUnexpandedRows(fixtures.management, 1440);
  await load(fixtures.score);
  await compareExact(fixtures.score, 12, 4);
  await assertUnexpandedRows(fixtures.score, 1440);
  await page.locator('[data-v9-close]').click();
  assert.equal(await page.locator('[data-v1b-submit-score]').isVisible(), true);
  check('Management and Month 12 score history expose exact channels and return safely to the score gate');

  const initial = makeInitialState({ seed: 37 });
  const legacy = { ...initial, month: 2, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    settlements: { '1': { month: 1, settled: true, totalIncome: 123 } },
    monthSummaries: [{ month: 1, projectedIncome: 123 }],
    economy: { ...initial.economy, totalIncome: 123, incomeHistory: [{ month: 1, total: 123 }] },
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await load(legacy);
  for (const channel of channels) {
    assert.equal(await page.locator(`[data-channel-summary="${channel}"] > strong`).textContent(), 'ไม่เคยบันทึก');
    assert.equal(await page.locator(`[data-history-channel="${channel}"] > b`).textContent(), 'ไม่เคยบันทึก');
  }
  assert.equal(await page.locator('.income-role-insight > strong').textContent(), 'ไม่เคยบันทึก');
  assert.equal(await page.locator('.income-history-row__total > b').textContent(), '฿123');
  await assertFits();
  await capture('income-legacy-unknown');
  check('Legacy totals remain exact while missing channel details and ②+③ stay unknown instead of becoming zero');
  assert.deepEqual(report.errors, []);
  check('No uncaught browser errors across income layouts and comparisons');
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`Proof: ${output}/report.json`);
}
