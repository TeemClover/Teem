// Render single frames of the cover for review.
// Usage: node tools/fastwork-cover/frame.mjs <out.png> [t=0] [extra query, e.g. "guides=1" or "still=1"]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const [out, t = '0', extra = ''] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${pathToFileURL(path.join(here, 'index.html'))}?fit=0&paused=1${extra ? '&' + extra : ''}`);
await page.evaluate(() => window.__cover.ready);
for (const [i, tt] of t.split(',').entries()) {
  await page.evaluate((v) => window.__cover.seek(v), Number(tt));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const file = t.includes(',') ? out.replace(/(\.\w+)$/, `-${i}$1`) : out;
  await page.screenshot({ path: file });
  console.log('saved', file, 't=' + tt);
}
await browser.close();
