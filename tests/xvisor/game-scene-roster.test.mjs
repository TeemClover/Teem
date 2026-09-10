import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSceneRoster, getSceneRosterStyle } from '../../xvisor/quest/game-world.js';
import { createPersonAppearance, getPersonAppearance, normalizeNpcIdentities } from '../../xvisor/quest/game-people.js';
import { EVENTS, STAGES, makeInitialState, reduceGame } from '../../xvisor/quest/game-data.js';

const ids = roster => roster.map(person => person.id);
function stateWithTeam(count = 24) {
  const initial = makeInitialState({ seed: 93 });
  return { ...initial, month: 5, stage: STAGES.MANAGEMENT, rank: 'xvisor', energy: 28,
    team: Array.from({ length: count }, (_, index) => ({ id: `member-${index}`, personId: `person-${index}`, name: `คน ${index}`, active: true, appearance: createPersonAppearance(`stable-person-${index}`) })),
    selectedPersonId: 'member-0', eventLog: [] };
}

test('saved action progress rotates the cast while selected people and appearances remain stable', () => {
  const state = stateWithTeam();
  const before = JSON.stringify(state);
  const casts = new Set(), seen = new Set();
  for (let turn = 0; turn < 48; turn++) {
    const next = { ...state, monthStats: { ...state.monthStats, playerActions: { total: turn } } };
    const cast = selectSceneRoster(next);
    assert.equal(cast[0], state.team[0]);
    cast.forEach(person => { seen.add(person.id); assert.equal(person, state.team.find(member => member.id === person.id)); });
    assert.equal(cast.length, 5);
    assert.equal(new Set(cast.map(person => person.personId)).size, 5);
    assert.ok(cast.filter(person => getSceneRosterStyle(person) === 'flowing').length >= 2);
    assert.ok(cast.filter(person => getSceneRosterStyle(person) === 'cropped').length >= 2);
    casts.add(JSON.stringify(ids(cast)));
    assert.deepEqual(ids(selectSceneRoster(JSON.parse(JSON.stringify(next)))), ids(cast));
  }
  assert.equal(seen.size, state.team.length, 'resembling the pinned target must not permanently exclude a teammate');
  assert.ok(casts.size >= 20);
  assert.equal(JSON.stringify(state), before);
});

test('a feminine-styled person outside the first five gets stage time without inventing a gender from names', () => {
  const state = stateWithTeam(9);
  state.team = state.team.map((person, index) => ({ ...person, appearance: { ...person.appearance, hairStyle: index === 8 ? 'wavy' : 'short', clothing: 'polo', glasses: index !== 8 } }));
  for (let total = 0; total < 9; total++) {
    const next = { ...state, monthStats: { ...state.monthStats, playerActions: { total } } };
    const cast = selectSceneRoster(next);
    assert.ok(cast.some(person => person.id === 'member-8'));
    assert.ok(cast.some(person => getSceneRosterStyle(person) === 'cropped'));
  }
  assert.equal(getSceneRosterStyle({ ...state.team[8], name: 'โอม' }), getSceneRosterStyle({ ...state.team[8], name: 'มุก' }));
});

test('inactive people, narrator bodies and role duplicates are excluded and target aliases are honored', () => {
  const state = stateWithTeam(8);
  state.team[3].active = false;
  state.team[4].appearance = { ...state.team[4].appearance, characterId: 'teem' };
  const customer = { ...state.team[2], id: 'customer-alias' };
  state.customers = [customer];
  state.selectedPersonId = customer.id;
  const cast = selectSceneRoster(state, { pool: [...state.team, customer], limit: 20 });
  assert.equal(cast[0], customer);
  assert.equal(new Set(cast.map(person => person.personId)).size, cast.length);
  assert.ok(!cast.some(person => ['member-3', 'member-4'].includes(person.id)));
  assert.ok(!selectSceneRoster(state, { excludeIds: ['customer-alias'] }).some(person => person.personId === customer.personId));
  assert.deepEqual(selectSceneRoster(state, { pool: [] }), []);
  assert.deepEqual(selectSceneRoster(state, { limit: 0 }), []);
});

test('same meaningful action twice and new months rotate; clocks, UI preferences and animation transitions do not', () => {
  let state = stateWithTeam();
  const first = ids(selectSceneRoster(state));
  state = reduceGame(state, EVENTS.TRAIN_SKILL, { skill: 'knowledge' });
  const second = ids(selectSceneRoster(state));
  state = reduceGame(state, EVENTS.TRAIN_SKILL, { skill: 'knowledge' });
  const third = ids(selectSceneRoster(state));
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(second, third);
  assert.deepEqual(ids(selectSceneRoster({ ...state, updatedAt: Date.now() + 100000, soundOn: !state.soundOn })), third);
  assert.deepEqual(ids(selectSceneRoster({ ...state, eventLog: [...state.eventLog, { month: state.month, event: EVENTS.SCENE_COMPLETE }, { month: state.month, event: EVENTS.SELECT_EXAM }] })), third);
  assert.notDeepEqual(ids(selectSceneRoster({ ...state, month: state.month + 1 })), third);
  const beforeOpening = { ...state, monthStats: { ...state.monthStats, playerActions: { total: 2 } }, eventLog: [] };
  const afterOpening = { ...beforeOpening, month: state.month + 1, monthStats: { ...state.monthStats, playerActions: { total: 0 } }, eventLog: [{ month: state.month + 1, event: EVENTS.START_NEXT_MONTH }] };
  assert.notDeepEqual(ids(selectSceneRoster(beforeOpening)), ids(selectSceneRoster(afterOpening)), 'month-specific ordering avoids a reset-counter offset collision');
});

test('scene casts use all relevant groups and keep more than one hair silhouette when available', () => {
  const state = stateWithTeam();
  const casts = new Set();
  for (const scene of ['management', 'xcademy_running', 'open_house_running', 'the-xircle', 'travel:Tokyo', 'month12', 'finale']) {
    const cast = selectSceneRoster(state, { scene });
    casts.add(JSON.stringify(ids(cast)));
    assert.ok(new Set(cast.map(person => person.appearance.hairStyle)).size >= 3);
  }
  assert.ok(casts.size >= 5);
});

test('complete version-2 appearances remain byte-for-byte unchanged while newly generated people use twelve styles', () => {
  const appearance = { ...createPersonAppearance('already-known'), version: 2, hairStyle: 'short', clothing: 'shirt', glasses: 'round' };
  const person = { id: 'old-customer', name: 'มุก', appearance };
  const before = JSON.stringify(person);
  assert.equal(getPersonAppearance(person), appearance);
  const state = { customers: [person], prospects: [], team: [] };
  assert.equal(normalizeNpcIdentities(state), state);
  assert.equal(JSON.stringify(person), before);
  const created = Array.from({ length: 200 }, (_, i) => createPersonAppearance(`new-v3-${i}`));
  assert.ok(created.every(item => item.version === 3));
  for (const style of ['wavy', 'half-up', 'sidepart', 'pixie']) assert.ok(created.some(item => item.hairStyle === style));
});
