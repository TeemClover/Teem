import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createLocalMeet, LOCAL_MEET_ADMIN_KEY } from './helpers/meet-local.mjs';

const base = { intent: 'ai', topic: 'team', mode: 'ออนไลน์', day: '2026-10-01', time: '14:00', name: 'Local fixture', contact: 'fixture@example.test', note: 'งานของทีม', website: '' };
function request(body = base, options = {}) {
  return new Request('http://127.0.0.1:4174/api/meet', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:4174', ...options.headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
async function local(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'meet-sqlite-test-'));
  const filename = path.join(dir, 'meet.sqlite');
  const meet = createLocalMeet(filename);
  t.after(async () => { try { meet.close(); } catch {} await rm(dir, { recursive: true, force: true }); });
  return { meet, filename };
}
test('real Meet validation INSERT/SELECT produces a durable local receipt with exact requested facts', async t => {
  const { meet, filename } = await local(t);
  const response = await meet.fetch(request());
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.deepEqual(result.receipt, { env: 'local', notifications: 'disabled' });
  assert.match(result.reference, /^LOCAL-MEET-[A-F0-9]{8}$/);
  assert.equal(result.notified, false);
  const row = meet.sqlite.prepare('SELECT * FROM mc_meet_bookings WHERE reference=?').get(result.reference);
  assert.equal(row.pref_day, base.day); assert.equal(row.pref_time, base.time);
  assert.equal(row.intent, 'ai'); assert.equal(row.meet_mode, 'ออนไลน์');
  assert.equal(row.note, '[AI · เวิร์กช็อปทีม / องค์กร] งานของทีม');
  assert.equal(row.status, 'new'); assert.equal(row.notify_status, 'unconfigured');
  assert.equal(row.notified_at, null);
  assert.equal(JSON.parse(row.notify_detail).line.detail, 'LOCAL_NOTIFICATIONS_DISABLED');
  meet.close();
  const reopened = createLocalMeet(filename);
  try { assert.equal(reopened.sqlite.prepare('SELECT reference FROM mc_meet_bookings').get().reference, result.reference); }
  finally { reopened.close(); }
});
test('unknown AI topic, malformed date, wrong origin and oversized requests persist no rows', async t => {
  const { meet } = await local(t);
  assert.equal((await meet.fetch(request({ ...base, topic: '__proto__' }))).status, 400);
  assert.equal((await meet.fetch(request({ ...base, day: '2026-02-30' }))).status, 400);
  assert.equal((await meet.fetch(request(base, { headers: { origin: 'https://elsewhere.test' } }))).status, 403);
  assert.equal((await meet.fetch(request('not json'))).status, 400);
  assert.equal((await meet.fetch(request({ ...base, note: 'a'.repeat(20000) }))).status, 413);
  assert.equal(meet.sqlite.prepare('SELECT COUNT(*) count FROM mc_meet_bookings').get().count, 0);
});
test('local admin queue reads committed requests and changes status using real SQL', async t => {
  const { meet } = await local(t);
  await meet.fetch(request({ ...base, intent: 'health', focus: 'sleep', mode: 'เจอกัน + Body Check-in', note: 'local health fixture' }));
  const url = 'http://127.0.0.1:4174/api/meet';
  assert.equal((await meet.fetch(new Request(url))).status, 401);
  const headers = { 'x-admin-key': LOCAL_MEET_ADMIN_KEY };
  const queue = await (await meet.fetch(new Request(url, { headers }))).json();
  assert.equal(queue.bookings.length, 1);
  assert.deepEqual(queue.channels, { line: false, telegram: false });
  assert.equal(queue.bookings[0].intent, 'health');
  assert.equal(queue.bookings[0].note, '[XIRCLE · จุดเริ่ม: การพัก] local health fixture');
  const patch = await meet.fetch(new Request(url, { method: 'PATCH', headers, body: JSON.stringify({ id: queue.bookings[0].id, action: 'set_status', status: 'contacted' }) }));
  assert.equal(patch.status, 200);
  assert.equal(meet.sqlite.prepare('SELECT status FROM mc_meet_bookings').get().status, 'contacted');
});
test('actual SQLite enforces rate limit; forwarded IP spoof cannot bypass local isolation', async t => {
  const { meet } = await local(t);
  for (let i = 0; i < 5; i++) assert.equal((await meet.fetch(request())).status, 201);
  assert.equal((await meet.fetch(request(base, { headers: { 'x-forwarded-for': 'different-ip' } }))).status, 429);
  assert.equal(meet.sqlite.prepare('SELECT COUNT(*) count FROM mc_meet_bookings').get().count, 5);
  assert.equal((await meet.fetch(new Request('https://production.example/api/meet'))).status, 403);
});
