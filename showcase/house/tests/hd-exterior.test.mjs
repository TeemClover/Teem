import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {house} from '../app/data/house.js';
import {createHDExterior} from '../app/scene/hd-exterior.js';
import {solarModuleLayout} from '../app/scene/solar-layout.js';

const materials=new Proxy({}, {get:(object,key)=>object[key]||=(new THREE.MeshStandardMaterial())});

test('HD solar hardware follows the existing slopes and leaves the cell face unobstructed',()=>{
  const {architecture}=createHDExterior({house,materials,roofY:6.19,rise:1.2,overhang:.35});
  const modules=architecture.children.filter(c=>c.name==='hd:solar-module-frame');
  assert.equal(modules.length,14);
  for(const module of modules) {
    const normal=new THREE.Vector3(0,1,0).applyQuaternion(module.quaternion);
    assert.ok(normal.y>.8,'solar frames follow an upward-facing roof slope');
    assert.ok(normal.x>=-1e-8&&normal.z<=1e-8,'the owner places panels on east and rear slopes, leaving the front clear');
    assert.ok(normal.x>.1||normal.z<-.1,'frames are inclined with their panel plane');
    // Each base panel plane sits .065 m above one of these exact hip slopes.
    const eastHeight=6.19+(14.45-module.position.x)/4.6*1.2;
    const rearHeight=6.19+(module.position.z+10.65)/4.048*1.2;
    const roofHeight=normal.x>.1?eastHeight:rearHeight;
    assert.ok(Math.abs(module.position.y-roofHeight-.065)<1e-8,'frame follows the existing panel elevation');
    const [width,depth]=module.userData.panelSize;
    assert.equal(module.children.length,10,'four frame edges, two mounting rails, four clamps');
    for(const part of module.children) {
      assert.ok(part.isMesh);
      // The existing solar plane remains the only sheet over the cells. Frames
      // are narrow perimeter pieces and mounting rails sit below the face.
      if(part.name==='hd:solar-mount-rail')assert.ok(part.position.y+part.scale.y/2<-.01);
      else assert.ok(Math.abs(part.position.x)>width/2-.02||Math.abs(part.position.z)>depth/2-.02);
    }
    assert.ok(module.position.y>6.19,'hardware stays on the roof');
  }
});

test('HD frame corners align with the same solar cell planes rendered in SD',()=>{
  const layout=solarModuleLayout({x0:5.25,x1:14.45,z0:-10.65,z1:-1.25,y:6.19,rise:1.2});
  const {architecture}=createHDExterior({house,materials,roofY:6.19,rise:1.2,overhang:.35});
  const frames=architecture.children.filter(c=>c.name==='hd:solar-module-frame');
  assert.equal(frames.length,layout.length);
  for(const panel of layout) {
    const frame=frames.find(f=>f.userData.panelId===panel.id);
    assert.ok(frame,`${panel.id} is missing its HD frame`);
    assert.ok(frame.position.distanceTo(panel.center)<1e-9);
    for(const x of [-panel.width/2,panel.width/2])for(const z of [-panel.depth/2,panel.depth/2]) {
      const corner=new THREE.Vector3(x,0,z).applyQuaternion(frame.quaternion).add(frame.position);
      assert.ok(panel.corners.some(p=>corner.distanceTo(new THREE.Vector3(...p))<1e-9),`${panel.id} frame does not follow its SD plane`);
    }
  }
});

test('HD exterior remains mergeable and bounded for interactive viewing',()=>{
  const exterior=createHDExterior({house,materials,roofY:6.19,rise:1.2,overhang:.35});
  let triangles=0;
  for(const group of Object.values(exterior))group.traverse(object=>{
    if(!object.isMesh)return;
    const geometry=object.geometry,position=geometry.getAttribute('position');
    assert.ok(geometry.getAttribute('normal')&&geometry.getAttribute('uv'));
    for(const value of position.array)assert.ok(Number.isFinite(value));
    triangles+=(geometry.index?.count||position.count)/3;
  });
  assert.ok(triangles<60_000,`HD exterior triangle budget: ${triangles}`);
});
