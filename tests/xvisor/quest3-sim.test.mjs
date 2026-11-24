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
  if (G.canLead(s)) return G.takeLeadExam(s, 3);
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

test('a month has four moves, and a full game lasts twelve months', () => {
  let s = G.newGame(1);
  assert.equal(G.MOVES_PER_MONTH, 4);
  assert.equal(s.moves, 4);
  for (let i = 0; i < 4; i++) s = G.makeClip(s, best(s)).state;
  assert.equal(s.moves, 0);
  assert.equal(G.makeClip(s, 0).ok, false, 'a fifth move in the same month is refused');
  const end = playAll(1, companion);
  assert.equal(end.phase, 'done');
  assert.equal(end.history.length, G.MONTHS);
  assert.equal(end.totals.income, end.history.reduce((a, h) => a + h.income, 0));
});

test('the same seed and the same choices give the same game', () => {
  assert.deepEqual(playAll(42, companion), playAll(42, companion));
  assert.notDeepEqual(playAll(42, companion).history, playAll(43, companion).history);
});

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

test('clips are assets: a clip keeps earning views in later months, less each time unless it takes off', () => {
  let quiet = 0;
  for (const seed of SEEDS) {
    let s = G.makeClip(G.newGame(seed), best(G.newGame(seed))).state;
    const first = G.endMonth(s); s = first.state;
    const second = G.endMonth(s);
    assert.ok(first.report.viewsMe > 0, `seed ${seed}`);
    assert.ok(second.report.viewsMe > 0, `seed ${seed}: last month's clip is still running`);
    assert.equal(second.report.viewsOld, second.report.viewsMe, 'all of month two comes from the old clip');
    if (first.report.hits || second.report.hits) continue;
    quiet += 1;
    assert.ok(second.report.viewsMe < first.report.viewsMe, `seed ${seed}`);
  }
  assert.ok(quiet > 20);
});

test('a clip can take off in any month: a hit multiplies views, is counted, and makes the clip fresh again', () => {
  let found = 0, oldHit = 0;
  for (const seed of SEEDS) {
    let s = G.newGame(seed);
    while (s.phase === 'play') {
      while (s.moves > 0) s = G.makeClip(s, best(s)).state;
      const before = s.totals.hits;
      const r = G.endMonth(s); s = r.state;
      assert.equal(r.report.hits, r.report.clips.filter((c) => c.hit).length);
      assert.equal(s.totals.hits, before + r.report.hits);
      for (const c of r.report.clips.filter((x) => x.hit)) {
        found += 1; if (c.old) oldHit += 1;
        const clip = s.clips.find((x) => x.id === c.id);
        assert.equal(clip.hot, true);
        assert.equal(clip.age, 0);
        assert.ok(clip.hits >= 1);
        const same = r.report.clips.filter((x) => !x.hit && x.q === c.q && x.age === 0);
        if (same.length) assert.ok(c.views > Math.max(...same.map((x) => x.views)), 'a hit beats a new clip of the same quality');
      }
      assert.equal(s.clips.filter((c) => c.hot).length, r.report.hits);
    }
    assert.equal(s.totals.hits, s.clips.reduce((a, c) => a + c.hits, 0));
  }
  assert.ok(found > 10, 'hits happen');
  assert.ok(oldHit > 0, 'old clips can take off too');
});

test('old clips earn: each month\'s retail income is shared out to the clips that ran', () => {
  for (const seed of [1, 7, 42]) {
    let s = G.newGame(seed);
    while (s.phase === 'play') {
      let guard = 0;
      while (s.moves > 0 && guard++ < 8) { const r = companion(s); s = r.ok ? r.state : G.makeClip(s, best(s)).state; }
      const r = G.endMonth(s); s = r.state;
      const mine = r.report.clips.filter((c) => c.by === 'me');
      const shared = mine.reduce((a, c) => a + c.earned, 0);
      assert.ok(Math.abs(shared - (mine.length ? r.report.retail : 0)) <= mine.length, `seed ${seed} month ${r.report.month}`);
      assert.ok(r.report.oldIncome >= 0 && r.report.oldIncome <= r.report.retail);
    }
    assert.ok(s.totals.oldIncome > 0, 'by the end, old clips have earned money');
    assert.ok(s.totals.oldIncome <= s.totals.income);
    assert.equal(s.clips.filter((c) => c.by !== 'me').every((c) => c.earned === 0), true);
  }
});

test('the score adds up month by month and rewards income, views, new customers and hits', () => {
  let s = G.newGame(8);
  assert.equal(s.score, 0);
  let sum = 0;
  while (s.phase === 'play') {
    let guard = 0;
    while (s.moves > 0 && guard++ < 8) { const r = companion(s); s = r.ok ? r.state : G.makeClip(s, best(s)).state; }
    const r = G.endMonth(s); s = r.state;
    const rep = r.report;
    assert.equal(rep.scoreGain, Math.round(rep.income / 50) + Math.round((rep.viewsMe + rep.viewsTeam) / 10) + rep.joined * 100 + rep.hits * 300 + rep.teamNewClips * 50 + (rep.habit >= 70 ? 100 : 0) + rep.bonus);
    sum += rep.scoreGain;
    assert.equal(rep.scoreTotal, sum);
    assert.equal(s.score, sum);
  }
  assert.ok(s.score > 0);
});

