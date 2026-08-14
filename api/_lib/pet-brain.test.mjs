import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.XTY_PET_AI = 'on';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

/* The SDK captures globalThis.fetch when the client is constructed, so
   the stub is installed once and swapped through this handler. */
let respond = async () => { throw new Error('no stub installed'); };
globalThis.fetch = (url, init) => respond(url, init);

const { sanitize, aiConfigured, hasPersona, readAndRespond } =
  await import('./pet-brain.js');

test('QUIET means stay quiet', () => {
  assert.deepEqual(sanitize('QUIET'), []);
  assert.deepEqual(sanitize('  quiet \n'), []);
  assert.deepEqual(sanitize(''), []);
  assert.deepEqual(sanitize(null), []);
});

test('caps at three bubbles and strips list markers / quotes', () => {
  const out = sanitize('- หนึ่ง\n2. "สอง"\n• สาม\nสี่\nห้า');
  assert.deepEqual(out, ['หนึ่ง', 'สอง', 'สาม']);
});

test('a forbidden target drops the whole turn', () => {
  assert.deepEqual(sanitize('วันนี้ครบทุกคน\nน้ำหนักลดแน่'), []);
  assert.deepEqual(sanitize('ใครขี้เกียจบ้าง'), []);
  assert.deepEqual(sanitize('lazy today?'), []);
});

test('ordinary Thai containing risky substrings survives', () => {
  assert.deepEqual(sanitize('ทำจนเสร็จแล้วค่อยพัก'), ['ทำจนเสร็จแล้วค่อยพัก']);
  assert.deepEqual(sanitize('กลับบ้านแล้วเจอกัน'), ['กลับบ้านแล้วเจอกัน']);
  assert.deepEqual(sanitize('พุ่งไปข้างหน้า'), ['พุ่งไปข้างหน้า']);
});

test('long lines are clipped, not dropped', () => {
  const out = sanitize('ก'.repeat(400));
  assert.equal(out.length, 1);
  assert.equal(out[0].length, 160);
});

test('config + persona gates', () => {
  assert.equal(aiConfigured(), true);
  assert.equal(hasPersona('crow'), true);
  assert.equal(hasPersona('fox'), false);
  assert.equal(hasPersona('__proto__'), false);
});

const party = {
  id: 'p1', code: 'ABC-DEF', name: 'ตี้วิ่งเช้า',
  activity: 'วิ่ง 3 กม.', commit_rule: 'วิ่งอย่างน้อย 20 นาที', pet_id: 'crow',
};
const context = {
  committed: 2, humanUpdates: 3,
  members: [{ alias: 'แพร', role: 'lead' }, { alias: 'นนท์', role: 'member' }],
};
const log = [
  { seq: 4, kind: 'commit', body: '✓', sent_at: '2026-08-14T01:30:00Z', retracted: false, alias: 'แพร', reactions: '🔥×2' },
  { seq: 5, kind: 'message', body: 'วันนี้ฝนตก ไว้พรุ่งนี้', sent_at: '2026-08-14T03:00:00Z', retracted: false, alias: 'นนท์', reactions: '' },
  { seq: 6, kind: 'message', body: '', sent_at: '2026-08-14T03:10:00Z', retracted: true, alias: 'นนท์', reactions: '' },
];

