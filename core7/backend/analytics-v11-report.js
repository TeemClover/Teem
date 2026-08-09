import { readAnalyticsStatsV11 } from './analytics-v11.js';
import { clampAnalyticsStart } from './open-beta.js';

function rate(n, d) { return d > 0 ? Number((n * 100 / d).toFixed(1)) : 0; }
function nums(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    const n = Number(value);
    out[key] = value !== '' && value != null && Number.isFinite(n) ? n : value;
  }
  return out;
}

export async function readAnalyticsDevelopmentReport(db, params = {}) {
  const data = await readAnalyticsStatsV11(db, params);
  const start = clampAnalyticsStart(Date.parse(`${data.range.from}T00:00:00+07:00`));
  const end = Date.parse(`${data.range.to}T00:00:00+07:00`) + 86400000;
  const result = await db.prepare(`
    WITH picks AS (
      SELECT p.card_id, p.color, COUNT(*) picked_hands,
        SUM(p.copies) picked_copies, SUM(p.won) won_hands
      FROM c7_analytics_card_picks p
      JOIN c7_analytics_matches m ON m.match_id = p.match_id
      WHERE m.status = 'COMPLETED' AND m.started_at >= ? AND m.started_at < ?
      GROUP BY p.card_id, p.color
    ), events AS (
      SELECT e.card_id, e.color,
        SUM(CASE WHEN e.event_type = 'PLAYED' THEN e.n ELSE 0 END) played,
        SUM(CASE WHEN e.event_type = 'DISCARDED' THEN e.n ELSE 0 END) discarded
      FROM c7_analytics_card_events e
      JOIN c7_analytics_matches m ON m.match_id = e.match_id
      WHERE m.status = 'COMPLETED' AND m.started_at >= ? AND m.started_at < ?
      GROUP BY e.card_id, e.color
    )
    SELECT p.card_id, p.color, p.picked_hands, p.picked_copies, p.won_hands,
      COALESCE(e.played, 0) played, COALESCE(e.discarded, 0) discarded
    FROM picks p LEFT JOIN events e ON e.card_id = p.card_id AND e.color = p.color
    ORDER BY p.picked_hands DESC, played DESC, p.card_id ASC LIMIT 28
  `).bind(start, end, start, end).all();
  data.cardPicks = (result.results || []).map(row => {
    const item = nums(row);
    item.hand_win_rate = rate(Number(item.won_hands || 0), Number(item.picked_hands || 0));
    item.sample_ok = Number(item.picked_hands || 0) >= 20;
    return item;
  });
  return data;
}
