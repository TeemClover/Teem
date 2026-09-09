import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReward, getRewardOutcome, getCarePlan, getWorkPlan, mountReward, AKO_REWARD_IMAGE, FOOD_REWARD_IMAGES} from './rewards.js';
import {existsSync, readFileSync} from 'node:fs';

test('RGBS rewards have bounded versioned empty states; unknown or mismatched records cannot restore', () => {
  for (const color of ['red', 'green', 'blue', 'silver']) {
    const state = validateReward(color);
    assert.equal(state.version, 1);assert.equal(state.color, color);
    assert.equal(getRewardOutcome(color, state).complete, false);
    assert.equal(validateReward(color, {version: 2}), null);
    assert.equal(validateReward(color, {color: 'unknown'}), null);
    assert.equal(validateReward(color, []), null);
    assert.equal(validateReward(color, 'raw text'), null);
  }
  assert.equal(validateReward('purple', {}), null);
});

test('reward restore strips unknown properties and never trusts completion without its required action', () => {
  const red = validateReward('red', {flavor: 'unknown', opened: true, email: 'private'});
  assert.equal(red.opened, false);assert.equal('email' in red, false);
  assert.equal(validateReward('green', {moment: 'now', complete: true}).complete, false);
  assert.equal(validateReward('blue', {scenario: '__proto__', compared: true}).compared, false);
  assert.equal(validateReward('blue', {scenario: 'network', compared: true}).compared, false);
  assert.equal(validateReward('silver', {title: 'x', complete: true}).complete, false);
  assert.equal(validateReward('silver', {title: '\n\0 ', edited: true, complete: true}).complete, false);
});

test('craft title has a Unicode-aware bound and controls are removed; content stays plain text', () => {
  const state = validateReward('silver', {title: '🙂'.repeat(100), edited: true, design: 'bad', complete: true});
  assert.equal(Array.from(state.title).length, 52);
  assert.equal(state.design, 'editorial');assert.equal(state.complete, true);
  assert.equal(validateReward('silver', {title: 'a\u0000b\u0085c'}).title, 'abc');
});

test('each valid outcome is specific to what the visitor actually selected', () => {
  const cases = [
    ['red', {flavor: 'bright', opened: true}, /มะนาว/],
    ['red', {flavor: 'warm', opened: true}, /งาคั่ว/],
    ['green', {context: 'sleep', moment: 'next', complete: true}, /ก่อนนอน/],
    ['green', {context: 'move', moment: 'now', complete: true}, /เปลี่ยน/],
    ['blue', {scenario: 'executive', compared: true}, /ตัดสินใจ/],
    ['blue', {scenario: 'course', compared: true}, /เรียน AI/],
    ['silver', {title: 'ของที่ฉันสร้าง', edited: true, complete: true}, /ของที่ฉันสร้าง/]
  ];
  for (const [color, state, match] of cases) {
    const outcome = getRewardOutcome(color, state);
    assert.equal(outcome.complete, true);assert.match(`${outcome.title} ${outcome.summary}`, match);
  }
});

test('a care rhythm binds the selected action to a concrete daily anchor without claiming completion of it', () => {
  for (const context of ['sleep', 'move', 'food']) {
    const before = getCarePlan({context});
    assert.equal(before.anchor, '');assert.equal(before.summary, '');
    const action = validateReward('green', {context}).action;
    const now = getCarePlan({context, moment: 'now', action, complete: true});
    const next = getCarePlan({context, moment: 'next', action, complete: true});
    assert.notEqual(now.anchor, next.anchor);
    assert.equal(now.action, next.action);assert.ok(now.minutes <= 2);
    assert.ok(next.summary.includes(next.anchor));assert.ok(next.summary.includes(next.action));
  }
  const first = getCarePlan({context: 'move', moment: 'now', action: 'change'});
  const second = getCarePlan({context: 'move', moment: 'now', action: 'walk'});
  assert.notEqual(first.action, second.action);assert.notEqual(first.minutes, second.minutes);
  assert.equal(getCarePlan({context: 'unknown'}), null);
});

