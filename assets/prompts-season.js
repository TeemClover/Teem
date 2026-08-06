/* Lesson 5 · SEASON — Source-first seasoning vault */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;
var V=window.MC_VAULT;
if(!V||!Array.isArray(V.prompts))return;

var SOURCE_RULES=[
  {re:/เรซูเม|resume|สมัครงาน|job description|portfolio|พอร์ต|cv/i,icon:'📄',label:'PDF / DOC'},
  {re:/ภาพ|image|photo|รูป|ดีไซน์|design|logo|โลโก้|โปสเตอร์|poster|visual|วิจารณ์งาน|critique/i,icon:'🖼️',label:'ภาพ Reference'},
  {re:/ประชุม|meeting|ถอดเสียง|transcript|podcast|พอดแคสต์|เสียง|audio|สัมภาษณ์/i,icon:'🎙️',label:'ไฟล์เสียง / Transcript'},
  {re:/ตาราง|spreadsheet|sheet|csv|ยอดขาย|งบ|budget|ตัวเลข|สถิติ|data|ข้อมูลเชิงตัวเลข/i,icon:'📊',label:'Sheet / CSV'},
  {re:/เว็บไซต์|website|web|หน้าเว็บ|landing page|url|ลิงก์|ข่าว|research|วิจัย|กฎหมาย|เอกสารอ้างอิง/i,icon:'🔗',label:'URL / PDF'},
  {re:/อีเมล|email|แชต|แชท|reply|ตอบข้อความ|rewrite|ปรับข้อความ|บทสนทนา|conversation/i,icon:'💬',label:'ข้อความต้นฉบับ'},
  {re:/อาหาร|เมนู|วัตถุดิบ|ตู้เย็น|recipe|meal|โภชนาการ/i,icon:'📸',label:'ภาพวัตถุดิบ'},
  {re:/สไลด์|presentation|พรีเซนต์|รายงาน|report|proposal|brief|แผน|plan|content|คอนเทนต์|script|สคริปต์|สรุป|summary|เรียน|สอบ|เป้าหมาย|project/i,icon:'🫙',label:'.md Source'}
];

function hay(p){return [p.id,p.title,p.desc,p.out,(p.kw||[]).join(' ')].join(' ')}
function sourceFor(p){
  if(p.__source)return p.__source;
  var text=hay(p),hit=null;
  for(var i=0;i<SOURCE_RULES.length;i++)if(SOURCE_RULES[i].re.test(text)){hit=SOURCE_RULES[i];break}
  p.__source=hit||{icon:'🫙',label:'.md Source'};
  return p.__source;
}

function seasoningPrefix(p){
  var s=sourceFor(p);
  return [
    'SOURCE FIRST — ใช้ผงปรุงรสนี้กับ Source ที่แนบหรือวางไว้ในบทสนทนานี้',
    'Source ที่แนะนำที่สุด: '+s.icon+' '+s.label,
    '',
    'กติกาการใช้ Source:',
    '- ใช้ Source เป็นฐานข้อเท็จจริงหลักของงาน',
    '- อ่าน Source แล้วเติมความหมายของ [วงเล็บ] เท่าที่ Source ระบุได้',
    '- ถ้าข้อมูลสำคัญไม่มีใน Source ให้ถามก่อน ห้ามเดาหรือแต่งเพิ่ม',
    '- รักษาชื่อ ตัวเลข Key Messages, Tone และ Canon ตาม Source',
    '- ใส่ Source เพิ่มเติมได้เมื่อช่วยตรวจหรือเติมบริบท แต่ห้ามให้ข้อมูลใหม่ขัดกับ Source หลัก',
    '',
    'ผงปรุงรสสำหรับงานนี้:'
  ].join('\n');
}

V.prompts.forEach(function(p){
  sourceFor(p);
  if(!p.__seasoned){p.__originalTpl=p.tpl;p.tpl=seasoningPrefix(p)+'\n\n'+p.tpl;p.__seasoned=true}
});

