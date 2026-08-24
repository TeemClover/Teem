import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TEAMBOOK_ACTIVITY_CATALOG } from './activities.js';

const ROOT = new URL('..', import.meta.url);

test('all 17 canonical activities have a square WebP detail image', () => {
  assert.equal(TEAMBOOK_ACTIVITY_CATALOG.length, 17);
  assert.equal(new Set(TEAMBOOK_ACTIVITY_CATALOG.map(activity => activity.id)).size, 17);
  for (const activity of TEAMBOOK_ACTIVITY_CATALOG) {
    assert.match(activity.art, /^\/assets\/art\/activities\/activity-[a-z-]+\.webp$/);
    const bytes = readFileSync(fileURLToPath(new URL(`.${activity.art}`, ROOT)));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', activity.id);
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', activity.id);
  }
});

test('notebook and public detail render the canonical activity art', () => {
  const source = readFileSync(fileURLToPath(new URL('./_shared/activity-ux.js', ROOT)), 'utf8');
  assert.match(source, /activityInfo\(party, member, activityById\)/);
  assert.match(source, /class="tb-activity-member-art" src="\$\{esc\(info\.art\)\}"/);
  assert.match(source, /class="tb-public-member-rule"><img src="\$\{esc\(info\.art\)\}"/);
});
