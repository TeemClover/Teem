import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './_lib/core.js';
import {
  TEAMBOOK_TIMEZONE, confirmDeadlineForDayKey, partyDateKey, partyDayNumber,
} from './_lib/xty-rules.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function validCode(value) {
  return /^\d{5}$/.test(String(value || ''));
}

function publicWitnessId(token) {
  return sha256(`teambook-public-witness-v13:${String(token || '')}`)
    .then(hash => `public:${hash.slice(0, 32)}`);
}

function dateKeyOf(value, timezone) {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : partyDateKey(value, timezone);
}

async function publicBook(sql, code) {
  const rows = await sql.query(`SELECT id,code,name,visibility,state,started_at,created_at,timezone
    FROM teambook_books WHERE code=$1 LIMIT 1`, [code]);
  const row = rows[0] || null;
  if (!row || row.visibility !== 'public') return null;
  if (!ACTIVE_STATES.includes(String(row.state || '').toUpperCase())) return null;
  return row;
}

async function witnessIdentityIds(req, sql, profileId) {
  const ids = [];
  const account = await currentUser(req, sql);
  if (account?.id) ids.push(`account:${account.id}`);
  const local = clean(profileId, 80);
  if (/^[a-z0-9_-]{6,80}$/i.test(local)) ids.push(`local:${local}`);
  return [...new Set(ids)];
}

async function pendingCommits(sql, row) {
  const now = new Date();
  const timezone = row.timezone || TEAMBOOK_TIMEZONE;
  const rows = await sql.query(`SELECT e.seq,e.user_id,e.body,e.sent_at,e.day_key,e.activity_label,
      COALESCE(m.alias,'สมาชิกในสมุด') alias,
      COALESCE(m.avatar,'orange_cat') avatar,
      COALESCE(m.avatar_color,'green') avatar_color,
      c.confirmer_id
    FROM teambook_book_entries e
    LEFT JOIN teambook_book_members m ON m.book_id=e.book_id AND m.user_id=e.user_id
    LEFT JOIN teambook_confirmations c ON c.book_id=e.book_id AND c.commit_seq=e.seq
    WHERE e.book_id=$1 AND e.kind='commit' AND e.retracted=FALSE
    ORDER BY e.seq DESC LIMIT 30`, [row.id]);

  return rows
    .filter(item => !item.confirmer_id)
    .filter(item => {
      const deadline = confirmDeadlineForDayKey(dateKeyOf(item.day_key, timezone), timezone);
      return deadline && now.getTime() < deadline.getTime();
    })
    .slice(0, 5)
    .map(item => ({
      seq: Number(item.seq),
      alias: item.alias,
      avatar: item.avatar,
      avatarColor: item.avatar_color,
      note: clean(item.body, 300) || '✓',
      activityLabel: clean(item.activity_label, 60) || '',
      sentAt: new Date(item.sent_at).toISOString(),
    }));
}

export default async function handler(req, res) {
  let sql;
  try {
    sql = database();
    await ensureSchema(sql);
    const method = String(req.method || 'GET').toUpperCase();
    const body = bodyOf(req);
    const code = String(method === 'GET' ? (req.query?.code || '') : (body.code || '')).trim();
    if (!validCode(code)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const row = await publicBook(sql, code);
    if (!row) return sendJson(res, { ok: false, error: 'NOT_PUBLIC_OR_CLOSED' }, 404);

    if (method === 'GET') {
      return sendJson(res, { ok: true, code: row.code, pending: await pendingCommits(sql, row) });
    }

    if (method !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    const seq = Number(body.seq);
    if (!Number.isInteger(seq) || seq < 1) return sendJson(res, { ok: false, error: 'BAD_SEQ' }, 400);
    const witnessToken = clean(body.witnessToken, 160);
    if (witnessToken.length < 12) return sendJson(res, { ok: false, error: 'WITNESS_TOKEN_REQUIRED' }, 400);

    const commits = await sql.query(`SELECT e.seq,e.user_id,e.day_key,e.sent_at,
        COALESCE(m.alias,'สมาชิกในสมุด') alias
      FROM teambook_book_entries e
      LEFT JOIN teambook_book_members m ON m.book_id=e.book_id AND m.user_id=e.user_id
      WHERE e.book_id=$1 AND e.seq=$2 AND e.kind='commit' AND e.retracted=FALSE LIMIT 1`, [row.id, seq]);
    const commit = commits[0];
    if (!commit) return sendJson(res, { ok: false, error: 'NO_COMMIT' }, 404);

    const timezone = row.timezone || TEAMBOOK_TIMEZONE;
    const deadline = confirmDeadlineForDayKey(dateKeyOf(commit.day_key, timezone), timezone);
    const at = new Date();
    if (!deadline || at.getTime() >= deadline.getTime()) {
      return sendJson(res, { ok: false, error: 'CONFIRM_WINDOW_CLOSED' }, 409);
    }

    const identityIds = await witnessIdentityIds(req, sql, body.profileId);
    if (identityIds.includes(commit.user_id)) {
      return sendJson(res, { ok: false, error: 'CANNOT_CONFIRM_SELF' }, 409);
    }

    const confirmerId = await publicWitnessId(witnessToken);
    const saved = await sql.query(`INSERT INTO teambook_confirmations (book_id,commit_seq,confirmer_id,created_at)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (book_id,commit_seq) DO NOTHING RETURNING commit_seq`, [row.id, seq, confirmerId, at]);
    if (!saved[0]) return sendJson(res, { ok: false, error: 'ALREADY_CONFIRMED' }, 409);

    const message = `👀 มีใครบางคนนอกสมุดเห็นสิ่งที่ ${commit.alias} ทำแล้ว`;
    const partyDay = partyDayNumber(row.started_at || row.created_at || at, at, timezone);
    await sql.query(`WITH event AS (
        INSERT INTO teambook_book_events (book_id,type,actor_id,party_day,data_json,created_at)
        VALUES ($1,'PUBLIC_SEEN',NULL,$2,$3::jsonb,$4) RETURNING book_id
      ) UPDATE teambook_books SET updated_at=$4 WHERE id=$1 AND EXISTS (SELECT 1 FROM event)`, [
      row.id, partyDay, JSON.stringify({ seq, alias: commit.alias, message, source: 'public' }), at,
    ]);

    /* Deliberately no firstSeenRewardFor(), no teambook_card_unlock_events and
       no teambook_user_cards write here. Public witnessing settles the author's
       trace, but it never grants or consumes the witness's First Seen reward. */
    return sendJson(res, {
      ok: true,
      confirmed: true,
      source: 'public',
      message: 'เห็นแล้ว · รอยนี้ถูกส่งกลับเข้าไปในสมุดแล้ว',
    });
  } catch (error) {
    console.error('TeamBook public Seen failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_PUBLIC_SEEN_ERROR' }, 500);
  }
}
