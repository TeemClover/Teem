import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeCode,hasCompletedTopic,answersComplete} from '../../start/start-domain.mjs';
test('clip lookup accepts real episode numbers and rejects ambiguous or injected paths',()=>{
 for(const value of ['2','02','MC02','mc2','MC 02','๐๒']) assert.equal(episodeCode(value),'MC02');
 for(const value of ['',0,31,'MC00','MC31','02/../library','MC02?next=mc30','2.0','02abc']) assert.equal(episodeCode(value),null);
 assert.equal(episodeCode('30'),'MC30');
});
test('old started marks and partial answers do not unlock the library',()=>{
 assert.equal(hasCompletedTopic({MC01:{started:true}}),false);
 assert.equal(hasCompletedTopic({other:{completed:true}}),false);
 assert.equal(hasCompletedTopic({MC02:{completed:true}}),true);
 assert.equal(answersComplete(['จริง','ยังไม่รู้','ลองถามคนหนึ่งคน']),true);
 assert.equal(answersComplete(['จริง',' ','ลอง']),false);
 assert.equal(answersComplete(['จริง','ลอง']),false);
 for(const value of [null,[],{MC02:true},{MC02:{completed:'true'}}]) assert.equal(hasCompletedTopic(value),false);
});
