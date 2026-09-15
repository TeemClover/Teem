import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAuthFixture } from './auth-fixture.mjs';

// Local fixture only: OTP delivery is intercepted by createAuthFixture. These
// values enable the existing verification UI without any external email call.
process.env.RESEND_API_KEY ||= 'local-fixture-unused';
process.env.MYCLOVER_FROM_EMAIL ||= 'fixture@fixture.test';

export async function startAuthPreview(port = 0) {
  const fixture = createAuthFixture();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      req.query = Object.fromEntries(url.searchParams);
      req.headers['x-forwarded-proto'] = 'http';
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 8192) throw Error('Body too large'); }
        req.body = body ? JSON.parse(body) : {};
      }
      if (url.pathname.startsWith('/api/auth/')) return fixture.authHandler(req, res);
      if (url.pathname === '/api/learn') return fixture.learnHandler(req, res);
      if (url.pathname === '/api/progress') return fixture.progressHandler(req, res);
      if (url.pathname === '/__fixture/otp') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ otp: fixture.deliveries.get(url.searchParams.get('email')) || null }));
      }
      if (url.pathname === '/__fixture/expire' && req.method === 'POST') {
        for (const session of fixture.sessions.values()) session.expires_at = new Date(0);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end('{"ok":true}');
      }
      const staticPath = url.pathname === '/learn/' ? '/learn/index.html' : url.pathname;
      const allowed = staticPath === '/learn/index.html' || /^\/learn\/assets\/[a-z-]+\.(?:js|css)$/.test(staticPath)
        || ['/assets/account.js', '/assets/account.css', '/assets/auth-return.js'].includes(staticPath);
      if (!allowed) { res.writeHead(404); return res.end('Local auth fixture; open /learn/'); }
      const body = await readFile(new URL('../..' + staticPath, import.meta.url));
      const type = staticPath.endsWith('.js') ? 'text/javascript; charset=utf-8' : staticPath.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=0, must-revalidate' }); res.end(body);
    } catch (error) { console.error(error); if (!res.headersSent) res.writeHead(500); res.end('Local fixture error'); }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { server, fixture, base: `http://localhost:${server.address().port}` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { base } = await startAuthPreview(Number(process.env.AUTH_FIXTURE_PORT || 4178));
  console.log(`Auth/session local fixture at ${base}/learn/?course=ai-sauce&lesson=FOUNDATION`);
}
