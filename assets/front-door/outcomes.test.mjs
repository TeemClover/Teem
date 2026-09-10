import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareOutcomeLink,createOutcomeClient} from './outcomes.js';
import {CLASSROOM_PATHS, FORGE_PATHS, OUTCOME_PATHS, KNOWLEDGE_CARRY_PATHS, acceptsOutcomePath, outcomeDoor, validateOutcome} from './outcome-contract.js';
import {ANALYTICS_VERSION, EVENTS, validateEvent} from './contract.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const location={origin:'http://localhost',hostname:'localhost',pathname:'/meet/',search:'?fdh=h-outcome-test'};
const payload={version:'1.0.0',eventId:'o-test-one',handoffId:'h-outcome-test',env:'local',name:'DESTINATION_ARRIVAL',path:'/meet/',occurredAt:1000};
test('Ako kitchen and story carry the same journey through exact public routes only',()=>{
 for(const path of ['/ako/','/ako/kitchen/','/ako/story/']){
  assert.equal(validateOutcome({...payload,path}).ok,true);assert.equal(outcomeDoor(path),'ako');
  assert.equal(acceptsOutcomePath('ako',path),true);
 }
 for(const path of ['/ako/private/','/ako/kitchen/?recipe=private','/ako/kitchen/unknown/'])assert.equal(validateOutcome({...payload,path}).ok,false);
 assert.equal(acceptsOutcomePath('ako','/xircle/'),true);
 assert.equal(acceptsOutcomePath('ako','/meet/'),true);
 assert.equal(acceptsOutcomePath('dungeon','/ako/kitchen/'),false);
});
test('X-VISOR landing is a receipt destination; knowledge stops are carry-only exact paths',()=>{
 assert.equal(outcomeDoor('/xvisor/'),'xvisor');
 assert.equal(validateOutcome({...payload,path:'/xvisor/'}).ok,true);
 for(const door of ['xvisor','xircle','ako'])assert.equal(acceptsOutcomePath(door,'/xvisor/'),true);
 for(const door of ['dungeon','forge','classroom','home','meet'])assert.equal(acceptsOutcomePath(door,'/xvisor/'),false);
 assert.deepEqual(KNOWLEDGE_CARRY_PATHS,['/xircle/learn/','/xircle/learn/topic/','/xircle/doc/xvisor/']);
 assert.equal(Object.isFrozen(KNOWLEDGE_CARRY_PATHS),true);
 for(const path of [...KNOWLEDGE_CARRY_PATHS,'/xvisor/quest/','/xvisor/private/','/xvisor/?entry=compass']){
  assert.equal(OUTCOME_PATHS.includes(path),false,path);
  assert.equal(outcomeDoor(path),undefined,path);
  assert.equal(validateOutcome({...payload,path}).ok,false,path);
  for(const door of ['xvisor','xircle','ako'])assert.equal(acceptsOutcomePath(door,path),false,path);
 }
 assert.equal(validateOutcome({...payload,name:'MEET_REQUEST_ACCEPTED',path:'/xvisor/'}).ok,false);
});
test('knowledge links carry only the existing reference without a departure or fake arrival',async()=>{
 const store=memory(),session=memory(),calls=[];
 const handoffId='h-knowledge-carry';
 prepareOutcomeLink('/xircle/',{store,origin:location.origin,handoffId,env:'local',enabled:true,now:1000});
 const clientAt=pathname=>createOutcomeClient({location:{...location,pathname,search:`?fdh=${handoffId}`},store,session,now:()=>1100,fetcher:async(url,options)=>{calls.push({url,options});return new Response('{"ok":true}');}});
 const xircle=clientAt('/xircle/');
 for(const [index,path] of KNOWLEDGE_CARRY_PATHS.entries()){
  const href=`${path}?entry=compass&topic=income&fdh=h-stale-reference#read`;
  const anchor={href:location.origin+href};xircle.carry(anchor);
  const carried=new URL(anchor.href,location.origin);
  assert.equal(carried.pathname,path);assert.deepEqual(carried.searchParams.getAll('fdh'),[handoffId]);
  assert.equal(carried.searchParams.get('topic'),'income');assert.equal(carried.searchParams.get('entry'),'compass');assert.equal(carried.hash,'#read');
  const preparedId=`h-knowledge-draft-${index}`;
  const prepared=prepareOutcomeLink(path+'?entry=compass',{store,origin:location.origin,handoffId:preparedId,env:'local',enabled:true,now:1000});
  assert.equal(prepared.href,path+'?entry=compass');
  assert.equal(store.getItem('mc:frontdoor:handoff:v1:'+preparedId),null);
  // Defensive check: even accidental client construction on a knowledge page
  // cannot turn reading it into a destination or meeting receipt.
  const knowledge=clientAt(path);
  assert.equal(knowledge.arrival().ok,false);assert.equal(knowledge.requested().ok,false);
  assert.deepEqual(knowledge.pending(),[]);
  const onward={href:'/xvisor/?entry=xircle#start'};knowledge.carry(onward);
  assert.equal(new URL(onward.href,location.origin).searchParams.get('fdh'),handoffId);
 }
 for(const href of ['/xircle/learn/private/','/xircle/doc/xvisor/private/','/xvisor/quest/','https://example.com/xircle/learn/']){
  const unsupported={href};xircle.carry(unsupported);assert.equal(unsupported.href,href);
 }
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[]);
});
test('a direct X-VISOR link prepares its own door without altering the source journey',()=>{
 const store=memory(),snapshot={installation:{installId:'installation-xvisor-direct',durable:true},journey:{journeyId:'j-xvisor-direct',experienceVersion:'frontdoor-seed-6.0',source:'direct'},visit:{visitId:'v-xvisor-direct'},visitorClass:'new'};
 const original=JSON.stringify(snapshot);
 prepareOutcomeLink('/xvisor/?entry=compass',{store,origin:location.origin,handoffId:'h-xvisor-direct',env:'local',enabled:true,now:1000,snapshot});
 const saved=JSON.parse(store.getItem('mc:frontdoor:handoff:v1:h-xvisor-direct'));
 assert.equal(saved.departure.doorId,'xvisor');assert.equal(saved.departure.eventName,'DOOR_OPEN');
 assert.equal(validateEvent(saved.departure).ok,true);assert.equal(JSON.stringify(snapshot),original);
});
test('prepared departures retain the actual root or alias without persisting query strings',()=>{
 const snapshot={installation:{installId:'installation-root-fixture',durable:true},journey:{journeyId:'j-root-fixture',experienceVersion:'frontdoor-seed-6.0',source:'direct'},visit:{visitId:'v-root-fixture'},visitorClass:'new'};
 for(const path of ['/','/index.html','/frontdoor/','/frontdoor/index.html','/?private=secret']){
  const store=memory();prepareOutcomeLink('/ako/kitchen/#tomato-lime',{store,origin:location.origin,handoffId:'h-root-path-fixture',env:'local',enabled:true,snapshot,sourcePath:path});
  const saved=JSON.parse(store.getItem('mc:frontdoor:handoff:v1:h-root-path-fixture'));
  assert.equal(saved.departure.path,path.includes('?')?'/frontdoor/':path);
  assert.equal(saved.departure.doorId,'ako');assert.equal(validateEvent(saved.departure).ok,true);
  assert.doesNotMatch(JSON.stringify(saved),/private|secret/);
 }
});
test('receipt contract strips all unrelated fields and rejects malformed, oversized and wrong-path outcomes',()=>{
 assert.deepEqual(validateOutcome({...payload,contact:'private',properties:{secret:'private'}}).event,payload);
 for(const patch of [{name:'SAVE'},{eventId:'bad'},{handoffId:'../../bad'},{env:'staging'},{path:'/meet/?name=private'},{occurredAt:-1},{name:'MEET_REQUEST_ACCEPTED',path:'/ako/'}])assert.equal(validateOutcome({...payload,...patch}).ok,false);
 assert.equal(validateOutcome({...payload,raw:'a'.repeat(1100)}).error,'PAYLOAD_TOO_LARGE');
});
test('outcomes require an explicit local context, preserve eventId on retry, and never use a production endpoint locally',async()=>{
 const store=memory(),session=memory(),calls=[],timers=[];
 const link=prepareOutcomeLink('/meet/?entry=compass&intent=ai',{store,origin:location.origin,handoffId:'h-outcome-test',env:'local',enabled:true,now:1000});
 assert.match(link.href,/fdh=h-outcome-test/);
 let reject=true;
 const client=createOutcomeClient({location,store,session,now:()=>1100,delay:fn=>{timers.push(fn);return 1;},fetcher:async(url,options)=>{calls.push({url,event:JSON.parse(options.body)});if(reject)throw Error('offline');return new Response('{"ok":true}',{status:202});}});
 client.arrival();await new Promise(resolve=>setImmediate(resolve));reject=false;await client.flush();
 assert.equal(calls.length,2);assert.equal(calls[0].event.eventId,calls[1].event.eventId);assert.equal(calls[1].url,'/api/core7/analytics/frontdoor-outcome');
 assert.equal(client.arrival().duplicate,true);assert.equal(client.pending().length,0);
 assert.equal(createOutcomeClient({location:{...location,hostname:'teem.pages.dev'},store}),null);
 assert.equal(createOutcomeClient({location,store:memory()}),null);
});
test('disabled local collection and unavailable storage do not fabricate destination receipts',()=>{
 const store=memory();prepareOutcomeLink('/meet/',{store,origin:location.origin,handoffId:'h-outcome-test',env:'local',enabled:false,now:1000});
 const client=createOutcomeClient({location,store,now:()=>1100});assert.equal(client.arrival().error,'DELIVERY_DISABLED');
 assert.equal(createOutcomeClient({location:{...location,search:'?fdh=h-unavailable'},store:null}),null);
});
test('a prepared Dungeon link commits and retries both canonical departure events with stable IDs only after arrival',async()=>{
 const store=memory(),session=memory(),calls=[],now=Date.now()-1000;
 const snapshot={installation:{installId:'installation-fixture',durable:true},journey:{journeyId:'j-dungeon-fixture',experienceVersion:'frontdoor-seed-6.0',source:'direct'},visit:{visitId:'v-dungeon-fixture'},visitorClass:'new'};
 const link=prepareOutcomeLink('/classroom/dungeon/?entry=compass',{store,origin:location.origin,handoffId:'h-dungeon-fixture',env:'local',enabled:true,now,snapshot});
 assert.equal(calls.length,0);
 const client=createOutcomeClient({location:new URL(link.href,location.origin),store,session,now:()=>now+100,delay:()=>1,fetcher:async(url,options)=>{calls.push(JSON.parse(options.body));return new Response('{"ok":true}',{status:202});}});
 client.arrival();for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls.map(e=>e.eventName||e.name),['DOOR_OPEN','DUNGEON_HANDOFF','DESTINATION_ARRIVAL']);
 assert.equal(new Set(calls.map(e=>e.handoffId)).size,1);assert.equal(client.arrival().duplicate,true);
});

