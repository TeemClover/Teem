import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// These are reviewed publication areas, not arbitrary files sharing an image
// suffix. Do not add upload storage, private documents, APIs, fixtures or source
// archives here. New publication roots require a review of their storage role.
export const PUBLIC_ASSET_ROOTS = Object.freeze([
  'assets', 'icons', 'img', 'forge/img', 'forge/original', 'guild/assets',
  'ako/assets', 'ako/kitchen/art', 'core7/assets', 'core7/js',
  'frontdoor/art', 'resume/assets', 'xircle/assets', 'xircle/doc/assets', 'xvisor/quest/assets',
  'xty/assets', 'xty/_shared', 'ai-source/assets', 'hf/assets',
  'first-class/assets', 'meet/img', 'course/fonts', 'learn/assets', 'kickstarter/assets',
  'classroom/img', 'classroom/awaken/notebook/img',
  'teambook/assets', 'teambook/_shared',
]);

// Reviewed client files outside dedicated asset directories. Complete lesson
// payloads (Dent course-content.js/opening-data.js/tools.js, vault-data.js) and
// internal .md/.zip files are deliberately absent. This list grants no page/API
// access and does not turn a new file in one of these directories public.
export const PUBLIC_ASSET_FILES = Object.freeze([
  'favicon.ico', 'mask-icon.svg',
  'classroom/sauce-cup/banner-classroom.jpg',
  'classroom/sauce-cup/header-prologue.jpeg', 'classroom/sauce-cup/header-prologue.webp',
  'course/thedent/followup-qr.svg',
  ...Array.from({length:20}, (_,i) => `course/thedent/opening/slide-${String(i+1).padStart(2,'0')}.jpg`),
  ...['course', 'opening', 'tools', 'evaluation'].map(name => `course/thedent/${name}.css`),
  'course/thedent/opening.js', 'course/thedent/evaluation.js',
  ...['latin','thai'].flatMap(alphabet => [400,600,700].map(weight => `course/thedent/fonts/ibm-plex-sans-thai-${alphabet}-${weight}.woff2`)),
  'course/portal.css', 'course/portal.js',
  'course/admin/reviews/reviews.css', 'course/admin/reviews/reviews.js',
  'course/review-consent/consent.css', 'course/review-consent/consent.js',
  'shelf/shelf.css', 'shelf/shelf.js', 'shelf/admin/admin.css', 'shelf/admin/admin.js',
  'ai-source/offer-engine.js', 'ai-source/sales-page.js',
  // Airova's partner page publishes these presentation assets and three free
  // prompt downloads. Keep exact entries so future source files stay excluded.
  'airova/airova.css', 'airova/airova.js',
  ...[
    'aistudio-white.svg', 'aistudio.svg', 'bytedance-seed.svg', 'gemini-omni.svg',
    'creative-portal.webp', 'course-seedance.webp', 'pir-academy.png',
    'hero-car.webp', 'hero-character.webp', 'hero-fashion.webp',
    'tpl-adproduct-02.webp', 'tpl-ugc-01.webp',
  ].map(name => `airova/assets/${name}`),
  ...['product', 'character', 'cinematic'].map(name => `airova/templates/${name}.txt`),
  'ako/ako.css', 'ako/ako-convert.css', 'ako/story.css',
  'collection/collection.css', 'collection/collection.js',
  'compendium/compendium.css', 'compendium/compendium.js',
  'first-class/first-class.css', 'first-class/first-class.js', 'first-class/meta-pixel.js',
  'forge/reading-rail.css', 'meet/meet.css', 'meet/meet.js',
  'resume/resume.css', 'resume/resume-restored-work.css', 'resume/resume-upgrade.css',
  'resume/resume.js', 'resume/resume-base.js',
  'xvisor/xvisor-intro-hero.webp', 'xvisor/xircle-entry.css',
  'xircle/entry.css', 'xircle/experience-v3.css', 'xircle/reference.css', 'xircle/xvisor-path.css',
  ...['keepsakes','exhibit','rewards','styles','path'].map(name => `frontdoor/${name}.css`),
  'kickstarter/kickstarter-static-story.css', 'kickstarter/kickstarter-story-images.css',
  // Existing videos referenced by public marketing pages. Keep these exact:
  // a video in classroom/private storage must not inherit this publication.
  'media/home-opening-bg.mp4',
  'ako/assets/ako-real-eating-onion-hero.m4v',
  'ako/assets/ako-xvisor-ep04-otaku-weight-loss-web.m4v',
  'ako/assets/ako-xvisor-ep06-no-starving-web.m4v',
  'ako/assets/ako-xvisor-ep07-snacking-hunger-web.m4v',
  'ako/assets/ako-food-choice.mp4', 'ako/assets/ako-soft-change.mp4',
  'ako/assets/ako-morning-stretch.mp4',
  'hf/assets/example-ako.mp4', 'hf/assets/example-teem.mp4',
  'airova/assets/showcase-car.mp4', 'airova/assets/showcase-character.mp4',
  'airova/assets/showcase-fashion.mp4', 'airova/assets/showcase-ugc.mp4',
]);

const allowedType = /\.(?:avif|gif|ico|jpe?g|png|svg|webp|css|js|woff2?|ttf|otf)$/i;
const internalPart = /^(?:api|backend|functions|node_modules|tests|docs|_source|private|uploads|backups|_internal|internal)$/i;

export async function buildPublicAssetInventory(root) {
  const found = new Set();
  async function visit(relative) {
    for (const item of await readdir(path.join(root, relative), {withFileTypes:true})) {
      if (item.name.startsWith('.') || internalPart.test(item.name)) continue;
      const file = `${relative}/${item.name}`;
      if (item.isDirectory()) await visit(file);
      else if (item.isFile() && allowedType.test(item.name)) found.add(`/${file}`);
      // Symlinks are never publication inventory entries.
    }
  }
  for (const directory of PUBLIC_ASSET_ROOTS) await visit(directory);
  for (const file of PUBLIC_ASSET_FILES) {
    const entries = await readdir(path.join(root, path.dirname(file)), {withFileTypes:true});
    if (!entries.some(entry => entry.name === path.basename(file) && entry.isFile())) throw new Error(`Public asset missing or not a regular file: ${file}`);
    found.add(`/${file}`);
  }
  return [...found].sort();
}

export function renderPublicAssetInventory(files) {
  return '// Generated by node tools/build-public-assets.mjs; review the publication roots before updating.\n'
    + '// Exact paths only: a matching extension never grants access to another storage area.\n'
    + `export const PUBLIC_ASSET_INVENTORY = Object.freeze(${JSON.stringify(files,null,2)});\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const output = path.join(root, 'routing/public-asset-inventory.js');
  const rendered = renderPublicAssetInventory(await buildPublicAssetInventory(root));
  if (process.argv.includes('--check')) {
    if (await readFile(output,'utf8') !== rendered) throw new Error('Public asset inventory is stale; review new assets then run node tools/build-public-assets.mjs');
  } else await writeFile(output, rendered);
}
