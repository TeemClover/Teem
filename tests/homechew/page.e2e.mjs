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
const report = {base, date: new Date().toISOString(), viewports: [], modes: [], failures: []};
const fail = msg => { report.failures.push(msg); console.log('FAIL ' + msg); };
const pass = msg => console.log('PASS ' + msg);

async function open(width, height, opts = {}) {
  const mobile = width < 700;
  const context = await browser.newContext({
    viewport: {width, height}, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference',
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

for (const [w, h] of VIEWPORTS) {
  const tag = `${w}x${h}`;
  const s = await open(w, h);
  const firstBytes = s.bytes();
  const mode = await s.page.waitForFunction(() => {
    const c = document.documentElement.classList;
    return c.contains('is-3d') ? '3d' : c.contains('no-3d') ? 'no-3d' : false;
  }, null, {timeout: 25000}).then(h => h.jsonValue()).catch(() => 'timeout');
  if (mode !== '3d') fail(`${tag}: 3D stage did not start (${mode})`);
  await s.page.waitForTimeout(800);
  const perf = await s.page.evaluate(() => window.__perf);
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
  // LINE CTA reachable
  const line = await s.page.locator('a[data-cta="line"]:visible').count();
  if (line < 1) fail(`${tag}: no visible LINE CTA`);
  if (s.errors.length) fail(`${tag}: console errors ${s.errors.join(' | ')}`);
  if (s.badImages.length) fail(`${tag}: failed requests ${s.badImages.join(' | ')}`);
  if (s.external.length) fail(`${tag}: unexpected external requests ${s.external.join(' | ')}`);
  report.viewports.push({tag, mode, lcp_ms: Math.round(perf.lcp), cls: +perf.cls.toFixed(3), transferred_bytes_after_load: firstBytes, total_bytes: s.bytes(), frames, lineCtasVisible: line, errors: s.errors});
  console.log(tag, JSON.stringify(report.viewports.at(-1)));
  await s.context.close();
}

for (const [label, opts] of [['reduced-motion', {reduced: true}], ['no-webgl', {noWebgl: true}]]) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const s = await open(w, h, opts);
    await s.page.waitForTimeout(2500);
    await s.page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    const st = await s.page.evaluate(() => ({cls: document.documentElement.className, pinPosition: getComputedStyle(document.querySelector('.hc-pour__pin')).position, stagePosition: getComputedStyle(document.querySelector('#stage')).position, ctaVisible: !!document.querySelector('.hc-pour__end .hc-btn')?.offsetParent}));
    if (!st.cls.includes('hc-static')) fail(`${label} ${w}: static mode not applied`);
    if (st.pinPosition === 'sticky' || st.stagePosition === 'sticky') fail(`${label} ${w}: story still pinned`);
    if (!st.ctaVisible) fail(`${label} ${w}: end-state CTA hidden`);
    await s.page.screenshot({path: `${out}/${label}-${w}x${h}-full.png`, fullPage: true});
    if (s.errors.length) fail(`${label} ${w}: console errors ${s.errors.join(' | ')}`);
    report.modes.push({label, size: `${w}x${h}`, ...st, errors: s.errors});
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

await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(report.failures.length ? `\n${report.failures.length} failure(s)` : '\nall browser checks passed');
await browser.close();
process.exitCode = report.failures.length ? 1 : 0;
