import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { gzipSync, inflateRawSync } from 'node:zlib';
import path from 'node:path';
import {ZIP_NAME,validateLuckyArchive,readZip} from './lucky-source-archive.mjs';
import { fileURLToPath } from 'node:url';
import { photoSets } from '../app/data/photos.js';

/** Follow emitted dependencies, keeping optional dynamic imports out of the default graph. */
export function collectOutputGraph(build, seeds, { includeDynamic = false } = {}) {
  const outputs = build.outputs || {}, found = new Set(), queue = [...seeds];
  while (queue.length) {
    const file = queue.pop();
    if (found.has(file) || !outputs[file]) continue;
    found.add(file);
    for (const dependency of outputs[file].imports || []) {
      if (dependency.external || (!includeDynamic && dependency.kind === 'dynamic-import')) continue;
      const target = outputs[dependency.path] ? dependency.path : path.posix.normalize(path.posix.join(path.posix.dirname(file), dependency.path));
      if (outputs[target]) queue.push(target);
    }
  }
  return [...found].sort();
}

export async function auditPublic(root = path.resolve(import.meta.dirname, '..')) {
const errors = [], warnings = [];
const files = [];
async function collect(relative) {
  const target = path.join(root, relative);
  const info = await stat(target);
  if (info.isDirectory()) for (const entry of await readdir(target)) await collect(path.posix.join(relative, entry));
  else files.push(relative);
}
for (const target of ['index.html', 'assets', 'media', 'receive']) {
  try { await collect(target); } catch { errors.push(`Missing public build output: ${target}`); }
}
const forbidden = [
  [/\/Users\//i, 'absolute home path'], [/\/private\/(?:tmp|var)\//i, 'private local path'],
  [/sources-private(?:[\\/]|%2f)/i, 'private-source path'], [/file:\/\//i, 'local file URL'],
  [/(?:No\.26|เดอะ[ _]ปาล์ม[ _]พัฒนาการ|The[ _]Palm[ _]Pattanakarn)/i, 'original source name'],
  [/(?:DJI_\d+|IMG_\d{4,})/i, 'original camera filename'],
  [/sourceMappingURL=/i, 'sourcemap reference'],
];
function scanText(content, name) {
  for (const [pattern, label] of forbidden) if (pattern.test(content)) errors.push(`${name}: ${label}`);
}
function inspectWebp(buffer, name) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    errors.push(`${name}: invalid WebP container`); return;
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const kind = buffer.toString('ascii', offset, offset + 4), length = buffer.readUInt32LE(offset + 4);
    if (['EXIF', 'XMP '].includes(kind)) errors.push(`${name}: ${kind.trim()} metadata present`);
    if (offset + 8 + length > buffer.length) { errors.push(`${name}: truncated WebP chunk`); return; }
    offset += 8 + length + (length % 2);
  }
}
function inspectZip(buffer, name) {
  if(name===`receive/${ZIP_NAME}`){try{validateLuckyArchive(buffer);for(const[file,data]of readZip(buffer))scanText(data.toString('utf8'),`${name}/${file}`);}catch(error){errors.push(`${name}: ${error.message}`);}return;}


  let offset = 0, count = 0;
  const entries = new Set();
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8), size = buffer.readUInt32LE(offset + 18);
    const nameSize = buffer.readUInt16LE(offset + 26), extraSize = buffer.readUInt16LE(offset + 28);
    const filename = buffer.toString('utf8', offset + 30, offset + 30 + nameSize);
    entries.add(filename);
    const begin = offset + 30 + nameSize + extraSize;
    if (filename.includes('..') || filename.startsWith('/')) errors.push(`${name}: unsafe archive entry`);
    if (/\.(?:jpe?g|png|webp|pdf|map)$/i.test(filename)) errors.push(`${name}: unexpected original/media in educational archive (${filename})`);
    const compressed = buffer.subarray(begin, begin + size);
    let content;
    try { content = method === 8 ? inflateRawSync(compressed) : method === 0 ? compressed : null; }
    catch { errors.push(`${name}: corrupt ZIP entry ${filename}`); }
    if (!content) errors.push(`${name}: unsupported ZIP entry ${filename}`);
    else if (/\.zip$/i.test(filename)) inspectZip(content, `${name}/${filename}`);
    else if (/\.(?:html|js|mjs|css|svg|json|txt|md)$/i.test(filename)) scanText(content.toString('utf8'), `${name}/${filename}`);
    count++; offset = begin + size;
  }
  if (name.endsWith('home-explorer-3d-source.zip')) {
    for (const required of ['README.md', 'app/main.js', 'app/scene.js', 'app/data/photos.js', 'package-lock.json', 'tools/build.mjs', 'assets/fonts/OFL.txt']) {
      if (!entries.has(required)) errors.push(`${name}: missing ${required}`);
    }
  } else if (count !== 11) errors.push(`${name}: expected 11 educational files, found ${count}`);
}
try { await collect('downloads'); } catch {}
const allowedDownloads = new Set([`receive/${ZIP_NAME}`]);
for (const file of files) if ((file.startsWith('downloads/')||file.endsWith('.zip')) && !allowedDownloads.has(file)) errors.push(`${file}: student material must not be published`);
for (const file of ['LEARN.md', 'tools/make-learning-kit.mjs', 'tools/make-source-kit.mjs']) {
  try { await stat(path.join(root,file)); errors.push(`${file}: student material must remain outside the public repository`); } catch {}
}
const sizes = new Map();
for (const filename of files) {
  const buffer = await readFile(path.join(root, filename));
  sizes.set(filename, { bytes: buffer.length, gzipBytes: gzipSync(buffer, { level: 9 }).length });
  if (/\.(?:pdf|map|tiff?|heic|psd)$/i.test(filename)) errors.push(`${filename}: original document or sourcemap in public output`);
  if (filename.startsWith('media/') && !/\.webp$/i.test(filename)) errors.push(`${filename}: unexpected image format; public photos must be derivatives`);
  if (/\.(?:html|js|css|svg|json|txt|md)$/i.test(filename)) scanText(buffer.toString('utf8'), filename);
  if (/\.webp$/i.test(filename)) inspectWebp(buffer, filename);
  if (/\.zip$/i.test(filename)) inspectZip(buffer, filename);
}
let build = { outputs: {} };
try { build = JSON.parse(await readFile(path.join(root, 'reports/build.json'), 'utf8')); }
catch { errors.push('Build metadata missing; run npm run build first'); }
const outputs = new Set(Object.keys(build.outputs));
const stale = files.filter((file) => /^assets\/.*\.js$/.test(file) && !outputs.has(file));
if (stale.length) warnings.push(`Unreferenced JavaScript bundles remain in assets: ${stale.join(', ')}`);
for (const file of outputs) if (!sizes.has(file)) errors.push(`Missing bundled output: ${file}`);
const entryOutput = (source) => Object.entries(build.outputs).find(([, metadata]) => metadata.entryPoint === source)?.[0];
const mainOutput = entryOutput('app/main.js'), sceneOutput = entryOutput('app/scene.js');
if (!mainOutput || !sceneOutput) errors.push('Build metadata must include the application and lazy SD scene entry points');
const shellGraph = collectOutputGraph(build, [mainOutput]);
const sdGraph = collectOutputGraph(build, [mainOutput, sceneOutput]);
const hdEntries = Object.entries(build.outputs).filter(([, metadata]) => /^app\/scene\/hd-[\w-]+\.js$/.test(metadata.entryPoint || '')).map(([file]) => file);
const hdGraph = collectOutputGraph(build, hdEntries, { includeDynamic: true });
const hdAdditional = hdGraph.filter((file) => !sdGraph.includes(file));
for (const file of sdGraph) {
  if (Object.keys(build.outputs[file].inputs || {}).some((source) => /^app\/scene\/hd-[\w-]+\.js$/.test(source))) {
    errors.push(`${file}: optional HD implementation is bundled into the default SD loading graph`);
  }
}
const initial = ['index.html', 'assets/home.css', 'assets/studio.css', ...shellGraph, 'assets/myclover-logo.png',
  ...files.filter((file) => file.startsWith('assets/fonts/') && file.endsWith('.woff2')),
  ...['photos-exterior', 'photos-living', 'photos-stair-chandelier'].map((id) => photoSets.find((s) => s.id === id)?.photos[0]?.thumb).filter(Boolean)];
