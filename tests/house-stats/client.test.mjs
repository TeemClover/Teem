import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as settle} from 'node:timers/promises';
import {createHouseAnalytics} from '../../showcase/house/app/analytics.js';
async function environment(options,run){
 const requests=[],intervals=new Map(),timeouts=new Map();let id=0;
 const document={hidden:false,referrer:'https://example.com/private?email=secret',addEventListener(){},removeEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
 const globals={document,window:{addEventListener(){},removeEventListener(){}},location:{hostname:'www.myclover.com',search:'?utm_source=test&room=private'},navigator:{doNotTrack:options.dnt,globalPrivacyControl:options.gpc},innerWidth:1400,matchMedia:()=>({matches:false}),
  localStorage:{getItem(){if(options.storageError)throw Error('disabled');return null;},setItem(){if(options.storageError)throw Error('disabled');}},
  setInterval:callback=>{intervals.set(++id,callback);return id;},clearInterval:key=>intervals.delete(key),setTimeout:callback=>{timeouts.set(++id,callback);return id;},clearTimeout:key=>timeouts.delete(key),
  fetch:async(url,request)=>{requests.push(JSON.parse(request.body));if(options.networkError)throw Error('offline');return {ok:true,json:async()=>({ok:true,ignored:options.ignored})};}};
 const descriptors=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 try{await run({requests,intervals,timeouts,document});await settle();}
 finally{for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
test('disabled collector and privacy signals create no request, timer or identifier',async()=>{
 await environment({},async({requests,intervals})=>{createHouseAnalytics({enabled:false});assert.equal(requests.length,0);assert.equal(intervals.size,0);});
 for(const options of [{dnt:'1'},{gpc:true}])await environment(options,async({requests,intervals})=>{createHouseAnalytics({enabled:true});assert.equal(requests.length,0);assert.equal(intervals.size,0);});
});
test('storage failure never breaks scene integration and cumulative snapshots contain only approved data',async()=>{
 await environment({storageError:true},async({requests,timeouts})=>{
  const analytics=createHouseAnalytics({enabled:true});await settle();assert.equal(requests.length,1);
  analytics.transition({type:'SELECT_ROOM'},{selectedRoomId:null},{selectedRoomId:'f1-g01-living'});
  analytics.transition({type:'RENDER_MODE'},{renderMode:'sd'},{renderMode:'hd'});analytics.ready(1600);analytics.use('course');
  for(const callback of timeouts.values())callback();await settle();
  const last=requests.at(-1);assert.equal(last.counts.rooms,1);assert.equal(last.counts.hd,1);assert.equal(last.counts.course,1);assert.equal(last.exposures.course,1);assert.equal(last.readyMs,1600);
  assert.equal(last.rooms['f1-g01-living'],1);assert.equal(last.visitor,requests[0].visitor);assert.equal(last.visit,requests[0].visit);assert.ok(last.seq>requests[0].seq);
  assert.equal(JSON.stringify(last).includes('secret'),false);assert.equal(last.url,undefined);
 });
});
test('repeated no-op switches are not counted as feature use',async()=>{
 await environment({},async({requests,timeouts})=>{
  const a=createHouseAnalytics({enabled:true});await settle();
  a.transition({type:'RENDER_MODE'},{renderMode:'sd'},{renderMode:'sd'});a.transition({type:'WALL'},{wallMode:'low'},{wallMode:'low'});a.use('unknown');
  for(const fn of timeouts.values())fn();await settle();assert.deepEqual(requests[0].counts,{});assert.equal(requests.length,1);
 });
});
test('bounded network retry cannot create a request loop or break exploration',async()=>{
 await environment({networkError:true},async({requests,intervals})=>{
  const analytics=createHouseAnalytics({enabled:true});await settle();
  for(let i=0;i<10;i++){for(const callback of [...intervals.values()])callback();await settle();}
  assert.equal(requests.length,3);assert.equal(intervals.size,0);assert.doesNotThrow(()=>analytics.use('hd'));
 });
});
test('owner or privacy exclusion response stops timers and subsequent tracking',async()=>{
 await environment({ignored:true},async({requests,intervals})=>{const a=createHouseAnalytics({enabled:true});await settle();assert.equal(intervals.size,0);a.use('hd');assert.equal(requests.length,1);});
});
