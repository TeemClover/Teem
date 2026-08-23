import { currentUser, database, sendJson, sha256 } from './_lib/core.js';

function validCode(value) {
  return /^\d{5}$/.test(String(value || ''));
}

async function canReadPrivateBook(req, sql, bookId) {
  /* Room pages normally carry their book token. Check it first so the hot
     pulse stays one cheap membership lookup instead of resolving account
     state on every tick. */
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token) {
    const rows = await sql.query(`SELECT 1 FROM teambook_book_members
      WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL LIMIT 1`, [bookId, await sha256(token)]);
    if (rows[0]) return true;
  }

  const account = await currentUser(req, sql);
  if (!account?.id) return false;
  const rows = await sql.query(`SELECT 1 FROM teambook_book_members
    WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL LIMIT 1`, [bookId, `account:${account.id}`]);
  return !!rows[0];
}

export default async function handler(req, res) {
  try {
    if (String(req.method || 'GET').toUpperCase() !== 'GET') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    const code = String(req.query?.code || '').trim();
    if (!validCode(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const sql = database();
    /* Deliberately no ensureSchema() here. Pulse is the hottest read path and
       the TeamBook schema is already owned by the normal API bootstrap. */
    const rows = await sql.query(`SELECT id,code,visibility,state,updated_at,head_seq
      FROM teambook_books WHERE code=$1 LIMIT 1`, [code]);
    const row = rows[0];
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    if (row.visibility !== 'public' && !(await canReadPrivateBook(req, sql, row.id))) {
      return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    }

    const updatedAt = new Date(row.updated_at).toISOString();
    const headSeq = Number(row.head_seq || 0);
    return sendJson(res, {
      ok: true,
      code: row.code,
      state: row.state,
      updatedAt,
      headSeq,
      version: `${updatedAt}|${headSeq}`,
    });
  } catch (error) {
    console.error('TeamBook pulse failed', error);
    return sendJson(res, { ok: false, error: 'TEAMBOOK_PULSE_ERROR' }, 500);
  }
}
