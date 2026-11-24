import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');

test('welcome page keeps company exploration separate from personal-service funnels',async()=>{
 const html=await read('index.html');
 assert.match(html,/data-xircle-landing="welcome"/);
 for(const id of ['overview','highlights','band','scale','app','tour','start','more','routine','video-dialog'])assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
 assert.doesNotMatch(html,/<(?:input|form)\b|นัดลอง|ทีมและเอโกะ|ทีม \+ เอโกะ|teambook\.me|\/meet\//);
 assert.doesNotMatch(html,/ห้องความรู้แมวขาว|ห้องแมวขาว/);
 assert.doesNotMatch(html,/รักษาโรค|หายขาด|รับประกันผล|ดีท็อกซ์|ลด\s*\d+\s*กิโล/,'device copy stays inside the communication boundary');
 assert.match(html,/ไม่ใช่เครื่องมือแพทย์/);
 const runtime=await read('welcome.js');
 assert.doesNotMatch(runtime,/localStorage|sessionStorage|setItem\(|XMLHttpRequest|\bfetch\(|sendBeacon|teambook\.me|\/meet\//);
});

test('motion is optional and video players load only after a visitor presses Play',async()=>{
 const html=await read('index.html'),js=await read('welcome.js'),css=await read('welcome.css');
 assert.match(js,/prefers-reduced-motion/);assert.match(css,/prefers-reduced-motion/);
 assert.match(html,/<dialog[^>]+id="video-dialog"/);
 assert.doesNotMatch(html,/<iframe\b/,'video connections require an explicit user action');
 assert.doesNotMatch(html,/<video\b[^>]*\bautoplay\b/,'previews start from the runtime, never before motion preferences are known');
 for(const video of html.matchAll(/<video\b[^>]*>/g)){assert.match(video[0],/\bmuted\b/);assert.match(video[0],/preload="none"/);}
 assert.match(js,/youtube-nocookie\.com\/embed\//);
 for(const id of ['weigh-btn','weigh-status'])assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
 assert.match(html,/id="weigh-status"[^>]*>[^<]*ตัวเลขตัวอย่าง/,'the scale demo is labelled as sample numbers');
});

test('opening film and nine episodes ship in both orientations with local covers and previews',async()=>{
 const html=await read('index.html');
 assert.ok(html.includes('data-play="MU9jlnp__pg"'),'opening film');
 for(const list of ['PLLpWLuBth_ZU','PLbi96bODWmCo'])assert.ok(html.includes(`https://www.youtube.com/playlist?list=${list}`),`playlist ${list}`);
 const episodes=[...html.matchAll(/<a class="ep"[^>]*href="https:\/\/youtu\.be\/([\w-]{11})"[^>]*data-ep="(\d)"[^>]*data-h="([\w-]{11})"[^>]*data-v="([\w-]{11})"/g)];
 assert.equal(episodes.length,9);
 const ids=new Set();
 episodes.forEach(([,href,n,wide,tall],index)=>{assert.equal(Number(n),index+1);assert.equal(href,wide,'the no-script link is the 16:9 upload');assert.notEqual(wide,tall);ids.add(wide).add(tall);});
 assert.equal(ids.size,18,'every upload is listed once');
 for(const chip of html.matchAll(/class="ep-chip"[^>]*href="https:\/\/youtu\.be\/([\w-]{11})"[^>]*data-ep="(\d)"/g))assert.equal(chip[1],episodes[Number(chip[2])-1][3],`story link for EP.${chip[2]} matches the tour`);
 for(let n=1;n<=9;n++)for(const kind of ['h','v'])for(const type of ['mp4','webp'])await access(new URL(`assets/welcome/tour/ep0${n}-${kind}.${type}`,import.meta.url));
 const local=[...html.matchAll(/(?:src|poster|data-src)="(\/xircle\/[^"?#]+)/g)].map(match=>match[1]);
 assert.ok(new Set(local).size>=25,'covers, previews and product images are self-hosted');
 for(const path of new Set(local))await access(new URL(path.replace('/xircle/',''),import.meta.url));
});

test('Band scroll sequence ships every frame the runtime asks for and generated scenes are labelled',async()=>{
 const html=await read('index.html'),js=await read('welcome.js');
 const count=Number(js.match(/SEQ_FRAMES\s*=\s*(\d+)/)?.[1]);
 assert.ok(count>=24,'the runtime declares how many frames it draws');
 for(let i=0;i<count;i++)await access(new URL(`assets/welcome/band-seq/f${String(i).padStart(3,'0')}.webp`,import.meta.url));
 await assert.rejects(access(new URL(`assets/welcome/band-seq/f${String(count).padStart(3,'0')}.webp`,import.meta.url)),'no stray frames');
 assert.match(html,/<canvas[^>]+id="band-seq"[^>]+aria-hidden="true"/);
 assert.match(js,/saveData/,'the sequence is skipped for data saver');
 assert.match(html,/class="scene-note"[^>]*>[^<]*ภาพจำลอง/,'the Band sequence is labelled as a presentation scene');
 assert.equal([...html.matchAll(/class="hud-note"[^>]*>[^<]*ภาพจำลอง/g)].length,5,'all five highlight cards use generated scenes and each is labelled');
 for(const clip of ['band-montage.mp4','sleep-night.mp4','scale-ripple.mp4','food-scan.mp4','habit-week.mp4'])assert.ok(html.includes(`data-src="/xircle/assets/welcome/${clip}"`),`highlight clip ${clip}`);
 const sleep=html.match(/<article class="hl-card hl-sleep"[\s\S]*?<\/article>/)?.[0]||'';
 assert.match(sleep,/<video[^>]+data-once[^>]+data-cues="[\d.,]+"/,'the sleep film plays once and names where each stage starts');
 assert.equal(sleep.match(/data-cues="([^"]+)"/)[1].split(',').length,[...sleep.matchAll(/<li class="s-/g)].length,'one cue per sleep stage label');
 for(const stage of ['หลับตื้น','หลับลึก','REM','ตื่น'])assert.ok(sleep.includes(stage),`sleep card names ${stage}`);
 assert.match(sleep,/เวลาเป็นตัวอย่าง/,'sleep stage times are labelled as examples');
 for(const macro of ['โปรตีน','คาร์บ','ไขมัน','พลังงาน'])assert.match(html,new RegExp(`<dt>${macro}</dt>`),`food card shows ${macro}`);
 assert.match(html,/class="macro"[^>]*aria-label="[^"]*ตัวเลขตัวอย่าง/,'food numbers are labelled as examples');
 assert.equal([...html.matchAll(/<ul class="week"[^>]*>(.*?)<\/ul>/gs)][0][1].split('<li').length-1,7,'the Habit Score card shows seven days');
 assert.match(html,/class="hl-score"[^>]*>.*?ตัวอย่าง/s,'the Habit Score number is labelled as an example');
 const hud=[...html.matchAll(/<li class="hud-[lr]"[^>]*><b>([^<]+)<\/b>/g)].map(match=>match[1]);
 for(const value of ['น้ำหนัก','ไขมันในร่างกาย','มวลกล้ามเนื้อ','มวลกระดูก','ปริมาณน้ำในร่างกาย'])assert.ok(hud.includes(value),`HUD names ${value}`);
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
