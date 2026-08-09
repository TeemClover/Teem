import { ensureAccountSchema, json } from '../_lib/account.js';

function clean(value, max = 100) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
}
function parse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function countCSV(value) { return String(value || '').split(',').filter(Boolean).length; }
function progressSummary(value) {
  const p = parse(value, {}) || {};
  const titles = parse(p.mc_titles, []);
  const cards = parse(p['c7:collection'], []);
  return {
    keys: Object.keys(p).length,
    story: countCSV(p.mc_read),
    lessons: countCSV(p.mc_learn),
    titles: Array.isArray(titles) ? titles.length : 0,
    cards: Array.isArray(cards) ? cards.length : 0,
  };
}
function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'DB_NOT_CONFIGURED' }, 503);
  await ensureAccountSchema(env.DB);
  const url = new URL(request.url);
  const query = clean(url.searchParams.get('q'), 100).toLowerCase();
  const like = `%${query}%`;
  const result = await env.DB.prepare(
    `SELECT m.member_no, m.name AS registered_name, m.email, m.created_at AS registered_at,
            m.source, m.news, a.id AS account_id, a.display_name, a.created_at AS account_created_at,
            a.updated_at AS account_updated_at, p.updated_at AS progress_updated_at, p.progress_json,
            COALESCE((SELECT GROUP_CONCAT(provider, ',') FROM mc_auth_identities i WHERE i.user_id = a.id), '') AS providers
       FROM members m
       LEFT JOIN mc_accounts a ON lower(a.email) = lower(m.email)
       LEFT JOIN mc_progress p ON p.user_id = a.id
      WHERE (?1 = '' OR lower(COALESCE(m.member_no,'') || ' ' || m.name || ' ' || m.email || ' ' || COALESCE(a.display_name,'')) LIKE ?2)
      ORDER BY CASE WHEN m.member_no IS NULL THEN 1 ELSE 0 END, m.member_no DESC, m.created_at DESC
      LIMIT 1000`
  ).bind(query, like).all();
  const members = (result.results || []).map(row => ({
    memberNo: row.member_no || '', name: row.display_name || row.registered_name || '',
    registeredName: row.registered_name || '', email: row.email || '',
    providers: [...new Set(String(row.providers || '').split(',').filter(Boolean))],
    hasAccount: !!row.account_id, joinedAt: row.account_created_at || row.registered_at || '',
    registeredAt: row.registered_at || '', lastActiveAt: row.progress_updated_at || row.account_updated_at || '',
    source: row.source || '', news: !!row.news, progress: progressSummary(row.progress_json),
  }));
  if (url.searchParams.get('format') === 'csv') {
    const rows = [['member_no','name','email','providers','has_account','joined_at','last_active_at','story','lessons','titles','cards','progress_keys','news','source']];
    members.forEach(m => rows.push([m.memberNo,m.name,m.email,m.providers.join('|'),m.hasAccount?'yes':'no',m.joinedAt,m.lastActiveAt,m.progress.story,m.progress.lessons,m.progress.titles,m.progress.cards,m.progress.keys,m.news?'yes':'no',m.source]));
    const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\n');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="myclover-members-${new Date().toISOString().slice(0,10)}.csv"`,
      'cache-control': 'no-store' } });
  }
  return json({ ok: true, generatedAt: new Date().toISOString(), count: members.length, members });
}
