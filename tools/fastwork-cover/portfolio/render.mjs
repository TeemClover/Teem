// Render the Fastwork portfolio cards (1600×1200 JPG) from card.html + cards.json.
// Usage: node tools/fastwork-cover/portfolio/render.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const types = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => { const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(root)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }).end(await readFile(f)); } catch { res.writeHead(404).end(); } });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/portfolio`;
const cards = JSON.parse(await readFile(path.join(here, 'cards.json'), 'utf8'));
await mkdir(path.join(here, 'out'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
for (const [i, c] of cards.entries()) {
  await page.goto(`${base}/card.html?id=${c.id}`); await page.evaluate(() => window.__ready); await page.waitForTimeout(200);
  const file = path.join(here, 'out', `${String(i + 1).padStart(2, '0')}-${c.id}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 }); console.log('wrote', path.basename(file));
}
await browser.close(); server.close();
