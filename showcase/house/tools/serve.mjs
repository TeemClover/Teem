import http from 'node:http';
import {ZIP_NAME} from './lucky-source-archive.mjs';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.zip':'application/zip','.md':'text/plain; charset=utf-8','.png':'image/png'};
http.createServer(async(req,res)=>{
  try {
    let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(url==='/'||url==='/showcase/house') {res.writeHead(302,{Location:'/showcase/house/'}).end();return;}
    if(!url.startsWith('/showcase/house/')) {res.writeHead(404).end();return;}
    url=url.slice('/showcase/house/'.length)||'index.html';
    const file=path.resolve(root,url);
    if(!file.startsWith(root+path.sep)||(/node_modules|reports|\.git|source[s-]|Source/.test(url)&&url!==`downloads/${ZIP_NAME}`)) {res.writeHead(404).end();return;}
    const s=await stat(file); if(!s.isFile())throw Error('not file');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(data);
  }catch{res.writeHead(404).end('Not found');}
}).listen(4317,'127.0.0.1',()=>console.log('Home Explorer: http://127.0.0.1:4317/showcase/house/'));
