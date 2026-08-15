import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  adminLoginBlocked, adminPasswordMatches, adminSessionCookie, clearAdminSessionCookie,
  createAdminSession, currentAdminSession, destroyAdminSession, recordAdminLoginFailure,
  XTY_ADMIN_LOGIN_LIMIT,
} from './xty-admin-auth.js';

class AdminMemorySql {
  sessions = new Map();
  hits = new Map();
  audit = [];
  async query(statement, values = []) {
    const sql = statement.replace(/\s+/g, ' ').trim();
    if (sql.startsWith('SELECT hits,expires_at FROM xty_admin_login_hits')) {
      const row = this.hits.get(values[0]); return row ? [row] : [];
    }
    if (sql.startsWith('INSERT INTO xty_admin_login_hits')) {
      const current = this.hits.get(values[0]) || { hits: 0, expires_at: values[1] };
      current.hits += 1; current.expires_at = values[1]; this.hits.set(values[0], current);
      return [{ hits: current.hits }];
    }
    if (sql.startsWith('INSERT INTO xty_admin_audit')) { this.audit.push({ type: values[0], data: values[2] }); return []; }
    if (sql.startsWith('INSERT INTO xty_admin_sessions')) {
      this.sessions.set(values[0], { token_hash: values[0], created_at: values[1], expires_at: values[2] }); return [];
    }
    if (sql.startsWith('SELECT token_hash,created_at,expires_at FROM xty_admin_sessions')) {
      const row = this.sessions.get(values[0]); return row ? [row] : [];
    }
    if (sql.startsWith('DELETE FROM xty_admin_sessions WHERE token_hash')) {
      const existed = this.sessions.delete(values[0]); return existed ? [{ token_hash: values[0] }] : [];
    }
    if (sql.startsWith('DELETE FROM xty_admin_sessions WHERE expires_at')) return [];
    if (sql.startsWith('DELETE FROM xty_admin_login_hits WHERE expires_at')) return [];
    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

const request = cookie => ({ headers: { cookie: cookie || '', 'x-forwarded-for': '203.0.113.8' }, socket: {} });

test('admin password comparison is server-side and constant-length', () => {
  assert.equal(adminPasswordMatches('server-secret', 'server-secret'), true);
  assert.equal(adminPasswordMatches('wrong', 'server-secret'), false);
  assert.equal(adminPasswordMatches('', ''), false);
});

test('admin cookie is isolated, HttpOnly, Secure and Strict', () => {
  const cookie = adminSessionCookie('token');
  assert.match(cookie, /^xty_admin_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(clearAdminSessionCookie(), /Max-Age=0/);
});

test('admin session can be created, read and revoked without storing the raw token', async () => {
  const sql = new AdminMemorySql(); const req = request();
  const created = await createAdminSession(sql, req, new Date('2026-08-16T00:00:00.000Z'));
  assert.equal([...sql.sessions.keys()].includes(created.token), false);
  const cookieReq = request(`xty_admin_session=${encodeURIComponent(created.token)}`);
  assert.ok(await currentAdminSession(sql, cookieReq, new Date('2026-08-16T01:00:00.000Z')));
  await destroyAdminSession(sql, cookieReq, new Date('2026-08-16T02:00:00.000Z'));
  assert.equal(await currentAdminSession(sql, cookieReq, new Date('2026-08-16T02:00:01.000Z')), null);
  assert.deepEqual(sql.audit.map(row => row.type), ['ADMIN_LOGIN_SUCCESS', 'ADMIN_LOGOUT']);
});

test('five failed attempts lock the IP bucket', async () => {
  const sql = new AdminMemorySql(); const req = request(); const at = new Date('2026-08-16T00:00:00.000Z');
  for (let index = 0; index < XTY_ADMIN_LOGIN_LIMIT; index += 1) await recordAdminLoginFailure(sql, req, at);
  assert.equal(await adminLoginBlocked(sql, req, at), true);
  assert.equal(sql.audit.every(row => row.type === 'ADMIN_LOGIN_FAILED'), true);
});

test('the private password is absent from every admin frontend asset', async () => {
  const files = await Promise.all([
    readFile(new URL('../../xty/stat/admin/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../xty/stat/admin/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../../xty/stat/admin/admin.css', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(files.join('\n').toLowerCase(), /calling/);
});
