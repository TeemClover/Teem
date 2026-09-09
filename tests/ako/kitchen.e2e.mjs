/** Browser QA of the real Ako kitchen. Uses an existing local preview; no API mocks or external submissions. */
import assert from 'node:assert/strict';
import {mkdir, writeFile, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {RECIPES, KITCHEN_KEY} from '../../ako/kitchen/recipes.js';

const base = process.env.AKO_BASE_URL || 'http://127.0.0.1:4174';
const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME, headless: true});
const output = process.env.AKO_PROOF_DIR || await mkdtemp(tmpdir() + '/ako-kitchen-');
await mkdir(output, {recursive: true});
const report = {base, checks: [], errors: [], failedImages: [], screenshots: []};
const pass = text => {report.checks.push(text); console.log('PASS ' + text);};
const shot = async (page, name, fullPage = false) => {await page.screenshot({path: `${output}/${name}.png`, fullPage}); report.screenshots.push(name + '.png');};

async function surface(width, blockedStorage = false) {
  const context = await browser.newContext({viewport: {width, height: width < 700 ? 844 : 1000}, isMobile: width < 700, hasTouch: width < 700, reducedMotion: 'reduce'});
  await context.route('**/*', route => route.request().url().startsWith(base) || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
  if (blockedStorage) await context.addInitScript(() => {Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Unavailable', 'SecurityError');}});});
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400 && /\.(webp|png|jpe?g)(?:\?|$)/.test(response.url())) report.failedImages.push({url: response.url(), status: response.status()});});
  return {context, page};
}
async function noOverflow(page) {assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);}
async function photoLoaded(page) {await page.waitForFunction(() => document.querySelector('#dish-image')?.naturalWidth > 0);}

try {
  for (const width of [390, 1440]) {
    const {context, page} = await surface(width);
    await page.goto(base + '/ako/');
    await page.locator('[data-track=hero-kitchen]').waitFor();
    await noOverflow(page);
    assert.match(await page.locator('h1').first().innerText(), /ครัวสลัด/);
    await shot(page, `ako-home-${width}`);
    await page.locator('[data-track=hero-kitchen]').click();
    await page.waitForURL('**/ako/kitchen/');
    await page.locator('#steps input').first().waitFor();
    await photoLoaded(page);
    assert.equal(await page.locator('#recipe-list a').count(), 7);
    await noOverflow(page);
    await shot(page, `kitchen-open-${width}`);
    for (const recipe of RECIPES) {
      if (!(await page.locator('#recipe-browse').getAttribute('open'))) await page.locator('#recipe-browse summary').click();
      await page.locator(`#recipe-list [data-recipe="${recipe.id}"]`).click();
      assert.equal(await page.locator('#recipe-title').innerText(), recipe.name);
      assert.equal(await page.locator('#ingredients li').count(), recipe.ingredients.length);
      assert.equal(await page.locator('#steps input').count(), recipe.steps.length);
      assert.equal(await page.locator('#recipe-photo').isVisible(), Boolean(recipe.image));
      if (recipe.image) await photoLoaded(page);
      await noOverflow(page);
    }
    await page.locator('#recipe-browse summary').click();
    await page.locator('#recipe-list [data-recipe=egg-crunch]').click();
    await photoLoaded(page);
    await shot(page, `egg-recipe-${width}`);
    await page.locator('[data-portions="4"]').click();
    assert.equal(await page.locator('#ingredients li').first().locator('b').innerText(), '4 ฟอง');
    await page.locator('#save-recipe').click();
    assert.match(await page.locator('#save-status').innerText(), /เก็บสูตรไว้บนเครื่องนี้แล้ว/);
    await page.locator('#steps input').nth(0).check();
    await page.locator('#steps input').nth(1).check();
    await page.evaluate(() => {localStorage.setItem('c7:install_id', 'qa-existing-install'); localStorage.setItem('mc_forge_progress', 'qa-existing-reading'); localStorage.setItem('meet:intake:draft', 'qa-existing-draft');});
    await page.reload();
    await page.locator('#steps input').first().waitFor();
    assert.equal(await page.locator('#recipe-title').innerText(), getName('egg-crunch'));
    assert.equal(await page.locator('[data-portions="4"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#steps input:checked').count(), 2);
    assert.equal(await page.locator('#save-recipe').getAttribute('aria-pressed'), 'true');
    await page.locator('#recipe-browse summary').click();
    await page.locator('[data-filter=saved]').click();
    assert.equal(await page.locator('#recipe-list a').count(), 1);
    await page.locator('#cook-mode').click();
    assert.equal(await page.locator('body').getAttribute('data-cooking'), 'true');
    assert.equal(await page.locator('.recipe-library').isVisible(), false);
    assert.equal(await page.locator('.ingredients').isVisible(), true);
    await page.locator('#steps input').nth(2).check();
    await page.locator('#steps input').nth(3).check();
    await page.locator('#finished-note').waitFor({state: 'visible'});
    await noOverflow(page);
    await shot(page, `cook-mode-${width}`);
    await page.locator('#reset-steps').click();
    assert.equal(await page.locator('#steps input:checked').count(), 0);
    const legacy = await page.evaluate(() => ['c7:install_id', 'mc_forge_progress', 'meet:intake:draft'].map(key => localStorage.getItem(key)));
    assert.deepEqual(legacy, ['qa-existing-install', 'qa-existing-reading', 'qa-existing-draft']);
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KITCHEN_KEY);
    assert.deepEqual(stored.savedIds, ['egg-crunch']);
    assert.deepEqual(stored.checkedSteps, []);
    pass(`${width}px: home -> kitchen, all seven real recipes/images, scaled portions, saved recipe + completed-step restore, cook mode/completion/restart, legacy state unchanged and no overflow`);
    await context.close();
  }
  const blocked = await surface(390, true), p = blocked.page;
  await p.goto(base + '/ako/kitchen/#tofu-rice');
  await p.locator('#steps input').first().waitFor();
  assert.equal(await p.locator('#recipe-title').innerText(), getName('tofu-rice'));
  await p.locator('#save-recipe').click();
  assert.match(await p.locator('#save-status').innerText(), /เก็บสูตรถาวรไม่ได้/);
  assert.equal(await p.locator('#save-recipe').getAttribute('aria-pressed'), 'false');
  await p.locator('[data-portions="1"]').click();
  await p.locator('#steps input').first().check();
  assert.equal(await p.locator('#steps input:checked').count(), 1);
  await noOverflow(p);
  await shot(p, 'storage-unavailable-mobile');
  pass('Blocked persistent storage: direct recipe deep-link works, durable save failure is visible, portions and cooking remain functional in memory');
  await blocked.context.close();
  assert.deepEqual(report.failedImages, []);
  assert.deepEqual(report.errors, []);
} catch (error) {report.failure = error.stack; throw error;}
finally {await writeFile(`${output}/proof.json`, JSON.stringify(report, null, 2)); await browser.close(); console.log('Proof: ' + output);}

function getName(id) {return RECIPES.find(recipe => recipe.id === id).name;}
