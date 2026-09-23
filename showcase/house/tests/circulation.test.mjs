import test from 'node:test';
import assert from 'node:assert/strict';
import { house } from '../app/data/house.js';
import { pointInPolygon, validateHouse } from '../app/validate.js';

const EPS = 1e-6;
const room = id => house.rooms.find(item => item.id === id);
const wall = id => house.walls.find(item => item.id === id);
const passable = opening => ['door', 'open-passage'].includes(opening.kind)
  && opening.sill === 0 && opening.height >= 2;

function segment(a, b) {
  const axis = Math.abs(a[0] - b[0]) > EPS ? 0 : 1;
  return { axis, at: a[1 - axis], min: Math.min(a[axis], b[axis]), max: Math.max(a[axis], b[axis]) };
}

function subtract(intervals, block) {
  return intervals.flatMap(([a, b]) => block[1] <= a || block[0] >= b ? [[a, b]]
    : [[a, Math.max(a, block[0])], [Math.min(b, block[1]), b]].filter(([x, y]) => y - x > EPS));
}

// Infer walkable shared thresholds from the actual polygons and wall voids.
// A window remains an obstruction, and an opening in another wall cannot count.
function sharedPassages(a, b) {
  if (a.floor !== b.floor) return [];
  const passages = [];
  for (let i = 0; i < a.polygon.length; i++) {
    const edgeA = segment(a.polygon[i], a.polygon[(i + 1) % a.polygon.length]);
    for (let j = 0; j < b.polygon.length; j++) {
      const edgeB = segment(b.polygon[j], b.polygon[(j + 1) % b.polygon.length]);
      if (edgeA.axis !== edgeB.axis || Math.abs(edgeA.at - edgeB.at) > EPS) continue;
      const shared = [Math.max(edgeA.min, edgeB.min), Math.min(edgeA.max, edgeB.max)];
      if (shared[1] - shared[0] <= EPS) continue;
      let free = [shared];
      for (const boundary of house.walls.filter(w => w.floor === a.floor)) {
        const edge = segment(boundary.a, boundary.b);
        if (edge.axis !== edgeA.axis || Math.abs(edge.at - edgeA.at) > EPS) continue;
        let solid = [[edge.min, edge.max]];
        const sign = Math.sign(boundary.b[edge.axis] - boundary.a[edge.axis]);
        for (const opening of boundary.openings.filter(passable)) {
          const start = boundary.a[edge.axis] + sign * opening.offset;
          const end = start + sign * opening.width;
          solid = subtract(solid, [Math.min(start, end), Math.max(start, end)]);
        }
        for (const block of solid) free = subtract(free, block);
      }
      passages.push(...free.map(([start, end]) => ({ ...edgeA, start, end, width: end - start })));
    }
  }
  return passages;
}

const passageWidth = (from, to) => Math.max(0, ...sharedPassages(room(from), room(to)).map(p => p.width));

test('front dining glazing matches the broad living glazing without inventing another entry', () => {
  const facade = wall('f1-front');
  const [dining, living] = facade.openings;
  assert.equal(dining.width, living.width);
  assert.equal(dining.height, living.height);
  assert.equal(dining.sill, 0);
  assert.equal(dining.kind, 'window');
  assert.ok(dining.width > 3);
  assert.ok(dining.offset + dining.width < living.offset);
  assert.ok(facade.a[0] + dining.offset + dining.width < 9.8);
});

test('carport has one direct indoor entry, followed by open preparation-to-dining circulation', () => {
  const carport = room('f1-carport');
  const indoor = house.rooms.filter(r => r.floor === 'f1' && !['carport', 'balcony', 'void'].includes(r.kind));
  assert.deepEqual(indoor.filter(r => sharedPassages(carport, r).some(p => p.width >= .7)).map(r => r.id), ['f1-g04-prep']);
  for (const [from, to, width] of [
    ['f1-carport', 'f1-g04-prep', 1.2],
    ['f1-g04-prep', 'f1-g03-dining', 3.4],
    ['f1-g03-dining', 'f1-g01-living', 4.85],
    ['f1-g03-dining', 'f1-stair', 3],
    ['f1-rear-hall', 'f1-g06-bath', .8],
  ]) assert.ok(passageWidth(from, to) >= width - EPS, `${from} → ${to} needs a ${width} m clear opening`);
});

test('upstairs bedrooms, lounge and bathrooms have the plan-directed access route', () => {
  for (const [from, to, width] of [
    ['f2-204-hall', 'f2-204-1-lounge', 4.3],
    ['f2-204-hall', 'f2-201-bedroom', .95],
    ['f2-204-hall', 'f2-202-bedroom', .85],
    ['f2-204-hall', 'f2-203-bedroom', .85],
    ['f2-203-bedroom', 'f2-207-bath', .75],
    ['f2-202-bedroom', 'f2-206-bath', .75],
    ['f2-201-bedroom', 'f2-201-1-dressing', 1.2],
    ['f2-201-1-dressing', 'f2-205-bath', .8],
  ]) assert.ok(passageWidth(from, to) >= width - EPS, `${from} → ${to} needs a ${width} m clear opening`);
  assert.equal(passageWidth('f2-201-bedroom', 'f2-205-bath'), 0, 'master bathroom is accessed through dressing, not a fabricated bedroom door');
  assert.equal(passageWidth('f2-204-hall', 'f2-207-bath'), 0, 'bathroom 207 is ensuite to bedroom 203; the hall-side symbols are washbasins');
  assert.equal(wall('f2-baths-east').openings.filter(passable).length, 0, 'east walls behind the bathroom washbasins must stay closed');
});

test('door swing destinations meet their thresholds, and the downstairs bath door is at the southeast corner', () => {
  for (const boundary of house.walls) {
    const dx = boundary.b[0] - boundary.a[0], dz = boundary.b[1] - boundary.a[1], length = Math.hypot(dx, dz);
    for (const opening of boundary.openings.filter(o => o.swingInto)) {
      assert.ok(['start', 'end'].includes(opening.hingeSide));
      const destination = room(opening.swingInto);
      const t = (opening.offset + opening.width / 2) / length;
      const midpoint = [boundary.a[0] + dx * t, boundary.a[1] + dz * t];
      assert.ok(pointInPolygon(midpoint, destination.polygon), `${boundary.id} does not open onto ${destination.id}`);
    }
  }
  const bathroomDoor = wall('f1-bath-front').openings.find(passable);
  assert.ok(wall('f1-bath-front').a[0] + bathroomDoor.offset > 9.7);
  assert.equal(wall('f1-bath-west').openings.filter(passable).length, 0);
});

test('revised circulation retains valid geometry and the measured floor datum', () => {
  assert.equal(validateHouse(house).valid, true);
  assert.equal(house.floors.find(f => f.id === 'f2').elevation, 3.29);
  for (const id of ['f2-202-bedroom', 'f2-203-bedroom']) {
    assert.equal(room(id).photoSetId, null);
    assert.equal(room(id).geometryStatus, 'draft');
  }
});
