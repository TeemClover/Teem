import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRegistrationHandler} from '../../api/_lib/clover20-registration.js';
import {createFileStore} from './preview-store.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const port=Number(process.env.CLOVER20_PREVIEW_PORT||4178);
const storePath=process.env.CLOVER20_PREVIEW_STORE||`/private/tmp/clover20-preview-${process.pid}/rsvp.json`;
const store=createFileStore(storePath);
const handler=createRegistrationHandler({getStore:async()=>store});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf','.ics':'text/calendar; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/clover20-rsvp'){
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192){res.writeHead(413);res.end('{}');return;}}
      req.body=body;
      res.status=code=>{res.statusCode=code;return res;};res.json=data=>res.end(JSON.stringify(data));
      await handler(req,res);return;
    }
    if(url.pathname==='/'||url.pathname==='/clover20'){res.writeHead(302,{Location:'/clover20/'});res.end();return;}
    if(!url.pathname.startsWith('/clover20/')){res.writeHead(404);res.end('Not found');return;}
    let filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!filename.startsWith(path.join(root,'clover20')+path.sep)&&filename!==path.join(root,'clover20')){res.writeHead(403);res.end();return;}
    if((await stat(filename)).isDirectory())filename=path.join(filename,'index.html');
    const bytes=await readFile(filename);
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Clover 20 preview: http://127.0.0.1:${port}/clover20/\nLocal RSVP storage: ${storePath}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
