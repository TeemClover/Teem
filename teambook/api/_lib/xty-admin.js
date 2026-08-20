import { clean, sendJson } from './core.js';
import { dissolveXtyParty } from './xty-dissolve.js';
import {
  adminLoginBlocked, adminPasswordMatches, adminSessionCookie, clearAdminSessionCookie,
  createAdminSession, currentAdminSession, destroyAdminSession, pruneAdminAuth,
  ensureXtyAdminSchema, recordAdminLoginFailure, TEAMBOOK_ADMIN_LOGIN_LIMIT,
} from './xty-admin-auth.js';
import {
  getAdminActivity, getAdminCards, getAdminEvents, getAdminParties, getAdminPartyDetail,
  getAdminSummary, getAdminSystem, getAdminUsers,
} from './xty-admin-stats-v2.js';

const ACTIVE_PARTY_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function safeErrorCode(error) {
  const value = String(error?.code || 'ADMIN_STATS_ERROR');
  return /^[A-Z0-9_]{2,60}$/i.test(value) ? value : 'ADMIN_STATS_ERROR';
}

export async function handleXtyAdmin(req, res, sql, method, parts) {
  try {
    const action = String(parts[1] || 'session').toLowerCase();

    // The visible password screen is intentionally only a lightweight client gate.
    // These server-auth routes stay for backwards compatibility, but read-only
    // dashboard data no longer depends on them.
    if (method === 'POST' && action === 'login') {
      await ensureXtyAdminSchema(sql);
      if (!process.env.TEAMBOOK_ADMIN_PASSWORD) {
        return sendJson(res, { ok: false, error: 'ADMIN_NOT_CONFIGURED' }, 503);
      }
      if (await adminLoginBlocked(sql, req)) {
        return sendJson(res, { ok: false, error: 'ADMIN_RATE_LIMITED', message: 'ลองใหม่ภายหลัง' }, 429);
      }
      const password = clean(bodyOf(req).password, 200);
      if (!adminPasswordMatches(password)) {
        const hits = await recordAdminLoginFailure(sql, req);
        return sendJson(res, {
          ok: false, error: hits >= TEAMBOOK_ADMIN_LOGIN_LIMIT ? 'ADMIN_RATE_LIMITED' : 'ADMIN_LOGIN_FAILED',
          message: 'รหัสไม่ถูก',
        }, hits >= TEAMBOOK_ADMIN_LOGIN_LIMIT ? 429 : 401);
      }
      const session = await createAdminSession(sql, req);
      res.setHeader('Set-Cookie', adminSessionCookie(session.token));
      return sendJson(res, { ok: true, expiresAt: session.expiresAt.toISOString() });
    }

    if (method === 'POST' && action === 'logout') {
      await ensureXtyAdminSchema(sql);
      await destroyAdminSession(sql, req);
      res.setHeader('Set-Cookie', clearAdminSessionCookie());
      return sendJson(res, { ok: true });
    }

    /* Destructive recovery tools. Unlike the read-only dashboard these do NOT
       accept the lightweight client gate — they need a real server admin
       session, because they end other people's parties. */
    if (method === 'POST' && (action === 'party-dissolve' || action === 'ghosts')) {
      await ensureXtyAdminSchema(sql);
      if (!process.env.TEAMBOOK_ADMIN_PASSWORD) {
        return sendJson(res, { ok: false, error: 'ADMIN_NOT_CONFIGURED' }, 503);
      }
      if (!(await currentAdminSession(sql, req))) {
        return sendJson(res, { ok: false, error: 'ADMIN_AUTH_REQUIRED' }, 401);
      }

      /* A book nobody can reach: active, but no live member is bound to a
         TeamBook account, so login cannot recover or end it. */
      if (action === 'ghosts') {
        const rows = await sql.query(`SELECT p.code,p.name,p.state,p.created_at,p.updated_at,
            COUNT(m.user_id) FILTER (WHERE m.left_at IS NULL)::int AS live_members
          FROM teambook_books p
          LEFT JOIN teambook_book_members m ON m.book_id=p.id
          WHERE p.state = ANY($1::text[])
            AND NOT EXISTS (
              SELECT 1 FROM teambook_book_members a
              WHERE a.book_id=p.id AND a.left_at IS NULL AND a.user_id LIKE 'account:%'
            )
          GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 200`, [ACTIVE_PARTY_STATES]);
        return sendJson(res, {
          ok: true,
          parties: rows.map(row => ({
            code: row.code, name: row.name, state: row.state,
            liveMembers: Number(row.live_members || 0),
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          })),
        });
      }

      const code = clean(bodyOf(req).code, 40);
      if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
      const rows = await sql.query(`SELECT id,code,state,ended_at FROM teambook_books
        WHERE upper(code)=upper($1) LIMIT 1`, [code]);
      const party = rows[0];
      if (!party) return sendJson(res, { ok: false, error: 'PARTY_NOT_FOUND_OR_CLOSED' }, 404);
      const dissolved = await dissolveXtyParty(sql, party, 'admin');
      if (!dissolved) return sendJson(res, { ok: false, error: 'PARTY_NOT_FOUND_OR_CLOSED' }, 404);
      return sendJson(res, {
        ok: true,
        code: party.code,
        state: 'DISSOLVED',
        removedMembers: dissolved.removedMembers,
      });
    }

    if (method !== 'GET') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

    if (action === 'session') {
      await ensureXtyAdminSchema(sql);
      const session = await currentAdminSession(sql, req);
      if (!session) return sendJson(res, { ok: false, error: 'ADMIN_AUTH_REQUIRED' }, 401);
      await pruneAdminAuth(sql);
      return sendJson(res, { ok: true, expiresAt: session.expiresAt.toISOString() });
    }

    // Overview and Parties use the resilient v2 stats queries so one optional
    // aggregate cannot take down the whole dashboard.
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

    // These legacy modules still reference the admin audit tables.
    if (action === 'system' || action === 'events') await ensureXtyAdminSchema(sql);
    if (action === 'system') return sendJson(res, { ok: true, ...(await getAdminSystem(sql)) });
    if (action === 'events') return sendJson(res, { ok: true, ...(await getAdminEvents(sql, req.query || {})) });
    return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
  } catch (error) {
    console.error('TeamBook admin failed', error);
    return sendJson(res, {
      ok: false,
      error: 'ADMIN_STATS_ERROR',
      detail: safeErrorCode(error),
    }, 500);
  }
}
