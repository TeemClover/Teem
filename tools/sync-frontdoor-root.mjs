/** Render the public entrance from the same Compass document; never rewrite /home/. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function renderFrontDoorRoot(source){
  if(!source.includes('id="playfield"')||!source.includes('/frontdoor/app.js'))throw Error('Expected the current Compass document');
  const metadata=`<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.myclover.com/">
<meta property="og:type" content="website">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="myClover">
<meta property="og:title" content="myClover — โชคดีในแบบของคุณ">
<meta property="og:description" content="ลองหยิบเข็มทิศ สำรวจสิ่งที่ตรงกับคุณ แล้วเริ่มทำอะไรดี ๆ ไปด้วยกัน">
<meta property="og:url" content="https://www.myclover.com/">
<meta property="og:image" content="https://www.myclover.com/img/og-home.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="myClover — โชคดีในแบบของคุณ">
<meta name="twitter:description" content="ลองหยิบเข็มทิศ สำรวจสิ่งที่ตรงกับคุณ แล้วเริ่มทำอะไรดี ๆ ไปด้วยกัน">
<meta name="twitter:image" content="https://www.myclover.com/img/og-home.jpg">`;
  return source.replace(/<meta name="robots"[^>]+>/,metadata)
    .replace('<title>myClover — ลองหยิบเข็มทิศดู</title>','<title>myClover — โชคดีในแบบของคุณ</title>')
    .replace('content="บางอย่างในบ้านนี้ กำลังรอมือคุณ"','content="ลองหยิบเข็มทิศ สำรวจสิ่งที่ตรงกับคุณ ทั้ง AI ครัวเอโกะ กิจวัตร และโอกาสใหม่ แล้วเริ่มทำอะไรดี ๆ ไปด้วยกัน"');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const base=new URL('../',import.meta.url);
  const home=await readFile(new URL('home/index.html',base),'utf8');
  if(!home.includes('home-opening-full.mp4')||!home.includes('content="home-open"'))throw Error('Preserve the original /home/ before promotion');
  const source=await readFile(new URL('frontdoor/index.html',base),'utf8');
  await writeFile(new URL('index.html',base),renderFrontDoorRoot(source));
  console.log('Root uses the current Compass runtime. Original /home/ preserved.');
}
