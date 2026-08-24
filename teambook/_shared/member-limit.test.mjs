import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeMemberLimit } from './member-limit.js';
import { memberLimitSql } from '../api/_lib/member-limit.js';

const ROOT = new URL('..', import.meta.url).pathname;

test('member limits normalize to the shared 1–11 contract', () => {
  assert.equal(normalizeMemberLimit(1), 1);
  assert.equal(normalizeMemberLimit(11), 11);
  assert.equal(normalizeMemberLimit(0), 1);
  assert.equal(normalizeMemberLimit(12), 11);
  assert.equal(normalizeMemberLimit('7'), 7);
  assert.equal(normalizeMemberLimit('bad'), 5);
});

test('capacity SQL is shared, bounded, and rejects request-authored fragments', () => {
  const expression = memberLimitSql('p.id');
  assert.match(expression, /PARTY_CREATED/);
  assert.match(expression, /memberLimit/);
  assert.match(expression, /LEAST\(11,GREATEST\(1/);
  assert.throws(() => memberLimitSql('p.id); DROP TABLE books;--'), /INVALID_BOOK_ID_SQL/);
});

test('admin stats and member book state use the same per-book limit', () => {
  const admin = readFileSync(join(ROOT, 'api/_lib/xty-admin-stats-v2.js'), 'utf8');
  const partyRoute = readFileSync(join(ROOT, 'api/teambook/[...path].js'), 'utf8');
  const partyPage = readFileSync(join(ROOT, 'p/index.html'), 'utf8');
  assert.match(admin, /memberLimitSql\('p\.id'\)/);
  assert.match(admin, /maxMembers: normalizeMemberLimit\(row\.member_limit\)/);
  assert.match(partyRoute, /memberLimit: normalizeMemberLimit\(row\.member_limit\)/);
  assert.match(partyPage, /normalizeMemberLimit\(p\.memberLimit\)/);
  assert.doesNotMatch(admin, /maxMembers:\s*5|member_count[^\n]*(?:>=|<)\s*5/);
});
