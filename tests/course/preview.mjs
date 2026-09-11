// Local-only adapter for the actual course API handlers. Uses fixture credentials.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCourseAccessHandler} from '../../api/course-access.js';
import {createCourseContentHandler} from '../../api/course-content.js';
import {verifyCourseSession} from '../../api/_lib/course-access.js';
const root=process.cwd();
const env={COURSE_DENT_PASSWORD:'training-preview',COURSE_SESSION_SECRET:'fixture-only-session-secret-0000000000000000000000'};
const login=createCourseAccessHandler({env}),content=createCourseContentHandler({env,root});
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.md':'text/markdown; charset=utf-8','.csv':'text/csv; charset=utf-8','.zip':'application/zip'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:8766');
  if(url.pathname==='/api/course-access')return login(req,res);
  if(url.pathname==='/api/course-content'){req.query=Object.fromEntries(url.searchParams);return content(req,res);}
  if(url.pathname==='/course/thedent'||url.pathname.startsWith('/course/thedent/')){
   if(!await verifyCourseSession(req.headers.cookie||'',env)){
    res.setHeader('Cache-Control','private, no-store');
    if(/\.(?!html?$)[a-z0-9]+$/i.test(url.pathname)){res.writeHead(401);return res.end('Authentication required');}
    const next=(url.pathname==='/course/thedent'?'/course/thedent/':url.pathname)+url.search;
    res.writeHead(307,{Location:'/course/?project=thedent&next='+encodeURIComponent(next)});return res.end();
   }
   if(url.pathname==='/course/thedent'){res.writeHead(307,{Location:'/course/thedent/'+url.search});return res.end();}
   req.query={file:url.pathname.slice('/course/thedent/'.length)};return content(req,res);
  }
  if(url.pathname==='/course'){res.writeHead(307,{Location:'/course/'+url.search});return res.end();}
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(path.join(root,'course')+path.sep)||file.startsWith(path.join(root,'course','thedent')+path.sep)){res.writeHead(404);return res.end();}
  const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(8766,'127.0.0.1',()=>console.log('Course preview ready at http://127.0.0.1:8766/course/ (fixture password only)'));