function addStyle(){
  if(document.getElementById('mc-season-style'))return;
  var s=document.createElement('style');s.id='mc-season-style';
  s.textContent=`
  .head{border-radius:24px!important;margin-top:26px!important;box-shadow:0 20px 52px rgb(10 40 24/.16)!important}
  .heroimg{height:auto!important;min-height:220px;margin:-34px -34px 22px!important;background:linear-gradient(145deg,#071a10,#0b3420 58%,#145337)!important}
  .heroimg::after{display:none!important}.heroimg img{display:none!important}.heroimg svg{display:block;width:100%;height:auto}
  .source-primer{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;margin:18px 0 4px;padding:19px 21px;border:1px solid rgb(27 106 66/.25);border-radius:18px;background:linear-gradient(135deg,rgb(27 106 66/.08),rgb(190 148 66/.1));box-shadow:0 9px 28px rgb(18 40 28/.045)}
  .source-primer .jar{font-size:34px;line-height:1}.source-primer b{display:block;font-size:17px}.source-primer p{font-size:14px;color:rgb(var(--muted));margin-top:3px}.source-primer .mini{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.source-primer .mini span{font-size:12px;font-weight:700;padding:4px 9px;border-radius:999px;background:#fff;border:1px solid rgb(var(--ink)/.09)}
  .canon-inline{position:relative;display:inline-flex}.canon-inline>button{border:0;border-bottom:1px dashed rgb(var(--green));background:transparent;color:rgb(var(--green));font-weight:800;cursor:help}.canon-inline .ctip{position:absolute;z-index:30;left:0;top:calc(100% + 8px);width:min(330px,calc(100vw - 48px));padding:12px 13px;border-radius:12px;background:#071a10;color:#fff;font-size:12.5px;opacity:0;visibility:hidden;transform:translateY(-4px);pointer-events:none}.canon-inline:hover .ctip,.canon-inline:focus-within .ctip,.canon-inline[data-open="1"] .ctip{opacity:1;visibility:visible;transform:none;pointer-events:auto}
  .source-tag{display:inline-flex!important;align-items:center;gap:6px;color:#6e551f!important;background:rgb(190 148 66/.12)!important;border-color:rgb(190 148 66/.35)!important}
  .source-tag strong{font-size:11px!important}.pc .pcb [data-act="raw"].main{order:-2;background:rgb(var(--green))!important;border-color:rgb(var(--green))!important;color:#fff!important;flex:1 1 190px}.pc .pcb [data-act="use"]{order:-1;background:#fff!important;color:rgb(var(--green))!important}
  .drawer-source{display:flex;align-items:flex-start;gap:10px;margin-bottom:13px;padding:12px 13px;border-radius:12px;background:rgb(190 148 66/.1);border:1px solid rgb(190 148 66/.28)}.drawer-source .si{font-size:23px;line-height:1}.drawer-source b{display:block;font-size:13.5px}.drawer-source small{display:block;font-size:12px;color:rgb(var(--muted));line-height:1.55}
  .drow [data-act="copyFilled"].main{background:rgb(var(--green))!important;border-color:rgb(var(--green))!important;color:#fff!important}
  .season-chef{position:relative;margin:17px 0 2px;padding:20px 21px 20px 67px;border:1px solid rgb(190 148 66/.37);border-radius:17px;background:linear-gradient(135deg,rgb(190 148 66/.12),#fff)}.season-chef::before{content:"👩‍🍳";position:absolute;left:20px;top:17px;font-size:31px}.season-chef b{display:block;color:#775719}.season-chef p{font-size:14px;margin-top:2px}
  .season-fold{margin-top:15px;border:1px solid rgb(255 255 255/.15);border-radius:14px;background:rgb(255 255 255/.05)}.season-fold summary{cursor:pointer;padding:13px 15px;font-weight:750;list-style:none}.season-fold summary::-webkit-details-marker{display:none}.season-fold summary::after{content:"เปิดดู +";float:right;color:rgb(var(--gold));font-size:12px}.season-fold[open] summary::after{content:"ซ่อน −"}.season-fold .inside{padding:0 15px 15px}
  .source-genesis-field{margin-top:12px}.source-genesis-field textarea{min-height:82px}
  .quest .season-finish{width:100%;margin-top:16px;min-height:48px;border:1px solid rgb(var(--green));border-radius:12px;background:rgb(var(--green));color:#fff;font-weight:800;cursor:pointer}.quest .season-finish.done{background:rgb(var(--deep));color:rgb(var(--gold));border-color:rgb(var(--gold))}
  @media(max-width:520px){.heroimg{margin:-26px -22px 18px!important;min-height:190px}.source-primer{grid-template-columns:1fr}.source-primer .jar{font-size:30px}.canon-inline .ctip{left:auto;right:0}.pcb{display:grid}.pcb button{width:100%}}
  @media(prefers-reduced-motion:reduce){.heroimg *{animation:none!important}}
  `;
  document.head.appendChild(s);
}

