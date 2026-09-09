import test from 'node:test';
import assert from 'node:assert/strict';
import {sqliteD1} from './helpers/sqlite-d1.mjs';
import {persistFrontdoorEvent,readFrontdoorStats} from '../backend/frontdoor-v2.js';
import {onRequest} from '../../functions/api/core7/[[path]].js';
import {validateEvent} from '../../assets/front-door/contract.js';
import {CLASSROOM_PATHS,FORGE_PATHS} from '../../assets/front-door/outcome-contract.js';
import {prepareOutcomeLink,createOutcomeClient} from '../../assets/front-door/outcomes.js';
const NOW=Date.parse('2026-09-07T10:00:00+07:00');
const departure=(suffix='1',door='meet',env='local')=>validateEvent({eventName:'DOOR_OPEN',eventId:`e-out-${suffix}`,installId:`install-${suffix}`,journeyId:`j-out-${suffix}`,visitId:`v-out-${suffix}`,handoffId:`h-out-${suffix}`,occurredAt:NOW,path:'/frontdoor/',source:'direct',visitorClass:'new',doorId:door,analyticsVersion:'2.0.0',experienceVersion:'frontdoor-seed-6.0',env,properties:{}}).event;
const receipt=(extra={})=>({version:'1.0.0',eventId:'o-arrival',handoffId:'h-out-1',env:'local',name:'DESTINATION_ARRIVAL',path:'/meet/',occurredAt:NOW+1000,...extra});
const post=(db,payload,host='http://localhost')=>onRequest({request:new Request(host+'/api/core7/analytics/frontdoor-outcome',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}),env:{DB:db},params:{path:['analytics','frontdoor-outcome']}});
test('real API validates, joins accepted departure, persists deduplicated outcomes and aggregates conversion separately from P0',async t=>{
 const db=sqliteD1();t.after(()=>db.close());
 assert.equal((await post(db,receipt())).status,409);
 await persistFrontdoorEvent(db,departure());await persistFrontdoorEvent(db,departure('2','xircle'));
 assert.equal((await post(db,receipt({contact:'never stored'}))).status,202);
 assert.equal((await(await post(db,receipt({eventId:'o-new-id'}))).json()).duplicate,true);
 assert.equal((await post(db,receipt({eventId:'o-request',name:'MEET_REQUEST_ACCEPTED'}))).status,202);
 const stats=await readFrontdoorStats(db,{from:'2026-09-07',to:'2026-09-07',env:'local'});
 assert.deepEqual(stats.outcomes.rows,[{door:'meet',opened:1,arrived:1,requested:1},{door:'xircle',opened:1,arrived:0,requested:0}]);
 assert.equal(stats.metrics.DOOR_OPEN.installations,2);assert.equal(Object.keys(stats.metrics).length,15);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM fd_v2_outcomes').first()).n,2);
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_outcomes WHERE env='prod'").first()).n,0);
});
test('environment, unknown names, oversized data, wrong destination and time boundaries fail closed',async t=>{
 const db=sqliteD1();t.after(()=>db.close());await persistFrontdoorEvent(db,departure());
 for(const [extra,status] of [[{env:'prod'},403],[{name:'BOOKING_CONFIRMED'},400],[{raw:'x'.repeat(2000)},413],[{path:'/ako/'},400],[{occurredAt:NOW-1},400],[{occurredAt:NOW+86400001},400]])assert.equal((await post(db,receipt(extra))).status,status);
 assert.equal((await post(db,receipt(),'https://teem.pages.dev')).status,403);
});

