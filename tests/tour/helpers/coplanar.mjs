import * as THREE from '../../../tour/vendor/three.module.min.js';

const EPS = 3e-5;
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function overlapArea(subject, clip) {
  let poly = subject;
  const sign = Math.sign(cross(...clip));
  for (let i = 0; i < 3 && poly.length; i++) {
    const a = clip[i], b = clip[(i + 1) % 3], output = [];
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j], q = poly[(j + 1) % poly.length];
      const dp = sign * cross(a, b, p), dq = sign * cross(a, b, q);
      if (dp >= 0) output.push(p);
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        output.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    poly = output;
  }
  return Math.abs(poly.reduce((area, p, i) => {
    const q = poly[(i + 1) % poly.length]; return area + p[0] * q[1] - p[1] * q[0];
  }, 0)) / 2;
}

/** Actual world-space triangles, including rotated furniture and every batched instance.
 * Same-facing surfaces sharing area and depth can flicker. Touching edges and opposing
 * faces at a butt joint are fine. Transparent hit targets do not contribute pixels.
 */
export function coplanarOverlaps(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), labels = new Map();
  let serial = 0;
  root.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry, p = g.attributes.position;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const index = g.index, count = index?.count ?? p.count;
    for (let instance = 0; instance < (mesh.isInstancedMesh ? mesh.count : 1); instance++) {
      const matrix = mesh.matrixWorld.clone();
      if (mesh.isInstancedMesh) { const local = new THREE.Matrix4(); mesh.getMatrixAt(instance, local); matrix.multiply(local); }
      const id = serial++;
      labels.set(id, `${g.type} ${mesh.userData.item || ''} at ${new THREE.Vector3().setFromMatrixPosition(matrix).toArray().map(n => n.toFixed(3)).join(',')}`);
      const vertices = Array.from({length: p.count}, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix));
      for (let i = 0; i < count; i += 3) {
        const materialIndex = g.groups.find(group => i >= group.start && i < group.start + group.count)?.materialIndex || 0;
        const material = materials[materialIndex] || materials[0];
        if (!material.visible || material.opacity === 0 || material.depthWrite === false) continue;
        const tri = [0, 1, 2].map(k => vertices[index ? index.getX(i + k) : i + k]);
        const normal = new THREE.Vector3().subVectors(tri[1], tri[0]).cross(new THREE.Vector3().subVectors(tri[2], tri[0]));
        if (normal.lengthSq() < 1e-14) continue;
        normal.normalize();
        const depth = normal.dot(tri[0]);
        // Group by direction, then compare depths with tolerance rather than rounding depth.
        const key = normal.toArray().map(n => Math.round(n * 1e4)).join(',');
        const axis = normal.toArray().map(Math.abs).indexOf(Math.max(...normal.toArray().map(Math.abs)));
        const uv = tri.map(v => v.toArray().filter((_, k) => k !== axis));
        const face = {id, depth, normal, tri, uv, min: [0, 1].map(k => Math.min(...uv.map(v => v[k]))), max: [0, 1].map(k => Math.max(...uv.map(v => v[k])))};
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(face);
      }
    }
  });
  const pairs = new Map();
  for (const faces of buckets.values()) {
    faces.sort((a, b) => a.depth - b.depth);
    for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length && faces[j].depth - faces[i].depth < EPS; j++) {
      const a = faces[i], b = faces[j];
      if (a.id === b.id || a.min.some((v, k) => Math.min(a.max[k], b.max[k]) - Math.max(v, b.min[k]) < EPS)) continue;
      if (b.tri.some(v => Math.abs(a.normal.dot(v) - a.depth) > EPS)) continue;
      const area = overlapArea(a.uv, b.uv);
      if (area < 1e-7) continue;
      const key = [a.id, b.id].sort((x, y) => x - y).join(',');
      const previous = pairs.get(key);
      pairs.set(key, {a: labels.get(a.id), b: labels.get(b.id), area: area + (previous?.area || 0)});
    }
  }
  return [...pairs.values()];
}
