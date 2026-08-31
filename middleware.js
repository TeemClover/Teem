import { next, rewrite } from '@vercel/functions';

export const config = {
  // Run for extensionless page routes, but leave APIs, Vercel internals,
  // and real asset files alone. This keeps relative assets resolving from
  // the intended directory (e.g. /xvisor -> /xvisor/).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
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
