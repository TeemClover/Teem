import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdminCards, getAdminEvents, getAdminParties, getAdminSummary, getAdminSystem, getAdminUsers,
  normalizeAdminPartyQuery, normalizeAdminRange, normalizeAdminUserQuery,
  scrubAdminEventData, shortAdminUserId,
} from './xty-admin-stats.js';

class PlaceholderSql {
  async query(statement, values = []) {
    const placeholders = [...String(statement).matchAll(/\$(\d+)/g)].map(match => Number(match[1]));
    assert.equal(values.length, placeholders.length ? Math.max(...placeholders) : 0, String(statement).slice(0, 80));
    return [];
  }
}

test('admin ranges use the locked Bangkok day boundary', () => {
  const today = normalizeAdminRange('today', new Date('2026-08-16T20:00:00.000Z'));
  const week = normalizeAdminRange('7d', new Date('2026-08-16T20:00:00.000Z'));
  assert.equal(today.start.toISOString(), '2026-08-16T17:00:00.000Z');
  assert.equal(week.start.toISOString(), '2026-08-10T17:00:00.000Z');
  assert.equal(normalizeAdminRange('all').start, null);
});

test('admin list inputs are whitelisted before entering SQL', () => {
  const party = normalizeAdminPartyQuery({ status: 'active', sort: 'p.created_at;drop table', limit: '9999', cursor: 'bad' });
  assert.equal(party.status, 'ACTIVE');
  assert.equal(party.sort, 'last_activity');
  assert.equal(party.limit, 100);
  assert.equal(party.offset, 0);
  const user = normalizeAdminUserQuery({ account: 'BOUND', level: '4', active: 'today', sort: 'cards' });
  assert.deepEqual({ account: user.account, level: user.level, active: user.active, sort: user.sort }, {
    account: 'bound', level: 4, active: 'today', sort: 'cards',
  });
});

test('event metadata keeps diagnostics but strips PII and message content', () => {
  const safe = scrubAdminEventData({
    alias: 'ส้ม', cardId: 'ORANGE_CAT_GREEN_COMMON_001', email: 'secret@example.com',
    token: 'secret-token', body: 'private message', actorId: 'account:secret',
  });
  assert.deepEqual(safe, { alias: 'ส้ม', cardId: 'ORANGE_CAT_GREEN_COMMON_001' });
});

test('admin exposes short diagnostic ids instead of raw account ids', () => {
  assert.equal(shortAdminUserId('account:12345678-secret-rest'), 'A-12345678');
  assert.equal(shortAdminUserId('local:abcdefghijk'), 'G-abcdefgh');
});

test('admin aggregate and list queries bind every placeholder exactly once', async () => {
  const sql = new PlaceholderSql(); const at = new Date('2026-08-16T12:00:00.000Z');
  const summary = await getAdminSummary(sql, 'today', at);
  assert.equal(summary.users.total, 0);
  await getAdminParties(sql, { status: 'ACTIVE', visibility: 'public' }, at);
  await getAdminUsers(sql, { account: 'guest', active: '7d' }, at);
  await getAdminCards(sql);
  await getAdminSystem(sql);
  await getAdminEvents(sql, { type: 'PARTY_CREATED' });
});
