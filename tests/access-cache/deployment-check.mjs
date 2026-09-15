// Read-only deployment smoke test: never logs in, submits data, or sends cookies.
import { writeFile } from 'node:fs/promises';
const base=process.argv[2];
if(!base||!/^https:\/\//.test(base))throw Error('Usage: node tests/access-cache/deployment-check.mjs https://deployment [report.json]');
const publicFiles=[
  '/classroom/awaken/notebook/img/nb-01.jpg','/classroom/awaken/notebook/img/nb-01.webp',
  '/classroom/img/hero-classroom.webp','/classroom/sauce-cup/header-prologue.jpeg',
  '/learn/classroom/awaken/notebook/img/nb-03.webp',
  '/course/thedent912/opening/slide-01.jpg','/course/thedent/followup-qr.svg',
  '/course/thedent912/course.css','/course/thedent912/fonts/ibm-plex-sans-thai-thai-400.woff2',
  '/xircle/assets/v5/xircle-learn-hero.webp','/core7/assets/card-back.webp','/xty/assets/avatars/clover.webp',
  '/assets/account.js','/assets/auth-return.js','/shelf/shelf.css',
];
const privateFiles=[
 '/classroom/awaken/notebook/?from=dungeon','/classroom/lv5/vault-data.js',
 '/course/thedent912/','/course/thedent912/course-content.js',
 '/shelf/source/not-public.jpg','/api/learn-foundation?file=awaken/notebook/img/nb-01.jpg',
 '/api/course-content?file=followup-qr.svg','/api/learn?action=lesson&courseId=ai-sauce&lessonId=FOUNDATION',
 '/api/learn-admin','/api/teambook-media?code=TEST&seq=1',
];
const results=[];
for(const [kind,paths] of [['public',publicFiles],['private',privateFiles],['page',['/','/ako/','/xircle/','/course/','/learn/']]]){
  for(const file of paths){
    const started=performance.now();
    const r=await fetch(base+file,{redirect:'manual',signal:AbortSignal.timeout(45000)});
    const body=Buffer.from(await r.arrayBuffer());
    const headers=Object.fromEntries(r.headers);
    // Only response cache/routing metadata is recorded; no cookie values.
    const record={kind,path:file,status:r.status,type:headers['content-type'],cache:headers['cache-control'],cdn:headers['cdn-cache-control'],vercelCache:headers['x-vercel-cache'],age:headers.age,location:headers.location,etag:headers.etag,setCookie:r.headers.has('set-cookie'),bytes:body.length,ms:Math.round(performance.now()-started)};
    if(kind==='public'&&r.status===200&&headers.etag){const revalidated=await fetch(base+file,{headers:{'If-None-Match':headers.etag},redirect:'manual'});record.revalidationStatus=revalidated.status;record.revalidationBytes=(await revalidated.arrayBuffer()).byteLength;}
    record.pass=kind==='public'?r.status===200&&!record.setCookie&&/^public, max-age=300, must-revalidate$/.test(record.cache)&&record.revalidationStatus===304:kind==='private'?[303,307,401,403].includes(r.status)&&/no-store/.test(record.cache):r.status===200;
    results.push(record);console.log(JSON.stringify(record));
  }
}
const report={base,checkedAt:new Date().toISOString(),cookiesSent:false,passed:results.filter(r=>r.pass).length,total:results.length,results};
if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(report,null,2));
if(report.passed!==report.total)process.exitCode=1;
