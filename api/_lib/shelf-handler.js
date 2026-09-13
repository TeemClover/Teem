import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { shelfCatalogPreview } from './shelf-content.js';

export const SHELF_COOKIE = 'mc_shelf_session';
const BODY_LIMIT = 8192;
const SESSION_MS = 7 * 86400000;
const LOGIN_WINDOW_MS = 15 * 60000;
export const shelfDigest = value => createHash('sha256').update(String(value), 'utf8').digest('hex');

function reply(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res.end(JSON.stringify(body));
}
const fail = (res, error, status) => reply(res, { ok: false, error }, status);

function cookie(req) {
  for (const part of String(req.headers?.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === SHELF_COOKIE) {
      try {
        const value = decodeURIComponent(part.slice(index + 1).trim());
        return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
      } catch { return ''; }
    }
  }
  return '';
}

function sessionCookie(token = '', maxAge = 0) {
  return `${SHELF_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function sameOrigin(req) {
  if (String(req.headers?.['sec-fetch-site'] || '') === 'cross-site') return false;
  const origin = String(req.headers?.origin || '');
  if (!origin) return true;
  const proto = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
  return Boolean(host && origin === `${proto}://${host}`);
}

function bodyOf(req) {
  const declared = Number(req.headers?.['content-length'] || 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > BODY_LIMIT) return { error: 'BODY_TOO_LARGE', status: 413 };
  const contentType = String(req.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') return { error: 'JSON_REQUIRED', status: 415 };
  try {
    const raw = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(raw, 'utf8') > BODY_LIMIT) return { error: 'BODY_TOO_LARGE', status: 413 };
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'INVALID_JSON', status: 400 };
    return { body };
  } catch { return { error: 'INVALID_JSON', status: 400 }; }
}

function actionOf(req) {
  const candidate = req.query?.action ?? new URL(req.url || '/', 'https://shelf.local').searchParams.get('action');
  return typeof candidate === 'string' ? candidate : 'session';
}

function sessionResult(session) {
  return {
    ok: true, authenticated: Boolean(session),
    user: session ? { id: session.key.userId, name: session.key.name } : null,
    expiresAt: session?.expiresAt || null, sourceIds: session?.key.sourceIds ?? null,
  };
}

function publicKey(key) {
  return { id: key.id, userId: key.userId, name: key.name, prefix: key.prefix, sourceIds: key.sourceIds,
    createdAt: key.createdAt, expiresAt: key.expiresAt, revokedAt: key.revokedAt, lastUsedAt: key.lastUsedAt };
}

