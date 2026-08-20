import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

/* /xty/read/ is the way back for someone who already has a book. The whole
   point of it is that nobody has to know a query parameter to read again,
   so these hold the parts of that promise which are easy to break silently. */

const CHAPTERS = ['why', 'how', 'what', 'next'];
const hub = readFileSync('xty/read/index.html', 'utf8');
const chapters = CHAPTERS.map(slug => [slug, readFileSync(`xty/read/${slug}/index.html`, 'utf8')]);
const css = readFileSync('xty/_shared/read.css', 'utf8');

test('the reading path is reachable from inside the app', () => {
  const home = readFileSync('xty/index.html', 'utf8');
  assert.match(home, /href="\/xty\/read\/"/,
    'someone with a book must be able to find the story without a query parameter');
});

test('the hub lists every chapter, and every chapter links back to it', () => {
  for (const slug of CHAPTERS) {
    assert.match(hub, new RegExp(`href="/xty/read/${slug}/"`), `the hub is missing ${slug}`);
  }
  for (const [slug, page] of chapters) {
    assert.match(page, /href="\/xty\/read\/"/, `${slug} has no way back to the contents`);
  }
});

test('every page offers the app, and the offer knows who is asking', () => {
  for (const [slug, page] of [['hub', hub], ...chapters]) {
    assert.match(page, /id="enterApp"/, `${slug} has no way into the app`);
    assert.match(page, /localStorage\.getItem\('mc_xty_profile'\)/,
      `${slug} must check for an existing book`);
    assert.match(page, /href = '\/xty\/'/,
      `${slug} must send an existing player to their shelf, not back to the pitch`);
    assert.match(page, /catch/, `${slug} must survive a locked-down localStorage`);
  }
});

test('the chapters read in order, first to last, with no dead end', () => {
  const order = chapters.map(([slug]) => slug);
  order.forEach((slug, i) => {
    const page = chapters[i][1];
    const next = order[i + 1];
    if (next) assert.match(page, new RegExp(`href="/xty/read/${next}/"`), `${slug} does not lead on`);
    const prev = order[i - 1];
    if (prev) assert.match(page, new RegExp(`href="/xty/read/${prev}/"`), `${slug} cannot go back`);
  });
  /* The last chapter ends in the product, not in another chapter. */
  const last = chapters.at(-1)[1];
  assert.match(last, /href="\/xty\/new\/\?mode=/, 'the last chapter must open a book');
});

test('a number with no name on it does not get a citation box', () => {
  for (const [slug, page] of chapters) {
    const boxes = [...page.matchAll(/<div class="cite[^"]*">([\s\S]*?)<\/div>/g)].map(m => m[1]);
    for (const box of boxes) {
      assert.match(box, /<cite>[\s\S]*?\S[\s\S]*?<\/cite>/,
        `a claim in ${slug} is dressed as evidence with no source`);
    }
  }
});

test('a company claim is never dressed as a research finding', () => {
  const withClaims = chapters.filter(([, page]) => /minChalle|A10 Lab/i.test(page));
  assert.ok(withClaims.length, 'the minChalle case should appear somewhere');
  for (const [slug, page] of withClaims) {
    const box = page.match(/<div class="cite claim">[\s\S]*?<\/div>\s*<\/div>|<div class="cite claim">[\s\S]*?<\/cite>/);
    assert.ok(box, `${slug} mentions the company case outside a claim box`);
    assert.match(box[0], /ไม่ใช่งานวิจัย/, `${slug} must say the number is not research`);
  }
  assert.match(css, /\.cite\.claim\{/, 'a company claim needs its own visibly different box');
});

test('the reading pages speak TeamBook and never the old codename', () => {
  for (const [slug, page] of [['hub', hub], ...chapters]) {
    const visible = page.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
                        .replace(/<[^>]+>/g, ' ');
    for (const word of [/ตี้/, /\bXTY\b/, /\bParty\b/i, /\bQuest\b/i]) {
      assert.doesNotMatch(visible, word, `${slug} must not show ${word}`);
    }
  }
});

test('every stylesheet and image a reading page asks for actually exists', () => {
  for (const [slug, page] of [['hub', hub], ...chapters]) {
    const refs = [...page.matchAll(/(?:href|src)="(\/xty\/[^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
    for (const ref of refs) {
      if (ref.endsWith('/')) continue;
      assert.ok(existsSync(`.${ref}`), `${slug} points at a missing file: ${ref}`);
    }
  }
});
