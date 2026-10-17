// Copy shared classroom script sources from /assets into the matching
// <script data-self-contained="name.js"> blocks of every free lesson page.
// Only the named shared scripts are synced: some pages intentionally carry their own
// variant of other assets. Usage: node tools/classroom-inline-sync.mjs [--check] [name.js ...]
import {readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const requested = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const SHARED = requested.length ? requested : ['course-learning-journey.js', 'command-deck.js', 'sauce-reel.js'];
const pages = (await readdir(path.join(root, 'classroom'))).filter(name => name.endsWith('.html'));
let stale = 0, written = 0;
for (const page of pages) {
  const file = path.join(root, 'classroom', page);
  const html = await readFile(file, 'utf8');
  const names = [...html.matchAll(/<script[^>]*data-self-contained="([^"]+)"[^>]*>/g)].map(match => match[1]);
  let next = html;
  for (const name of new Set(names)) {
    if (!SHARED.includes(name)) continue;
    let source;
    try { source = await readFile(path.join(root, 'assets', name), 'utf8'); } catch { continue; }
    const pattern = new RegExp(`(<script[^>]*data-self-contained="${name.replaceAll('.', '\\.')}"[^>]*>)[\\s\\S]*?(<\\/script>)`, 'g');
    next = next.replace(pattern, (_, open, close) => `${open}\n${source.trim()}\n${close}`);
  }
  if (next !== html) {
    stale++;
    if (!check) { await writeFile(file, next); written++; }
    console.log(`${check ? 'stale' : 'synced'}: classroom/${page}`);
  }
}
if (check && stale) { console.error(`${stale} page(s) differ from their asset sources`); process.exit(1); }
console.log(check ? 'All inline classroom scripts match their sources' : `Updated ${written} page(s)`);
