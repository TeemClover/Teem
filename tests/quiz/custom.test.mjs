import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCustomQuestions, restoreDraft, questionIsComplete, validQuestionCount, ANNIVERSARY_TITLE } from '../../quiz/question-set.js';
import { prepareQuestions, createMemoryStore, newToken } from '../../api/_lib/quiz/game.js';
import { createQuizHandler } from '../../api/_lib/quiz/handler.js';
import { AVATARS } from '../../quiz/avatars.js';

const questions = count => Array.from({ length: count }, (_, i) => ({ text: `คำถามข้อ ${i + 1}`, options: [`ถูกข้อ ${i + 1}`, 'อีกคำตอบ', 'ยังไม่ใช่', 'ลองใหม่'], correctIndex: 3, id: 'untrusted' }));
function fixture() {
  let time = 1800000000000;
  const store = createMemoryStore({ clock: () => time });
  const handler = createQuizHandler({ getStore: async () => store, clock: () => time });
  return { store, advance(ms) { time += ms; }, async request(action, data = {}, token = '', method = 'POST') {
    let result;
    await handler({ url: '/api/quiz' + (method === 'GET' ? '?' + new URLSearchParams({ action, ...data }) : ''), method, headers: { host: 'www.myclover.com', origin: 'https://www.myclover.com', 'content-type': 'application/json', authorization: 'Bearer ' + token }, ...(method === 'POST' ? { body: JSON.stringify({ action, ...data }) } : {}) },
      { setHeader() {}, end(body) { result = { status: this.statusCode, ...JSON.parse(body) }; } });
    return result;
  } };
}

test('custom sets require 5–20 integer questions and four distinct complete choices', () => {
  for (const n of [5, 12, 20]) assert.ok(checkCustomQuestions(questions(n)).ok);
  for (const n of [0, 4, 21]) assert.equal(checkCustomQuestions(questions(n)).error, 'BAD_QUESTION_COUNT');
  for (const n of [4, 5.5, 21, '5', NaN]) assert.equal(validQuestionCount(n), false);
  for (const value of [null, {}, 'hello', [null, null, null, null, null]]) assert.equal(checkCustomQuestions(value).ok, false);
  const q = questions(5);
  q[2].options[1] = '  ถูกข้อ 3  ';assert.equal(checkCustomQuestions(q).error, 'DUPLICATE_OPTIONS');assert.equal(checkCustomQuestions(q).index, 2);
  q[2].options = ['Ａ', 'a', 'b', 'c'];assert.equal(checkCustomQuestions(q).error, 'DUPLICATE_OPTIONS');
  q[2].options = ['a', 'b', 'c', ''];assert.equal(checkCustomQuestions(q).error, 'BAD_OPTIONS');
  q[2].options = ['a', 'b', 'c'];assert.equal(checkCustomQuestions(q).error, 'BAD_OPTIONS');
  q[2].options = ['a', 'b', 'c', { toString: () => 'd' }];assert.equal(checkCustomQuestions(q).error, 'BAD_OPTIONS');
  q[2].options = ['a', 'b', 'c', 'd'];q[2].text = 'a'.repeat(241);assert.equal(checkCustomQuestions(q).error, 'BAD_QUESTION_TEXT');
  q[2].text = 'x\u200b';assert.equal(checkCustomQuestions(q).error, 'BAD_QUESTION_TEXT');
  q[2].text = '  2 < 3 ใช่ไหม?  ';assert.equal(checkCustomQuestions(q).questions[2].text, '2 < 3 ใช่ไหม?');
  q[2].options[3] = 'ง'.repeat(101);assert.equal(checkCustomQuestions(q).error, 'BAD_OPTIONS');
});

test('custom shuffle keeps the first choice as the answer regardless of submitted answer index', () => {
  const input = questions(20), original = JSON.stringify(input);
  for (let run = 0; run < 30; run++) {
    for (const [index, q] of prepareQuestions(30, input).entries()) {
      assert.equal(q.options[q.correctIndex], input[index].options[0]);
      assert.deepEqual([...q.options].sort(), [...input[index].options].sort());
      assert.equal(q.id, index + 1);assert.equal(q.seconds, 30);
    }
  }
  assert.equal(JSON.stringify(input), original, 'editing/shuffling must not corrupt the saved draft');
});

