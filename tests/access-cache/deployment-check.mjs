// Read-only deployment smoke test: never logs in, submits data, or sends cookies.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicFiles=[
  '/classroom/awaken/notebook/img/nb-01.jpg','/classroom/awaken/notebook/img/nb-01.webp',
  '/classroom/img/hero-classroom.webp','/classroom/sauce-cup/header-prologue.jpeg',
  '/learn/classroom/awaken/notebook/img/nb-03.webp',
  '/course/thedent912/opening/slide-01.jpg','/course/thedent/followup-qr.svg',
  '/course/thedent912/course.css','/course/thedent912/fonts/ibm-plex-sans-thai-thai-400.woff2',
  '/xircle/assets/v5/xircle-learn-hero.webp','/core7/assets/card-back.webp','/xty/assets/avatars/clover.webp',
  '/assets/account.js','/assets/auth-return.js','/shelf/shelf.css',
  '/course/admin/reviews/reviews.css','/course/admin/reviews/reviews.js',
  '/course/review-consent/consent.css','/course/review-consent/consent.js',
];
const publicVideos=['/media/home-opening-bg.mp4','/ako/assets/ako-real-eating-onion-hero.m4v'];
const privateFiles=[
 '/classroom/awaken/notebook/?from=dungeon','/classroom/lv5/vault-data.js',
 '/course/thedent912/','/course/thedent912/course-content.js',
 '/course/thedent/course.js','/course/thedent912/course.js',
 '/shelf/source/not-public.jpg','/shelf/catalog.json','/api/learn-foundation?file=awaken/notebook/img/nb-01.jpg',
 '/api/course-content?file=followup-qr.svg','/api/learn?action=lesson&courseId=ai-sauce&lessonId=FOUNDATION',
 '/api/learn-admin','/api/teambook-media?code=TEST&seq=1',
];
const publicCache='public, max-age=300, must-revalidate',rangeLimit=64*1024;

// A misconfigured range must never make this smoke test download a whole video.
async function boundedBody(response, limit) {
  if(!response.body)return {body:Buffer.alloc(0),truncated:false};
  const reader=response.body.getReader(),parts=[];let bytes=0;
  try {
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      if(bytes+value.byteLength>limit){await reader.cancel();return {body:Buffer.concat(parts),truncated:true};}
      parts.push(Buffer.from(value));bytes+=value.byteLength;
    }
    return {body:Buffer.concat(parts),truncated:false};
  } finally {reader.releaseLock();}
}
function metadata(r){
  // No cookie values, body content, or authorization data is recorded.
  return {status:r.status,type:r.headers.get('content-type'),cache:r.headers.get('cache-control'),
    cdn:r.headers.get('cdn-cache-control'),vercelCache:r.headers.get('x-vercel-cache'),age:r.headers.get('age'),
    location:r.headers.get('location'),etag:r.headers.get('etag'),setCookie:r.headers.has('set-cookie')};
}

export async function checkDeployment(base,{fetchImpl=fetch,log=record=>console.log(JSON.stringify(record))}={}){
  const origin=new URL(base);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw Error('Use an HTTPS deployment origin without credentials, path or query');
  base=origin.origin;
  const request=(file,options={})=>fetchImpl(base+file,{...options,redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(45000)});
  const results=[];
  for(const [kind,paths] of [['public',publicFiles],['public-video',publicVideos],['private',privateFiles],['page',['/','/ako/','/xircle/','/course/','/learn/']]]){
    for(const file of paths){
      const started=performance.now();let record={kind,path:file};
      try {
        if(kind==='public-video'){
          const head=await request(file,{method:'HEAD'}),headMeta=metadata(head),length=Number(head.headers.get('content-length'));
          record={...record,...headMeta,method:'HEAD',bytes:0,totalBytes:length};
          const validHead=head.status===200&&!headMeta.setCookie&&headMeta.cache===publicCache&&!!headMeta.etag
            &&/^video\//.test(headMeta.type||'')&&Number.isSafeInteger(length)&&length>0;
          if(validHead){
            const revalidated=await request(file,{method:'HEAD',headers:{'If-None-Match':headMeta.etag}});
            record.revalidationStatus=revalidated.status;record.revalidationSetCookie=revalidated.headers.has('set-cookie');
            const end=Math.min(length,rangeLimit)-1;
            const partial=await request(file,{headers:{Range:`bytes=0-${end}`}}),partialMeta=metadata(partial);
            let body={body:Buffer.alloc(0),truncated:false};
            if(partial.status===206)body=await boundedBody(partial,rangeLimit);else await partial.body?.cancel();
            record.range={...partialMeta,requested:`bytes=0-${end}`,contentRange:partial.headers.get('content-range'),
              bytes:body.body.length,truncated:body.truncated,bodySkipped:partial.status!==206};
            record.pass=revalidated.status===304&&!record.revalidationSetCookie&&partial.status===206
              &&partialMeta.etag===headMeta.etag&&partialMeta.cache===publicCache&&!partialMeta.setCookie
              &&record.range.contentRange===`bytes 0-${end}/${length}`&&!body.truncated&&body.body.length===end+1;
          } else record.pass=false;
        } else {
          const r=await request(file),{body,truncated}=await boundedBody(r,8*1024*1024),headers=metadata(r);
          record={...record,...headers,bytes:body.length,truncated};
          if(kind==='public'&&r.status===200&&headers.etag){
            const revalidated=await request(file,{headers:{'If-None-Match':headers.etag}});
            record.revalidationStatus=revalidated.status;
            // A failed revalidation is evidence already; cancel its body.
            await revalidated.body?.cancel();record.revalidationSetCookie=revalidated.headers.has('set-cookie');
          }
          const invalidMediaRequest=file==='/api/teambook-media?code=TEST&seq=1';
          if(invalidMediaRequest)record.scope='Invalid code rejection only; real private upload membership requires a test account.';
          record.pass=!truncated&&(kind==='public'?r.status===200&&!record.setCookie&&record.cache===publicCache&&record.revalidationStatus===304&&!record.revalidationSetCookie
            :kind==='private'?(invalidMediaRequest?r.status===400&&body.toString().includes('INVALID_CODE'):[303,307,401,403].includes(r.status))&&/no-store/.test(record.cache)
            :r.status===200);
        }
      } catch(error){record.pass=false;record.error=String(error?.name||'RequestError').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60);}
      record.ms=Math.round(performance.now()-started);results.push(record);log(record);
    }
  }
  return {base,checkedAt:new Date().toISOString(),cookiesSent:false,marketingVideoRangeLimit:rangeLimit,passed:results.filter(r=>r.pass).length,total:results.length,results};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(!process.argv[2])throw Error('Usage: node tests/access-cache/deployment-check.mjs https://deployment [report.json]');
  const report=await checkDeployment(process.argv[2]);
  if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(report,null,2));
  if(report.passed!==report.total)process.exitCode=1;
}
