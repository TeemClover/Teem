import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const source = (name) => readFile(new URL(name, root), 'utf8');

test('public quest shell is visibly 1.0b and loads corrective layers', async () => {
  const html = await source('index.html');
  assert.match(html, /data-game-version="1\.0b"/);
  assert.match(html, />1\.0b</);
  assert.match(html, /game-data-v1\.js\?v=1\.0b2/);
  assert.match(html, /game-1b\.css\?v=1\.0b2/);
  assert.match(html, /game-1b-ui\.js\?v=1\.0b2/);
  assert.match(html, /game-1b-final\.js\?v=1\.0b2/);
});

test('1.0b mobile finale is viewport-bounded and stacks dense result grids', async () => {
  const css = await source('game-1b.css');
  assert.match(css, /max-width:min\(920px,calc\(100vw - 16px\)\)/);
  assert.match(css, /max-height:calc\(100svh - 12px\)/);
  assert.match(css, /\.v1-finale-grid,.v1-org-grid\{grid-template-columns:1fr!important\}/);
});

test('scoreboard and finale use the 1.0b namespace and keep NEW GAME+ reachable', async () => {
  const [api, finalUi] = await Promise.all([source('../../api/xvisor-scores.js'), source('game-1b-final.js')]);
  assert.match(api, /const SCORE_VERSION = '1\.0b'/);
  assert.match(finalUi, /scoreVersion: V1_SCORE_VERSION/);
  assert.match(finalUi, /data-v1b-new-game-plus/);
  assert.match(finalUi, /EVENTS\.NEW_GAME_PLUS/);
  assert.match(finalUi, /Scoreboard 1\.0b/);
});

test('1.0b presentation distinguishes XGEN and XLEAD paths plus fixed event months', async () => {
  const [data, copy, world] = await Promise.all([source('game-data-v1b-core.js'), source('game-copy-v9.js'), source('game-1b-ui.js')]);
  assert.match(data, /TRAVEL_MONTHS=Object\.freeze\(\[16,22\]\)/);
  assert.match(data, /ORGANIZATION_XIRCLE_MONTHS=Object\.freeze\(\[15,18,21,24\]\)/);
  assert.match(copy, /XLEAD ORGANIZATION/);
  assert.match(copy, /XGEN ORGANIZATION/);
  assert.match(world, /year2Path==='xgen'/);
});
