import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthHandler, googleVerifiedForAccount } from '../auth/[...path].js';
import { createDatabaseProvider, ensureSchema, createSession, currentUser } from './core.js';

class Reply {
  headers={}; statusCode=0;
  setHeader(k,v){this.headers[k.toLowerCase()]=v;}
  end(value){this.body=value ? JSON.parse(value) : null;}
}
function harness({deliveryFails=false}={}) {
  const rows=new Map(),hits=new Map(),sessions=[],queries=[];let sent;
  const account={id:'account-1',email:'student@example.com',display_name:'Student',member_no:'TEST'};
  const sql={async query(q,a=[]){
    queries.push(q);
    if(q.startsWith('INSERT INTO mc_auth_hits')){const n=(hits.get(a[0])||0)+1;hits.set(a[0],n);return [{hits:n}];}
    if(q.startsWith('INSERT INTO mc_email_otps')){rows.set(a[0],{id:a[0],normalized_email:a[1],otp_hash:a[2],otp_salt:a[3],attempt_count:0,expires_at:a[5],used_at:null});return [];}
    if(q.startsWith('UPDATE mc_email_otps SET attempt_count')){const r=rows.get(a[0]);if(!r||r.used_at||r.expires_at<=a[1]||r.attempt_count>=a[2])return [];r.attempt_count++;return [{...r}];}
    if(q.startsWith('UPDATE mc_email_otps SET used_at')){
      if(q.includes('RETURNING normalized_email')){const r=rows.get(a[1]);if(!r||r.used_at||r.expires_at<=a[0])return [];r.used_at=a[0];return [{normalized_email:r.normalized_email}];}
      for(const r of rows.values())if(r.normalized_email===a[1])r.used_at=a[0];return [];
    }
    if(q.startsWith('DELETE FROM mc_email_otps')){rows.delete(a[0]);return [];}
    if(q.startsWith('SELECT id,email,display_name,member_no FROM mc_accounts'))return [{...account,email:a[0]}];
    if(q.startsWith('INSERT INTO mc_sessions')){sessions.push(a);return [];}
    return [];
  }};
  const handler=createAuthHandler({getSql:()=>sql,ensureCoreSchema:async()=>{},deliverOtp:async(email,otp)=>{sent={email,otp};if(deliveryFails)throw new Error('provider secret');return {ok:true};}});
  async function call(route,body,extra={}){const r=new Reply();await handler({method:'POST',url:'/api/auth/otp/'+route,headers:{host:'learn.test',origin:'https://learn.test','content-type':'application/json',...extra},body},r);return r;}
  async function issue(email='student@example.com'){const r=await call('request',{email});return {...r,otp:sent?.otp};}
  return {call,issue,rows,sessions,queries};
}

