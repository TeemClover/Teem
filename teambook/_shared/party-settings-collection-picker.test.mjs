import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [bootstrap, picker, partyPage] = await Promise.all([
  readFile(new URL('./language.js', import.meta.url), 'utf8'),
  readFile(new URL('./collection-skin-picker.js', import.meta.url), 'utf8'),
  readFile(new URL('../p/index.html', import.meta.url), 'utf8'),
]);

test('/p loads the Collection picker for book settings', () => {
  const partyBoot = bootstrap.match(/if \(\/\^\\\/p[\s\S]*?return;\n  }/)?.[0] || '';
  assert.match(partyBoot, /collection-skin-picker\.js/);
});

test('book cover and companion both expose a Collection button', () => {
  assert.match(picker, /id: 'choosePartyCoverCard'/);
  assert.match(picker, /title: 'เลือกการ์ดเป็นปกสมุด'/);
  assert.match(picker, /role: 'lead'/);
  assert.match(picker, /id: 'choosePartyPetCard'/);
  assert.match(picker, /title: 'เลือกการ์ดเป็นเพื่อนร่วมทาง'/);
  assert.match(picker, /role: 'npc'/);
});

test('dropdown fallbacks and explicit save buttons remain available', () => {
  for (const id of ['leadSelect', 'leadBtn', 'npcSelect', 'npcBtn']) {
    assert.match(partyPage, new RegExp(`id="${id}"`));
  }
  assert.match(picker, /กด “เปลี่ยน” เพื่อบันทึก/);
});

test('settings picker does not duplicate the character picker or observe the whole page', () => {
  assert.doesNotMatch(picker, /chooseMyCharacterCard|recentMyCharacterCards/);
  assert.doesNotMatch(picker, /observe\(document\.body/);
  assert.match(picker, /conflictKey: 'npcCardId'/);
  assert.match(picker, /conflictKey: 'leadCardId'/);
});

test('picker adapts to canonical V1.2 dropdown values and reusable cards', () => {
  assert.match(picker, /`v12:card:\$\{cardId\}`/);
  assert.match(picker, /V1\.2 cards are reusable across books/);
  assert.match(picker, /ownedCardsForBookRole\(role\)/);
  assert.doesNotMatch(picker, /availableOwnedCards\(\{ role, exceptPartyCode: code \}\)/);
});
