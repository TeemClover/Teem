import { environmentForHost, randomId, validId, validateEvent } from './contract.js';
import { OUTCOME_VERSION, OUTCOME_PATHS, outcomeDoor, validateOutcome } from './outcome-contract.js';
const PREFIX='mc:frontdoor:handoff:v1:', QUEUE='mc:frontdoor:outcomes:v1', AGE=86400000;
function storage(name){try{return globalThis[name];}catch{return null;}}
function read(store,key){try{return JSON.parse(store?.getItem(key)||'null');}catch{return null;}}
function write(store,key,value){try{store?.setItem(key,JSON.stringify(value));}catch{/* Optional analytics never blocks a destination. */}}
const memory=new Map();
function keepContext(store,context){
  memory.set(context.handoffId,context);if(memory.size>32)memory.delete(memory.keys().next().value);
  write(store,PREFIX+context.handoffId,context);
  const indexKey=PREFIX+'index:'+context.env,prior=read(store,indexKey);
  const ids=[context.handoffId,...(Array.isArray(prior)?prior:[]).filter(id=>validId(id,'h')&&id!==context.handoffId)];
  for(const id of ids.slice(32)){try{store?.removeItem(PREFIX+id);}catch{}}
  write(store,indexKey,ids.slice(0,32));
}

/** Prepare an opaque reference only; clicking still owns the canonical DOOR_OPEN. */
export function prepareOutcomeLink(href,{env,enabled,handoffId=randomId('h'),now=Date.now(),store=storage('localStorage'),origin=globalThis.location?.origin,sourcePath=globalThis.location?.pathname||'/frontdoor/',snapshot,seedColor}={}){
  const url=new URL(href,origin);
  if(url.origin!==origin||!OUTCOME_PATHS.includes(url.pathname))return {href,handoffId};
  const context={handoffId,env,enabled:enabled===true,createdAt:now};
  if(snapshot){
    const {installation,journey,visit,visitorClass}=snapshot;
    const entryPath=['/','/index.html','/frontdoor/','/frontdoor/index.html'].includes(sourcePath)?sourcePath:'/frontdoor/';
    const candidate={eventId:randomId('e'),eventName:'DOOR_OPEN',installId:installation.installId,journeyId:journey.journeyId,visitId:visit.visitId,handoffId,occurredAt:now,path:entryPath,env,analyticsVersion:'2.0.0',experienceVersion:journey.experienceVersion,source:journey.source,visitorClass,intentPrimary:journey.intentPrimary,intentSecondary:journey.intentSecondary,doorId:outcomeDoor(url.pathname),properties:{identityDurable:installation.durable}};
    if(['red','green','blue','silver'].includes(seedColor))candidate.properties.seedColor=seedColor;
    const parsed=validateEvent(candidate);if(parsed.ok){context.departure=parsed.event;context.draft=true;
      if(candidate.doorId==='dungeon')context.dungeonHandoff=validateEvent({...candidate,eventId:randomId('e'),eventName:'DUNGEON_HANDOFF'}).event;
    }
  }
  keepContext(store,context);
  url.searchParams.set('fdh',handoffId);
  return {href:url.pathname+url.search+url.hash,handoffId};
}

export function captureOutcomeDeparture(handoffId,event,store=storage('localStorage')){
  const context=memory.get(handoffId)||read(store,PREFIX+handoffId),parsed=validateEvent(event);
  if(!context||!parsed.ok||event.handoffId!==handoffId||!['DOOR_OPEN','DUNGEON_HANDOFF'].includes(event.eventName))return;
  if(event.eventName==='DOOR_OPEN')context.departure=parsed.event;else context.dungeonHandoff=parsed.event;
  context.draft=false;keepContext(store,context);
}

