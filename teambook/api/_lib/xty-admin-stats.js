import { TEAMBOOK_CARDS, TEAMBOOK_CARD_COLORS, TEAMBOOK_CARD_RARITIES, cardById } from '../../_shared/cards.js';
import { TEAMBOOK_TIMEZONE, partyDayNumber, scheduledEndAt, startOfPartyDay } from './xty-rules.js';
import { memberLimitSql, normalizeMemberLimit } from './member-limit.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

function count(value) { return Number(value || 0); }
function iso(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function one(value) { return Array.isArray(value) ? value[0] : value; }
function queryText(value) { return String(one(value) || '').trim(); }

export function shortAdminUserId(value) {
  const raw = String(value || '');
  const kind = raw.startsWith('account:') ? 'A' : 'G';
  const id = raw.replace(/^[^:]+:/, '');
  return `${kind}-${id.slice(0, 8) || 'unknown'}`;
}

function decodeOffset(cursor) {
  try {
    const value = Number(Buffer.from(String(cursor || ''), 'base64url').toString('utf8'));
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  } catch { return 0; }
}
function encodeOffset(value) { return Buffer.from(String(value)).toString('base64url'); }

export function normalizeAdminRange(value, at = new Date()) {
  const key = ['today', '7d', '30d', 'all'].includes(String(value)) ? String(value) : 'today';
  const now = new Date(at);
  const today = startOfPartyDay(now, TEAMBOOK_TIMEZONE);
  const days = key === '7d' ? 7 : (key === '30d' ? 30 : 1);
  return {
    key,
    start: key === 'all' ? null : new Date(today.getTime() - (days - 1) * 86400000),
    end: now,
  };
}

export function normalizeAdminPartyQuery(query = {}) {
  const status = queryText(query.status).toUpperCase();
  const visibility = queryText(query.visibility).toLowerCase();
  const verification = queryText(query.verification).toLowerCase();
  const occupancy = queryText(query.occupancy).toLowerCase();
  const duration = Number(queryText(query.duration));
  const sort = queryText(query.sort).toLowerCase() || 'last_activity';
  const order = queryText(query.order).toLowerCase() === 'asc' ? 'asc' : 'desc';
  return {
    status: ['ACTIVE', 'COMPLETED', 'DISSOLVED'].includes(status) ? status : '',
    visibility: ['public', 'private'].includes(visibility) ? visibility : '',
    verification: ['trust', 'confirm'].includes(verification) ? verification : '',
    occupancy: ['full', 'joinable'].includes(occupancy) ? occupancy : '',
    duration: [7, 14, 28].includes(duration) ? duration : 0,
    sort: ['newest', 'oldest', 'last_activity', 'members', 'commits', 'messages', 'reactions', 'pending', 'ending'].includes(sort)
      ? sort : 'last_activity',
    order,
    offset: decodeOffset(queryText(query.cursor)),
    limit: Math.min(MAX_LIST_LIMIT, Math.max(1, Number(queryText(query.limit)) || LIST_LIMIT)),
  };
}

export function normalizeAdminUserQuery(query = {}) {
  const account = queryText(query.account).toLowerCase();
  const active = queryText(query.active).toLowerCase();
  const sort = queryText(query.sort).toLowerCase() || 'last_activity';
  const level = Number(queryText(query.level));
  return {
    account: ['guest', 'bound'].includes(account) ? account : '',
    active: ['today', '7d', '30d', 'inactive'].includes(active) ? active : '',
    level: [1, 2, 3, 4].includes(level) ? level : 0,
    hasActiveParty: queryText(query.has_active_party) === '1',
    hasCards: queryText(query.has_cards) === '1',
    sort: ['last_activity', 'created_at', 'level', 'completed', 'cards'].includes(sort) ? sort : 'last_activity',
    order: queryText(query.order).toLowerCase() === 'asc' ? 'asc' : 'desc',
    offset: decodeOffset(queryText(query.cursor)),
    limit: Math.min(MAX_LIST_LIMIT, Math.max(1, Number(queryText(query.limit)) || LIST_LIMIT)),
  };
}

const EVENT_DATA_KEYS = new Set(['alias', 'name', 'from', 'to', 'cardId', 'level', 'reason', 'mode', 'durationDays']);
export function scrubAdminEventData(value) {
  let data = value || {};
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const safe = {};
  for (const [key, item] of Object.entries(data)) {
    if (!EVENT_DATA_KEYS.has(key)) continue;
    if (typeof item === 'string') safe[key] = item.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 120);
    else if (typeof item === 'number' || typeof item === 'boolean') safe[key] = item;
  }
  return safe;
}

