import { next, rewrite } from '@vercel/functions';

export const config = {
  matcher: '/',
};

export default function middleware(request) {
  const url = new URL(request.url);
  const isAkoDomain = url.hostname === 'ako.myclover.com';
  const isPreviewCheck =
    process.env.VERCEL_ENV !== 'production' &&
    url.searchParams.get('__ako_preview') === '1';

  if (isAkoDomain || isPreviewCheck) {
    return rewrite(new URL('/ako/index.html', request.url));
  }

  return next();
}
