import { currentUser, database, ensureSchema, sameOrigin, sendJson } from './core.js';

function cleanId(value) {
  const text = String(value || '').trim().slice(0, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(text) ? text : '';
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
      This is deliberately monotonic. The old binder could leave an existing
      account membership as role=member while moving party.owner_id to the
      account, which made a locally-created lead party look like it vanished
      after Login. We now promote lead state explicitly, revive an active
      membership, preserve the bearer auth hash, and repair already-migrated
      account-owned parties on every bind.
    */
    await sql.query(`WITH local_members AS MATERIALIZED (
        SELECT DISTINCT ON (party_id) *
        FROM xty_members
        WHERE user_id = ANY($1::text[])
        ORDER BY party_id,(left_at IS NULL) DESC,(role='lead') DESC,joined_at
      ), merged_members AS (
        INSERT INTO xty_members
          (party_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason)
        SELECT party_id,$2,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason
        FROM local_members
        ON CONFLICT (party_id,user_id) DO UPDATE SET
          alias=CASE WHEN EXCLUDED.alias<>'' THEN EXCLUDED.alias ELSE xty_members.alias END,
          avatar=COALESCE(NULLIF(EXCLUDED.avatar,''),xty_members.avatar),
          avatar_color=COALESCE(NULLIF(EXCLUDED.avatar_color,''),xty_members.avatar_color),
          role=CASE WHEN xty_members.role='lead' OR EXCLUDED.role='lead' THEN 'lead' ELSE xty_members.role END,
          auth_hash=COALESCE(EXCLUDED.auth_hash,xty_members.auth_hash),
          joined_at=LEAST(xty_members.joined_at,EXCLUDED.joined_at),
          left_at=CASE WHEN xty_members.left_at IS NULL OR EXCLUDED.left_at IS NULL THEN NULL ELSE xty_members.left_at END,
          removal_reason=CASE WHEN xty_members.left_at IS NULL OR EXCLUDED.left_at IS NULL THEN NULL ELSE COALESCE(xty_members.removal_reason,EXCLUDED.removal_reason) END
        RETURNING party_id
      ), owners AS (
        UPDATE xty_parties
        SET owner_id=$2,updated_at=$3
        WHERE owner_id = ANY($1::text[])
        RETURNING id
      ), repaired_existing_leads AS (
        UPDATE xty_members m
        SET role='lead',left_at=NULL,removal_reason=NULL
        WHERE m.user_id=$2
          AND EXISTS (
            SELECT 1 FROM xty_parties p
            WHERE p.id=m.party_id AND (p.owner_id=$2 OR p.owner_id = ANY($1::text[]))
          )
        RETURNING m.party_id
      ), created_missing_leads AS (
        INSERT INTO xty_members
          (party_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason)
        SELECT p.id,$2,
          COALESCE((SELECT m.alias FROM xty_members m WHERE m.party_id=p.id ORDER BY (m.role='lead') DESC,m.joined_at LIMIT 1),'Clover'),
          COALESCE((SELECT m.avatar FROM xty_members m WHERE m.party_id=p.id ORDER BY (m.role='lead') DESC,m.joined_at LIMIT 1),'orange_cat'),
          COALESCE((SELECT m.avatar_color FROM xty_members m WHERE m.party_id=p.id ORDER BY (m.role='lead') DESC,m.joined_at LIMIT 1),'green'),
          'lead',NULL,p.created_at,NULL,NULL
        FROM xty_parties p
        WHERE (p.owner_id=$2 OR p.owner_id = ANY($1::text[]))
          AND NOT EXISTS (SELECT 1 FROM xty_members m WHERE m.party_id=p.id AND m.user_id=$2)
        ON CONFLICT (party_id,user_id) DO UPDATE SET role='lead',left_at=NULL,removal_reason=NULL
        RETURNING party_id
      ), posts AS (
        UPDATE xty_posts SET user_id=$2 WHERE user_id = ANY($1::text[]) RETURNING party_id
      ), reactions AS (
        UPDATE xty_reactions SET user_id=$2
        WHERE user_id = ANY($1::text[])
          AND NOT EXISTS (
            SELECT 1 FROM xty_reactions r2
            WHERE r2.party_id=xty_reactions.party_id
              AND r2.seq=xty_reactions.seq
              AND r2.user_id=$2
              AND r2.emoji=xty_reactions.emoji
          )
        RETURNING party_id
      ), confirmations AS (
        UPDATE xty_confirmations SET confirmer_id=$2 WHERE confirmer_id = ANY($1::text[]) RETURNING party_id
      ), events AS (
        UPDATE xty_party_events SET actor_id=$2 WHERE actor_id = ANY($1::text[]) RETURNING party_id
      ), progression AS (
        INSERT INTO xty_progression (user_id,level,paid_tier,unlocked_bonus_slots,updated_at)
        SELECT $2,level,paid_tier,unlocked_bonus_slots,$3
        FROM xty_progression
        WHERE user_id = ANY($1::text[])
        ORDER BY level DESC,unlocked_bonus_slots DESC
        LIMIT 1
        ON CONFLICT (user_id) DO UPDATE SET
          level=GREATEST(xty_progression.level,EXCLUDED.level),
          unlocked_bonus_slots=GREATEST(xty_progression.unlocked_bonus_slots,EXCLUDED.unlocked_bonus_slots),
          paid_tier=CASE
            WHEN xty_progression.paid_tier='max' OR EXCLUDED.paid_tier='max' THEN 'max'
            WHEN xty_progression.paid_tier='plus' OR EXCLUDED.paid_tier='plus' THEN 'plus'
            ELSE 'free' END,
          updated_at=$3
        RETURNING user_id
      ), deleted_local_members AS (
        DELETE FROM xty_members m
        WHERE m.user_id = ANY($1::text[])
          AND EXISTS (
            SELECT 1 FROM xty_members a
            WHERE a.party_id=m.party_id AND a.user_id=$2 AND a.left_at IS NULL
          )
        RETURNING party_id
      )
      SELECT
        (SELECT COUNT(*) FROM merged_members)::int AS merged_members,
        (SELECT COUNT(*) FROM owners)::int AS moved_owners,
        (SELECT COUNT(*) FROM repaired_existing_leads)::int AS repaired_leads,
        (SELECT COUNT(*) FROM created_missing_leads)::int AS created_leads`,
      [localIds, accountId, at]);

    await sql.query(`WITH copied AS (
        INSERT INTO xty_card_ownership (user_id,card_id,acquired_from,acquired_at)
        SELECT DISTINCT ON (card_id) $2,card_id,acquired_from,acquired_at
        FROM xty_card_ownership
        WHERE user_id = ANY($1::text[])
        ORDER BY card_id,acquired_at
        ON CONFLICT (user_id,card_id) DO NOTHING
        RETURNING card_id
      )
      DELETE FROM xty_card_ownership
      WHERE user_id = ANY($1::text[])`, [localIds, accountId]);

    await sql.query(`WITH copied AS (
        INSERT INTO xty_card_rewards (id,user_id,party_id,card_id,created_at,revealed_at)
        SELECT DISTINCT ON (party_id) id,$2,party_id,card_id,created_at,revealed_at
        FROM xty_card_rewards
        WHERE user_id = ANY($1::text[])
        ORDER BY party_id,created_at
        ON CONFLICT (user_id,party_id) DO UPDATE SET
          card_id=COALESCE(xty_card_rewards.card_id,EXCLUDED.card_id),
          revealed_at=COALESCE(xty_card_rewards.revealed_at,EXCLUDED.revealed_at)
        RETURNING party_id
      )
      DELETE FROM xty_card_rewards
      WHERE user_id = ANY($1::text[])`, [localIds, accountId]);

    const ownedRows = await sql.query(`SELECT DISTINCT p.code
      FROM xty_parties p
      JOIN xty_members m ON m.party_id=p.id
      WHERE p.owner_id=$1 AND m.user_id=$1 AND m.left_at IS NULL
      ORDER BY p.code`, [accountId]);

    return sendJson(res, {
      ok: true,
      boundIds: profileIds.length,
      meUserId: accountId,
      ownedCodes: ownedRows.map(row => row.code),
    });
  } catch (error) {
    console.error('XTY bind failed', error);
    if (error?.code === 'DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'XTY_BIND_ERROR' }, 500);
  }
}

export default handleXtyBind;
