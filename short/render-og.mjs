// Build the exact-sized share cards from generated art and local Thai typography.
import {mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createPreviewServer} from './preview.mjs';
import {stories} from './library.js';

const runtime=process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(runtime).href);
const server=createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const output=new URL('./assets/og/',import.meta.url);await mkdir(output,{recursive:true});
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const css=`
@font-face{font-family:Plex;src:url('${base}/routinex/build/fonts/ibm-plex-sans-thai-thai-700.woff2');font-weight:700;unicode-range:U+0E00-0E7F}
@font-face{font-family:Plex;src:url('${base}/routinex/build/fonts/ibm-plex-sans-thai-latin-700.woff2');font-weight:700}
@font-face{font-family:Plex;src:url('${base}/routinex/build/fonts/ibm-plex-sans-thai-thai-400.woff2');font-weight:400;unicode-range:U+0E00-0E7F}
@font-face{font-family:Plex;src:url('${base}/routinex/build/fonts/ibm-plex-sans-thai-latin-400.woff2');font-weight:400}
*{box-sizing:border-box}body{margin:0;font-family:Plex,sans-serif;color:#f4f2ed;background:#111113}
.cover{width:1200px;height:630px;overflow:hidden;position:relative;background:#111113;isolation:isolate;border-top:5px solid #ff654f}
.background{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-3}
.shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#111113 0%,#111113 36%,#111113f5 43%,#111113a8 53%,#11111316 72%,transparent 100%),linear-gradient(0deg,#111113ee,transparent 24%)}
.brand{position:absolute;left:60px;top:64px;display:flex;gap:23px;align-items:center;font-size:104px;font-weight:700;letter-spacing:-3px;line-height:1.3}.brand img{width:80px;height:90px;flex:none}.brand i{color:#ff654f;font-style:normal}
.eyebrow{position:absolute;left:64px;top:184px;font-size:22px;color:#ffac9e}
h1{position:absolute;left:60px;top:219px;margin:0;font-size:44px;line-height:1.4;font-weight:700;letter-spacing:-1px;max-width:675px;text-shadow:0 2px 25px #0007}
.genres{position:absolute;left:64px;top:309px;font-size:31px;line-height:1.6;color:#f4f2ed;max-width:620px}.genres strong{color:#ff957f;font-weight:700}
.cta{position:absolute;left:64px;bottom:115px;padding:10px 19px;border:1px solid #ff654f77;border-radius:9px;background:#ff654f18;color:#ffb8a9;font-size:22px;font-weight:700}
.footer{position:absolute;left:64px;bottom:49px;right:53px;display:flex;justify-content:space-between;align-items:center;font-size:16px;color:#d2c8c5}.footer span:first-child{letter-spacing:.7px;font-size:17px}
.story .background{left:44%;width:56%;object-fit:cover}.story .shade{background:linear-gradient(90deg,#111113 0%,#111113 32%,#111113d9 44%,transparent 68%),linear-gradient(0deg,#111113cf,transparent 30%)}
.story.share-wide .background{left:0;width:100%}.story.share-wide .stamp{top:auto;right:auto;left:64px;bottom:103px;border-color:#ff654f66;background:#ff654f18;color:#ffb8a9}.story .brand{top:36px;font-size:64px;gap:17px;letter-spacing:-2px}.story .brand img{width:54px;height:61px}.slogan{position:absolute;left:64px;top:124px;font-size:24px;color:#f4f2ed}
.story h1{top:235px;max-width:625px;font-size:62px;line-height:1.3}.story .genres{font-size:23px;top:426px;color:#ded4d0}.story .footer{font-size:16px}.stamp{position:absolute;right:48px;top:49px;font-size:15px;background:#111d;padding:8px 12px;border:1px solid #ffffff38;border-radius:5px;color:#eee5df}
.series-wordmark{width:460px;height:auto;display:block}
`;
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const only=process.argv.slice(2);
  for(const story of [null,...stories].filter(s=>!only.length||only.includes(s?.id||'tontor'))){
    const name=story?.id||'tontor';
    const title=story?.seriesLogo?`<img class="series-wordmark" src="${base}/short/${story.seriesLogo.replace(/^\.\//,'').replace('logo-420','logo-1200')}" alt="${escape(story.title)}">`:story?escape(story.posterTitle).replace('\n','<br>'):'เรื่องสั้น ความรู้สึกยาว';
    const src=story?`${base}/short/${(story.shareImage||story.poster||'assets/'+story.id+'.webp').replace(/^\.\//,'')}`:`${base}/short/assets/og-background-v1.webp`;
    const position=story?.sharePosition || (story?(['hr','rain'].includes(story.id)?story.position:'center 18%'):'center');
    const html=`<!doctype html><html lang="th"><head><meta charset="utf-8"><style>${css}</style></head><body><main class="cover ${story?'story':''} ${story?.shareLayout==='wide'?'share-wide':''}"><img class="background" src="${src}" style="object-position:${escape(position)}"><div class="shade"></div><div class="brand"><img src="${base}/short/assets/mark.svg"><span>ตอนต่อ<i>.</i></span></div>${story?`<div class="slogan">เรื่องสั้น ความรู้สึกยาว</div><div class="eyebrow">${escape(story.formatLabel)} AI ภาษาไทย</div>`:''}<h1>${title}</h1><div class="genres">${story?escape(story.genres.slice(0,3).join(' · ')):'ละครสั้น การ์ตูน และนิยาย<br>จากครีเอเตอร์ไทย <strong>สร้างด้วย AI</strong>'}</div>${story?`<span class="stamp">${escape(story.shareBadge || 'เรื่องตัวอย่าง')}</span>`:'<div class="cta">ดูและอ่านตัวอย่างฟรี ↗</div>'}<div class="footer"><span>MYCLOVER.COM/SHORT</span><span>${story?'ดูและอ่านตัวอย่างฟรี ↗':'เวอร์ชันทดลอง'}</span></div></main></body></html>`;
    await page.setContent(html,{waitUntil:'networkidle'});
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
    await page.screenshot({path:fileURLToPath(new URL(`${name}-${name==='tontor'?'v3':story.shareVersion || 'v2'}.jpg`,output)),type:'jpeg',quality:90});
    console.log(`${name}: 1200 × 630 JPEG share card`);
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
