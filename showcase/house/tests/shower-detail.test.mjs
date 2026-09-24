import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createShowerDetail} from '../app/scene/shower-detail.js';

const materialNames=['taupe','outdoor','frame','metal','glass','white'];
const materials=Object.fromEntries(materialNames.map(name=>[name,new THREE.MeshStandardMaterial({transparent:name==='glass',opacity:name==='glass'?.3:1})]));

test('bathroom 205 shower is model-only and keeps the east side open',()=>{
  for(const quality of ['sd','hd']) {
    const shower=createShowerDetail({materials,quality});
    try {
      assert.equal(shower.userData.modelOnly,true);
      assert.equal(shower.position.y,0,'the existing bathroom floor offset is applied exactly once by the caller');
      const bounds=new THREE.Box3().setFromObject(shower);
      assert.ok(bounds.min.x>=8.55&&bounds.max.x<=9.62);
      assert.ok(bounds.min.z>=-9.12&&bounds.max.z<=-7.92);
      const screen=shower.getObjectByName('shower-fixed-screen');
      assert.ok(screen);assert.equal(screen.material,materials.glass);
      assert.ok(9.60-new THREE.Box3().setFromObject(screen).max.x>.54,'fixed screen leaves entry gap');
      const route=new THREE.Box3(new THREE.Vector3(9.08,.13,-8.05),new THREE.Vector3(9.57,1.85,-7.82));
      shower.traverse(object=>{if(object.isMesh)assert.ok(!new THREE.Box3().setFromObject(object).intersectsBox(route),'wet-zone entry clear');});
      assert.equal(shower.children.filter(child=>child.name==='wet-floor-tile').length,4);
      assert.ok(shower.getObjectByName('shower-handheld-head').position.x<8.85,'fittings stay on the west wall');
    } finally {shower.disposeSourceGeometries();}
  }
});

test('shower detail shares the existing palette and stays within a small mergeable mesh budget',()=>{
  for(const quality of ['sd','hd']) {
    const shower=createShowerDetail({materials,quality});let triangles=0;
    try {
      shower.traverse(object=>{
        if(!object.isMesh)return;
        assert.ok(Object.values(materials).includes(object.material));
        const geometry=object.geometry,position=geometry.getAttribute('position');
        assert.ok(geometry.getAttribute('normal')&&geometry.getAttribute('uv'));
        for(const coordinate of position.array)assert.ok(Number.isFinite(coordinate));
        triangles+=(geometry.index?.count||position.count)/3;
      });
      assert.ok(triangles<(quality==='hd'?5_000:2_000),`${quality}: ${triangles} triangles`);
      assert.equal(shower.children.filter(child=>child.name==='hd:shower-nozzle').length,quality==='hd'?18:0);
    } finally {shower.disposeSourceGeometries();}
  }
});
