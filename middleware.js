import { next, rewrite } from '@vercel/functions';
import { verifyCourseSession } from './api/_lib/course-access.js';

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
  // Classroom content is also checked by /api/course-content before serving.
  const classroomPath = normalized.toLowerCase();
  if (classroomPath === '/course/thedent' || classroomPath.startsWith('/course/thedent/')) {
    // Encoded aliases must never fall through to Vercel's public static cache,
    // even for signed-in users. Only the canonical API-backed route is served.
    if (pathname !== normalized || normalized !== classroomPath) return new Response('Not found', { status: 404, headers: privateHeaders });
    const admitted = await verifyCourseSession(request.headers.get('cookie') || '');
    if (!admitted) {
      const headers = { ...privateHeaders };
      if (/\.(?!html?$)[a-z0-9]+$/i.test(pathname)) {
        return new Response('Authentication required', { status: 401, headers });
      }
      const login = new URL('/course/', request.url);
      login.searchParams.set('project', 'thedent');
      login.searchParams.set('next', (pathname === '/course/thedent' ? '/course/thedent/' : pathname) + url.search);
      headers.Location = login.toString();
      return new Response(null, { status: 307, headers });
    }
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
