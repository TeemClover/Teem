import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { notificationText, bookingFromRow } from './meet-notify.js';

// Exercise the production handler/validation and its SQL parameters. This is a
// contract test with an in-memory database boundary, not a deployed DB proof.
let queries = [];
let notifications = [];
const sql = { async query(statement, values = []) {
  queries.push({ statement, values });
  if (statement.includes('SELECT COUNT')) return [{ hits: 0 }];
  if (statement.includes('INSERT INTO mc_meet_bookings')) return [{ reference: values[0] }];
  return [];
} };
mock.module('./core.js', { namedExports: {
  database: () => sql,
  sendJson: (res, body, status = 200) => { res.status = status; res.body = body; },
} });
mock.module('./meet-notify.js', { namedExports: {
  notifyBooking: async booking => { notifications.push(booking); return {}; },
  deliveryStatus: () => 'unconfigured',
  bookingFromRow,
} });
const { default: handler } = await import('../meet.js');
const base = {
  intent: 'ai', topic: 'private', mode: 'ออนไลน์', day: 'flexible', time: 'เวลาไหนก็ได้',
  name: 'ผู้ทดลอง', contact: 'fixture@example.test', note: 'มีงานที่อยากลอง', website: '',
};
async function post(changes = {}, headers = {}) {
  queries = []; notifications = [];
  const res = { setHeader() {} };
  await handler({ method: 'POST', body: { ...base, ...changes }, headers: {
    host: 'localhost', origin: 'http://localhost', 'x-forwarded-proto': 'http', ...headers,
  } }, res);
  return res;
}
const inserted = () => queries.find(query => query.statement.includes('INSERT INTO mc_meet_bookings'));

for (const [topic, label] of Object.entries({
  private: 'เรียน 1–1 / Executive coaching', team: 'เวิร์กช็อปทีม / องค์กร',
  course: 'คอร์สย่อยของทีม', academy: 'แนะนำคอร์ส Pi R Academy', explore: 'ช่วยเลือกวิธีเรียน AI',
})) {
  test(`AI ${topic} validates and retains its bounded purpose in existing persistence/notification contract`, async () => {
    const res = await post({ topic });
    assert.equal(res.status, 201);
    assert.equal(res.body.ok, true);
    const values = inserted().values;
    assert.equal(values[1], 'ai');
    assert.equal(values[7], `[AI · ${label}] มีงานที่อยากลอง`);
    assert.equal(notifications[0].note, values[7]);
    assert.equal(notifications[0].intent, 'ai');
    assert.match(notificationText(notifications[0], ''), /เรียนและใช้ AI/);
    assert.ok(notificationText(notifications[0], '').includes(label));
  });
}

test('AI without a topic becomes an honest help-me-choose request', async () => {
  assert.equal((await post({ topic: undefined })).status, 201);
  assert.match(inserted().values[7], /ช่วยเลือกวิธีเรียน AI/);
});

test('unknown/malformed/prototype AI topics never insert or notify', async () => {
  for (const topic of ['unknown', '__proto__', 'constructor', 'team?secret=raw', {}, ['private']]) {
    const res = await post({ topic });
    assert.equal(res.status, 400);
    assert.equal(res.body.field, 'topic');
    assert.equal(inserted(), undefined);
    assert.equal(notifications.length, 0);
  }
});

test('AI cannot silently become a body check or buffet booking', async () => {
  for (const mode of ['เจอกัน + Body Check-in', 'Coffee / Buffet']) {
    assert.equal((await post({ mode })).status, 400);
    assert.equal(inserted(), undefined);
  }
  assert.equal((await post({ mode: 'เจอกันจริง' })).status, 201);
});

test('AI note remains bounded and strips control characters without truncating its purpose', async () => {
  await post({ topic: 'academy', note: `\u0000${'ก'.repeat(1500)}\n` });
  const note = inserted().values[7];
  assert.equal(note.length, 1000);
  assert.ok(note.startsWith('[AI · แนะนำคอร์ส Pi R Academy]'));
  assert.doesNotMatch(note, /[\u0000-\u001f]/);
});

test('all legacy intents still persist their original note and accepted mode', async () => {
  for (const [intent, mode] of [['health', 'เจอกัน + Body Check-in'], ['opportunity', 'ออนไลน์'], ['curious', 'Coffee / Buffet']]) {
    assert.equal((await post({ intent, mode, topic: 'irrelevant-future-topic' })).status, 201);
    assert.equal(inserted().values[1], intent);
    assert.equal(inserted().values[7], base.note);
  }
});

