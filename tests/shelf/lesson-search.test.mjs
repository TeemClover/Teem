import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Shelf cards link into lesson 5 with ?q=SOP / ?q=README. The lesson's command deck
// reads that query and suggests matching commands. Test the shipped (embedded) copy.
const html = await readFile(new URL('../../classroom/prompts.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../../assets/command-deck.js', import.meta.url), 'utf8');
const embedded = html.match(/<script[^>]*data-self-contained="command-deck\.js"[^>]*>([\s\S]*?)<\/script>/)?.[1];
assert.ok(embedded, 'Lesson 5 must embed the command deck');

const context = vm.createContext({ window: {}, URLSearchParams });
vm.runInContext(embedded, context, { filename: 'classroom/prompts.html:command-deck' });
const deck = context.window.MC_DECK;

test('the embedded deck matches its source asset', () => {
  assert.equal(embedded.trim(), source.trim());
});

for (const [query, id] of [['SOP', 'sop'], ['README', 'readme']]) {
  test(`an explicit ?q=${query} lesson URL suggests /${id} first`, () => {
    assert.equal(deck.queryFromSearch('?entry=shelf&q=' + query), query);
    assert.equal(deck.matchCommands(query)[0], id);
  });
}

test('an explicitly empty q is returned as empty, and no q leaves the stored search alone', () => {
  assert.equal(deck.queryFromSearch('?entry=shelf&q=&source=handoff'), '');
  assert.equal(deck.queryFromSearch('?entry=shelf'), null);
});

test('URL-encoded Thai and plus-separated words are decoded before matching', () => {
  const query = deck.queryFromSearch('?q=%E0%B8%84%E0%B8%B9%E0%B9%88%E0%B8%A1%E0%B8%B7%E0%B8%AD+README');
  assert.equal(query, 'คู่มือ README');
  assert.ok(deck.matchCommands(query).includes('readme'));
});

test('malformed URL encoding does not throw', () => {
  assert.doesNotThrow(() => deck.queryFromSearch('?q=%E0%A4%A'));
});

test('plain Thai intents find the right command', () => {
  assert.equal(deck.matchCommands('อยากให้รูปข้าวมันไก่น่ากินขึ้น')[0], 'foodangle');
  assert.equal(deck.matchCommands('ตอบลูกค้า')[0], 'reply');
  assert.equal(deck.matchCommands('/out')[0], 'outfit');
  assert.equal(deck.matchCommands('').length, 0);
});

test('every command builds a complete prompt with no placeholders left from code', () => {
  assert.equal(deck.COMMANDS.length, 29);
  assert.equal(new Set(deck.COMMANDS.map(command => command.id)).size, 29);
  for (const command of deck.COMMANDS) {
    const prompt = deck.buildPrompt([{ id: command.id, options: {}, field: '' }], {});
    assert.ok(prompt.length > 120, command.id);
    assert.doesNotMatch(prompt, /undefined|\[object |⟦|⟧|⟪|⟫/, command.id);
  }
});

test('the video recipe keeps the original wording and swaps chosen styles and the story', () => {
  const prompt = deck.buildPrompt([{ id: 'brushstory', options: { art: 'mural', culture: 'japan' }, field: 'ร้านกาแฟวันแรก' }], { sauce: false, thai: false });
  assert.match(prompt, /^Create JavaScript animation with music \(and downloadable to mp4\) using Thai temple mural/);
  assert.match(prompt, /Japanese culture/);
  assert.match(prompt, /Story will be about, "ร้านกาแฟวันแรก"/);
  assert.doesNotMatch(prompt, /attached Source/);
  assert.doesNotMatch(prompt, /Reply to me in Thai/);
});

test('combos run in order and the short command lists only changed styles', () => {
  const selection = [{ id: 'foodangle', options: { angle: 'top' }, field: 'ข้าวมันไก่' }, { id: 'caption', options: {}, field: '' }];
  assert.match(deck.buildPrompt(selection, {}), /^Do these in order[\s\S]*1\) Use the attached photo of ข้าวมันไก่[\s\S]*2\) Write 3 caption options/);
  assert.equal(deck.shortCommand(selection), '/foodangle ท็อปวิว — ข้าวมันไก่\n/caption');
});

test('the install pack lists only the chosen commands', () => {
  const pack = deck.buildPack(['foodangle', 'caption', 'not-a-command']);
  assert.match(pack, /\/foodangle — /);
  assert.match(pack, /\/caption — /);
  assert.doesNotMatch(pack, /\/outfit — /);
  assert.match(deck.buildPack([]), /\/quiz — /);
});

test('the Agent builder combines persona, chosen skills and only the chosen rules', () => {
  const text = deck.buildAgent({ persona: 'creator', name: 'ผู้กำกับตี๋ม', tone: 'playful', skills: ['reel', 'brushstory'], rules: { facts: true, options: true } });
  assert.match(text, /^# ผู้กำกับตี๋ม — ผู้กำกับคอนเทนต์/);
  assert.match(text, /playful with light humour/);
  assert.match(text, /\/reel — /);
  assert.match(text, /\/brushstory — /);
  assert.doesNotMatch(text, /\/caption — /);
  assert.match(text, /Never guess prices/);
  assert.match(text, /give 2 options/);
  assert.doesNotMatch(text, /Hand payments/);
  assert.match(text, /\/help/);
});

test('an Agent without choices falls back to the persona defaults', () => {
  const text = deck.buildAgent({ persona: 'unknown' });
  assert.match(text, /^# น้องซอส — แอดมินร้าน/);
  for (const id of deck.PERSONAS.shop.skills) assert.match(text, new RegExp('/' + id + ' — '));
  for (const persona of Object.values(deck.PERSONAS)) for (const id of persona.skills) assert.ok(deck.COMMANDS.some(c => c.id === id), id);
});

test('every code-made clip maps to a real command and art style', async () => {
  const reelHtml = html.match(/<script[^>]*data-self-contained="sauce-reel\.js"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.equal(reelHtml?.trim(), (await readFile(new URL('../../assets/sauce-reel.js', import.meta.url), 'utf8')).trim());
  const reelContext = vm.createContext({ window: {} });
  vm.runInContext(reelHtml, reelContext);
  const brush = deck.COMMANDS.find(c => c.id === 'brushstory').opts.find(o => o.k === 'art').choices.map(c => c[0]);
  assert.equal(reelContext.window.MC_REEL.CLIPS.length, 8);
  for (const clip of reelContext.window.MC_REEL.CLIPS) {
    assert.ok(deck.COMMANDS.some(c => c.id === clip.command), clip.id);
    if (clip.art) assert.ok(brush.includes(clip.art), clip.id);
  }
});
