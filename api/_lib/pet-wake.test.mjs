/* Runs the whole wake loop against fake Neon + fake Groq.
   Covers the SQL shapes, real transcript, provider response and the
   product guarantee that every due ACTIVE pet writes at least 1 bubble.
   Needs --experimental-test-module-mocks — see npm run test:pet-wake. */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.CRON_SECRET = 'secret';
process.env.XTY_PET_AI = 'on';
process.env.GROQ_API_KEY = 'gsk-test';

let respond = async () => { throw new Error('no stub'); };
globalThis.fetch = (url, init) => respond(url, init);

const issued = [];
const insertedBodies = [];
let humanUpdates = 2;

function fakeSql() {
  return {
    async query(text, params) {
      issued.push([text.replace(/\s+/g, ' ').trim().slice(0, 90), params]);
      const t = text.replace(/\s+/g, ' ');
      if (t.includes('FROM xty_parties WHERE pet_id IS NOT NULL')) {
        return [{
          id: 'p1', code: 'ABC-DEF', name: 'ตี้วิ่งเช้า', activity: 'วิ่ง',
          commit_rule: 'วิ่ง 20 นาที', pet_id: 'crow',
          pet_last_wake: new Date(Date.now() - 6 * 3600000),
        }];
      }
      if (t.startsWith('UPDATE xty_parties SET pet_last_wake')) return [{ id: 'p1' }];
      if (t.includes('human_updates')) {
        return [{
          human_updates: humanUpdates,
          committed: humanUpdates ? 1 : 0,
          last_human_at: humanUpdates ? new Date() : null,
          last_pet_at: null,
        }];
      }
      if (t.includes('event_updates')) return [{ event_updates: 0, last_event_at: null }];
      if (t.includes('FROM xty_members')) return [{ alias: 'แพร', role: 'lead' }, { alias: 'นนท์', role: 'member' }];
      if (t.includes('FROM xty_posts p LEFT JOIN')) {
        if (!humanUpdates) return [];
        return [
          { seq: 5, kind: 'message', body: 'ฝนตก ขอเลื่อน', sent_at: new Date(), retracted: false, alias: 'นนท์' },
          { seq: 4, kind: 'commit', body: '✓', sent_at: new Date(), retracted: false, alias: 'แพร' },
        ];
      }
      if (t.includes('FROM xty_party_events')) return [];
      if (t.includes('FROM xty_reactions')) return humanUpdates ? [{ seq: 4, emoji: '🔥', n: 2 }] : [];
      if (t.includes("kind='pet' AND retracted=FALSE")) return [{ body: 'เมื่อวานครบทุกคน', sent_at: new Date(Date.now() - 7 * 3600000) }];
      if (t.includes('INSERT INTO xty_posts')) {
        insertedBodies.push(params[3]);
        return [{ seq: 9 }];
      }
      throw new Error('unexpected query: ' + t.slice(0, 110));
    },
  };
}

mock.module('./core.js', {
  namedExports: {
    database: fakeSql,
    ensureSchema: async () => {},
    sendJson: (res, body, status = 200) => { res.body = body; res.statusCode = status; },
  },
});

const handler = (await import('../xty-pet.js')).default;

test('one wake reads the real log and writes the Groq bubble', async () => {
  humanUpdates = 2;
  insertedBodies.length = 0;
  let sent = null;
  let endpoint = null;
  respond = async (url, init) => {
    endpoint = String(url);
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({
      id: 'chatcmpl-test',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'นนท์เลื่อนไปพรุ่งนี้ — แล้วแพรล่ะ รอบนี้อยากเล่าต่อไหม' },
        finish_reason: 'stop',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: {} }, res);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.claimed, 1);
  assert.equal(res.body.read, 1);
  assert.equal(res.body.byAi, 1);
  assert.equal(res.body.spoke, 1);
  assert.equal(res.body.bubbles, 1);
  assert.equal(res.body.fallbacks, 0);
  assert.equal(insertedBodies.length, 1);
  assert.equal(endpoint, 'https://api.groq.com/openai/v1/chat/completions');
  assert.match(sent.messages[0].content, /แพร · COMMIT/);
  assert.match(sent.messages[0].content, /รีแอค: 🔥×2/);
  assert.match(sent.messages[0].content, /เมื่อวานครบทุกคน/);
  assert.match(sent.messages[0].content, /วิ่ง 20 นาที/);
  assert.match(sent.messages[0].content, /ทุกครั้งที่ตื่นต้องพูด/);
});

test('an idle party still calls Groq and starts a conversation', async () => {
  humanUpdates = 0;
  insertedBodies.length = 0;
  let sent = null;
  respond = async (url, init) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({
      choices: [{ index: 0, message: { role: 'assistant', content: 'รอบนี้เงียบแฮะ — วันนี้เรื่องวิ่งมีอะไรอยากโยนไว้ในวงไหม' }, finish_reason: 'stop' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: {} }, res);
  assert.equal(res.body.read, 1);
  assert.equal(res.body.spoke, 1);
  assert.equal(res.body.bubbles, 1);
  assert.equal(insertedBodies.length, 1);
  assert.match(sent.messages[0].content, /รอบนี้ยังไม่มีความเคลื่อนไหวใหม่/);
  assert.match(sent.messages[0].content, /เปิดบทสนทนาเอง/);
});

test('even a legacy QUIET/provider-empty response falls back to one bubble', async () => {
  humanUpdates = 0;
  insertedBodies.length = 0;
  respond = async () => new Response(JSON.stringify({
    choices: [{ index: 0, message: { role: 'assistant', content: 'QUIET' }, finish_reason: 'stop' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' }, query: {} }, res);
  assert.equal(res.body.spoke, 1);
  assert.equal(res.body.bubbles, 1);
  assert.equal(res.body.fallbacks, 1);
  assert.equal(insertedBodies.length, 1);
  assert.ok(insertedBodies[0].length > 0);
});

test('unauthorized is rejected before touching the db', async () => {
  const res = {};
  await handler({ method: 'GET', headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 401);
});
