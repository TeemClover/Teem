import test from 'node:test';
import assert from 'node:assert/strict';
import {addedDay,applicationGroup,matchesAddedDay,addedDays} from '../../candidate/added-date.js';

test('new applicants are grouped at Bangkok midnight regardless of the browser timezone',()=>{
 assert.equal(addedDay('2026-11-03T16:59:59.999Z'),'2026-11-03');
 assert.equal(addedDay('2026-11-03T17:00:00Z'),'2026-11-04');
 assert.equal(addedDay('2026-11-04T00:00:00+07:00'),'2026-11-04');
});
test('SEEK application date wins over both import and later evaluation dates',()=>{
 const card={applied_at:'2026-11-01T03:00:00Z',created_at:'2026-11-02T03:00:00Z',updated_at:'2026-11-05T05:00:00Z'};
 assert.equal(matchesAddedDay(card,'2026-11-01'),true);
 assert.equal(matchesAddedDay(card,'2026-11-02'),false);
 assert.equal(matchesAddedDay(card,'2026-11-05'),false);
 assert.equal(matchesAddedDay(card,''),true);
});
test('missing source dates stay visible as unknown and never inherit the migration date',()=>{
 const cards=[{applied_at:'2026-11-04T02:00:00Z'},{applied_at:'2026-11-03T18:00:00Z'},{created_at:'2026-11-02T00:00:00Z'},{applied_at:'invalid'}];
 assert.deepEqual(addedDays(cards,'2026-11-05'),[['2026-11-05',0],['2026-11-04',2],['unknown',2]]);
 assert.equal(matchesAddedDay(cards[2],'unknown'),true);
 assert.equal(matchesAddedDay(cards[3],'2026-11-04'),false);
});
test('all pre-November applications stay in October and daily groups start at Bangkok midnight on November 1',()=>{
 const cards=[{applied_at:'2026-10-20T08:00:00Z'},{applied_at:'2026-10-31T16:59:59.999Z'},{applied_at:'2026-10-31T17:00:00Z'},{applied_at:'2026-11-01T18:00:00Z'},{}];
 assert.deepEqual(addedDays(cards),[['2026-11-02',1],['2026-11-01',1],['2026-10',2],['unknown',1]]);
 assert.equal(applicationGroup(cards[1]),'2026-10');assert.equal(applicationGroup(cards[2]),'2026-11-01');
 assert.equal(addedDays(cards).reduce((n,[,count])=>n+count,0),cards.length);
});
