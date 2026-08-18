/* ข้อกำหนดของเจ้าของเกม: "ตื่นทีต้องเช็คทุกตี้ ไม่ใช่สุ่ม ถ้ามี 100 ตี้
   ก็ต้องตอบทั้ง 100 ยกเว้นตี้ร้าง"

   ไฟล์นี้จึงรันรอบตื่นจริงกับตี้จำนวนมาก แล้วตรวจสามอย่าง:
   ครบทุกตี้ · ทำพร้อมกันจริง · ตี้ที่ยังไม่ถึงคิวต้องไม่ถูกกินทิ้ง

   ต้องใช้ --experimental-test-module-mocks */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.CRON_SECRET = 'secret';
process.env.XTY_PET_AI = 'on';
process.env.GROQ_API_KEY = 'gsk-test';
process.env.XTY_PET_WAKE_CONCURRENCY = '6';
delete process.env.XTY_PET_VISION;

const PARTY_COUNT = 40;
const state = {
  modelDelayMs: 0,
  failFor: new Set(),
  claims: new Map(),      // partyId -> จำนวนครั้งที่ถูกจอง
  restores: new Set(),    // partyId ที่ถูกคืนสิทธิ์
  spoke: new Set(),
  inFlight: 0,
  peakInFlight: 0,
  orderSql: '',
};

function parties() {
  return Array.from({ length: PARTY_COUNT }, (_, i) => ({
    id: `p${i}`, code: String(10000 + i), name: `ตี้ ${i}`, activity: 'วิ่ง',
    commit_rule: 'วิ่ง 20 นาที', pet_id: 'crow',
    pet_last_wake: new Date(Date.now() - 6 * 3600000),
  }));
}

