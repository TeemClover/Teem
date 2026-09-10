import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_SCENE_MAP, getActionMoment } from '../../xvisor/quest/game-action-scenes.js';
import { EVENTS, STAGES, makeInitialState, reduceGame } from '../../xvisor/quest/game-data.js';
import { createWorldRenderer } from '../../xvisor/quest/game-world.js';

const management = () => ({ ...makeInitialState({ seed: 61 }), month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28 });
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};

test('all engine events have explicit visual, primary, automatic, or selection classifications', () => {
  assert.deepEqual(Object.keys(ACTION_SCENE_MAP).sort(), Object.values(EVENTS).sort());
  for (const [event, rule] of Object.entries(ACTION_SCENE_MAP)) {
    assert.ok(['vignette', 'primary', 'automatic', 'selection'].includes(rule.presentation), event);
    assert.ok(rule.title && rule.group && rule.variant, event);
  }
  assert.equal(getActionMoment({}, {}, 'FUTURE_EVENT').reason, 'unclassified-event');
});

test('real actions select the affected person and show reducer messages without altering state', () => {
  const previous = management();
  const next = reduceGame(previous, EVENTS.CREATE_LEAD, { source: 'known' });
  const beforeBytes = JSON.stringify(previous), afterBytes = JSON.stringify(next);
  freeze(previous); freeze(next);
  const moment = getActionMoment(previous, next, EVENTS.CREATE_LEAD, { source: 'known' });
  assert.equal(moment.presentation, 'vignette');
  assert.equal(moment.group, 'welcome');
  assert.equal(moment.person.id, next.prospects.at(-1).id);
  assert.equal(moment.person.name, next.prospects.at(-1).name);
  assert.equal(moment.deltas.prospects, 1);
  assert.equal(moment.fullDetail, next.lastMessage);
  assert.ok(moment.duration >= 800 && moment.duration <= 1200);
  assert.equal(JSON.stringify(previous), beforeBytes);
  assert.equal(JSON.stringify(next), afterBytes);
  const contacted = reduceGame(next, EVENTS.CONTACT_PROSPECT, { id: moment.person.id });
  const contact = getActionMoment(next, contacted, EVENTS.CONTACT_PROSPECT, { id: moment.person.id });
  assert.equal(contact.group, 'message');
  assert.equal(contact.person.id, moment.person.id);
  assert.notEqual(contact.group, moment.group);
});

test('referral keeps the referring customer and new person distinct; personal study does not borrow an unrelated name', () => {
  const previous = management();
  previous.customers = [{ id: 'referrer', name: 'นิด', day: 28, appearance: { shirt: '#ab7755' } }];
  previous.selectedPersonId = 'referrer';
  const next = { ...previous, prospects: [{ id: 'new-person', name: 'เมย์', appearance: { hairStyle: 'long' } }], selectedPersonId: 'new-person', lastEvent: EVENTS.ASK_REFERRAL, lastMessage: 'นิดแนะนำเมย์' };
  const referral = getActionMoment(previous, next, EVENTS.ASK_REFERRAL, { id: 'referrer' });
  assert.equal(referral.person.id, 'new-person');
  assert.equal(referral.companion.id, 'referrer');
  assert.equal(referral.companion.band, true);
  const study = getActionMoment(previous, reduceGame(previous, EVENTS.TRAIN_SKILL, { skill: 'knowledge' }), EVENTS.TRAIN_SKILL, { skill: 'knowledge' });
  assert.equal(study.person, null);
  assert.equal(study.variant, 'knowledge');
  assert.equal(study.deltas.skillXp, 2);
});

test('declines, delayed decisions, and care-only plans cannot become a sale celebration', () => {
  const previous = management();
  previous.prospects = [{ id: 'person', name: 'แก้ว', status: 'พร้อมคุย', journey: 'recommendation' }];
  const declined = { ...previous, lastEvent: 'OFFER_PROSPECT_NO', lastMessage: 'แก้วยังไม่พร้อม · กลับมาคุยตามจังหวะ' };
  const moment = getActionMoment(previous, declined, EVENTS.OFFER_PROSPECT, { id: 'person' });
  assert.equal(moment.outcome, 'paused');
  assert.equal(moment.variant, 'considering');
  assert.equal(moment.deltas.customers, undefined);
  assert.equal(moment.fullDetail, declined.lastMessage);
  assert.doesNotMatch(moment.fullDetail, /\+.*(฿|XV)|ได้รับรายได้/);
  const care = { ...previous, prospects: [], customers: [{ id: 'person', name: 'แก้ว', careOnly: true, routinePlan: { products: [] } }], selectedPersonId: 'person', lastEvent: EVENTS.CHOOSE_MANAGEMENT_ROUTINE, lastMessage: 'เริ่มดูแลโดยไม่ซื้อสินค้า' };
  const careMoment = getActionMoment(previous, care, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { id: 'person', planId: 'control' });
  assert.equal(careMoment.variant, 'care-only');
  assert.deepEqual(careMoment.products, []);
  const locked = getActionMoment(previous, { ...previous, lastEvent: 'ROUTINE_UNAVAILABLE', lastMessage: 'ทางเลือกนี้ยังไม่พร้อม' }, EVENTS.CHOOSE_MANAGEMENT_ROUTINE, { planId: 'all' });
  assert.equal(locked.outcome, 'paused');
});

