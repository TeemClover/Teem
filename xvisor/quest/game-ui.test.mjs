import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const source = (name) => readFile(new URL(name, root), 'utf8');
const canonicalModules = [
  'game-audio.js',
  'game-commercial-config.js',
  'game-copy.js',
  'game-data.js',
  'game-exam.js',
  'game-people.js',
  'game-progression.js',
  'game-save.js',
  'game-ui.js',
];

test('public shell boots 1.0b from one canonical stylesheet and one canonical module', async () => {
  const html = await source('index.html');
  assert.match(html, /data-game-version="1\.0b"/);
  assert.match(html, /game\.css\?v=1\.0b-canonical3/);
  assert.match(html, /game-ui\.js\?v=1\.0b-canonical3/);
  assert.doesNotMatch(html, /type="importmap"/);
  assert.doesNotMatch(html, /game-(?:1b|v8|v9|v1|v1a|v1b-core)/);
  assert.match(html, /1\.0b-20260901-hotfix1/);
});

test('runtime module graph contains canonical imports only', async () => {
  const files = await readdir(root);
  const oldRuntimeFiles = files.filter((name) => /^(?:game-(?:1b|v8|v9|v1|v1a|v1b-core)|game-(?:data|copy|progression|commercial-config)-v)/.test(name));
  assert.deepEqual(oldRuntimeFiles, []);

  const allowed = new Set(canonicalModules.map((name) => `./${name}`));
  for (const name of canonicalModules) {
    const code = await source(name);
    const imports = [...code.matchAll(/\b(?:from\s+|import\s*)["']([^"']+)["']/g)].map((match) => match[1]);
    for (const specifier of imports) {
      assert.equal(allowed.has(specifier), true, `${name} imports non-canonical ${specifier}`);
      assert.doesNotMatch(specifier, /v8|v9|v1a|1\.0a/i);
    }
  }
});

test('player-facing X-VISOR surfaces use Organization Finale and never Legacy', async () => {
  const [html, copy, ui] = await Promise.all([source('index.html'), source('game-copy.js'), source('game-ui.js')]);
  const playerFacing = `${html}\n${copy}\n${ui}`;
  assert.match(ui, /MONTH 24 · ORGANIZATION FINALE/);
  assert.doesNotMatch(playerFacing, /ORGANIZATION LEGACY/i);
  assert.doesNotMatch(playerFacing, /["'`]([^"'`]*\bLegacy\b[^"'`]*)["'`]/);
});

test('mobile finale stays viewport-bounded after release CSS is merged', async () => {
  const css = await source('game.css');
  assert.match(css, /max-width:min\(920px,calc\(100vw - 16px\)\)/);
  assert.match(css, /max-height:calc\(100svh - 12px\)/);
  assert.match(css, /\.v1-finale-grid,.v1-org-grid\{grid-template-columns:1fr!important\}/);
});

test('canonical copy keeps the 1.0b XGEN goal and The Xircle scene', async () => {
  const copy = await source('game-copy.js');
  assert.match(copy, /XGEN_GOAL_VISIBLE_AT = 15e5/);
  assert.match(copy, /ตอนนี้ยังไม่ Qualified/);
  assert.doesNotMatch(copy, /Rolling 3 เดือน|ไม่นับเป็นเกณฑ์ XGEN/);
  assert.match(copy, /แตะ 3,000,000 XV ในเดือนเดียวแล้ว/);
  assert.match(copy, /scene: "the-xircle"/);
  assert.match(copy, /ไม่ใช้ฉาก Open House/);
});

test('campaign END_MONTH click is handled once by the canonical action bar', async () => {
  const ui = await source('game-ui.js');
  assert.match(ui, /gameEvent === EVENTS\.END_MONTH/);
  assert.match(ui, /event\.stopImmediatePropagation\(\)/);
});

test('gameplay state is saved and rendered before optional audio effects', async () => {
  const ui = await source('game-ui.js');
  const dispatchBody = ui.slice(ui.indexOf('function dispatch(event, payload = {})'), ui.indexOf('function clearAutomation()'));
  const stateCommit = dispatchBody.indexOf('state = next;');
  const saveCommit = dispatchBody.indexOf('save();', stateCommit);
  const renderCommit = dispatchBody.indexOf('render();', stateCommit);
  const soundEffect = dispatchBody.indexOf('playForEvent(event, payload);', stateCommit);
  assert.ok(stateCommit >= 0 && saveCommit > stateCommit);
  assert.ok(renderCommit > saveCommit);
  assert.ok(soundEffect > renderCommit);
  assert.match(dispatchBody, /try \{\s*audio\.unlock\(\);\s*\} catch/);
});

test('canonical UI retains the Month 12 score gate and Month 24 NEW GAME+ finale', async () => {
  const ui = await source('game-ui.js');
  assert.match(ui, /ยังไปต่อไม่ได้จนกว่าจะบันทึกชื่อ High Score/);
  assert.match(ui, /data-v1b-submit-score/);
  assert.match(ui, /data-v1b-enter-org/);
  assert.match(ui, /ดูสิ่งที่คุณสร้างโตเอง 1 เดือน/);
  assert.match(ui, /data-v1b-new-game-plus/);
  assert.match(ui, /MONTH 24 · TRUE ENDING · 1\.0b/);
});
