import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||4328);
const allowed=new Set(['/index.html','/app.js','/house-data.js','/style.css']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'};
http.createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/')pathname='/index.html';if(!allowed.has(pathname)&&!/^\/media\/[a-zA-Z0-9_-]+\.(webp|jpe?g|png)$/.test(pathname)){res.writeHead(404).end('Not found');return;}const body=await readFile(resolve(root,'.'+pathname));res.writeHead(200,{'Content-Type':types[extname(pathname)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(body);}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Lucky Source preview: http://127.0.0.1:${port}/`));