test('practice feedback and selections preserve the named guide and practice scene', () => {
  const previous = { ...management(), stage: STAGES.PRE_DAY7_PRACTICE, preseason: { day: 7, practiceFeedback: null } };
  const wrong = { ...previous, preseason: { ...previous.preseason, practiceFeedback: 'wrong' }, lastEvent: 'SUBMIT_PRACTICE_WRONG' };
  const moment = getActionMoment(previous, wrong, EVENTS.SUBMIT_PRACTICE);
  assert.equal(moment.presentation, 'primary');
  const correct = { ...wrong, preseason: { ...wrong.preseason, practiceFeedback: 'correct' }, lastEvent: 'SUBMIT_PRACTICE_CORRECT' };
  assert.equal(getActionMoment(wrong, correct, EVENTS.SUBMIT_PRACTICE).presentation, 'primary');
  assert.equal(getActionMoment(wrong, correct, EVENTS.SELECT_PRACTICE).presentation, 'selection');
  assert.equal(getActionMoment(wrong, correct, EVENTS.SELECT_EXAM).presentation, 'selection');
});

test('all exam answer and repair controls preserve the stationary classroom', () => {
  const previous = { ...management(), stage: STAGES.EXAM_ACTIVE, exam: { feedback: null, selected: 'A' } };
  for (const stage of [STAGES.EXAM_ACTIVE, STAGES.EXAM_REPAIR, STAGES.EXAM_SUMMARY]) {
    for (const event of [EVENTS.SELECT_EXAM, EVENTS.SUBMIT_EXAM, EVENTS.NEXT_EXAM, EVENTS.REPAIR_EXAM, EVENTS.START_REPAIRS]) {
      const next = { ...previous, stage, exam: { feedback: 'correct', index: 1 }, lastEvent: event, lastMessage: 'ทบทวนคำตอบแล้ว' };
      const moment = getActionMoment(previous, next, event);
      assert.ok(['primary', 'selection'].includes(moment.presentation), `${stage} / ${event}`);
      assert.equal(moment.duration, undefined);
    }
  }
});

test('existing scenes retain their own timing, while month review remains an immediate vignette', () => {
  const previous = management();
  for (const [event, stage] of [[EVENTS.CREATE_LEAD, STAGES.CONTENT_RUNNING], [EVENTS.RUN_XCADEMY, STAGES.XCADEMY_RUNNING], [EVENTS.RUN_XIRCLE, STAGES.XIRCLE_RUNNING], [EVENTS.RUN_LIVE, STAGES.LIVE_RUNNING], [EVENTS.CERTIFY_CANDIDATE, STAGES.G1_CELEBRATION]]) {
    const moment = getActionMoment(previous, { ...previous, stage, lastMessage: 'กำลังทำกิจกรรม' }, event);
    assert.equal(moment.presentation, 'primary', event);
    assert.equal(moment.duration, undefined, 'primary scenes never get an extra action timer');
  }
  assert.equal(getActionMoment(previous, previous, EVENTS.CARE_CUSTOMER).presentation, 'none');
  assert.equal(getActionMoment(previous, { ...previous, stage: STAGES.MANAGEMENT }, EVENTS.SCENE_COMPLETE).presentation, 'automatic');
  const closed = reduceGame(previous, EVENTS.END_MONTH);
  assert.equal(getActionMoment(previous, closed, EVENTS.END_MONTH).group, 'month');
  assert.equal(getActionMoment(previous, closed, EVENTS.END_MONTH).presentation, 'vignette');
  assert.equal(getActionMoment(previous, closed, EVENTS.END_MONTH).detail, `เดือน 4 · รายได้ ฿${Math.round(closed.settlements['4'].totalIncome).toLocaleString('th-TH')}`);
  assert.equal(getActionMoment(previous, { ...closed, campaignScore: { locked: true } }, EVENTS.END_MONTH).presentation, 'primary');
  assert.equal(getActionMoment(previous, { ...closed, organizationMode: true }, EVENTS.END_MONTH).presentation, 'primary');
});