test('time budgets materially assemble a smaller or larger work experiment and never exceed the chosen time', () => {
  for (const scenario of ['executive', 'team', 'solo', 'course']) {
    const short = getWorkPlan({scenario, constraint: 'short', compared: true});
    const roomy = getWorkPlan({scenario, constraint: 'roomy', compared: true});
    assert.ok(short.steps.length > 1);assert.ok(roomy.steps.length > short.steps.length);
    assert.ok(short.parked > 0);assert.equal(roomy.parked, 0);
    for (const plan of [short, roomy]) {
      assert.equal(plan.used, plan.steps.reduce((n, step) => n + step.minutes, 0));
      assert.ok(plan.used <= plan.budget);
      assert.equal(new Set(plan.steps.map(step => step.id)).size, plan.steps.length);
    }
    assert.deepEqual(roomy.steps.slice(0, short.steps.length), short.steps);
    assert.notDeepEqual(roomy.example, short.example);
    assert.ok(short.example.rows.length >= 2);
  }
  assert.equal(getWorkPlan({scenario: 'unknown'}), null);
});

test('network offer and need build a specific next step with no invented matching or financial details', () => {
  assert.equal(getWorkPlan({scenario: 'network', offer: 'skill'}), null);
  const outcomes = new Set();
  for (const offer of ['skill', 'time', 'project']) for (const need of ['first-test', 'partner', 'mentor']) {
    const raw = {scenario: 'network', offer, need, compared: true, email: 'private', revenue: 123456};
    const state = validateReward('blue', raw), plan = getWorkPlan(state);
    assert.equal(state.compared, true);assert.equal(plan.steps.length, 3);
    assert.equal(plan.budget, 0);assert.equal('email' in state, false);assert.equal('revenue' in state, false);
    outcomes.add(JSON.stringify(plan.steps));
    assert.equal(getRewardOutcome('blue', state).complete, true);
  }
  assert.equal(outcomes.size, 9);
  assert.equal(validateReward('blue', {scenario: 'network', offer: 'private text', need: 'mentor', compared: true}).compared, false);
});

test('bounded optional controls round-trip and legacy completed checkpoints stay complete without new answers', () => {
  const states = [
    ['green', {version: 1, color: 'green', context: 'sleep', moment: 'next', complete: true}],
    ['green', {context: 'food', moment: 'now', action: 'space', complete: true}],
    ['blue', {version: 1, color: 'blue', scenario: 'team', compared: true}],
    ['blue', {scenario: 'executive', constraint: 'short', compared: true}],
    ['blue', {scenario: 'network', offer: 'project', need: 'partner', compared: true}]
  ];
  for (const [color, input] of states) {
    const state = validateReward(color, input);
    assert.equal(state.version, 1);assert.equal(getRewardOutcome(color, state).complete, true);
    const restored = validateReward(color, JSON.parse(JSON.stringify(state)));
    assert.deepEqual(restored, state);assert.deepEqual(getRewardOutcome(color, restored), getRewardOutcome(color, state));
  }
  assert.equal(validateReward('blue', {scenario: 'team', compared: true}).constraint, '');
  const oldSleep = validateReward('green', {context: 'sleep', moment: 'next', complete: true});
  assert.equal(oldSleep.action, 'legacy');
  assert.equal(getRewardOutcome('green', oldSleep).summary, 'ก่อนนอนคืนนี้ ฉันจะนึกถึงหนึ่งเรื่องที่ดีของวันนี้');
  assert.equal(validateReward('blue', {scenario: 'course', constraint: 'short', offer: 'skill', need: 'mentor'}).offer, '');
});

