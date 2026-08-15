import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.XTY_PET_AI = 'on';
process.env.GROQ_API_KEY = 'gsk-test';

let respond = async () => { throw new Error('no stub installed'); };
globalThis.fetch = (url, init) => respond(url, init);

const { sanitize, aiConfigured, hasPersona, readAndRespond } =
  await import('./pet-brain.js');

test('legacy QUIET / empty output is rejected so caller can fall back', () => {
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

test('config + detailed and registry persona gates', () => {
  assert.equal(aiConfigured(), true);
  assert.equal(hasPersona('crow'), true);
  assert.equal(hasPersona('fox'), true);
  assert.equal(hasPersona('unicorn'), true);
  assert.equal(hasPersona('__proto__'), false);
  assert.equal(hasPersona('not-a-pet'), false);
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

test('Groq request carries the real log, roster, rule and always-speak guards', async () => {
  let sent = null;
  let endpoint = null;
  let headers = null;
  respond = async (url, init) => {
    endpoint = String(url);
    headers = init.headers;
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({
      id: 'chatcmpl_1', object: 'chat.completion', model: 'openai/gpt-oss-20b',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'แพรวิ่งแล้ววันนี้\nนนท์เลื่อนไปพรุ่งนี้ — จดไว้แล้ว' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const out = await readAndRespond({
    party, context, log,
    ownRecent: [{ body: 'เมื่อวานครบทุกคน', sent_at: '2026-08-13T11:00:00Z' }],
    since: new Date('2026-08-14T01:00:00Z'), hour: 12,
  });

  assert.deepEqual(out, ['แพรวิ่งแล้ววันนี้', 'นนท์เลื่อนไปพรุ่งนี้ — จดไว้แล้ว']);
  assert.equal(endpoint, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(headers.Authorization, 'Bearer gsk-test');
  assert.equal(sent.model, 'openai/gpt-oss-20b');
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.reasoning_format, 'hidden');
  assert.equal(sent.max_completion_tokens, 300);
  assert.equal(sent.stream, false);
  assert.equal(sent.messages.length, 1);
  assert.equal(sent.messages[0].role, 'user');

  const prompt = sent.messages[0].content;
  assert.match(prompt, /NPC สัตว์ประจำตี้/);
  assert.match(prompt, /ไม่ใช่ AI assistant/);
  assert.match(prompt, /เท่าเทียมกับตัวเอง/);
  assert.match(prompt, /กา/);
  assert.match(prompt, /วิ่งอย่างน้อย 20 นาที/);
  assert.match(prompt, /แพร \(หัวตี้\)/);
  assert.match(prompt, /12:27 น\./);
  assert.match(prompt, /ทุกครั้งที่ตื่นต้องพูดอย่างน้อย 1 บรรทัด/);
  assert.match(prompt, /ห้ามตอบ QUIET/);
  assert.match(prompt, /แพร · COMMIT/);
  assert.match(prompt, /นนท์: วันนี้ฝนตก ไว้พรุ่งนี้/);
  assert.match(prompt, /ถอนข้อความออกไป/);
  assert.match(prompt, /รีแอค: 🔥×2/);
  assert.match(prompt, /เมื่อวานครบทุกคน/);
  assert.match(prompt, /08:30/);
});

test('a content filter means caller fallback, an API error means fallback', async () => {
  respond = async () => new Response(JSON.stringify({
    id: 'chatcmpl_2',
    choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'content_filter' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), []);

  respond = async () => new Response('{"error":{"message":"provider down"}}', { status: 500, headers: { 'content-type': 'application/json' } });
  assert.equal(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), null);
});

test('no Groq key or flag off means fallback, never a call', async () => {
  respond = async () => { throw new Error('must not call the API'); };
  process.env.XTY_PET_AI = 'off';
  assert.equal(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), null);
  process.env.XTY_PET_AI = 'on';

  delete process.env.GROQ_API_KEY;
  assert.equal(await readAndRespond({ party, context, log, ownRecent: [], since: new Date(), hour: 12 }), null);
  process.env.GROQ_API_KEY = 'gsk-test';
});

test('an idle window explicitly asks the NPC to start a conversation', async () => {
  let sent = null;
  respond = async (url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({
      id: 'chatcmpl_3',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'รอบนี้เงียบแฮะ — ถ้าวันนี้จะวิ่งนิดเดียว อยากออกช่วงไหนกัน' },
        finish_reason: 'stop',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const out = await readAndRespond({
    party, context: { ...context, humanUpdates: 0 }, log: [],
    ownRecent: [], since: new Date('2026-08-16T05:27:00Z'), hour: 18, idleWindow: true,
  });
  assert.equal(out.length, 1);

  const prompt = sent.messages[0].content;
  assert.match(prompt, /รอบนี้ยังไม่มีความเคลื่อนไหวใหม่/);
  assert.match(prompt, /เปิดบทสนทนาเอง/);
  assert.match(prompt, /ห้ามสมมติว่าใครทำอะไร/);
});

const { worthReading } = await import('../xty-pet.js');

test('every due active pet is read on every wake', () => {
  assert.equal(worthReading(0, { humanUpdates: 0 }), true);
  assert.equal(worthReading(6, { humanUpdates: 0 }), true);
  assert.equal(worthReading(12, { humanUpdates: 0 }), true);
  assert.equal(worthReading(18, { humanUpdates: 0 }), true);
  assert.equal(worthReading(12, { humanUpdates: 5 }), true);
});