test('unknown intent, incomplete requests and invalid slots still reject before persistence', async () => {
  for (const changes of [{ intent: 'anything' }, { name: '' }, { contact: '' }, { day: '2026-02-30' }, { time: '26:00' }]) {
    assert.equal((await post(changes)).status, 400);
    assert.equal(inserted(), undefined);
    assert.equal(notifications.length, 0);
  }
});

test('cross-origin requests do not create AI requests', async () => {
  assert.equal((await post({}, { origin: 'https://elsewhere.test' })).status, 403);
  assert.equal(inserted(), undefined);
});

test('stored AI purpose survives existing retry row mapping without a schema change', async () => {
  await post({ topic: 'team' });
  const values = inserted().values;
  const row = { reference: values[0], intent: values[1], meet_mode: values[2], pref_day: values[3], pref_time: values[4], name: values[5], contact: values[6], note: values[7] };
  assert.equal(notificationText(bookingFromRow(row), ''), notificationText(notifications[0], ''));
});

test('Xircle focus is validated, bounded and retained in existing note/notification fields', async () => {
  for (const [focus, label] of Object.entries({ sleep: 'การพัก', move: 'การขยับ', food: 'การกิน' })) {
    assert.equal((await post({ intent: 'health', focus })).status, 201);
    assert.equal(inserted().values[7], `[XIRCLE · จุดเริ่ม: ${label}] ${base.note}`);
    assert.equal(notifications[0].note, inserted().values[7]);
  }
  await post({ intent: 'health', focus: 'sleep', note: 'ก'.repeat(1500) });
  assert.equal(inserted().values[7].length, 1000);
});

test('invalid Xircle focus rejects before persistence or notifications', async () => {
  for (const focus of ['__proto__', 'constructor', 'sleep?raw=value', {}, ['sleep']]) {
    const result = await post({ intent: 'health', focus });
    assert.equal(result.status, 400); assert.equal(result.body.field, 'focus');
    assert.equal(inserted(), undefined); assert.equal(notifications.length, 0);
  }
});

test('absent Xircle focus preserves legacy note; non-health booking never inherits health context', async () => {
  for (const focus of [undefined, null, '']) {
    assert.equal((await post({ intent: 'health', focus })).status, 201);
    assert.equal(inserted().values[7], base.note);
  }
  await post({ intent: 'curious', focus: 'sleep' });
  assert.equal(inserted().values[7], base.note);
});

test('Compass opportunity context uses bounded labels in the existing note and notifications', async () => {
  for (const [need, label] of Object.entries({ 'first-test': 'ลองก้าวแรกให้เห็นภาพ', partner: 'คุยเรื่องหาคนร่วมทำ', mentor: 'คุยกับคนที่ช่วยมองทางได้' })) {
    const result = await post({ intent: 'opportunity', entry: 'compass', need, offer: 'skill' });
    assert.equal(result.status, 201);
    assert.equal(inserted().values[7], `[Compass · โอกาสและคนร่วมทาง · ${label} · ทักษะที่มี] ${base.note}`);
    assert.equal(notifications[0].note, inserted().values[7]);
  }
  for (const offer of ['time', 'project']) assert.equal((await post({ intent: 'opportunity', entry: 'compass', offer })).status, 201);
  await post({ intent: 'opportunity', entry: 'compass', need: 'mentor', offer: 'project', note: 'ก'.repeat(1500) });
  assert.equal(inserted().values[7].length, 1000);
});

test('unknown Compass opportunity context rejects before persistence; legacy flow is unchanged', async () => {
  for (const field of ['need', 'offer']) {
    for (const value of ['constructor', '__proto__', 'partner?raw=data', {}, ['skill']]) {
      const result = await post({ intent: 'opportunity', entry: 'compass', [field]: value });
      assert.equal(result.status, 400); assert.equal(result.body.field, field);
      assert.equal(inserted(), undefined); assert.equal(notifications.length, 0);
    }
  }
  assert.equal((await post({ intent: 'opportunity', entry: 'compass' })).status, 201);
  assert.equal(inserted().values[7], `[Compass · โอกาสและคนร่วมทาง] ${base.note}`);
  await post({ intent: 'opportunity', need: 'partner', offer: 'skill' });
  assert.equal(inserted().values[7], base.note);
  await post({ intent: 'health', entry: 'compass', need: 'partner', offer: 'skill' });
  assert.equal(inserted().values[7], base.note);
});
