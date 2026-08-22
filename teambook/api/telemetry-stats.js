import { database, ensureSchema, sendJson } from './_lib/core.js';
import { currentAdminSession, ensureXtyAdminSchema } from './_lib/xty-admin-auth.js';
import { ensureTelemetrySchema } from './_lib/telemetry.js';

function num(value) { return Number(value || 0); }
function day(value) { try { return new Date(value).toISOString().slice(0, 10); } catch { return ''; } }

function attentionFor(summary, pages) {
  const items = [];
  if (!summary.visitorsTotal) {
    return [{ level: 'info', title: 'Telemetry armed · รอสัญญาณแรก', detail: 'ระบบเริ่มเก็บตั้งแต่ก่อนมีผู้ใช้ เพื่อให้ baseline แรกไม่หาย' }];
  }
  const returningRate = summary.visitors7d ? (summary.returningVisitors7d / summary.visitors7d) * 100 : 0;
  if (summary.visitors7d >= 5 && returningRate < 20) items.push({
    level: 'warn', title: `Return rate 7 วัน ${returningRate.toFixed(0)}%`,
    detail: 'คนส่วนใหญ่ยังมาแล้วไม่กลับ ควรดู first-session flow และเหตุผลให้กลับมาเปิดสมุดอีกครั้ง',
  });
  const weak = pages.find(page => page.views >= 5 && page.avgActiveSeconds < 12);
  if (weak) items.push({
    level: 'warn', title: `${weak.path} ถูกเปิดแต่ใช้เวลาน้อย`,
    detail: `${weak.views} views · active เฉลี่ย ${Math.round(weak.avgActiveSeconds)} วิ · ดูว่าหน้านี้สื่อสารไม่ชัดหรือเป็นทางผ่านโดยตั้งใจ`,
  });
  const shallow = pages.find(page => page.views >= 5 && page.avgScroll < 45);
  if (shallow) items.push({
    level: 'info', title: `${shallow.path} อ่านลงไปเฉลี่ย ${Math.round(shallow.avgScroll)}%`,
    detail: 'ถ้าเนื้อหาสำคัญอยู่ครึ่งล่าง ควรย้ายประเด็นหลักขึ้นมาหรือทำจังหวะอ่านให้ชัดขึ้น',
  });
  if (summary.sessions7d >= 5 && summary.commits7d === 0) items.push({
    level: 'warn', title: 'มี session แต่ยังไม่มีการลงชื่อ',
    detail: `${summary.sessions7d} sessions ใน 7 วัน แต่ 0 commits · ตรวจเส้นทางจากการอ่านไปสู่ action แรก`,
  });
  if (!items.length) items.push({
    level: 'ok', title: 'ยังไม่มี behavioral anomaly เด่น',
    detail: 'ดู return rate, หน้าที่ใช้เวลาสูง และ action ต่อ user ต่อเนื่องเพื่อสร้าง baseline ก่อนตัดสินใจใหญ่',
  });
  return items.slice(0, 5);
}

