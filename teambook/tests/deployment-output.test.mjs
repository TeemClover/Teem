import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Vercel publishes the explicit dist build, never the /public route as root', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const builder = readFileSync('scripts/build-static.mjs', 'utf8');
  assert.equal(config.outputDirectory, 'dist');
  assert.match(pkg.scripts.build, /node scripts\/build-static\.mjs/);
  assert.match(builder, /'index\.html'/);
  assert.match(builder, /'public'/);
  assert.match(builder, /Private source leaked into dist/);
});
