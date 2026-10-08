// Local prototype preview. Only /short and its existing font dependencies are served.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname, basename, resolve } from 'node:path';

const root = fileURLToPath(new URL('./', import.meta.url));
const fontRoot = fileURLToPath(new URL('../routinex/build/fonts/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.webm': 'video/webm', '.mp4':'video/mp4', '.vtt':'text/vtt; charset=utf-8', '.jpg':'image/jpeg', '.png':'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
export function createPreviewServer() {
  return http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      if (pathname === '/' || pathname === '/short') { res.writeHead(302, { location: '/short/' }); res.end(); return; }
      if(pathname==='/api/torntor'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({mode:'demo',ready:false,payments:false,auth:null,daily:20,timezone:'Asia/Bangkok'}));return;}
      let path;
      if (pathname.startsWith('/short/')) {
        path = resolve(root, pathname.slice('/short/'.length)+(pathname.endsWith('/')?'index.html':''));
        if (!path.startsWith(root) || !['.html','.css','.js','.json','.webp','.webm','.mp4','.vtt','.jpg','.png','.svg'].includes(extname(path))) throw new Error('not found');
      } else if (/^\/routinex\/build\/fonts\/ibm-plex-sans-thai-(thai|latin)-(400|600|700)\.woff2$/.test(pathname)) {
        path = join(fontRoot, basename(pathname));
      } else throw new Error('not found');
      if (!(await stat(path)).isFile()) throw new Error('not found');
      const bytes = await readFile(path);
      const headers = { 'content-type': types[extname(path)], 'cache-control': 'no-store', 'accept-ranges': 'bytes', 'x-content-type-options': 'nosniff' };
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      if (range) {
        const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : bytes.length - 1, bytes.length - 1);
        if (start > end || start >= bytes.length) { res.writeHead(416, { 'content-range': `bytes */${bytes.length}` }); res.end(); return; }
        res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${bytes.length}`, 'content-length': end - start + 1 });
        res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
      } else { res.writeHead(200, { ...headers, 'content-length': bytes.length }); res.end(req.method === 'HEAD' ? undefined : bytes); }
    } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createPreviewServer();
  server.listen(Number(process.env.SHORT_PREVIEW_PORT || 4317), '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}/short/`));
}
