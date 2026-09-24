import test from 'node:test';
import assert from 'node:assert/strict';
import {house} from '../app/data/house.js';
import {photoSets} from '../app/data/photos.js';
import {assemblyBands,carportFrame} from '../app/scene/assembly.js';

test('front columns meet the beam without overlapping coplanar visible faces',()=>{
  const frame=carportFrame(house,house.assumptions);
  const bounds=part=>({min:part.position.map((v,i)=>v-part.size[i]/2),max:part.position.map((v,i)=>v+part.size[i]/2)});
  const beam=bounds(frame.beam);
  assert.equal(beam.max[1],3.29);
  assert.deepEqual(frame.columns.map(part=>part.position[0]),[.05,5.4]);
  for(const column of frame.columns) {
    const b=bounds(column);
    assert.ok(Math.abs(b.min[1]+.35)<1e-8,'keep the carport floor datum');
    assert.ok(Math.abs(b.max[1]-beam.min[1])<1e-8,'no gap at the beam underside');
    const overlapX=Math.min(b.max[0],beam.max[0])-Math.max(b.min[0],beam.min[0]);
    const overlapY=Math.max(0,Math.min(b.max[1],beam.max[1])-Math.max(b.min[1],beam.min[1]));
    assert.ok(overlapX>0,'columns remain under the beam');
    assert.ok(overlapX*overlapY<1e-10,'different finishes must not share a visible face');
  }
});

test('assembled shell closes the gap below floor 2 without moving its source elevation',()=>{
  const bands=assemblyBands(house,house.assumptions);
  const floor1=house.floors.find(f=>f.id==='f1'),floor2=house.floors.find(f=>f.id==='f2');
  assert.equal(floor2.elevation-floor1.elevation,3.29);
  for(const wall of house.walls.filter(w=>w.floor==='f1'&&w.exterior)) {
    const band=bands.find(b=>b.wall.id===wall.id);
    assert.ok(band,`${wall.id} has no assembly infill`);
    assert.ok(band.bottom<=wall.height,`${wall.id} leaves air above wall`);
    assert.ok(band.top>=floor2.elevation-floor1.elevation-house.assumptions.slabThickness,`${wall.id} leaves air below slab`);
  }
});

test('owner bedroom photos belong only to 201; 202 and 203 use the plan',()=>{
  assert.equal(photoSets.find(s=>s.id==='photos-bedroom').binding.roomId,'f2-201-bedroom');
  for(const id of ['f2-202-bedroom','f2-203-bedroom']) {
    assert.ok(!photoSets.some(s=>s.binding.roomId===id||s.binding.candidates?.includes(id)));
  }
});


test('west side of both storeys is flush and the obsolete ledge is removed',()=>{
  const lower=house.walls.find(w=>w.id==='f1-west'),upper=house.walls.find(w=>w.id==='f2-west');
  assert.equal(upper.a[0],lower.a[0]);
  assert.equal(upper.b[0],lower.b[0]);
  for(const id of ['f2-202-bedroom','f2-203-bedroom'])assert.equal(Math.min(...house.rooms.find(r=>r.id===id).polygon.map(p=>p[0])),lower.a[0]);
  assert.ok(!house.rooms.some(r=>r.id==='f2-211-service-roof'));
});
