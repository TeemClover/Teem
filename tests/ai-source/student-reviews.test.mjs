import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeReviews, summarizeReviews, loadPublicReviews, renderReviews } from '../../ai-source/student-reviews.js';

const first = { consentMode: 'named', displayName: 'ผู้ทดสอบสมมติ', roleCompany: 'อาชีพสมมติ', recommend: 'ข้อความทดสอบ ไม่ใช่รีวิวจริง', score: 9 };
const workshop = { consent: 'anonymous', displayName: 'ชื่อภายใน', role: 'ตำแหน่งภายใน', testimonial: 'ข้อความทดสอบจากคลาสสด', source: { id: 'the-dent' } };
const response = reviews => ({ ok: true, json: async () => ({ ok: true, reviews }) });

test('only permitted public quotes enter the sales page; anonymous identity and role stay redacted', () => {
  const reviews = normalizeReviews({ ok: true, reviews: [first, { ...first, consentMode: 'anonymous' }, { ...first, consentMode: 'private' }, { ...first, recommend: '' }, null] }, 'first-class');
  assert.equal(reviews.length, 2);
  assert.equal(reviews[0].role, first.roleCompany);
  assert.equal(reviews[0].name, first.displayName);
  assert.equal(reviews[1].name, 'ผู้เรียน First Class');
  assert.equal(reviews[1].role, '');
  assert.equal(reviews[1].anonymous, true);
  assert.deepEqual(normalizeReviews({ ok: false, reviews: [first] }, 'first-class'), []);
  assert.deepEqual(normalizeReviews({ ok: true, reviews: [first] }, 'admin'), []);
});

test('workshop cards require explicit known source attribution and never turn unknown cohorts into The Dent', () => {
  const cards = normalizeReviews({ ok: true, reviews: [{ ...workshop, score: 10 }, { ...workshop, source: null }, { ...workshop, source: { id: 'another-class' } }, { ...workshop, consent: 'private' }] }, 'workshop');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].sourceLabel, 'The Dent · คลาสสด');
  assert.equal(cards[0].name, 'ผู้เรียน The Dent');
  assert.equal(cards[0].role, '');
  assert.equal(cards[0].score, null);
});

test('only valid original First Class scores normalize and anonymous consent keeps the score without identity', () => {
  const values = [1, 10, 9, 0, 11, 4.5, '10', null, undefined, NaN, Infinity];
  const cards = normalizeReviews({ ok: true, reviews: values.map(score => ({ ...first, consentMode: 'anonymous', score })) }, 'first-class');
  assert.deepEqual(cards.map(card => card.score), [1, 10, 9, null, null, null, null, null, null, null, null]);
  assert.ok(cards.every(card => card.name === 'ผู้เรียน First Class' && card.role === ''));
  assert.equal(summarizeReviews([{ ...cards[0], sourceId: 'the-dent' }]), null);
  assert.equal(summarizeReviews(cards.slice(3)), null);
});

test('public loads omit credentials, disable caches, retain a healthy source when the other fails, and cap cards', async () => {
  const calls = [];
  const { reviews: cards, summary } = await loadPublicReviews(async (url, options) => {
    calls.push([url, options]);
    if (url.includes('course-reviews')) throw new Error('offline');
    return response(Array.from({ length: 9 }, (_, i) => ({ ...first, recommend: `ข้อความสมมติ ${i}` })));
  });
  assert.equal(cards.length, 6);
  assert.equal(summary.count, 9);
  assert.equal(calls.length, 2);
  for (const [url, options] of calls) {
    assert.match(url, /^\/api\/(first-class-review|course-reviews)\?public=1$/);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
  }
  assert.deepEqual(await loadPublicReviews(async () => ({ ok: false })), { reviews: [], summary: null });
  assert.deepEqual(await loadPublicReviews(async () => { throw new Error('offline'); }), { reviews: [], summary: null });
});

test('the two known classes interleave without changing original wording', async () => {
  const { reviews: cards } = await loadPublicReviews(async url => response(url.includes('first-class') ? [first, { ...first, recommend: 'อีกข้อความสมมติ' }] : [workshop]));
  assert.deepEqual(cards.map(card => card.sourceId), ['first-class', 'the-dent', 'first-class']);
  assert.equal(cards[0].quote, first.recommend);
  assert.equal(cards[1].quote, workshop.testimonial);
});

test('summary uses every eligible public score before card selection and does not mix workshop ratings', async () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({ ...first, score: i + 1, recommend: `ความคิดเห็นสมมติ ${i}` }));
  rows.push({ ...first, consentMode: 'private', score: 10 }, { ...first, score: 100 });
  const result = await loadPublicReviews(async url => response(url.includes('first-class') ? rows : [{ ...workshop, score: 10 }]));
  assert.equal(result.reviews.length, 6);
  assert.equal(result.reviews[1].sourceId, 'the-dent');
  assert.deepEqual(result.summary, { sourceId: 'first-class', count: 9, averageScore: 5, starsOutOf5: 2.5 });
});