test('learning mode is optional and bounded to course; absent mode preserves the original course contract', () => {
  const expected = {version: 1, color: 'blue', scenario: 'course', constraint: 'short', offer: '', need: '', compared: true};
  assert.deepEqual(validateReward('blue', expected), expected);
  for (const learningPath of ['', 'private text', 'https://outside.example', {}, null]) {
    assert.deepEqual(validateReward('blue', {...expected, learningPath}), expected);
  }
  for (const scenario of ['executive', 'team', 'solo', 'network'])
    assert.equal('learningPath' in validateReward('blue', {scenario, learningPath: 'comic'}), false);
  const old = getWorkPlan(expected);
  assert.equal(old.used, 10);assert.equal(old.steps.length, 3);assert.match(old.example.title, /อีเมล/);
  for (const learningPath of ['comic', 'hands-on']) {
    const state = validateReward('blue', {...expected, constraint: '', learningPath});
    assert.equal(state.learningPath, learningPath);
    assert.deepEqual(validateReward('blue', JSON.parse(JSON.stringify(state))), state);
    assert.equal(getRewardOutcome('blue', state).complete, true);
  }
});

// A minimal DOM harness only for callback order, user text safety and lifecycle.
// Actual layout, keyboard and mobile behavior are verified in the browser suite.
class Element {
  constructor(tag, doc) {this.tagName = tag.toUpperCase();this.ownerDocument = doc;this.children = [];this.events = {};this.dataset = {};this.attrs = {};this.className = '';this._text = '';this.style = {setProperty() {}};this.classList = {add: c => {this.className += ` ${c}`;}};}
  set textContent(v) {this._text = String(v);this.children = [];}
  get textContent() {return this._text + this.children.map(c => c.textContent).join('');}
  append(...children) {for (const child of children) {child.parent = this;this.children.push(child);}}
  replaceChildren(...children) {this.children = [];this._text = '';this.append(...children);}
  setAttribute(key, value) {this.attrs[key] = String(value);}
  addEventListener(event, fn) {(this.events[event] ||= []).push(fn);}
  dispatch(event) {if (this.disabled && event === 'click') return;for (const fn of this.events[event] || []) fn();}
  contains(el) {return el === this || this.children.some(child => child.contains(el));}
  matches(selector) {return selector.startsWith('.') ? this.className.split(' ').includes(selector.slice(1)) : this.tagName === selector.toUpperCase();}
  querySelectorAll(selector) {return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);}
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
  remove() {if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this);}
  focus() {this.ownerDocument.activeElement = this;}
}
function dom() {const doc = {activeElement: null, createElement: tag => new Element(tag, doc)};return new Element('div', doc);}
function click(host, name) {const el = host.querySelectorAll('button').find(el => el.textContent === name);assert.ok(el, name);el.focus();el.dispatch('click');}

test('completion fires once after a visible result; switching variants changes the retained outcome', () => {
  const host = dom(), events = [];
  const mounted = mountReward(host, {color: 'red', onChange: s => events.push(['change', s.flavor]),
    onComplete: () => {assert.ok(host.querySelector('.seed-reward-outcome'));events.push(['complete']);}});
  assert.equal(events.length, 0);
  click(host, 'สด เปรี้ยว กรอบ');click(host, 'หอม นุ่ม มีอะไรให้เคี้ยว');
  assert.deepEqual(events, [['change', 'bright'], ['complete'], ['change', 'warm']]);
  assert.equal(mounted.snapshot().flavor, 'warm');
  mounted.destroy();assert.equal(host.children.length, 0);
});

test('restoring completed rewards displays the result without inventing a new completion', () => {
  const host = dom();let completions = 0;
  mountReward(host, {color: 'blue', initial: {scenario: 'team', compared: true}, onComplete: () => completions++});
  assert.match(host.textContent, /ต้องยืนยัน/);
  assert.ok(host.querySelector('.seed-reward-outcome'));assert.equal(completions, 0);
  assert.match(host.textContent, /ตัวอย่างที่คุณเก็บไว้/);
  assert.equal(host.querySelectorAll('button').filter(button => button.attrs['aria-pressed'] === 'true').length, 0);
  click(host, 'เปลี่ยนเรื่อง');click(host, 'เริ่มเรียน AI');click(host, 'ลอง AI ใส่ซอส');
  assert.equal(completions, 0);
});

