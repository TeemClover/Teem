import { next, rewrite } from '@vercel/functions';
import { verifyCourseSession } from './api/_lib/course-access.js';

export const config = {
  // Run for extensionless page routes, but leave APIs, Vercel internals,
  // and real asset files alone, except the protected classroom subtree.
  // This keeps relative assets resolving from
  // the intended directory (e.g. /xvisor -> /xvisor/).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/course/thedent/:path*'],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  // Classroom content is also checked by /api/course-content before serving.
  if (pathname === '/course/thedent' || pathname.startsWith('/course/thedent/')) {
    const admitted = await verifyCourseSession(request.headers.get('cookie') || '');
    if (!admitted) {
      const headers = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', 'Vary': 'Cookie' };
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