export function createShelfHandler({ getRepository, readCatalog, readSource, isAdmin = async () => false,
  now = () => new Date(), makeToken = size => randomBytes(size).toString('base64url') }) {
  return async function handler(req, res) {
    const method = String(req.method || '').toUpperCase();
    if (!['GET', 'POST'].includes(method)) return fail(res, 'METHOD_NOT_ALLOWED', 405);
    if (!sameOrigin(req)) return fail(res, 'BAD_ORIGIN', 403);
    const parsed = method === 'POST' ? bodyOf(req) : { body: {} };
    if (parsed.error) return fail(res, parsed.error, parsed.status);
    const body = parsed.body;
    const action = method === 'POST' ? body.action : actionOf(req);
    const allowed = method === 'POST' ? ['unlock', 'logout', 'take', 'create-key', 'revoke-key'] : ['session', 'catalog', 'admin'];
    if (!allowed.includes(action)) return fail(res, 'UNKNOWN_ACTION', 400);

    try {
      if (action === 'catalog') return reply(res, { ok: true, catalog: shelfCatalogPreview(await readCatalog()) });
      const repository = await getRepository();
      const at = new Date(now());
      const token = cookie(req);
      const tokenHash = token ? shelfDigest(token) : '';

      if (action === 'session') {
        const session = tokenHash ? await repository.session(tokenHash, at) : null;
        if (token && !session) res.setHeader('Set-Cookie', sessionCookie());
        return reply(res, sessionResult(session));
      }
      if (action === 'unlock') {
        const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 120);
        const bucket = shelfDigest(`shelf-unlock|${ip}|${Math.floor(at.getTime() / LOGIN_WINDOW_MS)}`);
        if (await repository.rateLimited(bucket, at, 8, LOGIN_WINDOW_MS)) {
          res.setHeader('Retry-After', String(Math.ceil((LOGIN_WINDOW_MS - at.getTime() % LOGIN_WINDOW_MS) / 1000)));
          return fail(res, 'TOO_MANY_ATTEMPTS', 429);
        }
        const key = typeof body.key === 'string' ? body.key.trim() : '';
        const record = /^SAUCE_[A-Za-z0-9_-]{32}$/.test(key) ? await repository.activeKey(shelfDigest(key), at) : null;
        if (!record) return fail(res, 'INVALID_KEY', 401);
        const sessionToken = makeToken(32);
        const expiresAt = new Date(Math.min(at.getTime() + SESSION_MS, record.expiresAt ? new Date(record.expiresAt).getTime() : Infinity));
        if (!await repository.createSession(shelfDigest(sessionToken), record.id, at, expiresAt)) return fail(res, 'INVALID_KEY', 401);
        // Rotate a prior browser session without creating a membership account.
        if (tokenHash) await repository.destroySession(tokenHash);
        res.setHeader('Set-Cookie', sessionCookie(sessionToken, Math.floor((expiresAt.getTime() - at.getTime()) / 1000)));
        return reply(res, sessionResult({ key: record, expiresAt: expiresAt.toISOString() }));
      }
      if (action === 'logout') {
        if (tokenHash) await repository.destroySession(tokenHash);
        res.setHeader('Set-Cookie', sessionCookie());
        return reply(res, sessionResult(null));
      }
      if (action === 'take') {
        const session = tokenHash ? await repository.session(tokenHash, at) : null;
        if (!session) {
          res.setHeader('Set-Cookie', sessionCookie());
          return fail(res, 'AUTH_REQUIRED', 401);
        }
        if (!['open', 'copy', 'download'].includes(body.kind)) return fail(res, 'INVALID_KIND', 400);
        if (typeof body.id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(body.id)) return fail(res, 'SOURCE_NOT_FOUND', 404);
        const catalog = await readCatalog();
        const source = catalog.sources.find(item => item.id === body.id);
        if (!source) return fail(res, 'SOURCE_NOT_FOUND', 404);
        if (session.key.sourceIds !== null && !session.key.sourceIds.includes(source.id)) return fail(res, 'SOURCE_FORBIDDEN', 403);
        const content = await readSource(source);
        // Logging records an authorized content response, not proof that the
        // recipient read it, saved it successfully, or later used it with AI.
        if (!await repository.recordServe(tokenHash, source, body.kind, new Date(now()))) return fail(res, 'AUTH_REQUIRED', 401);
        return reply(res, { ok: true, source: { id: source.id, title: source.title, version: source.version, content } });
      }

      if (!await isAdmin(req, repository)) return fail(res, 'ADMIN_AUTH_REQUIRED', 401);
      const catalog = await readCatalog();
      if (action === 'admin') {
        const snapshot = await repository.adminSnapshot(at);
        return reply(res, { ok: true, ...snapshot, keys: snapshot.keys.map(publicKey), sources: catalog.sources.map(({ id, title }) => ({ id, title })) });
      }
      if (action === 'revoke-key') {
        if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/.test(body.id)) return fail(res, 'KEY_NOT_FOUND', 404);
        const key = await repository.revokeKey(body.id, at);
        return key ? reply(res, { ok: true, key: publicKey(key) }) : fail(res, 'KEY_NOT_FOUND', 404);
      }
      const existingUser = body.userId ? await repository.userById(String(body.userId)) : null;
      if (body.userId && !existingUser) return fail(res, 'USER_NOT_FOUND', 404);
      const name = existingUser?.name || (typeof body.name === 'string' ? body.name.replace(/[\u0000-\u001F\u007F]/g, '').trim() : '');
      if (!name || name.length > 100) return fail(res, 'INVALID_NAME', 400);
      const expiresDays = body.expiresDays == null ? 0 : Number(body.expiresDays);
      if (!Number.isInteger(expiresDays) || expiresDays < 0 || expiresDays > 365) return fail(res, 'INVALID_EXPIRY', 400);
      if (body.sourceIds != null && !Array.isArray(body.sourceIds)) return fail(res, 'INVALID_SCOPE', 400);
      const sourceIds = body.sourceIds?.length ? [...new Set(body.sourceIds)] : null;
      if (sourceIds && sourceIds.some(id => typeof id !== 'string' || !catalog.sources.some(source => source.id === id))) return fail(res, 'INVALID_SCOPE', 400);
      const rawKey = `SAUCE_${makeToken(24)}`;
      const record = { id: randomUUID(), userId: existingUser?.id || randomUUID(), name, keyHash: shelfDigest(rawKey), prefix: `${rawKey.slice(0, 12)}…`,
        sourceIds, createdAt: at, expiresAt: expiresDays ? new Date(at.getTime() + expiresDays * 86400000) : null };
      const key = await repository.createKey(record);
      return reply(res, { ok: true, key: publicKey(key), rawKey, user: { id: record.userId, name, createdAt: at.toISOString() } }, 201);
    } catch {
      // No database errors, connection strings, key material, or source bodies
      // are reflected into responses or logs.
      return fail(res, 'STORAGE_UNAVAILABLE', 503);
    }
  };
}
