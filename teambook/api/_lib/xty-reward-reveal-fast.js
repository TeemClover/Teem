import { currentUser, database, ensureSchema, sameOrigin, sendJson, sha256 } from './core.js';
import { partyDateKey } from './xty-rules.js';
import { cardById } from '../../_shared/cards.js';

function codeOf(req) {
  const value = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  return /^\d{5}$/.test(String(value || '')) ? String(value) : '';
}

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

async function memberFor(req, sql, bookId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL LIMIT 1`, [bookId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers?.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id FROM teambook_book_members
    WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL LIMIT 1`, [bookId, await sha256(token)]);
  return rows[0] || null;
}

export async function handleRewardRevealFast(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    const code = codeOf(req);
    const rewardId = String(bodyOf(req).rewardId || '').trim().slice(0, 80);
    if (!code || !rewardId) return sendJson(res, { ok: false, error: 'INVALID_REWARD' }, 400);

    const sql = database();
    await ensureSchema(sql);
    const books = await sql.query(`SELECT id,code,state,timezone,head_seq FROM teambook_books
      WHERE code=$1 LIMIT 1`, [code]);
    const book = books[0];
    if (!book) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    const member = await memberFor(req, sql, book.id);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const rewards = await sql.query(`SELECT id,card_id,revealed_at,unlock_source FROM teambook_card_unlock_events
      WHERE id=$1 AND book_id=$2 AND user_id=$3
        AND unlock_source IN ('ending','first_seen') LIMIT 1`, [rewardId, book.id, member.user_id]);
    const reward = rewards[0];
    if (!reward) return sendJson(res, { ok: false, error: 'REWARD_NOT_FOUND' }, 404);
    if (reward.unlock_source === 'ending' && String(book.state || '').toUpperCase() !== 'COMPLETED') {
      return sendJson(res, { ok: false, error: 'REWARD_NOT_READY' }, 409);
    }
    if (reward.card_id && !cardById(reward.card_id)) {
      return sendJson(res, { ok: false, error: 'REWARD_CARD_INVALID' }, 409);
    }

    if (reward.revealed_at || !reward.card_id) {
      return sendJson(res, {
        ok: true,
        revealed: !!reward.revealed_at,
        cardId: reward.card_id || null,
        unlockSource: reward.unlock_source,
        recoveryRequired: true,
      });
    }

    const at = new Date();
    const key = partyDateKey(at, book.timezone || 'Asia/Bangkok');
    let seq = null;

    if (reward.unlock_source === 'first_seen') {
      const rows = await sql.query(`WITH claimed AS (
          UPDATE teambook_card_unlock_events SET revealed_at=$1
          WHERE id=$2 AND book_id=$3 AND user_id=$4 AND revealed_at IS NULL
          RETURNING card_id
        ), owned AS (
          INSERT INTO teambook_user_cards (user_id,card_id,acquired_from,acquired_at)
          SELECT $4,card_id,'first_seen',$1 FROM claimed
          ON CONFLICT (user_id,card_id) DO NOTHING RETURNING card_id
        ), revealed_post AS (
          UPDATE teambook_book_entries
          SET body=(SELECT card_id FROM claimed),reward_source='first_seen'
          WHERE book_id=$3 AND user_id=$4 AND kind='reward'
            AND reward_source='first_seen_pending' AND reward_id=$2
          RETURNING seq
        ), touched AS (
          UPDATE teambook_books SET updated_at=$1
          WHERE id=$3 AND EXISTS (SELECT 1 FROM claimed) RETURNING head_seq
        )
        SELECT (SELECT seq FROM revealed_post LIMIT 1) AS seq,
          (SELECT head_seq FROM touched LIMIT 1) AS head_seq`, [at, rewardId, book.id, member.user_id]);
      seq = rows[0]?.seq ? Number(rows[0].seq) : null;
    } else {
      const rows = await sql.query(`WITH claimed AS (
          UPDATE teambook_card_unlock_events SET revealed_at=$1
          WHERE id=$2 AND book_id=$3 AND user_id=$4 AND revealed_at IS NULL
          RETURNING card_id,unlock_source
        ), next AS (
          UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$1
          WHERE id=$3 AND EXISTS (SELECT 1 FROM claimed) RETURNING head_seq
        )
        INSERT INTO teambook_book_entries
          (book_id,seq,user_id,kind,body,reward_source,reward_id,sent_at,day_key,retracted)
        SELECT $3,next.head_seq,$4,'reward',claimed.card_id,claimed.unlock_source,$2,$1,$5::date,FALSE
        FROM next,claimed RETURNING seq`, [at, rewardId, book.id, member.user_id, key]);
      seq = rows[0]?.seq ? Number(rows[0].seq) : null;
    }

    /* The write above is the only thing the reveal screen needs to wait for.
       Do not rebuild the whole party snapshot here; /p/ refreshes on entry and
       the client may also refresh in the background. */
    return sendJson(res, {
      ok: true,
      revealed: true,
      cardId: reward.card_id,
      unlockSource: reward.unlock_source,
      seq,
      recoveryRequired: true,
    });
  } catch (error) {
    console.error('TeamBook fast reward reveal failed', error);
    if (error?.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_REWARD_REVEAL_ERROR' }, 500);
  }
}

export default handleRewardRevealFast;
