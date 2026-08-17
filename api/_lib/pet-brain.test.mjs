import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.XTY_PET_AI = 'on';
process.env.GROQ_API_KEY = 'gsk-test';
delete process.env.XTY_PET_VISION;

let respond = async () => { throw new Error('no stub installed'); };
globalThis.fetch = (url, init) => respond(url, init);

const {
  aiConfigured, hasPersona, isDirectedAtPet, readAndRespond,
  sanitize, sanitizeDecision, visionConfigured,
} = await import('./pet-brain.js');

const party = {
  id: 'p1', code: '12345', name: 'ตี้วิ่งเช้า',
  activity: 'วิ่ง 3 กม.', commit_rule: 'วิ่งอย่างน้อย 20 นาที', pet_id: 'crow',
};
const context = {
  committed: 2, humanUpdates: 3, timedThreadDue: false,
  members: [{ alias: 'แพร', role: 'lead' }, { alias: 'นนท์', role: 'member' }],
  lastHumanAt: new Date('2026-08-14T03:00:00Z'),
  lastPetAt: new Date('2026-08-14T01:00:00Z'),
};
const history = [
  { seq: 1, kind: 'pet', body: 'เมื่อวานฝนหยุดแล้วค่อยว่ากัน', sent_at: '2026-08-13T11:00:00Z', retracted: false, alias: 'กา', reactions: '' },
  { seq: 4, kind: 'commit', body: 'วิ่งสวนครบแล้ว', sent_at: '2026-08-14T01:30:00Z', retracted: false, alias: 'แพร', reactions: '🔥×2' },
  { seq: 5, kind: 'message', body: 'วันนี้ฝนตก ไว้พรุ่งนี้', sent_at: '2026-08-14T03:00:00Z', retracted: false, alias: 'นนท์', reactions: '' },
  { seq: 6, kind: 'message', body: '', sent_at: '2026-08-14T03:10:00Z', retracted: true, alias: 'นนท์', reactions: '' },
];

