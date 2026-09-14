// Reuses the existing core.database() Neon connection. Never creates public blob URLs.
// A single row commits the registration and its private bytea receipt atomically.
import { learnAccountWrite } from './learn-commerce-lock.js';
export async function ensureAiSourceSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_ai_source_registrations (
    id BIGSERIAL PRIMARY KEY, reference TEXT UNIQUE NOT NULL,
    idempotency_key UUID UNIQUE NOT NULL, payload_hash TEXT NOT NULL,
    offer_id UUID NOT NULL, offer_first_seen_at TIMESTAMPTZ NOT NULL, offer_expires_at TIMESTAMPTZ NOT NULL,
    quoted_amount_thb INTEGER NOT NULL CHECK (quoted_amount_thb IN (790,990,1690)),
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
  await sql.query('ALTER TABLE mc_ai_source_registrations ADD COLUMN IF NOT EXISTS account_id TEXT');
  await sql.query('ALTER TABLE mc_ai_source_registrations ADD COLUMN IF NOT EXISTS checkout_id UUID');
  await sql.query('ALTER TABLE mc_ai_source_registrations ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT');
  // One-time provenance: only rows already present before this column existed
  // may use the old offer rules after an explicit administrator account bind.
  // Future ensure() calls never bless a new row with a missing checkout.
  await sql.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='mc_ai_source_registrations' AND column_name='legacy_quote_eligible') THEN
    ALTER TABLE mc_ai_source_registrations ADD COLUMN legacy_quote_eligible BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE mc_ai_source_registrations SET legacy_quote_eligible=TRUE WHERE account_id IS NULL AND checkout_id IS NULL;
    END IF; END $$`);
  await sql.query('ALTER TABLE mc_ai_source_registrations ADD COLUMN IF NOT EXISTS legacy_bound_at TIMESTAMPTZ');
  await sql.query('ALTER TABLE mc_ai_source_registrations ADD COLUMN IF NOT EXISTS legacy_bound_by TEXT');
  await sql.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='mc_ai_source_registrations'::regclass AND conname='mc_ai_source_registrations_quoted_amount_thb_check' AND pg_get_constraintdef(oid) NOT LIKE '%790%') THEN
    ALTER TABLE mc_ai_source_registrations DROP CONSTRAINT mc_ai_source_registrations_quoted_amount_thb_check;
    ALTER TABLE mc_ai_source_registrations ADD CONSTRAINT mc_ai_source_registrations_quoted_amount_thb_check CHECK(quoted_amount_thb IN(790,990,1690)); END IF; END $$`);
  await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_source_bank_transaction ON mc_ai_source_registrations(bank_transaction_id) WHERE bank_transaction_id IS NOT NULL');
  await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_source_bank_transaction_canonical ON mc_ai_source_registrations(UPPER(BTRIM(bank_transaction_id))) WHERE bank_transaction_id IS NOT NULL');
  await sql.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_source_checkout ON mc_ai_source_registrations(checkout_id) WHERE checkout_id IS NOT NULL');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_ai_source_queue ON mc_ai_source_registrations(status, id DESC)');
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_ai_source_rate_limits (bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at TIMESTAMPTZ NOT NULL)`);
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_ai_source_api_checks (id UUID PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL)`);
}
// Explicit field list: receipts and idempotency hashes never ride in an admin queue JSON.
const FIELDS = `id,reference,offer_id,offer_first_seen_at,offer_expires_at,quoted_amount_thb,name,email,contact,account_id,checkout_id,bank_transaction_id,legacy_quote_eligible,legacy_bound_at,legacy_bound_by,
 submitted_amount_satang,submitted_transferred_at,receipt_sha256,receipt_mime,receipt_name,octet_length(receipt_bytes) AS receipt_size,
 status,verified_amount_satang,verified_transferred_at,verified_at,admitted_at,owner_note,admin_history,
 notify_status,notify_detail,notified_at,created_at,updated_at`;
export function createAiSourceStore(sql) {
  return {
    ensure: () => ensureAiSourceSchema(sql),
    async findIdempotency(key) { return (await sql.query(`SELECT ${FIELDS},payload_hash FROM mc_ai_source_registrations WHERE idempotency_key=$1`, [key]))[0] || null; },
    async insert(x) {
      const text = `INSERT INTO mc_ai_source_registrations
        (reference,idempotency_key,payload_hash,offer_id,offer_first_seen_at,offer_expires_at,quoted_amount_thb,name,email,contact,
         submitted_amount_satang,submitted_transferred_at,receipt_bytes,receipt_sha256,receipt_mime,receipt_name,consent_at,created_at,updated_at,account_id,checkout_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,decode($13,'base64'),$14,$15,$16,$17,$17,$17,$18,$19)
        ON CONFLICT (idempotency_key) DO NOTHING RETURNING ${FIELDS},payload_hash`;
      const args=[x.reference,x.idempotencyKey,x.payloadHash,x.offer.id,new Date(x.offer.firstSeen),new Date(x.offer.expires),x.quotedAmountTHB,
        x.name,x.email || null,x.contact || null,x.amountSatang,x.transferredAt,x.receipt.base64,x.receipt.sha256,x.receipt.mime,x.receipt.name,x.now,x.accountId || null,x.checkoutId || null];
      const rows = x.accountId ? await learnAccountWrite(sql,x.accountId,text,args) : await sql.query(text,args);
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
    async bindLegacyAccount(reference,email,note,now) {
      const event=JSON.stringify([{action:'bind_account',source:'legacy_manual',actorId:'ai-source-admin',at:new Date(now).toISOString(),note}]);
      return (await sql.query(`UPDATE mc_ai_source_registrations r SET account_id=a.id,legacy_bound_at=$4,legacy_bound_by='ai-source-admin',
        owner_note=$3,admin_history=r.admin_history||$5::jsonb,updated_at=$4 FROM mc_accounts a
        WHERE r.reference=$1 AND r.legacy_quote_eligible=TRUE AND r.account_id IS NULL AND r.checkout_id IS NULL
          AND r.status IN('pending_verification','payment_verified') AND LOWER(BTRIM(r.email))=$2
          AND LOWER(a.email)=$2 AND a.email_verified_at IS NOT NULL
        RETURNING r.reference`,[reference,email,note,now,event]))[0] ? this.get(reference) : null;
    },
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
    async verify(reference, amount, transferred, note, now, bankTransactionId = null) {
      const event = JSON.stringify([{ action:'verify_payment',at:new Date(now).toISOString(),amountSatang:amount,transferredAt:transferred,note }]);
      return (await sql.query(`UPDATE mc_ai_source_registrations SET status='payment_verified',verified_amount_satang=$2,verified_transferred_at=$3,
        verified_at=$4,owner_note=$5,admin_history=admin_history||$6::jsonb,updated_at=$4,bank_transaction_id=$7
        WHERE reference=$1 AND status='pending_verification' RETURNING ${FIELDS}`, [reference,amount,transferred,now,note,event,bankTransactionId]))[0] || null;
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
