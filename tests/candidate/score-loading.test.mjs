import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {score} from '../../api/_lib/candidate/model.js';
import {cardScore} from '../../api/_lib/candidate/store.js';
const rubric=[{id:'task',label:'Task',weight:100}];
test('unassessed and explicitly zero evidence have different scores',()=>{
 const missing=score({assessments:[{id:'task',rating:null}]},rubric);
 const zero=score({assessments:[{id:'task',rating:0}]},rubric);
 assert.equal(missing.points,null);assert.equal(missing.coverage,0);
 assert.equal(zero.points,0);assert.equal(zero.coverage,100);assert.equal(zero.complete,true);
});
test('directory cards omit detailed assessment prose from their response',()=>{
 const profile={assessments:[{id:'task',rating:3,reason:'long private resume discussion'.repeat(100),evidenceIds:['e1']}]};
 const summary=cardScore(profile,rubric);
 assert.equal(summary.points,75);assert.equal(summary.sections,undefined);
 assert.ok(JSON.stringify(summary).length<200);
});
test('slow startup keeps feedback and retry visible until application reports ready',async()=>{
 const source=await readFile(new URL('../../candidate/boot.js',import.meta.url),'utf8');
 const panel={hidden:false},message={},retry={hidden:true,addEventListener(){}};const events={};let timeout;
 const context={document:{getElementById:id=>({'app-loading':panel,'loading-message':message,'retry-load':retry}[id])},window:{addEventListener:(name,fn)=>events[name]=fn},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout(){},location:{reload(){}}};
 new vm.Script(source,{importModuleDynamically:()=>new Promise(()=>{})}).runInNewContext(context);
 timeout();assert.equal(panel.hidden,false);assert.equal(retry.hidden,false);assert.match(message.textContent,/ใช้เวลานาน/);
 events['candidate:ready']();assert.equal(panel.hidden,true);
});
