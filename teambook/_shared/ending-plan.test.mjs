import test from 'node:test';
import assert from 'node:assert/strict';

import { COVER_CANDIDATES, EPISODE_DAYS, endingPlan, episodeOfDay } from './ending-plan.js';
import { buildEndingMarkdown } from './store.js';

/* 7 วัน = 1 ตอน · 28 วัน = 4 ตอน + 1 ปกปิดท้าย · 3 วัน = ปกปิดท้ายอย่างเดียว */

test('the ladder pays one episode per seven full days', () => {
  assert.equal(EPISODE_DAYS, 7);
  assert.equal(endingPlan(3).episodes, 0);
  assert.equal(endingPlan(7).episodes, 1);
  assert.equal(endingPlan(14).episodes, 2);
  assert.equal(endingPlan(28).episodes, 4);
});

test('every finished book earns exactly one closing cover, whatever its length', () => {
  for (const days of [1, 3, 7, 14, 28]) {
    const plan = endingPlan(days);
    assert.equal(plan.closingCover, true, `${days} days must still get a cover`);
    assert.equal(plan.coverCandidates, COVER_CANDIDATES);
    assert.equal(plan.coverCandidates, 3);
  }
});

test('only the closing cover may become the book cover, and it carries no text', () => {
  const plan = endingPlan(28);
  assert.equal(plan.coverEligible, 'closing');
  assert.equal(plan.coverArtAllowsSpeech, false);
  /* Episode art is the opposite: speech in the picture is the point. */
  assert.equal(plan.episodeArtAllowsSpeech, true);
});

test('a book under seven days is written to be continued, not wrapped up', () => {
  assert.equal(endingPlan(3).toBeContinued, true);
  assert.equal(endingPlan(6).toBeContinued, true);
  assert.equal(endingPlan(7).toBeContinued, false);
});

test('episodes tile the days without gap or overlap', () => {
  const plan = endingPlan(28);
  assert.deepEqual(plan.episodeRanges.map(range => [range.fromDay, range.toDay]),
    [[1, 7], [8, 14], [15, 21], [22, 28]]);
  assert.equal(plan.tailDays, null);
  for (let day = 1; day <= 28; day++) {
    assert.ok(episodeOfDay(day, plan) >= 1, `day ${day} must belong to an episode`);
  }
});

test('days past the last whole episode fall to the closing cover, never off the end', () => {
  const plan = endingPlan(10);
  assert.equal(plan.episodes, 1);
  assert.deepEqual(plan.tailDays, { fromDay: 8, toDay: 10 });
  assert.equal(episodeOfDay(9, plan), 0, 'a tail day belongs to no episode');
  const short = endingPlan(3);
  assert.deepEqual(short.tailDays, { fromDay: 1, toDay: 3 });
});

function bookOf(durationDays) {
  return {
    code: '01234', name: 'เดินด้วยกัน', activity: 'เดิน 20 นาที', commitRule: 'เดินจริงแล้วค่อยลงชื่อ',
    activityId: 'walk', durationDays, preset: 'casual', color: 'green', state: 'COMPLETED',
    createdAt: '2026-08-01T00:00:00.000Z', endedAt: '2026-08-29T00:00:00.000Z',
    memberHistory: [{ userId: 'a', alias: 'คีน', role: 'lead', joinedAt: '2026-08-01T00:00:00.000Z' }],
    members: [],
    events: [{ type: 'PARTY_CREATED', partyDay: 1, at: '2026-08-01T00:00:00.000Z', data: { name: 'เดินด้วยกัน' } }],
    log: [
      { seq: 1, kind: 'commit', userId: 'a', body: 'เดินรอบหมู่บ้าน', sentAt: '2026-08-01T08:00:00.000Z', retracted: false, reactions: {} },
      { seq: 2, kind: 'commit', userId: 'a', body: 'เดินอีกรอบ', sentAt: '2026-08-20T08:00:00.000Z', retracted: false, reactions: {} },
    ],
  };
}

test('the sauce carries one section per episode plus the closing cover', () => {
  const md = buildEndingMarkdown(bookOf(28), { generatedAt: '2026-08-30T00:00:00.000Z' });
  const headings = [...md.matchAll(/^## .+$/gm)].map(match => match[0]);
  assert.deepEqual(headings.filter(head => head.startsWith('## ตอนที่')), [
    '## ตอนที่ 1 — วันที่ 1–7',
    '## ตอนที่ 2 — วันที่ 8–14',
    '## ตอนที่ 3 — วันที่ 15–21',
    '## ตอนที่ 4 — วันที่ 22–28',
  ]);
  assert.equal(headings.filter(head => head.startsWith('## ปกปิดท้าย')).length, 1);
});

test('a three-day book gets a cover with no episodes and a to-be-continued brief', () => {
  const md = buildEndingMarkdown(bookOf(3), { generatedAt: '2026-08-30T00:00:00.000Z' });
  assert.doesNotMatch(md, /## ตอนที่/);
  assert.match(md, /## ปกปิดท้าย/);
  assert.match(md, /ยังไม่จบ/);
  assert.match(md, /ห้ามวาดฉากปิดจบ/);
});

test('episode art invites speech; the cover forbids any text in the picture', () => {
  const md = buildEndingMarkdown(bookOf(7), { generatedAt: '2026-08-30T00:00:00.000Z' });
  const episode = md.slice(md.indexOf('## ตอนที่ 1'), md.indexOf('## ปกปิดท้าย'));
  const cover = md.slice(md.indexOf('## ปกปิดท้าย'));
  assert.match(episode, /Speech is allowed/);
  assert.match(cover, /ห้ามมีตัวหนังสือในภาพปก/);
  assert.doesNotMatch(cover, /Speech is allowed/);
});

test('the cover offers three directions to choose one from', () => {
  const md = buildEndingMarkdown(bookOf(14), { generatedAt: '2026-08-30T00:00:00.000Z' });
  const cover = md.slice(md.indexOf('## ปกปิดท้าย'));
  const directions = [...cover.matchAll(/^- \*\*[ABC] · /gm)];
  assert.equal(directions.length, COVER_CANDIDATES);
});

test('an episode reports only what happened inside its own days', () => {
  const md = buildEndingMarkdown(bookOf(28), { generatedAt: '2026-08-30T00:00:00.000Z' });
  const first = md.slice(md.indexOf('## ตอนที่ 1'), md.indexOf('## ตอนที่ 2'));
  const third = md.slice(md.indexOf('## ตอนที่ 3'), md.indexOf('## ตอนที่ 4'));
  /* Day 1 and day 20 each land in their own episode and nowhere else. */
  assert.match(first, /เดินรอบหมู่บ้าน/);
  assert.doesNotMatch(first, /เดินอีกรอบ/);
  assert.match(third, /เดินอีกรอบ/);
  assert.doesNotMatch(third, /เดินรอบหมู่บ้าน/);
});
