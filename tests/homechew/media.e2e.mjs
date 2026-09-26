/** Video behaviour QA for /homechew/ (loops + film player). Same env as page.e2e.mjs. */
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const base = process.env.HOMECHEW_BASE_URL || 'http://127.0.0.1:4180/homechew/';
const out = process.env.HOMECHEW_PROOF_DIR || '/tmp/homechew-media-proof';
const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const browser = await chromium.launch({executablePath: process.env.FRONTDOOR_CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal']});
await mkdir(out, {recursive: true});
const fails = [], log = [];
const ok = (c, m) => { (c ? log : fails).push((c ? 'PASS ' : 'FAIL ') + m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: w < 700 ? 2 : 1, isMobile: w < 700, hasTouch: w < 700, reducedMotion: opts.reduced ? 'reduce' : 'no-preference'});
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
  ok(s.videos.length === 0, `${tag}: no video downloaded on first load (${s.videos.join(',') || 'none'})`);
  await s.page.evaluate(() => document.querySelector('.hc-taste__row--sweet .hc-taste__img').scrollIntoView({block: 'center'}));
  await s.page.waitForTimeout(2500);
  let st = await playing(s.page);
  const loopsPlaying = st.filter(v => v.cls.includes('hc-loop') && !v.paused);
  ok(loopsPlaying.length === 1 && loopsPlaying[0].src === 'hy-dip-loop.mp4' && loopsPlaying[0].t > 0, `${tag}: exactly one taste loop plays (${JSON.stringify(loopsPlaying)})`);
  await s.page.screenshot({path: `${out}/${tag}-taste.png`});
  await s.page.evaluate(() => document.querySelector('.hc-film__stage').scrollIntoView({block: 'center'}));
  await s.page.waitForTimeout(3000);
  st = await playing(s.page);
  const f = st.find(v => v.cls.includes('hc-film__video'));
  ok(f && !f.paused && f.muted && f.t > 0, `${tag}: film autoplays muted when visible (${JSON.stringify(f)})`);
  ok(st.filter(v => v.cls.includes('hc-loop') && !v.paused).length === 0, `${tag}: loops pause when off-screen`);
  const expect = w < 700 ? '9x16' : '16x9';
  ok(f && f.src.includes(expect), `${tag}: film uses ${expect} source (${f && f.src})`);
  await s.page.screenshot({path: `${out}/${tag}-film.png`});
  await s.page.click('.hc-film__tabs [data-film="ck"]');
  await s.page.waitForTimeout(2000);
  st = await playing(s.page);
  const g = st.find(v => v.cls.includes('hc-film__video'));
  ok(g.src.startsWith('ck-film') && !g.paused, `${tag}: tab switches film (${g.src})`);
  await s.page.click('.hc-film__sound');
  await s.page.waitForTimeout(500);
  st = await playing(s.page);
  ok(!st.find(v => v.cls.includes('hc-film__video')).muted, `${tag}: sound button unmutes`);
  await s.page.screenshot({path: `${out}/${tag}-film-ck.png`});
  await s.page.evaluate(() => window.scrollTo(0, 0));
  await s.page.waitForTimeout(800);
  st = await playing(s.page);
  ok(st.every(v => v.paused), `${tag}: every video pauses when scrolled away`);
  ok(s.errors.length === 0, `${tag}: no console/page errors ${s.errors.join(' | ')}`);
  await s.ctx.close();
}
{
  const s = await open(1440, 900, {reduced: true});
  await s.page.evaluate(() => document.querySelector('.hc-film__stage').scrollIntoView({block: 'center'}));
  await s.page.waitForTimeout(2000);
  const st = await playing(s.page);
  ok(st.every(v => v.paused), 'reduced motion: nothing autoplays');
  await s.page.click('.hc-film__play'); await s.page.waitForTimeout(1500);
  ok(!(await playing(s.page)).find(v => v.cls.includes('hc-film__video')).paused, 'reduced motion: viewer can press play');
  await s.ctx.close();
}
{ // missing media: page still works, no broken frame
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  await ctx.route('**/*.mp4', r => r.fulfill({status: 404, body: ''}));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base); await page.evaluate(() => document.querySelector('.hc-film__stage').scrollIntoView({block: 'center'}));
  await page.waitForTimeout(2000);
  const poster = await page.evaluate(() => document.querySelector('.hc-film__video').poster);
  ok(errs.length === 0 && /\.webp$/.test(poster), 'video 404: no script error, poster remains');
  await page.screenshot({path: `${out}/film-404.png`});
  await ctx.close();
}
await writeFile(`${out}/media-report.json`, JSON.stringify({log, fails}, null, 2));
console.log(fails.length ? `${fails.length} failure(s)` : 'all media checks passed');
await browser.close();
process.exitCode = fails.length ? 1 : 0;
