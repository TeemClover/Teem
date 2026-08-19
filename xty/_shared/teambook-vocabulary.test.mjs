import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

/* The TeamBook vocabulary used to live only in language.js, which rewrote the
   DOM at runtime. The words are baked into the source now, and this is what
   stops them creeping back: anything a person can read on the /xty surface has
   to already be TeamBook before a browser touches it. */

const HTML = globSync('xty/**/*.html').sort();
const MODULES = globSync('xty/_shared/*.js')
  .filter(file => !file.endsWith('language.js') && !file.endsWith('.test.mjs'))
  .sort();

/* language.js is exempt on purpose — it is the rule table, so it is the one
   file that has to keep the old words written down. */

const BANNED = [
  [/ตี้/, 'ตี้ — TeamBook says สมุด'],
  [/\bXTY\b/, 'XTY is an internal codename, never public copy'],
  [/\bCommit(?:ted|s)?\b/i, 'Commit — TeamBook says ลงชื่อ'],
  [/\bConfirm(?:ed|s)?\b/i, 'Confirm — TeamBook says เห็นแล้ว'],
  [/\bQuest\b/i, 'Quest — TeamBook says เล่ม'],
  [/\bParty\b/i, 'Party — TeamBook says สมุด'],
];

function markupText(html) {
  const stripped = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const found = [];
  stripped.replace(/>([^<]+)</g, (match, text) => {
    if (text.trim()) found.push(text.trim());
    return match;
  });
  stripped.replace(/\s(aria-label|placeholder|title|alt)="([^"]*)"/g, (match, name, value) => {
    if (value.trim()) found.push(value.trim());
    return match;
  });
  return found;
}

/* In a module, only a run of text containing Thai can be copy — everything
   else is an identifier, a storage key, an event name or a CSS selector, and
   those deliberately still speak the old schema. */
const THAI_RUN = /[฀-๿A-Za-z0-9 \t·…—–?!.,:/+×%✓✦⭐→←↻-]*[฀-๿][฀-๿A-Za-z0-9 \t·…—–?!.,:/+×%✓✦⭐→←↻-]*/g;

function moduleCopy(source) {
  return source.match(THAI_RUN) || [];
}

test('no page shows a reader a word from before the rebrand', () => {
  const offences = [];
  for (const file of HTML) {
    for (const line of markupText(readFileSync(file, 'utf8'))) {
      for (const [pattern, why] of BANNED) {
        if (pattern.test(line)) offences.push(`${file}: ${why}\n    ${line.slice(0, 110)}`);
      }
    }
  }
  assert.deepEqual(offences, [], `\n${offences.join('\n')}\n`);
});

test('no shared module builds a string with a word from before the rebrand', () => {
  const offences = [];
  for (const file of MODULES) {
    for (const run of moduleCopy(readFileSync(file, 'utf8'))) {
      for (const [pattern, why] of BANNED) {
        if (pattern.test(run)) offences.push(`${file}: ${why}\n    ${run.trim().slice(0, 110)}`);
      }
    }
  }
  assert.deepEqual(offences, [], `\n${offences.join('\n')}\n`);
});

test('the runtime rule table cannot cut a longer English word in half', () => {
  const source = readFileSync('xty/_shared/language.js', 'utf8');
  const table = source.slice(source.indexOf('const RULES'), source.indexOf(']);'));
  /* A single bare word without a boundary turned Progression into
     ความคืบหน้าion on the debug panel. Multi-word phrases are safe because
     they only fire on the whole phrase. */
  const singleWord = /\[\/([A-Z]+)\/gi/g;
  const unbounded = [...table.matchAll(singleWord)].map(match => match[1]);
  assert.deepEqual(unbounded, [], `unbounded single-word rules: ${unbounded.join(', ')}`);
});
