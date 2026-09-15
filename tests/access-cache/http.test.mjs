import test from 'node:test';
import assert from 'node:assert/strict';
import { startSitePreview } from './site-preview.mjs';

test('real HTTP: published images and aliases deliver bytes/MIME, cache and revalidate without any account lookup',async t=>{
  const h=await startSitePreview();t.after(()=>h.server.close());
  for(const file of ['/classroom/awaken/notebook/img/nb-01.jpg','/classroom/img/hero-classroom.webp','/classroom/sauce-cup/header-prologue.jpeg','/learn/classroom/awaken/notebook/img/nb-01.jpg','/course/thedent912/opening/slide-01.jpg','/course/thedent/followup-qr.svg','/xircle/assets/v5/xircle-learn-hero.webp','/core7/assets/card-back.webp','/xty/assets/avatars/clover.webp']){
    const first=await fetch(h.base+file,{redirect:'manual'});assert.equal(first.status,200,file);assert.match(first.headers.get('content-type'),/^image\//,file);assert.match(first.headers.get('cache-control'),/public.*max-age=300.*must-revalidate/);assert.equal(first.headers.get('set-cookie'),null);assert.equal(first.headers.get('location'),null);assert.ok((await first.arrayBuffer()).byteLength>0);
    const repeat=await fetch(h.base+file,{headers:{'If-None-Match':first.headers.get('etag')},redirect:'manual'});assert.equal(repeat.status,304,file);assert.equal((await repeat.arrayBuffer()).byteLength,0);
  }
  assert.deepEqual(h.fixture.queries,[],'public images never invoke session/database queries');
});

test('real HTTP: logged-out direct pages/private APIs never return protected content or public-cache policy',async t=>{
  const h=await startSitePreview();t.after(()=>h.server.close());
  for(const file of ['/classroom/awaken/notebook/?from=dungeon','/classroom/lv5/vault-data.js','/course/thedent912/','/course/thedent912/course-content.js','/shelf/source/private.jpg','/api/learn-foundation?file=awaken/notebook/img/nb-01.jpg','/api/course-content?file=followup-qr.svg']){
    const response=await fetch(h.base+file,{redirect:'manual'});assert.ok([303,307,401,403].includes(response.status),`${file}: ${response.status}`);assert.match(response.headers.get('cache-control'),/private.*no-store/);assert.doesNotMatch(await response.text(),/RESTORE|PRIVATE COURSE FIXTURE/);
    if(file.includes('?from=dungeon'))assert.equal(new URL(response.headers.get('location'),h.base).searchParams.get('return'),file);
  }
});

test('real HTTP: public pages outside notebook remain available',async t=>{
  const h=await startSitePreview();t.after(()=>h.server.close());
  for(const file of ['/','/ako/','/xircle/','/course/','/learn/']){const r=await fetch(h.base+file,{redirect:'manual'});assert.equal(r.status,200,file);assert.match(r.headers.get('content-type'),/text\/html/);await r.arrayBuffer();}
});
