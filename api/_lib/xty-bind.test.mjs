/* Binds an account to every profile id a device has ever used, against a fake
   Neon. Guards the two shapes that decide whether a party is recoverable:
   the id set that reaches SQL, and the refusal to invent an id.
   Needs --experimental-test-module-mocks — see npm run test:xty. */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let account = { id: 'acct1' };
const issued = [];

mock.module('../_lib/core.js', {
  namedExports: {
    clean: (value, max) => String(value ?? '').trim().slice(0, max),
    currentUser: async () => account,
    database: () => ({ async query(text, params) { issued.push([text.replace(/\s+/g, ' ').trim(), params]); return []; } }),
    ensureSchema: async () => {},
    sameOrigin: () => true,
    sendJson: (res, body, status = 200) => { res.body = body; res.status = status; return res; },
    sha256: async value => `sha(${value})`,
  },
});

const { default: handler } = await import('../xty/[...path].js');

function call(path, body, method = 'POST') {
  const res = { setHeader() {}, body: null, status: 0 };
  return handler({ method, url: path, headers: {}, body, query: {} }, res).then(() => res);
}

test('bind folds every past profile id into the account', async () => {
  issued.length = 0;
  const res = await call('/api/xty/bind', { profileId: 'current-one', profileIds: ['retired-a', 'retired-b', 'current-one'] });

  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.ok, true);

  const members = issued.find(([text]) => text.includes('local_members'));
  assert.ok(members, 'the member merge must run');
  const [, params] = members;
  assert.deepEqual([...params[0]].sort(), ['local:current-one', 'local:retired-a', 'local:retired-b']);
  assert.equal(params[1], 'account:acct1');

  /* Two old ids in one party would hit the same conflict target twice and
     Postgres aborts the whole statement, so the source must be deduped. */
  assert.match(members[0], /DISTINCT ON \(party_id\)/);
});

test('bind rejects a request with no usable id', async () => {
  const res = await call('/api/xty/bind', { profileId: '!!', profileIds: ['x'] });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'INVALID_PROFILE');
});

test('bind still needs a session', async () => {
  account = null;
  const res = await call('/api/xty/bind', { profileId: 'current-one' });
  account = { id: 'acct1' };
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'AUTH_REQUIRED');
});

test('creating a party without any identity is refused, not given a random one', async () => {
  account = null;
  const res = await call('/api/xty/party', { name: 'ตี้ผี', alias: 'คีน' });
  account = { id: 'acct1' };
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'PROFILE_REQUIRED');
});
