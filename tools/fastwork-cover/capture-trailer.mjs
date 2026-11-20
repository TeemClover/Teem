// Render exact frames of the real "AI ใส่ซอส" classroom trailer (assets/classroom-trailer.js).
// MC_TRAILER.render(ctx, w, h, T) is a pure function of T, so these frames are the site's own
// picture at those times — nothing is redrawn by hand. Serves the repo root on a local port.
// Usage: node tools/fastwork-cover/capture-trailer.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outDir = path.join(here, 'assets/work/trailer');

// The title scene: 7.0 s title slam, coins in orbit from 7.5 s, HUD rail in at 8.0 s.
const T0 = 7.6, T1 = 9.3, FPS = 30, W = 960, H = 540;

const types = { '.js': 'text/javascript', '.woff2': 'font/woff2', '.html': 'text/html', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try { const buf = await readFile(file); res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(buf); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// Same @font-face set the classroom page gives the trailer (see tools/classroom-trailer/lab.html).
const face = (fam, w, slug) => ['thai', 'latin'].map((s) => `@font-face{font-family:"${fam}";font-weight:${w};src:url(/assets/fonts/reel/${slug}-${s}.woff2) format("woff2");unicode-range:${s === 'thai' ? 'U+0E01-0E5B,U+200C-200D,U+25CC' : 'U+0000-00FF,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212'}}`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>${face('Reel Kanit', 800, 'kanit-800')}${face('Reel Mitr', 600, 'mitr-600')}${face('Reel Chakra', 700, 'chakra-petch-700')}${face('Reel Charm', 700, 'charm-700')}${face('Reel Sriracha', 400, 'sriracha-400')}</style><canvas id="c" width="${W}" height="${H}"></canvas><script src="/assets/classroom-trailer.js"></script>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.route(`${base}/__trailer.html`, (r) => r.fulfill({ contentType: 'text/html', body: html }));
await page.goto(`${base}/__trailer.html`);
await page.waitForFunction(() => !!window.MC_TRAILER);
await page.evaluate(() => window.MC_TRAILER.fontsReady());
await mkdir(outDir, { recursive: true });
const n = Math.round((T1 - T0) * FPS) + 1;
for (let i = 0; i < n; i++) {
  const T = T0 + i / FPS;
  const url = await page.evaluate(([T, W, H]) => {
    const c = document.getElementById('c'); const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    window.MC_TRAILER.render(x, W, H, T, { reduced: false });
    return c.toDataURL('image/jpeg', 0.9);
  }, [T, W, H]);
  await writeFile(path.join(outDir, `f${String(i).padStart(3, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
}
console.log(`trailer: ${n} frames, T=${T0}–${T1}s @${FPS}fps, ${W}x${H} → assets/work/trailer/`);
await browser.close(); server.close();
