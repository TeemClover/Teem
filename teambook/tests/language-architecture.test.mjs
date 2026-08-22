import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .trim();
}

test('retired language entrypoint is only a runtime compatibility shim', () => {
  const shim = withoutComments(read('_shared/language.js'));
  assert.match(shim, /^import ['"]\.\/runtime\.js\?v=[^'"]+['"];?$/);
  assert.doesNotMatch(shim, /localStorage|sessionStorage|MutationObserver|textContent|innerHTML|querySelector|navigator\.language|URLSearchParams/);
});

test('TeamBook runtime never chooses or rewrites a human language', () => {
  const runtime = read('_shared/runtime.js');
  assert.doesNotMatch(runtime, /navigator\.languages?|searchParams\.get\(\s*['"]lang|[?&#]lang=|MutationObserver/);
  assert.doesNotMatch(runtime, /translate(?:Text|Node|Document)|applyLanguage|setLanguage|languageDictionary|i18n/i);
  assert.match(runtime, /localStorage\.removeItem\(['"]teambook_language_mode['"]\)/);
});

test('language architecture requires dedicated documents per locale', () => {
  const contract = read('docs/LANGUAGE-ROUTES.md');
  assert.match(contract, /One HTML document contains one human language/);
  assert.match(contract, /\/en\/read\//);
  assert.match(contract, /\/ja\/read\//);
  assert.match(contract, /Do not create `\/read\/\?lang=en`/);
  assert.match(contract, /Dedicated documents make language a routing concern/);
});
