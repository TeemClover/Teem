import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);

async function source(name) {
  return readFile(new URL(name, root), 'utf8');
}

test('public quest shell is release 1.0 with cache-busted assets and no prerelease labels', async () => {
  const html = await source('index.html');
  assert.match(html, /data-game-version="1\.0"/);
  assert.match(html, /game\.css\?v=1\.0a-final/);
  assert.match(html, /game\.js\?v=1\.0a-final/);
  assert.match(html, />1\.0</);
  assert.doesNotMatch(html, /pre-release|9pre|compat/i);
});

test('release audio provides persisted mute, music and SFX controls', async () => {
  const [html, audio] = await Promise.all([source('index.html'), source('game-audio.js')]);
  assert.match(html, /data-audio-toggle="music"/);
  assert.match(html, /data-audio-toggle="sfx"/);
  assert.match(audio, /mc_xvisor_audio_1/);
  assert.match(audio, /musicEnabled/);
  assert.match(audio, /sfxEnabled/);
  assert.match(audio, /newGame/);
  assert.match(audio, /trip:/);
});

test('Year 2 presentation keeps one exact monthly CTA and mobile revenue details', async () => {
  const [ui, css, game] = await Promise.all([source('game-v1-ui.js'), source('game.css'), source('game.js')]);
  assert.match(ui, /▶ ผ่านไปอีก 1 เดือน/);
  assert.match(ui, /Xcademy ×4/);
  assert.match(ui, /Open House ×1/);
  assert.match(ui, /ลูกค้าสุทธิ/);
  assert.match(ui, /เล่น NEW GAME\+/);
  assert.match(ui, /ส่งชื่อขึ้น Scoreboard/);
  assert.match(css, /\.income-history-card/);
  assert.match(css, /\.action-dock\s*\{\s*position: static;/);
  assert.match(css, /\.v1-xircle-bonus/);
  assert.match(css, /\.v1-travel-reward/);
  assert.match(css, /\.world-event-card/);
  assert.doesNotMatch(game, /fillText|Endless Mode|Channel ④/);
});

test('pixel scenes use crisp DOM labels and grounded role markers', async () => {
  const [html, game] = await Promise.all([source('index.html'), source('game.js')]);
  assert.match(html, /id="worldEventCard"/);
  assert.match(game, /function drawTravelScene/);
  assert.match(game, /function drawFinaleScene/);
  assert.match(game, /function drawXircleMark/);
  assert.match(game, /rect\(x \+ 5, footY \+ 1/);
  assert.doesNotMatch(game, /footY\s*-\s*73/);
});
