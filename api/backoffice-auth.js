import { database, sendJson } from './_lib/core.js';
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

async function currentSessionFast(sql, req) {
  try {
    return await currentBackofficeSession(sql, req);
  } catch (error) {
    // Cold-start fallback only. Existing production sessions skip schema creation entirely.
    await ensureBackofficeSchema(sql);
    return currentBackofficeSession(sql, req);
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

  let sql;
  try {
    sql = database();
  } catch (error) {
    console.error('Backoffice database init failed', error);
    return sendJson(res, { ok: false, error: error?.code || 'BACKOFFICE_STORAGE_UNAVAILABLE' }, 503);
  }

  if (req.method === 'GET') {
    try {
      const session = await currentSessionFast(sql, req);
      return sendJson(res, { ok: true, authenticated: Boolean(session), expiresAt: session?.expiresAt || null });
    } catch (error) {
      console.error('Backoffice session lookup failed', error);
      return sendJson(res, { ok: false, error: 'BACKOFFICE_SESSION_FAILED' }, 500);
    }
  }

  try {
    await ensureBackofficeSchema(sql);
  } catch (error) {
    console.error('Backoffice auth schema failed', error);
    return sendJson(res, { ok: false, error: error?.code || 'BACKOFFICE_STORAGE_UNAVAILABLE' }, 503);
  }

  const body = bodyOf(req);
  const action = String(body.action || 'login').slice(0, 20);

  if (action === 'logout') {
    await destroyBackofficeSession(sql, req);
    res.setHeader('Set-Cookie', clearBackofficeSessionCookie());
    return sendJson(res, { ok: true, authenticated: false });
  }

  if (action !== 'login') return sendJson(res, { ok: false, error: 'UNKNOWN_ACTION' }, 400);

  // Cleanup is useful on a write path, but no longer blocks every page unlock.
  await pruneBackofficeAuth(sql).catch(() => {});
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
