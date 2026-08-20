import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve('.');
const SKIP = new Set(['node_modules', 'core7', 'dist']);
const SOURCE_EXTENSIONS = /\.(?:html|js|mjs|css|json)$/;
const NON_RUNTIME_DIRS = new Set(['docs', 'scripts', 'tests']);
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*\(\s*)["']([^"']+)["']/g;
const FORBIDDEN = [
  [/https?:\/\/(?:www\.)?myclover\.com\/xty(?:\/|\b)/g, 'legacy myClover URL'],
  [/https?:\/\/(?:raw\.)?github(?:usercontent)?\.com\//g, 'GitHub runtime asset'],
  [/["'`](?:https?:\/\/[^"'`]+)?\/xty(?:\/|["'`])/g, 'legacy /xty route'],
  [/["'`](?:https?:\/\/[^"'`]+)?\/core7(?:\/|["'`])/g, 'CORE7 runtime route'],
  [/process\.env\.DATABASE_URL\b/g, 'shared database fallback'],
  [/process\.env\.FIRST_CLASS_FROM_EMAIL\b/g, 'legacy email fallback'],
  [/put\(\s*["'`]xty\//g, 'legacy Blob object prefix'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function localModuleExists(path) {
  return [path, `${path}.js`, `${path}.mjs`, join(path, 'index.js'), join(path, 'index.mjs')]
    .some(candidate => existsSync(candidate));
}

const problems = [];
const sources = walk(ROOT).filter(path => {
  if (!SOURCE_EXTENSIONS.test(path)) return false;
  const parts = relative(ROOT, path).split(sep);
  if (NON_RUNTIME_DIRS.has(parts[0])) return false;
  if (parts[0] === 'package-lock.json' || path.endsWith('.test.mjs')) return false;
  return true;
});
for (const path of sources) {
  const source = readFileSync(path, 'utf8');
  const label = relative(ROOT, path);
  for (const [pattern, reason] of FORBIDDEN) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) problems.push(`${label}: ${reason}`);
  }
  if (!/\.(?:js|mjs)$/.test(path)) continue;
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    const target = resolve(dirname(path), specifier.split(/[?#]/, 1)[0]);
    if (target !== ROOT && !target.startsWith(`${ROOT}${sep}`)) {
      problems.push(`${label}: import escapes TeamBook root (${specifier})`);
    } else if (!localModuleExists(target)) {
      problems.push(`${label}: missing local import (${specifier})`);
    }
  }
}

if (problems.length) {
  console.error([...new Set(problems)].sort().join('\n'));
  console.error(`Standalone boundary failures: ${new Set(problems).size}`);
  process.exitCode = 1;
} else {
  console.log(`Standalone boundary OK across ${sources.length} source files.`);
}
