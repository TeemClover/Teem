import { database, ensureSchema, sendJson } from './_lib/core.js';
import { confirmDeadlineForDayKey, partyDateKey } from './_lib/xty-rules.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const PAGE_SIZE = 16;

function decodeCursor(value) {
  try {
    return Math.max(0, Number(Buffer.from(String(value || ''), 'base64url').toString('utf8')) || 0);
  } catch { return 0; }
}

function encodeCursor(value) {
  return Buffer.from(String(value)).toString('base64url');
}

function statusRank(status) {
  return status === 'yellow' ? 2 : (status === 'green' ? 1 : 0);
}

function bookStatus({ verificationMode, todayCommits, yesterdayPending }) {
  if (yesterdayPending > 0) return 'yellow';
  if (!todayCommits.length) return 'gray';
  if (verificationMode !== 'confirm') return 'green';
  return todayCommits.some(commit => !commit.confirmedBy) ? 'yellow' : 'green';
}

export default async function handler(req, res) {
  try {
    if (String(req.method || 'GET').toUpperCase() !== 'GET') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const sql = database();
    await ensureSchema(sql);
    const offset = decodeCursor(req.query?.cursor);
    const todayKey = partyDateKey(new Date());
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayKey = partyDateKey(yesterday);
    const rows = await sql.query(`SELECT p.id,p.code,p.name,p.activity,p.duration_days,p.state,p.started_at,p.created_at,
        p.timezone,p.verification_mode,p.cover_type,p.cover_value,p.lead_card_id,p.npc_card_id,p.pet_id,p.updated_at,
        COUNT(DISTINCT m.user_id) FILTER (WHERE m.left_at IS NULL)::int member_count,
        MAX(m.alias) FILTER (WHERE m.role='lead' AND m.left_at IS NULL) lead_alias,
        MAX(m.avatar) FILTER (WHERE m.role='lead' AND m.left_at IS NULL) lead_avatar,
        MAX(m.avatar_color) FILTER (WHERE m.role='lead' AND m.left_at IS NULL) lead_avatar_color,
        COUNT(DISTINCT e.seq) FILTER (WHERE e.retracted=FALSE)::int update_count,
        COUNT(DISTINCT e.seq) FILTER (WHERE e.kind='commit' AND e.retracted=FALSE AND e.day_key=$1::date)::int today_commit_count,
        COUNT(DISTINCT e.seq) FILTER (WHERE e.kind='commit' AND e.retracted=FALSE AND e.day_key=$1::date AND c.commit_seq IS NULL)::int today_pending_count,
        COUNT(DISTINCT e.seq) FILTER (WHERE e.kind='commit' AND e.retracted=FALSE AND e.day_key=$2::date AND c.commit_seq IS NULL)::int yesterday_pending_count
      FROM teambook_books p
      LEFT JOIN teambook_book_members m ON m.book_id=p.id
      LEFT JOIN teambook_book_entries e ON e.book_id=p.id
      LEFT JOIN teambook_confirmations c ON c.book_id=e.book_id AND c.commit_seq=e.seq
      WHERE p.visibility='public' AND p.state = ANY($3::text[])
      GROUP BY p.id
      ORDER BY p.updated_at DESC,p.id DESC
      LIMIT $4 OFFSET $5`, [todayKey, yesterdayKey, ACTIVE_STATES, PAGE_SIZE + 1, offset]);

    const now = Date.now();
    const pageRows = rows.slice(0, PAGE_SIZE);
    const parties = pageRows.map(row => {
      const verificationMode = String(row.verification_mode || 'trust') === 'confirm' ? 'confirm' : 'trust';
      let yesterdayPending = Number(row.yesterday_pending_count || 0);
      const deadline = confirmDeadlineForDayKey(yesterdayKey, row.timezone || 'Asia/Bangkok');
      if (!deadline || now >= deadline.getTime()) yesterdayPending = 0;
      const todayCommitCount = Number(row.today_commit_count || 0);
      const todayPendingCount = Number(row.today_pending_count || 0);
      const status = bookStatus({
        verificationMode,
        todayCommits: Array.from({ length: todayCommitCount }, (_, index) => ({ confirmedBy: index >= todayPendingCount })),
        yesterdayPending,
      });
      return {
        code: row.code,
        name: row.name,
        activity: row.activity || '',
        verificationMode,
        durationDays: Number(row.duration_days || 3),
        memberCount: Number(row.member_count || 0),
        maxMembers: 5,
        ownerAlias: row.lead_alias || 'เจ้าของสมุด',
        updateCount: Number(row.update_count || 0),
        todayCommitCount,
        pendingSeenCount: todayPendingCount + yesterdayPending,
        status,
        statusRank: statusRank(status),
        lead: {
          alias: row.lead_alias || 'เจ้าของสมุด',
          avatar: row.lead_avatar || 'orange_cat',
          avatarColor: row.lead_avatar_color || 'green',
        },
        coverType: row.cover_type === 'image' ? 'card_back' : (row.cover_type || 'card_back'),
        coverValue: row.cover_type === 'image' ? 'notebook-rgbs-v1' : (row.cover_value || row.lead_card_id || null),
        npcCardId: row.npc_card_id || null,
        petId: row.pet_id || null,
        joinable: Number(row.member_count || 0) < 5,
      };
    });

    return sendJson(res, {
      ok: true,
      parties,
      nextCursor: rows.length > PAGE_SIZE ? encodeCursor(offset + PAGE_SIZE) : null,
      statusLegend: {
        green: 'วันนี้ผ่านแล้ว',
        yellow: 'มีรอยรอเห็นแล้ว',
        gray: 'วันนี้ยังไม่มีรอย',
      },
    });
  } catch (error) {
    console.error('TeamBook public list v13 failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}
