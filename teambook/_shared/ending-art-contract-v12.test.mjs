import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFinalCastToEnding } from './ending-art-contract-v12.js';

test('live art contract persists final cast and prepends it to every candidate prompt', () => {
  const party = {
    ownerId: 'u1',
    members: [
      { userId:'u1', alias:'Som', role:'lead', avatar:'unicorn', avatarColor:'green' },
      { userId:'u2', alias:'Teem', role:'member', avatar:'unicorn', avatarColor:'red' },
    ],
    petId: 'xvisor_white_cat_silver',
    endAt: '2026-08-22T04:00:00.000Z',
  };
  const source = { version:3, facts:{ messages:6 } };
  const result = applyFinalCastToEnding(party, source, [
    { id:'A', prompt:'Direction A.' },
    { id:'B', prompt:'Direction B.' },
    { id:'C', prompt:'Direction C. No characters.' },
  ]);

  assert.equal(result.evidence.version, 4);
  assert.equal(result.evidence.finalCast.members.length, 2);
  assert.deepEqual(result.evidence.finalCast.members.map(item => item.markerColor), ['green', 'red']);
  assert.equal(result.evidence.finalCast.companion?.species, 'xvisor_white_cat_silver');
  for (const brief of result.briefs) {
    assert.match(brief.prompt, /FINAL CAST — CANONICAL/);
    assert.match(brief.prompt, /NO HUMAN PEOPLE/);
    assert.match(brief.prompt, /BOOK OWNER \/ LEAD/);
    assert.match(brief.prompt, /marker color is green/i);
    assert.match(brief.prompt, /marker color is red/i);
    assert.match(brief.prompt, /PATTERN CARETAKER/);
  }
  assert.match(result.briefs[2].prompt, /Direction C\. No characters\./);
});

test('art contract does not mutate base evidence or briefs', () => {
  const evidence = Object.freeze({ version:3, book:{ code:'12345' } });
  const briefs = [Object.freeze({ id:'A', prompt:'base prompt' })];
  const result = applyFinalCastToEnding({ members:[] }, evidence, briefs);
  assert.equal(evidence.version, 3);
  assert.equal(briefs[0].prompt, 'base prompt');
  assert.equal(result.evidence.book.code, '12345');
  assert.match(result.briefs[0].prompt, /base prompt$/);
});
