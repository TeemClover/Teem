/**
 * Render the public entrances from their source documents; never rewrite /home/.
 *   /          ← entry/home.html + entry/data.json + entry/media/  ("ปรุงเว็บใน 3 แตะ", BLUEPRINT v3.0 §4)
 *   /tour/     is its own page (บ้าน myClover 3D) with its own canonical; nothing is generated from it now
 *   /compass/  ← frontdoor/index.html (the Compass: an older homepage)
 * Media slots: drop a file into entry/media/ under the name in entry/MEDIA-BRIEFS.md and rerun
 * `npm run sync:frontdoor-root`; the page switches from its CSS placeholder to the file.
 */
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const SHARE=`<meta property="og:type" content="website">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="myClover">
<meta property="og:image" content="https://www.myclover.com/img/og-home-lucky-20260916-v2.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="myClover — หน้าเว็บที่ออกแบบมาเพื่อให้คุณโชคดี พร้อมโคลเวอร์แก้วสีเขียวทรงสี่แฉกบนพื้นสีครีม">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://www.myclover.com/img/og-home-lucky-20260916-v2.jpg">
<meta name="twitter:image:alt" content="myClover — หน้าเว็บที่ออกแบบมาเพื่อให้คุณโชคดี พร้อมโคลเวอร์แก้วสีเขียวทรงสี่แฉกบนพื้นสีครีม">`;

/** The Compass, published at /compass/. */
export function renderCompassPage(source){
  if(!source.includes('id="playfield"')||!source.includes('/frontdoor/app.js'))throw Error('Expected the current Compass document');
  const metadata=`<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.myclover.com/compass/">
${SHARE}
<meta property="og:title" content="เข็มทิศ myClover — ลองหยิบเข็มทิศดู">
<meta property="og:description" content="ค้นพบสิ่งที่ใช่ เรียนรู้สิ่งใหม่ และเริ่มต้นโอกาสดี ๆ ในแบบของคุณ">
<meta property="og:url" content="https://www.myclover.com/compass/">
<meta name="twitter:title" content="เข็มทิศ myClover — ลองหยิบเข็มทิศดู">
<meta name="twitter:description" content="ค้นพบสิ่งที่ใช่ เรียนรู้สิ่งใหม่ และเริ่มต้นโอกาสดี ๆ ในแบบของคุณ">`;
  const robots=/<meta name="robots"[^>]+>/;
  const withMetadata=robots.test(source) ? source.replace(robots,metadata) : source.replace(/(<meta name="theme-color"[^>]+>)/,`$1\n${metadata}`);
  return withMetadata
    .replace('<title>myClover — ลองหยิบเข็มทิศดู</title>','<title>เข็มทิศ myClover — โชคดีในแบบของคุณ</title>')
    .replace('content="บางอย่างในบ้านนี้ กำลังรอมือคุณ"','content="ลองหยิบเข็มทิศ สำรวจสิ่งที่ตรงกับคุณ ทั้ง AI ครัวเอโกะ กิจวัตร และโอกาสใหม่ แล้วเริ่มทำอะไรดี ๆ ไปด้วยกัน"');
}

/** The house tour, published at /. */
export function renderTourRoot(source){
  if(!source.includes('id="stage"')||!source.includes('/tour/tour.js'))throw Error('Expected the current house tour document');
  const tour=/<!-- Candidate homepage[^>]*-->\n(?:<meta name="robots"[^>]+>\n)?<link rel="canonical"[^>]+>/;
  if(!tour.test(source))throw Error('Expected the tour robots/canonical block');
  return source.replace(tour,`<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.myclover.com/">`)
    .replace(/<meta property="og:image" content="[^"]*">/,SHARE)
    .replace('<meta property="og:type" content="website">\n<meta property="og:locale" content="th_TH">\n<meta property="og:site_name" content="myClover">\n','')
    .replace('<meta property="og:title"','<meta property="og:url" content="https://www.myclover.com/">\n<meta property="og:title"');
}

