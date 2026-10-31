import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createBodymestoryHandler } from '../api/_lib/bodymestory-handler.js';
import { createBodymestoryStore } from '../api/_lib/bodymestory-store.js';
import { CAMPAIGN, CONSENT_VERSION, DOWNLOAD_URL, MAX_BODY_BYTES, csvCell, rateBuckets, validateIntake } from '../api/_lib/bodymestory-domain.js';

const base = () => ({ email:'Person@Example.com', name:'ทีม', privacyAcknowledged:true,
  campaign:'7-days', source:'manychat', episode:'RG01', utm:{source:'facebook',medium:'comment',campaign:'bodymestory_7days'} });
function harness({ config={}, register, allowed=true, rows=[] }={}) {
  const calls={database:0,register:[],buckets:[],list:[]};
  const store={
    async rateLimit(buckets){ calls.buckets.push(buckets); return allowed; },
    async register(input,now){ calls.register.push({input,now}); return register ? register(input,now) : {eventId:input.eventId}; },
    async list(limit){calls.list.push(limit);return rows;},
  };
  const handler=createBodymestoryHandler({database:()=>{calls.database++;return {};},sendJson:(res,body,status=200)=>{res.statusCode=status;res.body=body;},
    createStore:()=>store,config,clock:()=>new Date('2026-11-01T00:00:00Z')});
  async function request({method='POST',body=base(),headers={},query={}}={}) {
    const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(value){this.text=value;}};
    await handler({method,body,query,headers:{host:'www.myclover.com',origin:'https://www.myclover.com','content-type':'application/json','x-forwarded-for':'192.0.2.1',...headers}},res);
    return res;
  }
  return {calls,request};
}

test('valid opt-out intake persists before giving a download; public response contains no PII',async()=>{
  const h=harness();const data={...base(),diagnosis:'must never persist',socialSubscriberId:'private'};
  const res=await h.request({body:data});
  assert.equal(res.statusCode,201);assert.equal(res.body.downloadUrl,DOWNLOAD_URL);
  assert.deepEqual(Object.keys(res.body).sort(),['downloadUrl','eventId','ok']);
  assert.match(res.body.eventId,/^[a-f0-9-]{36}$/);
  const stored=h.calls.register[0].input;
  assert.equal(stored.email,'person@example.com');assert.equal(stored.campaign,CAMPAIGN);
  assert.equal(stored.marketingConsent,false);assert.equal(stored.adsConsent,false);
  assert.deepEqual(stored.utm,{utm_source:'facebook',utm_medium:'comment',utm_campaign:'bodymestory_7days'});
  assert.equal(stored.diagnosis,undefined);assert.equal(stored.socialSubscriberId,undefined);
  assert.equal(JSON.stringify(res.body).includes('person@example.com'),false);
  assert.equal(h.calls.buckets[0].ip.includes('192.0.2.1'),false);
  assert.equal(h.calls.buckets[0].email.includes('person@example.com'),false);
});

test('optional name, independent consent choices and both UTM shapes are accepted',async()=>{
  const h=harness();const data={...base(),name:undefined,marketingConsent:true,adsConsent:false,episode:'rg30',utm:{utm_source:'instagram',utm_content:'RG30'}};
  assert.equal((await h.request({body:data})).statusCode,201);
  assert.equal(h.calls.register[0].input.name,'');assert.equal(h.calls.register[0].input.episode,'RG30');
  assert.equal(h.calls.register[0].input.marketingConsent,true);assert.equal(h.calls.register[0].input.adsConsent,false);
});

test('missing privacy acknowledgement and string booleans never reach persistence',async()=>{
  for(const changes of [{privacyAcknowledged:false},{privacyAcknowledged:'true'},{marketingConsent:'true'},{adsConsent:1}]){
    const h=harness();assert.equal((await h.request({body:{...base(),...changes}})).statusCode,400);
    assert.equal(h.calls.database,0);
  }
});

test('unknown campaign/source/episode and PII-like UTM values are rejected before DB',async()=>{
  for(const changes of [{campaign:'other'},{source:'untrusted'},{episode:'RG31'},{episode:'RG00'},
    {utm:{source:'https://example.com/private?q=someone@example.com'}},{utm:{content:'someone@example.com'}},{utm:[]}]){
    const h=harness();assert.equal((await h.request({body:{...base(),...changes}})).statusCode,400);assert.equal(h.calls.database,0);
  }
});

test('cross-origin and malformed JSON are blocked before DB',async()=>{
  const h=harness();
  assert.equal((await h.request({headers:{origin:'https://attacker.example'}})).statusCode,403);
  assert.equal((await h.request({headers:{'sec-fetch-site':'cross-site',origin:''}})).statusCode,403);
  assert.equal((await h.request({body:'not json'})).statusCode,400);
  assert.equal((await h.request({body:[],headers:{'content-type':'text/plain'}})).statusCode,415);
  assert.equal(h.calls.database,0);
});

