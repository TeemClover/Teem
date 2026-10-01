// Local-only synthetic shop. No external messages, payments or database writes.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {fixture} from './fixture.mjs';
import {createHandler} from '../../api/_lib/mediral-commerce/handler.js';
import {webHandler} from '../../api/_lib/mediral-commerce/web.js';
const f=await fixture();
const previewKey=randomBytes(24).toString('base64url');f.env.MEDIRAL_ADMIN_KEY=previewKey;f.env.MEDIRAL_LINE_SECRET=previewKey;
const order=await f.checkout();
const actual=webHandler(createHandler({store:f.store,providers:f.providers,env:f.env,clock:()=>Date.now()}));
const root=resolve('mediral');
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1:4183');
  if(u.pathname==='/api/mediral-commerce'){
   const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>4300000){res.writeHead(413);return res.end();}chunks.push(b);}
   // Loopback-only demo can exchange the random in-memory key. Production has no such route.
   let body=Buffer.concat(chunks);if(u.searchParams.get('action')==='login'&&body.toString()==='{"key":"LOCAL-DEMO"}')body=Buffer.from(JSON.stringify({key:previewKey}));
   const r=await actual(new Request(u,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:body}));
   res.writeHead(r.status,Object.fromEntries(r.headers));return res.end(Buffer.from(await r.arrayBuffer()));
  }
  if(!u.pathname.startsWith('/mediral/')){res.writeHead(404);return res.end();}
  const file=resolve(root,'.'+u.pathname.slice('/mediral'.length)+(u.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+'/')){res.writeHead(404);return res.end();}
  let b=await readFile(file);if(extname(file)==='.html')b=Buffer.from(b.toString().replace('<main>','<main><p class="panel">ระบบทดลองในเครื่อง · ข้อมูลสมมติ · ไม่มีการส่ง LINE หรือรับเงินจริง<br>รหัสเข้าทดลอง: LOCAL-DEMO</p>'));
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b);
 }catch{res.writeHead(500);res.end('Preview error');}
}).listen(4184,'127.0.0.1',()=>console.log('Synthetic admin preview: http://127.0.0.1:4184/mediral/checkout/'));
