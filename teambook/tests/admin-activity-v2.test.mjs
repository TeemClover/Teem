import assert from 'node:assert/strict';
import test from 'node:test';

import { getAdminActivity } from '../api/_lib/xty-admin-stats-v2.js';

test('admin activity uses an explicit non-keyword bucket alias', async () => {
  const statements = [];
  const sql = {
    async query(statement) {
      statements.push(statement);
      assert.match(statement, /AS bucket_day/);
      assert.doesNotMatch(statement, /::date\s+day\b/i);

      if (statement.includes('FROM teambook_book_entries')) {
        return [{ bucket_day: '2026-08-24', commits: 2, messages: 3 }];
      }
      if (statement.includes('FROM teambook_reactions')) {
        return [{ bucket_day: '2026-08-24', reactions: 4 }];
      }
      if (statement.includes('FROM teambook_confirmations')) {
        return [{ bucket_day: '2026-08-24', confirms: 5 }];
      }
      return [{ bucket_day: '2026-08-24', parties_created: 1, parties_completed: 1 }];
    },
  };

  const result = await getAdminActivity(sql, '7d', new Date('2026-08-25T12:00:00.000Z'));

  assert.equal(statements.length, 4);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.buckets, [{
    date: '2026-08-24',
    commits: 2,
    messages: 3,
    reactions: 4,
    confirms: 5,
    partiesCreated: 1,
    partiesCompleted: 1,
  }]);
});
