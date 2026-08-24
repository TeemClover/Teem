import { database, ensureSchema, sendJson } from './_lib/core.js';
import { confirmDeadlineForDayKey, partyDateKey } from './_lib/xty-rules.js';
import { memberLimitSql, normalizeMemberLimit } from './_lib/member-limit.js';

function codeOf(req) {
  const value = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  return /^\d{5}$/.test(String(value || '')) ? String(value) : '';
}

function previousPartyDateKey(timezone) {
  const now = new Date();
  const today = partyDateKey(now, timezone);
  const [year, month, day] = today.split('-').map(Number);
  return partyDateKey(new Date(Date.UTC(year, month - 1, day - 1, 12)), timezone);
}

/* PostgreSQL DATE may arrive from a driver as either YYYY-MM-DD text or a
   Date object. Public Home compares DATE in SQL, while Public Detail used to
   stringify the driver value and slice it. Date objects therefore became
   strings such as "Sun Aug 23..." and every real commit looked like a
   different day. Normalize every form back to the Book's canonical day key. */
function canonicalDayKey(value, timezone) {
  if (value == null) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return partyDateKey(date, timezone);
}

function memberStatus(member, todayKey, yesterdayKey, verificationMode, now) {
  const todays = member.commits.filter(item => item.dayKey === todayKey);
  const yesterdayPending = member.commits.some(item =>
    item.dayKey === yesterdayKey && !item.confirmedBy && item.deadline && now < item.deadline);

  /* Seen and completion are separate axes in Trust books: signing today makes
     the status green immediately, although that same commit can still be Seen. */
  if (verificationMode !== 'confirm') return todays.length ? 'green' : 'gray';
  if (yesterdayPending) return 'yellow';
  if (!todays.length) return 'gray';
  return todays.some(item => !item.confirmedBy) ? 'yellow' : 'green';
}

export default async function handler(req, res) {
  try {
    if (String(req.method || 'GET').toUpperCase() !== 'GET') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const code = codeOf(req);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const sql = database();
    await ensureSchema(sql);
    const books = await sql.query(`SELECT p.id,p.code,p.visibility,p.state,p.verification_mode,p.timezone,
        ${memberLimitSql('p.id')} AS member_limit
      FROM teambook_books p WHERE p.code=$1 AND p.visibility='public' LIMIT 1`, [code]);
    const book = books[0];
    if (!book) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    const timezone = book.timezone || 'Asia/Bangkok';
    const todayKey = partyDateKey(new Date(), timezone);
    const yesterdayKey = previousPartyDateKey(timezone);
    const verificationMode = book.verification_mode === 'confirm' ? 'confirm' : 'trust';
    const [members, entries] = await Promise.all([
      sql.query(`SELECT user_id,alias,role FROM teambook_book_members
        WHERE book_id=$1 AND left_at IS NULL ORDER BY (role='lead') DESC,joined_at`, [book.id]),
      sql.query(`SELECT e.seq,e.user_id,e.kind,e.day_key,e.retracted,e.sent_at,c.confirmer_id,c.created_at confirmed_at
        FROM teambook_book_entries e
        LEFT JOIN teambook_confirmations c ON c.book_id=e.book_id AND c.commit_seq=e.seq
        WHERE e.book_id=$1 ORDER BY e.seq`, [book.id]),
    ]);

    const now = Date.now();
    const commitRows = entries.filter(row => row.kind === 'commit' && !row.retracted);
    const memberStatuses = members.map(member => {
      const commits = commitRows.filter(row => row.user_id === member.user_id).map(row => {
        const dayKey = canonicalDayKey(row.day_key, timezone);
        const deadline = dayKey ? confirmDeadlineForDayKey(dayKey, timezone) : null;
        return {
          seq: Number(row.seq),
          dayKey,
          confirmedBy: row.confirmer_id || null,
          confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).toISOString() : null,
          deadline: deadline?.getTime() || null,
        };
      });
      return {
        alias: member.alias || 'คนในสมุด',
        role: member.role || 'member',
        status: memberStatus({ commits }, todayKey, yesterdayKey, verificationMode, now),
      };
    });

    let status = 'gray';
    if (memberStatuses.some(member => member.status === 'yellow')) status = 'yellow';
    else if (memberStatuses.some(member => member.status === 'green')) status = 'green';

    const pendingSeen = commitRows.filter(row => {
      if (row.confirmer_id || verificationMode !== 'confirm') return false;
      const dayKey = canonicalDayKey(row.day_key, timezone);
      if (!dayKey) return false;
      const deadline = confirmDeadlineForDayKey(dayKey, timezone);
      return (dayKey === todayKey || dayKey === yesterdayKey) && deadline && now < deadline.getTime();
    });

    const owner = members.find(member => member.role === 'lead') || members[0] || null;
    const maxMembers = normalizeMemberLimit(book.member_limit);
    return sendJson(res, {
      ok: true,
      detail: {
        code,
        verificationMode,
        ownerAlias: owner?.alias || 'เจ้าของสมุด',
        memberCount: members.length,
        maxMembers,
        joinable: members.length < maxMembers,
        updateCount: entries.filter(row => !row.retracted).length,
        status,
        todayKey,
        hasYesterdayPending: pendingSeen.some(row => canonicalDayKey(row.day_key, timezone) === yesterdayKey),
        pendingSeenCount: pendingSeen.length,
        memberStatuses,
      },
    });
  } catch (error) {
    console.error('TeamBook public detail v13 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}
