import { database, ensureSchema, sendJson } from './_lib/core.js';
import {
  backofficeLoginBlocked,
  backofficePasswordMatches,
  backofficeSessionCookie,
  clearBackofficeSessionCookie,
  createBackofficeSession,
  currentBackofficeSession,
  destroyBackofficeSession,
  ensureBackofficeSchema,
  pruneBackofficeAuth,
  recordBackofficeFailure,
} from './_lib/backoffice-auth.js';

function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return origin === `${proto}://${host}`;
}

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

  let sql;
  try {
    sql = database();
    await ensureSchema(sql);
    await ensureBackofficeSchema(sql);
    await pruneBackofficeAuth(sql);
  } catch (error) {
    console.error('Backoffice auth init failed', error);
    return sendJson(res, { ok: false, error: error?.code || 'BACKOFFICE_STORAGE_UNAVAILABLE' }, 503);
  }

  if (req.method === 'GET') {
    const session = await currentBackofficeSession(sql, req);
    return sendJson(res, {
      ok: true,
      authenticated: Boolean(session),
      expiresAt: session?.expiresAt || null,
    });
  }

  const body = bodyOf(req);
  const action = String(body.action || 'login').slice(0, 20);

  if (action === 'logout') {
    await destroyBackofficeSession(sql, req);
    res.setHeader('Set-Cookie', clearBackofficeSessionCookie());
    return sendJson(res, { ok: true, authenticated: false });
  }

  if (action !== 'login') return sendJson(res, { ok: false, error: 'UNKNOWN_ACTION' }, 400);
  if (await backofficeLoginBlocked(sql, req)) return sendJson(res, { ok: false, error: 'TOO_MANY_ATTEMPTS' }, 429);

  const password = typeof body.password === 'string' ? body.password : '';
  if (!backofficePasswordMatches(password)) {
    await recordBackofficeFailure(sql, req);
    return sendJson(res, { ok: false, error: 'BAD_PASSWORD' }, 401);
  }

  const session = await createBackofficeSession(sql, req);
  res.setHeader('Set-Cookie', backofficeSessionCookie(session.token));
  return sendJson(res, { ok: true, authenticated: true, expiresAt: session.expiresAt });
}