export default async function handler(req, res) {
  if (String(req.method || '').toUpperCase() !== 'GET') return sendJson(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  let sql;
  try {
    sql = database();
    await ensureSchema(sql);
    await ensureXtyAdminSchema(sql);
    await ensureTelemetrySchema(sql);
  } catch (error) {
    console.error('Telemetry stats init failed', error);
    return sendJson(res, { ok: false, error: 'TELEMETRY_STATS_UNAVAILABLE' }, 503);
  }

  const admin = await currentAdminSession(sql, req);
  if (!admin) return sendJson(res, { ok: false, error: 'ADMIN_AUTH_REQUIRED' }, 401);

  try {
    const summaryRows = await sql.query(`SELECT
      (SELECT COUNT(*) FROM teambook_analytics_visitors) AS visitors_total,
      (SELECT COUNT(*) FROM teambook_analytics_visitors WHERE last_seen_at >= NOW()-INTERVAL '7 days') AS visitors_7d,
      (SELECT COUNT(*) FROM teambook_analytics_visitors WHERE last_seen_at >= NOW()-INTERVAL '7 days' AND session_count >= 2) AS returning_7d,
      (SELECT COUNT(*) FROM teambook_analytics_sessions WHERE started_at >= NOW()-INTERVAL '7 days') AS sessions_7d,
      (SELECT COALESCE(SUM(page_views),0) FROM teambook_analytics_sessions WHERE started_at >= NOW()-INTERVAL '7 days') AS page_views_7d,
      (SELECT COALESCE(SUM(active_seconds),0) FROM teambook_analytics_sessions WHERE started_at >= NOW()-INTERVAL '7 days') AS active_seconds_7d,
      (SELECT COALESCE(AVG(max_scroll),0) FROM teambook_analytics_sessions WHERE started_at >= NOW()-INTERVAL '7 days') AS avg_scroll_7d,
      (SELECT COUNT(*) FROM teambook_book_entries WHERE kind='message' AND sent_at >= NOW()-INTERVAL '7 days' AND retracted=FALSE) AS messages_7d,
      (SELECT COUNT(*) FROM teambook_book_entries WHERE kind='commit' AND sent_at >= NOW()-INTERVAL '7 days' AND retracted=FALSE) AS commits_7d,
      (SELECT COUNT(DISTINCT user_id) FROM teambook_book_entries WHERE kind='commit' AND sent_at >= NOW()-INTERVAL '7 days' AND retracted=FALSE) AS committers_7d`);
    const row = summaryRows[0] || {};
    const summary = {
      visitorsTotal: num(row.visitors_total), visitors7d: num(row.visitors_7d),
      returningVisitors7d: num(row.returning_7d), sessions7d: num(row.sessions_7d),
      pageViews7d: num(row.page_views_7d), activeSeconds7d: num(row.active_seconds_7d),
      avgScroll7d: num(row.avg_scroll_7d), messages7d: num(row.messages_7d),
      commits7d: num(row.commits_7d), committers7d: num(row.committers_7d),
    };
    summary.returningRate7d = summary.visitors7d ? Math.round((summary.returningVisitors7d / summary.visitors7d) * 1000) / 10 : 0;
    summary.avgActiveSecondsPerSession = summary.sessions7d ? Math.round(summary.activeSeconds7d / summary.sessions7d) : 0;

    const dailyRows = await sql.query(`WITH days AS (
      SELECT generate_series(date_trunc('day',NOW())-INTERVAL '6 days',date_trunc('day',NOW()),INTERVAL '1 day') AS d
    ) SELECT d,
      (SELECT COUNT(DISTINCT visitor_id) FROM teambook_analytics_events e WHERE e.event_type='PAGE_VIEW' AND e.occurred_at>=d AND e.occurred_at<d+INTERVAL '1 day') AS visitors,
      (SELECT COUNT(*) FROM teambook_analytics_events e WHERE e.event_type='PAGE_VIEW' AND e.occurred_at>=d AND e.occurred_at<d+INTERVAL '1 day') AS page_views,
      (SELECT COUNT(*) FROM teambook_analytics_sessions s WHERE s.started_at>=d AND s.started_at<d+INTERVAL '1 day') AS sessions,
      (SELECT COUNT(*) FROM teambook_book_entries e WHERE e.kind='commit' AND e.retracted=FALSE AND e.sent_at>=d AND e.sent_at<d+INTERVAL '1 day') AS commits
    FROM days ORDER BY d`);
    const daily = {
      labels: dailyRows.map(r => day(r.d)),
      visitors: dailyRows.map(r => num(r.visitors)),
      pageViews: dailyRows.map(r => num(r.page_views)),
      sessions: dailyRows.map(r => num(r.sessions)),
      commits: dailyRows.map(r => num(r.commits)),
    };

    const pageRows = await sql.query(`WITH pv AS (
      SELECT path,COUNT(*)::int AS views,COUNT(DISTINCT visitor_id)::int AS visitors,MAX(occurred_at) AS last_view
      FROM teambook_analytics_events WHERE event_type='PAGE_VIEW' AND occurred_at>=NOW()-INTERVAL '7 days'
      GROUP BY path
    ), en AS (
      SELECT path,COALESCE(SUM(active_seconds),0)::int AS active_seconds,COALESCE(AVG(scroll_depth),0) AS avg_scroll
      FROM teambook_analytics_events WHERE event_type='ENGAGEMENT' AND occurred_at>=NOW()-INTERVAL '7 days'
      GROUP BY path
    ) SELECT pv.path,pv.views,pv.visitors,pv.last_view,COALESCE(en.active_seconds,0) AS active_seconds,COALESCE(en.avg_scroll,0) AS avg_scroll
      FROM pv LEFT JOIN en USING(path) ORDER BY pv.views DESC,pv.visitors DESC LIMIT 30`);
    const pages = pageRows.map(r => ({
      path: r.path, views: num(r.views), visitors: num(r.visitors), lastViewAt: r.last_view,
      activeSeconds: num(r.active_seconds), avgActiveSeconds: num(r.views) ? num(r.active_seconds) / num(r.views) : 0,
      avgScroll: Number(r.avg_scroll || 0),
    }));

    const actorRows = await sql.query(`WITH aliases AS (
      SELECT DISTINCT ON (user_id) user_id,alias FROM teambook_book_members
      ORDER BY user_id,joined_at DESC
    ), visits AS (
      SELECT actor_id,COUNT(*)::int AS sessions,COALESCE(SUM(page_views),0)::int AS page_views,
        COALESCE(SUM(active_seconds),0)::int AS active_seconds,COUNT(DISTINCT started_at::date)::int AS visit_days,
        MAX(last_seen_at) AS last_seen
      FROM teambook_analytics_sessions WHERE actor_id IS NOT NULL GROUP BY actor_id
    ), acts AS (
      SELECT user_id AS actor_id,
        COUNT(*) FILTER (WHERE kind='message' AND retracted=FALSE)::int AS messages,
        COUNT(*) FILTER (WHERE kind='commit' AND retracted=FALSE)::int AS commits,
        MAX(sent_at) AS last_action
      FROM teambook_book_entries GROUP BY user_id
    ), keys AS (
      SELECT actor_id FROM visits UNION SELECT actor_id FROM acts
    ) SELECT k.actor_id,a.alias,
      COALESCE(v.sessions,0) AS sessions,COALESCE(v.page_views,0) AS page_views,
      COALESCE(v.active_seconds,0) AS active_seconds,COALESCE(v.visit_days,0) AS visit_days,
      COALESCE(x.messages,0) AS messages,COALESCE(x.commits,0) AS commits,
      GREATEST(v.last_seen,x.last_action) AS last_seen
      FROM keys k LEFT JOIN visits v USING(actor_id) LEFT JOIN acts x USING(actor_id)
      LEFT JOIN aliases a ON a.user_id=k.actor_id
      ORDER BY GREATEST(v.last_seen,x.last_action) DESC NULLS LAST LIMIT 50`);
    const actors = actorRows.map(r => ({
      actorId: r.actor_id, alias: r.alias || '', sessions: num(r.sessions), visitDays: num(r.visit_days),
      pageViews: num(r.page_views), activeSeconds: num(r.active_seconds), messages: num(r.messages), commits: num(r.commits),
      returning: num(r.sessions) >= 2 || num(r.visit_days) >= 2, lastSeenAt: r.last_seen,
    }));

    const lastRows = await sql.query(`SELECT event_type,path,occurred_at FROM teambook_analytics_events ORDER BY occurred_at DESC LIMIT 1`);
    const last = lastRows[0] || null;
    return sendJson(res, {
      ok: true, generatedAt: new Date(), summary, daily, pages, actors,
      attention: attentionFor(summary, pages),
      lastSignal: last ? { type: last.event_type, path: last.path, at: last.occurred_at } : null,
      privacy: { storesIp: false, storesQueryString: false, anonymousIdentity: 'first-party random visitor id', accountIdentity: 'server session when available' },
    });
  } catch (error) {
    console.error('Telemetry stats query failed', error);
    return sendJson(res, { ok: false, error: 'TELEMETRY_STATS_QUERY_FAILED' }, 500);
  }
}
