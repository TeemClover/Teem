import test from 'node:test';
import assert from 'node:assert/strict';
import {addedDay,matchesAddedDay,addedDays} from '../../candidate/added-date.js';

test('new applicants are grouped at Bangkok midnight regardless of the browser timezone',()=>{
 assert.equal(addedDay('2026-11-03T16:59:59.999Z'),'2026-11-03');
 assert.equal(addedDay('2026-11-03T17:00:00Z'),'2026-11-04');
 assert.equal(addedDay('2026-11-04T00:00:00+07:00'),'2026-11-04');
});
test('later evaluation updates never move the applicant to a new import day',()=>{
 const card={created_at:'2026-11-02T03:00:00Z',updated_at:'2026-11-05T05:00:00Z'};
 assert.equal(matchesAddedDay(card,'2026-11-02'),true);
 assert.equal(matchesAddedDay(card,'2026-11-05'),false);
 assert.equal(matchesAddedDay(card,''),true);
});
test('missing dates stay unknown and do not become today; a selected empty day remains selectable',()=>{
 const cards=[{created_at:'2026-11-04T02:00:00Z'},{created_at:'2026-11-03T18:00:00Z'},{created_at:null},{created_at:'invalid'}];
 assert.deepEqual(addedDays(cards,'2026-11-05'),[['2026-11-05',0],['2026-11-04',2],['unknown',2]]);
 assert.equal(matchesAddedDay(cards[2],'unknown'),true);
 assert.equal(matchesAddedDay(cards[3],'2026-11-04'),false);
});
