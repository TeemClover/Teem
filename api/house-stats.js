import {database} from './_lib/core.js';
import {currentBackofficeSession,ensureBackofficeSchema} from './_lib/backoffice-auth.js';
import {createHouseStatsStore,ensureHouseStatsSchema,sameOrigin,validateSnapshot} from './_lib/house-stats.js';
export function createHandler({connect=database,authenticate=currentBackofficeSession,ensureAuth=ensureBackofficeSchema,ensure=ensureHouseStatsSchema,store=createHouseStatsStore}={}) {
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie, Origin');
  res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
  const reply=(code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));};
  if(!['GET','POST'].includes(req.method))return reply(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!sameOrigin(req))return reply(403,{ok:false,error:'BAD_ORIGIN'});
  let snapshot;
  if(req.method==='POST'){
   if(/bot|crawler|spider|headless|lighthouse/i.test(req.headers['user-agent']||'')||req.headers.dnt==='1'||req.headers['sec-gpc']==='1')return reply(202,{ok:true,ignored:true});
   if(!/^application\/json\b/i.test(req.headers['content-type']||''))return reply(415,{ok:false,error:'JSON_REQUIRED'});
   try{
    const raw=typeof req.body==='string'||Buffer.isBuffer(req.body)?String(req.body):JSON.stringify(req.body);
    if(!raw||Buffer.byteLength(raw)>12000)return reply(413,{ok:false,error:'BODY_TOO_LARGE'});
    snapshot=validateSnapshot(JSON.parse(raw));
   }catch{return reply(400,{ok:false,error:'INVALID_DATA'});}
   if(!snapshot)return reply(400,{ok:false,error:'INVALID_DATA'});
  }
  try{
   const sql=connect();let session=null;
   if(String(req.headers.cookie||'').includes('mc_backoffice_session=')){
    try{session=await authenticate(sql,req);}catch{await ensureAuth(sql);session=await authenticate(sql,req);}
   }
   if(req.method==='GET'&&!session)return reply(401,{ok:false,error:'AUTH_REQUIRED'});
   if(req.method==='POST'&&session)return reply(202,{ok:true,ignored:true});
   await ensure(sql);const repository=store(sql);
   if(req.method==='POST'){const accepted=await repository.accept(req,snapshot);return reply(accepted?202:429,{ok:accepted});}
   const days=Number(req.query?.days||new URL(req.url,'https://localhost').searchParams.get('days')||30);
   if(![1,7,30,90].includes(days))return reply(400,{ok:false,error:'BAD_RANGE'});
   return reply(200,{ok:true,...await repository.report(days)});
  }catch(error){console.error(JSON.stringify({route:'house-stats',event:'error',method:req.method,code:error?.code||'STORAGE_UNAVAILABLE'}));return reply(503,{ok:false,error:'STORAGE_UNAVAILABLE'});}
 };
}
export default createHandler();
