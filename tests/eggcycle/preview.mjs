// Loopback-only preview. Synthetic records; no external messages or database.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHandler} from '../../api/_lib/eggcycle/handler.js';
import {memoryStore} from './fixture.mjs';
const store=memoryStore();
const handler=createHandler({store,env:{EGGCYCLE_ADMIN_KEY:'LOCAL-DEMO'},secure:false});
const root=resolve('eggcycle');
export const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:4197');
    if(url.pathname==='/api/eggcycle'){
      const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>250000){res.writeHead(413);return res.end();}chunks.push(b);}
      req.body=Buffer.concat(chunks).toString()||undefined;return handler(req,res);
    }
    const file=resolve(root,url.pathname.replace(/^\/eggcycle\/?/,'')||'index.html');
    if(!file.startsWith(root+'/')&&file!==root+'/index.html'){res.writeHead(404);return res.end();}
    const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
    res.writeHead(200,{'Content-Type':types[extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
});
if(import.meta.url===new URL(process.argv[1],'file:').href)server.listen(4197,'127.0.0.1',()=>console.log('Eggcycle preview: http://127.0.0.1:4197/eggcycle/ (password: LOCAL-DEMO; in-memory data only)'));
