import {
  getAdminCards,
  getAdminEvents,
  getAdminPartyDetail,
  getAdminSystem,
  getAdminUsers,
  normalizeAdminPartyQuery,
  normalizeAdminRange,
} from './xty-admin-stats.js';
import { TEAMBOOK_TIMEZONE, partyDayNumber, startOfPartyDay } from './xty-rules.js';
import { memberLimitSql, normalizeMemberLimit } from './member-limit.js';

export { getAdminCards, getAdminEvents, getAdminPartyDetail, getAdminSystem, getAdminUsers };

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function n(value) { return Number(value || 0); }
function iso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function encodeOffset(value) { return Buffer.from(String(value)).toString('base64url'); }
function safeCode(error) {
  const value = String(error?.code || 'QUERY_FAILED');
  return /^[A-Z0-9_]{2,60}$/i.test(value) ? value : 'QUERY_FAILED';
}

async function safeQuery(sql, label, statement, values, warnings) {
  try {
    return await sql.query(statement, values || []);
  } catch (error) {
    console.error(`TeamBook admin stats query failed: ${label}`, error);
    warnings.push({ label, code: safeCode(error) });
    return [];
  }
}

function rowNumbers(row = {}) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === null ? null : Number(value || 0)]));
}

export async function getAdminSummary(sql, rangeValue, at = new Date()) {
  const range = normalizeAdminRange(rangeValue, at);
  const params = [range.start, range.end];
  const partyParams = [range.start, range.end, ACTIVE_STATES];
  const warnings = [];

  const [users, activeUsers, parties, activity, cards, quest, confirms, progression, otp, durations] = await Promise.all([
    safeQuery(sql, 'summary.users', `WITH seen AS (
        SELECT user_id,MIN(joined_at) first_seen FROM teambook_book_members GROUP BY user_id
        UNION ALL SELECT user_id,MIN(acquired_at) FROM teambook_user_cards GROUP BY user_id
        UNION ALL SELECT user_id,MIN(created_at) FROM teambook_card_unlock_events GROUP BY user_id
        UNION ALL SELECT user_id,MIN(updated_at) FROM teambook_progression GROUP BY user_id
      ), users AS (SELECT user_id,MIN(first_seen) first_seen FROM seen GROUP BY user_id), meaningful AS (
        SELECT user_id FROM teambook_progression WHERE level>1
        UNION SELECT user_id FROM teambook_user_cards
        UNION SELECT m.user_id FROM teambook_book_members m JOIN teambook_books p ON p.id=m.book_id WHERE p.state='COMPLETED'
      ) SELECT COUNT(*)::int total,
        COUNT(*) FILTER (WHERE user_id LIKE 'account:%')::int bound,
        COUNT(*) FILTER (WHERE user_id NOT LIKE 'account:%')::int guest,
        COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR first_seen >= $1) AND first_seen <= $2)::int new,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM meaningful))::int meaningful,
        COUNT(*) FILTER (WHERE user_id LIKE 'account:%' AND user_id IN (SELECT user_id FROM meaningful))::int bound_meaningful
      FROM users`, params, warnings),

    safeQuery(sql, 'summary.activeUsers', `WITH activity AS (
        SELECT user_id,sent_at at FROM teambook_book_entries WHERE retracted=FALSE
        UNION ALL SELECT user_id,created_at FROM teambook_reactions WHERE created_at IS NOT NULL
        UNION ALL SELECT confirmer_id,created_at FROM teambook_confirmations
        UNION ALL SELECT actor_id,created_at FROM teambook_book_events WHERE actor_id IS NOT NULL
        UNION ALL SELECT user_id,joined_at FROM teambook_book_members
        UNION ALL SELECT user_id,revealed_at FROM teambook_card_unlock_events WHERE revealed_at IS NOT NULL
      ) SELECT COUNT(DISTINCT user_id)::int active FROM activity
      WHERE ($1::timestamptz IS NULL OR at >= $1) AND at <= $2`, params, warnings),

    safeQuery(sql, 'summary.parties', `SELECT
        COUNT(*) FILTER (WHERE state=ANY($3::text[]))::int active,
        COUNT(*) FILTER (WHERE state='COMPLETED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int completed,
        COUNT(*) FILTER (WHERE state='DISSOLVED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int dissolved,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND visibility='public')::int public,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND visibility='private')::int private,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND verification_mode='trust')::int trust,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND verification_mode='confirm')::int confirm
      FROM teambook_books`, partyParams, warnings),

    safeQuery(sql, 'summary.activity', `SELECT
        (SELECT COUNT(*) FROM teambook_book_entries WHERE kind='commit' AND retracted=FALSE AND ($1::timestamptz IS NULL OR sent_at >= $1) AND sent_at <= $2)::int commits,
        (SELECT COUNT(*) FROM teambook_book_entries WHERE kind='message' AND retracted=FALSE AND ($1::timestamptz IS NULL OR sent_at >= $1) AND sent_at <= $2)::int messages,
        (SELECT COUNT(*) FROM teambook_reactions WHERE created_at IS NOT NULL AND ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int reactions,
        (SELECT COUNT(*) FROM teambook_confirmations WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int confirms,
        (SELECT COUNT(*) FROM teambook_reactions WHERE created_at IS NULL)::int legacy_reactions_without_timestamp,
        (SELECT COUNT(*) FROM teambook_book_entries p JOIN teambook_books q ON q.id=p.book_id
          LEFT JOIN teambook_confirmations c ON c.book_id=p.book_id AND c.commit_seq=p.seq
          WHERE p.kind='commit' AND p.retracted=FALSE AND q.verification_mode='confirm' AND c.commit_seq IS NULL
          AND p.day_key >= ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - 1))::int waiting_confirm`, params, warnings),

    safeQuery(sql, 'summary.cards', `SELECT
        COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int rewards,
        COUNT(*) FILTER (WHERE revealed_at IS NOT NULL AND ($1::timestamptz IS NULL OR revealed_at >= $1) AND revealed_at <= $2)::int revealed,
        COUNT(*) FILTER (WHERE revealed_at IS NULL)::int pending,
        (SELECT COUNT(DISTINCT user_id) FROM teambook_user_cards)::int owners
      FROM teambook_card_unlock_events`, params, warnings),

    safeQuery(sql, 'summary.quest', `WITH cohort AS (
        SELECT * FROM teambook_books WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2
      ) SELECT COUNT(*)::int created,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM teambook_book_entries p WHERE p.book_id=cohort.id AND p.kind='commit' AND p.retracted=FALSE))::int first_commit,
        COUNT(*) FILTER (WHERE state='COMPLETED')::int completed,
        COUNT(*) FILTER (WHERE state='DISSOLVED')::int dissolved,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND COALESCE(scheduled_end_at,created_at + duration_days * INTERVAL '1 day') <= $2)::int eligible_expired,
        COUNT(*) FILTER (WHERE state='COMPLETED' AND EXISTS (
          SELECT 1 FROM teambook_card_unlock_events r WHERE r.book_id=cohort.id AND r.revealed_at IS NOT NULL
        ))::int reward_revealed
      FROM cohort`, partyParams, warnings),

    safeQuery(sql, 'summary.confirms', `SELECT COUNT(*)::int requests,
        COUNT(c.commit_seq)::int confirmed,
        COUNT(*) FILTER (WHERE c.commit_seq IS NULL AND p.day_key >= ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - 1))::int pending,
        COUNT(*) FILTER (WHERE c.commit_seq IS NULL AND p.day_key < ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - 1))::int expired,
        COUNT(*) FILTER (WHERE c.created_at IS NOT NULL AND (c.created_at AT TIME ZONE 'Asia/Bangkok')::date=(p.sent_at AT TIME ZONE 'Asia/Bangkok')::date)::int same_day,
        COUNT(*) FILTER (WHERE c.created_at IS NOT NULL AND (c.created_at AT TIME ZONE 'Asia/Bangkok')::date=((p.sent_at AT TIME ZONE 'Asia/Bangkok')::date + 1))::int next_day
      FROM teambook_book_entries p JOIN teambook_books q ON q.id=p.book_id
      LEFT JOIN teambook_confirmations c ON c.book_id=p.book_id AND c.commit_seq=p.seq
      WHERE p.kind='commit' AND p.retracted=FALSE AND q.verification_mode='confirm'
        AND ($1::timestamptz IS NULL OR p.sent_at >= $1) AND p.sent_at <= $2`, params, warnings),

    safeQuery(sql, 'summary.progression', `WITH users AS (
        SELECT user_id FROM teambook_book_members UNION SELECT user_id FROM teambook_progression
        UNION SELECT user_id FROM teambook_user_cards UNION SELECT user_id FROM teambook_card_unlock_events
      ), active_owned AS (
        SELECT owner_id user_id,COUNT(*)::int n FROM teambook_books WHERE state=ANY($1::text[]) GROUP BY owner_id
      ), shaped AS (
        SELECT u.user_id,COALESCE(p.level,1)::int level,COALESCE(p.paid_tier,'free') tier,
          COALESCE(p.unlocked_bonus_slots,0)::int bonus,COALESCE(a.n,0)::int active_owned
        FROM users u LEFT JOIN teambook_progression p ON p.user_id=u.user_id LEFT JOIN active_owned a ON a.user_id=u.user_id
      ) SELECT COUNT(*) FILTER (WHERE level=1)::int level_1,
        COUNT(*) FILTER (WHERE level=2)::int level_2,
        COUNT(*) FILTER (WHERE level=3)::int level_3,
        COUNT(*) FILTER (WHERE level=4)::int level_4,
        COUNT(*) FILTER (WHERE tier='free')::int free,
        COUNT(*) FILTER (WHERE tier='plus')::int plus,
        COUNT(*) FILTER (WHERE tier='max')::int max,
        COUNT(*) FILTER (WHERE active_owned>=level+bonus)::int at_create_capacity
      FROM shaped`, [ACTIVE_STATES], warnings),

    safeQuery(sql, 'summary.otp', `SELECT
        COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int sent,
        COUNT(*) FILTER (WHERE used_at IS NOT NULL AND ($1::timestamptz IS NULL OR used_at >= $1) AND used_at <= $2)::int verified
      FROM teambook_email_otps`, params, warnings),

    safeQuery(sql, 'summary.durations', `SELECT duration_days,
        COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int started,
        COUNT(*) FILTER (WHERE state='COMPLETED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int completed,
        COUNT(*) FILTER (WHERE state='DISSOLVED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int dissolved
      FROM teambook_books WHERE duration_days IN (7,14,28) GROUP BY duration_days ORDER BY duration_days`, params, warnings),
  ]);

  const user = users[0] || {};
  const meaningful = n(user.meaningful);
  const questRow = quest[0] || {};
  const confirmRow = confirms[0] || {};
  const confirmed = n(confirmRow.confirmed);
  const terminal = n(questRow.completed) + n(questRow.dissolved) + n(questRow.eligible_expired);

  return {
    range: range.key,
    generatedAt: new Date(at).toISOString(),
    warnings,
    users: {
      total: n(user.total), active: n(activeUsers[0]?.active), new: n(user.new), guest: n(user.guest), bound: n(user.bound), meaningful,
      emailSaveRate: meaningful ? Math.round((n(user.bound_meaningful) / meaningful) * 1000) / 10 : 0,
    },
    parties: rowNumbers(parties[0] || {}),
    activity: rowNumbers(activity[0] || {}),
    cards: rowNumbers(cards[0] || {}),
    quest: {
      created: n(questRow.created), firstCommit: n(questRow.first_commit), completed: n(questRow.completed), dissolved: n(questRow.dissolved),
      rewardRevealed: n(questRow.reward_revealed), nextQuest: 0,
      firstCommitRate: n(questRow.created) ? Math.round((n(questRow.first_commit) / n(questRow.created)) * 1000) / 10 : 0,
      completionRate: terminal ? Math.round((n(questRow.completed) / terminal) * 1000) / 10 : 0,
    },
    confirms: {
      requests: n(confirmRow.requests), confirmed, pending: n(confirmRow.pending), expired: n(confirmRow.expired),
      sameDayRate: confirmed ? Math.round((n(confirmRow.same_day) / confirmed) * 1000) / 10 : 0,
      nextDayRate: confirmed ? Math.round((n(confirmRow.next_day) / confirmed) * 1000) / 10 : 0,
      medianSeconds: null, p90Seconds: null,
    },
    progression: rowNumbers(progression[0] || {}),
    save: { otpSent: n(otp[0]?.sent), otpVerified: n(otp[0]?.verified), otpAttempts: null, recoveryLogins: null, migrations: null },
    collection: { zero: 0, one: 0, two_to_five: 0, six_plus: 0, average_per_collector: null },
    durations: durations.map(row => {
      const denominator = n(row.completed) + n(row.dissolved);
      return {
        days: n(row.duration_days), started: n(row.started), completed: n(row.completed), dissolved: n(row.dissolved),
        completionRate: denominator ? Math.round((n(row.completed) / denominator) * 1000) / 10 : 0,
      };
    }),
    integrity: { issues: 0 },
  };
}

