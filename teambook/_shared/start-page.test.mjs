import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('start/index.html', 'utf8');
const css = readFileSync('_shared/start.css', 'utf8');

/* /start/ is the front door: the one URL that has to work for a stranger
   who has never heard of TeamBook and for someone who opened a book
   yesterday. These hold the parts of that which are easy to break silently. */

test('a returning visitor is sent to their shelf before the pitch paints', () => {
  const head = page.slice(0, page.indexOf('</head>'));
  assert.match(head, /teambook_profile_v1/, 'the skip must read the profile key');
  assert.match(head, /location\.replace\('\/'\)/, 'and go straight to the shelf');
  /* Anything that runs after the body has started is too late — the visitor
     would see a flash of a page that is not for them. */
  assert.ok(head.indexOf('teambook_profile_v1') < page.indexOf('<body'),
    'the skip has to run in the head, before the first paint');
});

test('the skip can be overridden so the pitch stays readable', () => {
  assert.match(page, /has\('read'\)/, "?read must let an existing player read the entrance");
});

test('a device in private mode still sees the page', () => {
  const head = page.slice(0, page.indexOf('</head>'));
  assert.match(head, /try\s*\{[\s\S]*catch/, 'a throwing localStorage must not blank the door');
});

test('every unmade picture holds its exact final box', () => {
  const frames = [...page.matchAll(/<figure class="tb-art ([a-z ]+)"[\s\S]*?<\/figure>/g)];
  assert.ok(frames.length >= 2, 'the entrance should carry art frames');
  for (const [block] of frames) {
    const img = block.match(/<img[^>]+>/);
    assert.ok(img, 'a frame needs its image');
    assert.match(img[0], /width="\d+"\s+height="\d+"/, 'with both dimensions, so nothing reflows');
  }
  /* The frame keeps the shape from CSS, not from the file that has not
     arrived, which is what stops the page jumping the day it does. */
  assert.match(css, /\.tb-art\.page\{aspect-ratio:var\(--xty-card-aspect/);
  assert.match(css, /\.tb-art\.scene\{aspect-ratio:3\/2\}/);
});

test('a brief names its size and its destination path', () => {
  const briefs = [...page.matchAll(/<div class="tb-brief">([\s\S]*?)<\/div>/g)].map(m => m[1]);
  assert.ok(briefs.length >= 2, 'each unmade picture needs a brief');
  for (const brief of briefs) {
    assert.match(brief, /\d{3,4} × \d{3,4} px/, 'the exact pixel size');
    assert.match(brief, /(?:teambook\/)?assets\/start\/[a-z-]+\.webp<\/code>/, 'and where the file goes');
  }
});

test('the entrance speaks TeamBook and never the old codename', () => {
  const visible = page.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const word of [/ตี้/, /\bXTY\b/, /\bCommit\b/i, /\bQuest\b/i, /\bParty\b/i]) {
    assert.doesNotMatch(visible, word, `the front door must not show ${word}`);
  }
});

test('both ways in are offered, and neither needs an account', () => {
  assert.match(page, /href="\/new\/"/, 'open a book');
  assert.match(page, /href="\/join\/"/, 'or join one with a code');
  assert.match(page, /ไม่ต้องสมัคร/, 'and the page says an account is not required');
});
