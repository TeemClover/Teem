import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from '../_lib/core.js';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  XTY_TIMEZONE, completionGate, confirmDeadlineForDayKey, normalizeVerificationMode,
  partyDateKey, partyDayNumber, scheduledEndAt, startOfPartyDay, validPartyCode,
} from '../_lib/xty-rules.js';
import { XTY_CARDS, cardById } from '../../xty/_shared/cards.js';
import { handleXtyAdmin } from '../_lib/xty-admin.js';

const PARTY_MAX = 5;
const MAX_JOINED_ACTIVE = 3;
const BUDGETS = Object.freeze({ quiet: 1, normal: 3, social: 5 });
const DEFAULT_BUDGET = 'normal';
const REACTIONS = Object.freeze(['❤️', '🔥', '👏', '😂', '🫡', '💪', '👀', '🍀']);
const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const REWARD_CARD_IDS = Object.freeze(
  XTY_CARDS.filter(card => card.eligibility?.reward).map(card => card.cardId),
);

function routeParts(req) {
  const pathname = new URL(req.url || '/', 'https://myclover.local').pathname;
  const marker = '/api/xty/';
  if (pathname.startsWith(marker)) {
    return pathname.slice(marker.length).split('/').filter(Boolean).map(decodeURIComponent);
  }
  const value = req.query?.path;
  return Array.isArray(value) ? value : String(value || '').split('/').filter(Boolean);
}

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }

function token() { return randomBytes(32).toString('base64url'); }
function code() {
  return [...randomBytes(5)].map(byte => String(byte % 10)).join('');
}
function validCode(value) { return validPartyCode(value); }
function validCardId(value) { return /^[A-Z0-9_]{8,80}$/.test(String(value || '')); }
function activeParty(row) { return ACTIVE_STATES.includes(String(row?.state || 'ACTIVE').toUpperCase()); }
function dayKey(date = new Date(), timezone = XTY_TIMEZONE) { return partyDateKey(date, timezone); }

function seededIndex(value, length) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return length ? (hash >>> 0) % length : 0;
}

async function partyByCode(sql, value) {
  const rows = await sql.query(`SELECT id,code,name,activity,activity_id,preset,duration_days,color,visibility,commit_rule,budget,pet_id,owner_id,
    state,created_at,updated_at,head_seq,pet_last_wake,lead_card_id,npc_card_id,started_at,ended_at,timezone,
    verification_mode,scheduled_end_at,cover_type,cover_value
    FROM xty_parties WHERE code=$1`, [value]);
  return rows[0] || null;
}

function partyDay(row, at = new Date()) {
  return partyDayNumber(row.started_at || row.created_at || at, at, row.timezone || XTY_TIMEZONE);
}

function tierBonusEntitlement(tier) {
  return tier === 'max' ? 3 : (tier === 'plus' ? 2 : 0);
}

function shapeProgression(row) {
  const wantedLevel = Math.floor(Number(row?.level || 1));
  const level = Number.isFinite(wantedLevel) ? Math.min(4, Math.max(1, wantedLevel)) : 1;
  const paidTier = ['plus', 'max'].includes(row?.paid_tier) ? row.paid_tier : 'free';
  const entitlement = tierBonusEntitlement(paidTier);
  const wantedBonusSlots = Math.floor(Number(row?.unlocked_bonus_slots || 0));
  const unlockedBonusSlots = Number.isFinite(wantedBonusSlots)
    ? Math.min(entitlement, Math.max(0, wantedBonusSlots)) : 0;
  return {
    level, paidTier, bonusSlotEntitlement: entitlement, unlockedBonusSlots,
    effectiveCreateCapacity: level + unlockedBonusSlots,
  };
}

async function progressionFor(sql, ids, now = new Date()) {
  const values = [...new Set((ids || []).filter(Boolean))];
  for (const id of values) {
    await sql.query(`INSERT INTO xty_progression (user_id,level,paid_tier,unlocked_bonus_slots,updated_at)
      VALUES ($1,1,'free',0,$2) ON CONFLICT (user_id) DO NOTHING`, [id, now]);
  }
  const rows = values.length
    ? await sql.query(`SELECT user_id,level,paid_tier,unlocked_bonus_slots FROM xty_progression
      WHERE user_id = ANY($1::text[]) ORDER BY level DESC, unlocked_bonus_slots DESC LIMIT 1`, [values])
    : [];
  return shapeProgression(rows[0]);
}

function localIdentity(body) {
  const value = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(value) ? `local:${value}` : '';
}

async function identityFor(req, sql, body) {
  const account = await currentUser(req, sql);
  const accountId = account ? `account:${account.id}` : '';
  const localId = localIdentity(body);
  /* Never invent an id here. A random one satisfies the insert and then
     matches nothing ever again: the member cannot be recovered by account
     bind, cannot be found by resync, and cannot even dissolve their own
     party. Those are the ghost parties. Refuse instead. */
  const primary = accountId || localId;
  return {
    account,
    primary,
    ids: primary ? [accountId || primary, localId || accountId || primary] : [],
  };
}

async function capacityUsage(sql, ids) {
  const progression = await progressionFor(sql, ids);
  const rows = await sql.query(`SELECT
      COUNT(DISTINCT p.id) FILTER (WHERE p.owner_id IN ($1,$2))::int owned,
      COUNT(DISTINCT p.id) FILTER (WHERE m.role <> 'lead')::int joined,
      COUNT(DISTINCT p.id)::int total
    FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
    WHERE m.user_id IN ($1,$2) AND m.left_at IS NULL
      AND p.state = ANY($3::text[])`, [ids[0], ids[1], ACTIVE_STATES]);
  return {
    owned: Number(rows[0]?.owned || 0),
    joined: Number(rows[0]?.joined || 0),
    total: Number(rows[0]?.total || 0),
    maxOwned: progression.effectiveCreateCapacity,
    maxJoined: MAX_JOINED_ACTIVE,
    maxTotal: progression.effectiveCreateCapacity + MAX_JOINED_ACTIVE,
    progression,
  };
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role FROM xty_members
      WHERE party_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || '');
  const value = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!value) return null;
  const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role FROM xty_members
    WHERE party_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(value)]);
  return rows[0] || null;
}