test('new course choices give distinct prepared discoveries before continuing and survive restore', () => {
  const host = dom();let completed = 0;
  const mounted = mountReward(host, {color: 'blue', onComplete: () => completed++});
  click(host, 'เริ่มเรียน AI');
  assert.equal(getRewardOutcome('blue', mounted.snapshot()).complete, false);
  assert.equal(host.querySelectorAll('button').some(el => el.textContent === '10 นาที'), false);
  assert.equal(host.querySelector('.seed-reward-example'), null);
  click(host, 'เริ่มจากการ์ตูน');
  assert.equal(mounted.snapshot().learningPath, 'comic');assert.equal(completed, 1);
  const comic = host.querySelector('.seed-reward-example').textContent;
  assert.match(comic, /โจทย์ไม่ได้บอกเหตุผลหรือเวลา/);
  assert.equal(host.querySelector('details'), null);
  assert.match(host.textContent, /ไม่ใช่ AI ตอบสด/);
  click(host, 'ลอง AI ใส่ซอส');
  assert.equal(mounted.snapshot().learningPath, 'hands-on');assert.equal(completed, 1);
  const handsOn = host.querySelector('.seed-reward-example').textContent;
  assert.notEqual(handsOn, comic);assert.match(handsOn, /สะดวกไหมครับ/);
  const restored = dom();mountReward(restored, {color: 'blue', initial: mounted.snapshot(), onComplete: () => completed++});
  assert.equal(restored.querySelector('.seed-reward-example').textContent, handsOn);assert.equal(completed, 1);
  click(host, 'เปลี่ยนเรื่อง');click(host, 'ช่วยทีมทำงาน');
  assert.equal('learningPath' in mounted.snapshot(), false);
  assert.equal(getRewardOutcome('blue', mounted.snapshot()).complete, false);
});

test('old course restoration keeps its time experiment until explicitly choosing a new learning mode', () => {
  const host = dom();let completed = 0;
  const mounted = mountReward(host, {color: 'blue', initial: {scenario: 'course', constraint: 'short', compared: true}, onComplete: () => completed++});
  assert.equal('learningPath' in mounted.snapshot(), false);
  assert.match(host.querySelector('.seed-reward-example').textContent, /ขอเลื่อนประชุม/);
  assert.ok(host.querySelectorAll('button').some(el => el.textContent === '10 นาที'));
  assert.equal(host.querySelectorAll('button').some(el => el.textContent === 'เริ่มจากการ์ตูน'), false);
  click(host, 'เลือกทางเรียนอีกแบบ');
  assert.equal(getRewardOutcome('blue', mounted.snapshot()).complete, false);
  click(host, 'เริ่มจากการ์ตูน');
  assert.equal(mounted.snapshot().learningPath, 'comic');assert.equal(completed, 0);
});

test('care selection alone is not completion and a chosen moment is an intent, not a claimed health improvement', () => {
  const host = dom();let complete = 0;
  const mounted = mountReward(host, {color: 'green', onComplete: () => complete++});
  click(host, 'การขยับ');assert.equal(complete, 0);
  click(host, 'หลังจบงานชิ้นถัดไป');assert.equal(complete, 1);
  assert.equal(mounted.snapshot().moment, 'next');
  assert.match(host.textContent, /ยังไม่ใช่บันทึกว่าทำแล้ว/);
});

test('work experiment assembles after a selected constraint, then visibly expands with the new time budget', () => {
  const host = dom();let complete = 0;
  const mounted = mountReward(host, {color: 'blue', onComplete: () => complete++});
  click(host, 'ตัดสินใจเรื่องงาน');assert.equal(complete, 0);
  assert.match(host.textContent, /แบบจำลองที่เตรียมไว้/);
  click(host, '20 นาที');assert.equal(complete, 1);
  assert.equal(mounted.snapshot().compared, true);assert.match(host.textContent, /คนตรวจทุกข้อ/);
  assert.equal(host.querySelector('.seed-reward-work-steps').children.length, 3);
  assert.ok(host.querySelector('details'));assert.ok(host.querySelector('.seed-reward-example'));
  const firstExample = host.querySelector('.seed-reward-example').textContent;
  assert.match(host.textContent, /อีก 2 ขั้นพักไว้ก่อน/);
  click(host, '40 นาที');assert.equal(complete, 1);
  assert.equal(host.querySelector('.seed-reward-work-steps').children.length, 5);
  assert.equal(mounted.snapshot().constraint, 'roomy');
  assert.notEqual(host.querySelector('.seed-reward-example').textContent, firstExample);
  assert.equal(host.ownerDocument.activeElement.textContent, '40 นาที');
});

