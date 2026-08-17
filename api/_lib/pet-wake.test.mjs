/* Runs the whole scheduled wake loop against fake Neon + fake Groq.
   Product contract: a PET reads real Party Log only when there is a reason,
   may choose QUIET, and never manufactures a fallback bubble just because
   the cron woke up. Needs --experimental-test-module-mocks. */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.CRON_SECRET = 'secret';
process.env.XTY_PET_AI = 'on';
process.env.GROQ_API_KEY = 'gsk-test';
delete process.env.XTY_PET_VISION;

let respond = async () => { throw new Error('no stub'); };
globalThis.fetch = (url, init) => respond(url, init);

const issued = [];
const insertedBodies = [];
let humanUpdates = 2;
let lastHumanAt = new Date();
let lastPetAt = null;

function fakeSql() {
  return {
    async query(text, params = []) {
      issued.push([text.replace(/\s+/g, ' ').trim().slice(0, 100), params]);
      const t = text.replace(/\s+/g, ' ');
      if (t.includes('FROM xty_parties') && t.includes('pet_id IS NOT NULL')) {
        return [{
          id: 'p1', code: '12345', name: 'ตี้วิ่งเช้า', activity: 'วิ่ง',
          commit_rule: 'วิ่ง 20 นาที', pet_id: 'crow',
          pet_last_wake: new Date(Date.now() - 6 * 3600000),
        }];
      }
      if (t.startsWith('UPDATE xty_parties SET pet_last_wake')) return [{ id: 'p1' }];
      if (t.includes('human_updates')) {
        return [{
          human_updates: humanUpdates,
          committed: humanUpdates ? 1 : 0,
          last_human_at: lastHumanAt,
          last_pet_at: lastPetAt,
        }];
      }
      if (t.includes('event_updates')) return [{ event_updates: 0, last_event_at: null }];
      if (t.includes('FROM xty_members')) return [{ alias: 'แพร', role: 'lead' }, { alias: 'นนท์', role: 'member' }];
      if (t.includes('FROM xty_posts p LEFT JOIN')) {
        if (!lastHumanAt) return [];
        return [
          { seq: 5, kind: 'message', body: 'ฝนตก ขอเลื่อนไปพรุ่งนี้', sent_at: lastHumanAt, retracted: false, alias: 'นนท์', pet_id: null },
          { seq: 4, kind: 'commit', body: 'วิ่งสวนครบแล้ว', sent_at: new Date(lastHumanAt.getTime() - 60000), retracted: false, alias: 'แพร', pet_id: null },
        ];
      }
      if (t.includes('FROM xty_party_events')) return [];
      if (t.includes('FROM xty_reactions')) return lastHumanAt ? [{ seq: 4, emoji: '🔥', n: 2 }] : [];
      if (t.includes('INSERT INTO xty_posts')) {
        insertedBodies.push(params[3]);
        return [{ seq: 9 }];
      }
      throw new Error('unexpected query: ' + t.slice(0, 140));
    },
  };
}

mock.module('./core.js', {
  namedExports: {
    database: fakeSql,
    ensureSchema: async () => {},
    sameOrigin: () => true,
    currentUser: async () => null,
    sha256: async value => `hash:${value}`,
    sendJson: (res, body, status = 200) => { res.body = body; res.statusCode = status; },
  },
});

const handler = (await import('../xty-pet.js')).default;

