import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createActivityClock,sourceOf} from '../../showcase/house/app/analytics-contract.js';
import {validateSnapshot,sameOrigin,ensureHouseStatsSchema} from '../../api/_lib/house-stats.js';
import {createHandler} from '../../api/house-stats.js';
export const sample=()=>({visit:randomUUID(),visitor:randomUUID(),seq:1,activeSeconds:12,source:'facebook',medium:'social',campaign:'house10',device:'mobile',counts:{hd:1},exposures:{hd:1},signals:{model_ready:1},rooms:{},readyMs:1234});
test('activity time excludes hidden and idle time without overcounting resumed activity',()=>{
 let now=0;const clock=createActivityClock(()=>now,true);now=10000;assert.equal(clock.seconds(),10);now=90000;assert.equal(clock.seconds(),30);
 clock.activity();now+=5000;clock.visibility(false);now+=60000;assert.equal(clock.seconds(),35);clock.visibility(true);now+=2000;assert.equal(clock.seconds(),37);
 now+=5000;clock.activity();now+=40000;assert.equal(clock.seconds(),72);
});
test('initially hidden page accrues no time and repeated ticks do not inflate duration',()=>{let now=0;const clock=createActivityClock(()=>now,false);now=60000;assert.equal(clock.seconds(),0);clock.visibility(true);now+=1000;assert.equal(clock.seconds(),1);assert.equal(clock.seconds(),1);});
test('acquisition retains only domain and bounded campaign labels, never path, query or personal text',()=>{
 assert.deepEqual(sourceOf('https://facebook.com/private/person?email=test@example.com','?room=private&utm_source=facebook&utm_campaign=house10&utm_medium=social','www.myclover.com'),{source:'facebook',campaign:'house10',medium:'social'});
 assert.deepEqual(sourceOf('','?utm_source=someone@example.com&utm_campaign='+('a'.repeat(100)),'www.myclover.com'),{source:'direct',campaign:'',medium:''});
});
test('collector accepts bounded vocabulary and hashes visitor id',()=>{const raw=sample(),result=validateSnapshot({...raw,password:'never copy',url:'https://example.com/private'});assert.ok(result);assert.notEqual(result.visitor,raw.visitor);assert.match(result.visitor,/^[a-f0-9]{64}$/);assert.equal(result.password,undefined);assert.equal(result.url,undefined);});
test('reject malformed ids, impossible counters, unknown rooms/events and injection attempts',()=>{
 for(const override of [{visitor:'victim'},{visit:undefined},{seq:NaN},{activeSeconds:14401},{counts:{hd:-1}},{counts:{text:'private'}},{exposures:{hd:2}},{signals:{anything:1}},{rooms:{'not-a-room':1}},{counts:[]},{counts:JSON.parse('{"__proto__":1}')}])assert.equal(validateSnapshot({...sample(),...override}),null,JSON.stringify(override));
});
test('origin protection rejects missing or cross origin writes and allows authenticated server read path',()=>{
 const headers={host:'www.myclover.com',origin:'https://www.myclover.com'};assert.equal(sameOrigin({method:'POST',headers}),true);
 for(const h of [{host:'www.myclover.com'},{...headers,origin:'https://evil.test'},{...headers,'sec-fetch-site':'cross-site'}])assert.equal(sameOrigin({method:'POST',headers:h}),false);
 assert.equal(sameOrigin({method:'GET',headers:{host:'www.myclover.com'}}),true);
});
async function call(overrides={},dependencies={}){
 let recorded=null,reads=0;const headers={host:'www.myclover.com',origin:'https://www.myclover.com','content-type':'application/json','user-agent':'Mozilla/5.0',...overrides.headers};
 const req={method:'POST',url:'/api/house-stats',body:sample(),...overrides,headers};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=JSON.parse(body);}};
 const handler=createHandler({connect:()=>({}),ensure:async()=>{},authenticate:async()=>null,ensureAuth:async()=>{},store:()=>({accept:async(_,data)=>{recorded=data;return true;},report:async()=>{reads++;return {summary:{visits:5}};}}),...dependencies});
 await handler(req,res);return {res,recorded,reads};
}
test('unauthenticated and expired dashboard reads fail closed without touching reports',async()=>{
 for(const headers of [{},{cookie:'mc_backoffice_session=expired'}]){const {res,reads}=await call({method:'GET',headers});assert.equal(res.statusCode,401);assert.equal(reads,0);assert.match(res.headers['Cache-Control'],/no-store/);}
});
test('existing backoffice session admits dashboard and is excluded from visitor stats',async()=>{
 const dependencies={authenticate:async()=>({expiresAt:new Date(Date.now()+60000)})},headers={cookie:'mc_backoffice_session=valid'};
 const read=await call({method:'GET',headers},dependencies);assert.equal(read.res.statusCode,200);assert.equal(read.reads,1);
 const write=await call({headers},dependencies);assert.equal(write.res.statusCode,202);assert.equal(write.recorded,null);assert.equal(write.res.body.ignored,true);
});
test('range allowlist, JSON/body limits and tracking preferences are enforced at API boundary',async()=>{
 assert.equal((await call({method:'GET',url:'/api/house-stats?days=999',headers:{cookie:'mc_backoffice_session=valid'}},{authenticate:async()=>({})})).res.statusCode,400);
 assert.equal((await call({body:'{invalid'})).res.statusCode,400);
 assert.equal((await call({body:'x'.repeat(12001)})).res.statusCode,413);
 assert.equal((await call({headers:{'content-type':'text/plain'}})).res.statusCode,415);
 for(const headers of [{dnt:'1'},{'sec-gpc':'1'},{'user-agent':'Googlebot'}]){const result=await call({headers});assert.equal(result.res.statusCode,202);assert.equal(result.recorded,null);}
});
test('storage failures do not expose error details; write limits return retryable 429',async()=>{
 const old=console.error;console.error=()=>{};try{const result=await call({}, {connect(){throw new Error('secret DB URL');}});assert.equal(result.res.statusCode,503);assert.equal(JSON.stringify(result.res.body).includes('secret'),false);}finally{console.error=old;}
 const limited=await call({}, {store:()=>({accept:async()=>false})});assert.equal(limited.res.statusCode,429);
});
test('schema creation is coalesced per client and retryable after failure',async()=>{
 let calls=0;const sql={async query(){calls++;}};await Promise.all([ensureHouseStatsSchema(sql),ensureHouseStatsSchema(sql)]);assert.equal(calls,3);
 let fail=true;const other={async query(){if(fail){fail=false;throw Error('offline');}}};await assert.rejects(ensureHouseStatsSchema(other));await ensureHouseStatsSchema(other);
});
