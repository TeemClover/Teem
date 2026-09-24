import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {house} from '../app/data/house.js';
import {createStairHall,stairHallBounds,stairHallPresentation,sliceStairGroup} from '../app/scene/stair-hall.js';

const materials=new Proxy({}, {get:(object,key)=>object[key]||=(new THREE.MeshStandardMaterial())});
const elevation=house.floors.find(floor=>floor.id==='f2').elevation;
const ringGroups=hall=>hall.chandelier.children.filter(child=>child.name.startsWith('chandelier-ring-'));

test('storey views never bring the other floor into the stair presentation in SD or HD',()=>{
  for(const renderMode of ['sd','hd'])for(const view of ['whole','f1','f2','exploded']) {
    const policy=stairHallPresentation({view,renderMode,isolate:true,builtins:true,selectedRoomId:null},house);
    const both=view==='whole'||view==='exploded';
    assert.deepEqual(policy.floors,{f1:both||view==='f1',f2:both||view==='f2'});
    assert.equal(policy.stairs,both||view==='f1');
    assert.equal(policy.landing,both||view==='f2');
    assert.equal(policy.chandelier,both||view==='f2');
    assert.equal(policy.stairsVariant,view==='f1'?'lower':'full');
    assert.equal(policy.chandelierVariant,view==='f2'?'upper':'full');
    assert.equal(policy.backdropFloor,null);
  }
});

test('isolated stair framing and backdrop stop at the selected floor boundary',()=>{
  for(const renderMode of ['sd','hd'])for(const [view,id] of [['f1','f1-stair'],['f2','f2-204-hall']]) {
    const policy=stairHallPresentation({view,renderMode,isolate:true,builtins:true,selectedRoomId:id},house);
    assert.equal(policy.focused,true);
    assert.equal(policy.backdropFloor,view);
    assert.equal(policy.floors[view==='f1'?'f2':'f1'],false);
    assert.equal(policy.focusBounds.min[1],view==='f1'?0:elevation);
    assert.equal(policy.focusBounds.max[1],view==='f1'?elevation:elevation+2.7);
    assert.equal(policy.stairs,view==='f1');
    assert.equal(policy.landing,view==='f2');
    assert.equal(policy.chandelier,view==='f2');
  }
  const otherRoom=stairHallPresentation({view:'f2',selectedRoomId:'f2-201-bedroom',isolate:true,builtins:true},house);
  assert.equal(otherRoom.stairs,false);assert.equal(otherRoom.landing,false);assert.equal(otherRoom.chandelier,false);
  const noBuiltins=stairHallPresentation({view:'f2',selectedRoomId:'f2-204-hall',isolate:true,builtins:false},house);
  assert.equal(noBuiltins.landing,true);assert.equal(noBuiltins.chandelier,false);
});

test('floor-specific stair and chandelier meshes cannot render across the floor datum',()=>{
  for(const quality of ['sd','hd']) {
    const hall=createStairHall({house,materials,quality});
    try {
      const lower=new THREE.Box3().setFromObject(hall.stairsLower),upper=new THREE.Box3().setFromObject(hall.chandelierUpper);
      assert.ok(lower.min.y>=-1e-6&&lower.max.y<=elevation+1e-6,'F1 stair slice stays beneath F2');
      assert.ok(upper.min.y>=-1e-6,'F2 chandelier slice has no mesh below its own floor');
      assert.ok(new THREE.Box3().setFromObject(hall.chandelier).min.y<-.5,'whole-house chandelier retains its lower rings');
      assert.ok(new THREE.Box3().setFromObject(hall.stairs).max.y>elevation+.5,'whole-house stairs retain upper guard rails');
      assert.equal(ringGroups(hall).length,8,'floor slicing never mutates the original eight-ring model');
      for(const group of [hall.stairsLower,hall.chandelierUpper])group.traverse(object=>{
        if(!object.isMesh)return;
        for(const name of ['position','normal','uv'])assert.ok(object.geometry.getAttribute(name));
        for(const value of object.geometry.getAttribute('position').array)assert.ok(Number.isFinite(value));
      });
    } finally {hall.dispose();}
  }
});

test('a tall backdrop can be sliced into exact adjoining floor bands without touching its source',()=>{
  const source=new THREE.Group(),geometry=new THREE.BoxGeometry(3,elevation+2.7,.15),material=new THREE.MeshBasicMaterial();
  const wall=new THREE.Mesh(geometry,material);wall.position.y=(elevation+2.7)/2;source.add(wall);
  const before=new THREE.Box3().setFromObject(source),lower=sliceStairGroup(source,0,elevation),upper=sliceStairGroup(source,elevation,elevation+2.7);
  try {
    assert.ok(Math.abs(new THREE.Box3().setFromObject(lower).max.y-elevation)<1e-6);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(upper).min.y-elevation)<1e-6);
    assert.deepEqual(new THREE.Box3().setFromObject(source),before);
  } finally {
    geometry.dispose();material.dispose();
    for(const group of [lower,upper])group.traverse(object=>object.geometry?.dispose());
  }
});

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
