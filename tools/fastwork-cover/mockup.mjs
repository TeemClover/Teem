// Simulated previews of the cover in Fastwork's logged-in owner view on phones (mockup.html),
// plus a crop map of the 1920×1080 frame. These are simulations built from measured numbers;
// fastwork-live-check.mjs is the test against the real page.
// Usage: node tools/fastwork-cover/mockup.mjs [media=out/teem-clover-cover-static-1920x1080.png]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const media = path.resolve(process.argv[2] || path.join(here, 'out/teem-clover-cover-static-1920x1080.png'));
const outDir = path.join(here, 'out/preview');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
for (const w of [390, 428, 430]) {
  const page = await browser.newPage({ viewport: { width: w, height: 470 }, deviceScaleFactor: 3 });
  await page.goto(`${pathToFileURL(path.join(here, 'mockup.html'))}?w=${w}&src=${encodeURIComponent(pathToFileURL(media).href)}`);
  await page.evaluate(() => window.__ready); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(outDir, `sim-owner-mobile-${w}.png`) });
  console.log('wrote', `sim-owner-mobile-${w}.png`);
  await page.close();
}
// crop map: the frame itself with every layout's visible window drawn over it
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`${pathToFileURL(path.join(here, 'index.html'))}?fit=0&still=1&guides=1`);
await page.evaluate(() => window.__cover.ready);
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await page.screenshot({ path: path.join(outDir, 'crop-map.png') });
console.log('wrote crop-map.png');
await browser.close();
