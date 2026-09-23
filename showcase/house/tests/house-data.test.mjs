import test from 'node:test';
import assert from 'node:assert/strict';
import { house } from '../app/data/house.js';
import { validateHouse, sanitizeLearningHouse } from '../app/validate.js';
import { reduce, initialState } from '../app/state.js';

test('the rendered house passes room, shared-wall, opening and binding validation', () => {
  const result = validateHouse(house);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test('physical source floor difference remains 3.29 metres through 20 presentation cycles', () => {
  const first = house.floors.find((floor) => floor.id === 'f1');
  const second = house.floors.find((floor) => floor.id === 'f2');
  assert.ok(Math.abs(second.elevation - first.elevation - 3.29) < 1e-7);
  const before = JSON.stringify(house);
  let state = initialState;
  for (let index = 0; index < 20; index++) for (const view of ['f1', 'exploded', 'f2', 'whole']) {
    state = reduce(state, { type: 'VIEW', view }, house);
  }
  assert.equal(JSON.stringify(house), before);
});

test('every real room can be selected without a floor mismatch, then safely reset', () => {
  for (const room of house.rooms) {
    const selected = reduce(initialState, { type: 'SELECT_ROOM', id: room.id }, house);
    assert.equal(selected.selectedRoomId, room.id);
    if (room.floor) assert.equal(selected.activeFloor, room.floor);
    assert.deepEqual(reduce(selected, { type: 'RESET' }, house), initialState);
  }
});

test('actual educational export contains geometry but excludes photos and private metadata', () => {
  const safe = sanitizeLearningHouse(house);
  assert.equal(safe.rooms.length, house.rooms.length);
  assert.equal(safe.walls.length, house.walls.length);
  assert.equal('photos' in safe, false);
  assert.equal('photoSets' in safe, false);
  assert.doesNotMatch(JSON.stringify(safe), /sources-private|\/Users\/|\.JPG|\.pdf|originalFilename/i);
});