function heroSvg(){return `
<svg viewBox="0 0 900 320" role="img" aria-labelledby="s5Title s5Desc" xmlns="http://www.w3.org/2000/svg">
<title id="s5Title">ลิ้นชักผงปรุงรสสำหรับ Source</title><desc id="s5Desc">เชฟผู้หญิงถือ Source หนึ่งขวดอยู่หน้าตู้ลิ้นชัก 44 ช่อง แต่ละลิ้นชักมีผงปรุงรสสำหรับงานต่างกัน</desc>
<defs><linearGradient id="s5bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071a10"/><stop offset=".62" stop-color="#0e432a"/><stop offset="1" stop-color="#17613e"/></linearGradient><linearGradient id="s5gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4d37f"/><stop offset="1" stop-color="#a97727"/></linearGradient><filter id="s5shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".25"/></filter></defs>
<rect width="900" height="320" fill="url(#s5bg)"/><circle cx="770" cy="20" r="170" fill="#be9442" opacity=".1"/><path d="M0 275Q180 250 360 277T900 270V320H0Z" fill="#03130b" opacity=".35"/>
<g transform="translate(390 33)" filter="url(#s5shadow)"><rect x="0" y="0" width="455" height="238" rx="18" fill="#6d4828" stroke="#d0a95c" stroke-width="3"/><g fill="#9a6a38" stroke="#4b2e18" stroke-width="2">
`+Array.from({length:44},function(_,i){var col=i%11,row=Math.floor(i/11),x=13+col*40,y=14+row*55;return '<rect x="'+x+'" y="'+y+'" width="34" height="44" rx="5"/>';}).join('')+`</g><g fill="#e4bd68">`+Array.from({length:44},function(_,i){var col=i%11,row=Math.floor(i/11),x=30+col*40,y=34+row*55;return '<circle cx="'+x+'" cy="'+y+'" r="3"/>';}).join('')+`</g><g font-family="system-ui" font-size="15" text-anchor="middle"><text x="70" y="45">✉️</text><text x="150" y="45">📊</text><text x="230" y="45">🎬</text><text x="310" y="45">🖼️</text><text x="390" y="45">🧠</text><text x="110" y="100">💬</text><text x="190" y="100">🗺️</text><text x="270" y="100">🎙️</text><text x="350" y="100">📄</text></g><path d="M450 86q35 8 23 45q-12 29-54 26" fill="none" stroke="#f4d37f" stroke-width="8" stroke-linecap="round" opacity=".9"/><circle cx="466" cy="126" r="8" fill="#f4d37f"/></g>
<g transform="translate(48 38)" filter="url(#s5shadow)"><ellipse cx="145" cy="245" rx="105" ry="18" fill="#000" opacity=".2"/><path d="M82 112Q84 57 139 58Q194 60 199 116L188 180Q173 213 140 215Q104 213 90 180Z" fill="#3b251d"/><path d="M95 112Q105 84 141 83Q177 86 188 114L181 168Q167 194 141 195Q113 194 100 168Z" fill="#f3cbb3"/><path d="M95 117Q104 74 143 81Q178 82 188 119Q166 106 153 91Q130 112 95 117Z" fill="#332019"/><path d="M109 150q8 8 16 0M153 150q8 8 16 0" fill="none" stroke="#6e4535" stroke-width="3" stroke-linecap="round"/><circle cx="111" cy="162" r="7" fill="#db8885" opacity=".55"/><circle cx="166" cy="162" r="7" fill="#db8885" opacity=".55"/><path d="M129 174Q141 184 155 174" fill="none" stroke="#8d4a43" stroke-width="3" stroke-linecap="round"/><path d="M89 66Q90 36 118 38Q121 13 145 24Q168 12 174 39Q201 40 195 70Z" fill="#fff" stroke="#e5d8c2" stroke-width="3"/><path d="M88 69H197V87Q143 98 88 86Z" fill="#fff" stroke="#e5d8c2" stroke-width="3"/><path d="M87 204Q106 185 141 185Q180 186 199 207L217 274H68Z" fill="#1b6a42"/><path d="M121 194H161L170 273H111Z" fill="#f8f1df"/><path d="M111 219Q86 217 64 236M172 220Q206 215 232 188" fill="none" stroke="#f3cbb3" stroke-width="17" stroke-linecap="round"/><circle cx="58" cy="240" r="10" fill="#f3cbb3"/><circle cx="238" cy="183" r="10" fill="#f3cbb3"/><g transform="translate(230 116) rotate(-9 48 70)"><rect x="25" y="0" width="48" height="24" rx="7" fill="#d4b86c"/><path d="M17 21H81L88 120Q86 145 64 150H36Q13 145 10 120Z" fill="#f7f0d8" stroke="#d4b86c" stroke-width="4"/><rect x="21" y="57" width="57" height="55" rx="9" fill="#174c32"/><text x="49" y="79" fill="#f4d37f" font-size="15" font-weight="800" text-anchor="middle" font-family="system-ui">SOURCE</text><text x="49" y="100" fill="#fff" font-size="13" text-anchor="middle" font-family="system-ui">.md</text></g><g fill="#f4d37f"><path d="M320 48l5 12 12 5-12 5-5 12-5-12-12-5 12-5Z"><animate attributeName="opacity" values=".35;1;.35" dur="2.8s" repeatCount="indefinite"/></path><path d="M350 204l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"><animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/></path></g></g>
</svg>`}

