import {
  clearCourseSessionCookie,
  courseSessionCookie,
  isCourseConfigured,
  issueCourseSession,
  verifyCoursePassword,
  verifyCourseSession,
} from './_lib/course-access.js';
import { createCourseRateLimiter } from './_lib/course-rate-limit.js';

const MAX_BODY_BYTES = 4096;
const encoder = new TextEncoder();

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function sameOrigin(req) {
  const host = req.headers?.host;
  const origin = req.headers?.origin;
  if (typeof host !== 'string' || typeof origin !== 'string' || !host || /[\s/\\]/.test(host)) return false;
  try {
    const parsed = new URL(origin);
    const expected = new URL(`https://${host}`);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(expected.hostname);
    return parsed.origin === origin && parsed.host === expected.host && (parsed.protocol === 'https:' || (local && parsed.protocol === 'http:'));
  } catch {
    return false;
  }
}

function bodyError(status) {
  return Object.assign(new Error('Invalid request'), { status });
}

async function readBody(req) {
  const length = req.headers?.['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > MAX_BODY_BYTES)) throw bodyError(Number(length) > MAX_BODY_BYTES ? 413 : 400);
  let value = req.body;
  if (value === undefined) {
    if (!req[Symbol.asyncIterator]) throw bodyError(400);
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : new Uint8Array(chunk);
      size += bytes.byteLength;
      if (size > MAX_BODY_BYTES) throw bodyError(413);
      chunks.push(bytes);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  if (ArrayBuffer.isView(value)) value = new TextDecoder('utf-8', { fatal: true }).decode(value);
  if (typeof value === 'string') {
    if (encoder.encode(value).length > MAX_BODY_BYTES) throw bodyError(413);
    value = JSON.parse(value);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw bodyError(400);
  if (encoder.encode(JSON.stringify(value)).length > MAX_BODY_BYTES) throw bodyError(413);
  return value;
}

export function createCourseAccessHandler({ env = process.env, now = () => Date.now(), limiter } = {}) {
  const rateLimiter = limiter || createCourseRateLimiter({ env, now });
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie, Origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(res, 405, { ok: false, error: 'Method not allowed' });
    }
    if (!sameOrigin(req)) return reply(res, 403, { ok: false, error: 'Request not allowed' });
    if (typeof req.headers?.['content-type'] !== 'string' || req.headers['content-type'].split(';')[0].trim().toLowerCase() !== 'application/json') return reply(res, 415, { ok: false, error: 'JSON required' });
    let body;
    try { body = await readBody(req); } catch (error) {
      return reply(res, error.status === 413 ? 413 : 400, { ok: false, error: 'Invalid request' });
    }
    if (body.action === 'logout') {
      res.setHeader('Set-Cookie', clearCourseSessionCookie());
      return reply(res, 200, { ok: true, redirect: '/course/' });
    }
    if (body.action !== undefined && body.action !== 'status') return reply(res, 400, { ok: false, error: 'Invalid request' });
    if (body.project !== 'thedent') return reply(res, 401, { ok: false, error: 'Invalid access details' });
    if (!isCourseConfigured(env)) return reply(res, 503, { ok: false, error: 'Course access unavailable' });
    if (body.action === 'status') {
      if (!await verifyCourseSession(req.headers?.cookie, env, now())) return reply(res, 401, { ok: false, error: 'Invalid access details' });
      try {
        res.setHeader('Set-Cookie', courseSessionCookie(await issueCourseSession(env, now())));
        return reply(res, 200, { ok: true, redirect: '/course/thedent912/' });
      } catch {
        return reply(res, 503, { ok: false, error: 'Course access unavailable' });
      }
    }
    let attempt;
    try {
      attempt = await rateLimiter.consume(req, 'thedent');
      if (!attempt?.allowed) {
        res.setHeader('Retry-After', String(Math.max(1, Math.min(300, Number(attempt?.retryAfter) || 300))));
        return reply(res, 429, { ok: false, error: 'Please try again later' });
      }
    } catch {
      return reply(res, 503, { ok: false, error: 'Course access unavailable' });
    }
    if (!await verifyCoursePassword(body.password, env)) return reply(res, 401, { ok: false, error: 'Invalid access details' });
    try {
      await rateLimiter.clear(attempt.key);
      res.setHeader('Set-Cookie', courseSessionCookie(await issueCourseSession(env, now())));
      return reply(res, 200, { ok: true, redirect: '/course/thedent912/' });
    } catch {
      return reply(res, 503, { ok: false, error: 'Course access unavailable' });
    }
  };
}

export default createCourseAccessHandler();
