// Build the exact-sized share cards from generated art and local Thai typography.
import {mkdir} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createPreviewServer} from './preview.mjs';
import {stories} from './catalog.js';

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
.shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#111113 0%,#111113f5 30%,#111113bc 43%,#11111320 64%,transparent 100%),linear-gradient(0deg,#111113ee,transparent 24%)}
.brand{position:absolute;left:61px;top:44px;display:flex;gap:13px;align-items:center;font-size:42px;font-weight:700;letter-spacing:-1.4px}.brand img{width:39px;height:45px}.brand i{color:#ff654f;font-style:normal}
.eyebrow{position:absolute;left:64px;top:153px;font-size:14px;letter-spacing:2.5px;color:#cea99b}
h1{position:absolute;left:60px;top:191px;margin:0;font-size:67px;line-height:1.28;font-weight:700;letter-spacing:-2px;max-width:675px;text-shadow:0 2px 25px #0007}h1 em{font-style:normal;color:#ff826f}
.genres{position:absolute;left:64px;top:400px;font-size:22px;color:#c4baba;max-width:620px}
.footer{position:absolute;left:64px;bottom:49px;right:53px;display:flex;justify-content:space-between;align-items:center;font-size:17px;color:#bcafb3}.footer span:first-child{letter-spacing:1px;font-size:14px}.footer strong{font-weight:400;color:#e2c098}
.story .background{left:44%;width:56%;object-fit:cover}.story .shade{background:linear-gradient(90deg,#111113 0%,#111113 32%,#111113d9 44%,transparent 68%),linear-gradient(0deg,#111113cf,transparent 30%)}
.story h1{max-width:625px;font-size:66px}.story .genres{font-size:21px;top:411px}.story .footer{font-size:16px}.stamp{position:absolute;right:48px;top:49px;font-size:12px;letter-spacing:1px;background:#111b;padding:7px 12px;border:1px solid #ffffff29;border-radius:4px;color:#d8d1cc}
`;
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  for(const story of [null,...stories]){
    const name=story?.id||'tontor';
    const title=story?escape(story.posterTitle).replace('\n','<br>'):'เรื่องสั้น<br><em>ความรู้สึกยาว</em>';
    const src=story?`${base}/short/assets/${story.id}.webp`:`${base}/short/assets/og-background-v1.webp`;
    const position=story?(['hr','rain'].includes(story.id)?story.position:'center 18%'):'center';
    const html=`<!doctype html><html lang="th"><head><meta charset="utf-8"><style>${css}</style></head><body><main class="cover ${story?'story':''}"><img class="background" src="${src}" style="object-position:${escape(position)}"><div class="shade"></div><div class="brand"><img src="${base}/short/assets/mark.svg"><span>ตอนต่อ<i>.</i></span></div><div class="eyebrow">${story?escape(story.formatLabel)+' / THAI AI STORY':'THAI STORIES. ONE MORE EPISODE.'}</div><h1>${title}</h1><div class="genres">${story?escape(story.genres.slice(0,3).join(' · ')):'ละครสั้น · แอนิเมชัน · การ์ตูน'}</div>${story?'<span class="stamp">เรื่องตัวอย่าง</span>':''}<div class="footer"><span>${story?'ตอนต่อ — เรื่องสั้น ความรู้สึกยาว':'MYCLOVER.COM/SHORT'}</span><strong>ดูและอ่านตัวอย่างฟรี ↗</strong></div></main></body></html>`;
    await page.setContent(html,{waitUntil:'networkidle'});
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
    await page.screenshot({path:fileURLToPath(new URL(`${name}-v1.jpg`,output)),type:'jpeg',quality:90});
    console.log(`${name}: 1200 × 630 JPEG share card`);
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
