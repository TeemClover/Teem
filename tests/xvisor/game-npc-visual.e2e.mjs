/** Isolated NPC artwork proof. No production save or API request is written. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeInitialState, serializeState, STAGES, SAVE_KEY } from '../../xvisor/quest/game-data.js';
import { createPerson, getPersonAppearance } from '../../xvisor/quest/game-people.js';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4188';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-growth-npc';
await mkdir(output, { recursive: true });
const report = { checks: [], errors: [], screenshots: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const check = message => { report.checks.push(message); console.log(`PASS ${message}`); };

let seed = 93;
const people = [];
for (let index = 1; index <= 64; index++) {
  const result = createPerson({ seed, index, usedNames: people.map(person => person.name) });
  people.push(result.person);
  seed = result.nextSeed;
}
const cohort = people.slice(0, 12);
const styles = ['short', 'long', 'ponytail', 'bob', 'bun', 'curly', 'spiky', 'buzz'];
const samples = styles.map(style => people.find(person => person.appearance.hairStyle === style));
assert.ok(samples.every(Boolean));
assert.ok(new Set(cohort.slice(0, 5).map(person => person.appearance.hairStyle)).size >= 3);
function fixture() {
  const state = makeInitialState({ seed: 93 });
  return { ...state, month: 5, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    milestones: { ...state.milestones, certified: true, firstG1: true },
    skills: Object.fromEntries(['people', 'knowledge', 'care', 'leadership'].map(id => [id, { xp: 25 }])),
    team: cohort.map((person, index) => ({ ...person, personId: person.id, id: `team-${person.id}`, rank: 'xvisor', active: true, personalXV: 3000, customers: 3, downstreamXvisors: 0, specialty: ['sales', 'care', 'builder', 'balanced'][index % 4] })),
    selectedPersonId: `team-${cohort[0].id}` };
}
async function load(page, state) {
  await page.goto(base + '/xvisor/quest/');
  await page.evaluate(({ key, value }) => {
    localStorage.clear(); localStorage.setItem(key, value);
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
  }, { key: SAVE_KEY, value: serializeState(state) });
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => { const canvas = document.querySelector("#worldCanvas"); const pixel = canvas.getContext("2d").getImageData(100, 100, 1, 1).data; return pixel[0] + pixel[1] + pixel[2] > 0; });
}
async function screenshot(page, name, selector = null) {
  const options = { path: path.join(output, name + '.png') };
  if (selector) await page.locator(selector).screenshot(options);
  else await page.screenshot({ ...options, fullPage: true });
  report.screenshots.push(name + '.png');
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(`${width}: ${error.message}`));
    try {
      await load(page, fixture());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await screenshot(page, `management-${width}`);
      const canvasBefore = await page.locator('#worldCanvas').evaluate(canvas => canvas.toDataURL());
      const savedBefore = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
      await page.reload();
      await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => { const canvas = document.querySelector("#worldCanvas"); const pixel = canvas.getContext("2d").getImageData(100, 100, 1, 1).data; return pixel[0] + pixel[1] + pixel[2] > 0; });
      const savedAfter = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
      assert.deepEqual(savedAfter.team.map(person => person.appearance), savedBefore.team.map(person => person.appearance));
      assert.ok(await page.locator('#worldCanvas').evaluate(canvas => canvas.toDataURL()) === canvasBefore, 'the settled reduced-motion scene remains stable after reload');
      check(`${width}px natural cohort: distinct team row, stable appearance and identical reduced-motion scene after reload`);
      await page.locator('#peopleButton').click();
      await page.locator('[data-v9-people-tab="all"]').click();
      assert.ok((await page.locator('#gameDialog').textContent()).includes(cohort[0].name));
      await screenshot(page, `people-${width}`);
      await page.locator('[data-v9-close]').click();

      const customer = { ...samples[1], journey: 'discovery', consent: true, measured: true, fitProducts: ['gus'] };
      const initial = makeInitialState({ seed: 93 });
      await load(page, { ...initial, month: 1, stage: STAGES.M1_DISCOVERY, phase: 'management', rank: 'xvisor', energy: 28, prospects: [customer], selectedPersonId: customer.id });
      assert.equal(await page.locator('#storyCard').getAttribute('data-speaker'), 'customer');
      const portrait = await page.locator('#storyPortrait').evaluate(canvas => JSON.parse(canvas.dataset.portraitKey)[1]);
      assert.deepEqual(portrait, getPersonAppearance(customer));
      await screenshot(page, `seated-customer-${width}`);
      check(`${width}px real customer dialogue keeps the same long-haired identity as the seated world character`);

      if (width === 1440) {
        // A test-only gallery exercises the production drawing APIs. It is
        // inserted into this isolated DOM; no preview page ships to players.
        await page.evaluate(async samples => {
          const { createSceneArt } = await import('/xvisor/quest/game-art.js');
          const { getPersonAppearance } = await import('/xvisor/quest/game-people.js');
          const { paintStoryPortrait } = await import('/xvisor/quest/game-portrait.js');
          document.querySelector('#gameApp').style.display = 'none';
          const gallery = document.createElement('section'); gallery.id = 'npcGallery';
          gallery.style.cssText = 'max-width:1320px;margin:24px auto;padding:24px;background:#edf2df;border-radius:20px;color:#294c3e;font:14px system-ui';
          const title = document.createElement('h1'); title.textContent = 'NPC identity · production artwork'; title.style.margin = '0 0 18px'; gallery.append(title);
          const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px'; gallery.append(grid);
          for (const person of samples) {
            const appearance = getPersonAppearance(person);
            const card = document.createElement('article'); card.style.cssText = 'padding:12px;background:#fffbee;border:1px solid #c6d3b7;border-radius:14px;min-width:0';
            const header = document.createElement('div'); header.style.cssText = 'display:flex;gap:12px;align-items:center';
            const portrait = document.createElement('canvas'); portrait.style.cssText = 'width:62px;height:62px;border-radius:16px';
            const label = document.createElement('div'); const name = document.createElement('strong'); name.textContent = person.name;
            const traits = document.createElement('div'); traits.style.cssText = 'font-size:12px;color:#607260;margin-top:5px'; traits.textContent = `${appearance.hairStyle} · ${appearance.clothing}`;
            label.append(name, traits); header.append(portrait, label); card.append(header);
            paintStoryPortrait(portrait, { portrait: 'customer' }, person);
            const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 312; canvas.style.cssText = 'display:block;width:100%;height:auto;margin-top:10px';
            const ctx = canvas.getContext('2d'); ctx.scale(3, 3); const art = createSceneArt(ctx);
            art.character(10, 93, appearance, { direction: 'right', band: true });
            art.character(100, 93, appearance, { seated: true, direction: 'left', band: true, pose: 'listen' });
            card.append(canvas); grid.append(card);
          }
          document.body.append(gallery); window.scrollTo(0, 0);
        }, samples);
        await screenshot(page, 'all-hair-standing-seated-portraits', '#npcGallery');
        assert.equal(await page.locator('#npcGallery article').count(), 8);
        check('all 8 generated hair styles have production portrait, standing and seated comparison proof');
      }
    } finally { await context.close(); }
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
