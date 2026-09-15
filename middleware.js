import { next, rewrite } from '@vercel/functions';
import { verifyCourseSession } from './api/_lib/course-access.js';
import { isPrivateShelfPath } from './shelf/route-policy.js';
import { publicAssetPath, PUBLIC_ASSET_CACHE_HEADERS } from './routing/public-assets.js';

export const config = {
  // Inspect every path before Vercel can decode it into a static file route.
  // Legacy API/asset exemptions are applied after the classroom guard below.
  matcher: '/:path*',
};

function canonicalPath(pathname) {
  let decoded = pathname;
  try {
    for (let round = 0; round < 8 && /%[0-9a-f]{2}/i.test(decoded); round++) {
      decoded = decodeURIComponent(decoded);
    }
    if (/%[0-9a-f]{2}/i.test(decoded) || /[\u0000-\u001f\u007f?#]/.test(decoded)) return null;
    const slashes = decoded.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    return new URL(`https://course.invalid${slashes}`).pathname;
  } catch { return null; }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const normalized = canonicalPath(pathname);
  const privateHeaders = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store', 'Vary': 'Cookie' };
  if (normalized === null) return new Response('Invalid path', { status: 400, headers: privateHeaders });
  // Only reviewed publication paths bypass content authentication. Private
  // uploads, documents and APIs cannot opt in by using an image extension.
  const asset = pathname === normalized && publicAssetPath(pathname);
  if (asset && ['GET', 'HEAD'].includes(request.method)) {
    if (asset === pathname) return next({ headers: PUBLIC_ASSET_CACHE_HEADERS });
    const target = new URL(request.url); target.pathname = asset;
    return rewrite(target, { headers: PUBLIC_ASSET_CACHE_HEADERS });
  }
  const lessonPath=normalized.toLowerCase();
  if (lessonPath === '/learn/classroom' || lessonPath.startsWith('/learn/classroom/')) {
    if(pathname!==normalized||!(normalized==='/learn/classroom'||normalized.startsWith('/learn/classroom/')))return new Response('Not found',{status:404,headers:privateHeaders});
    const destination=new URL('/classroom'+normalized.slice('/learn/classroom'.length),request.url);
    if(destination.pathname==='/classroom')destination.pathname+='/';
    destination.search=url.search;
    return new Response(null,{status:307,headers:{...privateHeaders,Location:destination.toString()}});
  }
  if (lessonPath === '/classroom' || lessonPath.startsWith('/classroom/')) {
    // The route prefix is canonical; file names may legitimately contain capitals.
    if(pathname!==normalized||!(normalized==='/classroom'||normalized.startsWith('/classroom/')))return new Response('Not found',{status:404,headers:privateHeaders});
    if(!normalized.endsWith('/')&&!normalized.split('/').pop().includes('.')) {
      const directory=new URL(request.url);directory.pathname=normalized+'/';
      return new Response(null,{status:307,headers:{...privateHeaders,Location:directory.toString()}});
    }
    const target=new URL('/api/learn-foundation',request.url);
    target.searchParams.set('file',normalized.slice('/classroom/'.length)||'index.html');
    // Keep the original intent (including from=dungeon) separate from the
    // server-controlled file key. A supplied query must never select a file.
    target.searchParams.set('return', normalized + url.search);
    return rewrite(target,{headers:privateHeaders});
  }
  const legacySamplePath = lessonPath.replace(/\/+$/, '');
  if (legacySamplePath === '/ai-source/assets/ep01_sample.mp4' || legacySamplePath === '/ai-source/assets/ep01_captions.srt') {
    return new Response(null,{status:307,headers:{...privateHeaders,Location:new URL('/classroom/',request.url).toString()}});
  }
  // Guard source files before the general API and dotted-asset exemptions.
  // The all-path matcher also catches encoded shelf aliases before static routing.
  if (isPrivateShelfPath(normalized)) {
    return new Response('เปิดชั้นวางซอสและใส่กุญแจที่ /shelf/', {
      status: 403,
      headers: { ...privateHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }
  // Classroom content is also checked by /api/course-content before serving.
  const classroomPath = normalized.toLowerCase();
  const legacyRoom = classroomPath === '/course/thedent' || classroomPath.startsWith('/course/thedent/');
  const currentRoom = classroomPath === '/course/thedent912' || classroomPath.startsWith('/course/thedent912/');
  if (legacyRoom || currentRoom) {
    // Encoded aliases must never fall through to Vercel's public static cache,
    // even for signed-in users. Only the canonical API-backed route is served.
    if (pathname !== normalized || normalized !== classroomPath) return new Response('Not found', { status: 404, headers: privateHeaders });
    if (legacyRoom) {
      const canonical = new URL(request.url);
      canonical.pathname = '/course/thedent912' + pathname.slice('/course/thedent'.length);
      if (canonical.pathname === '/course/thedent912') canonical.pathname += '/';
      // A redirect without a fragment lets browsers retain the original hash.
      return new Response(null, { status: 307, headers: { ...privateHeaders, Location: canonical.toString() } });
    }
    const admitted = await verifyCourseSession(request.headers.get('cookie') || '');
    if (!admitted) {
      const headers = { ...privateHeaders };
      if (/\.(?!html?$)[a-z0-9]+$/i.test(pathname)) {
        return new Response('Authentication required', { status: 401, headers });
      }
      const login = new URL('/course/', request.url);
      login.searchParams.set('project', 'thedent');
      login.searchParams.set('next', (pathname === '/course/thedent912' ? '/course/thedent912/' : pathname) + url.search);
      headers.Location = login.toString();
      return new Response(null, { status: 307, headers });
    }
    if (pathname === '/course/thedent912') {
      const canonical = new URL(request.url);
      canonical.pathname += '/';
      return new Response(null, { status: 307, headers: { ...privateHeaders, Location: canonical.toString() } });
    }
    // Resolve the dated classroom through its authenticated content handler,
    // including the directory root, which has no physical static directory.
    const target = new URL('/api/course-content', request.url);
    target.searchParams.set('file', pathname.slice('/course/thedent912/'.length));
    return rewrite(target);
  }

  // Preserve the original matcher exemptions for unrelated routes.
  if (/^\/(?:api|_next|_vercel)/.test(pathname) || pathname.includes('.')) return next();

  const isAkoDomain = url.hostname === 'ako.myclover.com';
  const isPreviewCheck =
    process.env.VERCEL_ENV !== 'production' &&
    url.searchParams.get('__ako_preview') === '1';

  // Preserve the existing Ako root behavior. The previous middleware only
  // matched '/', so keep this rewrite scoped to the root after broadening
  // the matcher for trailing-slash normalization.
  if ((isAkoDomain || isPreviewCheck) && pathname === '/') {
    return rewrite(new URL('/ako/index.html', request.url));
  }

  // Canonicalize every extensionless page-like path to its directory form.
  // Query parameters are preserved. API routes and asset files are excluded
  // by the matcher above, so /api/... and /foo.js are not touched.
  if (pathname !== '/' && !pathname.endsWith('/') && !pathname.split('/').pop().includes('.')) {
    const canonical = new URL(request.url);
    canonical.pathname = `${pathname}/`;
    return Response.redirect(canonical, 307);
  }

  return next();
}
