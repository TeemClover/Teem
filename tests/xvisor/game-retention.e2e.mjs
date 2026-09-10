/** Real purchase/renewal interactions in isolated browser saves. No API writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeInitialState, reduceGame, serializeState, EVENTS, STAGES, SAVE_KEY } from '../../xvisor/quest/game-data.js';
import { signedBaht } from '../../xvisor/quest/game-presentation.js';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4188';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-retention-proof';
await mkdir(output, { recursive: true });
const report = { checks: [], errors: [], screenshots: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };
function management(seed = 5) {
  const initial = makeInitialState({ seed });
  return { ...initial, month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    milestones: { ...initial.milestones, certified: true }, encounters: { ...initial.encounters, months: [] },
    skills: Object.fromEntries(['people','knowledge','care','leadership'].map(id => [id, { xp: 25 }])) };
}
function existingCustomers(seed = 1) {
  const state = management(seed);
  state.customers = Array.from({ length: 24 }, (_, i) => ({
    id: `returning-${i}`, personId: `person-${i}`, name: `ลูกค้า ${i + 1}`, journey: 'day28',
    activePlan: true, customerState: 'self_directed', selfDirected: true, day: 28,
    trust: i % 3 === 0 ? 42 : 85, satisfaction: i % 3 === 0 ? 46 : 88,
    adherence: i % 3 === 0 ? 38 : 88, followups: i % 3 === 0 ? 0 : 3,
    successCase: i % 3 !== 0, measuredAgain: true, result: i % 3 === 0 ? 'หลุด' : 'ดีขึ้น',
    lastReorderMonth: 4, lastContactMonth: 4, routinePlan: { id: 'fit', products: ['gus'] },
    appearance: { shirt: '#74aea1', hair: '#263844', skin: '#dfaa83', hairStyle: i % 2 ? 'short' : 'long' },
  }));
  return reduceGame(state, EVENTS.END_MONTH);
}
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
async function load(page, state) {
  await page.goto(base + '/xvisor/quest/');
  await page.evaluate(({ key, value }) => {
    localStorage.clear(); localStorage.setItem(key, value);
    localStorage.setItem('mc_xvisor_1b_score_sent:retention-proof', 'existing-score');
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
  }, { key: SAVE_KEY, value: serializeState(state) });
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  report.screenshots.push(name + '.png');
}
async function fits(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.routine-sale-result,.month-opening-card')].filter(el => {
    const r = el.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2);
  }).map(el => el.className)), []);
}
async function followUp(page, id, event = 'REORDER_CUSTOMER') {
  await page.locator('#peopleButton').click();
  if (await page.locator('[data-v9-clear-focus]').count()) await page.locator('[data-v9-clear-focus]').click();
  await page.locator('[data-v9-people-tab="all"]').click();
  const customer = (await saved(page)).customers.find(person => person.id === id);
  await page.locator('[data-v9-people-search]').fill(customer.name);
  const action = page.locator(`#gameDialog [data-work-event="${event}"][data-id="${id}"]`);
  assert.equal(await action.isEnabled(), true);
  await action.click();
}
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 1000 : 844 }, reducedMotion: width === 320 ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
    await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(`${width}: ${error.message}`));
    try {
      const sale = management(1);
      sale.stage = STAGES.MANAGEMENT_ROUTINE;
      sale.prospects = [{ id: 'new-customer', name: 'เมย์', journey: 'baseline', consent: true, measured: true, fitProducts: ['gus'], trust: 85, readiness: 95, adherence: 40, followups: 0 }];
      sale.selectedPersonId = 'new-customer';
      await load(page, sale);
      await page.locator('[data-plan-id="fit"]').click();
      const purchased = await saved(page);
      assert.equal(purchased.customers.length, 1);
      assert.ok(purchased.economy.lastTransaction.incomeDelta > 0);
      assert.match(await page.locator('.routine-sale-result').textContent(), /เมย์/);
      assert.ok((await page.locator('.routine-sale-result').textContent()).includes(signedBaht(purchased.economy.lastTransaction.incomeDelta)));
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.equal(await page.locator('.receipt--inline').count(), 0);
      await fits(page);
      await screenshot(page, `own-sale-${width}`);
      await page.locator('.routine-sale-result [data-open-receipt]').click();
      assert.match(await page.locator('#dialogReceipt').textContent(), /12,480/);
      await page.locator('[data-dialog-action="close"]').click();
      await page.reload();
      await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
      assert.equal((await saved(page)).economy.personalXV, purchased.economy.personalXV);
      assert.equal(await page.locator('.toast--success').count(), 0);
      check(`${width}px: own sale celebrates actual income, details are optional, reload cannot resell`);

      const closed = existingCustomers();
      const expected = reduceGame(closed, EVENTS.START_NEXT_MONTH);
      const opening = expected.monthOpeningReport;
      assert.ok(opening.automaticCustomerIds.length > 0);
      assert.ok(opening.followUpCustomerIds.length > 0);
      assert.ok(opening.pausedCustomerIds.length > 0);
      await load(page, closed);
      await page.locator('#actionBar [data-event="START_NEXT_MONTH"]').click();
      const opened = await saved(page);
      assert.deepEqual(opened.monthOpeningReport, opening);
      assert.equal(opened.energy, 28);
      assert.equal(await page.locator('.month-opening-card').evaluate(el => el.open), true);
      assert.ok((await page.locator('.month-opening-card').textContent()).includes(signedBaht(opening.incomeDelta)));
      assert.equal(await page.locator('.routine-sale-result').count(), 0, 'opening report never masquerades as a single personal sale');
      await fits(page);
      await screenshot(page, `month-opening-${width}`);
      await page.locator('[data-month-follow-up]').click();
      assert.equal(await page.locator('#gameDialog[open]').count(), 1);
      assert.ok(await page.locator('#gameDialog [data-work-event="REORDER_CUSTOMER"]:enabled').count() > 0);
      await page.locator('[data-v9-close]').click();
      check(`${width}px: month opens with real automatic purchases, untouched energy, and a direct follow-up route`);

      const waiting = [...opening.followUpCustomerIds, ...opening.pausedCustomerIds];
      const outcomes = waiting.map(id => ({ id, after: reduceGame(expected, EVENTS.REORDER_CUSTOMER, { id }) }));
      const success = outcomes.find(item => item.after.economy.lastTransaction?.id !== expected.economy.lastTransaction?.id);
      const deferred = outcomes.find(item => item.after.economy.lastTransaction?.id === expected.economy.lastTransaction?.id && item.after.energy < expected.energy);
      assert.ok(success && deferred, 'fixture includes a genuine comeback and a customer who still needs space');
      await followUp(page, success.id);
      const returned = await saved(page);
      assert.equal(returned.customers.find(c => c.id === success.id).lastReorderMonth, 5);
      assert.equal(returned.energy, 27);
      assert.ok(returned.economy.lastTransaction.incomeDelta > 0);
      assert.ok((await page.locator('.routine-sale-result').textContent()).includes(signedBaht(returned.economy.lastTransaction.incomeDelta)));
      assert.equal(await page.locator('.month-opening-card').evaluate(el => el.open), false);
      await fits(page);
      await screenshot(page, `customer-returned-${width}`);
      await page.reload();
      await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
      assert.deepEqual((await saved(page)).monthOpeningReport, opening);
      assert.equal((await saved(page)).economy.personalXV, returned.economy.personalXV);
      assert.equal(await page.evaluate(() => localStorage.getItem('mc_xvisor_1b_score_sent:retention-proof')), 'existing-score');
      check(`${width}px: following up recovers a real customer once; opening counts and old score marker survive reload`);

      await load(page, expected);
      await followUp(page, deferred.id);
      const postponed = await saved(page);
      assert.equal(postponed.energy, 27);
      assert.equal(postponed.economy.personalXV, expected.economy.personalXV);
      assert.equal(await page.locator('.routine-sale-result').count(), 0);
      await fits(page);
      await screenshot(page, `customer-paused-${width}`);
      check(`${width}px: a declined renewal spends one conversation, shows no false revenue or sale celebration`);

      await load(page, expected);
      const careTarget = expected.customers.find(person => person.id === deferred.id);
      await followUp(page, deferred.id, 'CARE_CUSTOMER');
      const cared = await saved(page);
      assert.equal(cared.energy, 27);
      assert.ok(cared.customers.find(person => person.id === deferred.id).trust > careTarget.trust);
      assert.equal(cared.economy.personalXV, expected.economy.personalXV);
      assert.equal(await page.locator('.routine-sale-result').count(), 0);
      await followUp(page, deferred.id);
      assert.equal((await saved(page)).energy, 26, 'helping a Day 28 customer still leaves their renewal conversation available');
      await fits(page);
      check(`${width}px: Day 28 customers have a real care action before their renewal decision`);
    } finally { await context.close(); }
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
