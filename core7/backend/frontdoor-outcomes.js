import { acceptsOutcomePath, DOOR_ARRIVAL_PATHS, validateOutcome } from '../../assets/front-door/outcome-contract.js';
const schemas=new WeakMap();
export async function ensureOutcomeSchema(db){
 if(!schemas.has(db))schemas.set(db,db.prepare(`CREATE TABLE IF NOT EXISTS fd_v2_outcomes (
  env TEXT NOT NULL CHECK(env IN ('local','preview','prod')),event_id TEXT NOT NULL,handoff_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK(name IN ('DESTINATION_ARRIVAL','MEET_REQUEST_ACCEPTED')),path TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,received_at INTEGER NOT NULL,PRIMARY KEY(env,event_id),UNIQUE(env,handoff_id,name,path)
 )`).run().catch(error=>{schemas.delete(db);throw error;}));
 await schemas.get(db);
}
export async function persistOutcome(db,input){
 const result=validateOutcome(input);if(!result.ok)throw Object.assign(Error(result.error),{status:result.error==='PAYLOAD_TOO_LARGE'?413:400});
 const e=result.event;
 const departure=await db.prepare(`SELECT occurred_at,door_id FROM fd_v2_events WHERE env=? AND handoff_id=? AND event_name='DOOR_OPEN' LIMIT 1`).bind(e.env,e.handoffId).first();
 if(!departure)throw Object.assign(Error('DEPARTURE_PENDING'),{status:409});
 if(e.occurredAt<departure.occurred_at||e.occurredAt>departure.occurred_at+86400000)throw Object.assign(Error('OUTCOME_EXPIRED'),{status:400});
 if(!acceptsOutcomePath(departure.door_id,e.path))throw Object.assign(Error('DESTINATION_MISMATCH'),{status:400});
 await ensureOutcomeSchema(db);
 const saved=await db.prepare(`INSERT INTO fd_v2_outcomes (env,event_id,handoff_id,name,path,occurred_at,received_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`)
  .bind(e.env,e.eventId,e.handoffId,e.name,e.path,e.occurredAt,Date.now()).run();
 return {ok:true,eventId:e.eventId,duplicate:Number(saved.meta?.changes||0)===0};
}
export async function readOutcomes(db,where,bind,start,end){
 await ensureOutcomeSchema(db);
 // Bind every exact route from the shared static registry. Prefix matching here
 // would miscredit Dungeon or an onward lesson as arrival at the original door.
 const arrivalGroups=Object.entries(DOOR_ARRIVAL_PATHS);
 const arrivalSql=arrivalGroups.map(([,paths])=>`(e.door_id=? AND o.path IN (${paths.map(()=>'?').join(',')}))`).join(' OR ');
 const arrivalBind=arrivalGroups.flatMap(([door,paths])=>[door,...paths]);
 const result=await db.prepare(`SELECT e.door_id door,
  COUNT(DISTINCT e.install_id) opened,
  COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM fd_v2_outcomes o WHERE o.env=e.env AND o.handoff_id=e.handoff_id AND o.name='DESTINATION_ARRIVAL' AND (${arrivalSql}) AND o.occurred_at>=e.occurred_at AND o.occurred_at>=? AND o.occurred_at<?) THEN e.install_id END) arrived,
  COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM fd_v2_outcomes o WHERE o.env=e.env AND o.handoff_id=e.handoff_id AND o.name='MEET_REQUEST_ACCEPTED' AND o.occurred_at>=e.occurred_at AND o.occurred_at>=? AND o.occurred_at<?) THEN e.install_id END) requested
  FROM fd_v2_events e WHERE ${where} AND e.event_name='DOOR_OPEN' AND e.handoff_id IS NOT NULL GROUP BY e.door_id`)
  .bind(...arrivalBind,start,end,start,end,...bind).all();
 // Route receipts include onward pages, grouped under the original departure.
 // A visitor can appear on several paths; these rows must never be summed as people.
 const paths=await db.prepare(`SELECT e.door_id door,o.path path,
  COUNT(DISTINCT e.install_id) installations,
  COUNT(DISTINCT e.install_id || char(0) || e.journey_id) journeys,
  COUNT(DISTINCT o.event_id) events
  FROM fd_v2_events e JOIN fd_v2_outcomes o ON o.env=e.env AND o.handoff_id=e.handoff_id
  WHERE ${where} AND e.event_name='DOOR_OPEN' AND o.name='DESTINATION_ARRIVAL'
  AND o.occurred_at>=e.occurred_at AND o.occurred_at>=? AND o.occurred_at<?
  GROUP BY e.door_id,o.path ORDER BY e.door_id,o.path`).bind(...bind,start,end).all();
 return {version:'1.1.0',unit:'distinct-installations-per-door',meaning:'client-confirmed-api-acceptance-not-confirmed-appointment',rows:result.results||[],paths:paths.results||[]};
}