function completion(value) {
  return new Response(JSON.stringify({
    id: 'chatcmpl-test',
    choices: [{
      index: 0, message: { role: 'assistant', content: JSON.stringify(value) }, finish_reason: 'stop',
    }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('one scheduled wake reads the real multi-wake log and writes a concrete Groq bubble', async () => {
  humanUpdates = 2;
  lastHumanAt = new Date();
  lastPetAt = new Date(Date.now() - 7 * 3600000);
  insertedBodies.length = 0;
  let sent = null;
  let endpoint = null;
  respond = async (url, init) => {
    endpoint = String(url);
    sent = JSON.parse(init.body);
    return completion({
      behavior: 'CALLBACK',
      focus: 'นนท์เลื่อนไปพรุ่งนี้หลังแพรวิ่งสวนครบ',
      open_threads: ['นนท์จะกลับมาวิ่งพรุ่งนี้'],
      bubbles: ['นนท์เลื่อนไปพรุ่งนี้ ส่วนแพรวิ่งสวนครบแล้ว — กาจำ thread นี้ไว้'],
    });
  };

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: {} }, res);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.claimed, 1);
  assert.equal(res.body.read, 1);
  assert.equal(res.body.byAi, 1);
  assert.equal(res.body.spoke, 1);
  assert.equal(res.body.bubbles, 1);
  assert.equal(res.body.quiet, 0);
  assert.equal(insertedBodies.length, 1);
  assert.equal(endpoint, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(sent.response_format.type, 'json_schema');
  assert.equal(sent.response_format.json_schema.strict, true);
  assert.match(sent.messages[0].content, /แพร: COMMIT — วิ่งสวนครบแล้ว/);
  assert.match(sent.messages[0].content, /reactions: 🔥×2/);
  assert.match(sent.messages[0].content, /นนท์: ฝนตก ขอเลื่อนไปพรุ่งนี้/);
  assert.match(sent.messages[0].content, /วิ่ง 20 นาที/);
  assert.match(sent.messages[0].content, /QUIET เป็นคำตอบที่ดีและปกติ/);
});

test('dead room skips Groq entirely and writes zero bubbles', async () => {
  humanUpdates = 0;
  lastHumanAt = new Date(Date.now() - 8 * 3600000);
  lastPetAt = new Date(Date.now() - 2 * 3600000); // pet already spoke after the human
  insertedBodies.length = 0;
  let calls = 0;
  respond = async () => { calls += 1; throw new Error('should not call Groq'); };

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: {} }, res);
  assert.equal(res.body.read, 0);
  assert.equal(res.body.spoke, 0);
  assert.equal(res.body.bubbles, 0);
  assert.equal(res.body.quiet, 1);
  assert.equal(insertedBodies.length, 0);
  assert.equal(calls, 0);
});

test('model QUIET remains quiet instead of falling back to engagement copy', async () => {
  humanUpdates = 1;
  lastHumanAt = new Date();
  lastPetAt = new Date(Date.now() - 7 * 3600000);
  insertedBodies.length = 0;
  respond = async () => completion({
    behavior: 'QUIET', focus: 'มีเพียง COMMIT ที่ไม่มี detail ใหม่', open_threads: [], bubbles: [],
  });

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: {} }, res);
  assert.equal(res.body.read, 1);
  assert.equal(res.body.byAi, 1);
  assert.equal(res.body.spoke, 0);
  assert.equal(res.body.bubbles, 0);
  assert.equal(res.body.quiet, 1);
  assert.equal(insertedBodies.length, 0);
});

test('provider failure stays silent on scheduled wake', async () => {
  humanUpdates = 1;
  lastHumanAt = new Date();
  lastPetAt = null;
  insertedBodies.length = 0;
  respond = async () => new Response('{"error":{"message":"down"}}', {
    status: 500, headers: { 'content-type': 'application/json' },
  });

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: {} }, res);
  assert.equal(res.body.providerFailures, 1);
  assert.equal(res.body.spoke, 0);
  assert.equal(res.body.quiet, 1);
  assert.equal(insertedBodies.length, 0);
});

test('manual force wake still has a diagnostic proof-of-life fallback', async () => {
  humanUpdates = 0;
  lastHumanAt = null;
  lastPetAt = null;
  insertedBodies.length = 0;
  respond = async () => completion({ behavior: 'QUIET', focus: '', open_threads: [], bubbles: [] });

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: { force: '1' } }, res);
  assert.equal(res.body.read, 1);
  assert.equal(res.body.spoke, 1);
  assert.equal(res.body.bubbles, 1);
  assert.match(insertedBodies[0], /รอบทดสอบอ่าน Party Log/);
});

test('unauthorized scheduled wake is rejected', async () => {
  const res = {};
  await handler({ method: 'GET', headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 401);
});