const SITE='https://www.myclover.com';
const OLD_OG='/img/og-home-lucky-20260916-v2.jpg';
const attr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const text=s=>String(s).replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();

/** Every file under entry/media/, as paths relative to it ("door.webp", "v4/hero/cafe-warm.webp"). */
export async function entryMediaFiles(base=new URL('../',import.meta.url)){
  const root=new URL('entry/media/',base);
  const list=await readdir(root,{recursive:true,withFileTypes:true}).catch(()=>[]);
  return new Set(list.filter(f=>f.isFile()).map(f=>path.relative(fileURLToPath(root),path.join(f.parentPath??f.path,f.name)).split(path.sep).join('/')));
}

/** Which media exist. `files` = paths inside entry/media/ (see entryMediaFiles).
    v4 (homepage builder, generated with Higgsfield): a combination counts only when every size the page asks for is there.
    v5 (the luxury template): film = frames per business that exist in both sets (w = landscape, p = phone crop),
    counted from 001 without gaps; craft = the piece loops. */
export function entryMedia(data,files){
  const has=name=>files.has(name);
  const combos=data.industries.flatMap(i=>data.styles.map(s=>`${i.key}-${s.key}`));
  const v4={
    hero:combos.filter(c=>['','-1280','-640'].every(w=>has(`v4/hero/${c}${w}.webp`))),
    detail:combos.filter(c=>['','-540'].every(w=>has(`v4/detail/${c}${w}.webp`))),
    item:combos.flatMap(c=>[1,2,3].map(n=>`${c}-${n}`)).filter(c=>['','-360'].every(w=>has(`v4/item/${c}${w}.webp`))),
    loop:combos.filter(c=>has(`v4/loop/${c}.mp4`)),
  };
  const frame=(ind,set,n)=>`v5/film/${ind}/${set}/${String(n).padStart(3,'0')}.webp`;
  const film={};
  for(const i of data.industries){let n=0;while(has(frame(i.key,'w',n+1))&&has(frame(i.key,'p',n+1)))n++;if(n>1)film[i.key]=n;}
  const v5={film,craft:data.industries.flatMap(i=>[1,2,3].map(n=>`${i.key}-${n}`)).filter(c=>has(`v5/craft/${c}.mp4`))};
  return {v4,v5,door:has('door.webp')?'/entry/media/door.webp':null,og:has('og-home.jpg')?'/entry/media/og-home.jpg':null};
}

/** The studio's first backdrop is the page's largest image: in the HTML, preloaded, never waiting for the script. */
export const FIRST_LOOK='cafe-luxury';