function setText(){
  document.title='บทที่ 5 · เปิดลิ้นชักผงปรุงรส — AI ใส่ซอส';
  var d=document.querySelector('meta[name="description"]');if(d)d.content='ใช้ Source เป็นซอสตั้งต้น แล้วเลือกผงปรุงรสจากคลัง 44 สูตร กดตักไปใช้ทันที หรือเปิดลิ้นชักเพื่อปรับสูตรให้เข้ากับงาน';
  var h=document.querySelector('.head');if(!h)return;
  var hi=h.querySelector('.heroimg');if(hi)hi.innerHTML=heroSvg();
  var lv=h.querySelector('.lv');if(lv)lv.textContent='บทที่ 5 · SEASON';
  var h1=h.querySelector('h1');if(h1)h1.textContent='เปิดลิ้นชักผงปรุงรส — Source พร้อม ก็หยิบไปใช้ได้เลย';
  var p=h.querySelector(':scope > p');if(p)p.textContent='สูตรทั้ง 44 ชิ้นไม่ใช่คาถาแทน Source แต่เป็นผงปรุงรสสำหรับบอก AI ว่าจะเอาซอสขวดนั้นไปทำอะไร มี Source แล้วกดตักได้ทันที อยากเปลี่ยนรสค่อยเปิดลิ้นชักปรับสูตร';
  var m=h.querySelector('.meta');if(m)m.innerHTML='<span>🫙 Source เป็นฐาน</span><span>🧂 '+V.prompts.length+' สูตร</span><span>🥄 ตักแล้วใช้ได้เลย</span><span>⚙️ ปรับสูตรได้</span>';
  var qlab=document.querySelector('.finder .qlab');if(qlab)qlab.textContent='อยากปรุง Source ให้กลายเป็นอะไร?';
  var q=document.getElementById('q');if(q)q.placeholder='เช่น อีเมล, สไลด์, รายงาน, คลิป, แผนงาน, คำตอบลูกค้า...';
  var rand=document.getElementById('rand');if(rand)rand.textContent='🎲 สุ่มผงปรุงรส';
  var all=document.getElementById('showAll');if(all)all.textContent='เปิดทั้งคลัง '+V.prompts.length+' สูตร';
}

