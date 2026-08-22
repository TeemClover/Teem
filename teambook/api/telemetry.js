import { currentUser, database, ensureSchema, sameOrigin, sendJson } from './_lib/core.js';
import {
  analyticsCookies, ensureTelemetrySchema, normalizeActor, normalizeEvent,
  recordTelemetry, sessionId, visitorId,
} from './_lib/telemetry.js';

const WHITE_CAT_GUIDE_ID = 'xvisor_white_cat_silver';
const XIRCLE_PRESETS = new Set(['xircle', 'xircle_xvisor']);

function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

async function enrichBookContext(sql, event) {
  if (!event.bookCode) return;
  try {
    const rows = await sql.query(`SELECT id,preset,pet_id FROM teambook_books WHERE code=$1 LIMIT 1`, [event.bookCode]);
    const book = rows[0];
    if (!book) {
      event.metadata = { ...event.metadata, bookKnown: '0' };
      return;
    }
    const cohort = XIRCLE_PRESETS.has(String(book.preset || '').toLowerCase()) ? 'xircle' : 'normal';
    const whiteCat = String(book.pet_id || '') === WHITE_CAT_GUIDE_ID;
    /* Never persist the five-digit invite code in analytics. Resolve it to the
       stable internal book id and a small, explicit cohort vocabulary here. */
    event.metadata = {
      ...event.metadata,
      bookKnown: '1',
      bookId: String(book.id),
      cohort,
      whiteCat: whiteCat ? '1' : '0',
    };
  } finally {
    delete event.bookCode;
  }
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
    await enrichBookContext(sql, event);
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
