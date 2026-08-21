function reply(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default function handler(req, res) {
  if (String(req.method || '').toUpperCase() !== 'GET') {
    return reply(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const checks = {
    databaseConfigured: !!(process.env.TEAMBOOK_DATABASE_URL || process.env.STORAGE_URL),
    groqConfigured: process.env.TEAMBOOK_PET_AI === 'on' && !!process.env.GROQ_API_KEY,
    visionConfigured: process.env.TEAMBOOK_PET_VISION === 'on' && !!process.env.GROQ_API_KEY,
    blobConfigured: !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID),
    cronConfigured: !!process.env.CRON_SECRET,
    emailConfigured: !!process.env.RESEND_API_KEY && !!process.env.TEAMBOOK_FROM_EMAIL,
  };
  const required = ['databaseConfigured', 'groqConfigured', 'blobConfigured', 'cronConfigured'];
  const ready = required.every(key => checks[key]);
  return reply(res, { ok: true, ready, service: 'teambook', checks }, ready ? 200 : 503);
}
