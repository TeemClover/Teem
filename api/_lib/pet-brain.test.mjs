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
    situation: 'ไม่มีอะไรใหม่', behavior: 'QUIET', focus: '', open_threads: [],
    intent: 'อยากทัก', bubbles: ['ไม่ควรโผล่'],
  }), {
    behavior: 'QUIET', situation: 'ไม่มีอะไรใหม่', focus: '', intent: '',
    openThreads: [], bubbles: [],
  });

  const alive = sanitizeDecision({
    situation: 'นนท์เลื่อนการวิ่งไปพรุ่งนี้ แพรวิ่งแล้ว',
    behavior: 'CALLBACK', focus: 'นนท์เลื่อนไปพรุ่งนี้',
    open_threads: ['นนท์จะลองวิ่งพรุ่งนี้'],
    intent: 'บอกว่าจำที่นนท์นัดตัวเองไว้พรุ่งนี้',
    bubbles: ['นนท์บอกไว้พรุ่งนี้ — กาจำ thread นี้อยู่'],
  }, 'crow');
  assert.equal(alive.behavior, 'CALLBACK');
  assert.deepEqual(alive.openThreads, ['นนท์จะลองวิ่งพรุ่งนี้']);
  assert.equal(alive.bubbles.length, 1);
  assert.match(alive.situation, /นนท์/);
  assert.match(alive.intent, /พรุ่งนี้/);
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
      situation: 'แพร Commit วิ่งสวนครบ นนท์เลื่อนไปพรุ่งนี้เพราะฝนตก',
      behavior: 'CALLBACK',
      focus: 'แพรวิ่งสวนครบแล้ว แต่นนท์เลื่อนไปพรุ่งนี้',
      open_threads: ['นนท์ตั้งใจกลับมาวิ่งพรุ่งนี้'],
      intent: 'รับรู้ทั้งสองฝั่งและบอกว่าจำนัดของนนท์ไว้',
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
  assert.deepEqual(sent.response_format.json_schema.schema.required,
    ['situation', 'behavior', 'focus', 'open_threads', 'intent', 'bubbles']);
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.reasoning_format, 'hidden');
  assert.equal(sent.stream, false);

  const prompt = sent.messages[0].content;
  assert.match(prompt, /QUIET เป็นคำตอบที่ดีและปกติ/);
  assert.match(prompt, /บุคลิกมีหน้าที่กำหนด "พูดยังไง" เท่านั้น/);
  assert.match(prompt, /## ลำดับการคิด/);
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
      situation: 'แพรถามกาว่า ABCD คืออะไร', behavior: 'ANSWER',
      focus: 'ผู้เล่นถามกาตรง ๆ', open_threads: [],
      intent: 'บอกตามตรงว่ายังไม่มีข้อมูลพอจะตอบ',
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
  assert.equal(sent.reasoning_effort, 'medium', 'มีคนรออยู่จริง คิดให้หนักขึ้นได้');
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

test('scheduled reader enforces daily presence then goes quiet once presence is satisfied', () => {
  assert.equal(worthReading(12, { humanUpdates: 1, humanToday: 2, petToday: 0 }), true);
  assert.equal(worthReading(12, { humanUpdates: 0, humanToday: 2, petToday: 0, timedThreadDue: true }), true);
  assert.equal(worthReading(12, {
    humanUpdates: 0, humanToday: 2, petToday: 1, timedThreadDue: false,
    lastHumanAt: hoursAgo(2), lastPetAt: hoursAgo(5),
  }), true);
  assert.equal(worthReading(12, {
    humanUpdates: 0, humanToday: 1, petToday: 1, timedThreadDue: false,
    lastHumanAt: hoursAgo(5), lastPetAt: hoursAgo(2),
  }), false);
  assert.equal(worthReading(12, {
    humanUpdates: 0, humanToday: 0, petToday: 0, timedThreadDue: false,
    lastHumanAt: null, lastPetAt: null,
  }), true, 'no PET yet today: 12:27 daily presence floor opens the room');
  assert.equal(worthReading(12, {
    humanUpdates: 0, humanToday: 0, petToday: 1, timedThreadDue: false,
    lastHumanAt: null, lastPetAt: null,
  }), false, 'daily presence already satisfied: silent room may stay quiet');
  assert.equal(worthReading(12, { humanUpdates: 0, humanToday: 0, petToday: 1 }, true), true);
});

/* รูปที่คนแนบไม่ได้อยู่ในเนื้อข้อความ มันอยู่คนละคอลัมน์ ก่อนหน้านี้สัตว์
   จึงเห็นโพสต์ที่มีแต่รูปเป็นบรรทัดว่าง และ vision ไม่เคยได้ทำงานจริง */
test('an attached picture reaches both the transcript and the vision pass', async () => {
  const withPhoto = [
    ...history,
    {
      seq: 8, kind: 'message', body: '', sent_at: '2026-08-14T04:00:00Z', retracted: false,
      alias: 'แพร', reactions: '', image_url: 'https://x.public.blob.vercel-storage.com/a.webp',
    },
    {
      seq: 9, kind: 'commit', body: 'วิ่งเสร็จ', sent_at: '2026-08-14T04:05:00Z', retracted: false,
      alias: 'นนท์', reactions: '', image_url: 'https://x.public.blob.vercel-storage.com/b.webp',
    },
  ];

  const calls = [];
  respond = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return completion({
      situation: 'แพรส่งรูปมา', behavior: 'REACT', focus: 'รูปจากแพร',
      open_threads: [], intent: 'ตอบรับรูปที่แพรส่ง', bubbles: ['เห็นรูปแล้ว'],
    });
  };
  await readAndRespond({ party, context, history: withPhoto, since: new Date('2026-08-14T03:30:00Z'), hour: 12 });
  assert.equal(calls.length, 1, 'vision ปิดอยู่ ต้องยิงแค่ครั้งเดียว');
  assert.match(calls[0].messages[0].content, /แพร: \[แนบรูป\]/);
  assert.match(calls[0].messages[0].content, /นนท์: COMMIT — วิ่งเสร็จ \[แนบรูป\]/);

  process.env.XTY_PET_VISION = 'on';
  calls.length = 0;
  respond = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    if (Array.isArray(body.messages[0].content)) {
      return completion('') && new Response(JSON.stringify({
        choices: [{ message: { content: 'ภาพถ่ายรองเท้าวิ่งบนพื้นถนนเปียก' }, finish_reason: 'stop' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return completion({
      situation: 'แพรส่งรูปรองเท้า', behavior: 'REACT', focus: 'รูปรองเท้า',
      open_threads: [], intent: 'พูดถึงสิ่งที่เห็นในรูป', bubbles: ['ถนนเปียกแบบนั้นยังไปได้อยู่นะ'],
    });
  };
  const out = await readAndRespond({ party, context, history: withPhoto, since: new Date('2026-08-14T03:30:00Z'), hour: 12 });
  delete process.env.XTY_PET_VISION;

  assert.equal(calls.length, 2, 'ต้องมีรอบดูรูปก่อน แล้วค่อยรอบคิด');
  const visionCall = calls[0];
  const sentUrls = visionCall.messages[0].content
    .filter(part => part.type === 'image_url').map(part => part.image_url.url);
  assert.deepEqual(sentUrls, [
    'https://x.public.blob.vercel-storage.com/b.webp',
    'https://x.public.blob.vercel-storage.com/a.webp',
  ], 'รูปล่าสุดก่อน และต้องเป็นรูปที่แนบจริง');
  assert.match(calls[1].messages[0].content, /ภาพถ่ายรองเท้าวิ่งบนพื้นถนนเปียก/);
  assert.equal(out.bubbles.length, 1);
});
