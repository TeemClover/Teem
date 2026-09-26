import * as THREE from './vendor/three.module.min.js';

// Only identical opaque siblings are instanced. Parent transforms, picking metadata, and
// separately animated objects stay intact; this also reduces the shadow and AO draw calls.
export function batchStaticSiblings(root) {
  const parents = []; root.traverse(o => { if (o.children.length) parents.push(o); });
  let saved = 0;
  for (const parent of parents) {
    const buckets = new Map();
    for (const o of parent.children) {
      if (!o.isMesh || o.isInstancedMesh || o.children.length || o.userData.dynamic || o.userData.collect ||
          !o.visible || Array.isArray(o.material) || o.material.transparent) continue;
      const key = [o.geometry.uuid, o.material.uuid, o.castShadow, o.receiveShadow,
        o.userData.item || '', o.userData.collect || '', o.userData.music || ''].join(':');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
    }
    for (const meshes of buckets.values()) {
      if (meshes.length < 3) continue;
      const first = meshes[0], batch = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
      batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow;
      batch.userData = {...first.userData}; batch.name = 'static-batch';
      meshes.forEach((m, i) => { m.updateMatrix(); batch.setMatrixAt(i, m.matrix); parent.remove(m); });
      batch.computeBoundingBox(); batch.computeBoundingSphere(); parent.add(batch);
      saved += meshes.length - 1;
    }
  }
  return saved;
}
