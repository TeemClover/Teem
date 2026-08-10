import { currentUser, ensureAccountSchema, json, sameOrigin } from '../_lib/account.js';

const MAX_KEYS = 180;
const MAX_VALUE = 120000;
const MAX_BODY = 800000;

function allowedKey(key) {
  if (typeof key !== 'string' || key.length > 100) return false;
  if (!(key.startsWith('mc_') || key.startsWith('mc-') || key.startsWith('c7:'))) return false;
  return !(
    key.startsWith('c7:match_') || key.startsWith('c7roomtoken:') ||
    key === 'c7:current_match' || key === 'c7:install_id' || key === 'c7tab_pid' ||
    key.startsWith('mc_account_') || key.startsWith('mc_collection_seen') ||
    key === 'mc_email' || key === 'mc_name' || key === 'mc_nick' || key === 'mc_line' ||
    key === 'mc_registered'
  );
}

function safeProgress(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};
  for (const [key, raw] of Object.entries(source).slice(0, MAX_KEYS)) {
    if (!allowedKey(key) || typeof raw !== 'string' || raw.length > MAX_VALUE) continue;
    result[key] = raw;
  }
  return result;
}

function parseMaybe(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function unionStrings(a, b) {
  return [...new Set([...a, ...b].filter(value => typeof value === 'string'))];
}

function mergeObject(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return unionStrings(a, b);
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = { ...a };
    for (const [key, value] of Object.entries(b)) {
      if (typeof value === 'number' && typeof out[key] === 'number') out[key] = Math.max(out[key], value);
      else if (typeof value === 'boolean' && typeof out[key] === 'boolean') out[key] = out[key] || value;
      else out[key] = value;
    }
    return out;
  }
  return b;
}

function mergeValue(key, cloud, incoming) {
  if (cloud === undefined) return incoming;
  if (incoming === undefined) return cloud;
  if (cloud === '1' || incoming === '1') return '1';
  if (key === 'mc_read' || key === 'mc_learn') {
    return unionStrings(cloud.split(',').filter(Boolean), incoming.split(',').filter(Boolean)).join(',');
  }
  const a = parseMaybe(cloud), b = parseMaybe(incoming);
  if (a !== null && b !== null) return JSON.stringify(mergeObject(a, b));
  const an = Number(cloud), bn = Number(incoming);
  if (Number.isFinite(an) && Number.isFinite(bn) && cloud !== '' && incoming !== '') return String(Math.max(an, bn));
  return incoming;
}

const DUNGEON_SYNC_KEEP = new Set([
  'mc_awaken_reset_epoch','mc_awaken_reset_pending','mc_awaken_reset_count','mc_awaken_current_run_epoch',
  'mc_mini_achievements_v1','mc_dungeon_cleared_v1','mc_dungeon_awakened_v1',
  'mc_nb_seen_ever_v1','mc_nb_restored_ever_v1','mc_secret_end_ever_v1','mc_titles'
]);
function dungeonRunProgressKey(key) {
  if (!key || DUNGEON_SYNC_KEEP.has(key)) return false;
  return key === 'mc_dungeon_state_v2' || key === 'mc_secret_end' ||
    key === 'mc_dungeon_reset_requested' || key === 'mc_dungeon_reset_v1' ||
    key === 'mc_platinum_trophy' || key.startsWith('mc_nb_') ||
    key.startsWith('mc_ch7_') || key.startsWith('mc_awaken_');
}
function progressEpoch(progress) {
  const n = Number(progress && progress.mc_awaken_reset_epoch || 0);
  return Number.isFinite(n) ? n : 0;
}
export function mergeProgress(cloud, incoming) {
  const left = safeProgress(cloud), right = safeProgress(incoming), merged = { ...left };
  const cloudEpoch = progressEpoch(left), incomingEpoch = progressEpoch(right);
  if (incomingEpoch > cloudEpoch) {
    for (const key of Object.keys(merged)) if (dungeonRunProgressKey(key)) delete merged[key];
  }
  for (const key of Object.keys(right)) {
    if (dungeonRunProgressKey(key) && cloudEpoch > incomingEpoch) continue;
    merged[key] = mergeValue(key, left[key], right[key]);
  }
  return merged;
}

/* Current-run Dungeon state is intentionally resettable. Achievement/ever markers are
   kept so replaying the Dungeon never erases things the player has already earned. */
const DUNGEON_RESET_KEEP = new Set([
  'mc_mini_achievements_v1','mc_dungeon_cleared_v1','mc_dungeon_awakened_v1',
  'mc_nb_seen_ever_v1','mc_nb_restored_ever_v1','mc_secret_end_ever_v1',
  'mc_titles','mc_dungeon_reset_count','mc_awaken_reset_count','mc_awaken_reset_epoch'
]);
function shouldClearDungeonKey(key) {
  if (!key || DUNGEON_RESET_KEEP.has(key)) return false;
  return key === 'mc_dungeon_state_v2' || key === 'mc_secret_end' ||
    key === 'mc_dungeon_reset_requested' || key === 'mc_dungeon_reset_v1' ||
    key === 'mc_platinum_trophy' || key.startsWith('mc_nb_') ||
    key.startsWith('mc_ch7_') || key.startsWith('mc_awaken_');
}
function resetDungeonCloud(progress) {
  const clean = safeProgress(progress);
  for (const key of Object.keys(clean)) if (shouldClearDungeonKey(key)) delete clean[key];
  return clean;
}

export async function onRequest({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'ACCOUNT_DB_NOT_CONFIGURED' }, 503);
  await ensureAccountSchema(env.DB);
  const user = await currentUser(request, env.DB);
  if (!user) return json({ ok: false, error: 'AUTH_REQUIRED' }, 401);

  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT progress_json, version, updated_at FROM mc_progress WHERE user_id = ?1')
      .bind(user.id).first();
    return json({ ok: true, progress: row ? safeProgress(parseMaybe(row.progress_json) || {}) : {},
      version: row ? row.version : 0, updatedAt: row ? row.updated_at : null });
  }

  if (request.method === 'PUT') {
    if (!sameOrigin(request)) return json({ ok: false, error: 'BAD_ORIGIN' }, 403);
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ ok: false, error: 'PROGRESS_TOO_LARGE' }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ ok: false, error: 'BAD_JSON' }, 400); }
    const incoming = safeProgress(body && body.progress);
    const old = await env.DB.prepare('SELECT progress_json, version FROM mc_progress WHERE user_id = ?1').bind(user.id).first();
    let cloud = old ? parseMaybe(old.progress_json) || {} : {};
    if (body && body.resetScope === 'dungeon') cloud = resetDungeonCloud(cloud);
    const merged = mergeProgress(cloud, incoming);
    const version = (old ? Number(old.version) : 0) + 1;
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO mc_progress (user_id, version, progress_json, updated_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id) DO UPDATE SET version = ?2, progress_json = ?3, updated_at = ?4`
    ).bind(user.id, version, JSON.stringify(merged), now).run();
    return json({ ok: true, progress: merged, version, updatedAt: now });
  }

  return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
}
