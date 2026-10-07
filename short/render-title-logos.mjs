// Genre-specific Thai title lockups, rendered with local open-source fonts.
// No generated lettering: Thai spelling and shaping remain deterministic.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {stories} from './catalog.js';
const {chromium}=await import(pathToFileURL(process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const plex=await readFile(new URL('../routinex/build/fonts/ibm-plex-sans-thai-thai-700.woff2',import.meta.url));
const latin=await readFile(new URL('../routinex/build/fonts/ibm-plex-sans-thai-latin-700.woff2',import.meta.url));
const hand=await readFile(new URL('../asksydscience/assets/fonts/sriracha-regular.ttf',import.meta.url));
const out=fileURLToPath(new URL('./assets/titles/',import.meta.url));
const proof=process.env.SHORT_TITLE_PROOF||'/private/tmp/tontor-title-art';await mkdir(proof,{recursive:true});
const motifs={
 rain:'<path d="M830 35 820 88M890 10 880 57M955 48 944 101"/><path d="M920 145c-70-78-115-20-105 23 6 29 42 53 105 101 63-48 99-72 105-101 10-43-35-101-105-23Z"/>',
 north:'<path d="m700 167 75-82 71 82 65-57 81 91M700 204c70-20 155-13 283 11"/><path d="M810 30v22M799 41h22M972 46v20M962 56h20"/>',
 ghost:'<path d="M833 207V48h144v224M856 71h95v173M895 208h8"/><path d="m984 91 44-10-21 42 46-14"/>',
 warrior:'<path d="M822 267c-98-28-94-104-27-121 58-15 114 22 127-21 12-40-16-56-35-44-21 13-4 38 18 34M907 52l23-24 6 40 32 6-35 20M828 284c84 27 180 17 244-14"/><path d="m808 186 13 17 15-11m9 25 16 12 13-15m15 17 19 5 8-18"/>',
 office:'<path d="M827 66h180v153H827ZM883 66V43h71v23M827 104h180"/><path d="M917 136c-34-44-70 10 0 48 70-38 34-92 0-48Z"/>',
 period:'<path d="M800 227c84-8 68-110 132-96-32-37-4-72 30-91-2 39 35 50 16 78 83-12 49 79 127 71M869 220c67-10 43-38 78-48 41 8 30 39 98 38"/><path d="m946 15 8 15-8 15-8-15Z"/>',
 krasue:'<path d="M850 59c-28 23-37 83-11 122M992 58c35 29 43 92 12 129M892 190c-8 28 14 40 0 67m39-65c17 20-16 38 5 65"/><path d="M886 90h4m61 0h4M909 128h22M902 155c12 8 23 8 36 0"/>',
 naga:'<path d="M888 213c-68-54-42-131 33-122 71 8 43-79-5-53M914 19l30 4-11 29M919 140l20 13-10 15M879 176l16 8-7 16"/><path d="m1003 52 8 19 20 8-20 8-8 19-8-19-20-8 20-8Z"/>',
 hr:'<path d="m842 36 147 22-24 146-147-22Z"/><path d="m855 91 31 39 59-54M824 240h193M842 213v27m47-17v17m47-34v34m47-45v45"/>',
 hanuman:'<path d="M847 74h115v106H847ZM847 74l58-25 116 4-59 21M962 74l59-21v108l-59 19M905 49v111"/><path d="M765 84h50M741 120h71M750 161h59"/>',
 wanthong:'<path d="m872 70 33 17 31-41 31 41 33-17-15 79h-98Z"/><path d="M882 168h113M926 34v-14M849 88l-16-8M1020 85l17-9"/>',
 village:'<path d="M838 47h183v128h-49l-48 36v-36h-86ZM881 73v78l66-39Z"/><path d="m800 77-31-16m32 60-35 3m282-77 24-21m-21 70 39-3"/>',
};
const designs={
 rain:{lines:['คืนที่เรา','ไม่รู้จัก'],font:'Hand',sizes:[122,171],ink:['#f8e7e6','#efb8bc'],accent:'#dc8c9b',style:'romance',motif:'Rain strokes and a hand-drawn heart; pale rose calligraphy'},
 north:{lines:['ฝากรัก','ไว้ที่เหนือ'],font:'Hand',sizes:[139,156],ink:['#f7ddbc','#fff3e1'],accent:'#e5aa79',style:'warm',motif:'Mountain horizon and sun marks; warm handwritten romance'},
 ghost:{lines:['ห้อง','สุดท้าย'],font:'Plex',sizes:[156,183],ink:['#d1d4c8','#d85750'],accent:'#9d443f',style:'haunt',motif:'An open doorway, off-register crimson type and scratch lines'},
 warrior:{lines:['นาคานคร'],font:'Hand',sizes:[199],ink:['#f2dea3'],accent:'#b8d8be',style:'myth',motif:'A coiled naga crest, layered jade-and-gold lettering and river curves'},
 office:{lines:['ออฟฟิศนี้','มีรัก'],font:'Plex',sizes:[122,181],ink:['#ffe9ed','#ffb6c9'],accent:'#de9cab',style:'office',motif:'A heart briefcase with pink underlines; contemporary office romance'},
 period:{lines:['บุพเพ','อีกครา'],font:'Hand',sizes:[173,170],ink:['#ffe6ac','#ebc984'],accent:'#d9bd75',style:'period',motif:'Thai floral flourishes and gold period lettering'},
 krasue:{lines:['กระสือ','แถวบ้าน'],font:'Hand',sizes:[202,119],ink:['#f06e5b','#f1e6d6'],accent:'#b75348',style:'horror',motif:'Crimson brush-like lettering, dripping tails and a ghost silhouette'},
 naga:{lines:['นาค','สายมู'],font:'Plex',sizes:[185,156],ink:['#d8efaa','#ffe1a4'],accent:'#cba060',style:'comic',motif:'Naga charm and sparkle, mint lettering with orange comic shadow'},
 hr:{lines:['ทศกัณฐ์','แผนก HR'],font:'Plex',sizes:[153,125],ink:['#e4eee0','#b4debf'],accent:'#c68c66',style:'corporate',motif:'An approval slip, stamp rules and a mint HR label'},
 hanuman:{lines:['หนุมาน','เด็กส่งของ'],font:'Plex',sizes:[179,120],ink:['#fff2cd','#f0aa69'],accent:'#d9a26d',style:'speed',motif:'Express parcel, speed lines and offset orange comic lettering'},
 wanthong:{lines:['วันทอง','ไม่ขอเลือก'],font:'Plex',sizes:[179,104],ink:['#f1d49a','#f5ebe0'],accent:'#cbaa70',style:'modern',motif:'An independent crown, strong gold title and editorial underline'},
 village:{lines:['ผู้ใหญ่บ้าน','อินฟลูฯ'],font:'Hand',sizes:[135,192],ink:['#ffedb2','#ffd269'],accent:'#f2b76c',style:'fun',motif:'A live chat/play icon, loud comic offset lettering and laughing rays'},
};
const css=`@font-face{font-family:Plex;src:url(data:font/woff2;base64,${plex.toString('base64')});font-weight:700;unicode-range:U+0E00-0E7F}@font-face{font-family:Plex;src:url(data:font/woff2;base64,${latin.toString('base64')});font-weight:700}@font-face{font-family:Hand;src:url(data:font/ttf;base64,${hand.toString('base64')})}*{box-sizing:border-box}body{margin:0;background:transparent}.art{position:relative;width:1400px;height:720px;padding:85px 85px;isolation:isolate}.type{position:relative;z-index:2;line-height:1.35;letter-spacing:-3px;font-weight:700;width:1070px}.line{display:block;width:fit-content;white-space:nowrap}.line:last-child{margin-top:-30px}.type:has(.line:only-child){padding-top:116px}.line:only-child{margin-top:0}.ornament{position:absolute;top:100px;left:800px;width:170px;height:170px;z-index:1;fill:none;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}.romance .line,.warm .line{text-shadow:0 4px 0 #261620,0 9px 20px #0008}.haunt .line{text-shadow:4px 0 #681f27,-2px 0 #7a433d,0 6px 0 #1c1515}.haunt .line:last-child{transform:translateX(40px)}.myth .line{text-shadow:2px 2px #173c35,4px 4px #173c35,6px 6px #173c35,8px 8px #294c3d,0 9px 22px #0008;letter-spacing:-8px}.office .line:last-child{padding-left:35px;border-bottom:7px solid #df97ae}.period .line{text-shadow:2px 4px #392b1c,0 9px 22px #0008}.period .line:last-child{padding-left:92px}.horror .line:first-child{transform:rotate(-3deg);text-shadow:2px 5px #402022,6px 8px #402022}.horror .line:last-child{padding-left:55px;text-shadow:0 4px #271b1b}.comic .line,.speed .line,.fun .line{-webkit-text-stroke:2px #443229;paint-order:stroke fill;text-shadow:2px 3px #443229,4px 6px #443229,6px 9px #bf7444,8px 12px #bf7444}.comic .line:last-child{transform:rotate(-3deg);padding-left:52px}.corporate .line:last-child{padding:0 24px;border:5px solid #a5c4b1;border-radius:12px;background:#203d34dd;font-size:110px!important;margin-top:-5px;line-height:1.4}.speed .line{transform:skew(-6deg)}.modern .line:last-child{border-top:5px solid #c6a16b;margin-top:-2px;padding-top:3px;letter-spacing:1px}.fun .line:last-child{transform:rotate(-3deg);padding-left:45px;margin-top:-42px}`;
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const p=await browser.newPage({viewport:{width:1400,height:720}});
 for(const s of stories){const d=designs[s.id];const dir=`${out}/${s.id}`;await mkdir(dir,{recursive:true});const html=`<!doctype html><meta charset="utf-8"><style>${css}</style><div class="art ${d.style}"><svg class="ornament" viewBox="730 0 400 320" stroke="${d.accent}" aria-hidden="true">${motifs[s.id]}</svg><div class="type" style="font-family:${d.font}">${d.lines.map((line,i)=>`<span class="line" style="font-size:${d.sizes[i]}px;color:${d.ink[i]}">${line}</span>`).join('')}</div></div>`;
 await p.setContent(html);await p.evaluate(async()=>{await document.fonts.ready;const width=document.querySelector('.line').getBoundingClientRect().width;document.querySelector('.ornament').style.left=(85+width+24)+'px';});
 await p.screenshot({path:`${proof}/${s.id}.png`,omitBackground:true});
 execFileSync(process.env.SHORT_PYTHON||'python3',['-c',`from PIL import Image\nim=Image.open(${JSON.stringify(proof+'/'+s.id+'.png')}).convert('RGBA')\nb=im.getchannel('A').getbbox()\nassert b and b[0]>0 and b[1]>0 and b[2]<1400 and b[3]<720, 'clipped title: '+str(b)\nim=im.crop((max(0,b[0]-12),max(0,b[1]-12),min(1400,b[2]+12),min(720,b[3]+12)))\nfor width in (1200,420):\n h=round(im.height*width/im.width)\n im.resize((width,h),Image.Resampling.LANCZOS).save(${JSON.stringify(dir)}+'/logo-'+str(width)+'-v1.webp',quality=95,method=6)\n`]);
 console.log(s.id+' title lockup');
 }
 await writeFile(new URL('./docs/title-logos-v1.json',import.meta.url),JSON.stringify({method:'Deterministic Thai typography and original vector ornament, transparent WebP exports',fonts:['IBM Plex Sans Thai Bold','Sriracha Regular'],version:1,designs},null,2));
}finally{await browser.close();}