function primer(){
  if(document.querySelector('.source-primer'))return;
  var finder=document.querySelector('.finder');if(!finder)return;
  var box=document.createElement('section');box.className='source-primer';
  box.innerHTML='<div class="jar">🫙</div><div><b>Source คือซอสตั้งต้น · Prompt คือผงปรุงรส</b><p>แต่ละลิ้นชักจะบอก Source ที่แนะนำที่สุดให้ 1 แบบ เช่น <code>.md</code>, ภาพ, เสียง, PDF หรือ Sheet มี Source พร้อมแล้วกด <b>“ตักผงปรุงรส”</b> ได้เลย สูตรจะสั่งให้ AI ยึด Source และรักษา <span class="canon-inline"><button type="button" aria-expanded="false">Canon ?</button><span class="ctip">Canon คือสิ่งที่ล็อกไว้และต้องเหมือนเดิมในทุก Output เช่น ชื่อ สี ยุค บุคลิก ข้อความหลัก และสิ่งที่ห้ามเปลี่ยน</span></span> ถ้ายังอยากเติมรายละเอียดค่อยกด <b>“ปรับสูตร”</b></p><div class="mini"><span>🫙 .md</span><span>🖼️ ภาพ</span><span>🎙️ เสียง</span><span>📄 PDF</span><span>📊 Sheet</span></div></div>';
  finder.insertAdjacentElement('afterend',box);
  var c=box.querySelector('.canon-inline'),b=c.querySelector('button');b.addEventListener('click',function(e){e.stopPropagation();var on=c.dataset.open==='1';c.dataset.open=on?'0':'1';b.setAttribute('aria-expanded',on?'false':'true')});document.addEventListener('click',function(){c.dataset.open='0';b.setAttribute('aria-expanded','false')});
}

function byId(id){for(var i=0;i<V.prompts.length;i++)if(V.prompts[i].id===id)return V.prompts[i];return null}
function decorateCard(card){
  if(!card)return;var p=byId(card.getAttribute('data-id'));if(!p)return;var src=sourceFor(p);
  var tags=card.querySelector('.tags');if(tags&&!tags.querySelector('.source-tag')){var tag=document.createElement('span');tag.className='source-tag';tag.innerHTML='<strong>'+src.icon+'</strong> Source: '+src.label;tags.insertBefore(tag,tags.firstChild)}
  var row=card.querySelector('.pcb'),raw=card.querySelector('[data-act="raw"]'),use=card.querySelector('[data-act="use"]');if(raw){raw.classList.add('main');raw.textContent='🥄 ตักผงปรุงรส'}if(use){use.classList.remove('main');use.textContent=card.classList.contains('open')?'⚙️ กำลังปรับสูตร':'⚙️ ปรับสูตร'}if(row&&raw&&row.firstElementChild!==raw)row.insertBefore(raw,row.firstElementChild);
  var drawer=card.querySelector('.drawer');if(drawer){if(!drawer.querySelector('.drawer-source')){var ds=document.createElement('div');ds.className='drawer-source';ds.innerHTML='<span class="si">'+src.icon+'</span><div><b>Source ที่แนะนำที่สุด: '+src.label+'</b><small>แนบหรือวาง Source ก่อน แล้วปรับเฉพาะช่องที่อยากเปลี่ยน สูตรจะไม่แต่งสิ่งที่ Source ไม่มี</small></div>';drawer.insertBefore(ds,drawer.firstChild)}var dh=drawer.querySelectorAll('.dh');if(dh[0])dh[0].textContent='ปรับเฉพาะสิ่งที่อยากเปลี่ยน — ช่องว่างที่เหลือให้ AI อ่านจาก Source';if(dh[1])dh[1].textContent='ผงปรุงรสที่ปรับแล้ว';var cf=drawer.querySelector('[data-act="copyFilled"]');if(cf)cf.textContent='🥄 ตักสูตรที่ปรับแล้ว';var an=drawer.querySelector('[data-act="anatomy"]');if(an&&!/ปิด/.test(an.textContent))an.textContent='🔬 ดูส่วนผสม'}
}
function decorateAll(){document.querySelectorAll('.pc').forEach(decorateCard);var rt=document.getElementById('resTitle');if(rt&&rt.textContent==='ไอเท็มที่คนหยิบบ่อย')rt.textContent='ผงปรุงรสที่หยิบบ่อย';var rc=document.getElementById('resCount');if(rc&&/ใบ/.test(rc.textContent))rc.textContent=rc.textContent.replace(/ใบ/g,'สูตร')}

