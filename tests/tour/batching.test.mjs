import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../tour/vendor/three.module.min.js';
import {batchStaticSiblings} from '../../tour/batching.js';

test('batching preserves solid ray hits and parent motion without freezing animated pieces', () => {
  const root = new THREE.Group(), parent = new THREE.Group();root.add(parent);parent.position.x=4;
  const geometry=new THREE.BoxGeometry(1,1,1), material=new THREE.MeshBasicMaterial();
  for(let i=0;i<4;i++){const m=new THREE.Mesh(geometry,material);m.position.x=i*2;m.userData.item='desk';parent.add(m);}
  const moving=parent.children[3];moving.userData.dynamic=true;
  assert.equal(batchStaticSiblings(root),2);root.updateMatrixWorld(true);
  const batch=parent.children.find(o=>o.isInstancedMesh);
  assert.equal(batch.count,3);assert.equal(batch.userData.item,'desk');assert.ok(parent.children.includes(moving));
  let ray=new THREE.Raycaster(new THREE.Vector3(4,0,5),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(batch)[0].distance,4.5);
  parent.position.x=7;root.updateMatrixWorld(true);
  ray=new THREE.Raycaster(new THREE.Vector3(7,0,5),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(batch)[0].distance,4.5);
});
