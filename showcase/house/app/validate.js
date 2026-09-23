const EPSILON = 1e-7;
const finite = (number) => typeof number === 'number' && Number.isFinite(number);
const point = (p) => Array.isArray(p) && p.length === 2 && p.every(finite);
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const onSegment = (p, a, b) => Math.abs(cross(a, b, p)) < EPSILON
  && p[0] >= Math.min(a[0], b[0]) - EPSILON && p[0] <= Math.max(a[0], b[0]) + EPSILON
  && p[1] >= Math.min(a[1], b[1]) - EPSILON && p[1] <= Math.max(a[1], b[1]) + EPSILON;

export function polygonArea(polygon) {
  return polygon.reduce((sum, a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0) / 2;
}

/** Homogeneous X/Z ↔ raster transform; null is never treated as a measured zero. */
export function transformPoint(matrix, p) {
  if (!Array.isArray(matrix) || matrix.length !== 9 || !matrix.every(finite) || !point(p)) {
    throw new Error('Transform requires 9 finite matrix values and a finite point');
  }
  const w = matrix[6] * p[0] + matrix[7] * p[1] + matrix[8];
  if (Math.abs(w) < EPSILON) throw new Error('Transform projects point to infinity');
  return [(matrix[0] * p[0] + matrix[1] * p[1] + matrix[2]) / w,
    (matrix[3] * p[0] + matrix[4] * p[1] + matrix[5]) / w];
}

export function invertTransform(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 9 || !matrix.every(finite)) throw new Error('Invalid transform matrix');
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const inverse = [e * i - f * h, c * h - b * i, b * f - c * e,
    f * g - d * i, a * i - c * g, c * d - a * f,
    d * h - e * g, b * g - a * h, a * e - b * d];
  const determinant = a * inverse[0] + b * inverse[3] + c * inverse[6];
  if (Math.abs(determinant) < EPSILON) throw new Error('Singular transform matrix');
  return inverse.map((n) => n / determinant);
}

function segmentsIntersect(a, b, c, d, strict = false) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON))
    && ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) return true;
  return !strict && (onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d));
}

export function validatePolygon(polygon) {
  const errors = [];
  if (!Array.isArray(polygon) || polygon.length < 3) return ['Polygon requires at least 3 vertices'];
  if (!polygon.every(point)) return ['Polygon vertices must contain 2 finite numbers'];
  if (Math.abs(polygonArea(polygon)) <= EPSILON) errors.push('Polygon has zero area');
  for (let i = 0; i < polygon.length; i++) {
    const next = (i + 1) % polygon.length;
    if (distance(polygon[i], polygon[next]) <= EPSILON) errors.push(`Polygon edge ${i} has zero length`);
    for (let j = i + 1; j < polygon.length; j++) {
      if (j === next || (j + 1) % polygon.length === i) continue;
      if (segmentsIntersect(polygon[i], polygon[next], polygon[j], polygon[(j + 1) % polygon.length])) {
        errors.push(`Polygon self-intersects at edges ${i}/${j}`);
      }
    }
  }
  return errors;
}

export function pointInPolygon(p, polygon, includeBoundary = true) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if (onSegment(p, a, b)) return includeBoundary;
    if ((a[1] > p[1]) !== (b[1] > p[1])
      && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Shared boundaries are legal; positive-area intersection is not. */
export function polygonsOverlap(a, b) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length], true)) return true;
    }
  }
  if (a.some((p) => pointInPolygon(p, b, false)) || b.some((p) => pointInPolygon(p, a, false))) return true;
  // Interior edge samples cover identical polygons and aligned overlapping strips.
  for (const [source, target] of [[a, b], [b, a]]) {
    const sign = Math.sign(polygonArea(source));
    for (let i = 0; i < source.length; i++) {
      const p = source[i], q = source[(i + 1) % source.length], length = distance(p, q);
      const delta = Math.min(1e-5, length / 1000);
      const sample = [(p[0] + q[0]) / 2 - sign * (q[1] - p[1]) / length * delta,
        (p[1] + q[1]) / 2 + sign * (q[0] - p[0]) / length * delta];
      if (pointInPolygon(sample, source, false) && pointInPolygon(sample, target, false)) return true;
    }
  }
  return false;
}

function collinearOverlap(a, b, c, d) {
  if (Math.abs(cross(a, b, c)) > EPSILON || Math.abs(cross(a, b, d)) > EPSILON) return false;
  const axis = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? 0 : 1;
  return Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]))
    - Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis])) > EPSILON;
}

