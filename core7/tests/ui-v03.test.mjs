import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('match result waits for the final round reveal and uses clear player copy', () => {
  const source = read('js/match-ui.js');
  assert.match(source, /scheduleFinish\(inReveal\)/);
  assert.match(source, /justRevealed \? 2800 : 1800/);
  assert.match(source, /YOU WIN/);
  assert.match(source, /YOU LOSE/);
});

test('wide match layout keeps the face-up pile and discarded card visible', () => {
  const ui = read('js/match-ui.js');
  const css = read('css/core7.css');
  assert.match(ui, /class="history-rail"/);
  assert.match(ui, /id="roundDiscard"/);
  assert.match(ui, /renderLatestDiscard\(lastRound\)/);
  assert.match(ui, /class: 'end-discard'/);
  assert.match(css, /@media \(min-width: 960px\) and \(min-height: 600px\)/);
  assert.match(css, /\.history-rail \{\s*display: block/);
});

test('play landing page contains a live public lobby with refresh and join', () => {
  const source = read('play/index.html');
  assert.match(source, /id="playRooms"/);
  assert.match(source, /id="refreshLobby"/);
  assert.match(source, /roomsApi\.list\(\)/);
  assert.match(source, /roomsApi\.join\(code/);
});

test('result surfaces use YOU WIN and YOU LOSE', () => {
  const result = read('result/index.html');
  const room = read('room/index.html');
  for (const source of [result, room]) {
    assert.match(source, /YOU WIN/);
    assert.match(source, /YOU LOSE/);
  }
});
