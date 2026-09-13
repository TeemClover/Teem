// Loopback-only, explicit fixture server. Never imported by production.
import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createShelfHandler } from '../../api/_lib/shelf-handler.js';
import { createMemoryShelfRepository } from '../../api/_lib/shelf-memory.js';
import { readShelfCatalog, readShelfSource } from '../../api/_lib/shelf-content.js';
import { isPrivateShelfPath } from '../../shelf/route-policy.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SHELF_PREVIEW_PORT || 4188);
const repository = createMemoryShelfRepository();
const localAdminPassword = 'shelf-local-review';
const adminSessions = new Set();
const adminCookie = req => String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('shelf_preview_admin='))?.split('=')[1];
const handler = createShelfHandler({getRepository:async()=>repository,readCatalog:readShelfCatalog,readSource:readShelfSource,isAdmin:async req=>adminSessions.has(adminCookie(req))});
const json = (res, value, status = 200) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value)); };
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const banner = '<div style="background:#efe8d1;color:#6e592e;padding:8px 20px;text-align:center;font:12px/1.6 system-ui">LOCAL PREVIEW · ข้อมูลทดลองในเครื่อง ไม่ใช่สิทธิ์หรือสถิติจริง</div>';
const server = http.createServer(async(req,res)=>{
  try {
    const expectedHosts = [`127.0.0.1:${port}`,`localhost:${port}`];
    if (!expectedHosts.includes(req.headers.host)) return json(res,{ok:false,error:'BAD_HOST'},403);
    req.headers['x-forwarded-proto']='http';
    req.headers['x-forwarded-host']=req.headers.host;
    req.headers['x-forwarded-for']=req.socket.remoteAddress;
    const url=new URL(req.url,`http://${req.headers.host}`);
    const pathname=decodeURIComponent(url.pathname);
    if(req.method==='POST'){
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>8192)return json(res,{ok:false,error:'BODY_TOO_LARGE'},413);chunks.push(chunk);}
      req.body=Buffer.concat(chunks).toString('utf8');
    }
    if(pathname==='/api/shelf') return handler(req,res);
    if(pathname==='/api/backoffice-auth'){
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)return json(res,{ok:false,error:'BAD_ORIGIN'},403);
      if(req.method==='GET')return json(res,{ok:true,authenticated:adminSessions.has(adminCookie(req))});
      if(req.method!=='POST')return json(res,{ok:false,error:'METHOD_NOT_ALLOWED'},405);
      let body;try{body=JSON.parse(req.body)}catch{return json(res,{ok:false,error:'INVALID_JSON'},400)}
      if(body.action==='logout'){adminSessions.delete(adminCookie(req));res.setHeader('Set-Cookie','shelf_preview_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');return json(res,{ok:true,authenticated:false});}
      const actual=Buffer.from(String(body.password||'')),expected=Buffer.from(localAdminPassword);
      if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return json(res,{ok:false,error:'BAD_PASSWORD'},401);
      const token=randomBytes(32).toString('base64url');adminSessions.add(token);
      res.setHeader('Set-Cookie',`shelf_preview_admin=${token}; Path=/; HttpOnly; SameSite=Strict`);
      return json(res,{ok:true,authenticated:true});
    }
    if(pathname.startsWith('/api/'))return json(res,{ok:false,error:'LOCAL_FIXTURE_ONLY'},503);
    if(isPrivateShelfPath(pathname))return json(res,{ok:false,error:'OPEN_SHELF_WITH_KEY'},403);
    if(pathname.split('/').some(part=>part.startsWith('.'))||/^\/(?:tests|scripts|tools|node_modules|functions)\//.test(pathname))return json(res,{ok:false,error:'NOT_FOUND'},404);
    let file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root))return json(res,{ok:false,error:'NOT_FOUND'},404);
    if((await stat(file)).isDirectory()){
      if(!pathname.endsWith('/')){res.writeHead(307,{Location:pathname+'/'+url.search});return res.end();}
      file=path.join(file,'index.html');
    }
    file=await realpath(file);if(!file.startsWith(root))return json(res,{ok:false,error:'NOT_FOUND'},404);
    let content=await readFile(file);const ext=path.extname(file);
    if(ext==='.html'&&pathname.startsWith('/shelf/')) content=Buffer.from(content.toString().replace(/<body[^>]*>/i,match=>match+banner));
    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
  }catch{json(res,{ok:false,error:'NOT_FOUND'},404)}
});
server.listen(port,'127.0.0.1',()=>console.log(`Shelf fixture: http://127.0.0.1:${port}/shelf/ | admin: /shelf/admin/ | local-only password: ${localAdminPassword}`));
