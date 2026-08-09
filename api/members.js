import { database, ensureSchema, sendJson } from './_lib/core.js';
import { timingSafeEqual } from 'node:crypto';

function clean(value, max = 100) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : ''; }
function parse(value, fallback) { if (value && typeof value === 'object') return value; try { return JSON.parse(value); } catch { return fallback; } }
function countCSV(value) { return String(value || '').split(',').filter(Boolean).length; }
function progressSummary(value) {
  const p = parse(value, {}) || {}; const titles = parse(p.mc_titles, []); const cards = parse(p['c7:collection'], []);
  return { keys: Object.keys(p).length, story: countCSV(p.mc_read), lessons: countCSV(p.mc_learn), titles: Array.isArray(titles) ? titles.length : 0, cards: Array.isArray(cards) ? cards.length : 0 };
}
function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function equal(a, b) { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
function authorized(req) {
  const wantedUser = process.env.MEMBER_ADMIN_USER || process.env.STAT_USER || 'admin';
  const wantedPassword = process.env.MEMBER_ADMIN_PASSWORD || process.env.STAT_PASSWORD;
  if (!wantedPassword) return { ok: false, unconfigured: true };
  const header = String(req.headers.authorization || ''); if (!header.startsWith('Basic ')) return { ok: false };
  try { const [user, ...parts] = Buffer.from(header.slice(6), 'base64').toString().split(':'); return { ok: equal(user, wantedUser) && equal(parts.join(':'), wantedPassword) }; } catch { return { ok: false }; }
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  const access = authorized(req);
  if (!access.ok) {
    if (access.unconfigured) return sendJson(res, { ok: false, error: 'MEMBER_ADMIN_NOT_CONFIGURED' }, 503);
    res.setHeader('WWW-Authenticate', 'Basic realm="myClover Member Registry", charset="UTF-8"'); return sendJson(res, { ok: false, error: 'AUTH_REQUIRED' }, 401);
  }
  if (req.method !== 'GET') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const sql = database(); await ensureSchema(sql); const query = clean(req.query.q, 100).toLowerCase(); const like = `%${query}%`;
    const rows = await sql.query(`WITH registry AS (
      SELECT COALESCE(a.member_no,m.member_no) AS member_no,m.name AS registered_name,
        COALESCE(a.email,m.email) AS email,m.created_at AS registered_at,m.source,m.news,
        a.id AS account_id,a.display_name,a.created_at AS account_created_at,a.updated_at AS account_updated_at,
        p.updated_at AS progress_updated_at,p.progress_json,
        COALESCE((SELECT STRING_AGG(DISTINCT provider,',') FROM mc_auth_identities i WHERE i.user_id=a.id),'') AS providers
      FROM mc_accounts a
      LEFT JOIN members m ON (a.member_no IS NOT NULL AND a.member_no=m.member_no)
        OR (a.email IS NOT NULL AND lower(a.email)=lower(m.email))
      LEFT JOIN mc_progress p ON p.user_id=a.id
      UNION ALL
      SELECT m.member_no,m.name,m.email,m.created_at,m.source,m.news,
        NULL::TEXT,NULL::TEXT,NULL::TIMESTAMPTZ,NULL::TIMESTAMPTZ,NULL::TIMESTAMPTZ,NULL::JSONB,''
      FROM members m
      WHERE NOT EXISTS (SELECT 1 FROM mc_accounts a WHERE
        (a.member_no IS NOT NULL AND a.member_no=m.member_no)
        OR (a.email IS NOT NULL AND lower(a.email)=lower(m.email)))
    )
    SELECT * FROM registry
    WHERE ($1='' OR lower(COALESCE(member_no,'') || ' ' || COALESCE(registered_name,'') || ' ' ||
      COALESCE(email,'') || ' ' || COALESCE(display_name,'')) LIKE $2)
    ORDER BY CASE WHEN member_no IS NULL THEN 1 ELSE 0 END,member_no DESC,
      COALESCE(account_created_at,registered_at) DESC LIMIT 1000`, [query, like]);
    const members = rows.map(row => ({ memberNo: row.member_no || '', name: row.display_name || row.registered_name || '', registeredName: row.registered_name || '', email: row.email || '', providers: [...new Set(String(row.providers || '').split(',').filter(Boolean))], hasAccount: !!row.account_id, joinedAt: row.account_created_at || row.registered_at || '', registeredAt: row.registered_at || '', lastActiveAt: row.progress_updated_at || row.account_updated_at || '', source: row.source || '', news: !!row.news, progress: progressSummary(row.progress_json) }));
    if (req.query.format === 'csv') {
      const output = [['member_no','name','email','providers','has_account','joined_at','last_active_at','story','lessons','titles','cards','progress_keys','news','source']];
      members.forEach(m => output.push([m.memberNo,m.name,m.email,m.providers.join('|'),m.hasAccount?'yes':'no',m.joinedAt,m.lastActiveAt,m.progress.story,m.progress.lessons,m.progress.titles,m.progress.cards,m.progress.keys,m.news?'yes':'no',m.source]));
      res.statusCode = 200; res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Disposition', `attachment; filename="myclover-members-${new Date().toISOString().slice(0,10)}.csv"`);
      return res.end('\ufeff' + output.map(row => row.map(csvCell).join(',')).join('\n'));
    }
    return sendJson(res, { ok: true, generatedAt: new Date().toISOString(), count: members.length, members });
  } catch (error) {
    console.error('Member registry failed', error); const code = error.code === 'DATABASE_URL_NOT_CONFIGURED' ? error.code : 'MEMBER_API_ERROR';
    return sendJson(res, { ok: false, error: code }, code === 'DATABASE_URL_NOT_CONFIGURED' ? 503 : 500);
  }
}
