import { next, rewrite } from '@vercel/functions';
import { isPrivateShelfPath } from './shelf/route-policy.js';

export const config = {
  // Run for extensionless page routes, but leave APIs, Vercel internals,
  // and real asset files alone. This keeps relative assets resolving from
  // the intended directory (e.g. /xvisor -> /xvisor/).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/shelf/:path*'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  // Static markdown and catalog paths must never bypass the key-checked API.
  // Include dotted shelf paths in the matcher: a client-side lock is insufficient.
  if (isPrivateShelfPath(pathname)) {
    return new Response('เปิดชั้นวางซอสและใส่กุญแจที่ /shelf/', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }
  // Shelf shell assets match explicitly; leave their filenames intact.
  if (pathname.startsWith('/shelf/') && pathname.includes('.')) return next();
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
  if (pathname !== '/' && !pathname.endsWith('/')) {
    const canonical = new URL(request.url);
    canonical.pathname = `${pathname}/`;
    return Response.redirect(canonical, 307);
  }

  return next();
}
