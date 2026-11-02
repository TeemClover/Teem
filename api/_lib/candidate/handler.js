import {timingSafeEqual,createHash} from 'node:crypto';
import {normalizeJob,normalizeProfile,sourceUrl,text,validatePdf,problem,STATUSES,COMPANY,VERSION} from './model.js';
function tokenMatches(header,secret){if(!secret)return false;const hash=x=>createHash('sha256').update(x).digest();return timingSafeEqual(hash(String(header||'')),hash(`Bearer ${secret}`));}
export function createHandler({getStore,authenticate,analyze,env=process.env}){
 return async function(req,res){
  const reply=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(data));};
  for(const [key,value] of Object.entries({'Cache-Control':'private, no-store, max-age=0','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'}))res.setHeader(key,value);
  try{
   if(!['GET','POST'].includes(req.method))return reply({ok:false,error:'METHOD_NOT_ALLOWED'},405);
   const sync=tokenMatches(req.headers.authorization,env.CANDIDATE_SYNC_TOKEN);
   if(req.method==='POST'&&!sync){const origin=req.headers.origin;const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();if(!origin||origin!==`https://${host}`&&!(env.NODE_ENV==='test'&&origin===`http://${host}`))return reply({ok:false,error:'BAD_ORIGIN'},403);}
   const accessToken=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('mc_candidate_access='))?.slice('mc_candidate_access='.length)||'';
   const accessRequest=req.method==='POST'&&(typeof req.body==='string'?JSON.parse(req.body):req.body)?.action==='access';
   if(accessRequest){const body=typeof req.body==='string'?JSON.parse(req.body):req.body;const store=getStore();if(!await store.access(text(body.token,100)))return reply({ok:false,error:'INVALID_ACCESS_LINK'},401);res.setHeader('Set-Cookie',`mc_candidate_access=${body.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);return reply({ok:true});}
   if(!sync&&!await authenticate(req)&&!(accessToken&&await getStore().access(accessToken)))return reply({ok:false,error:'UNAUTHORIZED'},401);
   const store=getStore();await store.ensure();
   const query=new URL(req.url,'https://candidate.local').searchParams;
   if(req.method==='GET'){
    if(['raw','profile'].includes(query.get('action'))){const c=await store.detail(text(query.get('id'),80));if(!c)return reply({ok:false,error:'NOT_FOUND'},404);const raw=query.get('action')==='raw';res.setHeader('Content-Type',raw?'text/plain; charset=utf-8':'application/json; charset=utf-8');if(query.get('download')==='1')res.setHeader('Content-Disposition',`attachment; filename="${raw?'original-text.txt':'cloverx-profile.json'}"`);return res.end(raw?c.original_text:JSON.stringify(c,null,2));}
    if(query.get('action')==='resume'){
     const doc=await store.pdf(text(query.get('id'),80));if(!doc?.pdf_base64)return reply({ok:false,error:'RESUME_NOT_FOUND'},404);
     const bytes=Buffer.from(doc.pdf_base64,'base64');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Length',bytes.length);res.setHeader('Content-Disposition',`${query.get('download')==='1'?'attachment':'inline'}; filename="resume.pdf"`);res.setHeader('Content-Security-Policy',"sandbox; default-src 'none'; frame-ancestors 'self'");return res.end(bytes);
    }
    if(query.get('id')){const candidate=await store.detail(text(query.get('id'),80));return candidate?reply({ok:true,candidate}):reply({ok:false,error:'NOT_FOUND'},404);}
    const page=Math.max(0,Math.min(10000,Number.parseInt(query.get('page')||'0',10)||0));
    const [jobs,list,runs]=await Promise.all([store.jobs(),store.list(page,text(query.get('job'),80)),store.runs()]);
    return reply({ok:true,jobs,...list,runs,company:COMPANY,version:VERSION,aiConfigured:Boolean(env.ANTHROPIC_API_KEY),syncConfigured:Boolean(env.CANDIDATE_SYNC_TOKEN)});
   }
   if(Number(req.headers['content-length']||0)>3800000)throw problem('PAYLOAD_TOO_LARGE',413);
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>3800000)throw problem('BAD_BODY');
   const action=body.action;
   if(sync&&!['analyze','import','run','bulk'].includes(action))throw problem('SYNC_ACTION_FORBIDDEN',403);
   if(action==='logout'){res.setHeader('Set-Cookie','mc_candidate_access=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return reply({ok:true});}
   if(action==='bulk'){
    if(!Array.isArray(body.records)||body.records.length>400)throw problem('BAD_BATCH');
    const prepared=[],jobs=new Map((await store.jobs()).map(j=>[j.id,j]));
    for(const item of body.records){const job=jobs.get(text(item.jobId,80));if(!job?.enabled)throw problem('JOB_NOT_ENABLED');const originalText=text(item.originalText,60000);if(!originalText||!text(item.sourceId,150))throw problem('RESUME_REQUIRED');const profile={...normalizeProfile(item.profile,job),analysisState:item.analysisState==='ready'?'ready':'pending'};prepared.push({job,profile,sourceId:text(item.sourceId,150),sourceUrl:sourceUrl(item.sourceUrl),originalText,pdfBase64:'',filename:''});}
    for(let start=0;start<prepared.length;start+=8)await Promise.all(prepared.slice(start,start+8).map(item=>store.save(item)));return reply({ok:true,imported:prepared.length});
   }
   if(action==='job'){const job=normalizeJob(body.job);const result=await store.saveJob(job,Number(body.version));return reply({ok:true,...result});}
   if(action==='review'){if(!STATUSES.includes(body.status))throw problem('BAD_STATUS');const result=await store.review(text(body.id,80),Number(body.version),body.status,text(body.notes,12000));return reply({ok:true,...result});}
   if(action==='analyze'||action==='import'||action==='enqueue'){
    const job=await store.job(text(body.jobId,80));if(!job||!job.enabled)throw problem('JOB_NOT_ENABLED');
    const originalText=text(body.originalText,60000);const pdfBase64=body.pdfBase64?validatePdf(body.pdfBase64).toString('base64'):'';
    if(!originalText&&!pdfBase64)throw problem('RESUME_REQUIRED');
    const raw=action==='analyze'?await analyze({job,originalText,pdfBase64}):action==='enqueue'?{name:text(body.candidateName,200),summary:'รอจัดข้อมูลและประเมินหลักฐานในรอบตรวจ',unknowns:['ยังไม่ได้อ่านและจัดโปรไฟล์โดยระบบ']} :body.profile;
    if(!raw||typeof raw!=='object')throw problem('BAD_PROFILE');
    const profile={...normalizeProfile(raw,job),analysisState:action==='enqueue'?'pending':'ready'};
    const saved=await store.save({job,profile,originalText,pdfBase64,sourceId:text(body.sourceId,150),sourceUrl:sourceUrl(body.sourceUrl),filename:text(body.filename,200)});
    return reply({ok:true,...saved});
   }
   if(action==='run'){
    if(!['success','partial','blocked','no_new'].includes(body.state))throw problem('BAD_RUN_STATE');
    const data={id:text(body.runId,150),state:body.state,message:text(body.message,1500),jobIds:(Array.isArray(body.jobIds)?body.jobIds:[]).slice(0,20).map(x=>text(x,80)),checked:Math.max(0,Math.min(10000,Number(body.checked)||0)),imported:Math.max(0,Math.min(10000,Number(body.imported)||0))};
    await store.run(data);return reply({ok:true});
   }
   throw problem('UNKNOWN_ACTION');
  }catch(error){
   // Never log resumes, credentials, model input/output or database exception details.
   const status=Number(error.status)||500;return reply({ok:false,error:error.code||(error instanceof SyntaxError?'BAD_JSON':'CANDIDATE_UNAVAILABLE')},error instanceof SyntaxError?400:status);
  }
 };
}
