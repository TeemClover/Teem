import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../tour/vendor/three.module.min.js';
import {miniatureHouse} from '../../tour/miniature-house.js';
import {coplanarOverlaps} from './helpers/coplanar.mjs';
import {house as reference} from '../../showcase/house/app/data/house.js';

test('the exhibit follows the reference facade setbacks and leaves an open carport below the west bedroom', () => {
  const model=miniatureHouse(); model.updateMatrixWorld(true);
  const shell=model.children[0];
  for(const id of ['f2-front-left','f2-front-center','f2-front-right']) {
    const wall=reference.walls.find(w=>w.id===id),x=(wall.a[0]+wall.b[0])/2;
    const origin=new THREE.Vector3(x,reference.floors[1].elevation+1.2,wall.a[1]+1).applyMatrix4(shell.matrixWorld);
    const hit=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1)).intersectObject(model,true)[0];
    assert.ok(hit,`${id} has a front face`);
    const local=shell.worldToLocal(hit.point.clone());
    assert.ok(Math.abs(local.z-wall.a[1])<.1,`${id} matches the reference setback`);
  }
  const point=new THREE.Vector3(2.7,2,-1).applyMatrix4(shell.matrixWorld);
  const ray=new THREE.Raycaster(point,new THREE.Vector3(0,0,1),0,.25);
  assert.equal(ray.intersectObject(model,true).length,0,'the front carport is open, not a solid ground-floor box');
  const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  assert.ok(size.x<1 && size.z<.75 && size.y<.5,'the model fits its existing tabletop plinth');
  let triangles=0,textureMaps=0,meshes=0;
  model.traverse(mesh=>{if(!mesh.isMesh)return;meshes++;assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);assert.equal(mesh.material.transparent,false);triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;if(mesh.material.map)textureMaps++;});
  assert.ok(triangles<600,`miniature stays inexpensive: ${triangles} triangles`);
  assert.equal(meshes,1,'one mesh and one material keep the exhibit to one draw call');
  assert.deepEqual(coplanarOverlaps(model,{withinMesh:true}),[],'combined geometry must retain surface clearance');
  assert.equal(textureMaps,0,'the exhibit does not download the full viewer texture set');
});
