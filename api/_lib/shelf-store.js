import { randomUUID } from 'node:crypto';

const schemaPromises = new WeakMap();
export const SHELF_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS mc_shelf_users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mc_shelf_keys (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES mc_shelf_users(id),
    key_hash TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL, source_ids JSONB,
    created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mc_shelf_keys_user ON mc_shelf_keys(user_id)`,
  `CREATE TABLE IF NOT EXISTS mc_shelf_sessions (
    token_hash TEXT PRIMARY KEY, key_id TEXT NOT NULL REFERENCES mc_shelf_keys(id),
    created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mc_shelf_sessions_key ON mc_shelf_sessions(key_id)`,
  `CREATE TABLE IF NOT EXISTS mc_shelf_events (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES mc_shelf_users(id),
    key_id TEXT NOT NULL REFERENCES mc_shelf_keys(id), source_id TEXT NOT NULL,
    source_title TEXT NOT NULL, source_version TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('open','copy','download')),
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mc_shelf_events_created ON mc_shelf_events(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_mc_shelf_events_user ON mc_shelf_events(user_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS mc_shelf_login_hits (
    bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 1, expires_at TIMESTAMPTZ NOT NULL
  )`,
];

export async function ensureShelfSchema(sql) {
  if (!schemaPromises.has(sql)) schemaPromises.set(sql, (async () => {
    for (const statement of SHELF_SCHEMA) await sql.query(statement);
  })().catch(error => { schemaPromises.delete(sql); throw error; }));
  return schemaPromises.get(sql);
}

const stamp = value => value ? new Date(value).toISOString() : null;
function keyRecord(row) {
  if (!row) return null;
  return {
    id: row.id, userId: row.user_id, name: row.name, prefix: row.prefix,
    sourceIds: typeof row.source_ids === 'string' ? JSON.parse(row.source_ids) : row.source_ids,
    createdAt: stamp(row.created_at), expiresAt: stamp(row.expires_at),
    revokedAt: stamp(row.revoked_at), lastUsedAt: stamp(row.last_used_at),
  };
}
const ACTIVE_KEY = 'k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at>$2)';

export function createSqlShelfRepository(sql) {
  return {
    sql,
    async userById(id) {
      const rows = await sql.query('SELECT id,name,created_at FROM mc_shelf_users WHERE id=$1', [id]);
      return rows[0] ? { id: rows[0].id, name: rows[0].name, createdAt: stamp(rows[0].created_at) } : null;
    },
    async rateLimited(bucket, now, limit, windowMs) {
      const expires = new Date(Math.floor(now.getTime() / windowMs) * windowMs + windowMs);
      const rows = await sql.query(`INSERT INTO mc_shelf_login_hits(bucket,hits,expires_at)
        VALUES ($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET hits=mc_shelf_login_hits.hits+1 RETURNING hits`, [bucket, expires]);
      await sql.query('DELETE FROM mc_shelf_login_hits WHERE expires_at<=$1', [now]);
      return Number(rows[0]?.hits || 0) > limit;
    },
    async activeKey(keyHash, now) {
      const rows = await sql.query(`SELECT k.*,u.name FROM mc_shelf_keys k
        JOIN mc_shelf_users u ON u.id=k.user_id WHERE k.key_hash=$1 AND ${ACTIVE_KEY}`, [keyHash, now]);
      return keyRecord(rows[0]);
    },
    async createSession(tokenHash, keyId, createdAt, expiresAt) {
      const rows = await sql.query(`INSERT INTO mc_shelf_sessions(token_hash,key_id,created_at,expires_at)
        SELECT $1,k.id,$3,$4 FROM mc_shelf_keys k WHERE k.id=$2 AND k.revoked_at IS NULL
        AND (k.expires_at IS NULL OR k.expires_at>$3) RETURNING key_id`, [tokenHash, keyId, createdAt, expiresAt]);
      return Boolean(rows[0]);
    },
    async session(tokenHash, now) {
      const rows = await sql.query(`SELECT k.*,u.name,s.expires_at AS session_expires_at FROM mc_shelf_sessions s
        JOIN mc_shelf_keys k ON k.id=s.key_id JOIN mc_shelf_users u ON u.id=k.user_id
        WHERE s.token_hash=$1 AND s.expires_at>$2 AND ${ACTIVE_KEY}`, [tokenHash, now]);
      return rows[0] ? { key: keyRecord(rows[0]), expiresAt: stamp(rows[0].session_expires_at) } : null;
    },
    async destroySession(tokenHash) {
      await sql.query('DELETE FROM mc_shelf_sessions WHERE token_hash=$1', [tokenHash]);
    },
    async createKey(record) {
      const rows = await sql.query(`WITH recipient AS (
        INSERT INTO mc_shelf_users(id,name,created_at) VALUES($1,$2,$3)
        ON CONFLICT(id) DO UPDATE SET name=mc_shelf_users.name RETURNING id,name
      ), issued AS (
        INSERT INTO mc_shelf_keys(id,user_id,key_hash,prefix,source_ids,created_at,expires_at)
        SELECT $4,recipient.id,$5,$6,$7::jsonb,$3,$8 FROM recipient RETURNING *
      ) SELECT issued.*,recipient.name FROM issued JOIN recipient ON recipient.id=issued.user_id`,
      [record.userId, record.name, record.createdAt, record.id, record.keyHash, record.prefix,
        record.sourceIds === null ? null : JSON.stringify(record.sourceIds), record.expiresAt]);
      return keyRecord(rows[0]);
    },
    async revokeKey(id, now) {
      const rows = await sql.query(`UPDATE mc_shelf_keys k SET revoked_at=COALESCE(k.revoked_at,$2)
        FROM mc_shelf_users u WHERE k.id=$1 AND u.id=k.user_id RETURNING k.*,u.name`, [id, now]);
      // Every read checks the key as well; deleting sessions is additional cleanup.
      if (rows[0]) await sql.query('DELETE FROM mc_shelf_sessions WHERE key_id=$1', [id]);
      return keyRecord(rows[0]);
    },
    async recordServe(tokenHash, source, kind, now) {
      // Authorize again inside the INSERT: expiry, revocation, and scope changes
      // between the initial check and reading the file must not yield content.
      const rows = await sql.query(`WITH served AS (
        INSERT INTO mc_shelf_events(id,user_id,key_id,source_id,source_title,source_version,kind,created_at)
        SELECT $3,k.user_id,k.id,$4,$5,$6,$7,$2 FROM mc_shelf_sessions s
        JOIN mc_shelf_keys k ON k.id=s.key_id WHERE s.token_hash=$1 AND s.expires_at>$2
        AND ${ACTIVE_KEY} AND (k.source_ids IS NULL OR k.source_ids ? $4)
        RETURNING key_id
      ) UPDATE mc_shelf_keys k SET last_used_at=$2 FROM served WHERE k.id=served.key_id RETURNING k.id`,
      [tokenHash, now, randomUUID(), source.id, source.title, source.version, kind]);
      return Boolean(rows[0]);
    },
    async adminSnapshot(now) {
      const [users, keyRows, eventRows, totals, sourceRows, userSourceRows] = await Promise.all([
        sql.query(`SELECT u.*,
          (SELECT COUNT(*)::int FROM mc_shelf_keys k WHERE k.user_id=u.id) AS key_count,
          (SELECT COUNT(*)::int FROM mc_shelf_keys k WHERE k.user_id=u.id AND k.revoked_at IS NULL
            AND (k.expires_at IS NULL OR k.expires_at>$1)) AS active_key_count,
          (SELECT MAX(e.created_at) FROM mc_shelf_events e WHERE e.user_id=u.id) AS last_seen_at,
          (SELECT COUNT(*)::int FROM mc_shelf_events e WHERE e.user_id=u.id AND kind='open') AS open_count,
          (SELECT COUNT(*)::int FROM mc_shelf_events e WHERE e.user_id=u.id AND kind='copy') AS copy_count,
          (SELECT COUNT(*)::int FROM mc_shelf_events e WHERE e.user_id=u.id AND kind='download') AS download_count
          FROM mc_shelf_users u ORDER BY u.created_at DESC LIMIT 1000`, [now]),
        sql.query('SELECT k.*,u.name FROM mc_shelf_keys k JOIN mc_shelf_users u ON u.id=k.user_id ORDER BY k.created_at DESC LIMIT 1000'),
        sql.query('SELECT e.*,u.name FROM mc_shelf_events e JOIN mc_shelf_users u ON u.id=e.user_id ORDER BY e.created_at DESC LIMIT 200'),
        sql.query(`SELECT (SELECT COUNT(*)::int FROM mc_shelf_users) AS user_count,
          (SELECT COUNT(*)::int FROM mc_shelf_keys) AS key_count,
          (SELECT COUNT(*)::int FROM mc_shelf_keys WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at>$1)) AS active_key_count,
          COUNT(*) FILTER(WHERE kind='open')::int AS open_count,
          COUNT(*) FILTER(WHERE kind='copy')::int AS copy_count,
          COUNT(*) FILTER(WHERE kind='download')::int AS download_count FROM mc_shelf_events`, [now]),
        sql.query(`SELECT source_id,MAX(source_title) AS source_title,MAX(created_at) AS last_used_at,
          COUNT(*) FILTER(WHERE kind='open')::int AS open_count,
          COUNT(*) FILTER(WHERE kind='copy')::int AS copy_count,
          COUNT(*) FILTER(WHERE kind='download')::int AS download_count
          FROM mc_shelf_events GROUP BY source_id ORDER BY MAX(created_at) DESC`),
        sql.query(`SELECT e.user_id,u.name,e.source_id,MAX(e.source_title) AS source_title,MAX(e.created_at) AS last_used_at,
          COUNT(*) FILTER(WHERE kind='open')::int AS open_count,
          COUNT(*) FILTER(WHERE kind='copy')::int AS copy_count,
          COUNT(*) FILTER(WHERE kind='download')::int AS download_count
          FROM mc_shelf_events e JOIN mc_shelf_users u ON u.id=e.user_id
          GROUP BY e.user_id,u.name,e.source_id ORDER BY MAX(e.created_at) DESC`),
      ]);
      const total = totals[0] || {};
      const sourceMetric = row => ({ sourceId: row.source_id, sourceTitle: row.source_title, openCount: Number(row.open_count), copyCount: Number(row.copy_count), downloadCount: Number(row.download_count), lastUsedAt: stamp(row.last_used_at) });
      const eventsTotal = Number(total.open_count || 0) + Number(total.copy_count || 0) + Number(total.download_count || 0);
      return {
        users: users.map(row => ({ id: row.id, name: row.name, createdAt: stamp(row.created_at), keyCount: Number(row.key_count), activeKeyCount: Number(row.active_key_count), lastSeenAt: stamp(row.last_seen_at), openCount: Number(row.open_count), copyCount: Number(row.copy_count), downloadCount: Number(row.download_count) })),
        keys: keyRows.map(keyRecord),
        events: eventRows.map(row => ({ id: row.id, userId: row.user_id, name: row.name, keyId: row.key_id, sourceId: row.source_id, sourceTitle: row.source_title, sourceVersion: row.source_version, kind: row.kind, createdAt: stamp(row.created_at) })),
        eventsLimit: 200, eventsTotal, eventsHasMore: eventsTotal > 200,
        sourceStats: sourceRows.map(sourceMetric),
        userSourceStats: userSourceRows.map(row => ({ userId: row.user_id, name: row.name, ...sourceMetric(row) })),
        stats: { userCount: Number(total.user_count || 0), keyCount: Number(total.key_count || 0), activeKeyCount: Number(total.active_key_count || 0), openCount: Number(total.open_count || 0), copyCount: Number(total.copy_count || 0), downloadCount: Number(total.download_count || 0) },
      };
    },
  };
}
