import {createHash} from 'node:crypto';
import {FEATURES,SIGNALS} from '../../showcase/house/app/analytics-contract.js';
import {house} from '../../showcase/house/app/data/house.js';
const rooms=new Set(house.rooms.map(r=>r.id));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const schemas=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
export function validateSnapshot(raw) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!uuid.test(raw.visit)||!uuid.test(raw.visitor))return null;
 const integer=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
 if(!integer(raw.seq,100000)||!integer(raw.activeSeconds,14400))return null;
 const counts=(values,allowed,max)=>{
  if(!values||typeof values!=='object'||Array.isArray(values))throw Error('counts');
  const result={};for(const [key,value] of Object.entries(values)){if(!allowed.has(key)||!integer(value,max))throw Error('counts');if(value)result[key]=value;}return result;
 };
 try {
  const source=typeof raw.source==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(raw.source)?raw.source:'direct';
  const label=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(value)?value:'';
  return {visit:raw.visit,visitor:hash(`house-v1|${raw.visitor}`),seq:raw.seq,activeSeconds:raw.activeSeconds,
   source,medium:label(raw.medium),campaign:label(raw.campaign),device:['mobile','tablet','desktop'].includes(raw.device)?raw.device:'desktop',
   counts:counts(raw.counts,new Set(Object.keys(FEATURES)),1000),exposures:counts(raw.exposures,new Set(Object.keys(FEATURES)),1),
   signals:counts(raw.signals,new Set(SIGNALS),1),rooms:counts(raw.rooms,rooms,1000),
   readyMs:integer(raw.readyMs,120000)?raw.readyMs:null};
 }catch{return null;}
}
export function sameOrigin(req) {
 if(req.headers['sec-fetch-site']==='cross-site')return false;
 const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
 const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
 // Collector requires a browser Origin; reads without Origin still require authentication.
 return req.headers.origin?req.headers.origin===`${proto}://${host}`:req.method==='GET';
}
export async function ensureHouseStatsSchema(sql) {
 if(!schemas.has(sql))schemas.set(sql,(async()=>{
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_house_visits (
   id UUID PRIMARY KEY, visitor TEXT NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   seq INTEGER NOT NULL, active_seconds INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL, medium TEXT NOT NULL DEFAULT '', campaign TEXT NOT NULL DEFAULT '', device TEXT NOT NULL,
   counts JSONB NOT NULL DEFAULT '{}', exposures JSONB NOT NULL DEFAULT '{}', signals JSONB NOT NULL DEFAULT '{}', rooms JSONB NOT NULL DEFAULT '{}', ready_ms INTEGER
  )`);
  await sql.query('CREATE INDEX IF NOT EXISTS mc_house_visits_started ON mc_house_visits(started_at)');
  await sql.query('CREATE TABLE IF NOT EXISTS mc_house_stats_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL)');
 })().catch(error=>{schemas.delete(sql);throw error;}));
 return schemas.get(sql);
}
export function createHouseStatsStore(sql) {
 return {
  async accept(req,data){
   // Rotating, short-lived anti-abuse bucket. IPs are never stored in analytics records.
   const hour=new Date().toISOString().slice(0,13);
   const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
   const limits=await sql.query(`INSERT INTO mc_house_stats_limits(bucket,hits,expires_at) VALUES($1,1,now()+interval '2 hours')
    ON CONFLICT(bucket) DO UPDATE SET hits=mc_house_stats_limits.hits+1 WHERE mc_house_stats_limits.hits<3000 RETURNING hits`,[hash(`house-limit|${hour}|${ip}`)]);
   if(!limits.length)return false;
   await sql.query(`INSERT INTO mc_house_visits(id,visitor,seq,active_seconds,source,medium,campaign,device,counts,exposures,signals,rooms,ready_ms)
    VALUES($1,$2,$3,LEAST($4,60),$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13)
    ON CONFLICT(id) DO UPDATE SET seq=EXCLUDED.seq,updated_at=now(),
     active_seconds=GREATEST(mc_house_visits.active_seconds,LEAST($4,EXTRACT(EPOCH FROM(now()-mc_house_visits.started_at))::int+60)),
     counts=EXCLUDED.counts,exposures=EXCLUDED.exposures,signals=EXCLUDED.signals,rooms=EXCLUDED.rooms,
     ready_ms=COALESCE(mc_house_visits.ready_ms,EXCLUDED.ready_ms)
    WHERE mc_house_visits.visitor=EXCLUDED.visitor AND mc_house_visits.seq<EXCLUDED.seq`,
    [data.visit,data.visitor,data.seq,data.activeSeconds,data.source,data.medium,data.campaign,data.device,JSON.stringify(data.counts),JSON.stringify(data.exposures),JSON.stringify(data.signals),JSON.stringify(data.rooms),data.readyMs]);
   // Opportunistic bounded retention, once per hour across instances.
   if(Number(limits[0].hits)===1){
    await sql.query('DELETE FROM mc_house_stats_limits WHERE expires_at<now()');
    await sql.query("DELETE FROM mc_house_visits WHERE started_at<now()-interval '180 days'");
   }
   return true;
  },
  async report(days){
   const filter="started_at >= (date_trunc('day',now() AT TIME ZONE 'Asia/Bangkok') - ($1::int-1)*interval '1 day') AT TIME ZONE 'Asia/Bangkok'";
   const engaged="(active_seconds>=10 AND counts<>'{}'::jsonb)";
   const used=key=>`COALESCE((counts->>'${key}')::int,0)>0`;
   const queries={
    summary:`SELECT count(*)::int visits,count(DISTINCT visitor)::int visitors,count(*) FILTER(WHERE ${engaged})::int engaged,
      count(*) FILTER(WHERE counts<>'{}'::jsonb)::int played,count(*) FILTER(WHERE signals ? 'model_ready')::int ready,
      count(*) FILTER(WHERE signals ? 'model_error')::int errors,count(*) FILTER(WHERE signals ? 'hd_error')::int hd_errors,
      count(*) FILTER(WHERE signals ? 'hd_ready')::int hd_ready,
      count(DISTINCT visitor) FILTER(WHERE ${used('course')})::int course_visitors,
      count(*) FILTER(WHERE ${used('course')})::int course_visits,
      round(avg(active_seconds))::int average_seconds,percentile_cont(.5) WITHIN GROUP(ORDER BY active_seconds) median_seconds,
      percentile_cont(.5) WITHIN GROUP(ORDER BY ready_ms) median_ready_ms,
      percentile_cont(.9) WITHIN GROUP(ORDER BY ready_ms) p90_ready_ms,
      count(*) FILTER(WHERE active_seconds>=60)::int minute_visits,
      count(*) FILTER(WHERE ${used('rooms')})::int explored,
      count(*) FILTER(WHERE ${used('hd')})::int hd,
      count(*) FILTER(WHERE ${used('learn')})::int learn FROM mc_house_visits WHERE ${filter}`,
    daily:`SELECT to_char(started_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD') AS day,count(*)::int visits,count(DISTINCT visitor)::int visitors,
      count(*) FILTER(WHERE ${engaged})::int engaged,count(DISTINCT visitor) FILTER(WHERE ${used('course')})::int course,
      round(avg(active_seconds))::int seconds FROM mc_house_visits WHERE ${filter} GROUP BY day ORDER BY day`,
    sources:`SELECT source,medium,campaign,count(*)::int visits,count(DISTINCT visitor)::int visitors,
      count(*) FILTER(WHERE ${engaged})::int engaged,count(DISTINCT visitor) FILTER(WHERE ${used('course')})::int course,
      round(avg(active_seconds))::int seconds FROM mc_house_visits WHERE ${filter} GROUP BY source,medium,campaign ORDER BY visits DESC LIMIT 100`,
    devices:`SELECT device,count(*)::int visits,count(*) FILTER(WHERE ${engaged})::int engaged,
      count(*) FILTER(WHERE signals ? 'model_error')::int errors,round(avg(active_seconds))::int seconds FROM mc_house_visits WHERE ${filter} GROUP BY device ORDER BY visits DESC`,
    features:`SELECT key,sum((counts->>key)::int)::int uses,count(*) FILTER(WHERE COALESCE((counts->>key)::int,0)>0)::int used,
      count(*) FILTER(WHERE exposures ? key)::int exposed FROM mc_house_visits CROSS JOIN unnest($2::text[]) AS key WHERE ${filter} GROUP BY key`,
    rooms:`SELECT room.key room,count(*)::int visits,sum(room.value::int)::int uses FROM mc_house_visits CROSS JOIN LATERAL jsonb_each_text(rooms) room WHERE ${filter} GROUP BY room.key ORDER BY visits DESC LIMIT 30`,
    signals:`SELECT signal.key,count(*)::int visits FROM mc_house_visits CROSS JOIN LATERAL jsonb_each_text(signals) signal WHERE ${filter} GROUP BY signal.key`,
    coverage:`SELECT min(started_at) first_visit FROM mc_house_visits WHERE $1::int>0`
   };
   const results=await Promise.all(Object.entries(queries).map(async([key,query])=>[key,await sql.query(query,key==='features'?[days,Object.keys(FEATURES)]:[days])]));
   const result=Object.fromEntries(results);return {...result,summary:result.summary[0],coverage:result.coverage[0],days,timezone:'Asia/Bangkok',generatedAt:new Date().toISOString()};
  }
 };
}
