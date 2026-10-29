// Explicit, loopback-only preview. Production always uses PostgreSQL.
import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createQuizHandler } from '../../api/_lib/quiz/handler.js';
import { createMemoryStore } from '../../api/_lib/quiz/game.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
export function createPreview({clock=Date.now,store=createMemoryStore({clock})}={}){
 const handler=createQuizHandler({getStore:async()=>store,clock});
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml'};
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(!/^127\.0\.0\.1(?::\d+)?$|^localhost(?::\d+)?$/.test(req.headers.host||'')){res.writeHead(403);return res.end();}
   if(url.pathname==='/api/quiz'){
    if(req.method==='POST'){const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>4096){res.writeHead(413);return res.end();}chunks.push(c);}req.body=Buffer.concat(chunks).toString();}
    return handler(req,res);
   }
   const pathname=decodeURIComponent(url.pathname);
   if(!/^\/(quiz(?:\/|$)|teambook\/assets\/)/.test(pathname)||pathname.split('/').some(s=>s.startsWith('.'))){res.writeHead(404);return res.end();}
   let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root))throw Error('PATH');
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   file=await realpath(file);if(!file.startsWith(root))throw Error('PATH');
   const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.QUIZ_PREVIEW_PORT||4199);
 createPreview().listen(port,'127.0.0.1',()=>console.log(`Clover Quiz local preview: http://127.0.0.1:${port}/quiz/ | Host: /quiz/host/ | isolated test data`));
}
