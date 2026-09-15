import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeReviews, loadPublicReviews, renderReviews } from '../../ai-source/student-reviews.js';

const first = { consentMode: 'named', displayName: 'ผู้ทดสอบสมมติ', roleCompany: 'อาชีพสมมติ', recommend: 'ข้อความทดสอบ ไม่ใช่รีวิวจริง' };
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
  const cards = normalizeReviews({ ok: true, reviews: [workshop, { ...workshop, source: null }, { ...workshop, source: { id: 'another-class' } }, { ...workshop, consent: 'private' }] }, 'workshop');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].sourceLabel, 'The Dent · คลาสสด');
  assert.equal(cards[0].name, 'ผู้เรียน The Dent');
  assert.equal(cards[0].role, '');
});

test('public loads omit credentials, disable caches, retain a healthy source when the other fails, and cap cards', async () => {
  const calls = [];
  const cards = await loadPublicReviews(async (url, options) => {
    calls.push([url, options]);
    if (url.includes('course-reviews')) throw new Error('offline');
    return response(Array.from({ length: 9 }, (_, i) => ({ ...first, recommend: `ข้อความสมมติ ${i}` })));
  });
  assert.equal(cards.length, 6);
  assert.equal(calls.length, 2);
  for (const [url, options] of calls) {
    assert.match(url, /^\/api\/(first-class-review|course-reviews)\?public=1$/);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
  }
  assert.deepEqual(await loadPublicReviews(async () => ({ ok: false })), []);
  assert.deepEqual(await loadPublicReviews(async () => { throw new Error('offline'); }), []);
});

test('the two known classes interleave without changing original wording', async () => {
  const cards = await loadPublicReviews(async url => response(url.includes('first-class') ? [first, { ...first, recommend: 'อีกข้อความสมมติ' }] : [workshop]));
  assert.deepEqual(cards.map(card => card.sourceId), ['first-class', 'the-dent', 'first-class']);
  assert.equal(cards[0].quote, first.recommend);
  assert.equal(cards[1].quote, workshop.testimonial);
});

// Minimal DOM forbids HTML insertion, so untrusted review text can only be rendered as text.
class Element {
  children = []; textContent = ''; hidden = true;
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  set innerHTML(_) { throw new Error('Never insert review HTML'); }
}
test('rendering escapes review markup, makes provenance visible, and clears stale cards when empty', () => {
  const nodes = Object.fromEntries(['student-reviews', 'student-review-list', 'student-review-context'].map(id => [id, new Element()]));
  const document = { getElementById: id => nodes[id], createElement: () => new Element() };
  const malicious = '<img src=x onerror=alert(1)> ข้อความทดสอบ';
  renderReviews(document, normalizeReviews({ ok: true, reviews: [{ ...first, recommend: malicious }, { ...first, consentMode: 'anonymous' }] }, 'first-class'));
  assert.equal(nodes['student-reviews'].hidden, false);
  assert.equal(nodes['student-review-list'].children[0].children[1].textContent, malicious);
  assert.match(nodes['student-review-context'].textContent, /คลาสสด First Class รุ่นแรก/);
  assert.ok(!nodes['student-review-context'].textContent.includes('The Dent'));
  assert.equal(nodes['student-review-list'].children[1].children[2].children[0].textContent, 'ผู้เรียน First Class');
  renderReviews(document, []);
  assert.equal(nodes['student-reviews'].hidden, true);
  assert.equal(nodes['student-review-list'].children.length, 0);
});

test('the real sales page loads the section before the instructor and keeps the trial CTA', async () => {
  const html = await readFile(new URL('../../ai-source/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="student-reviews"[^>]*hidden/);
  assert.match(html, /type="module" src="student-reviews\.js\?v=1"/);
  assert.ok(html.indexOf('id="student-reviews"') < html.indexOf('id="instructor"'));
  assert.match(html, /student-review-actions[\s\S]*?href="\/classroom\/"/);
});
