import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../tour/vendor/three.module.min.js';
import {buildHouse} from '../../tour/house.js';
import {coplanarOverlaps} from './helpers/coplanar.mjs';

test('surface audit detects rotated overlapping faces but allows touching joints', () => {
  const root = new THREE.Group(); root.rotation.set(0.2, 0.4, 0.1);
  const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const b = a.clone(); b.position.x = 0.8; root.add(a, b);
  assert.equal(coplanarOverlaps(root).length, 1);
  b.position.x = 1;
  assert.equal(coplanarOverlaps(root).length, 0);
});

for (const hd of [false, true]) test(`the complete ${hd ? 'HD' : 'SD'} house has no overlapping coplanar mesh faces`, t => {
  // Texture pixels do not affect positions; keep scene construction independent of DOM/network.
  t.mock.method(THREE.TextureLoader.prototype, 'load', () => new THREE.Texture());
  const tex = new Proxy({canvasTex: () => new THREE.Texture()}, {get: (target, key) => target[key] ?? (target[key] = new THREE.Texture())});
  const house = buildHouse({renderer: {}, hd, tex, found: new Set(), mobile: false});
  assert.deepEqual(coplanarOverlaps(house.root), []);
  const biasedSolids = [];
  house.root.traverse(mesh => { if (mesh.isMesh && mesh.geometry.type !== 'PlaneGeometry' && mesh.material.polygonOffset) biasedSolids.push(mesh.geometry.type); });
  assert.deepEqual(biasedSolids, [], 'decal polygon offset must not mutate shared solid materials');
});
