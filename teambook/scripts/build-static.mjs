import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve('.');
const OUTPUT = join(ROOT, 'dist');
const PUBLIC_ENTRIES = Object.freeze([
  'index.html', '_shared', 'assets', 'cards', 'collection', 'command', 'ideas', 'join',
  'new', 'p', 'pets', 'privacy', 'profile', 'public', 'read', 'reveal',
  'start', 'stat', 'u',
]);

rmSync(OUTPUT, { recursive: true, force: true });
mkdirSync(OUTPUT, { recursive: true });

for (const entry of PUBLIC_ENTRIES) {
  const source = join(ROOT, entry);
  if (!existsSync(source)) throw new Error(`Missing public build entry: ${entry}`);
  cpSync(source, join(OUTPUT, entry), { recursive: statSync(source).isDirectory() });
}

const TELEMETRY_TAG = '<script src="/assets/telemetry.js?v=20260822-1" defer></script>';
const COMMAND_BEHAVIOR_TAG = '<script src="/assets/command-behavior.js?v=20260822-1" defer></script>';

function htmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

for (const file of htmlFiles(OUTPUT)) {
  let html = readFileSync(file, 'utf8');
  const rel = relative(OUTPUT, file).replaceAll('\\', '/');
  const tags = [TELEMETRY_TAG];
  if (rel === 'command/index.html') tags.push(COMMAND_BEHAVIOR_TAG);
  for (const tag of tags) {
    if (html.includes(tag)) continue;
    html = html.includes('</head>') ? html.replace('</head>', `${tag}\n</head>`) : `${tag}\n${html}`;
  }
  writeFileSync(file, html, 'utf8');
}

for (const forbidden of ['api', 'docs', 'scripts', 'tests', 'node_modules', 'package.json', '.env.example']) {
  if (existsSync(join(OUTPUT, forbidden))) throw new Error(`Private source leaked into dist: ${forbidden}`);
}

console.log(`Static TeamBook output ready: dist (${PUBLIC_ENTRIES.length} entries, telemetry injected).`);
