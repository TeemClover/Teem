// Local-only QA server. Fixture authentication/data never ship to Vercel.
import http from 'node:http';
import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createHandler} from '../../api/house-stats.js';
import {createHouseStatsStore,ensureHouseStatsSchema,validateSnapshot} from '../../api/_lib/house-stats.js';
import {ensureBackofficeSchema,currentBackofficeSession,createBackofficeSession,destroyBackofficeSession} from '../../api/_lib/backoffice-auth.js';
const {PGlite}=await import(process.env.HOUSE_PGLITE_MODULE);
const db=new PGlite();const sql={query:async(text,params)=>(await db.query(text,params)).rows};
await ensureHouseStatsSchema(sql);await ensureBackofficeSchema(sql);
const handler=createHandler({connect:()=>sql});
const root=path.resolve(import.meta.dirname,'../..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4326');req.query=Object.fromEntries(url.searchParams);req.headers['x-forwarded-proto']='http';
  let body='';for await(const part of req){body+=part;if(body.length>20000){res.writeHead(413).end();return;}}req.body=body;
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));};
  if(url.pathname==='/api/house-stats')return await handler(req,res);
  if(url.pathname==='/api/backoffice-auth'){
   if(req.method==='GET')return json(200,{authenticated:Boolean(await currentBackofficeSession(sql,req))});
   const data=JSON.parse(body||'{}');if(data.action==='logout'){await destroyBackofficeSession(sql,req);res.setHeader('Set-Cookie','mc_backoffice_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');return json(200,{ok:true});}
   if(data.password!=='house-preview')return json(401,{error:'BAD_PASSWORD'});
   const session=await createBackofficeSession(sql,req);res.setHeader('Set-Cookie',`mc_backoffice_session=${session.token}; Path=/; HttpOnly; SameSite=Strict`);return json(200,{ok:true});
  }
  if(url.pathname==='/__inspect')return json(200,await sql.query('SELECT id,seq,active_seconds,source,counts,exposures,signals,rooms FROM mc_house_visits ORDER BY started_at'));
  if(url.pathname==='/__seed'&&req.method==='POST'){
   const store=createHouseStatsStore(sql);
   for(let i=0;i<48;i++){
    const played=i%3!==0,course=i%11===0,id=randomUUID();
    const data=validateSnapshot({visit:id,visitor:randomUUID(),seq:1,activeSeconds:played?30:5,source:['facebook','line','direct'][i%3],medium:'social',campaign:'qa-only',device:i%4?'mobile':'desktop',
     counts:played?{camera:2,inside:1,rooms:2,hd:i%4?1:0,learn:course?1:0,course:course?1:0}:{},exposures:{camera:1,hd:1,inside:1,floor:1,plan:1,photo:1,rooms:played?1:0,course:course?1:0},signals:{model_ready:1,hd_ready:played&&i%4?1:0,guide_seen:1},rooms:played?{'f1-g01-living':1}:{},readyMs:1000+i*25});
    await store.accept(req,data);await sql.query("UPDATE mc_house_visits SET started_at=now()-($1::int*interval '1 day'),active_seconds=$2 WHERE id=$3",[i%14,played?60+i*3:5,id]);
   }return json(200,{ok:true,fixture:true});
  }
  if(url.pathname==='/__preview.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end('globalThis.__houseStatsPreview=true;');return;}
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return json(404,{});
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  let content=await readFile(file);
  if(file.endsWith('showcase/house/index.html'))content=Buffer.from(content.toString().replace('<head>','<head><script src="/__preview.js"></script>'));
  if(file.endsWith('showcase/house/stat/index.html'))content=Buffer.from(content.toString().replace('<main>','<main><p>QA PREVIEW · ข้อมูลทดสอบเฉพาะเครื่อง ไม่ใช่ข้อมูลผู้เข้าชมจริง</p>'));
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain','Cache-Control':'no-store'}).end(content);
 }catch(error){console.error(error);res.writeHead(500).end('Preview error');}
}).listen(4326,'127.0.0.1',()=>console.log('House stats preview: http://127.0.0.1:4326/showcase/house/stat/ · fixture password: house-preview'));
