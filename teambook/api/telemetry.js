import { currentUser, database, ensureSchema, sameOrigin, sendJson } from './_lib/core.js';
import {
  analyticsCookies, ensureTelemetrySchema, normalizeActor, normalizeEvent,
  recordTelemetry, sessionId, visitorId,
} from './_lib/telemetry.js';

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
  if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  const event = normalizeEvent(bodyOf(req));
  if (!event) return sendJson(res, { ok: false, error: 'BAD_TELEMETRY_EVENT' }, 400);

  let sql;
  try {
    sql = database();
    await ensureSchema(sql);
    await ensureTelemetrySchema(sql);
  } catch (error) {
    console.error('TeamBook telemetry storage unavailable', error);
    return sendJson(res, { ok: false, error: 'TELEMETRY_STORAGE_UNAVAILABLE' }, 503);
  }

  try {
    const account = await currentUser(req, sql).catch(() => null);
    const actorId = normalizeActor(account, event.localProfileId);
    const visitor = visitorId(req);
    const session = sessionId(req);
    res.setHeader('Set-Cookie', analyticsCookies(visitor, session));
    const result = await recordTelemetry(sql, { visitor, session, actorId, event });
    return sendJson(res, { ok: true, duplicate: !!result.duplicate }, 202);
  } catch (error) {
    console.error('TeamBook telemetry record failed', error);
    return sendJson(res, { ok: false, error: 'TELEMETRY_WRITE_FAILED' }, 500);
  }
}