test('request and response-body stalls are bounded while the healthy source still renders', async () => {
  for (const stalledAt of ['fetch', 'body']) {
    const signals = {};
    const result = await loadPublicReviews(async (url, options) => {
      if (url.includes('first-class')) {
        signals.first = options.signal;
        if (stalledAt === 'fetch') return new Promise(() => {});
        return { ok: true, json: () => new Promise(() => {}) };
      }
      signals.workshop = options.signal;
      return response([workshop]);
    }, { timeoutMs: 10 });
    assert.deepEqual(result.reviews.map(card => card.sourceId), ['the-dent']);
    assert.equal(result.summary, null);
    assert.equal(signals.first.aborted, true);
    assert.equal(signals.workshop.aborted, false);
  }
});

// Minimal DOM forbids HTML insertion, so untrusted review text can only be rendered as text.
class Element {
  children = []; textContent = ''; hidden = true; style = {}; attributes = {};
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  set innerHTML(_) { throw new Error('Never insert review HTML'); }
}
const childByClass = (node, className) => node.children.find(child => child.className === className);
const fakeDocument = () => {
  const nodes = Object.fromEntries(['student-reviews', 'student-review-list', 'student-review-context', 'student-review-summary'].map(id => [id, new Element()]));
  return { nodes, document: { getElementById: id => nodes[id], createElement: tagName => Object.assign(new Element(), { tagName }) } };
};
test('rendering escapes review markup, makes provenance visible, and clears stale cards when empty', () => {
  const { nodes, document } = fakeDocument();
  const malicious = '<img src=x onerror=alert(1)> ข้อความทดสอบ';
  renderReviews(document, normalizeReviews({ ok: true, reviews: [{ ...first, recommend: malicious }, { ...first, consentMode: 'anonymous' }] }, 'first-class'));
  assert.equal(nodes['student-reviews'].hidden, false);
  assert.equal(nodes['student-review-list'].children[0].children.find(child => child.tagName === 'blockquote').textContent, malicious);
  assert.match(nodes['student-review-context'].textContent, /คลาสสด First Class รุ่นแรก/);
  assert.ok(!nodes['student-review-context'].textContent.includes('The Dent'));
  assert.equal(nodes['student-review-list'].children[1].children.find(child => child.tagName === 'figcaption').children[0].textContent, 'ผู้เรียน First Class');
  renderReviews(document, []);
  assert.equal(nodes['student-reviews'].hidden, true);
  assert.equal(nodes['student-review-list'].children.length, 0);
});

test('stars preserve actual fractional scores with an accessible scale and workshops have no rating', () => {
  const { nodes, document } = fakeDocument();
  const cards = [
    ...normalizeReviews({ ok: true, reviews: [first] }, 'first-class'),
    ...normalizeReviews({ ok: true, reviews: [{ ...workshop, score: 10 }] }, 'workshop'),
  ];
  const summary = { sourceId: 'first-class', count: 7, averageScore: 53 / 7, starsOutOf5: 53 / 14 };
  renderReviews(document, cards, summary);
  const rating = childByClass(nodes['student-review-list'].children[0], 'student-review-rating');
  assert.equal(rating.attributes.role, 'img');
  assert.match(rating.attributes['aria-label'], /9 จาก 10.*4\.5 จาก 5 ดาว/);
  const stars = childByClass(rating, 'student-review-stars');
  assert.equal(stars.attributes['aria-hidden'], 'true');
  assert.equal(childByClass(stars, 'student-review-stars-fill').style.width, '90%');
  assert.equal(childByClass(rating, 'student-review-score').textContent, '9/10');
  assert.equal(childByClass(nodes['student-review-list'].children[1], 'student-review-rating'), undefined);
  assert.equal(nodes['student-review-summary'].hidden, false);
  assert.match(childByClass(nodes['student-review-summary'], 'student-review-summary-copy').textContent, /เผยแพร่ 7 รีวิว · First Class รุ่นแรก \(คลาสสดที่ผ่านมา\)/);
  assert.equal(childByClass(childByClass(nodes['student-review-summary'], 'student-review-rating'), 'student-review-score').textContent, '7.57/10');
  renderReviews(document, cards.slice(1));
  assert.equal(nodes['student-review-summary'].hidden, true);
  assert.equal(nodes['student-review-summary'].children.length, 0);
});

test('the real sales page loads the section before the instructor and keeps the trial CTA', async () => {
  const html = await readFile(new URL('../../ai-source/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="student-reviews"[^>]*hidden/);
  assert.match(html, /type="module" src="student-reviews\.js\?v=2"/);
  assert.match(html, /id="student-review-summary"[^>]*hidden/);
  assert.ok(html.indexOf('id="student-reviews"') < html.indexOf('id="instructor"'));
  assert.match(html, /student-review-actions[\s\S]*?href="\/classroom\/"/);
});
