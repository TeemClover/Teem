/**
 * Clover Motion in a real browser: blocks below the fold rise in and nothing stays hidden,
 * reduce-motion leaves pages untouched, the portal leads back to the room you came from,
 * and every registered page boots its profile without errors on desktop and phone.
 * Run: [FRONTDOOR_PLAYWRIGHT=/path/to/playwright/index.mjs] node tests/motion/motion.e2e.mjs
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {MOTION_PAGES} from '../../tools/motion-pages.mjs';

const {chromium} = await import(process.env.FRONTDOOR_PLAYWRIGHT ? pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2'};
const server = http.createServer(async (q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  try { if ((await stat(join(root, p))).isDirectory()) p = p.replace(/\/?$/, '/index.html'); } catch {}
  try { const b = await readFile(join(root, p)); r.writeHead(200, {'content-type': types[extname(p)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME || undefined});
const pass = m => console.log('PASS ' + m);
const urlOf = file => '/' + (file === 'tour/index.html' ? '' : file === 'frontdoor/index.html' ? 'compass/' : file.replace(/index\.html$/, ''));

async function open(path, opts = {}) {
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, ...opts});
  await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/clover-motion/.test(m.text())) errors.push(m.text()); });
  await page.goto(base + path, {waitUntil: 'load'});
  await page.waitForFunction(() => document.documentElement.classList.contains('cm-ready'));
  return {ctx, page, errors};
}

try {
  { // a reading page: blocks below the fold wait, then rise in; nothing is left hidden
    const {ctx, page, errors} = await open('/courses/');
    const waiting = await page.$$eval('.cm-r', els => els.map(el => [el.getBoundingClientRect().top > innerHeight * 0.9, getComputedStyle(el).opacity]));
    assert.ok(waiting.length > 0, 'something below the fold should wait for the reader');
    assert.ok(waiting.every(([below]) => below), 'nothing already in view is ever hidden');
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 500) {
      await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(120);
    }
    await page.waitForFunction(() => !document.querySelector('.cm-r'), null, {timeout: 6000});
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => getComputedStyle(el).opacity === '0').length), 0);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('lenis')), 'desktop pointers get the same smooth scroll as the house');
    const portal = page.locator('.cm-portal');
    assert.equal(await portal.getAttribute('href'), '/#classroom');
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
    assert.ok(await portal.evaluate(a => a.classList.contains('cm-tuck')), 'at the top the page header leads; the portal waits');
    assert.deepEqual(errors, []);
    await ctx.close();
    pass('reading page: below-the-fold blocks rise in, nothing stays hidden, the portal knows the classroom');
  }

  { // reduce motion: the page is exactly itself
    const {ctx, page, errors} = await open('/privacy/', {reducedMotion: 'reduce'});
    assert.equal(await page.$$eval('.cm-r, .cm-tilt, .cm-par, .cm-hero-out', els => els.length), 0);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis')), false);
    assert.ok(await page.locator('.cm-portal').count(), 'the way home stays');
    assert.deepEqual(errors, []);
    await ctx.close();
    pass('reduce motion: no reveal, tilt, parallax or smooth scroll; the portal remains');
  }

  { // apps own their screen: page transitions only, no floating door over their controls
    const {ctx, page, errors} = await open('/compass/');
    assert.equal(await page.locator('.cm-portal').count(), 0);
    assert.equal(await page.evaluate(() => window.cloverMotion.profile), 'app');
    assert.deepEqual(errors, []);
    await ctx.close();
    pass('app pages (the Compass) keep their whole screen');
  }

  { // the house remembers the room you leave from, and the portal leads back there
    const {ctx, page} = await open('/', {viewport: {width: 1280, height: 800}});
    await page.evaluate(() => document.querySelector('#kitchen a[data-item="ako-kitchen"]').click());
    await page.waitForURL('**/ako/kitchen/');
    await page.waitForSelector('.cm-portal');
    assert.equal(await page.getAttribute('.cm-portal', 'href'), '/#kitchen');
    assert.match(await page.getAttribute('.cm-portal', 'aria-label'), /ห้องครัว/);
    await ctx.close();
    pass('leaving from the kitchen, the portal on the next page returns to the kitchen');
  }

  // every registered page boots its own profile, on desktop and on a phone
  for (const viewport of [{width: 1280, height: 800}, {width: 390, height: 844, isMobile: true, hasTouch: true}]) {
    const ctx = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch});
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const failed = [];
    for (const [file, {profile}] of Object.entries(MOTION_PAGES)) {
      const page = await ctx.newPage(), errors = [];
      page.on('console', m => { if (/clover-motion/.test(m.text())) errors.push(m.text()); });
      await page.goto(base + urlOf(file), {waitUntil: 'domcontentloaded'});
      try { await page.waitForFunction(() => document.documentElement.classList.contains('cm-ready'), null, {timeout: 15000}); }
      catch { failed.push(`${file}: never ready`); await page.close(); continue; }
      const got = await page.evaluate(() => ({profile: window.cloverMotion.profile}));
      if (got.profile !== profile) failed.push(`${file}: profile ${got.profile}`);
      if (errors.length) failed.push(`${file}: ${errors.join(' | ')}`);
      await page.close();
    }
    assert.deepEqual(failed, []);
    await ctx.close();
    pass(`${Object.keys(MOTION_PAGES).length} pages boot their profile at ${viewport.width}px without errors`);
  }
} finally {
  await browser.close();
  server.close();
}
