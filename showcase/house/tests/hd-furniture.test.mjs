import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {house} from '../app/data/house.js';
import {createFurniture,createBuiltins,roomBounds} from '../app/scene/furniture.js';
import {createHDFurniture,createHDBuiltins} from '../app/scene/hd-furniture.js';

const materials={};
const m=new Proxy(materials,{get:(object,key)=>object[key]||=(new THREE.MeshStandardMaterial())});
const room=id=>house.rooms.find(r=>r.id===id);
const bounds=object=>new THREE.Box3().setFromObject(object);
const facing=object=>new THREE.Vector3(0,0,1).applyQuaternion(object.quaternion);
const interiors=id=>new THREE.Group().add(createHDFurniture(room(id),m),createHDBuiltins(room(id),m));
function assertClear(group,rectangle,label){
  group.updateMatrixWorld(true);
  const clearance=new THREE.Box3(new THREE.Vector3(rectangle[0],.12,rectangle[1]),new THREE.Vector3(rectangle[2],2.15,rectangle[3]));
  group.traverse(object=>{if(object.isMesh)assert.ok(!bounds(object).intersectsBox(clearance),label);});
}

test('HD retains the exact SD semantic anchors, layouts and chair directions',()=>{
  for(const r of house.rooms){
    for(const [base,upgraded] of [[createFurniture,createHDFurniture],[createBuiltins,createHDBuiltins]]){
      const sd=base(r,m),hd=upgraded(r,m);
      assert.equal(sd.name,hd.name);
      const named=[];sd.traverse(object=>{if(object.name&&object!==sd)named.push(object);});
      for(const object of named){
        const counterpart=hd.getObjectByName(object.name);
        assert.ok(counterpart,`${r.id} preserves ${object.name}`);
        // Repeated chair names are checked individually below.
        if(object.name==='chair')continue;
        assert.deepEqual(counterpart.position.toArray(),object.position.toArray());
        assert.deepEqual(counterpart.rotation.toArray(),object.rotation.toArray());
      }
    }
  }
  const r=room('f1-g03-dining'),b=roomBounds(r),dining=createHDFurniture(r,m);
  const chairs=dining.children.filter(c=>c.name==='chair');
  assert.equal(chairs.length,8);
  for(const chair of chairs)assert.ok(facing(chair).dot(new THREE.Vector3(b.x-chair.position.x,0,b.z-chair.position.z).normalize())>.55);
  assert.equal(dining.children.filter(c=>c.name==='hd:place-setting').length,8);
});

test('HD beds preserve the owner-confirmed headboards, type and room footprint',()=>{
  const definitions=[['f2-201-bedroom','bed:platform','x'],['f2-202-bedroom','bed:standard','x'],['f2-203-bedroom','bed:standard','z']];
  for(const [id,name,direction] of definitions){
    const g=createHDFurniture(room(id),m),bed=g.getObjectByName(name),b=roomBounds(room(id)),bb=bounds(g);
    assert.ok(bed);assert.ok(facing(bed)[direction]>.99);
    assert.ok(bed.getObjectByName('hd:duvet-folds'));
    assert.ok(bb.min.x>=b.x0-.002&&bb.max.x<=b.x1+.002&&bb.min.z>=b.z0-.002&&bb.max.z<=b.z1+.002,`${id} footprint`);
  }
});

test('HD bedding uses closed cloth volumes without an intersecting flat top',()=>{
  const testMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  for(const id of ['f2-201-bedroom','f2-202-bedroom','f2-203-bedroom']){
    const bed=createHDFurniture(room(id),m);
    for(const name of ['hd:duvet-folds','hd:coverlet-folds']){
      const cloth=bed.getObjectByName(name),geometry=cloth.geometry;
      assert.equal(cloth.material,name==='hd:duvet-folds'?m.cushion:m.curtain);
      const position=geometry.getAttribute('position'),index=geometry.index,edges=new Map();
      const key=i=>[position.getX(i),position.getY(i),position.getZ(i)].map(n=>Math.round(n*1e6)).join(',');
      for(let i=0;i<index.count;i+=3){
        const vertices=[key(index.getX(i)),key(index.getX(i+1)),key(index.getX(i+2))];
        for(let j=0;j<3;j++){
          const edge=[vertices[j],vertices[(j+1)%3]].sort().join('|');
          edges.set(edge,(edges.get(edge)||0)+1);
        }
      }
      assert.ok([...edges.values()].every(count=>count===2),`${id} ${name} has a closed surface`);
      const {width,depth}=geometry.userData.closedCloth;
      const probe=new THREE.Mesh(geometry,testMaterial);
      for(const x of [-.8,-.3,.2,.7])for(const z of [-.8,-.3,.2,.7]){
        const ray=new THREE.Raycaster(new THREE.Vector3(x*width/2,1,z*depth/2),new THREE.Vector3(0,-1,0));
        const levels=[...new Set(ray.intersectObject(probe,false).map(hit=>Math.round(hit.point.y*1e6)))].sort((a,b)=>a-b);
        assert.equal(levels.length,2,`${id} ${name} has one top and one underside`);
        assert.ok(levels[1]-levels[0]>6_000,`${id} ${name} folds never cross their underside`);
      }
    }
  }
  testMaterial.dispose();
});

