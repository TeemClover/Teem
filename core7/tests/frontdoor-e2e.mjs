/** Real HTTP -> Pages handler in workerd -> local D1 -> aggregate API -> browser.
 * No mocked API, database, SQL results or Stat response. Temporary tools supplied via env.
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ANALYTICS_VERSION, EXPERIENCE_VERSION } from '../../assets/front-door/contract.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const moduleSpecifier = value => path.isAbsolute(value) ? pathToFileURL(value).href : value;
const { Miniflare } = await import(moduleSpecifier(process.env.FRONTDOOR_MINIFLARE || 'miniflare'));
const { chromium } = await import(moduleSpecifier(process.env.FRONTDOOR_PLAYWRIGHT || 'playwright'));
const output = process.env.FRONTDOOR_PROOF_DIR || await mkdtemp(path.join(tmpdir(), 'frontdoor-proof-'));
await mkdir(output, { recursive: true });
const databaseDirectory = await mkdtemp(path.join(tmpdir(), 'frontdoor-d1-'));
const statPassword = 'local-fixture-only';
const assetFiles = new Set(['stat/frontdoor/index.html', 'stat/frontdoor/frontdoor.js', 'stat/frontdoor/data.js', 'stat/frontdoor/styles.css', 'ako/kitchen/catalog.js', 'assets/front-door/contract.js', 'assets/front-door/state.js', 'assets/front-door/telemetry.js']);
const mf = new Miniflare({
  rootPath: databaseDirectory, cf: false, host: '127.0.0.1', port: 0, modules: true, modulesRoot: root,
  modulesRules: [{ type: 'ESModule', include: ['**/*.js'], fallthrough: true }],
  scriptPath: path.join(root, 'core7/tests/frontdoor-e2e-worker.mjs'),
  compatibilityDate: '2026-07-01', d1Databases: { DB: 'frontdoor-local-proof' }, d1Persist: databaseDirectory,
  bindings: { FRONTDOOR_ENV: 'local', STAT_USER: 'teem', STAT_PASSWORD: statPassword },
  serviceBindings: { ASSETS: async request => {
    let name = new URL(request.url).pathname.slice(1);
    if (name === '__fixture/') return new Response('<!doctype html><html lang="en"><title>Telemetry fixture</title><body><p>Local telemetry fixture. No Front Door experience.</p></body></html>', { headers: { 'content-type': 'text/html' } });
    if (name.endsWith('/')) name += 'index.html';
    if (!assetFiles.has(name)) return new Response('Not found', { status: 404 });
    return new Response(await readFile(path.join(root, name)), { headers: { 'content-type': name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css' : 'text/javascript', 'cache-control': 'no-store' } });
  } },
});
let browser;
try {
  const base = (await mf.ready).origin;
  const db = await mf.getD1Database('DB');
  const auth = { Authorization: `Basic ${Buffer.from(`teem:${statPassword}`).toString('base64')}` };
  const eventURL = `${base}/api/core7/analytics/frontdoor`;
  const statsURL = `${base}/api/core7/frontdoor-stats?env=local`;
  const unauthenticated = await fetch(statsURL);
  assert.equal(unauthenticated.status, 401);
  const empty = await (await fetch(statsURL, { headers: auth })).json();
  assert.equal(empty.status, 'no-data');
  const wrongEnvironment = await fetch(eventURL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventId: 'e-envproof', installId: 'i-envproof', journeyId: 'j-envproof', visitId: 'v-envproof', eventName: 'FRONTDOOR_OPEN', occurredAt: Date.now(), path: '/', analyticsVersion: ANALYTICS_VERSION, experienceVersion: EXPERIENCE_VERSION, env: 'prod' }) });
  assert.equal(wrongEnvironment.status, 403);

  browser = await chromium.launch({ headless: true, ...(process.env.FRONTDOOR_CHROME ? { executablePath: process.env.FRONTDOOR_CHROME } : {}), args: process.env.FRONTDOOR_KEEP_OPEN === '1' ? ['--remote-debugging-port=9337'] : [] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, httpCredentials: { username: 'teem', password: statPassword } });
  const page = await context.newPage();
  const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
  const externalRequests = []; page.on('request', request => { if (!request.url().startsWith(base)) externalRequests.push(request.url()); });
  await page.goto(`${base}/__fixture/`);
  // Real client module, real browser localStorage, real fetch. Clock values are test fixtures.
  const generated = await page.evaluate(async () => {
    const { createTelemetry } = await import('/assets/front-door/telemetry.js');
    const { STATE_KEYS, VISIT_IDLE_MS } = await import('/assets/front-door/state.js');
    let time = Date.now() - 2 * VISIT_IDLE_MS, active = 0;
    const clock = { sample: () => active, reset() { active = 0; }, dispose() {} };
    const first = createTelemetry({ enabled: true, now: () => time, clock, context: { viewport: 'desktop', motion: 'full', audio: 'muted' } });
    first.state.updateJourney({ intentPrimary: 'build', intentSecondary: 'proof' });
    first.open(); active = 2000; first.emit('FRONTDOOR_CHOICE');
    first.emit('FRONTDOOR_REACTION_COMPLETE'); active = 4000; first.emit('LUCKY_RETURN');
    first.emit('REWARD_HORIZON'); active = 6000;
    first.state.updateJourney({ doorId: 'dungeon' });
    first.emit('DOOR_FOUND', { properties: { fromNode: 'build', toNode: 'dungeon' } });
    const saved = first.save({ stage: 'door-found' }); if (!saved.ok) throw Error('durable save failed');
    first.emit('FRONTDOOR_FREE_ROAM'); first.emit('DOOR_OPEN');
    first.emit('DUNGEON_HANDOFF', { handoffId: 'h-browserproof' });
    const originalEvents = first.pending(); const delivered = await first.flush({ force: true });
    if (!delivered.ok) throw Error('client delivery failed'); first.dispose();
    time += VISIT_IDLE_MS + 1;
    const returning = createTelemetry({ enabled: true, now: () => time, clock, context: { viewport: 'desktop', motion: 'full', audio: 'muted' } });
    returning.open(); if (!returning.resume().ok) throw Error('resume failed');
    returning.rebuild(); returning.state.updateJourney({ intentPrimary: 'curious', intentSecondary: 'anomaly', doorId: 'dungeon' });
    returning.emit('ANOMALY_START'); returning.emit('LEGACY_WARNING');
    returning.emit('DUNGEON_HANDOFF', { handoffId: 'h-curiousproof', properties: { fromNode: 'curious', toNode: 'dungeon' } });
    const secondEvents = returning.pending(); const flushed = await returning.flush({ force: true });
    if (!flushed.ok) throw Error('return delivery failed'); returning.dispose();
    if (!localStorage.getItem(STATE_KEYS.journey(originalEvents[0].journeyId))) throw Error('rebuild erased old journey');
    return { originalEvents, secondEvents, installation: originalEvents[0].installId };
  });
  // A repeated network delivery reaches the handler and DB but creates no second row.
  const repeated = await (await fetch(eventURL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(generated.originalEvents[0]) })).json();
  assert.equal(repeated.duplicate, true);
  const malformed = await fetch(eventURL, { method: 'POST', body: JSON.stringify({ ...generated.originalEvents[0], eventName: 'NOT_CANONICAL' }) });
  assert.equal(malformed.status, 400);
  const aggregate = await (await fetch(statsURL, { headers: auth })).json();
  assert.equal(aggregate.status, 'ready');
  for (const name of ['FRONTDOOR_OPEN', 'FRONTDOOR_CHOICE', 'LUCKY_RETURN', 'REWARD_HORIZON', 'DOOR_FOUND', 'SAVE', 'DOOR_OPEN', 'RETURN', 'RESUME', 'REBUILD', 'FRONTDOOR_FREE_ROAM', 'ANOMALY_START', 'LEGACY_WARNING', 'DUNGEON_HANDOFF']) assert.equal(aggregate.metrics[name].installations, 1, name);
  assert.equal(aggregate.timings.activeMsToFirstChoice, 2000);
  assert.equal(aggregate.timings.activeMsToLuckyReturn, 4000);
  assert.equal(aggregate.timings.activeMsToDoorFound, 6000);
  assert.equal(aggregate.transitions.length, 2);
  const stored = await db.prepare('SELECT COUNT(*) n FROM fd_v2_events').first();
  const expectedRows = generated.originalEvents.length + generated.secondEvents.length;
  assert.equal(stored.n, expectedRows);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n, 0);
  await page.goto(`${base}/stat/frontdoor/`);
  await page.locator('#dashboard').waitFor({ state: 'visible' });
  for (const name of ['FRONTDOOR_OPEN', 'FRONTDOOR_CHOICE', 'LUCKY_RETURN', 'REWARD_HORIZON', 'DOOR_FOUND', 'SAVE', 'DOOR_OPEN', 'RETURN']) assert.equal(await page.locator(`[data-event="${name}"] .kpi-value`).textContent(), '1');
  await page.screenshot({ path: path.join(output, 'frontdoor-stat-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator('#primary-kpis .kpi').count(), 8);
  await page.screenshot({ path: path.join(output, 'frontdoor-stat-mobile.png'), fullPage: true });
  await page.locator('#filter-panel summary').click();
  await page.locator('#source').selectOption('qr');
  await page.locator('button[type="submit"]').click();
  await page.locator('#state[data-state="no-data"]').waitFor();
  assert.ok((await page.locator('#state-title').textContent()).includes('NO DATA'));
  assert.deepEqual(pageErrors, []); assert.deepEqual(externalRequests, []);
  const proof = { verifiedAt: new Date().toISOString(), runtime: 'Cloudflare workerd + Miniflare local D1', mockedLayers: [], expectedRows, storedRows: stored.n, prodRows: 0, rejectedUnknown: malformed.status, rejectedWrongEnv: wrongEnvironment.status, authRequired: unauthenticated.status, duplicateAcknowledged: repeated.duplicate, metrics: aggregate.metrics, timings: aggregate.timings, transitions: aggregate.transitions, pageErrors, externalRequests, desktop: '1440x1000', mobile: '390x844', mobileOverflow: false, databaseDirectory };
  await writeFile(path.join(output, 'proof.json'), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ ok: true, output, base, rows: stored.n, browser: 'Chrome desktop and mobile viewport', databaseDirectory }));
  if (process.env.FRONTDOOR_KEEP_OPEN === '1') {
    console.log('Local verification server remains available. End with Ctrl-C.');
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); browser.once('disconnected', resolve); });
  }
} finally { await browser?.close(); await mf.dispose(); }
