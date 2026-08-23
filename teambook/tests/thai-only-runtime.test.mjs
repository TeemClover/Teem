import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');

test('TeamBook 1.4 bootstrap is Thai-only and contains no runtime language state', () => {
  const bootstrap = read('_shared/language.js');
  assert.match(bootstrap, /THAI ONLY/);
  assert.doesNotMatch(bootstrap, /teambook_language_mode|navigator\.languages?|searchParams\.get\(\s*['"]lang|translate(?:Text|Node|Document)|applyLanguage|setLanguage|languageDictionary|i18n/i);
});

test('profile has no language selector or language localStorage code', () => {
  const profile = read('profile/index.html');
  assert.doesNotMatch(profile, /xtyLanguageCard|xtyLangPlain|xtyLangXty|teambook_language_mode/);
});

test('party size canon is 1 to 5', () => {
  const patch = read('docs/PATCH-NOTES-1.4.md');
  assert.match(patch, /1–5 คน/);
  assert.match(patch, /solo book 1\/5/);
});
