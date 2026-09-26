/** Pixel regression for WebKit's Thai Canvas center-alignment bug.
 * TOUR_BASE_URL points to a local static preview. Uses the same browser overrides as tour.e2e.mjs.
 */
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(process.env.TOUR_PLAYWRIGHT ? pathToFileURL(process.env.TOUR_PLAYWRIGHT + '/index.mjs').href : 'playwright');
const out = process.env.TOUR_PROOF_DIR || '/tmp/tour-label-proof'; await mkdir(out, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.TOUR_CHROME || undefined});
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.labelCanvases = new Map();
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
      // Reproduce the reported browser regression: centered Thai runs begin at the anchor.
      if (/[\u0e00-\u0e7f]/.test(text) && this.textAlign === 'center') x += this.measureText(text).width / 2;
      if (['ยินดีต้อนรับ', 'RESUME · ทีม', 'บ้านจริงของเรา · 3D', 'คอร์สเรียน', 'ครัวเอโกะ'].includes(text)) window.labelCanvases.set(text, this.canvas);
      return fill.call(this, text, x, y, ...args);
    };
  });
  await page.goto((process.env.TOUR_BASE_URL || 'http://127.0.0.1:8766') + '/tour/');
  await page.waitForFunction(() => window.__tour && !document.body.classList.contains('is-loading'));
  for (const quality of ['sd', 'hd']) {
    if (quality === 'hd') {
      await page.click('[data-quality="hd"]');
      await page.waitForFunction(() => window.__tour.quality() === 'hd' && !document.body.classList.contains('is-loading'));
    }
    const pixels = await page.evaluate(() => {
      const cases = [
        ['ยินดีต้อนรับ', [29,107,61], 0, 144],
        ['RESUME · ทีม', [16,32,26], 0, 84],
        ['บ้านจริงของเรา · 3D', [242,193,78], 0, 100],
        ['คอร์สเรียน', [20,40,29], 480, 650],
        ['ครัวเอโกะ', [184,87,60], 0, 360],
      ];
      return cases.map(([text, rgb, top, bottom]) => {
        const c = window.labelCanvases.get(text), w = c.width;
        const {data} = c.getContext('2d').getImageData(0, top, w, bottom - top);
        let left = w, right = -1;
        for (let i = 0; i < data.length; i += 4) if (rgb.every((v, k) => Math.abs(data[i + k] - v) < 4)) {
          const x = i / 4 % w; left = Math.min(left, x); right = Math.max(right, x);
        }
        return {text, left, right, w, data: c.toDataURL()};
      });
    });
    for (const [i, p] of pixels.entries()) {
      assert.ok(p.right > p.left && p.left > 8 && p.right < p.w - 8, 'clipped text: ' + p.text);
      assert.ok(Math.abs((p.left + p.right + 1) / 2 - p.w / 2) < 5, 'off-centre text: ' + JSON.stringify({...p, data: undefined}));
      await writeFile(`${out}/${quality}-label-${i}.png`, Buffer.from(p.data.split(',')[1], 'base64'));
    }
    for (const id of ['door', 'kitchen', 'classroom', 'office']) {
      await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }, id);
      await page.waitForTimeout(500);
      await page.screenshot({path: `${out}/${quality}-${id}.png`});
    }
    console.log(`PASS ${quality}: five affected labels remain centred and unclipped with the WebKit regression simulated`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