test('network experience requires both offer and need; restoration preserves the assembled artifact', () => {
  const host = dom();let complete = 0;
  const mounted = mountReward(host, {color: 'blue', onComplete: () => complete++});
  click(host, 'หาโอกาสต่อยอด');click(host, 'โปรเจกต์ที่เริ่มแล้ว');assert.equal(complete, 0);
  click(host, 'คนร่วมทำ');assert.equal(complete, 1);
  assert.match(host.textContent, /บทบาท เวลา ค่าใช้จ่าย/);
  assert.equal(mounted.snapshot().offer, 'project');assert.equal(mounted.snapshot().need, 'partner');
  const before = host.querySelector('.seed-reward-work').textContent;
  const restored = dom();mountReward(restored, {color: 'blue', initial: mounted.snapshot(), onComplete: () => complete++});
  assert.equal(restored.querySelector('.seed-reward-work').textContent, before);assert.equal(complete, 1);
  click(restored, 'คนช่วยมองทาง');assert.match(restored.textContent, /ทางที่ลองแล้ว/);assert.equal(complete, 1);
});

test('care action and timing visibly change the same rhythm and survive restore', () => {
  const host = dom();let complete = 0;
  const mounted = mountReward(host, {color: 'green', onComplete: () => complete++});
  click(host, 'การขยับ');
  assert.equal(host.querySelector('.seed-reward-rhythm').dataset.arranged, 'false');
  click(host, 'หลังปิดหน้านี้');
  assert.equal(host.querySelector('.seed-reward-rhythm').dataset.arranged, 'true');
  click(host, 'เดินใกล้ ๆ');assert.match(host.textContent, /เดินในระยะที่สะดวก 2 นาที/);
  click(host, 'หลังจบงานชิ้นถัดไป');assert.equal(complete, 1);
  const restored = dom();mountReward(restored, {color: 'green', initial: mounted.snapshot(), onComplete: () => complete++});
  assert.equal(restored.querySelector('.seed-reward-timeline').textContent, host.querySelector('.seed-reward-timeline').textContent);
  assert.equal(complete, 1);assert.equal(mounted.snapshot().action, 'walk');
});

test('Silver builds a playable gallery with one touch and no typing; each photo changes the actual discovery', () => {
  const host=dom();let complete=0;
  const mounted=mountReward(host,{color:'silver',onComplete:()=>complete++});
  assert.equal(host.querySelector('input'),null);assert.equal(mounted.snapshot().complete,false);
  click(host,'โลกเล็ก ๆ');
  assert.equal(complete,1);assert.equal(mounted.snapshot().collection,'garden');
  assert.equal(mounted.snapshot().title,'โลกที่อยากเก็บไว้');assert.equal(mounted.snapshot().complete,true);
  const preview=host.querySelector('.seed-craft-gallery');assert.ok(preview);
  assert.equal(host.querySelector('.seed-craft-edit').open,false);
  const firstImage=preview.querySelector('img').src;
  const second=preview.querySelectorAll('button').find(el=>el.attrs['aria-label']==='ดูภาพ 2: มุมพักของวัน');
  second.dispatch('click');assert.equal(mounted.snapshot().photo,1);assert.notEqual(preview.querySelector('img').src,firstImage);
  const open=preview.querySelector('.seed-craft-open');open.dispatch('click');assert.equal(preview.dataset.expanded,'true');
  open.dispatch('click');assert.equal(preview.dataset.expanded,'false');
  click(host,'ให้ภาพนำ');assert.equal(preview.dataset.design,'signal');assert.equal(complete,1);
  const restored=dom();mountReward(restored,{color:'silver',initial:mounted.snapshot(),onComplete:()=>complete++});
  assert.equal(restored.querySelector('.seed-craft-gallery').querySelector('img').src,preview.querySelector('img').src);
  assert.equal(complete,1);
});

