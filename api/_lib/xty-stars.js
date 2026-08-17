import { randomUUID } from 'node:crypto';
import { currentUser, database, ensureSchema, sameOrigin, sendJson, sha256 } from './core.js';
import { partyDateKey } from './xty-rules.js';
import { XTY_CARDS } from '../../xty/_shared/cards.js';

function bodyOf(req) { return req.body && typeof req.body === 'object' ? req.body : {}; }
function cleanCode(value) { const code = String(value || '').trim(); return /^\d{5}$/.test(code) ? code : ''; }
function seededIndex(value, length) {
  let hash = 2166136261;
  for (const char of String(value)) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return length ? (hash >>> 0) % length : 0;
}

async function ensureStarSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS xty_star_rewards (
    id TEXT PRIMARY KEY,
    party_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    milestone INTEGER NOT NULL,
    confirmed_count INTEGER NOT NULL,
    card_id TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    revealed_at TIMESTAMPTZ,
    UNIQUE (party_id,user_id,milestone)
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_xty_star_rewards_party
    ON xty_star_rewards(party_id,user_id,milestone)`);
}

async function memberFor(req, sql, partyId) {
  const account = await currentUser(req, sql);
  if (account) {
    const rows = await sql.query(`SELECT user_id,alias,role FROM xty_members
      WHERE party_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,alias,role FROM xty_members
    WHERE party_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

async function partyFor(sql, code) {
  const rows = await sql.query(`SELECT id,code,state,verification_mode,timezone,created_at,started_at,head_seq
    FROM xty_parties WHERE code=$1`, [code]);
  return rows[0] || null;
}

async function confirmedCounts(sql, partyId) {
  return sql.query(`SELECT m.user_id,m.alias,
      COUNT(c.commit_seq)::int AS confirmed_count
    FROM xty_members m
    LEFT JOIN xty_posts p ON p.party_id=m.party_id AND p.user_id=m.user_id
      AND p.kind='commit' AND p.retracted=FALSE
    LEFT JOIN xty_confirmations c ON c.party_id=p.party_id AND c.commit_seq=p.seq
    WHERE m.party_id=$1
    GROUP BY m.user_id,m.alias,m.joined_at
    ORDER BY m.joined_at`, [partyId]);
}

async function ensureRewards(sql, party, counts) {
  if (String(party.verification_mode || 'trust') !== 'confirm') return;
  const pool = XTY_CARDS.filter(card => card.eligibility?.reward);
  const now = new Date();
  for (const row of counts) {
    const userId = row.user_id;
    const completedMilestones = Math.floor(Number(row.confirmed_count || 0) / 3);
    if (!completedMilestones) continue;
    const ownedRows = await sql.query(`SELECT card_id FROM xty_card_ownership WHERE user_id=$1`, [userId]);
    const owned = new Set(ownedRows.map(item => item.card_id));
    for (let milestone = 1; milestone <= completedMilestones; milestone += 1) {
      const existing = await sql.query(`SELECT id FROM xty_star_rewards
        WHERE party_id=$1 AND user_id=$2 AND milestone=$3`, [party.id, userId, milestone]);
      if (existing[0]) continue;
      const available = pool.filter(card => !owned.has(card.cardId));
      const card = available.length
        ? available[seededIndex(`${party.id}|${userId}|${milestone}|${owned.size}`, available.length)]
        : null;
      const rewardId = `star_${randomUUID()}`;
      const inserted = await sql.query(`INSERT INTO xty_star_rewards
        (id,party_id,user_id,milestone,confirmed_count,card_id,created_at,revealed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NULL)
        ON CONFLICT (party_id,user_id,milestone) DO NOTHING RETURNING id`, [
        rewardId, party.id, userId, milestone, milestone * 3, card?.cardId || null, now,
      ]);
      if (!inserted[0]) continue;
      if (card) {
        owned.add(card.cardId);
        await sql.query(`INSERT INTO xty_card_ownership (user_id,card_id,acquired_from,acquired_at)
          VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,card_id) DO NOTHING`, [
          userId, card.cardId, `stars:${party.code}:${milestone}`, now,
        ]);
      }
      await sql.query(`INSERT INTO xty_party_events
        (party_id,type,actor_id,party_day,data_json,created_at)
        VALUES ($1,'CARD_DROP_EARNED',$2,1,$3::jsonb,$4)`, [
        party.id, userId, JSON.stringify({ rewardId, milestone, confirmedCount: milestone * 3 }), now,
      ]).catch(() => {});
    }
  }
}

async function starState(sql, party, member) {
  const counts = await confirmedCounts(sql, party.id);
  await ensureRewards(sql, party, counts);
  const rewards = await sql.query(`SELECT r.id,r.user_id,r.milestone,r.confirmed_count,r.card_id,r.created_at,r.revealed_at,m.alias
    FROM xty_star_rewards r
    LEFT JOIN xty_members m ON m.party_id=r.party_id AND m.user_id=r.user_id
    WHERE r.party_id=$1 ORDER BY r.created_at,r.milestone`, [party.id]);
  const byUser = new Map();
  for (const reward of rewards) {
    const list = byUser.get(reward.user_id) || [];
    list.push(reward); byUser.set(reward.user_id, list);
  }
  return {
    ok: true,
    enabled: String(party.verification_mode || 'trust') === 'confirm',
    /* Which row is the caller's. The client cannot work this out reliably —
       the local id changes once an account binds — so it is answered here. */
    meUserId: member.user_id,
    members: counts.map(row => {
      const confirmedCount = Number(row.confirmed_count || 0);
      const drops = byUser.get(row.user_id) || [];
      return {
        userId: row.user_id,
        alias: row.alias || 'สมาชิก',
        confirmedCount,
        stars: confirmedCount % 3,
        dropCount: Math.floor(confirmedCount / 3),
        pendingDrops: drops.filter(item => !item.revealed_at && item.card_id).length,
      };
    }),
    myRewards: rewards.filter(row => row.user_id === member.user_id).map(row => ({
      rewardId: row.id,
      milestone: Number(row.milestone),
      confirmedCount: Number(row.confirmed_count),
      cardId: row.card_id || null,
      complete: !row.card_id,
      earnedAt: new Date(row.created_at).toISOString(),
      revealedAt: row.revealed_at ? new Date(row.revealed_at).toISOString() : null,
    })),
  };
}

async function revealReward(sql, party, member, rewardId) {
  const rows = await sql.query(`SELECT id,card_id,revealed_at,milestone FROM xty_star_rewards
    WHERE id=$1 AND party_id=$2 AND user_id=$3 LIMIT 1`, [rewardId, party.id, member.user_id]);
  const reward = rows[0];
  if (!reward) return { error: 'REWARD_NOT_FOUND', status: 404 };
  if (reward.revealed_at || !reward.card_id) return { ok: true, reward };
  const at = new Date();
  const key = partyDateKey(at, party.timezone || 'Asia/Bangkok');
  const posted = await sql.query(`WITH claimed AS (
      UPDATE xty_star_rewards SET revealed_at=$1
      WHERE id=$2 AND party_id=$3 AND user_id=$4 AND revealed_at IS NULL
      RETURNING card_id
    ), next AS (
      UPDATE xty_parties SET head_seq=head_seq+1,updated_at=$1
      WHERE id=$3 AND EXISTS (SELECT 1 FROM claimed) RETURNING head_seq
    )
    INSERT INTO xty_posts (party_id,seq,user_id,kind,body,sent_at,day_key,retracted)
    SELECT $3,next.head_seq,$4,'reward',claimed.card_id,$1,$5::date,FALSE
    FROM next,claimed RETURNING seq`, [at, rewardId, party.id, member.user_id, key]);
  return { ok: true, revealed: true, seq: posted[0]?.seq || null, cardId: reward.card_id, milestone: Number(reward.milestone) };
}

export async function handleXtyStars(req, res) {
  let sql;
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
    const body = bodyOf(req);
    const code = cleanCode(body.code);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    sql = database(); await ensureSchema(sql); await ensureStarSchema(sql);
    const party = await partyFor(sql, code);
    if (!party) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    const member = await memberFor(req, sql, party.id);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    if (body.action === 'reveal') {
      const result = await revealReward(sql, party, member, String(body.rewardId || '').slice(0, 100));
      if (result.error) return sendJson(res, { ok: false, error: result.error }, result.status || 400);
      return sendJson(res, result);
    }
    return sendJson(res, await starState(sql, party, member));
  } catch (error) {
    console.error('XTY star rewards failed', error);
    if (error?.code === 'DATABASE_URL_NOT_CONFIGURED') return sendJson(res, { ok: false, error: error.code }, 503);
    return sendJson(res, { ok: false, error: 'XTY_STAR_ERROR' }, 500);
  }
}

export default handleXtyStars;
