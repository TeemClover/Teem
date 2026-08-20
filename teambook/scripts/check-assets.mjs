import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', 'core7']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const failures = new Set();
const sources = walk('.').filter(path => /\.(?:html|js|css)$/.test(path));
const reference = /(?:src|href|url\()["']?(\/assets\/[^"')?#]+)/g;
const literalReference = /["'`](\/assets\/[^"'`?#]+\.(?:webp|png|jpe?g|gif|svg|mp3|wav|mp4|woff2?))(?:[?#][^"'`]*)?["'`]/g;

for (const sourcePath of sources) {
  const source = readFileSync(sourcePath, 'utf8');
  for (const match of source.matchAll(reference)) {
    verify(sourcePath, match[1]);
  }
  for (const match of source.matchAll(literalReference)) {
    if (match[1].includes('${')) continue;
    verify(sourcePath, match[1]);
  }
}

function verify(sourcePath, publicPath) {
  const path = `.${publicPath}`;
  if (!existsSync(path)) return failures.add(`${sourcePath} -> ${publicPath} (missing)`);
  const stat = statSync(path);
  if (!stat.isFile() || stat.size === 0) return failures.add(`${sourcePath} -> ${publicPath} (empty)`);
  const head = readFileSync(path).subarray(0, 200);
  if (head.toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1')) {
    return failures.add(`${sourcePath} -> ${publicPath} (Git LFS pointer)`);
  }
  const ext = publicPath.split('.').pop().toLowerCase();
  const valid = ext === 'webp' ? head.length >= 12 && head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP'
    : ext === 'png' ? head.toString('hex', 0, 8) === '89504e470d0a1a0a'
      : ['jpg', 'jpeg'].includes(ext) ? head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
        : true;
  if (!valid) failures.add(`${sourcePath} -> ${publicPath} (invalid .${ext} signature)`);
}

if (failures.size) {
  console.error([...failures].sort().join('\n'));
  console.error(`Invalid static references: ${failures.size}`);
  process.exitCode = 1;
} else {
  console.log(`Static references OK across ${sources.length} source files.`);
}