async function integrityReport(sql) {
  const [badRewards, duplicateRewards, duplicateOwnership, placements, ownedIds] = await Promise.all([
    sql.query(`SELECT r.id,r.card_id,p.code,p.state FROM teambook_card_unlock_events r
      LEFT JOIN teambook_books p ON p.id=r.book_id
      WHERE p.id IS NULL OR p.state<>'COMPLETED' ORDER BY r.created_at DESC LIMIT 100`),
    sql.query(`SELECT user_id,book_id,COUNT(*)::int n FROM teambook_card_unlock_events
      GROUP BY user_id,book_id HAVING COUNT(*)>1 LIMIT 100`),
    sql.query(`SELECT user_id,card_id,COUNT(*)::int n FROM teambook_user_cards
      GROUP BY user_id,card_id HAVING COUNT(*)>1 LIMIT 100`),
    sql.query(`SELECT owner_id,card_id,COUNT(*)::int n FROM (
        SELECT owner_id,lead_card_id card_id FROM teambook_books WHERE state=ANY($1::text[]) AND lead_card_id IS NOT NULL
        UNION ALL SELECT owner_id,npc_card_id FROM teambook_books WHERE state=ANY($1::text[]) AND npc_card_id IS NOT NULL
      ) locked GROUP BY owner_id,card_id HAVING COUNT(*)>1 LIMIT 100`, [ACTIVE_STATES]),
    sql.query(`SELECT card_id,'ownership' source FROM teambook_user_cards
      UNION SELECT card_id,'reward' source FROM teambook_card_unlock_events WHERE card_id IS NOT NULL`),
  ]);
  const issues = [];
  badRewards.forEach(row => issues.push({ type: 'REWARD_WITHOUT_COMPLETED_QUEST', party: row.code || 'missing', cardId: row.card_id || null }));
  duplicateRewards.forEach(row => issues.push({ type: 'MULTIPLE_REWARDS_SAME_QUEST_USER', partyId: row.book_id, count: count(row.n) }));
  duplicateOwnership.forEach(row => issues.push({ type: 'DUPLICATE_CARD_OWNERSHIP', userId: shortAdminUserId(row.user_id), cardId: row.card_id, count: count(row.n) }));
  placements.forEach(row => issues.push({
    type: 'CARD_LOCKED_IN_MULTIPLE_ACTIVE_ROLES', userId: shortAdminUserId(row.owner_id),
    cardId: row.card_id, count: count(row.n),
  }));
  for (const row of ownedIds) {
    if (!cardById(row.card_id)) issues.push({ type: 'CARD_MISSING_CATALOG', cardId: String(row.card_id || '').slice(0, 80) });
  }
  const commonCovers = await sql.query(`SELECT code,lead_card_id FROM teambook_books
    WHERE state=ANY($1::text[]) AND lead_card_id IS NOT NULL`, [ACTIVE_STATES]);
  commonCovers.forEach(row => {
    if (cardById(row.lead_card_id)?.rarity === 'common') {
      issues.push({ type: 'COMMON_USED_AS_PARTY_COVER', party: row.code, cardId: row.lead_card_id });
    }
  });
  return { issues: issues.length, rows: issues.slice(0, 100) };
}

