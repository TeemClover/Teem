import test from 'node:test';
import assert from 'node:assert/strict';
import {recordDownload} from './learn-downloads.js';
test('file requests use authenticated account/course/file keys and do not store tokens or file bodies',async()=>{
 const calls=[],sql={query:async(q,a)=>{calls.push({q,a});return [];}};
 await recordDownload(sql,{courseId:'ai-sauce',fileId:'guide'});assert.equal(calls.length,0);
 await recordDownload(sql,{userId:'alice',courseId:'ai-sauce',fileId:'guide',filename:'GUIDE.md',now:new Date('2026-09-21')});
 await recordDownload(sql,{userId:'alice',courseId:'ai-sauce',fileId:'guide',filename:'GUIDE.md',now:new Date('2026-09-22')});
 assert.equal(calls.length,3);assert.deepEqual(calls[1].a.slice(0,4),['alice','ai-sauce','guide','GUIDE.md']);
 assert.match(calls[1].q,/ON CONFLICT\(user_id,course_id,file_id\)/);assert.match(calls[1].q,/requests=mc_learn_downloads.requests\+1/);
 assert.doesNotMatch(calls[1].q,/token|cookie|receipt|body/);
});
