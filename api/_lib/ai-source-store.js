// Reuses the existing core.database() Neon connection. Never creates public blob URLs.
// A single row commits the registration and its private bytea receipt atomically.
export async function ensureAiSourceSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_ai_source_registrations (
    id BIGSERIAL PRIMARY KEY, reference TEXT UNIQUE NOT NULL,
    idempotency_key UUID UNIQUE NOT NULL, payload_hash TEXT NOT NULL,
    offer_id UUID NOT NULL, offer_first_seen_at TIMESTAMPTZ NOT NULL, offer_expires_at TIMESTAMPTZ NOT NULL,
    quoted_amount_thb INTEGER NOT NULL CHECK (quoted_amount_thb IN (990,1690)),
    name TEXT NOT NULL, email TEXT, contact TEXT,
    submitted_amount_satang BIGINT NOT NULL CHECK (submitted_amount_satang>0), submitted_transferred_at TIMESTAMPTZ NOT NULL,
    receipt_bytes BYTEA NOT NULL CHECK (octet_length(receipt_bytes)<=2097152),
    receipt_sha256 TEXT UNIQUE NOT NULL, receipt_mime TEXT NOT NULL, receipt_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','payment_verified','admitted','rejected')),
    verified_amount_satang BIGINT, verified_transferred_at TIMESTAMPTZ, verified_at TIMESTAMPTZ, admitted_at TIMESTAMPTZ,
    owner_note TEXT, admin_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    notify_status TEXT NOT NULL DEFAULT 'pending', notify_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    notify_attempt_id UUID, notify_claimed_at TIMESTAMPTZ, notified_at TIMESTAMPTZ,
    consent_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
  )`);
  await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_ai_source_queue ON mc_ai_source_registrations(status, id DESC)');
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_ai_source_rate_limits (bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at TIMESTAMPTZ NOT NULL)`);
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_ai_source_api_checks (id UUID PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL)`);
}
// Explicit field list: receipts and idempotency hashes never ride in an admin queue JSON.
const FIELDS = `id,reference,offer_id,offer_first_seen_at,offer_expires_at,quoted_amount_thb,name,email,contact,
 submitted_amount_satang,submitted_transferred_at,receipt_sha256,receipt_mime,receipt_name,octet_length(receipt_bytes) AS receipt_size,
 status,verified_amount_satang,verified_transferred_at,verified_at,admitted_at,owner_note,admin_history,
 notify_status,notify_detail,notified_at,created_at,updated_at`;
export function createAiSourceStore(sql) {
  return {
    ensure: () => ensureAiSourceSchema(sql),
    async findIdempotency(key) { return (await sql.query(`SELECT ${FIELDS},payload_hash FROM mc_ai_source_registrations WHERE idempotency_key=$1`, [key]))[0] || null; },
    async insert(x) {
      const rows = await sql.query(`INSERT INTO mc_ai_source_registrations
        (reference,idempotency_key,payload_hash,offer_id,offer_first_seen_at,offer_expires_at,quoted_amount_thb,name,email,contact,
         submitted_amount_satang,submitted_transferred_at,receipt_bytes,receipt_sha256,receipt_mime,receipt_name,consent_at,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,decode($13,'base64'),$14,$15,$16,$17,$17,$17)
        ON CONFLICT (idempotency_key) DO NOTHING RETURNING ${FIELDS},payload_hash`,
      [x.reference,x.idempotencyKey,x.payloadHash,x.offer.id,new Date(x.offer.firstSeen),new Date(x.offer.expires),x.quotedAmountTHB,
        x.name,x.email || null,x.contact || null,x.amountSatang,x.transferredAt,x.receipt.base64,x.receipt.sha256,x.receipt.mime,x.receipt.name,x.now]);
      return rows[0] || null;
    },
    async rateLimit(bucket, now) {
      const until = new Date(new Date(now).getTime() + 3600000);
      const rows = await sql.query(`INSERT INTO mc_ai_source_rate_limits(bucket,hits,expires_at) VALUES ($1,1,$2)
        ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN mc_ai_source_rate_limits.expires_at<=$3 THEN 1 ELSE mc_ai_source_rate_limits.hits+1 END,
        expires_at=CASE WHEN mc_ai_source_rate_limits.expires_at<=$3 THEN $2 ELSE mc_ai_source_rate_limits.expires_at END RETURNING hits`, [bucket,until,now]);
      return Number(rows[0]?.hits || 0) <= 5;
    },
    async list(limit, before) { return sql.query(`SELECT ${FIELDS} FROM mc_ai_source_registrations WHERE ($1::bigint IS NULL OR id<$1) ORDER BY id DESC LIMIT $2`, [before,limit]); },
    async get(reference) { return (await sql.query(`SELECT ${FIELDS} FROM mc_ai_source_registrations WHERE reference=$1`, [reference]))[0] || null; },
    async receipt(reference) {
      // encode() is portable with Neon's HTTP JSON transport; no bytea-driver assumptions.
      return (await sql.query(`SELECT reference,receipt_mime,receipt_sha256,encode(receipt_bytes,'base64') AS receipt_base64 FROM mc_ai_source_registrations WHERE reference=$1`, [reference]))[0] || null;
    },
    async claimNotify(reference, attempt, now) {
      return Boolean((await sql.query(`UPDATE mc_ai_source_registrations SET notify_status='sending',notify_attempt_id=$2,notify_claimed_at=$3
        WHERE reference=$1 AND (notify_status IN ('pending','failed','unconfigured') OR (notify_status='sending' AND notify_claimed_at<$3::timestamptz-INTERVAL '2 minutes')) RETURNING reference`, [reference,attempt,now]))[0]);
    },
    async finishNotify(reference, attempt, delivery, now) {
      await sql.query(`UPDATE mc_ai_source_registrations SET notify_status=$3,notify_detail=$4::jsonb,
        notified_at=CASE WHEN $3='sent' THEN $5 ELSE notified_at END,updated_at=$5 WHERE reference=$1 AND notify_attempt_id=$2`,
      [reference,attempt,delivery.status,JSON.stringify(delivery),now]);
    },
    async verify(reference, amount, transferred, note, now) {
      const event = JSON.stringify([{ action:'verify_payment',at:new Date(now).toISOString(),amountSatang:amount,transferredAt:transferred,note }]);
      return (await sql.query(`UPDATE mc_ai_source_registrations SET status='payment_verified',verified_amount_satang=$2,verified_transferred_at=$3,
        verified_at=$4,owner_note=$5,admin_history=admin_history||$6::jsonb,updated_at=$4
        WHERE reference=$1 AND status='pending_verification' RETURNING ${FIELDS}`, [reference,amount,transferred,now,note,event]))[0] || null;
    },
    async admit(reference, note, now) {
      const event = JSON.stringify([{ action:'mark_admitted',at:new Date(now).toISOString(),note }]);
      return (await sql.query(`UPDATE mc_ai_source_registrations SET status='admitted',admitted_at=$2,owner_note=$3,
        admin_history=admin_history||$4::jsonb,updated_at=$2 WHERE reference=$1 AND status='payment_verified' RETURNING ${FIELDS}`, [reference,now,note,event]))[0] || null;
    },
    async reject(reference, note, now) {
      const event = JSON.stringify([{action:'reject',at:new Date(now).toISOString(),note}]);
      return (await sql.query(`UPDATE mc_ai_source_registrations SET status='rejected',owner_note=$2,admin_history=admin_history||$3::jsonb,updated_at=$4
        WHERE reference=$1 AND status='pending_verification' RETURNING ${FIELDS}`, [reference,note,event,now]))[0] || null;
    },
    async persistenceProbe(id, now) {
      try {
        await sql.query('INSERT INTO mc_ai_source_api_checks(id,created_at) VALUES($1,$2)', [id,now]);
        const rows = await sql.query('SELECT id FROM mc_ai_source_api_checks WHERE id=$1', [id]);
        if (rows[0]?.id !== id) throw new Error('PERSISTENCE_PROBE_FAILED');
      } finally {
        // Synthetic check only, not a fake registration. Failure to clean up fails the probe.
        await sql.query('DELETE FROM mc_ai_source_api_checks WHERE id=$1', [id]);
      }
    },
  };
}
