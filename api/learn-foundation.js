import { readFile, realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { database, ensureSchema } from './_lib/core.js';
import { verifiedLearnUser } from './_lib/learn-authorization.js';
import { LearnError } from './_lib/learn-domain.js';
import { mediaRange } from './_lib/learn-media-handler.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.md': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.mp4': 'video/mp4',
};

export function foundationFile(url) {
  const files = new URL(url, 'https://learn.invalid').searchParams.getAll('file');
  if (files.length !== 1) throw new LearnError('INVALID_PATH');
  let file = files[0] || 'index.html';
  if (file.endsWith('/')) file += 'index.html';
  if (file.startsWith('/') || file.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'))
    || /[\\\u0000-\u001f\u007f%?#:]/.test(file)) throw new LearnError('INVALID_PATH');
  return file;
}

export function createLearnFoundationHandler({
  getSql = database, ensureCoreSchema = ensureSchema, verifyUser = verifiedLearnUser,
  filesystemRoot = path.join(process.cwd(), 'classroom'),
  fs = { readFile, realpath, stat },
} = {}) {
  return async (req, res) => {
    for (const key of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) res.setHeader(key, 'private, no-store');
    res.setHeader('Vary', 'Cookie'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    let streamSize;
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD'); throw new LearnError('METHOD_NOT_ALLOWED', 405);
      }
      const file = foundationFile(req.url);
      const sql = getSql(); await ensureCoreSchema(sql);
      // The original free course needs verified email, not paid-course enrollment.
      await verifyUser(sql, req);
      // Check authentication before resolving even the existence of a content file.
      const root = await fs.realpath(filesystemRoot), target = await fs.realpath(path.join(root, file));
      const extension = path.extname(target).toLowerCase();
      if (!target.startsWith(root + path.sep) || !TYPES[extension]) throw new LearnError('NOT_FOUND', 404);
      const info = await fs.stat(target);
      if (!info.isFile()) throw new LearnError('NOT_FOUND', 404);
      res.setHeader('Content-Type', TYPES[extension]);
      if (req.method === 'HEAD' && extension !== '.html') {
        res.statusCode = 200; res.setHeader('Content-Length', info.size); return res.end();
      }
      if (extension === '.mp4') {
        streamSize=info.size;res.setHeader('Accept-Ranges','bytes');
        const range=mediaRange(req.headers?.range,info.size);
        res.statusCode=range?206:200;
        res.setHeader('Content-Length',range?range.end-range.start+1:info.size);
        if(range)res.setHeader('Content-Range',`bytes ${range.start}-${range.end}/${info.size}`);
        await pipeline(createReadStream(target,range?{start:range.start,end:range.end}:undefined),res);
        return;
      }
      let body = await fs.readFile(target);
      if (extension === '.html') {
        const destination = file.startsWith('dungeon/') ? '/learn/' : '/ai-source/';
        const label = file.startsWith('dungeon/') ? 'ห้องเรียนของฉัน ↗' : 'ดูคอร์สเต็ม AI ใส่ซอส ↗';
        body = Buffer.from(body.toString('utf8').replaceAll('/learn/classroom/', '/classroom/')
          .replace('</body>', `<a href="${destination}" style="position:fixed;bottom:16px;right:16px;z-index:9999;background:#163f32;color:white;padding:12px 18px;border-radius:24px;font:600 14px sans-serif">${label}</a></body>`));
      }
      res.statusCode = 200; res.setHeader('Content-Length', body.length);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if(res.headersSent){res.destroy?.();return;}
      if (error instanceof LearnError && ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED'].includes(error.code)) {
        const target=new URL('/classroom/'+foundationFile(req.url),'https://learn.invalid');
        if(target.pathname.endsWith('/index.html'))target.pathname=target.pathname.slice(0,-'index.html'.length);
        const incoming=new URL(req.url,'https://learn.invalid');
        for(const key of ['entry','work']) {
          const value=incoming.searchParams.get(key);
          if(value && /^[a-zA-Z0-9_-]{1,160}$/.test(value))target.searchParams.set(key,value);
        }
        const next=new URLSearchParams({trial:'classroom',return:target.pathname+target.search});
        res.statusCode = 303; res.setHeader('Location', '/learn/?'+next); return res.end();
      }
      res.statusCode = error instanceof LearnError ? error.status : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 503;
      if(res.statusCode===416 && streamSize)res.setHeader('Content-Range',`bytes */${streamSize}`);
      res.removeHeader('Content-Length'); res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : 'เปิดบทพื้นฐานไม่ได้ กรุณากลับไปที่ /classroom/');
    }
  };
}

export default createLearnFoundationHandler();
