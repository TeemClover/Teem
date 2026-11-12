// Crop test on the REAL Fastwork profile page — without uploading anything.
// Loads the public profile, then (only inside this headless browser) places a local file into the
// page's own cover slot using the page's own markup and CSS classes. This proves how Fastwork's
// live CSS crops and overlaps the file at each width. It does not prove the upload/transcode step.
//
// Usage: node tools/fastwork-cover/fastwork-live-check.mjs [media=out/teem-clover-cover-static-1920x1080.png] [profile=teem]
// Network: needs fastwork.com reachable (HTTPS_PROXY honoured). Read-only GET of a public page.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const media = path.resolve(process.argv[2] || path.join(here, 'out/teem-clover-cover-static-1920x1080.png'));
const profile = process.argv[3] || 'teem';
const outDir = path.join(here, 'out/preview');
const isVideo = /\.(mp4|webm|mov)$/i.test(media);
const mime = isVideo ? 'video/mp4' : media.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
const kind = isVideo ? 'video' : 'image';
const seekTo = Number(process.env.COVER_SEEK ?? 6.7);   // video only: the moment to photograph (seconds)

const views = [
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, dpr: 3, mobile: true },
  { name: 'mobile-430', viewport: { width: 430, height: 932 }, dpr: 3, mobile: true },
  { name: 'tablet-820', viewport: { width: 820, height: 1180 }, dpr: 2, mobile: true },
  { name: 'desktop-1440', viewport: { width: 1440, height: 900 }, dpr: 2, mobile: false },
];
const only = process.env.COVER_VIEWS ? process.env.COVER_VIEWS.split(',') : null;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const report = [];
for (const v of views) {
  if (only && !only.includes(v.name)) continue;
  const ctx = await browser.newContext({
    viewport: v.viewport, deviceScaleFactor: v.dpr, isMobile: v.mobile, hasTouch: v.mobile, locale: 'en-US',
    userAgent: v.mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' : undefined,
  });
  const page = await ctx.newPage();
  await page.route('**/__cover_test__/*', (r) => r.fulfill({ path: media, contentType: mime }));
  await page.goto(`https://fastwork.com/user/${profile}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('figure.featured .cover', { timeout: 30000 });
  await page.waitForTimeout(3500);
  // Fastwork's own script may re-render the header once after load; inject, and re-inject if our node was dropped.
  const inject = () => page.evaluate(async ({ isVideo }) => {
    const cover = document.querySelector('figure.featured .cover');
    const scoped = [...cover.classList].find((c) => c.startsWith('svelte-'));
    let content = cover.querySelector('.content');
    if (!content) { content = document.createElement('div'); content.className = `content ${scoped}`; cover.appendChild(content); }
    content.replaceChildren();
    cover.classList.remove('blank', 'empty');
    const m = document.createElement(isVideo ? 'video' : 'img');
    m.className = `media ${scoped}`;                        // same element + class Fastwork renders
    m.id = '__cover_test_media';
    if (isVideo) { m.muted = true; m.autoplay = true; m.loop = true; m.playsInline = true; }
    m.src = '/__cover_test__/cover';
    content.appendChild(m);
    await new Promise((res) => { m.addEventListener(isVideo ? 'loadeddata' : 'load', res, { once: true }); setTimeout(res, 8000); });
  }, { isVideo });
  for (let attempt = 0; attempt < 4; attempt++) {
    await inject();
    await page.waitForTimeout(1500);
    const ok = await page.evaluate(() => { const m = document.getElementById('__cover_test_media'); return !!m && m.isConnected && m.getBoundingClientRect().width > 0; });
    if (ok) break;
  }
  if (isVideo) await page.waitForFunction((t) => { const m = document.getElementById('__cover_test_media'); return m && m.currentTime >= t; }, seekTo, { timeout: 30000, polling: 100 }).catch(() => {});
  const info = await page.evaluate(({ isVideo }) => {
    const m = document.getElementById('__cover_test_media');
    const cover = m.closest('.cover');
    const scoped = [...cover.classList].find((c) => c.startsWith('svelte-'));
    const video = isVideo ? { playing: !m.paused && m.currentTime > 0, muted: m.muted, loop: m.loop, intrinsic: `${m.videoWidth}x${m.videoHeight}`, duration: +m.duration.toFixed(2), photographedAt: +m.currentTime.toFixed(2) } : null;
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const cs = getComputedStyle(m);
    return {
      scopedClass: scoped, video, cover: r(cover), media: r(m), objectFit: cs.objectFit, objectPosition: cs.objectPosition, radius: getComputedStyle(cover).borderRadius,
      identity: r(document.querySelector('header .identity')), avatar: r(document.querySelector('header .avatar')),
      identityBg: getComputedStyle(document.querySelector('header .identity')).backgroundColor, identityRadius: getComputedStyle(document.querySelector('header .identity')).borderRadius,
      viewport: { w: innerWidth, h: innerHeight },
    };
  }, { isVideo });
  await page.screenshot({ path: path.join(outDir, `live-${kind}-${v.name}.png`) });
  report.push({ view: v.name, ...info });
  console.log(v.name, JSON.stringify(info));
  await ctx.close();
}
await browser.close();
const { writeFile } = await import('node:fs/promises');
await writeFile(path.join(outDir, `live-check-${kind}.json`), JSON.stringify({ checked: new Date().toISOString(), profile, media: path.basename(media), note: 'Real Fastwork page + CSS; media injected locally in a headless browser. Not an upload test.', views: report }, null, 2) + '\n');
