// Re-capture the real, public pages used as raw material for the Fastwork cover.
// Read-only: loads each live page in headless Chromium and saves screenshots. Nothing is posted or edited.
// Usage: node tools/fastwork-cover/capture.mjs [name ...]      (HTTPS_PROXY is honoured when set)
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'assets/work/raw');
const ORIGIN = process.env.COVER_ORIGIN || 'https://www.myclover.com';
const VIEW = { width: 1280, height: 800 };
const sleep = (page, ms) => page.waitForTimeout(ms);

// Walk the page once so scroll-triggered reveals have fired, then return to the top.
async function settle(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(page, 140); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(page, 700);
}

const shots = {
  // Brand website: hero plus the sections directly below it, for the in-window scroll.
  async homechew(page, save) {
    await page.goto(`${ORIGIN}/homechew/`, { waitUntil: 'load' });
    await sleep(page, 5000);
    await settle(page);
    await sleep(page, 1500);
    await save('homechew-hero', await page.screenshot({ type: 'png' }));
    await save('homechew-long', await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VIEW.width, height: 2400 }, fullPage: true }));
  },
  // Demo ERP (the page labels itself as fictional data): three real module views.
  async erp(page, save) {
    await page.goto(`${ORIGIN}/showcase/erp-brand/`, { waitUntil: 'load' });
    await sleep(page, 3500);
    await save('erp-overview', await page.screenshot({ type: 'png' }));
    for (const [name, label] of [['erp-orders', 'ออเดอร์'], ['erp-stock', 'สต๊อก']]) {
      const item = page.getByText(label, { exact: true }).first();
      if (await item.count()) { await item.click(); await sleep(page, 1500); await save(name, await page.screenshot({ type: 'png' })); }
      else console.log('  (no nav item', label + ')');
    }
  },
  // AI ใส่ซอส classroom: hero behind the auto-opened trailer dialog, then the lesson area.
  async classroom(page, save) {
    await page.goto(`${ORIGIN}/classroom/`, { waitUntil: 'load' });
    await sleep(page, 4000);
    await save('classroom-trailer', await page.screenshot({ type: 'png' }));
    const skip = page.getByText('ข้ามไปเริ่มเรียน').first();
    if (await skip.count()) { await skip.click(); await sleep(page, 1500); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(page, 800);
    await save('classroom-hero', await page.screenshot({ type: 'png' }));
    await save('classroom-long', await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VIEW.width, height: 2400 }, fullPage: true }));
  },
  async core7(page, save) {
    await page.goto(`${ORIGIN}/core7/`, { waitUntil: 'load' });
    await sleep(page, 3000);
    await save('core7-hero', await page.screenshot({ type: 'png' }));
  },
  async tour(page, save) {
    await page.goto(`${ORIGIN}/tour/`, { waitUntil: 'load' });
    await sleep(page, 7000);
    await save('tour-hero', await page.screenshot({ type: 'png' }));
  },
};

const want = process.argv.slice(2);
const names = want.length ? want : Object.keys(shots);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const name of names) {
  if (!shots[name]) { console.log('unknown capture:', name); continue; }
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1.5, locale: 'th-TH', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const save = async (file, buf) => { await writeFile(path.join(outDir, file + '.png'), buf); console.log('  saved', file + '.png'); };
  console.log(name);
  try { await shots[name](page, save); } catch (e) { console.log('  failed:', e.message.split('\n')[0]); }
  await ctx.close();
}
await browser.close();
