import test from 'node:test';
import assert from 'node:assert/strict';
import {KEEPSAKE_KEY,readKeepsakes,rememberKeepsake} from './keepsakes.js';
import {seedKey,seedRecord} from './seed-path.js';
test('keepsake index retains latest per color without modifying previous journeys or legacy state',()=>{
 const data=new Map([['mc_titles','HERO']]);const store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const save=(n,color)=>{const cp={journeyId:`j-${n}`,checkpointRef:`cp-${n}`,savedAt:100+n};data.set(seedKey(cp.journeyId,cp.checkpointRef),JSON.stringify(seedRecord({color,phase:'reward'},cp.journeyId)));assert.equal(rememberKeepsake(store,{journey:{checkpoint:cp}}).ok,true);};
 save(1,'red');save(2,'green');save(3,'red');
 assert.deepEqual(readKeepsakes(store).map(x=>x.record.color),['red','green']);
 assert.equal(readKeepsakes(store)[0].journeyId,'j-3');assert.ok(data.has(seedKey('j-1','cp-1')));assert.equal(data.get('mc_titles'),'HERO');
 assert.equal(JSON.parse(data.get(KEEPSAKE_KEY)).length,2);
});
test('corrupt or unavailable keepsake storage cannot create routes or successful persistence',()=>{
 assert.deepEqual(readKeepsakes(null),[]);assert.deepEqual(readKeepsakes({getItem:()=>'{broken'}),[]);
 assert.deepEqual(readKeepsakes({getItem:()=>JSON.stringify([{journeyId:'../../x',checkpointRef:'cp-x',savedAt:1}])}),[]);
 assert.equal(rememberKeepsake(null,{}).ok,false);
});
