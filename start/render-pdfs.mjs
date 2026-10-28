// Render authored print documents, with selectable Thai text and embedded Kanit.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const {chromium}=await import(process.env.MYCLOVER_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--allow-file-access-from-files']});
try {
  const page=await browser.newPage();
  const catalog=JSON.parse(fs.readFileSync(path.join(here,'catalog.json'),'utf8'));
  for(const ep of catalog.episodes){
    await page.goto('file://'+path.join(here,'print',ep.id+'.html'));
    await page.evaluate(()=>document.fonts.ready);
    const checked=await page.evaluate(()=>({font:document.fonts.check('400 12pt Kanit','เริ่มธุรกิจ'),
      overflow:[...document.querySelectorAll('.page')].map((p,i)=>({page:i+1,overflow:p.scrollHeight-p.clientHeight})).filter(x=>x.overflow>2),
      footers:[...document.querySelectorAll('.page')].map((p,i)=>({page:i+1,contentBottom:p.querySelector('.footer').previousElementSibling.getBoundingClientRect().bottom,footerTop:p.querySelector('.footer').getBoundingClientRect().top})).filter(x=>x.contentBottom>x.footerTop-8)}));
    if(!checked.font||checked.overflow.length||checked.footers.length)throw Error(ep.id+' print layout: '+JSON.stringify(checked));
    await page.pdf({path:path.join(here,'files',ep.slug,ep.id+'-ai-starter.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true,margin:{top:0,right:0,bottom:0,left:0}});
  }
  console.log(JSON.stringify({ai_starter_pdfs:catalog.episodes.length,pages_each:3}));
} finally {await browser.close();}
