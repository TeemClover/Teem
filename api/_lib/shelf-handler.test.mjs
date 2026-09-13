import test from 'node:test';
import assert from 'node:assert/strict';
import { createShelfHandler, SHELF_COOKIE } from './shelf-handler.js';
import { createMemoryShelfRepository } from './shelf-memory.js';
import { createSqlShelfRepository, SHELF_SCHEMA } from './shelf-store.js';
import { readShelfCatalog, readShelfSource, shelfCatalogPreview } from './shelf-content.js';

const catalog = {
  schema_version: 1, title: 'Shelf', updated_at: '2026-09-14', source_root: '/private/',
  categories: [{ id: 'method', label: 'Method' }],
  sources: [
    { id: 'first-source', title: 'First', description: 'Preview', version: '1.0.0', status_label: 'Working', categories: ['method'], tags: ['AI'], path: 'source/first.md', notes: 'private metadata', body: 'DO NOT PREVIEW' },
    { id: 'second-source', title: 'Second', description: 'Other', version: '2.0.0', status_label: 'Working', categories: ['method'], tags: [], path: 'source/second.md' },
  ],
};

function setup(overrides = {}) {
  let clock = new Date('2026-09-14T00:00:00Z');
  const repository = createMemoryShelfRepository();
  const reads = [];
  const dependencies = {
    getRepository: async () => repository,
    readCatalog: async () => catalog,
    readSource: async source => { reads.push(source.id); return `# ${source.title}\nComplete source content`; },
    isAdmin: async req => req.headers['x-test-admin'] === 'yes',
    now: () => clock,
    ...overrides,
  };
  const handler = createShelfHandler(dependencies);
  async function call(action, options = {}) {
    const method = options.method || (['catalog', 'session', 'admin'].includes(action) ? 'GET' : 'POST');
    const headers = { host: 'www.myclover.test', 'content-type': 'application/json', origin: 'https://www.myclover.test',
      'x-forwarded-for': options.ip || '192.0.2.1', ...(options.admin ? { 'x-test-admin': 'yes' } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}), ...options.headers };
    const req = { method, url: `/api/shelf?action=${action}`, query: { action }, headers,
      body: options.rawBody ?? { action, ...options.body } };
    const result = { headers: {}, statusCode: 0 };
    const res = { set statusCode(value) { result.statusCode = value; }, get statusCode() { return result.statusCode; },
      setHeader(name, value) { result.headers[name.toLowerCase()] = value; },
      end(body) { result.body = JSON.parse(body); } };
    await (options.handler || handler)(req, res);
    return result;
  }
  async function issue(body = {}) {
    const result = await call('create-key', { admin: true, body: { name: 'Test Recipient', ...body } });
    assert.equal(result.statusCode, 201, JSON.stringify(result.body)); return result.body;
  }
  async function unlock(rawKey, options = {}) {
    const response = await call('unlock', { body: { key: rawKey }, ...options });
    return { response, cookie: response.headers['set-cookie']?.split(';')[0] };
  }
  return { handler, dependencies, repository, reads, call, issue, unlock, advance(ms) { clock = new Date(clock.getTime() + ms); }, setClock(value) { clock = new Date(value); } };
}

test('public preview is allowlisted and still works without storage', async () => {
  const app = setup({ getRepository: async () => { throw new Error('SECRET CONNECTION'); } });
  const response = await app.call('catalog');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(response.body.catalog.sources[0]).sort(), ['id', 'title', 'description', 'version', 'status_label', 'categories', 'tags'].sort());
  assert.doesNotMatch(JSON.stringify(response.body), /private|path|DO NOT PREVIEW|source_root/);
  assert.equal(app.reads.length, 0);
  const unavailable = await app.call('session');
  assert.equal(unavailable.statusCode, 503);
  assert.deepEqual(unavailable.body, { ok: false, error: 'STORAGE_UNAVAILABLE' });
});

