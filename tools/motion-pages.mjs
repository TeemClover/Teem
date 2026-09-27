/**
 * Clover Motion registry: which pages load the shared motion layer, and how.
 *
 *   node tools/motion-pages.mjs          add or refresh the two tags in every page below
 *   node tools/motion-pages.mjs --check  fail if any page is missing or has a stale block
 *
 * The house (/) links to every page, so each one is an entrance of its own. Every page
 * listed here gets the same site-wide feel from /assets/motion/ (see clover-motion.js for
 * what each profile does). Generated pages are covered through their source:
 *   index.html + compass/index.html  ← tour/index.html + frontdoor/index.html (npm run sync:frontdoor-root)
 *   ako/kitchen/<recipe>/            ← ako/kitchen/index.html (npm run build:ako)
 *   forge/ep*                        ← tools/build.py (its head template carries the same block)
 */
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const MOTION_VERSION = '20260927';

const story = {profile: 'story'};
const read = {profile: 'story', chapters: 'h2'};
const immersive = {profile: 'immersive'};
const app = {profile: 'app'};

export const MOTION_PAGES = Object.freeze({
  // the house and the compass (sources of / and /compass/)
  'tour/index.html': {profile: 'hub'},
  'frontdoor/index.html': app,

  // living room
  'book/ai-sauce/index.html': app,
  'core7/index.html': story,
  'core7/about/index.html': story,
  'core7/rules/index.html': story,
  'core7/cards/index.html': story,
  'core7/collection/index.html': story,
  'core7/rank/index.html': story,
  'core7/history/index.html': story,
  'core7/profile/index.html': story,
  'core7/tutorial/index.html': app,
  'core7/play/index.html': app,
  'core7/bot/index.html': app,
  'core7/quick/index.html': app,
  'core7/room/index.html': app,
  'core7/hand/index.html': app,
  'core7/open-play/index.html': app,
  'core7/join/index.html': app,
  'core7/create/index.html': app,
  'core7/result/index.html': app,
  'core7/journey-result/index.html': app,
  'hall.html': story,
  'forge/index.html': story,
  'forge/intro/index.html': immersive,
  'forge/original/index.html': immersive,
  ...Object.fromEntries([
    'ep1-everyone-gets-to-play', 'ep2-the-first-item', 'ep3-the-item-that-came-back', 'ep4-what-traveled-without-us',
    'ep5-from-answers-to-a-system', 'ep6-the-starter-kit', 'ep7-a-voice-that-went-further', 'ep8-the-blacksmith-backstage',
    'ep9-tools-must-reach-people', 'ep10-this-time-i-left-the-screen-on', 'ep11-everyone-has-their-own-class', 'ep12-a-new-game-a-new-league',
  ].map(slug => [`forge/${slug}/index.html`, immersive])),
  'walkthrough/index.html': immersive,
  'home/index.html': story,

  // kitchen
  'ako/index.html': immersive,
  'ako/story/index.html': story,
  'ako/kitchen/index.html': story,
  'homechew/index.html': immersive,
  'homechew/privacy/index.html': read,
  'xircle/index.html': app,

  // classroom (upstairs)
  'courses/index.html': story,
  'ai-source/index.html': story,
  'classroom/index.html': story,
  'classroom/dungeon/index.html': immersive,
  'classroom/free-ai.html': immersive,
  'classroom/notebooklm.html': immersive,
  'classroom/prompts.html': immersive,
  'classroom/sauce-cup/index.html': story,

  // project room (upstairs)
  'xvisor/index.html': story,
  'resume/index.html': story,
  'resume/first-version/index.html': story,
  'showcase/house/index.html': app,

  // before you leave
  'meet/index.html': immersive,
  'privacy/index.html': read,
  'privacy/term/index.html': read,
});

const root = fileURLToPath(new URL('../', import.meta.url));
const BLOCK = /\n?<!-- clover-motion -->[\s\S]*?<!-- \/clover-motion -->\n?/;

export function motionBlock({profile, chapters, off, on} = {}) {
  const attrs = [`data-profile="${profile}"`];
  if (chapters) attrs.push(`data-chapters="${chapters}"`);
  if (off) attrs.push(`data-off="${off}"`);
  if (on) attrs.push(`data-on="${on}"`);
  return `<!-- clover-motion -->
<link rel="stylesheet" href="/assets/motion/clover-motion.css?v=${MOTION_VERSION}">
<script src="/assets/motion/clover-motion.js?v=${MOTION_VERSION}" defer ${attrs.join(' ')}></script>
<!-- /clover-motion -->`;
}

/** Put the block at the end of the real <head>, replacing an older one. */
export function withMotion(html, options) {
  const block = motionBlock(options);
  if (BLOCK.test(html)) return html.replace(BLOCK, '\n' + block + '\n');
  const end = html.indexOf('</head>');
  if (end < 0) throw Error('no </head>');
  const line = html.lastIndexOf('\n', end) + 1, own = /^[ \t]*$/.test(html.slice(line, end));
  return own ? html.slice(0, line) + block + '\n' + html.slice(line) : html.slice(0, end) + '\n' + block + '\n' + html.slice(end);
}

export async function run({check = false} = {}) {
  const stale = [];
  for (const [file, options] of Object.entries(MOTION_PAGES)) {
    const name = path.join(root, file), html = await readFile(name, 'utf8'), next = withMotion(html, options);
    if (next === html) continue;
    if (check) stale.push(file); else await writeFile(name, next);
  }
  if (stale.length) throw Error('Clover Motion block missing or stale (run node tools/motion-pages.mjs): ' + stale.join(', '));
  console.log(`${check ? 'Verified' : 'Updated'} Clover Motion on ${Object.keys(MOTION_PAGES).length} pages`);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await run({check: process.argv.includes('--check')});
