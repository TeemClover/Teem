import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('.');
const OUTPUT = join(ROOT, 'dist');
const PUBLIC_ENTRIES = Object.freeze([
  'index.html', '_shared', 'assets', 'cards', 'collection', 'ideas', 'join',
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

for (const forbidden of ['api', 'docs', 'scripts', 'tests', 'node_modules', 'package.json', '.env.example']) {
  if (existsSync(join(OUTPUT, forbidden))) throw new Error(`Private source leaked into dist: ${forbidden}`);
}

console.log(`Static TeamBook output ready: dist (${PUBLIC_ENTRIES.length} entries).`);
