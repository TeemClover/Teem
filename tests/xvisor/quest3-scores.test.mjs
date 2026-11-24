// QUEST 3.0 keeps its own High Score board in the table the old game uses, without touching the old rows.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

test('the clip game has its own board: ?board=clip reads it, a 3.0-clip score lands on it, absurd scores are refused', async () => {
  const queries = [];
  const row = { display_name: 'แดง', run_mode: 'FIRST_RUN', score_version: '3.0-clip', best_tgv: 26000, total_income: 430000, best_monthly_income: 69000, organization_size: 18, completed_at: '2026-11-24T12:00:00.000Z' };
  const sql = { async query(query, params) {
    queries.push({ query, params });
    return /SELECT display_name|RETURNING display_name/.test(query) ? [row] : [];
  } };
  mock.module(new URL('../../api/_lib/core.js', import.meta.url).href, { namedExports: {
    clean: (value, max) => String(value || '').trim().slice(0, max),
    database: () => sql,
    sameOrigin: () => true,
    sendJson: (res, body, status = 200) => { res.body = body; res.status = status; },
  } });
  const { default: handler } = await import('../../api/xvisor-scores.js');

  const board = {};
  await handler({ method: 'GET', query: { board: 'clip' } }, board);
  assert.equal(board.body.scoreVersion, '3.0-clip');
  assert.equal(board.body.scores[0].bestTgv, 26000);
  assert.equal(queries.find(({ query }) => /WHERE score_version/.test(query)).params[0], '3.0-clip');

  const old = {};
  await handler({ method: 'GET', query: {} }, old);
  assert.equal(old.body.scoreVersion, '1.0b', 'the old game still gets the old board');

  const score = { displayName: 'แดง', runId: 'q3-20261124-1', scoreVersion: '3.0-clip', bestTgv: 26000, totalIncome: 430000, bestMonthlyIncome: 69000, organizationSize: 18, completedAt: Date.now() };
  const posted = {};
  await handler({ method: 'POST', body: score }, posted);
  assert.equal(posted.status, 200);
  assert.equal(queries.find(({ query }) => /INSERT INTO/.test(query)).params[1], '3.0-clip');

  for (const bad of [{ bestTgv: 9_000_000 }, { organizationSize: 5000 }, { scoreVersion: '9.9' }, { displayName: '' }]) {
    const res = {};
    await handler({ method: 'POST', body: { ...score, ...bad } }, res);
    assert.equal(res.status, 400, JSON.stringify(bad));
  }
  assert.equal(queries.some(({ query }) => /DELETE|TRUNCATE|DROP\s+TABLE/i.test(query)), false);
});
