import { clean, sendJson } from './core.js';
import {
  adminLoginBlocked, adminPasswordMatches, adminSessionCookie, clearAdminSessionCookie,
  createAdminSession, currentAdminSession, destroyAdminSession, pruneAdminAuth,
  ensureXtyAdminSchema, recordAdminLoginFailure, XTY_ADMIN_LOGIN_LIMIT,
} from './xty-admin-auth.js';
import {
  getAdminActivity, getAdminCards, getAdminEvents, getAdminParties, getAdminPartyDetail,
  getAdminSummary, getAdminSystem, getAdminUsers,
} from './xty-admin-stats.js';

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }

export async function handleXtyAdmin(req, res, sql, method, parts) {
  await ensureXtyAdminSchema(sql);
  const action = String(parts[1] || 'session').toLowerCase();

  if (method === 'POST' && action === 'login') {
    if (!process.env.XTY_ADMIN_PASSWORD) {
      return sendJson(res, { ok: false, error: 'ADMIN_NOT_CONFIGURED' }, 503);
    }
    if (await adminLoginBlocked(sql, req)) {
      return sendJson(res, { ok: false, error: 'ADMIN_RATE_LIMITED', message: 'ลองใหม่ภายหลัง' }, 429);
    }
    const password = clean(bodyOf(req).password, 200);
    if (!adminPasswordMatches(password)) {
      const hits = await recordAdminLoginFailure(sql, req);
      return sendJson(res, {
        ok: false, error: hits >= XTY_ADMIN_LOGIN_LIMIT ? 'ADMIN_RATE_LIMITED' : 'ADMIN_LOGIN_FAILED',
        message: 'รหัสไม่ถูก',
      }, hits >= XTY_ADMIN_LOGIN_LIMIT ? 429 : 401);
    }
    const session = await createAdminSession(sql, req);
    res.setHeader('Set-Cookie', adminSessionCookie(session.token));
    return sendJson(res, { ok: true, expiresAt: session.expiresAt.toISOString() });
  }

  if (method === 'POST' && action === 'logout') {
    await destroyAdminSession(sql, req);
    res.setHeader('Set-Cookie', clearAdminSessionCookie());
    return sendJson(res, { ok: true });
  }

  const session = await currentAdminSession(sql, req);
  if (!session) return sendJson(res, { ok: false, error: 'ADMIN_AUTH_REQUIRED' }, 401);
  if (method !== 'GET') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  if (action === 'session') {
    await pruneAdminAuth(sql);
    return sendJson(res, { ok: true, expiresAt: session.expiresAt.toISOString() });
  }
  if (action === 'summary') return sendJson(res, { ok: true, ...(await getAdminSummary(sql, req.query?.range)) });
  if (action === 'parties') {
    const detailCode = clean(parts[2], 5);
    if (detailCode) {
      const detail = await getAdminPartyDetail(sql, detailCode);
      return detail ? sendJson(res, { ok: true, ...detail }) : sendJson(res, { ok: false, error: 'PARTY_NOT_FOUND' }, 404);
    }
    return sendJson(res, { ok: true, ...(await getAdminParties(sql, req.query || {})) });
  }
  if (action === 'users') return sendJson(res, { ok: true, ...(await getAdminUsers(sql, req.query || {})) });
  if (action === 'cards') return sendJson(res, { ok: true, ...(await getAdminCards(sql)) });
  if (action === 'activity') return sendJson(res, { ok: true, ...(await getAdminActivity(sql, req.query?.range)) });
  if (action === 'system') return sendJson(res, { ok: true, ...(await getAdminSystem(sql)) });
  if (action === 'events') return sendJson(res, { ok: true, ...(await getAdminEvents(sql, req.query || {})) });
  return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
}
