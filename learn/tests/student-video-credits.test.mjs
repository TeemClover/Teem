import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStudentVideoCredits, showStudentVideoCredits } from '../assets/student-video-credits.js';

const eligible = { courseId: 'ai-sauce', lessonId: 'ADV03', access: { status: 'active' } };
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.text = ''; this.hidden = false; }
  set textContent(value) { this.text = value; this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ''; this.children = children; }
  all() { return this.children.flatMap(child => [child, ...child.all()]); }
}
const mount = () => { const container = new Element('section'); container.ownerDocument = { createElement: tag => new Element(tag) }; return container; };

test('student video privilege appears only in the active AI Sauce video lesson', () => {
  assert.equal(showStudentVideoCredits(eligible), true);
  for (const lessonId of ['EP06', 'EP07', 'FOUNDATION', 'ADV02', 'CH06', null])
    assert.equal(showStudentVideoCredits({ ...eligible, lessonId }), false);
  for (const status of ['registered', 'pending', 'expired', 'revoked', 'rejected', null])
    assert.equal(showStudentVideoCredits({ ...eligible, access: { status } }), false);
  assert.equal(showStudentVideoCredits({ ...eligible, courseId: 'other-course' }), false);
  assert.equal(showStudentVideoCredits({ ...eligible, access: { active: true } }), false);
  assert.equal(showStudentVideoCredits(), false);
});

test('card explains the new-account total and opens only the partner page in a new tab', () => {
  const container = mount(); renderStudentVideoCredits(container, eligible);
  assert.equal(container.hidden, false);
  assert.match(container.textContent, /เครดิตฟรีเริ่มต้นรวม 50 เครดิต/);
  assert.match(container.textContent, /บัญชี Airova ใหม่/);
  assert.match(container.textContent, /ไม่ใช่เครดิตเพิ่มสำหรับบัญชีเดิม/);
  assert.match(container.textContent, /ตรวจยอดเครดิตหลังสมัคร/);
  assert.equal(container.all().filter(node => node.tagName === 'li').length, 3);
  const links = container.all().filter(node => node.tagName === 'a');
  assert.equal(links.length, 1); assert.equal(links[0].href, '/airova/');
  assert.equal(links[0].target, '_blank'); assert.equal(links[0].rel, 'noopener noreferrer');
  assert.equal(container.all().filter(node => ['iframe', 'video', 'script'].includes(node.tagName)).length, 0);
});

test('course, lesson and account changes remove both the offer text and outbound link', () => {
  for (const next of [undefined, { ...eligible, lessonId: 'EP07' }, { ...eligible, courseId: 'other' }, { ...eligible, access: { status: 'pending' } }]) {
    const container = mount(); renderStudentVideoCredits(container, eligible); renderStudentVideoCredits(container, next);
    assert.equal(container.hidden, true); assert.equal(container.textContent, ''); assert.equal(container.children.length, 0);
  }
});
