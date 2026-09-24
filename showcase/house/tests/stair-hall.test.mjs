import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {house} from '../app/data/house.js';
import {createStairHall,stairHallBounds} from '../app/scene/stair-hall.js';

const materials=new Proxy({}, {get:(object,key)=>object[key]||=(new THREE.MeshStandardMaterial())});
const elevation=house.floors.find(floor=>floor.id==='f2').elevation;
const ringGroups=hall=>hall.chandelier.children.filter(child=>child.name.startsWith('chandelier-ring-'));

test('the stair chandelier has eight descending inclined rings in both render modes',()=>{
  const sd=createStairHall({house,materials}),hd=createStairHall({house,materials,quality:'hd'});
  try {
    const basic=ringGroups(sd),detailed=ringGroups(hd);
    assert.equal(basic.length,8);assert.equal(detailed.length,8);
    for(let i=0;i<8;i++) {
      assert.deepEqual(basic[i].position.toArray(),detailed[i].position.toArray());
      assert.deepEqual(basic[i].rotation.toArray(),detailed[i].rotation.toArray());
      if(i) {
        assert.ok(basic[i].position.y<basic[i-1].position.y);
        assert.ok(basic[i].userData.radius<basic[i-1].userData.radius);
        assert.ok(basic[i].rotation.x*basic[i-1].rotation.x<0,'alternate ring inclinations');
      }
    }
    assert.equal(sd.chandelier.children.filter(child=>child.name==='chandelier-suspension').length,24);
    assert.equal(hd.chandelier.children.filter(child=>child.name==='chandelier-suspension').length,24);
    assert.ok(detailed.every(ring=>ring.children.some(child=>child.name==='hd:crystal-prism')));
    assert.ok(!basic.some(ring=>ring.children.some(child=>child.name==='hd:crystal-prism')));
    assert.ok(sd.canopy!==sd.chandelier,'ceiling disk can be hidden independently of the rings');
    assert.ok(basic[7].position.y<0,'lower rings are visible through the actual stair void');
  } finally {sd.dispose();hd.dispose();}
});

test('stairs and chandelier fit the existing opening and keep two metres above occupied treads',()=>{
  const hall=createStairHall({house,materials,quality:'hd'});
  try {
    assert.ok(hall.stairs.userData.flightWidth>=.89);
    assert.ok(hall.stairs.userData.centralClearWidth>.95);
    const stairBounds=new THREE.Box3().setFromObject(hall.stairs);
    const [x0,z0,x1,z1]=hall.stairs.userData.holeBounds;
    assert.ok(stairBounds.min.x>=x0&&stairBounds.max.x<=x1);
    assert.ok(stairBounds.min.z>=z0-.02&&stairBounds.max.z<=z1+.02);
    const treads=[];
    hall.stairs.traverse(object=>{if(object.name==='stair-tread')treads.push(new THREE.Box3().setFromObject(object));});
    assert.equal(treads.length,house.stair.stepCount);
    hall.chandelier.position.y=elevation;hall.chandelier.updateMatrixWorld(true);
    for(const ring of ringGroups(hall))ring.traverse(object=>{
      if(!object.isMesh)return;
      const points=object.geometry.getAttribute('position');
      for(let i=0;i<points.count;i++) {
        const p=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(object.matrixWorld);
        for(const tread of treads) {
          if(p.x<tread.min.x||p.x>tread.max.x||p.z<tread.min.z||p.z>tread.max.z)continue;
          assert.ok(p.y-tread.max.y>=2,`${ring.name} leaves head clearance above the stair`);
        }
      }
    });
    // The landing guard ends before the upper flight's arrival opening.
    const arrival=hall.landing.getObjectByName('upper-arrival-tread');
    const arrivalBounds=new THREE.Box3().setFromObject(arrival);
    for(const object of hall.landing.children.filter(child=>['landing-baluster','landing-rail','landing-oak-handrail'].includes(child.name))) {
      assert.ok(new THREE.Box3().setFromObject(object).max.x<arrivalBounds.min.x,'upper stair exit stays clear');
    }
  } finally {hall.dispose();}
});

test('stair detail is mergeable, bounded and owns its small lighting material set',()=>{
  for(const quality of ['sd','hd']) {
    const hall=createStairHall({house,materials,quality});let triangles=0,lights=0;
    try {
      for(const group of [hall.stairs,hall.landing,hall.chandelier,hall.canopy])group.traverse(object=>{
        if(object.isLight)lights++;
        if(!object.isMesh)return;
        const geometry=object.geometry,position=geometry.getAttribute('position');
        assert.ok(geometry.getAttribute('normal')&&geometry.getAttribute('uv'));
        for(const coordinate of position.array)assert.ok(Number.isFinite(coordinate));
        triangles+=(geometry.index?.count||position.count)/3;
      });
      assert.equal(lights,0,'facet highlights use the existing scene lighting');
      assert.ok(triangles<(quality==='hd'?30_000:10_000),`${quality}: ${triangles} triangles`);
      assert.equal(hall.materials.length,quality==='hd'?3:2);
      assert.ok(hall.materials.every(material=>!material.transparent),'no stacked transparent crystal sorting');
      assert.deepEqual(hall.focusBounds,stairHallBounds(house));
      assert.ok(hall.focusBounds.max[1]>=elevation+2.5);
      const disposed=[];
      for(const material of hall.materials)material.addEventListener('dispose',()=>disposed.push(material));
      hall.dispose();assert.equal(disposed.length,hall.materials.length);
    } finally {hall.disposeGeometries();}
  }
});