test('request carries the real log, roster, rule and guards', async () => {
  let sent = null;
  respond = async (url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({
      id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5',
      stop_reason: 'end_turn', stop_sequence: null,
      content: [
        { type: 'thinking', thinking: 'พิจารณาก่อน' },
        { type: 'text', text: 'แพรวิ่งแล้ววันนี้\nนนท์เลื่อนไปพรุ่งนี้ — จดไว้แล้ว' },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const out = await readAndRespond({
    party, context, log,
    ownRecent: [{ body: 'เมื่อวานครบทุกคน', sent_at: '2026-08-13T11:00:00Z' }],
    since: new Date('2026-08-14T01:00:00Z'), hour: 12,
  });

  assert.deepEqual(out, ['แพรวิ่งแล้ววันนี้', 'นนท์เลื่อนไปพรุ่งนี้ — จดไว้แล้ว']);
  assert.equal(sent.model, 'claude-opus-5');
  assert.equal(sent.temperature, undefined);
  assert.equal(sent.thinking, undefined);
  assert.deepEqual(sent.output_config, { effort: 'low' });

  const sys = sent.system;
  assert.match(sys, /กา/);
  assert.match(sys, /วิ่งอย่างน้อย 20 นาที/);
  assert.match(sys, /แพร \(หัวตี้\)/);
  assert.match(sys, /12:00 น\./);
  assert.match(sys, /Roast the commitment/);
  assert.match(sys, /QUIET/);

  const user = sent.messages[0].content;
  assert.match(user, /แพร · COMMIT/);
  assert.match(user, /นนท์: วันนี้ฝนตก ไว้พรุ่งนี้/);
  assert.match(user, /ถอนข้อความออกไป/);
  assert.match(user, /รีแอค: 🔥×2/);
  assert.match(user, /เมื่อวานครบทุกคน/);
  assert.match(user, /08:30/);   // 01:30Z rendered in ICT
});

test('a refusal turns into silence, an API error into fallback', async () => {
  respond = async () => new Response(JSON.stringify({
    id: 'msg_2', type: 'message', role: 'assistant', model: 'claude-opus-5',
    stop_reason: 'refusal', content: [], usage: { input_tokens: 1, output_tokens: 1 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), []);

  respond = async () => new Response('{"type":"error"}', { status: 500, headers: { 'content-type': 'application/json' } });
  assert.equal(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), null);
});

test('no key or flag off means fallback, never a call', async () => {
  respond = async () => { throw new Error('must not call the API'); };
  process.env.XTY_PET_AI = 'off';
  assert.equal(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), null);
  process.env.XTY_PET_AI = 'on';

  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), null);
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
});

test('a day-long silence reads back to the last real activity, once', async () => {
  let sent = null;
  respond = async (url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({
      id: 'msg_3', type: 'message', role: 'assistant', model: 'claude-opus-5',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'เงียบไปวันนึงแล้ว — ยังอยู่กันไหม' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const out = await readAndRespond({
    party, context: { ...context, humanUpdates: 0 }, log,
    ownRecent: [], since: new Date('2026-08-12T03:00:00Z'), hour: 18, quietCheckin: true,
  });
  assert.deepEqual(out, ['เงียบไปวันนึงแล้ว — ยังอยู่กันไหม']);

  const user = sent.messages[0].content;
  assert.match(user, /เงียบมาเกินหนึ่งวันแล้ว/);
  assert.match(user, /ทักได้ครั้งเดียว/);
  assert.match(user, /นนท์: วันนี้ฝนตก ไว้พรุ่งนี้/);
});

const { worthReading } = await import('../xty-pet.js');
const hoursAgo = h => new Date(Date.now() - h * 3600000);

test('reading is gated so a dead party costs nothing', () => {
  /* anything happened → read */
  assert.equal(worthReading(12, { humanUpdates: 1, lastHumanAt: null, lastPetAt: null }), true);
  /* nothing happened, nothing to say */
  assert.equal(worthReading(12, { humanUpdates: 0, lastHumanAt: hoursAgo(50), lastPetAt: null }), false);
  assert.equal(worthReading(6, { humanUpdates: 0, lastHumanAt: hoursAgo(50), lastPetAt: null }), false);
  /* quiet a full day → one 18:00 check-in */
  assert.equal(worthReading(18, { humanUpdates: 0, lastHumanAt: hoursAgo(30), lastPetAt: null }), true);
  /* quiet, but not a full day yet */
  assert.equal(worthReading(18, { humanUpdates: 0, lastHumanAt: hoursAgo(10), lastPetAt: null }), false);
  /* already nudged since the last human post → never again until someone returns */
  assert.equal(worthReading(18, { humanUpdates: 0, lastHumanAt: hoursAgo(30), lastPetAt: hoursAgo(6) }), false);
  /* a party that never posted at all */
  assert.equal(worthReading(18, { humanUpdates: 0, lastHumanAt: null, lastPetAt: null }), false);
});
