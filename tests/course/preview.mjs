// Local-only adapter for the actual middleware and course API handlers.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCourseAccessHandler} from '../../api/course-access.js';
import {createCourseContentHandler} from '../../api/course-content.js';
import {createCourseReviewHandler} from '../../api/_lib/course-review.js';
const root=process.cwd();
const env={COURSE_DENT_PASSWORD:'training-preview',COURSE_SESSION_SECRET:'fixture-only-session-secret-0000000000000000000000'};
Object.assign(process.env, env);
// Adapt framework response helpers only: route normalization, redirects and
// session checks are the same middleware code that runs on the deployment.
const platform=`export const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
export const rewrite = url => new Response(null, { headers: { 'x-middleware-rewrite': String(url) } });`;
const source=await fs.readFile(new URL('../../middleware.js',import.meta.url),'utf8');
const adapted=source
 .replace("'@vercel/functions'",JSON.stringify('data:text/javascript,'+encodeURIComponent(platform)))
 .replace("'./api/_lib/course-access.js'",JSON.stringify(new URL('../../api/_lib/course-access.js',import.meta.url).href));
const {default:middleware}=await import('data:text/javascript,'+encodeURIComponent(adapted));
const login=createCourseAccessHandler({env}),content=createCourseContentHandler({env,root});
// This localhost adapter uses the real validation/session/receipt handler with
// memory-only storage. It never loads a database connection or issues live cards.
const reviewRows=new Map();
const review=createCourseReviewHandler({env,database:async()=>({query:async(statement,values=[])=>{
 const sql=statement.trim();
 if(sql.startsWith('CREATE TABLE'))return [];
 if(sql.startsWith('INSERT INTO course_reviews')){
  const key=values[1]+':'+values[3];
  if(!reviewRows.has(key))reviewRows.set(key,{review_reference:values[0],cohort_id:values[1],receipt_token:values[14],receipt_expires_at:values[15],reward_id:values[16],reward_card_id:values[17],reward_quest_id:values[18],claimed_profile_id:null,claimed_at:null});
  return [reviewRows.get(key)];
 }
 const row=[...reviewRows.values()].find(item=>item.receipt_token===values[0]&&item.cohort_id===(sql.startsWith('UPDATE')?values[3]:values[1]));
 if(sql.startsWith('SELECT claimed_profile_id'))return row?[row]:[];
 if(sql.startsWith('UPDATE course_reviews')){
  if(!row||row.claimed_profile_id&&row.claimed_profile_id!==values[1]||!row.claimed_profile_id&&row.receipt_expires_at<=values[2])return [];
  row.claimed_profile_id=values[1];row.claimed_at||=values[2];return [row];
 }
 throw new Error('Unsupported preview fixture query');
}})});
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.md':'text/markdown; charset=utf-8','.csv':'text/csv; charset=utf-8','.zip':'application/zip','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:8766');
  const routed=await middleware(new Request(url,{method:req.method,headers:req.headers}));
  if(routed.headers.get('x-middleware-next')!=='1'){
   res.writeHead(routed.status,Object.fromEntries(routed.headers));
   return res.end(req.method==='HEAD'?undefined:Buffer.from(await routed.arrayBuffer()));
  }
  if(url.pathname==='/api/course-access')return login(req,res);
  if(url.pathname==='/api/course-content'){req.query=Object.fromEntries(url.searchParams);return content(req,res);}
  if(url.pathname==='/api/course-review'){
   req.headers['x-forwarded-proto']='http';
   res.setHeader('X-Course-Preview','fixture-memory-only');
   return review(req,res);
  }
  if(url.pathname==='/course/thedent912'||url.pathname.startsWith('/course/thedent912/')){
   req.query={file:url.pathname.slice('/course/thedent912/'.length)};return content(req,res);
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  const classroom=path.join(root,'course','thedent');
  if(!file.startsWith(path.join(root,'course')+path.sep)||file===classroom||file.startsWith(classroom+path.sep)){res.writeHead(404);return res.end();}
  const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(8766,'127.0.0.1',()=>console.log('Course preview ready at http://127.0.0.1:8766/course/ (fixture password only)'));
