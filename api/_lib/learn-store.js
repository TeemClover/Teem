import { LearnError, oneYearAfter } from './learn-domain.js';
import { companionEntitlement } from './learn-bonus.js';
import { runSchemaBatch } from './schema-batch.js';

const schemaPromises = new WeakMap();
export const LEARN_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS mc_learn_enrollments (
    user_id TEXT NOT NULL REFERENCES mc_accounts(id), course_id TEXT NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(user_id,course_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mc_learn_instructors (
    user_id TEXT NOT NULL REFERENCES mc_accounts(id), course_id TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL, granted_by TEXT NOT NULL CHECK(length(trim(granted_by)) BETWEEN 1 AND 200),
    grant_reason TEXT NOT NULL DEFAULT '' CHECK(length(grant_reason)<=1000),
    revoked_at TIMESTAMPTZ, revoked_by TEXT, revocation_reason TEXT,
    PRIMARY KEY(user_id,course_id),
    FOREIGN KEY(user_id,course_id) REFERENCES mc_learn_enrollments(user_id,course_id),
    CHECK(revoked_at IS NULL OR revoked_at>=granted_at)
  )`,
  `CREATE TABLE IF NOT EXISTS mc_learn_registration_links (
    reference TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES mc_accounts(id), course_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    FOREIGN KEY(user_id,course_id) REFERENCES mc_learn_enrollments(user_id,course_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mc_learn_links_user ON mc_learn_registration_links(user_id,course_id)`,
  `CREATE TABLE IF NOT EXISTS mc_learn_grants (
    reference TEXT PRIMARY KEY REFERENCES mc_learn_registration_links(reference),
    user_id TEXT NOT NULL REFERENCES mc_accounts(id), course_id TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at>starts_at),
    granted_by TEXT NOT NULL, revoked_at TIMESTAMPTZ, revoked_by TEXT, revocation_reason TEXT,
    FOREIGN KEY(user_id,course_id) REFERENCES mc_learn_enrollments(user_id,course_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mc_learn_grants_user ON mc_learn_grants(user_id,course_id,expires_at)`,
  `CREATE TABLE IF NOT EXISTS mc_learn_progress (
    user_id TEXT NOT NULL REFERENCES mc_accounts(id), course_id TEXT NOT NULL, lesson_id TEXT NOT NULL,
    position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK(position_seconds>=0 AND position_seconds<=86400),
    max_position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK(max_position_seconds>=0 AND max_position_seconds<=86400),
    completed BOOLEAN NOT NULL DEFAULT FALSE, version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(user_id,course_id,lesson_id),
    FOREIGN KEY(user_id,course_id) REFERENCES mc_learn_enrollments(user_id,course_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mc_learn_readings (
    course_id TEXT NOT NULL, lesson_id TEXT NOT NULL,
    body_markdown TEXT NOT NULL CHECK(octet_length(body_markdown)<=200000),
    updated_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(course_id,lesson_id)
  )`,
];

export async function ensureLearnSchema(sql) {
  if (!schemaPromises.has(sql)) {
    const promise = runSchemaBatch(sql, LEARN_SCHEMA)
      .catch(error => { schemaPromises.delete(sql); throw error; });
    schemaPromises.set(sql,promise);
  }
  return schemaPromises.get(sql);
}

export function createLearnStore(sql) {
  return {
    bonusEntitlement: (userId,courseId,now) => companionEntitlement(sql,userId,courseId,now),
    ensure: () => ensureLearnSchema(sql),
    async account(userId) { return (await sql.query('SELECT id,email_verified_at FROM mc_accounts WHERE id=$1',[userId]))[0] || null; },
    async enroll(userId,courseId,now) {
      const rows = await sql.query(`INSERT INTO mc_learn_enrollments(user_id,course_id,registered_at)
        SELECT id,$2,$3 FROM mc_accounts WHERE id=$1 AND email_verified_at IS NOT NULL
        ON CONFLICT(user_id,course_id) DO UPDATE SET registered_at=mc_learn_enrollments.registered_at
        RETURNING user_id,course_id,registered_at`,[userId,courseId,now]);
      if (!rows[0]) throw new LearnError('EMAIL_VERIFICATION_REQUIRED',403);
      return rows[0];
    },
    async enrollments(userId) { return sql.query('SELECT user_id,course_id,registered_at FROM mc_learn_enrollments WHERE user_id=$1 ORDER BY registered_at DESC',[userId]); },
    async enrollment(userId,courseId) { return (await sql.query('SELECT user_id,course_id,registered_at FROM mc_learn_enrollments WHERE user_id=$1 AND course_id=$2',[userId,courseId]))[0] || null; },
    async grants(userId,courseId) { return sql.query(`SELECT reference,course_id,starts_at,expires_at,revoked_at FROM mc_learn_grants
      WHERE user_id=$1 AND ($2::text IS NULL OR course_id=$2)`,[userId,courseId || null]); },
    // Provisioned only by trusted administration, never enrollment or checkout.
    // A course instructor has no payment receipt or purchased access grant.
    async instructors(userId,courseId) { return sql.query(`SELECT user_id,course_id,granted_at,revoked_at FROM mc_learn_instructors
      WHERE user_id=$1 AND ($2::text IS NULL OR course_id=$2)`,[userId,courseId || null]); },
    async reading(courseId,lessonId) { return (await sql.query(`SELECT body_markdown FROM mc_learn_readings
      WHERE course_id=$1 AND lesson_id=$2`,[courseId,lessonId]))[0]?.body_markdown || ''; },
    async registrations(userId,courseId) {
      const links = await sql.query(`SELECT reference,course_id FROM mc_learn_registration_links
        WHERE user_id=$1 AND ($2::text IS NULL OR course_id=$2)`,[userId,courseId || null]);
      // An intro-only learner does not depend on the receipt table being initialized.
      if (!links.length) return [];
      const rows = await sql.query(`SELECT reference,status,created_at FROM mc_ai_source_registrations
        WHERE account_id=$1 AND reference=ANY($2::text[])`,[userId,links.map(r=>r.reference)]);
      return rows.map(r=>({...r,course_id:links.find(l=>l.reference===r.reference).course_id}));
    },
    async progress(userId,courseId) { return sql.query(`SELECT lesson_id,position_seconds,max_position_seconds,completed,version,updated_at
      FROM mc_learn_progress WHERE user_id=$1 AND course_id=$2`,[userId,courseId]); },
    async saveProgress(userId,courseId,lessonId,progress,now) {
      return (await sql.query(`INSERT INTO mc_learn_progress(user_id,course_id,lesson_id,position_seconds,max_position_seconds,completed,updated_at)
        VALUES($1,$2,$3,$4,$4,$5,$6) ON CONFLICT(user_id,course_id,lesson_id) DO UPDATE SET
        position_seconds=EXCLUDED.position_seconds,
        max_position_seconds=GREATEST(mc_learn_progress.max_position_seconds,EXCLUDED.max_position_seconds),
        completed=mc_learn_progress.completed OR EXCLUDED.completed,
        version=mc_learn_progress.version+1,updated_at=EXCLUDED.updated_at
        RETURNING lesson_id,position_seconds,max_position_seconds,completed,version,updated_at`,
      [userId,courseId,lessonId,progress.positionSeconds,progress.completed,now]))[0];
    },
  };
}

// Trusted server integrations only. No /learn action accepts a payment reference
// or client-supplied account ID as evidence of ownership or payment.
export async function recordLearnRegistration(sql,{reference,courseId,userId,now=new Date()}) {
  await ensureLearnSchema(sql);
  const rows = await sql.query(`WITH eligible AS (
    SELECT r.reference,r.account_id FROM mc_ai_source_registrations r
    JOIN mc_accounts a ON a.id=r.account_id
    WHERE r.reference=$1 AND r.account_id=$2 AND a.email_verified_at IS NOT NULL
  ), enrollment AS (
    INSERT INTO mc_learn_enrollments(user_id,course_id,registered_at)
    SELECT account_id,$3,$4 FROM eligible ON CONFLICT(user_id,course_id)
    DO UPDATE SET registered_at=mc_learn_enrollments.registered_at RETURNING user_id
  ) INSERT INTO mc_learn_registration_links(reference,user_id,course_id,created_at)
    SELECT eligible.reference,eligible.account_id,$3,$4 FROM eligible JOIN enrollment ON enrollment.user_id=eligible.account_id
    ON CONFLICT(reference) DO UPDATE SET reference=EXCLUDED.reference
      WHERE mc_learn_registration_links.user_id=EXCLUDED.user_id AND mc_learn_registration_links.course_id=EXCLUDED.course_id
    RETURNING reference,user_id,course_id,created_at`,[reference,userId,courseId,now]);
  if (!rows[0]) throw new LearnError('REGISTRATION_ACCOUNT_MISMATCH',409);
  return rows[0];
}

export async function grantForVerifiedRegistration(sql,{reference,actorId,note='',now=new Date()}) {
  if (typeof actorId !== 'string' || !actorId.trim() || actorId.length>200) throw new LearnError('GRANT_ACTOR_REQUIRED');
  if (typeof note !== 'string' || note.length>1000) throw new LearnError('INVALID_GRANT_NOTE');
  await ensureLearnSchema(sql);
  const rows = await sql.query(`SELECT r.reference,r.account_id,r.status,r.verified_at,r.verified_amount_satang,r.verified_transferred_at,
    a.email_verified_at FROM mc_ai_source_registrations r LEFT JOIN mc_accounts a ON a.id=r.account_id WHERE r.reference=$1`,[reference]);
  const row = rows[0];
  if (!row || !['payment_verified','admitted'].includes(row.status) || !row.verified_at || !row.verified_transferred_at
    || !(Number(row.verified_amount_satang)>0)) throw new LearnError('PAYMENT_NOT_VERIFIED',409);
  if (!row.account_id || !row.email_verified_at) throw new LearnError('VERIFIED_ACCOUNT_REQUIRED',409);
  // This payment system currently sells only AI Sauce; never accept courseId from a receipt client.
  await recordLearnRegistration(sql,{reference,userId:row.account_id,courseId:'ai-sauce',now});
  const expiresAt = oneYearAfter(now);
  const history = JSON.stringify([{action:'mark_admitted',source:'learn',actorId,note,at:new Date(now).toISOString()}]);
  // The entitlement and admitted state commit in the same SQL statement. A retry
  // keeps the original start/expiry; revoked grants cannot be resurrected here.
  const grants = await sql.query(`WITH eligible AS MATERIALIZED (
    SELECT r.reference,r.account_id,l.course_id FROM mc_ai_source_registrations r
    JOIN mc_learn_registration_links l ON l.reference=r.reference AND l.user_id=r.account_id
    JOIN mc_accounts a ON a.id=r.account_id
    WHERE r.reference=$1 AND r.status IN ('payment_verified','admitted') AND r.verified_at IS NOT NULL
      AND r.verified_transferred_at IS NOT NULL AND r.verified_amount_satang>0 AND a.email_verified_at IS NOT NULL
    FOR UPDATE OF r
  ), granted AS (
    INSERT INTO mc_learn_grants(reference,user_id,course_id,starts_at,expires_at,granted_by)
    SELECT reference,account_id,course_id,$2,$3,$4 FROM eligible WHERE TRUE
    ON CONFLICT(reference) DO UPDATE SET reference=mc_learn_grants.reference
      WHERE mc_learn_grants.user_id=EXCLUDED.user_id AND mc_learn_grants.course_id=EXCLUDED.course_id
        AND mc_learn_grants.revoked_at IS NULL
    RETURNING reference,user_id,course_id,starts_at,expires_at,revoked_at
  ), admitted AS (
    UPDATE mc_ai_source_registrations r SET status='admitted',admitted_at=COALESCE(r.admitted_at,g.starts_at),
      updated_at=$2,owner_note=CASE WHEN r.status='admitted' THEN r.owner_note ELSE $6 END,
      admin_history=CASE WHEN r.status='admitted' THEN r.admin_history ELSE r.admin_history||$5::jsonb END
    FROM granted g WHERE r.reference=g.reference AND r.account_id=g.user_id
      AND r.status IN ('payment_verified','admitted') RETURNING r.reference
  ) SELECT g.* FROM granted g JOIN admitted a ON a.reference=g.reference`,[reference,now,expiresAt,actorId,history,note]);
  if (!grants[0]) throw new LearnError('GRANT_REVOKED_OR_CONFLICT',409);
  return grants[0];
}

export async function revokeLearnAccess(sql,{reference,actorId,reason,now=new Date()}) {
  if (typeof actorId !== 'string' || !actorId.trim() || actorId.length>200
    || typeof reason !== 'string' || !reason.trim() || reason.length>1000) throw new LearnError('REVOCATION_REASON_REQUIRED');
  await ensureLearnSchema(sql);
  return (await sql.query(`UPDATE mc_learn_grants SET revoked_at=COALESCE(revoked_at,$2),
    revoked_by=COALESCE(revoked_by,$3),revocation_reason=COALESCE(revocation_reason,$4)
    WHERE reference=$1 RETURNING reference,user_id,course_id,starts_at,expires_at,revoked_at`,[reference,now,actorId,reason]))[0] || null;
}