test('action locations vary deterministically without changing action results', () => {
  const previous = management();
  const locations = new Set();
  for (let energy = 28; energy > 20; energy--) {
    const next = { ...previous, energy, lastEvent: EVENTS.CARE_CUSTOMER, lastMessage: 'ติดตามสิ่งที่ทำจริงแล้ว' };
    const first = getActionMoment(previous, next, EVENTS.CARE_CUSTOMER);
    assert.deepEqual(first, getActionMoment(previous, next, EVENTS.CARE_CUSTOMER));
    locations.add(first.location);
  }
  assert.deepEqual([...locations].sort(), ['garden', 'kitchen']);
});

test('small encounters use their own target and measured result; postponing one does not launch a scene', () => {
  const previous = { ...management(), selectedPersonId: 'unrelated', prospects: [{ id: 'target', name: 'แก้ว', trust: 40 }, { id: 'unrelated', name: 'คนอื่น', trust: 90 }], encounters: { pending: { id: 'encounter-1', key: 'consent-check', targetId: 'target', targetKind: 'prospect' } } };
  const next = { ...previous, prospects: previous.prospects.map(person => person.id === 'target' ? { ...person, trust: 43 } : person), encounters: { pending: null }, lastEvent: EVENTS.RESOLVE_ENCOUNTER, lastMessage: 'เลือกสิ่งเล็กที่ทำต่อได้แล้ว' };
  const moment = getActionMoment(previous, next, EVENTS.RESOLVE_ENCOUNTER, { encounterId: 'encounter-1', choiceId: 'explain' });
  assert.equal(moment.person.id, 'target');
  assert.equal(moment.group, 'consent');
  assert.equal(moment.fullDetail, 'แก้ว · ความไว้ใจ +3');
  assert.equal(moment.deltas.customers, undefined);
  assert.equal(getActionMoment(previous, next, EVENTS.RESOLVE_ENCOUNTER, { encounterId: 'encounter-1', choiceId: 'skip' }).presentation, 'selection');
  const restBefore = { ...previous, encounters: { pending: { id: 'quiet', key: 'quiet-week', targetId: null, targetKind: 'player' } } };
  const rest = getActionMoment(restBefore, { ...next, energy: 28, lastMessage: 'พักได้แล้ว' }, EVENTS.RESOLVE_ENCOUNTER, { encounterId: 'quiet', choiceId: 'rest' });
  assert.equal(rest.person, null);
  assert.equal(rest.location, 'garden');
  assert.equal(rest.variant, 'rest');
});

test('illustrated worlds load no image assets and keep guides offscreen while real customers remain', t => {
  const env = renderEnvironment(t, true);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  Object.defineProperty(globalThis, 'Image', { configurable: true, writable: true, value: class { constructor() { throw new Error('World artwork must be code drawn'); } } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'Image', original); else delete globalThis.Image; });
  let state = management(), content = { scene: 'opening' };
  const renderer = createWorldRenderer(env.canvas, () => ({ state, content, montageVisualDay: 0, stageStartedAt: 0, person: null }));
  for (const [scene, stage, actors] of [
    ['opening', STAGES.OPENING, 1], ['practice_data', STAGES.PRE_DAY7_PRACTICE, 1],
    ['practice_care', STAGES.PRE_DAY21_CARE, 2], ['exam_active', STAGES.EXAM_ACTIVE, 2],
    ['live-studio', STAGES.LIVE_RUNNING, 1], ['open_house_running', STAGES.OPEN_HOUSE_RUNNING, 3],
  ]) {
    state = { ...state, stage };
    content = { scene };
    const start = env.calls.length;
    renderer.invalidate();
    env.frame(performance.now() + 250);
    // Each complete figure strokes its torso exactly once. This catches a
    // guide accidentally returning as either an image or a generic stand-in.
    const figureCount = env.calls.slice(start).filter(call => call[0] === 'set' && call[1] === 'strokeStyle' && call[2] === '#38523e').length;
    assert.equal(figureCount, actors, scene);
  }
  renderer.destroy();
});

