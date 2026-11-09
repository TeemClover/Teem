import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {entryContext,latestEntry,RETIRED_ENTRIES} from './route-contract.js';

test('legacy URLs open the company product story and keep only bounded Compass context',()=>{
 for(const path of RETIRED_ENTRIES){
  const url=new URL(latestEntry('/Xircle/'+path+'/', '?entry=compass&focus=sleep&invite=12345&notebook=create&email=private&url=https://elsewhere.invalid'),'https://myclover.test');
  assert.equal(url.pathname,'/xircle/');assert.equal(url.search,'?entry=compass&focus=sleep');
  assert.equal(url.hash,path==='routinex'?'#routine':['explore','circle','care/party'].includes(path)?'#start':'');
 }
});
test('duplicate, prototype and unknown focus inputs cannot choose a chapter',()=>{
 for(const focus of ['constructor','__proto__','toString','sleep&focus=food'])assert.equal(entryContext('?entry=compass&focus='+focus).focus,null);
 assert.deepEqual(entryContext('?entry=compass&entry=other&focus=sleep'),{compass:false,focus:null});
 assert.deepEqual(entryContext('?entry=compass&focus=sleep&focus=move'),{compass:true,focus:null});
});
test('retired invitations and browser storage have no role in the company story',()=>{
 const storage={getItem(){assert.fail('Company routing must not read a personal notebook');},setItem(){assert.fail('No state migration');}};
 assert.deepEqual(entryContext('?invite=12345&mode=join&c=54321&notebook=create',storage),{compass:false,focus:null});
 assert.equal(latestEntry('/xircle/care/party/','?mode=create&invite=12345'),'/xircle/#start');
});
test('one active company runtime and no personal-service engine',async()=>{
 const html=await readFile(new URL('index.html',import.meta.url),'utf8');
 assert.match(html,/brand-experience\.js/);assert.match(html,/brand-experience\.css/);
 assert.doesNotMatch(html,/experience-v3|\/meet\/|teambook\.me|\/xty\/|xvisor-path\.js|ทีม\s*\+\s*เอโกะ|ทีมและเอโกะ/);
 for(const name of ['experience.js','experience-v1.js','experience-v2.js','experience-v3.js','experience-v3.css','entry.css'])await assert.rejects(access(new URL(name,import.meta.url)));
 for(const path of RETIRED_ENTRIES){const shell=await readFile(new URL(path+'/index.html',import.meta.url),'utf8');assert.match(shell,/legacy-entry\.js/);}
});
