import { randomUUID } from 'node:crypto';
import {
  currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from '../../../_lib/core.js';
import {
  TEAMBOOK_TIMEZONE, confirmDeadlineForDayKey, partyDateKey, partyDayNumber,
} from '../../../_lib/xty-rules.js';
import { TEAMBOOK_CARDS } from '../../../../_shared/cards.js';
import xtyHandler from '../../[...path].js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const REWARD_CARD_IDS = Object.freeze(
  TEAMBOOK_CARDS.filter(card => card.eligibility?.reward).map(card => card.cardId),
);

function seededIndex(value, length) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return length ? (hash >>> 0) % length : 0;
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role FROM teambook_book_members
      WHERE book_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || '');
  const value = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!value) return null;
  const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role FROM teambook_book_members
    WHERE book_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(value)]);
  return rows[0] || null;
}

function shapedReward(reward, code) {
  if (!reward || reward.revealed_at) return null;
  return {
    rewardId: reward.id,
    questId: `first-seen:${reward.user_id}`,
    partyCode: code,
    cardId: reward.card_id || null,
    complete: !reward.card_id,
    earnedAt: new Date(reward.created_at).toISOString(),
    revealedAt: null,
  };
}

async function firstSeenRewardFor(sql, row, member, at) {
  const existing = await sql.query(`SELECT id,user_id,book_id,card_id,created_at,revealed_at
    FROM teambook_card_unlock_events
    WHERE user_id=$1 AND unlock_source='first_seen'
    ORDER BY created_at,id LIMIT 1`, [member.user_id]);
  if (existing[0]) return shapedReward(existing[0], row.code);

  const ownedRows = await sql.query(`SELECT card_id FROM teambook_user_cards WHERE user_id=$1
    UNION SELECT card_id FROM teambook_card_unlock_events WHERE user_id=$1 AND card_id IS NOT NULL`, [member.user_id]);
  const owned = new Set(ownedRows.map(item => item.card_id));
  const available = REWARD_CARD_IDS.filter(cardId => !owned.has(cardId));
  const cardId = available.length
    ? available[seededIndex(`${member.user_id}|first-seen|${owned.size}`, available.length)]
    : null;
  const rewardId = `first_seen_${randomUUID()}`;
  const unlockEventId = `TEAMBOOK:FIRST_SEEN:USER:${member.user_id}`;
  const inserted = await sql.query(`INSERT INTO teambook_card_unlock_events
    (id,unlock_event_id,user_id,book_id,card_id,unlock_source,series,created_at,revealed_at)
    VALUES ($1,$2,$3,$4,$5,'first_seen','TeamBook',$6,$7)
    ON CONFLICT DO NOTHING
    RETURNING id,user_id,book_id,card_id,created_at,revealed_at`, [
    rewardId, unlockEventId, member.user_id, row.id, cardId, at, cardId ? null : at,
  ]);
  if (!inserted[0]) {
    const raced = await sql.query(`SELECT id,user_id,book_id,card_id,created_at,revealed_at
      FROM teambook_card_unlock_events
      WHERE user_id=$1 AND unlock_source='first_seen'
      ORDER BY created_at,id LIMIT 1`, [member.user_id]);
    return shapedReward(raced[0], row.code);
  }

  if (inserted[0].card_id) {
    const key = partyDateKey(at, row.timezone || TEAMBOOK_TIMEZONE);
    const pending = await sql.query(`WITH next AS (
        UPDATE teambook_books SET head_seq=head_seq+1,updated_at=$1 WHERE id=$2 RETURNING head_seq
      ) INSERT INTO teambook_book_entries
        (book_id,seq,user_id,kind,body,reward_source,reward_id,sent_at,day_key,retracted)
        SELECT $2,next.head_seq,$3,'reward','','first_seen_pending',$4,$1,$5::date,FALSE
        FROM next RETURNING seq`, [at, row.id, member.user_id, inserted[0].id, key]);
    if (pending[0]) row.head_seq = Number(pending[0].seq);
  }

  const partyDay = partyDayNumber(
    row.started_at || row.created_at || at,
    at,
    row.timezone || TEAMBOOK_TIMEZONE,
  );
  await sql.query(`INSERT INTO teambook_book_events
    (book_id,type,actor_id,party_day,data_json,created_at)
    VALUES ($1,'FIRST_SEEN_REWARD_EARNED',$2,$3,$4::jsonb,$5)`, [
    row.id, member.user_id, partyDay,
    JSON.stringify({ rewardId: inserted[0].id, cardId: inserted[0].card_id || null, alias: member.alias }), at,
  ]).catch(() => {});
  return shapedReward(inserted[0], row.code);
}

export default async function handler(req, res) {
  let sql;
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const code = String(req.query?.code || '').trim();
    if (!/^\d{5}$/.test(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    sql = database();
    await ensureSchema(sql);
    const books = await sql.query(`SELECT id,code,state,verification_mode,timezone,started_at,created_at,head_seq
      FROM teambook_books WHERE code=$1 LIMIT 1`, [code]);
    const row = books[0];
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    /* Confirm-mode remains on the canonical handler. This specific route only
       adds the missing product behavior: Seen is still meaningful in a Trust
       book even though the signed day already counts as green. */
    const verificationMode = row.verification_mode === 'confirm' ? 'confirm' : 'trust';
    if (verificationMode === 'confirm') return xtyHandler(req, res);

    if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())
      && String(row.state || '').toUpperCase() !== 'COMPLETED') {
      return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    }
    const member = await memberFor(req, sql, row.id);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const seq = Number(req.body?.seq);
    if (!Number.isInteger(seq)) return sendJson(res, { ok: false, error: 'BAD_SEQ' }, 400);
    const commits = await sql.query(`SELECT user_id,day_key,sent_at FROM teambook_book_entries
      WHERE book_id=$1 AND seq=$2 AND kind='commit' AND retracted=FALSE LIMIT 1`, [row.id, seq]);
    const commit = commits[0];
    if (!commit) return sendJson(res, { ok: false, error: 'NO_COMMIT' }, 404);
    if (commit.user_id === member.user_id) return sendJson(res, { ok: false, error: 'CANNOT_CONFIRM_SELF' }, 409);

    const timezone = row.timezone || TEAMBOOK_TIMEZONE;
    const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(commit.day_key))
      ? String(commit.day_key)
      : partyDateKey(commit.day_key, timezone);
    const deadline = confirmDeadlineForDayKey(dayKey, timezone);
    const at = new Date();
    if (!deadline || at.getTime() >= deadline.getTime()) {
      return sendJson(res, { ok: false, error: 'CONFIRM_WINDOW_CLOSED' }, 409);
    }

    const saved = await sql.query(`INSERT INTO teambook_confirmations (book_id,commit_seq,confirmer_id,created_at)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (book_id,commit_seq) DO NOTHING RETURNING commit_seq`, [row.id, seq, member.user_id, at]);
    if (!saved[0]) return sendJson(res, { ok: false, error: 'ALREADY_CONFIRMED' }, 409);

    await sql.query('UPDATE teambook_books SET updated_at=$1 WHERE id=$2', [at, row.id]);
    const firstSeenReward = await firstSeenRewardFor(sql, row, member, at);
    return sendJson(res, {
      ok: true,
      confirmed: true,
      trustPassUnaffected: true,
      recoveryRequired: true,
      myReward: firstSeenReward || null,
      firstSeenReward: firstSeenReward || null,
    });
  } catch (error) {
    console.error('TeamBook trust Seen failed', error);
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}
