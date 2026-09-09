/** Local HTTP -> protected Pages handler -> actual D1 -> responsive Stat.
 * Only the explicit error-state checks replace API responses; the outcome proof never does.
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { startPreview } from '../../core7/tests/frontdoor-preview.mjs';
import { RECIPE_LINKS } from '../../ako/kitchen/catalog.js';

const { chromium } = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output = process.env.FRONTDOOR_PROOF_DIR || await mkdtemp(`${tmpdir()}/frontdoor-stat-v6-`);
await mkdir(output, { recursive: true });
const server = await startPreview({ port: 0 });
const db = await server.mf.getD1Database('DB');
const browser = await chromium.launch({ headless: true, executablePath: process.env.FRONTDOOR_CHROME });
const report = { checks: [], browserErrors: [], externalRequests: [], screenshots: [], base: server.base };
const pass = message => { report.checks.push(message); console.log(`PASS ${message}`); };
const auth = { Authorization: `Basic ${Buffer.from('teem:local-fixture-only').toString('base64')}` };
const statsURL = `${server.base}/api/core7/frontdoor-stats?env=local`;
const now = Date.now() - 60000;
const recipe = RECIPE_LINKS[0];
async function post(path, payload) {
  const response = await fetch(server.base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await response.json();
  assert.equal(response.status, 202, JSON.stringify(body));
  return body;
}
async function departure(id, install, door) {
  await post('/api/core7/analytics/frontdoor', { eventName: 'DOOR_OPEN', eventId: `e-stat-${id}`, handoffId: `h-stat-${id}`, installId: install,
    journeyId: `j-stat-${id}`, visitId: `v-stat-${id}`, occurredAt: now, path: '/frontdoor/', source: 'direct', visitorClass: 'new',
    viewport: 'mobile', intentPrimary: door === 'ako' ? 'self' : 'people', doorId: door, analyticsVersion: '2.0.0', experienceVersion: 'frontdoor-seed-6.0', env: 'local', properties: {} });
}
async function arrival(id, path, index, name = 'DESTINATION_ARRIVAL') {
  return post('/api/core7/analytics/frontdoor-outcome', { version: '1.0.0', eventId: `o-stat-${id}-${index}`, handoffId: `h-stat-${id}`, env: 'local', name, path, occurredAt: now + index * 1000 });
}
async function screenshot(page, name) {
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  report.screenshots.push(`${name}.png`);
}

try {
  assert.equal((await fetch(statsURL)).status, 401);
  assert.equal((await (await fetch(statsURL, { headers: auth })).json()).status, 'no-data');
  await departure('ako-a', 'install-stat-a', 'ako');
  await departure('ako-b', 'install-stat-b', 'ako');
  await departure('meet-a', 'install-stat-a', 'meet');
  for (const [index, path] of ['/ako/', '/ako/kitchen/', recipe.path, '/ako/story/', '/xircle/'].entries()) await arrival('ako-a', path, index + 1);
  assert.equal((await arrival('ako-a', recipe.path, 9)).duplicate, true);
  await arrival('ako-b', '/ako/kitchen/', 1);
  await arrival('meet-a', '/meet/', 1);
  await arrival('meet-a', '/meet/', 2, 'MEET_REQUEST_ACCEPTED');
  const aggregate = await (await fetch(statsURL, { headers: auth })).json();
  assert.deepEqual(aggregate.outcomes.rows.find(row => row.door === 'ako'), { door: 'ako', opened: 2, arrived: 2, requested: 0 });
  assert.deepEqual(aggregate.outcomes.rows.find(row => row.door === 'meet'), { door: 'meet', opened: 1, arrived: 1, requested: 1 });
  assert.equal(aggregate.outcomes.paths.find(row => row.path === '/ako/kitchen/').installations, 2);
  assert.equal(aggregate.outcomes.paths.find(row => row.path === recipe.path).installations, 1);
  assert.equal(aggregate.outcomes.paths.find(row => row.path === '/xircle/').door, 'ako');
  assert.equal(Object.keys(aggregate.metrics).length, 15);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_outcomes WHERE env='prod'").first()).n, 0);
  report.aggregate = aggregate.outcomes;
  pass('Actual collector validates, persists and deduplicates Ako kitchen/recipe/onward receipts; original door stays Ako; canonical P0 remains 15');

  const context = await browser.newContext({ httpCredentials: { username: 'teem', password: 'local-fixture-only' }, viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Bangkok' });
  await context.route('**/*', route => {
    if (!route.request().url().startsWith(server.base)) { report.externalRequests.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.browserErrors.push(error.message));
  await page.goto(`${server.base}/stat/frontdoor/`);
  await page.locator('#dashboard').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#primary-kpis .kpi').count(), 8);
  assert.equal(await page.locator('[data-door="ako"] dd').nth(1).innerText(), '2');
  assert.equal(await page.locator('[data-outcome-path="/ako/kitchen/"]>strong').innerText(), '2');
  assert.equal(await page.locator('#ako-recipes tr').count(), 1);
  assert.match(await page.locator('#ako-recipes').innerText(), new RegExp(recipe.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  report.environmentOptions = await page.locator('#env').evaluate(select => [...select.options].map(option => ({ value: option.value, disabled: option.disabled, selected: option.selected })));
  assert.equal(report.environmentOptions.find(option => option.value === 'prod').disabled, true);
  await screenshot(page, 'stat-v6-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator('[data-outcome-path="/ako/kitchen/"]>strong').innerText(), '2');
  await screenshot(page, 'stat-v6-mobile');
  await page.locator('#ako-title').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/stat-ako-mobile-detail.png` });
  report.screenshots.push('stat-ako-mobile-detail.png');
  pass('Protected desktop/mobile Stat renders actual D1 counts, Thai recipe names and distinct onward pages without horizontal page overflow');

  await page.locator('#filter-panel>summary').click();
  await page.locator('#source').selectOption('instagram');
  assert.equal(await page.locator('#dashboard').isVisible(), false);
  await page.locator('#filters button[type="submit"]').click();
  await page.locator('#state[data-state="no-data"]').waitFor();
  assert.equal(await page.locator('#primary-kpis [data-event="DOOR_OPEN"] .kpi-value').innerText(), '0');
  pass('Actual source filter returns honest NO DATA and clears stale numbers immediately');

  // Isolated status-rendering tests. These are intentionally separate from the real pipeline above.
  for (const [status, payload, title] of [
    [503, { ok: false, error: 'STAT_ACCESS_NOT_CONFIGURED' }, 'SETUP REQUIRED'],
    [503, { ok: false, error: 'FRONTDOOR_DB_NOT_CONFIGURED' }, 'PIPELINE UNWIRED'],
    [403, { ok: false, error: 'ENV_MISMATCH' }, 'ENVIRONMENT MISMATCH'],
    [500, '<html>service failed</html>', 'REQUEST FAILED'],
    [200, { ...aggregate, metrics: {} }, 'REQUEST FAILED'],
  ]) {
    await page.route('**/api/core7/frontdoor-stats?*', route => route.fulfill({ status, contentType: typeof payload === 'string' ? 'text/html' : 'application/json', body: typeof payload === 'string' ? payload : JSON.stringify(payload) }));
    await page.locator('#filters button[type="submit"]').click();
    await page.waitForFunction(expected => document.getElementById('state-title').textContent.includes(expected), title);
    assert.equal(await page.locator('#dashboard').isVisible(), false);
    await page.unroute('**/api/core7/frontdoor-stats?*');
  }
  pass('Explicit simulated error states distinguish missing Stat secret, missing D1, wrong environment, server failure and malformed response; old counts never remain visible');
  assert.deepEqual(report.browserErrors, []);
  assert.deepEqual(report.externalRequests, []);
  report.productionRows = (await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n;
  assert.equal(report.productionRows, 0);
  report.localDatabaseDirectory = server.directory;
  pass('No browser errors, external requests or production rows');
  await context.close();
} finally {
  await writeFile(`${output}/proof.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await server.close();
  console.log(`Stat proof: ${output}`);
}
