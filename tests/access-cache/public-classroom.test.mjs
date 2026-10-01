import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startSitePreview} from './site-preview.mjs';
import {INDEXED_CLASSROOM_FILES,classroomURL} from '../../routing/public-classroom.js';

test('every published free lesson is readable and indexable without cookies or JavaScript',async t=>{
 const h=await startSitePreview();t.after(()=>h.server.close());
 const sitemap=await readFile(new URL('../../sitemap.xml',import.meta.url),'utf8');
 for(const file of INDEXED_CLASSROOM_FILES){
  const route=classroomURL(file),canonical='https://www.myclover.com'+route;
  for(const method of ['GET','HEAD']){
   const response=await fetch(h.base+route,{method,redirect:'manual'});
   assert.equal(response.status,200,route);assert.equal(response.headers.get('location'),null);
   assert.match(response.headers.get('content-type'),/text\/html/);
   assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('vary'),null);
   assert.equal(response.headers.get('x-robots-tag'),'index, follow');
   assert.match(response.headers.get('cache-control'),/^public,/);
   if(method==='HEAD'){assert.equal(await response.text(),'');continue;}
   const html=await response.text(),head=html.slice(0,html.indexOf('</head>'));
   assert.ok(head.includes(`<link rel="canonical" href="${canonical}">`),route);
   assert.doesNotMatch(head,/noindex|nofollow/i);assert.match(head,/<meta name="description" content="[^"]+"/);
   assert.match(html,/<(?:main|article|section|h1)[ >]/i);
   assert.doesNotMatch(html,/private-page-lifecycle\.js/);
  }
  assert.equal(sitemap.split(`<loc>${canonical}</loc>`).length-1,1,canonical);
 }
 assert.deepEqual(h.fixture.queries,[],'reading free lessons must never query accounts');
});

test('public course downloads and videos work without accounts, including seeking',async t=>{
 const h=await startSitePreview();t.after(()=>h.server.close());
 for(const file of ['AI-SAUCE-COURSE-MASTER.md','lv5/vault-data.js','lv4/myclover-growth-blueprint.pdf','lv4/myclover_GLHF_7C_GrowthOS_Source.md','examples/main-source-example.md','examples/lesson6-smart-resume.html']){
  const response=await fetch(h.base+'/classroom/'+file,{redirect:'manual'});
  assert.equal(response.status,200,file);assert.ok((await response.arrayBuffer()).byteLength>0,file);
 }
 const video=await fetch(h.base+'/classroom/media/lesson3-source-example.mp4',{headers:{Range:'bytes=0-31'},redirect:'manual'});
 assert.equal(video.status,206);assert.match(video.headers.get('content-range'),/^bytes 0-31\//);
 assert.equal((await video.arrayBuffer()).byteLength,32);
 assert.deepEqual(h.fixture.queries,[]);
});

test('Dungeon aliases and old course links preserve intent and finish on public content',async t=>{
 const h=await startSitePreview();t.after(()=>h.server.close());
 for(const alias of ['/dungeon','/dungeon/','/dungeon/index.html','/learn/classroom/dungeon/']){
  const first=await fetch(h.base+alias+'?from=home',{redirect:'manual'});
  assert.ok([307,308].includes(first.status));
  assert.equal(new URL(first.headers.get('location')).pathname,'/classroom/dungeon/');
  assert.equal(new URL(first.headers.get('location')).search,'?from=home');
  const final=await fetch(h.base+alias+'?from=home');assert.equal(final.status,200);
  assert.equal(new URL(final.url).pathname,'/classroom/dungeon/');await final.arrayBuffer();
 }
 for(const cookie of ['', 'mc_session=%ZZ', 'mc_session=expired']){
  const r=await fetch(h.base+'/api/learn-foundation?file=dungeon/index.html',{headers:{Cookie:cookie},redirect:'manual'});
  assert.equal(r.status,200);assert.equal(r.headers.get('x-robots-tag'),'index, follow');await r.arrayBuffer();
 }
 assert.deepEqual(h.fixture.queries,[]);
});
