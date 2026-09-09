/** Local-only review server: unchanged Pages API + real isolated D1 + repo static files. */
import { readFile, mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLocalMeet } from './helpers/meet-local.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const moduleName = process.env.FRONTDOOR_MINIFLARE || 'miniflare';
const { Miniflare } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.m4v': 'video/mp4' };
export async function startPreview({ port = Number(process.env.FRONTDOOR_PORT || 4173), databaseDirectory = process.env.FRONTDOOR_LOCAL_DB } = {}) {
const directory = databaseDirectory || await mkdtemp(path.join(tmpdir(), 'frontdoor-preview-d1-'));
const meet = createLocalMeet(path.join(directory, 'meet-local.sqlite'));
const mf = new Miniflare({
  rootPath: directory, cf: false, host: '127.0.0.1', port, modules: true, modulesRoot: root,
  modulesRules: [{ type: 'ESModule', include: ['**/*.js'], fallthrough: true }],
  scriptPath: path.join(root, 'core7/tests/frontdoor-e2e-worker.mjs'), compatibilityDate: '2026-07-01',
  d1Databases: { DB: 'frontdoor-local-preview' }, d1Persist: directory,
  bindings: { FRONTDOOR_ENV: 'local', STAT_USER: 'teem', STAT_PASSWORD: 'local-fixture-only' },
  serviceBindings: { ASSETS: async request => {
    const url = new URL(request.url);
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Bad path', { status: 400 }); }
    if (pathname === '/api/meet') return meet.fetch(request);
    if (pathname.split('/').some(part => part.startsWith('.')) || /^\/core7\/(?:backend|tests|admin|stat)(?:\/|$)/.test(pathname) || /\.(?:test|e2e)\.mjs$/.test(pathname)) return new Response('Not found', { status: 404 });
    // One XIRCLE source, including bookmarked mixed-case and slashless entrances.
    // Check real directories so assets stay assets and unknown paths remain 404.
    const requestedPath = pathname;
    pathname = pathname.replace(/^\/xircle(?=\/|$)/i, '/xircle');
    if (['/invite','/home'].includes(pathname)) pathname += '/';
    if (/^\/xircle(?:\/|$)/.test(pathname) && !pathname.endsWith('/')) {
      try { if ((await stat(path.resolve(root, `.${pathname}`))).isDirectory()) pathname += '/'; } catch {}
    }
    if (pathname !== requestedPath) {
      url.pathname = pathname;
      return new Response(null, { status: 307, headers: { location: `${url.pathname}${url.search}`, 'cache-control': 'no-store' } });
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    if (!/^\/(frontdoor\/|home\/|assets\/|classroom\/|xircle\/|invite\/|meet\/|ako\/|core7\/|guild\/|collection\/|resume\/|paths\/|club\/|xvisor\/|teambook\/assets\/|forge\/|xty\/assets\/|img\/|media\/|icons\/|stat\/frontdoor\/|favicon\.ico$|site\.webmanifest$|hall(?:-full)?\.html$|index\.html$)/.test(pathname)) return new Response('Not found', { status: 404 });
    const filename = path.resolve(root, `.${pathname}`);
    if (!filename.startsWith(root)) return new Response('Not found', { status: 404 });
    try {
      let content = await readFile(filename);
      if (['/frontdoor/index.html','/index.html'].includes(pathname)) content = content.toString().replace('<!-- LOCAL_TELEMETRY -->', '<meta name="frontdoor-telemetry" content="local">');
      if (pathname === '/meet/index.html') content = content.toString().replace('</head>', '<meta name="meet-environment" content="local"></head>');
      const headers = { 'content-type': mime[path.extname(filename)] || 'application/octet-stream', 'cache-control': 'no-store' };
      // Safari requests byte ranges for video. This changes only the local review server.
      if (/\.(mp4|m4v)$/.test(pathname)) {
        const size = content.length; headers['accept-ranges'] = 'bytes';
        const range = request.headers.get('range');
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          const start = match?.[1] ? Number(match[1]) : Math.max(0,size-Number(match?.[2]));
          const end = match?.[1] && match?.[2] ? Math.min(size-1,Number(match[2])) : size-1;
          if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return new Response(null,{ status:416,headers:{'content-range':`bytes */${size}`} });
          return new Response(content.subarray(start,end+1),{ status:206,headers:{...headers,'content-length':String(end-start+1),'content-range':`bytes ${start}-${end}/${size}`} });
        }
        headers['content-length'] = String(size);
      }
      return new Response(content, { headers });
    } catch { return new Response('Not found', { status: 404 }); }
  } },
});
return { mf, meet, base: (await mf.ready).origin, directory, close: async () => { await mf.dispose(); meet.close(); } };
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const server = await startPreview();
  console.log(`Front Door local review: ${server.base}/frontdoor/`);
  console.log(`Local D1: ${server.directory}`);
  console.log(`Local Meet SQLite: ${server.meet.filename} — no external notifications`);
  console.log('Local Stat: /stat/frontdoor/ — teem / local-fixture-only');
  await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  await server.close();
}
