import {
  getAdminActivity,
  getAdminCards,
  getAdminEvents,
  getAdminParties,
  getAdminPartyDetail,
  getAdminSummary as getAdminSummaryV2,
  getAdminSystem,
  getAdminUsers,
} from './xty-admin-stats-v2.js';
import { normalizeAdminRange } from './xty-admin-stats.js';

export {
  getAdminActivity,
  getAdminCards,
  getAdminEvents,
  getAdminParties,
  getAdminPartyDetail,
  getAdminSystem,
  getAdminUsers,
};

function n(value) { return Number(value || 0); }

export async function getAdminSummary(sql, rangeValue, at = new Date()) {
  const summary = await getAdminSummaryV2(sql, rangeValue, at);
  const range = normalizeAdminRange(rangeValue, at);
  const values = [range.start, range.end];

  try {
    const [activeRows, seenRows] = await Promise.all([
      sql.query(`WITH activity AS (
          SELECT user_id,sent_at at FROM teambook_book_entries WHERE retracted=FALSE
          UNION ALL SELECT user_id,created_at FROM teambook_reactions WHERE created_at IS NOT NULL
          UNION ALL SELECT confirmer_id,created_at FROM teambook_confirmations
          UNION ALL SELECT actor_id,created_at FROM teambook_book_events WHERE actor_id IS NOT NULL
          UNION ALL SELECT user_id,joined_at FROM teambook_book_members
          UNION ALL SELECT user_id,revealed_at FROM teambook_card_unlock_events WHERE revealed_at IS NOT NULL
        ) SELECT COUNT(DISTINCT user_id)::int active FROM activity
        WHERE user_id IS NOT NULL AND user_id NOT LIKE 'public:%'
          AND ($1::timestamptz IS NULL OR at >= $1) AND at <= $2`, values),
      sql.query(`SELECT COUNT(*)::int total,
          COUNT(*) FILTER (WHERE confirmer_id LIKE 'public:%')::int public,
          COUNT(*) FILTER (WHERE confirmer_id NOT LIKE 'public:%')::int in_book
        FROM teambook_confirmations
        WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND created_at <= $2`, values),
    ]);

    const seen = seenRows[0] || {};
    summary.users.active = n(activeRows[0]?.active);
    /* teambook_confirmations is now the canonical Seen ledger for both modes.
       Keep `confirms` for dashboard compatibility, but expose the real semantic
       fields so new UI never has to guess. */
    summary.activity.confirms = n(seen.total);
    summary.activity.seen = n(seen.total);
    summary.activity.seenPublic = n(seen.public);
    summary.activity.seenInBook = n(seen.in_book);
  } catch (error) {
    console.error('TeamBook stats v3 Seen correction failed', error);
    summary.warnings = [
      ...(Array.isArray(summary.warnings) ? summary.warnings : []),
      { label: 'summary.seen-v3', code: String(error?.code || 'QUERY_FAILED') },
    ];
  }

  return summary;
}