test('body limit checks declared and actual UTF-8 bytes, not character count',async()=>{
  const h=harness();
  assert.equal((await h.request({headers:{'content-length':String(MAX_BODY_BYTES+1)}})).statusCode,413);
  assert.equal((await h.request({body:{...base(),padding:'ก'.repeat(3000)}})).statusCode,413);
  assert.equal(h.calls.database,0);
});

test('honeypot gets no persisted lead and no trackable event',async()=>{
  const h=harness();const res=await h.request({body:{website:'https://bot.example'}});
  assert.equal(res.statusCode,201);assert.equal(res.body.eventId,null);assert.equal(h.calls.database,0);
});

test('rate limit stops registration and failure never reports success or download',async()=>{
  const limited=harness({allowed:false});const res=await limited.request();
  assert.equal(res.statusCode,429);assert.equal(res.headers['retry-after'],'3600');assert.equal(limited.calls.register.length,0);
  for(const register of [()=>{throw new Error('driver error containing person@example.com');},()=>({})]){
    const h=harness({register});const failed=await h.request();
    assert.equal(failed.statusCode,503);assert.equal(failed.body.downloadUrl,undefined);
    assert.equal(JSON.stringify(failed.body).includes('person@example.com'),false);
  }
});

test('public config does not open DB; invalid configured pixel disables fallback',async()=>{
  const h=harness();const res=await h.request({method:'GET',query:{public:'config'}});
  assert.equal(res.statusCode,200);assert.equal(res.body.pixelId,'1055629253871262');assert.equal(res.body.adsConsentRequired,true);assert.equal(h.calls.database,0);
  const off=harness({config:{BODYMESTORY_PIXEL_ID:''}});assert.equal((await off.request({method:'GET',query:{public:'config'}})).body.pixelId,null);
});

test('no public GET can enumerate leads and admin auth follows member registry credentials',async()=>{
  const config={MEMBER_ADMIN_USER:'owner',MEMBER_ADMIN_PASSWORD:'secret:with:colon'};
  const h=harness({config,rows:[{email:'private@example.com'}]});
  assert.equal((await h.request({method:'GET'})).statusCode,401);assert.equal(h.calls.database,0);
  const headers={authorization:'Basic '+Buffer.from('owner:secret:with:colon').toString('base64')};
  const ok=await h.request({method:'GET',headers});assert.equal(ok.statusCode,200);assert.equal(ok.body.count,1);
  assert.equal(ok.headers['cache-control'],'private, no-store');
  assert.equal((await h.request({method:'GET',headers,query:{limit:'50000'}})).statusCode,400);
  const unavailable=harness();assert.equal((await unavailable.request({method:'GET'})).statusCode,503);assert.equal(unavailable.calls.database,0);
});

test('CSV is authenticated and formula-safe even for malicious names/emails',async()=>{
  const h=harness({config:{STAT_PASSWORD:'secret'},rows:[{name:'=HYPERLINK("https://evil.example")',email:'+formula@example.com',campaign:CAMPAIGN}]});
  const res=await h.request({method:'GET',headers:{authorization:'Basic '+Buffer.from('admin:secret').toString('base64')},query:{format:'csv'}});
  assert.equal(res.statusCode,200);assert.match(res.headers['content-type'],/text\/csv/);
  assert.ok(res.text.startsWith('\ufeff'));assert.ok(res.text.includes('"\'=HYPERLINK(""https://evil.example"")"'));
  assert.ok(res.text.includes('"\'+formula@example.com"'));
  assert.equal(csvCell('\t=2+2'),'"\'\t=2+2"');
});

test('store performs one atomic lead/event statement and never runs runtime DDL',async()=>{
  const queries=[];const id=randomUUID();
  const sql={async query(text,args){queries.push({text,args});return [{event_id:id}];}};
  const data=validateIntake(base());data.payloadHash='a'.repeat(64);
  const result=await createBodymestoryStore(sql).register(data,new Date('2026-11-01T00:00:00Z'));
  assert.equal(result.eventId,id);assert.equal(queries.length,1);
  assert.match(queries[0].text,/ON CONFLICT\(campaign,email\) DO UPDATE/);
  assert.match(queries[0].text,/INSERT INTO body_lead_events/);
  assert.doesNotMatch(queries[0].text,/CREATE|ALTER|DROP/);
  assert.equal(queries[0].text.includes('person@example.com'),false);assert.equal(queries[0].args[3],'person@example.com');
  assert.equal(queries[0].args[6],CONSENT_VERSION);
  await assert.rejects(()=>createBodymestoryStore({query:async()=>[]}).register(data,new Date()),/LEAD_WRITE_NOT_CONFIRMED/);
});

test('rate buckets do not reveal IP/email and normalize on the same email',()=>{
  const req={headers:{'x-forwarded-for':'192.0.2.1, 10.0.0.1'}};
  const a=rateBuckets(req,'person@example.com');assert.match(a.ip,/^ip:[a-f0-9]{64}$/);assert.match(a.email,/^email:[a-f0-9]{64}$/);
  assert.notEqual(a.ip,a.email);
});
