/** Export first-paint/offer images from the approved scene itself.
 * Run after scene changes against a local static preview. See docs/homechew/README.md.
 * Requires FRONTDOOR_PLAYWRIGHT, FRONTDOOR_CHROME and HOMECHEW_SHARP paths.
 */
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
for (const key of ['FRONTDOOR_PLAYWRIGHT', 'FRONTDOOR_CHROME', 'HOMECHEW_SHARP']) {
  if (!process.env[key]) throw new Error(`Set ${key} before exporting Homechew posters`);
}
const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const sharp = require(process.env.HOMECHEW_SHARP);
const out = fileURLToPath(new URL('../../homechew/assets/img/product/', import.meta.url));
const base = process.env.HOMECHEW_BASE_URL || 'http://127.0.0.1:4180/homechew/';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({
  executablePath: process.env.FRONTDOOR_CHROME,
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist'],
});
try {
  for (const [name, width, height, renderWidth, renderHeight] of [
    ['wide', 1440, 900, 1920, 1200],
    ['tall', 390, 844, 780, 1688],
    ['tablet', 768, 1024, 1536, 2048],
  ]) {
    const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
    await page.goto(base);
    await page.waitForFunction(() => window.__homechew?.stage, null, {timeout: 30000});
    const capture = async (w, h) => {
      const url = await page.evaluate(({w, h}) => window.__homechew.stage.snapshot(-1, w, h), {w, h});
      return Buffer.from(url.split(',')[1], 'base64');
    };
    await sharp(await capture(renderWidth, renderHeight)).webp({quality: 86, effort: 6}).toFile(`${out}/trio-${name}.webp`);
    if (name === 'tall') {
      // These bounds retain complete caps, heels and the native stone slab. Inspect
      // all four exports after changing hero camera/framing before accepting them.
      await sharp(await capture(1170, 2532))
        .extract({left: 0, top: 1180, width: 1170, height: 1270})
        .webp({quality: 90, effort: 6}).toFile(`${out}/trio-set.webp`);
    }
    await page.close();
    console.log(`Exported ${name}`);
  }
} finally {
  await browser.close();
}
