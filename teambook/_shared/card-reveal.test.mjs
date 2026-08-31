import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./card-reveal.css', import.meta.url), 'utf8');

function rule(selector) {
  const start = css.indexOf(`${selector}{`);
  assert.notEqual(start, -1, `missing ${selector}`);
  const end = css.indexOf('}', start);
  assert.notEqual(end, -1, `unterminated ${selector}`);
  return css.slice(start, end + 1);
}

test('card reveal never paints the collectible front before open', () => {
  const closedBack = rule('.reveal-card .card-back');
  const closedFront = rule('.reveal-front');
  const openBack = rule('.reveal-card.is-open .card-back');
  const openFront = rule('.reveal-card.is-open .reveal-front');

  assert.match(closedBack, /opacity:\s*1/);
  assert.match(closedBack, /visibility:\s*visible/);
  assert.match(closedFront, /opacity:\s*0/);
  assert.match(closedFront, /visibility:\s*hidden/);

  assert.match(openBack, /opacity:\s*0/);
  assert.match(openBack, /visibility:\s*hidden/);
  assert.match(openFront, /opacity:\s*1/);
  assert.match(openFront, /visibility:\s*visible/);
});
