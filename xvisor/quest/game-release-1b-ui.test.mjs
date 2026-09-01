import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const source = (name) => readFile(new URL(name, root), 'utf8');

test('public quest shell is visibly 1.0b and boots through the hotfix boundary', async () => {
  const html = await source('index.html');
  assert.match(html, /data-game-version="1\.0b"/);
  assert.match(html, />1\.0b</);
  assert.match(html, /game-data-v1\.js\?v=1\.0b-hotfix1/);
  assert.match(html, /game-copy-v9a\.js\?v=1\.0b-hotfix1/);
  assert.match(html, /game-1b\.css\?v=1\.0b-release2/);
  assert.match(html, /game-1b-final\.js\?v=1\.0b-hotfix1/);
  assert.match(html, /1\.0b-20260901-hotfix1/);
});

test('1.0b mobile finale is viewport-bounded and stacks dense result grids', async () => {
  const css = await source('game-1b.css');
  assert.match(css, /max-width:min\(920px,calc\(100vw - 16px\)\)/);
  assert.match(css, /max-height:calc\(100svh - 12px\)/);
  assert.match(css, /\.v1-finale-grid,.v1-org-grid\{grid-template-columns:1fr!important\}/);
});

test('XGEN copy exposes a goal at 1.5M but only says qualified for the single-month 3M rule', async () => {
  const copy = await source('game-copy-v9a.js');
  assert.match(copy, /XGEN_GOAL_VISIBLE_AT = 1_500_000/);
  assert.match(copy, /ตอนนี้ยังไม่ Qualified/);
  assert.match(copy, /Rolling 3 เดือน/);
  assert.match(copy, /ไม่นับเป็นเกณฑ์ XGEN/);
  assert.match(copy, /แตะ 3,000,000 XV ในเดือนเดียวแล้ว/);
});

test('The Xircle scene is forced to the camp renderer and never inherits Open House', async () => {
  const copy = await source('game-copy-v9a.js');
  assert.match(copy, /sceneReport\?\.kind === 'the-xircle'/);
  assert.match(copy, /scene: 'the-xircle'/);
  assert.match(copy, /ไม่ใช้ฉาก Open House/);
});

test('Month 12 requires a High Score name before Year 2 can open', async () => {
  const finalUi = await source('game-1b-final.js');
  assert.match(finalUi, /ยังไปต่อไม่ได้จนกว่าจะบันทึกชื่อ High Score/);
  assert.match(finalUi, /data-v1b-submit-score/);
  assert.match(finalUi, /data-v1b-enter-org/);
  assert.match(finalUi, /ดูสิ่งที่คุณสร้างโตเอง 1 เดือน/);
  assert.match(finalUi, /scoreName\(state\)/);
  assert.match(finalUi, /EVENTS\.ENTER_ORGANIZATION/);
});

test('scoreboard uses 1.0b and marks NEW GAME+ names with a leading star', async () => {
  const [api, finalUi] = await Promise.all([source('../../api/xvisor-scores.js'), source('game-1b-final.js')]);
  assert.match(api, /const SCORE_VERSION = '1\.0b'/);
  assert.match(api, /RELEASE_RESET_BEFORE/);
  assert.match(api, /`🌟 \$\{rawName\}`/);
  assert.match(finalUi, /scoreVersion: V1_SCORE_VERSION/);
  assert.match(finalUi, /data-v1b-new-game-plus/);
  assert.match(finalUi, /EVENTS\.NEW_GAME_PLUS/);
});

test('1.0b release data distinguishes XGEN and XLEAD paths plus fixed event months', async () => {
  const [data, finalUi] = await Promise.all([source('game-data-v1b-core.js'), source('game-1b-final.js')]);
  assert.match(data, /TRAVEL_MONTHS=Object\.freeze\(\[16,22\]\)/);
  assert.match(data, /ORGANIZATION_XIRCLE_MONTHS=Object\.freeze\(\[15,18,21,24\]\)/);
  assert.match(finalUi, /XGEN Path/);
  assert.match(finalUi, /XLEAD Path/);
});

test('landing page announces the public launch date and 1.0b version', async () => {
  const html = await source('../index.html');
  assert.match(html, /1\.0b/);
  assert.match(html, /1 SEP 2026/i);
  assert.match(html, /เริ่มเกม 1\.0b/);
});
