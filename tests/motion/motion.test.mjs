/** Clover Motion: every entrance of the house carries the shared motion layer, exactly once. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {MOTION_PAGES, MOTION_VERSION, motionBlock, withMotion, run} from '../../tools/motion-pages.mjs';
import {PUBLIC_ASSET_INVENTORY} from '../../routing/public-asset-inventory.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = file => readFile(root + file, 'utf8');
const fileFor = async href => {
  const clean = href.split(/[?#]/)[0].replace(/^\//, '');
  for (const candidate of [clean, clean.replace(/\/?$/, '/index.html')]) {
    try { if ((await stat(root + candidate)).isFile()) return candidate; } catch {}
  }
  return null;
};
// Linked from the house, but deliberately without the layer (reason in the value).
const EXEMPT = {
  'teambook/index.html': 'TeamBook is its own app at teambook.me; on this site the entrance redirects there',
};

test('every registered page carries one current block with its profile', async () => {
  await run({check: true});
  for (const [file, options] of Object.entries(MOTION_PAGES)) {
    const html = await read(file);
    assert.equal(html.match(/<!-- clover-motion -->/g)?.length, 1, file);
    assert.ok(html.includes(motionBlock(options)), file);
    assert.ok(html.indexOf('<!-- clover-motion -->') < html.indexOf('</head>'), `${file}: the block belongs in <head>`);
  }
});

test('every room of the house leads to a page with the layer', async () => {
  const house = await read('tour/index.html');
  const hrefs = [...new Set([...house.matchAll(/<a [^>]*href="(\/[^"]*)"/g)].map(m => m[1]))];
  assert.ok(hrefs.length > 20);
  const missing = [];
  for (const href of hrefs) {
    if (href === '/') continue;
    const file = await fileFor(href);
    assert.ok(file, `${href} does not resolve`);
    if (EXEMPT[file]) continue;
    if (!(await read(file)).includes('<!-- clover-motion -->')) missing.push(href);
  }
  assert.deepEqual(missing, []);
});

test('the TeamBook notebook opens the live app, not its unstyled root-relative copy', async () => {
  // teambook/index.html loads /_shared/*, /assets/brand/* and links /join/, /new/ from the site root,
  // which only exist on teambook.me. The house keeps its /teambook/ link; routing sends it there.
  const {redirects} = JSON.parse(await read('vercel.json'));
  for (const source of ['/teambook', '/teambook/']) {
    const rule = redirects.find(r => r.source === source && !r.has);
    assert.equal(rule?.destination, 'https://teambook.me/', source);
  }
  assert.match(await read('teambook/index.html'), /href="\/_shared\/xty\.css/);
});

test('generated entrances keep the block: / and /compass/ from their sources, recipes from their template', async () => {
  for (const file of ['index.html', 'compass/index.html', 'ako/kitchen/chicken-egg-bowl/index.html']) {
    assert.match(await read(file), new RegExp(`clover-motion\\.js\\?v=${MOTION_VERSION}`), file);
  }
  assert.match(await read('index.html'), /data-profile="hub"/);
  assert.match(await read('tools/build.py'), new RegExp(`MOTION_VERSION = '${MOTION_VERSION}'`), 'the Forge generator writes the same version');
});

test('injection is idempotent and refreshes an older block in place', () => {
  const page = '<!doctype html><html><head>\n<title>x</title>\n  </head><body></body></html>';
  const once = withMotion(page, {profile: 'story'});
  assert.equal(withMotion(once, {profile: 'story'}), once);
  const changed = withMotion(once, {profile: 'app'});
  assert.equal(changed.match(/clover-motion -->/g).length, 2);
  assert.match(changed, /data-profile="app"/);
  assert.doesNotMatch(changed, /data-profile="story"/);
});

test('the layer is self-contained, public and progressive', async () => {
  const js = await read('assets/motion/clover-motion.js'), css = await read('assets/motion/clover-motion.css');
  for (const file of ['/assets/motion/clover-motion.js', '/assets/motion/clover-motion.css']) assert.ok(PUBLIC_ASSET_INVENTORY.includes(file), file);
  assert.doesNotMatch(js, /https?:\/\//, 'no third-party origins');
  assert.match(js, /import\('\/tour\/vendor\/lenis\.mjs'\)/, 'smooth scrolling reuses the house copy of Lenis');
  assert.match(js, /prefers-reduced-motion: reduce/);
  // hidden-until-revealed only ever exists behind the JavaScript switch, and printing shows everything
  assert.match(css, /html\.cm-reveal-on \.cm-r:not\(\.cm-in\)/);
  assert.match(css, /@media print\{html\.cm-reveal-on \.cm-r\{opacity:1!important/);
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{\s*@view-transition\{navigation:auto\}/);
  await stat(root + 'tour/vendor/lenis.mjs');
});