export async function getAdminActivity(sql, rangeValue, at = new Date()) {
  const range = normalizeAdminRange(rangeValue, at);
  const values = [range.start, range.end];
  const warnings = [];
  const [posts, reactions, confirms, partyEvents] = await Promise.all([
    safeQuery(sql, 'activity.posts', `SELECT (sent_at AT TIME ZONE 'Asia/Bangkok')::date AS bucket_day,
        COUNT(*) FILTER (WHERE kind='commit' AND retracted=FALSE)::int commits,
        COUNT(*) FILTER (WHERE kind='message' AND retracted=FALSE)::int messages
      FROM teambook_book_entries WHERE ($1::timestamptz IS NULL OR sent_at >= $1) AND sent_at <= $2
      GROUP BY 1 ORDER BY 1`, values, warnings),
    safeQuery(sql, 'activity.reactions', `SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date AS bucket_day,COUNT(*)::int reactions
      FROM teambook_reactions WHERE created_at IS NOT NULL AND ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2
      GROUP BY 1 ORDER BY 1`, values, warnings),
    safeQuery(sql, 'activity.confirms', `SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date AS bucket_day,COUNT(*)::int confirms
      FROM teambook_confirmations WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2
      GROUP BY 1 ORDER BY 1`, values, warnings),
    safeQuery(sql, 'activity.partyEvents', `SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date AS bucket_day,
        COUNT(*) FILTER (WHERE type='PARTY_CREATED')::int parties_created,
        COUNT(*) FILTER (WHERE type='PARTY_COMPLETED')::int parties_completed
      FROM teambook_book_events WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2
      GROUP BY 1 ORDER BY 1`, values, warnings),
  ]);

  const days = new Map();
  const touch = value => {
    const key = String(value).slice(0, 10);
    if (!days.has(key)) days.set(key, { date: key, commits: 0, messages: 0, reactions: 0, confirms: 0, partiesCreated: 0, partiesCompleted: 0 });
    return days.get(key);
  };
  posts.forEach(row => Object.assign(touch(row.bucket_day), { commits: n(row.commits), messages: n(row.messages) }));
  reactions.forEach(row => { touch(row.bucket_day).reactions = n(row.reactions); });
  confirms.forEach(row => { touch(row.bucket_day).confirms = n(row.confirms); });
  partyEvents.forEach(row => Object.assign(touch(row.bucket_day), { partiesCreated: n(row.parties_created), partiesCompleted: n(row.parties_completed) }));

  return { range: range.key, warnings, buckets: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

export async function getAdminParties(sql, rawQuery = {}, at = new Date()) {
  const query = normalizeAdminPartyQuery(rawQuery);
  const warnings = [];
  const values = [startOfPartyDay(at, TEAMBOOK_TIMEZONE)];
  const where = [];
  const add = value => { values.push(value); return `$${values.length}`; };
  let activePlaceholder = '';
  const activeParam = () => {
    if (!activePlaceholder) activePlaceholder = add(ACTIVE_STATES);
    return activePlaceholder;
  };

  if (query.status === 'ACTIVE') where.push(`p.state=ANY(${activeParam()}::text[])`);
  else if (query.status) where.push(`p.state=${add(query.status)}`);
  if (query.visibility) where.push(`p.visibility=${add(query.visibility)}`);
  if (query.verification) where.push(`p.verification_mode=${add(query.verification)}`);
  if (query.duration) where.push(`p.duration_days=${add(query.duration)}`);
  if (query.occupancy === 'full') where.push(`(SELECT COUNT(*) FROM teambook_book_members m WHERE m.book_id=p.id AND m.left_at IS NULL)>=${memberLimitSql('p.id')}`);
  if (query.occupancy === 'joinable') {
    where.push(`p.state=ANY(${activeParam()}::text[])`);
    where.push(`(SELECT COUNT(*) FROM teambook_book_members m WHERE m.book_id=p.id AND m.left_at IS NULL)<${memberLimitSql('p.id')}`);
  }

  const sorts = {
    newest: 'p.created_at', oldest: 'p.created_at', last_activity: 'p.updated_at', members: 'member_count',
    commits: 'commits_today', messages: 'messages_today', reactions: 'reactions_today', pending: 'pending_confirms',
    ending: 'COALESCE(p.scheduled_end_at,p.created_at)',
  };
  const direction = ['oldest', 'ending'].includes(query.sort) ? 'ASC' : query.order.toUpperCase();
  const limitParam = add(query.limit + 1);
  const offsetParam = add(query.offset);

  const statement = `SELECT p.id,p.code,p.name,p.activity,p.activity_id,p.state,p.visibility,p.verification_mode,
      p.duration_days,p.created_at,p.started_at,p.ended_at,p.scheduled_end_at,p.timezone,p.updated_at,
      ${memberLimitSql('p.id')}::int member_limit,
      (SELECT COUNT(*) FROM teambook_book_members m WHERE m.book_id=p.id AND m.left_at IS NULL)::int member_count,
      (SELECT m.alias FROM teambook_book_members m WHERE m.book_id=p.id AND m.role='lead' AND m.left_at IS NULL ORDER BY m.joined_at LIMIT 1) lead_alias,
      (SELECT m.avatar FROM teambook_book_members m WHERE m.book_id=p.id AND m.role='lead' AND m.left_at IS NULL ORDER BY m.joined_at LIMIT 1) lead_avatar,
      (SELECT COUNT(*) FROM teambook_book_entries x WHERE x.book_id=p.id AND x.kind='commit' AND x.retracted=FALSE AND x.day_key=$1::date)::int commits_today,
      (SELECT COUNT(*) FROM teambook_book_entries x WHERE x.book_id=p.id AND x.kind='message' AND x.retracted=FALSE AND x.day_key=$1::date)::int messages_today,
      (SELECT COUNT(*) FROM teambook_reactions r WHERE r.book_id=p.id AND r.created_at >= $1)::int reactions_today,
      (SELECT COUNT(*) FROM teambook_book_entries q LEFT JOIN teambook_confirmations c ON c.book_id=q.book_id AND c.commit_seq=q.seq
        WHERE q.book_id=p.id AND q.kind='commit' AND q.retracted=FALSE AND c.commit_seq IS NULL
          AND q.day_key >= (($1::timestamptz AT TIME ZONE 'Asia/Bangkok')::date - 1))::int pending_confirms
    FROM teambook_books p
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${sorts[query.sort]} ${direction} NULLS LAST,p.id DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}`;

  let rows;
  try {
    rows = await sql.query(statement, values);
  } catch (error) {
    console.error('TeamBook admin party query failed; falling back to base party rows', error);
    warnings.push({ label: 'parties.primary', code: safeCode(error) });
    const fallbackValues = [query.limit + 1, query.offset];
    rows = await safeQuery(sql, 'parties.fallback', `SELECT id,code,name,activity,activity_id,state,visibility,verification_mode,
        duration_days,created_at,started_at,ended_at,scheduled_end_at,timezone,updated_at,
        ${normalizeMemberLimit()}::int member_limit,0::int member_count,NULL::text lead_alias,NULL::text lead_avatar,0::int commits_today,0::int messages_today,
        0::int reactions_today,0::int pending_confirms
      FROM teambook_books ORDER BY updated_at DESC,id DESC LIMIT $1 OFFSET $2`, fallbackValues, warnings);
  }

  const page = rows.slice(0, query.limit).map(row => ({
    code: row.code, name: row.name, activity: row.activity || '', activityId: row.activity_id || 'custom',
    state: row.state, visibility: row.visibility || 'private', verificationMode: row.verification_mode || 'trust',
    day: Math.min(n(row.duration_days) || 7, partyDayNumber(row.started_at || row.created_at, at, row.timezone || TEAMBOOK_TIMEZONE)),
    durationDays: n(row.duration_days) || 7, members: n(row.member_count), maxMembers: normalizeMemberLimit(row.member_limit),
    lead: { alias: row.lead_alias || '—', avatar: row.lead_avatar || 'orange_cat' },
    commitsToday: n(row.commits_today), messagesToday: n(row.messages_today), reactionsToday: n(row.reactions_today),
    pendingConfirms: n(row.pending_confirms), createdAt: iso(row.created_at), startedAt: iso(row.started_at),
    scheduledEndAt: iso(row.scheduled_end_at), endedAt: iso(row.ended_at), lastActivityAt: iso(row.updated_at),
  }));

  return { warnings, parties: page, nextCursor: rows.length > query.limit ? encodeOffset(query.offset + query.limit) : null };
}