function toast(msg){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('on');clearTimeout(t.__seasonT);t.__seasonT=setTimeout(function(){t.classList.remove('on')},2400)}
function copyText(text,msg){function fallback(){var ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();toast(ok?msg:'ก๊อปอัตโนมัติไม่ได้ — เลือกข้อความในกล่องแล้วก๊อปเอง');return ok}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){toast(msg)},fallback);else fallback()}
function interceptCopies(){var results=document.getElementById('results');if(!results)return;results.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var act=b.getAttribute('data-act');if(act!=='raw'&&act!=='copyFilled')return;var card=b.closest('.pc'),p=card&&byId(card.getAttribute('data-id'));if(!p)return;e.preventDefault();e.stopImmediatePropagation();var text=act==='raw'?p.tpl:((card.querySelector('[data-prev]')||{}).dataset||{}).text||p.tpl;copyText(text,'✓ ตักผงปรุงรสแล้ว — แนบ Source แล้ววางสูตรต่อได้เลย');b.textContent='✓ ตักแล้ว';setTimeout(function(){b.textContent=act==='raw'?'🥄 ตักผงปรุงรส':'🥄 ตักสูตรที่ปรับแล้ว'},1500)},true)}

function rewriteGenesis(){
  var legend=document.querySelector('.legend');if(legend){var h=legend.querySelector('h3');if(h)h.textContent='GENESIS SEASONING — ตั้งวิธีร่วมงาน ไม่ใช่สร้างข้อเท็จจริงแทน Source';var ps=legend.querySelectorAll(':scope > p');if(ps[0])ps[0].innerHTML='Source บอกว่า <b>งานนี้คืออะไรและอะไรต้องจริง</b> — Genesis Prompt บอกว่า <b>AI ควรร่วมงานกับเราอย่างไร</b>';if(ps[1])ps[1].innerHTML='ใช้คู่กันดีที่สุด: วาง Source เพื่อเก็บข้อมูล Key Messages และ Canon แล้วใช้ Genesis เป็นผงตั้งครัว เช่น ให้ถามก่อนเดา แยก Fact/Assumption และรักษาเสียงของเจ้าของงาน';var vs=legend.querySelector('.vs');if(vs&&!vs.closest('details')){var detail=document.createElement('details');detail.className='season-fold';detail.innerHTML='<summary>เปิดดูตัวอย่าง ก่อนมี Source กับหลังมี Source + Genesis</summary><div class="inside"></div>';vs.parentNode.insertBefore(detail,vs);detail.querySelector('.inside').appendChild(vs);var warn=legend.querySelector('p[style]');if(warn)detail.querySelector('.inside').appendChild(warn)}}
  var builder=document.querySelector('.builder');if(builder&&!document.getElementById('gSource')){var presets=builder.querySelector('#presets');var step=presets&&presets.nextElementSibling;var wrap=document.createElement('div');wrap.className='f source-genesis-field';wrap.innerHTML='<label for="gSource">Source หลักของ Session นี้คืออะไร</label><textarea id="gSource" placeholder="เช่น แนบไฟล์ brand-source.md หรือวางบันทึกประชุมไว้ด้านบน"></textarea><small>แนะนำให้ใช้ Source จากบทที่ 1 — Genesis ไม่ได้แทนไฟล์นี้</small>';if(step)step.insertAdjacentElement('afterend',wrap);else builder.appendChild(wrap)}
  var heading=document.querySelector('.builder')&&document.querySelector('.builder').previousElementSibling;if(heading&&heading.tagName==='P')heading.innerHTML='เลือกวิธีร่วมงาน แล้วชี้ให้ AI กลับไปอ่าน <b>Source หลัก</b> ทุกครั้ง — ช่องที่เว้นไว้ยังคงเป็น <code>[วงเล็บ]</code> และแก้ได้ทั้งหมด';
  var levels=document.querySelector('.lvls');if(levels){var hs=levels.previousElementSibling;if(hs&&hs.tagName==='H2')hs.innerHTML='<span class="n">3</span>ผงปรุงรสมี 3 ระดับ';var ls=levels.querySelectorAll('.lvl');if(ls[0])ls[0].innerHTML='<span class="n">LEVEL 1 · ไม่มี Source</span><q>ช่วยเขียนโพสต์ให้หน่อย</q><small>AI ต้องเดาทั้งเรื่อง คนอ่าน น้ำเสียง และข้อเท็จจริง — เหมือนเทผงลงจานเปล่า</small>';if(ls[1])ls[1].innerHTML='<span class="n">LEVEL 2 · ยัดข้อมูลไว้ใน Prompt</span><q>เล่าเรื่องทั้งหมดใหม่ทุกครั้ง แล้วค่อยสั่งงาน</q><small>ใช้ได้ แต่เสียเวลา ข้อมูลขัดกันง่าย และแก้ซ้ำทุก Output</small>';if(ls[2])ls[2].innerHTML='<span class="n">LEVEL 3 · Source + ผงปรุงรส</span><q>แนบ Source → กด “ตักผงปรุงรส” → วางสูตร</q><small>เร็วที่สุดและคุมรสได้ เพราะข้อเท็จจริงอยู่ใน Source ส่วนสูตรบอกวิธีทำจานนี้</small>'}var note=levels&&levels.nextElementSibling;if(note&&note.classList.contains('note'))note.innerHTML='🧂 <b>สูตรยาวไม่ได้แปลว่ารสดี</b> — Source รับผิดชอบข้อเท็จจริง ส่วนผงปรุงรสรับผิดชอบเป้าหมาย รูปแบบ ข้อจำกัด และวิธีตรวจ'
}

