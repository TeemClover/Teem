/** The loading intro: first paint needs only our own files, the module graph is preloaded, and its motion stays off the main thread. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = p => readFile(root + p, 'utf8');
const pages = ['index.html', 'tour/index.html'];

// every module tour.js reaches through static imports, as site paths
async function moduleGraph(entry) {
  const seen = new Set();
  async function walk(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const src = await read(file);
    for (const [, spec] of src.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s*['"](\.[^'"]+)['"]/gm)) await walk(relative(root, join(root, dirname(file), spec)));
  }
  await walk(entry);
  seen.delete(entry);
  return [...seen].map(f => '/' + f).sort();
}

test('the homepage preloads the whole house module graph, so no import waits for another to arrive', async () => {
  const graph = await moduleGraph('tour/tour.js');
  assert.ok(graph.includes('/tour/vendor/three.core.min.js') && graph.includes('/tour/miniature-house.js'), 'the walk reached nested imports: ' + graph);
  for (const page of pages) {
    const preloaded = [...(await read(page)).matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m => m[1]).sort();
    assert.deepEqual(preloaded, graph, page);
  }
});

test('the loading intro paints from the page and tour.css alone, and runs before the 3D module', async () => {
  const css = await read('tour/tour.css'), js = await read('tour/intro.js');
  for (const page of pages) {
    const html = await read(page), head = html.slice(0, html.indexOf('</head>'));
    assert.match(html, /<div id="loader" class="loader" aria-hidden="true">\s*<div class="intro-core"><svg class="intro-clover"[\s\S]*?<span id="loader-text">[^<]+<\/span>/, page);
    // only this site's own stylesheets may hold up the first paint
    for (const [tag] of head.replace(/<noscript>[\s\S]*?<\/noscript>/g, '').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)) {
      if (/href="https?:/.test(tag)) assert.match(tag, /media="print" onload="this\.media='all'" data-fonts/, `${page}: ${tag}`);
    }
    assert.ok(head.indexOf('src="/tour/intro.js" defer') > 0 && head.indexOf('src="/tour/intro.js" defer') < head.indexOf('src="/tour/tour.js"'), page + ': intro.js is deferred ahead of the module');
  }
  // without intro.js the loader still lifts by itself; with it, it is put away after the opening
  assert.match(css, /body:not\(\.is-loading\) \.loader:not\(\.intro-on\)\{opacity:0;visibility:hidden\}/);
  assert.match(css, /\.loader\.gone\{display:none\}/);
  assert.match(js, /window\.__intro = setStage/);
  assert.match(await read('tour/tour.js'), /intro\(1\);[\s\S]*intro\(2\);/);
});

test('what moves while the house is being built is transform and opacity only', async () => {
  const css = await read('tour/tour.css');
  const frames = [...css.matchAll(/@keyframes (intro-[\w-]+)\{((?:[^{}]*\{[^{}]*\})+)\}/g)];
  assert.ok(frames.length >= 5, 'found the intro keyframes');
  for (const [, name, body] of frames) for (const [, prop] of body.matchAll(/[{;]\s*([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(prop), `${name} animates ${prop}`);
});