test('Silver legacy title/design/complete remains exact and optional title edits stay safe plain text', () => {
  const host=dom();let complete=0;
  const initial={version:1,color:'silver',title:'ชิ้นเดิมของฉัน',design:'signal',edited:true,complete:true};
  const mounted=mountReward(host,{color:'silver',initial,onComplete:()=>complete++});
  assert.deepEqual(mounted.snapshot(),initial);assert.equal(host.querySelector('.seed-craft-gallery'),null);
  const input=host.querySelector('input');input.value='<img src=x onerror=alert(1)>';input.dispatch('input');
  assert.equal(host.querySelector('input'),input);assert.equal(host.querySelector('h4').textContent,input.value);
  assert.equal(host.querySelectorAll('img').every(img=>img.src.startsWith('/frontdoor/art/')),true);
  click(host,'ใช้ชื่อนี้');assert.equal(mounted.snapshot().complete,true);assert.equal(complete,0);
  assert.equal('collection' in mounted.snapshot(),false);
});

test('Silver optional gallery identifiers are bounded and old records never gain a made-up collection', () => {
  const old={title:'เก็บไว้',design:'editorial',edited:true,complete:true};
  assert.deepEqual(validateReward('silver',{...old,collection:'https://example.invalid/photo',photo:99}),validateReward('silver',old));
  for(const value of [-1,3,1.2,'1',null])assert.equal(validateReward('silver',{...old,collection:'food',photo:value}).photo,0);
  const host=dom();const mounted=mountReward(host,{color:'silver'});click(host,'โต๊ะของอร่อย');
  assert.equal(mounted.snapshot().complete,true);assert.match(host.querySelector('.seed-craft-gallery').textContent,/มะเขือเทศ/);
  click(host,'ห้องทดลอง');assert.equal(mounted.snapshot().collection,'maker');assert.equal(mounted.snapshot().photo,0);
});

test('destroyed reward cannot trigger callbacks through retained nodes', () => {
  const host = dom();let changed = 0;
  const mounted = mountReward(host, {color: 'red', onChange: () => changed++});
  const button = host.querySelector('button');mounted.destroy();mounted.destroy();button.dispatch('click');
  assert.equal(changed, 0);
});

test('reference-based Ako illustration exists; module never performs storage/network/HTML injection', () => {
  assert.ok(existsSync(new URL(`..${AKO_REWARD_IMAGE}`, import.meta.url)));
  const host = dom();mountReward(host, {color: 'red'});
  assert.match(host.querySelector('img').alt, /ภาพประกอบ.*ภาพอ้างอิงจริง/);
  const source = readFileSync(new URL('./rewards.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest)\s*[.(]|\.innerHTML\s*=/);
});

test('each recipe renders a distinct responsive photograph matching its chosen ingredients', () => {
  const host = dom();const mounted = mountReward(host, {color: 'red'});
  assert.equal(host.querySelector('.seed-reward-dish'), null);
  click(host, 'สด เปรี้ยว กรอบ');
  const bright = host.querySelector('.seed-reward-dish');
  assert.equal(bright.src, FOOD_REWARD_IMAGES.bright);assert.match(bright.alt, /มะนาว/);
  click(host, 'หอม นุ่ม มีอะไรให้เคี้ยว');
  const warm = host.querySelector('.seed-reward-dish');
  assert.equal(warm.src, FOOD_REWARD_IMAGES.warm);assert.match(warm.alt, /งาขาวคั่วบุบ/);
  assert.notEqual(bright.src, warm.src);assert.equal(host.querySelectorAll('i').length, 0);
  for (const photo of [bright, warm]) {
    assert.ok(existsSync(new URL(`..${photo.src}`, import.meta.url)));
    const mobile = photo.src.replace('.webp', '-mobile.webp');
    assert.ok(existsSync(new URL(`..${mobile}`, import.meta.url)));
    assert.match(photo.srcset, /600w, .*1000w/);assert.equal(photo.width, 1000);assert.equal(photo.height, 667);
  }
  const restored = dom();mountReward(restored, {color: 'red', initial: mounted.snapshot()});
  assert.equal(restored.querySelector('.seed-reward-dish').src, warm.src);
});
