import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWallControls,wallControlsVisible,WALL_OPTIONS} from '../app/wall-controls.js';
import {initialState,reduce} from '../app/state.js';
import {wallIsLowered} from '../app/scene/wall-visibility.js';
import {buildStairBackdrop} from '../app/scene.js';

// A DOM event surface keeps this component test independent of a browser or renderer.
class Element extends EventTarget {
  constructor(document){super();this.ownerDocument=document;this.dataset={};this.children=[];this.attributes=new Map();}
  setAttribute(key,value){this.attributes.set(key,value);}
  getAttribute(key){return this.attributes.get(key);}
  append(child){this.children.push(child);child.parent=this;}
  remove(){this.parent.children=this.parent.children.filter(child=>child!==this);}
}
const document={createElement(){return new Element(document);}};

test('wall control is offered only where model walls can be changed',()=>{
  for(const lens of ['model','plan','photo'])for(const view of ['whole','f1','f2','exploded']){
    assert.equal(wallControlsVisible({...initialState,lens,view}),lens==='model'&&view!=='whole',`${lens}/${view}`);
  }
});

test('wall controls expose Full Auto Low with Thai tooltips and dispatch only a wall preference',()=>{
  const stage=new Element(document),changes=[],control=createWallControls({stage,onChange:mode=>changes.push(mode)});
  assert.equal(control.element.hidden,true);
  assert.deepEqual(WALL_OPTIONS.map(option=>option.label),['Full','Auto','Low']);
  assert.equal(control.element.getAttribute('role'),'group');
  control.update({...initialState,view:'f2',wallMode:'auto',renderMode:'hd'});
  assert.equal(stage.dataset.wallControls,'visible');
  for(const [i,button] of control.element.children.entries()){
    assert.match(button.title,/[\u0e00-\u0e7f]/);
    assert.match(button.innerHTML,/<svg[^>]+aria-hidden="true"/);
    assert.equal(button.getAttribute('aria-pressed'),String(i===1));
    button.dispatchEvent(new Event('click'));
  }
  assert.deepEqual(changes,['full','auto','low']);
  control.update({...initialState,view:'whole'});
  control.element.children[0].dispatchEvent(new Event('click'));
  assert.deepEqual(changes,['full','auto','low'],'hidden controls cannot change the preference');
  assert.equal(stage.dataset.wallControls,'hidden');
  const oldButton=control.element.children[0];control.destroy();
  oldButton.dispatchEvent(new Event('click'));
  assert.equal(stage.children.length,0);assert.equal(stage.dataset.wallControls,undefined);
});

test('wall changes preserve selected room, graphics and layers',()=>{
  const house={rooms:[{id:'hall',floor:'f2'}]};
  const start={...initialState,view:'f2',activeFloor:'f2',selectedRoomId:'hall',renderMode:'hd',builtins:false,furniture:false};
  for(const mode of ['full','auto','low'])assert.deepEqual(reduce(start,{type:'WALL',mode},house),{...start,wallMode:mode});
  assert.deepEqual(reduce(start,{type:'WALL',mode:'invalid'},house),start);
});

test('Auto lowers a near wall and preserves the far wall while Full and Low are explicit',()=>{
  const near={a:[-4,3],b:[4,3]},far={a:[-4,-3],b:[4,-3]},edge={a:[-4,-3],b:[-4,3]},focus=[0,0],front=[0,1];
  for(const view of ['f1','f2','exploded']){
    assert.equal(wallIsLowered({...initialState,view},near,focus,front),true);
    assert.equal(wallIsLowered({...initialState,view},far,focus,front),false);
    assert.equal(wallIsLowered({...initialState,view},edge,focus,front),false);
    for(const wall of [near,far,edge]){
      assert.equal(wallIsLowered({...initialState,view,wallMode:'full'},wall,focus,front),false);
      assert.equal(wallIsLowered({...initialState,view,wallMode:'low'},wall,focus,front),true);
    }
  }
  for(const wallMode of ['full','auto','low'])assert.equal(wallIsLowered({...initialState,wallMode},near,focus,front),false,'whole stays assembled');
  assert.equal(wallIsLowered({...initialState,view:'f2',wallMode:'full',ceiling:true},near,focus,front),true,'ceiling inspection stays unobstructed');
});

test('both isolated stair backdrops have separate full and low walls, with no stairs or railings',()=>{
  const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),materials=Object.fromEntries(['wall','trim','glass','frame','curtain'].map(key=>[key,material]));
  const house={floors:[{id:'f1',elevation:0},{id:'f2',elevation:3.29}]};
  const {floors,walls}=buildStairBackdrop(scene,materials,house,.9);
  assert.equal(walls.length,4);
  for(const [floor,expectedHeight] of [['f1',3.29],['f2',2.7]]){
    assert.equal(floors[floor].children.length,4);
    const owned=walls.filter(wall=>wall.full.parent===floors[floor]);
    assert.equal(owned.length,2);
    for(const wall of owned){
      const full=new THREE.Box3().setFromObject(wall.full),low=new THREE.Box3().setFromObject(wall.low);
      assert.ok(Math.abs(full.min.y)<1e-6);assert.ok(Math.abs(full.max.y-expectedHeight)<1e-6);
      assert.ok(Math.abs(low.min.y)<1e-6);assert.ok(Math.abs(low.max.y-.9)<1e-6);
      assert.equal(wall.full.parent,wall.low.parent);
      assert.ok(low.min.x>=full.min.x&&low.max.x<=full.max.x&&low.min.z>=full.min.z&&low.max.z<=full.max.z,'lower slices remain inside the original wall footprint');
      assert.ok(Math.max(low.max.x-low.min.x,low.max.z-low.min.z)>2.8,'lower slices retain the length of each wall');
    }
  }
  assert.equal(scene.children.length,2,'only the two wall groups belong to this presentation');
  scene.traverse(object=>object.geometry?.dispose());material.dispose();
});


test('wall preference survives room, lens, storey and reset navigation in the same session',()=>{
 const house={rooms:[{id:'hall',floor:'f2'}]};
 let state={...initialState,wallMode:'low'};
 for(const event of [{type:'VIEW',view:'f1'},{type:'SELECT_ROOM',id:'hall'},{type:'LENS',lens:'photo'},{type:'LENS',lens:'model'},{type:'VIEW',view:'whole'},{type:'RESET'}]){
  state=reduce(state,event,house);assert.equal(state.wallMode,'low');
 }
});
