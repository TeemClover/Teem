import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {entryContext,latestEntry,notebookHref,savedInvitation,INVITE_TTL,RETIRED_ENTRIES} from './route-contract.js';

test('legacy entries resolve to one current experience, retaining only bounded context',()=>{
  for(const page of RETIRED_ENTRIES){
    const href=latestEntry(`/Xircle/${page}/`,'?entry=compass&focus=sleep&invite=12345&email=private&url=https://elsewhere.invalid');
    const url=new URL(href,'https://myclover.test');
    assert.equal(url.pathname,'/xircle/');assert.equal(url.search,'?entry=compass&focus=sleep&invite=12345');
    assert.equal(url.hash,['circle','care/party','explore'].includes(page)?'#start':'');
  }
  assert.equal(latestEntry('/xircle/care/party/','?mode=create'),'/xircle/?notebook=create#start');
});
test('unknown, duplicate and prototype parameters cannot select a focus or inject a link',()=>{
  for(const value of ['constructor','__proto__','toString','sleep&focus=food'])assert.equal(entryContext('?entry=compass&focus='+value).focus,null);
  assert.equal(entryContext('?entry=compass&entry=other&focus=sleep').compass,false);
  assert.equal(entryContext('?mode=join&c=12345').invitation,'12345');
  assert.equal(entryContext('?invite=12345&invite=67890').invitation,null);
  assert.equal(notebookHref(entryContext('?invite=javascript:alert(1)')),'https://teambook.me/new/?template=xircle_xvisor');
});
test('saved invitation is read without writing, unlocking or clearing old progress',()=>{
  const now=1700000000000;
  const original=JSON.stringify({journeyCompleted:false,firstDayCompletedV10:false,achievements:['sentinel'],xtyHandoff:{partyCode:'54321',receivedAt:now-1000}});
  const storage={getItem(key){assert.equal(key,'xircle.local.v1');return original;},setItem(){assert.fail('legacy writes prohibited');},removeItem(){assert.fail('legacy deletes prohibited');}};
  assert.equal(entryContext('',storage,now).invitation,'54321');
  assert.equal(entryContext('?invite=12345',storage,now).invitation,'12345');
  assert.equal(savedInvitation(storage,now+INVITE_TTL),null);
  assert.equal(savedInvitation(storage,now-2000),null);
  assert.equal(entryContext('',{getItem(){throw Error('blocked');}},now).invitation,null);
  assert.equal(entryContext('',{getItem(){return '{bad';}},now).invitation,null);
});
test('explicit notebook creation takes precedence over a saved invitation without erasing it',()=>{
  const now=1700000000000;
  const storage={getItem(){return JSON.stringify({xtyHandoff:{partyCode:'54321',receivedAt:now}});},setItem(){assert.fail('legacy writes prohibited');}};
  for(const search of ['?mode=create','?notebook=create','?mode=create&invite=12345']){
    const context=entryContext(search,storage,now);
    assert.equal(notebookHref(context),'https://teambook.me/new/?template=xircle_xvisor');
  }
  assert.equal(notebookHref(entryContext('',storage,now)),'https://teambook.me/join/?c=54321');
  assert.equal(notebookHref({invitation:'12345&next=other'}),'https://teambook.me/new/?template=xircle_xvisor');
});
test('all superseded entrypoints use only the compatibility module; reference articles have no gate',async()=>{
  const retired=/\/(?:state|story-v6|v3|v4|v5|playable|analytics|routinex-fit)\.js/;
  for(const page of RETIRED_ENTRIES){
    const html=await readFile(new URL(`${page}/index.html`,import.meta.url),'utf8');
    assert.match(html,/<script type="module" src="\/xircle\/legacy-entry\.js/);assert.doesNotMatch(html,retired);
  }
  for(const page of ['learn','learn/topic','hardware','products','doc']){
    const html=await readFile(new URL(`${page}/index.html`,import.meta.url),'utf8');
    assert.match(html,/\/xircle\/reference\.js/);assert.doesNotMatch(html,retired);
  }
  const index=await readFile(new URL('index.html',import.meta.url),'utf8');
  assert.match(index,/type="module" src="\/xircle\/experience-v3\.js/);assert.doesNotMatch(index,/experience-v2|state\.js/);
  assert.match(index,/XIRCLE Experience — แล้วของคุณล่ะ\?/);
  assert.match(index,/\/xircle\/assets\/v3\/hero-800\.webp/);
  for (const name of ['experience.js','experience.css','experience-v1.js','experience-v2.js','experience-v2.css']) await assert.rejects(access(new URL(name,import.meta.url)));
  await assert.rejects(access(new URL('_shared/state.js',import.meta.url)));
  await assert.rejects(access(new URL('_shared/story-v6.js',import.meta.url)));
});
