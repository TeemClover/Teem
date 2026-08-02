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

test('wide match layout can toggle Discard and recent discarded card stays visible', () => {
  const ui = read('js/match-ui.js');
  const css = read('css/core7.css');
  assert.match(ui, /class="history-rail"/);
  assert.match(ui, /id="roundDiscard"/);
  assert.match(ui, /renderLatestDiscard\(lastRound\)/);
  assert.match(ui, /class: 'end-discard'/);
  assert.match(css, /@media \(min-width: 960px\) and \(min-height: 600px\)/);
  assert.match(ui, /classList\.toggle\('discard-open'/);
  assert.match(ui, /🗑️ Discard/);
  assert.match(css, /\.match-shell\.discard-open \.history-rail \{\s*display: block/);
  assert.match(css, /\.match-shell\.discard-open \.match-board/);
});

test('play landing page contains a live public lobby with refresh and join', () => {
  const source = read('play/index.html');
  assert.match(source, /id="playRooms"/);
  assert.match(source, /id="refreshLobby"/);
  assert.match(source, /id="quickCode"/);
  assert.doesNotMatch(source, /href="\/core7\/join\/">เข้าห้อง/);
  assert.match(source, /roomsApi\.list\(\)/);
  assert.match(source, /roomsApi\.join\(code/);
});

test('match table teaches public rules and counts revealed colors for both sides', () => {
  const ui = read('js/match-ui.js');
  const css = read('css/core7.css');
  assert.match(ui, /🔴 &gt; 🟢 &gt; 🔵 &gt; 🔴/);
  assert.doesNotMatch(ui, /id="ruleArrow"/);
  assert.match(ui, /id="youPublicCounts"/);
  assert.match(ui, /id="oppPublicCounts"/);
  assert.match(ui, /publicColorCounts\('you'\)/);
  assert.match(ui, /renderPublicCounts\(\$\('#youPublicCounts', root\), 'OUT'/);
  assert.match(ui, /renderPublicCounts\(\$\('#oppPublicCounts', root\), 'OUT'/);
  assert.match(css, /\.public-counts \{ display: grid; grid-template-columns: 1fr 1fr/);
});

test('cards support an upward fling with sound and immediate lock', () => {
  const ui = read('js/match-ui.js');
  const audio = read('js/audio.js');
  assert.match(ui, /pointerup/);
  assert.match(ui, /event\.clientY - startY <= -58/);
  assert.match(ui, /type: 'lock_choice'/);
  assert.match(ui, /playSfx\('fling'\)/);
  assert.match(audio, /fling:/);
});

test('timeline aligns both sides and puts dashed discards underneath', () => {
  const source = read('result/index.html');
  assert.match(source, /class:'tl-cards'/);
  assert.match(source, /class:'tl-discards'/);
  assert.match(source, /tl-side you/);
  assert.match(source, /tl-side opp/);
  assert.match(source, /tl-chip\.discard\{border-style:dashed/);
});

test('CORE7 logo returns to game home except from the game home itself', () => {
  const ui = read('js/ui.js');
  assert.match(ui, /const logoHref = onCore7Home \? '\/' : '\/core7\/'/);
  assert.match(ui, /class="logo" href="\$\{logoHref\}"/);
});

test('English rules retain the static rules overview image', () => {
  const rules = read('rules/index.html');
  assert.match(rules, /id="en"[\s\S]*core7-rules-overview\.webp/);
  assert.match(rules, /FINAL GRAY|Final Gray/);
  assert.doesNotMatch(rules, /fewer GRAY cards/);
});

test('small hand cards use artwork with an English-only label and color fallback', () => {
  const ui = read('js/match-ui.js');
  const css = read('css/core7.css');
  assert.match(ui, /cardArtHref\(c\.cardId\)/);
  assert.match(ui, /class="hand-card-name"/);
  assert.doesNotMatch(ui, /colorIcon\(c\.color, 18\)/);
  assert.match(css, /background-color: var\(--hand-color/);
  assert.match(css, /var\(--hand-art\)/);
});

test('result surfaces use YOU WIN and YOU LOSE', () => {
  const result = read('result/index.html');
  const room = read('room/index.html');
  for (const source of [result, room]) {
    assert.match(source, /YOU WIN/);
    assert.match(source, /YOU LOSE/);
  }
});

test('blue text emoji stays a plain circle while card icon stays a water drop', () => {
  const cards = read('js/cards.js');
  const art = read('js/art.js');
  assert.match(cards, /color: 'BLUE', emoji: '🔵'/);
  assert.match(art, /water drop — BLUE/);
  assert.match(art, /BLUE: '<path d="M12 2\.5/);
});

test('match table has an expandable Rules control opposite Discard', () => {
  const ui = read('js/match-ui.js');
  const css = read('css/core7.css');
  assert.match(ui, /id="rulesBtn"/);
  assert.match(ui, /id="rulesPopover"/);
  assert.match(ui, /ผู้แพ้ทิ้งเพิ่ม 1 ใบ/);
  assert.match(css, /\.rules-toggle[\s\S]*left: 10px/);
  assert.match(css, /\.drawer-toggle[\s\S]*right: 10px/);
});

test('card back uses the real standard-size CORE7 asset', () => {
  const art = read('js/art.js');
  assert.match(art, /card-back-core7\.png/);
  assert.match(art, /height = Math\.round\(width \* 1\.4\)/);
  assert.match(art, /หลังการ์ด myClover CORE7/);
});

test('landing and tutorial use one optimized rules overview WebP', () => {
  const landing = read('index.html');
  const tutorial = read('tutorial/index.html');
  assert.match(landing, /core7-rules-overview\.webp/);
  assert.doesNotMatch(landing, /colorCycleSVG/);
  assert.doesNotMatch(landing, /cyc-node/);
  assert.match(tutorial, /id="ruleVisual"/);
  assert.match(tutorial, /core7-rules-overview\.webp/);
  assert.match(tutorial, /visual: true/);
});

test('landing rules card starts face-down and flips both ways accessibly', () => {
  const landing = read('index.html');
  const audio = read('js/audio.js');
  assert.match(landing, /id="rulesFlip"/);
  assert.match(landing, /aria-pressed="false"/);
  assert.match(landing, /card-back-core7\.webp/);
  assert.match(landing, /classList\.toggle\('is-flipped'\)/);
  assert.match(landing, /Tap to flip back/);
  assert.match(landing, /playCardFlip\(!open\)/);
  assert.match(landing, /rules-flip-face\.rules\{transform:rotateY\(180deg\)\}/);
  assert.doesNotMatch(landing, /rules-flip-face\.rules\{[^}]*padding/);
  assert.match(audio, /export function playCardFlip/);
  assert.match(audio, /createBuffer\(1,/);
  assert.match(audio, /paperFilter\.type = 'bandpass'/);
  assert.match(landing, /prefers-reduced-motion:reduce/);
});

test('rules image has a rounded physical-card frame', () => {
  const rules = read('rules/index.html');
  assert.match(rules, /\.rules-hero-img[\s\S]*border-radius:26px/);
  assert.match(rules, /\.rules-hero-img[\s\S]*border:6px solid/);
});

test('about page keeps Four Roots lore separate from gameplay', () => {
  const about = read('about/index.html');
  assert.match(about, /RED<\/span><h3>BODY/);
  assert.match(about, /BLUE<\/span><h3>MIND/);
  assert.match(about, /GREEN<\/span><h3>SOUL/);
  assert.match(about, /GRAY<\/span><h3>CRAFT/);
  assert.match(about, /ไม่ใช่กติกาที่ต้องจำ/);
});

test('result cards support hover, focus and pinned click previews', () => {
  const result = read('result/index.html');
  assert.match(result, /function cardPeek\(/);
  assert.match(result, /mouseenter/);
  assert.match(result, /focus/);
  assert.match(result, /previewPinned/);
  assert.match(result, /cardSVG\(cardId/);
  assert.match(result, /class:`\$\{className\} card-peek`/);
});

test('collection card detail supports keyboard arrow navigation', () => {
  const card = read('cards/index.html');
  assert.match(card, /event\.key === 'ArrowLeft'/);
  assert.match(card, /event\.key === 'ArrowRight'/);
  assert.match(card, /class:'keyhint'/);
});
