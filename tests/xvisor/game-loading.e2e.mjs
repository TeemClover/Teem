/** Loading regression QA. All browser storage is isolated and API traffic is blocked. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SAVE_KEY, serializeState } from '../../xvisor/quest/game-data.js';
import { makeReviewFixtures } from './game-review-fixtures.mjs';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4186';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-loading-proof';
const release = process.env.XVISOR_EXPECTED_RELEASE || '2.0-offer1';
await mkdir(output, { recursive: true });
const report = { checks: [], screenshots: [], errors: [], unversionedRequests: [], mismatchedRequests: [], moduleRequests: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const fixtures = makeReviewFixtures();
let failPresentation = false;
let blockedVersionedRequests = 0;
await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Isolated loading QA: API writes disabled' }) }));
await context.route(url => /\/xvisor\/quest\/game-[^/]+\.js$/.test(url.pathname) || url.pathname === '/tests/xvisor/game-review-fixtures.mjs', async route => {
  const url = new URL(route.request().url());
  report.moduleRequests.push(`${url.pathname}${url.search}`);
  if (!url.searchParams.has('v')) {
    report.unversionedRequests.push(url.pathname);
    // Reproduce the cached old presentation module that lacked the new exports.
    if (url.pathname.endsWith('/game-presentation.js')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export function getEconomyView() { return {}; }' });
    return route.fulfill({ status: 500, contentType: 'text/javascript', body: 'throw new Error("Unversioned game module requested");' });
  }
  if (url.searchParams.get('v') !== release) {
    report.mismatchedRequests.push(`${url.pathname}${url.search}`);
    return route.abort('failed');
  }
  if (failPresentation && url.pathname.endsWith('/game-presentation.js')) {
    blockedVersionedRequests += 1;
    return route.abort('failed');
  }
  return route.continue();
});

const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };
const storageSnapshot = page => page.evaluate(() => Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)));
async function newPage() {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  return page;
}
async function capture(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
  report.screenshots.push(`${name}.png`);
}
async function assertReady(surface) {
  await surface.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
  assert.ok(await surface.locator('#actionBar button').count() > 0, 'successful boot must expose playable actions');
  assert.notEqual(await surface.locator('#hudMonth').textContent(), 'PRE-SEASON', 'HUD must render beyond the static shell');
  const canvasPaint = await surface.locator('#worldCanvas').evaluate(async canvas => {
    const context = canvas.getContext('2d');
    const inspect = () => {
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const colors = new Set();
      for (let y = 0; y < image.height; y += 16) {
        for (let x = 0; x < image.width; x += 16) {
          const i = (y * image.width + x) * 4;
          if (image.data[i + 3]) colors.add(`${image.data[i]},${image.data[i + 1]},${image.data[i + 2]}`);
        }
      }
      return colors.size;
    };
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const colors = inspect();
      if (colors > 16) return colors;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return inspect();
  });
  assert.ok(canvasPaint > 16, `canvas must contain rendered scenery, found ${canvasPaint} sampled colors`);
}

try {
  let page = await newPage();
  await page.goto(`${base}/xvisor/quest/`);
  await assertReady(page);
  assert.match(await page.locator('#hudMonth').textContent(), /DAY 0/);
  await capture(page, 'production-opening');
  check('Production opening loads a coherent versioned graph despite poisoned unversioned modules');

  await page.evaluate(({ key, state }) => {
    localStorage.setItem(key, state);
    localStorage.setItem('qa-loading-sentinel', 'preserve-parent-storage');
    localStorage.setItem('mc_xvisor_audio_1', JSON.stringify({ muted: true, musicEnabled: false, sfxEnabled: false }));
  }, { key: SAVE_KEY, state: serializeState(fixtures.management) });
  const parentStorage = await storageSnapshot(page);
  await page.goto(`${base}/tests/xvisor/quality-preview.html?scene=management`);
  const preview = page.frameLocator('#preview');
  await assertReady(preview);
  assert.equal(await preview.locator('#hudMonth').textContent(), `เดือน ${fixtures.management.month}`);
  assert.equal(await preview.locator('body').getAttribute('data-stage'), fixtures.management.stage);
  assert.equal(await preview.locator('#actionBar button').count(), 3);
  await capture(page, 'preview-management');
  check('Preview outer fixture loader and iframe both use versioned modules and render management');

  await page.locator('#scenario').selectOption('year2');
  await preview.locator('#hudMonth').filter({ hasText: `เดือน ${fixtures.year2.month}` }).waitFor();
  await assertReady(preview);
  await preview.locator('#historyButton').click();
  await preview.locator('#gameDialog[data-v9-dialog="income"]').waitFor();
  assert.ok(await preview.locator('.history-timeline button:not(:disabled)').count() >= 12);
  await preview.locator('[data-history-select="month"]').selectOption('1');
  assert.match(await preview.locator('#gameDialog h2').textContent(), /เดือน 1$/);
  assert.ok(await preview.locator('.growth-metric').count() >= 5);
  await capture(page, 'preview-year2-history');
  await preview.locator('[data-v9-close]').click();
  assert.equal(await preview.locator('#gameDialog').evaluate(dialog => dialog.open), false);
  assert.deepEqual(await storageSnapshot(page), parentStorage, 'preview must preserve the parent origin save byte-for-byte');
  check('Preview scene switching, Year 2 and historical comparison work without touching the parent save');

  await page.close();
  failPresentation = true;
  page = await newPage();
  await page.goto(`${base}/xvisor/quest/?loading-check=interrupted`);
  await page.locator('body[data-game-boot="error"]').waitFor({ state: 'attached' });
  assert.ok(blockedVersionedRequests > 0, 'the failure must actually interrupt a versioned transitive dependency');
  const errorBanner = page.locator('#gameLoadStatus');
  assert.equal(await errorBanner.isVisible(), true);
  assert.match(await errorBanner.textContent(), /โหลดเกมไม่สำเร็จ/);
  const retryButton = errorBanner.getByRole('button', { name: 'ลองโหลดเกมอีกครั้ง', exact: true });
  assert.equal(await retryButton.isVisible(), true, 'load failure must offer a visible retry control');
  assert.deepEqual(await storageSnapshot(page), parentStorage, 'failed imports must not reset or rewrite a saved game');
  await capture(page, 'recoverable-load-error');
  check('A failed versioned dependency shows a visible retry error and preserves the existing save');

  failPresentation = false;
  await retryButton.click();
  await assertReady(page);
  assert.equal(await page.locator('#hudMonth').textContent(), `เดือน ${fixtures.management.month}`);
  const resumed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
  assert.equal(resumed.runId, fixtures.management.runId);
  assert.equal(resumed.month, fixtures.management.month);
  assert.deepEqual(resumed.settlements, fixtures.management.settlements);
  assert.equal(await page.evaluate(() => localStorage.getItem('qa-loading-sentinel')), 'preserve-parent-storage');
  await capture(page, 'recovered-management');
  check('Retry reloads the complete graph and resumes the same saved month and settlements');

  assert.deepEqual(report.unversionedRequests, []);
  assert.deepEqual(report.mismatchedRequests, []);
  assert.ok(report.moduleRequests.some(url => url.startsWith('/tests/xvisor/game-review-fixtures.mjs?')));
  assert.equal(report.moduleRequests.some(url => url.startsWith('/xvisor/quest/game-review-fixtures.mjs')), false);
  assert.deepEqual(report.errors, [], 'loading failures should be caught, never uncaught page errors');
  check('Every browser runtime and fixture request uses the same release tag with no uncaught errors');
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`Proof: ${output}/report.json`);
}
