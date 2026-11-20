// Shared browser launcher for the Studio checks. Uses an existing puppeteer-core install and the local Chrome;
// nothing is added to the site's package.json.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const PUPPETEER = process.env.STUDIO_PUPPETEER || `${process.env.HOME}/Claude/cloverx-office/skills/kinhen-clip/engine/node_modules/puppeteer-core`;
const CHROME = process.env.STUDIO_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const BASE = process.env.STUDIO_BASE || 'http://127.0.0.1:4400';

export async function launch(extraArgs = []) {
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}`);
  const puppeteer = require(PUPPETEER);
  return puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', ...extraArgs]
  });
}

// iPhone 15 Pro-sized emulation (393×852 CSS px, DPR 3, touch, iOS Safari UA). This is Chrome emulation, not a real iPhone.
export const IPHONE = {
  viewport: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
};
export const DESKTOP = { viewport: { width: 1366, height: 900, deviceScaleFactor: 1 } };

export async function openPage(browser, device, path = '/xvisor/studio/') {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (device.userAgent) await page.setUserAgent(device.userAgent);
  await page.setViewport(device.viewport);
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  return { page, errors };
}
