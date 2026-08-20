import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const missing = new Set();
const sources = walk('.').filter(path => /\.(?:html|js|css)$/.test(path));
const reference = /(?:src|href|url\()["']?(\/assets\/[^"')?#]+)/g;
const literalReference = /["'`](\/assets\/[^"'`?#]+\.(?:webp|png|jpe?g|gif|svg|mp3|wav|mp4|woff2?))(?:[?#][^"'`]*)?["'`]/g;

for (const sourcePath of sources) {
  const source = readFileSync(sourcePath, 'utf8');
  for (const match of source.matchAll(reference)) {
    if (!existsSync(`.${match[1]}`)) missing.add(`${sourcePath} -> ${match[1]}`);
  }
  for (const match of source.matchAll(literalReference)) {
    if (match[1].includes('${')) continue;
    if (!existsSync(`.${match[1]}`)) missing.add(`${sourcePath} -> ${match[1]}`);
  }
}

if (missing.size) {
  console.error([...missing].sort().join('\n'));
  console.error(`Missing static references: ${missing.size}`);
  process.exitCode = 1;
} else {
  console.log(`Static references OK across ${sources.length} source files.`);
}