export async function getAdminSummary(sql, rangeValue, at = new Date()) {
  const range = normalizeAdminRange(rangeValue, at);
  const rangeParams = [range.start, range.end];
  const partyParams = [range.start, range.end, ACTIVE_STATES];
  const [users, activeUsers, parties, activity, cards, quest, confirmHealth, progression, otp, collection, durations, integrity] = await Promise.all([
    sql.query(`WITH seen AS (
        SELECT user_id,MIN(joined_at) first_seen FROM teambook_book_members GROUP BY user_id
        UNION ALL SELECT user_id,MIN(acquired_at) FROM teambook_user_cards GROUP BY user_id
        UNION ALL SELECT user_id,MIN(created_at) FROM teambook_card_unlock_events GROUP BY user_id
        UNION ALL SELECT user_id,MIN(updated_at) FROM teambook_progression GROUP BY user_id
      ), users AS (SELECT user_id,MIN(first_seen) first_seen FROM seen GROUP BY user_id), meaningful AS (
        SELECT user_id FROM teambook_progression WHERE level>1
        UNION SELECT user_id FROM teambook_user_cards
        UNION SELECT m.user_id FROM teambook_book_members m JOIN teambook_books p ON p.id=m.book_id WHERE p.state='COMPLETED'
        UNION SELECT m.user_id FROM teambook_book_members m WHERE EXISTS (
          SELECT 1 FROM teambook_book_members peer WHERE peer.book_id=m.book_id AND peer.user_id<>m.user_id
        )
      ) SELECT COUNT(*)::int total,
        COUNT(*) FILTER (WHERE user_id LIKE 'account:%')::int bound,
        COUNT(*) FILTER (WHERE user_id NOT LIKE 'account:%')::int guest,
        COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR first_seen >= $1) AND first_seen <= $2)::int new,
        COUNT(*) FILTER (WHERE user_id IN (SELECT user_id FROM meaningful))::int meaningful,
        COUNT(*) FILTER (WHERE user_id LIKE 'account:%' AND user_id IN (SELECT user_id FROM meaningful))::int bound_meaningful
      FROM users`, rangeParams),
    sql.query(`WITH activity AS (
        SELECT user_id,sent_at at FROM teambook_book_entries WHERE retracted=FALSE
        UNION ALL SELECT user_id,created_at FROM teambook_reactions WHERE created_at IS NOT NULL
        UNION ALL SELECT confirmer_id,created_at FROM teambook_confirmations
        UNION ALL SELECT actor_id,created_at FROM teambook_book_events WHERE actor_id IS NOT NULL
        UNION ALL SELECT user_id,joined_at FROM teambook_book_members
        UNION ALL SELECT user_id,revealed_at FROM teambook_card_unlock_events WHERE revealed_at IS NOT NULL
      ) SELECT COUNT(DISTINCT user_id)::int active FROM activity
      WHERE ($1::timestamptz IS NULL OR at >= $1) AND at <= $2`, rangeParams),
    sql.query(`SELECT
        COUNT(*) FILTER (WHERE state=ANY($3::text[]))::int active,
        COUNT(*) FILTER (WHERE state='COMPLETED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int completed,
        COUNT(*) FILTER (WHERE state='DISSOLVED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int dissolved,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND visibility='public')::int public,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND visibility='private')::int private,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND verification_mode='trust')::int trust,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND verification_mode='confirm')::int confirm
      FROM teambook_books`, partyParams),
    sql.query(`SELECT
        (SELECT COUNT(*) FROM teambook_book_entries WHERE kind='commit' AND retracted=FALSE AND ($1::timestamptz IS NULL OR sent_at >= $1) AND sent_at <= $2)::int commits,
        (SELECT COUNT(*) FROM teambook_book_entries WHERE kind='message' AND retracted=FALSE AND ($1::timestamptz IS NULL OR sent_at >= $1) AND sent_at <= $2)::int messages,
        (SELECT COUNT(*) FROM teambook_reactions WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND (created_at IS NULL OR created_at <= $2))::int reactions,
        (SELECT COUNT(*) FROM teambook_confirmations WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int confirms,
        (SELECT COUNT(*) FROM teambook_reactions WHERE created_at IS NULL)::int legacy_reactions_without_timestamp,
        (SELECT COUNT(*) FROM teambook_book_entries p JOIN teambook_books q ON q.id=p.book_id
          LEFT JOIN teambook_confirmations c ON c.book_id=p.book_id AND c.commit_seq=p.seq
          WHERE p.kind='commit' AND p.retracted=FALSE AND q.verification_mode='confirm' AND c.commit_seq IS NULL
          AND p.day_key >= ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - 1))::int waiting_confirm`, rangeParams),
    sql.query(`SELECT
        COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int rewards,
        COUNT(*) FILTER (WHERE revealed_at IS NOT NULL AND ($1::timestamptz IS NULL OR revealed_at >= $1) AND revealed_at <= $2)::int revealed,
        COUNT(*) FILTER (WHERE revealed_at IS NULL)::int pending,
        (SELECT COUNT(DISTINCT user_id) FROM teambook_user_cards)::int owners
      FROM teambook_card_unlock_events`, rangeParams),
    sql.query(`WITH cohort AS (SELECT * FROM teambook_books
        WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)
      SELECT COUNT(*)::int created,
        COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM teambook_book_members m WHERE m.book_id=cohort.id)>=2)::int second_member,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM teambook_book_entries p WHERE p.book_id=cohort.id AND p.kind='commit' AND p.retracted=FALSE))::int first_commit,
        COUNT(*) FILTER (WHERE COALESCE(scheduled_end_at,created_at + duration_days * INTERVAL '1 day') <= $2)::int reached_end,
        COUNT(*) FILTER (WHERE state='COMPLETED')::int completed,
        COUNT(*) FILTER (WHERE state='DISSOLVED')::int dissolved,
        COUNT(*) FILTER (WHERE state=ANY($3::text[]) AND COALESCE(scheduled_end_at,created_at + duration_days * INTERVAL '1 day') <= $2)::int eligible_expired,
        COUNT(*) FILTER (WHERE state='COMPLETED' AND EXISTS (SELECT 1 FROM teambook_card_unlock_events r WHERE r.book_id=cohort.id AND r.revealed_at IS NOT NULL))::int reward_revealed,
        COUNT(*) FILTER (WHERE state='COMPLETED' AND EXISTS (
          SELECT 1 FROM teambook_book_members finished JOIN teambook_book_members later ON later.user_id=finished.user_id
          JOIN teambook_books next_party ON next_party.id=later.book_id
          WHERE finished.book_id=cohort.id AND next_party.id<>cohort.id AND next_party.created_at>cohort.ended_at
        ))::int next_quest
      FROM cohort`, partyParams),
    sql.query(`SELECT
        COUNT(*)::int requests,COUNT(c.commit_seq)::int confirmed,
        COUNT(*) FILTER (WHERE c.commit_seq IS NULL AND p.day_key >= ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - 1))::int pending,
        COUNT(*) FILTER (WHERE c.commit_seq IS NULL AND p.day_key < ((NOW() AT TIME ZONE 'Asia/Bangkok')::date - 1))::int expired,
        PERCENTILE_CONT(.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.created_at-p.sent_at))) FILTER (WHERE c.created_at IS NOT NULL) median_seconds,
        PERCENTILE_CONT(.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.created_at-p.sent_at))) FILTER (WHERE c.created_at IS NOT NULL) p90_seconds,
        COUNT(*) FILTER (WHERE c.created_at IS NOT NULL AND (c.created_at AT TIME ZONE 'Asia/Bangkok')::date=(p.sent_at AT TIME ZONE 'Asia/Bangkok')::date)::int same_day,
        COUNT(*) FILTER (WHERE c.created_at IS NOT NULL AND (c.created_at AT TIME ZONE 'Asia/Bangkok')::date=(p.sent_at AT TIME ZONE 'Asia/Bangkok')::date+1)::int next_day
      FROM teambook_book_entries p JOIN teambook_books q ON q.id=p.book_id
      LEFT JOIN teambook_confirmations c ON c.book_id=p.book_id AND c.commit_seq=p.seq
      WHERE p.kind='commit' AND p.retracted=FALSE AND q.verification_mode='confirm'
        AND ($1::timestamptz IS NULL OR p.sent_at >= $1) AND p.sent_at <= $2`, rangeParams),
    sql.query(`WITH users AS (
        SELECT user_id FROM teambook_book_members UNION SELECT user_id FROM teambook_progression
        UNION SELECT user_id FROM teambook_user_cards UNION SELECT user_id FROM teambook_card_unlock_events
      ), active_owned AS (SELECT owner_id user_id,COUNT(*)::int n FROM teambook_books WHERE state=ANY($1::text[]) GROUP BY owner_id),
      shaped AS (SELECT u.user_id,COALESCE(p.level,1)::int level,COALESCE(p.paid_tier,'free') tier,
        COALESCE(p.unlocked_bonus_slots,0)::int bonus,COALESCE(a.n,0)::int active_owned
        FROM users u LEFT JOIN teambook_progression p ON p.user_id=u.user_id LEFT JOIN active_owned a ON a.user_id=u.user_id)
      SELECT COUNT(*) FILTER (WHERE level=1)::int level_1,COUNT(*) FILTER (WHERE level=2)::int level_2,
        COUNT(*) FILTER (WHERE level=3)::int level_3,COUNT(*) FILTER (WHERE level=4)::int level_4,
        COUNT(*) FILTER (WHERE tier='free')::int free,COUNT(*) FILTER (WHERE tier='plus')::int plus,
        COUNT(*) FILTER (WHERE tier='max')::int max,COUNT(*) FILTER (WHERE bonus>0)::int bonus_unlocked,
        COUNT(*) FILTER (WHERE active_owned>=level+bonus)::int at_create_capacity,
        ROUND(AVG(active_owned::numeric/NULLIF(level+bonus,0))*100,1) avg_capacity_percent
      FROM shaped`, [ACTIVE_STATES]),
    sql.query(`SELECT COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int sent,
        COUNT(*) FILTER (WHERE used_at IS NOT NULL AND ($1::timestamptz IS NULL OR used_at >= $1) AND used_at <= $2)::int verified,
        COALESCE(SUM(attempt_count) FILTER (WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2),0)::int attempts
      FROM teambook_email_otps`, rangeParams),
    sql.query(`WITH users AS (
        SELECT user_id FROM teambook_book_members UNION SELECT user_id FROM teambook_progression
        UNION SELECT user_id FROM teambook_user_cards UNION SELECT user_id FROM teambook_card_unlock_events
      ), owned AS (SELECT user_id,COUNT(*)::int n FROM teambook_user_cards GROUP BY user_id), shaped AS (
        SELECT u.user_id,COALESCE(o.n,0)::int n FROM users u LEFT JOIN owned o ON o.user_id=u.user_id)
      SELECT COUNT(*) FILTER (WHERE n=0)::int zero,COUNT(*) FILTER (WHERE n=1)::int one,
        COUNT(*) FILTER (WHERE n BETWEEN 2 AND 5)::int two_to_five,COUNT(*) FILTER (WHERE n>=6)::int six_plus,
        ROUND(AVG(n) FILTER (WHERE n>0),2) average_per_collector FROM shaped`),
    sql.query(`SELECT duration_days,
        COUNT(*) FILTER (WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2)::int started,
        COUNT(*) FILTER (WHERE state='COMPLETED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int completed,
        COUNT(*) FILTER (WHERE state='DISSOLVED' AND ($1::timestamptz IS NULL OR ended_at >= $1) AND ended_at <= $2)::int dissolved
      FROM teambook_books WHERE duration_days IN (7,14,28) GROUP BY duration_days ORDER BY duration_days`, rangeParams),
    integrityReport(sql),
  ]);
  const user = users[0] || {}; const meaningful = count(user.meaningful);
  const questRow = quest[0] || {};
  const terminal = count(questRow.completed) + count(questRow.dissolved) + count(questRow.eligible_expired);
  const confirmRow = confirmHealth[0] || {}; const confirmed = count(confirmRow.confirmed);
  return {
    range: range.key,
    generatedAt: new Date(at).toISOString(),
    users: {
      total: count(user.total), active: count(activeUsers[0]?.active), new: count(user.new),
      guest: count(user.guest), bound: count(user.bound), meaningful,
      emailSaveRate: meaningful ? Math.round((count(user.bound_meaningful) / meaningful) * 1000) / 10 : 0,
    },
    parties: Object.fromEntries(Object.entries(parties[0] || {}).map(([key, value]) => [key, count(value)])),
    activity: Object.fromEntries(Object.entries(activity[0] || {}).map(([key, value]) => [key, count(value)])),
    cards: Object.fromEntries(Object.entries(cards[0] || {}).map(([key, value]) => [key, count(value)])),
    quest: {
      created: count(questRow.created), secondMember: count(questRow.second_member), firstCommit: count(questRow.first_commit),
      reachedEnd: count(questRow.reached_end), completed: count(questRow.completed), dissolved: count(questRow.dissolved),
      eligibleExpired: count(questRow.eligible_expired), rewardRevealed: count(questRow.reward_revealed), nextQuest: count(questRow.next_quest),
      firstCommitRate: count(questRow.created) ? Math.round((count(questRow.first_commit) / count(questRow.created)) * 1000) / 10 : 0,
      completionRate: terminal ? Math.round((count(questRow.completed) / terminal) * 1000) / 10 : 0,
    },
    confirms: {
      requests: count(confirmRow.requests), confirmed, pending: count(confirmRow.pending), expired: count(confirmRow.expired),
      medianSeconds: confirmRow.median_seconds === null ? null : count(confirmRow.median_seconds),
      p90Seconds: confirmRow.p90_seconds === null ? null : count(confirmRow.p90_seconds),
      sameDayRate: confirmed ? Math.round((count(confirmRow.same_day) / confirmed) * 1000) / 10 : 0,
      nextDayRate: confirmed ? Math.round((count(confirmRow.next_day) / confirmed) * 1000) / 10 : 0,
    },
    progression: Object.fromEntries(Object.entries(progression[0] || {}).map(([key, value]) => [key, value === null ? null : Number(value)])),
    save: {
      otpSent: count(otp[0]?.sent), otpVerified: count(otp[0]?.verified), otpAttempts: count(otp[0]?.attempts),
      recoveryLogins: null, migrations: null,
    },
    collection: Object.fromEntries(Object.entries(collection[0] || {}).map(([key, value]) => [key, value === null ? null : Number(value)])),
    durations: durations.map(row => {
      const denominator = count(row.completed) + count(row.dissolved);
      return {
        days: count(row.duration_days), started: count(row.started), completed: count(row.completed), dissolved: count(row.dissolved),
        completionRate: denominator ? Math.round((count(row.completed) / denominator) * 1000) / 10 : 0,
      };
    }),
    integrity: { issues: integrity.issues },
  };
}