function fakeSql() {
  return {
    async query(text, params = []) {
      const t = text.replace(/\s+/g, ' ');
      if (t.includes('FROM xty_parties') && t.includes('pet_id IS NOT NULL')) {
        state.orderSql = t;
        return parties();
      }
      if (t.startsWith('UPDATE xty_parties SET pet_last_wake')) {
        const id = params[1];
        if (params[0] === null || params[0] instanceof Date === false) {
          /* คืนสิทธิ์: pet_last_wake ถูกเซ็ตกลับเป็นค่าเดิม */
        }
        if (t.includes('AND pet_last_wake=$3')) { state.restores.add(id); return [{ id }]; }
        state.claims.set(id, (state.claims.get(id) || 0) + 1);
        return [{ id }];
      }
      if (t.includes('human_updates')) {
        return [{ human_updates: 2, committed: 1, last_human_at: new Date(), last_pet_at: null }];
      }
      if (t.includes('event_updates')) return [{ event_updates: 0, last_event_at: null }];
      if (t.includes('FROM xty_members')) return [{ alias: 'แพร', role: 'lead' }];
      if (t.includes('FROM xty_posts p LEFT JOIN')) {
        return [{
          seq: 5, kind: 'message', body: 'วันนี้วิ่งเสร็จแล้ว', sent_at: new Date(),
          retracted: false, alias: 'แพร', pet_id: null, image_url: null,
        }];
      }
      if (t.includes('FROM xty_party_events')) return [];
      if (t.includes('FROM xty_reactions')) return [];
      if (t.includes('INSERT INTO xty_posts')) {
        state.spoke.add(params[0]);
        return [{ seq: 9 }];
      }
      throw new Error('unexpected query: ' + t.slice(0, 120));
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

globalThis.fetch = async () => {
  state.inFlight += 1;
  state.peakInFlight = Math.max(state.peakInFlight, state.inFlight);
  try {
    if (state.modelDelayMs) await new Promise(r => setTimeout(r, state.modelDelayMs));
    return new Response(JSON.stringify({
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({
            situation: 'แพรวิ่งเสร็จ', behavior: 'REACT', focus: 'แพรวิ่งเสร็จ',
            open_threads: [], intent: 'ยินดีกับแพร',
            bubbles: [`เห็นแล้วว่าวิ่งเสร็จ ${Math.random().toString(36).slice(2, 8)}`],
          }),
        },
        finish_reason: 'stop',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  } finally {
    state.inFlight -= 1;
  }
};

const handler = (await import('../xty-pet.js')).default;

function reset() {
  state.claims.clear(); state.restores.clear(); state.spoke.clear();
  state.peakInFlight = 0; state.modelDelayMs = 0; state.failFor.clear();
}

async function wake() {
  const req = { method: 'GET', headers: { authorization: 'Bearer secret' }, query: {}, url: '/api/xty-pet' };
  const res = {};
  await handler(req, res);
  return res.body;
}

test('one wake reads every party that has a reason, not a sample of them', async () => {
  reset();
  const out = await wake();
  assert.equal(out.ok, true);
  assert.equal(out.due, PARTY_COUNT, 'ต้องหยิบมาครบทุกตี้');
  assert.equal(out.claimed, PARTY_COUNT);
  assert.equal(out.read, PARTY_COUNT, 'ทุกตี้ต้องถูกอ่านจริง');
  assert.equal(out.spoke, PARTY_COUNT);
  assert.equal(out.remaining, 0, 'ไม่มีตี้ตกค้าง');
  assert.equal(state.spoke.size, PARTY_COUNT, 'ทุกตี้ต้องมีข้อความถูกเขียนลงจริง');
});

test('parties are worked on in parallel, and the liveliest ones come first', async () => {
  reset();
  state.modelDelayMs = 20;
  const out = await wake();
  assert.ok(state.peakInFlight > 1, `ต้องทำพร้อมกัน ไม่ใช่ต่อคิวทีละตี้ (peak=${state.peakInFlight})`);
  assert.ok(state.peakInFlight <= 6, `ต้องไม่เกินเพดานที่ตั้งไว้ (peak=${state.peakInFlight})`);
  assert.equal(out.concurrency, 6);
  assert.match(state.orderSql, /ORDER BY updated_at DESC/,
    'ตี้ที่เพิ่งมีความเคลื่อนไหวต้องได้คิวก่อน เผื่อรอบถูกตัดกลางทาง');
});

test('when the time budget runs out the leftovers stay untouched for the next round', async () => {
  reset();
  process.env.XTY_PET_WAKE_BUDGET_MS = '100';
  state.modelDelayMs = 40;
  const out = await wake();
  delete process.env.XTY_PET_WAKE_BUDGET_MS;

  assert.ok(out.remaining > 0, 'งบเวลาน้อยขนาดนี้ต้องมีตี้เหลือ');
  assert.equal(out.claimed + out.remaining, PARTY_COUNT, 'ตี้ที่เหลือต้องไม่ถูกจอง');
  /* หัวใจของข้อนี้: ตี้ที่ยังไม่ได้เริ่ม ต้องไม่ถูกนับว่า "รอบนี้ทำแล้ว"
     ไม่งั้นมันจะเงียบหายไปอีกหกชั่วโมงโดยไม่มีใครรู้ */
  assert.equal(state.claims.size, out.claimed);
  assert.ok(state.claims.size < PARTY_COUNT);
});

test('a party that blows up gives its turn back instead of eating it', async () => {
  reset();
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (...args) => {
    calls += 1;
    if (calls === 3) throw Object.assign(new Error('boom'), { name: 'TypeError' });
    return realFetch(...args);
  };
  const out = await wake();
  globalThis.fetch = realFetch;

  /* readAndRespond กลืน error ของ provider เองแล้วคืน null → นับเป็น deferred
     ไม่ว่าทางไหน ตี้นั้นต้องได้สิทธิ์คืนเพื่อไปต่อรอบหน้า */
  assert.ok(out.deferred + out.failed >= 1, 'ตี้ที่พังต้องถูกนับไว้');
  assert.ok(state.restores.size >= 1, 'และต้องคืนสิทธิ์ให้ตี้นั้น');
  assert.equal(out.spoke, PARTY_COUNT - 1, 'ตี้ที่เหลือยังทำงานได้ตามปกติ');
});
