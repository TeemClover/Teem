import { currentUser, database, ensureSchema, sameOrigin, sendJson, sha256 } from './core.js';

const TEST_MEMBER_NO = 'MY-2026-0003';
const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);

function codeOf(req) {
  const value = Array.isArray(req.query?.code) ? req.query.code[0] : req.query?.code;
  return /^\d{5}$/.test(String(value || '')) ? String(value) : '';
}

async function memberFor(req, sql, partyId, account) {
  if (account?.id) {
    const rows = await sql.query(`SELECT user_id,role FROM xty_members
      WHERE party_id=$1 AND user_id=$2 AND left_at IS NULL`, [partyId, `account:${account.id}`]);
    if (rows[0]) return rows[0];
  }
  const auth = String(req.headers?.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const rows = await sql.query(`SELECT user_id,role FROM xty_members
    WHERE party_id=$1 AND auth_hash=$2 AND left_at IS NULL`, [partyId, await sha256(token)]);
  return rows[0] || null;
}

async function ensureProgression(sql, userId, at) {
  await sql.query(`INSERT INTO xty_progression (user_id,level,paid_tier,unlocked_bonus_slots,updated_at)
    VALUES ($1,1,'free',0,$2) ON CONFLICT (user_id) DO NOTHING`, [userId, at]);
}

export async function handleDebugLevel2(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    const sql = database();
    await ensureSchema(sql);
    const account = await currentUser(req, sql);
    if (!account) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (String(account.memberNo || '').toUpperCase() !== TEST_MEMBER_NO) {
      return sendJson(res, { ok: false, error: 'DEBUG_FORBIDDEN' }, 403);
    }

    const code = codeOf(req);
    if (!code) return sendJson(res, { ok: false, error: 'INVALID_CODE' }, 400);
    const rows = await sql.query(`SELECT id,state FROM xty_parties WHERE code=$1`, [code]);
    const party = rows[0];
    if (!party) return sendJson(res, { ok: false, error: 'NOT_FOUND' }, 404);
    if (!ACTIVE_STATES.includes(String(party.state || '').toUpperCase())) {
      return sendJson(res, { ok: false, error: 'PARTY_CLOSED' }, 409);
    }

    const member = await memberFor(req, sql, party.id, account);
    if (!member) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (member.role !== 'lead') return sendJson(res, { ok: false, error: 'LEAD_REQUIRED' }, 403);

    const at = new Date();
    const accountUserId = `account:${account.id}`;
    const targets = [...new Set([member.user_id, accountUserId])];
    for (const userId of targets) await ensureProgression(sql, userId, at);

    const beforeRows = await sql.query(`SELECT level,paid_tier,unlocked_bonus_slots FROM xty_progression
      WHERE user_id=$1 LIMIT 1`, [member.user_id]);
    const before = Number(beforeRows[0]?.level || 1);

    /* Deliberately do NOT insert xty_level_events here. The active Quest must
       remain eligible to create its real LEAD_QUEST_COMPLETED event later.
       This only places the canonical progression at LV.2 for test setup. */
    if (before < 2) {
      await sql.query(`UPDATE xty_progression SET level=2,updated_at=$2
        WHERE user_id = ANY($1::text[]) AND level < 2`, [targets, at]);
    }

    const afterRows = await sql.query(`SELECT level,paid_tier,unlocked_bonus_slots FROM xty_progression
      WHERE user_id=$1 LIMIT 1`, [member.user_id]);
    const row = afterRows[0] || {};
    const level = Math.max(1, Math.min(4, Number(row.level || 1)));
    const paidTier = ['plus', 'max'].includes(row.paid_tier) ? row.paid_tier : 'free';
    const bonusSlotEntitlement = paidTier === 'max' ? 3 : (paidTier === 'plus' ? 2 : 0);
    const unlockedBonusSlots = Math.max(0, Math.min(bonusSlotEntitlement, Number(row.unlocked_bonus_slots || 0)));

    return sendJson(res, {
      ok: true,
      code: 'level2test',
      changed: before < 2,
      progression: {
        level,
        paidTier,
        bonusSlotEntitlement,
        unlockedBonusSlots,
        effectiveCreateCapacity: level + unlockedBonusSlots,
      },
    });
  } catch (error) {
    console.error('XTY level2 debug trigger failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'XTY_API_ERROR' }, 500);
  }
}
