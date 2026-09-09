/** Player entry QA: fresh isolated storage, real UI actions, and no API writes. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SAVE_KEY } from '../../xvisor/quest/game-save.js';

const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4186';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-player-entry-proof';
await mkdir(output, { recursive: true });
const report = { checks: [], screenshots: [], errors: [], blockedRequests: [], qaRequests: [], runs: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };
const questPath = '/xvisor/quest/';
const qaPath = /\/tests\/xvisor\/|game-review-fixtures\.|quality-preview\.html/;

async function capture(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  report.screenshots.push(`${name}.png`);
}

async function assertPlayerSurface(page, label) {
  assert.equal(await page.locator('iframe, #scenario, #preview, [data-qa-toolbar]').count(), 0, `${label}: no QA selector, preview iframe, or toolbar`);
  assert.equal(await page.locator('a[href*="quality-preview"], a[href*="/tests/xvisor/"]').count(), 0, `${label}: no links to testing surfaces`);
  const leaks = await page.evaluate(() => {
    const problems = [];
    if (document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1) problems.push('document horizontal overflow');
    for (const element of document.querySelectorAll('main, .hero, .copy, .kicker, .points, #playButton, #worldFrame, #actionDock, #actionBar button')) {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.left < -1 || rect.right > innerWidth + 1) problems.push(`${element.id || element.className || element.tagName}: outside viewport`);
      if (element.matches('#actionBar button')) {
        // The guided button has an intentional pulse ring outside its border.
        // Check actual text bounds instead of counting that pseudo-element.
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          for (const textRect of range.getClientRects()) {
            if (textRect.left < rect.left - 1 || textRect.right > rect.right + 1) problems.push('action button: clipped label');
          }
        }
      } else if (element.scrollWidth > element.clientWidth + 2) problems.push(`${element.id || element.className || element.tagName}: clipped content`);
    }
    return problems;
  });
  assert.deepEqual(leaks, [], `${label}: player controls and content fit the viewport`);
}

async function assertGameReady(page) {
  await page.locator('body[data-game-boot="ready"]').waitFor({ state: 'attached' });
  const action = page.locator('#actionBar button').first();
  await action.waitFor({ state: 'visible' });
  assert.equal(await action.isEnabled(), true, 'game must expose an enabled action');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#worldCanvas');
    if (!canvas?.width || !canvas.height) return false;
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const colors = new Set();
    for (let y = 0; y < pixels.height; y += 24) {
      for (let x = 0; x < pixels.width; x += 24) {
        const i = (y * pixels.width + x) * 4;
        if (pixels.data[i + 3]) colors.add(`${pixels.data[i]},${pixels.data[i + 1]},${pixels.data[i + 2]}`);
      }
    }
    return colors.size > 16;
  });
}

const savedState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
const progress = state => ({ runId: state.runId, month: state.month, stage: state.stage, day: state.preseason.day, energy: state.energy });
async function assertSameRun(page, expected, label) {
  const actual = await savedState(page);
  assert.deepEqual(progress(actual), expected, `${label}: preserve the saved run and progress`);
  assert.equal(await page.locator('body').getAttribute('data-stage'), expected.stage, `${label}: show the saved stage, not a new game or fixture`);
  assert.match(await page.locator('#hudMonth').textContent(), new RegExp(`DAY ${expected.day}`));
}

try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    try {
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/') || !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          report.blockedRequests.push({ width, method: request.method(), path: url.pathname });
          return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Isolated player entry QA: API writes disabled' }) });
        }
        // The one legacy document is allowed only to redirect. It must not import QA code.
        if (qaPath.test(url.pathname) && url.pathname !== '/xvisor/quest/quality-preview.html') {
          report.qaRequests.push({ width, path: url.pathname });
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push({ width, message: error.message }));
      await page.goto(`${base}/xvisor/`);
      await page.locator('#playButton').waitFor();
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY), null, 'each viewport begins without a game save');
      assert.equal(await page.locator('#playButton').getAttribute('href'), questPath);
      assert.match(await page.locator('#playButton').textContent(), /เริ่มเกม/);
      await assertPlayerSurface(page, `${width}px intro`);
      await capture(page, `entry-${width}-intro`);
      check(`${width}px: fresh intro offers the real game and has no QA controls or overflow`);

      await page.locator('#playButton').click();
      await page.waitForURL(url => url.pathname === questPath && !url.search);
      await assertGameReady(page);
      assert.equal(await page.locator('body').getAttribute('data-stage'), 'opening');
      await assertPlayerSurface(page, `${width}px opening`);
      await capture(page, `entry-${width}-opening`);
      await page.locator('#actionBar button').first().click();
      await page.locator('body[data-stage="pre_day0_band"]').waitFor({ state: 'attached' });
      const expected = progress(await savedState(page));
      assert.ok(expected.runId, 'a real action must persist a run ID');
      assert.equal(expected.month, 0);
      report.runs.push({ width, ...expected });
      check(`${width}px: start CTA renders scenery and enabled actions; a real first action persists progress`);

      await page.reload();
      await assertGameReady(page);
      await assertSameRun(page, expected, 'reload');
      await assertPlayerSurface(page, `${width}px saved game`);
      check(`${width}px: reload resumes the same run ID, month, day, energy, and stage`);

      await page.goto(`${base}/xvisor/quest/quality-preview.html?scene=management&release=1.1`);
      await page.waitForURL(url => url.pathname === questPath && !url.search);
      await assertGameReady(page);
      await assertSameRun(page, expected, 'legacy preview redirect');
      await assertPlayerSurface(page, `${width}px legacy redirect`);
      await capture(page, `entry-${width}-legacy-redirect`);
      check(`${width}px: old preview URL redirects to the real game without injecting a fixture or altering the save`);

      await page.goto(`${base}/xvisor/`);
      await page.getByRole('link', { name: '▶ เล่นต่อจากที่บันทึกไว้', exact: true }).waitFor();
      assert.deepEqual(progress(await savedState(page)), expected, 'returning to the intro must preserve progress');
      await assertPlayerSurface(page, `${width}px resume intro`);
      await capture(page, `entry-${width}-resume-intro`);
      await page.locator('#playButton').click();
      await page.waitForURL(url => url.pathname === questPath && !url.search);
      await assertGameReady(page);
      await assertSameRun(page, expected, 'resume CTA');
      await assertPlayerSurface(page, `${width}px resumed game`);
      await capture(page, `entry-${width}-resumed`);
      check(`${width}px: intro recognizes an existing save and Play Continue returns to that exact progress`);
    } finally {
      await context.close();
    }
  }
  assert.notEqual(report.runs[0].runId, report.runs[1].runId, 'viewport runs must use independently created storage');
  assert.deepEqual(report.qaRequests, [], 'player routes must not load QA or fixture modules');
  assert.deepEqual(report.errors, [], 'all player entry transitions must be free of uncaught errors');
  check('Independent saves, no fixture requests, and zero uncaught browser errors; all API and mutation requests intercepted');
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`Proof: ${output}/report.json`);
}
