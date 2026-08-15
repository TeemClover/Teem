import { database, ensureSchema, sendJson } from './core.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function codeOf(req) {
  const value = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  return /^\d{5}$/.test(String(value || '')) ? String(value) : '';
}

function dataOf(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch { return {}; }
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
      verification_mode,scheduled_end_at,cover_type,cover_value,lead_card_id,npc_card_id
      FROM xty_parties WHERE code=$1 AND visibility='public' LIMIT 1`, [code]);
    const row = rows[0];
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    const [members, posts, events] = await Promise.all([
      sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at,left_at
        FROM xty_members WHERE party_id=$1 ORDER BY joined_at`, [row.id]),
      sql.query(`SELECT p.seq,p.user_id,p.kind,p.body,p.sent_at,p.retracted,p.pet_id,p.wake_hour,
          m.alias,m.avatar,m.avatar_color
        FROM xty_posts p LEFT JOIN xty_members m ON m.party_id=p.party_id AND m.user_id=p.user_id
        WHERE p.party_id=$1 ORDER BY p.seq`, [row.id]),
      sql.query(`SELECT type,party_day,data_json,created_at
        FROM xty_party_events WHERE party_id=$1 ORDER BY id`, [row.id]),
    ]);

    const activeMembers = members.filter(member => !member.left_at).map(member => ({
      userId: member.user_id,
      alias: member.alias || 'สมาชิก',
      avatar: member.avatar || 'orange_cat',
      avatarColor: member.avatar_color || 'green',
      role: member.role || 'member',
      joinedAt: new Date(member.joined_at).toISOString(),
    }));

    const safePosts = posts.map(post => ({
      seq: Number(post.seq),
      userId: post.user_id,
      alias: post.alias || (String(post.user_id || '').startsWith('pet:') ? 'PET' : 'สมาชิก'),
      avatar: post.avatar || '',
      avatarColor: post.avatar_color || 'green',
      kind: post.kind,
      body: post.retracted ? '' : (post.body || ''),
      retracted: !!post.retracted,
      petId: post.pet_id || null,
      wakeHour: post.wake_hour == null ? null : Number(post.wake_hour),
      sentAt: new Date(post.sent_at).toISOString(),
    }));

    const safeEvents = events.map(event => ({
      type: event.type,
      partyDay: Number(event.party_day || 1),
      data: dataOf(event.data_json),
      at: new Date(event.created_at).toISOString(),
    }));

    const state = String(row.state || 'ACTIVE').toUpperCase();
    return sendJson(res, {
      ok: true,
      party: {
        code: row.code,
        name: row.name,
        activity: row.activity || '',
        activityId: row.activity_id || 'custom',
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
        joinable: ACTIVE_STATES.includes(state) && activeMembers.length < 5,
        createdAt: new Date(row.created_at).toISOString(),
        startAt: new Date(row.started_at || row.created_at).toISOString(),
        scheduledEndAt: row.scheduled_end_at ? new Date(row.scheduled_end_at).toISOString() : null,
        members: activeMembers,
        events: safeEvents,
        log: safePosts,
      },
    });
  } catch (error) {
    console.error('XTY public preview failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'XTY_API_ERROR' }, 500);
  }
}
