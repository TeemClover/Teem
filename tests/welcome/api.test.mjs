// /api/welcome · ตรวจข้อมูลก่อนบันทึก และพฤติกรรมของ handler (ใช้ store ปลอม ไม่ต่อฐานข้อมูลจริง)
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, createWelcomeHandler } from '../../api/_lib/welcome.js';
import { QUESTIONS, cleanAnswer, cleanContact } from '../../welcome/questions.js';

const V = '6f1c2b0e-3a4d-4f5e-9a1b-2c3d4e5f6a7b';
const R = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

test('คำตอบต้องตรงกับตัวเลือกของคำถาม ข้อเดียวเลือกได้ข้อเดียว', () => {
  assert.deepEqual(cleanAnswer('reach_back', 'some'), ['some']);
  assert.equal(cleanAnswer('reach_back', ['some', 'most']), null);
  assert.equal(cleanAnswer('reach_back', 'hack'), null);
  assert.deepEqual(cleanAnswer('channel', ['live', 'live', 'shop']), ['live', 'shop']);
  assert.equal(cleanAnswer('nope', 'x'), null);
  for (const q of QUESTIONS) assert.ok(q.options.length >= 2 && q.ask, q.id);
});

test('ช่องทางติดต่อรับเบอร์มือถือไทยหรือ LINE ID', () => {
  assert.deepEqual(cleanContact('081-234-5678'), { kind: 'phone', value: '0812345678' });
  assert.deepEqual(cleanContact('+66 81 234 5678'), { kind: 'phone', value: '0812345678' });
  assert.deepEqual(cleanContact('@MyLine.id'), { kind: 'line', value: '@myline.id' });
  assert.equal(cleanContact('12'), null);
  assert.equal(cleanContact('<script>'), null);
});

test('ฝากชื่อต้องมีชื่อ ช่องทางติดต่อ และการยินยอม · ช่องกับดักบอทต้องว่าง', () => {
  const ok = { kind: 'lead', visitor: V, requestId: R, name: 'นก', contact: '0812345678', consent: true, answers: { reach_back: 'some', bad: 'x' }, ref: 'AB12<>' };
  const v = validate(ok).value;
  assert.equal(v.name, 'นก');
  assert.deepEqual(v.answers, { reach_back: ['some'] });
  assert.equal(v.ref, 'AB12');
  assert.ok(validate({ ...ok, consent: false }).error);
  assert.ok(validate({ ...ok, name: '' }).error);
  assert.ok(validate({ ...ok, contact: 'x' }).error);
  assert.ok(validate({ ...ok, website: 'spam' }).error);
  assert.ok(validate({ ...ok, visitor: 'nope' }).error);
  assert.ok(validate({ kind: 'scene', visitor: V, step: 'nowhere' }).error);
  assert.equal(validate({ kind: 'scene', visitor: V, step: 'pain' }).value.step, 'pain');
});

function call(handler, { method = 'POST', body, headers = {} }) {
  return new Promise(resolve => {
    const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, end(text) { resolve({ status: this.statusCode, body: JSON.parse(text) }); } };
    handler({ method, body, headers: { host: 'www.myclover.com', 'content-type': 'application/json', ...headers }, socket: {} }, res);
  });
}

test('handler บันทึกฝากชื่อแล้วคืนเลขอ้างอิง · ฐานข้อมูลล่มต้องไม่บอกว่าบันทึกแล้ว · ดูผลต้องมีรหัสผู้ดูแล', async () => {
  const saved = [];
  const store = { async event(v) { saved.push(v); return { saved: true }; }, async lead(v) { saved.push(v); return { reference: v.reference }; }, async summary() { return { answers: [], scenes: [], leads: [] }; } };
  const h = createWelcomeHandler({ getStore: async () => store, env: { MEET_ADMIN_KEY: 'k' } });
  const lead = await call(h, { body: JSON.stringify({ kind: 'lead', visitor: V, requestId: R, name: 'นก', contact: '0812345678', consent: true }) });
  assert.equal(lead.status, 201);
  assert.match(lead.body.reference, /^XP-[0-9A-F]{6}$/);
  assert.equal(saved[0].contact.value, '0812345678');
  const answer = await call(h, { body: { kind: 'answer', visitor: V, id: R, step: 'start_with', value: 'xplorer' } });
  assert.equal(answer.status, 200);
  const dnt = await call(h, { body: { kind: 'scene', visitor: V, step: 'hook' }, headers: { dnt: '1' } });
  assert.equal(dnt.status, 200);
  assert.equal(saved.filter(s => s.kind === 'scene').length, 0);
  assert.equal((await call(h, { body: { kind: 'answer', visitor: V }, headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call(h, { method: 'GET' })).status, 401);
  assert.equal((await call(h, { method: 'GET', headers: { 'x-admin-key': 'k' } })).status, 200);
  const down = createWelcomeHandler({ getStore: async () => { throw Error('db down'); } });
  const r = await call(down, { body: { kind: 'lead', visitor: V, requestId: R, name: 'นก', contact: '0812345678', consent: true } });
  assert.equal(r.status, 503);
  assert.equal(r.body.ok, false);
});