test('learning receipts use only the exact seven comics and six lessons without changing the canonical P0 registry',()=>{
 assert.equal(ANALYTICS_VERSION,'2.0.0');
 assert.deepEqual(Object.keys(EVENTS),['FRONTDOOR_OPEN','FRONTDOOR_CHOICE','FRONTDOOR_REACTION_COMPLETE','LUCKY_RETURN','REWARD_HORIZON','DOOR_FOUND','SAVE','DOOR_OPEN','RETURN','RESUME','REBUILD','FRONTDOOR_FREE_ROAM','ANOMALY_START','LEGACY_WARNING','DUNGEON_HANDOFF']);
 assert.equal(FORGE_PATHS.length,8);assert.equal(CLASSROOM_PATHS.length,7);
 assert.equal(new Set(OUTCOME_PATHS).size,OUTCOME_PATHS.length);
 for(const path of [...FORGE_PATHS,...CLASSROOM_PATHS])assert.equal(validateOutcome({...payload,path}).ok,true,path);
 for(const path of ['/forge/intro/','/forge/original/','/forge/ep8/','/forge/ep1-everyone-gets-to-play/?private=1','/classroom/private.html','/classroom/free-ai.html/','/classroom/dungeon/unknown/'])assert.equal(validateOutcome({...payload,path}).ok,false,path);
 assert.equal(outcomeDoor('/classroom/dungeon/'),'dungeon');
 assert.equal(outcomeDoor('/classroom/free-ai.html'),'classroom');
 assert.equal(outcomeDoor('/forge/ep1-everyone-gets-to-play/'),'forge');
});

