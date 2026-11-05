import test from 'node:test';
import assert from 'node:assert/strict';
import {addedDay,applicationGroup,matchesAddedDay,addedDays,hasCompleteApplicationDirectory} from '../../candidate/added-date.js';

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
 assert.deepEqual(addedDays(cards,'2026-11-05',{complete:true,now:'2026-11-05T02:00:00Z'}),[['2026-11-05',0],['2026-11-04',2],['2026-11-03',0],['2026-11-02',0],['2026-11-01',0],['unknown',2]]);
 assert.equal(matchesAddedDay(cards[2],'unknown'),true);
 assert.equal(matchesAddedDay(cards[3],'2026-11-04'),false);
});
test('all pre-November applications stay in October and daily groups start at Bangkok midnight on November 1',()=>{
 const cards=[{applied_at:'2026-10-20T08:00:00Z'},{applied_at:'2026-10-31T16:59:59.999Z'},{applied_at:'2026-10-31T17:00:00Z'},{applied_at:'2026-11-01T18:00:00Z'},{}];
 assert.deepEqual(addedDays(cards),[['2026-11-02',1],['2026-11-01',1],['2026-10',2],['unknown',1]]);
 assert.equal(applicationGroup(cards[1]),'2026-10');assert.equal(applicationGroup(cards[2]),'2026-11-01');
 assert.equal(addedDays(cards).reduce((n,[,count])=>n+count,0),cards.length);
});

test('complete date lists include empty days through today while unknown records remain separate and unchanged',()=>{
 const cards=[{applied_at:'2026-11-04T02:00:00Z'},{applied_at:'2026-10-30T02:00:00Z'},{created_at:'2026-11-05T02:00:00Z'}],before=structuredClone(cards);
 const days=addedDays(cards,'',{complete:true,now:'2026-11-05T02:00:00Z'});
 assert.deepEqual(days,[['2026-11-05',0],['2026-11-04',1],['2026-11-03',0],['2026-11-02',0],['2026-11-01',0],['2026-10',1],['unknown',1]]);
 assert.equal(days.reduce((n,[,count])=>n+count,0),cards.length);assert.deepEqual(cards,before);
});
test('an incomplete or unavailable inventory never invents zero counts, even for a previously selected date',()=>{
 assert.deepEqual(addedDays([],'2026-11-05',{complete:false,now:'2026-11-05T02:00:00Z'}),[]);
 assert.deepEqual(addedDays([{applied_at:'invalid'}],'2026-11-05',{now:'2026-11-05T02:00:00Z'}),[['unknown',1]]);
});
test('today follows Bangkok midnight and no future zero is introduced by selection or calendar padding',()=>{
 const before=addedDays([],'2026-11-06',{complete:true,now:'2026-11-04T16:59:59Z'});
 assert.equal(before[0][0],'2026-11-04');assert(!before.some(([day])=>day>='2026-11-05'));
 const after=addedDays([],'2026-11-06',{complete:true,now:'2026-11-04T17:00:00Z'});
 assert.equal(after[0][0],'2026-11-05');assert(!after.some(([day])=>day==='2026-11-06'));
});
test('date padding crosses months and years and preserves a selected empty historical group',()=>{
 const days=addedDays([],'2026-10',{complete:true,now:'2026-12-31T17:00:00Z'});
 assert.equal(days[0][0],'2027-01-01');assert(days.some(([day])=>day==='2026-12-31'));assert(days.some(([day])=>day==='2026-11-01'));assert.deepEqual(days.at(-1),['2026-10',0]);
 assert.deepEqual(addedDays([],'',{complete:true,now:'2026-10-31T00:00:00Z'}),[]);
});
test('a directory is complete only when unique card IDs and per-job counts agree',()=>{
 const cards=[{id:'a',job_id:'job-a'},{id:'b',job_id:'job-b'}],counts=[{job_id:'job-a',count:1},{job_id:'job-b',count:'1'}];
 assert(hasCompleteApplicationDirectory(cards,counts));assert(hasCompleteApplicationDirectory([],[]));
 for(const pair of [[undefined,counts],[cards,undefined],[cards.slice(0,1),counts],[[...cards,cards[0]],counts],[cards,[{job_id:'job-a',count:2}]],[[],[{job_id:'job-a',count:null}]],[[],[{job_id:'job-a',count:''}]],[cards,[null]],[cards,[{job_id:'job-a',count:-1},{job_id:'job-b',count:3}]]])assert.equal(hasCompleteApplicationDirectory(...pair),false);
});
