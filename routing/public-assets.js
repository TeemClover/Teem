import { PUBLIC_ASSET_INVENTORY } from './public-asset-inventory.js';

// Stable filenames can change on a later deployment. Keep repeated views fast
// for five minutes in the browser, then validate ETag/Last-Modified. The CDN
// may reuse them for an hour; Vercel deploys invalidate the old static output.
// No unversioned file gets year-long immutable caching or a session lookup.
export const PUBLIC_ASSET_CACHE_HEADERS = Object.freeze({
  'Cache-Control': 'public, max-age=300, must-revalidate',
  'CDN-Cache-Control': 'public, max-age=3600, must-revalidate',
  'Vercel-CDN-Cache-Control': 'public, max-age=3600, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
});

const published = new Set(PUBLIC_ASSET_INVENTORY);

// Return the physical static path, never an arbitrary pathname supplied by an
// API caller. This policy is independent of login, but grants no HTML, source
// document, private upload or content-data access. All other routes continue
// through their own authentication and authorization checks.
export function publicAssetPath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')
      || /[%\\\u0000-\u0020\u007f?#]/.test(pathname)
      || pathname.includes('//') || pathname.split('/').some(part => part === '.' || part === '..')) return null;
  let physical = pathname;
  if (pathname.startsWith('/learn/classroom/')) physical = pathname.slice('/learn'.length);
  else if (pathname.startsWith('/course/thedent912/')) physical = '/course/thedent/' + pathname.slice('/course/thedent912/'.length);
  return published.has(physical) ? physical : null;
}
