import {
  DEFAULT_MEMBER_LIMIT,
  MAX_MEMBER_LIMIT,
  MIN_MEMBER_LIMIT,
  normalizeMemberLimit,
} from '../../_shared/member-limit.js';

export {
  DEFAULT_MEMBER_LIMIT,
  MAX_MEMBER_LIMIT,
  MIN_MEMBER_LIMIT,
  normalizeMemberLimit,
};

/* PARTY_CREATED is immutable and is the canonical capacity source. The SQL
   expression is intentionally shared by list/admin compatibility queries so
   an old N/5 branch cannot quietly return later. `bookIdSql` is authored code,
   never request input. */
export function memberLimitSql(bookIdSql = 'p.id') {
  if (!/^(?:[a-z_][a-z0-9_.]*|\$[1-9][0-9]*)$/i.test(bookIdSql)) {
    throw new TypeError('INVALID_BOOK_ID_SQL');
  }
  return `LEAST(${MAX_MEMBER_LIMIT},GREATEST(${MIN_MEMBER_LIMIT},COALESCE((
    SELECT CASE
      WHEN e_capacity.data_json->>'memberLimit' ~ '^[0-9]{1,2}$'
      THEN (e_capacity.data_json->>'memberLimit')::int
      ELSE NULL
    END
    FROM teambook_book_events e_capacity
    WHERE e_capacity.book_id=${bookIdSql} AND e_capacity.type='PARTY_CREATED'
    ORDER BY e_capacity.created_at ASC LIMIT 1
  ),${DEFAULT_MEMBER_LIMIT})))`;
}

export async function memberLimitForBook(sql, bookId) {
  const rows = await sql.query(`SELECT ${memberLimitSql('$1')} AS member_limit`, [bookId]);
  return normalizeMemberLimit(rows[0]?.member_limit);
}
