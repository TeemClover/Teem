import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(process.env.STATIC_ROOT || '.');
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function publicFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  let target = resolve(join(ROOT, clean));
  if (target !== ROOT && !target.startsWith(`${ROOT}${sep}`)) return null;
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  if (!existsSync(target) && !extname(target)) target = join(target, 'index.html');
  return existsSync(target) && statSync(target).isFile() ? target : null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(501, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ ok: false, error: 'API_REQUIRES_VERCEL_RUNTIME' }));
  }
  let file;
  try { file = publicFile(url.pathname); } catch { file = null; }
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TeamBook static verification server: http://127.0.0.1:${PORT}`);
});