async function membersOf(sql, partyId) {
  const rows = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,joined_at,left_at,removal_reason FROM xty_members
    WHERE party_id=$1 ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END, joined_at`, [partyId]);
  return rows.map(row => ({
    userId: row.user_id, alias: row.alias, avatar: row.avatar || '🍀', role: row.role,
    avatarColor: ['red', 'green', 'blue', 'silver'].includes(row.avatar_color) ? row.avatar_color : 'green',
    joinedAt: new Date(row.joined_at).toISOString(),
    leftAt: row.left_at ? new Date(row.left_at).toISOString() : null,
    removalReason: row.removal_reason || null,
  }));
}

async function eventsOf(sql, partyId) {
  const rows = await sql.query(`SELECT type,party_day,data_json,created_at FROM xty_party_events
    WHERE party_id=$1 ORDER BY id`, [partyId]);
  return rows.map(row => {
    let data = row.data_json || {};
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { data = {}; }
    }
    return {
      type: row.type, partyDay: Number(row.party_day || 1), data,
      at: new Date(row.created_at).toISOString(),
    };
  });
}

async function issueCardRewardsForParty(sql, row, at = new Date()) {
  const members = await sql.query(`SELECT user_id FROM xty_members
    WHERE party_id=$1 AND left_at IS NULL ORDER BY joined_at`, [row.id]);
  for (const membership of members) {
    const existing = await sql.query(`SELECT id,card_id,created_at FROM xty_card_rewards
      WHERE user_id=$1 AND party_id=$2 LIMIT 1`, [membership.user_id, row.id]);
    if (existing[0]) {
      if (existing[0].card_id) {
        await sql.query(`INSERT INTO xty_card_ownership (user_id,card_id,acquired_from,acquired_at)
          VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,card_id) DO NOTHING`, [
          membership.user_id, existing[0].card_id, `party:${row.code}`, existing[0].created_at || at,
        ]);
      }
      continue;
    }
    const ownedRows = await sql.query(`SELECT card_id FROM xty_card_ownership
      WHERE user_id=$1`, [membership.user_id]);
    const owned = new Set(ownedRows.map(item => item.card_id));
    const available = REWARD_CARD_IDS.filter(cardId => !owned.has(cardId));
    const cardId = available.length
      ? available[seededIndex(`${membership.user_id}|${row.id}|${owned.size}`, available.length)]
      : null;
    const rewardId = `reward_${randomUUID()}`;
    const inserted = await sql.query(`INSERT INTO xty_card_rewards
      (id,user_id,party_id,card_id,created_at,revealed_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (user_id,party_id) DO NOTHING RETURNING id,card_id`, [
      rewardId, membership.user_id, row.id, cardId, at, cardId ? null : at,
    ]);
    if (inserted[0]?.card_id) {
      await sql.query(`INSERT INTO xty_card_ownership (user_id,card_id,acquired_from,acquired_at)
        VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,card_id) DO NOTHING`, [
        membership.user_id, inserted[0].card_id, `party:${row.code}`, at,
      ]);
    }
  }
}

async function rewardsOf(sql, row, member) {
  if (String(row?.state || '').toUpperCase() !== 'COMPLETED') {
    return { claims: [], mine: null };
  }
  const rows = await sql.query(`SELECT r.id,r.user_id,r.card_id,r.created_at,r.revealed_at,m.alias
    FROM xty_card_rewards r JOIN xty_members m ON m.party_id=r.party_id AND m.user_id=r.user_id
    WHERE r.party_id=$1 ORDER BY m.joined_at`, [row.id]);
  const claims = rows.map(reward => ({
    userId: reward.user_id,
    alias: reward.alias,
    rewardId: reward.id,
    revealedAt: reward.revealed_at ? new Date(reward.revealed_at).toISOString() : null,
    complete: !reward.card_id,
    cardId: reward.revealed_at && reward.card_id ? reward.card_id : null,
  }));
  const mine = rows.find(reward => reward.user_id === member?.user_id);
  return {
    claims,
    mine: mine ? {
      rewardId: mine.id,
      questId: `party-complete:${row.code}`,
      partyCode: row.code,
      cardId: mine.card_id || null,
      complete: !mine.card_id,
      earnedAt: new Date(mine.created_at).toISOString(),
      revealedAt: mine.revealed_at ? new Date(mine.revealed_at).toISOString() : null,
    } : null,
  };
}

async function postsOf(sql, partyId, since = 0) {
  const rows = await sql.query(`SELECT p.seq,p.user_id,p.kind,p.body,p.sent_at,p.retracted,
    p.pet_id,p.wake_hour,m.alias,m.avatar FROM xty_posts p LEFT JOIN xty_members m
    ON m.party_id=p.party_id AND m.user_id=p.user_id
    WHERE p.party_id=$1 AND p.seq>$2 ORDER BY p.seq`, [partyId, since]);
  const posts = rows.map(row => ({
    seq: Number(row.seq), userId: row.user_id, alias: row.alias || '', avatar: row.avatar || '',
    kind: row.kind, body: row.retracted ? '' : row.body,
    sentAt: new Date(row.sent_at).toISOString(), retracted: !!row.retracted,
    petId: row.pet_id || null, wakeHour: row.wake_hour == null ? null : Number(row.wake_hour),
    reactions: {}, confirmedBy: null, confirmedAt: null,
  }));
  if (!posts.length) return posts;
  const reactions = await sql.query(`SELECT seq,user_id,emoji FROM xty_reactions
    WHERE party_id=$1 AND seq>$2 ORDER BY seq`, [partyId, since]);
  const bySeq = new Map(posts.map(post => [post.seq, post]));
  for (const row of reactions) {
    const post = bySeq.get(Number(row.seq));
    if (post) (post.reactions[row.emoji] ||= []).push(row.user_id);
  }
  const confirmations = await sql.query(`SELECT commit_seq,confirmer_id,created_at FROM xty_confirmations
    WHERE party_id=$1 AND commit_seq>$2`, [partyId, since]);
  for (const row of confirmations) {
    const post = bySeq.get(Number(row.commit_seq));
    if (post) {
      post.confirmedBy = row.confirmer_id;
      post.confirmedAt = new Date(row.created_at).toISOString();
    }
  }
  return posts;
}

function shape(row, memberHistory, posts, events, rewardClaims = []) {
  const members = memberHistory.filter(member => !member.leftAt);
  const verificationMode = normalizeVerificationMode(row.verification_mode);
  const shapedPosts = posts.map(post => post.kind === 'commit'
    ? { ...post, valid: verificationMode === 'trust' || !!post.confirmedBy }
    : post);
  const scheduled = row.scheduled_end_at || scheduledEndAt(
    row.started_at || row.created_at, row.duration_days, row.timezone || XTY_TIMEZONE,
  );
  return {
    id: row.id, code: row.code, name: row.name, activity: row.activity || '',
    activityId: row.activity_id || 'custom', preset: row.preset || 'casual',
    durationDays: Number(row.duration_days || 7), color: row.color || 'green',
    visibility: row.visibility || 'private',
    verificationMode,
    commitRule: row.commit_rule || '', budget: BUDGETS[row.budget] ? row.budget : DEFAULT_BUDGET,
    petId: row.pet_id || null, leadCardId: row.lead_card_id || null, npcCardId: row.npc_card_id || null,
    coverType: row.cover_type || (row.lead_card_id ? 'legacy_card' : 'avatar'),
    coverValue: row.cover_value || null,
    ownerId: row.owner_id, state: row.state || 'ACTIVE', timezone: row.timezone || 'Asia/Bangkok',
    startAt: new Date(row.started_at || row.created_at).toISOString(),
    scheduledEndAt: new Date(scheduled).toISOString(),
    endAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
    members, memberHistory, events, rewardClaims, log: shapedPosts,
  };
}

async function stateFor(sql, row, member, since = 0) {
  if (String(row?.state || '').toUpperCase() === 'COMPLETED') {
    await issueCardRewardsForParty(sql, row, row.ended_at || new Date());
  }
  const finalBoundary = row.ended_at || new Date('9999-12-31T00:00:00.000Z');
  const [memberHistory, posts, events, counts, progression, rewards] = await Promise.all([
    membersOf(sql, row.id), postsOf(sql, row.id, since), eventsOf(sql, row.id),
    sql.query(`SELECT
      COUNT(DISTINCT CASE WHEN kind='commit' AND retracted=FALSE AND day_key=$3::date THEN user_id END)::int committed,
      COUNT(*) FILTER (WHERE day_key=$3::date)::int updates,
      COUNT(*) FILTER (WHERE kind='message' AND user_id=$2 AND day_key=$3::date)::int messages_used,
      COUNT(*) FILTER (WHERE kind='message' AND user_id=$2 AND sent_at >= $4)::int final_messages_used
      FROM xty_posts WHERE party_id=$1`, [
      row.id, member?.user_id || '', dayKey(new Date(), row.timezone), finalBoundary,
    ]),
    progressionFor(sql, [member?.user_id].filter(Boolean)),
    rewardsOf(sql, row, member),
  ]);
  const count = counts[0] || {};
  const members = memberHistory.filter(item => !item.leftAt);
  const limit = BUDGETS[row.budget] || BUDGETS[DEFAULT_BUDGET];
  const completed = String(row.state || '').toUpperCase() === 'COMPLETED';
  const used = completed ? Number(count.final_messages_used || 0) : Number(count.messages_used || 0);
  const budgetLeft = member && (activeParty(row) || completed) ? Math.max(0, limit - used) : 0;
  return {
    ok: true, head: Number(row.head_seq || 0), meUserId: member?.user_id || null,
    today: { committed: Number(count.committed || 0), members: members.length, updates: Number(count.updates || 0) },
    budgetLeft: member ? budgetLeft : null,
    finalMessage: completed && member
      ? { limit, used, left: budgetLeft, writable: budgetLeft > 0 }
      : null,
    myReward: rewards.mine,
    meProgression: member ? progression : null,
    party: shape(row, memberHistory, posts, events, rewards.claims),
  };
}

async function appendPost(sql, row, member, kind, text) {
  const now = new Date(); const key = dayKey(now, row.timezone);
  if (kind === 'message') {
    const limit = BUDGETS[row.budget] || BUDGETS[DEFAULT_BUDGET];
    const state = String(row.state || '').toUpperCase();
    let rows;
    if (activeParty(row)) {
      rows = await sql.query(`WITH locked AS (
          SELECT id FROM xty_parties WHERE id=$1 AND state = ANY($7::text[]) FOR UPDATE
        ), allowed AS (
          SELECT id FROM locked WHERE (
            SELECT COUNT(*) FROM xty_posts WHERE party_id=$1 AND user_id=$2
              AND kind='message' AND day_key=$3::date
          ) < $4
        ), next AS (
          UPDATE xty_parties p SET head_seq=p.head_seq+1,updated_at=$5
          FROM allowed a WHERE p.id=a.id RETURNING p.head_seq
        )
        INSERT INTO xty_posts (party_id,seq,user_id,kind,body,sent_at,day_key,retracted)
        SELECT $1,head_seq,$2,'message',$6,$5,$3::date,FALSE FROM next RETURNING seq`,
      [row.id, member.user_id, key, limit, now, text, ACTIVE_STATES]);
    } else if (state === 'COMPLETED' && row.ended_at) {
      rows = await sql.query(`WITH locked AS (
          SELECT id,ended_at FROM xty_parties WHERE id=$1 AND state='COMPLETED' FOR UPDATE
        ), allowed AS (
          SELECT id FROM locked WHERE (
            SELECT COUNT(*) FROM xty_posts WHERE party_id=$1 AND user_id=$2
              AND kind='message' AND sent_at >= locked.ended_at
          ) < $4
        ), next AS (
          UPDATE xty_parties p SET head_seq=p.head_seq+1,updated_at=$5
          FROM allowed a WHERE p.id=a.id RETURNING p.head_seq
        )
        INSERT INTO xty_posts (party_id,seq,user_id,kind,body,sent_at,day_key,retracted)
        SELECT $1,head_seq,$2,'message',$6,$5,$3::date,FALSE FROM next RETURNING seq`,
      [row.id, member.user_id, key, limit, now, text]);
    } else return { error: 'PARTY_CLOSED', status: 409 };
    if (!rows[0]) return { error: 'NO_BUDGET', status: 409 };
    row.head_seq = Number(rows[0].seq); return { seq: row.head_seq };
  }

  if (!activeParty(row)) return { error: 'PARTY_CLOSED', status: 409 };

  try {
    const rows = await sql.query(`WITH next AS (
        UPDATE xty_parties SET head_seq=head_seq+1,updated_at=$4 WHERE id=$1 RETURNING head_seq
      )
      INSERT INTO xty_posts (party_id,seq,user_id,kind,body,sent_at,day_key,retracted)
      SELECT $1,head_seq,$2,'commit',$3,$4,$5::date,FALSE FROM next RETURNING seq`,
    [row.id, member.user_id, text, now, key]);
    row.head_seq = Number(rows[0].seq); return { seq: row.head_seq };
  } catch (error) {
    if (error.code === '23505') return { error: 'ALREADY_COMMITTED', status: 409 };
    throw error;
  }
}

async function applyProgressionForParty(sql, row, at = new Date()) {
  if (String(row?.state || '').toUpperCase() !== 'COMPLETED') return;
  const members = await sql.query(`SELECT user_id,role,joined_at,left_at FROM xty_members
    WHERE party_id=$1`, [row.id]);
  const partyStart = startOfPartyDay(row.started_at || row.created_at, row.timezone || XTY_TIMEZONE);
  const partyEnd = new Date(row.scheduled_end_at || scheduledEndAt(
    row.started_at || row.created_at, row.duration_days, row.timezone || XTY_TIMEZONE,
  ));
  const verificationMode = normalizeVerificationMode(row.verification_mode);

  for (const membership of members) {
    const progression = await progressionFor(sql, [membership.user_id], at);
    let reason = '';
    if (progression.level === 1) reason = 'QUEST_COMPLETED';
    else if (progression.level === 2 && membership.role === 'lead') reason = 'LEAD_QUEST_COMPLETED';
    else if (progression.level === 3) {
      const joined = startOfPartyDay(membership.joined_at || partyStart, row.timezone || XTY_TIMEZONE);
      const from = joined > partyStart ? joined : partyStart;
      const leftBoundary = membership.left_at
        ? startOfPartyDay(membership.left_at, row.timezone || XTY_TIMEZONE)
        : partyEnd;
      const until = leftBoundary < partyEnd ? leftBoundary : partyEnd;
      const expectedDays = Math.max(0, Math.round((until.getTime() - from.getTime()) / 86400000));
      const valid = await sql.query(`SELECT COUNT(DISTINCT p.day_key)::int n FROM xty_posts p
        WHERE p.party_id=$1 AND p.user_id=$2 AND p.kind='commit' AND p.retracted=FALSE
          AND p.sent_at >= $3 AND p.sent_at < $4
          AND ($5='trust' OR EXISTS (SELECT 1 FROM xty_confirmations c
            WHERE c.party_id=p.party_id AND c.commit_seq=p.seq))`,
      [row.id, membership.user_id, from, until, verificationMode]);
      if (expectedDays > 0 && Number(valid[0]?.n || 0) >= expectedDays) reason = 'FULL_COMMIT';
    }
    if (!reason) continue;
    const nextLevel = Math.min(4, progression.level + 1);
    await sql.query(`WITH event AS (
        INSERT INTO xty_level_events (user_id,party_id,from_level,to_level,reason,created_at)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id,party_id) DO NOTHING RETURNING user_id
      ) UPDATE xty_progression SET level=$4,updated_at=$6
        WHERE user_id=$1 AND EXISTS (SELECT 1 FROM event)`,
    [membership.user_id, row.id, progression.level, nextLevel, reason, at]);
  }
}

export default async function handler(req, res) {
  let sql;
  try {
    sql = database(); await ensureSchema(sql);
    const method = req.method.toUpperCase();
    if (method !== 'GET' && !sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const parts = routeParts(req);

    if (parts[0] === 'admin') return handleXtyAdmin(req, res, sql, method, parts);

    if (method === 'GET' && parts[0] === 'public') {
      const pageSize = 16;
      let offset = 0;
      try {
        const raw = String(req.query?.cursor || '');
        if (raw) offset = Math.max(0, Number(Buffer.from(raw, 'base64url').toString('utf8')) || 0);
      } catch { offset = 0; }
      const key = dayKey();
      const rows = await sql.query(`SELECT p.id,p.code,p.name,p.activity,p.duration_days,p.state,p.started_at,
          p.scheduled_end_at,p.timezone,p.verification_mode,p.cover_type,p.cover_value,p.lead_card_id,p.npc_card_id,p.pet_id,
          COUNT(DISTINCT m.user_id) FILTER (WHERE m.left_at IS NULL)::int member_count,
          COUNT(DISTINCT c.user_id) FILTER (WHERE c.kind='commit' AND c.retracted=FALSE)::int commit_count,
          MAX(m.alias) FILTER (WHERE m.role='lead' AND m.left_at IS NULL) lead_alias,
          MAX(m.avatar) FILTER (WHERE m.role='lead' AND m.left_at IS NULL) lead_avatar,
          MAX(m.avatar_color) FILTER (WHERE m.role='lead' AND m.left_at IS NULL) lead_avatar_color
        FROM xty_parties p
        LEFT JOIN xty_members m ON m.party_id=p.id
        LEFT JOIN xty_posts c ON c.party_id=p.id AND c.day_key=$1::date
        WHERE p.visibility='public' AND p.state = ANY($2::text[])
        GROUP BY p.id ORDER BY p.updated_at DESC,p.id DESC LIMIT $3 OFFSET $4`,
      [key, ACTIVE_STATES, pageSize + 1, offset]);
      const page = rows.slice(0, pageSize).map(row => ({
        code: row.code,
        name: row.name,
        activity: row.activity || '',
        verificationMode: normalizeVerificationMode(row.verification_mode),
        day: Math.min(Number(row.duration_days || 7), partyDay(row)),
        durationDays: Number(row.duration_days || 7),
        memberCount: Number(row.member_count || 0),
        maxMembers: PARTY_MAX,
        todayCommitCount: Number(row.commit_count || 0),
        lead: {
          alias: row.lead_alias || 'หัวตี้',
          avatar: row.lead_avatar || 'orange_cat',
          avatarColor: row.lead_avatar_color || 'green',
        },
        coverType: row.cover_type || 'card_back',
        coverValue: row.cover_value || row.lead_card_id || null,
        npcCardId: row.npc_card_id || null,
        petId: row.pet_id || null,
        joinable: Number(row.member_count || 0) < PARTY_MAX,
      }));
      const nextCursor = rows.length > pageSize
        ? Buffer.from(String(offset + pageSize)).toString('base64url')
        : null;
      return sendJson(res, { ok: true, parties: page, nextCursor });
    }

    if (method === 'POST' && parts[0] === 'bind') {
      const account = await currentUser(req, sql);
      if (!account) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
      /* A device that loses localStorage mints a brand new profile id, so
         binding only the current one strands every party created under an
         earlier id. The client keeps its own id history (and restores it from
         cloud progress), and every id it has ever used is folded in here. */
      const body = bodyOf(req);
      const requested = Array.isArray(body.profileIds) ? body.profileIds : [];
      const profileIds = [...new Set([body.profileId, ...requested]
        .map(value => clean(value, 80))
        .filter(value => /^[a-z0-9_-]{6,80}$/i.test(value)))];
      if (!profileIds.length) return sendJson(res, { ok: false, error: 'INVALID_PROFILE' }, 400);
      const localIds = profileIds.map(value => `local:${value}`);
      const accountId = `account:${account.id}`; const at = new Date();
      /* DISTINCT ON keeps one source row per party. Without it two old ids in
         the same party would hit the same conflict target twice, which
         Postgres rejects outright ("cannot affect row a second time"). */
      await sql.query(`WITH local_members AS MATERIALIZED (
          SELECT DISTINCT ON (party_id) * FROM xty_members WHERE user_id = ANY($1::text[])
          ORDER BY party_id,(left_at IS NULL) DESC,(role='lead') DESC,joined_at
        ), merged_members AS (
          INSERT INTO xty_members (party_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason)
          SELECT party_id,$2,alias,avatar,avatar_color,role,auth_hash,joined_at,left_at,removal_reason FROM local_members
          ON CONFLICT (party_id,user_id) DO UPDATE SET
            alias=EXCLUDED.alias,avatar=EXCLUDED.avatar,avatar_color=EXCLUDED.avatar_color,
            auth_hash=COALESCE(EXCLUDED.auth_hash,xty_members.auth_hash),
            joined_at=LEAST(xty_members.joined_at,EXCLUDED.joined_at)
          RETURNING party_id
        ), posts AS (
          UPDATE xty_posts SET user_id=$2 WHERE user_id = ANY($1::text[]) RETURNING party_id
        ), reactions AS (
          UPDATE xty_reactions SET user_id=$2 WHERE user_id = ANY($1::text[])
            AND NOT EXISTS (SELECT 1 FROM xty_reactions r2 WHERE r2.party_id=xty_reactions.party_id
              AND r2.seq=xty_reactions.seq AND r2.user_id=$2 AND r2.emoji=xty_reactions.emoji)
          RETURNING party_id
        ), confirmations AS (
          UPDATE xty_confirmations SET confirmer_id=$2 WHERE confirmer_id = ANY($1::text[]) RETURNING party_id
        ), events AS (
          UPDATE xty_party_events SET actor_id=$2 WHERE actor_id = ANY($1::text[]) RETURNING party_id
        ), owners AS (
          UPDATE xty_parties SET owner_id=$2,updated_at=$3 WHERE owner_id = ANY($1::text[]) RETURNING id
        ), progression AS (
          INSERT INTO xty_progression (user_id,level,paid_tier,unlocked_bonus_slots,updated_at)
          SELECT $2,level,paid_tier,unlocked_bonus_slots,$3 FROM xty_progression
            WHERE user_id = ANY($1::text[]) ORDER BY level DESC,unlocked_bonus_slots DESC LIMIT 1
          ON CONFLICT (user_id) DO UPDATE SET level=GREATEST(xty_progression.level,EXCLUDED.level),updated_at=$3
          RETURNING user_id
        ), deleted AS (
          DELETE FROM xty_members WHERE user_id = ANY($1::text[]) AND EXISTS (SELECT 1 FROM merged_members) RETURNING party_id
        ) DELETE FROM xty_progression WHERE user_id = ANY($1::text[])`, [localIds, accountId, at]);
      await sql.query(`WITH copied AS (
          INSERT INTO xty_card_ownership (user_id,card_id,acquired_from,acquired_at)
          SELECT DISTINCT ON (card_id) $2,card_id,acquired_from,acquired_at FROM xty_card_ownership
            WHERE user_id = ANY($1::text[]) ORDER BY card_id,acquired_at
          ON CONFLICT (user_id,card_id) DO NOTHING RETURNING card_id
        ) DELETE FROM xty_card_ownership WHERE user_id = ANY($1::text[])`, [localIds, accountId]);
      await sql.query(`WITH copied AS (
          INSERT INTO xty_card_rewards (id,user_id,party_id,card_id,created_at,revealed_at)
          SELECT DISTINCT ON (party_id) id,$2,party_id,card_id,created_at,revealed_at FROM xty_card_rewards
            WHERE user_id = ANY($1::text[]) ORDER BY party_id,created_at
          ON CONFLICT (user_id,party_id) DO UPDATE SET
            card_id=COALESCE(xty_card_rewards.card_id,EXCLUDED.card_id),
            revealed_at=COALESCE(xty_card_rewards.revealed_at,EXCLUDED.revealed_at)
          RETURNING party_id
        ) DELETE FROM xty_card_rewards WHERE user_id = ANY($1::text[])`, [localIds, accountId]);
      await progressionFor(sql, [accountId], at);
      return sendJson(res, { ok: true, boundIds: profileIds.length });
    }

    if (parts[0] !== 'party') return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    if (method === 'POST' && parts.length === 1) {
      const body = bodyOf(req); const name = clean(body.name, 40); const alias = clean(body.alias, 24);
      if (!name || !alias) return sendJson(res, { ok: false, error: 'INVALID_PARTY' }, 400);
      const identity = await identityFor(req, sql, body);
      /* No account session and no usable profile id — creating anyway would
         produce a party nobody can ever reach again. */
      if (!identity.primary) return sendJson(res, { ok: false, error: 'PROFILE_REQUIRED' }, 400);
      const userId = identity.primary;
      const usage = await capacityUsage(sql, identity.ids);
      if (usage.owned >= usage.maxOwned) return sendJson(res, { ok: false, error: 'OWNED_PARTY_LIMIT', progression: usage.progression }, 409);
      if (usage.total >= usage.maxTotal) return sendJson(res, { ok: false, error: 'ACTIVE_PARTY_LIMIT', progression: usage.progression }, 409);
      const memberToken = token(); const now = new Date(); const partyId = randomUUID();
      const budget = BUDGETS[body.budget] ? body.budget : DEFAULT_BUDGET;
      const verificationMode = normalizeVerificationMode(body.verificationMode);
      const preset = verificationMode === 'confirm' ? 'verified' : 'casual';
      const durationDays = [7, 14, 28].includes(Number(body.durationDays)) ? Number(body.durationDays) : 7;
      const color = ['red', 'green', 'blue', 'silver'].includes(body.color) ? body.color : 'green';
      const visibility = ['public', 'private'].includes(body.visibility) ? body.visibility : 'private';
      const avatarId = clean(body.avatar, 40) || 'orange_cat';
      const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor) ? body.avatarColor : 'green';
      const history = await sql.query(`SELECT COUNT(*)::int n FROM xty_parties
        WHERE owner_id IN ($1,$2)`, [identity.ids[0], identity.ids[1]]);
      const firstParty = Number(history[0]?.n || 0) === 0;
      const requestedCover = String(body.coverType || '').toLowerCase();
      let coverType = firstParty ? 'avatar' : (['card_back', 'card'].includes(requestedCover) ? requestedCover : 'card_back');
      let leadCardId = coverType === 'card' && validCardId(body.leadCardId) ? String(body.leadCardId) : null;
      const coverCard = leadCardId ? cardById(leadCardId) : null;
      if (coverType === 'card' && (!coverCard || !coverCard.eligibility?.partyCover)) {
        return sendJson(res, { ok: false, error: 'CARD_NOT_COVER_ELIGIBLE' }, 400);
      }
      if (firstParty && requestedCover && requestedCover !== 'avatar') coverType = 'avatar';
      if (coverType !== 'card') leadCardId = null;
      const npcCardId = validCardId(body.npcCardId) ? String(body.npcCardId) : null;
      const npcCard = npcCardId ? cardById(npcCardId) : null;
      const legacyPetId = npcCardId ? null : (clean(body.petId, 40) || null);
      if ((npcCardId && (!npcCard || !npcCard.eligibility?.npc)) || (npcCardId && npcCardId === leadCardId)) {
        return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 400);
      }
      const timezone = XTY_TIMEZONE;
      const scheduled = scheduledEndAt(now, durationDays, timezone);
      const coverValue = coverType === 'avatar'
        ? JSON.stringify({ species: avatarId, color: avatarColor })
        : (coverType === 'card' ? leadCardId : 'notebook-rgbs-v1');
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const inviteCode = code();
        try {
          const inserted = await sql.query(`WITH guard AS (
            SELECT pg_advisory_xact_lock(hashtext($13))
          ), capacity AS (
            SELECT 1 FROM guard WHERE
              (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
                WHERE m.user_id IN ($13,$14) AND m.left_at IS NULL AND p.state = ANY($16::text[])) < $15
              AND (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
                WHERE m.user_id IN ($13,$14) AND p.owner_id IN ($13,$14)
                  AND m.left_at IS NULL AND p.state = ANY($16::text[])) < $17
              AND ($23::text IS NULL OR NOT EXISTS (SELECT 1 FROM xty_parties
                WHERE owner_id IN ($13,$14) AND state = ANY($16::text[])
                  AND (lead_card_id=$23 OR npc_card_id=$23)))
              AND ($24::text IS NULL OR NOT EXISTS (SELECT 1 FROM xty_parties
                WHERE owner_id IN ($13,$14) AND state = ANY($16::text[])
                  AND (lead_card_id=$24 OR npc_card_id=$24)))
          ), party AS (
            INSERT INTO xty_parties (id,code,name,activity,commit_rule,budget,pet_id,owner_id,created_at,updated_at,
              activity_id,preset,duration_days,color,visibility,lead_card_id,npc_card_id,started_at,timezone,
              verification_mode,scheduled_end_at,cover_type,cover_value)
            SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$18,$19,$20,$21,$22,$23,$24,$9,$25,
              $27,$28,$29,$30 FROM capacity RETURNING id
          ), lead_member AS (
            INSERT INTO xty_members (party_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at)
            SELECT id,$8,$10,$11,$31,'lead',$12,$9 FROM party RETURNING party_id
          ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
            SELECT party_id,'PARTY_CREATED',$8,1,$26::jsonb,$9 FROM lead_member RETURNING party_id`, [
            partyId, inviteCode, name, clean(body.activity, 60), clean(body.commitRule, 120),
            budget, legacyPetId, userId, now, alias,
            clean(body.avatar, 40) || '🍀', await sha256(memberToken),
            identity.ids[0], identity.ids[1], usage.maxTotal, ACTIVE_STATES, usage.maxOwned,
            clean(body.activityId, 40) || 'custom', preset, durationDays, color, visibility,
            leadCardId, npcCardId, timezone,
            JSON.stringify({ name, coverType, leadCardId, npcCardId, alias, verificationMode }),
            verificationMode, scheduled, coverType, coverValue, avatarColor,
          ]);
          if (!inserted[0]) return sendJson(res, { ok: false, error: 'ACTIVE_PARTY_LIMIT' }, 409);
          const row = await partyByCode(sql, inviteCode);
          return sendJson(res, { ...(await stateFor(sql, row, { user_id: userId })), token: memberToken }, 201);
        } catch (error) {
          if (error.code !== '23505') throw error;
        }
      }
      return sendJson(res, { ok: false, error: 'CODE_CAPACITY_REACHED' }, 503);
    }

    const inviteCode = String(parts[1] || '').toUpperCase();
    if (!validCode(inviteCode)) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const row = await partyByCode(sql, inviteCode);
    if (!row) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    if (method === 'POST' && parts[2] === 'join') {
      const body = bodyOf(req); const alias = clean(body.alias, 24);
      if (!alias) return sendJson(res, { ok: false, error: 'INVALID_ALIAS' }, 400);
      if (!activeParty(row)) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      const identity = await identityFor(req, sql, body);
      if (!identity.primary) return sendJson(res, { ok: false, error: 'PROFILE_REQUIRED' }, 400);
      let existingMember = await memberFor(req, sql, row.id);
      if (!existingMember && identity.ids[1]) {
        const sameLocal = await sql.query(`SELECT user_id,alias,avatar,avatar_color,role,left_at,removal_reason FROM xty_members
          WHERE party_id=$1 AND user_id IN ($2,$3) ORDER BY left_at NULLS FIRST LIMIT 1`, [row.id, identity.ids[0], identity.ids[1]]);
        existingMember = sameLocal[0] || null;
      }
      if (existingMember) {
        if (existingMember.left_at) return sendJson(res, { ok: false, error: 'MEMBERSHIP_CLOSED' }, 403);
        const memberToken = token();
        const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor) ? body.avatarColor : 'green';
        await sql.query(`UPDATE xty_members SET alias=$1,avatar=$2,avatar_color=$3,auth_hash=$4
          WHERE party_id=$5 AND user_id=$6`, [
          alias, clean(body.avatar, 40) || 'orange_cat', avatarColor,
          await sha256(memberToken), row.id, existingMember.user_id,
        ]);
        return sendJson(res, {
          ...(await stateFor(sql, row, { ...existingMember, alias })), token: memberToken,
        });
      }
      const usage = await capacityUsage(sql, identity.ids);
      if (usage.joined >= MAX_JOINED_ACTIVE) return sendJson(res, { ok: false, error: 'JOINED_PARTY_LIMIT' }, 409);
      if (usage.total >= usage.maxTotal) return sendJson(res, { ok: false, error: 'ACTIVE_PARTY_LIMIT' }, 409);
      const userId = identity.primary;
      const memberToken = token(); const authHash = await sha256(memberToken); const now = new Date();
      const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor) ? body.avatarColor : 'green';
      const inserted = await sql.query(`WITH guard AS (
          SELECT pg_advisory_xact_lock(hashtext($8))
        ), locked AS (
          SELECT p.id FROM xty_parties p,guard WHERE p.id=$1 AND p.state = ANY($11::text[]) FOR UPDATE
        ), capacity AS (
          SELECT id FROM locked WHERE (SELECT COUNT(*) FROM xty_members WHERE party_id=$1 AND left_at IS NULL) < $7
            AND (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
              WHERE m.user_id IN ($8,$9) AND m.left_at IS NULL AND p.state = ANY($11::text[])) < $10
            AND (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
              WHERE m.user_id IN ($8,$9) AND m.left_at IS NULL AND m.role <> 'lead'
                AND p.state = ANY($11::text[])) < $12
        ), joined AS (
          INSERT INTO xty_members (party_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at)
          SELECT id,$2,$3,$4,$15,'member',$5,$6 FROM capacity RETURNING party_id
        ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
          SELECT party_id,'MEMBER_JOINED',$2,$14,$13::jsonb,$6 FROM joined RETURNING party_id`,
      [row.id, userId, alias, clean(body.avatar, 40) || 'orange_cat', authHash, now, PARTY_MAX,
        identity.ids[0], identity.ids[1], usage.maxTotal, ACTIVE_STATES, MAX_JOINED_ACTIVE,
        JSON.stringify({ alias }), partyDay(row, now), avatarColor]);
      if (!inserted[0]) {
        const count = await sql.query('SELECT COUNT(*)::int n FROM xty_members WHERE party_id=$1 AND left_at IS NULL', [row.id]);
        if (Number(count[0]?.n || 0) >= PARTY_MAX) return sendJson(res, { ok: false, error: 'FULL' }, 409);
        const latest = await capacityUsage(sql, identity.ids);
        if (latest.joined >= MAX_JOINED_ACTIVE) return sendJson(res, { ok: false, error: 'JOINED_PARTY_LIMIT' }, 409);
        return sendJson(res, { ok: false, error: 'ACTIVE_PARTY_LIMIT' }, 409);
      }
      await sql.query('UPDATE xty_parties SET updated_at=$1 WHERE id=$2', [now, row.id]);
      row.updated_at = now;
      return sendJson(res, { ...(await stateFor(sql, row, { user_id: userId })), token: memberToken }, 201);
    }

    const member = await memberFor(req, sql, row.id);
    if (method === 'GET' && parts.length === 2) {
      if (!member) {
        const count = await sql.query('SELECT COUNT(*)::int n FROM xty_members WHERE party_id=$1 AND left_at IS NULL', [row.id]);
        return sendJson(res, { ok: true, joined: false, party: { code: row.code, name: row.name, activity: row.activity || '', members: Number(count[0]?.n || 0) } });
      }
      return sendJson(res, await stateFor(sql, row, member));
    }
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    if (method === 'POST' && parts[2] === 'debug' && parts[3] === 'collection') {
      const debugCode = String(bodyOf(req).code || '').trim().toLowerCase();
      const at = new Date();
      if (debugCode === 'getallitem') {
        await sql.query(`INSERT INTO xty_card_ownership (user_id,card_id,acquired_from,acquired_at)
          SELECT $1,card_id,'debug:getallitem',$2 FROM UNNEST($3::text[]) AS cards(card_id)
          ON CONFLICT (user_id,card_id) DO NOTHING`, [member.user_id, at, REWARD_CARD_IDS]);
        return sendJson(res, { ok: true, code: debugCode, count: REWARD_CARD_IDS.length });
      }
      if (debugCode === 'discard') {
        await sql.query('DELETE FROM xty_card_rewards WHERE user_id=$1', [member.user_id]);
        await sql.query('DELETE FROM xty_card_ownership WHERE user_id=$1', [member.user_id]);
        return sendJson(res, { ok: true, code: debugCode, count: 0 });
      }
      return sendJson(res, { ok: false, error: 'INVALID_DEBUG_CODE' }, 400);
    }

    if (method === 'POST' && parts[2] === 'me') {
      if (!activeParty(row)) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      const body = bodyOf(req); const at = new Date();
      const alias = clean(body.alias, 24) || member.alias;
      const avatar = clean(body.avatar, 40) || member.avatar || 'orange_cat';
      const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor)
        ? body.avatarColor : (member.avatar_color || 'green');
      const aliasChanged = alias !== member.alias;
      const avatarChanged = avatar !== member.avatar || avatarColor !== member.avatar_color;
      if (aliasChanged || avatarChanged) {
        await sql.query(`WITH changed AS (
            UPDATE xty_members SET alias=$1,avatar=$2,avatar_color=$3
            WHERE party_id=$4 AND user_id=$5 AND left_at IS NULL RETURNING party_id
          ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
            SELECT party_id,$6,$5,$7,$8::jsonb,$9 FROM changed`, [
          alias, avatar, avatarColor, row.id, member.user_id,
          avatarChanged ? 'MEMBER_AVATAR_CHANGED' : 'MEMBER_ALIAS_CHANGED',
          partyDay(row, at), JSON.stringify({ alias, avatar, avatarColor }), at,
        ]);
      }
      return sendJson(res, await stateFor(sql, row, { ...member, alias, avatar, avatar_color: avatarColor }));
    }

    if (method === 'POST' && parts[2] === 'finish') {
      if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);
      if (!activeParty(row)) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      const mode = bodyOf(req).mode === 'dissolve' ? 'dissolve' : 'complete';
      const at = new Date();
      const gate = completionGate(row, at);
      if (mode === 'complete' && !gate.eligible) {
        return sendJson(res, {
          ok: false, error: 'QUEST_NOT_FINISHED', scheduledEndAt: gate.scheduledEndAt,
          day: gate.day, durationDays: gate.durationDays,
        }, 409);
      }
      const state = mode === 'dissolve' ? 'DISSOLVED' : 'COMPLETED';
      const eventType = mode === 'dissolve' ? 'PARTY_DISSOLVED' : 'PARTY_COMPLETED';
      const changed = await sql.query(`WITH party AS (
          UPDATE xty_parties SET state=$1,ended_at=$2,updated_at=$2,
            scheduled_end_at=COALESCE(scheduled_end_at,$8)
          WHERE id=$3 AND state = ANY($4::text[])
            AND ($9='dissolve' OR $2 >= COALESCE(scheduled_end_at,$8)) RETURNING id
        ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
          SELECT id,$5,$6,$7,'{}'::jsonb,$2 FROM party RETURNING party_id`, [
        state, at, row.id, ACTIVE_STATES, eventType, member.user_id, partyDay(row, at),
        gate.scheduledEndAt, mode,
      ]);
      if (!changed[0]) {
        return sendJson(res, { ok: false, error: mode === 'complete' ? 'QUEST_NOT_FINISHED' : 'PARTY_CLOSED' }, 409);
      }
      row.state = state; row.ended_at = at; row.updated_at = at; row.scheduled_end_at = gate.scheduledEndAt;
      if (mode === 'complete') {
        await issueCardRewardsForParty(sql, row, at);
        await applyProgressionForParty(sql, row, at);
      }
      return sendJson(res, await stateFor(sql, row, member));
    }

    if (method === 'POST' && parts[2] === 'reward' && parts[3] === 'reveal') {
      if (String(row.state || '').toUpperCase() !== 'COMPLETED') {
        return sendJson(res, { ok: false, error: 'REWARD_NOT_READY' }, 409);
      }
      const rewardId = clean(bodyOf(req).rewardId, 80);
      const rewards = await sql.query(`SELECT id,card_id,revealed_at FROM xty_card_rewards
        WHERE id=$1 AND party_id=$2 AND user_id=$3 LIMIT 1`, [rewardId, row.id, member.user_id]);
      const reward = rewards[0];
      if (!reward) return sendJson(res, { ok: false, error: 'REWARD_NOT_FOUND' }, 404);
      if (reward.card_id && !cardById(reward.card_id)) {
        return sendJson(res, { ok: false, error: 'REWARD_CARD_INVALID' }, 409);
      }
      if (!reward.revealed_at && reward.card_id) {
        const at = new Date(); const key = dayKey(at, row.timezone);
        const posted = await sql.query(`WITH claimed AS (
            UPDATE xty_card_rewards SET revealed_at=$1
            WHERE id=$2 AND party_id=$3 AND user_id=$4 AND revealed_at IS NULL
            RETURNING card_id
          ), next AS (
            UPDATE xty_parties SET head_seq=head_seq+1,updated_at=$1
            WHERE id=$3 AND EXISTS (SELECT 1 FROM claimed) RETURNING head_seq
          ) INSERT INTO xty_posts (party_id,seq,user_id,kind,body,sent_at,day_key,retracted)
            SELECT $3,next.head_seq,$4,'reward',claimed.card_id,$1,$5::date,FALSE
            FROM next,claimed RETURNING seq`, [at, rewardId, row.id, member.user_id, key]);
        if (posted[0]) row.head_seq = Number(posted[0].seq);
      }
      return sendJson(res, await stateFor(sql, row, member));
    }

    if (method === 'POST' && parts[2] === 'manage') {
      if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);
      if (!activeParty(row)) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      const body = bodyOf(req); const action = String(body.action || ''); const at = new Date();

      if (action === 'rename') {
        const name = clean(body.name, 40);
        if (!name) return sendJson(res, { ok: false, error: 'INVALID_PARTY' }, 400);
        if (name !== row.name) {
          const old = row.name;
          await sql.query(`WITH party AS (
              UPDATE xty_parties SET name=$1,updated_at=$2 WHERE id=$3 RETURNING id
            ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
              SELECT id,'PARTY_RENAMED',$4,$5,$6::jsonb,$2 FROM party`, [
            name, at, row.id, member.user_id, partyDay(row, at), JSON.stringify({ from: old, to: name }),
          ]);
          row.name = name; row.updated_at = at;
        }
        return sendJson(res, await stateFor(sql, row, member));
      }

      if (action === 'change_rule') {
        const rule = clean(body.commitRule, 120); const old = row.commit_rule || '';
        if (rule !== old) {
          await sql.query(`WITH party AS (
              UPDATE xty_parties SET commit_rule=$1,updated_at=$2 WHERE id=$3 RETURNING id
            ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
              SELECT id,'RULE_CHANGED',$4,$5,$6::jsonb,$2 FROM party`, [
            rule, at, row.id, member.user_id, partyDay(row, at), JSON.stringify({ from: old, to: rule }),
          ]);
          row.commit_rule = rule; row.updated_at = at;
        }
        return sendJson(res, await stateFor(sql, row, member));
      }

      if (action === 'change_lead_card' || action === 'change_cover') {
        const next = String(body.leadCardId || '');
        const requestedType = action === 'change_cover' ? String(body.coverType || 'card') : 'card';
        if (requestedType === 'card_back') {
          const old = row.lead_card_id || null;
          await sql.query(`WITH party AS (
              UPDATE xty_parties SET lead_card_id=NULL,cover_type='card_back',cover_value='notebook-rgbs-v1',updated_at=$1
              WHERE id=$2 RETURNING id
            ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
              SELECT id,'LEAD_CARD_CHANGED',$3,$4,$5::jsonb,$1 FROM party`, [
            at, row.id, member.user_id, partyDay(row, at), JSON.stringify({ from: old, to: 'card_back' }),
          ]);
          row.lead_card_id = null; row.cover_type = 'card_back'; row.cover_value = 'notebook-rgbs-v1'; row.updated_at = at;
          return sendJson(res, await stateFor(sql, row, member));
        }
        const nextCard = cardById(next);
        if (!validCardId(next) || !nextCard?.eligibility?.partyCover || next === row.npc_card_id) {
          return sendJson(res, { ok: false, error: 'CARD_NOT_COVER_ELIGIBLE' }, 400);
        }
        const occupied = await sql.query(`SELECT 1 FROM xty_parties WHERE owner_id=$1 AND code<>$2
          AND state = ANY($3::text[]) AND (lead_card_id=$4 OR npc_card_id=$4) LIMIT 1`, [row.owner_id, row.code, ACTIVE_STATES, next]);
        if (occupied[0]) return sendJson(res, { ok: false, error: 'CARD_IN_USE' }, 409);
        const old = row.lead_card_id || null;
        if (next !== old) {
          await sql.query(`WITH party AS (
              UPDATE xty_parties SET lead_card_id=$1,cover_type='card',cover_value=$1,updated_at=$2 WHERE id=$3 RETURNING id
            ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
              SELECT id,'LEAD_CARD_CHANGED',$4,$5,$6::jsonb,$2 FROM party`, [
            next, at, row.id, member.user_id, partyDay(row, at), JSON.stringify({ from: old, to: next }),
          ]);
          row.lead_card_id = next; row.cover_type = 'card'; row.cover_value = next; row.updated_at = at;
        }
        return sendJson(res, await stateFor(sql, row, member));
      }

      if (action === 'change_npc') {
        const nextCard = body.npcCardId ? String(body.npcCardId) : null;
        const nextPet = clean(body.petId, 40) || null;
        if (nextCard && (!validCardId(nextCard) || !cardById(nextCard)?.eligibility?.npc || nextCard === row.lead_card_id)) {
          return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 400);
        }
        if (nextCard) {
          const occupied = await sql.query(`SELECT 1 FROM xty_parties WHERE owner_id=$1 AND code<>$2
            AND state = ANY($3::text[]) AND (lead_card_id=$4 OR npc_card_id=$4) LIMIT 1`, [row.owner_id, row.code, ACTIVE_STATES, nextCard]);
          if (occupied[0]) return sendJson(res, { ok: false, error: 'CARD_IN_USE' }, 409);
        }
        const old = row.npc_card_id || row.pet_id || null;
        const next = nextCard || nextPet || null;
        if (next === old) return sendJson(res, await stateFor(sql, row, member));
        await sql.query(`WITH party AS (
            UPDATE xty_parties SET npc_card_id=$1,pet_id=$2,updated_at=$3 WHERE id=$4 RETURNING id
          ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
            SELECT id,'NPC_CHANGED',$5,$6,$7::jsonb,$3 FROM party`, [
          nextCard, nextCard ? null : nextPet, at, row.id, member.user_id, partyDay(row, at),
          JSON.stringify({ from: old, to: next }),
        ]);
        row.npc_card_id = nextCard; row.pet_id = nextCard ? null : nextPet; row.updated_at = at;
        return sendJson(res, await stateFor(sql, row, member));
      }

      if (action === 'kick') {
        const target = clean(body.userId, 120);
        const rows = await sql.query(`SELECT user_id,alias,role FROM xty_members
          WHERE party_id=$1 AND user_id=$2 AND left_at IS NULL`, [row.id, target]);
        const kicked = rows[0];
        if (!kicked) return sendJson(res, { ok: false, error: 'MEMBER_NOT_FOUND' }, 404);
        if (kicked.role === 'lead') return sendJson(res, { ok: false, error: 'CANNOT_KICK_LEAD' }, 409);
        await sql.query(`WITH member AS (
            UPDATE xty_members SET left_at=$1,removal_reason='KICKED',auth_hash=NULL
            WHERE party_id=$2 AND user_id=$3 AND left_at IS NULL RETURNING party_id
          ), party AS (
            UPDATE xty_parties SET updated_at=$1 WHERE id=$2 AND EXISTS (SELECT 1 FROM member) RETURNING id
          ) INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
            SELECT id,'MEMBER_KICKED',$5,$6,$4::jsonb,$1 FROM party`, [
          at, row.id, kicked.user_id, JSON.stringify({ alias: kicked.alias }), member.user_id, partyDay(row, at),
        ]);
        row.updated_at = at;
        return sendJson(res, await stateFor(sql, row, member));
      }

      return sendJson(res, { ok: false, error: 'BAD_ACTION' }, 400);
    }

    if (method === 'GET' && parts[2] === 'feed') {
      const since = Math.max(0, Number(req.query?.since || 0));
      return sendJson(res, await stateFor(sql, row, member, since));
    }
    if (method === 'POST' && parts[2] === 'commit') {
      if (!activeParty(row)) return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      const result = await appendPost(sql, row, member, 'commit', clean(bodyOf(req).note, 300) || '✓');
      if (result.error) return sendJson(res, { ok: false, error: result.error }, result.status);
      return sendJson(res, await stateFor(sql, row, member));
    }
    if (method === 'POST' && parts[2] === 'message') {
      const text = clean(bodyOf(req).body, 2000);
      if (!text) return sendJson(res, { ok: false, error: 'EMPTY' }, 400);
      const result = await appendPost(sql, row, member, 'message', text);
      if (result.error) return sendJson(res, { ok: false, error: result.error }, result.status);
      return sendJson(res, await stateFor(sql, row, member));
    }
    if (method === 'POST' && parts[2] === 'react') {
      if (!activeParty(row) && String(row.state || '').toUpperCase() !== 'COMPLETED') {
        return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      }
      const body = bodyOf(req); const seq = Number(body.seq); const emoji = String(body.emoji || '');
      if (!Number.isInteger(seq) || !REACTIONS.includes(emoji)) return sendJson(res, { ok: false, error: 'BAD_REACTION' }, 400);
      const post = await sql.query('SELECT 1 FROM xty_posts WHERE party_id=$1 AND seq=$2', [row.id, seq]);
      if (!post[0]) return sendJson(res, { ok: false, error: 'NO_POST' }, 404);
      const at = new Date();
      const removed = await sql.query(`DELETE FROM xty_reactions WHERE party_id=$1 AND seq=$2
        AND user_id=$3 AND emoji=$4 RETURNING emoji`, [row.id, seq, member.user_id, emoji]);
      if (!removed[0]) await sql.query(`INSERT INTO xty_reactions (party_id,seq,user_id,emoji,created_at)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [row.id, seq, member.user_id, emoji, at]);
      await sql.query('UPDATE xty_parties SET updated_at=$1 WHERE id=$2', [at, row.id]);
      row.updated_at = at;
      return sendJson(res, await stateFor(sql, row, member));
    }
    if (method === 'POST' && parts[2] === 'confirm') {
      const seq = Number(bodyOf(req).seq);
      if (!Number.isInteger(seq)) return sendJson(res, { ok: false, error: 'BAD_SEQ' }, 400);
      if (normalizeVerificationMode(row.verification_mode) !== 'confirm') {
        return sendJson(res, { ok: false, error: 'CONFIRM_NOT_REQUIRED' }, 409);
      }
      if (!activeParty(row) && String(row.state || '').toUpperCase() !== 'COMPLETED') {
        return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
      }
      const commit = await sql.query(`SELECT user_id,day_key,sent_at FROM xty_posts
        WHERE party_id=$1 AND seq=$2 AND kind='commit' AND retracted=FALSE`, [row.id, seq]);
      if (!commit[0]) return sendJson(res, { ok: false, error: 'NO_COMMIT' }, 404);
      if (commit[0].user_id === member.user_id) return sendJson(res, { ok: false, error: 'CANNOT_CONFIRM_SELF' }, 409);
      const at = new Date();
      const commitDayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(commit[0].day_key))
        ? String(commit[0].day_key)
        : partyDateKey(commit[0].day_key, row.timezone || XTY_TIMEZONE);
      const deadline = confirmDeadlineForDayKey(commitDayKey, row.timezone || XTY_TIMEZONE);
      if (!deadline || at.getTime() >= deadline.getTime()) {
        return sendJson(res, { ok: false, error: 'CONFIRM_WINDOW_CLOSED' }, 409);
      }
      const saved = await sql.query(`INSERT INTO xty_confirmations (party_id,commit_seq,confirmer_id,created_at)
        SELECT $1,p.seq,$2,$3 FROM xty_posts p
        WHERE p.party_id=$1 AND p.seq=$4 AND p.kind='commit' AND p.retracted=FALSE AND p.user_id<>$2
        ON CONFLICT (party_id,commit_seq) DO NOTHING RETURNING commit_seq`, [row.id, member.user_id, at, seq]);
      if (!saved[0]) {
        return sendJson(res, { ok: false, error: 'ALREADY_CONFIRMED' }, 409);
      }
      await sql.query('UPDATE xty_parties SET updated_at=$1 WHERE id=$2', [at, row.id]);
      row.updated_at = at;
      if (String(row.state || '').toUpperCase() === 'COMPLETED') await applyProgressionForParty(sql, row, at);
      return sendJson(res, await stateFor(sql, row, member));
    }
    if (method === 'POST' && parts[2] === 'retract') {
      const seq = Number(bodyOf(req).seq);
      if (!Number.isInteger(seq)) return sendJson(res, { ok: false, error: 'BAD_SEQ' }, 400);
      const saved = await sql.query(`UPDATE xty_posts SET body='',retracted=TRUE WHERE party_id=$1
        AND seq=$2 AND user_id=$3 AND kind='message' AND retracted=FALSE RETURNING seq`, [row.id, seq, member.user_id]);
      if (!saved[0]) return sendJson(res, { ok: false, error: 'NOT_YOURS' }, 403);
      return sendJson(res, await stateFor(sql, row, member));
    }
    return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
  } catch (error) {
    console.error('XTY API failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    if (sql) {
      const errorCode = /^[A-Z0-9_]{2,60}$/i.test(String(error?.code || '')) ? String(error.code) : 'XTY_API_ERROR';
      const endpoint = clean(new URL(req.url || '/', 'https://myclover.local').pathname, 160) || '/api/xty';
      await sql.query(`INSERT INTO xty_system_errors (error_code,endpoint,created_at)
        VALUES ($1,$2,$3)`, [errorCode, endpoint, new Date()]).catch(() => {});
    }
    return sendJson(res, { ok: false, error: 'XTY_API_ERROR' }, 500);
  }
}
