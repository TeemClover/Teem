import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, '_shared', 'create-party-v2.js'), 'utf8');

test('legacy test cards are repaired on the server before V1.2 create ownership validation', () => {
  assert.match(source, /ownedCards,\s*syncCollectionDebugCode/);
  assert.match(source, /\^\(\?:debug:\|quest:code:\)/);
  const repair = source.indexOf('await syncLegacyTestCards(profile, finalLeadCardId, finalNpcCardId)');
  const create = source.indexOf("fetch('/api/teambook-v12?action=create'");
  assert.ok(repair >= 0, 'create flow must repair selected legacy test cards');
  assert.ok(create >= 0, 'V1.2 create endpoint must still be used');
  assert.ok(repair < create, 'repair must happen before the server ownership check');
  assert.match(source, /syncCollectionDebugCode\('getallitem'\)/);
});
