// Optional real PostgreSQL execution without adding a production dependency:
// npm install --prefix /private/tmp/teem-shelf-deps @electric-sql/pglite
// SHELF_PGLITE_MODULE=/private/tmp/teem-shelf-deps/node_modules/@electric-sql/pglite/dist/index.js node --test api/_lib/shelf-store.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createSqlShelfRepository, ensureShelfSchema, SHELF_SCHEMA } from './shelf-store.js';

const modulePath = process.env.SHELF_PGLITE_MODULE;

test('PostgreSQL executes shelf schema, keys, scoped sessions, audit aggregates and revocation', {
  skip: !modulePath && 'Set SHELF_PGLITE_MODULE to an isolated PGlite installation to execute SQL.',
}, async () => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  let queryCount = 0;
  const sql = { async query(statement, parameters = []) {
    queryCount++;
    return (await db.query(statement, parameters)).rows;
  } };
  try {
    await Promise.all([ensureShelfSchema(sql), ensureShelfSchema(sql)]);
    assert.equal(queryCount, SHELF_SCHEMA.length, 'concurrent schema initialization is coalesced for this client');
    await ensureShelfSchema(sql);
    assert.equal(queryCount, SHELF_SCHEMA.length, 'same client skips completed initialization');
    const repository = createSqlShelfRepository(sql);
    const at = new Date('2026-09-14T00:00:00.000Z');
    const hourLater = new Date(at.getTime() + 3600000);
    const tomorrow = new Date(at.getTime() + 86400000);
    const userId = randomUUID();
    const limited = await repository.createKey({
      id: randomUUID(), userId, name: 'Named recipient', keyHash: 'a'.repeat(64), prefix: 'SAUCE_xxxxx…',
      sourceIds: ['first-source'], createdAt: at, expiresAt: tomorrow,
    });
    assert.equal(limited.name, 'Named recipient');
    assert.deepEqual(limited.sourceIds, ['first-source']);
    assert.equal(limited.expiresAt, tomorrow.toISOString());
    assert.equal((await repository.userById(userId)).name, 'Named recipient');
    const reusable = await repository.createKey({
      id: randomUUID(), userId, name: 'Must not silently rename recipient', keyHash: 'b'.repeat(64), prefix: 'SAUCE_yyyyy…',
      sourceIds: null, createdAt: at, expiresAt: null,
    });
    assert.equal(reusable.userId, userId);
    assert.equal(reusable.name, 'Named recipient');
    assert.equal(reusable.sourceIds, null);
    assert.equal((await repository.activeKey('a'.repeat(64), at)).id, limited.id);
    assert.equal(await repository.activeKey('unknown', at), null);
    assert.equal(await repository.createSession('limited-session', limited.id, at, hourLater), true);
    assert.equal(await repository.createSession('all-session', reusable.id, at, tomorrow), true);
    assert.equal((await repository.session('limited-session', at)).key.id, limited.id);

    const first = { id: 'first-source', title: 'First source', version: '1.2.0' };
    const second = { id: 'second-source', title: 'Second source', version: '2.0.0' };
    assert.equal(await repository.recordServe('limited-session', first, 'open', at), true);
    assert.equal(await repository.recordServe('limited-session', second, 'copy', at), false, 'scope checked inside INSERT');
    assert.equal(await repository.recordServe('all-session', first, 'copy', at), true);
    assert.equal(await repository.recordServe('all-session', second, 'download', at), true);
    const snapshot = await repository.adminSnapshot(at);
    assert.deepEqual(snapshot.stats, { userCount: 1, keyCount: 2, activeKeyCount: 2, openCount: 1, copyCount: 1, downloadCount: 1 });
    assert.equal(snapshot.users[0].keyCount, 2);
    assert.equal(snapshot.users[0].openCount, 1);
    assert.equal(snapshot.users[0].lastSeenAt, at.toISOString());
    assert.equal(snapshot.events.length, 3);
    assert.ok(snapshot.events.every(event => event.userId === userId && event.name === 'Named recipient'));
    assert.equal(snapshot.events.find(event => event.kind === 'open').keyId, limited.id);
    assert.equal(snapshot.events.find(event => event.kind === 'download').sourceVersion, '2.0.0');
    assert.equal(snapshot.sourceStats.find(source => source.sourceId === first.id).copyCount, 1);
    assert.equal(snapshot.userSourceStats.find(source => source.sourceId === second.id).downloadCount, 1);
    assert.doesNotMatch(JSON.stringify(snapshot), /key_hash|token_hash|limited-session|all-session/);

    assert.equal(await repository.session('limited-session', hourLater), null, 'session expires at boundary');
    assert.equal(await repository.recordServe('limited-session', first, 'download', hourLater), false);
    assert.equal(await repository.activeKey('a'.repeat(64), tomorrow), null, 'key expires at boundary');
    assert.equal(await repository.createSession('expired-session', limited.id, tomorrow, new Date(tomorrow.getTime() + 3600000)), false);

    for (let i = 0; i < 203; i++) await repository.recordServe('all-session', first, 'download', at);
    const many = await repository.adminSnapshot(at);
    assert.equal(many.events.length, 200);
    assert.equal(many.eventsTotal, 206);
    assert.equal(many.eventsHasMore, true);
    assert.equal(many.sourceStats.find(source => source.sourceId === first.id).downloadCount, 203);
    assert.equal(many.userSourceStats.find(source => source.sourceId === first.id).downloadCount, 203);

    for (let attempt = 1; attempt <= 9; attempt++) {
      assert.equal(await repository.rateLimited('window-one-ip-digest', at, 8, 900000), attempt > 8);
    }
    const nextWindow = new Date(at.getTime() + 900000);
    assert.equal(await repository.rateLimited('window-two-ip-digest', nextWindow, 8, 900000), false);
    assert.equal((await sql.query('SELECT COUNT(*)::int AS n FROM mc_shelf_login_hits'))[0].n, 1, 'expired buckets are removed');

    const revoked = await repository.revokeKey(reusable.id, at);
    assert.equal(revoked.revokedAt, at.toISOString());
    assert.equal(await repository.session('all-session', at), null);
    assert.equal(await repository.recordServe('all-session', first, 'copy', at), false);
    assert.equal(await repository.createSession('revoked-session', reusable.id, at, tomorrow), false);
    assert.equal(await repository.activeKey('b'.repeat(64), at), null);
    assert.equal(await repository.revokeKey(randomUUID(), at), null);
    assert.equal((await repository.adminSnapshot(at)).stats.activeKeyCount, 1);
    assert.equal((await repository.adminSnapshot(tomorrow)).stats.activeKeyCount, 0);

    await repository.destroySession('limited-session');
    assert.equal((await sql.query('SELECT COUNT(*)::int AS n FROM mc_shelf_sessions'))[0].n, 0);
  } finally { await db.close(); }

  // A different database must not inherit a module-global schema-ready flag.
  const isolated = new PGlite();
  try {
    const otherSql = { query: async (statement, parameters = []) => (await isolated.query(statement, parameters)).rows };
    await ensureShelfSchema(otherSql);
    const names = await otherSql.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    assert.equal(names.length, 5);
    assert.ok(names.every(row => row.tablename.startsWith('mc_shelf_')));
  } finally { await isolated.close(); }
});
