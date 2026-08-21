import { hasDatabaseConfig } from './_lib/core.js';

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

export default function handler(req, res) {
  if (String(req.method || '').toUpperCase() !== 'GET') {
    return reply(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const checks = {
    databaseConfigured: hasDatabaseConfig(),
    groqConfigured: enabled('TEAMBOOK_PET_AI', 'XTY_PET_AI') && !!process.env.GROQ_API_KEY,
    visionConfigured: enabled('TEAMBOOK_PET_VISION', 'XTY_PET_VISION') && !!process.env.GROQ_API_KEY,
    blobConfigured: !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID),
    cronConfigured: !!process.env.CRON_SECRET,
    emailConfigured: !!process.env.RESEND_API_KEY && !!process.env.TEAMBOOK_FROM_EMAIL,
  };
  const required = ['databaseConfigured', 'groqConfigured', 'blobConfigured', 'cronConfigured'];
  const ready = required.every(key => checks[key]);
  return reply(res, { ok: true, ready, service: 'teambook', checks }, ready ? 200 : 503);
}
