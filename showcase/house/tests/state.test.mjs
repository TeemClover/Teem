import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce, normalizeState, parseState, serializeState } from '../app/state.js';

const house = Object.freeze({ rooms: Object.freeze([
  Object.freeze({ id: 'living', floor: 'f1' }),
  Object.freeze({ id: 'bedroom', floor: 'f2' }),
  Object.freeze({ id: 'garden', floor: null }),
]) });
const select = (id) => reduce(initialState, { type: 'SELECT_ROOM', id }, house);

test('room selection reconciles the floor and preserves independent display preferences', () => {
  const start = { ...initialState, wallMode: 'low', furniture: false };
  const next = reduce(start, { type: 'SELECT_ROOM', id: 'bedroom' }, house);
  assert.equal(next.view, 'f2');
  assert.equal(next.activeFloor, 'f2');
  assert.equal(next.selectedRoomId, 'bedroom');
  assert.equal(next.wallMode, 'low');
  assert.equal(next.furniture, false);
  assert.equal(start.view, 'whole');
});

test('changing floor clears an incompatible room and its photo context', () => {
  const photo = reduce(select('living'), { type: 'LENS', lens: 'photo' }, house);
  const next = reduce(photo, { type: 'VIEW', view: 'f2' }, house);
  assert.equal(next.selectedRoomId, null);
  assert.equal(next.activeFloor, 'f2');
  assert.equal(next.lens, 'model');
});

test('photo → plan → model preserves room and building view without gallery-driven camera state', () => {
  let state = select('bedroom');
  for (const lens of ['photo', 'plan', 'model']) {
    state = reduce(state, { type: 'LENS', lens }, house);
    assert.equal(state.selectedRoomId, 'bedroom');
    assert.equal(state.view, 'f2');
    assert.equal(state.activeFloor, 'f2');
  }
  assert.equal('activePhotoIndex' in state, false);
});

test('returning to whole keeps the last floor context and closes room details', () => {
  const next = reduce(select('bedroom'), { type: 'VIEW', view: 'whole' }, house);
  assert.equal(next.activeFloor, 'f2');
  assert.equal(next.selectedRoomId, null);
  assert.equal(next.lens, 'model');
});

test('closing a room stays on the explored floor', () => {
  const next = reduce(select('bedroom'), { type: 'CLOSE_ROOM' }, house);
  assert.equal(next.view, 'f2');
  assert.equal(next.selectedRoomId, null);
});

test('20 rapid explode/assemble/reset cycles leave immutable physical data untouched', () => {
  const physical = { ...house, floors: [{ id: 'f1', elevation: 0 }, { id: 'f2', elevation: 3.29 }] };
  const before = JSON.stringify(physical);
  let state = select('bedroom');
  for (let i = 0; i < 20; i++) {
    state = reduce(state, { type: 'VIEW', view: 'exploded' }, physical);
    state = reduce(state, { type: 'VIEW', view: 'f1' }, physical);
    state = reduce(state, { type: 'RESET' }, physical);
    assert.deepEqual(state, initialState);
  }
  assert.equal(JSON.stringify(physical), before);
});

test('invalid IDs, lenses, wall modes, and URL state normalize safely', () => {
  const state = parseState('?view=bad&floor=bad&room=unknown&lens=bad&path=/private/example', house);
  assert.deepEqual(state, initialState);
  assert.equal(reduce(state, { type: 'SELECT_ROOM', id: 'missing' }, house).selectedRoomId, null);
  assert.equal(reduce(state, { type: 'WALL', mode: 'invisible' }, house).wallMode, 'auto');
  assert.equal(reduce(state, { type: 'LENS', lens: 'unknown' }, house).lens, 'model');
  const url = serializeState({ ...select('living'), arbitraryPath: '/private/example' }, house);
  assert.equal(url.includes('private'), false);
  assert.deepEqual(parseState(url, house), select('living'));
});

test('cross-floor restored selections are cleared, exterior selection remains valid', () => {
  assert.equal(normalizeState({ ...initialState, selectedRoomId: 'bedroom' }, house).selectedRoomId, null);
  assert.equal(reduce(select('garden'), { type: 'VIEW', view: 'f2' }, house).selectedRoomId, 'garden');
});

test('tour state is manual and independent; selecting a room exits the previous tour stop', () => {
  const state = reduce(select('living'), { type: 'TOUR', index: 3 }, house);
  assert.equal(state.tourIndex, 3);
  assert.equal(state.selectedRoomId, 'living');
  assert.equal(reduce(state, { type: 'SELECT_ROOM', id: 'bedroom' }, house).tourIndex, null);
  assert.equal(reduce(state, { type: 'TOUR', index: -1 }, house).tourIndex, 3);
});

test('ceiling details cannot remain over the plan or after selection closes', () => {
  const ceiling = reduce(select('living'), { type: 'CEILING' }, house);
  assert.equal(ceiling.ceiling, true);
  assert.equal(reduce(ceiling, { type: 'LENS', lens: 'plan' }, house).ceiling, false);
  assert.equal(reduce(ceiling, { type: 'CLOSE_ROOM' }, house).ceiling, false);
});
