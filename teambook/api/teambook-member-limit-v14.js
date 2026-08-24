import { database, ensureSchema, sendJson } from './_lib/core.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 11;

function clampLimit(value) {
  const n = Math.floor(Number(value || DEFAULT_LIMIT));
  return Number.isFinite(n) ? Math.min(MAX_LIMIT, Math.max(1, n)) : DEFAULT_LIMIT;
}

export default async function handler(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'GET') {
      return sendJson(res, { ok:false, error:'METHOD_NOT_ALLOWED' }, 405);
    }
    const raw = Array.isArray(req.query?.code) ? req.query.code : String(req.query?.code || '').split(',');
    const codes = [...new Set(raw.map(value => String(value || '').trim()).filter(value => /^\d{5}$/.test(value)))].slice(0, 30);
    if (!codes.length) return sendJson(res, { ok:true, books:{} });

    const sql = database();
    await ensureSchema(sql);
    const rows = await sql.query(`SELECT p.code,
        COUNT(m.user_id) FILTER (WHERE m.left_at IS NULL)::int AS member_count,
        COALESCE((
          SELECT e.data_json->>'memberLimit'
          FROM teambook_book_events e
          WHERE e.book_id=p.id AND e.type='PARTY_CREATED'
          ORDER BY e.created_at ASC LIMIT 1
        ), '5') AS member_limit
      FROM teambook_books p
      LEFT JOIN teambook_book_members m ON m.book_id=p.id
      WHERE p.code = ANY($1::text[])
      GROUP BY p.id,p.code`, [codes]);

    const books = {};
    for (const row of rows) {
      const memberLimit = clampLimit(row.member_limit);
      const memberCount = Math.max(0, Number(row.member_count || 0));
      books[row.code] = {
        memberLimit,
        memberCount,
        remaining: Math.max(0, memberLimit - memberCount),
        full: memberCount >= memberLimit,
      };
    }
    return sendJson(res, { ok:true, books });
  } catch (error) {
    console.error('TeamBook member capacity read failed', error);
    return sendJson(res, { ok:false, error:error.code || 'TEAMBOOK_API_ERROR' }, 500);
  }
}