function sourceGenesis(){function val(id,h){var e=document.getElementById(id),v=e&&e.value.trim();return v||'['+h+']'}var ask=val('gAsk','จำนวนคำถาม'),fact=document.getElementById('gFact');var L=[];L.push('SOURCE FIRST — ใน Session นี้ให้ใช้ Source หลักต่อไปนี้','',val('gSource','แนบหรือวาง Source หลักของ Session นี้'),'');L.push('บทบาทของคุณ:',val('gRole','อยากให้ AI ทำหน้าที่อะไร'),'');L.push('บริบทของฉัน:',val('gCtx','ฉันคือใครและกำลังทำอะไร'),'');L.push('เป้าหมายหลัก:',val('gMission','เป้าหมายของ Session นี้'),'');L.push('กติกา Source:','- ใช้ Source เป็นฐานข้อเท็จจริงหลัก','- รักษา Key Messages, Tone และ Canon','- ถ้าข้อมูลไม่อยู่ใน Source ให้ถามก่อน ห้ามแต่งเพิ่ม','- หาก Source หลายชิ้นขัดกัน ให้ชี้จุดขัดแย้งและถามว่าอะไรเป็น Source of Truth','');L.push('หลักที่ต้องให้ความสำคัญ:',val('gPrin','สิ่งที่ AI ต้องให้ความสำคัญ'),'');L.push('วิธีร่วมงาน:','- ถ้าข้อมูลสำคัญไม่พอ ให้ถามก่อนเดา (ไม่เกิน '+ask+' ข้อต่อครั้ง)');if(fact&&fact.checked)L.push('- แยกข้อเท็จจริง สมมติฐาน และข้อเสนอแนะให้ชัด');var alt=document.getElementById('gAlt'),no=document.getElementById('gNo'),extra=document.getElementById('gExtra');if(alt&&alt.value.trim())L.push('- เมื่อมีทางเลือก ให้เสนอ '+alt.value.trim());L.push('- ชี้ความเสี่ยงและข้อขัดแย้งอย่างตรงไปตรงมา');if(no&&no.value.trim())L.push('- สิ่งที่ห้ามทำ: '+no.value.trim());L.push('','รูปแบบคำตอบ:',val('gStyle','ภาษา ความยาว และรูปแบบคำตอบ'));if(extra&&extra.value.trim())L.push('- '+extra.value.trim());L.push('','ก่อนเริ่มงานแรก:','1. สรุปว่าเข้าใจ Source และเป้าหมายอย่างไร','2. ระบุข้อมูลที่ยังขาดหรือขัดกัน','3. ถามเฉพาะคำถามที่จำเป็นที่สุด');return L.join('\n')}
function wireGenesis(){var prev=document.getElementById('gPrev'),copy=document.getElementById('gCopy');if(!prev||!copy)return;function paint(){setTimeout(function(){prev.textContent=sourceGenesis()},0)}['gSource','gCtx','gRole','gMission','gPrin','gStyle','gAsk','gAlt','gNo','gExtra','gFact'].forEach(function(id){var e=document.getElementById(id);if(e){e.addEventListener('input',paint);e.addEventListener('change',paint)}});var pr=document.getElementById('presets');if(pr)pr.addEventListener('click',paint);var reset=document.getElementById('gReset');if(reset)reset.addEventListener('click',paint);copy.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();copyText(sourceGenesis(),'✓ ตัก Genesis Seasoning แล้ว — วางหลัง Source ในแชตใหม่');copy.textContent='✓ ตักแล้ว';setTimeout(function(){copy.textContent='🥄 ตัก Genesis Seasoning'},1600)},true);copy.textContent='🥄 ตัก Genesis Seasoning';paint()}