function renderEnvironment(t, reduced = false) {
  const frames = new Map(), listeners = new Map(), motionListeners = new Set();
  let sequence = 0;
  const calls = [];
  const brush = new Proxy({}, { set(target, property, value) { calls.push(['set', property, value]); target[property] = value; return true; }, get(target, property) {
    if (property in target) return target[property];
    if (String(property).startsWith('create')) return () => ({ addColorStop() {} });
    return (...args) => { calls.push([property, ...args]); };
  } });
  const canvas = { width: 384, height: 216, dataset: {}, attributes: {}, getContext: () => brush, getAttribute(name) { return this.attributes[name]; }, setAttribute(name, value) { this.attributes[name] = value; } };
  const elements = new Map(['#worldEventCard', '#worldLabel', '#worldEventKicker', '#worldEventTitle', '#worldEventDetail'].map(id => [id, { textContent: '', dataset: {}, hidden: false }]));
  const document = { hidden: false, querySelector: id => elements.get(id), createElement: () => ({ ...canvas }), addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
  const motion = { matches: reduced, addEventListener: (_, fn) => motionListeners.add(fn), removeEventListener: (_, fn) => motionListeners.delete(fn) };
  const replacements = { document, window: { matchMedia: () => motion }, requestAnimationFrame: fn => { frames.set(++sequence, fn); return sequence; }, cancelAnimationFrame: id => frames.delete(id) };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  const frame = time => { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(time)); };
  return { canvas, elements, document, frames, listeners, motionListeners, calls, frame };
}

test('visual moments replace immediately, expire under reduced motion, and never queue or mutate gameplay', t => {
  const env = renderEnvironment(t, true);
  let state = management();
  const renderer = createWorldRenderer(env.canvas, () => ({ state, content: { scene: 'management' }, montageVisualDay: 0, stageStartedAt: 0, person: null }));
  const previous = state;
  state = reduceGame(state, EVENTS.CREATE_LEAD, { source: 'known' });
  const created = renderer.playAction(previous, state, EVENTS.CREATE_LEAD, { source: 'known' });
  env.frame(performance.now() + 210);
  assert.equal(env.canvas.dataset.actionGroup, 'welcome');
  const stored = JSON.stringify(state);
  const next = reduceGame(state, EVENTS.CONTACT_PROSPECT, { id: state.selectedPersonId });
  renderer.playAction(state, next, EVENTS.CONTACT_PROSPECT, { id: state.selectedPersonId });
  state = next;
  env.frame(performance.now() + 220);
  assert.equal(env.canvas.dataset.actionGroup, 'message', 'the latest action immediately replaces the first');
  assert.notEqual(JSON.stringify(state), stored, 'only the reducer produced the new state');
  const after = JSON.stringify(state);
  env.frame(performance.now() + created.duration + 250);
  assert.equal(env.canvas.dataset.actionEvent, undefined);
  assert.equal(JSON.stringify(state), after, 'rendering and expiry never change gameplay');
  renderer.destroy();
  assert.equal(env.frames.size, 0);
  assert.equal(env.listeners.size, 0);
  assert.equal(env.motionListeners.size, 0);
  assert.equal(renderer.playAction(previous, state, EVENTS.CREATE_LEAD), null);
});

test('hidden tabs drop transient visuals and cannot replay them on return', t => {
  const env = renderEnvironment(t);
  const previous = management(), state = reduceGame(previous, EVENTS.CREATE_LEAD, { source: 'known' });
  const renderer = createWorldRenderer(env.canvas, () => ({ state, content: { scene: 'management' }, montageVisualDay: 0, stageStartedAt: 0, person: null }));
  renderer.playAction(previous, state, EVENTS.CREATE_LEAD);
  env.document.hidden = true;
  env.listeners.get('visibilitychange')();
  assert.equal(env.frames.size, 0);
  assert.equal(renderer.playAction(previous, state, EVENTS.CREATE_LEAD), null);
  env.document.hidden = false;
  env.listeners.get('visibilitychange')();
  env.frame(performance.now() + 250);
  assert.equal(env.canvas.dataset.actionEvent, undefined);
  renderer.destroy();
});

test('all action groups draw supported character poses and furniture without a missing render branch', t => {
  const env = renderEnvironment(t, true);
  const previous = management();
  let state;
  const renderer = createWorldRenderer(env.canvas, () => ({ state, content: { scene: 'management' }, montageVisualDay: 0, stageStartedAt: 0, person: null }));
  const seen = new Set();
  for (const [event, rule] of Object.entries(ACTION_SCENE_MAP)) {
    if (['automatic', 'selection'].includes(rule.presentation) || seen.has(rule.group)) continue;
    seen.add(rule.group);
    state = { ...previous, lastEvent: event, lastMessage: `ผลจริงของ ${event}` };
    const result = renderer.playAction(previous, state, event, { skill: 'knowledge' });
    assert.equal(result.presentation, 'vignette');
    const count = env.calls.length;
    env.frame(performance.now() + 220);
    assert.equal(env.canvas.dataset.actionGroup, rule.group);
    assert.ok(env.calls.length - count > 60, `${rule.group} must draw actors and props beyond a room background`);
  }
  assert.ok(seen.size >= 18, 'actions must use varied recognizable settings and activities');
  renderer.destroy();
});
