/**
 * Render the public entrances from their source documents; never rewrite /home/.
 *   /          ← tour/index.html      (บ้าน myClover 3D: the homepage)
 *   /compass/  ← frontdoor/index.html (the Compass: the previous homepage)
 * /tour/ and /frontdoor/ stay as noindex review aliases of the same documents.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
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
  return source.replace(/<meta name="robots"[^>]+>/,metadata)
    .replace('<title>myClover — ลองหยิบเข็มทิศดู</title>','<title>เข็มทิศ myClover — โชคดีในแบบของคุณ</title>')
    .replace('content="บางอย่างในบ้านนี้ กำลังรอมือคุณ"','content="ลองหยิบเข็มทิศ สำรวจสิ่งที่ตรงกับคุณ ทั้ง AI ครัวเอโกะ กิจวัตร และโอกาสใหม่ แล้วเริ่มทำอะไรดี ๆ ไปด้วยกัน"');
}

/** The house tour, published at /. */
export function renderTourRoot(source){
  if(!source.includes('id="stage"')||!source.includes('/tour/tour.js'))throw Error('Expected the current house tour document');
  const tour=/<!-- Candidate homepage[^>]*-->\n<meta name="robots"[^>]+>\n<link rel="canonical"[^>]+>/;
  if(!tour.test(source))throw Error('Expected the tour robots/canonical block');
  return source.replace(tour,`<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.myclover.com/">`)
    .replace(/<meta property="og:image" content="[^"]*">/,SHARE)
    .replace('<meta property="og:type" content="website">\n<meta property="og:locale" content="th_TH">\n<meta property="og:site_name" content="myClover">\n','')
    .replace('<meta property="og:title"','<meta property="og:url" content="https://www.myclover.com/">\n<meta property="og:title"');
}

/** Kept for older callers: the Compass document as it is published (now at /compass/). */
export const renderFrontDoorRoot=renderCompassPage;

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const base=new URL('../',import.meta.url);
  const home=await readFile(new URL('home/index.html',base),'utf8');
  if(!home.includes('home-opening-full.mp4')||!home.includes('content="home-open"'))throw Error('Preserve the original /home/ before promotion');
  const [compass,tour]=await Promise.all(['frontdoor/index.html','tour/index.html'].map(p=>readFile(new URL(p,base),'utf8')));
  await mkdir(new URL('compass/',base),{recursive:true});
  await writeFile(new URL('compass/index.html',base),renderCompassPage(compass));
  await writeFile(new URL('index.html',base),renderTourRoot(tour));
  console.log('/ uses the house tour; /compass/ uses the Compass runtime. Original /home/ preserved.');
}
