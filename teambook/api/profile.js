import { currentUser, database, ensureSchema, sameOrigin, sendJson } from './_lib/core.js';

const MAX_PROFILE_BYTES = 160000;
const MAX_PROFILE_IDS = 40;

function cleanProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_PROFILE_BYTES) return null;
  return JSON.parse(serialized);
}

function cleanProfileIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(item => String(item || ''))
    .filter(item => /^[a-z0-9_-]{6,80}$/i.test(item)))]
    .slice(-MAX_PROFILE_IDS);
}

export default async function handler(req, res) {
  try {
    const sql = database();
    await ensureSchema(sql);
    const user = await currentUser(req, sql);
    if (!user) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);

    const rows = await sql.query(
      'SELECT profile_json,profile_ids,version,updated_at FROM teambook_profile_state WHERE user_id=$1',
      [user.id],
    );
    const current = rows[0] || null;

    if (req.method === 'GET') {
      return sendJson(res, {
        ok: true,
        profile: current?.profile_json || null,
        profileIds: current?.profile_ids || [],
        version: Number(current?.version || 0),
        updatedAt: current?.updated_at || null,
      });
    }

    if (req.method === 'PUT') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      const profile = cleanProfile(req.body?.profile);
      if (!profile) return sendJson(res, { ok: false, error: 'PROFILE_INVALID' }, 400);
      const profileIds = cleanProfileIds([...(req.body?.profileIds || []), profile.id]);
      const baseVersion = Number(req.body?.baseVersion);
      const currentVersion = Number(current?.version || 0);
      if (Number.isFinite(baseVersion) && baseVersion !== currentVersion) {
        return sendJson(res, {
          ok: false,
          error: 'PROFILE_CONFLICT',
          profile: current?.profile_json || null,
          profileIds: current?.profile_ids || [],
          version: currentVersion,
        }, 409);
      }
      const version = currentVersion + 1;
      const now = new Date();
      await sql.query(`INSERT INTO teambook_profile_state
        (user_id,version,profile_json,profile_ids,updated_at)
        VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)
        ON CONFLICT(user_id) DO UPDATE SET
          version=EXCLUDED.version,
          profile_json=EXCLUDED.profile_json,
          profile_ids=EXCLUDED.profile_ids,
          updated_at=EXCLUDED.updated_at`,
      [user.id, version, JSON.stringify(profile), JSON.stringify(profileIds), now]);
      return sendJson(res, { ok: true, profile, profileIds, version, updatedAt: now.toISOString() });
    }

    return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  } catch (error) {
    console.error('TeamBook profile API failed', error);
    const code = error?.code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED'
      ? error.code
      : 'TEAMBOOK_PROFILE_API_ERROR';
    return sendJson(res, { ok: false, error: code }, code === 'TEAMBOOK_DATABASE_URL_NOT_CONFIGURED' ? 503 : 500);
  }
}
