/** 2.0 story/routine regression. Only isolated contexts; API writes are blocked.
 * Run with XVISOR_PLAYWRIGHT, XVISOR_CHROME and optional XVISOR_BASE_URL.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  EVENTS, STAGES, SAVE_KEY, makeInitialState, reduceGame, serializeState,
  parseSavedState, getCurrentExamQuestion, getRoutineChoices,
} from '../../xvisor/quest/game-data.js';
import { getEncounterCopy } from '../../xvisor/quest/game-narrative-data.js';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4186';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-v2-storyflow';
await mkdir(output, { recursive: true });
const report = { checks: [], screenshots: [], errors: [], blockedApiRequests: 0 };
let browser, context, page, currentCheck = 'browser startup';
const flush = () => writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));

async function check(name, callback) {
  currentCheck = name;
  await callback();
  report.checks.push(name);
  console.log(`PASS ${name}`);
  await flush();
}

async function load(state) {
  await context?.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await context.route('**/api/**', route => {
    report.blockedApiRequests += 1;
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Isolated story QA: API writes disabled' }) });
  });
  // One seed per fresh browser context. Reload must resume the resulting save,
  // rather than restoring a fixture again or accessing the user's real profile.
  await context.addInitScript(({ key, saved }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
    window.__xvisorStoryFlowQuizActions = [];
    const quizzes = new Set(['pre_day7_practice', 'pre_day21_care', 'exam_active', 'exam_repair']);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.target.id !== 'worldCanvas' || !quizzes.has(document.body?.dataset.stage)) continue;
        const event = record.target.dataset.actionEvent || '';
        if (/SUBMIT|NEXT|REPAIR/.test(event)) window.__xvisorStoryFlowQuizActions.push({ stage: document.body.dataset.stage, event });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-action-event'] });
  }, { key: SAVE_KEY, saved: serializeState(state) });
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`${base}/xvisor/quest/`);
  await ready();
}

async function ready() {
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('#storyCard').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
}

async function state() {
  const raw = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
  const result = parseSavedState(raw);
  assert.ok(result, 'UI must persist a readable game save');
  return result;
}

async function click(selector) {
  const button = page.locator(selector).first();
  await button.waitFor({ state: 'visible' });
  assert.equal(await button.isEnabled(), true, `${selector} should be enabled`);
  await page.waitForTimeout(375); // actual UI protects next actions for 350ms
  await button.click();
  await quizStaysQuiet();
}

async function quizStaysQuiet() {
  const violations = await page.evaluate(async () => {
    const quizzes = new Set(['pre_day7_practice', 'pre_day21_care', 'exam_active', 'exam_repair']);
    const observed = [...(window.__xvisorStoryFlowQuizActions || [])];
    for (let frame = 0; frame < 3; frame += 1) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const stage = document.body.dataset.stage;
      const event = document.querySelector('#worldCanvas').dataset.actionEvent || '';
      if (quizzes.has(stage) && /SUBMIT|NEXT|REPAIR/.test(event)) observed.push({ stage, event });
    }
    return observed;
  });
  assert.deepEqual(violations, [], 'quiz answers must not start an action vignette or move the seated exam actor');
}

async function action(event) {
  await click(`#actionBar [data-event="${event}"]`);
  if (event === EVENTS.END_MONTH) await click('[data-v9-end-month]');
}

async function capture(name) {
  await page.waitForTimeout(300);
  await page.locator('#storyCard').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  report.screenshots.push(`${name}.png`);
}

async function canvasPainted(selector) {
  assert.equal(await page.locator(selector).evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 16) if (pixels[i + 3]) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    return colors.size > 8;
  }), true, `${selector} should contain rendered artwork`);
}

const automatic = new Set([
  STAGES.PRE_MONTAGE, STAGES.PRE_DAY0_SCANNING, STAGES.PRE_DAY14_SCANNING,
  STAGES.PRE_DAY28_SCANNING, STAGES.EXAM_TRANSIT, STAGES.CERTIFICATION_CEREMONY,
  STAGES.M1_BASELINE_SCANNING, STAGES.M1_REVIEW_SCANNING, STAGES.M1_WEEKLY_RUNNING,
  STAGES.G1_CELEBRATION, STAGES.XCADEMY_RUNNING, STAGES.XLEAD_MILESTONE,
]);

async function driveUntil(predicate, onStage = async () => {}, limit = 90) {
  for (let step = 0; step < limit; step += 1) {
    const current = await state();
    if (predicate(current)) return current;
    await onStage(current);
    if (automatic.has(current.stage)) {
      await page.waitForFunction(stage => document.body.dataset.stage !== stage, current.stage, { timeout: 6000 });
      continue;
    }
    const practice = [STAGES.PRE_DAY7_PRACTICE, STAGES.PRE_DAY21_CARE].includes(current.stage);
    const exam = [STAGES.EXAM_ACTIVE, STAGES.EXAM_REPAIR].includes(current.stage);
    if (practice || exam) {
      const feedback = practice ? current.preseason.practiceFeedback : current.exam.feedback;
      assert.notEqual(feedback, 'wrong', 'correct-answer UI flow should not enter a repair loop');
      if (!feedback) {
        const answer = practice ? current.stage === STAGES.PRE_DAY7_PRACTICE ? 'context' : 'ask_context' : getCurrentExamQuestion(current).correct;
        await click(`[data-quiz-answer="${answer}"]`);
        await action(practice ? EVENTS.SUBMIT_PRACTICE : EVENTS.SUBMIT_EXAM);
      } else await action(practice ? EVENTS.CONTINUE_PRACTICE : EVENTS.NEXT_EXAM);
      continue;
    }
    const buttons = page.locator('#actionBar button[data-event]:not(:disabled)');
    assert.equal(await buttons.count(), 1, `stage ${current.stage} must have one tutorial action`);
    const event = await buttons.first().getAttribute('data-event');
    await action(event);
  }
  assert.fail(`Tutorial did not reach target within ${limit} steps; current stage ${(await state()).stage}`);
}

function routineFixture() {
  let current = makeInitialState({ seed: 17 });
  current = { ...current, stage: STAGES.CERTIFIED, rank: 'xvisor', milestones: { ...current.milestones, certified: true } };
  for (const event of [EVENTS.START_MONTH_1, EVENTS.FIND_PERSON, EVENTS.TALK, EVENTS.REQUEST_CONSENT,
    EVENTS.START_CUSTOMER_BASELINE, EVENTS.CUSTOMER_BASELINE_COMPLETE, EVENTS.OPEN_ROUTINE_BUILDER]) current = reduceGame(current, event);
  assert.equal(current.stage, STAGES.M1_ROUTINE);
  return current;
}

function fullFixture(seed = 5) {
  const initial = makeInitialState({ seed });
  const person = { id: 'routine-person', name: 'ฟ้า', quote: 'อยากเริ่มจากแผนที่ทำได้ต่อเนื่อง',
    journey: 'baseline', consent: true, measured: true, trust: 72, readiness: 82,
    fitProducts: ['gus'], followups: 0, day: 0, adherence: 40 };
  return { ...initial, month: 4, phase: 'management', stage: STAGES.MANAGEMENT_ROUTINE,
    rank: 'xvisor', energy: 28, prospects: [person], selectedPersonId: person.id,
    skills: Object.fromEntries(['knowledge', 'people', 'care', 'leadership'].map(id => [id, { xp: 25 }])),
    career: { ...initial.career, totalSuccessCases: 2 }, encounters: { ...initial.encounters, months: [], pending: null } };
}

function encounterFixture() {
  const initial = makeInitialState({ seed: 17 });
  return { ...initial, month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 20,
    customers: [{ id: 'story-customer', name: 'ฟ้า', day: 7, trust: 40, adherence: 40, activePlan: false, careOnly: true, selfDirected: false }],
    selectedPersonId: 'story-customer', encounters: { ...initial.encounters, months: [], seen: ['followup-reset'], resolved: [], lastOfferedMonth: 4,
      pending: { id: '17:4:followup-reset', key: 'followup-reset', month: 4, targetId: 'story-customer', targetKind: 'customer' } } };
}

const noSale = (before, after) => {
  for (const key of ['personalXV', 'productSales', 'sets', 'totalIncome']) assert.equal(after.economy[key], before.economy[key], key);
  assert.equal(after.economy.lastTransaction, null);
  assert.equal(after.monthStats.sales, before.monthStats.sales);
};

let enteredRoutine;
try {
  const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
  browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });

  await check('Opening introduces Team and the first step with a painted portrait and world', async () => {
    await load(makeInitialState({ seed: 17 }));
    assert.equal((await state()).stage, STAGES.OPENING);
    assert.equal(await page.locator('#storyCard').getAttribute('data-speaker'), 'teem');
    assert.match(await page.locator('#dialogueSpeaker').textContent(), /ทีม/);
    assert.match(await page.locator('#storyTip').textContent(), /เริ่มจากดูแลตัวเอง.*พบคนแรก/);
    await canvasPainted('#worldCanvas');
    await canvasPainted('#storyPortrait');
    await capture('opening-teem');
  });

  await check('Preseason and all five exam questions are completed through visible UI', async () => {
    let sawAko = false, sawDay7Ako = false;
    await driveUntil(current => current.stage === STAGES.CERTIFIED, async current => {
      if (current.stage === STAGES.PRE_DAY3_ABCD && !sawAko) {
        assert.equal(await page.locator('#storyCard').getAttribute('data-speaker'), 'ako');
        assert.match(await page.locator('#dialogueSpeaker').textContent(), /เอโกะ/);
        await capture('preseason-ako');
        sawAko = true;
      }
      if (current.stage === STAGES.PRE_DAY7_PRACTICE && !sawDay7Ako) {
        assert.equal(await page.locator('#storyCard').getAttribute('data-speaker'), 'ako');
        assert.equal(await page.locator('#dialogueSpeaker').textContent(), 'เอโกะ');
        assert.match(await page.locator('#dialogueText').textContent(), /นอนน้อย/);
        await canvasPainted('#storyPortrait');
        await capture('day7-ako-question');
        sawDay7Ako = true;
      }
    });
    assert.equal(sawAko, true);
    assert.equal(sawDay7Ako, true);
    assert.equal(Object.values((await state()).exam.results).filter(Boolean).length, 5);
    assert.equal((await state()).milestones.certified, true);
    await quizStaysQuiet();
  });

  await check('Month 1 reaches three clear routine choices with locked full-plan requirements', async () => {
    enteredRoutine = await driveUntil(current => current.stage === STAGES.M1_ROUTINE);
    assert.equal(await page.locator('[data-plan-id]').count(), 3);
    assert.equal(await page.locator('[data-plan-id="control"]').isEnabled(), true);
    assert.equal(await page.locator('[data-plan-id="fit"]').isEnabled(), true);
    assert.equal(await page.locator('[data-plan-id="all"]').isDisabled(), true);
    assert.match(await page.locator('[data-plan-id="control"]').textContent(), /ไม่ใช้พลังงาน/);
    assert.match(await page.locator('[data-plan-id="fit"]').textContent(), /⚡ 1/);
    assert.ok((await page.locator('[data-plan-id="all"] .routine-choice__reason').textContent()).length > 10);
    assert.equal(await page.locator('.routine-product-help').evaluate(details => details.open), false);
    await capture('month1-routine-choices');
  });

  await check('Choosing the fitted plan creates one receipt immediately without another offer click', async () => {
    await click('[data-plan-id="fit"]');
    const after = await state();
    assert.equal(after.stage, STAGES.M1_SALE_RECEIPT);
    assert.equal(after.energy, enteredRoutine.energy - 1);
    assert.equal(after.monthStats.sales, 1);
    assert.equal(after.economy.lastTransaction.price, 12480);
    assert.equal(await page.locator('#actionBar [data-event="MAKE_OFFER"]').count(), 0);
    assert.equal(await page.locator('[data-plan-id]').count(), 0);
    assert.equal(await page.locator('#actionBar [data-event="CLOSE_RECEIPT"]').isVisible(), true);
    await page.reload();
    await ready();
    assert.equal((await state()).economy.lastTransaction.id, after.economy.lastTransaction.id);
    assert.equal((await state()).monthStats.sales, 1);
    assert.equal((await state()).energy, after.energy);
  });

  await check('Care continues to Month 2 and visibly explains that more than three choices exist', async () => {
    const current = await driveUntil(item => item.month === 2);
    assert.equal(current.stage, STAGES.MANAGEMENT);
    assert.ok(current.customers.length >= 1);
    assert.equal(current.settlements['1'].settled, true);
    assert.equal(await page.locator('#choiceGuide').isVisible(), true);
    assert.equal(await page.locator('#choiceToolbar [data-choice-work]').isVisible(), true);
    assert.equal(await page.locator('#actionBar [data-event="END_MONTH"]').count(), 0);
    await capture('month2-more-choices');
  });

  await check('The no-purchase route starts care immediately and reaches Month 2 without invented sales or team', async () => {
    const before = routineFixture();
    await load(before);
    await click('[data-plan-id="control"]');
    const after = await state();
    assert.equal(after.stage, STAGES.M1_ONBOARDING);
    assert.equal(after.energy, before.energy);
    assert.equal(after.prospects[0].careOnly, true);
    noSale(before, after);
    assert.equal(await page.locator('#actionBar [data-event="MAKE_OFFER"]').count(), 0);
    assert.equal(await page.locator('#actionBar [data-event="CLOSE_RECEIPT"]').count(), 0);
    const current = await driveUntil(item => item.month === 2);
    assert.equal(current.customers[0].careOnly, true);
    assert.equal(current.customers[0].activePlan, false);
    assert.equal(current.team.length, 0);
    assert.equal(current.settlements['1'].totalIncome, 0);
    assert.equal(current.economy.personalXV, 0);
    assert.equal(current.monthStats.reorders, 0);
  });

  await check('A prepared full plan can start in one choice and a refusal preserves the cooldown', async () => {
    for (const seed of [5, 1]) {
      const before = fullFixture(seed);
      const expected = reduceGame(before, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
      assert.equal(getRoutineChoices(before).find(item => item.id === 'all').available, true);
      await load(before);
      assert.equal(await page.locator('[data-plan-id="all"]').isEnabled(), true);
      await click('[data-plan-id="all"]');
      const after = await state();
      assert.equal(after.stage, STAGES.MANAGEMENT);
      assert.equal(after.energy, before.energy - 1);
      assert.equal(after.customers.length, expected.customers.length);
      assert.equal(after.monthStats.sales, expected.monthStats.sales);
      if (seed === 5) {
        assert.equal(after.customers.length, 1);
        assert.equal(after.customers[0].day, 0);
        assert.equal(after.customers[0].selfDirected, false);
        assert.equal(after.customers[0].successCase, false);
        assert.deepEqual(after.customers[0].routinePlan.products, ['gus']);
      } else {
        assert.equal(after.customers.length, 0);
        assert.equal(after.prospects[0].journey, 'waiting');
        assert.equal(after.prospects[0].nextOfferMonth, 5);
        assert.match(await page.locator('#dialogueText').textContent(), /ขอเวลาคิด/);
      }
    }
  });

  await check('An older control recommendation resumes into care while an older fitted plan still buys once', async () => {
    for (const planId of ['control', 'fit']) {
      const original = routineFixture();
      const old = { ...original, stage: STAGES.M1_RECOMMENDATION,
        prospects: [{ ...original.prospects[0], journey: 'recommendation', activePlan: false,
          routinePlan: { id: planId, quality: planId === 'control' ? 'neutral' : 'fit', products: planId === 'control' ? [] : ['gus'], includesControl: true } }] };
      await load(old);
      await action(EVENTS.MAKE_OFFER);
      const after = await state();
      if (planId === 'control') {
        assert.equal(after.stage, STAGES.M1_ONBOARDING);
        assert.equal(after.energy, old.energy);
        noSale(old, after);
      } else {
        assert.equal(after.stage, STAGES.M1_SALE_RECEIPT);
        assert.equal(after.monthStats.sales, 1);
        assert.equal(after.energy, old.energy - 1);
      }
    }
  });

  await check('A pending encounter survives reload, shows its target and returns the selected Ako result once', async () => {
    await load(encounterFixture());
    const before = await state();
    const pending = before.encounters.pending;
    const line = await page.locator('#dialogueText').textContent();
    assert.match(line, /ฟ้า/);
    assert.equal(await page.locator('#storyCard').getAttribute('data-speaker'), 'ako');
    assert.equal(await page.locator('[data-encounter-choice]').count(), 3);
    assert.equal(await page.locator('[data-encounter-choice="skip"]').isVisible(), true);
    await capture('encounter-ako');
    await page.reload();
    await ready();
    assert.equal(await page.locator('#dialogueText').textContent(), line);
    assert.deepEqual((await state()).encounters.pending, pending);
    await click('[data-encounter-choice="check-in"]');
    const after = await state();
    assert.equal(after.customers[0].trust, before.customers[0].trust + 4);
    assert.equal(after.energy, before.energy);
    assert.equal(after.encounters.pending, null);
    const copy = getEncounterCopy({ ...pending, choices: [{ id: 'check-in' }] }, before);
    assert.equal(await page.locator('#dialogueText').textContent(), copy.choices[0].result);
    assert.equal(await page.locator('#storyCard').getAttribute('data-speaker'), 'ako');
    assert.equal(await page.locator('[data-encounter-choice]').count(), 0);
    await page.reload();
    await ready();
    assert.equal((await state()).customers[0].trust, after.customers[0].trust);
    assert.deepEqual((await state()).encounters.resolved, after.encounters.resolved);
    assert.equal(await page.locator('[data-encounter-choice]').count(), 0);
  });

  await check('Encounter skip has no effect, stays dismissed after reload, and all scenarios have no browser errors', async () => {
    await load(encounterFixture());
    const before = await state();
    await click('[data-encounter-choice="skip"]');
    const after = await state();
    assert.equal(after.energy, before.energy);
    assert.deepEqual(after.customers, before.customers);
    assert.deepEqual(after.skills, before.skills);
    assert.equal(after.encounters.pending, null);
    assert.equal(after.encounters.resolved.at(-1).choiceId, 'skip');
    await page.reload();
    await ready();
    assert.equal(await page.locator('[data-encounter-choice]').count(), 0);
    assert.deepEqual(report.errors, []);
  });
} catch (error) {
  report.failure = { check: currentCheck, message: error.message, stack: error.stack };
  console.error(`FAIL ${currentCheck}\n${error.stack || error}`);
  if (page && !page.isClosed()) {
    try { await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); report.screenshots.push('failure.png'); } catch {}
  }
  process.exitCode = 1;
} finally {
  await flush();
  await browser?.close();
  console.log(`Proof: ${output}/report.json`);
}