test('the opening exam: three questions, one right answer each, and a pass gives a small habit head start', () => {
  assert.equal(G.EXAM.length, 3);
  for (const q of G.EXAM) {
    assert.equal(q.options.length, 3);
    assert.equal(q.options.filter((o) => o.ok).length, 1);
    assert.ok(q.why.length > 10);
  }
  const zero = G.newGame(1), full = G.newGame(1, { name: 'แดง', exam: 3 });
  assert.equal(full.name, 'แดง');
  assert.equal(G.habitScore(full) - G.habitScore(zero), 9);
  assert.equal(G.newGame(1, { exam: 99 }).exam, 3);
  assert.equal(G.newGame(1, { name: 'ก'.repeat(60) }).name.length, 28);
});

test('every new month opens with one small event, never the same twice in a row', () => {
  assert.equal(G.TOPICS.length, 12);
  assert.deepEqual(G.QUIZ.map((q) => q.topic), [...G.TOPICS], 'each clip decision has its own cover picture');
  const ids = new Set(G.EVENTS.map((e) => e.id));
  assert.equal(ids.size, G.EVENTS.length);
  const seen = new Set();
  for (const seed of SEEDS) {
    let s = G.newGame(seed);
    assert.equal(s.event.id, 'start');
    while (s.phase === 'play') {
      const prev = s.event.id, hadCustomers = s.customers;
      s = G.endMonth(G.makeClip(s, best(s)).state).state;
      if (s.phase !== 'play') { assert.equal(s.event, null); break; }
      assert.ok(ids.has(s.event.id));
      assert.notEqual(s.event.id, prev);
      if (s.event.id === 'refer') assert.ok(s.customers > 0, 'nobody refers a friend before there is a customer');
      assert.equal(s.trend, s.event.id === 'trend');
      seen.add(s.event.id);
      void hadCustomers;
    }
  }
  assert.ok(seen.size >= 7, 'the events vary');
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
    if (G.canLead(s)) return G.takeLeadExam(s, 3);
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

test('the path opens step by step: three regular customers, then the X-LEAD exam (one move, once), then the team', () => {
  let s = G.newGame(11);
  assert.equal(s.lead, false);
  assert.deepEqual(G.path(s).map((p) => p.done), [true, false, false, false]);
  assert.equal(G.canLead(s), false);
  assert.equal(G.takeLeadExam(s, 3).ok, false, 'no exam before three regular customers');
  assert.equal(G.teachTeam(s).ok, false);

  s = { ...s, customers: 3 };
  assert.equal(G.canLead(s), true);
  assert.deepEqual(G.path(s).map((p) => p.done), [true, true, false, false]);
  assert.equal(G.recruitable(s), 0, 'customers alone do not open the team');
  assert.equal(G.teachTeam(s).ok, false, 'no team before the exam');

  const exam = G.takeLeadExam(s, 2);
  assert.equal(exam.ok, true);
  assert.equal(exam.state.lead, true);
  assert.equal(exam.state.moves, s.moves - 1, 'the exam costs one move');
  assert.equal(exam.state.bonus, 400);
  assert.equal(G.takeLeadExam(exam.state, 3).ok, false, 'the exam is taken once');
  assert.equal(G.canLead(exam.state), false);
  assert.deepEqual(G.path(exam.state).map((p) => p.done), [true, true, true, false]);

  const t = G.teachTeam(exam.state);
  assert.equal(t.ok, true);
  assert.equal(t.kind, 'new');
  const r = G.endMonth(t.state);
  assert.equal(r.report.teamNewClips, 1);
  assert.equal(r.report.bonus, 400, 'the exam bonus lands in this month\'s score');
  assert.equal(r.state.bonus, 0);
  assert.equal(r.state.totals.teamClips, 1);
  assert.equal(r.state.team[0].clips, 1);
});

test('team income only exists after X-LEAD: without the exam there is no team and no mentoring income', () => {
  const noExam = (s) => {
    if (s.dms >= 3) return G.replyChats(s);
    if (G.habitScore(s) < 60) return G.selfCare(s);
    return G.makeClip(s, best(s));
  };
  for (const seed of [1, 7, 42]) {
    const solo = playAll(seed, noExam);
    assert.equal(solo.lead, false);
    assert.equal(solo.team.length, 0);
    assert.equal(solo.history.length, G.MONTHS);
    const led = playAll(seed, companion);
    assert.equal(led.lead, true);
    assert.ok(led.team.length > 0);
  }
  assert.equal(G.LEAD_EXAM.length, 3);
  for (const q of G.LEAD_EXAM) {
    assert.equal(q.options.filter((o) => o.ok).length, 1);
    assert.ok(q.why.length > 10);
  }
});

test('the save survives a round trip and rejects other versions', () => {
  const s = G.endMonth(G.makeClip(G.newGame(2, { name: 'แดง', exam: 2 }), 0).state).state;
  assert.deepEqual(G.parseSave(JSON.stringify(s)), s);
  assert.equal(G.parseSave('{"v":2}'), null);
  assert.equal(G.parseSave(JSON.stringify({ ...s, v: 4 })), null, 'a save from an older version starts over');
  assert.equal(G.parseSave('nope'), null);
});

test('game copy never promises a result', () => {
  const text = JSON.stringify([G.QUIZ.map((q) => q.options.filter((o) => !o.risk)), G.LESSONS, G.EVENTS, [...G.EXAM, ...G.LEAD_EXAM].map((q) => [q.ask, q.why, q.options.filter((o) => o.ok)])]);
  assert.doesNotMatch(text, /รับประกัน|หายขาด|การันตี/);
});