export async function getAdminParties(sql, rawQuery = {}, at = new Date()) {
  const query = normalizeAdminPartyQuery(rawQuery);
  const where = []; const values = [ACTIVE_STATES, startOfPartyDay(at, TEAMBOOK_TIMEZONE)];
  const add = value => { values.push(value); return `$${values.length}`; };
  if (query.status === 'ACTIVE') where.push('p.state=ANY($1::text[])');
  else if (query.status) where.push(`p.state=${add(query.status)}`);
  if (query.visibility) where.push(`p.visibility=${add(query.visibility)}`);
  if (query.verification) where.push(`p.verification_mode=${add(query.verification)}`);
  if (query.duration) where.push(`p.duration_days=${add(query.duration)}`);
  if (query.occupancy === 'full') where.push(`COALESCE(ms.member_count,0)>=${memberLimitSql('p.id')}`);
  if (query.occupancy === 'joinable') where.push(`p.state=ANY($1::text[]) AND COALESCE(ms.member_count,0)<${memberLimitSql('p.id')}`);
  const sorts = {
    newest: 'p.created_at', oldest: 'p.created_at', last_activity: 'last_activity', members: 'member_count',
    commits: 'commits_today', messages: 'messages_today', reactions: 'reactions_today',
    pending: 'pending_confirms', ending: 'COALESCE(p.scheduled_end_at,p.created_at)',
  };
  const direction = ['oldest', 'ending'].includes(query.sort) ? 'ASC' : query.order.toUpperCase();
  values.push(query.limit + 1, query.offset);
  const rows = await sql.query(`SELECT p.id,p.code,p.name,p.activity,p.activity_id,p.state,p.visibility,p.verification_mode,
      p.duration_days,p.created_at,p.started_at,p.ended_at,p.scheduled_end_at,p.timezone,
      ${memberLimitSql('p.id')}::int member_limit,
      COALESCE(ms.member_count,0)::int member_count,ms.lead_alias,ms.lead_avatar,
      COALESCE(ps.commits_today,0)::int commits_today,COALESCE(ps.messages_today,0)::int messages_today,
      COALESCE(rs.reactions_today,0)::int reactions_today,COALESCE(cs.pending_confirms,0)::int pending_confirms,
      GREATEST(p.updated_at,ps.last_post,rs.last_reaction,cs.last_confirm,ms.last_join) last_activity
    FROM teambook_books p
    LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE left_at IS NULL) member_count,
      MAX(alias) FILTER (WHERE role='lead' AND left_at IS NULL) lead_alias,
      MAX(avatar) FILTER (WHERE role='lead' AND left_at IS NULL) lead_avatar,MAX(joined_at) last_join
      FROM teambook_book_members WHERE book_id=p.id) ms ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE kind='commit' AND retracted=FALSE AND day_key=$2::date) commits_today,
      COUNT(*) FILTER (WHERE kind='message' AND retracted=FALSE AND day_key=$2::date) messages_today,MAX(sent_at) last_post
      FROM teambook_book_entries WHERE book_id=p.id) ps ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE created_at >= $2) reactions_today,MAX(created_at) last_reaction
      FROM teambook_reactions WHERE book_id=p.id) rs ON TRUE
    LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE c.commit_seq IS NULL AND q.day_key >= (($2::timestamptz AT TIME ZONE 'Asia/Bangkok')::date - 1)) pending_confirms,
      MAX(c.created_at) last_confirm FROM teambook_book_entries q LEFT JOIN teambook_confirmations c
      ON c.book_id=q.book_id AND c.commit_seq=q.seq WHERE q.book_id=p.id AND q.kind='commit' AND q.retracted=FALSE) cs ON TRUE
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${sorts[query.sort]} ${direction} NULLS LAST,p.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  const page = rows.slice(0, query.limit).map(row => ({
    code: row.code, name: row.name, activity: row.activity || '', activityId: row.activity_id || 'custom',
    state: row.state, visibility: row.visibility, verificationMode: row.verification_mode,
    day: Math.min(count(row.duration_days) || 7, partyDayNumber(row.started_at || row.created_at, at, row.timezone || TEAMBOOK_TIMEZONE)),
    durationDays: count(row.duration_days) || 7, members: count(row.member_count), maxMembers: normalizeMemberLimit(row.member_limit),
    lead: { alias: row.lead_alias || '—', avatar: row.lead_avatar || 'orange_cat' },
    commitsToday: count(row.commits_today), messagesToday: count(row.messages_today),
    reactionsToday: count(row.reactions_today), pendingConfirms: count(row.pending_confirms),
    createdAt: iso(row.created_at), startedAt: iso(row.started_at), scheduledEndAt: iso(row.scheduled_end_at),
    endedAt: iso(row.ended_at), lastActivityAt: iso(row.last_activity),
  }));
  return { parties: page, nextCursor: rows.length > query.limit ? encodeOffset(query.offset + query.limit) : null };
}

export async function getAdminPartyDetail(sql, code, at = new Date()) {
  const parties = await sql.query(`SELECT id,code,name,activity,activity_id,commit_rule,state,visibility,verification_mode,
    duration_days,created_at,started_at,ended_at,scheduled_end_at,timezone,lead_card_id,npc_card_id,pet_id,
    ${memberLimitSql('p.id')}::int member_limit
    FROM teambook_books p WHERE p.code=$1 LIMIT 1`, [String(code || '')]);
  const party = parties[0]; if (!party) return null;
  const [members, progress, activity, reward, events] = await Promise.all([
    sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at,left_at,removal_reason
      FROM teambook_book_members WHERE book_id=$1 ORDER BY joined_at`, [party.id]),
    sql.query(`SELECT p.day_key,COUNT(*) FILTER (WHERE p.kind='commit' AND p.retracted=FALSE)::int submitted,
      COUNT(*) FILTER (WHERE p.kind='commit' AND p.retracted=FALSE AND (q.verification_mode='trust' OR c.commit_seq IS NOT NULL))::int valid
      FROM teambook_book_entries p JOIN teambook_books q ON q.id=p.book_id
      LEFT JOIN teambook_confirmations c ON c.book_id=p.book_id AND c.commit_seq=p.seq
      WHERE p.book_id=$1 GROUP BY p.day_key ORDER BY p.day_key`, [party.id]),
    sql.query(`SELECT
      COUNT(*) FILTER (WHERE kind='commit' AND retracted=FALSE)::int commits,
      COUNT(*) FILTER (WHERE kind='message' AND retracted=FALSE)::int messages,
      (SELECT COUNT(*) FROM teambook_reactions WHERE book_id=$1)::int reactions,
      (SELECT COUNT(*) FROM teambook_confirmations WHERE book_id=$1)::int confirms
      FROM teambook_book_entries WHERE book_id=$1`, [party.id]),
    sql.query(`SELECT COUNT(*)::int issued,COUNT(*) FILTER (WHERE revealed_at IS NOT NULL)::int revealed,
      COUNT(*) FILTER (WHERE revealed_at IS NULL)::int pending FROM teambook_card_unlock_events WHERE book_id=$1`, [party.id]),
    sql.query(`SELECT type,party_day,data_json,created_at FROM teambook_book_events
      WHERE book_id=$1 ORDER BY created_at DESC LIMIT 200`, [party.id]),
  ]);
  const durationDays = count(party.duration_days) || 7;
  const memberCount = members.filter(member => !member.left_at).length;
  return {
    party: {
      code: party.code, name: party.name, activity: party.activity || '', activityId: party.activity_id || 'custom',
      commitRule: party.commit_rule || '', state: party.state, visibility: party.visibility,
      verificationMode: party.verification_mode, durationDays,
      memberCount, maxMembers: normalizeMemberLimit(party.member_limit),
      day: Math.min(durationDays, partyDayNumber(party.started_at || party.created_at, at, party.timezone || TEAMBOOK_TIMEZONE)),
      createdAt: iso(party.created_at), startedAt: iso(party.started_at), actualEndAt: iso(party.ended_at),
      scheduledEndAt: iso(party.scheduled_end_at || scheduledEndAt(party.started_at || party.created_at, durationDays)),
      leadCardId: party.lead_card_id || null, npcCardId: party.npc_card_id || null, petId: party.pet_id || null,
    },
    roster: members.map(row => ({
      userId: shortAdminUserId(row.user_id), alias: row.alias, avatar: row.avatar || 'orange_cat',
      avatarColor: row.avatar_color || 'green', role: row.role, joinedAt: iso(row.joined_at),
      leftAt: iso(row.left_at), removalReason: row.removal_reason || null,
    })),
    progress: progress.map(row => ({
      date: String(row.day_key).slice(0, 10), submitted: count(row.submitted), valid: count(row.valid),
      waiting: Math.max(0, count(row.submitted) - count(row.valid)),
    })),
    activity: Object.fromEntries(Object.entries(activity[0] || {}).map(([key, value]) => [key, count(value)])),
    reward: Object.fromEntries(Object.entries(reward[0] || {}).map(([key, value]) => [key, count(value)])),
    events: events.map(row => ({ type: row.type, day: count(row.party_day), at: iso(row.created_at), data: scrubAdminEventData(row.data_json) })),
  };
}

