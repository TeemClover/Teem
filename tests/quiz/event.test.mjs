import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATARS, AVATAR_CHOICES, canonicalAvatar } from '../../quiz/avatars.js';
import { QUESTIONS } from '../../api/_lib/quiz/questions.js';
import { createHostDrafts } from '../../quiz/host-drafts.js';
import { createQuizHandler } from '../../api/_lib/quiz/handler.js';
import { createMemoryStore, newToken } from '../../api/_lib/quiz/game.js';

test('nine distinct animal choices canonicalize every legacy avatar without changing room IDs', () => {
  assert.equal(AVATARS.length, 68);assert.equal(AVATAR_CHOICES.length, 9);
  assert.ok(AVATAR_CHOICES.every(Boolean));assert.equal(new Set(AVATAR_CHOICES.map(a => a.name)).size, 9);
  for (const original of AVATARS) assert.ok(AVATAR_CHOICES.includes(canonicalAvatar(original.id)));
  assert.equal(canonicalAvatar('WHITE_CAT_BLUE_RARE_001').id, 'ORANGE_CAT_RED_RARE_001');
  assert.equal(canonicalAvatar('PIG_SILVER_RARE_002').id, 'PIG_RED_RARE_001');
});

function draftFixture(fetchTemplate = async () => ({ questions: QUESTIONS })) {
  const saved = new Map();
  return { saved, drafts: createHostDrafts({ read: key => saved.has(key) ? JSON.parse(saved.get(key)) : null, write: (key, value) => saved.set(key, JSON.stringify(value)), fetchTemplate }) };
}
test('anniversary starts complete, edits survive mode changes, reset restores an independent original copy', async () => {
  const f = draftFixture(), draft = await f.drafts.open('anniversary');
  assert.equal(draft.count, 12);assert.equal(draft.questions[0].text, QUESTIONS[0].text);
  assert.ok(draft.questions.slice(0, 12).every(q => q.text && q.options.every(Boolean)));
  draft.questions[0].text = 'แก้คำถามหน้างาน';draft.questions[0].options[0] = 'เฉลยใหม่';f.drafts.save('anniversary', draft);
  const custom = await f.drafts.open('custom');assert.equal(custom.count, 5);assert.equal(custom.questions[0].text, '');
  custom.questions[0].text = 'คำถามเรา';f.drafts.save('custom', custom);
  assert.equal((await f.drafts.open('anniversary')).questions[0].text, 'แก้คำถามหน้างาน');
  const reset = await f.drafts.open('anniversary', { reset: true });assert.equal(reset.questions[0].text, QUESTIONS[0].text);
  assert.equal(reset.questions[0].options[0], QUESTIONS[0].options[0]);
  assert.equal((await f.drafts.open('custom')).questions[0].text, 'คำถามเรา');
  reset.questions[1].text = 'ไม่แก้ต้นฉบับ';assert.notEqual(QUESTIONS[1].text, 'ไม่แก้ต้นฉบับ');
});
test('a delayed template cannot mutate the independent custom draft, and failed loads retry', async () => {
  let resolve, calls = 0;
  const f = draftFixture(() => { calls++;return new Promise(yes => { resolve = yes; }); });
  const pending = f.drafts.open('anniversary');
  const custom = await f.drafts.open('custom');custom.questions[0].text = 'เก็บไว้';f.drafts.save('custom', custom);
  resolve({ questions: QUESTIONS });await pending;
  assert.equal((await f.drafts.open('custom')).questions[0].text, 'เก็บไว้');assert.equal(calls, 1);
  let retries = 0;
  const retry = draftFixture(async () => { if (++retries === 1) throw new Error('offline');return { questions: QUESTIONS }; });
  await assert.rejects(retry.drafts.open('anniversary'));
  assert.equal((await retry.drafts.open('anniversary')).count, 12);assert.equal(retries, 2);
});

test('edited anniversary questions are validated, shuffled and scored; authoring keys never enter public room state', async () => {
  let time = 1800000000000;
  const store = createMemoryStore({ clock: () => time }), handler = createQuizHandler({ getStore: async () => store, clock: () => time });
  async function request(action, data = {}, token = '', method = 'POST') {
    let response;const headers = new Map();
    await handler({ url: '/api/quiz' + (method === 'GET' ? '?' + new URLSearchParams({ action, ...data }) : ''), method, headers: { host: 'www.myclover.com', origin: 'https://www.myclover.com', 'content-type': 'application/json', authorization: 'Bearer ' + token }, ...(method === 'POST' ? { body: JSON.stringify({ action, ...data }) } : {}) }, { setHeader(k, v) { headers.set(k.toLowerCase(), v); }, end(body) { response = { status: this.statusCode, headers, ...JSON.parse(body) }; } });
    return response;
  }
  const template = await request('template', { template: 'anniversary' });assert.equal(template.status, 200);assert.equal(template.questions.length, 12);
  assert.equal(template.headers.get('cache-control'), 'private, no-store');assert.equal(template.headers.get('vercel-cdn-cache-control'), 'no-store');
  assert.equal((await request('template', { template: 'other' })).status, 400);
  assert.equal((await request('template', { template: 'anniversary' }, '', 'GET')).questions, undefined);
  template.questions[0] = { text: 'คำถามแก้หน้างาน', options: ['เฉลยใหม่', 'ก', 'ข', 'ค'], correctIndex: 3 };
  const created = await request('create', { mode: 'anniversary', questions: template.questions, seconds: 20 });assert.equal(created.status, 201);
  const { code, hostToken } = created, player = newToken();
  const joined = await request('join', { code, name: 'ทีม', avatar: 'WHITE_CAT_BLUE_RARE_001' }, player);assert.equal(joined.status, 200);
  const lobby = await request('state', { code }, '', 'GET');assert.equal(lobby.question, null);assert.ok(!JSON.stringify(lobby).includes('เฉลยใหม่'));
  await request('start', { code, version: 0 }, hostToken);time += 4000;
  const q = store.inspect(code).room.questions[0];assert.equal(q.text, 'คำถามแก้หน้างาน');assert.equal(q.options[q.correctIndex], 'เฉลยใหม่');
  const active = await request('state', { code }, '', 'GET');assert.equal(active.question.correctIndex, undefined);
  await request('answer', { code, index: 0, choice: q.correctIndex }, player);time += 20000;
  const revealed = await request('state', { code }, '', 'GET');assert.equal(revealed.players[0].score, 1000);assert.equal(revealed.question.correctIndex, q.correctIndex);
  assert.equal((await request('create', { mode: 'anniversary', questions: [] })).error, 'BAD_QUESTION_COUNT');
  assert.equal((await request('create', { mode: 'anniversary', questions: null })).error, 'BAD_QUESTION_COUNT');
  const invalid = template.questions.map(q => ({ ...q, options: ['ซ้ำ', 'ซ้ำ', 'ซ้ำ', 'ซ้ำ'] }));
  assert.equal((await request('create', { mode: 'anniversary', questions: invalid })).error, 'DUPLICATE_OPTIONS');
  assert.equal(QUESTIONS[0].text, 'Clover กำเนิดที่ไหน');
});
