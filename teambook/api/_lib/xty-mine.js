import { currentUser, database, ensureSchema, sendJson } from './core.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

export async function handleXtyMine(req, res) {
  let sql;
  try {
    if (req.method.toUpperCase() !== 'GET') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    sql = database();
    await ensureSchema(sql);

    const account = await currentUser(req, sql);
    if (!account) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const meUserId = `account:${account.id}`;
    const rows = await sql.query(`SELECT p.code,p.updated_at
      FROM teambook_book_members m
      JOIN teambook_books p ON p.id=m.book_id
      WHERE m.user_id=$1 AND m.left_at IS NULL
        AND p.state = ANY($2::text[])
      ORDER BY p.updated_at DESC,p.id DESC`, [meUserId, ACTIVE_STATES]);

    return sendJson(res, {
      ok: true,
      meUserId,
      codes: rows.map(row => row.code),
    });
  } catch (error) {
    console.error('TeamBook mine recovery failed', error);
    if (error?.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_RECOVERY_ERROR' }, 500);
  }
}

export default handleXtyMine;
