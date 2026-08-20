const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

async function ensureQuotaV2(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS teambook_book_quota_v2 (
    quota_key TEXT NOT NULL,
    book_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    PRIMARY KEY (quota_key, book_id, role)
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_teambook_book_quota_v2_active
    ON teambook_book_quota_v2(quota_key, role, released_at)`);
}

export async function dissolveXtyParty(sql, party, actorId, at = new Date()) {
  if (!party?.id) return null;
  await ensureQuotaV2(sql);

  const rows = await sql.query(`WITH dissolved AS (
      UPDATE teambook_books
      SET state='DISSOLVED',ended_at=COALESCE(ended_at,$1),updated_at=$1,visibility='private'
      WHERE id=$2 AND state = ANY($3::text[]) RETURNING id
    ), closed_members AS (
      UPDATE teambook_book_members
      SET left_at=$1,removal_reason='DISSOLVED',auth_hash=NULL
      WHERE book_id=$2 AND left_at IS NULL
        AND EXISTS (SELECT 1 FROM dissolved)
      RETURNING user_id
    ), released_quota AS (
      UPDATE teambook_book_quota_v2
      SET released_at=COALESCE(released_at,$1)
      WHERE book_id=$2 AND released_at IS NULL
        AND EXISTS (SELECT 1 FROM dissolved)
      RETURNING book_id
    )
    SELECT (SELECT id FROM dissolved) AS id,
      (SELECT COUNT(*)::int FROM closed_members) AS removed_members,
      (SELECT COUNT(*)::int FROM released_quota) AS released_quotas`, [at, party.id, ACTIVE_STATES]);

  const result = rows[0];
  if (!result?.id) return null;

  try {
    const eventData = actorId === 'admin' ? { by: 'admin' } : {};
    await sql.query(`INSERT INTO teambook_book_events
      (book_id,type,actor_id,party_day,data_json,created_at)
      SELECT $1,'PARTY_DISSOLVED',$2,1,$3::jsonb,$4 WHERE NOT EXISTS
      (SELECT 1 FROM teambook_book_events WHERE book_id=$1 AND type='PARTY_DISSOLVED')`, [
      party.id, actorId || 'system', JSON.stringify(eventData), at,
    ]);
  } catch (eventError) {
    console.warn('TeamBook dissolve audit event failed', eventError);
  }

  return {
    endedAt: party.ended_at ? new Date(party.ended_at) : at,
    removedMembers: Number(result.removed_members || 0),
    releasedQuotas: Number(result.released_quotas || 0),
  };
}

export { ACTIVE_STATES as TEAMBOOK_ACTIVE_STATES };
