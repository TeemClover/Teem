import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATARS, AVATAR_CHOICES, canonicalAvatar } from '../../quiz/avatars.js';
import { QUESTIONS } from './sample-questions.mjs';
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

function draftFixture() {
  const saved = new Map();
  return { saved, drafts: createHostDrafts({ read: key => saved.has(key) ? JSON.parse(saved.get(key)) : null, write: (key, value) => saved.set(key, JSON.stringify(value)) }) };
}

test('a new host starts with an empty five-question draft that survives reloads', () => {
  const f = draftFixture(), draft = f.drafts.open();
  assert.equal(draft.count, 5);assert.equal(draft.questions.length, 20);
  assert.ok(draft.questions.every(q => q.text === '' && q.options.every(o => o === '')));
  draft.questions[0].text = 'คำถามเรา';draft.count = 7;f.drafts.save(draft);
  const again = f.drafts.open();assert.equal(again.count, 7);assert.equal(again.questions[0].text, 'คำถามเรา');
  assert.deepEqual([...f.saved.keys()], ['custom-draft']);
});

test('host-written questions are validated, shuffled and scored; answer keys never enter public room state; no built-in question bank', async () => {
  let time = 1800000000000;
  const store = createMemoryStore({ clock: () => time }), handler = createQuizHandler({ getStore: async () => store, clock: () => time });
  async function request(action, data = {}, token = '', method = 'POST') {
    let response;const headers = new Map();
    await handler({ url: '/api/quiz' + (method === 'GET' ? '?' + new URLSearchParams({ action, ...data }) : ''), method, headers: { host: 'www.myclover.com', origin: 'https://www.myclover.com', 'content-type': 'application/json', authorization: 'Bearer ' + token }, ...(method === 'POST' ? { body: JSON.stringify({ action, ...data }) } : {}) }, { setHeader(k, v) { headers.set(k.toLowerCase(), v); }, end(body) { response = { status: this.statusCode, headers, ...JSON.parse(body) }; } });
    return response;
  }
  const template = { questions: QUESTIONS.map(q => ({ ...q, options: [...q.options] })) };
  assert.equal((await request('template', { template: 'anniversary' })).status, 400);
  assert.equal((await request('create', { seconds: 20 })).error, 'BAD_QUESTION_COUNT');
  assert.equal((await request('create', { mode: 'anniversary', questions: template.questions })).error, 'BAD_MODE');
  template.questions[0] = { text: 'คำถามแก้หน้างาน', options: ['เฉลยใหม่', 'ก', 'ข', 'ค'], correctIndex: 3 };
  const created = await request('create', { mode: 'custom', questions: template.questions, seconds: 20 });assert.equal(created.status, 201);
  const { code, hostToken } = created, player = newToken();
  const joined = await request('join', { code, name: 'ทีม', avatar: 'WHITE_CAT_BLUE_RARE_001' }, player);assert.equal(joined.status, 200);
  const lobby = await request('state', { code }, '', 'GET');assert.equal(lobby.question, null);assert.ok(!JSON.stringify(lobby).includes('เฉลยใหม่'));
  await request('start', { code, version: 0 }, hostToken);time += 4000;
  const q = store.inspect(code).room.questions[0];assert.equal(q.text, 'คำถามแก้หน้างาน');assert.equal(q.options[q.correctIndex], 'เฉลยใหม่');
  const active = await request('state', { code }, '', 'GET');assert.equal(active.question.correctIndex, undefined);
  await request('answer', { code, index: 0, choice: q.correctIndex }, player);time += 20000;
  const revealed = await request('state', { code }, '', 'GET');assert.equal(revealed.players[0].score, 1000);assert.equal(revealed.question.correctIndex, q.correctIndex);
  assert.equal((await request('create', { mode: 'custom', questions: [] })).error, 'BAD_QUESTION_COUNT');
  assert.equal((await request('create', { mode: 'custom', questions: null })).error, 'BAD_QUESTION_COUNT');
  const invalid = template.questions.map(q => ({ ...q, options: ['ซ้ำ', 'ซ้ำ', 'ซ้ำ', 'ซ้ำ'] }));
  assert.equal((await request('create', { mode: 'custom', questions: invalid })).error, 'DUPLICATE_OPTIONS');
});
