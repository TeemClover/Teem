import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPreviewServer} from './preview.mjs';

const runtime = process.env.SHORT_PLAYWRIGHT || '/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium} = await import(pathToFileURL(runtime).href);
const server = createPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const proof = process.env.SHORT_PROOF_DIR || '/private/tmp/tontor-carousel-qa';
await mkdir(proof, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.SHORT_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results = [];

async function setup(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/short/', {waitUntil: 'networkidle'});
  await page.evaluate(async () => {
    document.body.innerHTML = '<section class="hero" id="test-hero"></section><div style="height:1200px;background:#111113"></div>';
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = './hero-carousel.css';
    const loaded = new Promise(resolve => link.onload = resolve); document.head.append(link); await loaded;
    const [{createHeroCarousel}, {stories}] = await Promise.all([import('./hero-carousel.js'), import('./catalog.js')]);
    window.heroChanges = []; window.heroOpens = [];
    window.carousel = createHeroCarousel({root: document.querySelector('#test-hero'), stories, ids: ['rain','krasue','warrior','village'], onChange: story => window.heroChanges.push(story.id), onOpen: (id, autoplay) => window.heroOpens.push({id, autoplay})});
    await document.fonts.ready;
  });
  return {context, page, errors};
}

async function swipe(session, points) {
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: points[0][0], y: points[0][1]}]});
  for (const [x, y] of points.slice(1)) {
    await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y}]});
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
}

try {
  for (const width of [320, 390, 768, 1440, 2560]) {
    const {context, page, errors} = await setup({viewport: {width, height: 1000}, isMobile: width < 760, hasTouch: true, reducedMotion: 'reduce'});
    assert.equal(await page.locator('.hc-slide').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.hc-visual img').evaluateAll(images => images.every(image => getComputedStyle(image).objectFit === 'contain')), true);
    await page.locator('[data-hc-index="2"]').click();
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'warrior');
    assert.equal(await page.locator('[data-hc-index="2"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.hc-slide:not([inert])').count(), 1);
    await page.locator('[data-hc-id="warrior"] .hc-watch').click();
    assert.deepEqual(await page.evaluate(() => window.heroOpens), [{id: 'warrior', autoplay: true}]);
    await page.locator('.hc-track').focus(); await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'rain');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'krasue');
    assert.match(await page.locator('.hc-status').textContent(), /กระสือแถวบ้าน/);
    await page.evaluate(() => window.carousel.select('rain'));
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'rain');
    await page.screenshot({path: `${proof}/hero-${width}.png`});
    assert.deepEqual(errors, []);
    await context.close(); results.push(`${width}px: whole poster framing, no page overflow, dots, keyboard, active accessibility, watch callback`);
  }
  {
    const {context, page, errors} = await setup({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    const session = await context.newCDPSession(page);
    const points = Array.from({length: 16}, (_, index) => [335 - index * 18, 180]);
    await swipe(session, points);
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'krasue');
    await page.waitForFunction(() => Math.abs(document.querySelector('.hc-track').scrollLeft - document.querySelector('.hc-track').clientWidth) < 2);
    assert.equal(await page.locator('.hc-slide').count(), 4, 'slides remain mounted across native swipes');
    await swipe(session, Array.from({length: 12}, (_, index) => [195, 265 - index * 14]));
    await page.waitForFunction(() => scrollY > 80);
    assert.equal(await page.locator('#test-hero').getAttribute('data-hc-active'), 'krasue', 'vertical page gestures do not switch stories');
    await page.evaluate(() => scrollTo(0,0));
    await swipe(session, Array.from({length: 16}, (_, index) => [65 + index * 18, 180]));
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'rain');
    await page.waitForFunction(() => document.querySelector('.hc-track').scrollLeft < 2);
    assert.deepEqual(errors, []);
    await context.close(); results.push('native mobile touch: left/right momentum swipes settle precisely; vertical gestures scroll page without changing stories');
  }
  {
    const {context, page, errors} = await setup({viewport: {width: 1440, height: 1000}});
    await page.mouse.move(1120, 225); await page.mouse.down();
    await page.mouse.move(620,225,{steps:15});
    assert.ok(await page.locator('.hc-track').evaluate(track => track.scrollLeft > 300), 'mouse drag follows the pointer continuously');
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'krasue');
    await page.waitForFunction(() => Math.abs(document.querySelector('.hc-track').scrollLeft - document.querySelector('.hc-track').clientWidth) < 2);
    await page.locator('[data-hc-move="1"]').click();
    await page.waitForFunction(() => document.querySelector('#test-hero').dataset.hcActive === 'warrior');
    assert.deepEqual(errors, []);
    await context.close(); results.push('desktop mouse: continuous dragging, intentional release snapping and next arrow');
  }
  await writeFile(`${proof}/results.json`, JSON.stringify(results,null,2));
  for (const result of results) console.log('PASS ' + result);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