test('database returns one client per URL and never returns an old client when configuration is missing',()=>{
  let url='postgresql://test-a',created=0;const db=createDatabaseProvider(()=>url,value=>({value,n:++created}));
  const a=db();assert.equal(db(),a);url='postgresql://test-b';const b=db();assert.notEqual(a,b);url='postgresql://test-a';assert.equal(db(),a);url='';assert.throws(db,e=>e.code==='DATABASE_URL_NOT_CONFIGURED');assert.equal(created,2);
});
test('schema caches by client, shares concurrent initialization, and retries failures',async()=>{
  let count=0;const sql={query:async()=>{count++;}};await Promise.all([ensureSchema(sql),ensureSchema(sql)]);const first=count;await ensureSchema(sql);assert.equal(count,first);assert.ok(first>0);
  let calls=0;const other={query:async()=>{if(++calls===1)throw Error('temporary');}};await assert.rejects(ensureSchema(other));await ensureSchema(other);assert.equal(calls,first+1);
});
test('OTP requires same-origin JSON and rejects overlong codes instead of truncating',async()=>{
  const h=harness();assert.equal((await h.call('request',{email:'student@example.com'},{origin:'https://attacker.test'})).statusCode,403);
  assert.equal((await h.call('request',{email:'student@example.com'},{'content-type':'text/plain'})).statusCode,400);
  const issued=await h.issue();assert.equal((await h.call('verify',{requestId:issued.body.requestId,otp:issued.otp+'0'})).statusCode,400);assert.equal(h.rows.get(issued.body.requestId).attempt_count,0);
});
test('OTP is hashed at rest, one-use, and creates a session with fresh email proof',async()=>{
  const h=harness(),issued=await h.issue(),id=issued.body.requestId;assert.equal(issued.statusCode,200);assert.notEqual(h.rows.get(id).otp_hash,issued.otp);assert.equal(h.rows.get(id).otp_hash.length,64);
  const verified=await h.call('verify',{requestId:id,otp:issued.otp});assert.equal(verified.statusCode,200);assert.equal(verified.body.user.emailVerified,true);assert.match(verified.headers['set-cookie'],/HttpOnly; Secure; SameSite=Lax/);assert.ok(h.sessions[0][4] instanceof Date);
  assert.equal((await h.call('verify',{requestId:id,otp:issued.otp})).statusCode,410);assert.equal(h.sessions.length,1);
});
test('concurrent guesses cannot exceed five attempts or create a session',async()=>{
  const h=harness(),issued=await h.issue(),id=issued.body.requestId,wrong=issued.otp==='000000'?'111111':'000000';
  const replies=await Promise.all(Array.from({length:12},()=>h.call('verify',{requestId:id,otp:wrong})));
  assert.equal(replies.filter(r=>r.statusCode===401).length,5);assert.equal(h.rows.get(id).attempt_count,5);
  assert.equal((await h.call('verify',{requestId:id,otp:issued.otp})).statusCode,410);assert.equal(h.sessions.length,0);
});
test('concurrent correct requests still issue at most one session',async()=>{
  const h=harness(),issued=await h.issue();const results=await Promise.all([1,2].map(()=>h.call('verify',{requestId:issued.body.requestId,otp:issued.otp})));
  assert.equal(results.filter(r=>r.statusCode===200).length,1);assert.equal(h.sessions.length,1);
});
test('expired and superseded codes cannot verify',async()=>{
  const h=harness(),first=await h.issue(),second=await h.issue();assert.equal((await h.call('verify',{requestId:first.body.requestId,otp:first.otp})).statusCode,410);
  h.rows.get(second.body.requestId).expires_at=new Date(0);assert.equal((await h.call('verify',{requestId:second.body.requestId,otp:second.otp})).statusCode,410);assert.equal(h.sessions.length,0);
});
test('delivery exceptions remove the unusable challenge and expose no provider details',async()=>{
  const h=harness({deliveryFails:true}),r=await h.issue();assert.equal(r.statusCode,503);assert.equal(r.body.error,'EMAIL_DELIVERY_FAILED');assert.equal(h.rows.size,0);assert.doesNotMatch(JSON.stringify(r.body),/secret/);
});
test('request rate limit also covers many addresses from one IP',async()=>{
  const h=harness();for(let i=0;i<20;i++)assert.equal((await h.issue(`student${i}@example.com`)).statusCode,200);assert.equal((await h.issue('different@example.com')).statusCode,429);
});
test('Google proof requires the account email; LINE and changed Google emails cannot upgrade it',()=>{
  assert.equal(googleVerifiedForAccount({provider:'google',email:'Student@EXAMPLE.com'},{email:'student@example.com'}),true);
  for(const identity of [{provider:'google',email:'new@example.com'},{provider:'line',email:'student@example.com'},{provider:'google',email:''}])assert.equal(googleVerifiedForAccount(identity,{email:'student@example.com'}),false);
});
test('password/default sessions do not inherit account-wide email verification',async()=>{
  let args;await createSession({query:async(q,a)=>{args=a;}},'account-1');assert.equal(args[4],null);
  const user=await currentUser({headers:{cookie:'mc_session=test'}},{query:async q=>{assert.match(q,/s\.email_verified_at/);return [{id:'account-1',email:'student@example.com',email_verified_at:null,expires_at:new Date(Date.now()+10000)}];}});assert.equal(user.emailVerified,false);
});