test('learning links defer a bounded departure, retain its ID on retry, and carry only an opaque reference onward',async()=>{
 for(const [door,path] of [['forge',FORGE_PATHS[1]],['classroom',CLASSROOM_PATHS[1]]]){
  const store=memory(),session=memory(),calls=[],now=Date.now()-1000;
  const snapshot={installation:{installId:`installation-${door}`,durable:true},journey:{journeyId:`j-learning-${door}`,experienceVersion:'frontdoor-seed-6.0',source:'direct'},visit:{visitId:`v-learning-${door}`},visitorClass:'new'};
  const link=prepareOutcomeLink(path+'?entry=compass',{store,origin:location.origin,handoffId:`h-learning-${door}`,env:'local',enabled:true,now,snapshot});
  const saved=JSON.parse(store.getItem(`mc:frontdoor:handoff:v1:h-learning-${door}`));
  assert.equal(saved.departure.doorId,door);assert.equal(saved.draft,true);assert.equal(validateEvent(saved.departure).ok,true);
  let offline=true;
  const client=createOutcomeClient({location:new URL(link.href,location.origin),store,session,now:()=>now+100,delay:()=>1,fetcher:async(url,options)=>{calls.push({url,event:JSON.parse(options.body)});if(offline)throw Error('offline');return new Response('{"ok":true}',{status:202});}});
  client.arrival();await new Promise(resolve=>setImmediate(resolve));offline=false;await client.flush();
  assert.deepEqual(calls.map(call=>call.event.eventName||call.event.name),['DOOR_OPEN','DOOR_OPEN','DESTINATION_ARRIVAL']);
  assert.equal(calls[0].event.eventId,calls[1].event.eventId);
  assert.equal(calls.every(call=>call.url.startsWith('/api/core7/analytics/frontdoor')),true);
  const next={href:location.origin+'/classroom/image-ai.html?entry=forge'};client.carry(next);
  assert.equal(new URL(next.href,location.origin).searchParams.get('fdh'),`h-learning-${door}`);
  assert.equal(new URL(next.href,location.origin).searchParams.get('entry'),'forge');
  for(const href of [location.origin+'/forge/original/','https://example.com/classroom/free-ai.html']){const unsupported={href};client.carry(unsupported);assert.equal(unsupported.href,href);}
 }
});
