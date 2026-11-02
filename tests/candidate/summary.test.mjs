import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfile,DEFAULT_JOBS} from '../../api/_lib/candidate/model.js';
import {summarySlots} from '../../candidate/summary.js';
import {PROFILE_TOOL} from '../../api/_lib/candidate/ai.js';
const evidence=[{id:'e1',quote:'Managed marketplace campaigns',source:'PDF page 1'}];
const item={text:'บริหารแคมเปญ Marketplace',evidenceIds:['e1']};
const quickSummary={sentence:item,strengths:[item,{text:'',evidenceIds:[]}],skills:[item,{text:'',evidenceIds:[]},{text:'',evidenceIds:[]}]};
test('summary schema preserves one sentence, two strengths and three skills with source references',()=>{
 const p=normalizeProfile({name:'Synthetic candidate',evidence,quickSummary},DEFAULT_JOBS[0]);
 assert.deepEqual(p.quickSummary,quickSummary);
 const q=summarySlots(p);assert.equal(q.strengths.length,2);assert.equal(q.skills.length,3);assert.equal(q.strengths[1].missing,true);assert.equal(q.sentence.text,item.text);
});
test('unsupported summary claims and incorrect required counts fail validation',()=>{
 assert.throws(()=>normalizeProfile({name:'Synthetic',evidence,quickSummary:{...quickSummary,sentence:{...item,evidenceIds:['missing']}}},DEFAULT_JOBS[0]),/SUMMARY_REQUIRES_EVIDENCE/);
 assert.throws(()=>normalizeProfile({name:'Synthetic',evidence,quickSummary:{...quickSummary,strengths:[item]}},DEFAULT_JOBS[0]),/SUMMARY_REQUIRES_2_STRENGTHS_3_SKILLS/);
});
test('unprocessed or legacy records show explicit unknowns without synthesizing strengths',()=>{
 const q=summarySlots({analysisState:'pending',summary:'Untrusted old summary',skills:['Generic skill']});
 assert.equal(q.sentence.missing,true);assert.ok(q.strengths.every(x=>x.missing));assert.ok(q.skills.every(x=>x.missing));
 const invalid=summarySlots({evidence,quickSummary:{...quickSummary,sentence:{...item,evidenceIds:['missing']}}});assert.equal(invalid.sentence.missing,true);
});
test('AI extraction requires the same summary structure for future resumes',()=>{
 const schema=PROFILE_TOOL.input_schema;assert.ok(schema.required.includes('quickSummary'));assert.equal(schema.properties.quickSummary.properties.strengths.maxItems,2);assert.equal(schema.properties.quickSummary.properties.skills.maxItems,3);
});