function completion(value) {
  return new Response(JSON.stringify({
    id: 'chatcmpl_test', object: 'chat.completion', model: 'openai/gpt-oss-20b',
    choices: [{
      index: 0, message: { role: 'assistant', content: JSON.stringify(value) }, finish_reason: 'stop',
    }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('config, persona and direct-name detection', () => {
  assert.equal(aiConfigured(), true);
  assert.equal(visionConfigured(), false);
  assert.equal(hasPersona('crow'), true);
  assert.equal(hasPersona('xvisor_white_cat_silver'), true);
  assert.equal(hasPersona('__proto__'), false);
  assert.equal(isDirectedAtPet('กา แกคิดว่าไง', 'crow'), true);
  assert.equal(isDirectedAtPet('แมวขาว ABCD คืออะไร?', 'xvisor_white_cat_silver'), true);
  assert.equal(isDirectedAtPet('วันนี้ทำงานเสร็จแล้ว', 'crow'), false);
});

test('legacy line sanitizer still strips QUIET and unsafe turns', () => {
  assert.deepEqual(sanitize('QUIET'), []);
  assert.deepEqual(sanitize(''), []);
  assert.deepEqual(sanitize('- หนึ่ง\n2. "สอง"\n• สาม\nสี่'), ['หนึ่ง', 'สอง', 'สาม']);
  assert.deepEqual(sanitize('ใครขี้เกียจบ้าง'), []);
});

test('structured sanitizer makes silence first-class', () => {
  assert.deepEqual(sanitizeDecision({
    behavior: 'QUIET', focus: '', open_threads: [], bubbles: ['ไม่ควรโผล่'],
  }), { behavior: 'QUIET', focus: '', openThreads: [], bubbles: [] });

  const alive = sanitizeDecision({
    behavior: 'CALLBACK', focus: 'นนท์เลื่อนไปพรุ่งนี้',
    open_threads: ['นนท์จะลองวิ่งพรุ่งนี้'],
    bubbles: ['นนท์บอกไว้พรุ่งนี้ — กาจำ thread นี้อยู่'],
  }, 'crow');
  assert.equal(alive.behavior, 'CALLBACK');
  assert.deepEqual(alive.openThreads, ['นนท์จะลองวิ่งพรุ่งนี้']);
  assert.equal(alive.bubbles.length, 1);
});

test('scheduled generic engagement copy is suppressed to QUIET', () => {
  const out = sanitizeDecision({
    behavior: 'ASK', focus: 'มี activity ใหม่', open_threads: [],
    bubbles: ['เห็นอัปเดตแล้วนะ มีใครอยากต่อเรื่องนี้ไหม'],
  }, 'dog', 'scheduled');
  assert.equal(out.behavior, 'QUIET');
  assert.deepEqual(out.bubbles, []);
});

test('Groq request uses strict schema and carries real multi-wake Party Log', async () => {
  let sent = null;
  let endpoint = null;
  respond = async (url, init) => {
    endpoint = String(url);
    sent = JSON.parse(init.body);
    return completion({
      behavior: 'CALLBACK',
      focus: 'แพรวิ่งสวนครบแล้ว แต่นนท์เลื่อนไปพรุ่งนี้',
      open_threads: ['นนท์ตั้งใจกลับมาวิ่งพรุ่งนี้'],
      bubbles: ['แพรวิ่งสวนครบแล้ว ส่วนนนท์เลื่อนไปพรุ่งนี้ — กาจำไว้ละ'],
    });
  };

  const out = await readAndRespond({
    party, context, history,
    since: new Date('2026-08-14T01:00:00Z'), hour: 12, trigger: 'scheduled',
  });

  assert.equal(endpoint, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(sent.model, 'openai/gpt-oss-20b');
  assert.equal(sent.response_format.type, 'json_schema');
  assert.equal(sent.response_format.json_schema.strict, true);
  assert.deepEqual(sent.response_format.json_schema.schema.properties.behavior.enum,
    ['QUIET', 'REACT', 'ACK', 'CALLBACK', 'ANSWER', 'TEASE', 'REMIND', 'ASK']);
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.reasoning_format, 'hidden');
  assert.equal(sent.stream, false);

  const prompt = sent.messages[0].content;
  assert.match(prompt, /QUIET เป็นคำตอบที่ดีและปกติ/);
  assert.match(prompt, /Persona มีหน้าที่กำหนด “พูดยังไง” เท่านั้น/);
  assert.match(prompt, /แพร: COMMIT — วิ่งสวนครบแล้ว/);
  assert.match(prompt, /นนท์: วันนี้ฝนตก ไว้พรุ่งนี้/);
  assert.match(prompt, /\[ถอนข้อความ\]/);
  assert.match(prompt, /reactions: 🔥×2/);
  assert.match(prompt, /กา \[PET\]: เมื่อวานฝนหยุดแล้วค่อยว่ากัน/);

  assert.equal(out.behavior, 'CALLBACK');
  assert.deepEqual(out.openThreads, ['นนท์ตั้งใจกลับมาวิ่งพรุ่งนี้']);
  assert.equal(out.bubbles[0], 'แพรวิ่งสวนครบแล้ว ส่วนนนท์เลื่อนไปพรุ่งนี้ — กาจำไว้ละ');
});

test('direct trigger prioritizes the actual addressed message', async () => {
  let sent = null;
  respond = async (_url, init) => {
    sent = JSON.parse(init.body);
    return completion({
      behavior: 'ANSWER', focus: 'ผู้เล่นถามกาตรง ๆ', open_threads: [],
      bubbles: ['ถ้าถามจาก log นี้ กายังไม่มีข้อมูล ABCD พอจะตอบแบบไม่เดา'],
    });
  };

  const out = await readAndRespond({
    party, context,
    history: [...history, {
      seq: 7, kind: 'message', body: 'กา ABCD คืออะไร?', sent_at: '2026-08-14T03:20:00Z',
      retracted: false, alias: 'แพร', reactions: '',
    }],
    since: new Date('2026-08-14T03:19:00Z'), hour: 12,
    trigger: 'direct', directText: 'กา ABCD คืออะไร?',
  });
  assert.equal(out.behavior, 'ANSWER');
  assert.match(sent.messages[0].content, /DIRECT MESSAGE — ต้องตอบสิ่งนี้ก่อน/);
  assert.match(sent.messages[0].content, /กา ABCD คืออะไร\?/);
});

test('provider failure returns null so scheduled caller can stay quiet', async () => {
  respond = async () => new Response('{"error":{"message":"provider down"}}', {
    status: 500, headers: { 'content-type': 'application/json' },
  });
  assert.equal(await readAndRespond({ party, context, history, since: new Date(), hour: 12 }), null);
});

test('no key or flag off means no AI call', async () => {
  respond = async () => { throw new Error('must not call the API'); };
  process.env.XTY_PET_AI = 'off';
  assert.equal(await readAndRespond({ party, context, history, since: new Date(), hour: 12 }), null);
  process.env.XTY_PET_AI = 'on';
  delete process.env.GROQ_API_KEY;
  assert.equal(await readAndRespond({ party, context, history, since: new Date(), hour: 12 }), null);
  process.env.GROQ_API_KEY = 'gsk-test';
});

const { worthReading } = await import('../xty-pet.js');
const hoursAgo = h => new Date(Date.now() - h * 3600000);

test('scheduled reader skips dead rooms and re-opens only for a real reason', () => {
  assert.equal(worthReading(12, { humanUpdates: 1 }), true);
  assert.equal(worthReading(12, { humanUpdates: 0, timedThreadDue: true }), true);
  assert.equal(worthReading(12, {
    humanUpdates: 0, timedThreadDue: false,
    lastHumanAt: hoursAgo(2), lastPetAt: hoursAgo(5),
  }), true);
  assert.equal(worthReading(12, {
    humanUpdates: 0, timedThreadDue: false,
    lastHumanAt: hoursAgo(5), lastPetAt: hoursAgo(2),
  }), false);
  assert.equal(worthReading(12, {
    humanUpdates: 0, timedThreadDue: false, lastHumanAt: null, lastPetAt: null,
  }), false);
  assert.equal(worthReading(12, { humanUpdates: 0 }, true), true);
});