const firstModel = [...new Set([...initial, ...sdGraph])];
const upgradedModel = [...new Set([...firstModel, ...hdGraph])];
function sum(selected) {
  return selected.reduce((result, file) => {
    const size = sizes.get(file);
    if (size) { result.bytes += size.bytes; result.gzipBytes += size.gzipBytes; }
    return result;
  }, { bytes: 0, gzipBytes: 0 });
}
const node = process.version;
const dependencies = {};
for (const name of ['three', 'esbuild']) {
  try { dependencies[name] = JSON.parse(await readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version; }
  catch { dependencies[name] = 'unavailable'; }
}
const report = {
  checkedAt: new Date().toISOString(), valid: errors.length === 0, environment: { node, ...dependencies },
  scope: 'Built public HTML, assets, image derivatives and the allowlisted generic ZIP on the unlisted inbox handoff page only. No download from the main house page or private house files.',
  fileCount: files.length, errors, warnings,
  bundleGraphs: { shell: shellGraph, defaultSD: sdGraph, optInHDEntryPoints: hdEntries.sort(), optInHDAdditional: hdAdditional },
  sizes: { shellWithAllFontFacesAndPreviewImages: sum(initial), firstModelWithAllFontFacesAndPreviewImages: sum(firstModel),
    optInHDAdditional: sum(hdAdditional), hdModelWithAllFontFacesAndPreviewImages: sum(upgradedModel),
    imageDerivatives: sum(files.filter((f) => f.startsWith('media/'))), allPublicFiles: sum(files) },
  perFile: Object.fromEntries(sizes),
  measurement: 'On-disk byte counts and gzip level-9 compression estimates. Default SD follows static dependencies of the shell and lazy scene entry, excluding optional HD dynamic imports. HD additional counts only dependencies absent from SD. All font faces and preview thumbnails included conservatively. Not observed network transfer, startup latency, memory, or FPS.',
  publication: 'Local artifact audit only. Source rights, layout consent scope, photo privacy review, and deployment authorization are separate from these checks.',
};
await mkdir(path.join(root, 'reports'), { recursive: true });
await writeFile(path.join(root, 'reports/public-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ valid: report.valid, environment: report.environment, fileCount: files.length, errors, warnings, sizes: report.sizes, measurement: report.measurement }, null, 2));
if (!report.valid) process.exitCode = 1;
return report;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await auditPublic();
