/** Real renewal clicks in isolated saves. Purchases and monthly reports come from the reducer. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeInitialState, reduceGame, serializeState, calculateEconomy, resolveRenewalPerson, EVENTS, STAGES, SAVE_KEY } from '../../xvisor/quest/game-data.js';
import { signedBaht } from '../../xvisor/quest/game-presentation.js';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4188';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-growth-team-followup';
await mkdir(output, { recursive: true });
const report = { fixture: null, checks: [], screenshots: [], errors: [], blockedApiRequests: 0 };
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };

function preparedBase(seed) {
  const initial = makeInitialState({ seed });
  let state = { ...initial, month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    milestones: { ...initial.milestones, certified: true }, encounters: { ...initial.encounters, months: [] },
    skills: { ...initial.skills, people: { xp: 150 }, knowledge: { xp: 150 }, care: { xp: 12 }, leadership: { xp: 12 } } };
  const receipts = [];
  // Discovery/qualification are prepared QA preconditions. No sales or orders
  // are inserted: every initial purchase and certification is a real event.
  for (const [index, name] of ['ลิน', 'กาย', 'แพร', 'ขิม', 'เจน', 'ปอนด์'].entries()) {
    const id = `${String.fromCharCode(97 + index)}-person`;
    const prospect = { id, name, journey: 'baseline', consent: true, measured: true, fitProducts: ['gus'],
      trust: 90, readiness: 95, adherence: 45, followups: 0, lastContactMonth: 4 };
    state = { ...state, stage: STAGES.MANAGEMENT_ROUTINE, prospects: [...state.prospects, prospect], selectedPersonId: id };
    state = reduceGame(state, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { id, planId: 'fit' });
    const customer = state.customers.find(person => person.personId === id);
    if (!customer || state.economy.lastTransaction?.kind !== 'sale') return null;
    receipts.push(state.economy.lastTransaction);
  }
  for (const personId of ['a-person', 'b-person']) {
    const customer = state.customers.find(person => person.personId === personId);
    state = { ...state, stage: STAGES.MANAGEMENT,
      customers: state.customers.map(person => person.id === customer.id ? { ...person, xvisorStage: 'case', candidateProgress: 2, candidateStartedMonth: 3 } : person) };
    state = reduceGame(state, EVENTS.CERTIFY_CANDIDATE, { id: customer.id });
    if (!state.team.some(member => member.personId === personId)) return null;
    state = reduceGame(state, EVENTS.SCENE_COMPLETE);
  }
  const pairedCustomer = state.customers.find(person => person.personId === 'a-person');
  const paired = state.team.find(person => person.personId === 'a-person');
  const only = state.team.find(person => person.personId === 'b-person');
  // A member-only legacy representation keeps the actual subscription fields
  // copied at certification, while omitting its duplicate customer record.
  state = { ...state, stage: STAGES.MANAGEMENT,
    customers: state.customers.filter(person => person.personId !== 'b-person') };
  const closed = reduceGame(state, EVENTS.END_MONTH);
  const opened = reduceGame(closed, EVENTS.START_NEXT_MONTH);
  const opening = opened.monthOpeningReport;
  if (!opening || !opening.automaticCount || opening.followUpCustomerIds[0] !== paired.id
    || !opening.followUpCustomerIds.includes(only.id)) return null;
  const targets = [
    { kind: 'paired', id: paired.id, name: paired.name, focusId: pairedCustomer.id },
    { kind: 'member-only', id: only.id, name: only.name, focusId: only.id }
  ];
  for (const target of targets) {
    const cared = reduceGame(opened, EVENTS.CARE_CUSTOMER, { id: target.id });
    const returned = reduceGame(cared, EVENTS.REORDER_CUSTOMER, { id: target.id });
    if (returned.energy !== opened.energy - 2 || returned.economy.personalXV !== opened.economy.personalXV + 7000) return null;
  }
  return { seed, closed, opened, targets, receiptCount: receipts.length };
}

let fixture;
for (let seed = 1; seed <= 1000 && !fixture; seed += 1) fixture = preparedBase(seed);
assert.ok(fixture, 'find a real mixed opening with both types pending and successful after care');
report.fixture = { seed: fixture.seed, receiptCount: fixture.receiptCount, targets: fixture.targets,
  opening: fixture.opened.monthOpeningReport };
check(`seed ${fixture.seed}: six real sales and two certifications produce automatic plus pending renewals`);

const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const readSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
const ledger = state => ({ energy: state.energy, personalXV: state.economy.personalXV, productSales: state.economy.productSales,
  sets: state.economy.sets, totalIncome: state.economy.totalIncome, reorders: state.monthStats.reorders,
  lastTransaction: state.economy.lastTransaction, opening: state.monthOpeningReport, settlements: state.settlements });

async function snapshot(page, name) {
  await page.waitForTimeout(260);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
  report.screenshots.push(`${name}.png`);
}
async function load(page) {
  await page.goto(base + '/xvisor/quest/');
  await page.evaluate(({ key, value }) => {
    localStorage.clear(); localStorage.setItem(key, value);
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
    localStorage.setItem('mc_xvisor_1b_score_sent:member-proof', 'keep-existing-score');
  }, { key: SAVE_KEY, value: serializeState(fixture.closed) });
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
  await page.locator('#actionBar [data-event="START_NEXT_MONTH"]').click();
  await page.waitForFunction(({ key, month }) => JSON.parse(localStorage.getItem(key))?.month === month, { key: SAVE_KEY, month: fixture.opened.month });
  const opened = await readSave(page);
  assert.deepEqual(opened.monthOpeningReport, fixture.opened.monthOpeningReport);
  assert.equal(opened.energy, 28);
}
async function people(page, target) {
  await page.locator('#peopleButton').click();
  if (await page.locator('[data-v9-clear-focus]').count()) await page.locator('[data-v9-clear-focus]').click();
  await page.locator('[data-v9-people-tab="renewal"]').click();
  await page.locator('[data-v9-people-search]').fill(target.name);
}
async function clickWork(page, id, event, energy) {
  const button = page.locator(`#gameDialog [data-work-event="${event}"][data-id="${id}"]`);
  assert.equal(await button.count(), 1);
  assert.equal(await button.isEnabled(), true);
  await page.waitForTimeout(380); // Respect the normal action debounce.
  await button.click();
  await page.waitForFunction(({ key, energy }) => JSON.parse(localStorage.getItem(key))?.energy === energy, { key: SAVE_KEY, energy });
  return readSave(page);
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 1000 : 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/api/**', route => {
      report.blockedApiRequests += 1;
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.errors.push(`${width}: ${error.message}`));
    try {
      for (const target of fixture.targets) {
        await load(page);
        const opened = await readSave(page);
        assert.equal(opened.customers.some(person => person.personId === 'b-person'), false);
        if (target.kind === 'paired') {
          const cta = page.locator('[data-month-follow-up]');
          assert.equal(await cta.getAttribute('data-month-follow-up'), target.id);
          assert.notEqual(target.focusId, target.id);
          await snapshot(page, `${width}-opening-paired-cta`);
          await cta.click();
          assert.equal(await page.locator('#gameDialog .people-card--team').count(), 1, 'current member-id CTA opens the paired member card');
          // A legacy report may reference this same person by customer ID.
          // Change only that reference, preserving the reducer's actual orders,
          // statuses, amounts and initial report observations.
          await page.evaluate(({ key, memberId, customerId }) => {
            const saved = JSON.parse(localStorage.getItem(key));
            for (const field of ['followUpCustomerIds', 'actionableCustomerIds']) {
              saved.monthOpeningReport[field] = saved.monthOpeningReport[field].map(id => id === memberId ? customerId : id);
            }
            localStorage.setItem(key, JSON.stringify(saved));
          }, { key: SAVE_KEY, memberId: target.id, customerId: target.focusId });
          await page.reload();
          await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
          const openingCard = page.locator('.month-opening-card');
          if (!(await openingCard.getAttribute('open') !== null)) await openingCard.locator('summary').click();
          assert.equal(await cta.getAttribute('data-month-follow-up'), target.focusId);
          await cta.click();
          assert.equal(await page.locator('#gameDialog .people-card--team').count(), 1, 'customer-id focus resolves the paired member card');
        } else await people(page, target);
        const card = page.locator('#gameDialog .people-card--team');
        assert.equal(await card.count(), 1);
        assert.match(await card.textContent(), new RegExp(target.name));
        assert.equal(await card.locator('[data-renewal-care]').isEnabled(), true);
        assert.equal(await card.locator('[data-work-event="REORDER_CUSTOMER"]').isEnabled(), true);
        await snapshot(page, `${width}-${target.kind}-care-and-followup`);
        const beforePerson = resolveRenewalPerson(opened, target.id);
        const cared = await clickWork(page, target.id, EVENTS.CARE_CUSTOMER, 27);
        const caredPerson = resolveRenewalPerson(cared, target.id);
        // Legacy offer paths can leave trust above 100; renewal chances already
        // cap it at 100. Care still improves follow-up history and adherence.
        assert.ok(Number(caredPerson.followups) > Number(beforePerson.followups || 0));
        assert.ok(Number(caredPerson.adherence) > Number(beforePerson.adherence));
        assert.ok(Number(caredPerson.trust) >= Math.min(100, Number(beforePerson.trust)) && Number(caredPerson.trust) <= 100);
        assert.equal(cared.economy.personalXV, opened.economy.personalXV);
        assert.equal(cared.economy.sets, opened.economy.sets);
        assert.equal(await page.locator('.routine-sale-result').count(), 0);
        check(`${width}px ${target.kind}: ${target.kind === 'paired' ? 'month CTA using customer-id' : 'People renewal tab'} opens the right member and CARE really helps without a purchase`);

        await people(page, target);
        const expected = reduceGame(cared, EVENTS.REORDER_CUSTOMER, { id: target.id });
        const returned = await clickWork(page, target.id, EVENTS.REORDER_CUSTOMER, 26);
        assert.equal(returned.economy.personalXV, opened.economy.personalXV + 7000);
        assert.equal(returned.economy.personalXV, expected.economy.personalXV);
        assert.equal(returned.economy.productSales, expected.economy.productSales);
        assert.equal(calculateEconomy(returned).channel1, calculateEconomy(expected).channel1);
        assert.equal(returned.economy.lastTransaction.price, 7490);
        assert.ok(returned.economy.lastTransaction.incomeDelta > 0);
        assert.deepEqual(returned.monthOpeningReport, cared.monthOpeningReport);
        const saleCard = page.locator('.routine-sale-result');
        assert.ok((await saleCard.textContent()).includes(signedBaht(returned.economy.lastTransaction.incomeDelta)));
        assert.match(await saleCard.textContent(), new RegExp(target.name));
        await snapshot(page, `${width}-${target.kind}-returned-income`);
        const savedLedger = ledger(returned);
        await page.reload();
        await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
        assert.deepEqual(ledger(await readSave(page)), savedLedger);
        assert.equal(await page.evaluate(() => localStorage.getItem('mc_xvisor_1b_score_sent:member-proof')), 'keep-existing-score');
        assert.equal(await page.locator('.toast--success').count(), 0);
        await page.locator('#peopleButton').click();
        if (await page.locator('[data-v9-clear-focus]').count()) await page.locator('[data-v9-clear-focus]').click();
        await page.locator('[data-v9-people-tab="all"]').click();
        await page.locator('[data-v9-people-search]').fill(target.name);
        assert.equal(await page.locator(`#gameDialog [data-work-event="REORDER_CUSTOMER"][data-id="${target.id}"]`).count(), 0);
        assert.equal(await page.locator('#gameDialog [data-renewal-care]').count(), 0);
        assert.match(await page.locator('#gameDialog [data-renewal-note]').textContent(), /ไม่ต้องตามซื้อซ้ำ/);
        assert.deepEqual(ledger(await readSave(page)), savedLedger);
        await snapshot(page, `${width}-${target.kind}-reload-no-second-order`);
        check(`${width}px ${target.kind}: one real 7,490-baht renewal adds 7,000 XV, exact income and unchanged opening/history survive reload without another purchase button`);
      }
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
