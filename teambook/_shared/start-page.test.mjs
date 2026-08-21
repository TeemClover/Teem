import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const page = readFileSync('start/index.html', 'utf8');
const css = readFileSync('_shared/entry-story.css', 'utf8');

test('a returning visitor is sent to their shelf before the story paints', () => {
  const head = page.slice(0, page.indexOf('</head>'));
  assert.match(head, /teambook_profile_v1/);
  assert.match(head, /location\.replace\('\/'\)/);
  assert.ok(head.indexOf('teambook_profile_v1') < page.indexOf('<body'));
});

test('the story can still be opened deliberately and private mode is safe', () => {
  const head = page.slice(0, page.indexOf('</head>'));
  assert.match(head, /has\('read'\)/);
  assert.match(head, /try\s*\{[\s\S]*catch/);
});

test('the brand lock and emotional promise are present', () => {
  assert.match(page, /สมุดกลุ่ม<br>มีชีวิต/);
  assert.match(page, /มีฉัน มีเธอ มีเรื่องของเรา/);
  assert.match(page, /ไม่ต้องทักกันทุกวัน/);
  assert.match(page, /วันละประมาณ 1 นาที/);
});

test('generated story art is implemented, sized, and lazy below the hero', () => {
  const images = [...page.matchAll(/<img[^>]+src="(\/assets\/entry\/[^"]+\.webp)"[^>]*>/g)];
  assert.ok(images.length >= 7, 'the entrance should use the new story sequence');
  images.forEach(([, src], index) => {
    assert.ok(existsSync(`.${src}`), `missing ${src}`);
    assert.match(images[index][0], /width="1536"\s+height="1024"/);
    if (index > 0) assert.match(images[index][0], /loading="lazy"/);
  });
  assert.match(images[0][0], /fetchpriority="high"/);
  assert.match(css, /\.story-figure img\{[^}]*aspect-ratio:3\/2/);
});

test('AI remains a quiet witness and the real card is not the page theme', () => {
  assert.match(page, /AI ไม่ได้นำเรื่องนี้ มันมาเพื่อเห็นเรื่องนี้/);
  assert.match(page, /เงียบเมื่อควรเงียบ/);
  assert.match(page, /assets\/cards\/common\//);
  assert.doesNotMatch(page, /assets\/cards\/legendary\//i);
});

test('the entrance offers both ways in without requiring an account', () => {
  assert.match(page, /href="\/\?open=1"/);
  assert.match(page, /href="\/join\/"/);
  assert.match(page, /ไม่บังคับ Login เพื่อเริ่ม/);
});

test('visible entrance copy contains no retired product language', () => {
  const visible = page.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ');
  for (const word of [/ตี้/, /\bXTY\b/, /\bCommit\b/i, /\bQuest\b/i, /\bParty\b/i, /myClover/i]) {
    assert.doesNotMatch(visible, word);
  }
});

test('mobile and reduced-motion treatments exist', () => {
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
