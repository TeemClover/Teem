import test from 'node:test';
import assert from 'node:assert/strict';
import {house} from '../app/data/house.js';
import {photoSets} from '../app/data/photos.js';
import {validateHouse} from '../app/validate.js';

test('owner-confirmed chandelier photos select the stair hall and preserve the adjacent lounge binding',()=>{
 const hall=house.rooms.find(room=>room.id==='f2-204-hall');
 const photos=photoSets.find(set=>set.id===hall.photoSetId);
 assert.equal(photos.binding.status,'confirmed');
 assert.equal(photos.binding.roomId,hall.id);
 assert.equal(photos.binding.reviewedBy,'owner');
 assert.deepEqual(photos.photos.map(photo=>photo.id),['P24','P25']);
 assert.equal(house.photoBindings.find(binding=>binding.photoSetId===photos.id).spaceId,hall.id);
 assert.equal(photoSets.find(set=>set.id==='photos-study').binding.roomId,'f2-204-1-lounge');
 assert.deepEqual(validateHouse(house).errors,[]);
});

test('approval to show people does not silently confirm a candidate room location',()=>{
 const living=photoSets.find(set=>set.id==='photos-living');
 assert.equal(living.binding.status,'candidate');
 assert.deepEqual(living.binding.candidates,['f1-g01-living']);
 for(const id of ['P25','P26']){
  const photo=photoSets.flatMap(set=>set.photos).find(photo=>photo.id===id);
  assert.equal(photo.publicationApproval.by,'owner');
  assert.equal(photo.publicationApproval.scope,'people-visible');
  assert.match(photo.src,/^media\/photos\/[a-z-]+\.webp$/);
  assert.doesNotMatch(JSON.stringify(photo),/\/tmp\/|\/Users\/|\.jpe?g/i);
 }
});
