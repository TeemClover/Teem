// X-VISOR QUEST 3.0 (Clip Edition): rules of the game, checked without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../../xvisor/play/sim.js';
import { TUTORIAL_OFFER, XIRCLE_STARTER, DIRECT_MENTORING_RULE, getRetailTier } from '../../xvisor/quest/game-commercial-config.js';

const best = (s) => G.currentQuiz(s).options.findIndex((o) => o.score > 0);
function playAll(seed, pick) {
  let s = G.newGame(seed);
  while (s.phase === 'play') {
    let guard = 0;
    while (s.moves > 0 && guard++ < 8) { const r = pick(s); s = r.ok ? r.state : G.makeClip(s, best(s)).state; }
    s = G.endMonth(s).state;
  }
  return s;
}
const companion = (s) => {
  if (s.dms >= 3) return G.replyChats(s);
  if (G.habitScore(s) < 60) return G.selfCare(s);
  if (G.recruitable(s) > 0) return G.teachTeam(s);
  if (!s.shop && s.month >= 3) return G.openShop(s);
  return G.makeClip(s, best(s));
};

test('money uses the QUEST 2.0 rules: starter set, monthly renewal, retail tiers, 20% mentoring', () => {
  assert.equal(G.FIRST_ORDER.baht, TUTORIAL_OFFER.price + XIRCLE_STARTER.price);
  assert.equal(G.FIRST_ORDER.xv, TUTORIAL_OFFER.xv + XIRCLE_STARTER.xv);
  assert.equal(G.RENEWAL.baht, TUTORIAL_OFFER.price);
  for (const [baht, xv] of [[12480, 9495], [74900, 70000], [149800, 140000]]) {
    const tier = getRetailTier(baht);
    assert.equal(G.retailIncome(baht, xv).income, Math.round(xv * tier.rate));
    assert.equal(G.mentoringIncome(baht, xv), Math.round(Math.round(xv * tier.rate) * DIRECT_MENTORING_RULE.rate));
  }
  assert.equal(G.retailIncome(30000, 28000).tier.label, '20%');
  assert.equal(G.retailIncome(60000, 56000).tier.label, '23%');
  assert.equal(G.retailIncome(120000, 112000).tier.label, '25%');
});

test('a month has three moves, and a full game lasts twelve months', () => {
  let s = G.newGame(1);
  assert.equal(s.moves, 3);
  for (let i = 0; i < 3; i++) s = G.makeClip(s, best(s)).state;
  assert.equal(s.moves, 0);
  assert.equal(G.makeClip(s, 0).ok, false, 'a fourth move in the same month is refused');
  const end = playAll(1, companion);
  assert.equal(end.phase, 'done');
  assert.equal(end.history.length, G.MONTHS);
  assert.equal(end.totals.income, end.history.reduce((a, h) => a + h.income, 0));
});

test('the same seed and the same choices give the same game', () => {
  assert.deepEqual(playAll(42, companion), playAll(42, companion));
  assert.notDeepEqual(playAll(42, companion).history, playAll(43, companion).history);
});

test('clips are assets: a clip keeps earning views in later months, less each time', () => {
  let s = G.makeClip(G.newGame(5), best(G.newGame(5))).state;
  const first = G.endMonth(s); s = first.state;
  const second = G.endMonth(s);
  assert.ok(first.report.viewsMe > 0);
  assert.ok(second.report.viewsMe > 0, 'last month\'s clip is still running');
  assert.ok(second.report.viewsMe < first.report.viewsMe);
});

test('a clip that breaks a claim or consent rule gets no reach', () => {
  const s0 = G.newGame(9);
  const risky = G.currentQuiz(s0).options.findIndex((o) => o.risk);
  const made = G.makeClip(s0, risky);
  assert.equal(made.risk, true);
  assert.equal(made.clip.flag, true);
  assert.equal(G.endMonth(made.state).report.viewsMe, 0);
});

test('every clip decision has exactly one best answer, and each answer explains itself', () => {
  assert.equal(G.QUIZ.length, 12);
  assert.equal(G.LESSONS.length, G.MONTHS);
  for (const q of G.QUIZ) {
    assert.equal(q.options.length, 3, q.id);
    assert.equal(q.options.filter((o) => o.score > 0).length, 1, q.id);
    for (const o of q.options) assert.ok(o.why.length > 10, q.id);
    assert.ok(q.options.filter((o) => o.risk).every((o) => o.score < 0), q.id);
  }
});

test('looking after yourself pays: a higher habit score beats ignoring it', () => {
  const ignore = (s) => {
    if (s.dms >= 3) return G.replyChats(s);
    if (G.recruitable(s) > 0) return G.teachTeam(s);
    return G.makeClip(s, best(s));
  };
  const avg = (pick) => [1, 7, 42, 99, 2026].reduce((a, seed) => a + playAll(seed, pick).totals.income, 0) / 5;
  assert.ok(avg(companion) > avg(ignore) * 1.2);
});

test('clips alone earn nothing until someone answers the chats', () => {
  const s = playAll(3, (st) => G.makeClip(st, best(st)));
  assert.equal(s.totals.income, 0);
  assert.ok(s.dms > 0);
});

test('a team member needs three regular customers first, then posts a clip every month', () => {
  let s = G.newGame(11);
  assert.equal(G.teachTeam(s).ok, false);
  s = { ...s, customers: 3 };
  const t = G.teachTeam(s);
  assert.equal(t.ok, true);
  assert.equal(t.kind, 'new');
  const r = G.endMonth(t.state);
  assert.equal(r.report.teamNewClips, 1);
  assert.equal(r.state.totals.teamClips, 1);
  assert.equal(r.state.team[0].clips, 1);
});

test('the save survives a round trip and rejects other versions', () => {
  const s = G.endMonth(G.makeClip(G.newGame(2), 0).state).state;
  assert.deepEqual(G.parseSave(JSON.stringify(s)), s);
  assert.equal(G.parseSave('{"v":2}'), null);
  assert.equal(G.parseSave('nope'), null);
});

test('game copy never promises a result', () => {
  const text = JSON.stringify([G.QUIZ.map((q) => q.options.filter((o) => !o.risk)), G.LESSONS]);
  assert.doesNotMatch(text, /รับประกัน|หายขาด|การันตี/);
});
