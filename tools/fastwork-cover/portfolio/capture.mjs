// Capture the real public pages used on the Fastwork portfolio cards (read-only page loads).
// Usage: node tools/fastwork-cover/portfolio/capture.mjs [name ...]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const pages = {
  homechew: ['https://www.myclover.com/homechew/', 6000],
  office: ['https://x.myclover.com/', 9000],
  mediral: ['https://www.myclover.com/mediral/', 6000],
  line: ['https://www.myclover.com/showcase/line-brand/', 5000],
  erp: ['https://www.myclover.com/showcase/erp-brand/', 4000],
  xvisor: ['https://www.myclover.com/xvisor/', 7000],
  short: ['https://www.myclover.com/short/', 7000],
  hamburg: ['https://www.myclover.com/hamburg/', 6000],
};
const want = process.argv.slice(2);
const browser = await chromium.launch({
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const [name, [url, wait]] of Object.entries(pages)) {
  if (want.length && !want.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, locale: 'th-TH' });
  const page = await ctx.newPage();
  try { await page.goto(url, { waitUntil: 'load', timeout: 45000 }); } catch (e) { console.log(name, 'goto:', e.message.split('\n')[0]); }
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(here, 'shots', `${name}.png`) });
  console.log('saved', name);
  await ctx.close();
}
await browser.close();