/** JSON-LD that only states what the page shows: the FAQ is read from the visible <details>. */
export function entryJsonLd(source){
  const faq=[...source.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map(m=>({'@type':'Question',name:text(m[1]),acceptedAnswer:{'@type':'Answer',text:text(m[2])}}));
  const graph=[
    {'@type':'Organization','@id':`${SITE}/#org`,name:'myClover',url:`${SITE}/`,logo:`${SITE}/icons/icon-512.png`,founder:{'@id':`${SITE}/#teem`}},
    {'@type':'WebSite','@id':`${SITE}/#site`,name:'myClover',url:`${SITE}/`,inLanguage:'th',publisher:{'@id':`${SITE}/#org`}},
    {'@type':'Person','@id':`${SITE}/#teem`,name:'Teem Clover',alternateName:['นรินทร์ ลีลาภรณ์','Narin Leelaporn'],jobTitle:'นักพัฒนาระบบและผู้สอน AI',url:`${SITE}/resume/`,image:`${SITE}/entry/media/teem-portrait.webp`,sameAs:['https://fastwork.com/user/teem']},
  ];
  if(faq.length)graph.push({'@type':'FAQPage','@id':`${SITE}/#faq`,mainEntity:faq});
  return `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`;
}

/** The homepage, published at /. */
export function renderEntryRoot(source,data,files=new Set()){
  if(!source.includes('id="studio-bg"')||!source.includes('<!--entry:data-->'))throw Error('Expected entry/home.html');
  const media=entryMedia(data,files);
  const og=media.og||OLD_OG;
  const ogAlt=media.og?'Teem Clover สร้างเว็บ แอป เกม ด้วย AI · myClover':'myClover — โคลเวอร์แก้วสีเขียวทรงสี่แฉกบนพื้นสีครีม';
  const ogTags=`<meta property="og:image" content="${SITE}${og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(ogAlt)}">
<meta name="twitter:image" content="${SITE}${og}">`;
  const payload=JSON.stringify({...data,note:undefined,media}).replace(/</g,'\\u003c');
  let out=source
    .replace('<!--slot-meta:og-home-->',ogTags)
    .replace('<!--entry:jsonld-->',entryJsonLd(source))
    .replace('<!--entry:data-->',`<script type="application/json" id="entry-data">${payload}</script>`);
  const first=media.v4.hero.includes(FIRST_LOOK)?FIRST_LOOK:media.v4.hero[0];
  const v=`/entry/media/v4/hero/${first}`, set=`${v}-640.webp 640w, ${v}-1280.webp 1280w, ${v}.webp 1920w`;
  out=out.replace('<!--slot:lcp-preload-->',first?`<link rel="preload" as="image" href="${v}-1280.webp" imagesrcset="${set}" imagesizes="100vw" fetchpriority="high">`:'')
    .replace('<!--slot:studio-bg-->',first?`<img class="is-on" src="${v}-1280.webp" srcset="${set}" sizes="100vw" alt="" width="1920" height="1080" fetchpriority="high" decoding="async" data-combo="${first}">`:'');
  // the first question's choices are in the HTML, so nothing moves when the script takes over
  const chip=o=>`<button type="button" class="choice" data-key="${attr(o.key)}" aria-pressed="false"><svg><use href="#i-${attr(o.icon)}"/></svg><span>${attr(o.label)}</span></button>`;
  out=out.replace('<div class="choice-grid" id="choice-grid"></div>',`<div class="choice-grid" id="choice-grid">${data.industries.map(chip).join('')}</div>`);
  out=out.replace('<!-- Source of "/" (BLUEPRINT v3.0 §4). Published by tools/sync-frontdoor-root.mjs; never edit /index.html by hand. -->','<!-- Generated from entry/home.html by tools/sync-frontdoor-root.mjs. Do not edit this file; edit the source and run npm run sync:frontdoor-root. -->');
  if(/<!--(slot|entry|slot-meta):/.test(out))throw Error('Unfilled marker in entry/home.html');
  return out;
}

/** Kept for older callers: the Compass document as it is published (now at /compass/). */
export const renderFrontDoorRoot=renderCompassPage;

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const base=new URL('../',import.meta.url);
  const home=await readFile(new URL('home/index.html',base),'utf8');
  if(!home.includes('home-opening-full.mp4')||!home.includes('content="home-open"'))throw Error('Preserve the original /home/ before promotion');
  const [compass,entry,dataText]=await Promise.all(['frontdoor/index.html','entry/home.html','entry/data.json'].map(p=>readFile(new URL(p,base),'utf8')));
  const files=await entryMediaFiles(base);
  await mkdir(new URL('compass/',base),{recursive:true});
  await writeFile(new URL('compass/index.html',base),renderCompassPage(compass));
  await writeFile(new URL('index.html',base),renderEntryRoot(entry,JSON.parse(dataText),files));
  const media=entryMedia(JSON.parse(dataText),files);
  console.log(`/ uses entry/home.html (media v4: ${media.v4.hero.length} heroes, ${media.v4.detail.length} details, ${media.v4.item.length} items, ${media.v4.loop.length} loops; v5: ${Object.keys(media.v5.film).length} films, ${media.v5.craft.length} piece loops${media.door?', door':''}${media.og?', og-home':''}); /compass/ uses the Compass runtime. Original /home/ preserved.`);
}
