/**
 * Browser QA for /homechew/ against a local static server. No external requests are allowed
 * except Google Fonts (blocked here too, so results reflect the fallback-font worst case unless
 * HOMECHEW_ALLOW_FONTS=1).
 *
 *   HOMECHEW_BASE_URL=http://127.0.0.1:4180/homechew/ \
 *   FRONTDOOR_PLAYWRIGHT=/path/to/playwright-core/index.mjs \
 *   FRONTDOOR_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *   HOMECHEW_PROOF_DIR=/tmp/homechew-proof node tests/homechew/page.e2e.mjs
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const base = process.env.HOMECHEW_BASE_URL || 'http://127.0.0.1:4180/homechew/';
const out = process.env.HOMECHEW_PROOF_DIR || '/tmp/homechew-proof';
const allowFonts = process.env.HOMECHEW_ALLOW_FONTS === '1';
const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME, headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist']});
await mkdir(out, {recursive: true});

const VIEWPORTS = [[360, 800], [390, 844], [430, 932], [768, 1024], [1440, 900], [1920, 1080]];
const STORY = [-1, 0.1, 0.2, 0.3, 0.42, 0.6, 0.8, 0.95];
const report = {base, date: new Date().toISOString(), viewports: [], modes: [], orderPath: [], failures: []};
const fail = msg => { report.failures.push(msg); console.log('FAIL ' + msg); };
const pass = msg => console.log('PASS ' + msg);
const saveReport = () => writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));

async function open(width, height, opts = {}) {
  const mobile = width < 700;
  const context = await browser.newContext({
    viewport: {width, height}, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference',
    javaScriptEnabled: !opts.noJs,
  });
  const external = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    const local = url.startsWith(new URL(base).origin) || /^(data|blob):/.test(url);
    const font = /fonts\.(googleapis|gstatic)\.com/.test(url);
    if (local || (font && allowFonts)) return route.continue();
    if (!font && !/^https:\/\/lin\.ee\//.test(url)) external.push(url);
    return route.abort();
  });
  if (opts.noWebgl) await context.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : orig.call(this, type, ...rest); };
  });
  await context.addInitScript(() => {
    window.__perf = {lcp: 0, cls: 0};
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({type: 'largest-contentful-paint', buffered: true});
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({type: 'layout-shift', buffered: true});
  });
  const page = await context.newPage();
  const errors = [], badImages = [];
  let bytes = 0;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', async r => {
    if (r.status() >= 400) badImages.push(r.status() + ' ' + r.url());
    const len = +(r.headers()['content-length'] || 0);
    bytes += len;
  });
  await page.goto(base + (opts.query || ''), {waitUntil: 'load'});
  return {context, page, errors, badImages, external, bytes: () => bytes};
}

const scrollTo = (page, u) => page.evaluate(u => {
  const m = window.__homechew.m;
  const y = u < 0 ? m.heroTop + (u + 1) * (m.pourTop - m.heroTop) : m.pourTop + u * (m.pourH - m.vh);
  window.scrollTo(0, y);
}, u);

// Count an order link only when its centre is actually visible and clickable in this
// viewport. Playwright's :visible also matches links several screens below the fold.
const orderVisibility = page => page.evaluate(() => {
  const inspect = el => {
    if (!el) return {usable: false, tabbable: false};
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const painted = r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
    const inViewport = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight;
    const hit = painted && inViewport ? document.elementFromPoint(x, y) : null;
    return {
      usable: !!hit && (hit === el || el.contains(hit)),
      tabbable: el.tabIndex >= 0 && !el.closest('[inert]') && r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      top: Math.round(r.top), bottom: Math.round(r.bottom), opacity: +style.opacity,
    };
  };
  return {
    fixed: inspect(document.querySelector('.hc-mobile-cta')),
    inFlow: [...document.querySelectorAll('#set a[data-cta="line"]')].map(inspect),
  };
});

async function checkMobileOrderPath(page, tag) {
  for (const position of ['entry', 'middle', 'order']) {
    await page.evaluate(position => {
      const set = document.querySelector('#set');
      const top = set.getBoundingClientRect().top + scrollY;
      const order = set.querySelector('a[data-cta="line"]');
      const y = position === 'entry' ? top - innerHeight * 0.2
        : position === 'middle' ? top + Math.max(0, (set.offsetHeight - innerHeight) / 2)
        : order.getBoundingClientRect().top + scrollY - innerHeight * 0.6;
      scrollTo(0, y);
    }, position);
    await page.waitForTimeout(500); // let the intersection observer and CTA transition settle
    const state = await orderVisibility(page);
    if (!state.fixed.usable && !state.inFlow.some(c => c.usable)) fail(`${tag}: no usable LINE order link at set ${position}`);
    if (!state.fixed.usable && state.fixed.tabbable) fail(`${tag}: hidden mobile LINE link remains in keyboard tab order at set ${position}`);
    report.orderPath.push({tag, position, ...state});
    await page.screenshot({path: `${out}/${tag}-set-${position}.png`});
  }
}

const heroOverlap = page => page.evaluate(() => {
  const ja = document.querySelector('.hc-hero__ja');
  if (!ja || !ja.getClientRects().length || getComputedStyle(ja).visibility === 'hidden') return [];
  const j = ja.getBoundingClientRect();
  return [...document.querySelectorAll('.hc-hero .hc-actions a')].filter(el => {
    const r = el.getBoundingClientRect();
    return Math.min(j.right, r.right) > Math.max(j.left, r.left) && Math.min(j.bottom, r.bottom) > Math.max(j.top, r.top);
  }).map(el => el.textContent.trim());
});

for (const [w, h] of VIEWPORTS) {
  const tag = `${w}x${h}`;
  const s = await open(w, h);
  const firstBytes = s.bytes();
  // A real opening capture: the old story -1 capture starts at heroTop, which
  // scrolls the status bar away and can put the headline beneath the sticky header.
  await s.page.evaluate(() => window.scrollTo(0, 0));
  await s.page.screenshot({path: `${out}/${tag}-opening.png`});
  const mode = await s.page.waitForFunction(() => {
    const c = document.documentElement.classList;
    // A designed initial fallback may carry no-3d before the asynchronous upgrade.
    return c.contains('is-3d') ? '3d' : window.__homechew?.no3d ? 'no-3d' : false;
  }, null, {timeout: 25000}).then(h => h.jsonValue()).catch(() => 'timeout');
  if (mode !== '3d') fail(`${tag}: 3D stage did not start (${mode})`);
  await s.page.waitForTimeout(800);
  const perf = await s.page.evaluate(() => window.__perf);
  await s.page.evaluate(() => window.scrollTo(0, 0));
  await s.page.waitForTimeout(300);
  await s.page.screenshot({path: `${out}/${tag}-hero.png`});
  const initialScrollY = await s.page.evaluate(() => scrollY);
  if (initialScrollY !== 0) fail(`${tag}: initial hero capture is not at page top (${initialScrollY})`);
  const overlaps = await heroOverlap(s.page);
  if (overlaps.length) fail(`${tag}: Japanese hero text overlaps ${overlaps.join(' / ')}`);
  for (const u of STORY) {
    await scrollTo(s.page, u);
    await s.page.waitForTimeout(650);
    await s.page.screenshot({path: `${out}/${tag}-story-${u}.png`});
  }
  // rewind check: jump far, come back, compare stage debug state
  await scrollTo(s.page, 0.6); await s.page.waitForTimeout(700);
  const a = await s.page.evaluate(() => window.__homechew.shown);
  await scrollTo(s.page, 0.05); await s.page.waitForTimeout(300);
  await scrollTo(s.page, 0.95); await s.page.waitForTimeout(300);
  await scrollTo(s.page, 0.6); await s.page.waitForTimeout(900);
  const b = await s.page.evaluate(() => window.__homechew.shown);
  if (Math.abs(a - b) > 1e-6) fail(`${tag}: rewind did not settle (${a} vs ${b})`); else pass(`${tag}: rewind settles`);

  // frame timing while scrubbing the pour
  const frames = await s.page.evaluate(async () => {
    const m = window.__homechew.m, times = [];
    let last = performance.now();
    for (let i = 0; i <= 90; i++) {
      window.scrollTo(0, m.pourTop + (0.42 + i * 0.004) * (m.pourH - m.vh));
      await new Promise(r => requestAnimationFrame(r));
      const now = performance.now(); times.push(now - last); last = now;
    }
    times.sort((x, y) => x - y);
    return {median: +times[45].toFixed(1), p90: +times[81].toFixed(1), stage: window.__homechew.stage?.debug?.()};
  });

  // the whole page (scroll through first so lazy images load), and no horizontal scroll
  await s.page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
      window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
    }
    await Promise.race([new Promise(r => setTimeout(r, 4000)), Promise.all([...document.images].filter(i => i.offsetParent).map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })))]);
    window.scrollTo(0, 0);
  });
  const overflow = await s.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) fail(`${tag}: horizontal overflow ${overflow}px`);
  await s.page.screenshot({path: `${out}/${tag}-full.png`, fullPage: true});
  if (w < 900) await checkMobileOrderPath(s.page, tag);
  // LINE CTA reachable
  const line = await s.page.locator('a[data-cta="line"]:visible').count();
  if (line < 1) fail(`${tag}: no visible LINE CTA`);
  if (s.errors.length) fail(`${tag}: console errors ${s.errors.join(' | ')}`);
  if (s.badImages.length) fail(`${tag}: failed requests ${s.badImages.join(' | ')}`);
  if (s.external.length) fail(`${tag}: unexpected external requests ${s.external.join(' | ')}`);
  report.viewports.push({tag, mode, lcp_ms: Math.round(perf.lcp), cls: +perf.cls.toFixed(3), transferred_bytes_after_load: firstBytes, total_bytes: s.bytes(), frames, lineCtasVisible: line, errors: s.errors});
  await saveReport();
  console.log(tag, JSON.stringify(report.viewports.at(-1)));
  await s.context.close();
}

for (const [label, opts] of [['reduced-motion', {reduced: true}], ['no-webgl', {noWebgl: true}], ['no-javascript', {noJs: true}]]) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const s = await open(w, h, opts);
    await s.page.waitForTimeout(2500);
    // Drive waits from the test runner: timers inside evaluate do not fire when
    // JavaScript is disabled, even though synchronous DevTools evaluation works.
    const scrollHeight = await s.page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < scrollHeight; y += h * 0.8) {
      await s.page.evaluate(y => window.scrollTo(0, y), y);
      await s.page.waitForTimeout(120);
    }
    await s.page.evaluate(() => window.scrollTo(0, 0));
    const st = await s.page.evaluate(() => {
      const pin = document.querySelector('.hc-pour__pin'), pour = document.querySelector('#pour');
      const end = document.querySelector('.hc-pour__end .hc-btn');
      const endStyle = getComputedStyle(end);
      const heroOrder = document.querySelector('.hc-hero a[data-cta="line"]');
      return {
        cls: document.documentElement.className,
        pinPosition: getComputedStyle(pin).position, stagePosition: getComputedStyle(document.querySelector('#stage')).position,
        pourHeight: pour.offsetHeight, contentHeight: pin.offsetHeight,
        ctaVisible: !!end.offsetParent && endStyle.visibility !== 'hidden' && Number(getComputedStyle(end.parentElement.parentElement).opacity) > 0,
        heroOrder: !!heroOrder?.offsetParent && heroOrder.getAttribute('href') === 'https://lin.ee/owu0J0g',
        fallbackImages: [...document.querySelectorAll('#stage img, .hc-stills img')].filter(img => img.offsetParent && img.complete && img.naturalWidth > 0).length,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    if (!opts.noJs && !st.cls.includes('hc-static')) fail(`${label} ${w}: static mode not applied`);
    if (['sticky', 'fixed'].includes(st.pinPosition) || ['sticky', 'fixed'].includes(st.stagePosition)) fail(`${label} ${w}: story still pinned`);
    if (st.pourHeight > st.contentHeight + 160) fail(`${label} ${w}: empty scroll runway remains (${st.pourHeight}px section, ${st.contentHeight}px content)`);
    if (!st.ctaVisible) fail(`${label} ${w}: end-state CTA hidden`);
    if (!st.heroOrder) fail(`${label} ${w}: hero LINE order link unavailable`);
    if (st.fallbackImages < 1) fail(`${label} ${w}: no loaded fallback product or food image`);
    if (st.overflow > 1) fail(`${label} ${w}: horizontal overflow ${st.overflow}px`);
    await s.page.screenshot({path: `${out}/${label}-${w}x${h}-full.png`, fullPage: true});
    if (s.errors.length) fail(`${label} ${w}: console errors ${s.errors.join(' | ')}`);
    report.modes.push({label, size: `${w}x${h}`, ...st, errors: s.errors});
    await saveReport();
    console.log(label, w, JSON.stringify(st));
    await s.context.close();
  }
}

// keyboard: first Tab stops reach skip link, header and a LINE CTA with visible focus
{
  const s = await open(1440, 900);
  const stops = [];
  for (let i = 0; i < 8; i++) {
    await s.page.keyboard.press('Tab');
    stops.push(await s.page.evaluate(() => {
      const e = document.activeElement;
      const o = getComputedStyle(e).outlineStyle;
      return (e.dataset.cta || e.textContent.trim().slice(0, 18)) + (o === 'none' ? ' [no outline]' : '');
    }));
  }
  report.keyboard = stops;
  if (!stops.some(t => t.startsWith('line'))) fail('keyboard: LINE CTA not reached in first 8 tabs');
  if (stops.some(t => t.includes('[no outline]'))) fail('keyboard: focus without visible outline');
  console.log('keyboard', stops.join(' → '));
  await s.context.close();
}

await saveReport();
console.log(report.failures.length ? `\n${report.failures.length} failure(s)` : '\nall browser checks passed');
await browser.close();
process.exitCode = report.failures.length ? 1 : 0;
