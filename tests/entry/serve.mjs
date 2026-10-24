// Minimal static server for the homepage/portfolio checks. Serves the repo like Vercel's static
// layer (directory → index.html, extensionless → trailing slash). No middleware, no API.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'};

export async function startServer(port = 0) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    requests.push(url.pathname);
    let p = decodeURIComponent(url.pathname);
    if (p.includes('..')) { res.statusCode = 400; return res.end(); }
    if (!p.endsWith('/') && !path.extname(p)) { res.statusCode = 307; res.setHeader('Location', p + '/' + url.search); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    try {
      const file = path.join(root, p);
      if (!(await stat(file)).isFile()) throw 0;
      const type = types[path.extname(file)] || 'application/octet-stream';
      let body = await readFile(file);
      res.setHeader('Content-Type', type);
      // like the CDN: text is compressed, so size measurements match production more closely
      if (/text|json|javascript|xml|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); res.setHeader('Content-Encoding', 'gzip'); }
      res.end(body);
    } catch { res.statusCode = 404; res.end('Not found'); }
  });
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  return {server, requests, base: `http://127.0.0.1:${server.address().port}`};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const {base} = await startServer(Number(process.env.PORT || 4321));
  console.log(base);
}
