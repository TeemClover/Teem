/**
 * Rebuilds homechew/vendor/three.module.min.js — a tree-shaken, pinned subset of three.js.
 * The site has no build step, so the output is checked in and VENDOR.json records exactly
 * what produced it (the lockfile for this folder).
 *
 * Dev dependencies are supplied from outside the repo, like the other browser tools here:
 *   HOMECHEW_THREE_DIR=/path/to/node_modules/three \
 *   HOMECHEW_ESBUILD=/path/to/node_modules/esbuild/lib/main.js \
 *   node homechew/vendor/build-three.mjs
 */
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync, mkdirSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const threeDir = process.env.HOMECHEW_THREE_DIR;
const esbuildPath = process.env.HOMECHEW_ESBUILD;
if (!threeDir || !esbuildPath) throw new Error('Set HOMECHEW_THREE_DIR and HOMECHEW_ESBUILD');
const esbuild = await import(pathToFileURL(esbuildPath).href);
const threePkg = JSON.parse(readFileSync(join(threeDir, 'package.json'), 'utf8'));

const ADDONS = ['environments/RoomEnvironment.js'];

// Collect every named import from 'three' used by the scene code and the copied addons.
const names = new Set();
const scan = file => {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]three['"]/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name) names.add(name);
    }
  }
};
const walk = dir => readdirSync(dir).forEach(f => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) scan(p);
});
walk(join(here, '..', 'js'));
for (const addon of ADDONS) {
  const from = join(threeDir, 'examples', 'jsm', addon);
  const to = join(here, 'addons', addon);
  mkdirSync(dirname(to), {recursive: true});
  writeFileSync(to, readFileSync(from, 'utf8'));
  scan(to);
}

const entry = join(here, '.three-entry.js');
writeFileSync(entry, `export {${[...names].sort().join(', ')}} from '${join(threeDir, 'build', 'three.module.js')}';\n`);
const out = join(here, 'three.module.min.js');
await esbuild.build({
  entryPoints: [entry], bundle: true, format: 'esm', minify: true, target: 'es2020',
  outfile: out, legalComments: 'inline',
  banner: {js: `/* three.js r${threePkg.version} subset (MIT) — built by homechew/vendor/build-three.mjs */`},
});
const {unlinkSync} = await import('node:fs');
unlinkSync(entry);

const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const manifest = {
  three: threePkg.version,
  esbuild: (await import(pathToFileURL(join(dirname(esbuildPath), '..', 'package.json')).href, {with: {type: 'json'}})).default.version,
  exports: [...names].sort(),
  files: {
    'three.module.min.js': {bytes: statSync(out).size, sha256: sha(out)},
    ...Object.fromEntries(ADDONS.map(a => [`addons/${a}`, {bytes: statSync(join(here, 'addons', a)).size, sha256: sha(join(here, 'addons', a))}])),
  },
};
writeFileSync(join(here, 'VENDOR.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`three r${manifest.three}: ${manifest.exports.length} exports, ${manifest.files['three.module.min.js'].bytes} bytes`);
