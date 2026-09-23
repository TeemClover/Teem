import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { house } from '../app/data/house.js';
import { photoSets } from '../app/data/photos.js';
import { validateHouse, transformPoint, invertTransform } from '../app/validate.js';

const root = path.resolve(import.meta.dirname, '..');
const result = validateHouse(house);
const roomIds = new Set(house.rooms.map((room) => room.id));
const photoIds = new Set();
const setIds = new Set();
let photographCount = 0;
for (const set of photoSets) {
  if (setIds.has(set.id)) result.errors.push(`Duplicate photo-set ID: ${set.id}`);
  setIds.add(set.id);
  for (const id of set.binding?.candidates || []) if (!roomIds.has(id)) result.errors.push(`${set.id}: unknown candidate room ${id}`);
  if (set.binding?.status === 'confirmed') {
    const binding = set.binding;
    if (!binding.reviewedBy || !binding.reviewedAt || !binding.method || !binding.evidence?.length) {
      result.errors.push(`${set.id}: confirmed photo binding is missing review evidence`);
    }
  }
  for (const photo of set.photos) {
    photographCount++;
    if (photoIds.has(photo.id)) result.errors.push(`Duplicate photo ID: ${photo.id}`);
    photoIds.add(photo.id);
    if (!Number.isFinite(photo.width) || !Number.isFinite(photo.height) || photo.width <= 0 || photo.height <= 0) result.errors.push(`${photo.id}: invalid photo dimensions`);
    for (const key of ['src', 'thumb']) {
      const target = photo[key];
      if (!/^media\/photos\/[a-z0-9-]+\.webp$/.test(target || '')) result.errors.push(`${photo.id}: unsafe ${key} path`);
      else try { await readFile(path.join(root, target)); } catch { result.errors.push(`${photo.id}: missing ${key} derivative`); }
    }
  }
}
const calibrations = (house.calibrations || []).map((calibration) => {
  const inverse = invertTransform(calibration.worldToRaster3x3);
  const distances = calibration.controlPoints.map((point) => {
    const projected = transformPoint(inverse, point.pixelXY);
    return Math.hypot(projected[0] - point.worldXZ[0], projected[1] - point.worldXZ[1]);
  });
  const maxResidualMetres = Math.max(...distances);
  if (Math.abs(maxResidualMetres - calibration.residualMetres) > 0.005) result.errors.push(`${calibration.id}: recorded residual does not match control points`);
  return { id: calibration.id, page: calibration.page, status: calibration.reviewStatus,
    maxResidualMetres: Number(maxResidualMetres.toFixed(5)), rmsResidualMetres: Number(Math.sqrt(distances.reduce((n, d) => n + d * d, 0) / distances.length).toFixed(5)) };
});
result.valid = result.errors.length === 0;
const report = {
  checkedAt: new Date().toISOString(), valid: result.valid,
  counts: { floors: house.floors.length, rooms: house.rooms.length, walls: house.walls.length, photoSets: photoSets.length, photographCount },
  calibrations,
  mapping: { confirmed: photoSets.filter((s) => s.binding?.status === 'confirmed').length,
    candidate: photoSets.filter((s) => s.binding?.status === 'candidate').length,
    context: photoSets.filter((s) => s.binding?.status === 'context').length },
  errors: result.errors, warnings: result.warnings,
  limitations: ['Numerical validation checks consistency, not as-built accuracy.',
    'Draft plan calibration and candidate photo mappings remain draft/candidate after this check.',
    'Source/photo rights and visual privacy review are not established by automated validation.'],
};
await mkdir(path.join(root, 'reports'), { recursive: true });
await writeFile(path.join(root, 'reports/data-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!result.valid) process.exitCode = 1;
