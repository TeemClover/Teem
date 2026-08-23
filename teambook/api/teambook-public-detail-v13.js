import { database, ensureSchema, sendJson } from './_lib/core.js';
import { confirmDeadlineForDayKey, partyDateKey } from './_lib/xty-rules.js';

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

function memberStatus(member, todayKey, yesterdayKey, verificationMode, now) {
  const todays = member.commits.filter(item => item.dayKey === todayKey);
  const yesterdayPending = member.commits.some(item =>
    item.dayKey === yesterdayKey && !item.confirmedBy && item.deadline && now < item.deadline);
  if (yesterdayPending) return 'yellow';
  if (!todays.length) return 'gray';
  if (verificationMode !== 'confirm') return 'green';
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
    const books = await sql.query(`SELECT id,code,visibility,state,verification_mode,timezone
      FROM teambook_books WHERE code=$1 AND visibility='public' LIMIT 1`, [code]);
    const book = books[0];
    if (!book) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    const timezone = book.timezone || 'Asia/Bangkok';
    const todayKey = partyDateKey(new Date(), timezone);
    const yesterdayKey = previousPartyDateKey(timezone);
    const verificationMode = book.verification_mode === 'confirm' ? 'confirm' : 'trust';
    const [members, entries] = await Promise.all([
      sql.query(`SELECT user_id,alias,role FROM teambook_book_members
        WHERE book_id=$1 AND left_at IS NULL ORDER BY joined_at`, [book.id]),
      sql.query(`SELECT e.seq,e.user_id,e.kind,e.day_key,e.retracted,e.sent_at,c.confirmer_id,c.created_at confirmed_at
        FROM teambook_book_entries e
        LEFT JOIN teambook_confirmations c ON c.book_id=e.book_id AND c.commit_seq=e.seq
        WHERE e.book_id=$1 ORDER BY e.seq`, [book.id]),
    ]);

    const now = Date.now();
    const commitRows = entries.filter(row => row.kind === 'commit' && !row.retracted);
    const memberStatuses = members.map(member => {
      const commits = commitRows.filter(row => row.user_id === member.user_id).map(row => {
        const dayKey = String(row.day_key).slice(0, 10);
        const deadline = confirmDeadlineForDayKey(dayKey, timezone);
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
      const dayKey = String(row.day_key).slice(0, 10);
      const deadline = confirmDeadlineForDayKey(dayKey, timezone);
      return (dayKey === todayKey || dayKey === yesterdayKey) && deadline && now < deadline.getTime();
    });

    const owner = members.find(member => member.role === 'lead') || members[0] || null;
    return sendJson(res, {
      ok: true,
      detail: {
        code,
        verificationMode,
        ownerAlias: owner?.alias || 'เจ้าของสมุด',
        memberCount: members.length,
        maxMembers: 5,
        updateCount: entries.filter(row => !row.retracted).length,
        status,
        todayKey,
        hasYesterdayPending: memberStatuses.some(member => member.status === 'yellow')
          && pendingSeen.some(row => String(row.day_key).slice(0, 10) === yesterdayKey),
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
