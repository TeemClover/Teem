/** The loading intro: first paint needs only our own files, the module graph is preloaded, and its motion stays off the main thread. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = p => readFile(root + p, 'utf8');
// The house lives at /tour/ (the homepage "/" is entry/home.html and loads no 3D code).
const pages = ['tour/index.html'];

// every module tour.js reaches through static imports, as site paths
async function moduleGraph(entry) {
  const seen = new Set(), origin = 'https://tour.test';
  async function walk(href) {
    const url = new URL(href, origin), identity = url.pathname + url.search + url.hash;
    if (seen.has(identity)) return;
    seen.add(identity);
    // Query versions identify browser modules; filesystem reads use only their pathname.
    const src = await read(url.pathname.replace(/^\//, ''));
    for (const [, spec] of src.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s*['"](\.[^'"]+)['"]/gm)) await walk(new URL(spec, url).href);
  }
  const initial = new URL(entry, origin);
  await walk(initial.href);
  seen.delete(initial.pathname + initial.search + initial.hash);
  return [...seen].sort();
}

test('the homepage preloads the whole house module graph, so no import waits for another to arrive', async () => {
  for (const page of pages) {
    const html = await read(page);
    const entries = [...html.matchAll(/<script[^>]+src="(\/tour\/tour\.js(?:\?[^"]*)?)"/g)].map(m => m[1]);
    assert.equal(entries.length, 1, 'one house runtime entry');
    const graph = await moduleGraph(entries[0]);
    assert.ok(graph.includes('/tour/vendor/three.core.min.js') && graph.includes('/tour/miniature-house.js'), 'the walk reached nested imports: ' + graph);
    const preloaded = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m => m[1]).sort();
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
    const introAt = head.indexOf('src="/tour/intro.js" defer'), runtimeAt = head.search(/src="\/tour\/tour\.js(?:\?[^"]*)?"/);
    assert.ok(introAt > 0 && introAt < runtimeAt, page + ': intro.js is deferred ahead of the module');
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
