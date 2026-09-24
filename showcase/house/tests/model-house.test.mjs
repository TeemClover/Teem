import test from 'node:test';
import assert from 'node:assert/strict';
import {house} from '../app/data/house.js';
import {pointInPolygon,validateHouse,polygonArea} from '../app/validate.js';
import {createModelHouse,furnishingRoom} from '../app/scene/model-house.js';

test('3D shower correction transfers the hall strip without changing the plan or other rooms',()=>{
  const before=structuredClone(house),model=createModelHouse(house);
  const sourceRoom=id=>house.rooms.find(room=>room.id===id),modelRoom=id=>model.rooms.find(room=>room.id===id);
  assert.deepEqual(house,before);
  assert.equal(pointInPolygon([9,-8],sourceRoom('f2-204-hall').polygon),true);
  assert.equal(pointInPolygon([9,-8],modelRoom('f2-204-hall').polygon),false);
  assert.equal(pointInPolygon([9,-8],modelRoom('f2-205-bath').polygon),true);
  assert.equal(pointInPolygon([9,-9.6],modelRoom('f2-205-bath').polygon),false,'rear ventilation area stays separate');
  const ids=['f2-204-hall','f2-205-bath'];
  const area=data=>data.rooms.filter(room=>ids.includes(room.id)).reduce((sum,room)=>sum+Math.abs(polygonArea(room.polygon)),0);
  assert.ok(Math.abs(area(model)-area(house))<1e-6);
  for(const room of house.rooms.filter(room=>!ids.includes(room.id)))assert.deepEqual(modelRoom(room.id),room);
  assert.deepEqual(validateHouse(model).errors,[]);
  assert.deepEqual(furnishingRoom(modelRoom('f2-205-bath')).polygon,sourceRoom('f2-205-bath').polygon,'main bath fixtures keep their original anchors');
});

test('shower is accessed from the bathroom and keeps the existing dressing-room entrance',()=>{
  const model=createModelHouse(house),wall=id=>model.walls.find(item=>item.id===id);
  const passage=wall('f2-bath-west').openings[0];
  assert.equal(passage.kind,'open-passage');
  assert.ok(passage.width>=.8);
  const z=wall('f2-bath-west').a[1]+passage.offset+passage.width/2;
  assert.ok(z>-9.15&&z<-6.9);
  assert.deepEqual(wall('model-shower-front').openings,[],'no new hall entrance');
  assert.deepEqual(wall('model-shower-west').openings,[],'stair void remains enclosed');
  assert.deepEqual(wall('f2-dressing-west'),house.walls.find(item=>item.id==='f2-dressing-west'));
});

test('isolated L-shaped bathroom excludes the vent backdrop without changing the exterior openings',()=>{
  const model=createModelHouse(house),original=house.walls.find(wall=>wall.id==='f2-back');
  const rear=model.walls.filter(wall=>['f2-back','model-bath-rear'].includes(wall.id));
  assert.deepEqual(rear[0].a,original.a);
  assert.deepEqual(rear[0].b,rear[1].a);
  assert.deepEqual(rear[1].b,original.b);
  assert.deepEqual(rear[0].hiddenWhenIsolating,['f2-205-bath']);
  const openings=rear.flatMap(wall=>wall.openings.map(o=>({...o,offset:o.offset+wall.a[0]})));
  const sourceOpenings=original.openings.map(o=>({...o,offset:o.offset+original.a[0]}));
  assert.deepEqual(openings,sourceOpenings);
});
