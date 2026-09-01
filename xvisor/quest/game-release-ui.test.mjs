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
  assert.match(html, /game\.css\?v=1\.0-final/);
  assert.match(html, /game\.js\?v=1\.0/);
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
});

test('Year 2 presentation keeps one exact monthly CTA and mobile revenue details', async () => {
  const [ui, css] = await Promise.all([source('game-v1-ui.js'), source('game.css')]);
  assert.match(ui, /ผ่านไปอีก 1 เดือน/);
  assert.match(ui, /Xcademy ×4/);
  assert.match(ui, /Open House ×1/);
  assert.match(css, /\.income-history-card/);
  assert.match(css, /\.action-dock\s*\{\s*position: static;/);
});
