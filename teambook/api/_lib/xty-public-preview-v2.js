import { database, ensureSchema, sendJson } from './core.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const DEFAULT_MEMBER_LIMIT = 5;
const MAX_MEMBER_LIMIT = 11;

function codeOf(req) {
  const value = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  return /^\d{5}$/.test(String(value || '')) ? String(value) : '';
}

function dataOf(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function memberLimitOf(value) {
  const wanted = Math.floor(Number(value || DEFAULT_MEMBER_LIMIT));
  return Number.isFinite(wanted)
    ? Math.min(MAX_MEMBER_LIMIT, Math.max(1, wanted))
    : DEFAULT_MEMBER_LIMIT;
}

export async function handlePublicPreviewV2(req, res) {
  try {
    if (String(req.method || 'GET').toUpperCase() !== 'GET') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    const code = codeOf(req);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);

    const sql = database();
    await ensureSchema(sql);
    const rows = await sql.query(`SELECT id,code,name,activity,activity_id,preset,duration_days,color,visibility,
      commit_rule,budget,pet_id,owner_id,state,created_at,updated_at,started_at,ended_at,timezone,
      verification_mode,scheduled_end_at,cover_type,cover_value,lead_card_id,npc_card_id,
      activity_mode,shared_activity_description,shared_activity_color
      FROM teambook_books WHERE code=$1 AND visibility='public' LIMIT 1`, [code]);
    const row = rows[0];
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    const [members, posts, events] = await Promise.all([
      sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at,left_at,
          activity_id,activity_label,activity_description,activity_color,success_rule
        FROM teambook_book_members WHERE book_id=$1 ORDER BY joined_at`, [row.id]),
      sql.query(`SELECT p.seq,p.user_id,p.kind,p.body,p.sent_at,p.retracted,p.pet_id,p.wake_hour,
          p.activity_id,p.activity_label,p.activity_color,p.success_rule_snapshot,
          m.alias,m.avatar,m.avatar_color
        FROM teambook_book_entries p LEFT JOIN teambook_book_members m ON m.book_id=p.book_id AND m.user_id=p.user_id
        WHERE p.book_id=$1 ORDER BY p.seq`, [row.id]),
      sql.query(`SELECT type,party_day,data_json,created_at
        FROM teambook_book_events WHERE book_id=$1 ORDER BY id`, [row.id]),
    ]);

    const activeMembers = members.filter(member => !member.left_at).map(member => ({
      userId: member.user_id,
      alias: member.alias || 'คนในสมุด',
      avatar: member.avatar || 'orange_cat',
      avatarColor: member.avatar_color || 'green',
      role: member.role || 'member',
      joinedAt: new Date(member.joined_at).toISOString(),
      activityId: member.activity_id || null,
      activityLabel: member.activity_label || '',
      activityDescription: member.activity_description || '',
      activityColor: member.activity_color || null,
      successRule: member.success_rule || '',
    }));

    const safePosts = posts.map(post => ({
      seq: Number(post.seq),
      userId: post.user_id,
      alias: post.alias || (String(post.user_id || '').startsWith('pet:') ? 'เพื่อนร่วมทาง' : 'คนในสมุด'),
      avatar: post.avatar || '',
      avatarColor: post.avatar_color || 'green',
      kind: post.kind,
      body: post.retracted ? '' : (post.body || ''),
      retracted: !!post.retracted,
      petId: post.pet_id || null,
      wakeHour: post.wake_hour == null ? null : Number(post.wake_hour),
      activityId: post.activity_id || null,
      activityLabel: post.activity_label || '',
      activityColor: post.activity_color || null,
      successRuleSnapshot: post.success_rule_snapshot || '',
      sentAt: new Date(post.sent_at).toISOString(),
    }));

    const safeEvents = events.map(event => ({
      type: event.type,
      partyDay: Number(event.party_day || 1),
      data: dataOf(event.data_json),
      at: new Date(event.created_at).toISOString(),
    }));

    /* PARTY_CREATED is the canonical immutable source for this book's people
       limit. Old books do not have memberLimit there, so and only so they keep
       the historical 5-person maximum. Owner is already one active member. */
    const created = safeEvents.find(event => event.type === 'PARTY_CREATED');
    const memberLimit = memberLimitOf(created?.data?.memberLimit);
    const memberCount = activeMembers.length;
    const state = String(row.state || 'ACTIVE').toUpperCase();
    const activityMode = row.activity_mode === 'individual' ? 'individual' : 'shared';
    return sendJson(res, {
      ok: true,
      party: {
        code: row.code,
        name: row.name,
        activity: row.activity || '',
        activityId: row.activity_id || 'custom',
        activityMode,
        sharedActivityId: activityMode === 'shared' ? (row.activity_id || null) : null,
        sharedActivityLabel: activityMode === 'shared' ? (row.activity || '') : null,
        sharedActivityDescription: activityMode === 'shared' ? (row.shared_activity_description || '') : null,
        sharedActivityColor: activityMode === 'shared' ? (row.shared_activity_color || null) : null,
        preset: row.preset || 'casual',
        durationDays: Number(row.duration_days || 7),
        color: row.color || 'green',
        verificationMode: row.verification_mode || 'trust',
        commitRule: row.commit_rule || '',
        budget: row.budget || 'normal',
        petId: row.pet_id || null,
        npcCardId: row.npc_card_id || null,
        coverType: row.cover_type || (row.lead_card_id ? 'card' : 'avatar'),
        coverValue: row.cover_value || row.lead_card_id || null,
        leadCardId: row.lead_card_id || null,
        state,
        memberCount,
        memberLimit,
        maxMembers: memberLimit,
        joinable: ACTIVE_STATES.includes(state) && memberCount < memberLimit,
        createdAt: new Date(row.created_at).toISOString(),
        startAt: new Date(row.started_at || row.created_at).toISOString(),
        scheduledEndAt: row.scheduled_end_at ? new Date(row.scheduled_end_at).toISOString() : null,
        members: activeMembers,
        events: safeEvents,
        log: safePosts,
      },
    });
  } catch (error) {
    console.error('TeamBook public preview failed', error);
    if (error.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'TEAMBOOK_API_ERROR' }, 500);
  }
}
