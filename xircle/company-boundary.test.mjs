import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');

test('real app landing keeps company exploration separate from personal-service funnels',async()=>{
 const html=await read('index.html');
 assert.match(html,/data-xircle-landing="real-app"/);
 for(const id of ['eat','sleep','move','food-demo','video-dialog','official-media','download'])assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
 assert.doesNotMatch(html,/<(?:input|form)\b[^>]*(?:type="(?:email|tel)"|action="\/api\/)|นัดลอง|ทีมและเอโกะ|ทีม \+ เอโกะ|teambook\.me|\/meet\//);
 assert.doesNotMatch(html,/ห้องความรู้แมวขาว|ห้องแมวขาว/);
 const runtime=await read('landing.js');
 assert.doesNotMatch(runtime,/localStorage|sessionStorage|setItem\(|XMLHttpRequest|teambook\.me|\/meet\//);
});

test('scan and video enhancements preserve motion preferences and click-to-load media',async()=>{
 const html=await read('index.html'),js=await read('landing.js');
 assert.match(js,/prefers-reduced-motion/);
 for(const id of ['scan-play','scan-status','portion'])assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
 assert.match(html,/<dialog[^>]+id="video-dialog"/);
 assert.doesNotMatch(html,/<iframe\b/,'video connections require an explicit user action');
});

test('video demos have local posters and Routine X has four coming-soon episodes',async()=>{
 const html=await read('index.html');
 const posters=[...html.matchAll(/data-poster="(\/xircle\/[^"?#]+)"/g)].map(match=>match[1]);
 assert.ok(posters.length>=2,'both real scan demos need explicit local posters');
 for(const poster of posters)await access(new URL(poster.replace('/xircle/',''),import.meta.url));
 const episodes=[...html.matchAll(/<article\b[^>]*class="[^"]*\broutine-episode\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g)];
 assert.equal(episodes.length,4);
 for(const [,episode] of episodes){assert.match(episode,/COMING SOON/);assert.doesNotMatch(episode,/<button\b|data-video=/);}
});

test('company download destinations are the verified official store applications',async()=>{
 const {APP_LINKS}=await import('./brand-catalog.js');
 const html=await read('index.html');
 assert.equal(APP_LINKS.download,'https://www.xircle.health/download');
 assert.equal(APP_LINKS.ios,'https://apps.apple.com/th/app/id6785562482');
 assert.equal(APP_LINKS.android,'https://play.google.com/store/apps/details?id=health.xircle.app');
 for(const url of Object.values(APP_LINKS))assert.equal(new URL(url).protocol,'https:');
 for(const key of ['download','ios','android'])assert.ok(html.includes(`href="${APP_LINKS[key]}"`),`missing official app link ${APP_LINKS[key]}`);
});

test('Habix catalogue distinguishes real products from the FIVES selection framework',async()=>{
 const {HABIX_PRODUCTS,ROUTINE_STAGES}=await import('./brand-catalog.js');
 assert.equal(HABIX_PRODUCTS.length,5);
 assert.deepEqual(new Set(HABIX_PRODUCTS.map(p=>p.id)),new Set(['gus','protein-hmb','astamega','vita-matrix','flavor']));
 assert.equal(ROUTINE_STAGES.length,4);
 const control=ROUTINE_STAGES.find(p=>p.letter==='C');assert.ok(control);
 assert.ok(!control.products?.length,'Control describes behavior rather than an invented purchasable product');
 for(const product of HABIX_PRODUCTS){
  assert.ok(product.name&&product.summary&&product.href&&product.source);
  assert.match(product.href,/^\/xircle\/doc\/habix\//);
  assert.doesNotMatch(product.summary,/รักษาโรค|รับประกัน|หายขาด/);
 }
});

test('URL choices are bounded, legacy context is safe, and product paths round-trip without personal invitations',async()=>{
 const {readBrandState,brandURL,visitStation,adjacentStation,PATHS,STATIONS}=await import('./brand-state.js');
 for(const value of ['constructor','__proto__','toString','unknown','sleep&focus=move']){
  const state=readBrandState('https://www.myclover.com/xircle/?entry=compass&focus='+value);
  assert.ok(Object.hasOwn(PATHS,state.focus),`unsafe focus ${value}`);
  assert.doesNotThrow(()=>adjacentStation(state));
 }
 const bounded=readBrandState('/xircle/?path=eat&path=move&moment=bad&device=bad&loop=Z&product=bad&sample=eat,eat,private&trail=signal,private#visit-private');
 assert.equal(bounded.focus,'sleep');assert.equal(bounded.moment,'night');assert.equal(bounded.device,'app');assert.equal(bounded.loop,'A');assert.equal(bounded.product,'gus');assert.deepEqual(bounded.sample,['eat']);assert.deepEqual(bounded.seen,['hello','signal']);assert.equal(bounded.station,'hello');
 assert.equal(readBrandState('/xircle/?entry=compass&focus=food').focus,'eat');
 for(const anchor of ['official-media','download']){const state=visitStation(readBrandState('/xircle/?path=eat&sample=eat,move'),'finish');const url=new URL(brandURL(state,'https://www.myclover.com/xircle/'),'https://www.myclover.com');url.hash=anchor;assert.deepEqual(readBrandState(url.href),state,'non-station anchors/reload retain the active branded room');}
 assert.equal(readBrandState('/xircle/?at=constructor#official-media').station,'hello');assert.equal(readBrandState('/xircle/?at=finish&at=signal#download').station,'hello');
 const clean=new URL(brandURL(readBrandState('/xircle/'),'/xircle/?email=private&health=private&url=https://elsewhere.invalid&return=private&ref=private&category=app&watch=Eypp369NiH4'),'https://www.myclover.com');
 for(const key of ['email','health','url','return','ref'])assert.equal(clean.searchParams.has(key),false);
 assert.equal(clean.searchParams.get('category'),'app');assert.equal(clean.searchParams.get('watch'),'Eypp369NiH4');
 for(const query of ['?category=app&category=band&watch=Eypp369NiH4&watch=Ya94RJWqp1c','?category=private&watch=<script>']){const url=new URL(brandURL(readBrandState('/xircle/'),'/xircle/'+query),'https://www.myclover.com');assert.equal(url.searchParams.has('category'),false);assert.equal(url.searchParams.has('watch'),false);}
 for(const [hash,station] of [['sleep','signal'],['eat','signal'],['move','signal'],['devices','connect'],['routine','routine'],['start','finish']])assert.equal(readBrandState('/xircle/#'+hash).station,station);
 for(const focus of Object.keys(PATHS)){
  let state=readBrandState('/xircle/?path='+focus);for(const station of PATHS[focus])state=visitStation(state,station);
  assert.equal(new Set(state.seen).size,STATIONS.length);assert.equal(adjacentStation(state),'finish');
  const href=brandURL(state,'https://www.myclover.com/xircle/?watch=Eypp369NiH4&category=app&invite=123&notebook=create&mode=join&c=42');
  const url=new URL(href,'https://www.myclover.com');assert.equal(url.searchParams.get('watch'),'Eypp369NiH4');assert.equal(url.searchParams.get('category'),'app');
  for(const key of ['invite','notebook','mode','c'])assert.equal(url.searchParams.has(key),false);
  assert.deepEqual(readBrandState(href),state);
 }
});