function chefAndQuest(){var primerBox=document.querySelector('.source-primer');if(primerBox&&!document.querySelector('.season-chef'))primerBox.insertAdjacentHTML('afterend','<div class="season-chef"><b>เชฟชิมแล้ว</b><p>มี Source ดีแล้วกดตักได้เลยค่ะ ไม่ต้องกรอกทุกช่องให้เมื่อย ถ้ายังไม่มี Source แล้วหวังว่าผง 44 ซองจะช่วยเสกข้อเท็จจริง เชฟเรียกว่าสร้างบุฟเฟต์จากอากาศค่ะ</p></div>');var q=document.querySelector('.quest');if(!q)return;q.innerHTML='<b>🎯 QUEST: เลือก Source 1 ขวด แล้วปรุง 1 งานจริง</b><ol><li>ใช้ Source จากบทที่ 1 หรือ Source ที่มีอยู่แล้ว</li><li>ค้นหาผงปรุงรสที่ตรงกับงานวันนี้</li><li>ดูไอคอน Source ที่แนะนำบนการ์ด</li><li>กด “ตักผงปรุงรส” แล้ววางหลัง Source ใน AI ที่ใช้</li><li>ถ้ารสยังไม่ตรง กลับมากด “ปรับสูตร” และเปลี่ยนเฉพาะช่องที่จำเป็น</li><li>ตรวจชื่อ ตัวเลข Key Messages และ Canon ก่อนใช้จริง</li></ol><button type="button" class="season-finish">ฉันใช้ Source + ผงปรุงรสทำงานจริงแล้ว</button><span class="unlock">🧂 SEASONER UNLOCKED</span><span class="qshare">Source เก็บความจริง · ผงปรุงรสเลือกวิธีเสิร์ฟ</span>';var b=q.querySelector('.season-finish');function done(){b.classList.add('done');b.textContent='✓ ผ่านบทที่ 5 แล้ว';try{localStorage.setItem('mc-prompts-complete','1')}catch(e){}}b.addEventListener('click',done);try{if(localStorage.getItem('mc-prompts-complete')==='1')done()}catch(e){}var next=document.querySelector('.nextrow .ghost');if(next)next.textContent='← กลับบทที่ 4 · MULTIPLY';var nx=document.querySelector('.nextrow .nx:not(.ghost)');if(nx)nx.textContent='ไปบทที่ 6 · SERVE →'}

function observe(){var root=document.getElementById('results');if(!root)return;new MutationObserver(function(){decorateAll()}).observe(root,{childList:true,subtree:true});decorateAll()}
function boot(){addStyle();setText();primer();rewriteGenesis();wireGenesis();chefAndQuest();interceptCopies();observe()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();