import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePolygon, polygonArea, polygonsOverlap, validateHouse, sanitizeLearningHouse, transformPoint, invertTransform } from '../app/validate.js';

const rectangle = (x, z, w = 2, d = 2) => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
const fixture = () => ({
  floors: [{ id: 'f1', elevation: 0 }, { id: 'f2', elevation: 3.29 }],
  wallHeight: 2.7,
  rooms: [
    { id: 'a', name: 'ห้อง A', floor: 'f1', polygon: rectangle(0, 0), levelOffset: 0 },
    { id: 'b', name: 'ห้อง B', floor: 'f1', polygon: rectangle(2, 0), levelOffset: 0 },
    { id: 'c', name: 'ห้อง C', floor: 'f2', polygon: rectangle(0, 0), levelOffset: 0 },
  ],
  walls: [{ id: 'w1', floor: 'f1', a: [0, 0], b: [4, 0], exterior: true,
    openings: [{ offset: 1, width: 1, height: 2, sill: 0, kind: 'door' }] }],
});

test('polygon validation rejects NaN/null, zero area and self-intersections', () => {
  assert.deepEqual(validatePolygon(rectangle(0, 0)), []);
  for (const polygon of [[], [[0, 0], [1, null], [2, 2]], [[0, 0], [1, Infinity], [2, 2]],
    [[0, 0], [1, 1], [2, 2]], [[0, 0], [2, 2], [0, 2], [2, 0]]]) {
    assert.ok(validatePolygon(polygon).length > 0);
  }
  assert.equal(polygonArea(rectangle(0, 0)), 4);
});

test('calibration transforms round-trip and reject singular matrices or unknown coordinates', () => {
  const matrix = [79.4, 1.96, 735, -2.08, 78.46, 1344.69, 0, 0, 1];
  for (const point of [[0, 0], [14.1, -10.3], [5.5, -6.9]]) {
    const restored = transformPoint(invertTransform(matrix), transformPoint(matrix, point));
    assert.ok(Math.abs(restored[0] - point[0]) < 1e-7);
    assert.ok(Math.abs(restored[1] - point[1]) < 1e-7);
  }
  assert.throws(() => transformPoint(matrix, [0, null]));
  assert.throws(() => invertTransform(Array(9).fill(0)), /Singular/);
});

test('adjacent room boundaries may touch, but interior, identical and aligned overlaps fail', () => {
  assert.equal(polygonsOverlap(rectangle(0, 0), rectangle(2, 0)), false);
  assert.equal(polygonsOverlap(rectangle(0, 0), rectangle(2, 2)), false);
  assert.equal(polygonsOverlap(rectangle(0, 0), rectangle(1, 0)), true);
  assert.equal(polygonsOverlap(rectangle(0, 0), rectangle(0, 0)), true);
  assert.equal(polygonsOverlap(rectangle(0, 0, 4, 4), rectangle(1, 1)), true);
  const house = fixture();
  assert.equal(validateHouse(house).valid, true);
  house.rooms[1].polygon = rectangle(1, 0);
  assert.match(validateHouse(house).errors.join(' '), /Unintended room overlap/);
  house.rooms[1].allowOverlapWith = ['a'];
  assert.equal(validateHouse(house).valid, true);
});

test('wall duplicates include reversed and partially overlapping shared segments', () => {
  for (const [a, b] of [[[4, 0], [0, 0]], [[1, 0], [3, 0]]]) {
    const house = fixture();
    house.walls.push({ id: 'w2', floor: 'f1', a, b, openings: [] });
    assert.match(validateHouse(house).errors.join(' '), /Duplicate shared wall/);
  }
});

test('openings must stay within wall length and height with no overlapping voids', () => {
  for (const change of [{ offset: -1 }, { width: 4 }, { height: 3 }, { sill: null }, { width: 0 }]) {
    const house = fixture();
    Object.assign(house.walls[0].openings[0], change);
    assert.equal(validateHouse(house).valid, false);
  }
  const house = fixture();
  house.walls[0].openings.push({ offset: 1.5, width: 1, height: 1, sill: 1, kind: 'window' });
  assert.match(validateHouse(house).errors.join(' '), /overlapping openings/);
});

test('confirmed photo mapping needs evidence, a reviewer, method, and unique primary room', () => {
  const house = fixture();
  house.photoBindings = [{ photoSetId: 'living', spaceId: 'a', status: 'confirmed', confidence: 0.99 }];
  assert.match(validateHouse(house).errors.join(' '), /requires review evidence/);
  Object.assign(house.photoBindings[0], { evidence: [{ sourceId: 'plan' }], reviewedBy: 'reviewer',
    reviewedAt: '2026-09-24', method: 'multi-source-reviewed' });
  assert.equal(validateHouse(house).valid, true);
  house.photoBindings.push({ ...house.photoBindings[0], spaceId: 'b' });
  assert.match(validateHouse(house).errors.join(' '), /multiple primary/);
});

test('photo grouping cannot silently become a room pinpoint and draft calibration cannot become reviewed', () => {
  const house = fixture();
  house.rooms[0].photoSetId = 'unmapped-bedroom';
  assert.match(validateHouse(house).errors.join(' '), /pinned photo set requires/);
  delete house.rooms[0].photoSetId;
  house.rooms[0].calibrationId = 'cal1';
  house.rooms[0].geometryStatus = 'reviewed';
  house.calibrations = [{ id: 'cal1', page: 1, reviewStatus: 'draft', worldToRaster3x3: [1, 0, 0, 0, 1, 0, 0, 0, 1] }];
  assert.match(validateHouse(house).errors.join(' '), /requires a reviewed calibration/);
});

test('a floor polygon cannot close the stair opening', () => {
  const house = fixture();
  house.stair = { holePolygon: rectangle(0.5, 0.5, 1, 1) };
  assert.match(validateHouse(house).errors.join(' '), /blocks the stair opening/);
});

test('learning export is an allowlist and copies geometry without private sources or photos', () => {
  const house = fixture();
  house.address = 'do not export';
  house.originalFilename = 'private.pdf';
  house.photos = [{ src: '/Users/private/photo.jpg' }];
  house.rooms[0].privateNotes = '/private/source';
  const safe = sanitizeLearningHouse(house);
  assert.equal('address' in safe, false);
  assert.equal('photos' in safe, false);
  assert.equal('privateNotes' in safe.rooms[0], false);
  safe.rooms[0].polygon[0][0] = 42;
  assert.equal(house.rooms[0].polygon[0][0], 0);
  house.rooms[0].name = '/Users/private/source';
  assert.throws(() => sanitizeLearningHouse(house), /disallowed source reference/);
});
