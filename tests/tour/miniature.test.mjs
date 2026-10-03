import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../tour/vendor/three.module.min.js';
import {miniatureHouse} from '../../tour/miniature-house.js';
import {house as reference} from '../../showcase/house/app/data/house.js';

test('the exhibit follows the reference facade setbacks and leaves an open carport below the west bedroom', () => {
  const model=miniatureHouse(); model.updateMatrixWorld(true);
  const shell=model.children[0];
  for(const [part,wall] of [['upper-west','f2-front-left'],['upper-centre','f2-front-center'],['upper-east','f2-front-right']]) {
    const mesh=model.getObjectByName(part),source=reference.walls.find(w=>w.id===wall);
    assert.ok(Math.abs(mesh.position.z+mesh.scale.z/2-source.a[1])<1e-6);
    assert.ok(Math.abs(mesh.position.y-mesh.scale.y/2-reference.floors[1].elevation)<1e-6);
  }
  const point=new THREE.Vector3(2.7,2,-1).applyMatrix4(shell.matrixWorld);
  const ray=new THREE.Raycaster(point,new THREE.Vector3(0,0,1),0,.25);
  assert.equal(ray.intersectObject(model,true).length,0,'the front carport is open, not a solid ground-floor box');
  const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  assert.ok(size.x<1 && size.z<.75 && size.y<.5,'the model fits its existing tabletop plinth');
  let triangles=0,textureMaps=0;
  model.traverse(mesh=>{if(!mesh.isMesh)return;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;if(mesh.material.map)textureMaps++;});
  assert.ok(triangles<3000,`miniature stays inexpensive: ${triangles} triangles`);
  assert.equal(textureMaps,0,'the exhibit does not download the full viewer texture set');
});