test('anonymous or forged sessions cannot read content or admin data', async () => {
  const app = setup();
  for (const cookie of ['', `${SHELF_COOKIE}=forged`, `${SHELF_COOKIE}=%GG`, `${SHELF_COOKIE}=${'a'.repeat(43)}`]) {
    assert.equal((await app.call('take', { cookie, body: { id: 'first-source', kind: 'open' } })).statusCode, 401);
    assert.equal((await app.call('session', { cookie })).body.authenticated, false);
  }
  for (const action of ['admin', 'create-key', 'revoke-key']) assert.equal((await app.call(action)).statusCode, 401);
  assert.equal(app.reads.length, 0);
  assert.equal((await app.repository.adminSnapshot(new Date())).stats.keyCount, 0);
});

test('keys are generated once and browser sessions are secure and separate from admin login', async () => {
  const app = setup();
  const issued = await app.issue();
  assert.match(issued.rawKey, /^SAUCE_[A-Za-z0-9_-]{32}$/);
  const { response, cookie } = await app.unlock(issued.rawKey);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.authenticated, true);
  assert.equal(response.body.user.id, issued.user.id);
  assert.match(response.headers['set-cookie'], /HttpOnly; Secure; SameSite=Strict; Max-Age=604800/);
  assert.ok(cookie.startsWith(`${SHELF_COOKIE}=`));
  assert.equal((await app.call('admin', { cookie })).statusCode, 401);
  const snapshot = await app.call('admin', { admin: true });
  assert.equal(snapshot.body.keys[0].name, 'Test Recipient');
  assert.doesNotMatch(JSON.stringify(snapshot.body), /keyHash|key_hash|tokenHash|token_hash|192\.0\.2/);
  assert.ok(!JSON.stringify(snapshot.body).includes(issued.rawKey));
  assert.ok(!JSON.stringify(response.body).includes(issued.rawKey));
});

test('one content request produces exactly its served action, attributed to key recipient and sauce', async () => {
  const app = setup();
  const issued = await app.issue();
  const { cookie } = await app.unlock(issued.rawKey);
  const copied = await app.call('take', { cookie, body: { id: 'first-source', kind: 'copy' } });
  assert.equal(copied.statusCode, 200);
  assert.match(copied.body.source.content, /Complete source content/);
  assert.equal(copied.body.source.version, '1.0.0');
  assert.match(copied.headers['cache-control'], /private, no-store/);
  const snapshot = (await app.call('admin', { admin: true })).body;
  assert.deepEqual(snapshot.stats, { userCount: 1, keyCount: 1, activeKeyCount: 1, openCount: 0, copyCount: 1, downloadCount: 0 });
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.events[0].userId, issued.user.id);
  assert.equal(snapshot.events[0].keyId, issued.key.id);
  assert.equal(snapshot.events[0].sourceId, 'first-source');
  assert.equal(snapshot.events[0].kind, 'copy');
  assert.equal(snapshot.userSourceStats[0].copyCount, 1);
  assert.equal(snapshot.sourceStats[0].openCount, 0);
});

test('allowlist and scope apply to every kind of content retrieval', async () => {
  const app = setup();
  const issued = await app.issue({ sourceIds: ['first-source'] });
  const { cookie } = await app.unlock(issued.rawKey);
  for (const kind of ['open', 'copy', 'download']) {
    assert.equal((await app.call('take', { cookie, body: { id: 'second-source', kind } })).statusCode, 403);
    assert.equal((await app.call('take', { cookie, body: { id: 'first-source', kind } })).statusCode, 200);
  }
  for (const id of ['../.env', 'source/first.md', '%2e%2e', 'missing-source', 123, null]) {
    assert.equal((await app.call('take', { cookie, body: { id, kind: 'download' } })).statusCode, 404);
  }
  assert.equal((await app.call('take', { cookie, body: { id: 'first-source', kind: 'arbitrary' } })).statusCode, 400);
  assert.deepEqual(app.reads, ['first-source', 'first-source', 'first-source']);
  assert.equal((await app.call('admin', { admin: true })).body.events.length, 3);
});

test('revocation immediately invalidates all already issued sessions and cannot be undone by unlock', async () => {
  const app = setup();
  const issued = await app.issue();
  const first = await app.unlock(issued.rawKey), second = await app.unlock(issued.rawKey);
  const revoked = await app.call('revoke-key', { admin: true, body: { id: issued.key.id } });
  assert.equal(revoked.statusCode, 200);
  assert.ok(revoked.body.key.revokedAt);
  for (const { cookie } of [first, second]) {
    assert.equal((await app.call('session', { cookie })).body.authenticated, false);
    assert.equal((await app.call('take', { cookie, body: { id: 'first-source', kind: 'download' } })).statusCode, 401);
  }
  assert.equal((await app.unlock(issued.rawKey)).response.statusCode, 401);
  assert.equal(app.reads.length, 0);
});

