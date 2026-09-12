// Localhost only; serves the actual review UI/handler with synthetic memory data.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createCourseReviewsAdminHandler } from '../../api/_lib/course-reviews-admin.js';
import { createReviewFixtureDatabase } from './reviews-admin-fixture.mjs';

const root = process.cwd();
const sql = createReviewFixtureDatabase();
const handler = createCourseReviewsAdminHandler({
  database: () => sql, env: { COURSE_REVIEW_ADMIN_KEY: 'review-preview-only' },
});
const config = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2' };
const prefixes = ['/course/admin/reviews/', '/course/review-consent/', '/course/workshop/', '/course/fonts/'];
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:8788');
    res.setHeader('X-Review-Preview', 'synthetic-memory-only');
    req.headers['x-forwarded-proto'] = 'http';
    req.query = Object.fromEntries(url.searchParams);
    if (url.pathname === '/api/course-reviews') return handler(req, res);
    if (!prefixes.some(prefix => url.pathname.startsWith(prefix))) { res.writeHead(404); return res.end('Not in review preview'); }
    for (const prefix of ['/course/admin/', '/course/review-consent/']) {
      if (!url.pathname.startsWith(prefix)) continue;
      const entry = config.headers.find(item => item.source === prefix + ':path*');
      for (const header of entry?.headers || []) res.setHeader(header.key, header.value);
    }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!prefixes.some(prefix => file.startsWith(path.resolve(root, '.' + prefix) + path.sep))) { res.writeHead(404); return res.end('Not in review preview'); }
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': data.length });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(8788, '127.0.0.1', () => console.log('Review preview: http://127.0.0.1:8788/course/admin/reviews/ · synthetic key review-preview-only'));
