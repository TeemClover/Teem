import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { courseSessionCookie, issueCourseSession, verifyCourseSession } from './_lib/course-access.js';

export const COURSE_CONTENT_FILES = Object.freeze([
  'index.html', 'course.css', 'course.js', 'course-content.js', 'course-resources.js', 'daily-brief.html',
  'resources/workflow-template.md', 'resources/mini-prd-example.md', 'resources/instructor-guide.md',
  'resources/website-source-notes.md', 'resources/clinic-training-brief.md', 'resources/slide-notes.md',
  'resources/mini-prd-template.md', 'resources/followup-worksheet.md', 'resources/answer-key.md',
  'resources/workshop-1-example.md', 'resources/prompt-library.md', 'resources/create-markdown-guide.md',
  'resources/review-checklist.md', 'resources/clinic-public-source.md', 'resources/source-example.md',
  'resources/excel-csv-guide.md', 'resources/excel-prd.md', 'resources/thedent-branches.csv', 'resources/thedent-branches.xlsx',
  'downloads/the-dent-course-kit.zip',
  'fonts/ibm-plex-sans-thai-latin-400.woff2', 'fonts/ibm-plex-sans-thai-latin-600.woff2',
  'fonts/ibm-plex-sans-thai-latin-700.woff2', 'fonts/ibm-plex-sans-thai-thai-400.woff2',
  'fonts/ibm-plex-sans-thai-thai-600.woff2', 'fonts/ibm-plex-sans-thai-thai-700.woff2',
]);
const allowed = new Set(COURSE_CONTENT_FILES);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8', '.zip': 'application/zip', '.woff2': 'font/woff2',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function resolveCourseContentPath(file, root = process.cwd()) {
  if (typeof file !== 'string' || file.length > 200 || /[%\\\x00-\x20\x7f?#]/.test(file)) return null;
  const relative = file === '' ? 'index.html' : file;
  if (!allowed.has(relative)) return null;
  return path.join(root, 'course', 'thedent', relative);
}

function requestedFile(req) {
  let url;
  try { url = new URL(req.url || '/api/course-content', 'https://course.invalid'); } catch { return null; }
  const queryFiles = url.searchParams.getAll('file');
  if (queryFiles.length > 1) return null;
  const supplied = req.query?.file;
  if (supplied !== undefined && typeof supplied !== 'string') return null;
  if (queryFiles.length === 1 && supplied !== undefined && queryFiles[0] !== supplied) return null;
  // A platform rewrite may preserve the original URL. Prefer its actual path.
  if (url.pathname === '/course/thedent' || url.pathname === '/course/thedent/') {
    if ((supplied !== undefined && supplied !== '') || (queryFiles.length && queryFiles[0] !== '')) return null;
    return '';
  }
  if (url.pathname.startsWith('/course/thedent/')) {
    const fromPath = url.pathname.slice('/course/thedent/'.length);
    if ((supplied !== undefined && supplied !== fromPath) || (queryFiles.length && queryFiles[0] !== fromPath)) return null;
    return fromPath;
  }
  if (supplied !== undefined) return supplied;
  if (queryFiles.length === 1) return queryFiles[0];
  // The exact classroom-root rewrite has no `file` parameter. It is still
  // authenticated before this resolution, including when called directly.
  if (url.pathname === '/api/course-content' && !url.search && !Object.keys(req.query || {}).length) return '';
  return null;
}

function errorResponse(res, status, message, head) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(head ? undefined : JSON.stringify({ ok: false, error: message }));
}

export function createCourseContentHandler({ env = process.env, root = process.cwd(), now = () => Date.now() } = {}) {
  return async function handler(req, res) {
    const head = req.method === 'HEAD';
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && !head) {
      res.setHeader('Allow', 'GET, HEAD');
      return errorResponse(res, 405, 'Method not allowed', head);
    }
    if (!await verifyCourseSession(req.headers?.cookie, env, now())) return errorResponse(res, 401, 'Course access required', head);
    const file = requestedFile(req);
    const resolved = resolveCourseContentPath(file, root);
    if (!resolved) return errorResponse(res, 400, 'Invalid file request', head);
    try {
      const base = await realpath(path.join(root, 'course', 'thedent'));
      const actual = await realpath(resolved);
      const relative = path.relative(base, actual);
      if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) return errorResponse(res, 404, 'File not found', head);
      const details = await stat(actual);
      if (!details.isFile()) return errorResponse(res, 404, 'File not found', head);
      // A direct bookmarked return renews the remembered device as well.
      // Assets and HEAD checks do not issue competing session cookies.
      if (!head && path.extname(actual) === '.html') {
        res.setHeader('Set-Cookie', courseSessionCookie(await issueCourseSession(env, now())));
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', types[path.extname(actual)] || 'application/octet-stream');
      res.setHeader('Content-Length', String(details.size));
      if (file?.endsWith('.zip')) res.setHeader('Content-Disposition', 'attachment; filename="the-dent-course-kit.zip"');
      if (file?.endsWith('.xlsx')) res.setHeader('Content-Disposition', `attachment; filename="${path.basename(file)}"`);
      res.end(head ? undefined : await readFile(actual));
    } catch (error) {
      return errorResponse(res, ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, 'File unavailable', head);
    }
  };
}

export default createCourseContentHandler();
