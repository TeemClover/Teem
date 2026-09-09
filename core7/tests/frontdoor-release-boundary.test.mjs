import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {onRequest} from '../../functions/_middleware.js';

test('Pages cannot publicly serve the Front Door local fixture, reports or adjacent tests', async()=>{
  const statResponse=await onRequest({request:new Request('https://teem.pages.dev/tests/stat/frontdoor-data.test.mjs'),next:()=>new Response('test source')});
  assert.equal(statResponse.status,404);
  for(const path of ['/tests/frontdoor/opening.e2e.mjs','/docs/frontdoor/provenance.json','/tests/ako/kitchen.e2e.mjs','/docs/ako/KITCHEN-ART.json','/tests/xvisor/quality-preview.html','/docs/xvisor/RELEASE_1.1.md','/core7/tests/frontdoor-preview.mjs','/tests/teambook/compass-entry.e2e.mjs','/frontdoor/rewards.test.mjs','/assets/front-door/state.test.mjs','/tests/%66rontdoor/house.e2e.mjs']){
    let called=false;
    const response=await onRequest({request:new Request('https://teem.pages.dev'+path),next:()=>{called=true;return new Response('runtime');}});
    assert.equal(response.status,404,path);assert.equal(called,false,path);
  }
});

test('release boundary leaves real assets, existing rooms and private access gate intact',async()=>{
  for(const path of ['/frontdoor/','/home/','/frontdoor/rewards.js','/frontdoor/art/seed-red-body-mobile.webp','/assets/front-door/state.js','/classroom/dungeon/','/api/core7/analytics/frontdoor']){
    const response=await onRequest({request:new Request('https://teem.pages.dev'+path),next:()=>new Response('runtime')});
    assert.equal(await response.text(),'runtime',path);
  }
  let called=false;
  const gate=await onRequest({request:new Request('https://teem.pages.dev/command/'),next:()=>{called=true;return new Response('private');}});
  assert.equal(called,false);assert.match(await gate.text(),/PRIVATE BACKOFFICE/);
});

test('Vercel excludes the same new local-only artifacts without excluding runtime',async()=>{
  const rules=(await readFile(new URL('../../.vercelignore',import.meta.url),'utf8')).split('\n');
  assert.ok(rules.includes('tests/stat/'));
  for(const path of ['tests/frontdoor/','docs/frontdoor/','tests/ako/','docs/ako/','core7/tests/','frontdoor/*.test.mjs','assets/front-door/*.test.mjs'])assert.ok(rules.includes(path),path);
  for(const path of ['frontdoor/','assets/front-door/','home/'])assert.ok(!rules.includes(path),path);
});