test('every known comic and lesson persists, but onward classroom visits never substitute for a Forge arrival',async t=>{
 const db=sqliteD1();t.after(()=>db.close());
 for(const [id,door] of [['comic','forge'],['lesson','classroom'],['onward-only','forge'],['unrelated','xircle']])await persistFrontdoorEvent(db,departure(id,door));
 for(const [index,path] of FORGE_PATHS.entries())assert.equal((await post(db,receipt({eventId:`o-comic-${index}`,handoffId:'h-out-comic',path}))).status,202,path);
 for(const [index,path] of CLASSROOM_PATHS.entries()){
  assert.equal((await post(db,receipt({eventId:`o-lesson-${index}`,handoffId:'h-out-lesson',path}))).status,202,path);
  assert.equal((await post(db,receipt({eventId:`o-onward-${index}`,handoffId:'h-out-onward-only',path}))).status,202,path);
 }
 assert.equal((await post(db,receipt({eventId:'o-comic-meet',handoffId:'h-out-comic',name:'MEET_REQUEST_ACCEPTED'}))).status,202);
 assert.equal((await post(db,receipt({eventId:'o-forward-meet',handoffId:'h-out-onward-only',name:'MEET_REQUEST_ACCEPTED'}))).status,202);
 for(const patch of [{handoffId:'h-out-comic',path:'/classroom/dungeon/'},{handoffId:'h-out-lesson',path:FORGE_PATHS[1]},{handoffId:'h-out-unrelated',path:CLASSROOM_PATHS[1]},{handoffId:'h-out-comic',path:'/forge/original/'}])assert.equal((await post(db,receipt({...patch,eventId:'o-invalid-route'}))).status,400);
 const stats=await readFrontdoorStats(db,{from:'2026-09-07',to:'2026-09-07',env:'local'});
 assert.deepEqual(stats.outcomes.rows,[{door:'classroom',opened:1,arrived:1,requested:0},{door:'forge',opened:2,arrived:1,requested:2},{door:'xircle',opened:1,arrived:0,requested:0}]);
 assert.equal(Object.keys(stats.metrics).length,15);
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_outcomes WHERE env='prod'").first()).n,0);
});

test('real collector persists the browser client comic → lesson → Meet chain with one handoff and retry-safe departure',async t=>{
 const db=sqliteD1();t.after(()=>db.close());const data=new Map(),sessionData=new Map();
 const store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},session={getItem:k=>sessionData.get(k)??null,setItem:(k,v)=>sessionData.set(k,v)};
 const now=Date.now()-1000,origin='http://localhost',calls=[];
 const snapshot={installation:{installId:'installation-comic-chain',durable:true},journey:{journeyId:'j-comic-chain',experienceVersion:'frontdoor-seed-6.0',source:'direct',intentPrimary:'curious'},visit:{visitId:'v-comic-chain'},visitorClass:'new'};
 const link=prepareOutcomeLink(FORGE_PATHS[1]+'?entry=compass',{store,origin,handoffId:'h-comic-chain',env:'local',enabled:true,now,snapshot});
 const fetcher=async(path,init)=>{const url=new URL(path,origin);calls.push(JSON.parse(init.body));return onRequest({request:new Request(url,init),env:{DB:db},params:{path:url.pathname.split('/').slice(3)}});};
 let href=link.href;
 for(const [index,path] of [FORGE_PATHS[1],FORGE_PATHS[7],CLASSROOM_PATHS[1],'/meet/'].entries()){
  assert.equal(new URL(href,origin).pathname,path);
  const client=createOutcomeClient({location:new URL(href,origin),store,session,now:()=>now+100+index*100,delay:()=>1,fetcher});
  client.arrival();if(path==='/meet/')client.requested();
  for(let retry=0;retry<30&&client.pending().length;retry++)await new Promise(resolve=>setImmediate(resolve));
  if(client.pending().length)await client.flush();
  assert.equal(client.pending().length,0);
  const next={href:origin+([FORGE_PATHS[7],CLASSROOM_PATHS[1],'/meet/','/meet/'][index])};client.carry(next);href=next.href;
 }
 const departures=await db.prepare("SELECT * FROM fd_v2_events WHERE event_name='DOOR_OPEN'").all();assert.equal(departures.results.length,1);assert.equal(departures.results[0].door_id,'forge');
 const receipts=await db.prepare('SELECT * FROM fd_v2_outcomes ORDER BY occurred_at').all();assert.equal(receipts.results.length,5);assert.equal(new Set(receipts.results.map(row=>row.handoff_id)).size,1);
 assert.equal(new Set(calls.filter(e=>e.eventName==='DOOR_OPEN').map(e=>e.eventId)).size,1);
 const day=new Date(now+7*3600000).toISOString().slice(0,10);
 const stats=await readFrontdoorStats(db,{from:day,to:day,env:'local'});assert.deepEqual(stats.outcomes.rows,[{door:'forge',opened:1,arrived:1,requested:1}]);
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n,0);
});
