#!/usr/bin/env node
/**
 * Vendors the public TeemClover/xvisor pack into /xvisor/pack/ so the website never
 * waits on GitHub while a visitor looks at the page. The pack repo stays the only source:
 * edit it there, then run this script.
 *
 *   node scripts/sync-xvisor-pack.mjs --from ../xvisor      copy from a local checkout
 *   node scripts/sync-xvisor-pack.mjs --from-github         copy from raw.githubusercontent.com (main)
 *   node scripts/sync-xvisor-pack.mjs --check [--from-github]  exit 1 if /xvisor/pack differs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'xvisor', 'pack');
const RAW = 'https://raw.githubusercontent.com/TeemClover/xvisor/main/';
const FILES = [
  ['manifest.json', 'manifest.json'],
  ['X-VISOR-START.md', 'X-VISOR-START.md'],
  ['downloads/xvisor-skill.zip', 'xvisor-skill.zip'],
];
const args = process.argv.slice(2);
const check = args.includes('--check');
const fromIdx = args.indexOf('--from');
const local = fromIdx >= 0 ? resolve(args[fromIdx + 1] ?? '') : null;
if (!local && !args.includes('--from-github')) {
  console.error('usage: sync-xvisor-pack.mjs (--from <xvisor checkout> | --from-github) [--check]');
  process.exit(2);
}

async function source(path) {
  if (local) return readFile(join(local, path));
  const res = await fetch(RAW + path, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

let stale = 0;
await mkdir(OUT, { recursive: true });
for (const [from, to] of FILES) {
  const data = await source(from);
  const target = join(OUT, to);
  if (check) {
    const current = await readFile(target).catch(() => null);
    if (!current || !current.equals(data)) { console.log(`DIFFERS ${to}`); stale++; }
    continue;
  }
  await writeFile(target, data);
  console.log(`wrote xvisor/pack/${to} (${data.length} bytes)`);
}
if (stale) process.exit(1);
if (check) console.log('xvisor/pack matches the source');