export function createOutcomeClient({location=globalThis.location,store=storage('localStorage'),session=storage('sessionStorage'),fetcher=globalThis.fetch?.bind(globalThis),now=Date.now,delay=globalThis.setTimeout}={}){
  if(!location)return null;
  const params=new URLSearchParams(location.search),handoffId=params.getAll('fdh').length===1?params.get('fdh'):null;
  if(!validId(handoffId,'h'))return null;
  const context=memory.get(handoffId)||read(store,PREFIX+handoffId),env=environmentForHost(location.hostname);
  if(!context||context.handoffId!==handoffId||context.env!==env||!Number.isFinite(context.createdAt)||now()-context.createdAt>AGE||context.createdAt>now()+60000)return null;
  const endpoint=env==='prod'&&/^(www\.)?myclover\.com$/.test(location.hostname)?'https://teem.pages.dev/api/core7/analytics/frontdoor-outcome':'/api/core7/analytics/frontdoor-outcome';
  const key=`${QUEUE}:${env}`;
  let queue=(read(session,key)||[]);queue=Array.isArray(queue)?queue.filter(e=>validateOutcome(e).ok&&e.env===env&&now()-e.occurredAt<AGE).slice(-8):[];
  let pending=false,timer=null;
  const sent=new Set();
  const path=location.pathname;
  // A prepared link opened through the browser context menu has no source-page click.
  // Actual destination load commits that deferred departure. Ordinary clicks replay
  // their SAME eventId, closing the slow-navigation outbox race without another OPEN.
  if(context.draft&&context.departure){context.departure.occurredAt=now();if(context.dungeonHandoff)context.dungeonHandoff.occurredAt=now();context.draft=false;write(store,PREFIX+handoffId,context);}
  let departureAccepted=!context.departure;
  function enqueue(name){
    if(!context.enabled||!OUTCOME_PATHS.includes(path))return {ok:false,error:'DELIVERY_DISABLED'};
    const dedupe=`${handoffId}:${path}:${name}`;
    if(sent.has(dedupe)||queue.some(e=>e.handoffId===handoffId&&e.path===path&&e.name===name))return {ok:true,duplicate:true};
    const event={version:OUTCOME_VERSION,eventId:randomId('o'),handoffId,env,name,occurredAt:now(),path};
    if(!validateOutcome(event).ok)return {ok:false,error:'INVALID_OUTCOME'};
    queue.push(event);queue=queue.slice(-8);write(session,key,queue);void flush();return {ok:true,eventId:event.eventId};
  }
  async function flush(attempt=0){
    if(pending||!context.enabled||!fetcher)return;
    pending=true;
    try{
      if(!departureAccepted){
        for(const event of [context.departure,context.dungeonHandoff].filter(Boolean)){
          const parsed=validateEvent(event);
          if(!parsed.ok||parsed.event.env!==env||parsed.event.handoffId!==handoffId||!['DOOR_OPEN','DUNGEON_HANDOFF'].includes(parsed.event.eventName))return;
          let accepted=false;
          try{const response=await fetcher(endpoint.replace('frontdoor-outcome','frontdoor'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(parsed.event),keepalive:true,credentials:'omit'});const body=await response.json();accepted=response.ok&&body.ok===true;}catch{}
          if(!accepted)return;
        }
        departureAccepted=true;
      }
      for(const event of [...queue]){
        let accepted=false,discard=false;
        try{const response=await fetcher(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event),keepalive:true,credentials:'omit'});const body=await response.json();accepted=response.ok&&body.ok===true;discard=response.status>=400&&response.status<500&&![408,409,429].includes(response.status);}catch{}
        if(accepted||discard){queue=queue.filter(e=>e.eventId!==event.eventId);if(accepted)sent.add(`${event.handoffId}:${event.path}:${event.name}`);write(session,key,queue);}
      }
    }finally{pending=false;if(queue.length&&attempt<4&&timer===null){timer=delay(()=>{timer=null;void flush(attempt+1);},Math.min(16000,1000*2**attempt));timer?.unref?.();}}
  }
  function carry(anchor){
    if(!anchor?.href)return;
    const url=new URL(anchor.href,location.origin);
    if(url.origin===location.origin&&OUTCOME_PATHS.includes(url.pathname)){url.searchParams.set('fdh',handoffId);anchor.href=url.pathname+url.search+url.hash;}
  }
  return {arrival:()=>enqueue('DESTINATION_ARRIVAL'),requested:()=>enqueue('MEET_REQUEST_ACCEPTED'),carry,flush,pending:()=>queue.map(e=>({...e}))};
}

// Loaded only by destination pages. No P0 OPEN, no legacy tracker, no identity scan.
if(globalThis.document&&OUTCOME_PATHS.includes(globalThis.location?.pathname)){
  const client=createOutcomeClient();
  if(client){
    client.arrival();
    document.querySelectorAll('a[href]').forEach(a=>client.carry(a));
    new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType!==1)return;if(node.matches('a[href]'))client.carry(node);node.querySelectorAll('a[href]').forEach(a=>client.carry(a));}))).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',event=>client.carry(event.target.closest?.('a[href]')),true);
    window.addEventListener('frontdoor:meet-requested',()=>client.requested());
    window.addEventListener('online',()=>void client.flush());
    window.addEventListener('pagehide',()=>void client.flush());
  }
}