export function validateHouse(house) {
  const errors = [], warnings = [];
  if (!house || typeof house !== 'object') return { valid: false, errors: ['House must be an object'], warnings };
  const rooms = house.rooms || [], walls = house.walls || [], floors = house.floors || [];
  if (!Array.isArray(rooms) || !Array.isArray(walls) || !Array.isArray(floors)) {
    return { valid: false, errors: ['Rooms, walls and floors must be arrays'], warnings };
  }
  if (!rooms.length || !floors.length) errors.push('House requires rooms and floors');
  for (const [label, items] of [['room', rooms], ['wall', walls], ['floor', floors]]) {
    const ids = new Set();
    for (const item of items) {
      if (typeof item.id !== 'string' || !item.id) errors.push(`${label} is missing a stable ID`);
      if (ids.has(item.id)) errors.push(`Duplicate ${label} ID: ${item.id}`);
      ids.add(item.id);
    }
  }
  const floorIds = new Set(floors.map((f) => f.id));
  for (const floor of floors) if (!finite(floor.elevation)) errors.push(`${floor.id}: elevation must be finite`);
  for (const [key, expected] of [['gridX', 14.1], ['gridZ', 10.3]]) {
    if (!house[key]) continue;
    const coordinates = Object.values(house[key]);
    if (!coordinates.every(finite) || Math.abs(Math.max(...coordinates) - Math.min(...coordinates) - expected) > EPSILON) {
      errors.push(`${key}: reference grid span must be ${expected} m`);
    }
  }
  for (const calibration of house.calibrations || []) {
    try { invertTransform(calibration.worldToRaster3x3); } catch (error) { errors.push(`${calibration.id}: ${error.message}`); }
    if (calibration.reviewStatus === 'reviewed' && !calibration.reviewedBy) errors.push(`${calibration.id}: reviewed calibration requires a reviewer`);
  }
  const validRooms = [];
  for (const room of rooms) {
    if (room.floor && !floorIds.has(room.floor)) errors.push(`${room.id}: unknown floor ${room.floor}`);
    if (room.levelOffset !== undefined && !finite(room.levelOffset)) errors.push(`${room.id}: levelOffset must be finite`);
    const issues = validatePolygon(room.polygon);
    errors.push(...issues.map((error) => `${room.id}: ${error}`));
    if (!issues.length) validRooms.push(room);
    if (room.evidenceStatus === 'assumed' && !room.rationale) warnings.push(`${room.id}: assumed geometry needs a rationale in the ledger`);
    if (room.calibrationId) {
      const calibration = house.calibrations?.find((item) => item.id === room.calibrationId);
      if (!calibration) errors.push(`${room.id}: unknown plan calibration`);
      else {
        if (calibration.page !== (room.floor === 'f2' ? 2 : 1)) errors.push(`${room.id}: calibration page does not match floor`);
        if (room.geometryStatus === 'reviewed' && calibration.reviewStatus !== 'reviewed') errors.push(`${room.id}: reviewed geometry requires a reviewed calibration`);
      }
    }
  }
  const winding = Math.sign(polygonArea(validRooms[0]?.polygon || []));
  for (const room of validRooms) if (Math.sign(polygonArea(room.polygon)) !== winding) errors.push(`${room.id}: inconsistent polygon winding`);
  for (let i = 0; i < validRooms.length; i++) {
    for (let j = i + 1; j < validRooms.length; j++) {
      const a = validRooms[i], b = validRooms[j];
      if (a.floor !== b.floor || a.kind === 'void' || b.kind === 'void') continue;
      if (a.allowOverlapWith?.includes(b.id) || b.allowOverlapWith?.includes(a.id)) continue;
      if (polygonsOverlap(a.polygon, b.polygon)) errors.push(`Unintended room overlap: ${a.id}/${b.id}`);
    }
  }
  const validWalls = [];
  for (const wall of walls) {
    if (!floorIds.has(wall.floor)) errors.push(`${wall.id}: unknown floor ${wall.floor}`);
    if (!point(wall.a) || !point(wall.b) || distance(wall.a, wall.b) <= EPSILON) {
      errors.push(`${wall.id}: wall endpoints must be finite and length positive`);
      continue;
    }
    validWalls.push(wall);
    const length = distance(wall.a, wall.b);
    const wallHeight = wall.height ?? house.wallHeight;
    if (wallHeight !== undefined && (!finite(wallHeight) || wallHeight <= 0)) errors.push(`${wall.id}: wall height must be positive`);
    const openings = wall.openings || [];
    for (const [index, opening] of openings.entries()) {
      if (![opening.offset, opening.width, opening.height, opening.sill].every(finite)) {
        errors.push(`${wall.id}: opening ${index} requires finite dimensions`);
        continue;
      }
      if (opening.offset < -EPSILON || opening.width <= 0 || opening.offset + opening.width > length + EPSILON) {
        errors.push(`${wall.id}: opening ${index} exceeds wall length`);
      }
      if (opening.sill < 0 || opening.height <= 0 || (finite(wallHeight) && opening.sill + opening.height > wallHeight + EPSILON)) {
        errors.push(`${wall.id}: opening ${index} exceeds wall height`);
      }
    }
    for (let i = 0; i < openings.length; i++) for (let j = i + 1; j < openings.length; j++) {
      const a = openings[i], b = openings[j];
      if (Math.min(a.offset + a.width, b.offset + b.width) - Math.max(a.offset, b.offset) > EPSILON
        && Math.min(a.sill + a.height, b.sill + b.height) - Math.max(a.sill, b.sill) > EPSILON) {
        errors.push(`${wall.id}: overlapping openings ${i}/${j}`);
      }
    }
  }
  for (let i = 0; i < validWalls.length; i++) for (let j = i + 1; j < validWalls.length; j++) {
    const a = validWalls[i], b = validWalls[j];
    if (a.floor === b.floor && collinearOverlap(a.a, a.b, b.a, b.b)) errors.push(`Duplicate shared wall: ${a.id}/${b.id}`);
  }
  const bindings = house.photoBindings || house.bindings || [];
  const primarySets = new Set();
  for (const binding of bindings) {
    if (binding.status !== 'confirmed') continue;
    if (!binding.reviewedBy || !binding.reviewedAt || !['owner-confirmed', 'multi-source-reviewed'].includes(binding.method)
      || !Array.isArray(binding.evidence) || !binding.evidence.length) errors.push(`${binding.photoSetId}: confirmed photo mapping requires review evidence`);
    if (!rooms.some((room) => room.id === (binding.spaceId || binding.roomId))) errors.push(`${binding.photoSetId}: confirmed photo mapping references unknown room`);
    if (primarySets.has(binding.photoSetId)) errors.push(`${binding.photoSetId}: multiple primary photo bindings`);
    primarySets.add(binding.photoSetId);
  }
  for (const room of rooms) {
    if (room.photoSetId && !bindings.some((binding) => binding.status === 'confirmed'
      && binding.photoSetId === room.photoSetId && (binding.spaceId || binding.roomId) === room.id)) {
      errors.push(`${room.id}: pinned photo set requires a confirmed photo binding`);
    }
  }
  if (house.stair?.holePolygon) {
    const issues = validatePolygon(house.stair.holePolygon);
    errors.push(...issues.map((error) => `stair opening: ${error}`));
    if (!issues.length) for (const room of validRooms) {
      if (room.floor === 'f2' && room.kind !== 'void' && room.kind !== 'stair'
        && polygonsOverlap(room.polygon, house.stair.holePolygon)) errors.push(`${room.id}: floor polygon blocks the stair opening`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function assertHouse(house) {
  const result = validateHouse(house);
  if (!result.valid) throw new Error(`House validation failed:\n${result.errors.join('\n')}`);
  return result;
}

/** Copy only educational geometry; no photos, addresses, paths, source files, or review identities. */
export function sanitizeLearningHouse(house) {
  assertHouse(house);
  const vec = (p) => [p[0], p[1]];
  const safe = {
    schemaVersion: '1.0', title: 'Home Explorer — educational geometry', lengthUnit: 'metre',
    notice: 'Study reference redrawn from supplied plans; not a construction drawing. Photography is not included.',
    floors: house.floors.map(({ id, elevation }) => ({ id, elevation })),
    rooms: house.rooms.map((room) => ({
      id: room.id, floor: room.floor, name: room.name, planLabel: room.planLabel ?? null,
      polygon: room.polygon.map(vec), kind: room.kind || 'room', levelOffset: room.levelOffset ?? 0,
      evidenceStatus: room.evidenceStatus || 'draft', geometryStatus: room.geometryStatus || 'draft',
    })),
    walls: house.walls.map((wall) => ({
      id: wall.id, floor: wall.floor, a: vec(wall.a), b: vec(wall.b), exterior: Boolean(wall.exterior),
      ...(finite(wall.height) ? { height: wall.height } : {}),
      openings: (wall.openings || []).map(({ offset, width, height, sill, kind }) => ({ offset, width, height, sill, kind })),
    })),
    ...(finite(house.wallHeight) ? { wallHeight: house.wallHeight } : {}),
    ...(house.stair?.holePolygon ? { stair: { holePolygon: house.stair.holePolygon.map(vec) } } : {}),
  };
  if (/(?:\/Users\/|\/private\/|sources-private|\.pdf\b|file:\/\/)/i.test(JSON.stringify(safe))) {
    throw new Error('Learning export contains a disallowed source reference');
  }
  return safe;
}
