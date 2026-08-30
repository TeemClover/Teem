import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationText, notifyBooking, deliveryStatus, bookingFromRow } from './meet-notify.js';

const booking = {
  reference: 'MEET-ABCD1234',
  intent: 'health',
  mode: 'เจอกัน + Body Check-in',
  day: 'พรุ่งนี้',
  time: 'เย็น',
  name: 'ตี๋',
  contact: '@teem',
  note: 'ขอที่จอดรถด้วย',
};

function withEnv(vars, run) {
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return (async () => run())().finally(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

const OFF = {
  LINE_CHANNEL_ACCESS_TOKEN: undefined,
  LINE_NOTIFY_USER_ID: undefined,
  TELEGRAM_BOT_TOKEN: undefined,
  TELEGRAM_CHAT_ID: undefined,
};

test('notification carries every fact needed to act without opening the queue', () => {
  const text = notificationText(booking, 'https://www.myclover.com/meet/admin/');
  for (const value of ['ตี๋', '@teem', 'พรุ่งนี้', 'เย็น', 'ขอที่จอดรถด้วย', 'MEET-ABCD1234']) {
    assert.ok(text.includes(value), `missing ${value}`);
  }
  assert.ok(text.includes('สุขภาพ'), 'intent id should be shown as a human label');
  assert.ok(text.includes('https://www.myclover.com/meet/admin/'));
});

test('an empty note leaves no dangling label', () => {
  const text = notificationText({ ...booking, note: '' }, '');
  assert.ok(!text.includes('โน้ต:'));
});

test('nothing configured reports unconfigured, not a delivery failure', async () => {
  await withEnv(OFF, async () => {
    const result = await notifyBooking(booking, '');
    assert.equal(result.line.status, 'skipped');
    assert.equal(result.telegram.status, 'skipped');
    assert.equal(deliveryStatus(result), 'unconfigured');
  });
});

test('one working channel still counts as delivered', () => {
  assert.equal(deliveryStatus({ line: { status: 'failed' }, telegram: { status: 'sent' } }), 'delivered');
  assert.equal(deliveryStatus({ line: { status: 'sent' }, telegram: { status: 'skipped' } }), 'delivered');
});

test('a configured channel that errors is a failure, so the queue can offer a retry', () => {
  assert.equal(deliveryStatus({ line: { status: 'failed' }, telegram: { status: 'skipped' } }), 'failed');
});

test('a dead provider never throws out of notifyBooking — the booking is already saved', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('getaddrinfo ENOTFOUND api.line.me'));
  try {
    await withEnv({
      LINE_CHANNEL_ACCESS_TOKEN: 'token',
      LINE_NOTIFY_USER_ID: 'U1',
      TELEGRAM_BOT_TOKEN: undefined,
      TELEGRAM_CHAT_ID: undefined,
    }, async () => {
      const result = await notifyBooking(booking, '');
      assert.equal(result.line.status, 'failed');
      assert.match(result.line.detail, /ENOTFOUND/);
      assert.equal(deliveryStatus(result), 'failed');
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a provider rejecting the token is reported with its status code', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(new Response('{"message":"Invalid reply token"}', { status: 401 }));
  try {
    await withEnv({
      LINE_CHANNEL_ACCESS_TOKEN: undefined,
      LINE_NOTIFY_USER_ID: undefined,
      TELEGRAM_BOT_TOKEN: 'bot:token',
      TELEGRAM_CHAT_ID: '42',
    }, async () => {
      const result = await notifyBooking(booking, '');
      assert.equal(result.telegram.status, 'failed');
      assert.match(result.telegram.detail, /HTTP 401/);
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a stored row maps onto the notification shape', () => {
  const mapped = bookingFromRow({
    reference: 'MEET-11112222',
    intent: 'opportunity',
    meet_mode: 'ออนไลน์',
    pref_day: 'สุดสัปดาห์',
    pref_time: 'บ่าย',
    name: 'บอส',
    contact: '0812345678',
    note: null,
  });
  assert.deepEqual(mapped, {
    reference: 'MEET-11112222',
    intent: 'opportunity',
    mode: 'ออนไลน์',
    day: 'สุดสัปดาห์',
    time: 'บ่าย',
    name: 'บอส',
    contact: '0812345678',
    note: '',
  });
  // A retry must reproduce the same message the first attempt would have sent.
  const text = notificationText(mapped, '');
  assert.ok(text.includes('สุดสัปดาห์ บ่าย'));
  assert.ok(!text.includes('undefined'));
});

test('a Gregorian requested slot survives notification formatting unchanged', () => {
  const text = notificationText({ ...booking, day: '2026-09-01', time: '18:30' }, '');
  assert.ok(text.includes('2026-09-01 18:30'));
});
