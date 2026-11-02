import test from 'node:test';
import assert from 'node:assert/strict';
import {rankDirectory,createStore} from '../../api/_lib/candidate/store.js';
const rubric=[{id:'task',label:'Task',weight:60},{id:'result',label:'Results',weight:40}];
const record=(id,state,rating,job='job-a')=>({id,job_id:job,name:id,profile:{name:id,analysisState:state,assessments:[{id:'task',rating}]},rubric});
test('directory retains incomplete and pending applications and sorts reviewed scores first',()=>{
 const input=[record('pending','pending',4),record('low','ready',1),record('high','ready',4),record('unknown','ready',null)];
 const result=rankDirectory(input);
 assert.deepEqual(result.map(x=>x.id),['high','low','unknown','pending']);
 assert.equal(result[0].score.coverage,60);assert.equal(result[2].score.coverage,0);
 assert.equal(result.length,input.length);assert.ok(result.every(x=>!('profile' in x)&&!('rubric' in x)));
});
test('three-card pages reach every application once, including last partial page and separate jobs',()=>{
 const result=rankDirectory(Array.from({length:1005},(_,i)=>record(String(i).padStart(4,'0'),i%2?'ready':'pending',i%5,i%3?'job-a':'job-b')));
 for(const job of ['job-a','job-b']){const group=result.filter(x=>x.job_id===job),seen=[];for(let start=0;start<group.length;start+=3)seen.push(...group.slice(start,start+3).map(x=>x.id));assert.equal(new Set(seen).size,group.length);}
 assert.equal(result.length,1005);
});
test('tied document scores have stable ordering across refreshes',()=>{
 const rows=[record('z','ready',2),record('a','ready',2)];
 assert.deepEqual(rankDirectory(rows).map(x=>x.id),rankDirectory(rows.toReversed()).map(x=>x.id));
});
test('directory uses the same server filters and is independent of sidebar pagination',async()=>{
 const calls=[];const sql={query:async(q,args)=>{calls.push({q,args});if(q.includes('COUNT(*)'))return[];if(q.includes('OFFSET'))return[];return [record('beyond-sidebar-page','pending',null)];}};
 const data=await createStore(sql).list(2,'job-a','example','new');
 const query=calls.find(x=>x.q.includes('AS analysis_state,status,profile'));
 assert.deepEqual(query.args,['job-a','example','new']);assert.ok(!query.q.includes('LIMIT'));
 assert.equal(data.highlights.length,1);assert.equal(data.highlights[0].id,'beyond-sidebar-page');
 assert.equal(data.rows.length,0);
});
