import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export const COURSE_LOGIN_ATTEMPTS = 30;
export const COURSE_LOGIN_WINDOW_SECONDS = 300;
const TABLE = 'public.course_dent_login_rate_limit';
const SCHEMA = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  bucket_key TEXT PRIMARY KEY,
  window_id BIGINT NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0)
)`;
const INCREMENT = `INSERT INTO ${TABLE} (bucket_key, window_id, attempts)
VALUES ($1, FLOOR(EXTRACT(EPOCH FROM NOW()) / 300)::bigint, 1)
ON CONFLICT (bucket_key) DO UPDATE SET
  attempts = CASE WHEN ${TABLE}.window_id = EXCLUDED.window_id
    THEN LEAST(${TABLE}.attempts + 1, $2::integer + 1) ELSE 1 END,
  window_id = EXCLUDED.window_id
RETURNING attempts,
  GREATEST(1, CEIL((window_id + 1) * 300 - EXTRACT(EPOCH FROM NOW())))::integer AS retry_after`;
const CLEANUP = `DELETE FROM ${TABLE}
WHERE window_id < FLOOR(EXTRACT(EPOCH FROM NOW()) / 300)::bigint - 2
AND bucket_key IN (
  SELECT bucket_key FROM ${TABLE}
  WHERE window_id < FLOOR(EXTRACT(EPOCH FROM NOW()) / 300)::bigint - 2
  ORDER BY window_id LIMIT 100
)`;

function keyFor(req, project, env) {
  // Vercel sets x-forwarded-for at ingress. Never persist the raw address.
  const forwarded = req.headers?.['x-forwarded-for'];
  const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  const socketIP = req.socket?.remoteAddress;
  const address = isIP(candidate) ? candidate.toLowerCase() : (!env.VERCEL && isIP(socketIP || '') ? socketIP.toLowerCase() : 'unknown');
  const secret = env.COURSE_SESSION_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Course access unavailable');
  return createHmac('sha256', secret).update(JSON.stringify(['course-login-v1', project, address])).digest('hex');
}

async function bounded(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Course access unavailable')), 5000); })]);
  } finally { clearTimeout(timer); }
}

export function createCourseRateLimiter({ env = process.env, query, now = () => Date.now() } = {}) {
  let driverPromise;
  let schemaPromise;
  const local = new Map();
  const localOnly = !env.VERCEL && !env.DATABASE_URL && !query;
  async function run(text, values = []) {
    if (query) return bounded(Promise.resolve().then(() => query(text, values)));
    if (!env.DATABASE_URL) throw new Error('Course access unavailable');
    if (!driverPromise) driverPromise = import('@neondatabase/serverless').then(({ neon }) => neon(env.DATABASE_URL));
    const sql = await bounded(driverPromise);
    return bounded(sql.query(text, values));
  }
  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async () => {
        await run(SCHEMA);
        await run(`CREATE INDEX IF NOT EXISTS course_dent_login_rate_window_idx ON ${TABLE} (window_id)`);
      })().catch((error) => { schemaPromise = undefined; throw error; });
    }
    return schemaPromise;
  }
  return {
    async consume(req, project = 'thedent') {
      if (project !== 'thedent') throw new Error('Course access unavailable');
      const key = keyFor(req, project, env);
      if (localOnly) {
        const seconds = Math.floor(now() / 1000);
        const window = Math.floor(seconds / COURSE_LOGIN_WINDOW_SECONDS);
        for (const [oldKey, value] of local) if (value.window < window) local.delete(oldKey);
        const current = local.get(key);
        if (!current && local.size >= 1000) local.delete(local.keys().next().value);
        const attempts = current?.window === window ? Math.min(current.attempts + 1, COURSE_LOGIN_ATTEMPTS + 1) : 1;
        local.set(key, { window, attempts });
        return { key, allowed: attempts <= COURSE_LOGIN_ATTEMPTS, retryAfter: (window + 1) * COURSE_LOGIN_WINDOW_SECONDS - seconds };
      }
      await ensureSchema();
      const rows = await run(INCREMENT, [key, COURSE_LOGIN_ATTEMPTS]);
      const attempts = Number(rows?.[0]?.attempts);
      const retryAfter = Number(rows?.[0]?.retry_after);
      if (!Number.isInteger(attempts) || attempts < 1 || !Number.isInteger(retryAfter) || retryAfter < 1 || retryAfter > COURSE_LOGIN_WINDOW_SECONDS) throw new Error('Course access unavailable');
      await run(CLEANUP);
      return { key, allowed: attempts <= COURSE_LOGIN_ATTEMPTS, retryAfter };
    },
    async clear(key) {
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw new Error('Course access unavailable');
      if (localOnly) { local.delete(key); return; }
      await ensureSchema();
      await run(`DELETE FROM ${TABLE} WHERE bucket_key = $1`, [key]);
    },
  };
}