export async function getAdminUsers(sql, rawQuery = {}, at = new Date()) {
  const query = normalizeAdminUserQuery(rawQuery);
  const values = [ACTIVE_STATES]; const where = [];
  const add = value => { values.push(value); return `$${values.length}`; };
  if (query.account === 'bound') where.push("u.user_id LIKE 'account:%'");
  if (query.account === 'guest') where.push("u.user_id NOT LIKE 'account:%'");
  if (query.level) where.push(`COALESCE(pr.level,1)=${add(query.level)}`);
  if (query.hasActiveParty) where.push('COALESCE(ms.active_parties,0)>0');
  if (query.hasCards) where.push('COALESCE(cs.cards,0)>0');
  if (query.active) {
    const days = query.active === '7d' ? 7 : (query.active === '30d' || query.active === 'inactive' ? 30 : 1);
    const threshold = new Date(startOfPartyDay(at, TEAMBOOK_TIMEZONE).getTime() - (days - 1) * 86400000);
    where.push(query.active === 'inactive' ? `la.last_activity<${add(threshold)}` : `la.last_activity>=${add(threshold)}`);
  }
  const sorts = { last_activity: 'la.last_activity', created_at: 'fs.created_at', level: 'level', completed: 'completed_quests', cards: 'cards_owned' };
  values.push(query.limit + 1, query.offset);
  const rows = await sql.query(`WITH users AS (
      SELECT user_id FROM teambook_book_members UNION SELECT user_id FROM teambook_progression
      UNION SELECT user_id FROM teambook_user_cards UNION SELECT user_id FROM teambook_card_unlock_events
    ), latest AS (SELECT DISTINCT ON (user_id) user_id,alias,avatar,avatar_color FROM teambook_book_members ORDER BY user_id,joined_at DESC),
    first_seen AS (SELECT user_id,MIN(at) created_at FROM (
      SELECT user_id,joined_at at FROM teambook_book_members UNION ALL SELECT user_id,acquired_at FROM teambook_user_cards
      UNION ALL SELECT user_id,created_at FROM teambook_card_unlock_events UNION ALL SELECT user_id,updated_at FROM teambook_progression
    ) x GROUP BY user_id),
    member_stats AS (SELECT m.user_id,COUNT(DISTINCT p.id) FILTER (WHERE p.owner_id=m.user_id)::int created_parties,
      COUNT(DISTINCT p.id) FILTER (WHERE m.role<>'lead')::int joined_parties,COUNT(DISTINCT p.id) FILTER (WHERE p.state='COMPLETED')::int completed_quests,
      COUNT(DISTINCT p.id) FILTER (WHERE p.state=ANY($1::text[]) AND m.left_at IS NULL)::int active_parties
      FROM teambook_book_members m JOIN teambook_books p ON p.id=m.book_id GROUP BY m.user_id),
    card_stats AS (SELECT user_id,COUNT(*)::int cards FROM teambook_user_cards GROUP BY user_id),
    last_activity AS (SELECT user_id,MAX(at) last_activity FROM (
      SELECT user_id,sent_at at FROM teambook_book_entries WHERE retracted=FALSE
      UNION ALL SELECT user_id,created_at FROM teambook_reactions WHERE created_at IS NOT NULL
      UNION ALL SELECT confirmer_id,created_at FROM teambook_confirmations
      UNION ALL SELECT actor_id,created_at FROM teambook_book_events WHERE actor_id IS NOT NULL
      UNION ALL SELECT user_id,joined_at FROM teambook_book_members
      UNION ALL SELECT user_id,revealed_at FROM teambook_card_unlock_events WHERE revealed_at IS NOT NULL
    ) a GROUP BY user_id)
    SELECT u.user_id,l.alias,l.avatar,l.avatar_color,COALESCE(pr.level,1)::int level,
      COALESCE(ms.created_parties,0)::int created_parties,COALESCE(ms.joined_parties,0)::int joined_parties,
      COALESCE(ms.completed_quests,0)::int completed_quests,COALESCE(ms.active_parties,0)::int active_parties,
      COALESCE(cs.cards,0)::int cards_owned,fs.created_at,la.last_activity
    FROM users u LEFT JOIN latest l ON l.user_id=u.user_id LEFT JOIN teambook_progression pr ON pr.user_id=u.user_id
    LEFT JOIN member_stats ms ON ms.user_id=u.user_id LEFT JOIN card_stats cs ON cs.user_id=u.user_id
    LEFT JOIN first_seen fs ON fs.user_id=u.user_id LEFT JOIN last_activity la ON la.user_id=u.user_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${sorts[query.sort]} ${query.order.toUpperCase()} NULLS LAST,u.user_id
    LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  const users = rows.slice(0, query.limit).map(row => ({
    userId: shortAdminUserId(row.user_id), alias: row.alias || '—', avatar: row.avatar || 'orange_cat',
    avatarColor: row.avatar_color || 'green', accountType: String(row.user_id).startsWith('account:') ? 'SAVED' : 'GUEST',
    level: count(row.level) || 1, createdParties: count(row.created_parties), joinedParties: count(row.joined_parties),
    completedQuests: count(row.completed_quests), activeParties: count(row.active_parties), cardsOwned: count(row.cards_owned),
    lastActiveAt: iso(row.last_activity), createdAt: iso(row.created_at),
  }));
  return { users, nextCursor: rows.length > query.limit ? encodeOffset(query.offset + query.limit) : null };
}

function aggregateCards(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key] || 'unknown'; const current = map.get(value) || { id: value, issued: 0, owned: 0, inUse: 0 };
    current.issued += row.issued; current.owned += row.owned; current.inUse += row.inUse; map.set(value, current);
  }
  return [...map.values()].sort((a, b) => b.owned - a.owned || String(a.id).localeCompare(String(b.id)));
}

function completeCardGroups(rows, ids) {
  const byId = new Map(rows.map(row => [row.id, row]));
  return ids.map(id => byId.get(id) || { id, issued: 0, owned: 0, inUse: 0 });
}

export async function getAdminCards(sql) {
  const [rewardRows, ownedRows, usageRows, integrity] = await Promise.all([
    sql.query(`SELECT card_id,COUNT(*)::int issued,COUNT(*) FILTER (WHERE revealed_at IS NOT NULL)::int revealed,
      COUNT(*) FILTER (WHERE revealed_at IS NULL)::int pending FROM teambook_card_unlock_events GROUP BY card_id`),
    sql.query('SELECT card_id,COUNT(DISTINCT user_id)::int owned FROM teambook_user_cards GROUP BY card_id'),
    sql.query(`SELECT card_id,COUNT(*)::int in_use FROM (
      SELECT lead_card_id card_id FROM teambook_books WHERE state=ANY($1::text[]) AND lead_card_id IS NOT NULL
      UNION ALL SELECT npc_card_id FROM teambook_books WHERE state=ANY($1::text[]) AND npc_card_id IS NOT NULL
      ) roles GROUP BY card_id`, [ACTIVE_STATES]),
    integrityReport(sql),
  ]);
  const rewards = new Map(rewardRows.map(row => [row.card_id, row]));
  const owned = new Map(ownedRows.map(row => [row.card_id, row]));
  const usage = new Map(usageRows.map(row => [row.card_id, row]));
  const catalog = TEAMBOOK_CARDS.map(card => ({
    cardId: card.cardId, rarity: card.rarity, color: card.color, species: card.species,
    speciesNameTh: card.speciesNameTh, issued: count(rewards.get(card.cardId)?.issued),
    revealed: count(rewards.get(card.cardId)?.revealed), pending: count(rewards.get(card.cardId)?.pending),
    owned: count(owned.get(card.cardId)?.owned), inUse: count(usage.get(card.cardId)?.in_use),
  }));
  return {
    summary: {
      rewardsIssued: rewardRows.reduce((sum, row) => sum + count(row.issued), 0),
      rewardsRevealed: rewardRows.reduce((sum, row) => sum + count(row.revealed), 0),
      pendingReveal: rewardRows.reduce((sum, row) => sum + count(row.pending), 0),
      usersOwningCards: count((await sql.query('SELECT COUNT(DISTINCT user_id)::int n FROM teambook_user_cards'))[0]?.n),
      integrityIssues: integrity.issues,
    },
    rarity: completeCardGroups(aggregateCards(catalog, 'rarity'), TEAMBOOK_CARD_RARITIES),
    color: completeCardGroups(aggregateCards(catalog, 'color'), TEAMBOOK_CARD_COLORS),
    species: aggregateCards(catalog, 'species'), catalog, integrity: integrity.rows,
  };
}

export async function getAdminActivity(sql, rangeValue, at = new Date()) {
  const range = normalizeAdminRange(rangeValue, at); const values = [range.start, range.end];
  const rows = await sql.query(`WITH events AS (
      SELECT (sent_at AT TIME ZONE 'Asia/Bangkok')::date day,
        COUNT(*) FILTER (WHERE kind='commit' AND retracted=FALSE)::int commits,
        COUNT(*) FILTER (WHERE kind='message' AND retracted=FALSE)::int messages,0::int reactions,0::int confirms,
        0::int parties_created,0::int parties_completed FROM teambook_book_entries
        WHERE ($1::timestamptz IS NULL OR sent_at >= $1) AND sent_at <= $2 GROUP BY day
      UNION ALL SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date,0,0,COUNT(*)::int,0,0,0 FROM teambook_reactions
        WHERE created_at IS NOT NULL AND ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2 GROUP BY 1
      UNION ALL SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date,0,0,0,COUNT(*)::int,0,0 FROM teambook_confirmations
        WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2 GROUP BY 1
      UNION ALL SELECT (created_at AT TIME ZONE 'Asia/Bangkok')::date,0,0,0,0,
        COUNT(*) FILTER (WHERE type='PARTY_CREATED')::int,COUNT(*) FILTER (WHERE type='PARTY_COMPLETED')::int
        FROM teambook_book_events WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2 GROUP BY 1
    ) SELECT day,SUM(commits)::int commits,SUM(messages)::int messages,SUM(reactions)::int reactions,
      SUM(confirms)::int confirms,SUM(parties_created)::int parties_created,SUM(parties_completed)::int parties_completed
    FROM events GROUP BY day ORDER BY day`, values);
  return { range: range.key, buckets: rows.map(row => ({
    date: String(row.day).slice(0, 10), commits: count(row.commits), messages: count(row.messages),
    reactions: count(row.reactions), confirms: count(row.confirms), partiesCreated: count(row.parties_created),
    partiesCompleted: count(row.parties_completed),
  })) };
}

export async function getAdminSystem(sql) {
  const [integrity, errors, codes, logins] = await Promise.all([
    integrityReport(sql),
    sql.query(`SELECT error_code,endpoint,COUNT(*)::int count,MAX(created_at) last_seen
      FROM teambook_system_errors GROUP BY error_code,endpoint ORDER BY last_seen DESC LIMIT 100`),
    sql.query(`SELECT COUNT(*)::int live_codes,COUNT(*)-COUNT(DISTINCT code)::int duplicate_codes
      FROM teambook_books WHERE state=ANY($1::text[])`, [ACTIVE_STATES]),
    sql.query(`SELECT type,COUNT(*)::int count,MAX(created_at) last_seen FROM teambook_admin_audit
      GROUP BY type ORDER BY type`),
  ]);
  return {
    integrity,
    health: { apiRequests: null, apiErrors: errors.reduce((sum, row) => sum + count(row.count), 0), dbQueryErrors: null, failedWrites: null },
    constraints: {
      duplicateCommitPrevented: null, duplicateRewardPrevented: null, duplicateLevelUpPrevented: null,
      duplicateCardOwnershipPrevented: null, partyCodeCollisionRetries: null,
    },
    partyCodes: { live: count(codes[0]?.live_codes), duplicateLiveViolations: count(codes[0]?.duplicate_codes) },
    errors: errors.map(row => ({ code: row.error_code, endpoint: row.endpoint, count: count(row.count), lastSeenAt: iso(row.last_seen) })),
    adminLogins: logins.map(row => ({ type: row.type, count: count(row.count), lastSeenAt: iso(row.last_seen) })),
  };
}

function eventSummary(type, data) {
  if (data.alias) return `${type} · ${data.alias}`;
  if (data.name) return `${type} · ${data.name}`;
  if (data.cardId) return `${type} · ${data.cardId}`;
  return type;
}

export async function getAdminEvents(sql, rawQuery = {}) {
  const type = queryText(rawQuery.type).toUpperCase().slice(0, 60);
  const party = queryText(rawQuery.book_id).slice(0, 80);
  const offset = decodeOffset(queryText(rawQuery.cursor));
  const limit = Math.min(200, Math.max(1, Number(queryText(rawQuery.limit)) || 100));
  const rows = await sql.query(`WITH all_events AS (
      SELECT created_at,type,book_id,actor_id,data_json FROM teambook_book_events
      UNION ALL SELECT created_at,'CARD_REWARDED',book_id,user_id,jsonb_build_object('cardId',card_id) FROM teambook_card_unlock_events
      UNION ALL SELECT revealed_at,'CARD_REVEALED',book_id,user_id,jsonb_build_object('cardId',card_id)
        FROM teambook_card_unlock_events WHERE revealed_at IS NOT NULL
      UNION ALL SELECT created_at,'LEVEL_UP',book_id,user_id,jsonb_build_object('from',from_level,'to',to_level,'reason',reason)
        FROM teambook_level_events
      UNION ALL SELECT created_at,'EMAIL_BOUND',NULL,'account:'||user_id,'{}'::jsonb FROM teambook_auth_identities WHERE email IS NOT NULL
      UNION ALL SELECT created_at,type,NULL,NULL,data_json FROM teambook_admin_audit
    ) SELECT e.created_at,e.type,e.actor_id,e.data_json,p.code,p.name FROM all_events e
      LEFT JOIN teambook_books p ON p.id=e.book_id
      WHERE ($1='' OR e.type=$1) AND ($2='' OR e.book_id=$2 OR p.code=$2)
      ORDER BY e.created_at DESC LIMIT $3 OFFSET $4`, [type, party, limit + 1, offset]);
  const events = rows.slice(0, limit).map(row => {
    const data = scrubAdminEventData(row.data_json);
    return {
      at: iso(row.created_at), type: row.type, party: row.code ? { code: row.code, name: row.name } : null,
      userId: row.actor_id ? shortAdminUserId(row.actor_id) : null, summary: eventSummary(row.type, data), data,
    };
  });
  return { events, nextCursor: rows.length > limit ? encodeOffset(offset + limit) : null };
}
