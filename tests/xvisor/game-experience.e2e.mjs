/** Browser regression checks. Uses an isolated context and never sends score/profile writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { EVENTS, STAGES, SAVE_KEY, makeInitialState, reduceGame, serializeState } from '../../xvisor/quest/game-data.js';
import { makeReviewFixtures } from './game-review-fixtures.mjs';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4186';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-1.1-proof';
await mkdir(output, { recursive: true });
const report = { checks: [], screenshots: [], errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Isolated QA: external writes disabled' }) }));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
const initial = makeInitialState({ seed: 17 });
const management = { ...initial, month: 2, phase: 'management', stage: STAGES.MANAGEMENT, rank: 'xvisor', energy: 28, milestones: { ...initial.milestones, certified: true } };
const fixtures = makeReviewFixtures();
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
async function load(state) {
  await page.goto(`${base}/xvisor/quest/`);
  await page.evaluate(({ key, state }) => {
    localStorage.clear();
    localStorage.setItem(key, state);
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
  }, { key: SAVE_KEY, state: serializeState(state) });
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
}
async function capture(name) {
  const modal = await page.locator('dialog[open]').count();
  if (modal) await page.locator('dialog[open]').evaluate(async dialog => { await Promise.all(dialog.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: !modal });
  report.screenshots.push(`${name}.png`);
}
async function noOverflow() {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'page must fit the viewport');
  if (await page.locator('dialog[open]').count()) {
    assert.ok(await page.locator('dialog[open]').evaluate(dialog => { const rect = dialog.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.height <= innerHeight; }), 'dialog stays inside viewport');
  }
  const leaks = await page.evaluate(() => [...document.querySelectorAll('.v1-org-report,.v1-flow-grid,.v1-auto-plan,.growth-summary,.history-timeline,.income-contribution,.income-comparison,.income-history-row,.income-role-insight,.game-layout__controls')].filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2);
  }).map(element => element.className));
  assert.deepEqual(leaks, [], 'nested report panels must fit, not merely hide overflow');
}

try {
  await load(management);
  assert.equal(await page.locator('#choiceGuide').isVisible(), true);
  assert.equal(await page.locator('#actionBar [data-event="END_MONTH"]').count(), 0);
  assert.equal(await page.locator('#actionBar .action-button__category').count(), 3);
  check('Month 2 explains extra choices and shows three actionable, explained cards');
  await capture('month2-desktop-guide');
  await page.locator('[data-choice-dismiss]').click();
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('#choiceGuide').isVisible(), false);
  assert.equal(await page.locator('#choiceToolbar').isVisible(), true);
  check('First explanation stays acknowledged after reload; more choices remain visible');
  await page.locator('[data-choice-help]').click();
  assert.equal(await page.locator('#choiceGuide').isVisible(), true);
  await page.locator('[data-choice-dismiss]').click();
  await page.locator('#choiceToolbar [data-choice-work]').click();
  assert.equal(await page.locator('#gameDialog').evaluate(dialog => dialog.open), true);
  assert.equal(await page.locator('[data-work-event="CREATE_LEAD"][data-source="ads"]').isDisabled(), true);
  const beforeSkill = await saved();
  await page.locator('[data-work-event="TRAIN_SKILL"][data-skill="knowledge"]').click();
  const afterSkill = await saved();
  assert.equal(afterSkill.energy, beforeSkill.energy - 1);
  assert.equal(afterSkill.skills.knowledge.xp, beforeSkill.skills.knowledge.xp + 2);
  assert.equal(await page.locator('#choiceFeedback').isVisible(), true);
  check('Full action menu performs exactly one selected action with correct energy and skill payload');
  await page.locator('#incomeButton').click();
  await page.keyboard.press('Escape');
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
  check('Closing a details dialog restores page scrolling');
  await page.locator('#monthButton').click();
  assert.equal((await saved()).stage, STAGES.MANAGEMENT);
  assert.equal(await page.locator('.month-review-opportunities li').count() > 0, true);
  await capture('month2-review');
  await page.locator('[data-dialog-action="work"]').click();
  assert.equal(await page.locator('[data-work-event="CREATE_LEAD"][data-source="known"]').isVisible(), true);
  await page.locator('[data-dialog-action="close"]').click();
  await page.locator('#monthButton').click();
  await page.locator('[data-v9-end-month]').click();
  assert.equal((await saved()).stage, STAGES.MONTH_CLOSED);
  assert.equal(Object.keys((await saved()).settlements).length, 1);
  await page.locator('#actionBar [data-event="START_NEXT_MONTH"]').click();
  assert.equal((await saved()).month, 3);
  check('Early month close requires review and confirmation; settlement is posted once and Month 3 opens');

  await load({ ...management, energy: 0 });
  await page.locator('#actionBar [data-event="END_MONTH"]').click();
  assert.equal((await saved()).stage, STAGES.MANAGEMENT);
  await page.locator('[data-v9-end-month]').click();
  assert.equal((await saved()).stage, STAGES.MONTH_CLOSED);
  check('Quick-card month close also requires confirmation when energy is exhausted');

  await load({ ...management, month: 1, stage: STAGES.M1_TEAM_STARTED });
  await page.locator('#actionBar [data-event="END_MONTH"]').click();
  assert.equal(await page.locator('[data-dialog-action="work"]').count(), 0);
  await page.locator('[data-v9-end-month]').click();
  await page.locator('#actionBar [data-event="START_NEXT_MONTH"]').click();
  assert.equal((await saved()).month, 2);
  assert.equal(await page.locator('#choiceGuide').isVisible(), true);
  check('Tutorial Month 1 closes without unavailable work links and introduces choices on entering Month 2');

  await load(management);
  await page.locator('[data-choice-dismiss]').click();
  await page.locator('#actionBar button').first().evaluate(button => { button.click(); document.querySelector('#actionBar button').click(); });
  assert.equal((await saved()).energy, 27);
  check('Rapid repeated card clicks cannot accidentally perform the next action');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await load(management);
    await noOverflow();
    await capture(`month2-${width}-guide`);
    await page.locator('[data-choice-dismiss]').click();
    await capture(`month2-${width}-play`);
    await page.locator('#choiceToolbar [data-choice-work]').click();
    await noOverflow();
    await capture(`work-${width}`);
    check(`Guide, action cards and full menu fit ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(initial);
  assert.equal(await page.locator('#choiceToolbar').isVisible(), false);
  await page.locator('#actionBar button').click();
  assert.notEqual((await saved()).stage, initial.stage);
  await capture('opening-mobile-reduced-motion');
  check('Preseason remains playable and does not expose management choices');
  const ready = { ...management, month: 12, campaignComplete: true, campaignScore: { locked: true, completedMonth: 12, scoreVersion: '1.0b', runId: management.runId, completedAt: 1, bestTgv: 120000, totalIncome: 12000, bestMonthlyIncome: 1000, organizationSize: 2 }, campaignOutcome: { xgenByMonth12: false } };
  let organization = reduceGame(ready, EVENTS.ENTER_ORGANIZATION);
  await load(organization);
  const previousMonth = (await saved()).month;
  await page.locator('[data-v1-org-pass]').click();
  assert.equal((await saved()).month, previousMonth + 1);
  assert.equal(await page.locator('#choiceToolbar').isVisible(), false);
  check('Year 2 preserves one action per month and hides campaign choices');
  while (!organization.runComplete) organization = reduceGame(organization, EVENTS.END_MONTH);
  await load(organization);
  await page.locator('[data-v1b-new-game-plus]').waitFor();
  await noOverflow();
  await capture('month24-finale-mobile');
  await page.locator('[data-v1b-new-game-plus]').click();
  assert.equal((await saved()).month, 1);
  assert.equal((await saved()).stage, STAGES.MANAGEMENT);
  check('Month 24 finale fits mobile and NEW GAME+ returns to playable management');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load({ ...management, month: 3 });
  assert.equal(await page.locator('#choiceGuide').isVisible(), false);
  await page.locator('#choiceToolbar [data-choice-work]').click();
  const eventStart = Date.now();
  await page.locator('[data-work-event="RUN_XIRCLE"]').click();
  assert.equal((await saved()).stage, STAGES.XIRCLE_RUNNING);
  assert.equal((await saved()).monthStats.xircleDone, undefined);
  assert.equal(await page.locator('#actionBar button').count(), 0);
  await page.locator('#worldCanvas').screenshot({ path: path.join(output, 'art-xircle-running.png') });
  report.screenshots.push('art-xircle-running.png');
  await page.waitForFunction(() => document.body.dataset.stage === 'management');
  assert.equal((await saved()).monthStats.xircleDone, true);
  assert.equal((await saved()).xircleHistory.length, 1);
  assert.ok(Date.now() - eventStart < 2200, 'The Xircle should finish in about one second');
  check('The Xircle visibly runs, prevents other actions and grants its reward once in about one second');
  await page.waitForTimeout(400);
  await page.locator('#choiceToolbar [data-choice-work]').click();
  const meetingStart = Date.now();
  await page.locator('[data-work-event="RUN_XCADEMY"]').click();
  assert.equal((await saved()).stage, STAGES.XCADEMY_RUNNING);
  await page.locator('#worldCanvas').screenshot({ path: path.join(output, 'art-academy-running.png') });
  await page.waitForFunction(() => document.body.dataset.stage === 'management');
  report.screenshots.push('art-academy-running.png');
  assert.ok(Date.now() - meetingStart < 2000, 'meeting no longer waits 2.6 seconds');
  check('Academy meeting shows a scene and completes at the shorter pace');

  await load({ ...fixtures.management, energy: 28, monthStats: { ...fixtures.management.monthStats, openHouseDone: false, goodLuckDone: false, eventDone: false } });
  await page.locator('#choiceToolbar [data-choice-work]').click();
  await page.locator('[data-work-event="RUN_OPEN_HOUSE"]').click();
  await page.locator('body[data-stage="open_house_running"]').waitFor({ state: 'attached' });
  await page.locator('#worldCanvas').screenshot({ path: path.join(output, 'art-open-house-stage.png') });
  report.screenshots.push('art-open-house-stage.png');
  await page.waitForFunction(() => document.body.dataset.stage === 'management');
  assert.equal((await saved()).monthStats.openHouseDone, true);
  check('Open House displays its own solid stage, steps and audience before completing once');

  for (const name of ['opening', 'band', 'bandWorn', 'month2', 'management', 'seatedRoutine', 'consultation', 'classroom', 'year2', 'tokyo', 'dubai']) {
    await load(fixtures[name]);
    await page.locator('#worldCanvas').screenshot({ path: path.join(output, `art-${name}.png`) });
    report.screenshots.push(`art-${name}.png`);
  }
  check('Illustration review captured rooms, band, customers, team, organization and both travel rewards');

  await load(fixtures.monthClosed);
  assert.equal((await saved()).stage, STAGES.MONTH_CLOSED);
  assert.equal(await page.locator('#sceneDetails .growth-summary').count(), 1);
  assert.equal(await page.locator('#sceneDetails .growth-metric[data-metric="total"] > strong').textContent(), `฿${Math.round(fixtures.monthClosed.settlements['8'].totalIncome).toLocaleString('th-TH')}`);
  await page.locator('.month-summary-more > summary').click();
  await noOverflow();
  await capture('month8-growth-summary');
  check('The campaign month-end board leads with actual posted growth and expandable activity details');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await load(fixtures.year2);
    await page.locator('.organization-detail > summary').click();
    await noOverflow();
    await capture(`year2-${width}`);
    await page.locator('#historyButton').click();
    await noOverflow();
    await capture(`history-overview-${width}`);
    await page.locator('[data-history-select="month"]').selectOption('1');
    await page.locator('[data-history-select="compare"]').selectOption('12');
    await page.locator('.income-growth-more > summary').click();
    await page.locator('.income-trend > summary').click();
    await page.locator('[data-history-select="compare"]').scrollIntoViewIfNeeded();
    const historyScroll = await page.locator('#gameDialog').evaluate(dialog => dialog.scrollTop);
    await page.locator('[data-history-select="compare"]').selectOption('11');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    assert.equal(await page.locator('.income-growth-more').evaluate(details => details.open), true);
    assert.ok(Math.abs(await page.locator('#gameDialog').evaluate(dialog => dialog.scrollTop) - historyScroll) < 3, 'changing comparison preserves reading position');
    await page.locator('[data-history-select="compare"]').selectOption('12');
    await noOverflow();
    await capture(`history-${width}`);
    check(`Year 2, expanded reports and comparison controls fit ${width}px without internal clipping`);
  }
  await load(fixtures.finale);
  await page.locator('[data-open-income-history]').click();
  assert.equal(await page.locator('.history-timeline button:not(:disabled)').count(), 24);
  assert.equal(await page.locator('.income-history-card').count(), 24);
  await page.locator('[data-history-select="month"]').selectOption('1');
  await page.locator('[data-history-select="compare"]').selectOption('24');
  assert.match(await page.locator('#gameDialog h2').textContent(), /เดือน 1$/);
  const expectedFirst = Math.round(fixtures.finale.settlements['1'].totalIncome).toLocaleString('th-TH');
  assert.equal(await page.locator('#gameDialog .growth-metric[data-metric="total"] > strong').textContent(), `฿${expectedFirst}`);
  assert.equal((await saved()).runComplete, true);
  assert.equal(await page.locator('[data-channel-summary]').count(), 3);
  await page.locator('.income-comparison').scrollIntoViewIfNeeded();
  assert.match(await page.locator('.income-comparison').textContent(), /เดือน 24/);
  await capture('all24-history-comparison');
  await page.locator('[data-v9-close]').click();
  assert.equal(await page.locator('#gameDialog').evaluate(dialog => dialog.open), false);
  check('Finale opens all 24 posted months, compares exact Month 1 against Month 24 and returns to the board');
  await load(fixtures.score);
  await page.locator('[data-open-income-history]').click();
  assert.equal(await page.locator('.history-timeline button:not(:disabled)').count(), 12);
  await page.locator('[data-history-select="month"]').selectOption('1');
  assert.match(await page.locator('#gameDialog h2').textContent(), /เดือน 1$/);
  await page.locator('[data-v9-close]').click();
  assert.equal(await page.locator('[data-v1b-submit-score]').isVisible(), true);
  check('Month 12 history does not get overwritten by the score gate; closing returns to the gate');

  for (const succeeds of [true, false]) {
    await load(fixtures.score);
    let releaseResponse;
    let requestStarted;
    const started = new Promise(resolve => { requestStarted = resolve; });
    const heldResponse = new Promise(resolve => { releaseResponse = resolve; });
    const scoreRoute = async route => {
      assert.equal(route.request().method(), 'POST');
      assert.equal(JSON.parse(route.request().postData()).scoreVersion, '1.0b');
      requestStarted();
      await heldResponse;
      await route.fulfill({ status: succeeds ? 200 : 503, contentType: 'application/json', body: JSON.stringify({ ok: succeeds }) });
    };
    await context.route('**/api/xvisor-scores', scoreRoute);
    await page.locator('[data-v1b-score-name]').fill('QA score race');
    await page.locator('[data-v1b-submit-score]').click();
    await started;
    await page.locator('[data-open-income-history]').click();
    if (!succeeds) await page.locator('[data-v9-close]').click();
    releaseResponse();
    if (succeeds) {
      await page.waitForFunction(key => localStorage.getItem(key) === 'QA score race', `mc_xvisor_1b_score_sent:${fixtures.score.runId}`);
      assert.equal(await page.locator('#gameDialog').getAttribute('data-v9-dialog'), 'income');
      await page.locator('[data-v9-close]').click();
      assert.equal(await page.locator('[data-v1b-enter-org]').first().isVisible(), true);
      check('A delayed successful score response preserves the open history and existing score namespace');
    } else {
      await page.waitForFunction(() => document.querySelector('[data-v1b-score-status]')?.textContent.includes('ไม่สำเร็จ'));
      assert.equal(await page.locator('[data-v1b-submit-score]').isDisabled(), false);
      check('A delayed score failure updates the reopened gate and lets the player retry');
    }
    await context.unroute('**/api/xvisor-scores', scoreRoute);
  }

  await load({ ...management, energy: 0, tutorialSeen: {} });
  assert.equal(await page.locator('#choiceGuide').isVisible(), true);
  await page.locator('#monthButton').click();
  await page.locator('[data-v9-end-month]').click();
  await page.locator('#actionBar [data-event="START_NEXT_MONTH"]').click();
  assert.equal((await saved()).month, 3);
  assert.equal(await page.locator('#choiceGuide').isVisible(), false, 'unacknowledged tutorial automatically folds in Month 3');
  await page.locator('[data-choice-help]').click();
  assert.equal(await page.locator('#choiceGuide').isVisible(), true, 'the player can explicitly reopen the tutorial');
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('#choiceGuide').isVisible(), false, 'Month 3 resumes with a compact board');
  await page.locator('[data-choice-help]').click();
  await page.locator('[data-choice-dismiss]').click();
  assert.equal(await page.locator('#choiceGuide').isVisible(), false);
  check('Unclosed Month 2 tutorial folds automatically in Month 3 and after reload, while manual reopen and hide still work');

  await page.goto(`${base}/xvisor/`);
  assert.match(await page.locator('#playButton').textContent(), /เล่นต่อ/);
  await page.locator('#highScoreButton').click();
  await page.getByRole('button', { name: 'ลองโหลดอีกครั้ง' }).waitFor();
  assert.equal(await page.getByRole('dialog', { name: '🏆 2.0 High Score' }).isVisible(), true);
  await page.getByRole('button', { name: 'ลองโหลดอีกครั้ง' }).click();
  await page.getByRole('button', { name: 'ลองโหลดอีกครั้ง' }).waitFor();
  await capture('landing-score-retry-mobile');
  await page.locator('#scoreClose').click();
  await noOverflow();
  check('Landing resumes the existing game and failed High Score loads offer a working retry');
  assert.deepEqual(report.errors, []);
  check('No uncaught browser errors across all scenarios');
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`Proof: ${output}/report.json`);
}
