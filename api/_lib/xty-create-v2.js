import { randomBytes, randomUUID } from 'node:crypto';
import {
  clean, currentUser, database, ensureSchema, sameOrigin, sendJson, sha256,
} from './core.js';
import {
  XTY_TIMEZONE, normalizeVerificationMode, scheduledEndAt,
} from './xty-rules.js';
import { cardById } from '../../xty/_shared/cards.js';

const ACTIVE_STATES = Object.freeze(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const BUDGETS = Object.freeze({ quiet: 1, normal: 3, social: 5 });
const DEFAULT_BUDGET = 'normal';
const CONTEXT_PRESETS = Object.freeze(['xircle', 'xircle_xvisor']);

function bodyOf(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function token() {
  return randomBytes(32).toString('base64url');
}

function inviteCode() {
  return [...randomBytes(5)].map(byte => String(byte % 10)).join('');
}

function localIdentity(body) {
  const value = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(value) ? `local:${value}` : '';
}

function quotaKeyFor(account, body) {
  if (account?.memberNo) return `member:${account.memberNo}`;
  if (account?.id) return `account-v2:${account.id}`;
  const profileId = clean(body?.profileId, 80);
  return /^[a-z0-9_-]{6,80}$/i.test(profileId) ? `local-v2:${profileId}` : '';
}

function progressionShape(row) {
  const level = Math.min(4, Math.max(1, Math.floor(Number(row?.level || 1)) || 1));
  const paidTier = ['plus', 'max'].includes(row?.paid_tier) ? row.paid_tier : 'free';
  const entitlement = paidTier === 'max' ? 3 : (paidTier === 'plus' ? 2 : 0);
  const unlocked = Math.min(entitlement, Math.max(0, Math.floor(Number(row?.unlocked_bonus_slots || 0)) || 0));
  return {
    level,
    paidTier,
    bonusSlotEntitlement: entitlement,
    unlockedBonusSlots: unlocked,
    effectiveCreateCapacity: level + unlocked,
  };
}

async function progressionFor(sql, ids) {
  const wanted = [...new Set(ids.filter(Boolean))];
  for (const userId of wanted) {
    await sql.query(`INSERT INTO xty_progression (user_id,level,paid_tier,unlocked_bonus_slots,updated_at)
      VALUES ($1,1,'free',0,$2) ON CONFLICT (user_id) DO NOTHING`, [userId, new Date()]);
  }
  if (!wanted.length) return progressionShape(null);
  const rows = await sql.query(`SELECT level,paid_tier,unlocked_bonus_slots FROM xty_progression
    WHERE user_id = ANY($1::text[])
    ORDER BY level DESC, unlocked_bonus_slots DESC LIMIT 1`, [wanted]);
  return progressionShape(rows[0]);
}

async function ensureQuotaV2(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS xty_party_quota_v2 (
    quota_key TEXT NOT NULL,
    party_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    PRIMARY KEY (quota_key, party_id, role)
  )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_xty_party_quota_v2_active
    ON xty_party_quota_v2(quota_key, role, released_at)`);
}

async function ownsCard(sql, ids, cardId) {
  if (!cardId) return true;
  const wanted = [...new Set(ids.filter(Boolean))];
  if (!wanted.length) return false;
  const rows = await sql.query(`SELECT 1 FROM xty_card_ownership
    WHERE user_id = ANY($1::text[]) AND card_id=$2 LIMIT 1`, [wanted, cardId]);
  return !!rows[0];
}

function snapshot({ row, member, event, scheduled }) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    activity: row.activity || '',
    activityId: row.activity_id || 'custom',
    preset: row.preset || 'casual',
    durationDays: Number(row.duration_days || 7),
    color: row.color || 'green',
    visibility: row.visibility || 'private',
    verificationMode: row.verification_mode || 'trust',
    commitRule: row.commit_rule || '',
    budget: row.budget || DEFAULT_BUDGET,
    petId: row.pet_id || null,
    leadCardId: row.lead_card_id || null,
    npcCardId: row.npc_card_id || null,
    coverType: row.cover_type || 'avatar',
    coverValue: row.cover_value || null,
    ownerId: row.owner_id,
    state: 'ACTIVE',
    timezone: row.timezone || XTY_TIMEZONE,
    startAt: new Date(row.started_at).toISOString(),
    scheduledEndAt: new Date(scheduled).toISOString(),
    endAt: null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    members: [member],
    memberHistory: [member],
    events: [event],
    rewardClaims: [],
    log: [],
    quotaSystem: 'v2',
  };
}

export async function handleCreatePartyV2(req, res) {
  try {
    if (String(req.method || '').toUpperCase() !== 'POST') {
      return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }
    if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);

    const body = bodyOf(req);
    const name = clean(body.name, 40);
    const alias = clean(body.alias, 24);
    if (!name || !alias) return sendJson(res, { ok: false, error: 'INVALID_PARTY' }, 400);

    const sql = database();
    await ensureSchema(sql);
    await ensureQuotaV2(sql);

    const account = await currentUser(req, sql);
    const localId = localIdentity(body);
    const accountId = account?.id ? `account:${account.id}` : '';
    const userId = accountId || localId;
    if (!userId) return sendJson(res, { ok: false, error: 'INVALID_PROFILE' }, 400);

    const identityIds = [...new Set([accountId, localId, userId].filter(Boolean))];
    const quotaKey = quotaKeyFor(account, body);
    if (!quotaKey) return sendJson(res, { ok: false, error: 'INVALID_PROFILE' }, 400);

    const progression = await progressionFor(sql, identityIds);
    const maxOwned = progression.effectiveCreateCapacity;

    const history = await sql.query(`SELECT COUNT(*)::int n FROM xty_party_quota_v2
      WHERE quota_key=$1 AND role='owner'`, [quotaKey]);
    const firstV2Party = Number(history[0]?.n || 0) === 0;

    const budget = BUDGETS[body.budget] ? body.budget : DEFAULT_BUDGET;
    const verificationMode = normalizeVerificationMode(body.verificationMode);
    const requestedPreset = clean(body.preset, 40);
    const preset = CONTEXT_PRESETS.includes(requestedPreset)
      ? requestedPreset
      : (verificationMode === 'confirm' ? 'verified' : 'casual');
    const durationDays = [7, 14, 28].includes(Number(body.durationDays)) ? Number(body.durationDays) : 7;
    const color = ['red', 'green', 'blue', 'silver'].includes(body.color) ? body.color : 'green';
    const visibility = ['public', 'private'].includes(body.visibility) ? body.visibility : 'private';
    const avatar = clean(body.avatar, 40) || 'orange_cat';
    const avatarColor = ['red', 'green', 'blue', 'silver'].includes(body.avatarColor) ? body.avatarColor : 'green';

    const requestedCover = String(body.coverType || '').toLowerCase();
    let coverType = firstV2Party ? 'avatar' : (['card_back', 'card'].includes(requestedCover) ? requestedCover : 'card_back');
    let leadCardId = coverType === 'card' ? String(body.leadCardId || '').toUpperCase() : null;
    const leadCard = leadCardId ? cardById(leadCardId) : null;
    if (coverType === 'card' && (!leadCard || !leadCard.eligibility?.partyCover)) {
      return sendJson(res, { ok: false, error: 'CARD_NOT_COVER_ELIGIBLE' }, 400);
    }
    if (leadCardId && !(await ownsCard(sql, identityIds, leadCardId))) {
      return sendJson(res, { ok: false, error: 'CARD_NOT_OWNED' }, 403);
    }
    if (coverType !== 'card') leadCardId = null;

    const npcCardId = String(body.npcCardId || '').toUpperCase() || null;
    const npcCard = npcCardId ? cardById(npcCardId) : null;
    if (npcCardId && (!npcCard || !npcCard.eligibility?.npc || npcCardId === leadCardId)) {
      return sendJson(res, { ok: false, error: 'INVALID_CARD_PLACEMENT' }, 400);
    }
    if (npcCardId && !(await ownsCard(sql, identityIds, npcCardId))) {
      return sendJson(res, { ok: false, error: 'CARD_NOT_OWNED' }, 403);
    }

    const petId = npcCardId ? null : (clean(body.petId, 40) || null);
    const at = new Date();
    const scheduled = scheduledEndAt(at, durationDays, XTY_TIMEZONE);
    const memberToken = token();
    const authHash = await sha256(memberToken);
    const partyId = randomUUID();
    const coverValue = coverType === 'avatar'
      ? JSON.stringify({ species: avatar, color: avatarColor })
      : (coverType === 'card' ? leadCardId : 'notebook-rgbs-v1');

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const code = inviteCode();
      try {
        const eventData = JSON.stringify({
          name, coverType, leadCardId, npcCardId, alias, verificationMode, quotaSystem: 'v2', quotaKey,
          origin: CONTEXT_PRESETS.includes(preset) ? 'xircle' : null,
          careMode: preset === 'xircle_xvisor' ? 'xvisor' : null,
          guideId: preset === 'xircle_xvisor' ? 'xvisor_white_cat_silver' : null,
        });
        const rows = await sql.query(`WITH guard AS (
            SELECT pg_advisory_xact_lock(hashtext($1))
          ), usage AS (
            SELECT COUNT(*)::int n FROM xty_party_quota_v2 q
            JOIN xty_parties p ON p.id=q.party_id
            WHERE q.quota_key=$1 AND q.role='owner' AND q.released_at IS NULL
              AND p.state = ANY($2::text[])
          ), capacity AS (
            SELECT 1 FROM guard,usage WHERE usage.n < $3
              AND ($20::text IS NULL OR NOT EXISTS (
                SELECT 1 FROM xty_party_quota_v2 q JOIN xty_parties p ON p.id=q.party_id
                WHERE q.quota_key=$1 AND q.role='owner' AND q.released_at IS NULL
                  AND p.state = ANY($2::text[]) AND (p.lead_card_id=$20 OR p.npc_card_id=$20)
              ))
              AND ($21::text IS NULL OR NOT EXISTS (
                SELECT 1 FROM xty_party_quota_v2 q JOIN xty_parties p ON p.id=q.party_id
                WHERE q.quota_key=$1 AND q.role='owner' AND q.released_at IS NULL
                  AND p.state = ANY($2::text[]) AND (p.lead_card_id=$21 OR p.npc_card_id=$21)
              ))
          ), party AS (
            INSERT INTO xty_parties (
              id,code,name,activity,commit_rule,budget,pet_id,owner_id,created_at,updated_at,
              activity_id,preset,duration_days,color,visibility,lead_card_id,npc_card_id,started_at,timezone,
              verification_mode,scheduled_end_at,cover_type,cover_value
            )
            SELECT $4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,$15,$16,$17,$20,$21,$12,$18,$19,$22,$23,$24
            FROM capacity RETURNING id
          ), member AS (
            INSERT INTO xty_members (party_id,user_id,alias,avatar,avatar_color,role,auth_hash,joined_at)
            SELECT id,$11,$25,$26,$27,'lead',$28,$12 FROM party RETURNING party_id
          ), quota AS (
            INSERT INTO xty_party_quota_v2 (quota_key,party_id,role,created_at)
            SELECT $1,party_id,'owner',$12 FROM member RETURNING party_id
          )
          INSERT INTO xty_party_events (party_id,type,actor_id,party_day,data_json,created_at)
          SELECT party_id,'PARTY_CREATED',$11,1,$29::jsonb,$12 FROM quota RETURNING party_id`, [
          quotaKey, ACTIVE_STATES, maxOwned,
          partyId, code, name, clean(body.activity, 60), clean(body.commitRule, 120), budget,
          petId, userId, at, clean(body.activityId, 40) || 'custom', preset, durationDays, color, visibility,
          XTY_TIMEZONE, verificationMode, leadCardId, npcCardId, scheduled, coverType, coverValue,
          alias, avatar, avatarColor, authHash, eventData,
        ]);

        if (!rows[0]) {
          return sendJson(res, {
            ok: false, error: 'OWNED_PARTY_LIMIT', quotaSystem: 'v2', quotaKey, maxOwned,
          }, 409);
        }

        const partyRows = await sql.query(`SELECT id,code,name,activity,activity_id,preset,duration_days,color,visibility,
          commit_rule,budget,pet_id,owner_id,created_at,updated_at,lead_card_id,npc_card_id,started_at,timezone,
          verification_mode,scheduled_end_at,cover_type,cover_value
          FROM xty_parties WHERE id=$1`, [partyId]);
        const row = partyRows[0];
        const member = {
          userId,
          alias,
          avatar,
          avatarColor,
          role: 'lead',
          joinedAt: at.toISOString(),
          leftAt: null,
          removalReason: null,
        };
        const event = {
          type: 'PARTY_CREATED',
          partyDay: 1,
          data: JSON.parse(eventData),
          at: at.toISOString(),
        };

        return sendJson(res, {
          ok: true,
          token: memberToken,
          meUserId: userId,
          quotaSystem: 'v2',
          quotaKey,
          meProgression: progression,
          party: snapshot({ row, member, event, scheduled }),
        }, 201);
      } catch (error) {
        if (error.code === '23505') continue;
        throw error;
      }
    }

    return sendJson(res, { ok: false, error: 'CODE_CAPACITY_REACHED' }, 503);
  } catch (error) {
    console.error('XTY v2 party creation failed', error);
    if (error.code === 'DATABASE_URL_NOT_CONFIGURED') {
      return sendJson(res, { ok: false, error: error.code }, 503);
    }
    return sendJson(res, { ok: false, error: 'XTY_API_ERROR' }, 500);
  }
}
