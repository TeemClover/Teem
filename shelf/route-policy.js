// Public shell files only. Source bytes are delivered by the authenticated API.
const publicPaths = new Set([
  '/shelf', '/shelf/', '/shelf/index.html', '/shelf/shelf.css', '/shelf/shelf.js',
  '/shelf/admin', '/shelf/admin/', '/shelf/admin/index.html', '/shelf/admin/admin.css', '/shelf/admin/admin.js',
]);

export function isPrivateShelfPath(pathname) {
  let normalized = pathname;
  try {
    for (let i = 0; i < 3; i += 1) {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) break;
      normalized = decoded;
    }
  } catch { return true; }
  normalized = normalized.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  if (normalized.toLowerCase() !== '/shelf' && !normalized.toLowerCase().startsWith('/shelf/')) return false;
  return !publicPaths.has(normalized);
}