test('HD detail leaves bedroom, bathroom, pantry and dining access clear',()=>{
  const lounge=interiors('f2-204-1-lounge'),b=roomBounds(room('f2-204-1-lounge'));
  assert.ok(bounds(lounge.getObjectByName('lounge-sofa')).getCenter(new THREE.Vector3()).x>b.x);
  assert.ok(bounds(lounge.getObjectByName('computer-desk')).getCenter(new THREE.Vector3()).x<b.x);
  assertClear(lounge,[b.x0+.15,b.z0+.05,b.x1-.15,b.z0+.55],'lounge entrance');
  assertClear(interiors('f2-206-bath'),[2.35,-4.25,3.2,-3.49],'bathroom 206 doorway');
  assertClear(interiors('f2-207-bath'),[2.4,-6.91,3.25,-6.05],'bathroom 207 doorway');
  assertClear(interiors('f2-205-bath'),[10.8,-8.5,11.61,-7.55],'bathroom 205 doorway');
  assertClear(interiors('f2-201-1-dressing'),[11.59,-8.5,12.45,-7.55],'dressing doorway');
  assertClear(interiors('f1-g04-prep'),[3.29,-5.05,4,-4.1],'service entry');
  assertClear(interiors('f1-g04-prep'),[3.95,-6.7,5.51,-3.49],'prep circulation');
  assertClear(interiors('f1-g03-dining'),[5.49,-6.65,6.25,-3.55],'pantry to dining');
});

test('HD ceramic basins have a visible recess without the former flat top',()=>{
  let checked=0;
  for(const r of house.rooms) {
    const furniture=createHDFurniture(r,m);
    furniture.traverse(fixture=>{
      if(fixture.name!=='fixture:basin')return;
      checked++;
      const shell=fixture.getObjectByName('hd:recessed-basin');
      assert.ok(shell,`${r.id} ceramic shell`);
      const probe=new THREE.Mesh(shell.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
      const ray=new THREE.Raycaster(new THREE.Vector3(.04,1.2,0),new THREE.Vector3(0,-1,0));
      const levels=ray.intersectObject(probe,false).map(hit=>hit.point.y);
      assert.ok(levels.length>=2,`${r.id} retains underside and bowl`);
      assert.ok(Math.max(...levels)<.79,`${r.id} bowl is recessed below the .865 rim`);
      assert.ok(!fixture.children.some(c=>c.isMesh&&Math.abs(c.position.y-.878)<.001),'old floating insert removed');
      assert.ok(fixture.getObjectByName('hd:basin-drain').position.y<.78);
      probe.material.dispose();
    });
  }
  assert.ok(checked>=4,'bathrooms throughout the house are refined');
});

test('HD can be merged by existing material batches and remains finite within a geometry budget',()=>{
  let triangles=0,meshes=0;
  for(const r of house.rooms)for(const group of [createHDFurniture(r,m),createHDBuiltins(r,m)])group.traverse(object=>{
    if(!object.isMesh)return;
    meshes++;
    const geometry=object.geometry,position=geometry.getAttribute('position');
    assert.ok(geometry.getAttribute('normal')&&geometry.getAttribute('uv'),`${r.id}: mergeable attributes`);
    for(const n of position.array)assert.ok(Number.isFinite(n));
    triangles+=(geometry.index?geometry.index.count:position.count)/3;
  });
  assert.ok(meshes>500,'the complete house is represented');
  assert.ok(triangles<350_000,`HD furniture triangle budget: ${triangles}`);
});
