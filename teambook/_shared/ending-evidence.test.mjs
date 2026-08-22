import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEndingArtBriefs, buildEndingEvidence, endingVoteWinner,
} from './ending-evidence.js';

function baseParty(overrides = {}) {
  return {
    id: 'book-1', code: '12345', name: 'กินข้าวกับใครก็ได้', state: 'COMPLETED',
    activity: 'กินให้ดี', commitRule: 'กินแล้วให้คนที่กินด้วยกดเห็นแล้ว', verificationMode: 'confirm',
    durationDays: 3, startAt: '2026-08-17T03:00:00.000Z', endAt: '2026-08-21T03:00:00.000Z',
    members: [
      { userId: 'u1', alias: 'Som', role: 'lead', joinedAt: '2026-08-17T03:00:00.000Z' },
      { userId: 'u2', alias: 'Teem', role: 'member', joinedAt: '2026-08-17T03:10:00.000Z' },
    ],
    memberHistory: [],
    petId: 'white_cat', npcCardId: null,
    log: [], events: [],
    ...overrides,
  };
}

function commit(seq, userId, at, extra = {}) {
  return {
    seq, userId, alias: userId === 'u1' ? 'Som' : 'Teem', kind: 'commit', body: '✓',
    sentAt: at, retracted: false, valid: true, reactions: {}, confirmedBy: null, ...extra,
  };
}

test('a state change alone never becomes a turning point', () => {
  const party = baseParty({
    log: [commit(1, 'u1', '2026-08-17T05:00:00.000Z')],
    events: [{ type: 'NPC_CHANGED', actorId: 'u1', partyDay: 1, data: { from: 'pig', to: 'white_pom' }, at: '2026-08-17T04:00:00.000Z' }],
  });
  const evidence = buildEndingEvidence(party);
  assert.equal(evidence.rankedEvents[0].classification, 'detail');
  assert.notEqual(evidence.moment?.kind === 'event' && evidence.moment?.type, 'NPC_CHANGED');
});

test('a busy meaningful day does not make an unrelated companion swap a turning point', () => {
  const party = baseParty({
    log: [
      commit(1, 'u1', '2026-08-17T05:00:00.000Z', { confirmedBy: 'u2', reactions: { '🍀': ['u2'] } }),
      commit(2, 'u2', '2026-08-17T05:20:00.000Z', { confirmedBy: 'u1' }),
      { seq: 3, userId: 'u1', alias: 'Som', kind: 'message', body: 'กินด้วยกันวันนี้', sentAt: '2026-08-17T05:30:00.000Z', retracted: false, reactions: {} },
      { seq: 4, userId: 'u2', alias: 'Teem', kind: 'message', body: 'โอเค', sentAt: '2026-08-17T05:31:00.000Z', retracted: false, reactions: {} },
    ],
    events: [{ type: 'NPC_CHANGED', actorId: 'u1', partyDay: 1, data: { from: 'pig', to: 'white_pom' }, at: '2026-08-17T04:00:00.000Z' }],
  });
  const evidence = buildEndingEvidence(party);
  assert.equal(evidence.rankedEvents[0].classification, 'detail');
  assert.equal(evidence.moment.kind, 'shared_day');
  assert.equal(evidence.moment.dayKey, '2026-08-17');
});

test('a state change may become a turning point only with direct meaning evidence', () => {
  const party = baseParty({
    log: [commit(1, 'u1', '2026-08-17T05:00:00.000Z', { confirmedBy: 'u2' })],
    events: [{
      type: 'NPC_CHANGED', actorId: 'u1', partyDay: 1,
      data: { from: 'pig', to: 'white_pom', userPinned: true, reflection: 'ตรงนี้สำคัญกับเรา' },
      at: '2026-08-17T04:00:00.000Z',
    }],
  });
  const evidence = buildEndingEvidence(party);
  assert.equal(evidence.rankedEvents[0].classification, 'turning_point');
  assert.equal(evidence.moment.kind, 'event');
  assert.ok(evidence.rankedEvents[0].directMeaningSignals.length >= 1);
});

test('target duration, lived calendar span and active days remain separate facts', () => {
  const party = baseParty({
    log: [
      commit(1, 'u1', '2026-08-17T05:00:00.000Z'),
      commit(2, 'u1', '2026-08-19T05:00:00.000Z'),
      commit(3, 'u1', '2026-08-21T05:00:00.000Z'),
    ],
  });
  const evidence = buildEndingEvidence(party);
  assert.equal(evidence.book.targetDays, 3);
  assert.equal(evidence.book.calendarDays, 5);
  assert.equal(evidence.book.activeDays, 3);
  assert.equal(evidence.conflicts[0].code, 'TARGET_SPAN_MISMATCH');
});

test('short completed book is complete while the art still leaves continuity', () => {
  const evidence = buildEndingEvidence(baseParty());
  const briefs = buildEndingArtBriefs(evidence, { personaPrompt: 'PATTERN CARETAKER.' });
  assert.equal(briefs.length, 3);
  assert.match(briefs[0].prompt, /book itself is complete/i);
  assert.doesNotMatch(briefs[0].prompt, /unfinished failure/i);
  assert.match(briefs[2].prompt, /still life/i);
});

test('vote result exposes ties instead of pretending consensus', () => {
  const result = endingVoteWinner([
    { candidateId: 'A' }, { candidateId: 'B' },
  ]);
  assert.equal(result.winner, 'A');
  assert.deepEqual(result.tied, ['A', 'B']);
  assert.deepEqual(result.counts, { A: 1, B: 1, C: 0 });
});
