import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [partyPage, history, css] = await Promise.all([
  readFile(new URL('../p/index.html', import.meta.url), 'utf8'),
  readFile(new URL('./reward-history-v13.js', import.meta.url), 'utf8'),
  readFile(new URL('./xty.css', import.meta.url), 'utf8'),
]);

test('opened rewards render as a compact thumbnail strip, not a full card', () => {
  assert.match(partyPage, /class="reward-log-thumb">\$\{cardMarkup\(rewardCard\)\}/);
  assert.match(partyPage, /class="reward-log-copy"/);
  assert.doesNotMatch(css, /reward-log-card \.animal-card\{width:88px\}/);
  assert.match(history, /grid-template-columns:56px minmax\(0,1fr\)/);
  assert.match(history, /\.reward-log-thumb \.[\s\S]*?card-art[\s\S]*?height:100%!important/);
});

test('private and public reward strips share rarity colours', () => {
  for (const rarity of ['rare', 'epic', 'legendary']) {
    assert.match(history, new RegExp(`data-rarity=\\"${rarity}\\"`));
  }
  assert.match(partyPage, /data-rarity="\$\{esc\(rewardCard\.rarity \|\| 'common'\)\}"/);
  assert.match(history, /tb-public-reward-memory" data-rarity="\$\{esc\(card\.rarity \|\| 'common'\)\}"/);
  assert.match(history, /border-inline-start:5px solid var\(--tb-reward-accent\)/);
});

test('opened reward removes the redundant new-card tag while pending keeps it', () => {
  assert.match(partyPage, /\(pendingFirstSeen \? `<span class="tag reward-tag">เจอการ์ดใหม่ 1 ใบ<\/span>` : ''\)/);
  assert.match(partyPage, /<b>เปิดการ์ด<\/b>/);
});

test('pending and opened strips stay the same compact scale on mobile', () => {
  assert.match(css, /reward-log-pending img\{width:56px/);
  assert.match(css, /reward-log-pending img\{width:52px\}/);
  assert.match(history, /reward-log-thumb,.tb-public-reward-card\{width:52px\}/);
});
