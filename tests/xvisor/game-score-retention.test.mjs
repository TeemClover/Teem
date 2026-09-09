import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

test('2.0 reads and writes the existing leaderboard without deleting historical scores', async () => {
  const queries = [];
  const oldScore = { display_name: 'ผู้เล่นเดิม', run_mode: 'FIRST_RUN', score_version: '1.0b', best_tgv: 125000, total_income: 16000, best_monthly_income: 4500, organization_size: 12, completed_at: '2026-08-31T12:00:00.000Z' };
  const sql = { async query(query, params) {
    queries.push({ query, params });
    return /SELECT display_name|RETURNING display_name/.test(query) ? [oldScore] : [];
  } };
  mock.module(new URL('../../api/_lib/core.js', import.meta.url).href, { namedExports: {
    clean: (value, max) => String(value || '').trim().slice(0, max),
    database: () => sql,
    sameOrigin: () => true,
    sendJson: (res, body, status = 200) => { res.body = body; res.status = status; },
  } });
  const { default: handler } = await import('../../api/xvisor-scores.js');
  const response = {};
  await handler({ method: 'GET' }, response);
  assert.equal(response.status, 200);
  assert.equal(response.body.scoreVersion, '1.0b');
  assert.equal(response.body.scores[0].displayName, 'ผู้เล่นเดิม');
  assert.equal(response.body.scores[0].bestTgv, 125000);
  const posted = {};
  await handler({ method: 'POST', body: { displayName: 'ผู้เล่นใหม่', runId: 'run-new-11', scoreVersion: '1.0b', bestTgv: 120000, totalIncome: 14000, bestMonthlyIncome: 4000, organizationSize: 8, completedAt: Date.now() } }, posted);
  assert.equal(posted.status, 200);
  assert.equal(posted.body.ok, true);
  assert.equal(queries.some(({ query }) => /DELETE|TRUNCATE|DROP\s+TABLE/i.test(query)), false);
  assert.equal(queries.find(({ query }) => /WHERE score_version/.test(query)).params[0], '1.0b');
  assert.equal(queries.find(({ query }) => /INSERT INTO/.test(query)).params[1], '1.0b');
});