test('draft restoration preserves hidden questions when reducing then increasing the count', () => {
  const draft = restoreDraft({ count: 20, questions: questions(20) });
  draft.count = 5;
  const restored = restoreDraft(JSON.parse(JSON.stringify(draft)));
  assert.equal(restored.count, 5);assert.equal(restored.questions[19].text, 'คำถามข้อ 20');
  restored.count = 20;assert.equal(checkCustomQuestions(restored.questions).ok, true);
  assert.equal(questionIsComplete(restored.questions[19]), true);
  assert.equal(questionIsComplete({ text: '', options: ['', '', '', ''] }), false);
  for (const saved of [null, {}, { count: 99, questions: 'broken' }]) {
    const recovered = restoreDraft(saved);assert.equal(recovered.count, 5);assert.equal(recovered.questions.length, 20);
  }
});

test('API names the original pack, validates custom requests before saving, and accepts 20 full Thai questions', async () => {
  const f = fixture();
  const standard = await f.request('create');assert.equal(standard.status, 201);
  assert.equal(f.store.inspect(standard.code).room.title, ANNIVERSARY_TITLE);
  assert.equal(f.store.inspect(standard.code).room.questions.length, 12);
  for (const data of [{ mode: 'other' }, { mode: 'custom' }, { mode: 'custom', questions: questions(4) }, { mode: 'custom', questions: questions(21) }, { mode: 'custom', questions: questions(5).map(q => ({ ...q, options: ['same', 'same', 'same', 'same'] })) }]) {
    const response = await f.request('create', data);assert.equal(response.status, 400);assert.equal(response.hostToken, undefined);
  }
  const long = questions(20).map(q => ({ ...q, text: 'ก'.repeat(240), options: ['ก', 'ข', 'ค', 'ง'].map(letter => letter.repeat(100)) }));
  const created = await f.request('create', { mode: 'custom', title: 'คืนเกมของเรา', seconds: 60, questions: long });
  assert.equal(created.status, 201);assert.equal(f.store.inspect(created.code).room.questions.length, 20);
  const lobby = await f.request('state', { code: created.code }, '', 'GET');assert.equal(lobby.title, 'คืนเกมของเรา');assert.equal(lobby.total, 20);assert.equal(lobby.question, null);assert.ok(!JSON.stringify(lobby).includes('correctIndex'));
  assert.equal((await f.request('create', { title: 'x'.repeat(100000) })).status, 413);
});

for (const count of [5, 20]) test(`${count}-question custom game finishes all rounds with 100 players, private answer keys and speed scores`, async () => {
  const f = fixture(), source = questions(count);
  const created = await f.request('create', { mode: 'custom', questions: source, seconds: 10 });assert.equal(created.status, 201);
  const { code, hostToken } = created;
  const players = Array.from({ length: 100 }, (_, i) => ({ name: 'คนเล่น ' + i, token: newToken() }));
  const joined = await Promise.all(players.map(p => f.request('join', { code, name: p.name, avatar: AVATARS[0].id }, p.token)));
  assert.ok(joined.every(r => r.status === 200));
  assert.equal((await f.request('join', { code, name: 'คนเกิน', avatar: AVATARS[0].id }, newToken())).error, 'ROOM_FULL');
  let response = await f.request('start', { code, version: 0 }, hostToken), version = response.state.version;
  for (let index = 0; index < count; index++) {
    f.advance(4000);
    const q = f.store.inspect(code).room.questions[index];
    assert.equal(q.options[q.correctIndex], source[index].options[0]);
    const early = await f.request('state', { code }, '', 'GET');assert.equal(early.question.correctIndex, undefined);assert.equal(early.total, count);
    await Promise.all(players.slice(0, 50).map(p => f.request('answer', { code, index, choice: q.correctIndex }, p.token)));
    f.advance(5000);
    await Promise.all(players.slice(50).map(p => f.request('answer', { code, index, choice: q.correctIndex }, p.token)));
    const masked = await f.request('state', { code }, '', 'GET');assert.equal(masked.answered, 100);assert.equal(masked.players[0].score, index * 1000);
    f.advance(5000);
    const reveal = await f.request('state', { code }, '', 'GET');assert.equal(reveal.question.correctIndex, q.correctIndex);assert.equal(reveal.players[0].score, (index + 1) * 1000);assert.equal(reveal.players.at(-1).score, (index + 1) * 750);
    response = await f.request('leaderboard', { code, version }, hostToken);assert.equal(response.status, 200);version = response.state.version;
    response = await f.request('next', { code, version }, hostToken);assert.equal(response.status, 200);version = response.state.version;
  }
  assert.equal(response.state.phase, 'finished');assert.equal(response.state.total, count);assert.equal(response.state.players[0].score, count * 1000);assert.equal(response.state.players.at(-1).correct, count);
});
