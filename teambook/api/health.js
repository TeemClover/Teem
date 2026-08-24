import { database, ensureSchema, hasDatabaseConfig } from './_lib/core.js';
import { getVercelOidcToken } from '@vercel/oidc';

function reply(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function enabled(primary, legacy) {
  return ['on', '1', 'true', 'yes'].includes(
    String(process.env[primary] || process.env[legacy] || '').trim().toLowerCase(),
  );
}

export default async function handler(req, res) {
  if (String(req.method || '').toUpperCase() !== 'GET') {
    return reply(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const configured = hasDatabaseConfig();
  let oidcConfigured = false;
  if (!process.env.TEAMBOOK_ENDING_IMAGE_ENDPOINT && !process.env.AI_GATEWAY_API_KEY) {
    try { oidcConfigured = !!await getVercelOidcToken(); } catch { oidcConfigured = false; }
  }
  let databaseConnected = false;
  let schemaReady = false;
  let databaseError = null;
  if (configured) {
    try {
      const sql = database();
      await ensureSchema(sql);
      const ping = await sql.query(`SELECT
        to_regclass('public.teambook_books') IS NOT NULL AS books,
        to_regclass('public.teambook_book_members') IS NOT NULL AS members,
        to_regclass('public.teambook_sessions') IS NOT NULL AS sessions,
        to_regclass('public.teambook_card_unlock_events') IS NOT NULL AS rewards`);
      databaseConnected = true;
      schemaReady = !!(ping[0]?.books && ping[0]?.members && ping[0]?.sessions && ping[0]?.rewards);
    } catch (error) {
      databaseError = String(error?.code || error?.message || 'DATABASE_UNREACHABLE').slice(0, 120);
    }
  }

  const checks = {
    databaseConfigured: configured,
    databaseConnected,
    schemaReady,
    groqConfigured: enabled('TEAMBOOK_PET_AI', 'XTY_PET_AI') && !!process.env.GROQ_API_KEY,
    visionConfigured: enabled('TEAMBOOK_PET_VISION', 'XTY_PET_VISION') && !!process.env.GROQ_API_KEY,
    blobConfigured: !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID),
    endingImageConfigured: !!process.env.TEAMBOOK_ENDING_IMAGE_ENDPOINT
      || !!process.env.AI_GATEWAY_API_KEY
      || !!process.env.VERCEL_OIDC_TOKEN
      || oidcConfigured,
    cronConfigured: !!process.env.CRON_SECRET,
    emailConfigured: !!process.env.RESEND_API_KEY && !!process.env.TEAMBOOK_FROM_EMAIL,
  };
  const required = ['databaseConfigured', 'databaseConnected', 'schemaReady', 'groqConfigured', 'blobConfigured', 'cronConfigured'];
  const ready = required.every(key => checks[key]);
  return reply(res, { ok: true, ready, service: 'teambook', checks, ...(databaseError ? { databaseError } : {}) }, ready ? 200 : 503);
}
