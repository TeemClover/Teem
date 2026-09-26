/** Targeted WebGL-loss and continuous-scroll regressions. Same environment as page.e2e.mjs. */
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const base = process.env.HOMECHEW_BASE_URL || 'http://127.0.0.1:4180/homechew/';
const out = process.env.HOMECHEW_PROOF_DIR || '/tmp/homechew-proof';
const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME, headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist']});
const report = {base, startedAt: new Date().toISOString(), failures: []};
const fail = message => { report.failures.push(message); console.log('FAIL ' + message); };
await mkdir(out, {recursive: true});

async function open(width, height) {
  const mobile = width < 700;
  const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile});
  await context.route('**/*', route => {
    const url = route.request().url();
    const allowed = url.startsWith(new URL(base).origin) || /^(data|blob):/.test(url)
      || (process.env.HOMECHEW_ALLOW_FONTS === '1' && /fonts\.(googleapis|gstatic)\.com/.test(url));
    return allowed ? route.continue() : route.abort();
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.waitForFunction(() => document.documentElement.classList.contains('is-3d'), null, {timeout: 25000});
  return {page, context, errors};
}

try {
  // Context loss must preserve the authored fallback images, even after inspection
  // enabled the drag surface. A snapshot from a lost context can be a blank data URL.
  {
    const {page, context, errors} = await open(1440, 900);
    const originals = await page.locator('.hc-stills img').evaluateAll(images => images.map(img => img.getAttribute('src')));
    await page.locator('.hc-inspect__toggle').click();
    const inspectingBefore = await page.locator('.hc-inspect__toggle').getAttribute('aria-pressed');
    if (inspectingBefore !== 'true') fail('context loss: inspection did not become active before the test');
    const supported = await page.evaluate(() => {
      const gl = document.querySelector('#scene').getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      extension.loseContext();
      return true;
    });
    if (!supported) fail('context loss: WEBGL_lose_context unavailable; regression not exercised');
    else {
      await page.waitForFunction(() => document.documentElement.classList.contains('no-3d'));
      for (const img of await page.locator('.hc-stills img').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(img => img.decode());
      }
      report.contextLoss = await page.evaluate(originals => {
        const images = [...document.querySelectorAll('.hc-stills img')];
        return {
          classes: document.documentElement.className,
          pinPosition: getComputedStyle(document.querySelector('.hc-pour__pin')).position,
          inspectionPressed: document.querySelector('.hc-inspect__toggle').getAttribute('aria-pressed'),
          inspectionSurface: document.documentElement.classList.contains('is-inspecting'),
          originalSourcesRetained: images.every((img, i) => img.getAttribute('src') === originals[i]),
          images: images.map(img => ({src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0})),
        };
      }, originals);
      const state = report.contextLoss;
      if (!state.classes.includes('hc-static') || ['sticky', 'fixed'].includes(state.pinPosition)) fail('context loss: fallback remained pinned');
      if (state.inspectionPressed !== 'false' || state.inspectionSurface) fail('context loss: bottle inspection remained enabled');
      if (!state.originalSourcesRetained || !state.images.every(img => img.loaded && !img.src.startsWith('data:'))) fail('context loss: authored fallback images were replaced or failed to load');
      await page.screenshot({path: `${out}/context-loss-fallback.png`});
    }
    if (errors.length) fail('context loss: page errors ' + errors.join(' | '));
    await context.close();
  }

  // Demand rendering must still measure consecutive scroll frames. Previously the
  // per-frame timestamp reset after every demand frame, leaving medianFrameMs null.
  {
    const {page, context, errors} = await open(390, 844);
    report.continuousScroll = await page.evaluate(async () => {
      const m = window.__homechew.m;
      for (let i = 0; i < 180; i++) {
        scrollTo(0, m.pourTop + (0.42 + i * 0.002) * (m.pourH - m.vh));
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      return window.__homechew.stage.debug();
    });
    const median = report.continuousScroll.medianFrameMs;
    if (!Number.isFinite(median) || median <= 0) fail(`continuous scroll: renderer failed to collect frame timing (${median})`);
    if (errors.length) fail('continuous scroll: page errors ' + errors.join(' | '));
    await context.close();
  }
} catch (error) {
  fail(error.message);
} finally {
  report.completedAt = new Date().toISOString();
  await writeFile(`${out}/resilience-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
console.log(report.failures.length ? `${report.failures.length} resilience failure(s)` : 'all resilience checks passed');
process.exitCode = report.failures.length ? 1 : 0;
