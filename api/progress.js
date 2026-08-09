import { currentUser, database, ensureSchema, sameOrigin, sendJson } from './_lib/core.js';

const MAX_KEYS = 180; const MAX_VALUE = 120000; const MAX_BODY = 800000;
const RESET_EPOCH_KEY = 'mc_awaken_reset_epoch';
const RESET_PERSISTENT_KEYS = new Set([RESET_EPOCH_KEY, 'mc_awaken_reset_count']);
function allowedKey(key) {
  if (typeof key !== 'string' || key.length > 100 || !(key.startsWith('mc_') || key.startsWith('mc-') || key.startsWith('c7:'))) return false;
  return !(key.startsWith('c7:match_') || key.startsWith('c7roomtoken:') || key === 'c7:current_match' || key === 'c7:install_id' || key === 'c7tab_pid' || key.startsWith('mc_account_') || key.startsWith('mc_collection_seen') || key === 'mc_email' || key === 'mc_name' || key === 'mc_nick' || key === 'mc_line' || key === 'mc_registered');
}
function safeProgress(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}; const result = {};
  for (const [key, raw] of Object.entries(source).slice(0, MAX_KEYS)) if (allowedKey(key) && typeof raw === 'string' && raw.length <= MAX_VALUE) result[key] = raw;
  return result;
}
function parseMaybe(value) { if (value && typeof value === 'object') return value; try { return JSON.parse(value); } catch { return null; } }
function unionStrings(a, b) { return [...new Set([...a, ...b].filter(value => typeof value === 'string'))]; }
function mergeObject(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return unionStrings(a, b);
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = { ...a }; for (const [key, value] of Object.entries(b)) {
      if (typeof value === 'number' && typeof out[key] === 'number') out[key] = Math.max(out[key], value);
      else if (typeof value === 'boolean' && typeof out[key] === 'boolean') out[key] = out[key] || value; else out[key] = value;
    } return out;
  } return b;
}
function mergeValue(key, cloud, incoming) {
  if (cloud === undefined) return incoming; if (incoming === undefined) return cloud; if (cloud === '1' || incoming === '1') return '1';
  if (key === 'mc_read' || key === 'mc_learn') return unionStrings(cloud.split(',').filter(Boolean), incoming.split(',').filter(Boolean)).join(',');
  const a = parseMaybe(cloud), b = parseMaybe(incoming); if (a !== null && b !== null) return JSON.stringify(mergeObject(a, b));
  const an = Number(cloud), bn = Number(incoming); if (Number.isFinite(an) && Number.isFinite(bn) && cloud !== '' && incoming !== '') return String(Math.max(an, bn));
  return incoming;
}
function dungeonKey(key) {
  return ((key.startsWith('mc_awaken_') && !RESET_PERSISTENT_KEYS.has(key)) ||
    key.startsWith('mc_ch7_') || key.startsWith('mc_nb_') || key === 'mc_secret_end');
}
function resetEpoch(progress) {
  const value = Number(progress?.[RESET_EPOCH_KEY] || 0);
  return Number.isFinite(value) ? value : 0;
}
function stripDungeon(progress) {
  const out = { ...progress };
  for (const key of Object.keys(out)) if (dungeonKey(key)) delete out[key];
  return out;
}
function mergeProgress(cloud, incoming) {
  let left = safeProgress(cloud), right = safeProgress(incoming);
  const cloudEpoch = resetEpoch(left), incomingEpoch = resetEpoch(right);

  /* A newer Reset Dungeon is a tombstone for the whole run. It must delete old
     Boss/Notebook state in the cloud instead of OR-merging flags such as
     mc_nb_restored back to 1. Older devices are also prevented from resurrecting
     a run that was reset elsewhere. */
  if (incomingEpoch > cloudEpoch) left = stripDungeon(left);
  else if (cloudEpoch > incomingEpoch) right = stripDungeon(right);

  const merged = { ...left };
  for (const key of Object.keys(right)) merged[key] = mergeValue(key, left[key], right[key]);
  return merged;
}

export default async function handler(req, res) {
  try {
    const sql = database(); await ensureSchema(sql); const user = await currentUser(req, sql);
    if (!user) return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
    if (req.method === 'GET') {
      const rows = await sql.query('SELECT progress_json,version,updated_at FROM mc_progress WHERE user_id=$1', [user.id]); const row = rows[0];
      return sendJson(res, { ok: true, progress: row ? safeProgress(parseMaybe(row.progress_json) || {}) : {}, version: row ? row.version : 0, updatedAt: row ? row.updated_at : null });
    }
    if (req.method === 'PUT') {
      if (!sameOrigin(req)) return sendJson(res, { ok: false, error: 'BAD_ORIGIN' }, 403);
      const serialized = JSON.stringify(req.body || {}); if (serialized.length > MAX_BODY) return sendJson(res, { ok: false, error: 'PROGRESS_TOO_LARGE' }, 413);
      const incoming = safeProgress(req.body?.progress); const rows = await sql.query('SELECT progress_json,version FROM mc_progress WHERE user_id=$1', [user.id]); const old = rows[0];
      const merged = mergeProgress(old ? parseMaybe(old.progress_json) || {} : {}, incoming); const version = Number(old?.version || 0) + 1; const now = new Date();
      await sql.query(`INSERT INTO mc_progress (user_id,version,progress_json,updated_at) VALUES ($1,$2,$3::jsonb,$4)
        ON CONFLICT(user_id) DO UPDATE SET version=EXCLUDED.version,progress_json=EXCLUDED.progress_json,updated_at=EXCLUDED.updated_at`, [user.id, version, JSON.stringify(merged), now]);
      return sendJson(res, { ok: true, progress: merged, version, updatedAt: now.toISOString() });
    }
    return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  } catch (error) {
    console.error('Progress API failed', error);
    const code = error.code === 'DATABASE_URL_NOT_CONFIGURED' ? error.code : 'PROGRESS_API_ERROR';
    return sendJson(res, { ok: false, error: code }, code === 'DATABASE_URL_NOT_CONFIGURED' ? 503 : 500);
  }
}
