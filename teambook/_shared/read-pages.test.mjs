import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const CHAPTERS = ['why', 'how', 'what', 'next'];
const hub = readFileSync('read/index.html', 'utf8');
const chapters = CHAPTERS.map(slug => [slug, readFileSync(`read/${slug}/index.html`, 'utf8')]);
const contextScript = readFileSync('_shared/entry-story.js', 'utf8');
const css = readFileSync('_shared/entry-story.css', 'utf8');

test('the reading path stays reachable from the shelf', () => {
  assert.match(readFileSync('index.html', 'utf8'), /href="\/read\/"/);
});

test('the full story carries the required emotional arc', () => {
  for (const id of ['why-book', 'different-lives', 'seen', 'one-minute', 'social-detox', 'living-book', 'ai-witness', 'ending', 'cards', 'pass-it-on']) {
    assert.match(hub, new RegExp(`id="${id}"`), `missing scene ${id}`);
  }
  assert.match(hub, /ฉันเห็นนะ/);
  assert.match(hub, /สมุดไม่ได้มีชีวิตเพราะ AI/);
  assert.match(hub, /มีใครสักคน ที่คุณอยากมี 7 วันแบบนี้ด้วยไหม/);
});

test('the hub lists every chapter and every chapter returns to the story', () => {
  for (const slug of CHAPTERS) assert.match(hub, new RegExp(`href="/read/${slug}/"`));
  for (const [slug, page] of chapters) assert.match(page, /href="\/read\/"/, `${slug} has no way back`);
});

test('chapter order has no dead end', () => {
  chapters.forEach(([slug, page], index) => {
    const previous = CHAPTERS[index - 1];
    const next = CHAPTERS[index + 1];
    if (previous) assert.match(page, new RegExp(`href="/read/${previous}/"`), `${slug} cannot go back`);
    if (next) assert.match(page, new RegExp(`href="/read/${next}/"`), `${slug} cannot go forward`);
  });
  assert.match(chapters.at(-1)[1], /href="\/\?open=1"/);
});

test('entry CTA understands invite and local profile context', () => {
  for (const [slug, page] of [['hub', hub], ...chapters]) {
    assert.match(page, /id="enterApp"/, `${slug} has no entry CTA`);
    assert.match(page, /data-entry-cta/, `${slug} CTA is not context-aware`);
    assert.match(page, /data-keep-invite/, `${slug} cannot retain an invite`);
  }
  assert.match(contextScript, /teambook_profile_v1/);
  assert.match(contextScript, /const inviteCode = \/\^\\d\{5\}\$\/\.test/);
  assert.match(contextScript, /url\.searchParams\.set\('c', inviteCode\)/);
  assert.match(contextScript, /`\/\?c=\$\{encodeURIComponent\(inviteCode\)\}`/);
});

test('seen is a quiet one-tap interaction without celebration mechanics', () => {
  assert.match(hub, /id="seenDemoButton"/);
  assert.match(contextScript, /aria-pressed/);
  assert.match(contextScript, /เห็นแล้ว · 1/);
  assert.doesNotMatch(`${hub}\n${contextScript}`, /confetti|firework/i);
});

test('new story assets exist and below-fold images are lazy', () => {
  for (const [slug, page] of [['hub', hub], ...chapters]) {
    const refs = [...page.matchAll(/(?:href|src)="(\/[^"?]+)(?:\?[^"#]*)?(?:#[^"]*)?"/g)].map(match => match[1]);
    for (const ref of refs) {
      if (ref.endsWith('/')) continue;
      assert.ok(existsSync(`.${ref}`), `${slug} points at a missing file: ${ref}`);
    }
  }
  const storyImages = [...hub.matchAll(/<img[^>]+src="(\/assets\/entry\/[^"]+\.webp)"[^>]*>/g)];
  assert.ok(storyImages.length >= 8);
  storyImages.slice(1).forEach(match => assert.match(match[0], /loading="lazy"/));
});

test('the entry story uses existing animals and no forbidden rarity theme', () => {
  const all = [hub, ...chapters.map(([, page]) => page)].join('\n');
  assert.match(all, /assets\/art\/avatars\/orange-cat\.webp/);
  assert.match(all, /assets\/art\/avatars\/owl\.webp/);
  assert.match(all, /assets\/art\/avatars\/turtle\.webp/);
  assert.doesNotMatch(all, /assets\/cards\/legendary\//i);
  assert.match(all, /assets\/cards\/common\//);
});

test('visible reading copy contains no retired product language', () => {
  for (const [slug, page] of [['hub', hub], ...chapters]) {
    const visible = page.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ');
    for (const word of [/ตี้/, /\bXTY\b/, /\bParty\b/i, /\bQuest\b/i, /myClover/i]) {
      assert.doesNotMatch(visible, word, `${slug} shows retired language`);
    }
  }
});

test('responsive story layout keeps a mobile-safe crop and reduced motion', () => {
  assert.match(css, /\.story-figure img\{[^}]*object-fit:cover/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
