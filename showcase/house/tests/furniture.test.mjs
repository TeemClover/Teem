import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {house} from '../app/data/house.js';
import {createFurniture,createBuiltins,roomBounds} from '../app/scene/furniture.js';

const material=new THREE.MeshBasicMaterial();
const m=new Proxy({}, {get:()=>material});
const room=id=>house.rooms.find(r=>r.id===id);
const bounds=object=>new THREE.Box3().setFromObject(object);
const facing=object=>new THREE.Vector3(0,0,1).applyQuaternion(object.quaternion);
function interiors(id){const g=new THREE.Group();g.add(createFurniture(room(id),m),createBuiltins(room(id),m));return g;}
function assertClear(group,rectangle,label){
  group.updateMatrixWorld(true);
  const clearance=new THREE.Box3(new THREE.Vector3(rectangle[0],.12,rectangle[1]),new THREE.Vector3(rectangle[2],2.15,rectangle[3]));
  group.traverse(object=>{if(object.isMesh)assert.ok(!bounds(object).intersectsBox(clearance),label);});
}

test('all dining seats face the tabletop rather than outward',()=>{
  const r=room('f1-g03-dining'),b=roomBounds(r),g=createFurniture(r,m);
  const chairs=g.children.filter(child=>child.name==='chair');
  assert.equal(chairs.length,8);
  for(const chair of chairs){
    const towardTable=new THREE.Vector3(b.x-chair.position.x,0,b.z-chair.position.z).normalize();
    assert.ok(facing(chair).dot(towardTable)>.55,'seat back must face away from the table');
  }
});

test('master retains the owner platform and faces away from the lounge; other beds follow plan',()=>{
  const master=createFurniture(room('f2-201-bedroom'),m).getObjectByName('bed:platform');
  assert.ok(master);assert.ok(facing(master).x>.99,'201 headboard belongs on its west/lounge side');
  const second=createFurniture(room('f2-202-bedroom'),m);
  const third=createFurniture(room('f2-203-bedroom'),m);
  assert.equal(second.getObjectByName('bed:platform'),undefined);
  assert.equal(third.getObjectByName('bed:platform'),undefined);
  assert.ok(facing(second.getObjectByName('bed:standard')).x>.99,'202 headboard is west in the plan');
  assert.ok(facing(third.getObjectByName('bed:standard')).z>.99,'203 headboard is rear in the plan');
  for(const id of ['f2-201-bedroom','f2-202-bedroom','f2-203-bedroom']){
    const b=roomBounds(room(id)),g=createFurniture(room(id),m),bb=bounds(g);
    assert.ok(bb.min.x>=b.x0-.001&&bb.max.x<=b.x1+.001&&bb.min.z>=b.z0-.001&&bb.max.z<=b.z1+.001,`${id} furnishings remain inside its perimeter`);
  }
});

test('lounge seating and computer swap onto their owner-confirmed sides and leave the entrance open',()=>{
  const r=room('f2-204-1-lounge'),b=roomBounds(r),g=interiors(r.id);
  const sofa=g.getObjectByName('lounge-sofa'),desk=g.getObjectByName('computer-desk');
  assert.ok(bounds(sofa).getCenter(new THREE.Vector3()).x>b.x);
  assert.ok(bounds(desk).getCenter(new THREE.Vector3()).x<b.x);
  assert.ok(facing(sofa).x<-.99);
  assertClear(g,[b.x0+.15,b.z0+.05,b.x1-.15,b.z0+.55],'lounge north entrance must remain open');
});

test('bathrooms use the plan fixture sets and keep the master bathroom doorway free',()=>{
  for(const id of ['f1-g06-bath','f1-g08-service-bath','f2-205-bath','f2-206-bath','f2-207-bath']){
    const g=createFurniture(room(id),m),types=g.children.map(child=>child.name).sort();
    assert.deepEqual(types,['fixture:basin',id==='f2-205-bath'?'fixture:bathtub':'fixture:shower','fixture:toilet'].sort(),id);
    const b=roomBounds(room(id)),bb=bounds(g);
    assert.ok(bb.min.x>=b.x0-.01&&bb.max.x<=b.x1+.01&&bb.min.z>=b.z0-.01&&bb.max.z<=b.z1+.01,`${id} fixtures remain inside the room`);
  }
  assertClear(interiors('f2-206-bath'),[2.35,-4.25,3.2,-3.49],'bathroom 206 south doorway from 202 stays clear');
  assertClear(interiors('f2-207-bath'),[2.4,-6.91,3.25,-6.05],'bathroom 207 north doorway from 203 stays clear');
  const master=interiors('f2-205-bath');
  assertClear(master,[10.8,-8.5,11.61,-7.55],'bathroom 205 east entry must remain open');
  assertClear(interiors('f2-201-1-dressing'),[11.59,-8.5,12.45,-7.55],'dressing must not cover bathroom door');
});

test('carport, prep and dining remain connected without cabinetry across the route',()=>{
  const prep=interiors('f1-g04-prep');
  assertClear(prep,[3.29,-5.05,4,-4.1],'service entry into prep stays clear');
  assertClear(prep,[3.95,-6.7,5.51,-3.49],'carport and kitchen circulation along east prep side stays clear');
  assertClear(interiors('f1-g03-dining'),[5.49,-6.65,6.25,-3.55],'no display wall across pantry to dining');
});
