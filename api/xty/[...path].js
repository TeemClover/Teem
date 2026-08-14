import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from '../_lib/core.js';
import { randomBytes, randomUUID } from 'node:crypto';

const PARTY_MAX = 5;
const BUDGETS = Object.freeze({ quiet: 1, normal: 3, social: 5 });
const DEFAULT_BUDGET = 'normal';
const REACTIONS = Object.freeze(['❤️', '🔥', '👏', '😂', '🫡', '💪', '👀', '🍀']);
const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
/* TODO(config): move this to party-level time-zone settings when that
   open product decision is locked. V1 launches in ICT. */
const DAY_OFFSET_MINUTES = 7 * 60;

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
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let raw = '';
  for (const byte of bytes) raw += alphabet[byte % alphabet.length];
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}
function validCode(value) { return /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/.test(String(value || '').toUpperCase()); }
function dayKey(date = new Date()) {
  return new Date(date.getTime() + DAY_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}

async function partyByCode(sql, value) {
  const rows = await sql.query(`SELECT id,code,name,activity,commit_rule,budget,pet_id,owner_id,
    state,created_at,updated_at,head_seq,pet_last_wake FROM xty_parties WHERE code=$1`, [value]);
  return rows[0] || null;
}

function localIdentity(body) {
  const value = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(value) ? `local:${value}` : '';
}

function requestedHandSize(body) {
  const value = Math.floor(Number(body?.handSize || 1));
  return Number.isFinite(value) ? Math.max(1, Math.min(50, value)) : 1;
}

function parseMaybe(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

async function handSizeFor(sql, account, body) {
  if (!account) return requestedHandSize(body);
  const rows = await sql.query('SELECT progress_json FROM mc_progress WHERE user_id=$1', [account.id]);
  const progress = parseMaybe(rows[0]?.progress_json) || {};
  const profile = parseMaybe(progress.mc_xty_profile);
  if (!profile) return requestedHandSize(body);
  const value = Math.floor(Number(profile.handSize || profile.maxProfileCardSlots || 1));
  return Number.isFinite(value) ? Math.max(1, Math.min(50, value)) : 1;
}

async function identityFor(req, sql, body) {
  const account = await currentUser(req, sql);
  const accountId = account ? `account:${account.id}` : '';
  const localId = localIdentity(body);
  const primary = accountId || localId || `u_${randomUUID()}`;
  return {
    account,
    primary,
    ids: [accountId || primary, localId || accountId || primary],
  };
}

async function capacityUsage(sql, ids) {
  const rows = await sql.query(`SELECT
      COUNT(DISTINCT p.id) FILTER (WHERE p.owner_id IN ($1,$2))::int owned,
      COUNT(DISTINCT p.id) FILTER (WHERE m.role <> 'lead')::int joined,
      COUNT(DISTINCT p.id)::int total
    FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
    WHERE m.user_id IN ($1,$2) AND p.state = ANY($3::text[])`, [ids[0], ids[1], ACTIVE_STATES]);
  return {
    owned: Number(rows[0]?.owned || 0),
    joined: Number(rows[0]?.joined || 0),
    total: Number(rows[0]?.total || 0),
  };
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,avatar,role FROM xty_members
      WHERE party_id=$1 AND user_id=$2`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || '');
  const value = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!value) return null;
  const rows = await sql.query(`SELECT user_id,alias,avatar,role FROM xty_members
    WHERE party_id=$1 AND auth_hash=$2`, [partyId, await sha256(value)]);
  return rows[0] || null;
}

async function membersOf(sql, partyId) {
  const rows = await sql.query(`SELECT user_id,alias,avatar,role,joined_at FROM xty_members
    WHERE party_id=$1 ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END, joined_at`, [partyId]);
  return rows.map(row => ({ userId: row.user_id, alias: row.alias, avatar: row.avatar || '🍀', role: row.role, joinedAt: row.joined_at }));
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
    petId: row.pet_id || null, wakeHour: row.wake_hour == null ? null : Number(row.wake_hour), reactions: {},
  }));
  if (!posts.length) return posts;
  const reactions = await sql.query(`SELECT seq,user_id,emoji FROM xty_reactions
    WHERE party_id=$1 AND seq>$2 ORDER BY seq`, [partyId, since]);
  const bySeq = new Map(posts.map(post => [post.seq, post]));
  for (const row of reactions) {
    const post = bySeq.get(Number(row.seq));
    if (post) (post.reactions[row.emoji] ||= []).push(row.user_id);
  }
  return posts;
}

function shape(row, members, posts) {
  return {
    id: row.id, code: row.code, name: row.name, activity: row.activity || '',
    commitRule: row.commit_rule || '', budget: BUDGETS[row.budget] ? row.budget : DEFAULT_BUDGET,
    petId: row.pet_id || null, ownerId: row.owner_id, state: row.state || 'ACTIVE',
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
    members, log: posts,
  };
}

async function stateFor(sql, row, member, since = 0) {
  const [members, posts, counts] = await Promise.all([
    membersOf(sql, row.id), postsOf(sql, row.id, since),
    sql.query(`SELECT
      COUNT(DISTINCT CASE WHEN kind='commit' AND retracted=FALSE THEN user_id END)::int committed,
      COUNT(*)::int updates,
      COUNT(*) FILTER (WHERE kind='message' AND user_id=$2)::int messages_used
      FROM xty_posts WHERE party_id=$1 AND day_key=$3::date`, [row.id, member?.user_id || '', dayKey()]),
  ]);
  const count = counts[0] || {};
  const limit = BUDGETS[row.budget] || BUDGETS[DEFAULT_BUDGET];
  return {
    ok: true, head: Number(row.head_seq || 0), meUserId: member?.user_id || null,
    today: { committed: Number(count.committed || 0), members: members.length, updates: Number(count.updates || 0) },
    budgetLeft: member ? Math.max(0, limit - Number(count.messages_used || 0)) : null,
    party: shape(row, members, posts),
  };
}

async function appendPost(sql, row, member, kind, text) {
  const now = new Date(); const key = dayKey(now);
  if (kind === 'message') {
    const limit = BUDGETS[row.budget] || BUDGETS[DEFAULT_BUDGET];
    const rows = await sql.query(`WITH locked AS (
        SELECT id FROM xty_parties WHERE id=$1 FOR UPDATE
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
    [row.id, member.user_id, key, limit, now, text]);
    if (!rows[0]) return { error: 'NO_BUDGET', status: 409 };
    row.head_seq = Number(rows[0].seq); return { seq: row.head_seq };
  }

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

export default async function handler(req, res) {
  try {
    const sql = database(); await ensureSchema(sql);
    const method = req.method.toUpperCase();
    if (method !== 'GET' && !sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const parts = routeParts(req);
    if (parts[0] !== 'party') return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);

    if (method === 'POST' && parts.length === 1) {
      const body = bodyOf(req); const name = clean(body.name, 40); const alias = clean(body.alias, 24);
      if (!name || !alias) return sendJson(res, { ok: false, error: 'INVALID_PARTY' }, 400);
      const identity = await identityFor(req, sql, body);
      const userId = identity.primary;
      const handSize = await handSizeFor(sql, identity.account, body);
      const usage = await capacityUsage(sql, identity.ids);
      if (usage.owned >= handSize) return sendJson(res, { ok: false, error: 'OWNED_PARTY_LIMIT' }, 409);
      if (usage.total >= handSize + 1) return sendJson(res, { ok: false, error: 'ACTIVE_PARTY_LIMIT' }, 409);
      const memberToken = token(); const now = new Date(); const partyId = randomUUID();
      const budget = BUDGETS[body.budget] ? body.budget : DEFAULT_BUDGET;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const inviteCode = code();
        try {
          const inserted = await sql.query(`WITH guard AS (
            SELECT pg_advisory_xact_lock(hashtext($13))
          ), capacity AS (
            SELECT 1 FROM guard WHERE
              (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
                WHERE m.user_id IN ($13,$14) AND p.state = ANY($16::text[])) < $15 + 1
              AND (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
                WHERE m.user_id IN ($13,$14) AND p.owner_id IN ($13,$14)
                  AND p.state = ANY($16::text[])) < $15
          ), party AS (
            INSERT INTO xty_parties (id,code,name,activity,commit_rule,budget,pet_id,owner_id,created_at,updated_at)
            SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$9 FROM capacity RETURNING id
          ) INSERT INTO xty_members (party_id,user_id,alias,avatar,role,auth_hash,joined_at)
            SELECT id,$8,$10,$11,'lead',$12,$9 FROM party RETURNING party_id`, [
            partyId, inviteCode, name, clean(body.activity, 60), clean(body.commitRule, 120),
            budget, clean(body.petId, 40) || null, userId, now, alias,
            clean(body.avatar, 24) || '🍀', await sha256(memberToken),
            identity.ids[0], identity.ids[1], handSize, ACTIVE_STATES,
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
      const identity = await identityFor(req, sql, body);
      let existingMember = await memberFor(req, sql, row.id);
      if (!existingMember && identity.ids[1]) {
        const sameLocal = await sql.query(`SELECT user_id,alias,avatar,role FROM xty_members
          WHERE party_id=$1 AND user_id=$2`, [row.id, identity.ids[1]]);
        existingMember = sameLocal[0] || null;
      }
      if (existingMember) {
        const memberToken = token();
        await sql.query(`UPDATE xty_members SET alias=$1,avatar=$2,auth_hash=$3
          WHERE party_id=$4 AND user_id=$5`, [
          alias, clean(body.avatar, 24) || '🍀', await sha256(memberToken), row.id, existingMember.user_id,
        ]);
        return sendJson(res, {
          ...(await stateFor(sql, row, { ...existingMember, alias })), token: memberToken,
        });
      }
      const handSize = await handSizeFor(sql, identity.account, body);
      const usage = await capacityUsage(sql, identity.ids);
      if (usage.joined >= handSize) return sendJson(res, { ok: false, error: 'JOINED_PARTY_LIMIT' }, 409);
      if (usage.total >= handSize + 1) return sendJson(res, { ok: false, error: 'ACTIVE_PARTY_LIMIT' }, 409);
      const userId = identity.primary;
      const memberToken = token(); const authHash = await sha256(memberToken); const now = new Date();
      const inserted = await sql.query(`WITH guard AS (
          SELECT pg_advisory_xact_lock(hashtext($8))
        ), locked AS (
          SELECT p.id FROM xty_parties p,guard WHERE p.id=$1 FOR UPDATE
        ), capacity AS (
          SELECT id FROM locked WHERE (SELECT COUNT(*) FROM xty_members WHERE party_id=$1) < $7
            AND (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
              WHERE m.user_id IN ($8,$9) AND p.state = ANY($11::text[])) < $10 + 1
            AND (SELECT COUNT(DISTINCT p.id) FROM xty_members m JOIN xty_parties p ON p.id=m.party_id
              WHERE m.user_id IN ($8,$9) AND m.role <> 'lead'
                AND p.state = ANY($11::text[])) < $10
        ) INSERT INTO xty_members (party_id,user_id,alias,avatar,role,auth_hash,joined_at)
          SELECT id,$2,$3,$4,'member',$5,$6 FROM capacity RETURNING user_id`,
      [row.id, userId, alias, clean(body.avatar, 24) || '🍀', authHash, now, PARTY_MAX,
        identity.ids[0], identity.ids[1], handSize, ACTIVE_STATES]);
      if (!inserted[0]) {
        const count = await sql.query('SELECT COUNT(*)::int n FROM xty_members WHERE party_id=$1', [row.id]);
        if (Number(count[0]?.n || 0) >= PARTY_MAX) return sendJson(res, { ok: false, error: 'FULL' }, 409);
        const latest = await capacityUsage(sql, identity.ids);
        if (latest.joined >= handSize) return sendJson(res, { ok: false, error: 'JOINED_PARTY_LIMIT' }, 409);
        return sendJson(res, { ok: false, error: 'ACTIVE_PARTY_LIMIT' }, 409);
      }
      await sql.query('UPDATE xty_parties SET updated_at=$1 WHERE id=$2', [now, row.id]);
      return sendJson(res, { ...(await stateFor(sql, row, { user_id: userId })), token: memberToken }, 201);
    }

    const member = await memberFor(req, sql, row.id);
    if (method === 'GET' && parts.length === 2) {
      if (!member) {
        const count = await sql.query('SELECT COUNT(*)::int n FROM xty_members WHERE party_id=$1', [row.id]);
        return sendJson(res, { ok: true, joined: false, party: { code: row.code, name: row.name, activity: row.activity || '', members: Number(count[0]?.n || 0) } });
      }
      return sendJson(res, await stateFor(sql, row, member));
    }
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    if (method === 'GET' && parts[2] === 'feed') {
      const since = Math.max(0, Number(req.query?.since || 0));
      return sendJson(res, await stateFor(sql, row, member, since));
    }
    if (method === 'POST' && parts[2] === 'commit') {
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
      const body = bodyOf(req); const seq = Number(body.seq); const emoji = String(body.emoji || '');
      if (!Number.isInteger(seq) || !REACTIONS.includes(emoji)) return sendJson(res, { ok: false, error: 'BAD_REACTION' }, 400);
      const post = await sql.query('SELECT 1 FROM xty_posts WHERE party_id=$1 AND seq=$2', [row.id, seq]);
      if (!post[0]) return sendJson(res, { ok: false, error: 'NO_POST' }, 404);
      const removed = await sql.query(`DELETE FROM xty_reactions WHERE party_id=$1 AND seq=$2
        AND user_id=$3 AND emoji=$4 RETURNING emoji`, [row.id, seq, member.user_id, emoji]);
      if (!removed[0]) await sql.query(`INSERT INTO xty_reactions (party_id,seq,user_id,emoji)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [row.id, seq, member.user_id, emoji]);
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
    return sendJson(res, { ok: false, error: 'XTY_API_ERROR' }, 500);
  }
}
