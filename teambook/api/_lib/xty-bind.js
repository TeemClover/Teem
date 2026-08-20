import { currentUser, database, ensureSchema, sameOrigin, sendJson } from './core.js';

function cleanId(value) {
  const text = String(value || '').trim().slice(0, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(text) ? text : '';
}

export async function promoteCardUnlocks(sql, localIds, accountId) {
  /* Keep the account row when the same book/source was already promoted, but
     merge any card/reveal detail learned by the local row before deleting it. */
  await sql.query(`UPDATE teambook_card_unlock_events AS account_unlock
    SET card_id=COALESCE(account_unlock.card_id,local_unlock.card_id),
        revealed_at=COALESCE(account_unlock.revealed_at,local_unlock.revealed_at)
    FROM (
      SELECT DISTINCT ON (book_id,unlock_source)
        book_id,unlock_source,card_id,revealed_at
      FROM teambook_card_unlock_events
      WHERE user_id = ANY($1::text[])
      ORDER BY book_id,unlock_source,(card_id IS NOT NULL) DESC,(revealed_at IS NOT NULL) DESC,created_at
    ) AS local_unlock
    WHERE account_unlock.user_id=$2
      AND account_unlock.book_id IS NOT DISTINCT FROM local_unlock.book_id
      AND account_unlock.unlock_source=local_unlock.unlock_source`, [localIds, accountId]);

  await sql.query(`DELETE FROM teambook_card_unlock_events AS local_unlock
    WHERE local_unlock.user_id = ANY($1::text[])
      AND EXISTS (
        SELECT 1 FROM teambook_card_unlock_events AS account_unlock
        WHERE account_unlock.user_id=$2
          AND account_unlock.book_id IS NOT DISTINCT FROM local_unlock.book_id
          AND account_unlock.unlock_source=local_unlock.unlock_source
      )`, [localIds, accountId]);

  await sql.query(`DELETE FROM teambook_card_unlock_events AS duplicate
    USING (
      SELECT id,row_number() OVER (
        PARTITION BY book_id,unlock_source
        ORDER BY (card_id IS NOT NULL) DESC,(revealed_at IS NOT NULL) DESC,created_at,id
      ) AS rank
      FROM teambook_card_unlock_events
      WHERE user_id = ANY($1::text[])
    ) AS ranked
    WHERE duplicate.id=ranked.id AND ranked.rank>1`, [localIds]);

  /* unlock_event_id is immutable. It identifies the original server event;
     only ownership changes when a local TeamBook identity binds an account. */
  await sql.query(`UPDATE teambook_card_unlock_events SET user_id=$2
    WHERE user_id = ANY($1::text[])`, [localIds, accountId]);
}

export async function handleXtyBind(req, res) {
  let sql;
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    sql = database();
    await ensureSchema(sql);

    const account = await currentUser(req, sql);
    if (!account) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const requested = Array.isArray(body.profileIds) ? body.profileIds : [];
    const profileIds = [...new Set([body.profileId, ...requested].map(cleanId).filter(Boolean))];
    if (!profileIds.length) return sendJson(res, { ok: false, error: 'INVALID_PROFILE' }, 400);

    const localIds = profileIds.map(id => `local:${id}`);
    const accountId = `account:${account.id}`;
    const at = new Date();

    /*
      Lossless identity promotion.

      The previous binder could move teambook_books.owner_id to the account while
      an already-existing account membership stayed role=member. The local lead
      row was then deleted, so the party still existed but the player no longer
      looked like its lead after Login/Merge.

      This migration explicitly promotes role=lead when either side was lead,
      revives the membership when either side is active, preserves the bearer
      auth hash, and only deletes local rows inside the same atomic statement
      that creates/updates the account row.
    */
    await sql.query(`WITH local_members AS MATERIALIZED (
        SELECT DISTINCT ON (book_id) *
        FROM teambook_book_members
        WHERE user_id = ANY($1::text[])
        ORDER BY book_id,(left_at IS NULL) DESC,(role='lead') DESC,joined_at
      ), merged_members AS (
        INSERT INTO teambook_book_members
          (book_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason)
        SELECT book_id,$2,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason
        FROM local_members
        ON CONFLICT (book_id,user_id) DO UPDATE SET
          alias=CASE WHEN EXCLUDED.alias<>'' THEN EXCLUDED.alias ELSE teambook_book_members.alias END,
          avatar=COALESCE(NULLIF(EXCLUDED.avatar,''),teambook_book_members.avatar),
          avatar_color=COALESCE(NULLIF(EXCLUDED.avatar_color,''),teambook_book_members.avatar_color),
          role=CASE WHEN teambook_book_members.role='lead' OR EXCLUDED.role='lead' THEN 'lead' ELSE teambook_book_members.role END,
          auth_hash=COALESCE(EXCLUDED.auth_hash,teambook_book_members.auth_hash),
          joined_at=LEAST(teambook_book_members.joined_at,EXCLUDED.joined_at),
          left_at=CASE WHEN teambook_book_members.left_at IS NULL OR EXCLUDED.left_at IS NULL THEN NULL ELSE teambook_book_members.left_at END,
          removal_reason=CASE WHEN teambook_book_members.left_at IS NULL OR EXCLUDED.left_at IS NULL THEN NULL ELSE COALESCE(teambook_book_members.removal_reason,EXCLUDED.removal_reason) END
        RETURNING book_id
      ), posts AS (
        UPDATE teambook_book_entries SET user_id=$2 WHERE user_id = ANY($1::text[]) RETURNING book_id
      ), reactions AS (
        UPDATE teambook_reactions SET user_id=$2
        WHERE user_id = ANY($1::text[])
          AND NOT EXISTS (
            SELECT 1 FROM teambook_reactions r2
            WHERE r2.book_id=teambook_reactions.book_id
              AND r2.seq=teambook_reactions.seq
              AND r2.user_id=$2
              AND r2.emoji=teambook_reactions.emoji
          )
        RETURNING book_id
      ), confirmations AS (
        UPDATE teambook_confirmations SET confirmer_id=$2 WHERE confirmer_id = ANY($1::text[]) RETURNING book_id
      ), events AS (
        UPDATE teambook_book_events SET actor_id=$2 WHERE actor_id = ANY($1::text[]) RETURNING book_id
      ), owners AS (
        UPDATE teambook_books SET owner_id=$2,updated_at=$3
        WHERE owner_id = ANY($1::text[])
        RETURNING id
      ), progression AS (
        INSERT INTO teambook_progression (user_id,level,paid_tier,unlocked_bonus_slots,updated_at)
        SELECT $2,level,paid_tier,unlocked_bonus_slots,$3
        FROM teambook_progression
        WHERE user_id = ANY($1::text[])
        ORDER BY level DESC,unlocked_bonus_slots DESC
        LIMIT 1
        ON CONFLICT (user_id) DO UPDATE SET
          level=GREATEST(teambook_progression.level,EXCLUDED.level),
          unlocked_bonus_slots=GREATEST(teambook_progression.unlocked_bonus_slots,EXCLUDED.unlocked_bonus_slots),
          paid_tier=CASE
            WHEN teambook_progression.paid_tier='max' OR EXCLUDED.paid_tier='max' THEN 'max'
            WHEN teambook_progression.paid_tier='plus' OR EXCLUDED.paid_tier='plus' THEN 'plus'
            ELSE 'free' END,
          updated_at=$3
        RETURNING user_id
      ), deleted_local_members AS (
        DELETE FROM teambook_book_members m
        WHERE m.user_id = ANY($1::text[])
          AND EXISTS (SELECT 1 FROM local_members lm WHERE lm.book_id=m.book_id)
        RETURNING book_id
      )
      SELECT
        (SELECT COUNT(*) FROM merged_members)::int AS merged_members,
        (SELECT COUNT(*) FROM owners)::int AS moved_owners`, [localIds, accountId, at]);

    /* Repair parties that were already affected by an older bad merge. If the
       owner is the account, the account must also have one active lead seat.
       This makes pressing Sync again recover the party instead of requiring a
       database/manual fix. */
    await sql.query(`INSERT INTO teambook_book_members
        (book_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason)
      SELECT p.id,$1,
        COALESCE((SELECT m.alias FROM teambook_book_members m WHERE m.book_id=p.id ORDER BY (m.role='lead') DESC,m.joined_at LIMIT 1),$2),
        COALESCE((SELECT m.avatar FROM teambook_book_members m WHERE m.book_id=p.id ORDER BY (m.role='lead') DESC,m.joined_at LIMIT 1),'orange_cat'),
        COALESCE((SELECT m.avatar_color FROM teambook_book_members m WHERE m.book_id=p.id ORDER BY (m.role='lead') DESC,m.joined_at LIMIT 1),'green'),
        'lead',NULL,p.created_at,NULL,NULL
      FROM teambook_books p
      WHERE p.owner_id=$1
      ON CONFLICT (book_id,user_id) DO UPDATE SET
        role='lead',left_at=NULL,removal_reason=NULL`,
      [accountId, String(account.displayName || account.email || 'สมาชิก').slice(0, 24)]);

    await sql.query(`WITH copied AS (
        INSERT INTO teambook_user_cards (user_id,card_id,acquired_from,acquired_at)
        SELECT DISTINCT ON (card_id) $2,card_id,acquired_from,acquired_at
        FROM teambook_user_cards
        WHERE user_id = ANY($1::text[])
        ORDER BY card_id,acquired_at
        ON CONFLICT (user_id,card_id) DO NOTHING
        RETURNING card_id
      )
      DELETE FROM teambook_user_cards
      WHERE user_id = ANY($1::text[])`, [localIds, accountId]);

    await promoteCardUnlocks(sql, localIds, accountId);

    const ownedRows = await sql.query(`SELECT DISTINCT p.code
      FROM teambook_books p
      JOIN teambook_book_members m ON m.book_id=p.id
      WHERE p.owner_id=$1 AND m.user_id=$1 AND m.left_at IS NULL AND m.role='lead'
      ORDER BY p.code`, [accountId]);

    return sendJson(res, {
      ok: true,
      boundIds: profileIds.length,
      meUserId: accountId,
      ownedCodes: ownedRows.map(row => row.code),
    });
  } catch (error) {
    console.error('TeamBook bind failed', error);
    if (error?.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_BIND_ERROR' }, 500);
  }
}

export default handleXtyBind;