test('key expiry and independent seven-day session expiry are enforced at exact boundaries', async () => {
  const app = setup();
  const limited = await app.issue({ expiresDays: 1 });
  const first = await app.unlock(limited.rawKey);
  assert.match(first.response.headers['set-cookie'], /Max-Age=86400/);
  app.advance(86400000);
  assert.equal((await app.call('session', { cookie: first.cookie })).body.authenticated, false);
  assert.equal((await app.unlock(limited.rawKey)).response.statusCode, 401);
  const unlimited = await app.issue();
  const next = await app.unlock(unlimited.rawKey);
  app.advance(7 * 86400000);
  assert.equal((await app.call('take', { cookie: next.cookie, body: { id: 'first-source', kind: 'open' } })).statusCode, 401);
  assert.equal((await app.unlock(unlimited.rawKey)).response.statusCode, 200);
});

test('revocation or expiry while reading prevents both response content and serve event', async () => {
  for (const change of ['revoke', 'expire']) {
    const app = setup();
    const issued = await app.issue({ expiresDays: 1 });
    const { cookie } = await app.unlock(issued.rawKey);
    const racing = createShelfHandler({ ...app.dependencies, readSource: async () => {
      if (change === 'revoke') await app.repository.revokeKey(issued.key.id, new Date('2026-09-14T00:00:01Z'));
      else app.advance(86400000);
      return 'MUST NOT BE RETURNED';
    } });
    const response = await app.call('take', { handler: racing, cookie, body: { id: 'first-source', kind: 'open' } });
    assert.equal(response.statusCode, 401);
    assert.ok(!JSON.stringify(response.body).includes('MUST NOT'));
    assert.equal((await app.repository.adminSnapshot(new Date())).events.length, 0);
  }
});

test('cross-origin, cross-site, invalid JSON and oversized bodies stop before storage or content', async () => {
  const app = setup({ getRepository: async () => { throw new Error('must not access'); } });
  assert.equal((await app.call('unlock', { headers: { origin: 'https://attacker.test' } })).statusCode, 403);
  assert.equal((await app.call('unlock', { headers: { 'sec-fetch-site': 'cross-site', origin: '' } })).statusCode, 403);
  assert.equal((await app.call('unlock', { headers: { 'content-type': 'text/plain' } })).statusCode, 415);
  assert.equal((await app.call('unlock', { rawBody: '{' })).statusCode, 400);
  assert.equal((await app.call('unlock', { rawBody: '[]' })).statusCode, 400);
  assert.equal((await app.call('unlock', { rawBody: JSON.stringify({ key: 'x'.repeat(9000) }) })).statusCode, 413);
  assert.equal((await app.call('unlock', { headers: { 'content-length': '9000' } })).statusCode, 413);
});

test('unlock rate limit is shared between instances and resets after the window', async () => {
  const app = setup();
  const secondHandler = createShelfHandler(app.dependencies);
  for (let i = 0; i < 8; i++) assert.equal((await app.call('unlock', { handler: i % 2 ? secondHandler : app.handler, body: { key: 'wrong' } })).statusCode, 401);
  const blocked = await app.call('unlock', { handler: secondHandler, body: { key: 'wrong' } });
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['retry-after']) > 0);
  assert.equal((await app.call('unlock', { ip: '192.0.2.2', body: { key: 'wrong' } })).statusCode, 401);
  app.advance(15 * 60000);
  assert.equal((await app.call('unlock', { body: { key: 'wrong' } })).statusCode, 401);
});

test('logout deletes server session and clears cookie; returning key is still usable', async () => {
  const app = setup(); const issued = await app.issue(); const { cookie } = await app.unlock(issued.rawKey);
  const response = await app.call('logout', { cookie });
  assert.equal(response.body.authenticated, false);
  assert.match(response.headers['set-cookie'], /Max-Age=0/);
  assert.equal((await app.call('session', { cookie })).body.authenticated, false);
  assert.equal((await app.unlock(issued.rawKey)).response.statusCode, 200);
});

