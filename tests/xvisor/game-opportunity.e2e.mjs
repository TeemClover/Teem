/** Natural discovery, full-plan and household purchases in isolated browser saves. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeInitialState, reduceGame, serializeState, getPersonContextAction, getRoutineChoices, getRecurringBaseSummary, calculateEconomy, EVENTS, STAGES, SAVE_KEY } from '../../xvisor/quest/game-data.js';
import { signedBaht } from '../../xvisor/quest/game-presentation.js';

const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4188';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-opportunity-proof';
const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
await mkdir(output, { recursive: true });
const report = { checks: [], errors: [], screenshots: [], fixtures: [] };
const check = text => { report.checks.push(text); console.log(`PASS ${text}`); };

function naturalRoutine(seed, xp = 7) {
  const initial = makeInitialState({ seed });
  // Only the qualified-player starting point is prepared. A real generated
  // person goes through the game's recommended discovery actions, without
  // inserting trust, intent, readiness, sales, success cases or purchases.
  let state = { ...initial, month: 2, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    milestones: { ...initial.milestones, certified: true },
    skills: Object.fromEntries(['people', 'knowledge', 'care', 'leadership'].map(id => [id, { xp }])) };
  state = reduceGame(state, EVENTS.CREATE_LEAD, { source: 'known' });
  const id = state.selectedPersonId;
  for (let step = 0; step < 15 && state.stage !== STAGES.MANAGEMENT_ROUTINE; step++) {
    const person = state.prospects.find(item => item.id === id);
    if (!person) return null;
    if (state.stage !== STAGES.MANAGEMENT) { state = reduceGame(state, EVENTS.SCENE_COMPLETE); continue; }
    const action = getPersonContextAction(state, person, 'prospect');
    if (!action) return null;
    state = reduceGame(state, action.event, action.payload);
  }
  return state.stage === STAGES.MANAGEMENT_ROUTINE ? state : null;
}

const fixtures = new Map();
for (let seed = 1; seed <= 8000 && fixtures.size < 5; seed++) {
  let before = naturalRoutine(seed);
  if (!before) continue;
  if (before.prospects.find(item => item.id === before.selectedPersonId)?.purchaseIntent?.kind === 'ready') before = naturalRoutine(seed, 0);
  if (!before) continue;
  const person = before.prospects.find(item => item.id === before.selectedPersonId);
  const choice = getRoutineChoices(before).find(item => item.id === 'all');
  const quantity = Number(person.purchaseIntent?.requestedQuantity || 1);
  const kind = person.purchaseIntent?.kind === 'ready' ? `ready-${quantity}` : 'ordinary';
  const after = choice.available ? reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' }) : null;
  if (after?.customers.length === 1 && after.economy.lastTransaction?.quantity === quantity && !fixtures.has(kind)) {
    fixtures.set(kind, { seed, before, after, kind, quantity });
  }
  if (!fixtures.has('declined') && choice.available && after?.prospects.some(item => item.journey === 'waiting')) {
    fixtures.set('declined', { seed, before, after, kind: 'declined', quantity });
  }
}
for (const key of ['ordinary', 'ready-1', 'ready-2', 'ready-3', 'declined']) assert.ok(fixtures.has(key), `natural ${key} fixture exists`);
for (const fixture of fixtures.values()) {
  assert.equal(fixture.before.career.totalSuccessCases, 0);
  assert.equal(fixture.before.economy.personalXV, 0);
  report.fixtures.push({ kind: fixture.kind, seed: fixture.seed, quantity: fixture.quantity });
}
check('natural Month 2 discovery reaches full plans and rare household opportunities without success-case prerequisites');

const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
const ledger = state => ({ energy: state.energy, economy: state.economy, monthStats: state.monthStats, settlements: state.settlements });
async function load(page, state) {
  await page.goto(base + '/xvisor/quest/');
  await page.evaluate(({ key, value }) => {
    localStorage.clear(); localStorage.setItem(key, value);
    localStorage.setItem('mc_xvisor_1b_score_sent:opportunity-proof', 'preserve-score');
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
  }, { key: SAVE_KEY, value: serializeState(state) });
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
}
async function fits(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page stays within viewport');
  assert.deepEqual(await page.locator('.routine-choices,.routine-sale-result').evaluateAll(elements => elements.filter(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.width && (bounds.left < -1 || bounds.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2);
  }).map(element => element.className)), []);
}
async function screenshot(page, name, selector = null) {
  const file = path.join(output, `${name}.png`);
  if (selector) await page.locator(selector).screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(`${name}.png`);
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 1000 : 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.errors.push(`${width}: ${error.message}`));
    try {
      for (const key of ['ordinary', 'ready-1', 'ready-2', 'ready-3']) {
        const fixture = fixtures.get(key);
        await load(page, fixture.before);
        const loaded = await saved(page);
        const expected = reduceGame(loaded, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
        const button = page.locator('[data-plan-id="all"]');
        assert.equal(await button.isEnabled(), true);
        await fits(page);
        if (key.startsWith('ready')) assert.match(await page.locator('body').textContent(), /กำลังหาโปรแกรม|คนที่บ้าน|ครอบครัว|มองหาโปรแกรม/);
        if (fixture.quantity > 1) {
          assert.match(await button.textContent(), new RegExp(`${fixture.quantity} ชุด`));
          await screenshot(page, `${width}-${key}-choice`, '.routine-choices');
        }
        await button.click();
        await page.waitForFunction(({ key, energy }) => JSON.parse(localStorage.getItem(key))?.energy === energy, { key: SAVE_KEY, energy: loaded.energy - 1 });
        const after = await saved(page);
        const transaction = after.economy.lastTransaction;
        assert.equal(transaction.quantity, fixture.quantity);
        assert.equal(transaction.price, 12480 * fixture.quantity);
        assert.equal(transaction.xv, 9495 * fixture.quantity);
        assert.equal(after.economy.sets, fixture.quantity);
        assert.equal(after.monthStats.sales, 1);
        assert.equal(after.customers.length, 1);
        assert.equal(getRecurringBaseSummary(after).total, 1, 'household kits never invent extra people');
        assert.equal(after.customers[0].day, 0);
        assert.equal(after.customers[0].successCase, false);
        assert.equal(after.customers[0].renewalQuantity, 1);
        assert.equal(calculateEconomy(after).channel1, calculateEconomy(expected).channel1);
        assert.equal(transaction.incomeDelta, expected.economy.lastTransaction.incomeDelta);
        const celebration = page.locator('.routine-sale-result');
        assert.ok((await celebration.textContent()).includes(signedBaht(transaction.incomeDelta)));
        if (fixture.quantity > 1) assert.match(await celebration.textContent(), new RegExp(`${fixture.quantity} ชุด`));
        await fits(page);
        await screenshot(page, `${width}-${key}-sale`, '.routine-sale-result');
        await page.locator('[data-open-receipt]').click();
        assert.ok((await page.locator('#gameDialog').textContent()).includes(transaction.price.toLocaleString('th-TH')));
        if (fixture.quantity > 1) {
          assert.match(await page.locator('#gameDialog').textContent(), /รอบถัดไป.*1 ชุด/);
          await screenshot(page, `${width}-${key}-receipt`, '#gameDialog');
        }
        const beforeReload = ledger(after);
        await page.reload();
        await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
        assert.deepEqual(ledger(await saved(page)), beforeReload);
        assert.equal(await page.locator('[data-plan-id]').count(), 0);
        assert.equal(await page.evaluate(() => localStorage.getItem('mc_xvisor_1b_score_sent:opportunity-proof')), 'preserve-score');
        check(`${width}px ${key}: full plan buys ${fixture.quantity} kit(s) once, shows exact income, keeps one customer and survives reload`);
      }
      const decline = fixtures.get('declined');
      await load(page, decline.before);
      await page.locator('[data-plan-id="all"]').click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.prospects.some(person => person.journey === 'waiting'), SAVE_KEY);
      const after = await saved(page);
      assert.equal(after.economy.personalXV, 0);
      assert.equal(after.economy.lastTransaction, null);
      assert.equal(await page.locator('.routine-sale-result').count(), 0);
      const person = after.prospects.find(person => person.journey === 'waiting');
      assert.equal(person.nextOfferMonth, 3);
      await page.reload();
      await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
      assert.equal((await saved(page)).economy.personalXV, 0);
      check(`${width}px refusal: a real decision uses one conversation, gives no sale and preserves the next-month cooldown`);
    } finally { await context.close(); }
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  throw error;
} finally {
  await browser.close();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
