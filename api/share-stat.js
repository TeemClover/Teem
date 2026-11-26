/* /api/share-stat
   POST  บันทึกเหตุการณ์จากหน้า /share และหน้าปลายทาง (ไม่ต้องล็อกอิน ต้องมาจากเว็บเดียวกัน)
   GET   สรุปสถิติให้หน้า /share/stat (ต้องล็อกอินหลังบ้าน) ?days=1|7|30|90|0 (0 = ทั้งหมด) */
import { database } from './_lib/core.js';
import { currentBackofficeSession, ensureBackofficeSchema } from './_lib/backoffice-auth.js';
import { RANGES, createShareStatStore, ensureShareStatSchema, sameOrigin, validateEvent } from './_lib/share-stat.js';

export function createHandler({
  connect = database,
  authenticate = currentBackofficeSession,
  ensureAuth = ensureBackofficeSchema,
  ensure = ensureShareStatSchema,
  store = createShareStatStore,
} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Vary', 'Cookie, Origin');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (code, body) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    if (!['GET', 'POST'].includes(req.method)) return reply(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    if (!sameOrigin(req)) return reply(403, { ok: false, error: 'BAD_ORIGIN' });

    let event;
    if (req.method === 'POST') {
      if (/bot|crawler|spider|headless|lighthouse|preview/i.test(req.headers['user-agent'] || '')) return reply(202, { ok: true, ignored: true });
      try {
        const raw = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? String(req.body) : JSON.stringify(req.body || null);
        if (!raw || Buffer.byteLength(raw) > 2000) return reply(413, { ok: false, error: 'BODY_TOO_LARGE' });
        event = validateEvent(JSON.parse(raw));
      } catch { return reply(400, { ok: false, error: 'INVALID_DATA' }); }
      if (!event) return reply(400, { ok: false, error: 'INVALID_DATA' });
    }

    try {
      const sql = connect();
      if (req.method === 'POST') {
        await ensure(sql);
        const accepted = await store(sql).accept(req, event);
        return reply(accepted ? 202 : 429, { ok: accepted });
      }
      let session = null;
      if (String(req.headers.cookie || '').includes('mc_backoffice_session=')) {
        try { session = await authenticate(sql, req); } catch { await ensureAuth(sql); session = await authenticate(sql, req); }
      }
      if (!session) return reply(401, { ok: false, error: 'AUTH_REQUIRED' });
      const days = Number(req.query?.days ?? new URL(req.url, 'https://localhost').searchParams.get('days') ?? 7);
      if (!RANGES.includes(days)) return reply(400, { ok: false, error: 'BAD_RANGE' });
      await ensure(sql);
      return reply(200, { ok: true, ...await store(sql).report(days) });
    } catch (error) {
      console.error(JSON.stringify({ route: 'share-stat', event: 'error', method: req.method, code: error?.code || 'STORAGE_UNAVAILABLE' }));
      return reply(503, { ok: false, error: 'STORAGE_UNAVAILABLE' });
    }
  };
}

export default createHandler();