test('invalid issuance is rejected; another key can explicitly reuse a recipient', async () => {
  const app = setup();
  for (const body of [{ name: '' }, { name: 'x'.repeat(101) }, { name: 'A', expiresDays: -1 }, { name: 'A', expiresDays: 366 }, { name: 'A', sourceIds: ['unknown'] }, { name: 'A', sourceIds: 'all' }]) {
    assert.equal((await app.call('create-key', { admin: true, body })).statusCode, 400);
  }
  const first = await app.issue();
  const second = await app.issue({ userId: first.user.id, name: 'not the assigned identity' });
  assert.equal(second.user.id, first.user.id);
  assert.equal(second.key.name, first.key.name);
  assert.notEqual(first.rawKey, second.rawKey);
  const snapshot = (await app.call('admin', { admin: true })).body;
  assert.equal(snapshot.stats.userCount, 1);
  assert.equal(snapshot.users[0].keyCount, 2);
});

test('all-time sauce aggregates are not derived from the last 200 events', async () => {
  const app = setup(); const issued = await app.issue(); const { cookie } = await app.unlock(issued.rawKey);
  for (let i = 0; i < 205; i++) await app.call('take', { cookie, body: { id: 'first-source', kind: 'download' } });
  const snapshot = (await app.call('admin', { admin: true })).body;
  assert.equal(snapshot.events.length, 200);
  assert.equal(snapshot.eventsTotal, 205);
  assert.equal(snapshot.eventsHasMore, true);
  assert.equal(snapshot.sourceStats[0].downloadCount, 205);
  assert.equal(snapshot.userSourceStats[0].downloadCount, 205);
});

test('failed source read or audit storage fails closed without a phantom successful event', async () => {
  const app = setup(); const issued = await app.issue(); const { cookie } = await app.unlock(issued.rawKey);
  const brokenReader = createShelfHandler({ ...app.dependencies, readSource: async () => { throw new Error('PRIVATE FILE PATH'); } });
  const first = await app.call('take', { handler: brokenReader, cookie, body: { id: 'first-source', kind: 'open' } });
  assert.equal(first.statusCode, 503);
  const brokenAudit = createShelfHandler({ ...app.dependencies, getRepository: async () => ({ ...app.repository, recordServe: async () => { throw new Error('DATABASE URL'); } }) });
  const second = await app.call('take', { handler: brokenAudit, cookie, body: { id: 'first-source', kind: 'copy' } });
  assert.equal(second.statusCode, 503);
  assert.doesNotMatch(JSON.stringify([first.body, second.body]), /PRIVATE|DATABASE|Complete/);
  assert.equal((await app.repository.adminSnapshot(new Date())).events.length, 0);
});

test('SQL serving rechecks active key, session and scope in same database write', async () => {
  const calls = [];
  const repo = createSqlShelfRepository({ query: async (sql, params) => { calls.push({ sql, params }); return []; } });
  assert.equal(await repo.recordServe('session-hash', catalog.sources[0], 'download', new Date()), false);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /s\.expires_at>\$2/);
  assert.match(calls[0].sql, /k\.revoked_at IS NULL/);
  assert.match(calls[0].sql, /k\.expires_at>\$2/);
  assert.match(calls[0].sql, /k\.source_ids \? \$4/);
  assert.deepEqual(calls[0].params.slice(3, 7), ['first-source', 'First', '1.0.0', 'download']);
  assert.ok(SHELF_SCHEMA.every(statement => !/mc_accounts|xty_|mc_backoffice/.test(statement)));
});

test('canonical catalog and complete source bodies load without letting supplied paths escape', async () => {
  const actual = await readShelfCatalog();
  assert.equal(actual.sources.length, 3);
  for (const source of actual.sources) {
    const content = await readShelfSource(source);
    assert.ok(content.length > 100, source.id);
    assert.equal(typeof content, 'string');
  }
  await assert.rejects(readShelfSource({ path: '../.env' }));
  await assert.rejects(readShelfSource({ path: '/etc/passwd' }));
  await assert.rejects(readShelfSource({ path: 'source/../../package.json' }));
  assert.equal(shelfCatalogPreview(actual).sources.length, actual.sources.length);
});
