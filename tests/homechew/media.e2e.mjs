/** Video behaviour QA for /homechew/ (living imagery). Same env as page.e2e.mjs. */
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const base = process.env.HOMECHEW_BASE_URL || 'http://127.0.0.1:4180/homechew/';
const out = process.env.HOMECHEW_PROOF_DIR || '/tmp/homechew-media-proof';
const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME, headless: true, args: ['--use-angle=metal']});
await mkdir(out, {recursive: true});
const fails = [], log = [];
const ok = (c, m) => { (c ? log : fails).push((c ? 'PASS ' : 'FAIL ') + m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: w < 700 ? 2 : 1, isMobile: w < 700, hasTouch: w < 700, reducedMotion: opts.reduced ? 'reduce' : 'no-preference'});
  if (opts.saveData) await ctx.addInitScript(() => Object.defineProperty(navigator, 'connection', {value: {saveData: true}, configurable: true}));
  const page = await ctx.newPage();
  const videos = [], errors = [];
  page.on('request', r => { if (/\.mp4(\?|$)/.test(r.url())) videos.push(r.url().split('/').pop()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !/net::ERR_ABORTED/.test(m.text()) && errors.push(m.text()));
  await page.goto(base, {waitUntil: 'load'});
  await page.waitForTimeout(1500);
  return {ctx, page, videos, errors};
}
const playing = page => page.evaluate(() => [...document.querySelectorAll('video')].map(v => ({cls: v.className, src: (v.currentSrc || '').split('/').pop(), paused: v.paused, muted: v.muted, t: +v.currentTime.toFixed(2)})));
const scrollToEl = (page, sel, frac = 0.5) => page.evaluate(([s, f]) => { const el = document.querySelector(s); const r = el.getBoundingClientRect(); window.scrollTo(0, scrollY + r.top - innerHeight * (1 - f) + r.height * f * 0); }, [sel, frac]);

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const tag = `${w}x${h}`;
  const s = await open(w, h);
  await s.page.waitForFunction(() => [...document.querySelectorAll('video')].every(v => !v.paused && v.currentTime > 0), {timeout: 20000});
  ok(new Set(s.videos).size === 13, `${tag}: all 13 clips load and play before scrolling`);
  await s.page.evaluate(() => document.querySelector('.hc-taste__row--sweet .hc-taste__img').scrollIntoView({block: 'center'}));
  await s.page.waitForTimeout(2500);
  let st = await playing(s.page);
  const loopsPlaying = st.filter(v => v.cls.includes('hc-loop') && !v.paused);
  ok(loopsPlaying.length === 3 && loopsPlaying.every(v => v.t > 0), `${tag}: all three taste loops keep playing (${JSON.stringify(loopsPlaying)})`);
  await s.page.screenshot({path: `${out}/${tag}-taste.png`});
  // living images: flavour chapters, feast table and craft steps play their footage in place of the photo
  for (const sel of ['#hat-yai .hc-live', '#crave .hc-crave__wide .hc-live', '#craft .hc-live']) {
    await s.page.evaluate(sel => document.querySelector(sel).scrollIntoView({block: 'center'}), sel);
    await s.page.waitForTimeout(2500);
    st = await playing(s.page);
    const lives = st.filter(v => v.cls.includes('hc-live') && !v.paused);
    ok(lives.length === 10 && lives.every(v => v.muted && v.t > 0), `${tag}: ${sel} plays muted footage (${lives.map(v => v.src).join(',')})`);
    ok(st.every(v => !v.paused), `${tag}: offscreen videos keep playing`);
    await s.page.screenshot({path: `${out}/${tag}-${sel.split(' ')[0].slice(1)}.png`});
  }
  const posters = await s.page.evaluate(() => [...document.querySelectorAll('video.hc-live, video.hc-loop')].map(v => v.poster.split('/').pop()));
  ok(new Set(posters).size === posters.length, `${tag}: no footage/poster repeated on the page (${posters.length})`);
  ok(await s.page.locator('video[controls], .hc-media__toggle').count() === 0, `${tag}: decorative videos have no control overlay`);
  await s.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await s.page.waitForTimeout(800);
  const footer = await s.page.evaluate(() => ({gap: document.documentElement.scrollHeight - (document.querySelector('.hc-footer').getBoundingClientRect().bottom + scrollY), overflow: document.documentElement.scrollWidth - innerWidth, ctaHidden: document.querySelector('.hc-mobile-cta').classList.contains('is-hidden')}));
  ok(Math.abs(footer.gap) < 2 && footer.overflow <= 0 && footer.ctaHidden, `${tag}: footer ends flush, without overflow or floating CTA (${JSON.stringify(footer)})`);
  await s.page.screenshot({path: `${out}/${tag}-footer.png`});
  ok(!(await s.page.$('.hc-film')), `${tag}: duplicated film section removed`);
  await s.page.evaluate(() => window.scrollTo(0, 0));
  await s.page.waitForTimeout(800);
  st = await playing(s.page);
  ok(st.every(v => !v.paused), `${tag}: every video keeps playing after scrolling back to top`);
  ok(s.errors.length === 0, `${tag}: no console/page errors ${s.errors.join(' | ')}`);
  await s.ctx.close();
}
{
  const s = await open(1440, 900, {reduced: true});
  await s.page.evaluate(() => document.querySelector('#hat-yai .hc-live').scrollIntoView({block: 'center'}));
  await s.page.waitForTimeout(2000);
  const st = await playing(s.page);
  ok(st.every(v => !v.paused) && new Set(s.videos).size === 13, 'continuous playback remains enabled without a preference gate');
  await s.ctx.close();
}
{
  const s = await open(390, 844, {saveData: true});
  for (const sel of ['#hat-yai .hc-live', '#crave .hc-live', '#craft .hc-live']) {
    await s.page.locator(sel).first().scrollIntoViewIfNeeded();
    await s.page.waitForTimeout(400);
  }
  ok(new Set(s.videos).size === 13 && (await playing(s.page)).every(v => !v.paused), 'all clips load and play without a Save-Data gate');
  await s.ctx.close();
}
{ // missing media: page still works, no broken frame
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  await ctx.route('**/*.mp4', r => r.fulfill({status: 404, body: ''}));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base); await page.evaluate(() => document.querySelector('#hat-yai .hc-live').scrollIntoView({block: 'center'}));
  await page.waitForTimeout(2000);
  const poster = await page.evaluate(() => document.querySelector('#hat-yai .hc-live').poster);
  ok(errs.length === 0 && /\.webp$/.test(poster), 'video 404: no script error, poster remains');
  await page.screenshot({path: `${out}/film-404.png`});
  await ctx.close();
}
await writeFile(`${out}/media-report.json`, JSON.stringify({log, fails}, null, 2));
console.log(fails.length ? `${fails.length} failure(s)` : 'all media checks passed');
await browser.close();
process.exitCode = fails.length ? 1 : 0;
