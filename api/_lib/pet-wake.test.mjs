/* Runs the whole wake loop against a fake Neon and a fake Anthropic:
   the SQL shapes, the gate, the transcript and the insert path.
   Needs --experimental-test-module-mocks — see npm run test:pet-wake. */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.CRON_SECRET = 'secret';
process.env.XTY_PET_AI = 'on';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

let respond = async () => { throw new Error('no stub'); };
globalThis.fetch = (url, init) => respond(url, init);

const issued = [];
function fakeSql() {
  return {
    async query(text, params) {
      issued.push([text.replace(/\s+/g, ' ').trim().slice(0, 70), params]);
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
          human_updates: 2, committed: 1,
          last_human_at: new Date(), last_pet_at: null,
        }];
      }
      if (t.includes('FROM xty_members')) return [{ alias: 'แพร', role: 'lead' }, { alias: 'นนท์', role: 'member' }];
      if (t.includes('FROM xty_posts p LEFT JOIN')) {
        return [
          { seq: 5, kind: 'message', body: 'ฝนตก ขอเลื่อน', sent_at: new Date(), retracted: false, alias: 'นนท์' },
          { seq: 4, kind: 'commit', body: '✓', sent_at: new Date(), retracted: false, alias: 'แพร' },
        ];
      }
      if (t.includes('FROM xty_reactions')) return [{ seq: 4, emoji: '🔥', n: 2 }];
      if (t.includes("kind='pet' AND retracted=FALSE")) return [{ body: 'เมื่อวานครบทุกคน', sent_at: new Date() }];
      if (t.includes('INSERT INTO xty_posts')) return [{ seq: 9 }];
      throw new Error('unexpected query: ' + t.slice(0, 80));
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

test('one wake, end to end', async () => {
  let prompt = null;
  respond = async (url, init) => {
    prompt = JSON.parse(init.body);
    return new Response(JSON.stringify({
      id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'นนท์เลื่อนไปพรุ่งนี้ — จดไว้แล้ว' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const res = {};
  await handler({ method: 'GET', headers: { authorization: 'Bearer secret' } }, res);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.claimed, 1);
  assert.equal(res.body.read, 1);
  assert.equal(res.body.spoke, 1);
  assert.equal(res.body.bubbles, 1);
  assert.match(prompt.messages[0].content, /แพร · COMMIT/);
  assert.match(prompt.messages[0].content, /รีแอค: 🔥×2/);
  assert.match(prompt.messages[0].content, /เมื่อวานครบทุกคน/);
  assert.match(prompt.system, /วิ่ง 20 นาที/);
});

test('unauthorized is rejected before touching the db', async () => {
  const res = {};
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});
