// Shared by browser entry points and server/edge redirects. Query values may
// contain URLs; only the destination path determines where navigation goes.
export function safeRelativeReturn(value, fallback = '/card/') {
  if (typeof value !== 'string' || value.length > 4096 || !value.startsWith('/')
    || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://myclover.invalid');
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://myclover.invalid' || decodedPath.startsWith('//')
      || /[\\\u0000-\u001f\u007f]/.test(decodedPath)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
