import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createToolkitHandler } from '../learn-toolkit.js';
import { TOOLKIT_FILES } from './learn-toolkit-catalog.js';
import { LearnError } from './learn-domain.js';
function harness({denied,body}={}) {
 const calls=[];const handler=createToolkitHandler({getSql:()=>({query:async()=>{calls.push('body');return [{body:(body||Buffer.from('bad')).toString('base64')}];}}),ensure:async()=>{},authorize:async()=>{calls.push('auth');if(denied)throw new LearnError(denied,403);}});
 return {calls,async call(file='workbook',method='GET'){const headers={};const res={statusCode:0,setHeader:(k,v)=>headers[k]=v,end:data=>res.body=data};await handler({method,url:'/api/learn-toolkit?file='+file},res);return {...res,headers};}};
}
test('anonymous, expired and unentitled accounts cannot read any toolkit file',async()=>{
 for(const denied of ['AUTH_REQUIRED','COURSE_ACCESS_REQUIRED','EMAIL_VERIFICATION_REQUIRED']){const h=harness({denied});const r=await h.call();assert.equal(r.statusCode,403);assert.deepEqual(h.calls,['auth']);assert.equal(r.headers['Cache-Control'],'private, no-store');}
});
test('unknown or traversal IDs do not read file bodies',async()=>{for(const id of ['../source','source&file=brief','not-found']){const h=harness();const r=await h.call(id);assert.ok([400,404].includes(r.statusCode));assert.ok(!h.calls.includes('body'));}});
test('corrupt or mismatched stored files fail closed',async()=>{assert.equal((await harness().call()).statusCode,503);});
test('only GET and HEAD are supported',async()=>{const h=harness();assert.equal((await h.call('workbook','POST')).statusCode,405);assert.equal(h.calls.length,0);});
const staging=process.env.TOOLKIT_QA_DIR;
if(staging)for(const file of TOOLKIT_FILES)test('published '+file.id+' integrity, delivery and sandbox',async()=>{
 const body=await fs.readFile(staging+'/'+file.filename),h=harness({body});const r=await h.call(file.id);assert.equal(r.statusCode,200);assert.deepEqual(r.body,body);assert.equal(r.headers['Content-Length'],file.bytes);
 if(file.id==='workbook'){assert.match(r.headers['Content-Disposition'],/^inline;/);assert.match(r.headers['Content-Security-Policy'],/script-src 'sha256-/);assert.match(r.headers['Content-Security-Policy'],/connect-src 'none'/);assert.doesNotMatch(r.headers['Content-Security-Policy'],/allow-same-origin/);assert.match((await h.call('workbook&download=1')).headers['Content-Disposition'],/^attachment;/);}
 else assert.match(r.headers['Content-Disposition'],/^attachment;/);
 assert.equal((await h.call(file.id,'HEAD')).body,undefined);
});
